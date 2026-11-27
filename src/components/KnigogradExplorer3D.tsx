import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  Footprints,
  LayoutGrid,
  MousePointerClick,
  RotateCcw,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { WORKSHOPS } from '../game/knigogradData';
import { KnigogradSave, ScreenRoute, WorkshopId } from '../game/knigogradTypes';
import { soundEngine } from '../game/sound';
import {
  AABB,
  buildKnigogradWorld,
  KnigogradWorldHandles,
  updateStationLabelSprite,
  WorldStation,
} from '../three/knigogradWorld';
import {
  createStudioRenderer,
  disposeObjectTree,
  isWebGLAvailable,
  scheduleAfterDraw,
} from '../three/webglUtils';

export interface PlayerWorldPos {
  x: number;
  z: number;
  rotY: number;
}

interface KnigogradExplorer3DProps {
  save: KnigogradSave;
  totalBibliks: number;
  completedTasks: number;
  initialPlayerPos?: PlayerWorldPos;
  onSavePlayerPos?: (pos: PlayerWorldPos) => void;
  onNavigate: (route: ScreenRoute) => void;
  onSwitchTo2D: () => void;
}

const _mouseNdc = new THREE.Vector2();
const _moveVec = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3();
const _stepStart = new THREE.Vector3();

function getZoneOf(x: number, z: number): 'w1' | 'w2' | 'w3' | 'lobby' {
  if (x < -4.75) return 'w1';
  if (x > 4.75) return 'w3';
  if (z < -1.65) return 'w2';
  return 'lobby';
}

/**
 * Computes clean archway-aware waypoints between zones so click-to-walk and
 * auto-guide never get stuck against dividing walls.
 */
function buildWalkPath(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number
): THREE.Vector3[] {
  const startZone = getZoneOf(fromX, fromZ);
  const endZone = getZoneOf(toX, toZ);
  const pts: THREE.Vector3[] = [];

  if (startZone !== endZone) {
    // Exit current wing through its grand archway into the Central Atrium
    if (startZone === 'w1') {
      pts.push(new THREE.Vector3(-4.75, 0, 2.2));
      pts.push(new THREE.Vector3(-2.1, 0, 3.3));
    } else if (startZone === 'w3') {
      pts.push(new THREE.Vector3(4.75, 0, 2.2));
      pts.push(new THREE.Vector3(2.1, 0, 3.3));
    } else if (startZone === 'w2') {
      pts.push(new THREE.Vector3(0, 0, -1.65));
      pts.push(new THREE.Vector3(0, 0, 0.2));
      if (endZone === 'lobby' && toZ > 2.1) {
        pts.push(new THREE.Vector3(1.85, 0, 2.2));
      }
    } else if (startZone === 'lobby' && endZone === 'w2' && fromZ > 1.8 && Math.abs(fromX) < 1.8) {
      // Sidestep cleanly around the central circular atrium bench/tree at (0, 2.1)
      pts.push(new THREE.Vector3(fromX >= 0 ? 1.85 : -1.85, 0, 2.2));
    }

    // Route neatly around the center atrium bench if crossing East <-> West
    if (
      (startZone === 'w1' && endZone === 'w3') ||
      (startZone === 'w3' && endZone === 'w1')
    ) {
      pts.push(new THREE.Vector3(0, 0, 4.1));
    }

    // Enter destination wing through its grand archway
    if (endZone === 'w1') {
      pts.push(new THREE.Vector3(-2.1, 0, 3.3));
      pts.push(new THREE.Vector3(-4.75, 0, 2.2));
    } else if (endZone === 'w3') {
      pts.push(new THREE.Vector3(2.1, 0, 3.3));
      pts.push(new THREE.Vector3(4.75, 0, 2.2));
    } else if (endZone === 'w2') {
      pts.push(new THREE.Vector3(0, 0, 0.3));
      pts.push(new THREE.Vector3(0, 0, -1.65));
    }
  }

  pts.push(new THREE.Vector3(toX, 0, toZ));
  return pts;
}

function resolveCollision(
  x: number,
  z: number,
  radius: number,
  colliders: AABB[],
  bounds: AABB
): { x: number; z: number } {
  let nx = THREE.MathUtils.clamp(x, bounds.minX, bounds.maxX);
  let nz = THREE.MathUtils.clamp(z, bounds.minZ, bounds.maxZ);

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const minX = c.minX - radius;
    const maxX = c.maxX + radius;
    const minZ = c.minZ - radius;
    const maxZ = c.maxZ + radius;

    if (nx > minX && nx < maxX && nz > minZ && nz < maxZ) {
      const penLeft = nx - minX;
      const penRight = maxX - nx;
      const penTop = nz - minZ;
      const penBottom = maxZ - nz;
      const minPen = Math.min(penLeft, penRight, penTop, penBottom);
      if (minPen === penLeft) nx = minX;
      else if (minPen === penRight) nx = maxX;
      else if (minPen === penTop) nz = minZ;
      else nz = maxZ;
    }
  }

  return { x: nx, z: nz };
}

export const KnigogradExplorer3D: React.FC<KnigogradExplorer3DProps> = ({
  save,
  totalBibliks,
  completedTasks,
  initialPlayerPos,
  onSavePlayerPos,
  onNavigate,
  onSwitchTo2D,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hasMovedOnce, setHasMovedOnce] = useState(false);
  const [currentZone, setCurrentZone] = useState<'lobby' | 'w1' | 'w2' | 'w3'>('lobby');
  const [playerRadar, setPlayerRadar] = useState<{ x: number; z: number; yaw: number }>({
    x: initialPlayerPos?.x ?? 0,
    z: initialPlayerPos?.z ?? 5.1,
    yaw: 0,
  });
  const [hoveredStationTitle, setHoveredStationTitle] = useState<string | null>(null);
  const [nearbyStation, setNearbyStation] = useState<{
    id: string;
    workshop: WorkshopId;
    taskIdx: number;
    title: string;
    subtitle: string;
    roomName: string;
    accentHex: string;
    completed: boolean;
  } | null>(null);
  const [walkingToLabel, setWalkingToLabel] = useState<string | null>(null);

  const saveRef = useRef(save);
  saveRef.current = save;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const onSavePosRef = useRef(onSavePlayerPos);
  onSavePosRef.current = onSavePlayerPos;
  const initialPosRef = useRef(initialPlayerPos);
  const rotHoldStartRef = useRef(0);

  // Next uncompleted station for clear quest tracking & glowing floor trail
  const nextObjective = useMemo(() => {
    for (const ws of WORKSHOPS) {
      const arr = ws.id === 1 ? save.w1 : ws.id === 2 ? save.w2 : save.w3;
      const idx = arr.findIndex((t) => !t.completed);
      if (idx !== -1) {
        return {
          stationId: `w${ws.id}-${idx}`,
          workshop: ws.id,
          taskIdx: idx,
          roomName: ws.id === 1 ? 'Библиотека' : ws.id === 2 ? 'Редакция' : 'Библионочь',
          title: ws.tasks[idx].title,
          shortDesc: ws.tasks[idx].shortDesc,
        };
      }
    }
    return null;
  }, [save.w1, save.w2, save.w3]);

  const nextObjRef = useRef(nextObjective);
  nextObjRef.current = nextObjective;

  const controllerRef = useRef<{
    walkToStation: (stationId: string, openOnArrive: boolean) => void;
    walkToRoom: (room: 'lobby' | 'w1' | 'w2' | 'w3') => void;
    openNearby: () => void;
    setVirtualKey: (
      code: 'KeyW' | 'KeyS' | 'KeyA' | 'KeyD' | 'CamLeft' | 'CamRight',
      pressed: boolean
    ) => void;
    nudgeCameraYaw: (deltaRad: number) => void;
    resetCameraView: () => void;
  } | null>(null);

  const handleOpenStation = useCallback((workshop: WorkshopId, taskIdx: number) => {
    soundEngine.playSelectTick();
    onNavigateRef.current({ view: 'workshop', workshop, task: taskIdx });
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    if (!isWebGLAvailable()) {
      setWebglError(true);
      return;
    }

    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e8dfd1');
    scene.fog = new THREE.Fog('#e8dfd1', 26, 52);

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 80);

    let bundle: ReturnType<typeof createStudioRenderer>;
    try {
      bundle = createStudioRenderer(container, scene);
    } catch {
      setWebglError(true);
      return;
    }
    const { renderer, isSoftwareGl, envTexture } = bundle;
    renderer.toneMappingExposure = 0.96;
    scene.environmentIntensity = 0.45;

    // Warm balanced museum/library lighting rig (<= 3 shadow casters, zero blowout)
    const hemi = new THREE.HemisphereLight('#f5efe6', '#75604b', 0.58);
    hemi.position.set(0, 18, 0);
    scene.add(hemi);

    const sunKey = new THREE.DirectionalLight('#fff2db', 1.15);
    sunKey.position.set(10, 16, 11);
    if (!isSoftwareGl) {
      sunKey.castShadow = true;
      sunKey.shadow.mapSize.set(2048, 2048);
      sunKey.shadow.camera.near = 2;
      sunKey.shadow.camera.far = 48;
      const d = 17;
      sunKey.shadow.camera.left = -d;
      sunKey.shadow.camera.right = d;
      sunKey.shadow.camera.top = d;
      sunKey.shadow.camera.bottom = -d;
      sunKey.shadow.bias = -0.0005;
      sunKey.shadow.normalBias = 0.025;
    }
    scene.add(sunKey);

    const fillRim = new THREE.DirectionalLight('#b9d6ff', 0.42);
    fillRim.position.set(-14, 10, -10);
    scene.add(fillRim);

    // Build entire cozy walkable Grand Knigograd World
    const world: KnigogradWorldHandles = buildKnigogradWorld(renderer, saveRef.current);
    scene.add(world.root);

    // Click destination ring indicator on floor
    const destRing = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.42, 24),
      new THREE.MeshBasicMaterial({
        color: '#ffd66b',
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      })
    );
    destRing.rotation.x = -Math.PI / 2;
    destRing.position.y = 0.05;
    destRing.visible = false;
    scene.add(destRing);

    // Subtle floor hover ring so players immediately see the floor is clickable to walk
    const hoverRing = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.34, 24),
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      })
    );
    hoverRing.rotation.x = -Math.PI / 2;
    hoverRing.position.y = 0.048;
    hoverRing.visible = false;
    scene.add(hoverRing);

    // Expanding floor click ripple for crisp tactile feedback without audio
    const clickRippleMat = new THREE.MeshBasicMaterial({
      color: '#ffd66b',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const clickRipple = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 28), clickRippleMat);
    clickRipple.rotation.x = -Math.PI / 2;
    clickRipple.position.y = 0.052;
    clickRipple.visible = false;
    scene.add(clickRipple);
    let rippleProgress = 1;

    // Gentle floating warm light motes in the hall (skipped on software GL)
    let motePoints: THREE.Points | null = null;
    if (!isSoftwareGl) {
      const moteCount = 72;
      const motePositions = new Float32Array(moteCount * 3);
      for (let i = 0; i < moteCount; i++) {
        motePositions[i * 3] = (Math.random() - 0.5) * 26;
        motePositions[i * 3 + 1] = 0.9 + Math.random() * 3.4;
        motePositions[i * 3 + 2] = -8 + Math.random() * 14;
      }
      const moteGeo = new THREE.BufferGeometry();
      moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
      const moteMat = new THREE.PointsMaterial({
        color: '#fff4d2',
        size: 0.08,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      });
      motePoints = new THREE.Points(moteGeo, moteMat);
      scene.add(motePoints);
    }

    // Restore player starting position
    const startX = initialPosRef.current?.x ?? 0;
    const startZ = initialPosRef.current?.z ?? 5.1;
    const startRotY = initialPosRef.current?.rotY ?? Math.PI;
    world.player.root.position.set(startX, 0, startZ);
    world.player.root.rotation.y = startRotY;

    // 3rd-person smooth orbital follow camera state (full 360° yaw + tilt + zoom)
    const DEFAULT_YAW = 0;
    const DEFAULT_PITCH = 0.67; // ~38° cozy architectural angle
    const DEFAULT_DIST = 9.4;
    let camYaw = DEFAULT_YAW;
    let targetCamYaw = DEFAULT_YAW;
    let camPitch = DEFAULT_PITCH;
    let targetCamPitch = DEFAULT_PITCH;
    let camDist = DEFAULT_DIST;
    let targetCamDist = DEFAULT_DIST;

    const initHoriz = Math.cos(camPitch) * camDist;
    const initHeight = 1.15 + Math.sin(camPitch) * camDist;
    camera.position.set(startX, initHeight, startZ + initHoriz);
    _currentLook.set(startX, 1.15, startZ - 0.6);
    camera.lookAt(_currentLook);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Input & Navigation state
    const keys: Record<string, boolean> = {};
    let walkQueue: THREE.Vector3[] = [];
    let pendingOpenStation: WorldStation | null = null;
    let activeNearId: string | null = null;
    let hoveredStationId: string | null = null;
    let lastRadarPush = 0;
    let lastZone: 'lobby' | 'w1' | 'w2' | 'w3' = getZoneOf(startX, startZ);
    setCurrentZone(lastZone);

    // Track per-station sprite visual state so we only repaint canvas sprites on state change
    const spriteStates = new Map<string, { completed: boolean; isNear: boolean }>();
    const syncStationVisuals = (nearId: string | null) => {
      const s = saveRef.current;
      for (const st of world.stations) {
        const arr = st.workshop === 1 ? s.w1 : st.workshop === 2 ? s.w2 : s.w3;
        const done = Boolean(arr[st.taskIdx]?.completed);
        const isNear = st.id === nearId;
        const isHovered = st.id === hoveredStationId;

        const prev = spriteStates.get(st.id);
        if (!prev || prev.completed !== done || prev.isNear !== isNear) {
          spriteStates.set(st.id, { completed: done, isNear });
          updateStationLabelSprite(st, done, isNear);
        }

        const ringColor = isNear || isHovered ? '#ffd66b' : done ? '#22c55e' : st.accentHex;
        st.ringMat.color.set(ringColor);
        st.ringMat.emissive.set(ringColor);
        st.ringMat.emissiveIntensity = isNear ? 1.45 : isHovered ? 1.15 : done ? 0.65 : 0.55;
        st.ringMesh.scale.setScalar(isHovered || isNear ? 1.16 : 1);
        st.beaconMat.color.set(done ? '#22c55e' : st.accentHex);
        st.beaconMat.emissive.set(isNear || isHovered ? '#ffd66b' : done ? '#22c55e' : st.accentHex);
        st.beaconMat.emissiveIntensity = isNear ? 1.35 : isHovered ? 1.1 : 0.7;
      }

      // Dynamic room progress rewards
      const w1Done = s.w1.filter((t) => t.completed).length;
      const w2Done = s.w2.filter((t) => t.completed).length;
      const w3Done = s.w3.filter((t) => t.completed).length;
      world.decor.w1ExhLight.intensity = 0.65 + w1Done * 0.45;
      world.decor.w2MagStack.scale.y = 0.4 + w2Done * 0.22;
      world.decor.w3StageLight.intensity = 0.9 + w3Done * 0.5;
    };
    syncStationVisuals(null);

    const triggerOpenStation = (st: WorldStation) => {
      onSavePosRef.current?.({
        x: world.player.root.position.x,
        z: world.player.root.position.z,
        rotY: world.player.root.rotation.y,
      });
      handleOpenStation(st.workshop, st.taskIdx);
    };

    controllerRef.current = {
      walkToStation: (stationId: string, openOnArrive: boolean) => {
        const st = world.stations.find((item) => item.id === stationId);
        if (!st) return;
        setHasMovedOnce(true);
        const p = world.player.root.position;
        if (openOnArrive && p.distanceTo(st.standPos) < 1.35) {
          triggerOpenStation(st);
          return;
        }
        walkQueue = buildWalkPath(p.x, p.z, st.standPos.x, st.standPos.z);
        pendingOpenStation = openOnArrive ? st : null;
        destRing.position.set(st.standPos.x, 0.05, st.standPos.z);
        destRing.visible = true;
        setWalkingToLabel(st.title);
      },
      walkToRoom: (room) => {
        soundEngine.playSelectTick();
        setHasMovedOnce(true);
        const wp = world.roomWaypoints[room];
        const p = world.player.root.position;
        walkQueue = buildWalkPath(p.x, p.z, wp.x, wp.z);
        pendingOpenStation = null;
        destRing.position.set(wp.x, 0.05, wp.z);
        destRing.visible = true;
        const names = {
          lobby: 'Центральный холл',
          w1: 'Библиотека',
          w2: 'Редакция',
          w3: 'Зал «Библионочи»',
        };
        setWalkingToLabel(names[room]);
      },
      openNearby: () => {
        if (!activeNearId) return;
        const st = world.stations.find((item) => item.id === activeNearId);
        if (st) triggerOpenStation(st);
      },
      setVirtualKey: (code, pressed) => {
        keys[code] = pressed;
        if (pressed && code !== 'CamLeft' && code !== 'CamRight') {
          setHasMovedOnce(true);
        }
      },
      nudgeCameraYaw: (deltaRad: number) => {
        targetCamYaw += deltaRad;
      },
      resetCameraView: () => {
        targetCamYaw = DEFAULT_YAW;
        targetCamPitch = DEFAULT_PITCH;
        targetCamDist = DEFAULT_DIST;
      },
    };

    // Keyboard controls (prevent arrow scroll so movement works cleanly in iframes)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'KeyW' ||
        e.code === 'KeyA' ||
        e.code === 'KeyS' ||
        e.code === 'KeyD'
      ) {
        e.preventDefault();
        setHasMovedOnce(true);
      }
      keys[e.code] = true;
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
        if (activeNearId) {
          e.preventDefault();
          controllerRef.current?.openNearby();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    const onWindowBlur = () => {
      Object.keys(keys).forEach((k) => {
        keys[k] = false;
      });
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    // Mouse / Touch / Wheel controls:
    // - Drag with Left or Right mouse button (or touch) to smoothly rotate & tilt the room
    // - Quick Left-Click on floor or station to walk / open task
    // - Mouse Wheel to zoom in/out
    const raycaster = new THREE.Raycaster();
    let isPointerDown = false;
    let isDragging = false;
    let activeButton = 0;
    let lastDragX = 0;
    let lastDragY = 0;
    let lastHoverCheck = 0;
    let downPos = { x: 0, y: 0 };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onPointerDown = (e: PointerEvent) => {
      window.focus();
      isPointerDown = true;
      isDragging = e.button === 2 || e.button === 1;
      activeButton = e.button;
      downPos = { x: e.clientX, y: e.clientY };
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      if (isDragging) {
        hoverRing.visible = false;
        renderer.domElement.style.cursor = 'grabbing';
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (isPointerDown) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;

        if (!isDragging) {
          const totalMoved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
          if (totalMoved > 5) {
            isDragging = true;
            hoverRing.visible = false;
            renderer.domElement.style.cursor = 'grabbing';
          }
        }

        if (isDragging) {
          targetCamYaw -= dx * 0.0075;
          targetCamPitch = THREE.MathUtils.clamp(targetCamPitch + dy * 0.0055, 0.42, 1.22);
          return;
        }
      }

      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;
      const rect = renderer.domElement.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        hoverRing.visible = false;
        return;
      }
      _mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_mouseNdc, camera);
      const stationHover = raycaster.intersectObjects(world.stationClickables, false);
      if (stationHover.length > 0) {
        const stId = (stationHover[0].object.userData?.stationId as string | undefined) ?? null;
        if (stId !== hoveredStationId) {
          hoveredStationId = stId;
          syncStationVisuals(activeNearId);
          const stObj = stId ? world.stations.find((s) => s.id === stId) : null;
          setHoveredStationTitle(stObj ? `${stObj.roomName} · ${stObj.title}` : null);
        }
        renderer.domElement.style.cursor = 'pointer';
        hoverRing.visible = false;
        return;
      }
      if (hoveredStationId !== null) {
        hoveredStationId = null;
        syncStationVisuals(activeNearId);
        setHoveredStationTitle(null);
      }
      renderer.domElement.style.cursor = 'grab';
      const floorHits = raycaster.intersectObjects(world.floorClickables, false);
      if (floorHits.length > 0) {
        hoverRing.position.set(floorHits[0].point.x, 0.048, floorHits[0].point.z);
        hoverRing.visible = true;
      } else {
        hoverRing.visible = false;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const wasDragging = isDragging;
      const btn = activeButton;
      isPointerDown = false;
      isDragging = false;
      renderer.domElement.style.cursor = 'grab';

      if (wasDragging || btn !== 0) return;
      const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (moved > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      _mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_mouseNdc, camera);

      // 1. Check click on any 3D station first
      const stationHits = raycaster.intersectObjects(world.stationClickables, false);
      if (stationHits.length > 0) {
        const stId = stationHits[0].object.userData?.stationId as string | undefined;
        if (stId) {
          soundEngine.playSelectTick();
          setHasMovedOnce(true);
          controllerRef.current?.walkToStation(stId, true);
          return;
        }
      }

      // 2. Otherwise click on floor to walk there
      const floorHits = raycaster.intersectObjects(world.floorClickables, false);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        const safe = resolveCollision(pt.x, pt.z, 0.45, world.colliders, world.worldBounds);
        const p = world.player.root.position;
        walkQueue = buildWalkPath(p.x, p.z, safe.x, safe.z);
        pendingOpenStation = null;
        setHasMovedOnce(true);
        setWalkingToLabel(null);
        destRing.position.set(safe.x, 0.05, safe.z);
        destRing.visible = true;
        clickRipple.position.set(safe.x, 0.052, safe.z);
        clickRipple.scale.setScalar(0.8);
        clickRipple.visible = true;
        rippleProgress = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetCamDist = THREE.MathUtils.clamp(targetCamDist + e.deltaY * 0.008, 5.2, 15.0);
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const onContextRestored = () => setWebglError(false);

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const onResize = () => {
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // Continuous Game Loop (software-WebGL-safe with fenceSync pacing)
    let frameId = 0;
    let timeoutId = 0;
    let lastNow = performance.now();
    let walkPhase = 0;

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastNow) / 1000, 0.08);
      lastNow = now;
      const elapsed = now * 0.001;

      // Smooth Q/R or on-screen button camera rotation
      if (keys['KeyQ'] || keys['CamLeft']) targetCamYaw += 1.9 * dt;
      if (keys['KeyR'] || keys['CamRight'] || (keys['KeyE'] && !activeNearId)) {
        targetCamYaw -= 1.9 * dt;
      }

      const orbitLambda = isSoftwareGl ? 16 : 10;
      camYaw = THREE.MathUtils.damp(camYaw, targetCamYaw, orbitLambda, dt);
      camPitch = THREE.MathUtils.damp(camPitch, targetCamPitch, orbitLambda, dt);
      camDist = THREE.MathUtils.damp(camDist, targetCamDist, orbitLambda, dt);

      // WASD / Arrow keyboard movement overrides auto-walk
      const fwd = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
      const strafe =
        (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

      let isMoving = false;
      const speed = 5.4;
      const pPos = world.player.root.position;

      if (fwd !== 0 || strafe !== 0) {
        walkQueue = [];
        pendingOpenStation = null;
        destRing.visible = false;
        setWalkingToLabel(null);

        const sinY = Math.sin(camYaw);
        const cosY = Math.cos(camYaw);
        // Forward along camera view direction (-sinY, -cosY)
        const mx = -sinY * fwd + cosY * strafe;
        const mz = -cosY * fwd - sinY * strafe;
        _moveVec.set(mx, 0, mz).normalize();

        const next = resolveCollision(
          pPos.x + _moveVec.x * speed * dt,
          pPos.z + _moveVec.z * speed * dt,
          0.42,
          world.colliders,
          world.worldBounds
        );
        pPos.x = next.x;
        pPos.z = next.z;
        isMoving = true;

        const targetAngle = Math.atan2(_moveVec.x, _moveVec.z);
        let diff = targetAngle - world.player.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        world.player.root.rotation.y += diff * Math.min(1, dt * 12);
      } else if (walkQueue.length > 0) {
        const target = walkQueue[0];
        const dx = target.x - pPos.x;
        const dz = target.z - pPos.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.28) {
          walkQueue.shift();
          if (walkQueue.length === 0) {
            destRing.visible = false;
            setWalkingToLabel(null);
            if (pendingOpenStation) {
              const toOpen = pendingOpenStation;
              pendingOpenStation = null;
              triggerOpenStation(toOpen);
            }
          }
        } else {
          const step = Math.min(dist, speed * 1.12 * dt);
          const nx = pPos.x + (dx / dist) * step;
          const nz = pPos.z + (dz / dist) * step;
          const safe = resolveCollision(nx, nz, 0.36, world.colliders, world.worldBounds);
          pPos.x = safe.x;
          pPos.z = safe.z;
          isMoving = true;

          const targetAngle = Math.atan2(dx, dz);
          let diff = targetAngle - world.player.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          world.player.root.rotation.y += diff * Math.min(1, dt * 12);
        }
      }

      // Animate player avatar stride & idle breathing
      if (isMoving) {
        walkPhase += dt * 11.5;
        const swing = Math.sin(walkPhase) * 0.62;
        world.player.leftLeg.rotation.x = swing;
        world.player.rightLeg.rotation.x = -swing;
        world.player.leftArm.rotation.x = -swing * 0.7;
        world.player.rightArm.rotation.x = swing * 0.7;
        world.player.bodyGroup.position.y = Math.abs(Math.sin(walkPhase)) * 0.06;
      } else {
        world.player.leftLeg.rotation.x = THREE.MathUtils.damp(world.player.leftLeg.rotation.x, 0, 10, dt);
        world.player.rightLeg.rotation.x = THREE.MathUtils.damp(world.player.rightLeg.rotation.x, 0, 10, dt);
        world.player.leftArm.rotation.x = THREE.MathUtils.damp(world.player.leftArm.rotation.x, 0, 10, dt);
        world.player.rightArm.rotation.x = THREE.MathUtils.damp(world.player.rightArm.rotation.x, 0, 10, dt);
        world.player.bodyGroup.position.y = Math.sin(elapsed * 2.2) * 0.015;
      }

      // Friendly Mentor NPC idle wave & active Working Staff typing/operating animation
      for (let i = 0; i < world.npcs.length; i++) {
        const npc = world.npcs[i];
        if (npc.mode === 'work') {
          npc.rightArm.rotation.x = -0.68 + Math.sin(elapsed * 7.5 + npc.phase) * 0.14;
          npc.rightArm.rotation.z = -0.08 + Math.cos(elapsed * 5.0 + npc.phase) * 0.06;
          if (npc.leftArm) {
            npc.leftArm.rotation.x = -0.64 + Math.cos(elapsed * 7.2 + npc.phase) * 0.14;
            npc.leftArm.rotation.z = 0.08;
          }
          npc.head.rotation.y = Math.sin(elapsed * 1.6 + npc.phase) * 0.16;
          npc.head.rotation.x = 0.12 + Math.sin(elapsed * 2.4 + npc.phase) * 0.04;
        } else {
          npc.rightArm.rotation.z = 0.25 + Math.sin(elapsed * 3.0 + npc.phase) * 0.22;
          npc.rightArm.rotation.x = -0.35 + Math.sin(elapsed * 2.2 + npc.phase) * 0.15;
          npc.head.rotation.y = Math.sin(elapsed * 1.1 + npc.phase) * 0.22;
        }
      }

      // Live Printing Press Animation in Editorial Hall (spinning roller, sliding magazine sheets, status LED)
      world.decor.w2PressRoller.rotation.x = elapsed * 4.2;
      world.decor.w2PressLedMat.emissiveIntensity = 0.7 + Math.sin(elapsed * 6.5) * 0.65;
      for (let sIdx = 0; sIdx < world.decor.w2PrintingSheets.length; sIdx++) {
        const sheet = world.decor.w2PrintingSheets[sIdx];
        const cycle = (elapsed * 0.55 + sIdx * 0.5) % 1;
        // Sheet slides out from the press roller (x = 0.36) onto the magazine stack (x = -0.48)
        sheet.position.x = THREE.MathUtils.lerp(0.36, -0.48, cycle);
        sheet.position.y = 1.05 - cycle * 0.14 + Math.sin(cycle * Math.PI) * 0.03;
      }

      // Animate station beacons & check nearest station within interaction radius
      let closest: WorldStation | null = null;
      let closestDist = Infinity;
      for (let i = 0; i < world.stations.length; i++) {
        const st = world.stations[i];
        st.beaconCore.rotation.y = elapsed * 1.2 + i * 0.7;
        st.beaconGroup.position.y = st.labelBaseY - 0.55 + Math.sin(elapsed * 2.4 + i) * 0.06;

        const d = Math.hypot(pPos.x - st.standPos.x, pPos.z - st.standPos.z);
        if (d < st.interactRadius && d < closestDist) {
          closestDist = d;
          closest = st;
        }
      }

      const nextNearId = closest ? closest.id : null;
      if (nextNearId !== activeNearId) {
        activeNearId = nextNearId;
        syncStationVisuals(activeNearId);
        if (closest) {
          const arr =
            closest.workshop === 1
              ? saveRef.current.w1
              : closest.workshop === 2
                ? saveRef.current.w2
                : saveRef.current.w3;
          setNearbyStation({
            id: closest.id,
            workshop: closest.workshop,
            taskIdx: closest.taskIdx,
            title: closest.title,
            subtitle: closest.subtitle,
            roomName: closest.roomName,
            accentHex: closest.accentHex,
            completed: Boolean(arr[closest.taskIdx]?.completed),
          });
        } else {
          setNearbyStation(null);
        }
      }

      // Update current room indicator
      const zoneNow = getZoneOf(pPos.x, pPos.z);
      if (zoneNow !== lastZone) {
        lastZone = zoneNow;
        setCurrentZone(zoneNow);
      }

      // Update glowing golden floor guide dots leading toward next unfinished objective!
      const obj = nextObjRef.current;
      const targetSt = obj ? world.stations.find((s) => s.id === obj.stationId) : null;
      if (targetSt) {
        const guidePath = buildWalkPath(pPos.x, pPos.z, targetSt.standPos.x, targetSt.standPos.z);
        const totalSegs = guidePath.length;
        // Sample 10 evenly spaced glowing stepping dots along the path
        let totalLen = 0;
        _stepStart.set(pPos.x, 0, pPos.z);
        const segLens: number[] = [];
        for (let i = 0; i < totalSegs; i++) {
          const prev = i === 0 ? _stepStart : guidePath[i - 1];
          const len = Math.hypot(guidePath[i].x - prev.x, guidePath[i].z - prev.z);
          segLens.push(len);
          totalLen += len;
        }

        for (let d = 0; d < world.guideDots.length; d++) {
          const dot = world.guideDots[d];
          const distAlong = ((d + 0.5 + ((elapsed * 1.4) % 1)) / world.guideDots.length) * Math.min(totalLen, 11);
          if (totalLen < 1.3 || distAlong < 0.75 || distAlong > totalLen - 0.5) {
            dot.visible = false;
            continue;
          }
          let acc = 0;
          let placed = false;
          for (let sIdx = 0; sIdx < totalSegs; sIdx++) {
            const sLen = segLens[sIdx];
            if (acc + sLen >= distAlong && sLen > 0.001) {
              const prev = sIdx === 0 ? _stepStart : guidePath[sIdx - 1];
              const t = (distAlong - acc) / sLen;
              dot.position.set(
                THREE.MathUtils.lerp(prev.x, guidePath[sIdx].x, t),
                0.045,
                THREE.MathUtils.lerp(prev.z, guidePath[sIdx].z, t)
              );
              const scale = 0.78 + Math.sin(elapsed * 4 - d * 0.6) * 0.16;
              dot.scale.set(scale, 1, scale);
              dot.visible = true;
              placed = true;
              break;
            }
            acc += sLen;
          }
          if (!placed) dot.visible = false;
        }
      } else {
        for (let d = 0; d < world.guideDots.length; d++) {
          world.guideDots[d].visible = false;
        }
      }

      // Smooth 3rd-person orbital follow camera (full 360° rotation + pitch + zoom)
      const horizDist = Math.cos(camPitch) * camDist;
      const camHeight = 1.15 + Math.sin(camPitch) * camDist;
      _desiredCamPos.set(
        pPos.x + Math.sin(camYaw) * horizDist,
        camHeight,
        pPos.z + Math.cos(camYaw) * horizDist
      );
      _desiredLook.set(
        pPos.x - Math.sin(camYaw) * 0.85,
        1.15,
        pPos.z - Math.cos(camYaw) * 0.85
      );

      const camLambda = isSoftwareGl ? 14 : 8.5;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _desiredCamPos.x, camLambda, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _desiredCamPos.y, camLambda, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _desiredCamPos.z, camLambda, dt);

      _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _desiredLook.x, camLambda, dt);
      _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _desiredLook.y, camLambda, dt);
      _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _desiredLook.z, camLambda, dt);
      camera.lookAt(_currentLook);

      if (destRing.visible) {
        destRing.rotation.z = elapsed * 2.2;
      }

      if (clickRipple.visible) {
        rippleProgress += dt * 2.4;
        if (rippleProgress >= 1) {
          clickRipple.visible = false;
        } else {
          clickRipple.scale.setScalar(0.8 + rippleProgress * 2.1);
          clickRippleMat.opacity = (1 - rippleProgress) * 0.75;
        }
      }

      if (motePoints) {
        motePoints.rotation.y = Math.sin(elapsed * 0.08) * 0.06;
        motePoints.position.y = Math.sin(elapsed * 0.65) * 0.14;
      }

      // Gentle fairy light twinkle in Workshop 3 (Biblio-night)
      for (let f = 0; f < world.decor.w3FairyMats.length; f++) {
        const fMat = world.decor.w3FairyMats[f];
        fMat.emissiveIntensity = 0.75 + Math.sin(elapsed * 2.8 + f * 0.9) * 0.35;
      }

      // Subtle pulse on current target station ring
      if (targetSt && targetSt.id !== activeNearId && targetSt.id !== hoveredStationId) {
        targetSt.ringMesh.scale.setScalar(1 + Math.sin(elapsed * 4.2) * 0.08);
      }

      // Throttled player position sync for top-right mini-map
      if (now - lastRadarPush > 110) {
        lastRadarPush = now;
        setPlayerRadar({ x: pPos.x, z: pPos.z, yaw: camYaw });
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        scheduleAfterDraw(renderer, tick, (id) => {
          timeoutId = id;
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      if (timeoutId) window.clearTimeout(timeoutId);
      onSavePosRef.current?.({
        x: world.player.root.position.x,
        z: world.player.root.position.z,
        rotY: world.player.root.rotation.y,
      });
      controllerRef.current = null;
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      disposeObjectTree(scene);
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [handleOpenStation]);

  const getProgressArr = (wId: WorkshopId) =>
    wId === 1 ? save.w1 : wId === 2 ? save.w2 : save.w3;

  const zoneTitleMap = {
    lobby: 'Центральный холл «Инфополиса БИД»',
    w1: 'Мастерская 1 · Библиотека и инфоресурсы',
    w2: 'Мастерская 2 · Издательство и редакция',
    w3: 'Мастерская 3 · Зал «Библионочи»',
  };

  if (webglError) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-[#e8dfd1]">
        <div className="max-w-md bg-white rounded-2xl p-6 shadow-lg border border-[#13294b]/12 text-center space-y-4">
          <h2 className="font-display font-extrabold text-xl text-[#13294b]">
            3D-режим недоступен на этом ПК
          </h2>
          <p className="text-sm text-[#13294b]/75 leading-relaxed">
            Все 3 мастерские и 12 заданий полностью работают в классическом режиме карточек.
          </p>
          <button
            type="button"
            onClick={onSwitchTo2D}
            className="min-h-[44px] px-5 rounded-xl bg-[#13294b] text-white font-display font-bold text-sm"
          >
            Открыть список мастерских
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#e8dfd1] select-none">
      {/* Dedicated WebGL Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Top-Left Compact Mission Compass (No backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 z-10 max-w-sm">
        <div className="pointer-events-auto rounded-2xl bg-[#13294b]/94 text-white px-4 py-3 border border-white/15 shadow-lg space-y-2">
          <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-[#ffd66b]">
            <span className="truncate">{zoneTitleMap[currentZone]}</span>
            <span className="font-mono-tabular text-white/85 shrink-0">
              {completedTasks}/12 · {totalBibliks} б.
            </span>
          </div>

          {nextObjective ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#7dd3fc]">
                  Цель · {nextObjective.roomName}
                </div>
                <div className="font-display font-extrabold text-sm leading-snug truncate">
                  {nextObjective.taskIdx + 1}. {nextObjective.title}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  controllerRef.current?.walkToStation(nextObjective.stationId, true)
                }
                className="shrink-0 min-h-[36px] px-3 rounded-xl bg-[#ffd66b] hover:bg-[#f7c84d] text-[#13294b] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Идти к цели</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="font-display font-extrabold text-sm text-[#4ade80]">
                Все 12 заданий выполнены!
              </div>
              <button
                type="button"
                onClick={() => onNavigate({ view: 'results' })}
                className="shrink-0 min-h-[36px] px-3.5 rounded-xl bg-[#ffd66b] text-[#13294b] text-xs font-extrabold whitespace-nowrap"
              >
                Открыть итоги
              </button>
            </div>
          )}

          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-white/75">
            <span>Зажми мышь — вращать · Колёсико — зум</span>
            <button
              type="button"
              onClick={() => controllerRef.current?.resetCameraView()}
              className="shrink-0 text-[#ffd66b] hover:underline font-bold"
            >
              Сброс вида
            </button>
          </div>
        </div>

        {hoveredStationTitle && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#13294b]/95 text-[#ffd66b] px-3 py-1.5 text-xs font-extrabold border border-[#ffd66b]/45 shadow-lg animate-card-in">
            <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{hoveredStationTitle}</span>
          </div>
        )}
      </div>

      {/* Top-Right Interactive Mini-Map Radar */}
      <div className="pointer-events-auto hidden md:block absolute top-3.5 right-3.5 z-10 w-[224px] rounded-2xl bg-[#13294b]/94 text-white p-2.5 border border-white/15 shadow-lg">
        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#ffd66b] mb-1.5 px-1">
          <span>План Инфополиса БИД</span>
          <span className="text-white/65">клик → идти</span>
        </div>
        {(() => {
          const toX = (wx: number) => ((wx + 14.5) / 29) * 200;
          const toY = (wz: number) => ((wz + 9.5) / 16.5) * 114;
          const radarStations: { id: string; w: WorkshopId; t: number; x: number; z: number; color: string }[] = [
            { id: 'w1-0', w: 1, t: 0, x: -8.0, z: 2.3, color: '#38bdf8' },
            { id: 'w1-1', w: 1, t: 1, x: -12.2, z: -4.15, color: '#38bdf8' },
            { id: 'w1-2', w: 1, t: 2, x: -10.7, z: 1.3, color: '#38bdf8' },
            { id: 'w1-3', w: 1, t: 3, x: -7.6, z: -3.65, color: '#38bdf8' },
            { id: 'w2-0', w: 2, t: 0, x: -1.1, z: -3.7, color: '#fb7185' },
            { id: 'w2-1', w: 2, t: 1, x: -1.1, z: -6.9, color: '#fb7185' },
            { id: 'w2-2', w: 2, t: 2, x: 1.1, z: -6.9, color: '#fb7185' },
            { id: 'w2-3', w: 2, t: 3, x: 1.1, z: -3.7, color: '#fb7185' },
            { id: 'w3-0', w: 3, t: 0, x: 7.2, z: -3.75, color: '#facc15' },
            { id: 'w3-1', w: 3, t: 1, x: 11.6, z: -2.85, color: '#facc15' },
            { id: 'w3-2', w: 3, t: 2, x: 8.2, z: 2.55, color: '#facc15' },
            { id: 'w3-3', w: 3, t: 3, x: 10.85, z: 2.55, color: '#facc15' },
          ];
          const px = toX(playerRadar.x);
          const py = toY(playerRadar.z);
          return (
            <svg viewBox="0 0 200 114" className="w-full h-auto rounded-xl bg-[#0c1b33] border border-white/10">
              {/* Clickable Room Zones */}
              <rect
                x="4"
                y="6"
                width="62"
                height="102"
                rx="6"
                fill={currentZone === 'w1' ? 'rgba(19, 92, 117, 0.5)' : 'rgba(255,255,255,0.05)'}
                stroke="rgba(125,211,252,0.35)"
                className="cursor-pointer hover:fill-[#135c75]/55 transition-colors"
                onClick={() => controllerRef.current?.walkToRoom('w1')}
              />
              <rect
                x="69"
                y="6"
                width="62"
                height="48"
                rx="6"
                fill={currentZone === 'w2' ? 'rgba(196, 30, 46, 0.45)' : 'rgba(255,255,255,0.05)'}
                stroke="rgba(251,113,133,0.35)"
                className="cursor-pointer hover:fill-[#c41e2e]/50 transition-colors"
                onClick={() => controllerRef.current?.walkToRoom('w2')}
              />
              <rect
                x="69"
                y="57"
                width="62"
                height="51"
                rx="6"
                fill={currentZone === 'lobby' ? 'rgba(255, 214, 107, 0.2)' : 'rgba(255,255,255,0.04)'}
                stroke="rgba(255,255,255,0.18)"
                className="cursor-pointer hover:fill-white/12 transition-colors"
                onClick={() => controllerRef.current?.walkToRoom('lobby')}
              />
              <rect
                x="134"
                y="6"
                width="62"
                height="102"
                rx="6"
                fill={currentZone === 'w3' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255,255,255,0.05)'}
                stroke="rgba(250,204,21,0.35)"
                className="cursor-pointer hover:fill-[#ffd66b]/25 transition-colors"
                onClick={() => controllerRef.current?.walkToRoom('w3')}
              />

              {/* Zone Micro Labels + Progress */}
              <text x="35" y="101" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="7" fontWeight="700">
                1. БИД ({save.w1.filter((t) => t.completed).length}/4)
              </text>
              <text x="100" y="16" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="7" fontWeight="700">
                2. Ред. ({save.w2.filter((t) => t.completed).length}/4)
              </text>
              <text x="100" y="101" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="7" fontWeight="700">
                Холл
              </text>
              <text x="165" y="101" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="7" fontWeight="700">
                3. БН ({save.w3.filter((t) => t.completed).length}/4)
              </text>

              {/* 12 Station Dots */}
              {radarStations.map((rs) => {
                const arr = getProgressArr(rs.w);
                const done = Boolean(arr[rs.t]?.completed);
                const isNext = nextObjective?.stationId === rs.id;
                const sx = toX(rs.x);
                const sy = toY(rs.z);
                return (
                  <g
                    key={rs.id}
                    className="cursor-pointer"
                    onClick={() => controllerRef.current?.walkToStation(rs.id, true)}
                  >
                    {isNext && (
                      <circle cx={sx} cy={sy} r="7" fill="none" stroke="#ffd66b" strokeWidth="1.5" opacity="0.85">
                        <animate attributeName="r" values="4;8;4" dur="1.6s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.6s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={sx}
                      cy={sy}
                      r="3.4"
                      fill={done ? '#4ade80' : isNext ? '#ffd66b' : rs.color}
                      stroke="#0c1b33"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

              {/* Player Marker + Camera Look Cone */}
              <g transform={`translate(${px.toFixed(1)}, ${py.toFixed(1)}) rotate(${((-playerRadar.yaw * 180) / Math.PI).toFixed(1)})`}>
                <path d="M 0 0 L -8 -15 A 16 16 0 0 1 8 -15 Z" fill="rgba(255,214,107,0.28)" />
                <circle r="4.2" fill="#ffffff" stroke="#c41e2e" strokeWidth="1.8" />
              </g>
            </svg>
          );
        })()}

        {/* Quick 1-Click Room Teleport Buttons */}
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-extrabold">
          <button
            type="button"
            onClick={() => controllerRef.current?.walkToRoom('w1')}
            className={`px-2 py-1.5 rounded-lg border text-left truncate transition-colors ${
              currentZone === 'w1'
                ? 'bg-[#135c75] border-[#7dd3fc] text-white'
                : 'bg-white/8 hover:bg-white/15 border-white/10 text-white/85'
            }`}
          >
            1. БИД · {save.w1.filter((t) => t.completed).length}/4
          </button>
          <button
            type="button"
            onClick={() => controllerRef.current?.walkToRoom('w2')}
            className={`px-2 py-1.5 rounded-lg border text-left truncate transition-colors ${
              currentZone === 'w2'
                ? 'bg-[#c41e2e] border-[#fda4af] text-white'
                : 'bg-white/8 hover:bg-white/15 border-white/10 text-white/85'
            }`}
          >
            2. Редакция · {save.w2.filter((t) => t.completed).length}/4
          </button>
          <button
            type="button"
            onClick={() => controllerRef.current?.walkToRoom('w3')}
            className={`px-2 py-1.5 rounded-lg border text-left truncate transition-colors ${
              currentZone === 'w3'
                ? 'bg-[#b45309] border-[#fde047] text-white'
                : 'bg-white/8 hover:bg-white/15 border-white/10 text-white/85'
            }`}
          >
            3. Библионочь · {save.w3.filter((t) => t.completed).length}/4
          </button>
          <button
            type="button"
            onClick={() =>
              nextObjective
                ? controllerRef.current?.walkToStation(nextObjective.stationId, true)
                : controllerRef.current?.walkToRoom('lobby')
            }
            className="px-2 py-1.5 rounded-lg bg-[#ffd66b] hover:bg-[#f7c84d] text-[#13294b] text-left truncate transition-colors"
          >
            {nextObjective ? '⚡ К стенду' : '🏛 В холл'}
          </button>
        </div>
      </div>

      {/* Unified Bottom Stack (Perfectly Centered, Zero Overlap Between Prompt & Dock) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-2.5 px-3">
        {/* 1. First-Step Movement Guide (Auto-dismisses on first move) */}
        {!hasMovedOnce && !nearbyStation && (
          <div className="pointer-events-auto w-full max-w-[640px] rounded-2xl bg-[#13294b]/96 text-white px-4 py-3 border-2 border-[#ffd66b] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-[#ffd66b] inline-flex items-center gap-1.5">
                <MousePointerClick className="w-4 h-4" />
                <span>Как ходить по Инфополису БИД:</span>
              </div>
              <div className="text-xs text-white/92 leading-snug">
                <strong>Клик по полу/стенду</strong> — идти ·{' '}
                <strong>Зажми мышь и тяни</strong> — вращать комнату ·{' '}
                <strong>Колёсико</strong> — масштаб
              </div>
            </div>
            {nextObjective && (
              <button
                type="button"
                onClick={() =>
                  controllerRef.current?.walkToStation(nextObjective.stationId, true)
                }
                className="shrink-0 min-h-[40px] px-4 rounded-xl bg-[#ffd66b] hover:bg-[#f7c84d] text-[#13294b] font-display font-extrabold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Footprints className="w-4 h-4" />
                <span>Пойти к заданию</span>
              </button>
            )}
          </div>
        )}

        {/* 2. Proximity Action Prompt (Stacked Cleanly Above Dock — Never Overlaps!) */}
        {nearbyStation && (
          <div className="pointer-events-auto w-full max-w-[580px] rounded-2xl bg-[#13294b] text-white px-4 py-3 border-2 border-[#ffd66b] shadow-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold text-[#ffd66b]">
                {nearbyStation.roomName} · Шаг {nearbyStation.taskIdx + 1}
                {nearbyStation.completed ? ' · Выполнено' : ''}
              </div>
              <div className="font-display font-extrabold text-sm sm:text-base truncate">
                {nearbyStation.title}
              </div>
              <div className="text-xs text-white/80 truncate">{nearbyStation.subtitle}</div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenStation(nearbyStation.workshop, nearbyStation.taskIdx)}
              className="shrink-0 min-h-[44px] px-4 rounded-xl bg-[#c41e2e] hover:bg-[#d92638] text-white font-display font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 whitespace-nowrap shadow-md"
            >
              <span className="px-1.5 py-0.5 rounded bg-white/20 font-mono-tabular text-[11px]">
                E
              </span>
              <span>{nearbyStation.completed ? 'Открыть ещё раз' : 'Выполнить'}</span>
            </button>
          </div>
        )}

        {/* 3. Brief Auto-Walk Status Strip */}
        {walkingToLabel && !nearbyStation && hasMovedOnce && (
          <div className="rounded-xl bg-[#13294b]/92 text-white px-4 py-1.5 text-xs font-bold border border-white/15 inline-flex items-center gap-2 shadow-md">
            <Footprints className="w-3.5 h-3.5 text-[#ffd66b]" />
            <span>Идём к: {walkingToLabel}</span>
          </div>
        )}

        {/* 4. Collapsible Centered Bottom Navigation Dock */}
        <div className="pointer-events-auto w-full max-w-[960px] flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="h-8 px-4 rounded-t-xl bg-[#13294b] text-white text-xs font-bold inline-flex items-center gap-1.5 border border-b-0 border-white/15 shadow-sm hover:bg-[#1a3763] whitespace-nowrap"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#ffd66b]" />
                <span>Показать навигатор (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-[#ffd66b]" />
                <span>Скрыть панель (H)</span>
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="w-full rounded-2xl bg-white/96 border border-[#13294b]/15 shadow-xl px-3.5 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => controllerRef.current?.walkToRoom('lobby')}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold transition-colors whitespace-nowrap ${
                      currentZone === 'lobby'
                        ? 'bg-[#13294b] text-white'
                        : 'bg-[#eef2f8] text-[#13294b] hover:bg-[#dfe7f4]'
                    }`}
                  >
                    Холл
                  </button>

                  {WORKSHOPS.map((ws) => {
                    const zKey = ws.id === 1 ? 'w1' : ws.id === 2 ? 'w2' : 'w3';
                    const doneCount = getProgressArr(ws.id).filter((t) => t.completed).length;
                    const active = currentZone === zKey;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => controllerRef.current?.walkToRoom(zKey)}
                        className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                          active
                            ? 'text-white'
                            : 'bg-[#eef2f8] text-[#13294b] hover:bg-[#dfe7f4]'
                        }`}
                        style={active ? { backgroundColor: ws.accentBg } : undefined}
                      >
                        <span>
                          {ws.id}. {ws.id === 1 ? 'Библиотека' : ws.id === 2 ? 'Редакция' : 'Библионочь'}
                        </span>
                        <span
                          className={`font-mono-tabular text-[11px] ${
                            active ? 'text-[#ffd66b]' : 'text-[#13294b]/65'
                          }`}
                        >
                          {doneCount}/4
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Tactile On-Screen Walk Arrows + Room Rotation + 2D Switcher */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className="flex items-center gap-1 bg-[#eef2f8] p-1 rounded-xl"
                    title="Вращать комнату (или зажми мышь и тяни)"
                  >
                    <button
                      type="button"
                      aria-label="Повернуть комнату влево"
                      title="Повернуть комнату влево (Q)"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        rotHoldStartRef.current = performance.now();
                        controllerRef.current?.setVirtualKey('CamLeft', true);
                      }}
                      onPointerUp={() => {
                        controllerRef.current?.setVirtualKey('CamLeft', false);
                        if (performance.now() - rotHoldStartRef.current < 200) {
                          controllerRef.current?.nudgeCameraYaw(0.55);
                        }
                      }}
                      onPointerLeave={() => controllerRef.current?.setVirtualKey('CamLeft', false)}
                      onPointerCancel={() => controllerRef.current?.setVirtualKey('CamLeft', false)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-[#13294b] hover:text-white active:bg-[#c41e2e] active:text-white text-[#13294b] flex items-center justify-center shadow-xs transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Повернуть комнату вправо"
                      title="Повернуть комнату вправо (R)"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        rotHoldStartRef.current = performance.now();
                        controllerRef.current?.setVirtualKey('CamRight', true);
                      }}
                      onPointerUp={() => {
                        controllerRef.current?.setVirtualKey('CamRight', false);
                        if (performance.now() - rotHoldStartRef.current < 200) {
                          controllerRef.current?.nudgeCameraYaw(-0.55);
                        }
                      }}
                      onPointerLeave={() => controllerRef.current?.setVirtualKey('CamRight', false)}
                      onPointerCancel={() => controllerRef.current?.setVirtualKey('CamRight', false)}
                      className="w-8 h-8 rounded-lg bg-white hover:bg-[#13294b] hover:text-white active:bg-[#c41e2e] active:text-white text-[#13294b] flex items-center justify-center shadow-xs transition-colors"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    className="flex items-center gap-1 bg-[#eef2f8] p-1 rounded-xl"
                    title="Удерживай стрелки, чтобы идти"
                  >
                    {(
                      [
                        { code: 'KeyA', icon: ArrowLeft, label: 'Идти влево' },
                        { code: 'KeyW', icon: ArrowUp, label: 'Идти вперёд' },
                        { code: 'KeyS', icon: ArrowDown, label: 'Идти назад' },
                        { code: 'KeyD', icon: ArrowRight, label: 'Идти вправо' },
                      ] as const
                    ).map((btn) => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.code}
                          type="button"
                          aria-label={btn.label}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            controllerRef.current?.setVirtualKey(btn.code, true);
                          }}
                          onPointerUp={() => controllerRef.current?.setVirtualKey(btn.code, false)}
                          onPointerLeave={() => controllerRef.current?.setVirtualKey(btn.code, false)}
                          onPointerCancel={() => controllerRef.current?.setVirtualKey(btn.code, false)}
                          className="w-8 h-8 rounded-lg bg-white hover:bg-[#13294b] hover:text-white active:bg-[#c41e2e] active:text-white text-[#13294b] flex items-center justify-center shadow-xs transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={onSwitchTo2D}
                    className="min-h-[38px] px-3.5 rounded-xl bg-[#ffd66b] hover:bg-[#ffca42] text-[#13294b] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>На главную</span>
                  </button>
                </div>
              </div>

              {/* Contextual 4-station quick-walk strip for the zone the student is currently inside */}
              {currentZone !== 'lobby' && (
                <div className="pt-2 border-t border-[#13294b]/10 flex flex-wrap items-center gap-1.5">
                  {(() => {
                    const wId: WorkshopId = currentZone === 'w1' ? 1 : currentZone === 'w2' ? 2 : 3;
                    const ws = WORKSHOPS[wId - 1];
                    const prog = getProgressArr(wId);
                    return (
                      <>
                        {ws.tasks.map((task, idx) => {
                          const done = prog[idx]?.completed;
                          return (
                            <button
                              key={task.title}
                              type="button"
                              onClick={() =>
                                controllerRef.current?.walkToStation(`w${wId}-${idx}`, true)
                              }
                              className={`min-h-[36px] px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                done
                                  ? 'bg-[#e9f7ef] text-[#157a4f] hover:bg-[#d8f1e3]'
                                  : 'bg-[#f4f6fb] text-[#13294b] hover:bg-[#e6ecf6]'
                              }`}
                            >
                              {done ? (
                                <Check className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <span className="font-mono-tabular">{idx + 1}.</span>
                              )}
                              <span>{task.title}</span>
                            </button>
                          );
                        })}
                        {prog.every((t) => t.completed) && (
                          <button
                            type="button"
                            onClick={() => onNavigate({ view: 'showcase', workshop: wId })}
                            className="min-h-[36px] px-3.5 rounded-xl bg-[#ffd66b] hover:bg-[#f7c84d] text-[#13294b] text-xs font-extrabold inline-flex items-center gap-1.5 ml-auto whitespace-nowrap"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>3D-витрина проекта</span>
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
