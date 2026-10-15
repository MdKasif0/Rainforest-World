// ---------------------------------------------------------------------------
// RIVER & PLUNGE POOL — Turquoise waterfall basin and winding tropical river
// with procedural flow vectors, caustics, and water reflections.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export async function build(ctx) {
  const { L, M } = ctx;
  const group = new THREE.Group();
  group.name = 'river';

  // 1. Plunge Pool Basin Water Surface (Circular pool at waterfall foot)
  const pool = L.plungePool;
  const poolGeo = new THREE.CircleGeometry(pool.radiusX, 64);
  poolGeo.rotateX(-Math.PI / 2);
  poolGeo.scale(1.0, 1.0, pool.radiusZ / pool.radiusX);
  poolGeo.translate(pool.center[0], pool.waterY, pool.center[2]);

  const poolMesh = new THREE.Mesh(poolGeo, M.riverWater);
  poolMesh.receiveShadow = true;
  group.add(poolMesh);

  // 2. Winding River Surface Mesh along Spline Waypoints
  const waypoints = L.river.waypoints;
  const curvePts = waypoints.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const spline = new THREE.CatmullRomCurve3(curvePts, false, 'centripetal', 0.5);

  const numSlices = 120;
  const numCross = 16;
  const riverPositions = [];
  const riverUvs = [];
  const riverIndices = [];

  for (let i = 0; i <= numSlices; i++) {
    const t = i / numSlices;
    const pt = spline.getPoint(t);
    const tangent = spline.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Width widens gradually downstream
    const width = THREE.MathUtils.lerp(L.river.widthStart, L.river.widthEnd, t) * 0.5;

    for (let j = 0; j <= numCross; j++) {
      const u = j / numCross;
      const offset = (u - 0.5) * 2.0 * width;
      const vx = pt.x + normal.x * offset;
      const vz = pt.z + normal.z * offset;
      const vy = pt.y; // Follows spline water level

      riverPositions.push(vx, vy, vz);
      riverUvs.push(u, t * 14.0); // Tiling along flow direction
    }
  }

  for (let i = 0; i < numSlices; i++) {
    for (let j = 0; j < numCross; j++) {
      const row1 = i * (numCross + 1);
      const row2 = (i + 1) * (numCross + 1);
      const a = row1 + j;
      const b = row2 + j;
      const c = row2 + (j + 1);
      const d = row1 + (j + 1);
      riverIndices.push(a, d, b);
      riverIndices.push(d, c, b);
    }
  }

  const riverGeo = new THREE.BufferGeometry();
  riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
  riverGeo.setAttribute('uv', new THREE.Float32BufferAttribute(riverUvs, 2));
  riverGeo.setIndex(riverIndices);
  riverGeo.computeVertexNormals();

  const riverMesh = new THREE.Mesh(riverGeo, M.riverWater);
  riverMesh.receiveShadow = true;
  group.add(riverMesh);

  return {
    object: group,
    spline,
    poolCenter: pool.center,
  };
}
