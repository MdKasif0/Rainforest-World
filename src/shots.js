import * as THREE from 'three';
import { OVERRIDES } from './shotkeys/index.js';

// ---------------------------------------------------------------------------
// CINEMATIC RAINFOREST SHOTS:
// 5 shots of 7.0 seconds each highlighting the complete rainforest world:
//   Shot 0: Grand Valley Panorama
//   Shot 1: Primary Waterfall & Plunge Pool
//   Shot 2: Mountain Ridges & Mist Skyline
//   Shot 3: Dense Foreground Jungle & Canopy Framing
//   Shot 4: River & Plunge Pool Outflow
// ---------------------------------------------------------------------------

export const SHOT_DUR = 7.0;

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export const SHOTS = [
  {
    name: 'Grand Valley Panorama — Sweeping over the emerald valley and winding river to the 212m waterfall',
    ease: 'inout',
    keys: [
      { pos: [95, 135, 240], look: [-48, 85, -280], focal: 24, focus: 400, fstop: 8 },
      { pos: [50, 105, 150], look: [-48, 90, -285], focal: 28, focus: 350, fstop: 8 },
    ],
    shadow: { center: [-30, 90, -120], radius: 280 },
    post: { exposure: 1.05, fog: 0.75 },
  },
  {
    name: 'Primary Waterfall & Plunge Pool — Low dramatic view of the 212m cascade crashing through rising mist',
    ease: 'inout',
    keys: [
      { pos: [-50, 31.0, -175], look: [-50, 115, -285], focal: 24, focus: 105, fstop: 5.6 },
      { pos: [-50, 31.5, -200], look: [-50, 125, -290], focal: 22, focus: 85,  fstop: 5.6 },
    ],
    shadow: { center: [-50, 110, -270], radius: 140 },
    post: { exposure: 1.08, fog: 0.8 },
  },
  {
    name: 'Mountain Ridges & Mist Skyline — Sweeping across the knife-edge peaks and towering escarpment',
    ease: 'inout',
    keys: [
      { pos: [30, 310, 80],  look: [-20, 480, -820], focal: 22, focus: 800, fstop: 8.0 },
      { pos: [-30, 325, 40], look: [-40, 490, -840], focal: 24, focus: 800, fstop: 8.0 },
    ],
    shadow: { center: [0, 380, -600], radius: 450 },
    post: { exposure: 1.05, fog: 0.8 },
  },
  {
    name: 'Dense Foreground Jungle & Canopy Framing — Pushing past giant buttress roots and broadleaf fronds to the falls',
    ease: 'reveal',
    keys: [
      { pos: [-48, 22, 12],  look: [-48, 65, -275], focal: 30, focus: 280, fstop: 4.0 },
      { pos: [-42, 21, -18], look: [-48, 70, -280], focal: 28, focus: 260, fstop: 5.6 },
    ],
    shadow: { center: [-50, 40, -120], radius: 180 },
    post: { exposure: 1.05, dof: true, focus: 16, fstop: 4.0 },
  },
  {
    name: 'River & Plunge Pool Outflow — Gliding along the turquoise river towards the plunge pool and waterfall',
    ease: 'inout',
    keys: [
      { pos: [1.0, 24.2, -85],  look: [-16, 25.5, -145], focal: 26, focus: 65, fstop: 5.6 },
      { pos: [-10, 25.2, -115], look: [-35, 27.0, -185], focal: 28, focus: 75, fstop: 5.6 },
    ],
    shadow: { center: [-25, 28, -140], radius: 140 },
    post: { exposure: 1.06, fog: 0.75 },
  },
];

for (const ov of OVERRIDES) {
  if (!ov) continue;
  for (const [k, v] of Object.entries(ov)) {
    if (SHOTS[k]) Object.assign(SHOTS[k], v);
  }
}

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

function easeFor(S, u) {
  const e = S.ease || 'inout';
  if (e === 'linear') return u;
  if (e === 'reveal') {
    const a = u * u * (3 - 2 * u);
    return Math.pow(a, 1.35);
  }
  return ease(u);
}

function lerpKeys(vals, u) {
  const n = vals.length - 1;
  const x = Math.min(Math.max(u, 0), 1) * n;
  const i = Math.min(Math.floor(x), n - 1), f = x - i;
  return vals[i] + (vals[i + 1] - vals[i]) * f;
}

export function evalShot(i, t) {
  const S = SHOTS[i];
  const u = easeFor(S, Math.min(Math.max(t / SHOT_DUR, 0), 1));
  const K = S.keys;
  const P = K.map((k) => V(k.pos));
  const D = K.map((k) => V(k.look).sub(V(k.pos)));
  const LD = D.map((d) => Math.log(Math.max(d.length(), 0.05)));
  D.forEach((d) => d.normalize());

  let pos, dir;
  if (K.length === 2) {
    pos = P[0].clone().lerp(P[1], u);
    dir = D[0].clone().lerp(D[1], u).normalize();
  } else {
    pos = new THREE.CatmullRomCurve3(P, false, 'catmullrom', 0.5).getPoint(u);
    dir = new THREE.CatmullRomCurve3(D, false, 'catmullrom', 0.5).getPoint(u).normalize();
  }

  const ld = Math.exp(lerpKeys(LD, u));
  const look = pos.clone().addScaledVector(dir, ld);
  const focal = lerpKeys(K.map((k) => k.focal ?? S.focal ?? 35), u);
  const fstop = lerpKeys(K.map((k) => k.fstop ?? S.fstop ?? 8), u);
  let focusDist;
  if (K.some((k) => k.focus !== undefined)) {
    focusDist = Math.exp(lerpKeys(K.map((k, j) => Math.log(k.focus ?? Math.exp(LD[j]))), u));
  } else {
    focusDist = ld;
  }

  return {
    index: i,
    pos,
    look,
    focal,
    near: S.near || 0.15,
    far: S.far || 7000,
    focusDist,
    fstop,
    roll: S.roll || 0,
    shadow: S.shadow,
    post: S.post || {},
  };
}

export const FILM_DURATION = SHOTS.length * SHOT_DUR;
