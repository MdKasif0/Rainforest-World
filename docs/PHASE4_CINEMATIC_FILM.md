# Phase 4: 70-Second Cinematic Rainforest Film

## Overview & Cinematography Philosophy

Phase 4 directs and engineers the definitive **70-second cinematic film** of the procedural Rainforest World. Inspired by modern high-end natural history filmmaking (BBC *Planet Earth III*, *Dynasties*, National Geographic *Hostile Planet*), the camera motions reject video-game style abrupt transitions, mechanical cuts, or artificial camera shakes. Instead, the film employs **10 continuous, masterfully composed 7-second shots**, designed to convey vast geographical scale, geological grandeur, and the delicate biodiversity of the living tropical biome.

Every camera path is computed through deterministic cubic Catmull-Rom splines, logarithmic focus-distance tracking, smooth cubic polynomial velocity easing, and dynamic physical lens simulation.

```
Total Film Duration: 70.0 Seconds
Exact Shot Count:    10 Continuous Shots (7.0 Seconds each)
Frame Rate:          60.0 FPS
Total Output Frames: 4,200 Frames
Master Resolution:   1920 × 1080 Full HD (or 3840 × 2160 4K Ultra HD)
```

---

## Complete 10-Shot Breakdown

![Rainforest Film 10-Shot Contact Sheet](file:///Users/mdkasifuddin/Developer/Web/Rainforest%20World/golden-temple/docs/images/rainforest-film-contact-sheet.jpg)

### Shot 00: The Grand Reveal ($00:00 - 00:07$, Frames 0 – 419)
- **Concept & Mood**: A breathtaking elevated establishing shot advancing gently through morning mist down the entire valley gorge toward the distant 212-meter waterfall.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[85, 130, 250]`, Look `[-48, 85, -280]`, 26mm focal, $f/8.0$, Focus $400\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[55, 115, 185]`, Look `[-48, 88, -285]`, 28mm focal, $f/8.0$, Focus $360\,\text{m}$.
- **Framing & Depth**: Foreground canopy crowns sweep below while middleground river meanders lead the eye toward the vertical ribbon of the 212m cascade framed between misty basalt cliffs.
- **Optics & Post**: Wide 26–28mm field of view, crisp deep-focus hyperfocal range, atmospheric humidity fog `0.78`, subtle anamorphic bloom `0.05`.

---

### Shot 01: Above the Canopy ($07:00 - 14:00$, Frames 420 – 839)
- **Concept & Mood**: A graceful, high-altitude aerial lateral glide skimming over the undulating canopy tops, catching glimpses of the silver-turquoise river below between emergent crown gaps.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[85, 116, 60]`, Look `[-25, 55, -140]`, 28mm focal, $f/6.3$, Focus $220\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[30, 105, 0]`, Look `[-38, 55, -190]`, 30mm focal, $f/6.3$, Focus $200\,\text{m}$.
- **Framing & Depth**: High-clearance flight ($89\,\text{m}$ terrain clearance) across emergent tree crowns (Kapok, Dipterocarp) revealing the intricate organic texture of tropical foliage under the morning sun.

---

### Shot 02: Through the Forest ($14:00 - 21:00$, Frames 840 – 1259)
- **Concept & Mood**: An intimate, low-altitude dolly through the sub-canopy and understory floor. Flying past massive mossy buttress roots and broad monstera fronds, catching distant glimpses of the roaring cascade framed between tree trunks.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[-48, 22.0, 12]`, Look `[-48, 48, -275]`, 30mm focal, $f/3.5$, Focus $14\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[-42, 21.2, -18]`, Look `[-48, 52, -280]`, 28mm focal, $f/4.5$, Focus $18\,\text{m}$.
- **Framing & Depth**: Shallow depth of field ($f/3.5$) with realistic circle-of-confusion bokeh, atmospheric dust motes, fluttering iridescent Blue Morpho butterflies, and filtered shafts of sunlight.

---

### Shot 03: The River Journey ($21:00 - 28:00$, Frames 1260 – 1679)
- **Concept & Mood**: A low tracking shot gliding directly downstream over the turquoise river, skimming over water ripples, submerged boulders, wet gravel shoals, and lush riverbanks.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[12, 24.2, -55]`, Look `[-12, 25.8, -135]`, 26mm focal, $f/5.6$, Focus $75\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[-10, 25.4, -115]`, Look `[-34, 27.2, -195]`, 28mm focal, $f/5.6$, Focus $85\,\text{m}$.
- **Framing & Depth**: Camera altitude just $5 - 6\,\text{m}$ above the water surface, capturing the sparkling fresnel reflections, floating debris, and overhanging palm fronds.

---

### Shot 04: The Waterfall Approach ($28:00 - 35:00$, Frames 1680 – 2099)
- **Concept & Mood**: A dramatic forward dolly advancing into the gorge, steadily tilting upward from the churning plunge pool to take in the staggering 212-meter drop of the primary cataract.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[-50, 31.0, -170]`, Look `[-50, 75, -280]`, 24mm focal, $f/5.6$, Focus $105\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[-50, 32.5, -205]`, Look `[-50, 155, -295]`, 22mm focal, $f/5.6$, Focus $90\,\text{m}$.
- **Framing & Depth**: Expansive 22mm wide lens. Heavy volumetric spray fog (`vol: 0.22`, `volDensity: 0.006`) enveloping the lens as the camera peers straight up into the sheer vertical volume of falling water.

---

### Shot 05: The Plunge Pool ($35:00 - 42:00$, Frames 2100 – 2519)
- **Concept & Mood**: An intense orbital tracking arc around the violent foam basin, spray vortex, and water-sheened basalt boulders flanking the plunge pool.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[-75, 33.5, -225]`, Look `[-48, 85, -275]`, 26mm focal, $f/5.6$, Focus $55\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[-25, 34.0, -220]`, Look `[-48, 95, -278]`, 26mm focal, $f/5.6$, Focus $60\,\text{m}$.
- **Framing & Depth**: Camera traces an organic $50\,\text{m}$ lateral arc around the pool center, showcasing procedural white foam churn, spray mist particles, and glistening wet rock shaders.

---

### Shot 06: The Cliffside Ascent ($42:00 - 49:00$, Frames 2520 – 2939)
- **Concept & Mood**: A controlled, high-speed vertical crane ascent climbing $90\,\text{m}$ up the eastern basalt escarpment, revealing the cataract lip, soaring birds, and mountain horizon.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[20, 60, -210]`, Look `[-45, 95, -270]`, 24mm focal, $f/6.3$, Focus $85\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[5, 150, -225]`, Look `[-45, 185, -295]`, 24mm focal, $f/6.3$, Focus $85\,\text{m}$.
- **Framing & Depth**: Ascends alongside columnar jointed volcanic basalt, climbing from the dark river canyon into radiant high-altitude sunlight.

---

### Shot 07: The Mountain Panorama ($49:00 - 56:00$, Frames 2940 – 3359)
- **Concept & Mood**: An ultra-high-altitude aerial sweep along the northern perimeter, framing the rugged sedimentary mountain skyline, geological strata, and the vast jungle expanse below.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[45, 330, 50]`, Look `[-30, 460, -840]`, 22mm focal, $f/8.0$, Focus $900\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[-45, 340, 20]`, Look `[-55, 470, -860]`, 24mm focal, $f/8.0$, Focus $900\,\text{m}$.
- **Framing & Depth**: Camera altitude $330 - 340\,\text{m}$ ($319\,\text{m}$ terrain clearance), extreme telephoto hyperfocal clarity, layered mountain ridge silhouettes fading into Rayleigh atmospheric scattering.

---

### Shot 08: Sunlight Through the Canopy ($56:00 - 63:00$, Frames 3360 – 3779)
- **Concept & Mood**: Drifting up the open river corridor gazing upward toward the tropical sun, capturing radiant volumetric godrays, lens flares, and emerald leaf backlighting.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[-15, 38, -60]`, Look `[-28, 62, 40]`, 30mm focal, $f/4.0$, Focus $65\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[-22, 44, -20]`, Look `[-32, 68, 70]`, 28mm focal, $f/4.5$, Focus $75\,\text{m}$.
- **Framing & Depth**: Forward-scattering solar alignment produces lush golden light shafts, glowing translucent leaf margins, and atmospheric sunlit mist.

---

### Shot 09: The Final Master Shot ($63:00 - 70:00$, Frames 3780 – 4199)
- **Concept & Mood**: The grand, contemplative finale. A wide master composition framing the complete rainforest ecosystem — mountains, cascading waterfall, winding river, and canopy — gently pulling back and decelerating into the tropical mist.
- **Camera Path**:
  - Key 0 ($t = 0.0\,\text{s}$): Position `[25, 95, 185]`, Look `[-48, 92, -280]`, 24mm focal, $f/8.0$, Focus $400\,\text{m}$.
  - Key 1 ($t = 7.0\,\text{s}$): Position `[35, 115, 225]`, Look `[-48, 90, -285]`, 24mm focal, $f/8.0$, Focus $420\,\text{m}$.
- **Framing & Depth**: Graceful cubic ease-out to zero velocity, leaving the viewer immersed in the peaceful living heartbeat of the procedural rainforest.

---

## Kinematic Verification & Collision Diagnostics

The camera trajectories were quantitatively verified via `tools/camcheck.mjs`, computing speed, acceleration, jerk, angular velocity, and analytical ground clearance at 60 FPS across all 4,200 frames:

```
================================================================================
CINEMATIC CAMERA DIAGNOSTICS — 10 SHOTS (70s @ 60 FPS)
================================================================================
SHOT 00: Speed avg 10.4 m/s | Turn avg 0.33°/s | Min Clearance 105.6m  ✓ PASS
SHOT 01: Speed avg 11.7 m/s | Turn avg 1.26°/s | Min Clearance  89.0m  ✓ PASS
SHOT 02: Speed avg  4.4 m/s | Turn avg 0.29°/s | Min Clearance   6.6m  ✓ PASS
SHOT 03: Speed avg  9.1 m/s | Turn avg 0.02°/s | Min Clearance   6.2m  ✓ PASS
SHOT 04: Speed avg  5.0 m/s | Turn avg 4.56°/s | Min Clearance   9.0m  ✓ PASS
SHOT 05: Speed avg  7.2 m/s | Turn avg 5.13°/s | Min Clearance  14.5m  ✓ PASS
SHOT 06: Speed avg 13.2 m/s | Turn avg 1.56°/s | Min Clearance  29.7m  ✓ PASS
SHOT 07: Speed avg 13.6 m/s | Turn avg 0.59°/s | Min Clearance 319.3m  ✓ PASS
SHOT 08: Speed avg  5.9 m/s | Turn avg 0.26°/s | Min Clearance  22.1m  ✓ PASS
SHOT 09: Speed avg  6.5 m/s | Turn avg 0.35°/s | Min Clearance  89.5m  ✓ PASS
================================================================================
✓ ALL 10 SHOTS PASSED: Continuous, collision-free, cinematic trajectories!
================================================================================
```

---

## Offline Rendering & Encoding Pipeline

The offline rendering engine (`tools/render.mjs`) renders frame-accurate, uncompressed PNG sequences using headless Chromium with deterministic time stepping (`uTime = frame / 60.0`):

### 1. Verification Before Render
```bash
# Verify camera kinematics & terrain clearance
node tools/camcheck.mjs

# Generate multi-shot contact sheet preview (10 shots × 3 timestamps)
node tools/sheet.mjs --shots 0,1,2,3,4,5,6,7,8,9 --t 0.5,3.5,6.5 --tag film_10shots_review
```

### 2. Single Shot Preview Render
```bash
# Render Shot 0 (420 frames at 1080p60)
node tools/render.mjs --shot 0 --w 1920 --h 1080 --fps 60
```

### 3. Full 70-Second Film Offline Render
```bash
# Render all 10 shots (4,200 frames total at 1920x1080)
node tools/render.mjs --all --w 1920 --h 1080 --fps 60
```

### 4. Encoding to Apple ProRes & H.265 Master
```bash
# Assemble complete 70-second cinematic film into ProRes 422 HQ
ffmpeg -r 60 -i out/film/frame_%05d.png -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le out/rainforest_world_1080p60_prores.mov

# High-efficiency distribution master in H.265 (CRF 16)
ffmpeg -r 60 -i out/film/frame_%05d.png -c:v libx265 -crf 16 -preset slow -pix_fmt yuv420p10le out/rainforest_world_1080p60.mp4
```
