import * as THREE from 'three';
import { createFormation, selectEvenly } from './formations.js';
import { createFrameBudget } from './frame-budget.js';
import { createTransitionPlan } from './transition-plan.js';

export class AlbumScene {
  constructor(canvas, { onSelect, onTransitionEnd, onFallback }) {
    this.canvas = canvas;
    this.onSelect = onSelect;
    this.onTransitionEnd = onTransitionEnd;
    this.onFallback = onFallback;
    this.items = [];
    this.retiring = [];
    this.disposed = false;
    this.paused = false;
    this.mode = 'normal';
    this.time = 0;
    this.transition = 0;
    this.lastTime = null;
    this.budget = createFrameBudget();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
    this.camera.position.z = 12;
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(3, 3);
    this.loader = new THREE.TextureLoader();
    const placeholder = document.createElement('canvas');
    placeholder.width = 256; placeholder.height = 180;
    const ctx = placeholder.getContext('2d');
    ctx.fillStyle = '#4b3031'; ctx.fillRect(0, 0, 256, 180);
    ctx.fillStyle = '#e0b78d'; ctx.font = '14px serif'; ctx.textAlign = 'center';
    ctx.fillText('A MEMORY', 128, 87); ctx.font = '11px sans-serif'; ctx.fillText('照片暂不可用', 128, 112);
    this.placeholder = new THREE.CanvasTexture(placeholder);
    this.placeholder.colorSpace = THREE.SRGBColorSpace;
    this.contextLost = (event) => { event.preventDefault(); this.fail('图形连接中断，已切换照片墙'); };
    canvas.addEventListener('webglcontextlost', this.contextLost);
    this.tick = this.tick.bind(this);
    this.resize(canvas.clientWidth, canvas.clientHeight);
    this.raf = requestAnimationFrame(this.tick);
  }

  fail(reason) {
    if (this.disposed || this.failed) return;
    this.failed = true;
    cancelAnimationFrame(this.raf);
    this.onFallback(reason);
  }

  makeItem(entry) {
    const group = new THREE.Group();
    const border = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ color: '#e6c7a7', transparent: true }));
    border.scale.set(1.36, 1.04, 1);
    const picture = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ map: this.placeholder, transparent: true }));
    picture.scale.set(1.24, 0.9, 1); picture.position.z = 0.006;
    group.add(border, picture);
    group.position.set(entry.target.x * 0.9, entry.target.y, -3);
    group.scale.setScalar(0.05);
    const item = { key: entry.key, photo: entry.photo, group, picture, target: entry.target, opacity: 0, dead: false };
    group.userData.item = item;
    this.scene.add(group);
    this.loader.load(entry.photo.thumb, (texture) => {
      if (item.dead || this.disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      item.texture = texture;
      picture.material.map = texture;
      picture.material.needsUpdate = true;
      const aspect = texture.image.width / texture.image.height;
      picture.scale.set(Math.min(1.24, 0.9 * aspect), Math.min(0.9, 1.24 / aspect), 1);
    }, undefined, () => { /* Keep the film placeholder when a photo is missing. */ });
    return item;
  }

  setChapter(photos, formation) {
    if (this.disposed || this.failed) return;
    for (const item of this.retiring) this.removeItem(item);
    this.retiring = [];
    this.photos = photos; this.formation = formation;
    const visible = this.mode === 'reduced' ? selectEvenly(photos, 24) : photos;
    const targets = createFormation(formation, visible.length, this.viewport);
    const plan = createTransitionPlan(this.items, visible, targets);
    this.items = [...plan.updates.map((entry) => {
      entry.item.target = entry.target;
      return entry.item;
    }), ...plan.creates.map((entry) => this.makeItem(entry))];
    this.retiring = plan.removes;
    for (const item of [...this.items, ...this.retiring]) {
      item.from = { x: item.group.position.x, y: item.group.position.y, z: item.group.position.z,
        rotationZ: item.group.rotation.z, scale: item.group.scale.x, opacity: item.opacity };
    }
    this.transition = 1000;
    this.hovered = null;
  }

  setPointer(x, y, select = false) {
    this.pointer.set(x, y);
    if (this.transition > 0 || this.paused || this.failed) return;
    this.camera.updateMatrixWorld(); this.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.items.map((item) => item.group), true)[0];
    this.hovered = hit?.object.parent.userData.item ?? null;
    this.canvas.style.cursor = this.hovered ? 'pointer' : 'default';
    if (select && this.hovered) this.onSelect(this.hovered.photo);
  }

  setPaused(paused) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.lastTime = null;
    if (paused) cancelAnimationFrame(this.raf);
    else if (!this.disposed && !this.failed) this.raf = requestAnimationFrame(this.tick);
  }

  setReducedMotion(reduced) { if (reduced) this.fail('已按系统偏好减少动态效果'); }

  resize(width, height) {
    if (!width || !height || this.disposed || this.failed) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.viewport = { width: 8.5 * width / height, height: 8.5 };
    if (this.photos) this.setChapter(this.photos, this.formation);
  }

  tick(now) {
    if (this.paused || this.disposed || this.failed) return;
    const delta = this.lastTime === null ? 16 : now - this.lastTime;
    this.lastTime = now;
    this.time += Math.min(delta, 50);
    const transitioning = this.transition > 0;
    if (transitioning) this.transition = Math.max(0, this.transition - Math.min(delta, 50));
    const progress = 1 - this.transition / 1000;
    const ease = progress * progress * (3 - 2 * progress);
    for (const item of [...this.items, ...this.retiring]) {
      const retiring = this.retiring.includes(item);
      const target = retiring ? { ...item.target, z: -3, scale: 0.05 } : item.target;
      const hover = this.hovered === item && !transitioning;
      const float = transitioning ? 0 : Math.sin(this.time / 2000 + item.target.x) * 0.035;
      const amount = transitioning ? ease : 1;
      item.group.position.set(
        THREE.MathUtils.lerp(item.from.x, target.x, amount),
        THREE.MathUtils.lerp(item.from.y, target.y, amount) + float,
        THREE.MathUtils.lerp(item.from.z, target.z, amount) + (hover ? 0.45 : 0));
      item.group.rotation.z = THREE.MathUtils.lerp(item.from.rotationZ, target.rotationZ, amount);
      item.group.scale.setScalar(THREE.MathUtils.lerp(item.from.scale, target.scale, amount) * (hover ? 1.07 : 1));
      item.opacity = THREE.MathUtils.lerp(item.from.opacity, retiring ? 0 : 1, amount);
      item.group.children.forEach((mesh) => { mesh.material.opacity = item.opacity; });
    }
    if (transitioning && this.transition === 0) {
      for (const item of this.retiring) this.removeItem(item);
      this.retiring = [];
      this.onTransitionEnd();
    }
    if (!transitioning && this.items.length) {
      const state = this.budget.addFrame(delta);
      if (state === 'fallback') { this.fail('设备运行较慢，已切换轻量照片墙'); return; }
      if (state === 'reduced' && this.mode === 'normal') {
        this.mode = 'reduced';
        this.renderer.setPixelRatio(1);
        this.setChapter(this.photos, this.formation);
      }
    }
    try { this.renderer.render(this.scene, this.camera); }
    catch { this.fail('图形渲染不可用，已切换照片墙'); return; }
    this.raf = requestAnimationFrame(this.tick);
  }

  removeItem(item) {
    if (item.dead) return;
    item.dead = true;
    this.scene.remove(item.group);
    item.texture?.dispose();
    item.group.children.forEach((mesh) => mesh.material.dispose());
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    [...this.items, ...this.retiring].forEach((item) => this.removeItem(item));
    this.geometry.dispose(); this.placeholder.dispose(); this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.items = []; this.retiring = [];
  }
}
