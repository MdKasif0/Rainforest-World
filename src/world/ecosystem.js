// ---------------------------------------------------------------------------
// ECOSYSTEM — Living, animated tropical rainforest fauna and environmental details:
// - Canopy-gliding birds banking over the monumental valley and gorge
// - Iridescent butterflies and dragonflies hovering near clearings
// - Organic leaf debris floating downstream with river currents
// - High-speed plunge pool ballistic spray droplets
// - Sunlight airborne spores / dust motes drifting in sunbeams
// 100% deterministic evaluation as pure functions of timestamp T.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { ENV_SYSTEM } from '../core/environment.js';

export async function build(ctx) {
  const { geom, mat, M } = ctx;
  const group = new THREE.Group();
  group.name = 'ecosystem';

  // -------------------------------------------------------------------------
  // 1. CANOPY & GORGE GLIDING BIRDS (Hornbills / Raptors)
  // -------------------------------------------------------------------------
  // Low-poly aerodynamic bird geometry: fuselage + swept wings
  const birdGeo = new THREE.BufferGeometry();
  // Vertices for body and wings
  // Body: nose (0, 0, 1.0), tail (0, 0, -1.2), left wing tip (-1.8, 0.1, -0.3), right wing tip (1.8, 0.1, -0.3)
  const birdPos = new Float32Array([
    // Fuselage top
    0.0, 0.15, 0.8,   -0.2, 0.0, 0.0,    0.2, 0.0, 0.0,
    0.0, 0.15, 0.8,    0.0, 0.0, -1.2,  -0.2, 0.0, 0.0,
    0.0, 0.15, 0.8,    0.2, 0.0, 0.0,    0.0, 0.0, -1.2,
    // Left Wing
    -0.15, 0.05, 0.3, -1.8, 0.12, -0.3, -0.15, 0.05, -0.6,
    // Right Wing
     0.15, 0.05, 0.3,  0.15, 0.05, -0.6,  1.8, 0.12, -0.3,
  ]);
  birdGeo.setAttribute('position', new THREE.BufferAttribute(birdPos, 3));
  birdGeo.computeVertexNormals();

  // Dark slate plumage with subtle specular sheen
  const birdMat = mat.std({
    color: 0x1e2428,
    roughness: 0.38,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const numBirds = 6;
  const birdMesh = new THREE.InstancedMesh(birdGeo, birdMat, numBirds);
  birdMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  birdMesh.castShadow = true;
  group.add(birdMesh);

  // -------------------------------------------------------------------------
  // 2. IRIDESCENT BUTTERFLIES & CLEARING INSECTS (Morpho & Amber Dragonflies)
  // -------------------------------------------------------------------------
  const insectGeo = new THREE.BufferGeometry();
  // Butterfly 2-wing quad
  const wingPos = new Float32Array([
    // Left Wing
    0.0, 0.0, 0.0,  -0.35, 0.25, 0.2,  -0.35, -0.15, -0.2,
    0.0, 0.0, 0.0,  -0.35, -0.15, -0.2, 0.0, 0.0, -0.3,
    // Right Wing
    0.0, 0.0, 0.0,   0.35, -0.15, -0.2,  0.35, 0.25, 0.2,
    0.0, 0.0, 0.0,   0.0, 0.0, -0.3,    0.35, -0.15, -0.2,
  ]);
  insectGeo.setAttribute('position', new THREE.BufferAttribute(wingPos, 3));
  insectGeo.computeVertexNormals();

  // Vibrant iridescent morpho blue / emerald sheen
  const insectMat = mat.std({
    color: 0x1599a8,
    roughness: 0.22,
    metalness: 0.35,
    side: THREE.DoubleSide,
  }, {
    fragColor: /* glsl */ `
      // Iridescent two-tone sheen: shift between deep sapphire and vibrant emerald
      float angle = dot(normalize(vWNrm), normalize(-vViewPosition));
      vec3 irid = mix(vec3(0.08, 0.45, 0.88), vec3(0.12, 0.92, 0.65), angle * 0.5 + 0.5);
      diffuseColor.rgb = irid * 1.35;
    `,
  });

  // Anchors placed near camera viewing areas (Shot 3 jungle interior & Shot 4 riverbank)
  const insectAnchors = [
    [-44, 21.5, 8],
    [-46, 22.0, -12],
    [-40, 20.8, -25],
    [-48, 23.0, 0],
    [-38, 22.2, -8],
    [-42, 21.0, 15],
    // Riverbank clearings
    [-25, 23.0, -110],
    [-18, 22.5, -95],
    [-8,  21.0, -60],
    [5,   19.5, -10],
    [15,  18.5, 25],
    [25,  17.8, 55],
    // Plunge pool spray perimeter rocks
    [-65, 26.5, -240],
    [-35, 26.0, -235],
    [-55, 27.2, -220],
    [-45, 26.8, -210],
  ];

  const numInsects = insectAnchors.length;
  const insectMesh = new THREE.InstancedMesh(insectGeo, insectMat, numInsects);
  insectMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(insectMesh);

  // -------------------------------------------------------------------------
  // 3. FLOATING RIVER DEBRIS (Rainforest Leaves Drifting Downstream)
  // -------------------------------------------------------------------------
  const leafQuad = new THREE.PlaneGeometry(0.75, 0.55);
  leafQuad.rotateX(-Math.PI / 2);

  // Rich organic leaf albedo with waxy sheen
  const floatingLeafMat = mat.std({
    color: 0x5a6e2e,
    roughness: 0.32,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const numLeaves = 40;
  const leafMesh = new THREE.InstancedMesh(leafQuad, floatingLeafMat, numLeaves);
  leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  leafMesh.castShadow = true;
  group.add(leafMesh);

  // -------------------------------------------------------------------------
  // 4. WATERFALL PLUNGE POOL BALLISTIC SPRAY DROPLETS
  // -------------------------------------------------------------------------
  const dropletGeo = new THREE.IcosahedronGeometry(0.45, 1);
  const dropletMat = mat.std({
    color: 0xd8f5ff,
    roughness: 0.08,
    metalness: 0.1,
  }, {
    fragLight: /* glsl */ `
      // Specular sunlight glint on water droplets
      reflectedLight.directDiffuse += uSunColor * 0.85;
    `,
  });

  const numDroplets = 55;
  const sprayMesh = new THREE.InstancedMesh(dropletGeo, dropletMat, numDroplets);
  sprayMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(sprayMesh);

  // -------------------------------------------------------------------------
  // 5. AIRBORNE SUNLIGHT SPORES / FOREST DUST MOTES
  // -------------------------------------------------------------------------
  // GPU-driven instanced particles floating in sunlit clearings
  const sporeGeo = new THREE.PlaneGeometry(0.35, 0.35);
  const sporeMat = mat.glow([1.0, 0.94, 0.78], 0.45);
  sporeMat.transparent = true;
  sporeMat.opacity = 0.55;
  sporeMat.side = THREE.DoubleSide;
  sporeMat.depthWrite = false;

  const numSpores = 120;
  const sporeMatrices = [];
  const R_spore = ctx.rng('rainforest-spores');
  for (let i = 0; i < numSpores; i++) {
    // Clustered near river clearings and jungle interior
    const cx = R_spore.range(-60, 40);
    const cz = R_spore.range(-220, 60);
    const cy = R_spore.range(18, 48);
    sporeMatrices.push(geom.mat4([cx, cy, cz], [0, 0, 0], R_spore.range(0.6, 1.4)));
  }
  const sporeMesh = geom.instanced(sporeGeo, sporeMat, sporeMatrices, {
    castShadow: false,
    receiveShadow: false,
  });
  group.add(sporeMesh);

  // -------------------------------------------------------------------------
  // DETERMINISTIC PER-FRAME UPDATE HOOK
  // Evaluates state strictly from timestamp T (pure function, no accumulation)
  // -------------------------------------------------------------------------
  const dummyMat4 = new THREE.Matrix4();
  const dummyPos = new THREE.Vector3();
  const dummyEuler = new THREE.Euler();
  const dummyQuat = new THREE.Quaternion();
  const dummyScale = new THREE.Vector3();

  function update(T) {
    // 1. Centralized environment system update (wind, master time)
    ENV_SYSTEM.update(T);

    // 2. Birds: Update 3D flight trajectory & wing flap roll
    for (let i = 0; i < numBirds; i++) {
      const b = ENV_SYSTEM.evalBird(i, T);
      dummyPos.set(b.pos[0], b.pos[1], b.pos[2]);
      dummyEuler.set(b.rot[0], b.rot[1], b.rot[2], 'YXZ');
      dummyQuat.setFromEuler(dummyEuler);
      dummyScale.set(1.2, 1.2, 1.2);
      dummyMat4.compose(dummyPos, dummyQuat, dummyScale);
      birdMesh.setMatrixAt(i, dummyMat4);
    }
    birdMesh.instanceMatrix.needsUpdate = true;

    // 3. Insects: Hovering, darting & flutter around clearings
    for (let i = 0; i < numInsects; i++) {
      const anchor = insectAnchors[i];
      const insect = ENV_SYSTEM.evalInsect(i, T, anchor);
      dummyPos.set(insect.pos[0], insect.pos[1], insect.pos[2]);
      dummyEuler.set(insect.rot[0], insect.rot[1], insect.rot[2], 'YXZ');
      dummyQuat.setFromEuler(dummyEuler);
      dummyScale.set(0.9, 0.9, 0.9);
      dummyMat4.compose(dummyPos, dummyQuat, dummyScale);
      insectMesh.setMatrixAt(i, dummyMat4);
    }
    insectMesh.instanceMatrix.needsUpdate = true;

    // 4. Floating River Leaves: Drifting downstream along waypoints
    for (let i = 0; i < numLeaves; i++) {
      const l = ENV_SYSTEM.evalRiverDebris(i, T, numLeaves);
      dummyPos.set(l.pos[0], l.pos[1], l.pos[2]);
      dummyEuler.set(l.rot[0], l.rot[1], l.rot[2], 'XYZ');
      dummyQuat.setFromEuler(dummyEuler);
      dummyScale.set(1.0, 1.0, 1.0);
      dummyMat4.compose(dummyPos, dummyQuat, dummyScale);
      leafMesh.setMatrixAt(i, dummyMat4);
    }
    leafMesh.instanceMatrix.needsUpdate = true;

    // 5. Plunge Pool Ballistic Spray Droplets
    for (let i = 0; i < numDroplets; i++) {
      const d = ENV_SYSTEM.evalPlungeSpray(i, T, numDroplets);
      dummyPos.set(d.pos[0], d.pos[1], d.pos[2]);
      dummyQuat.identity();
      dummyScale.setScalar(d.scale);
      dummyMat4.compose(dummyPos, dummyQuat, dummyScale);
      sprayMesh.setMatrixAt(i, dummyMat4);
    }
    sprayMesh.instanceMatrix.needsUpdate = true;
  }

  // Initial evaluation at t = 0
  update(0);

  return { object: group, update };
}
