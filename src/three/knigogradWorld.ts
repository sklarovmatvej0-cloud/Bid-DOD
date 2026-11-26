import * as THREE from 'three';
import { MEDIA, STICKERS } from '../game/assets';
import { WORKSHOPS } from '../game/knigogradData';
import { KnigogradSave, WorkshopId } from '../game/knigogradTypes';
import {
  createContactShadowTexture,
  createPlaqueTexture,
  createScreenCanvasTexture,
  createWoodFloorTexture,
} from './webglUtils';

export interface WorldStation {
  id: string;
  workshop: WorkshopId;
  taskIdx: number;
  title: string;
  subtitle: string;
  roomName: string;
  accentHex: string;
  /** World position where the prop sits */
  pos: THREE.Vector3;
  /** Ideal standing spot for the player when approaching this station */
  standPos: THREE.Vector3;
  interactRadius: number;
  ringMesh: THREE.Mesh;
  ringMat: THREE.MeshStandardMaterial;
  beaconGroup: THREE.Group;
  beaconCore: THREE.Mesh;
  beaconMat: THREE.MeshStandardMaterial;
  labelSprite: THREE.Sprite;
  labelBaseY: number;
  hitMesh: THREE.Mesh;
}

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlayerAvatarHandle {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
}

export interface NpcHandle {
  root: THREE.Group;
  leftArm?: THREE.Group;
  rightArm: THREE.Group;
  head: THREE.Group;
  phase: number;
  mode?: 'wave' | 'work' | 'read';
}

export interface KnigogradWorldHandles {
  root: THREE.Group;
  floorClickables: THREE.Object3D[];
  stationClickables: THREE.Object3D[];
  stations: WorldStation[];
  colliders: AABB[];
  player: PlayerAvatarHandle;
  npcs: NpcHandle[];
  guideDots: THREE.Mesh[];
  worldBounds: AABB;
  roomWaypoints: Record<'lobby' | 'w1' | 'w2' | 'w3', THREE.Vector3>;
  decor: {
    w1ExhLight: THREE.PointLight;
    w2MagStack: THREE.Group;
    w2PressRoller: THREE.Mesh;
    w2PrintingSheets: THREE.Mesh[];
    w2PressLedMat: THREE.MeshStandardMaterial;
    w3StageLight: THREE.PointLight;
    w3FairyMats: THREE.MeshStandardMaterial[];
  };
}

function makeMat(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial(params);
}

/**
 * Creates a sleek, compact floating Russian 3D marker sprite above a station.
 */
function createFloatingLabelSprite(
  stepNum: number,
  title: string,
  accentHex: string,
  completed = false
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 104;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = completed ? 'rgba(17, 74, 48, 0.92)' : 'rgba(19, 41, 75, 0.92)';
  ctx.beginPath();
  ctx.roundRect(6, 6, 428, 92, 22);
  ctx.fill();

  ctx.strokeStyle = completed ? '#4ade80' : accentHex;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Number badge circle on left
  ctx.fillStyle = completed ? '#22c55e' : accentHex;
  ctx.beginPath();
  ctx.arc(54, 52, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 30px Unbounded, Manrope, sans-serif';
  ctx.fillText(completed ? '✓' : String(stepNum), 54, 53);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px Manrope, sans-serif';
  ctx.fillText(title, 98, 53, 318);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.55, 0.37, 1);
  return sprite;
}

export function updateStationLabelSprite(
  station: WorldStation,
  completed: boolean,
  isNear: boolean
): void {
  // Hide the 3D floating label when standing right next to the station
  // so it never overlaps the player avatar or duplicates the bottom action bar!
  station.labelSprite.visible = !isNear;
  if (isNear) return;

  const mat = station.labelSprite.material as THREE.SpriteMaterial;
  const prevMap = mat.map;

  const canvas = document.createElement('canvas');
  canvas.width = 440;
  canvas.height = 104;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = completed ? 'rgba(17, 74, 48, 0.92)' : 'rgba(19, 41, 75, 0.92)';
  ctx.beginPath();
  ctx.roundRect(6, 6, 428, 92, 22);
  ctx.fill();

  ctx.strokeStyle = completed ? '#4ade80' : station.accentHex;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = completed ? '#22c55e' : station.accentHex;
  ctx.beginPath();
  ctx.arc(54, 52, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 30px Unbounded, Manrope, sans-serif';
  ctx.fillText(completed ? '✓' : String(station.taskIdx + 1), 54, 53);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px Manrope, sans-serif';
  ctx.fillText(station.title, 98, 53, 318);

  const nextTex = new THREE.CanvasTexture(canvas);
  nextTex.colorSpace = THREE.SRGBColorSpace;
  mat.map = nextTex;
  mat.needsUpdate = true;
  prevMap?.dispose();
}

/**
 * Composite articulated 3D stylized student character (player or mentor NPC).
 */
function buildCharacter(options: {
  jacketHex: string;
  pantsHex: string;
  hairHex: string;
  accentHex: string;
  hasBackpack?: boolean;
  scale?: number;
}): PlayerAvatarHandle {
  const root = new THREE.Group();
  const s = options.scale ?? 1;
  root.scale.setScalar(s);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = makeMat({ color: '#f3c6a5', roughness: 0.65, metalness: 0.0 });
  const jacketMat = makeMat({ color: options.jacketHex, roughness: 0.62, metalness: 0.05 });
  const shirtMat = makeMat({ color: '#f8fafc', roughness: 0.72 });
  const pantsMat = makeMat({ color: options.pantsHex, roughness: 0.75 });
  const shoeMat = makeMat({ color: '#1e293b', roughness: 0.55 });
  const hairMat = makeMat({ color: options.hairHex, roughness: 0.68 });
  const accentMat = makeMat({ color: options.accentHex, roughness: 0.45 });

  // Soft ground shadow disc under feet
  const footShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  footShadow.rotation.x = -Math.PI / 2;
  footShadow.position.y = 0.015;
  root.add(footShadow);

  // Legs (pivoted at hips y = 0.62)
  const makeLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.62, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.36, 6, 10), pantsMat);
    thigh.position.y = -0.25;
    thigh.castShadow = true;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.28), shoeMat);
    shoe.position.set(0, -0.56, 0.04);
    shoe.castShadow = true;
    leg.add(thigh, shoe);
    return leg;
  };
  const leftLeg = makeLeg(-0.13);
  const rightLeg = makeLeg(0.13);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso (layered jacket + shirt collar + lanyard badge)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.26), jacketMat);
  torso.position.y = 0.9;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const shirtFront = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.275), shirtMat);
  shirtFront.position.y = 0.92;
  bodyGroup.add(shirtFront);

  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.02), accentMat);
  badge.position.set(0.11, 0.98, 0.145);
  bodyGroup.add(badge);

  if (options.hasBackpack) {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.18), accentMat);
    pack.position.set(0, 0.92, -0.2);
    pack.castShadow = true;
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.06), jacketMat);
    pocket.position.set(0, 0.82, -0.3);
    bodyGroup.add(pack, pocket);
  }

  // Arms (pivoted at shoulders y = 1.12)
  const makeArm = (x: number) => {
    const arm = new THREE.Group();
    arm.position.set(x, 1.12, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.32, 6, 10), jacketMat);
    sleeve.position.y = -0.2;
    sleeve.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), skinMat);
    hand.position.y = -0.43;
    arm.add(sleeve, hand);
    return arm;
  };
  const leftArm = makeArm(-0.31);
  const rightArm = makeArm(0.31);
  bodyGroup.add(leftArm, rightArm);

  // Head group (neck + head + hair cap + eyes)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.24, 0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 10), skinMat);
  neck.position.y = 0.02;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), skinMat);
  head.position.y = 0.21;
  head.castShadow = true;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.225, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hair.position.set(0, 0.23, -0.02);
  hair.rotation.x = -0.18;
  const eyeMat = makeMat({ color: '#13294b', roughness: 0.2 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
  leftEye.position.set(-0.075, 0.22, 0.188);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
  rightEye.position.set(0.075, 0.22, 0.188);
  headGroup.add(neck, head, hair, leftEye, rightEye);
  bodyGroup.add(headGroup);

  return { root, bodyGroup, leftLeg, rightLeg, leftArm, rightArm, headGroup };
}

/**
 * Composite potted indoor tree / plant (planter + soil + trunk + lush foliage clusters).
 */
function buildIndoorPlant(scale = 1, potColor = '#c86d4b'): THREE.Group {
  const g = new THREE.Group();
  g.scale.setScalar(scale);

  const potMat = makeMat({ color: potColor, roughness: 0.65, metalness: 0.05 });
  const soilMat = makeMat({ color: '#422c1d', roughness: 0.95 });
  const trunkMat = makeMat({ color: '#6b472b', roughness: 0.8 });
  const leafMat1 = makeMat({ color: '#2d6a4f', roughness: 0.68 });
  const leafMat2 = makeMat({ color: '#40916c', roughness: 0.62 });

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.46, 14), potMat);
  pot.position.y = 0.23;
  pot.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 16), potMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.45;
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 14), soilMat);
  soil.position.y = 0.43;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.72, 8), trunkMat);
  trunk.position.y = 0.75;
  g.add(pot, rim, soil, trunk);

  const blobs: [number, number, number, number, boolean][] = [
    [0, 1.28, 0, 0.36, true],
    [-0.22, 1.12, 0.14, 0.25, false],
    [0.24, 1.15, -0.1, 0.24, false],
    [0.05, 1.1, 0.24, 0.22, true],
    [-0.14, 1.42, -0.1, 0.22, false],
  ];
  blobs.forEach(([x, y, z, r, alt]) => {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), alt ? leafMat1 : leafMat2);
    puff.position.set(x, y, z);
    puff.castShadow = true;
    g.add(puff);
  });

  return g;
}

/**
 * Cozy lounge armchair + small side table.
 */
function buildCozyArmchair(fabricHex: string, woodMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const fabricMat = makeMat({ color: fabricHex, roughness: 0.88, metalness: 0.0 });
  const cushionMat = makeMat({ color: '#ffd66b', roughness: 0.85 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.24, 0.78), fabricMat);
  seat.position.y = 0.34;
  seat.castShadow = true;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.62, 0.18), fabricMat);
  back.position.set(0, 0.68, -0.32);
  back.rotation.x = -0.12;
  back.castShadow = true;
  [-0.39, 0.39].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.76), fabricMat);
    arm.position.set(ax, 0.52, -0.01);
    arm.castShadow = true;
    g.add(arm);
  });
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.11), cushionMat);
  pillow.position.set(0.12, 0.58, -0.16);
  pillow.rotation.set(-0.2, -0.25, 0.08);
  g.add(seat, back, pillow);

  const legGeo = new THREE.CylinderGeometry(0.03, 0.022, 0.22, 8);
  [
    [-0.34, -0.3],
    [0.34, -0.3],
    [-0.34, 0.3],
    [0.34, 0.3],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, 0.11, lz);
    g.add(leg);
  });
  return g;
}

/**
 * Warm studio desk (composite top + apron + 4 legs).
 */
function buildDesk(
  w: number,
  d: number,
  h: number,
  topMat: THREE.Material,
  legMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), topMat);
  top.position.y = h - 0.04;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  const legGeo = new THREE.CylinderGeometry(0.036, 0.026, h - 0.08, 10);
  const dx = w / 2 - 0.12;
  const dz = d / 2 - 0.12;
  [
    [-dx, -dz],
    [dx, -dz],
    [-dx, dz],
    [dx, dz],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(lx, (h - 0.08) / 2, lz);
    leg.castShadow = true;
    g.add(leg);
  });
  return g;
}

/**
 * Framed wall artwork using actual bundled Knigograd illustrations (zero 404).
 */
function buildFramedArtwork(
  texLoader: THREE.TextureLoader,
  renderer: THREE.WebGLRenderer,
  imgUrl: string,
  width: number,
  height: number,
  frameMat: THREE.Material,
  fallbackHex: string
): THREE.Group {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.14, height + 0.14, 0.07), frameMat);
  frame.castShadow = true;
  g.add(frame);

  const artMat = makeMat({ color: fallbackHex, roughness: 0.42, metalness: 0.02 });
  texLoader.load(imgUrl, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    artMat.color.set('#ffffff');
    artMat.map = tex;
    artMat.needsUpdate = true;
  });
  const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), artMat);
  canvasMesh.position.z = 0.04;
  g.add(canvasMesh);
  return g;
}

/**
 * Tall bookcase packed with InstancedMesh colorful books.
 */
function buildFullBookcase(
  width: number,
  height: number,
  woodMat: THREE.Material,
  seed = 1
): THREE.Group {
  const g = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), woodMat);
  back.position.set(0, height / 2, -0.22);
  back.castShadow = true;
  g.add(back);

  [-width / 2 + 0.05, width / 2 - 0.05].forEach((sx) => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.1, height, 0.5), woodMat);
    side.position.set(sx, height / 2, 0);
    side.castShadow = true;
    g.add(side);
  });

  const rows = 5;
  const rowStep = (height - 0.25) / rows;
  for (let r = 0; r <= rows; r++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(width - 0.04, 0.06, 0.48), woodMat);
    plank.position.set(0, 0.1 + r * rowStep, 0);
    plank.receiveShadow = true;
    g.add(plank);
  }

  const cols = Math.max(6, Math.floor((width - 0.25) / 0.14));
  const total = rows * cols;
  const bookGeo = new THREE.BoxGeometry(0.09, 0.34, 0.28);
  const bookMat = makeMat({ color: '#ffffff', roughness: 0.72 });
  const inst = new THREE.InstancedMesh(bookGeo, bookMat, total);
  const colors = [
    new THREE.Color('#135c75'),
    new THREE.Color('#c41e2e'),
    new THREE.Color('#d97706'),
    new THREE.Color('#157a4f'),
    new THREE.Color('#1e3a5f'),
    new THREE.Color('#6d28d9'),
    new THREE.Color('#b45309'),
    new THREE.Color('#0f766e'),
  ];
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const yBase = 0.13 + r * rowStep;
    for (let c = 0; c < cols; c++) {
      const hScale = 0.78 + ((r * 7 + c * 3 + seed) % 5) * 0.09;
      const xPos = -width / 2 + 0.18 + c * ((width - 0.36) / Math.max(1, cols - 1));
      dummy.position.set(xPos, yBase + (0.34 * hScale) / 2, 0.04);
      dummy.rotation.set(0, 0, r === 2 && c === Math.floor(cols / 2) ? -0.16 : 0);
      dummy.scale.set(1, hScale, 0.9 + ((c + seed) % 3) * 0.08);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
      inst.setColorAt(idx, colors[(r * 5 + c + seed) % colors.length]);
      idx++;
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.computeBoundingSphere();
  inst.castShadow = true;
  g.add(inst);

  return g;
}

/**
 * Monitor workstation with glowing procedural screen.
 */
function buildMonitor(screenTex: THREE.Texture, frameMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 14), frameMat);
  base.position.y = 0.015;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.04), frameMat);
  neck.position.set(0, 0.14, -0.02);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.58, 0.05), frameMat);
  bezel.position.set(0, 0.45, 0);
  bezel.castShadow = true;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.86, 0.52),
    makeMat({
      map: screenTex,
      emissiveMap: screenTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.45,
      roughness: 0.18,
    })
  );
  screen.position.set(0, 0.45, 0.028);
  g.add(base, neck, bezel, screen);
  return g;
}

/**
 * Warm hanging pendant chandelier lamp.
 */
function buildPendantLamp(brassMat: THREE.Material, shadeHex: string): THREE.Group {
  const g = new THREE.Group();
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.35, 8), brassMat);
  cord.position.y = 0.675;
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.24, 16, 1, true),
    makeMat({ color: shadeHex, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide })
  );
  shade.position.y = 0.02;
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    makeMat({ color: '#fff8db', emissive: '#ffd66b', emissiveIntensity: 1.2, roughness: 0.15 })
  );
  bulb.position.y = -0.06;
  g.add(cord, shade, bulb);
  return g;
}

/**
 * Builds the entire cozy, richly furnished walkable Grand Knigograd Cultural Center!
 *
 * Logical Floorplan (Y = 0 floor, player walks smoothly everywhere):
 * - Central Atrium (Холл): X ∈ [-4.5, 4.5], Z ∈ [1.5, 8.5] (Player spawns at [0, 0, 5.4] facing North)
 * - West Wing (1. Библиотека): X ∈ [-14.2, -4.5], Z ∈ [-6.5, 6.2]
 * - North Wing (2. Редакция): X ∈ [-4.5, 4.5], Z ∈ [-9.5, 1.5]
 * - East Wing (3. Зал Библионочи): X ∈ [4.5, 14.2], Z ∈ [-6.5, 6.2]
 */
export function buildKnigogradWorld(
  renderer: THREE.WebGLRenderer,
  save: KnigogradSave
): KnigogradWorldHandles {
  const root = new THREE.Group();
  const floorClickables: THREE.Object3D[] = [];
  const stationClickables: THREE.Object3D[] = [];
  const stations: WorldStation[] = [];
  const colliders: AABB[] = [];
  const npcs: NpcHandle[] = [];

  const texLoader = new THREE.TextureLoader();

  /* ---- Rich Architectural Material Palette (sculptural mid-tones, zero blown-out white) ---- */
  const wallCreamMat = makeMat({ color: '#d9cfbe', roughness: 0.88, metalness: 0.0 });
  const wallLibMat = makeMat({ color: '#c7d5d8', roughness: 0.86, metalness: 0.0 });
  const wallHallMat = makeMat({ color: '#243554', roughness: 0.82, metalness: 0.04 });
  const wallTrimMat = makeMat({ color: '#7a5434', roughness: 0.62 });
  const oakMat = makeMat({ color: '#a8723e', roughness: 0.56, metalness: 0.04 });
  const walnutMat = makeMat({ color: '#5b3920', roughness: 0.5, metalness: 0.05 });
  const brassMat = makeMat({ color: '#d4a345', roughness: 0.24, metalness: 0.86 });
  const darkMetalMat = makeMat({ color: '#243143', roughness: 0.3, metalness: 0.72 });
  const whiteStudioMat = makeMat({ color: '#e5eaf2', roughness: 0.45, metalness: 0.04 });
  const tealMat = makeMat({ color: '#135c75', roughness: 0.55, metalness: 0.06 });
  const crimsonMat = makeMat({ color: '#c41e2e', roughness: 0.5, metalness: 0.06 });
  const navyMat = makeMat({ color: '#13294b', roughness: 0.52, metalness: 0.1 });
  const paperMat = makeMat({ color: '#f7f4ec', roughness: 0.88 });

  const oakFloorTex = createWoodFloorTexture(renderer, '#b88b5a', '#ac7e4e', 'rgba(72,42,18,0.22)');
  oakFloorTex.repeat.set(7, 5);
  const studioFloorTex = createWoodFloorTexture(renderer, '#c5bfb4', '#b8b1a5', 'rgba(19,41,75,0.12)');
  studioFloorTex.repeat.set(3.5, 4);
  const hallFloorTex = createWoodFloorTexture(renderer, '#2c364b', '#252e40', 'rgba(255,214,107,0.1)');
  hallFloorTex.repeat.set(4, 4.5);

  const addCollider = (cx: number, cz: number, w: number, d: number) => {
    colliders.push({
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minZ: cz - d / 2,
      maxZ: cz + d / 2,
    });
  };

  /* ---- 1. GRAND ARCHITECTURAL FLOORS & CARPET RUNNERS ---- */
  // Main cohesive floor slab covering Atrium + West + North + East
  const mainFloor = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.3, 19.5),
    makeMat({ map: oakFloorTex, roughness: 0.65, metalness: 0.03 })
  );
  mainFloor.position.set(0, -0.15, -0.5);
  mainFloor.receiveShadow = true;
  root.add(mainFloor);
  floorClickables.push(mainFloor);

  // Zone 2 (Editorial) slightly distinct light studio floor inlay
  const editFloor = new THREE.Mesh(
    new THREE.BoxGeometry(9.2, 0.03, 10.6),
    makeMat({
      map: studioFloorTex,
      roughness: 0.62,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  editFloor.position.set(0, 0.015, -4.3);
  editFloor.receiveShadow = true;
  root.add(editFloor);
  floorClickables.push(editFloor);

  // Zone 3 (Biblionight Hall) warm dark slate parquet inlay
  const hallFloor = new THREE.Mesh(
    new THREE.BoxGeometry(10.0, 0.03, 13.4),
    makeMat({
      map: hallFloorTex,
      roughness: 0.58,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  hallFloor.position.set(9.6, 0.015, -0.5);
  hallFloor.receiveShadow = true;
  root.add(hallFloor);
  floorClickables.push(hallFloor);

  // Directional carpet runners radiating from the Central Atrium into each wing!
  const makeRunner = (x: number, z: number, w: number, d: number, color: string) => {
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.024, d),
      makeMat({
        color,
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    rug.position.set(x, 0.025, z);
    rug.receiveShadow = true;
    root.add(rug);
    floorClickables.push(rug);
  };
  makeRunner(-4.2, 3.2, 6.2, 1.5, '#135c75'); // Teal runner to Library
  makeRunner(0, 0.9, 1.8, 5.2, '#c41e2e'); // Crimson runner to Editorial
  makeRunner(4.2, 3.2, 6.2, 1.5, '#b45309'); // Warm gold runner to Biblionight

  // Warm circular atrium welcome rug under central tree bench
  const atriumRug = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 0.024, 32),
    makeMat({ color: '#1b355c', roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  atriumRug.position.set(0, 0.025, 3.4);
  atriumRug.receiveShadow = true;
  root.add(atriumRug);
  floorClickables.push(atriumRug);

  /* ---- 2. ARCHITECTURAL BACK & SIDE WALLS WITH WARM SUNLIT ARCHED WINDOWS ---- */
  const wallH = 4.2;
  const buildWall = (
    x: number,
    z: number,
    w: number,
    d: number,
    mat: THREE.Material = wallCreamMat,
    withCollider = true
  ) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), mat);
    wall.position.set(x, wallH / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);
    // Warm oak wainscoting trim strip along bottom
    const dado = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.85, d + 0.04), wallTrimMat);
    dado.position.set(x, 0.425, z);
    root.add(dado);
    if (withCollider) addCollider(x, z, w + 0.35, d + 0.35);
    return wall;
  };

  // Back walls (North perimeter) with distinct room personalities
  buildWall(-9.8, -6.9, 10.6, 0.32, wallLibMat); // Library back wall (calm slate-sage)
  buildWall(0, -9.8, 9.6, 0.32, wallCreamMat); // Editorial back wall (warm stone)
  buildWall(9.8, -6.9, 10.6, 0.32, wallHallMat); // Biblionight back wall (deep festival navy)

  // Side outer walls
  buildWall(-14.9, -0.3, 0.32, 13.6, wallLibMat); // West outer wall
  buildWall(14.9, -0.3, 0.32, 13.6, wallHallMat); // East outer wall

  // Editorial side wing connectors
  buildWall(-4.7, -8.35, 0.32, 3.2, wallCreamMat);
  buildWall(4.7, -8.35, 0.32, 3.2, wallCreamMat);

  // Architectural Sunlit Window Texture (sky gradient + warm sunbeams + campus foliage)
  const windowCanvas = document.createElement('canvas');
  windowCanvas.width = 256;
  windowCanvas.height = 320;
  const wCtx = windowCanvas.getContext('2d')!;
  const skyGrad = wCtx.createLinearGradient(0, 0, 0, 320);
  skyGrad.addColorStop(0, '#7cb8e8');
  skyGrad.addColorStop(0.62, '#c7e3f7');
  skyGrad.addColorStop(1, '#f4e3c1');
  wCtx.fillStyle = skyGrad;
  wCtx.fillRect(0, 0, 256, 320);
  // Soft distant trees outside window
  wCtx.fillStyle = '#5a8f6a';
  wCtx.beginPath();
  wCtx.arc(46, 285, 62, 0, Math.PI * 2);
  wCtx.arc(138, 295, 74, 0, Math.PI * 2);
  wCtx.arc(220, 280, 58, 0, Math.PI * 2);
  wCtx.fill();
  // Warm diagonal sunbeam highlight across glass
  wCtx.fillStyle = 'rgba(255, 250, 224, 0.28)';
  wCtx.beginPath();
  wCtx.moveTo(0, 40);
  wCtx.lineTo(145, 0);
  wCtx.lineTo(256, 195);
  wCtx.lineTo(95, 320);
  wCtx.closePath();
  wCtx.fill();
  const windowSkyTex = new THREE.CanvasTexture(windowCanvas);
  windowSkyTex.colorSpace = THREE.SRGBColorSpace;

  const addWindow = (x: number, y: number, z: number, w: number, h: number, rotY = 0) => {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = rotY;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.14), walnutMat);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, 0.1, 0.26), walnutMat);
    sill.position.set(0, -h / 2 - 0.08, 0.08);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      makeMat({
        map: windowSkyTex,
        emissiveMap: windowSkyTex,
        emissive: new THREE.Color('#fff4d6'),
        emissiveIntensity: 0.32,
        roughness: 0.15,
      })
    );
    glass.position.z = 0.078;
    // Crisp wooden mullions placed cleanly IN FRONT of the glass
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, 0.05), walnutMat);
    vBar.position.z = 0.1;
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.05), walnutMat);
    hBar.position.set(0, 0.15, 0.1);
    wg.add(frame, sill, glass, vBar, hBar);
    root.add(wg);
  };
  addWindow(-12.2, 2.35, -6.7, 1.9, 2.15);
  addWindow(-7.2, 2.35, -6.7, 1.9, 2.15);
  addWindow(-2.25, 2.4, -9.6, 2.0, 2.15);
  addWindow(2.25, 2.4, -9.6, 2.0, 2.15);
  addWindow(-14.7, 2.35, 1.8, 2.0, 2.15, Math.PI / 2);

  /* ---- 3. THREE GRAND ARCHWAYS WITH READABLE ZONE SIGNS ---- */
  const buildZoneArch = (
    x: number,
    z: number,
    rotY: number,
    kicker: string,
    title: string,
    accentHex: string,
    accentMat: THREE.Material
  ) => {
    const arch = new THREE.Group();
    arch.position.set(x, 0, z);
    arch.rotation.y = rotY;

    [-2.05, 2.05].forEach((px) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.65, 0.36), walnutMat);
      col.position.set(px, 1.825, 0);
      col.castShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.44), brassMat);
      cap.position.set(px, 3.65, 0);
      arch.add(col, cap);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.34, 0.4), accentMat);
    lintel.position.set(0, 3.82, 0);
    lintel.castShadow = true;
    arch.add(lintel);

    const plaqueTex = createPlaqueTexture(renderer, {
      bg: accentHex,
      border: '#ffd66b',
      kicker,
      title,
      width: 560,
      height: 132,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.84, 0.12), [
      brassMat,
      brassMat,
      brassMat,
      brassMat,
      makeMat({ map: plaqueTex, roughness: 0.35 }),
      makeMat({ map: plaqueTex, roughness: 0.35 }),
    ]);
    sign.position.set(0, 3.85, 0.22);
    arch.add(sign);
    root.add(arch);

    // Colliders only on the two arch columns so the middle opening is wide & walkable!
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    [-2.05, 2.05].forEach((px) => {
      const wx = x + px * cos;
      const wz = z - px * sin;
      addCollider(wx, wz, 0.55, 0.55);
    });
  };

  buildZoneArch(-4.75, 2.2, Math.PI / 2, 'ПРОФ-ТРЕК 01 · БИД', 'БИБЛИОТЕКА', '#135c75', tealMat);
  buildZoneArch(0, -1.65, 0, 'ПРОФ-ТРЕК 02 · ИЗДАТЕЛЬСТВО', 'РЕДАКЦИЯ', '#c41e2e', crimsonMat);
  buildZoneArch(4.75, 2.2, -Math.PI / 2, 'ПРОФ-ТРЕК 03 · КРЕАТИВ', 'БИБЛИОНОЧЬ', '#13294b', navyMat);

  // Framed Mascot Sticker Posters on 3D Hall Walls
  const addStickerPoster = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    pw: number,
    ph: number,
    stickerUrl: string,
    accentHex: string
  ) => {
    const pg = new THREE.Group();
    pg.position.set(x, y, z);
    pg.rotation.y = rotY;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(pw + 0.14, ph + 0.14, 0.05),
      makeMat({ color: accentHex, roughness: 0.45 })
    );
    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(pw, ph),
      makeMat({ color: '#ffffff', roughness: 0.7 })
    );
    backing.position.z = 0.028;
    const tex = texLoader.load(stickerUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(pw - 0.12, ph - 0.12),
      makeMat({ map: tex, transparent: true, roughness: 0.5 })
    );
    art.position.z = 0.032;
    pg.add(frame, backing, art);
    root.add(pg);
  };

  addStickerPoster(-7.2, 2.7, -6.72, 0, 1.35, 1.2, STICKERS.database, '#135c75');
  addStickerPoster(-2.6, 2.7, -9.62, 0, 1.3, 1.15, STICKERS.editing, '#c41e2e');
  addStickerPoster(12.2, 2.7, -6.72, 0, 1.35, 1.2, STICKERS.content, '#0284c7');
  addStickerPoster(-3.1, 2.5, -1.46, 0, 1.25, 1.05, STICKERS.heroBid, '#13294b');
  addStickerPoster(3.1, 2.5, -1.46, 0, 1.25, 1.05, STICKERS.vibe, '#13294b');

  /* ---- 4. CENTRAL ATRIUM (COZY FOYER WITH WELCOME BENCH, TREE, MENTOR & POSTERS) ---- */
  // Circular oak bench with lush centerpiece tree in atrium
  const benchRing = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.44, 24), oakMat);
  benchRing.position.set(0, 0.22, 2.1);
  benchRing.castShadow = true;
  benchRing.receiveShadow = true;
  root.add(benchRing);
  const centerTree = buildIndoorPlant(1.38, '#13294b');
  centerTree.position.set(0, 0.4, 2.1);
  root.add(centerTree);
  addCollider(0, 2.1, 2.35, 2.35);

  // Welcome Kiosk Desk on South-West of Atrium
  const welcomeDesk = buildDesk(2.0, 0.78, 0.88, walnutMat, brassMat);
  welcomeDesk.position.set(-2.5, 0, 5.4);
  welcomeDesk.rotation.y = 0.28;
  root.add(welcomeDesk);
  addCollider(-2.5, 5.4, 2.1, 0.95);

  const welcomePlaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.45, 0.06),
    makeMat({
      map: createPlaqueTexture(renderer, {
        bg: '#13294b',
        border: '#ffd66b',
        kicker: 'БГИИК · КАФЕДРА БИД',
        title: 'ИНФОПОЛИС БИД',
        width: 440,
        height: 120,
      }),
      roughness: 0.35,
    })
  );
  welcomePlaque.position.set(-2.42, 0.56, 5.76);
  welcomePlaque.rotation.y = 0.28;
  root.add(welcomePlaque);

  // Friendly Atrium Mentor NPC waving near welcome desk
  const mentorAtrium = buildCharacter({
    jacketHex: '#135c75',
    pantsHex: '#1e293b',
    hairHex: '#4a2f1d',
    accentHex: '#ffd66b',
    scale: 1.04,
  });
  mentorAtrium.root.position.set(-2.2, 0, 4.45);
  mentorAtrium.root.rotation.y = 0.52;
  root.add(mentorAtrium.root);
  npcs.push({
    root: mentorAtrium.root,
    rightArm: mentorAtrium.rightArm,
    head: mentorAtrium.headGroup,
    phase: 0,
  });

  // Cozy Seating & Plants flanking Atrium
  const atriumPlantR = buildIndoorPlant(1.05, '#c41e2e');
  atriumPlantR.position.set(3.2, 0, 5.5);
  root.add(atriumPlantR);
  addCollider(3.2, 5.5, 0.9, 0.9);

  const atriumChair = buildCozyArmchair('#135c75', oakMat);
  atriumChair.position.set(2.3, 0, 5.2);
  atriumChair.rotation.y = -0.65;
  root.add(atriumChair);
  addCollider(2.3, 5.2, 1.0, 1.0);

  // Hanging warm pendant lamps across Atrium & Wings
  [
    [0, 3.9, 2.2, '#13294b'],
    [-9.5, 3.9, -1.5, '#135c75'],
    [-9.5, 3.9, 3.0, '#135c75'],
    [0, 3.9, -5.6, '#c41e2e'],
    [9.6, 3.9, 2.5, '#d97706'],
  ].forEach(([lx, ly, lz, col]) => {
    const p = buildPendantLamp(brassMat, col as string);
    p.position.set(lx as number, ly as number, lz as number);
    root.add(p);
  });

  /* ---- Helper to register one of the 12 interactive stations ---- */
  const registerStation = (opts: {
    workshop: WorkshopId;
    taskIdx: number;
    pos: THREE.Vector3;
    standPos: THREE.Vector3;
    hitSize: [number, number, number];
    labelY: number;
    ringRadius?: number;
  }) => {
    const ws = WORKSHOPS[opts.workshop - 1];
    const task = ws.tasks[opts.taskIdx];
    const roomName =
      opts.workshop === 1 ? 'Библиотека' : opts.workshop === 2 ? 'Редакция' : 'Библионочь';
    const accentHex =
      opts.workshop === 1 ? '#135c75' : opts.workshop === 2 ? '#c41e2e' : '#d97706';

    // Glowing interactive floor ring at standPos
    const ringMat = makeMat({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry((opts.ringRadius ?? 0.72) - 0.12, opts.ringRadius ?? 0.72, 32),
      ringMat
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(opts.standPos.x, 0.045, opts.standPos.z);
    root.add(ringMesh);

    // Floating crystal beacon
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(opts.pos.x, opts.labelY - 0.55, opts.pos.z);
    const beaconMat = makeMat({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.3,
    });
    const beaconCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), beaconMat);
    beaconGroup.add(beaconCore);
    root.add(beaconGroup);

    const done =
      (opts.workshop === 1 ? save.w1 : opts.workshop === 2 ? save.w2 : save.w3)[opts.taskIdx]
        ?.completed ?? false;

    const labelSprite = createFloatingLabelSprite(
      opts.taskIdx + 1,
      task.title,
      accentHex,
      done
    );
    labelSprite.position.set(opts.pos.x, opts.labelY + 0.15, opts.pos.z);
    root.add(labelSprite);

    // Invisible simplified click hit box
    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(opts.hitSize[0], opts.hitSize[1], opts.hitSize[2]),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.set(opts.pos.x, opts.hitSize[1] / 2, opts.pos.z);
    const stId = `w${opts.workshop}-${opts.taskIdx}`;
    hitMesh.userData = { stationId: stId };
    root.add(hitMesh);
    stationClickables.push(hitMesh);

    stations.push({
      id: stId,
      workshop: opts.workshop,
      taskIdx: opts.taskIdx,
      title: task.title,
      subtitle: task.shortDesc,
      roomName,
      accentHex,
      pos: opts.pos.clone(),
      standPos: opts.standPos.clone(),
      interactRadius: 2.35,
      ringMesh,
      ringMat,
      beaconGroup,
      beaconCore,
      beaconMat,
      labelSprite,
      labelBaseY: opts.labelY,
      hitMesh,
    });
  };

  /* =========================================================================
   * ZONE 1 (WEST WING): БИБЛИОТЕКА И ИНФОРМАЦИОННЫЙ ЦЕНТР
   * ========================================================================= */
  // Rich perimeter bookcases along west wall so the library feels warm & full!
  const libWallCase1 = buildFullBookcase(2.8, 2.9, walnutMat, 11);
  libWallCase1.position.set(-14.4, 0, -4.4);
  libWallCase1.rotation.y = Math.PI / 2;
  root.add(libWallCase1);
  addCollider(-14.4, -4.4, 0.7, 2.9);

  const libWallCase2 = buildFullBookcase(2.8, 2.9, walnutMat, 23);
  libWallCase2.position.set(-14.4, 0, -1.2);
  libWallCase2.rotation.y = Math.PI / 2;
  root.add(libWallCase2);
  addCollider(-14.4, -1.2, 0.7, 2.9);

  // Cozy reading corner in South-West (2 armchairs + coffee table + potted plant + framed art)
  const libRug = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 0.025, 4.4),
    makeMat({ color: '#1b6d8a', roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -1 })
  );
  libRug.position.set(-9.8, 0.025, 0.8);
  libRug.receiveShadow = true;
  root.add(libRug);
  floorClickables.push(libRug);

  const libChair1 = buildCozyArmchair('#d97706', oakMat);
  libChair1.position.set(-13.4, 0, 4.5);
  libChair1.rotation.y = 0.75;
  root.add(libChair1);
  addCollider(-13.4, 4.5, 1.0, 1.0);

  const libPlant = buildIndoorPlant(1.15, '#135c75');
  libPlant.position.set(-5.7, 0, -5.8);
  root.add(libPlant);
  addCollider(-5.7, -5.8, 0.9, 0.9);

  // Real Knigograd illustration framed on back wall of Library
  const libArt = buildFramedArtwork(
    texLoader,
    renderer,
    MEDIA.sceneLibraryDesk,
    2.2,
    1.55,
    walnutMat,
    '#135c75'
  );
  libArt.position.set(-9.7, 2.45, -6.68);
  root.add(libArt);

  // Library Mentor NPC
  const npcLib = buildCharacter({
    jacketHex: '#0f766e',
    pantsHex: '#334155',
    hairHex: '#854d0e',
    accentHex: '#7dd3fc',
  });
  npcLib.root.position.set(-6.3, 0, -0.3);
  npcLib.root.rotation.y = -Math.PI / 2;
  root.add(npcLib.root);
  npcs.push({ root: npcLib.root, rightArm: npcLib.rightArm, head: npcLib.headGroup, phase: 1.5 });

  // Station W1-0: Electronic Catalog Terminal
  const w1Desk0 = new THREE.Group();
  w1Desk0.position.set(-8.0, 0, 3.8);
  w1Desk0.add(buildDesk(2.1, 1.05, 0.82, oakMat, darkMetalMat));
  const w1Mon = buildMonitor(createScreenCanvasTexture(renderer, 'catalog'), darkMetalMat);
  w1Mon.position.set(-0.2, 0.82, -0.18);
  w1Desk0.add(w1Mon);
  const w1Stack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.42), tealMat);
  w1Stack.position.set(0.65, 0.9, 0.05);
  w1Desk0.add(w1Stack);
  root.add(w1Desk0);
  addCollider(-8.0, 3.8, 2.2, 1.15);

  registerStation({
    workshop: 1,
    taskIdx: 0,
    pos: new THREE.Vector3(-8.0, 0, 3.8),
    standPos: new THREE.Vector3(-8.0, 0, 2.3),
    hitSize: [2.3, 1.8, 1.4],
    labelY: 2.35,
  });

  // Station W1-1: Systematic BBK Bookshelf Aisle
  const bbkShelf = buildFullBookcase(2.8, 2.65, walnutMat, 42);
  bbkShelf.position.set(-12.2, 0, -5.65);
  const bbkHeader = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.34, 0.08),
    makeMat({
      map: createPlaqueTexture(renderer, {
        bg: '#13294b',
        border: '#7dd3fc',
        title: 'ББК 85.12 · 26.8',
        width: 400,
        height: 84,
      }),
      roughness: 0.35,
    })
  );
  bbkHeader.position.set(0, 2.86, 0.2);
  bbkShelf.add(bbkHeader);
  root.add(bbkShelf);
  addCollider(-12.2, -5.65, 2.9, 0.8);

  registerStation({
    workshop: 1,
    taskIdx: 1,
    pos: new THREE.Vector3(-12.2, 0, -5.65),
    standPos: new THREE.Vector3(-12.2, 0, -4.15),
    hitSize: [3.0, 2.9, 1.1],
    labelY: 3.45,
  });

  // Station W1-2: Cataloger Verification Desk
  const w1CatDesk = new THREE.Group();
  w1CatDesk.position.set(-12.2, 0, 1.3);
  w1CatDesk.rotation.y = Math.PI / 2;
  w1CatDesk.add(buildDesk(2.0, 1.0, 0.82, oakMat, walnutMat));
  const openLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.44), paperMat);
  openLeft.position.set(-0.18, 0.85, 0.06);
  openLeft.rotation.z = 0.08;
  const openRight = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.44), paperMat);
  openRight.position.set(0.16, 0.85, 0.06);
  openRight.rotation.z = -0.08;
  const cardCab = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.34), walnutMat);
  cardCab.position.set(0.62, 0.96, -0.08);
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.16, 14),
    makeMat({ color: '#157a4f', emissive: '#157a4f', emissiveIntensity: 0.35, roughness: 0.25 })
  );
  lampShade.position.set(-0.62, 1.22, -0.2);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.4, 8), brassMat);
  lampStem.position.set(-0.62, 1.02, -0.2);
  w1CatDesk.add(openLeft, openRight, cardCab, lampStem, lampShade);
  root.add(w1CatDesk);
  addCollider(-12.2, 1.3, 1.2, 2.1);

  registerStation({
    workshop: 1,
    taskIdx: 2,
    pos: new THREE.Vector3(-12.2, 0, 1.3),
    standPos: new THREE.Vector3(-10.7, 0, 1.3),
    hitSize: [1.4, 1.7, 2.2],
    labelY: 2.35,
  });

  // Station W1-3: Illuminated Ocean Virtual Exhibition Pavilion
  const w1Exh = new THREE.Group();
  w1Exh.position.set(-7.6, 0, -5.2);
  const exhPed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.88, 1.05), navyMat);
  exhPed.position.y = 0.44;
  exhPed.castShadow = true;
  w1Exh.add(exhPed);
  const exhPanel = buildFramedArtwork(
    texLoader,
    renderer,
    MEDIA.oceanLife,
    2.4,
    1.45,
    brassMat,
    '#0e3a59'
  );
  exhPanel.position.set(0, 1.62, -0.18);
  exhPanel.rotation.x = -0.1;
  w1Exh.add(exhPanel);
  const w1ExhLight = new THREE.PointLight('#38bdf8', 0.85, 5.5, 2);
  w1ExhLight.position.set(0, 2.4, 0.85);
  w1Exh.add(w1ExhLight);
  root.add(w1Exh);
  addCollider(-7.6, -5.2, 2.9, 1.2);

  registerStation({
    workshop: 1,
    taskIdx: 3,
    pos: new THREE.Vector3(-7.6, 0, -5.2),
    standPos: new THREE.Vector3(-7.6, 0, -3.65),
    hitSize: [3.0, 2.5, 1.4],
    labelY: 3.15,
  });

  /* =========================================================================
   * ZONE 2 (NORTH WING): ИЗДАТЕЛЬСТВО И РЕДАКЦИЯ ЖУРНАЛА «КУЛЬТУРА»
   * ========================================================================= */
  // Editorial Wall Moodboard with real magazine illustrations
  const editArt1 = buildFramedArtwork(
    texLoader,
    renderer,
    MEDIA.studioPrint,
    1.9,
    1.35,
    crimsonMat,
    '#c41e2e'
  );
  editArt1.position.set(0, 2.5, -9.58);
  root.add(editArt1);

  const editPlant = buildIndoorPlant(1.1, '#c41e2e');
  editPlant.position.set(-3.9, 0, -9.0);
  root.add(editPlant);
  addCollider(-3.9, -9.0, 0.9, 0.9);

  const editPlant2 = buildIndoorPlant(1.0, '#13294b');
  editPlant2.position.set(3.9, 0, -9.0);
  root.add(editPlant2);
  addCollider(3.9, -9.0, 0.9, 0.9);

  // Editorial Mentor NPC
  const npcEdit = buildCharacter({
    jacketHex: '#c41e2e',
    pantsHex: '#1e293b',
    hairHex: '#1f2937',
    accentHex: '#ffd66b',
  });
  npcEdit.root.position.set(0, 0, -8.35);
  root.add(npcEdit.root);
  npcs.push({ root: npcEdit.root, rightArm: npcEdit.rightArm, head: npcEdit.headGroup, phase: 2.9 });

  // Station W2-0: Editorial Planning Conference Table
  const w2Plan = new THREE.Group();
  w2Plan.position.set(-2.9, 0, -3.7);
  w2Plan.add(buildDesk(2.05, 1.15, 0.82, whiteStudioMat, darkMetalMat));
  ['#c41e2e', '#135c75', '#d97706', '#475569'].forEach((col, i) => {
    const folder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.42), makeMat({ color: col, roughness: 0.6 }));
    folder.position.set(-0.56 + i * 0.36, 0.84, 0.05);
    folder.rotation.y = (i - 1.5) * 0.14;
    w2Plan.add(folder);
  });
  root.add(w2Plan);
  addCollider(-2.9, -3.7, 2.2, 1.25);

  registerStation({
    workshop: 2,
    taskIdx: 0,
    pos: new THREE.Vector3(-2.9, 0, -3.7),
    standPos: new THREE.Vector3(-1.1, 0, -3.7),
    hitSize: [2.25, 1.6, 1.3],
    labelY: 2.2,
  });

  // Station W2-1: Editor Proofreading & Dictaphone Desk
  const w2Edit = new THREE.Group();
  w2Edit.position.set(-2.8, 0, -6.9);
  w2Edit.add(buildDesk(2.05, 1.05, 0.82, whiteStudioMat, darkMetalMat));
  const msPaper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.54), paperMat);
  msPaper.position.set(-0.25, 0.86, 0.05);
  const micStand = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), brassMat);
  micStand.position.set(0.45, 1.0, -0.08);
  const micHead = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.1, 6, 10), darkMetalMat);
  micHead.position.set(0.45, 1.22, -0.08);
  w2Edit.add(msPaper, micStand, micHead);
  root.add(w2Edit);
  addCollider(-2.8, -6.9, 2.2, 1.15);

  registerStation({
    workshop: 2,
    taskIdx: 1,
    pos: new THREE.Vector3(-2.8, 0, -6.9),
    standPos: new THREE.Vector3(-1.1, 0, -6.9),
    hitSize: [2.2, 1.75, 1.2],
    labelY: 2.35,
  });

  // Station W2-2: Layout Design Station (Wide Display)
  const w2Layout = new THREE.Group();
  w2Layout.position.set(2.8, 0, -6.9);
  w2Layout.add(buildDesk(2.1, 1.08, 0.82, whiteStudioMat, darkMetalMat));
  const layoutMon = buildMonitor(createScreenCanvasTexture(renderer, 'layout'), darkMetalMat);
  layoutMon.position.set(0, 0.82, -0.15);
  layoutMon.rotation.y = -0.35;
  w2Layout.add(layoutMon);
  root.add(w2Layout);
  addCollider(2.8, -6.9, 2.2, 1.2);

  registerStation({
    workshop: 2,
    taskIdx: 2,
    pos: new THREE.Vector3(2.8, 0, -6.9),
    standPos: new THREE.Vector3(1.1, 0, -6.9),
    hitSize: [2.25, 1.85, 1.25],
    labelY: 2.45,
  });

  // Station W2-3: Pre-Print Proofing & Animated Live Magazine Printing Press
  const w2Press = new THREE.Group();
  w2Press.position.set(2.9, 0, -3.7);
  w2Press.add(buildDesk(2.2, 1.16, 0.82, oakMat, darkMetalMat));
  const pressBody = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.48, 0.72), darkMetalMat);
  pressBody.position.set(0.45, 1.06, -0.06);
  pressBody.castShadow = true;
  const pressHood = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.56), crimsonMat);
  pressHood.position.set(0.45, 1.36, -0.08);
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.7, 16), brassMat);
  roller.rotation.z = Math.PI / 2;
  roller.position.set(0.45, 1.24, 0.16);

  // Conveyor belt & blinking green status LED on printing press
  const conveyorTray = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.64), walnutMat);
  conveyorTray.position.set(-0.22, 0.84, 0.06);
  const w2PressLedMat = makeMat({
    color: '#4ade80',
    emissive: '#22c55e',
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const pressLed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), w2PressLedMat);
  pressLed.position.set(0.82, 1.38, 0.22);
  w2Press.add(pressBody, pressHood, roller, conveyorTray, pressLed);

  const magTex = createScreenCanvasTexture(renderer, 'magazine', save.magazineHeadline);
  const magCoverMat = makeMat({ map: magTex, roughness: 0.35 });

  // Animated freshly printed magazine sheets sliding out of the press rollers!
  const w2PrintingSheets: THREE.Mesh[] = [];
  for (let s = 0; s < 2; s++) {
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.016, 0.56),
      [paperMat, paperMat, magCoverMat, paperMat, paperMat, paperMat]
    );
    sheet.position.set(0.28 - s * 0.35, 1.02, 0.08);
    sheet.castShadow = true;
    w2Press.add(sheet);
    w2PrintingSheets.push(sheet);
  }

  const w2MagStack = new THREE.Group();
  w2MagStack.position.set(-0.56, 0.85, 0.08);
  for (let m = 0; m < 6; m++) {
    const issue = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.04, 0.62),
      m === 5
        ? [paperMat, paperMat, magCoverMat, paperMat, paperMat, paperMat]
        : paperMat
    );
    issue.position.set(0, 0.02 + m * 0.042, 0);
    issue.rotation.y = (m % 2 === 0 ? 1 : -1) * 0.05;
    issue.castShadow = true;
    w2MagStack.add(issue);
  }
  w2Press.add(w2MagStack);
  root.add(w2Press);
  addCollider(2.9, -3.7, 2.25, 1.25);

  // Active co-workers working across the 3 halls (Publishing, Library, Media Studio)
  // 1) Layout Designer working at the W2-2 Wide Monitor in Editorial
  const workerLayout = buildCharacter({
    jacketHex: '#1e3a5f',
    pantsHex: '#334155',
    hairHex: '#5c3a21',
    accentHex: '#ffd66b',
    scale: 0.98,
  });
  workerLayout.root.position.set(2.85, 0, -7.75);
  workerLayout.root.rotation.y = 0; // Facing the layout monitor desk
  root.add(workerLayout.root);
  npcs.push({
    root: workerLayout.root,
    leftArm: workerLayout.leftArm,
    rightArm: workerLayout.rightArm,
    head: workerLayout.headGroup,
    phase: 0.8,
    mode: 'work',
  });

  // 2) Print Technician operating the Magazine Press at W2-3
  const workerPress = buildCharacter({
    jacketHex: '#991b1b',
    pantsHex: '#1e293b',
    hairHex: '#27272a',
    accentHex: '#ffd66b',
    scale: 0.98,
  });
  workerPress.root.position.set(3.4, 0, -4.65);
  workerPress.root.rotation.y = -0.25; // Facing the printing press
  root.add(workerPress.root);
  npcs.push({
    root: workerPress.root,
    leftArm: workerPress.leftArm,
    rightArm: workerPress.rightArm,
    head: workerPress.headGroup,
    phase: 2.1,
    mode: 'work',
  });

  // 3) Bibliographer-Cataloger working at the Library Verification Desk W1-2
  const workerCatalog = buildCharacter({
    jacketHex: '#135c75',
    pantsHex: '#1e293b',
    hairHex: '#3b2416',
    accentHex: '#38bdf8',
    scale: 0.98,
  });
  workerCatalog.root.position.set(-13.1, 0, 1.3);
  workerCatalog.root.rotation.y = Math.PI / 2; // Facing the catalog desk
  root.add(workerCatalog.root);
  npcs.push({
    root: workerCatalog.root,
    leftArm: workerCatalog.leftArm,
    rightArm: workerCatalog.rightArm,
    head: workerCatalog.headGroup,
    phase: 3.4,
    mode: 'work',
  });

  // 4) SMM Producer working at the Media & Ring-Light Studio Desk W3-2
  const workerSmm = buildCharacter({
    jacketHex: '#4f46e5',
    pantsHex: '#1e293b',
    hairHex: '#713f12',
    accentHex: '#f43f5e',
    scale: 0.98,
  });
  workerSmm.root.position.set(8.2, 0, 5.0);
  workerSmm.root.rotation.y = Math.PI; // Facing the SMM monitor and ring light
  root.add(workerSmm.root);
  npcs.push({
    root: workerSmm.root,
    leftArm: workerSmm.leftArm,
    rightArm: workerSmm.rightArm,
    head: workerSmm.headGroup,
    phase: 4.8,
    mode: 'work',
  });

  registerStation({
    workshop: 2,
    taskIdx: 3,
    pos: new THREE.Vector3(2.9, 0, -3.7),
    standPos: new THREE.Vector3(1.1, 0, -3.7),
    hitSize: [2.25, 1.75, 1.3],
    labelY: 2.35,
  });

  /* =========================================================================
   * ZONE 3 (EAST WING): ЗАЛ «БИБЛИОНОЧИ» И КРЕАТИВНЫЙ МЕНЕДЖМЕНТ
   * ========================================================================= */
  // Draped overhead fairy string lights across the Hall!
  const w3FairyMats: THREE.MeshStandardMaterial[] = [];
  for (let row = 0; row < 2; row++) {
    const zLine = row === 0 ? -2.2 : 2.0;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(5.2, 3.85, zLine),
      new THREE.Vector3(9.8, 3.32, zLine),
      new THREE.Vector3(14.4, 3.85, zLine),
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.018, 6, false), darkMetalMat);
    root.add(cable);
    for (let i = 1; i <= 7; i++) {
      const pt = curve.getPoint(i / 8);
      const bMat = makeMat({
        color: '#fff6d6',
        emissive: i % 2 === 0 ? '#ffd66b' : '#f43f5e',
        emissiveIntensity: 1.0,
        roughness: 0.2,
      });
      w3FairyMats.push(bMat);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), bMat);
      bulb.position.copy(pt);
      bulb.position.y -= 0.09;
      root.add(bulb);
    }
  }

  // Photozone Arch & Bookcrossing shelf on East wall
  const photoArch = new THREE.Group();
  photoArch.position.set(14.1, 0, 1.4);
  photoArch.rotation.y = -Math.PI / 2;
  const archTop = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.09, 12, 24, Math.PI),
    crimsonMat
  );
  archTop.position.y = 1.15;
  [-0.95, 0.95].forEach((px) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.15, 10), crimsonMat);
    leg.position.set(px, 0.575, 0);
    photoArch.add(leg);
  });
  root.add(photoArch);
  addCollider(14.1, 1.4, 0.7, 2.1);

  const hallArt = buildFramedArtwork(
    texLoader,
    renderer,
    MEDIA.sceneSmmFestival,
    2.2,
    1.5,
    brassMat,
    '#13294b'
  );
  hallArt.position.set(14.68, 2.35, -2.5);
  hallArt.rotation.y = -Math.PI / 2;
  root.add(hallArt);

  // Creative Manager Mentor NPC
  const npcFest = buildCharacter({
    jacketHex: '#d97706',
    pantsHex: '#13294b',
    hairHex: '#27272a',
    accentHex: '#f43f5e',
  });
  npcFest.root.position.set(6.5, 0, -0.4);
  npcFest.root.rotation.y = Math.PI / 2;
  root.add(npcFest.root);
  npcs.push({ root: npcFest.root, rightArm: npcFest.rightArm, head: npcFest.headGroup, phase: 4.1 });

  // Station W3-0: Festival Poster Lightbox & Concept Board
  const w3Poster = new THREE.Group();
  w3Poster.position.set(7.2, 0, -5.3);
  const pBase = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.35, 0.75), navyMat);
  pBase.position.y = 0.175;
  const pFrame = buildFramedArtwork(
    texLoader,
    renderer,
    MEDIA.sceneFestivalStage,
    1.55,
    1.95,
    brassMat,
    '#13294b'
  );
  pFrame.position.set(0, 1.45, 0);
  w3Poster.add(pBase, pFrame);
  root.add(w3Poster);
  addCollider(7.2, -5.3, 1.85, 0.9);

  registerStation({
    workshop: 3,
    taskIdx: 0,
    pos: new THREE.Vector3(7.2, 0, -5.3),
    standPos: new THREE.Vector3(7.2, 0, -3.75),
    hitSize: [2.0, 2.6, 1.1],
    labelY: 3.1,
  });

  // Station W3-1: Main Biblionight Stage (Back-Right of East Wing)
  const w3Stage = new THREE.Group();
  w3Stage.position.set(11.6, 0, -4.9);
  const sDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.42, 2.3), walnutMat);
  sDeck.position.y = 0.21;
  sDeck.castShadow = true;
  sDeck.receiveShadow = true;
  w3Stage.add(sDeck);
  const sBannerTex = createScreenCanvasTexture(renderer, 'festival', save.festivalName);
  const sBanner = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.65, 0.12), [
    brassMat,
    brassMat,
    brassMat,
    brassMat,
    makeMat({
      map: sBannerTex,
      emissiveMap: sBannerTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.4,
      roughness: 0.3,
    }),
    navyMat,
  ]);
  sBanner.position.set(0, 1.4, -0.95);
  w3Stage.add(sBanner);
  const podium = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.44), navyMat);
  podium.position.set(-0.35, 0.88, 0.25);
  podium.castShadow = true;
  w3Stage.add(podium);
  [-1.7, 1.7].forEach((sx) => {
    const spk = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.85, 0.42), darkMetalMat);
    spk.position.set(sx, 0.84, -0.45);
    w3Stage.add(spk);
  });
  const w3StageLight = new THREE.PointLight('#ffd66b', 1.1, 7.5, 2);
  w3StageLight.position.set(0, 2.6, 0.7);
  w3Stage.add(w3StageLight);
  root.add(w3Stage);
  addCollider(11.6, -4.9, 4.3, 2.4);

  registerStation({
    workshop: 3,
    taskIdx: 1,
    pos: new THREE.Vector3(11.6, 0, -4.9),
    standPos: new THREE.Vector3(11.6, 0, -2.85),
    hitSize: [4.3, 2.5, 2.4],
    labelY: 3.15,
  });

  // Station W3-2: SMM Studio Desk + Glowing Ring Light
  const w3Smm = new THREE.Group();
  w3Smm.position.set(8.2, 0, 4.1);
  w3Smm.add(buildDesk(1.9, 1.0, 0.82, whiteStudioMat, darkMetalMat));
  const smmMon = buildMonitor(createScreenCanvasTexture(renderer, 'smm'), darkMetalMat);
  smmMon.position.set(-0.2, 0.82, -0.14);
  const tripod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 1.55, 8), darkMetalMat);
  tripod.position.set(0.85, 0.78, 0.12);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.032, 10, 24),
    makeMat({ color: '#ffffff', emissive: '#fff4cc', emissiveIntensity: 1.0, roughness: 0.2 })
  );
  ring.position.set(0.85, 1.72, 0.12);
  w3Smm.add(smmMon, tripod, ring);
  root.add(w3Smm);
  addCollider(8.2, 4.1, 2.2, 1.15);

  registerStation({
    workshop: 3,
    taskIdx: 2,
    pos: new THREE.Vector3(8.2, 0, 4.1),
    standPos: new THREE.Vector3(8.2, 0, 2.55),
    hitSize: [2.4, 2.1, 1.3],
    labelY: 2.55,
  });

  // Station W3-3: Community Quiz Lounge Table
  const w3Lounge = new THREE.Group();
  w3Lounge.position.set(12.3, 0, 3.6);
  const rTop = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.07, 24), oakMat);
  rTop.position.y = 0.76;
  rTop.castShadow = true;
  const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.74, 12), darkMetalMat);
  rLeg.position.y = 0.37;
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.04), darkMetalMat);
  tablet.position.set(0, 0.94, 0);
  tablet.rotation.x = -0.25;
  const tScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.22),
    makeMat({ color: '#38bdf8', emissive: '#38bdf8', emissiveIntensity: 0.65, roughness: 0.2 })
  );
  tScreen.position.set(0, 0.94, 0.025);
  tScreen.rotation.x = -0.25;
  w3Lounge.add(rTop, rLeg, tablet, tScreen);

  const lChair = buildCozyArmchair('#d97706', oakMat);
  lChair.position.set(1.18, 0, 0.2);
  lChair.rotation.y = -Math.PI / 2;
  w3Lounge.add(lChair);
  root.add(w3Lounge);
  addCollider(12.3, 3.6, 2.3, 1.9);

  registerStation({
    workshop: 3,
    taskIdx: 3,
    pos: new THREE.Vector3(12.3, 0, 3.6),
    standPos: new THREE.Vector3(10.85, 0, 2.55),
    hitSize: [2.2, 1.6, 2.0],
    labelY: 2.25,
  });

  /* ---- 5. GLOWING GOLDEN GUIDE DOTS ON FLOOR (LEADING PLAYER TO NEXT MISSION) ---- */
  const guideDots: THREE.Mesh[] = [];
  const dotGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16);
  const dotMat = makeMat({
    color: '#ffd66b',
    emissive: '#ffb703',
    emissiveIntensity: 0.95,
    roughness: 0.25,
    transparent: true,
    opacity: 0.92,
  });
  for (let i = 0; i < 10; i++) {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(0, 0.04, 0);
    dot.visible = false;
    root.add(dot);
    guideDots.push(dot);
  }

  /* ---- 6. PLAYABLE 3D STUDENT AVATAR ---- */
  const player = buildCharacter({
    jacketHex: '#13294b',
    pantsHex: '#334155',
    hairHex: '#3b2416',
    accentHex: '#c41e2e',
    hasBackpack: true,
    scale: 1.0,
  });
  player.root.position.set(0, 0, 5.4);
  player.root.rotation.y = Math.PI; // Facing North into the Grand Hall
  root.add(player.root);

  return {
    root,
    floorClickables,
    stationClickables,
    stations,
    colliders,
    player,
    npcs,
    guideDots,
    worldBounds: { minX: -14.3, maxX: 14.3, minZ: -9.2, maxZ: 6.4 },
    roomWaypoints: {
      lobby: new THREE.Vector3(0, 0, 4.8),
      w1: new THREE.Vector3(-8.4, 0, 0.5),
      w2: new THREE.Vector3(0, 0, -4.8),
      w3: new THREE.Vector3(8.6, 0, 0.5),
    },
    decor: {
      w1ExhLight,
      w2MagStack,
      w2PressRoller: roller,
      w2PrintingSheets,
      w2PressLedMat,
      w3StageLight,
      w3FairyMats,
    },
  };
}
