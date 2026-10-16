// ---------------------------------------------------------------------------
// ATMOSPHERE — Rising waterfall mist plumes, valley ground moisture fog,
// and soft sunbeams filtering through the rainforest gorge.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export async function build(ctx) {
  const { L, mat } = ctx;
  const group = new THREE.Group();
  group.name = 'atmosphere';

  // Soft Mist / Fog Material with procedural scrolling FBM, Mie forward-scattering glow and depth fade
  const mistMat = mat.std({
    color: new THREE.Color().setRGB(0.92, 0.96, 0.99),
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  }, {
    vertexWorld: /* glsl */ `
      {
        float t = uTime * 0.45;
        // Convective expansion and rolling vortex motion
        float roll = sin(wPos4.y * 0.08 - t * 1.5 + wPos4.x * 0.05) * 2.8;
        float drift = cos(wPos4.z * 0.06 - t * 0.9) * 2.2;
        wPos4.xz += uWindDir * (roll * 0.65 + drift * 0.35);
        wPos4.y += sin(t * 1.2 + wPos4.x * 0.04) * 1.2;
      }
    `,
    fragHead: /* glsl */ `float g_mist;`,
    fragColor: /* glsl */ `
      {
        vec3 wp = vWPos;
        float t = uTime * 0.35;
        // Billowing convection currents rising vertically and drifting with wind
        vec2 drift = uWindDir * (t * 0.8);
        vec3 flowPos = vec3(wp.x - drift.x, wp.y - t * 1.8, wp.z - drift.y);
        float b1 = n_fbm3(flowPos * vec3(0.022, 0.015, 0.022), 3);
        float b2 = n_snoise3(flowPos * vec3(0.055, 0.035, 0.055));
        float density = smoothstep(0.22, 0.75, b1 * 0.65 + b2 * 0.35);
        
        // Forward Mie scattering: mist radiates golden warmth when looking toward the sun
        vec3 viewDir = normalize(wp - cameraPosition);
        float cosTheta = dot(viewDir, uSunDir);
        float g = 0.72;
        float mie = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5) / 12.566;
        vec3 mistSunGlow = uSunColor * min(mie * 4.0, 1.6) * 0.35;
        
        diffuseColor.rgb += mistSunGlow;
        diffuseColor.a *= density * 0.52;
      }
    `,
  });

  // 1. Rising Plunge Pool Mist Plume (Layered billowing mist cards)
  const poolCenter = L.plungePool.center;
  const mistCardGeo = new THREE.PlaneGeometry(85, 70);
  const numMistLayers = 28;

  for (let i = 0; i < numMistLayers; i++) {
    const angle = (i / numMistLayers) * Math.PI * 2;
    const rad = 28.0 + (i % 4) * 14.0;
    const y = poolCenter[1] + 12.0 + (i * 3.8);
    const x = poolCenter[0] + Math.cos(angle) * rad;
    const z = poolCenter[2] + Math.sin(angle) * rad;

    const mistMesh = new THREE.Mesh(mistCardGeo, mistMat);
    mistMesh.position.set(x, y, z);
    mistMesh.rotation.y = angle + Math.PI * 0.5;
    mistMesh.rotation.x = -0.15;
    mistMesh.scale.setScalar(1.0 + (i / numMistLayers) * 1.6);
    mistMesh.renderOrder = 20 + i;
    group.add(mistMesh);
  }

  // 2. Valley River Humidity Mist (Low drifting sheets hovering over the water)
  const riverMistGeo = new THREE.PlaneGeometry(130, 90);
  riverMistGeo.rotateX(-Math.PI * 0.45);

  const waypoints = L.river.waypoints;
  for (let i = 0; i < waypoints.length; i += 2) {
    const wp = waypoints[i];
    const rMist = new THREE.Mesh(riverMistGeo, mistMat);
    rMist.position.set(wp[0], wp[1] + 3.5, wp[2]);
    rMist.rotation.y = (i % 2 === 0) ? 0.35 : -0.35;
    rMist.renderOrder = 18;
    group.add(rMist);
  }

  // 3. Subtle Sunbeam Light Shafts (Gentle vertical fan planes)
  const shaftMat = mat.glow([1.0, 0.94, 0.82], 0.18);
  shaftMat.transparent = true;
  shaftMat.opacity = 0.06;
  shaftMat.side = THREE.DoubleSide;
  shaftMat.depthWrite = false;

  const shaftGeo = new THREE.PlaneGeometry(35, 240);
  shaftGeo.rotateZ(Math.PI * 0.22); // angled matching afternoon sun
  
  for (let i = 0; i < 4; i++) {
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(poolCenter[0] - 40 + i * 22, poolCenter[1] + 110, poolCenter[2] - 30 + i * 15);
    shaft.rotation.y = 0.45 + i * 0.12;
    shaft.renderOrder = 16;
    group.add(shaft);
  }

  return { object: group };
}
