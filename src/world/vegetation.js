// ---------------------------------------------------------------------------
// VEGETATION — Lush, dense, photorealistic tropical rainforest ecosystem.
// Emergent giants with expansive interlocking umbrella canopies, curved
// buttress roots, scaffold branches, hanging lianas, arching palms,
// dense tree ferns, and understory carpets.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { makeRainforestAtlas } from './vegetation-tex.js';
import { createRainforestField } from './terrain-field.js';

export async function build(ctx) {
  const { L, M, geom, rng, mat } = ctx;
  const group = new THREE.Group();
  group.name = 'vegetation';

  const R = rng('rainforest-veg-photoreal-v2');
  const atlas = makeRainforestAtlas();
  const F = createRainforestField(L);

  function inWater(x, z) {
    if (F.getPoolDist(x, z) < 1.15) return true; // inside plunge pool basin
    const r = F.getRiverDist(x, z);
    if (r.dist < r.width * 0.5 + 3.5 && z > -220) return true; // inside river channel
    return false;
  }

  // Foliage Crossed-Quad Geometry helper (two interpenetrating quads at 70 degrees for true 3D volume)
  function makeFoliageVolume(quadX, quadY, w = 7.0, h = 7.0) {
    const geo = new THREE.BufferGeometry();
    const halfW = w * 0.5;
    
    // UV bounds in 2x2 atlas
    const u0 = quadX * 0.5;
    const v0 = 1.0 - (quadY + 1) * 0.5;
    const u1 = u0 + 0.5;
    const v1 = v0 + 0.5;

    // Plane 1: angled at +35 deg
    // Plane 2: angled at -35 deg
    const rad1 = 0.61;
    const rad2 = -0.61;
    const c1 = Math.cos(rad1) * halfW, s1 = Math.sin(rad1) * halfW;
    const c2 = Math.cos(rad2) * halfW, s2 = Math.sin(rad2) * halfW;

    const positions = [
      // Plane 1
      -c1, 0, -s1,   c1, 0, s1,   -c1, h, -s1,   c1, h, s1,
      // Plane 2
      -c2, 0, -s2,   c2, 0, s2,   -c2, h, -s2,   c2, h, s2,
    ];

    const uvs = [
      u0, v1,   u1, v1,   u0, v0,   u1, v0,
      u0, v1,   u1, v1,   u0, v0,   u1, v0,
    ];

    const indices = [
      0, 1, 2,  2, 1, 3,
      4, 5, 6,  6, 5, 7,
    ];

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // Single plane for flat fronds / large leaves
  function makeFoliageQuad(quadX, quadY, w = 6.0, h = 6.0) {
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h * 0.45, 0);
    const u0 = quadX * 0.5;
    const v0 = 1.0 - (quadY + 1) * 0.5;
    const u1 = u0 + 0.5;
    const v1 = v0 + 0.5;
    const uvs = geo.attributes.uv;
    uvs.setXY(0, u0, v1);
    uvs.setXY(1, u1, v1);
    uvs.setXY(2, u0, v0);
    uvs.setXY(3, u1, v0);
    geo.computeVertexNormals();
    return geo;
  }

  // Patched Foliage Material with wind sway and natural subsurface light transmission
  const foliageMat = mat.std({
    map: atlas,
    alphaTest: 0.38,
    roughness: 0.35,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: false,
  }, {
    vertexWorld: /* glsl */ `
      float flex = clamp((wPos4.y - 8.0) / 45.0, 0.0, 1.0);
      wPos4.xyz += windOffset(wPos4.xyz, flex);
    `,
    fragLight: /* glsl */ `
      float backDot = max(0.0, dot(-geometryNormal, directLight.direction));
      reflectedLight.directDiffuse += directLight.color * diffuseColor.rgb * backDot * 0.95;
    `,
  });

  // 1. TOWERING EMERGENT RAINFOREST TREES (Ceiba / Kapok Giants)
  const broadleafVol = makeFoliageVolume(0, 0, 11.5, 11.5);
  const emergentTrunkGeo = new THREE.CylinderGeometry(1.6, 3.4, 52, 12, 6);
  emergentTrunkGeo.translate(0, 26, 0);

  // Large spreading scaffold branch geometry (reaching out 14m)
  const scaffoldGeo = new THREE.CylinderGeometry(0.55, 1.1, 15, 8, 3);
  scaffoldGeo.translate(0, 7.5, 0);

  // Curved organic buttress root fin geometry
  const buttressShape = new THREE.Shape();
  buttressShape.moveTo(0, 16);
  buttressShape.lineTo(0, -1);
  buttressShape.lineTo(13, -1);
  buttressShape.bezierCurveTo(6.0, 0.8, 2.5, 6.0, 0, 16);

  const extrudeSettings = { depth: 0.8, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.15, bevelThickness: 0.15 };
  const buttressFinGeo = new THREE.ExtrudeGeometry(buttressShape, extrudeSettings);
  buttressFinGeo.translate(0, 0, -0.4);

  // Hanging Lianas (vines dangling from high branches)
  const lianaGeo = new THREE.CylinderGeometry(0.08, 0.08, 26, 4, 6);
  lianaGeo.translate(0, -13, 0);

  const emergentTrunkMatrices = [];
  const buttressMatrices = [];
  const scaffoldMatrices = [];
  const lianaMatrices = [];
  const emergentFoliageMatrices = [];

  const emergentLocations = [
    { x: -58, z: 25, h: 58 },   // Primary foreground framing left
    { x: 55, z: 42, h: 62 },    // Primary foreground framing right
    { x: -85, z: 85, h: 54 },
    { x: 78, z: 105, h: 56 },
    { x: -95, z: -105, h: 60 },
    { x: 82, z: -145, h: 64 },
    { x: -125, z: -35, h: 52 },
    { x: 120, z: -15, h: 54 },
    { x: -68, z: 175, h: 50 },
    { x: 88, z: 215, h: 52 },
    { x: -38, z: 265, h: 55 },
    { x: 58, z: -70, h: 58 },
    { x: -110, z: -170, h: 58 },
    { x: 95, z: -210, h: 60 },
  ];

  for (const loc of emergentLocations) {
    const y = ctx.modules.terrain ? ctx.modules.terrain.heightAt(loc.x, loc.z) : 15;
    const scale = loc.h / 52.0;
    
    // Trunk
    const lean = [R.range(-0.03, 0.03), R.range(0, Math.PI * 2), R.range(-0.03, 0.03)];
    emergentTrunkMatrices.push(geom.mat4([loc.x, y, loc.z], lean, scale));

    // Buttress fins radiating outward into soil
    const numFins = 5;
    for (let f = 0; f < numFins; f++) {
      const finAngle = (f / numFins) * Math.PI * 2 + R.range(-0.15, 0.15);
      buttressMatrices.push(geom.mat4([loc.x, y, loc.z], [0, finAngle, 0], scale));
    }

    // Heavy spreading scaffold branches at high canopy
    const branchForkY = y + loc.h * 0.72;
    const numBranches = 4;
    for (let b = 0; b < numBranches; b++) {
      const bAngle = (b / numBranches) * Math.PI * 2 + R.range(-0.2, 0.2);
      const bPitch = R.range(0.65, 0.95); // spreading outwards and slightly upwards
      scaffoldMatrices.push(geom.mat4([loc.x, branchForkY, loc.z], [bPitch, bAngle, 0], scale));

      // Hanging lianas dangling from branch tips
      const bx = loc.x + Math.sin(bAngle) * 11.0 * scale;
      const bz = loc.z + Math.cos(bAngle) * 11.0 * scale;
      const by = branchForkY + 7.0 * scale;
      lianaMatrices.push(geom.mat4([bx, by, bz], [R.range(-0.05, 0.05), 0, R.range(-0.05, 0.05)], scale));
    }

    // Expansive umbrella canopy (100 volume cards forming a massive 45m wide crown)
    const crownCenterY = y + loc.h * 0.88;
    const crownRadius = 24.0 * scale;

    for (let c = 0; c < 105; c++) {
      const theta = R.range(0, Math.PI * 2);
      const r = Math.sqrt(R.float(0.04, 1.0)) * crownRadius;
      const domeY = Math.cos((r / crownRadius) * Math.PI * 0.45) * (crownRadius * 0.38);

      const lx = loc.x + Math.cos(theta) * r + R.range(-2, 2);
      const ly = crownCenterY + domeY + R.range(-2.5, 2.5);
      const lz = loc.z + Math.sin(theta) * r + R.range(-2, 2);

      const pitch = R.range(-0.35, 0.45);
      const yaw = theta + R.range(-0.3, 0.3);
      const roll = R.range(-0.3, 0.3);
      const cardScale = R.range(1.3, 2.4) * scale;

      emergentFoliageMatrices.push(geom.mat4([lx, ly, lz], [pitch, yaw, roll], cardScale));
    }
  }

  group.add(geom.instanced(emergentTrunkGeo, M.rainforestBark, emergentTrunkMatrices, { castShadow: true, receiveShadow: true }));
  group.add(geom.instanced(buttressFinGeo, M.rainforestBark, buttressMatrices, { castShadow: true, receiveShadow: true }));
  group.add(geom.instanced(scaffoldGeo, M.rainforestBark, scaffoldMatrices, { castShadow: true, receiveShadow: true }));
  group.add(geom.instanced(lianaGeo, M.rainforestBark, lianaMatrices, { castShadow: true, receiveShadow: false }));
  group.add(geom.instanced(broadleafVol, foliageMat, emergentFoliageMatrices, { castShadow: true, receiveShadow: true }));

  // Camera clearance corridors to keep cinematic shot sightlines clean
  const cameraCorridors = [
    { x: -50, z: -175, r: 14.0 }, // Shot 1 Waterfall plunge pool view
    { x: -50, z: -200, r: 14.0 },
    { x: -48, z: 12,   r: 4.0 },  // Shot 3 Jungle interior (preserve close framing)
    { x: -42, z: -18,  r: 4.0 },
    { x: -10, z: -105, r: 10.0 }, // Shot 4 River glide
    { x: -22, z: -145, r: 10.0 },
  ];
  function inCameraCorridor(x, z) {
    for (const c of cameraCorridors) {
      if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
    }
    return false;
  }

  // 2. MID-CANOPY TROPICAL HARDWOODS (Continuous dense lush rainforest canopy)
  const midTrunkGeo = new THREE.CylinderGeometry(0.7, 1.3, 28, 8, 3);
  midTrunkGeo.translate(0, 14, 0);

  const midTrunkMatrices = [];
  const midFoliageMatrices = [];

  const numMidTrees = 160;
  for (let i = 0; i < numMidTrees; i++) {
    const z = R.range(-240, 270);
    const riverX = L.valley.centerlineX(z);
    const side = R.chance(0.5) ? 1 : -1;
    const x = riverX + side * R.range(28, 150);
    const y = ctx.modules.terrain ? ctx.modules.terrain.heightAt(x, z) : 20;

    if (y < L.river.waterYEnd || y > 115 || inWater(x, z) || inCameraCorridor(x, z)) continue;

    const treeH = R.range(20, 32);
    const scale = treeH / 28.0;
    midTrunkMatrices.push(geom.mat4([x, y, z], [R.range(-0.06, 0.06), R.range(0, Math.PI * 2), 0], scale));

    const crownY = y + treeH * 0.85;
    for (let c = 0; c < 38; c++) {
      const angle = R.range(0, Math.PI * 2);
      const r = R.range(3, 15) * scale;
      const lx = x + Math.cos(angle) * r;
      const ly = crownY + R.range(-2, 4) * scale;
      const lz = z + Math.sin(angle) * r;
      midFoliageMatrices.push(geom.mat4([lx, ly, lz], [R.range(-0.3, 0.4), angle, R.range(-0.3, 0.3)], scale * R.range(1.2, 2.0)));
    }
  }

  group.add(geom.instanced(midTrunkGeo, M.rainforestBark, midTrunkMatrices, { castShadow: true, receiveShadow: true }));
  group.add(geom.instanced(broadleafVol, foliageMat, midFoliageMatrices, { castShadow: true, receiveShadow: true }));

  // 3. TROPICAL FEATHER PALMS (Riverbanks and waterfall viewpoints)
  const palmQuad = makeFoliageQuad(1, 0, 5.8, 11.5);
  const palmTrunkGeo = new THREE.CylinderGeometry(0.28, 0.48, 18, 8, 4);
  palmTrunkGeo.translate(0, 9, 0);

  const palmTrunkMatrices = [];
  const palmFrondMatrices = [];

  const numPalms = 180;
  for (let i = 0; i < numPalms; i++) {
    const z = R.range(-250, 300);
    const riverX = L.valley.centerlineX(z);
    const side = R.chance(0.5) ? 1 : -1;
    const x = riverX + side * R.range(18, 110);
    const y = ctx.modules.terrain ? ctx.modules.terrain.heightAt(x, z) : 15;
    
    // Confine palms strictly to fertile valley elevations (never on high mountain rock)
    if (y < L.river.waterYEnd || y > 38.0 || (ctx.modules.terrain && ctx.modules.terrain.slopeAt(x, z) > 0.35) || inWater(x, z) || inCameraCorridor(x, z)) continue;

    const palmH = R.range(14, 25);
    const pScale = palmH / 18.0;
    const leanAngle = R.range(0.08, 0.26);
    const leanDir = R.range(0, Math.PI * 2);
    const leanRot = [Math.sin(leanDir) * leanAngle, leanDir, Math.cos(leanDir) * leanAngle];
    palmTrunkMatrices.push(geom.mat4([x, y, z], leanRot, pScale));

    const crownY = y + palmH - 0.4;
    const numFronds = 18;
    for (let f = 0; f < numFronds; f++) {
      const fAngle = (f / numFronds) * Math.PI * 2 + R.range(-0.06, 0.06);
      const droop = R.range(0.7, 1.25);
      palmFrondMatrices.push(geom.mat4([x, crownY, z], [droop, fAngle, 0], pScale * R.range(1.15, 1.55)));
    }
  }

  group.add(geom.instanced(palmTrunkGeo, M.rainforestBark, palmTrunkMatrices, { castShadow: true, receiveShadow: true }));
  group.add(geom.instanced(palmQuad, foliageMat, palmFrondMatrices, { castShadow: true, receiveShadow: true }));

  // 4. TREE FERNS & GIANT UNDERSTORY FERNS
  const fernQuad = makeFoliageQuad(0, 1, 4.5, 8.2);
  const fernTrunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 8, 6, 2);
  fernTrunkGeo.translate(0, 4, 0);

  const fernTrunkMatrices = [];
  const fernFrondMatrices = [];

  const numTreeFerns = 240;
  for (let i = 0; i < numTreeFerns; i++) {
    const isSpray = R.chance(0.65);
    let x, z;
    if (isSpray) {
      const ang = R.range(0, Math.PI * 2);
      const r = R.range(32, 110);
      x = L.plungePool.center[0] + Math.cos(ang) * r;
      z = L.plungePool.center[2] + Math.sin(ang) * r;
    } else {
      z = R.range(-230, 270);
      x = L.valley.centerlineX(z) + R.range(-120, 120);
    }

    const y = ctx.modules.terrain ? ctx.modules.terrain.heightAt(x, z) : 25;
    if (y < 6.0 || y > 40.0 || (ctx.modules.terrain && ctx.modules.terrain.slopeAt(x, z) > 0.38) || inWater(x, z) || inCameraCorridor(x, z)) continue;

    const fH = R.range(5.5, 12.5);
    const fScale = fH / 8.0;
    fernTrunkMatrices.push(geom.mat4([x, y, z], [R.range(-0.06, 0.06), R.range(0, Math.PI * 2), 0], fScale));

    const crownY = y + fH;
    const numFronds = 14;
    for (let f = 0; f < numFronds; f++) {
      const fAngle = (f / numFronds) * Math.PI * 2;
      const droop = R.range(0.65, 1.1);
      fernFrondMatrices.push(geom.mat4([x, crownY, z], [droop, fAngle, 0], fScale * 1.2));
    }
  }

  group.add(geom.instanced(fernTrunkGeo, M.rainforestBark, fernTrunkMatrices, { castShadow: true, receiveShadow: true }));
  group.add(geom.instanced(fernQuad, foliageMat, fernFrondMatrices, { castShadow: true, receiveShadow: true }));

  // 5. GIANT MONSTERA & ELEPHANT EAR CARPET (Lush understory ground cover)
  const monsteraQuad = makeFoliageQuad(1, 1, 3.8, 4.6);
  const monsteraMatrices = [];

  const numMonstera = 450;
  for (let i = 0; i < numMonstera; i++) {
    const z = R.range(-260, 270);
    const x = L.valley.centerlineX(z) + R.range(-130, 130);
    const y = ctx.modules.terrain ? ctx.modules.terrain.heightAt(x, z) : 15;
    if (y < 6.5 || y > 42.0 || (ctx.modules.terrain && ctx.modules.terrain.slopeAt(x, z) > 0.35) || inWater(x, z) || inCameraCorridor(x, z)) continue;

    const s = R.range(1.0, 2.3);
    const rot = [R.range(0.35, 0.9), R.range(0, Math.PI * 2), R.range(-0.25, 0.25)];
    monsteraMatrices.push(geom.mat4([x, y + s * 0.75, z], rot, s));
  }

  group.add(geom.instanced(monsteraQuad, foliageMat, monsteraMatrices, { castShadow: true, receiveShadow: true }));

  return { object: group };
}
