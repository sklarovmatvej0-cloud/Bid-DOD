import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let cachedSoftwareGl: boolean | null = null;

/**
 * Detects software WebGL rasterizers (SwiftShader, llvmpipe, WARP, etc.)
 * from the GPU renderer string so rendering cost adapts cleanly on school PCs
 * and headless environments without altering scene content or app logic.
 */
export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export interface StudioRendererBundle {
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
  envTexture: THREE.Texture;
}

export function createStudioRenderer(
  container: HTMLElement,
  scene: THREE.Scene
): StudioRendererBundle {
  const isSoftwareGl = detectSoftwareGl();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: false,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  renderer.setSize(width, height, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';

  container.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  return { renderer, isSoftwareGl, envTexture };
}

/**
 * Software-WebGL-safe frame pacing helper using WebGL2 fenceSync.
 */
export function scheduleAfterDraw(
  renderer: THREE.WebGLRenderer,
  cb: () => void,
  registerTimeout: (id: number) => void
): void {
  const gl = renderer.getContext();
  if (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        registerTimeout(window.setTimeout(poll, 5));
      } else {
        if (sync) gl.deleteSync(sync);
        registerTimeout(window.setTimeout(cb, 80));
      }
    };
    registerTimeout(window.setTimeout(poll, 5));
  } else {
    registerTimeout(window.setTimeout(cb, 80));
  }
}

export function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.map) std.map.dispose();
        if (std.roughnessMap) std.roughnessMap.dispose();
        if (std.normalMap) std.normalMap.dispose();
        if (std.emissiveMap) std.emissiveMap.dispose();
        mat.dispose();
      });
    }
  });
}

/* ================= PROCEDURAL CANVAS TEXTURES ================= */

export function createWoodFloorTexture(
  renderer: THREE.WebGLRenderer,
  baseHex: string,
  plankHex: string,
  grainHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 64;
  for (let row = 0; row < 8; row++) {
    const y = row * plankH;
    const offset = (row % 2) * 128;
    for (let col = -1; col < 3; col++) {
      const x = col * 256 + offset;
      ctx.fillStyle = (row + col) % 2 === 0 ? baseHex : plankHex;
      ctx.fillRect(x + 1, y + 1, 254, plankH - 2);

      // Subtle wood grain lines
      ctx.strokeStyle = grainHex;
      ctx.lineWidth = 1;
      for (let g = 0; g < 6; g++) {
        const gy = y + 8 + g * 9;
        ctx.beginPath();
        ctx.moveTo(x + 2, gy);
        ctx.bezierCurveTo(x + 80, gy + ((row + g) % 3) - 1, x + 170, gy - 1, x + 252, gy);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 2.2);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 122);
  grad.addColorStop(0, 'rgba(13, 27, 48, 0.55)');
  grad.addColorStop(0.55, 'rgba(13, 27, 48, 0.24)');
  grad.addColorStop(1, 'rgba(13, 27, 48, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPlaqueTexture(
  renderer: THREE.WebGLRenderer,
  options: {
    bg: string;
    border?: string;
    kicker?: string;
    kickerColor?: string;
    title: string;
    titleColor?: string;
    subtitle?: string;
    width?: number;
    height?: number;
  }
): THREE.CanvasTexture {
  const w = options.width ?? 512;
  const h = options.height ?? 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = options.bg;
  ctx.fillRect(0, 0, w, h);

  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (options.kicker) {
    ctx.fillStyle = options.kickerColor ?? '#ffd66b';
    ctx.font = '700 22px Manrope, sans-serif';
    ctx.fillText(options.kicker, w / 2, h * 0.28);
  }

  ctx.fillStyle = options.titleColor ?? '#ffffff';
  ctx.font = `800 ${options.subtitle ? 36 : 42}px Unbounded, Manrope, sans-serif`;
  ctx.fillText(options.title, w / 2, options.kicker ? h * 0.58 : h * 0.48, w - 48);

  if (options.subtitle) {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = '600 21px Manrope, sans-serif';
    ctx.fillText(options.subtitle, w / 2, h * 0.82, w - 48);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export function createScreenCanvasTexture(
  renderer: THREE.WebGLRenderer,
  variant: 'catalog' | 'layout' | 'smm' | 'ocean' | 'magazine' | 'festival',
  dynamicText?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext('2d')!;

  if (variant === 'catalog') {
    ctx.fillStyle = '#0f2847';
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = '#135c75';
    ctx.fillRect(0, 0, 512, 54);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 22px Manrope, sans-serif';
    ctx.fillText('ЭЛЕКТРОННЫЙ КАТАЛОГ · ББК', 24, 34);
    // Search bar
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, 74, 464, 38);
    ctx.fillStyle = '#13294b';
    ctx.font = '600 18px Manrope, sans-serif';
    ctx.fillText('Миронова · Дизайн · 2023', 38, 99);
    // Book cards
    const colors = ['#2b7a98', '#c41e2e', '#d97706', '#157a4f'];
    for (let i = 0; i < 4; i++) {
      const bx = 24 + i * 118;
      ctx.fillStyle = '#1c3a5e';
      ctx.fillRect(bx, 132, 106, 182);
      ctx.fillStyle = colors[i];
      ctx.fillRect(bx + 10, 142, 86, 108);
      ctx.fillStyle = '#ffd66b';
      ctx.fillRect(bx + 10, 264, 62, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillRect(bx + 10, 286, 82, 10);
    }
  } else if (variant === 'layout') {
    ctx.fillStyle = '#f8f9fc';
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = '#c41e2e';
    ctx.fillRect(0, 0, 512, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 20px Manrope, sans-serif';
    ctx.fillText('ВЁРСТКА ПОЛОСЫ · ЖУРНАЛ «КУЛЬТУРА»', 20, 30);
    // Two columns spread
    ctx.fillStyle = '#13294b';
    ctx.font = '800 22px Manrope, sans-serif';
    ctx.fillText('От эскиза до плаката', 28, 86);
    ctx.fillStyle = '#475569';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(28, 108 + i * 24, i === 7 ? 150 : 210, 11);
    }
    ctx.fillStyle = '#c41e2e';
    ctx.fillRect(264, 68, 220, 182);
    ctx.fillStyle = '#ffd66b';
    ctx.beginPath();
    ctx.arc(374, 158, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#13294b';
    ctx.fillRect(264, 266, 190, 12);
  } else if (variant === 'smm') {
    ctx.fillStyle = '#13294b';
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = '#ffd66b';
    ctx.fillRect(28, 28, 220, 284);
    ctx.fillStyle = '#13294b';
    ctx.font = '800 26px Unbounded, Manrope, sans-serif';
    ctx.fillText('БИБЛИО', 46, 92);
    ctx.fillText('НОЧЬ', 46, 126);
    ctx.fillStyle = '#c41e2e';
    ctx.fillRect(46, 152, 160, 10);
    ctx.fillStyle = '#13294b';
    ctx.font = '700 18px Manrope, sans-serif';
    ctx.fillText('Квиз · Книги · Арт', 46, 195);
    ctx.fillText('450+ регистраций', 46, 232);
    // Right metrics
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px Manrope, sans-serif';
    ctx.fillText('SMM-АНОНС', 282, 80);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(282, 112, 190, 18);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(282, 150, 155, 18);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(282, 188, 175, 18);
  } else if (variant === 'ocean') {
    const grad = ctx.createLinearGradient(0, 0, 0, 340);
    grad.addColorStop(0, '#0a2d4d');
    grad.addColorStop(1, '#135c75');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 20px Manrope, sans-serif';
    ctx.fillText('ВИРТУАЛЬНАЯ ВЫСТАВКА', 28, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 30px Unbounded, Manrope, sans-serif';
    ctx.fillText('ТАЙНЫ ОКЕАНА', 28, 92);
    // Decorative wave lines
    ctx.strokeStyle = 'rgba(125,211,252,0.45)';
    ctx.lineWidth = 4;
    for (let w = 0; w < 3; w++) {
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 16) {
        const y = 210 + w * 32 + Math.sin(x * 0.025 + w) * 14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (variant === 'magazine') {
    ctx.fillStyle = '#13294b';
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = '#c41e2e';
    ctx.fillRect(0, 0, 512, 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 48px Unbounded, Manrope, sans-serif';
    ctx.fillText('КУЛЬТУРА', 28, 66);
    ctx.fillStyle = '#ffd66b';
    ctx.font = '700 22px Manrope, sans-serif';
    ctx.fillText('№ 01 · ИЗДАТЕЛЬСКИЙ ВЫПУСК · 12+', 28, 134);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px Manrope, sans-serif';
    const title = dynamicText || 'От эскиза до плаката';
    ctx.fillText(title.slice(0, 32), 28, 196);
    if (title.length > 32) {
      ctx.fillText(title.slice(32, 64), 28, 228);
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, 512, 340);
    grad.addColorStop(0, '#13294b');
    grad.addColorStop(1, '#261b47');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 340);
    ctx.fillStyle = '#ffd66b';
    ctx.font = '800 22px Manrope, sans-serif';
    ctx.fillText('АКЦИЯ БИБЛИОТЕКИ · КРЕАТИВНЫЙ МЕНЕДЖМЕНТ', 24, 52);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px Unbounded, Manrope, sans-serif';
    const fest = dynamicText || 'БИБЛИОНОЧЬ';
    ctx.fillText(fest.slice(0, 22), 24, 128);
    if (fest.length > 22) {
      ctx.font = '700 24px Manrope, sans-serif';
      ctx.fillStyle = '#ffd66b';
      ctx.fillText(fest.slice(22, 52), 24, 174);
    }
    // Warm lights bar
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffd66b' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(46 + i * 60, 270, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
