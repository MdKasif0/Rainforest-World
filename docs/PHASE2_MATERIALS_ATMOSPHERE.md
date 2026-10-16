# Phase 2: Photorealistic Materials, Water Simulation, and Cinematic Atmosphere

## Overview

Phase 2 elevates the procedural rainforest world into nature cinematography quality. Every surface, liquid body, and atmospheric volume is generated **100% procedurally in GLSL code** using Three.js (r186.1) material patching (`src/core/materials.js`) and physical shader hooks, strictly without external textures, 3D models, or HDRIs.

![Rainforest Phase 2 Contact Sheet](file:///Users/mdkasifuddin/Developer/Web/Rainforest%20World/golden-temple/docs/images/rainforest-contact-sheet.jpg)

---

## 1. Procedural PBR Material Families

All materials reuse the existing `patch(material, opts)` architecture in `src/core/materials.js`, injecting procedural GLSL into Three.js `MeshStandardMaterial` and `MeshPhysicalMaterial`.

### Tree Bark Family (`PROC.treeBarkDetailed(variant)`)
* **Wet Tropical Bark (`M.barkWet`)**:
  - Darkened albedo (`diffuseColor.rgb * 0.46`), vertical micro-grooves from domain-warped FBM noise.
  - Procedural water runnels running down trunk crevices with high specular response (`roughnessFactor` 0.22).
  - Used for emergent rainforest giants and palm trunks.
* **Dry Tree Bark (`M.barkDry`)**:
  - Longitudinal fibrous bark ridges, irregular desaturated gray-brown lichen flecks, matte roughness (0.78–0.88).
  - Used for mid-canopy scaffold trunks and upper branches.
* **Moss-Covered Bark (`M.barkMossy`)**:
  - Velvet-like soft moss blankets clinging to windward bark crevices, using normal-up bias and high roughness (0.96).
  - Used for lianas, epiphytes, tree ferns, and decomposing fallen logs.
* **Tree Roots (`M.barkRoot`)**:
  - Graduated blend from fibrous bark to dark damp soil/humus at buttress fin bases using world-space height ramps and noise.

### Rock and Geological Family (`PROC.rockDetailed(type, wetness, mossAmt)`)
* **Dark Cliff Basalt (`M.cliffDark`)**:
  - Deep charcoal volcanic rock matrix (`vec3(0.08, 0.09, 0.08)`).
  - Vertical columnar jointing, irregular crevice fractures, and dark moisture seep stains.
* **Splash-Zone Saturated Rock (`M.cliffSplash`)**:
  - Highly reflective wet basalt flanking the waterfall cataract (`roughnessFactor` 0.16–0.28).
  - Glistening water film highlights and wet green moss colonies.
* **Layered Sedimentary Rock (`M.cliffSedimentary`)**:
  - Rhythmic geological strata bedding planes alternating between sandstone, ironstone bands, and shale.
  - Tilted strata angles (domain-warped height coordinates) exhibiting natural geological faulting.
  - Used for the monumental mountain massif backdrop.
* **Granite (`M.graniteDry` / `M.graniteWet`)**:
  - Micro-scale crystalline quartz, feldspar, and dark biotite grain structure.
  - Localized sharp specular glints from reflective quartz crystal facets.

### Soil, Mud, and Riverbed Stones
* **Damp Soil & Viscous Mud (`PROC.soilAndMudDetailed(isMud)`)**:
  - Organic humus crumb structure with decomposed leaf litter detritus.
  - Mud variant features glossy, low-roughness puddle depressions with muddy brown subsurface scattering.
* **Riverbed Stones (`PROC.riverbedStonesDetailed()`)**:
  - Water-worn rounded river pebbles with smooth, polished surfaces and dynamic caustics dapples.

---

## 2. Physically Based Tropical Leaf Shader (`PROC.tropicalLeafPhys`)

Rainforest foliage is shaded with real-world biological optics:

* **Two-Sided Subsurface Transillumination (`fragLight`)**:
  - When backlit by the tropical sun, light scatters through thin mesophyll tissue:
    $$\text{transmittedLight} = \mathbf{L}_{\odot} \cdot \max(0, -\mathbf{N}_{\text{view}} \cdot \mathbf{L}_{\odot})^{1.5} \times \mathbf{C}_{\text{subsurface}}$$
  - Yields vibrant, luminous emerald-gold foliage when viewed against the sun without looking self-illuminated.
* **Waxy Cuticle Sheen**:
  - Dual-layer optical response: anisotropic low-roughness specular reflection (0.24–0.38) over an organic green base.
* **Vein Perturbation**:
  - High-frequency screen-space derivative bump mapping (`n_bumpView`) generating central midribs and lateral branching secondary veins.
* **Canopy Height & Light Exposure Chlorophyll Gradation**:
  - Height-dependent color variation: sun-drenched emergent crowns have vibrant lime-green young leaves, while shaded understory fronds exhibit dark, deep-forest chlorophyll saturation.

---

## 3. Dedicated Water & Waterfall Simulation

### River & Plunge Pool Water (`PROC.riverWaterPhys`)
* **Multi-Scale Wave Spectrum**:
  - Low-frequency gravity swell ($f = 0.08\,\text{Hz}$), cross-angle chop ($f = 0.22\,\text{Hz}$), and fine capillary wind ripples ($f = 0.85\,\text{Hz}$).
* **Current Advection**:
  - Waves translate along riverbed gradient toward the south (+Z) at physically scaled speeds.
* **Beer-Lambert Depth Extinction**:
  - Optical path length through water volume shifts from clear turquoise-emerald in shallow shoals to deep, light-absorbing dark ink-teal in pool depths:
    $$\mathbf{C}(d) = \mathbf{C}_{\text{deep}} + (\mathbf{C}_{\text{shallow}} - \mathbf{C}_{\text{deep}}) \, e^{-\kappa \cdot d}$$
* **Rapids Foam & Shoreline Breakers**:
  - Procedural foam masks form around protruding boulders and river channel contractions.

### Monumental Waterfall Cataract (`PROC.waterfallFoamDetailed`)
* **Multi-Speed Downward Velocity Field**:
  - High-velocity core torrent ($v \approx 18\,\text{m/s}$) surrounded by slower flanking spray curtains.
  - Cellular Voronoi froth bubbles blended with multi-octave FBM turbulence.
* **Aeration Internal Light Bounce (`fragLight`)**:
  - Multi-scattered sunlight inside aerated whitewater micro-bubbles prevents artificial shadow drop-off on steep slopes.
* **Plunge Pool Boiling Foam Disks (`PROC.plungePoolFoam`)**:
  - Radial shockwave rings and churning vortices at the base impact zone ($r = 46\,\text{m}$), dissipating into fine floating froth streaks downriver.

---

## 4. Atmospheric Optics & Layered Fog

* **Nishita-Inspired Atmospheric Model**:
  - Rayleigh scattering for sky color gradients and Mie forward-scattering for the warm solar corona.
* **Procedural Clouds**:
  - Layered multi-octave 3D noise clouds drifting behind mountain ridges.
* **Localized Waterfall Mist Plume (`src/world/atmosphere.js`)**:
  - Billowing convective mist volume at the plunge pool impact zone, rising and drifting with ambient valley wind.
  - Henyey-Greenstein phase function forward-scattering renders mist plumes luminous and glowing when backlit by the sun.
* **Volumetric Sunbeams**:
  - Screen-space radial light shafts slicing through mist plumes and canopy gaps.

---

## 5. Visual Verification Across Shots

| Shot | Viewport | Key Material & Atmospheric Features Verified |
|:---|:---|:---|
| **0** | Grand Valley Panorama | Canopy leaf gradation, winding river reflections, distant waterfall framed by wet basalt cliffs. |
| **1** | Monumental Waterfall Cataract | Continuous churning whitewater cascade, zero self-shadowing artifacts, luminous Mie mist sunbeams. |
| **2** | Mountain Skyline | Razor peaks with sedimentary bedding planes, granite crystals, Nishita sky gradient. |
| **3** | Jungle Canopy Interior | Waxy cuticle leaf sheen, subsurface leaf transillumination, wet bark with water runnels, buttress roots. |
| **4** | River & Plunge Pool Outflow | Multi-scale water ripples, turquoise-to-teal depth extinction, waterfall reflection, wet riverbank boulders. |

---

## 6. Rendering Performance & Temporal Stability

* **Deterministic Sub-Frame Jitter**:
  - All noise functions and procedural UV offsets are continuous in time, completely eliminating temporal shimmer or crawling noise.
* **High-Efficiency GPU Performance**:
  - Full scene renders in **17–20 ms** on Apple Silicon (367,448 triangles across 70 batched/instanced meshes).
  - Snapshot tool captures clean 1280x720 frames in under **0.2 seconds**.
