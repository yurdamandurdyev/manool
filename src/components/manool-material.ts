import * as THREE from 'three';

/** Reconstructed facial artwork, projected onto the original FBX geometry.
 * This is an editable approximation of the reference, not the missing source texture.
 */
export function createManoolTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f36b32';
  ctx.fillRect(0, 0, 1024, 1024);
  // Coordinates use the normalized model's front view, so seams do not split eyes.
  const eye = (x: number, mirror: number) => {
    ctx.save();
    ctx.translate(x, 555);
    ctx.scale(mirror, 1);
    ctx.beginPath();
    ctx.moveTo(-165, -85);
    ctx.quadraticCurveTo(-20, -65, 150, -30);
    ctx.quadraticCurveTo(155, 50, 75, 100);
    ctx.quadraticCurveTo(-45, 125, -150, 45);
    ctx.closePath();
    ctx.fillStyle = '#e6c51d'; ctx.fill();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-32, -110);
    ctx.bezierCurveTo(-52, -20, -56, 70, 6, 73);
    ctx.bezierCurveTo(68, 77, 82, -25, 77, -100);
    ctx.closePath(); ctx.fillStyle = '#242523'; ctx.fill();
    ctx.restore();
  };
  eye(333, 1); eye(691, -1);
  ctx.fillStyle = '#242523';
  for (const [x, y, rx, ry, rotation] of [
    [407, 332, 49, 27, .65], [514, 304, 35, 26, -.15],
    [615, 340, 62, 25, -.45], [505, 393, 36, 26, 0],
  ]) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function rebuildMaterials(model: THREE.Group) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 2.8 / Math.max(size.x, size.y, size.z);
  const artwork = createManoolTexture();
  const face = new THREE.MeshStandardMaterial({ map: artwork, roughness: .88, flatShading: true });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf36b32, roughness: .88, flatShading: true });
  const result = new THREE.Group();
  model.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const source = node.geometry.clone().applyMatrix4(node.matrixWorld);
    source.translate(-center.x, -center.y, -center.z).scale(scale, scale, scale);
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    const positions = geometry.getAttribute('position');
    const uv = new Float32Array(positions.count * 2);
    geometry.clearGroups();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < positions.count; i += 3) {
      a.fromBufferAttribute(positions, i); b.fromBufferAttribute(positions, i + 1); c.fromBufferAttribute(positions, i + 2);
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      // Only the forward-facing half carries facial markings; the back stays orange.
      geometry.addGroup(i, 3, normal.z > .15 ? 0 : 1);
    }
    for (let i = 0; i < positions.count; i++) {
      uv[i * 2] = positions.getX(i) / 2.8 + .5;
      uv[i * 2 + 1] = positions.getY(i) / 2.8 + .5;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    result.add(new THREE.Mesh(geometry, [face, orange]));
  });
  return result;
}
