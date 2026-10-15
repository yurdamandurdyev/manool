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
    let disposed = false, frame = 0;
    const target = new THREE.Vector2();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
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
      pivot.add(painted); renderer.render(scene, camera); ready(); setStatus('');
    }, undefined, () => { if (!disposed) { ready(); setStatus('Не удалось загрузить модель. Попробуйте обновить страницу.'); } });
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1);
      camera.position.z = camera.aspect < 1 ? 6.8 : 6;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reduced.matches) return;
      target.set((event.clientX / window.innerWidth - 0.5) * 0.9, (event.clientY / window.innerHeight - 0.5) * 0.5);
    };
    const reset = () => target.set(0, 0);
    window.addEventListener('pointermove', move); document.documentElement.addEventListener('pointerleave', reset); window.addEventListener('blur', reset);
    let last = 0;
    const render = (time: number) => {
      const blend = 1 - Math.exp(-8 * Math.min((time - last) / 1000, 0.1)); last = time;
      pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, reduced.matches ? 0 : target.x, blend);
      pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, reduced.matches ? 0 : target.y, blend);
      renderer.render(scene, camera); frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', reset); window.removeEventListener('blur', reset);
      release(pivot); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div className="model-stage" role="img" aria-label="3D-модель MANOOL, поворачивающаяся за курсором"><div ref={container} className="model-canvas" />{status && <p className="model-status" role="status">{status}</p>}</div>;
}
