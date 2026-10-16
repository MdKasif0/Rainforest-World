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

// Multi-scale wind and moisture GLSL for tropical rainforest ecosystem
export const WIND_GLSL = /* glsl */ `
// Multi-scale hierarchical wind:
// 1. Macro canopy gust fronts rolling across the valley
// 2. Trunk & scaffold branch sway (low frequency, locked at terrain base)
// 3. Mid-branch elastic spring bounce
// 4. Foliage & frond high-frequency aerodynamic flutter
// 5. Hanging vine pendulum swing with delayed phase
vec3 windOffsetDetailed(vec3 wp, float flex, float branchFlex, float leafFlutter) {
  float t = uTime;
  vec2 wd = uWindDir;
  vec2 crossWd = vec2(-wd.y, wd.x);

  // 1. Large-scale rolling gust front moving across the valley along wd
  float gustFront = sin(t * 0.28 - dot(wp.xz, wd) * 0.024) * 0.5 + 0.5;
  float gustPulse = sin(t * 0.65 + wp.x * 0.018 + wp.z * 0.012) * 0.35;
  float gust = clamp(0.70 + (gustFront * 0.45 + gustPulse * 0.25), 0.3, 1.6);

  // 2. Trunk & Canopy broad sway (low frequency 0.5 - 0.8 Hz)
  // Spatial phase offset based on world position prevents trees swaying in sync
  float treePhase = dot(wp.xz, vec2(0.043, 0.037)) + sin(wp.x * 0.02) * 2.1;
  float mainSway = sin(t * 0.85 + treePhase) * 0.7 + sin(t * 1.45 + treePhase * 1.3) * 0.3;
  float crossSway = cos(t * 0.62 + treePhase * 0.8) * 0.35;

  // 3. Mid-branch elastic spring bounce (1.5 - 2.8 Hz)
  float branchPhase = dot(wp.xyz, vec3(0.12, 0.09, 0.14));
  float branchBounce = sin(t * 2.1 + branchPhase) * 0.55 + sin(t * 3.4 + branchPhase * 1.7) * 0.25;

  // 4. Leaf / frond flutter (5.0 - 10.0 Hz)
  float leafPhase = dot(wp, vec3(1.8, 1.4, 2.2));
  float leafWave = sin(t * 6.2 + leafPhase) * 0.6 + sin(t * 9.8 + leafPhase * 1.5) * 0.4;
  float leafVertical = cos(t * 7.4 + leafPhase * 0.8) * 0.35;

  // Combine motion scales
  vec3 offset = vec3(0.0);
  
  // Trunk & canopy displacement (proportional to flex^1.5 so trunk base stays locked to ground)
  float effectiveFlex = pow(clamp(flex, 0.0, 1.0), 1.5);
  offset.xz += (wd * mainSway + crossWd * crossSway) * (effectiveFlex * 0.18 * gust);
  offset.y -= abs(mainSway) * (effectiveFlex * 0.02);

  // Branch spring flex
  offset.xz += wd * (branchBounce * branchFlex * 0.08 * gust);
  offset.y += branchBounce * (branchFlex * 0.04);

  // Leaf flutter (rapid micro-vibrations)
  offset.xz += (wd * leafWave + crossWd * (leafWave * 0.7)) * (leafFlutter * 0.035 * gust);
  offset.y += leafVertical * (leafFlutter * 0.025 * gust);

  return offset * uWindStrength;
}

// Backward-compatible windOffset
vec3 windOffset(vec3 wp, float flex){
  return windOffsetDetailed(wp, flex, flex * 0.5, flex);
}

// Vine / liana pendulum swing
vec3 lianaWindOffset(vec3 wp, float lengthFactor) {
  float t = uTime;
  vec2 wd = uWindDir;
  vec2 crossWd = vec2(-wd.y, wd.x);
  float phase = wp.x * 0.08 + wp.z * 0.06;
  float swing = sin(t * 1.15 + phase) * 0.7 + sin(t * 1.85 + phase * 1.4) * 0.3;
  float crossSwing = cos(t * 0.92 + phase * 0.7) * 0.4;
  vec3 o = vec3(0.0);
  o.xz = (wd * swing + crossWd * crossSwing) * (lengthFactor * 0.22);
  return o * uWindStrength;
}

// Fern frond independent flexing
vec3 fernFrondWindOffset(vec3 wp, float frondDist) {
  float t = uTime;
  vec2 wd = uWindDir;
  float phase = dot(wp.xz, vec2(0.25, 0.22));
  float flex = pow(clamp(frondDist, 0.0, 1.0), 1.6);
  float bob = sin(t * 1.7 + phase) * 0.6 + sin(t * 3.1 + phase * 1.5) * 0.4;
  float side = cos(t * 1.3 + phase) * 0.35;
  vec3 o = vec3(0.0);
  o.xz = (wd * bob + vec2(-wd.y, wd.x) * side) * (flex * 0.12);
  o.y = bob * (flex * 0.08);
  return o * uWindStrength;
}

// Continuous environmental moisture metric [0, 1]
float getEnvironmentalMoisture(vec3 wp) {
  float distPlunge = length(wp.xz - vec2(-50.0, -265.0));
  float plungeSpray = smoothstep(95.0, 20.0, distPlunge);
  float riverX = wp.x - (-48.0 + sin(wp.z * 0.012) * 25.0);
  float riverMoist = smoothstep(36.0, 6.0, abs(riverX)) * smoothstep(60.0, 18.0, wp.y);
  return clamp(max(plungeSpray * 0.92, riverMoist * 0.72), 0.0, 1.0);
}
`;
