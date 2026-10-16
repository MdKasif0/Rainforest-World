import * as THREE from 'three';
import { OVERRIDES } from './shotkeys/index.js';

// ---------------------------------------------------------------------------
// CINEMATIC RAINFOREST FILM:
// Exactly 10 continuous shots of 7.0 seconds each (70.0 seconds total, 4200 frames @ 60 FPS).
// Professional natural-history documentary cinematography:
//   Shot 0: The Grand Reveal (00:00 - 00:07)
//   Shot 1: Above the Canopy (00:07 - 00:14)
//   Shot 2: Through the Forest (00:14 - 00:21)
//   Shot 3: The River Journey (00:21 - 00:28)
//   Shot 4: The Waterfall Approach (00:28 - 00:35)
//   Shot 5: The Plunge Pool (00:35 - 00:42)
//   Shot 6: The Cliffside Ascent (00:42 - 00:49)
//   Shot 7: The Mountain Panorama (00:49 - 00:56)
//   Shot 8: Sunlight Through the Canopy (00:56 - 01:03)
//   Shot 9: The Final Master Shot (01:03 - 01:10)
// ---------------------------------------------------------------------------

export const SHOT_DUR = 7.0;

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export const SHOTS = [
  // Shot 0: The Grand Reveal
  {
    name: 'The Grand Reveal — Elevated wide vista advancing through humid atmosphere toward the 212m waterfall',
    ease: 'inout',
    keys: [
      { pos: [85, 130, 250], look: [-48, 85, -280], focal: 26, focus: 400, fstop: 8.0 },
      { pos: [55, 115, 185], look: [-48, 88, -285], focal: 28, focus: 360, fstop: 8.0 },
    ],
    shadow: { center: [-30, 90, -120], radius: 280 },
    post: { exposure: 1.05, fog: 0.78, bloom: 0.05, contrast: 1.05, saturation: 1.04 },
  },

  // Shot 1: Above the Canopy
  {
    name: 'Above the Canopy — Smooth aerial lateral glide over undulating tree crowns revealing river glimpses below',
    ease: 'inout',
    keys: [
      { pos: [95, 78, 65],  look: [-25, 48, -150], focal: 28, focus: 190, fstop: 6.3 },
      { pos: [20, 72, -15], look: [-40, 52, -210], focal: 30, focus: 170, fstop: 6.3 },
    ],
    shadow: { center: [25, 55, -90], radius: 220 },
    post: { exposure: 1.05, fog: 0.78, bloom: 0.06, contrast: 1.06, saturation: 1.04 },
  },

  // Shot 2: Through the Forest
  {
    name: 'Through the Forest — Intimate understory dolly past buttress roots and monstera fronds with distant waterfall framing',
    ease: 'reveal',
    keys: [
      { pos: [-48, 22.0, 12],  look: [-48, 48, -275], focal: 30, focus: 14, fstop: 3.5 },
      { pos: [-42, 21.2, -18], look: [-48, 52, -280], focal: 28, focus: 18, fstop: 4.5 },
    ],
    shadow: { center: [-45, 28, -5], radius: 55 },
    post: { exposure: 1.05, dof: true, focus: 15, fstop: 3.5, bloom: 0.06, aoStrength: 0.85, contrast: 1.06 },
  },

  // Shot 3: The River Journey
  {
    name: 'The River Journey — Gliding downstream over the turquoise river past boulders, ripples, and lush riverbanks',
    ease: 'inout',
    keys: [
      { pos: [16, 24.2, -45],   look: [-12, 25.8, -125], focal: 26, focus: 75, fstop: 5.6 },
      { pos: [-14, 25.4, -115], look: [-36, 27.2, -195], focal: 28, focus: 85, fstop: 5.6 },
    ],
    shadow: { center: [-5, 26, -120], radius: 120 },
    post: { exposure: 1.06, fog: 0.76, bloom: 0.07, contrast: 1.05, saturation: 1.05 },
  },

  // Shot 4: The Waterfall Approach
  {
    name: 'The Waterfall Approach — Approaching the cascade and tilting upward to reveal the staggering 212m drop',
    ease: 'inout',
    keys: [
      { pos: [-50, 31.0, -170], look: [-50, 75, -280],  focal: 24, focus: 105, fstop: 5.6 },
      { pos: [-50, 32.5, -205], look: [-50, 165, -295], focal: 22, focus: 90,  fstop: 5.6 },
    ],
    shadow: { center: [-50, 110, -270], radius: 150 },
    post: { exposure: 1.06, fog: 0.82, bloom: 0.08, vol: 0.22, volDensity: 0.006, volHeight: 50, contrast: 1.06 },
  },

  // Shot 5: The Plunge Pool
  {
    name: 'The Plunge Pool — Dramatic orbital tracking arc around the boiling foam basin and wet spray-zone rocks',
    ease: 'inout',
    keys: [
      { pos: [-95, 33.5, -225], look: [-45, 85, -275], focal: 26, focus: 55, fstop: 5.6 },
      { pos: [-10, 34.0, -215], look: [-52, 95, -278], focal: 26, focus: 60, fstop: 5.6 },
    ],
    shadow: { center: [-50, 45, -250], radius: 95 },
    post: { exposure: 1.06, fog: 0.82, bloom: 0.08, vol: 0.18, volDensity: 0.005, contrast: 1.06 },
  },

  // Shot 6: The Cliffside Ascent
  {
    name: 'The Cliffside Ascent — Controlled arcing climb up the eastern basalt escarpment flanking the cataract',
    ease: 'inout',
    keys: [
      { pos: [45, 55, -235],  look: [-35, 95, -290],  focal: 24, focus: 95, fstop: 6.3 },
      { pos: [15, 195, -265], look: [-45, 235, -310], focal: 24, focus: 90, fstop: 6.3 },
    ],
    shadow: { center: [-20, 130, -275], radius: 160 },
    post: { exposure: 1.05, fog: 0.80, bloom: 0.07, contrast: 1.06, saturation: 1.03 },
  },

  // Shot 7: The Mountain Panorama
  {
    name: 'The Mountain Panorama — High-altitude panoramic sweep across the northern sedimentary mountain skyline',
    ease: 'inout',
    keys: [
      { pos: [55, 330, 60],   look: [-30, 460, -840], focal: 22, focus: 900, fstop: 8.0 },
      { pos: [-65, 345, 20],  look: [-60, 470, -860], focal: 24, focus: 900, fstop: 8.0 },
    ],
    shadow: { center: [0, 380, -600], radius: 450 },
    post: { exposure: 1.04, fog: 0.82, bloom: 0.06, contrast: 1.08, saturation: 1.02 },
  },

  // Shot 8: Sunlight Through the Canopy
  {
    name: 'Sunlight Through the Canopy — Drifting through emergent crowns with golden backlighting and volumetric sunbeams',
    ease: 'inout',
    keys: [
      { pos: [-30, 85, 95],  look: [-55, 60, -180], focal: 32, focus: 28, fstop: 4.5 },
      { pos: [-55, 78, 45],  look: [-52, 65, -220], focal: 28, focus: 32, fstop: 5.6 },
    ],
    shadow: { center: [-45, 75, 40], radius: 85 },
    post: { exposure: 1.06, fog: 0.78, bloom: 0.08, godrays: 0.15, contrast: 1.06, saturation: 1.05 },
  },

  // Shot 9: The Final Master Shot
  {
    name: 'The Final Master Shot — Majestic wide composition framing the complete rainforest ecosystem, decelerating gracefully',
    ease: 'inout',
    keys: [
      { pos: [25, 95, 185],  look: [-48, 92, -280], focal: 24, focus: 400, fstop: 8.0 },
      { pos: [35, 115, 225], look: [-48, 90, -285], focal: 24, focus: 420, fstop: 8.0 },
    ],
    shadow: { center: [-20, 85, -100], radius: 320 },
    post: { exposure: 1.05, fog: 0.78, bloom: 0.06, contrast: 1.05, saturation: 1.04 },
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
