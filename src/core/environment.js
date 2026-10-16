// ---------------------------------------------------------------------------
// ENVIRONMENT — Centralized deterministic environmental simulation system.
// Coordinates multi-scale wind vectors, river/waterfall currents, moisture masks,
// and living fauna/particle trajectories as pure functions of timestamp T.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { G, sunDir, ENV } from './env.js';

// Base constants
const RIVER_WAYPOINTS = [
  [-50, 24.5, -265],
  [-44, 23.5, -200],
  [-30, 22.0, -140],
  [-12, 20.5, -80],
  [8,   19.0, -20],
  [28,  17.5, 40],
  [45,  16.0, 100],
  [58,  14.5, 160],
  [68,  13.0, 220],
  [74,  11.5, 280],
];

export const ENV_SYSTEM = {
  // Master evaluation: updates all global uniforms and environment parameters for timestamp T
  update(T) {
    // 1. Time propagation
    G.uTime.value = T + 37.0;

    // 2. Multi-scale wind dynamics
    // Base wind direction: South-West breeze blowing North-East
    const baseAngle = 0.72; // ~41 degrees
    // Gentle directional wander (+/- 6 degrees over 40 second period)
    const steerAngle = baseAngle + Math.sin(T * 0.15) * 0.10;
    G.uWindDir.value.set(Math.cos(steerAngle), Math.sin(steerAngle)).normalize();

    // Gust envelope: calm tropical breeze punctuated by rolling gusts
    const slowEnvelope = 0.85 + 0.30 * Math.sin(T * 0.22) * Math.cos(T * 0.11);
    const gustPulse = 0.15 * Math.sin(T * 0.58 + 1.2);
    G.uWindStrength.value = Math.max(0.4, slowEnvelope + gustPulse);
  },

  // Environmental moisture metric at world coordinates (x, y, z)
  // High in plunge pool spray radius, along river corridor, and in shaded ravines
  moistureAt(x, y, z) {
    // Distance from monumental waterfall plunge pool
    const dPlunge = Math.hypot(x - (-50), z - (-265));
    const plungeSpray = Math.max(0, 1.0 - dPlunge / 85.0);

    // Distance from river spline
    let minRiverDist = 999;
    for (let i = 0; i < RIVER_WAYPOINTS.length - 1; i++) {
      const p1 = RIVER_WAYPOINTS[i], p2 = RIVER_WAYPOINTS[i + 1];
      const d = distToSegment(x, z, p1[0], p1[2], p2[0], p2[2]);
      if (d < minRiverDist) minRiverDist = d;
    }
    const riverMoist = Math.max(0, 1.0 - minRiverDist / 38.0) * Math.max(0, 1.0 - (y - 12) / 30.0);

    return Math.min(1.0, plungeSpray * 0.95 + riverMoist * 0.75);
  },

  // Closed-form deterministic bird flight evaluation
  evalBird(index, T) {
    const seed = index * 137.41;
    // Each bird has a distinct flight corridor across the monumental valley
    const speed = 14.0 + (index % 3) * 2.5;
    const loopDuration = 32.0 + (index % 4) * 8.0;
    const progress = ((((T + seed) % loopDuration) + loopDuration) % loopDuration) / loopDuration;
    const u = progress * Math.PI * 2;

    let x, y, z;
    if (index % 3 === 0) {
      // High valley glider traversing from South to North gorge
      x = -30.0 + Math.sin(u) * 95.0 + Math.sin(u * 2.0) * 25.0;
      z = Math.cos(u) * 260.0;
      y = 140.0 + Math.sin(u * 1.5) * 28.0;
    } else if (index % 3 === 1) {
      // River gorge cruiser banking through the canyon
      x = -40.0 + Math.sin(u + 1.2) * 65.0;
      z = -120.0 + Math.cos(u) * 180.0;
      y = 65.0 + Math.sin(u * 2.0) * 18.0;
    } else {
      // Mountain ridge thermal soaring circle
      x = 40.0 + Math.cos(u) * 80.0;
      z = -220.0 + Math.sin(u) * 70.0;
      y = 210.0 + Math.sin(u * 0.8) * 35.0;
    }

    // Velocity vector for heading & banking
    const dt = 0.05;
    const uNext = ((((T + dt + seed) % loopDuration) + loopDuration) % loopDuration) / loopDuration * Math.PI * 2;
    let nx, ny, nz;
    if (index % 3 === 0) {
      nx = -30.0 + Math.sin(uNext) * 95.0 + Math.sin(uNext * 2.0) * 25.0;
      nz = Math.cos(uNext) * 260.0;
      ny = 140.0 + Math.sin(uNext * 1.5) * 28.0;
    } else if (index % 3 === 1) {
      nx = -40.0 + Math.sin(uNext + 1.2) * 65.0;
      nz = -120.0 + Math.cos(uNext) * 180.0;
      ny = 65.0 + Math.sin(uNext * 2.0) * 18.0;
    } else {
      nx = 40.0 + Math.cos(uNext) * 80.0;
      nz = -220.0 + Math.sin(uNext) * 70.0;
      ny = 210.0 + Math.sin(uNext * 0.8) * 35.0;
    }

    const vx = nx - x, vy = ny - y, vz = nz - z;
    const yaw = Math.atan2(vx, vz);
    const pitch = -Math.atan2(vy, Math.hypot(vx, vz));
    // Roll / banking proportional to turning rate (yaw change)
    const roll = Math.sin(u * 2.0) * 0.35;

    // Wing flap oscillation (cycles between gliding and active flap)
    const flapCycle = Math.sin(T * 1.8 + seed);
    const isFlapping = flapCycle > 0.2;
    const flap = isFlapping ? Math.sin(T * 14.0 + seed * 2.0) * 0.45 : 0.0;

    return { pos: [x, y, z], rot: [pitch, yaw, roll], flap };
  },

  // Closed-form deterministic butterfly / insect hovering evaluation
  evalInsect(index, T, anchorPos) {
    const seed = index * 43.17;
    // Lissajous hovering trajectory around flower/clearing anchor
    const hoverX = Math.sin(T * 2.4 + seed) * 1.4 + Math.sin(T * 4.8 + seed * 1.3) * 0.4;
    const hoverY = Math.cos(T * 1.8 + seed * 0.8) * 0.6 + Math.sin(T * 6.2) * 0.2;
    const hoverZ = Math.cos(T * 2.1 + seed * 1.1) * 1.2 + Math.cos(T * 5.1) * 0.3;

    // Rapid darting translation between flowers
    const dartPeriod = 7.0;
    const dartPhase = (T + seed * 0.5) % dartPeriod;
    const dartX = (Math.sin(Math.floor((T + seed * 0.5) / dartPeriod) * 12.3) * 3.5);
    const dartZ = (Math.cos(Math.floor((T + seed * 0.5) / dartPeriod) * 8.7) * 3.5);

    const x = anchorPos[0] + hoverX + dartX;
    const y = anchorPos[1] + hoverY;
    const z = anchorPos[2] + hoverZ + dartZ;

    // Ultra-fast wing flutter (22 Hz)
    const flutter = Math.sin(T * 22.0 * Math.PI * 2.0 + seed);
    const yaw = Math.atan2(hoverX, hoverZ) + flutter * 0.15;

    return { pos: [x, y, z], rot: [0.1, yaw, flutter * 0.4], flutter };
  },

  // Closed-form deterministic floating leaf debris on river surface
  evalRiverDebris(index, T, totalLeaves = 45) {
    const seed = index * 19.33;
    const riverLen = RIVER_WAYPOINTS.length;
    // Downstream drift speed
    const driftSpeed = 0.022; // Progress through spline per second
    let rawProgress = (index / totalLeaves + T * driftSpeed + seed * 0.01) % 1.0;
    if (rawProgress < 0) rawProgress += 1.0;
    const splineT = Math.min(Math.max(rawProgress, 0), 0.99999) * (riverLen - 1);
    const i = Math.min(Math.max(Math.floor(splineT), 0), riverLen - 2);
    const frac = splineT - i;
    const nextI = i + 1;

    const p1 = RIVER_WAYPOINTS[i] || RIVER_WAYPOINTS[0];
    const p2 = RIVER_WAYPOINTS[nextI] || RIVER_WAYPOINTS[riverLen - 1];

    // Centerline position
    const cx = p1[0] + (p2[0] - p1[0]) * frac;
    const cy = p1[1] + (p2[1] - p1[1]) * frac;
    const cz = p1[2] + (p2[2] - p1[2]) * frac;

    // Lateral eddy meander across channel width
    const lateralAmp = 6.0 + (index % 5) * 2.0;
    const eddyOffset = Math.sin(T * 1.2 + seed + rawProgress * 18.0) * lateralAmp;
    
    // Normal vector perpendicular to river direction
    const dx = p2[0] - p1[0], dz = p2[2] - p1[2];
    const len = Math.hypot(dx, dz) || 1.0;
    const nx = -dz / len, nz = dx / len;

    const x = cx + nx * eddyOffset;
    const z = cz + nz * eddyOffset;
    // Water height with gentle ripple bobbing
    const y = cy + 0.04 + Math.sin(T * 3.2 + seed) * 0.03;

    // Yaw rotation aligns with current + gentle spinning in eddies
    const yaw = Math.atan2(dx, dz) + Math.sin(T * 0.8 + seed) * 0.8;
    const pitch = Math.sin(T * 2.8 + seed) * 0.08;
    const roll = Math.cos(T * 2.4 + seed) * 0.08;

    return { pos: [x, y, z], rot: [pitch, yaw, roll] };
  },

  // Closed-form deterministic plunge pool ballistic spray droplet
  evalPlungeSpray(index, T, totalDroplets = 60) {
    const seed = index * 31.77;
    const cycle = 1.6 + (index % 4) * 0.35;
    const tCycle = ((((T + seed) % cycle) + cycle) % cycle);
    const tau = tCycle / cycle; // [0, 1]

    const poolCenter = [-50, 24.8, -265];
    const angle = (index / totalDroplets) * Math.PI * 2 + Math.sin(seed) * 0.4;
    const initSpeedH = 12.0 + (index % 5) * 3.5;
    const initSpeedV = 16.0 + (index % 6) * 4.0;

    const dist = 8.0 + initSpeedH * tau;
    const x = poolCenter[0] + Math.cos(angle) * dist;
    const z = poolCenter[2] + Math.sin(angle) * dist;
    // Parabolic vertical ballistic trajectory under gravity
    const y = poolCenter[1] + (initSpeedV * tau - 0.5 * 28.0 * tau * tau);

    // Fade scale as droplet falls and disperses
    const scale = Math.sin(tau * Math.PI) * (0.35 + (index % 3) * 0.2);

    return { pos: [x, Math.max(poolCenter[1], y), z], scale: Math.max(0, scale) };
  },
};

function distToSegment(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return Math.hypot(px - x1, pz - z1);
  let t = ((px - x1) * dx + (pz - z1) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}
