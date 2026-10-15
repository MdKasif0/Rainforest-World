// ---------------------------------------------------------------------------
// ROCKS & FALLEN LOGS — Giant moss-covered river boulders, spray-zone rocks,
// riverbed shoals, and decomposing fallen rainforest logs. Instanced & batched.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { makeSimplex } from './terrain-field.js';

export async function build(ctx) {
  const { L, M, geom, rng } = ctx;
  const group = new THREE.Group();
  group.name = 'rocks';

  const R = rng('rainforest-rocks');
  const noise = makeSimplex(7193);

  // Helper to generate a natural, organic boulder geometry from an icosahedron
  function createBoulderGeometry(radius, detail = 2) {
    const geo = new THREE.IcosahedronGeometry(radius, detail);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      const n = noise(v.x * 0.8, v.y * 0.8 + v.z * 0.8);
      // Flatten base slightly, add irregular asymmetrical bumps
      const scale = 1.0 + n * 0.28;
      v.multiplyScalar(scale);
      if (v.y < 0) v.y *= 0.75; // Sits stable on ground
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // 1. Plunge Pool & Spray Zone Drenched Boulders (Wet rock material)
  const wetBoulderGeo = createBoulderGeometry(4.5, 2);
  const wetMatrices = [];
  const poolCenter = L.plungePool.center;

  for (let i = 0; i < 45; i++) {
    const angle = R.range(0, Math.PI * 2);
    const dist = R.range(35, 85);
    const x = poolCenter[0] + Math.cos(angle) * dist;
    const z = poolCenter[2] + Math.sin(angle) * dist;
    const y = ctx.modules.terrain ? ctx.modules.terrain.heightAt(x, z) : poolCenter[1];

    const s = R.range(0.8, 2.4);
    const rot = [R.range(-0.2, 0.2), R.range(0, Math.PI * 2), R.range(-0.2, 0.2)];
    wetMatrices.push(geom.mat4([x, y + s * 1.5, z], rot, s));
  }

  const wetBouldersMesh = geom.instanced(wetBoulderGeo, M.rockWet, wetMatrices, { castShadow: true, receiveShadow: true });
  group.add(wetBouldersMesh);

  // 2. River Corridor & Valley Mossy Boulders (Rich mossy rock material)
  const mossyBoulderGeo = createBoulderGeometry(3.5, 2);
  const mossyMatrices = [];
  const waypoints = L.river.waypoints;

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const width = THREE.MathUtils.lerp(L.river.widthStart, L.river.widthEnd, i / (waypoints.length - 1)) * 0.5;

    // Cluster boulders along both riverbanks and in shallow riffles
    for (let k = 0; k < 12; k++) {
      const side = R.chance(0.5) ? 1 : -1;
      const lateral = (width + R.range(2, 35)) * side;
      const x = wp[0] + lateral + R.range(-15, 15);
      const z = wp[2] + R.range(-15, 15);
      const y = ctx.modules.terrain ? ctx.modules.terrain.heightAt(x, z) : wp[1];

      const s = R.range(0.6, 2.2);
      const rot = [R.range(-0.3, 0.3), R.range(0, Math.PI * 2), R.range(-0.3, 0.3)];
      mossyMatrices.push(geom.mat4([x, y + s * 1.2, z], rot, s));
    }
  }

  const mossyBouldersMesh = geom.instanced(mossyBoulderGeo, M.rockMossy, mossyMatrices, { castShadow: true, receiveShadow: true });
  group.add(mossyBouldersMesh);

  // 3. Fallen Rainforest Logs & Decomposing Nurse Trunks
  const logGeo = new THREE.CylinderGeometry(0.7, 0.95, 22, 10, 4);
  logGeo.rotateZ(Math.PI / 2);
  const logPos = logGeo.attributes.position;
  for (let i = 0; i < logPos.count; i++) {
    const x = logPos.getX(i);
    const y = logPos.getY(i);
    const z = logPos.getZ(i);
    // Slight curvature in fallen trunk
    const bend = Math.sin((x / 22) * Math.PI) * 0.6;
    logPos.setXYZ(i, x, y + bend, z);
  }
  logGeo.computeVertexNormals();

  const logMatrices = [];
  for (let i = 0; i < 28; i++) {
    const z = R.range(-180, 240);
    const x = R.range(-160, 160);
    const y = ctx.modules.terrain ? ctx.modules.terrain.heightAt(x, z) : 15;
    const s = R.range(0.8, 1.6);
    const rot = [R.range(-0.1, 0.1), R.range(0, Math.PI * 2), R.range(-0.08, 0.08)];
    logMatrices.push(geom.mat4([x, y + s * 0.6, z], rot, s));
  }

  const logsMesh = geom.instanced(logGeo, M.rainforestBark, logMatrices, { castShadow: true, receiveShadow: true });
  group.add(logsMesh);

  return { object: group };
}
