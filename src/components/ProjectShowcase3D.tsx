import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RotateCcw } from 'lucide-react';
import { OCEAN_BOOKS, OCEAN_DIVISIONS, OceanBook } from '../game/knigogradData';
import { KnigogradSave, WorkshopId } from '../game/knigogradTypes';
import { soundEngine } from '../game/sound';
import {
  createContactShadowTexture,
  createPlaqueTexture,
  createScreenCanvasTexture,
  createStudioRenderer,
  disposeObjectTree,
  isWebGLAvailable,
  scheduleAfterDraw,
} from '../three/webglUtils';

interface ProjectShowcase3DProps {
  workshop: WorkshopId;
  save: KnigogradSave;
  /** Workshop 2: current magazine page index (0..3) */
  magazinePage?: number;
  /** Workshop 2: flip to next page when user clicks 3D magazine */
  onFlipMagazinePage?: () => void;
  /** Workshop 1: callback when user clicks a 3D book panel in the gallery */
  onSelectOceanBook?: (book: OceanBook) => void;
}

const _camGoalPos = new THREE.Vector3();
const _camGoalLook = new THREE.Vector3();
const _mouse = new THREE.Vector2();

function buildMagazineSpreadCanvas(pageIdx: number, headline: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, 768, 512);

  // Center fold shadow
  const foldGrad = ctx.createLinearGradient(360, 0, 408, 0);
  foldGrad.addColorStop(0, 'rgba(19,41,75,0)');
  foldGrad.addColorStop(0.5, 'rgba(19,41,75,0.16)');
  foldGrad.addColorStop(1, 'rgba(19,41,75,0)');
  ctx.fillStyle = foldGrad;
  ctx.fillRect(360, 0, 48, 512);

  if (pageIdx === 1) {
    // Contents spread
    ctx.fillStyle = '#c41e2e';
    ctx.font = '800 20px Manrope, sans-serif';
    ctx.fillText('ЖУРНАЛ «КУЛЬТУРА» · № 01', 42, 64);
    ctx.fillStyle = '#13294b';
    ctx.font = '800 34px Unbounded, Manrope, sans-serif';
    ctx.fillText('СОДЕРЖАНИЕ', 42, 118);

    ctx.fillStyle = '#13294b';
    ctx.font = '700 22px Manrope, sans-serif';
    ctx.fillText('08 · ' + headline.slice(0, 26), 42, 200);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 17px Manrope, sans-serif';
    ctx.fillText('Мария Соколова · Фото: Алексей Климов', 42, 232);

    ctx.fillStyle = '#13294b';
    ctx.font = '700 22px Manrope, sans-serif';
    ctx.fillText('14 · За кулисами фестиваля', 42, 304);
    ctx.fillStyle = '#64748b';
    ctx.font = '600 17px Manrope, sans-serif';
    ctx.fillText('Илья Родин · Фото: Анна Лебедева', 42, 336);

    // Right decorative graphic
    ctx.fillStyle = '#13294b';
    ctx.fillRect(422, 48, 304, 416);
    ctx.fillStyle = '#ffd66b';
    ctx.font = '800 40px Unbounded, Manrope, sans-serif';
    ctx.fillText('12+', 456, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 22px Manrope, sans-serif';
    ctx.fillText('СИГНАЛЬНЫЙ', 456, 205);
    ctx.fillText('ЭКЗЕМПЛЯР', 456, 238);
    ctx.fillStyle = '#c41e2e';
    ctx.fillRect(456, 272, 180, 12);
  } else if (pageIdx === 2) {
    // Page 8 main article
    ctx.fillStyle = '#c41e2e';
    ctx.font = '800 18px Manrope, sans-serif';
    ctx.fillText('МАСТЕРСКАЯ · СТР. 8', 40, 58);
    ctx.fillStyle = '#13294b';
    ctx.font = '800 24px Unbounded, Manrope, sans-serif';
    ctx.fillText(headline.slice(0, 22), 40, 106);
    if (headline.length > 22) {
      ctx.fillText(headline.slice(22, 46), 40, 138);
    }
    ctx.fillStyle = '#334155';
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(40, 174 + i * 26, i === 9 ? 190 : 300, 12);
    }
    // Right photo illustration
    ctx.fillStyle = '#c41e2e';
    ctx.fillRect(418, 54, 310, 326);
    ctx.fillStyle = '#ffd66b';
    ctx.beginPath();
    ctx.arc(573, 214, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#13294b';
    ctx.font = '600 16px Manrope, sans-serif';
    ctx.fillText('Фото: Алексей Климов', 418, 412);
  } else {
    // Page 14 festival reportage
    ctx.fillStyle = '#13294b';
    ctx.fillRect(40, 54, 306, 326);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffd66b' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(84 + i * 54, 150 + (i % 2) * 35, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#13294b';
    ctx.font = '600 16px Manrope, sans-serif';
    ctx.fillText('Фото: Анна Лебедева', 40, 412);

    ctx.fillStyle = '#135c75';
    ctx.font = '800 18px Manrope, sans-serif';
    ctx.fillText('ФОТОРЕПОРТАЖ · СТР. 14', 418, 64);
    ctx.fillStyle = '#13294b';
    ctx.font = '800 28px Unbounded, Manrope, sans-serif';
    ctx.fillText('За кулисами', 418, 114);
    ctx.fillText('фестиваля', 418, 148);
    ctx.fillStyle = '#334155';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(418, 188 + i * 26, i === 7 ? 170 : 296, 12);
    }
  }

  return canvas;
}

export const ProjectShowcase3D: React.FC<ProjectShowcase3DProps> = ({
  workshop,
  save,
  magazinePage = 0,
  onFlipMagazinePage,
  onSelectOceanBook,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglOk, setWebglOk] = useState(true);
  const [viewMode, setViewMode] = useState<'main' | 'alt'>('main');

  const onFlipRef = useRef(onFlipMagazinePage);
  onFlipRef.current = onFlipMagazinePage;
  const onOceanBookRef = useRef(onSelectOceanBook);
  onOceanBookRef.current = onSelectOceanBook;

  const controllerRef = useRef<{
    setPage: (p: number) => void;
    setPreset: (mode: 'main' | 'alt') => void;
  } | null>(null);

  useEffect(() => {
    controllerRef.current?.setPage(magazinePage);
  }, [magazinePage]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    if (!isWebGLAvailable()) {
      setWebglOk(false);
      return;
    }

    let disposed = false;
    const scene = new THREE.Scene();

    const bgHex = workshop === 1 ? '#082038' : workshop === 2 ? '#e9eef6' : '#121b33';
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.Fog(bgHex, 14, 30);

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.2, 60);

    const defaultCam: [number, number, number] =
      workshop === 1 ? [0, 3.1, 7.6] : workshop === 2 ? [0, 3.4, 4.4] : [0, 4.2, 7.6];
    const defaultTarget: [number, number, number] =
      workshop === 1 ? [0, 1.35, 0] : workshop === 2 ? [0, 0.78, 0] : [0, 1.2, 0];

    camera.position.set(...defaultCam);

    let bundle: ReturnType<typeof createStudioRenderer>;
    try {
      bundle = createStudioRenderer(container, scene);
    } catch {
      setWebglOk(false);
      return;
    }
    const { renderer, isSoftwareGl, envTexture } = bundle;

    // 3-point balanced studio lighting
    const hemi = new THREE.HemisphereLight(
      workshop === 2 ? '#eef4ff' : '#93c5fd',
      workshop === 2 ? '#a8927c' : '#1e293b',
      workshop === 2 ? 0.95 : 0.75
    );
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#fff6e5', workshop === 2 ? 1.65 : 1.35);
    key.position.set(6, 10, 7);
    if (!isSoftwareGl) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -7;
      key.shadow.camera.right = 7;
      key.shadow.camera.top = 7;
      key.shadow.camera.bottom = -7;
      key.shadow.bias = -0.0005;
      key.shadow.normalBias = 0.02;
    }
    scene.add(key);

    const rim = new THREE.DirectionalLight(
      workshop === 1 ? '#38bdf8' : workshop === 3 ? '#ffd66b' : '#cbd5e1',
      0.85
    );
    rim.position.set(-7, 5, -6);
    scene.add(rim);

    // Contact shadow plane
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 8),
      new THREE.MeshBasicMaterial({
        map: createContactShadowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.01;
    scene.add(contactShadow);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.4, 0.16, 48),
      new THREE.MeshStandardMaterial({
        color: workshop === 1 ? '#0e2d4a' : workshop === 2 ? '#dce3ef' : '#1d2945',
        roughness: 0.72,
        metalness: 0.08,
      })
    );
    floor.position.y = -0.08;
    floor.receiveShadow = true;
    scene.add(floor);

    const clickables: THREE.Object3D[] = [];
    let coverPivot: THREE.Group | null = null;
    let spreadMesh: THREE.Mesh | null = null;
    let targetCoverAngle = magazinePage > 0 ? -Math.PI * 0.86 : 0;
    let currentCoverAngle = targetCoverAngle;
    let currentSpreadPage = magazinePage;

    const texLoader = new THREE.TextureLoader();

    /* ---- Build Workshop-Specific 3D Showcase Hero ---- */
    if (workshop === 1) {
      // 3D Ocean Exhibition Gallery: 3 curved display pavilions with the 6 curated books
      const frameMat = new THREE.MeshStandardMaterial({
        color: '#1e3a5f',
        roughness: 0.35,
        metalness: 0.65,
      });
      const brassMat = new THREE.MeshStandardMaterial({
        color: '#d4a345',
        roughness: 0.25,
        metalness: 0.85,
      });

      const curatedBySection = (secId: 'life' | 'research' | 'expedition') => {
        const savedIds = save.exhibitionSections[secId];
        if (savedIds && savedIds.length === 2) {
          return savedIds
            .map((id) => OCEAN_BOOKS.find((b) => b.id === id))
            .filter((b): b is OceanBook => Boolean(b));
        }
        return OCEAN_BOOKS.filter((b) => b.section === secId);
      };

      OCEAN_DIVISIONS.forEach((div, idx) => {
        const angle = (idx - 1) * 0.58;
        const radius = 3.25;
        const stand = new THREE.Group();
        stand.position.set(Math.sin(angle) * radius, 0, -Math.cos(angle) * radius + 1.8);
        stand.rotation.y = -angle;

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(2.35, 0.75, 0.72),
          new THREE.MeshStandardMaterial({ color: '#0f2540', roughness: 0.65, metalness: 0.15 })
        );
        base.position.y = 0.375;
        base.castShadow = true;
        base.receiveShadow = true;
        stand.add(base);

        const wall = new THREE.Mesh(new THREE.BoxGeometry(2.28, 1.85, 0.12), frameMat);
        wall.position.set(0, 1.65, -0.22);
        wall.castShadow = true;
        stand.add(wall);

        const headerTex = createPlaqueTexture(renderer, {
          bg: div.color,
          title: div.title,
          width: 480,
          height: 92,
        });
        const header = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 0.34, 0.08),
          [
            brassMat,
            brassMat,
            brassMat,
            brassMat,
            new THREE.MeshStandardMaterial({ map: headerTex, roughness: 0.38 }),
            brassMat,
          ]
        );
        header.position.set(0, 2.52, -0.14);
        stand.add(header);

        const books = curatedBySection(div.id);
        books.forEach((book, bIdx) => {
          const bx = bIdx === 0 ? -0.54 : 0.54;
          const fallbackTex = createPlaqueTexture(renderer, {
            bg: div.color,
            title: book.title.slice(0, 18),
            subtitle: String(book.year),
            width: 256,
            height: 340,
          });
          const coverMat = new THREE.MeshStandardMaterial({
            map: fallbackTex,
            roughness: 0.32,
            metalness: 0.05,
          });
          texLoader.load(
            book.cover,
            (loaded) => {
              if (disposed) {
                loaded.dispose();
                return;
              }
              loaded.colorSpace = THREE.SRGBColorSpace;
              loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
              coverMat.map = loaded;
              coverMat.needsUpdate = true;
              fallbackTex.dispose();
              requestRender();
            },
            undefined,
            () => {
              // Keep procedural fallback if image fails
            }
          );

          const bookMesh = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.12, 0.08), [
            brassMat,
            brassMat,
            brassMat,
            brassMat,
            coverMat,
            frameMat,
          ]);
          bookMesh.position.set(bx, 1.56, -0.08);
          bookMesh.castShadow = true;
          bookMesh.userData = { oceanBook: book };
          stand.add(bookMesh);
          clickables.push(bookMesh);
        });

        const accentLight = new THREE.PointLight('#7dd3fc', 0.85, 4.2, 2);
        accentLight.position.set(0, 2.35, 0.65);
        stand.add(accentLight);

        scene.add(stand);
      });
    } else if (workshop === 2) {
      // 3D Magazine "Культура № 01" on Brushed-Steel Presentation Lectern
      const steelMat = new THREE.MeshStandardMaterial({
        color: '#263244',
        roughness: 0.28,
        metalness: 0.78,
      });
      const brassMat = new THREE.MeshStandardMaterial({
        color: '#d4a345',
        roughness: 0.24,
        metalness: 0.86,
      });
      const paperMat = new THREE.MeshStandardMaterial({
        color: '#fbfaf5',
        roughness: 0.85,
        metalness: 0.0,
      });

      const lectern = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.14, 28), steelMat);
      base.position.y = 0.07;
      base.castShadow = true;
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.56, 20), steelMat);
      column.position.y = 0.4;
      const trimRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 10, 24), brassMat);
      trimRing.rotation.x = Math.PI / 2;
      trimRing.position.y = 0.66;
      const tray = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 2.2), steelMat);
      tray.position.set(0, 0.72, 0);
      tray.rotation.x = 0.28;
      tray.castShadow = true;
      tray.receiveShadow = true;
      lectern.add(base, column, trimRing, tray);

      // Magazine body mounted on angled tray
      const magRoot = new THREE.Group();
      magRoot.position.set(0, 0.78, 0);
      magRoot.rotation.x = 0.28;

      const spreadTex = new THREE.CanvasTexture(
        buildMagazineSpreadCanvas(Math.max(1, magazinePage), save.magazineHeadline)
      );
      spreadTex.colorSpace = THREE.SRGBColorSpace;
      spreadTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

      const pagesBlock = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.09, 1.76), [
        paperMat,
        paperMat,
        new THREE.MeshStandardMaterial({ map: spreadTex, roughness: 0.75 }),
        paperMat,
        paperMat,
        paperMat,
      ]);
      pagesBlock.position.y = 0.045;
      pagesBlock.castShadow = true;
      pagesBlock.userData = { flipMag: true };
      spreadMesh = pagesBlock;
      magRoot.add(pagesBlock);
      clickables.push(pagesBlock);

      // Animated Front Cover pivoting on center spine (x = 0)
      coverPivot = new THREE.Group();
      coverPivot.position.set(0, 0.095, 0);
      const coverTex = createScreenCanvasTexture(renderer, 'magazine', save.magazineHeadline);
      const frontCover = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.02, 1.78), [
        paperMat,
        paperMat,
        new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.32, metalness: 0.08 }),
        paperMat,
        paperMat,
        paperMat,
      ]);
      frontCover.position.set(0.64, 0.01, 0);
      frontCover.castShadow = true;
      frontCover.userData = { flipMag: true };
      coverPivot.add(frontCover);
      coverPivot.rotation.z = currentCoverAngle;
      magRoot.add(coverPivot);
      clickables.push(frontCover);

      lectern.add(magRoot);
      scene.add(lectern);
    } else {
      // Workshop 3: Launched 3D "Библионочь" Hall (Stage + Festoon Lights + Interactive Zones)
      const walnutMat = new THREE.MeshStandardMaterial({ color: '#6b472b', roughness: 0.55 });
      const oakMat = new THREE.MeshStandardMaterial({ color: '#b58352', roughness: 0.58 });
      const navyMat = new THREE.MeshStandardMaterial({ color: '#13294b', roughness: 0.48, metalness: 0.14 });
      const crimsonMat = new THREE.MeshStandardMaterial({ color: '#c41e2e', roughness: 0.46, metalness: 0.12 });
      const metalMat = new THREE.MeshStandardMaterial({ color: '#263244', roughness: 0.3, metalness: 0.75 });
      const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd66b', roughness: 0.28, metalness: 0.82 });

      // Main Stage
      const stageDeck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.42, 2.2), walnutMat);
      stageDeck.position.set(0, 0.21, -1.75);
      stageDeck.castShadow = true;
      stageDeck.receiveShadow = true;
      scene.add(stageDeck);

      const bannerTex = createScreenCanvasTexture(renderer, 'festival', save.festivalName);
      const stageBanner = new THREE.Mesh(new THREE.BoxGeometry(3.9, 1.85, 0.14), [
        goldMat,
        goldMat,
        goldMat,
        goldMat,
        new THREE.MeshStandardMaterial({
          map: bannerTex,
          emissiveMap: bannerTex,
          emissive: new THREE.Color('#ffffff'),
          emissiveIntensity: 0.42,
          roughness: 0.3,
        }),
        navyMat,
      ]);
      stageBanner.position.set(0, 1.48, -2.55);
      stageBanner.castShadow = true;
      scene.add(stageBanner);

      // Truss pillars & top rig with glowing festival bulbs
      [-2.25, 2.25].forEach((px) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.9, 0.14), metalMat);
        pillar.position.set(px, 1.45, -2.4);
        scene.add(pillar);
        const speaker = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 0.45), metalMat);
        speaker.position.set(px * 0.82, 0.86, -1.65);
        speaker.castShadow = true;
        scene.add(speaker);
      });
      const trussTop = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.14, 0.14), metalMat);
      trussTop.position.set(0, 2.88, -2.4);
      scene.add(trussTop);

      for (let i = 0; i < 9; i++) {
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 10, 10),
          new THREE.MeshStandardMaterial({
            color: '#fff6d1',
            emissive: i % 2 === 0 ? '#ffd66b' : '#f43f5e',
            emissiveIntensity: 1.35,
            roughness: 0.2,
          })
        );
        bulb.position.set(-2.0 + i * 0.5, 2.75, -2.28);
        scene.add(bulb);
      }

      // Interactive Zone 1: Quiz tables (front left)
      [-1.75, 0].forEach((tx) => {
        const table = new THREE.Group();
        table.position.set(tx, 0, 1.4);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 20), oakMat);
        top.position.y = 0.72;
        top.castShadow = true;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 12), metalMat);
        leg.position.y = 0.35;
        const lamp = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.12, 0.22, 12),
          new THREE.MeshStandardMaterial({
            color: '#ffd66b',
            emissive: '#ffd66b',
            emissiveIntensity: 0.7,
            roughness: 0.3,
          })
        );
        lamp.position.y = 0.86;
        table.add(top, leg, lamp);
        scene.add(table);
      });

      // Interactive Zone 2: Photozone Arch & Bookcrossing Shelf (front right)
      const archGroup = new THREE.Group();
      archGroup.position.set(2.15, 0, 1.25);
      archGroup.rotation.y = -0.35;
      const archRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.88, 0.08, 12, 28, Math.PI),
        crimsonMat
      );
      archRing.position.y = 0.95;
      const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 10), crimsonMat);
      leftPost.position.set(-0.88, 0.475, 0);
      const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 10), crimsonMat);
      rightPost.position.set(0.88, 0.475, 0);
      archGroup.add(archRing, leftPost, rightPost);
      scene.add(archGroup);

      const stageLight = new THREE.PointLight('#ffd66b', 1.6, 8.5, 2);
      stageLight.position.set(0, 2.4, -0.5);
      scene.add(stageLight);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...defaultTarget);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.6;
    controls.maxDistance = 13;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.update();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let camAnimating = false;
    let frameId = 0;
    let timeoutId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min((now - lastTime) / 1000, 0.08);
        lastTime = now;

        let needsMore = false;

        if (camAnimating) {
          const lambda = isSoftwareGl ? 14 : 7.5;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, lambda, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, lambda, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, lambda, dt);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalLook.x, lambda, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalLook.y, lambda, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalLook.z, lambda, dt);
          if (
            camera.position.distanceTo(_camGoalPos) < 0.03 &&
            controls.target.distanceTo(_camGoalLook) < 0.03
          ) {
            camera.position.copy(_camGoalPos);
            controls.target.copy(_camGoalLook);
            camAnimating = false;
          } else {
            needsMore = true;
          }
        }

        if (coverPivot && Math.abs(currentCoverAngle - targetCoverAngle) > 0.005) {
          currentCoverAngle = THREE.MathUtils.damp(
            currentCoverAngle,
            targetCoverAngle,
            isSoftwareGl ? 14 : 8,
            dt
          );
          coverPivot.rotation.z = currentCoverAngle;
          needsMore = true;
        }

        if (controls.update() && controls.enableDamping) {
          needsMore = true;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (disposed) return;
          if (renderDirty || needsMore) requestRender();
        };
        if (isSoftwareGl) {
          scheduleAfterDraw(renderer, done, (id) => {
            timeoutId = id;
          });
        } else {
          done();
        }
      });
    };

    const onStart = () => {
      camAnimating = false;
    };
    const onChange = () => requestRender();
    controls.addEventListener('start', onStart);
    controls.addEventListener('change', onChange);

    controllerRef.current = {
      setPage: (p: number) => {
        targetCoverAngle = p > 0 ? -Math.PI * 0.86 : 0;
        if (spreadMesh && p > 0 && p !== currentSpreadPage) {
          currentSpreadPage = p;
          const mats = spreadMesh.material as THREE.MeshStandardMaterial[];
          const topMat = mats[2];
          if (topMat) {
            topMat.map?.dispose();
            const nextTex = new THREE.CanvasTexture(
              buildMagazineSpreadCanvas(p, save.magazineHeadline)
            );
            nextTex.colorSpace = THREE.SRGBColorSpace;
            nextTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            topMat.map = nextTex;
            topMat.needsUpdate = true;
          }
        }
        lastTime = performance.now();
        requestRender();
      },
      setPreset: (mode: 'main' | 'alt') => {
        if (mode === 'main') {
          _camGoalPos.set(...defaultCam);
          _camGoalLook.set(...defaultTarget);
        } else if (workshop === 1) {
          _camGoalPos.set(4.5, 2.2, 5.2);
          _camGoalLook.set(0, 1.4, -0.5);
        } else if (workshop === 2) {
          _camGoalPos.set(0, 4.1, 1.85);
          _camGoalLook.set(0, 0.85, 0);
        } else {
          _camGoalPos.set(0, 2.25, 2.35);
          _camGoalLook.set(0, 1.35, -2.0);
        }
        camAnimating = true;
        lastTime = performance.now();
        requestRender();
      },
    };

    // Click interaction for 3D books / magazine
    const raycaster = new THREE.Raycaster();
    let downPos = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 7) return;
      if (clickables.length === 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length === 0) return;
      const data = hits[0].object.userData;
      if (data?.oceanBook) {
        soundEngine.playSelectTick();
        onOceanBookRef.current?.(data.oceanBook as OceanBook);
      } else if (data?.flipMag) {
        soundEngine.playPaperSlide();
        onFlipRef.current?.();
      }
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const onResize = () => {
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      requestRender();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    requestRender();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      if (timeoutId) window.clearTimeout(timeoutId);
      controllerRef.current = null;
      ro.disconnect();
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('change', onChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      disposeObjectTree(scene);
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [workshop, save.exhibitionSections, save.magazineHeadline, save.festivalName]);

  if (!webglOk) return null;

  const caption =
    workshop === 1
      ? '3D-галерея твоей выставки · вращай зал и кликай на книги на стендах'
      : workshop === 2
        ? '3D-стенд журнала «Культура» · вращай макет или кликни по обложке, чтобы перелистнуть'
        : '3D-зал запущенной «Библионочи» · вращай сцену и интерактивные зоны на 360°';

  const altLabel =
    workshop === 1 ? 'Боковой ракурс' : workshop === 2 ? 'Вид сверху' : 'Крупно: сцена';

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-xl bg-[#0e223d]">
      <div ref={mountRef} className="w-full h-[300px] sm:h-[360px]" />

      {/* Compact Bottom Controls Strip */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto rounded-xl bg-[#13294b]/92 text-white px-3.5 py-2 text-xs font-bold border border-white/15">
          {caption}
        </div>
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = viewMode === 'main' ? 'alt' : 'main';
              setViewMode(next);
              controllerRef.current?.setPreset(next);
            }}
            className="min-h-[36px] px-3 rounded-xl bg-[#13294b]/92 hover:bg-[#1a3763] text-white text-xs font-bold border border-white/15 whitespace-nowrap"
          >
            {viewMode === 'main' ? altLabel : 'Общий вид'}
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('main');
              controllerRef.current?.setPreset('main');
            }}
            title="Сбросить камеру"
            className="min-h-[36px] w-9 rounded-xl bg-[#13294b]/92 hover:bg-[#1a3763] text-white inline-flex items-center justify-center border border-white/15"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
