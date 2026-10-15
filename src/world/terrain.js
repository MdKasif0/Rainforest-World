// ---------------------------------------------------------------------------
// TERRAIN — Valley floor, riverbanks, terraces, and transition slopes.
// Generated procedurally via terrain-field with slope-based moss, rock, and silt.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { createRainforestField } from './terrain-field.js';

export async function build(ctx) {
  const { L, M } = ctx;
  const F = createRainforestField(L);
  const group = new THREE.Group();
  group.name = 'terrain';

  // Valley Floor & River Corridor Mesh
  // Resolution: 220 x 240 grid spanning X[-400, 400], Z[-360, 360]
  const segX = 220, segZ = 240;
  const minX = -400, maxX = 400;
  const minZ = -360, maxZ = 360;
  const w = maxX - minX;
  const d = maxZ - minZ;

  const geo = new THREE.PlaneGeometry(w, d, segX, segZ);
  geo.rotateX(-Math.PI / 2); // orient in XZ plane
  geo.translate(minX + w * 0.5, 0, minZ + d * 0.5);

  const pos = geo.attributes.position;
  const count = pos.count;

  // Deform plane vertices to exact terrain field elevation
  for (let i = 0; i < count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const vy = F.heightAt(vx, vz);
    pos.setY(i, vy);
  }

  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();

  // Mesh with mossy rainforest rock material (uses procedural slope and normal in GLSL)
  const terrainMesh = new THREE.Mesh(geo, M.rockMossy);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = false;
  group.add(terrainMesh);

  // Riverbed & Submerged Basin Inset Mesh (Wet river gravel and silt)
  // Low-resolution riverbed lining to guarantee rich underwater color
  const riverSegs = 64;
  const waypoints = L.river.waypoints;
  const riverbedGeo = new THREE.BufferGeometry();
  const bedPos = [];
  const bedUvs = [];
  const bedIndices = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const width = THREE.MathUtils.lerp(L.river.widthStart, L.river.widthEnd, i / (waypoints.length - 1)) * 0.55;
    const tangent = i < waypoints.length - 1
      ? [waypoints[i + 1][0] - wp[0], waypoints[i + 1][2] - wp[2]]
      : [wp[0] - waypoints[i - 1][0], wp[2] - waypoints[i - 1][2]];
    const tLen = Math.hypot(tangent[0], tangent[1]) || 1;
    const nx = -tangent[1] / tLen;
    const nz = tangent[0] / tLen;

    for (let s = -2; s <= 2; s++) {
      const frac = s / 2.0;
      const px = wp[0] + nx * width * frac;
      const pz = wp[2] + nz * width * frac;
      const py = F.heightAt(px, pz) - 0.2; // Slightly below surface
      bedPos.push(px, py, pz);
      bedUvs.push(frac * 0.5 + 0.5, i / waypoints.length);
    }
  }

  const numCross = 5;
  for (let i = 0; i < waypoints.length - 1; i++) {
    for (let j = 0; j < numCross - 1; j++) {
      const row1 = i * numCross;
      const row2 = (i + 1) * numCross;
      bedIndices.push(row1 + j, row2 + j, row1 + j + 1);
      bedIndices.push(row1 + j + 1, row2 + j, row2 + j + 1);
    }
  }

  riverbedGeo.setAttribute('position', new THREE.Float32BufferAttribute(bedPos, 3));
  riverbedGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bedUvs, 2));
  riverbedGeo.setIndex(bedIndices);
  riverbedGeo.computeVertexNormals();

  const riverbedMesh = new THREE.Mesh(riverbedGeo, M.riverbed);
  riverbedMesh.receiveShadow = true;
  group.add(riverbedMesh);

  return {
    object: group,
    field: F,
    heightAt: F.heightAt,
    normalAt: F.normalAt,
    slopeAt: F.slopeAt,
  };
}
