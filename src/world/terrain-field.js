// ---------------------------------------------------------------------------
// TERRAIN FIELD — Pure mathematical continuous elevation, distance fields,
// river channel carving, and waterfall amphitheater.
// Deterministic, zero assets, evaluated instantaneously by any module.
// ---------------------------------------------------------------------------

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

// --- Fast Seeded 2D Simplex Noise -------------------------------------------
export function makeSimplex(seed = 1337) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const GX = [1, -1, 1, -1, 1, -1, 0, 0], GY = [1, 1, -1, -1, 0, 0, 1, -1];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;

  return function noise(x, y) {
    const s2 = (x + y) * F2;
    const i = Math.floor(x + s2), j = Math.floor(y + s2);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const g = perm[ii + perm[jj]] & 7; t0 *= t0; n += t0 * t0 * (GX[g] * x0 + GY[g] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const g = perm[ii + i1 + perm[jj + j1]] & 7; t1 *= t1; n += t1 * t1 * (GX[g] * x1 + GY[g] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const g = perm[ii + 1 + perm[jj + 1]] & 7; t2 *= t2; n += t2 * t2 * (GX[g] * x2 + GY[g] * y2); }
    return 70 * n;
  };
}

export function createRainforestField(L) {
  const noise1 = makeSimplex(4242);
  const noise2 = makeSimplex(9901);
  const noise3 = makeSimplex(7713);

  // Fractal Brownian Motion
  function fbm(x, z, octaves = 4, lacunarity = 2.05, gain = 0.5) {
    let sum = 0, amp = 0.5, freq = 1.0, maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise1(x * freq, z * freq) * amp;
      maxAmp += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / maxAmp;
  }

  // Ridged multi-fractal for mountain crests
  function ridged(x, z, octaves = 4) {
    let sum = 0, amp = 0.5, freq = 1.0;
    for (let i = 0; i < octaves; i++) {
      let n = noise2(x * freq, z * freq);
      n = 1.0 - Math.abs(n);
      n = n * n;
      sum += n * amp;
      amp *= 0.52;
      freq *= 2.1;
    }
    return sum;
  }

  // River spline evaluation
  const riverPts = L.river.waypoints;
  function getRiverDist(x, z) {
    let minDist = Infinity;
    let riverWaterY = 28.0;
    let riverW = 45.0;

    for (let i = 0; i < riverPts.length - 1; i++) {
      const p0 = riverPts[i];
      const p1 = riverPts[i + 1];
      const dx = p1[0] - p0[0];
      const dz = p1[2] - p0[2];
      const lenSq = dx * dx + dz * dz;
      const t = clamp(((x - p0[0]) * dx + (z - p0[2]) * dz) / lenSq, 0, 1);
      const projX = p0[0] + t * dx;
      const projZ = p0[2] + t * dz;
      const d = Math.hypot(x - projX, z - projZ);
      if (d < minDist) {
        minDist = d;
        riverWaterY = lerp(p0[1], p1[1], t);
        const progress = (i + t) / (riverPts.length - 1);
        riverW = lerp(L.river.widthStart, L.river.widthEnd, progress);
      }
    }
    return { dist: minDist, waterY: riverWaterY, width: riverW };
  }

  // Distance to primary plunge pool
  const poolCenter = L.plungePool.center;
  function getPoolDist(x, z) {
    const dx = (x - poolCenter[0]) / L.plungePool.radiusX;
    const dz = (z - poolCenter[2]) / L.plungePool.radiusZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  // Main Continuous Elevation Function
  function heightAt(x, z) {
    // 1. Domain warping for natural terrain flow
    const wx = x * 0.003;
    const wz = z * 0.003;
    const warpX = x + fbm(wx, wz, 3) * 65.0;
    const warpZ = z + fbm(wx + 5.2, wz + 1.7, 3) * 65.0;

    // 2. Base valley elevation profile (gently slopes southward)
    const valleyCenter = L.valley.centerlineX(z);
    const distFromCenter = Math.abs(x - valleyCenter);
    const valleyProgress = clamp((z - (-280)) / 600.0, 0, 1);
    let hValley = lerp(L.valley.floorMaxY, L.valley.floorMinY, valleyProgress);

    // Valley floor roughness and alluvial terraces
    const valleyBumps = fbm(x * 0.015, z * 0.015, 3) * 4.5 + noise3(x * 0.05, z * 0.05) * 1.2;
    hValley += valleyBumps;

    // 3. Flanking Valley Ridges (East and West walls)
    const wallStart = 140.0;
    if (distFromCenter > wallStart) {
      const excess = distFromCenter - wallStart;
      const ridgeClimb = Math.pow(excess * 0.025, 2.2) * 18.0;
      const ridgeNoise = ridged(warpX * 0.004, warpZ * 0.004, 3) * 90.0;
      hValley += ridgeClimb + ridgeNoise * smoothstep(0, 80, excess);
    }

    // 4. Background Mountains (North: z < -320)
    let hMountains = 0;
    if (z < -300) {
      const northDist = Math.abs(z - (-300));
      // Base plateau rise
      const plateauRise = smoothstep(0, 160, northDist) * 190.0;
      // High mountain ridges
      const mRidge = ridged(warpX * 0.0025, warpZ * 0.0025, 4) * 260.0;
      // Broad mountain massif peaks
      let peakAdd = 0;
      for (const p of L.mountains.peaks) {
        const d = Math.hypot(x - p.pos[0], z - p.pos[2]);
        if (d < p.radius) {
          const t = 1.0 - d / p.radius;
          peakAdd = Math.max(peakAdd, Math.pow(t, 1.8) * (p.pos[1] - 220));
        }
      }
      hMountains = plateauRise + mRidge + peakAdd;
    }

    // 5. Waterfall Amphitheater (Carved semi-circle gorge around primary waterfall)
    const gorgeCenter = L.waterfall.center;
    const gorgeDist = Math.hypot(x - gorgeCenter[0], z - gorgeCenter[2]);
    const amphRadius = L.waterfall.amphitheaterRadius;
    
    // Combine valley and mountain terrain
    let finalH;
    if (z >= -275) {
      finalH = hValley;
    } else {
      // Transition from valley into mountain plateau
      const blend = smoothstep(-275, -345, z);
      finalH = lerp(hValley, 240.0 + hMountains * 0.6, blend);
      
      // Carve out the waterfall amphitheater gorge
      if (gorgeDist < amphRadius && z > -325) {
        const gorgeT = clamp(gorgeDist / amphRadius, 0, 1);
        const carveH = lerp(L.plungePool.waterY - 2.0, finalH, smoothstep(0.18, 0.95, gorgeT));
        finalH = Math.min(finalH, carveH);
      }
    }

    // 6. Carve the Plunge Pool Basin
    const poolD = getPoolDist(x, z);
    if (poolD < 1.4) {
      const poolT = smoothstep(1.3, 0.45, poolD);
      const basinFloor = L.plungePool.bottomY + noise3(x * 0.1, z * 0.1) * 0.8;
      finalH = lerp(finalH, basinFloor, poolT);
    }

    // 7. Carve the River Channel (Continuously from plunge pool outflow southwards)
    const river = getRiverDist(x, z);
    const riverHalfW = river.width * 0.5;
    if (river.dist < riverHalfW + 35.0 && z > -220) {
      const shoreT = smoothstep(riverHalfW + 35.0, riverHalfW - 2.0, river.dist);
      const bedH = river.waterY - L.river.depth + noise3(x * 0.08, z * 0.08) * 0.5;
      finalH = lerp(finalH, bedH, shoreT);
    }

    return finalH;
  }

  // Fast Finite Differences for Surface Normal
  function normalAt(x, z) {
    const eps = 0.5;
    const hL = heightAt(x - eps, z);
    const hR = heightAt(x + eps, z);
    const hD = heightAt(x, z - eps);
    const hU = heightAt(x, z + eps);
    const nx = hL - hR;
    const ny = 2.0 * eps;
    const nz = hD - hU;
    const len = Math.hypot(nx, ny, nz) || 1.0;
    return [nx / len, ny / len, nz / len];
  }

  // Slope steepness: 0 (flat horizontal) to 1 (vertical cliff)
  function slopeAt(x, z) {
    const n = normalAt(x, z);
    return 1.0 - n[1];
  }

  return {
    heightAt,
    normalAt,
    slopeAt,
    getRiverDist,
    getPoolDist,
    fbm,
    ridged,
  };
}
