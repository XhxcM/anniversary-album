import * as THREE from 'three';
import { createFormation } from './formations.js';
import { createFrameBudget } from './frame-budget.js';
import { createTransitionPlan } from './transition-plan.js';
import { FORMATIONS, OPENING_MS, loopState, photoBatch } from './loop-timeline.js';

const { lerp, smoothstep } = THREE.MathUtils;
const CARD_LIMITS = { normal: 36, reduced: 12 };

function createFrameMaterial(lightTime) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uFrameTime: lightTime },
    vertexShader: `
      varying vec2 vFrameUv;
      varying float vFramePhase;

      void main() {
        vFrameUv = uv;
        vFramePhase = dot(modelMatrix[3].xy, vec2(0.047, 0.029));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uFrameTime;
      varying vec2 vFrameUv;
      varying float vFramePhase;

      void main() {
        vec2 sides = min(vFrameUv, 1.0 - vFrameUv) * vec2(0.89, 1.14);
        float edge = min(sides.x, sides.y);
        float aa = max(0.006, fwidth(edge) * 0.65);
        // Follow the perimeter from the bottom edge, clockwise in UV space.
        float along = sides.y <= sides.x
          ? (vFrameUv.y < 0.5 ? 1.0 - vFrameUv.x : 2.0 + vFrameUv.x)
          : (vFrameUv.x < 0.5 ? 1.0 + vFrameUv.y : 4.0 - vFrameUv.y);
        float phase = along * 0.25 - uFrameTime * 0.24 + vFramePhase;
        float orbit = fract(phase);
        float shine = 1.0 - smoothstep(0.018, 0.17, min(orbit, 1.0 - orbit));
        float rim = 1.0 - smoothstep(0.005, 0.011 + aa, abs(edge - 0.012));
        float inner = 1.0 - smoothstep(0.003, 0.008 + aa, abs(edge - 0.059));
        float glass = smoothstep(0.003, 0.016, edge) * (1.0 - smoothstep(0.048, 0.068, edge));
        float bevel = sin(clamp((edge - 0.012) / 0.047, 0.0, 1.0) * 3.141593);
        float facing = sides.y <= sides.x
          ? (vFrameUv.y > 0.5 ? 1.0 : 0.32)
          : (vFrameUv.x < 0.5 ? 0.82 : 0.22);
        float alpha = clamp(glass * (0.18 + 0.14 * bevel + 0.18 * shine)
          + rim * (0.24 + 0.42 * shine) + inner * 0.22, 0.0, 0.88);
        if (alpha < 0.005) discard;
        float hue = 0.5 + 0.5 * cos(phase * 6.283185);
        vec3 tint = mix(vec3(0.32, 0.54, 0.98), vec3(0.92, 0.40, 0.80), hue);
        vec3 glassColor = mix(tint * 0.38, vec3(0.88, 0.92, 1.0), facing * bevel * 0.62);
        glassColor = mix(glassColor, vec3(1.0, 0.93, 1.0), rim * (0.3 + 0.45 * shine));
        glassColor *= 1.0 - inner * 0.28;
        gl_FragColor = vec4(mix(glassColor, vec3(1.0, 0.91, 1.0), shine * 0.3), alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}

export class AlbumScene {
  constructor(canvas, { photos, elapsed, onFallback }) {
    this.canvas = canvas;
    this.elapsed = elapsed;
    this.onFallback = onFallback;
    this.items = [];
    this.textures = new Map();
    this.budget = createFrameBudget();
    this.mode = 'normal';
    this.lightTime = { value: 0 };
    this.applyPhotoLight = (shader) => {
      shader.uniforms.uAlbumLightTime = this.lightTime;
      shader.vertexShader = 'varying float vAlbumLightPhase;\n' + shader.vertexShader.replace('#include <uv_vertex>', `
        #include <uv_vertex>
        vAlbumLightPhase = dot(modelMatrix[3].xy, vec2(0.053, 0.031));
      `);
      shader.fragmentShader = 'uniform float uAlbumLightTime;\nvarying float vAlbumLightPhase;\n' +
        shader.fragmentShader.replace('#include <opaque_fragment>', `
          float sweep = fract(uAlbumLightTime * 0.23 - vAlbumLightPhase) * 2.0 - 0.5;
          float distanceToLight = abs(vMapUv.x + (vMapUv.y - 0.5) * 0.47 - sweep);
          float glow = 0.16 * (1.0 - smoothstep(0.0, 0.24, distanceToLight));
          glow += 0.11 * (1.0 - smoothstep(0.0, 0.065, distanceToLight));
          outgoingLight = mix(outgoingLight, vec3(1.0, 0.76, 0.89), glow);
          #include <opaque_fragment>
        `);
    };
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
    this.camera.position.z = 10.8;
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.frameMaterial = createFrameMaterial(this.lightTime);
    this.loader = new THREE.TextureLoader();
    const placeholder = document.createElement('canvas');
    placeholder.width = 192;
    placeholder.height = 256;
    const ctx = placeholder.getContext('2d');
    ctx.fillStyle = '#29223b';
    ctx.fillRect(0, 0, 192, 256);
    ctx.fillStyle = '#f2d9e7';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('照片暂不可用', 96, 128);
    this.placeholder = new THREE.CanvasTexture(placeholder);
    this.placeholder.colorSpace = THREE.SRGBColorSpace;
    this.contextLost = (event) => {
      event.preventDefault();
      this.fail('图形连接中断，已切换照片墙');
    };
    canvas.addEventListener('webglcontextlost', this.contextLost);
    this.tick = this.tick.bind(this);
    this.items = createTransitionPlan([], photos, []).creates.map(({ photo }) => this.makeItem(photo));
    this.resize(canvas.clientWidth, canvas.clientHeight);
    this.paused = true;
  }

  fail(reason) {
    if (this.disposed || this.failed) return;
    this.failed = true;
    cancelAnimationFrame(this.raf);
    this.onFallback(reason);
  }

  makeItem(photo) {
    const group = new THREE.Group();
    const border = new THREE.Mesh(this.geometry, this.frameMaterial);
    border.scale.set(0.89, 1.14, 1);
    const picture = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ map: this.placeholder }));
    picture.material.onBeforeCompile = this.applyPhotoLight;
    picture.scale.set(0.75, 1, 1);
    picture.position.z = 0.006;
    group.add(border, picture);
    this.scene.add(group);

    let entry = this.textures.get(photo.thumb);
    if (!entry) {
      entry = { materials: [], texture: null };
      this.textures.set(photo.thumb, entry);
      this.loader.load(photo.thumb, (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        entry.texture = texture;
        for (const material of entry.materials) {
          material.map = texture;
          material.needsUpdate = true;
        }
        entry.materials.length = 0;
      }, undefined, () => { entry.materials.length = 0; });
    }
    if (entry.texture) picture.material.map = entry.texture;
    else entry.materials.push(picture.material);
    return group;
  }

  setPaused(paused) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.lastTime = null;
    if (paused) cancelAnimationFrame(this.raf);
    else if (!this.disposed && !this.failed) this.raf = requestAnimationFrame(this.tick);
  }

  resize(width, height) {
    if (!width || !height || this.disposed || this.failed) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.viewport = { width: 8.5 * width / height, height: 8.5 };
    this.updateTargets();
  }

  updateTargets() {
    const { count } = photoBatch(0, this.items.length, CARD_LIMITS[this.mode]);
    this.targets = Object.fromEntries(FORMATIONS.map(({ name }) =>
      [name, createFormation(name, count, this.viewport)]));
  }

  tick(now) {
    if (this.paused || this.disposed || this.failed) return;
    const delta = this.lastTime === null ? 0 : now - this.lastTime;
    this.lastTime = now;
    const elapsed = this.elapsed(now);
    const seconds = elapsed / 1000;
    this.lightTime.value = seconds;
    const opening = elapsed < OPENING_MS;
    if (!opening && this.items.length) {
      const state = this.budget.addFrame(delta);
      if (state === 'fallback') {
        this.fail('设备运行较慢，已切换轻量照片墙');
        return;
      }
      if (state === 'reduced' && this.mode === 'normal') {
        this.mode = state;
        this.renderer.setPixelRatio(1);
        this.updateTargets();
      }
    }
    const { formation, nextFormation, progress } = loopState(elapsed - OPENING_MS);
    const total = this.items.length;
    const { start, count } = photoBatch(elapsed - OPENING_MS, total, CARD_LIMITS[this.mode]);
    const from = this.targets?.[formation];
    const to = this.targets?.[nextFormation];
    const transition = smoothstep(progress, 0, 1);
    // Keep the rows aligned while still letting the other shapes float.
    const drift = lerp(formation === 'matrix' ? 0.06 : 1, nextFormation === 'matrix' ? 0.06 : 1, transition);

    for (const group of this.items) group.visible = false;
    for (let index = 0; from && to && index < count; index++) {
      const delay = 0.09 + (index * 3 % 7) * 0.058;
      const turn = total > count ? smoothstep(progress, delay, delay + 0.5) : 0;
      const group = this.items[(start + index + (turn >= 0.5 ? count : 0)) % total];
      group.visible = true;
      const a = from[index];
      const b = to[index];
      let motion = drift;
      if (opening) {
        const amount = smoothstep(elapsed, (index % 17) * 35, OPENING_MS - 100);
        group.position.set(lerp(Math.sin(index * 2.4) * 0.16, a.x, amount),
          lerp(Math.cos(index * 2.4) * 0.11, a.y, amount), lerp(-2.6 + index * 0.018, a.z, amount));
        group.rotation.set(0, lerp(0, a.rotationY, amount), lerp(Math.sin(index) * 0.22, a.rotationZ, amount));
        group.scale.setScalar(lerp(0.72, a.scale, amount));
        motion *= amount;
      } else {
        group.position.set(lerp(a.x, b.x, transition), lerp(a.y, b.y, transition), lerp(a.z, b.z, transition));
        group.rotation.set(0, lerp(a.rotationY, b.rotationY, transition), lerp(a.rotationZ, b.rotationZ, transition));
        group.scale.setScalar(lerp(a.scale, b.scale, transition));
      }
      // Replace the picture while its card is turned edge-on.
      group.scale.x *= Math.abs(Math.cos(Math.PI * turn));
      const rise = Math.sin(seconds * 1.12 + index * 0.69) * motion;
      const sway = Math.cos(seconds * 0.87 + index * 0.83) * motion;
      group.position.x += sway * 0.09;
      group.position.y += rise * 0.15;
      group.position.z += sway * 0.14;
      group.rotation.x -= sway * 0.03;
      group.rotation.y += rise * 0.065;
      group.rotation.z += sway * 0.042;
    }
    try { this.renderer.render(this.scene, this.camera); }
    catch {
      this.fail('图形渲染不可用，已切换照片墙');
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    for (const group of this.items) {
      for (const mesh of group.children) {
        if (mesh.material !== this.frameMaterial) mesh.material.dispose();
      }
      this.scene.remove(group);
    }
    for (const { texture, materials } of this.textures.values()) {
      texture?.dispose();
      materials.length = 0;
    }
    this.textures.clear();
    this.geometry.dispose();
    this.frameMaterial.dispose();
    this.placeholder.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
