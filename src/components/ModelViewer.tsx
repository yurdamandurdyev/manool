import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { rebuildMaterials } from './manool-material';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export default function ModelViewer() {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Загружаем манула…');
  useEffect(() => {
    const host = container.current!;
    const ready = () => { document.documentElement.dataset.manoolReady = 'true'; window.dispatchEvent(new Event('manool-ready')); };
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { ready(); setStatus('Для просмотра модели нужен браузер с поддержкой WebGL.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    camera.position.z = 6;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x75412a, 1.8));
    const key = new THREE.DirectionalLight(0xffe0c7, 2); key.position.set(3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xff742f, 0.8); fill.position.set(-4, 1, 2); scene.add(fill);
    const pivot = new THREE.Group(); scene.add(pivot);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext('2d')!;
    const gradient = shadowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0, 0, 0, .55)');
    gradient.addColorStop(.4, 'rgba(0, 0, 0, .28)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.2), new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, opacity: .9,
    }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.visible = false;
    scene.add(shadow);
    let disposed = false, frame = 0;
    const target = new THREE.Vector2();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let setEyeOpenness = (_openness: number) => {};
    let elapsed = 0, lastPointerMove = -2, idle = 0;
    let nextBlink = 5 + Math.random() * 2;
    const release = (object: THREE.Object3D) => object.traverse(node => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach(material => { Object.values(material).forEach(value => { if (value instanceof THREE.Texture) value.dispose(); }); material.dispose(); });
      }
    });
    // The supplied FBX references two external PNGs that were not provided.
    // Skip those requests and reconstruct the facial artwork locally from the supplied reference.
    const manager = new THREE.LoadingManager();
    const placeholderLoader = new THREE.TextureLoader(manager);
    placeholderLoader.load = () => new THREE.Texture();
    manager.addHandler(/\.png$/i, placeholderLoader);
    new FBXLoader(manager).load('/assets/manool.fbx', model => {
      if (disposed) { release(model); return; }
      // Keep only supplied mesh geometry; imported cameras and lights are not shown.
      const extras: THREE.Object3D[] = [];
      model.traverse(node => { if (node instanceof THREE.Camera || node instanceof THREE.Light) extras.push(node); });
      extras.forEach(node => node.removeFromParent());
      const painted = rebuildMaterials(model);
      release(model);
      pivot.add(painted.group);
      setEyeOpenness = painted.setEyeOpenness;
      shadow.position.y = new THREE.Box3().setFromObject(painted.group).min.y - .12;
      shadow.visible = true;
      renderer.render(scene, camera); ready(); setStatus('');
    }, undefined, () => { if (!disposed) { ready(); setStatus('Не удалось загрузить модель. Попробуйте обновить страницу.'); } });
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1);
      camera.position.z = camera.aspect < 1 ? 6.8 : 6;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reduced.matches || !finePointer.matches) return;
      lastPointerMove = elapsed;
      target.set((event.clientX / window.innerWidth - 0.5) * 0.9, (event.clientY / window.innerHeight - 0.5) * 0.5);
    };
    const reset = () => target.set(0, 0);
    window.addEventListener('pointermove', move); document.documentElement.addEventListener('pointerleave', reset); window.addEventListener('blur', reset);
    let last = 0;
    const render = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, .1) : 0; last = time;
      const animated = !reduced.matches && finePointer.matches;
      if (animated) elapsed += dt;
      const blend = 1 - Math.exp(-8 * dt);
      idle = animated ? THREE.MathUtils.lerp(idle, elapsed - lastPointerMove > .8 ? 1 : 0, blend) : 0;
      pivot.rotation.y = animated ? THREE.MathUtils.lerp(pivot.rotation.y, target.x + Math.sin(elapsed * .65) * .055 * idle, blend) : 0;
      pivot.rotation.x = animated ? THREE.MathUtils.lerp(pivot.rotation.x, target.y, blend) : 0;
      const breath = Math.sin(elapsed * 1.3) * idle;
      pivot.position.y = breath * .065;
      pivot.scale.setScalar(1 + breath * .012);
      shadow.material.opacity = .9 - breath * .09;
      if (animated && elapsed >= nextBlink) {
        const progress = (elapsed - nextBlink) / .3;
        setEyeOpenness(progress < 1 ? 1 - Math.sin(progress * Math.PI) : 1);
        if (progress >= 1) nextBlink = elapsed + 5 + Math.random() * 2;
      } else setEyeOpenness(1);
      renderer.render(scene, camera); frame = requestAnimationFrame(render);
    };
    const visibility = () => {
      cancelAnimationFrame(frame); last = 0;
      if (!document.hidden) frame = requestAnimationFrame(render);
    };
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', reset); window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', visibility);
      release(pivot); release(shadow); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div className="model-stage" role="img" aria-label="3D-модель MANOOL, поворачивающаяся за курсором"><div ref={container} className="model-canvas" />{status && <p className="model-status" role="status">{status}</p>}</div>;
}
