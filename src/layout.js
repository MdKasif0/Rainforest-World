// ---------------------------------------------------------------------------
// MASTER RAINFOREST SITE PLAN — The single source of truth for spatial layout.
// Coordinates: Metres. +X = East, +Y = Up, +Z = South (North is -Z).
//
// A monumental tropical rainforest valley flanked by steep jungle ridges,
// backed by towering mountain ranges in the North, with a 210m primary waterfall
// plunging into a mist-shrouded turquoise basin feeding a winding tropical river.
// ---------------------------------------------------------------------------

export const L = {
  // World bounds
  world: {
    minX: -1000,
    maxX: 1000,
    minZ: -1600,
    maxZ: 400,
  },

  // Valley floor parameters
  valley: {
    width: 850,             // Valley span east-to-west
    floorMinY: 5.0,         // River outflow elevation at south
    floorMaxY: 32.0,        // Upper valley elevation near waterfall base
    wallSteepness: 0.045,   // Flanking valley wall rise rate
    centerlineX: (z) => -15.0 * Math.sin(z * 0.006) + 10.0 * Math.cos(z * 0.012),
  },

  // Primary mountain range in the north / background
  mountains: {
    rangeMinZ: -1500,
    rangeMaxZ: -310,
    ridgeY: 480,            // Peak height in metres
    silhouetteScale: 1800,  // East-west span
    peaks: [
      { pos: [-120, 520, -980], radius: 360, shape: 'sharp' },
      { pos: [240, 470, -1120], radius: 420, shape: 'plateau' },
      { pos: [-420, 440, -860], radius: 340, shape: 'eroded' },
      { pos: [460, 410, -780], radius: 310, shape: 'sharp' },
      { pos: [30, 390, -620], radius: 260, shape: 'ridge' },
    ],
  },

  // Primary Waterfall: 212m drop from the high mountain amphitheater
  waterfall: {
    center: [-50, 0, -290],
    lip: {
      center: [-50, 240, -305],
      width: 36,            // Crest width at top
      depth: 16,
    },
    base: {
      center: [-50, 28, -270],
      width: 68,            // Widened cascade base
    },
    dropHeight: 212,        // 240m -> 28m
    flowSpeed: 20.0,        // m/s visual scroll speed
    amphitheaterRadius: 88, // Cirque wall radius around the falls
  },

  // Secondary waterfalls flowing into the valley
  secondaryWaterfalls: [
    {
      name: 'East Cascade',
      lip: [165, 135, -310],
      base: [145, 38, -280],
      width: 14,
      drop: 97,
    },
    {
      name: 'West Canyon Falls',
      lip: [-210, 115, -260],
      base: [-180, 34, -235],
      width: 11,
      drop: 81,
    },
  ],

  // Plunge Pool: Natural turquoise basin at the foot of the primary waterfall
  plungePool: {
    center: [-50, 28.0, -265],
    radiusX: 68,
    radiusZ: 62,
    waterY: 28.0,
    bottomY: 14.0,          // 14m deep plunge pool
    shoreTransition: 16,    // Shore blending margin
  },

  // Main Tropical River spline through the valley
  river: {
    waterYStart: 28.0,      // At plunge pool exit
    waterYEnd: 5.0,         // At southern outflow
    widthStart: 44,         // Width near plunge pool
    widthEnd: 72,           // Widens downstream
    depth: 4.8,
    // Waypoints along the river spline [x, waterY, z]
    waypoints: [
      [-50, 28.0, -205],
      [-32, 25.2, -140],
      [ 12, 21.8,  -70],
      [-14, 18.2,    5],
      [ 36, 14.6,   85],
      [  8, 11.0,  165],
      [-26,  7.8,  250],
      [  2,  5.0,  350],
    ],
  },

  // Cliffs & Gorge walls
  cliffs: {
    amphCenter: [-50, 0, -222],
    radius: 88,
    gorgeWallHeight: 255,
    amphitheaterCenter: [-50, 0, -320],
    strataTilt: 0.12,       // Geological stratification tilt in radians
  },

  // Giant Rainforest Trees (Emergent trees framing the cinematic view)
  framingTrees: [
    { pos: [-62, 19, -15], height: 58, trunkRadius: 2.8, type: 'emergent' },
    { pos: [55, 16, 45],  height: 52, trunkRadius: 2.4, type: 'emergent' },
    { pos: [-38, 14, 75], height: 46, trunkRadius: 2.1, type: 'broadleaf' },
    { pos: [78, 18, 110], height: 50, trunkRadius: 2.3, type: 'emergent' },
  ],

  // Ecological zones for specialized vegetation distribution
  zones: {
    sprayZone: { center: [-50, -275], radius: 140 }, // High moisture, ferns, moss, drenched foliage
    riverCorridor: { distance: 55 },                 // Palms, tree ferns, elephant ears, river boulders
    understoryDense: { minZ: -180, maxZ: 260 },      // Heavy ground cover, palms, broadleaf canopy
    ridgeForest: { minHeight: 90 },                  // Dense canopy cards covering mountain flanks
  },
};
