// ---------------------------------------------------------------------------
// WATERFALLS — Monumental 212m primary waterfall and secondary cascades.
// Layered geometry: dense core torrent, aerated spray curtain, flanking
// braided trickles, and turbulent plunge pool boiling foam disks.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { makeSimplex, lerp } from './terrain-field.js';

export async function build(ctx) {
  const { L, M } = ctx;
  const group = new THREE.Group();
  group.name = 'waterfalls';

  const noise = makeSimplex(6743);

  // Helper to build a curved, multi-layer waterfall column following rock contours
  function buildWaterfallColumn(lipPos, basePos, lipWidth, baseWidth, layers = 2) {
    const colGroup = new THREE.Group();
    const vSteps = 84;
    const uSteps = 32;
    const totalDrop = lipPos[1] - basePos[1];

    for (let layer = 0; layer < layers; layer++) {
      const zOffset = layer * 2.0; // Layer offset outward from rock
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let iv = 0; iv <= vSteps; iv++) {
        const v = iv / vSteps;
        const y = lerp(lipPos[1], basePos[1], v);

        // Natural waterfall trajectory: parabolic launch over brink, stepped collision on ledges, base plunge
        // Parabolic launch near brink
        const launch = Math.sin(Math.pow(v, 0.45) * Math.PI) * 7.5;
        // Mid-fall natural rock shelf cascade (smooth 1.5m rock contour)
        const ledgeBump = Math.exp(-Math.pow((v - 0.55) / 0.18, 2.0)) * 1.5;
        
        const currentZ = lerp(lipPos[2], basePos[2], v) + launch + ledgeBump + zOffset;
        const currentX = lerp(lipPos[0], basePos[0], v);

        // Width flares out from lip to base with power curve
        const w = lerp(lipWidth, baseWidth, Math.pow(v, 0.65));

        for (let iu = 0; iu <= uSteps; iu++) {
          const u = iu / uSteps;
          const lateral = (u - 0.5) * w;
          
          // Organic edge irregularities, water sheet bunching, and turbulent ripples
          const edgeRavel = Math.sin(u * Math.PI) * (noise(u * 6.0 + layer, v * 16.0) * 3.2);
          const x = currentX + lateral + (layer === 1 ? edgeRavel * 0.7 : 0);
          const z = currentZ + edgeRavel;

          positions.push(x, y, z);
          // UV: U = lateral position [0, 1], V = vertical flow distance
          uvs.push(u, v * (totalDrop / 12.0) + layer * 0.5);
        }
      }

      for (let iv = 0; iv < vSteps; iv++) {
        for (let iu = 0; iu < uSteps; iu++) {
          const a = iv * (uSteps + 1) + iu;
          const b = (iv + 1) * (uSteps + 1) + iu;
          const c = (iv + 1) * (uSteps + 1) + (iu + 1);
          const d = iv * (uSteps + 1) + (iu + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, M.waterfall);
      mesh.castShadow = false;
      colGroup.add(mesh);
    }

    return colGroup;
  }

  // 1. Primary Monumental Waterfall (212m drop, lip width 36m expanding to 68m)
  const wf = L.waterfall;
  const mainFalls = buildWaterfallColumn(
    wf.lip.center,
    wf.base.center,
    wf.lip.width,
    wf.base.width,
    2
  );
  group.add(mainFalls);

  // Flanking braided side trickles on left and right cliff shoulders
  const leftTrickle = buildWaterfallColumn(
    [-76, wf.lip.center[1] - 8, wf.lip.center[2] - 2],
    [-88, wf.base.center[1] + 1, wf.base.center[2] - 5],
    9,
    18,
    1
  );
  group.add(leftTrickle);

  const rightTrickle = buildWaterfallColumn(
    [-24, wf.lip.center[1] - 8, wf.lip.center[2] - 2],
    [-12, wf.base.center[1] + 1, wf.base.center[2] - 5],
    9,
    18,
    1
  );
  group.add(rightTrickle);

  // 2. Plunge Pool Impact Foam Disks (Turbulent boiling foam where cascade strikes water)
  const impactCenter = [wf.base.center[0], L.plungePool.waterY + 0.15, wf.base.center[2]];
  const foamDiskGeo = new THREE.CircleGeometry(46, 48);
  foamDiskGeo.rotateX(-Math.PI / 2);
  foamDiskGeo.translate(impactCenter[0], impactCenter[1], impactCenter[2]);

  const foamMesh = new THREE.Mesh(foamDiskGeo, M.plungeFoam);
  group.add(foamMesh);

  // Outer expanding foam ripple ring
  const outerRippleGeo = new THREE.RingGeometry(42, 74, 48, 4);
  outerRippleGeo.rotateX(-Math.PI / 2);
  outerRippleGeo.translate(impactCenter[0], impactCenter[1] + 0.05, impactCenter[2]);
  const outerRippleMesh = new THREE.Mesh(outerRippleGeo, M.plungeFoam);
  group.add(outerRippleMesh);

  // 4. Secondary Cascades (East & West)
  for (const sw of L.secondaryWaterfalls) {
    const secFalls = buildWaterfallColumn(
      sw.lip,
      sw.base,
      sw.width,
      sw.width * 1.8,
      1
    );
    group.add(secFalls);

    // Secondary cascade base foam patch
    const secFoam = new THREE.CircleGeometry(sw.width * 1.6, 24);
    secFoam.rotateX(-Math.PI / 2);
    secFoam.translate(sw.base[0], sw.base[1] + 0.15, sw.base[2]);
    const secFoamMesh = new THREE.Mesh(secFoam, M.plungeFoam);
    group.add(secFoamMesh);
  }

  return { object: group };
}
