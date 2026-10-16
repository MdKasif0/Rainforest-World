// ---------------------------------------------------------------------------
// CLIFFS — Monumental vertical amphitheater cirque framing the 212m waterfall.
// Strategically positioned behind the cascade (North: -Z) with horizontal
// geological strata, vertical joint fissures, wet splash rock, and eroded ridge walls.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { makeSimplex, lerp } from './terrain-field.js';

export async function build(ctx) {
  const { L, M } = ctx;
  const group = new THREE.Group();
  group.name = 'cliffs';

  const noise = makeSimplex(4119);
  const detailNoise = makeSimplex(7821);

  // 1. Primary Waterfall Cirque Amphitheater
  const amphCenter = L.cliffs.amphCenter; // [-50, 0, -222]
  const rad = L.cliffs.radius;            // 88.0m
  const yBase = L.plungePool.waterY - 2.0; // 26m
  const yTop = L.waterfall.lip.center[1] + 35.0; // 275m

  const uSegs = 120;
  const vSegs = 70;
  const positions = [];
  const uvs = [];
  const indices = [];

  // Curve wrapping from East around North to West
  const aStart = Math.PI * 0.80;
  const aEnd = Math.PI * 2.20;

  for (let iv = 0; iv <= vSegs; iv++) {
    const v = iv / vSegs;
    const y = lerp(yBase, yTop, v);

    // Geological horizontal rock strata shelves (stepped basalt traps)
    const stepStrata = Math.floor(v * 16.0) / 16.0;
    const strataLedge = Math.sin(stepStrata * Math.PI * 8.0) * 4.5 + Math.sin(v * 24.0) * 2.2;
    const overhang = Math.pow(v, 1.6) * 6.5;

    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const angle = lerp(aStart, aEnd, u);

      // Vertical columnar basalt fissures & buttresses
      const columnNoise = noise(Math.cos(angle) * 9.5, y * 0.04) * 5.5;
      const broadShape = noise(Math.cos(angle) * 2.5, Math.sin(angle) * 2.5) * 14.0;
      const micro = detailNoise(Math.cos(angle) * 22.0, y * 0.14) * 2.2;

      // River gorge notch at the top center behind the waterfall lip
      const notchDist = Math.abs(angle - Math.PI * 1.5);
      const notch = (v > 0.80 && notchDist < 0.28) ? (1.0 - notchDist / 0.28) * -22.0 : 0.0;

      // Stepped rock shelves jutting out into waterfall path
      const shelf = (v > 0.25 && v < 0.65 && notchDist < 0.35) ? Math.sin(v * 18.0) * 4.0 : 0.0;

      const r = rad + strataLedge + overhang + columnNoise + broadShape + micro + notch + shelf;
      const x = amphCenter[0] + Math.cos(angle) * r;
      const z = amphCenter[2] + Math.sin(angle) * r;

      positions.push(x, y, z);
      uvs.push(u * 8.0, v * 14.0);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * (uSegs + 1) + iu;
      const b = (iv + 1) * (uSegs + 1) + iu;
      const c = (iv + 1) * (uSegs + 1) + (iu + 1);
      const d = iv * (uSegs + 1) + (iu + 1);
      indices.push(a, c, b);
      indices.push(a, d, c);
    }
  }

  const cliffGeo = new THREE.BufferGeometry();
  cliffGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  cliffGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  cliffGeo.setIndex(indices);
  cliffGeo.computeVertexNormals();

  const cliffMesh = new THREE.Mesh(cliffGeo, M.cliffDark);
  cliffMesh.castShadow = true;
  cliffMesh.receiveShadow = true;
  group.add(cliffMesh);

  // 2. Wet Splash Rock Wall (Deep glistening basalt directly behind the plunging cascade)
  const wetGeo = new THREE.PlaneGeometry(88, 230, 32, 48);
  wetGeo.translate(L.waterfall.center[0], yBase + 112, L.waterfall.lip.center[2] - 4.5);
  const wpos = wetGeo.attributes.position;
  for (let i = 0; i < wpos.count; i++) {
    const px = wpos.getX(i);
    const py = wpos.getY(i);
    const n = detailNoise(px * 0.08, py * 0.08) * 4.2;
    wpos.setZ(i, wpos.getZ(i) + n);
  }
  wetGeo.computeVertexNormals();
  const wetMesh = new THREE.Mesh(wetGeo, M.cliffSplash);
  wetMesh.receiveShadow = true;
  group.add(wetMesh);

  return { object: group };
}
