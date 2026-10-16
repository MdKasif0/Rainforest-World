import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { G, WIND_GLSL } from './env.js';
import { hashString } from './rng.js';

// ---------------------------------------------------------------------------
// patch(material, opts): inject procedural GLSL into any MeshStandard/Physical
// material (also works for MeshBasic/Lambert for the common hooks).
//
// Always available in BOTH vertex and fragment stages:
//   varying vec3 vWPos;  // world-space position (after vertexWorld displacement)
//   varying vec3 vWNrm;  // world-space geometric normal (unnormalised in frag -> normalize it)
//   uniform float uTime; uniform vec2 uWindDir; uniform float uWindStrength;
//   uniform vec3 uSunDir; uniform vec3 uSunColor;
//   the whole NOISE lib (n_* functions) and windOffset(wp, flex)
// Fragment helpers: n_bumpView(viewPos, viewNormal, height, strength) -> perturbed view normal
//
// Hooks (strings of GLSL statements):
//   vertexHead    : declarations for the vertex shader (attributes, varyings, functions)
//   vertexWorld   : runs with `vec4 wPos4` = world position; may modify wPos4.xyz (wind etc.)
//                   `transformed` (object space) and `objectNormal` are in scope.
//   fragHead      : declarations for the fragment shader (varyings, globals, functions)
//   fragColor     : after <color_fragment>; modify `diffuseColor` (vec4, linear)
//   fragRough     : after <roughnessmap_fragment>; modify `roughnessFactor`
//   fragMetal     : after <metalnessmap_fragment>; modify `metalnessFactor`
//   fragNormal    : after <normal_fragment_maps>; modify `normal` (VIEW space, normalized)
//   fragEmissive  : after <emissivemap_fragment>; modify `totalEmissiveRadiance`
//   fragLight     : after <lights_fragment_end>; may add to reflectedLight.* (e.g. leaf translucency)
//   fragEnd       : right before <opaque_fragment>; modify `outgoingLight`
//   uniforms      : extra uniforms {name: {value}} (shared objects are kept by reference)
//   defines       : extra defines
// ---------------------------------------------------------------------------

const COMMON_HEAD = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uShot;
${NOISE}
`;

const FRAG_UTIL = /* glsl */ `
vec3 n_bumpView(vec3 p, vec3 n, float h, float strength){
  vec3 dpdx = dFdx(p), dpdy = dFdy(p);
  float dhdx = dFdx(h), dhdy = dFdy(h);
  vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
  return normalize(abs(det) * n - strength * grad);
}
vec3 n_worldNormalFromView(vec3 nv){ return normalize((vec4(nv, 0.0) * viewMatrix).xyz); }

float getEnvironmentalMoisture(vec3 wp) {
  float distPlunge = length(wp.xz - vec2(-50.0, -265.0));
  float plungeSpray = smoothstep(95.0, 20.0, distPlunge);
  float riverX = wp.x - (-48.0 + sin(wp.z * 0.012) * 25.0);
  float riverMoist = smoothstep(36.0, 6.0, abs(riverX)) * smoothstep(60.0, 18.0, wp.y);
  return clamp(max(plungeSpray * 0.92, riverMoist * 0.72), 0.0, 1.0);
}
`;

export function patch(mat, o = {}) {
  const parts = [o.vertexHead, o.vertexWorld, o.fragHead, o.fragColor, o.fragRough, o.fragMetal, o.fragNormal, o.fragEmissive, o.fragPhysical, o.fragLight, o.fragEnd, JSON.stringify(o.defines || {})];
  const key = 'p' + hashString(parts.map((s) => s || '').join('|'));
  const prev = mat.onBeforeCompile;
  mat.userData.patch = o;
  if (o.defines) mat.defines = Object.assign(mat.defines || {}, o.defines);
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev && prev !== THREE.Material.prototype.onBeforeCompile) prev(shader, renderer);
    shader.uniforms.uTime = G.uTime;
    shader.uniforms.uWindDir = G.uWindDir;
    shader.uniforms.uWindStrength = G.uWindStrength;
    shader.uniforms.uSunDir = G.uSunDir;
    shader.uniforms.uSunColor = G.uSunColor;
    shader.uniforms.uShot = G.uShot;
    if (o.uniforms) Object.assign(shader.uniforms, o.uniforms);

    let vs = shader.vertexShader;
    vs = vs.replace('#include <common>', `#include <common>\n${COMMON_HEAD}\n${WIND_GLSL}\n${o.vertexHead || ''}`);
    vs = vs.replace(
      '#include <project_vertex>',
      /* glsl */ `
      vec4 wPos4 = vec4( transformed, 1.0 );
      #ifdef USE_BATCHING
        wPos4 = batchingMatrix * wPos4;
      #endif
      #ifdef USE_INSTANCING
        wPos4 = instanceMatrix * wPos4;
      #endif
      wPos4 = modelMatrix * wPos4;
      {
        vec3 _on = objectNormal;
        #ifdef USE_BATCHING
          _on = mat3(batchingMatrix) * _on;
        #endif
        #ifdef USE_INSTANCING
          _on = mat3(instanceMatrix) * _on;
        #endif
        vWNrm = mat3(modelMatrix) * _on;
      }
      ${o.vertexWorld || ''}
      vWPos = wPos4.xyz;
      vec4 mvPosition = viewMatrix * wPos4;
      gl_Position = projectionMatrix * mvPosition;
      `
    );
    vs = vs.replace(
      '#include <worldpos_vertex>',
      /* glsl */ `
      #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
        vec4 worldPosition = wPos4;
      #endif
      `
    );
    // objectNormal is not defined for depth/distance materials -> make sure it exists
    if (!vs.includes('beginnormal_vertex')) {
      vs = vs.replace('#include <begin_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);\n#include <begin_vertex>');
    }
    shader.vertexShader = vs;

    let fs = shader.fragmentShader;
    fs = fs.replace('#include <common>', `#include <common>\n${COMMON_HEAD}\n${FRAG_UTIL}\n${o.fragHead || ''}`);
    if (o.fragColor) fs = fs.replace('#include <color_fragment>', `#include <color_fragment>\n${o.fragColor}`);
    if (o.fragRough) fs = fs.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${o.fragRough}`);
    if (o.fragMetal) fs = fs.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${o.fragMetal}`);
    if (o.fragNormal) fs = fs.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${o.fragNormal}`);
    if (o.fragEmissive) fs = fs.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${o.fragEmissive}`);
    if (o.fragPhysical) fs = fs.replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>\n${o.fragPhysical}`);
    if (o.fragLight) fs = fs.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${o.fragLight}`);
    if (o.fragEnd) fs = fs.replace('#include <opaque_fragment>', `${o.fragEnd}\n#include <opaque_fragment>`);
    shader.fragmentShader = fs;
  };
  const prevKey = mat.customProgramCacheKey;
  mat.customProgramCacheKey = () => key;
  mat.needsUpdate = true;
  return mat;
}

// Patch a depth material (shadow casting) with the same world-space vertex displacement.
export function depthMaterialFor(o = {}, base = {}) {
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, ...base });
  patch(dm, { vertexHead: o.vertexHead, vertexWorld: o.vertexWorld });
  return dm;
}

// ---------------------------------------------------------------------------
// Convenience factories
// ---------------------------------------------------------------------------
export function std(params = {}, proc = null) {
  const m = new THREE.MeshStandardMaterial(params);
  if (proc) patch(m, proc);
  return m;
}
export function phys(params = {}, proc = null) {
  const m = new THREE.MeshPhysicalMaterial(params);
  if (proc) patch(m, proc);
  return m;
}
// Emissive glow (lantern paper, flames, window light). `color` linear RGB, `intensity` HDR multiplier.
export function glow(color = [1.0, 0.55, 0.22], intensity = 8, params = {}) {
  const c = new THREE.Color().setRGB(color[0], color[1], color[2]).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, ...params });
}

// ---------------------------------------------------------------------------
// Procedural surface GLSL snippets (reuse in custom materials)
// ---------------------------------------------------------------------------
export const PROC = {};

// Vermilion lacquered wood (shu-nuri) with weathering, grime and subtle grain.
PROC.lacquer = (base = 'vec3(0.50, 0.072, 0.028)') => ({
  fragHead: /* glsl */ `float g_h;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos; vec3 wn = normalize(vWNrm);
      float big = n_fbm3(wp * 0.23, 3);
      float mid = n_fbm3(wp * vec3(1.6, 0.35, 1.6), 3);
      // fine grain, stretched along the dominant member axis guess (vertical for columns)
      float vert = 1.0 - abs(wn.y);
      vec3 gs = mix(vec3(9.0, 9.0, 0.9), vec3(9.0, 0.7, 9.0), vert);
      float grain = n_snoise3(wp * gs) * 0.5 + n_snoise3(wp * gs * 2.7) * 0.25;
      vec3 base = ${base};
      vec3 col = base * (0.88 + 0.16 * big + 0.05 * grain);
      // sun-faded / chalky patches
      float fade = smoothstep(0.25, 0.75, mid * 0.6 + 0.5 + big * 0.3);
      col = mix(col, base * vec3(1.18, 1.5, 1.6) * 0.92, fade * 0.18);
      // worn edges showing dark wood (rare)
      float wear = smoothstep(0.62, 0.8, n_fbm3(wp * 2.6, 3) * 0.5 + 0.5);
      col = mix(col, vec3(0.09, 0.035, 0.02), wear * 0.55);
      // ground grime
      float grime = 1.0 - smoothstep(0.0, 1.4, wp.y - 0.0);
      col *= 1.0 - grime * 0.25 * (0.6 + 0.4 * big);
      diffuseColor.rgb *= col;
      g_h = grain * 0.35 + wear * 0.4 + mid * 0.2;
    }
  `,
  fragRough: /* glsl */ `roughnessFactor = clamp(roughnessFactor * (0.85 + 0.3 * (g_h + 0.3)), 0.12, 1.0);`,
  fragNormal: /* glsl */ `normal = n_bumpView(-vViewPosition, normal, g_h, 0.0025);`,
});

// Gold leaf / gilt bronze fittings.
PROC.gold = (base = 'vec3(1.0, 0.70, 0.30)') => ({
  fragHead: /* glsl */ `float g_h;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      float n = n_fbm3(wp * 3.1, 3);
      float tarnish = smoothstep(0.2, 0.75, n_fbm3(wp * 0.9 + 7.0, 3) * 0.5 + 0.5);
      vec3 base = ${base};
      vec3 col = base * (0.92 + 0.12 * n);
      col = mix(col, base * vec3(0.55, 0.42, 0.25), tarnish * 0.35);
      diffuseColor.rgb *= col;
      g_h = n * 0.5 + tarnish * 0.3;
    }
  `,
  fragRough: /* glsl */ `roughnessFactor = clamp(roughnessFactor + g_h * 0.12, 0.05, 1.0);`,
  fragNormal: /* glsl */ `normal = n_bumpView(-vViewPosition, normal, g_h, 0.0012);`,
});

// Cast bronze (bells, hanging lanterns) with dark patina.
PROC.bronze = () => ({
  fragHead: /* glsl */ `float g_h; float g_pat;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      float n = n_fbm3(wp * 4.0, 4);
      g_pat = smoothstep(-0.1, 0.5, n_fbm3(wp * 1.7 + 3.0, 3));
      vec3 bronze = vec3(0.55, 0.36, 0.16) * (0.85 + 0.2 * n);
      vec3 patina = mix(vec3(0.05, 0.045, 0.035), vec3(0.10, 0.16, 0.12), smoothstep(0.3, 0.8, n * 0.5 + 0.5));
      diffuseColor.rgb *= mix(bronze, patina, g_pat * 0.7);
      g_h = n;
    }
  `,
  fragRough: /* glsl */ `roughnessFactor = mix(0.32, 0.75, g_pat * 0.7);`,
  fragMetal: /* glsl */ `metalnessFactor = mix(1.0, 0.25, g_pat * 0.7);`,
  fragNormal: /* glsl */ `normal = n_bumpView(-vViewPosition, normal, g_h, 0.002);`,
});

// Dark ceramic roof tile (ibushi-gawara): blue-grey with silvery sheen, dust and lichen.
PROC.roofTile = () => ({
  fragHead: /* glsl */ `float g_h;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      float n = n_fbm3(wp * 0.6, 3);
      float f = n_snoise3(wp * 9.0);
      vec3 col = vec3(0.060, 0.066, 0.078) * (0.85 + 0.25 * n + 0.06 * f);
      float lichen = smoothstep(0.55, 0.85, n_fbm3(wp * 2.3 + 11.0, 4) * 0.5 + 0.5);
      col = mix(col, vec3(0.16, 0.15, 0.11), lichen * 0.35);
      float dust = smoothstep(0.2, 0.9, normalize(vWNrm).y) * (0.5 + 0.5 * n);
      col = mix(col, vec3(0.12, 0.11, 0.10), dust * 0.12);
      diffuseColor.rgb *= col;
      g_h = f * 0.3 + lichen * 0.4;
    }
  `,
  fragRough: /* glsl */ `roughnessFactor = clamp(roughnessFactor + g_h * 0.25, 0.2, 1.0);`,
  fragNormal: /* glsl */ `normal = n_bumpView(-vViewPosition, normal, g_h, 0.003);`,
});

// White lime plaster with rain streaks and grime.
PROC.plaster = () => ({
  fragHead: /* glsl */ `float g_h;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      float n = n_fbm3(wp * 0.8, 4);
      float streak = n_fbm3(wp * vec3(3.0, 0.25, 3.0), 3);
      vec3 col = vec3(0.78, 0.75, 0.68) * (0.92 + 0.08 * n);
      col *= 1.0 - smoothstep(0.1, 0.7, streak) * 0.18;
      diffuseColor.rgb *= col;
      g_h = n_snoise3(wp * 14.0) * 0.5 + n * 0.5;
    }
  `,
  fragNormal: /* glsl */ `normal = n_bumpView(-vViewPosition, normal, g_h, 0.0015);`,
});

// Granite with speckles, lichen and moss on up-facing surfaces. mossAmt 0..1
PROC.granite = (mossAmt = '0.6', tint = 'vec3(1.0)') => ({
  fragHead: /* glsl */ `float g_h; float g_moss;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos; vec3 wn = normalize(vWNrm);
      float big = n_fbm3(wp * 0.45, 4);
      float speck = n_snoise3(wp * 38.0);
      float speck2 = n_snoise3(wp * 61.0 + 5.0);
      vec3 col = vec3(0.34, 0.33, 0.31) * ${tint} * (0.82 + 0.25 * big);
      col = mix(col, vec3(0.06, 0.06, 0.06), smoothstep(0.55, 0.85, speck) * 0.8);
      col = mix(col, vec3(0.62, 0.60, 0.56), smoothstep(0.6, 0.9, speck2) * 0.6);
      // dark weathering streaks + damp base
      float streak = n_fbm3(wp * vec3(2.2, 0.35, 2.2), 3);
      col *= 1.0 - smoothstep(0.0, 0.6, streak) * 0.3;
      // lichen blotches (pale yellow-grey)
      float lich = smoothstep(0.62, 0.78, n_fbm3(wp * 1.9 + 3.3, 4) * 0.5 + 0.5);
      col = mix(col, vec3(0.42, 0.42, 0.30), lich * 0.45);
      // moss: up-facing + crevices noise
      float up = smoothstep(0.15, 0.85, wn.y);
      float mn = n_fbm3(wp * 1.3 + 9.1, 5) * 0.5 + 0.5;
      g_moss = clamp(smoothstep(0.62 - 0.35 * up * ${mossAmt}, 0.82, mn + up * 0.15) * ${mossAmt}, 0.0, 1.0);
      vec3 mossCol = mix(vec3(0.045, 0.075, 0.012), vec3(0.12, 0.16, 0.03), n_snoise3(wp * 7.0) * 0.5 + 0.5);
      col = mix(col, mossCol, g_moss);
      diffuseColor.rgb *= col;
      g_h = big * 0.5 + speck * 0.08 + g_moss * 0.6 + n_snoise3(wp * 12.0) * 0.12;
    }
  `,
  fragRough: /* glsl */ `roughnessFactor = mix(0.72, 0.95, g_moss);`,
  fragNormal: /* glsl */ `normal = n_bumpView(-vViewPosition, normal, g_h, 0.01);`,
});

// Weathered timber (bridge deck, raw wood). grainAxis: 'x' | 'y' | 'z'
PROC.wood = (base = 'vec3(0.24, 0.15, 0.09)', grainAxis = 'x') => {
  const sc = grainAxis === 'x' ? 'vec3(0.4, 14.0, 14.0)' : grainAxis === 'y' ? 'vec3(14.0, 0.4, 14.0)' : 'vec3(14.0, 14.0, 0.4)';
  return {
    fragHead: /* glsl */ `float g_h;`,
    fragColor: /* glsl */ `
      {
        vec3 wp = vWPos;
        float g = n_fbm3(wp * ${sc}, 4);
        float ringsRaw = sin(g * 18.0) * 0.5 + 0.5;
        float rings = mix(ringsRaw, 0.5, clamp(fwidth(g * 18.0) * 0.6, 0.0, 1.0));
        float big = n_fbm3(wp * 0.5, 3);
        vec3 base = ${base};
        vec3 col = base * (0.75 + 0.35 * rings * (0.6 + 0.4 * big) + 0.15 * big);
        diffuseColor.rgb *= col;
        g_h = rings * 0.5 + g * 0.3;
      }
    `,
    fragRough: /* glsl */ `roughnessFactor = clamp(roughnessFactor + (g_h - 0.4) * 0.15, 0.1, 1.0);`,
    fragNormal: /* glsl */ `normal = n_bumpView(-vViewPosition, normal, g_h, 0.002);`,
  };
};

// --- Tropical Rainforest Procedural Materials (Phase 2) -----------------------

// 1. Procedural Tree Bark Family (dry bark, wet bark with water runnels, mossy bark, and soil-blended buttress roots)
PROC.treeBarkDetailed = (variant = 'dry') => ({
  vertexWorld: /* glsl */ `
    // Trunk & branch wind sway:
    // flex increases with altitude (y) so root bases remain locked to terrain
    float trunkFlex = clamp((wPos4.y - 10.0) / 45.0, 0.0, 1.0);
    wPos4.xyz += windOffsetDetailed(wPos4.xyz, trunkFlex * 0.35, trunkFlex * 0.45, 0.0);
  `,
  fragHead: /* glsl */ `float g_h; float g_moss; float g_wet;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos; vec3 wn = normalize(vWNrm);
      // Deep longitudinal furrowing and vertical grain ridges
      float furrow = n_fbm3(wp * vec3(14.0, 0.7, 14.0), 4);
      float bigGirth = n_fbm3(wp * 0.28, 3);
      float microGrain = n_snoise3(wp * vec3(45.0, 3.5, 45.0)) * 0.08;
      
      // Warm umber bark base
      vec3 barkCol = vec3(0.20, 0.15, 0.11) * (0.8 + 0.38 * furrow + 0.18 * bigGirth + microGrain);
      
      // Pale sage/grey crustose lichen colonies
      float lichen = smoothstep(0.60, 0.84, n_fbm3(wp * 1.4 + 9.5, 3) * 0.5 + 0.5);
      barkCol = mix(barkCol, vec3(0.27, 0.30, 0.24), lichen * 0.42);
      
      // Lush velvet moss colonies on upward slopes, branch crotches, and humid zones
      float up = smoothstep(0.18, 0.82, wn.y);
      float mossNoise = n_fbm3(wp * 0.9 + 4.2, 4) * 0.5 + 0.5;
      float isMossy = ${variant === 'mossy' ? '1.0' : variant === 'root' ? '0.75' : '0.4'};
      g_moss = smoothstep(0.52 - 0.35 * up * isMossy, 0.82, mossNoise + up * 0.35) * isMossy;
      vec3 mossCol = mix(vec3(0.04, 0.13, 0.02), vec3(0.08, 0.22, 0.05), n_snoise3(wp * 3.5) * 0.5 + 0.5);
      
      // Wetness factor: water seep runnels and environmental moisture mask
      float isWet = ${variant === 'wet' ? '1.0' : variant === 'root' ? '0.6' : '0.0'};
      float envM = getEnvironmentalMoisture(wp);
      float runnels = smoothstep(0.35, 0.80, n_fbm3(vec3(wp.x * 2.2, wp.y * 0.15 - uTime * 0.35, wp.z * 2.2), 3));
      g_wet = clamp(max(isWet * (0.65 + 0.35 * runnels), envM * 0.85), 0.0, 1.0);
      
      ${variant === 'root' ? `
        // Soil encrustation for ground-hugging buttress roots
        float soilBlend = smoothstep(18.0, 8.0, wp.y);
        vec3 soilCol = vec3(0.11, 0.08, 0.05) * (0.85 + 0.3 * n_fbm3(wp * 1.5, 3));
        barkCol = mix(barkCol, soilCol, soilBlend * 0.65);
      ` : ''}

      vec3 col = mix(barkCol, mossCol, g_moss);
      // Wet surfaces darken naturally and gain rich humus contrast
      col *= (1.0 - g_wet * 0.45);
      
      diffuseColor.rgb = col;
      g_h = furrow * 0.5 + microGrain * 0.2 + g_moss * 0.35 - g_wet * 0.15;
    }
  `,
  fragRough: /* glsl */ `
    roughnessFactor = mix(mix(0.88, 0.96, g_moss), 0.22, g_wet);
  `,
  fragNormal: /* glsl */ `
    normal = n_bumpView(-vViewPosition, normal, g_h, 0.012);
  `,
});

// 2. Procedural Rock Family (Cliff Basalt, Crystalline Granite, Sedimentary Strata, Splash Rocks)
PROC.rockDetailed = (type = 'basalt', wetness = '0.0', mossAmt = '0.65') => ({
  fragHead: /* glsl */ `float g_h; float g_moss; float g_wet; float g_fleck;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos; vec3 wn = normalize(vWNrm);
      float big = n_fbm3(wp * 0.045, 4);
      float micro = n_snoise3(wp * 22.0) * 0.06;
      vec3 rockCol;
      float strata = 0.0;
      float runStreak = 0.0;

      ${type === 'granite' ? `
        // Granite: quartz, feldspar and biotite crystal grains
        float quartz = smoothstep(0.45, 0.75, n_snoise3(wp * 38.0) * 0.5 + 0.5);
        float biotite = smoothstep(0.68, 0.88, n_snoise3(wp * 48.0 + 8.1) * 0.5 + 0.5);
        vec3 feldsparCol = vec3(0.24, 0.21, 0.19);
        vec3 quartzCol = vec3(0.38, 0.37, 0.35);
        vec3 biotiteCol = vec3(0.04, 0.04, 0.04);
        rockCol = mix(feldsparCol, quartzCol, quartz * 0.5);
        rockCol = mix(rockCol, biotiteCol, biotite * 0.8);
        rockCol *= (0.85 + 0.3 * big + micro);
        g_fleck = quartz * 0.4;
      ` : type === 'sedimentary' ? `
        // Sedimentary: rhythmic horizontal and tilted geological strata beds
        strata = sin(wp.y * 0.22 + wp.x * 0.035 + n_fbm3(wp * 0.05, 3) * 3.2) * 0.5 + 0.5;
        float strataFine = sin(wp.y * 0.85 + n_snoise3(wp * 0.15) * 2.0) * 0.5 + 0.5;
        vec3 sandstone = vec3(0.25, 0.22, 0.18);
        vec3 ironstone = vec3(0.29, 0.19, 0.13);
        vec3 shale = vec3(0.14, 0.13, 0.12);
        rockCol = mix(sandstone, ironstone, strata * 0.6);
        rockCol = mix(rockCol, shale, strataFine * 0.4);
        rockCol *= (0.85 + 0.35 * big);
        g_fleck = 0.0;
      ` : `
        // Basalt / Cliff Rock: dark volcanic rock with columnar jointing and iron oxidation
        strata = sin(wp.y * 0.30 + n_fbm3(wp * 0.06, 3) * 2.8) * 0.5 + 0.5;
        runStreak = n_fbm3(wp * vec3(1.8, 0.06, 1.8), 4);
        float fissure = smoothstep(0.47, 0.53, abs(n_snoise3(wp * 1.6) * 0.5));
        vec3 basaltBase = vec3(0.10, 0.095, 0.09) * (0.8 + 0.4 * big) * (0.88 + 0.25 * strata);
        // Dark vertical water seeps
        basaltBase *= 1.0 - smoothstep(0.25, 0.85, runStreak) * 0.65;
        // Joint fissures
        rockCol = mix(basaltBase, vec3(0.02, 0.02, 0.02), (1.0 - fissure) * 0.7);
        // Lichen & iron oxide patina
        float iron = smoothstep(0.65, 0.85, n_fbm3(wp * 0.4 + 6.3, 3) * 0.5 + 0.5);
        rockCol = mix(rockCol, vec3(0.22, 0.15, 0.10), iron * 0.4);
        g_fleck = 0.0;
      `}

      // Slope-based velvet moss (abundant in humid gorge, fades on alpine peaks)
      float up = smoothstep(0.14, 0.75, wn.y);
      float elevFade = smoothstep(230.0, 60.0, wp.y);
      float mossNoise = n_fbm3(wp * 0.42 + 7.5, 4) * 0.5 + 0.5;
      g_moss = clamp(smoothstep(0.55 - 0.45 * up * ${mossAmt}, 0.85, mossNoise + up * 0.3) * ${mossAmt} * elevFade, 0.0, 1.0);
      vec3 mossCol = mix(vec3(0.04, 0.12, 0.02), vec3(0.09, 0.22, 0.05), n_snoise3(wp * 2.8) * 0.5 + 0.5);

      // Water spray wetness darkening and glistening sheen via environmental moisture mask
      float envRockM = getEnvironmentalMoisture(wp);
      g_wet = clamp(max(${wetness}, envRockM), 0.0, 1.0);
      vec3 col = mix(rockCol, mossCol, g_moss);
      col *= (1.0 - g_wet * 0.48);

      diffuseColor.rgb = col;
      g_h = big * 0.35 + strata * 0.25 + g_moss * 0.4 + micro * 0.15 - runStreak * 0.2;
    }
  `,
  fragRough: /* glsl */ `
    roughnessFactor = mix(mix(${type === 'granite' ? '0.76' : '0.84'}, 0.94, g_moss), 0.12, g_wet);
  `,
  fragMetal: /* glsl */ `
    metalnessFactor = g_fleck * 0.15 + g_wet * 0.05;
  `,
  fragNormal: /* glsl */ `
    normal = n_bumpView(-vViewPosition, normal, g_h, ${type === 'granite' ? '0.028' : '0.042'});
  `,
});

// 3. Procedural Tropical Leaf Material with physically based subsurface translucency & waxy cuticle
PROC.tropicalLeafPhys = (type = 'broadleaf', subsurface = '0.75') => ({
  fragHead: /* glsl */ `float g_vein; float g_cuticle;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      // Multi-scale chlorophyll variation
      float macro = n_fbm3(wp * 1.8, 2) * 0.15;
      float fine = n_snoise3(wp * 35.0) * 0.06;
      
      ${type === 'palm' ? `
        // Parallel linear striations along palm frond
        float veins = sin(wp.x * 24.0 + wp.z * 24.0) * 0.08;
      ` : `
        // Branching reticulate venation
        float veins = n_snoise3(wp * 48.0) * 0.09;
      `}
      g_vein = veins;
      
      // Height and exposure chlorophyll gradation (tender sun-facing vs deep shade)
      float sunExposure = smoothstep(12.0, 48.0, wp.y);
      vec3 youngFoliage = vec3(0.18, 0.40, 0.08);
      vec3 matureFoliage = vec3(0.08, 0.22, 0.05);
      vec3 leafTint = mix(matureFoliage, youngFoliage, sunExposure * 0.5 + macro);
      
      // Pale yellow-green vein highlights
      leafTint = mix(leafTint, vec3(0.24, 0.42, 0.10), max(0.0, veins * 1.5));
      
      diffuseColor.rgb *= leafTint * 2.4;
      g_cuticle = 0.85 + fine;
    }
  `,
  fragLight: /* glsl */ `
    {
      // Physically motivated two-sided subsurface transmission
      // Backlight wraps around thin leaf lamina with warm luminous emerald-gold scatter
      float backDot = max(0.0, dot(-geometryNormal, directLight.direction));
      vec3 transCol = diffuseColor.rgb * vec3(1.35, 1.55, 0.75);
      reflectedLight.directDiffuse += directLight.color * transCol * backDot * ${subsurface};
    }
  `,
  fragRough: /* glsl */ `
    // Waxy tropical leaf cuticle: low roughness for specular sheen
    roughnessFactor = clamp(0.26 + g_vein * 0.4, 0.18, 0.48);
  `,
  fragNormal: /* glsl */ `
    normal = n_bumpView(-vViewPosition, normal, g_vein, 0.006);
  `,
});

// 4. Procedural Waterfall Cascading Foam Surface
PROC.waterfallFoamDetailed = () => ({
  vertexWorld: /* glsl */ `
    {
      float t = uTime * 4.2;
      // High-speed downward cascading surges and cavitation ripples
      float waveV = sin(wPos4.y * 0.45 - t * 1.8 + wPos4.x * 0.22) * 0.35;
      float microV = sin(wPos4.y * 1.25 - t * 4.2 + wPos4.z * 0.4) * 0.15;
      // Cascade surges outward from cliff face
      wPos4.z += (waveV + microV) * 0.55;
    }
  `,
  fragHead: /* glsl */ `float g_foam; float g_core;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      float t = uTime * 4.2;
      
      // Multi-speed downward velocity field:
      float uvY1 = wp.y * 0.38 - t * 1.25;
      float uvY2 = wp.y * 0.20 - t * 0.75;
      float uvY3 = wp.y * 0.65 - t * 1.85;
      
      // Turbulent downward flow FBM noise
      float n1 = n_fbm3(vec3(wp.x * 0.16, uvY1, wp.z * 0.25), 4);
      float n2 = n_snoise3(vec3(wp.x * 0.35 + 2.4, uvY2, wp.z * 0.4));
      float n3 = n_snoise3(vec3(wp.x * 0.8 - 1.8, uvY3, wp.z * 0.15));
      
      // Cellular Voronoi aerated foam bubbles
      vec2 wor = n_worley(vec2(wp.x * 0.45, uvY1 * 0.8));
      float bubble = 1.0 - wor.x;
      
      float foam = smoothstep(0.18, 0.68, n1 * 0.5 + n2 * 0.3 + n3 * 0.2 + bubble * 0.25 + 0.15);
      g_foam = foam;
      g_core = n1;
      
      // Deep glacial water showing through thin aerated water sheets
      vec3 deepWater = vec3(0.06, 0.34, 0.38);
      vec3 whitewater = vec3(0.98, 0.99, 1.0);
      diffuseColor.rgb = mix(deepWater, whitewater, foam);
      // Aeration light bounce: multiple internal scatterings in foam froth
      diffuseColor.rgb += vec3(0.38, 0.40, 0.42) * foam;
    }
  `,
  fragRough: /* glsl */ `
    roughnessFactor = mix(0.06, 0.52, g_foam);
  `,
  fragNormal: /* glsl */ `
    normal = n_bumpView(-vViewPosition, normal, g_foam * 0.8 + g_core * 0.4, 0.05);
  `,
  fragLight: /* glsl */ `
    // Aeration multiple scattering inside whitewater foam:
    float foamScatter = g_foam * 0.45;
    reflectedLight.directDiffuse += uSunColor * (foamScatter * 0.32);
    reflectedLight.indirectDiffuse += vec3(0.40, 0.48, 0.50) * foamScatter;
  `,
});

// 5. Procedural Plunge Pool Boiling Foam Disks (Radial expanding froth)
PROC.plungePoolFoam = () => ({
  vertexWorld: /* glsl */ `
    {
      vec2 center = vec2(-50.0, -265.0);
      float r = length(wPos4.xz - center);
      float t = uTime * 2.8;
      // Concentric boiling shockwaves expanding outward from cascade impact
      float boilWave = sin(r * 0.42 - t * 2.4) * exp(-r * 0.045);
      float boilChurn = n_snoise3(vec3(wPos4.x * 0.15, t * 1.2, wPos4.z * 0.15)) * 0.35;
      wPos4.y += (boilWave * 0.55 + boilChurn * 0.3) * smoothstep(55.0, 5.0, r);
    }
  `,
  fragHead: /* glsl */ `float g_froth;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      vec2 center = vec2(-50.0, -265.0);
      float r = length(wp.xz - center);
      float t = uTime * 2.2;
      
      // Expanding radial shockwaves and churning eddies
      float radialWave = sin(r * 0.35 - t * 2.0);
      float swirl = n_snoise3(vec3(wp.x * 0.18, t * 1.2, wp.z * 0.18));
      float frothNoise = n_fbm3(vec3(wp.x * 0.32, t * 0.8, wp.z * 0.32), 3);
      
      // Intense boil at center (r < 25m), dissipating outwards to perimeter
      float boilCenter = smoothstep(45.0, 4.0, r);
      float froth = smoothstep(0.32, 0.72, frothNoise + swirl * 0.3 + boilCenter * 0.65);
      g_froth = froth;
      
      vec3 poolTurquoise = vec3(0.04, 0.35, 0.39);
      vec3 whitewater = vec3(0.97, 0.99, 1.0);
      diffuseColor.rgb = mix(poolTurquoise, whitewater, froth);
      diffuseColor.rgb += vec3(0.35, 0.36, 0.38) * froth;
      diffuseColor.a = mix(0.45, 0.95, froth);
    }
  `,
  fragRough: /* glsl */ `
    roughnessFactor = mix(0.04, 0.58, g_froth);
  `,
  fragNormal: /* glsl */ `
    normal = n_bumpView(-vViewPosition, normal, g_froth, 0.04);
  `,
});

// 6. Physically Based River Water with Fresnel, Flow Velocity & Depth Extinction
PROC.riverWaterPhys = () => ({
  vertexWorld: /* glsl */ `
    {
      float t = uTime;
      // Multi-scale current swell along +Z flow
      float swell = sin(wPos4.z * 0.12 - t * 1.4 + wPos4.x * 0.06) * 0.18;
      float chop = sin(wPos4.x * 0.32 + wPos4.z * 0.22 - t * 2.1) * 0.08;
      wPos4.y += swell + chop;
    }
  `,
  fragHead: /* glsl */ `float g_wave; float g_foam;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      float t = uTime * 1.1;
      
      // Directional river current (flows southward along +Z)
      float flowZ = wp.z - t * 2.8;
      // Multi-scale overlapping wave spectrum
      float swell = sin(wp.x * 0.45 + flowZ * 0.3);
      float chop1 = cos(wp.x * 1.1 - flowZ * 0.85);
      float chop2 = sin(wp.x * 2.2 + flowZ * 1.6);
      float ripple = n_snoise3(vec3(wp.x * 1.8, t * 2.2, wp.z * 1.8)) * 0.5 + 0.5;
      g_wave = (swell * 0.4 + chop1 * 0.3 + chop2 * 0.2 + ripple * 0.4) * 0.4;
      
      // Rapids foam along fast channel and wake turbulence around river boulders
      float rapidNoise = n_fbm3(vec3(wp.x * 0.32, wp.y * 0.1, flowZ * 0.4), 3);
      float rf = smoothstep(0.52, 0.82, rapidNoise);
      float wakeNoise = n_fbm3(vec3(wp.x * 0.55, wp.y * 0.2, flowZ * 0.65), 3);
      float obstacleWake = smoothstep(0.48, 0.78, wakeNoise);
      float totalFoam = clamp(rf + obstacleWake * 0.55, 0.0, 1.0);
      g_foam = totalFoam;
      
      // Clear tropical water: shallow turquoise-emerald to deep ink-teal
      vec3 shallowTurquoise = vec3(0.10, 0.48, 0.45);
      vec3 deepTeal = vec3(0.03, 0.26, 0.30);
      vec3 waterCol = mix(deepTeal, shallowTurquoise, sin(wp.x * 0.08 + wp.z * 0.05) * 0.5 + 0.5);
      vec3 foamCol = vec3(0.97, 0.99, 1.0);
      
      diffuseColor.rgb = mix(waterCol, foamCol, totalFoam * 0.88);
      // Realistic water transmission: opaque in foam, translucent in clear current
      diffuseColor.a = mix(0.85, 0.99, totalFoam);
    }
  `,
  fragRough: /* glsl */ `
    roughnessFactor = mix(0.035, 0.55, g_foam);
  `,
  fragNormal: /* glsl */ `
    normal = n_bumpView(-vViewPosition, normal, g_wave + g_foam * 0.7, 0.038);
  `,
});

// 7. Damp Forest Soil & Liquid Mud
PROC.soilAndMudDetailed = (isMud = false) => ({
  fragHead: /* glsl */ `float g_h; float g_puddle;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      float humus = n_fbm3(wp * 2.5, 4);
      float crumb = n_snoise3(wp * 28.0) * 0.08;
      float litter = smoothstep(0.68, 0.88, n_snoise3(wp * 12.0 + 3.2) * 0.5 + 0.5);
      
      vec3 soilBase = vec3(0.13, 0.09, 0.06) * (0.85 + 0.35 * humus + crumb);
      soilBase = mix(soilBase, vec3(0.18, 0.12, 0.08), litter * 0.5);
      
      ${isMud ? `
        // Liquid mud puddle depressions
        float puddles = smoothstep(0.38, 0.72, n_fbm3(wp * 0.75, 3));
        g_puddle = puddles;
        vec3 mudCol = vec3(0.08, 0.06, 0.04) * (0.8 + 0.25 * humus);
        soilBase = mix(soilBase, mudCol, puddles);
      ` : `
        g_puddle = 0.0;
      `}
      
      diffuseColor.rgb = soilBase;
      g_h = humus * 0.4 + crumb * 0.3 - g_puddle * 0.2;
    }
  `,
  fragRough: /* glsl */ `
    roughnessFactor = mix(0.88, 0.16, g_puddle);
  `,
  fragNormal: /* glsl */ `
    normal = n_bumpView(-vViewPosition, normal, g_h, 0.025);
  `,
});

// 8. Riverbed Submerged Gravel, Silt and Stones with Caustic Light
PROC.riverbedStonesDetailed = () => ({
  fragHead: /* glsl */ `float g_h;`,
  fragColor: /* glsl */ `
    {
      vec3 wp = vWPos;
      float t = uTime * 1.5;
      float pebbles = n_snoise3(wp * 16.0) * 0.5 + 0.5;
      float largeStones = n_fbm3(wp * 2.2, 3);
      
      // Mixed mineral colors: basalt slate, ochre pebble, granite fleck
      vec3 slate = vec3(0.10, 0.11, 0.12);
      vec3 ochre = vec3(0.18, 0.14, 0.09);
      vec3 granite = vec3(0.22, 0.21, 0.19);
      vec3 col = mix(slate, ochre, pebbles);
      col = mix(col, granite, largeStones * 0.4);
      
      // Dynamic sunlight caustics filtering through river surface
      float c1 = sin(wp.x * 2.8 + wp.z * 1.6 - t * 1.8);
      float c2 = cos(wp.x * 1.9 - wp.z * 2.5 + t * 2.1);
      float caustics = pow(max(0.0, (c1 + c2) * 0.5 + 0.3), 3.0) * 0.45;
      col += vec3(0.35, 0.50, 0.45) * caustics;
      
      diffuseColor.rgb = col;
      g_h = pebbles * 0.5 + largeStones * 0.3;
    }
  `,
  fragRough: /* glsl */ `
    roughnessFactor = 0.48;
  `,
  fragNormal: /* glsl */ `
    normal = n_bumpView(-vViewPosition, normal, g_h, 0.02);
  `,
});

// Backwards-compatible aliases
PROC.rainforestRock = PROC.rockDetailed;
PROC.cliffRock = () => PROC.rockDetailed('basalt', '0.0', '0.5');
PROC.rainforestBark = () => PROC.treeBarkDetailed('dry');
PROC.tropicalLeaf = PROC.tropicalLeafPhys;
PROC.waterfallFoam = PROC.waterfallFoamDetailed;
PROC.riverWaterSurface = PROC.riverWaterPhys;
PROC.wetRiverbed = PROC.riverbedStonesDetailed;

// ---------------------------------------------------------------------------
// The shared material library. Use these instances (they are shared so the
// renderer compiles each program once). Create variants with std()/phys()+PROC.
// ---------------------------------------------------------------------------
let _lib = null;
export function materials() {
  if (_lib) return _lib;
  const M = {};
  
  // Existing materials preserved
  M.lacquerRed = phys({ color: 0xffffff, roughness: 0.5, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4 }, PROC.lacquer());
  M.lacquerRedDark = phys({ color: 0xffffff, roughness: 0.55, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.5 }, PROC.lacquer('vec3(0.30, 0.040, 0.020)'));
  M.lacquerOrange = phys({ color: 0xffffff, roughness: 0.5, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4 }, PROC.lacquer('vec3(0.62, 0.13, 0.035)'));
  M.gold = std({ color: 0xffffff, roughness: 0.24, metalness: 1.0 }, PROC.gold());
  M.goldBright = std({ color: 0xffffff, roughness: 0.16, metalness: 1.0 }, PROC.gold('vec3(1.0, 0.76, 0.36)'));
  M.goldLeaf = std({ color: 0xffffff, roughness: 0.32, metalness: 1.0 }, PROC.gold('vec3(1.0, 0.72, 0.32)'));
  M.bronze = std({ color: 0xffffff, roughness: 0.4, metalness: 1.0 }, PROC.bronze());
  M.blackLacquer = phys({ color: new THREE.Color().setRGB(0.018, 0.016, 0.014), roughness: 0.3, metalness: 0, clearcoat: 1.0, clearcoatRoughness: 0.12 });
  M.roofTile = std({ color: 0xffffff, roughness: 0.42, metalness: 0.12 }, PROC.roofTile());
  M.plaster = std({ color: 0xffffff, roughness: 0.93, metalness: 0 }, PROC.plaster());
  M.granite = std({ color: 0xffffff, roughness: 0.8, metalness: 0 }, PROC.granite('0.55'));
  M.graniteMossy = std({ color: 0xffffff, roughness: 0.8, metalness: 0 }, PROC.granite('1.0', 'vec3(0.92, 0.95, 0.9)'));
  M.graniteClean = std({ color: 0xffffff, roughness: 0.75, metalness: 0 }, PROC.granite('0.12', 'vec3(1.08, 1.06, 1.03)'));
  M.woodRaw = std({ color: 0xffffff, roughness: 0.8, metalness: 0 }, PROC.wood('vec3(0.24, 0.16, 0.10)', 'x'));
  M.woodRawZ = std({ color: 0xffffff, roughness: 0.8, metalness: 0 }, PROC.wood('vec3(0.24, 0.16, 0.10)', 'z'));
  M.woodFloorX = phys({ color: 0xffffff, roughness: 0.32, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2 }, PROC.wood('vec3(0.16, 0.075, 0.04)', 'x'));
  M.woodFloorZ = phys({ color: 0xffffff, roughness: 0.32, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.2 }, PROC.wood('vec3(0.16, 0.075, 0.04)', 'z'));
  M.woodDark = std({ color: 0xffffff, roughness: 0.6, metalness: 0 }, PROC.wood('vec3(0.07, 0.04, 0.025)', 'y'));
  M.latticeGreen = std({ color: 0xffffff, roughness: 0.6, metalness: 0 }, PROC.lacquer('vec3(0.05, 0.16, 0.11)'));
  M.whitePaint = std({ color: new THREE.Color().setRGB(0.80, 0.78, 0.72), roughness: 0.75 });
  M.lanternGlow = glow([1.0, 0.58, 0.24], 9);
  M.lanternGlowSoft = glow([1.0, 0.62, 0.30], 4);
  M.flame = glow([1.0, 0.62, 0.25], 40);

  // --- Phase 2 Rainforest Materials Library ---------------------------------
  // Bark Family
  M.barkDry = std({ color: 0xffffff, roughness: 0.88, metalness: 0 }, PROC.treeBarkDetailed('dry'));
  M.barkWet = std({ color: 0xffffff, roughness: 0.25, metalness: 0.02 }, PROC.treeBarkDetailed('wet'));
  M.barkMossy = std({ color: 0xffffff, roughness: 0.95, metalness: 0 }, PROC.treeBarkDetailed('mossy'));
  M.barkRoot = std({ color: 0xffffff, roughness: 0.75, metalness: 0 }, PROC.treeBarkDetailed('root'));
  M.rainforestBark = M.barkDry;

  // Rock & Cliff Family
  M.rock = std({ color: 0xffffff, roughness: 0.84, metalness: 0.02 }, PROC.rockDetailed('basalt', '0.0', '0.5'));
  M.rockMossy = std({ color: 0xffffff, roughness: 0.92, metalness: 0.01 }, PROC.rockDetailed('basalt', '0.0', '0.95'));
  M.rockWet = std({ color: 0xffffff, roughness: 0.14, metalness: 0.06 }, PROC.rockDetailed('basalt', '1.0', '0.3'));
  M.cliffDark = std({ color: 0xffffff, roughness: 0.82, metalness: 0.02 }, PROC.rockDetailed('basalt', '0.2', '0.4'));
  M.cliffSplash = std({ color: 0xffffff, roughness: 0.12, metalness: 0.08 }, PROC.rockDetailed('basalt', '1.0', '0.25'));
  M.cliffSedimentary = std({ color: 0xffffff, roughness: 0.85, metalness: 0.02 }, PROC.rockDetailed('sedimentary', '0.0', '0.35'));
  M.graniteDry = std({ color: 0xffffff, roughness: 0.78, metalness: 0.02 }, PROC.rockDetailed('granite', '0.0', '0.4'));
  M.graniteWet = std({ color: 0xffffff, roughness: 0.16, metalness: 0.06 }, PROC.rockDetailed('granite', '1.0', '0.3'));
  M.cliff = M.cliffDark;

  // Soil & Ground Family
  M.soilDamp = std({ color: 0xffffff, roughness: 0.88, metalness: 0 }, PROC.soilAndMudDetailed(false));
  M.soilMud = std({ color: 0xffffff, roughness: 0.22, metalness: 0.04 }, PROC.soilAndMudDetailed(true));
  M.riverbedGravel = std({ color: 0xffffff, roughness: 0.48, metalness: 0 }, PROC.riverbedStonesDetailed());
  M.riverbed = M.riverbedGravel;

  // Tropical Foliage Family
  M.leafBroad = phys({
    color: 0xffffff, roughness: 0.26, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.25,
    side: THREE.DoubleSide,
  }, PROC.tropicalLeafPhys('broadleaf', '0.85'));
  M.leafPalm = phys({
    color: 0xffffff, roughness: 0.32, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.32,
    side: THREE.DoubleSide,
  }, PROC.tropicalLeafPhys('palm', '0.65'));
  M.leafFern = phys({
    color: 0xffffff, roughness: 0.35, metalness: 0, clearcoat: 0.28, clearcoatRoughness: 0.38,
    side: THREE.DoubleSide,
  }, PROC.tropicalLeafPhys('fern', '0.90'));
  M.leafMonstera = phys({
    color: 0xffffff, roughness: 0.24, metalness: 0, clearcoat: 0.65, clearcoatRoughness: 0.22,
    side: THREE.DoubleSide,
  }, PROC.tropicalLeafPhys('broadleaf', '0.80'));
  M.tropicalLeaf = M.leafBroad;
  M.palmFrond = M.leafPalm;
  M.fern = M.leafFern;

  // Water & Waterfall Family
  M.waterfall = std({
    color: 0xffffff, roughness: 0.18, metalness: 0.05,
    side: THREE.DoubleSide,
  }, PROC.waterfallFoamDetailed());
  M.whitewaterFoam = std({
    color: 0xffffff, roughness: 0.45, metalness: 0.02,
    side: THREE.DoubleSide,
  }, PROC.waterfallFoamDetailed());
  M.plungeFoam = phys({
    color: 0xffffff, roughness: 0.12, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.1,
    transparent: true, opacity: 0.92,
    side: THREE.DoubleSide,
  }, PROC.plungePoolFoam());
  M.riverWater = phys({
    color: 0xffffff, roughness: 0.035, metalness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.06,
    transparent: true, opacity: 0.90,
    side: THREE.DoubleSide,
  }, PROC.riverWaterPhys());

  _lib = M;
  return M;
}

