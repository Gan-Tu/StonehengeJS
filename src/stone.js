import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';


// Shared by the detailed render surface and its simpler convex collision hull.
export function deformStonePoint(x, y, z, size, seed) {
  const [w, h, d] = size;
  const a = Math.sin(x * 3.2 + y * 2.3 + z * 1.7 + seed * 8.1);
  const b = Math.sin(x * 8.7 - y * 3.7 + z * 6.8 + seed * 4.3);
  const side = Math.sin((y / h + .5) * Math.PI);
  x += (a * .09 + b * .031) * Math.min(w, 2) * side;
  z += (a * .073 - b * .037) * Math.min(d, 1.5) * side;
  x *= 1 + .065 * Math.sin(seed * 1.3 + y / h * 3.5);
  z *= 1 + .06 * Math.sin(seed * 2.1 + y / h * 4.1);
  return [x, y, z];
}

export function stoneGeometry(size, seed = 0) {
  const [w, h, d] = size;
  const bevel = Math.min(w, h, d) * .105;
  const geometry = new RoundedBoxGeometry(w, h, d, 4, bevel);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    let x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const a = Math.sin(x * 3.2 + y * 2.3 + z * 1.7 + seed * 8.1);
    const b = Math.sin(x * 8.7 - y * 3.7 + z * 6.8 + seed * 4.3);
    // Continuous deformation keeps shared face edges watertight. Flat support
    // planes remain at +/- h/2, so lintels actually sit on their uprights.
    [x, y, z] = deformStonePoint(x, y, z, size, seed);
    position.setXYZ(i, x, y, z);
    const shade = .88 + a * .045 + b * .025;
    c.setRGB(shade, shade * .99, shade * .955);
    const moss = Math.max(0, 1 - (y / h + .5) * 4) * (.15 + a * .06);
    c.lerp(new THREE.Color('#555b39'), moss);
    colors.push(c.r, c.g, c.b);
    const nx = Math.abs(geometry.attributes.normal.getX(i));
    const ny = Math.abs(geometry.attributes.normal.getY(i));
    const nz = Math.abs(geometry.attributes.normal.getZ(i));
    const offset = seed * .317;
    if (ny > nx && ny > nz) uv.setXY(i, x / 2.4 + offset, z / 2.4 + offset);
    else if (nx > nz) uv.setXY(i, z / 2.4 + offset, y / 2.4 + offset);
    else uv.setXY(i, x / 2.4 + offset, y / 2.4 + offset);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}
