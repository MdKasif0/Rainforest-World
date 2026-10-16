// ---------------------------------------------------------------------------
// MOUNTAINS — Massive background mountain range, ridged peaks, eroded slopes,
// and atmospheric skyline silhouettes. Everything generated procedurally.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { makeSimplex, lerp, smoothstep, clamp } from './terrain-field.js';

export async function build(ctx) {
  const { L, M } = ctx;
  const group = new THREE.Group();
  group.name = 'mountains';

  const noise1 = makeSimplex(1089);
  const noise2 = makeSimplex(5521);
  const noise3 = makeSimplex(8833);

  // Ridged multifractal for razor-sharp mountain crests with domain warping
  function mountainRidges(x, z) {
    const warpX = x + noise2(x * 0.003, z * 0.003) * 75.0;
    const warpZ = z + noise3(x * 0.003 + 4.2, z * 0.003) * 75.0;

    let sum = 0, amp = 1.0, freq = 0.0018;
    for (let i = 0; i < 5; i++) {
      let n = noise1(warpX * freq, warpZ * freq);
      n = 1.0 - Math.abs(n);
      n = Math.pow(n, 1.7); // Knife-edge alpine ridges
      sum += n * amp;
      amp *= 0.52;
      freq *= 2.15;
    }
    return sum;
  }

  // Dendritic erosion gullies and ravines
  function erosionRavines(x, z) {
    const n = noise2(x * 0.004, z * 0.004);
    return Math.sin(n * 6.28) * 28.0;
  }

  // 1. Primary Mountain Massif (Z: -1300 to -285, X: -1000 to 1000)
  const segX = 220, segZ = 190;
  const minX = -1000, maxX = 1000;
  const minZ = -1300, maxZ = -285;
  const w = maxX - minX, d = maxZ - minZ;

  const mountainGeo = new THREE.PlaneGeometry(w, d, segX, segZ);
  mountainGeo.rotateX(-Math.PI / 2);
  mountainGeo.translate(minX + w * 0.5, 0, minZ + d * 0.5);

  const pos = mountainGeo.attributes.position;
  const count = pos.count;

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Distance into the mountain territory northward
    const distNorth = clamp((-285 - z) / 850.0, 0, 1);
    
    // Quick ramp up into mountain elevation
    const ridgeRamp = smoothstep(0.0, 0.12, distNorth);

    // Base plateau height rising smoothly up to 230m
    const basePlateau = ridgeRamp * 215.0;

    // Mountain fold ridges climbing up to 520m
    const ridges = mountainRidges(x, z) * 320.0 * ridgeRamp;

    // Asymmetrical geological peak massifs with domain-warped transversal spurs
    let peakElevation = 0;
    for (const p of L.mountains.peaks) {
      // Warp peak distance along geological spine
      const dx = x - p.pos[0];
      const dz = (z - p.pos[2]) * 1.35; // elongated East-West
      const spur = noise3(x * 0.006, z * 0.006) * 45.0;
      const d = Math.hypot(dx, dz) + spur;
      if (d < p.radius) {
        const t = 1.0 - d / p.radius;
        const profile = p.shape === 'sharp' ? Math.pow(t, 1.4) : p.shape === 'plateau' ? Math.sqrt(t) : Math.pow(t, 1.8);
        peakElevation = Math.max(peakElevation, profile * (p.pos[1] - 220));
      }
    }

    // Erosion grooves
    const ravines = erosionRavines(x, z) * ridgeRamp;

    // Horizontal geological basalt trap steps
    const rawY = basePlateau + ridges + peakElevation;
    const trapSteps = (Math.floor(rawY * 0.04) / 0.04 - rawY) * 0.35 * ridgeRamp;

    // High frequency rock face irregularities
    const rockDetail = noise3(x * 0.02, z * 0.02) * 11.0 * ridgeRamp;

    // Waterfall gorge cutout: carve the amphitheater cleft around [-50, -290]
    const gorgeDist = Math.hypot(x - L.waterfall.center[0], z - L.waterfall.center[2]);
    let gorgeMask = 1.0;
    if (gorgeDist < L.waterfall.amphitheaterRadius && z > -325) {
      gorgeMask = smoothstep(22.0, L.waterfall.amphitheaterRadius, gorgeDist);
    }

    let y = (rawY + trapSteps + ravines + rockDetail) * gorgeMask;

    // Seamless blend to valley terrain elevation at front edge (z = -285)
    const seamBlend = smoothstep(-285, -325, z);
    const valleyH = ctx.modules.terrain ? ctx.modules.terrain.heightAt(x, z) : L.valley.floorMaxY;
    y = lerp(valleyH, y, seamBlend);

    pos.setY(i, y);
  }

  mountainGeo.computeVertexNormals();
  mountainGeo.computeBoundingSphere();
  mountainGeo.computeBoundingBox();

  const mountainMesh = new THREE.Mesh(mountainGeo, M.cliffSedimentary);
  mountainMesh.castShadow = true;
  mountainMesh.receiveShadow = true;
  group.add(mountainMesh);

  // 2. Distant Skyline Silhouettes (Deep northern peaks for atmospheric scale)
  const distantGeo = new THREE.PlaneGeometry(2800, 750, 120, 50);
  distantGeo.rotateX(-Math.PI / 2);
  distantGeo.translate(0, 0, -1550);

  const dPos = distantGeo.attributes.position;
  for (let i = 0; i < dPos.count; i++) {
    const x = dPos.getX(i);
    const z = dPos.getZ(i);
    const n = noise1(x * 0.0011, z * 0.0011);
    const crest = Math.pow(1.0 - Math.abs(n), 1.9) * 440.0;
    const broad = noise2(x * 0.0005, 0) * 190.0;
    dPos.setY(i, 220.0 + crest + broad);
  }
  distantGeo.computeVertexNormals();

  const distantMesh = new THREE.Mesh(distantGeo, M.graniteDry);
  distantMesh.castShadow = false;
  distantMesh.receiveShadow = true;
  group.add(distantMesh);

  return { object: group };
}
