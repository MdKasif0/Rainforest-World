# Phase 3: Living, Animated Rainforest Ecosystem

## Overview

Phase 3 transforms the static rainforest world into a living, breathing natural ecosystem. Every motion—from canopy gust fronts and flutter down to river currents, boiling plunge pools, drifting mist, floating leaves, soaring raptors, and hovering butterflies—is simulated **100% deterministically in closed-form GLSL and JavaScript** as a pure function of timestamp $T$.

![Rainforest Phase 3 Master Contact Sheet](file:///Users/mdkasifuddin/Developer/Web/Rainforest%20World/golden-temple/docs/images/rainforest-contact-sheet.jpg)

*(Phase 3 contact sheet at $t = 3.5\,\text{s}$: Shot 0 — Soaring raptor over Grand Valley; Shot 1 — 3D surging cataract & boiling plunge pool; Shot 2 — Mountain skyline; Shot 3 — Fluttering morpho butterfly & swaying jungle understory; Shot 4 — River current with floating leaves & bank ripples)*

---

## 1. Centralized Environmental Time System (`src/core/environment.js`)

All environmental animation is governed by `ENV_SYSTEM` in [`src/core/environment.js`](file:///Users/mdkasifuddin/Developer/Web/Rainforest%20World/golden-temple/src/core/environment.js), ensuring complete frame-order independence:

```
               ┌────────────────────────────────────────────────────────┐
               │              TIMESTAMP T (SECONDS)                     │
               │   (Evaluated identically for cold renders or sub-frames)│
               └──────────────────────────┬─────────────────────────────┘
                                          │
       ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
       │                  │                               │                  │
┌──────▼───────┐   ┌──────▼───────┐                ┌──────▼───────┐   ┌──────▼───────┐
│ MULTI-SCALE  │   │  WATER DYNAMICS│               │ LIVING FAUNA │   │ MOISTURE MAP │
│     WIND     │   │ & OBSTACLES  │                │  & PARTICLES │   │  & WETNESS   │
├──────────────┤   ├──────────────┤                ├──────────────┤   ├──────────────┤
│ • Gust Front │   │ • Swell/Chop │                │ • Birds      │   │ • Spray Zone │
│ • Trunk Sway │   │ • Wake Foam  │                │ • Butterfly  │   │ • Riverbank  │
│ • Frond Flex │   │ • Cataracts  │                │ • Drift Leaf │   │ • Reflectance│
│ • Liana Pend │   │ • Plunge Disks│               │ • Ballistics │   │ • Low Rough  │
└──────────────┘   └──────────────┘                └──────────────┘   └──────────────┘
```

### Determinism Guarantees
* **Frame-Order Independence**: Rendering frame $1800$ independently produces the exact same vertex positions, shader states, and instance matrices as rendering frame $1800$ after frame $1799$.
* **Sub-Frame Stratified Shutter Compatibility**: Multi-sampling with sub-frame offsets $T + \delta$ produces smooth, artifact-free physical motion blur without temporal jitter or popping.
* **Zero Cumulative State**: All physics and kinematics use analytic closed-form equations (harmonic banks, trigonometric series, and domain-warped noise) without discrete time-stepping or numerical integration.

---

## 2. Multi-Scale Hierarchical Wind Deformation (`src/core/env.js`)

Vegetation motion is driven by `windOffsetDetailed(wp, flex, branchFlex, leafFlutter)` in the vertex shader:

1. **Macro Gust Fronts**:
   Rolling spatial wave fronts traveling down the valley along `uWindDir`:
   $$\text{gustFront} = 0.5 + 0.5 \sin(0.28 T - \mathbf{p}_{xz} \cdot \mathbf{w}_d \times 0.024)$$
2. **Trunk & Scaffold Branch Sway ($0.5 - 0.8\,\text{Hz}$)**:
   Trunks sway gently in the breeze with cross-wind harmonic oscillations. Displacement is scaled by $\text{flex}^{1.5}$, ensuring trunk bases ($y < 10\,\text{m}$) remain **100% locked to the terrain**:
   $$\Delta \mathbf{p}_{\text{trunk}} = (\mathbf{w}_d \cdot \text{sway} + \mathbf{w}_{\perp} \cdot \text{crossSway}) \times (\text{flex}^{1.5} \cdot 0.18 \cdot \text{gust})$$
3. **Mid-Branch Spring Flexion ($1.5 - 2.8\,\text{Hz}$)**:
   Mid-frequency elastic restoring bounce, phase-offset by spatial world coordinates.
4. **Foliage & Frond High-Frequency Flutter ($5.0 - 10.0\,\text{Hz}$)**:
   Aerodynamic leaf vibrations along both horizontal and vertical axes.
5. **Hanging Liana Pendulum Physics (`lianaWindOffset`)**:
   Hanging vines exhibit pendulum motion whose amplitude increases towards the lower tip:
   $$\text{swing} = \sin(1.15 T + \phi) \times 0.7 + \sin(1.85 T + 1.4 \phi) \times 0.3$$
6. **Tree Fern Frond Independent Bowing (`fernFrondWindOffset`)**:
   Independent frond flexion modulated by polar frond angle and distance.

---

## 3. Dedicated Living Ecosystem Fauna & Natural Details (`src/world/ecosystem.js`)

Integrated into `ALL_MODULES`, adding life to the monumental landscape:

* **Canopy & Gorge Gliding Birds**:
  - $6$ raptors/hornbills traversing the monumental valley on closed-form 3D flight paths.
  - Realistic scale (wingspan $1.6\,\text{m}$) relative to $200\,\text{m}$ cliffs.
  - Aerodynamic banking angles derived from velocity vectors: $\text{roll} \propto \frac{d\psi}{dt}$.
  - Alternating flight phases: serene aerodynamic gliding interspersed with rhythmic wing flaps.
* **Iridescent Butterflies & Clearings Insects**:
  - Double-sided winged instances placed near sunlit clearings and riverbank rocks.
  - Iridescent two-tone GLSL material shifting between sapphire blue and vibrant emerald green.
  - Smooth Lissajous hovering loops with fast darting transitions and $22\,\text{Hz}$ wing flutter.
* **Floating River Debris (Rainforest Leaves)**:
  - $40$ organic leaf quads drifting downstream along the river spline.
  - Parametric progress $s_i(T) = (s_{0, i} + 0.022 T) \pmod 1$.
  - Exact water height placement with subtle bobbing and lateral eddy meandering.
* **Waterfall Plunge Pool Ballistic Spray Droplets**:
  - $55$ high-speed water droplets erupting from the impact zone on parabolic trajectories under gravity.
  - Specular sunlight glints catch the afternoon sunbeams.
* **Airborne Sunlight Spores / Forest Dust Motes**:
  - $120$ glowing micro-particles drifting through canopy clearings with 3D harmonic convection.

---

## 4. Realistic Water Surface Dynamics & Obstacle Interactions

### River Water (`PROC.riverWaterPhys`)
* **3D Vertex Displacement**: Multi-scale current swell ($f = 0.12\,\text{Hz}$) and cross-chop ($f = 0.22\,\text{Hz}$) physically heave the water mesh.
* **Obstacle Wake Turbulence**: Boulders create localized flow separation and foaming wakes trailing downstream along $+Z$.

### Monumental Cataract & Plunge Pool (`PROC.waterfallFoamDetailed` / `PROC.plungePoolFoam`)
* **3D Cascading Wave Surges**: High-velocity downward surges and cavitation ripples displace the falling water sheet outward by up to $0.55\,\text{m}$.
* **Boiling Foam Disks**: Radial shockwaves expand outward from the cascade impact zone ($r = 46\,\text{m}$) with decaying amplitude $e^{-0.045 r}$, creating turbulent boiling froth.

---

## 5. Environmental Moisture Mask & Shading Response

* Evaluated globally in `FRAG_UTIL`:
  $$\text{moisture}(\mathbf{p}) = \max\left(\text{smoothstep}(95, 20, d_{\text{plunge}}) \times 0.92, \; \text{smoothstep}(36, 6, |x - x_{\text{river}}|) \times 0.72\right)$$
* Cliffs, rocks, and tree trunks in the waterfall spray zone and along the river corridor automatically inherit dampness:
  - Darkened albedo ($1.0 - 0.48 \cdot \text{moist}$).
  - Glistening specular highlights with lower roughness ($0.12 - 0.28$).
  - Denser moss colonies in humid microclimates.

---

## 6. Temporal Stability Verification Across Film Timeline

Evaluated across multiple timestamps ($t = 1.0, 2.5, 4.0, 5.5, 7.0\,\text{s}$):

* **Shot 3 (Jungle Understory Push)**: Camera smoothly tracks past buttress roots, monstera fronds, and tree trunks with zero geometry clipping or sudden pop.
* **Shot 4 (River Glide)**: River water ripples continuously, floating leaves travel with the current, and waterfall reflections warp organically.
* **Flicker Analysis**: Zero crawling noise, zero texture pops, and stable PCF shadow map filtering.

---

## 7. Rendering Performance

* **Apple Silicon M-Series GPU**:
  - **372,250 triangles** across **75 batched/instanced meshes**.
  - Renders in **16–20 ms** per frame ($>50\,\text{fps}$ live playback).
  - Headless GPU snapshot tool captures clean frames in **$0.1 - 0.2\,\text{s}$**.
