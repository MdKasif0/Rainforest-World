import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Global environment: Tropical Rainforest golden-hour atmosphere and lighting.
// Coordinates: metres, +Y up, +X east, +Z south (so north is -Z).
// ---------------------------------------------------------------------------

const deg = Math.PI / 180;

// Sun: high tropical afternoon sun streaming down the valley onto the waterfall
export const SUN_ELEVATION = 22.5 * deg;
export const SUN_AZ_DIR = new THREE.Vector2(-0.32, 0.95).normalize(); // S-SW shining North

export const sunDir = new THREE.Vector3(
  SUN_AZ_DIR.x * Math.cos(SUN_ELEVATION),
  Math.sin(SUN_ELEVATION),
  SUN_AZ_DIR.y * Math.cos(SUN_ELEVATION)
).normalize();

export const ENV = {
  sunDir,
  // Warm tropical sunlight (linear RGB): ~4000K golden tropical light
  sunColor: new THREE.Color().setRGB(1.0, 0.78, 0.52),
  sunIntensity: 8.5,
  skySunIntensity: 22.0,
  envIntensity: 1.15,
  exposure: 1.05,
  // Rainforest humidity and aerial perspective fog density
  fogDensity: 0.85,
};

// Global uniforms shared BY REFERENCE across every custom shader / patched material.
export const G = {
  uTime: { value: 0 },
  uWindDir: { value: new THREE.Vector2(0.75, 0.65).normalize() },
  uWindStrength: { value: 1.0 },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Vector3(ENV.sunColor.r, ENV.sunColor.g, ENV.sunColor.b).multiplyScalar(ENV.sunIntensity) },
  uFrame: { value: 0 },
  uShot: { value: -1 }, // current film shot index (-1 = free camera)
};

// Shared wind GLSL for tropical vegetation (broadleaf sway, frond flutter)
export const WIND_GLSL = /* glsl */ `
vec3 windOffset(vec3 wp, float flex){
  float t = uTime;
  vec2 wd = uWindDir;
  float gust = 0.6 + 0.4 * sin(t * 0.31 + dot(wp.xz, wd) * 0.035) * sin(t * 0.19 + wp.x * 0.015);
  float sway = sin(t * 1.1 + dot(wp.xz, vec2(0.08, 0.07))) * 0.65 + sin(t * 1.8 + wp.y * 0.25 + wp.x * 0.15) * 0.35;
  float flutter = sin(t * 5.5 + dot(wp, vec3(1.8, 1.4, 2.2))) * 0.3 + sin(t * 9.0 + dot(wp, vec3(2.9, 1.9, 1.5))) * 0.15;
  vec3 o;
  o.xz = wd * (sway * 0.08 + gust * 0.06) * flex;
  o.y = flutter * 0.025 * flex;
  o.xz += vec2(flutter * 0.02, -flutter * 0.018) * flex;
  return o * uWindStrength;
}
`;
