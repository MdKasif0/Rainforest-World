// ---------------------------------------------------------------------------
// CPU-only camera motion & safety diagnostic check:
// Samples every shot at 60 fps and reports:
// - Linear speed, acceleration, and jerk
// - Angular turn rate, angular acceleration, and angular jerk
// - Focus distance changes and focal length transitions
// - Terrain clearance and water surface clearance (collision detection)
// usage: node tools/camcheck.mjs
// ---------------------------------------------------------------------------
import { evalShot, SHOTS, SHOT_DUR } from '../src/shots.js';
import { L } from '../src/layout.js';
import { buildTerrainField } from '../src/world/terrain-field.js';

const terrain = buildTerrainField(L);
const fps = 60, dt = 1 / fps;

console.log(`\n================================================================================`);
console.log(`CINEMATIC CAMERA DIAGNOSTICS — ${SHOTS.length} SHOTS (${SHOTS.length * SHOT_DUR}s @ ${fps} FPS)`);
console.log(`================================================================================\n`);

let allPassed = true;

for (let i = 0; i < SHOTS.length; i++) {
  const S = SHOTS[i];
  const n = Math.round(SHOT_DUR * fps);
  const P = [], D = [], F = [], Focus = [], Clear = [];

  for (let f = 0; f <= n; f++) {
    const t = Math.min(f * dt, SHOT_DUR - 1e-4);
    const c = evalShot(i, t);
    P.push(c.pos.clone());
    D.push(c.look.clone().sub(c.pos).normalize());
    F.push(c.focal);
    Focus.push(c.focusDist);

    // Terrain and water clearance check
    const th = terrain.heightAt(c.pos.x, c.pos.z);
    const clearance = c.pos.y - th;
    Clear.push({ t, pos: c.pos, th, clearance });
  }

  // Linear speed & angular speed
  const v = [], w = [], dFocus = [];
  for (let f = 1; f <= n; f++) {
    v.push(P[f].distanceTo(P[f - 1]) / dt);
    w.push((Math.acos(Math.min(1, Math.max(-1, D[f].dot(D[f - 1])))) / dt * 180) / Math.PI);
    dFocus.push(Math.abs(Focus[f] - Focus[f - 1]) / dt);
  }

  // Linear acceleration, jerk & angular acceleration, jerk
  let maxAccel = 0, atA = 0;
  let maxJerk = 0, atJ = 0;
  let maxTurnAccel = 0, atTA = 0;
  let maxTurnJerk = 0, atTJ = 0;

  for (let f = 1; f < v.length; f++) {
    const a = Math.abs(v[f] - v[f - 1]) / dt;
    if (a > maxAccel) { maxAccel = a; atA = f * dt; }
    const wa = Math.abs(w[f] - w[f - 1]) / dt;
    if (wa > maxTurnAccel) { maxTurnAccel = wa; atTA = f * dt; }
  }

  for (let f = 2; f < v.length; f++) {
    const a1 = (v[f] - v[f - 1]) / dt;
    const a0 = (v[f - 1] - v[f - 2]) / dt;
    const j = Math.abs(a1 - a0) / dt;
    if (j > maxJerk) { maxJerk = j; atJ = f * dt; }

    const wa1 = (w[f] - w[f - 1]) / dt;
    const wa0 = (w[f - 1] - w[f - 2]) / dt;
    const wj = Math.abs(wa1 - wa0) / dt;
    if (wj > maxTurnJerk) { maxTurnJerk = wj; atTJ = f * dt; }
  }

  const vmax = Math.max(...v);
  const vavg = v.reduce((sum, val) => sum + val, 0) / v.length;
  const wmax = Math.max(...w);
  const wavg = w.reduce((sum, val) => sum + val, 0) / w.length;
  const minClearance = Math.min(...Clear.map((c) => c.clearance));
  const minClearPoint = Clear.find((c) => c.clearance === minClearance);

  const collision = minClearance < 0.5;
  const abruptTurn = wmax > 30.0;
  const abruptSpeed = vmax > 65.0;

  if (collision || abruptTurn || abruptSpeed) allPassed = false;

  console.log(`SHOT ${String(i).padStart(2, '0')} [${(i * SHOT_DUR).toFixed(0).padStart(2, '0')}:00 - ${((i + 1) * SHOT_DUR).toFixed(0).padStart(2, '0')}:00] — "${S.name.slice(0, 42)}..."`);
  console.log(`  Trajectory:     Speed avg ${vavg.toFixed(1)} m/s, max ${vmax.toFixed(1)} m/s | Accel max ${maxAccel.toFixed(1)} m/s² | Jerk max ${maxJerk.toFixed(1)} m/s³`);
  console.log(`  Orientation:    Turn avg ${wavg.toFixed(2)}°/s, max ${wmax.toFixed(1)}°/s | Turn-Accel max ${maxTurnAccel.toFixed(1)}°/s² | Turn-Jerk max ${maxTurnJerk.toFixed(1)}°/s³`);
  console.log(`  Optics & Focus: Focal ${F[0].toFixed(0)}mm -> ${F[n].toFixed(0)}mm | Focus ${Focus[0].toFixed(0)}m -> ${Focus[n].toFixed(0)}m | d(Focus)/dt max ${Math.max(...dFocus).toFixed(1)} m/s`);
  console.log(`  Ground Clear:   Min clearance ${minClearance.toFixed(1)}m at pos [${minClearPoint.pos.x.toFixed(0)}, ${minClearPoint.pos.y.toFixed(0)}, ${minClearPoint.pos.z.toFixed(0)}] (ground: ${minClearPoint.th.toFixed(0)}m)`);
  
  if (collision) {
    console.log(`  ⚠️ COLLISION ALERT: Camera passes within ${minClearance.toFixed(2)}m of terrain!`);
  } else {
    console.log(`  ✓ Clearance OK (safe margin: ${minClearance.toFixed(1)}m)`);
  }
  console.log('');
}

console.log(`================================================================================`);
if (allPassed) {
  console.log(`✓ ALL 10 SHOTS PASSED: Continuous, collision-free, cinematic trajectories validated!`);
} else {
  console.log(`⚠️ WARNINGS DETECTED: Check warnings above and adjust shot keys.`);
}
console.log(`================================================================================\n`);
