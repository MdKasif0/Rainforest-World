// ---------------------------------------------------------------------------
// PROCEDURAL RAINFOREST FOLIAGE TEXTURES — Drawn on HTML5 canvases at load time.
// Zero external assets.
// Contains:
//   - Quadrant 0: Emergent canopy broadleaf spray
//   - Quadrant 1: Tropical feather palm fronds
//   - Quadrant 2: Tree fern bipinnate frond
//   - Quadrant 3: Giant Monstera / Elephant Ear (Colocasia) leaf
// With color dilation and coverage-preserving alpha mip chains.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

// Color dilation to prevent dark / black fringing at mip borders
function dilate(data, w, h, passes = 8) {
  const valid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] > 20) valid[i] = 1;
  }
  const nv = new Uint8Array(w * h);
  for (let p = 0; p < passes; p++) {
    nv.set(valid);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (valid[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const ni = ny * w + nx;
            if (valid[ni]) {
              r += data[ni * 4];
              g += data[ni * 4 + 1];
              b += data[ni * 4 + 2];
              n++;
            }
          }
        }
        if (n > 0) {
          data[i * 4] = (r / n) | 0;
          data[i * 4 + 1] = (g / n) | 0;
          data[i * 4 + 2] = (b / n) | 0;
          nv[i] = 1;
        }
      }
    }
    valid.set(nv);
  }
}

// Coverage-preserving alpha mip chain generator
function makeMipmaps(canvas, w, h, alphaCutoff = 0.35) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const baseImg = ctx.getImageData(0, 0, w, h);
  dilate(baseImg.data, w, h, 8);
  ctx.putImageData(baseImg, 0, 0);

  const mipmaps = [];
  let curW = w, curH = h;
  let curCanvas = canvas;

  while (curW > 1 || curH > 1) {
    const nextW = Math.max(1, curW >> 1);
    const nextH = Math.max(1, curH >> 1);
    const nextCanvas = makeCanvas(nextW, nextH);
    const nctx = nextCanvas.getContext('2d', { willReadFrequently: true });
    nctx.drawImage(curCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);

    const img = nctx.getImageData(0, 0, nextW, nextH);
    dilate(img.data, nextW, nextH, 4);
    nctx.putImageData(img, 0, 0);

    mipmaps.push(img);
    curW = nextW; curH = nextH;
    curCanvas = nextCanvas;
  }
  return { baseImg, mipmaps };
}

// Generates the Master Rainforest Atlas (1024x1024)
export function makeRainforestAtlas() {
  const W = 1024, H = 1024;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // Helper: realistic tropical ovate leaf with natural taper and delicate veins
  const drawTropicalLeaf = (cx, cy, len, width, angle, colBase, colTip) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Natural drip-tip leaf shape (curved apex)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(width * 0.95, len * 0.28, width * 0.82, len * 0.72, width * 0.15, len * 0.92);
    ctx.quadraticCurveTo(0, len * 1.05, -width * 0.15, len * 0.92);
    ctx.bezierCurveTo(-width * 0.82, len * 0.72, -width * 0.95, len * 0.28, 0, 0);

    const grad = ctx.createLinearGradient(0, 0, 0, len);
    grad.addColorStop(0, colBase);
    grad.addColorStop(0.65, colTip);
    grad.addColorStop(1, colBase);
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle dark shadow along leaf margins
    ctx.strokeStyle = 'rgba(10, 28, 8, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Delicate translucent midrib vein
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, len * 0.92);
    ctx.strokeStyle = 'rgba(170, 225, 120, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fine lateral secondary veins
    ctx.strokeStyle = 'rgba(160, 215, 110, 0.22)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    const numVeins = 6;
    for (let v = 1; v <= numVeins; v++) {
      const vy = (v / (numVeins + 1)) * len * 0.85;
      const vw = width * 0.65 * (1.0 - (v / numVeins) * 0.3);
      ctx.moveTo(0, vy);
      ctx.lineTo(vw, vy + len * 0.12);
      ctx.moveTo(0, vy);
      ctx.lineTo(-vw, vy + len * 0.12);
    }
    ctx.stroke();

    ctx.restore();
  };

  // --- Quadrant 0: Emergent Canopy Broadleaf Spray (top-left: 0,0 to 512,512)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 512, 512);
  ctx.clip();

  // Primary woody branch stem
  ctx.beginPath();
  ctx.moveTo(256, 500);
  ctx.bezierCurveTo(256, 320, 270, 180, 256, 35);
  ctx.strokeStyle = '#22160d';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Secondary side branchlets
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(256, 380); ctx.quadraticCurveTo(295, 330, 360, 305);
  ctx.moveTo(256, 310); ctx.quadraticCurveTo(215, 260, 145, 235);
  ctx.moveTo(256, 220); ctx.quadraticCurveTo(290, 175, 370, 150);
  ctx.moveTo(256, 140); ctx.quadraticCurveTo(220, 100, 155, 75);
  ctx.stroke();

  // Clustered realistic tropical leaves along branches
  const leafClusters = [
    // Main stem
    { x: 256, y: 440, l: 85, w: 28, a: -0.65, c1: '#1b3f12', c2: '#285d1d' },
    { x: 256, y: 440, l: 85, w: 28, a:  0.65, c1: '#1b3f12', c2: '#285d1d' },
    { x: 256, y: 390, l: 82, w: 26, a: -0.80, c1: '#1e4815', c2: '#2d6821' },
    { x: 256, y: 360, l: 80, w: 26, a:  0.82, c1: '#1e4815', c2: '#2d6821' },
    { x: 256, y: 320, l: 78, w: 25, a: -0.75, c1: '#215017', c2: '#337625' },
    { x: 256, y: 280, l: 75, w: 24, a:  0.78, c1: '#215017', c2: '#337625' },
    { x: 256, y: 230, l: 72, w: 23, a: -0.70, c1: '#245a19', c2: '#38832a' },
    { x: 256, y: 190, l: 70, w: 22, a:  0.72, c1: '#245a19', c2: '#38832a' },
    { x: 256, y: 140, l: 68, w: 21, a: -0.60, c1: '#27621c', c2: '#3d902e' },
    { x: 256, y: 100, l: 65, w: 20, a:  0.62, c1: '#27621c', c2: '#3d902e' },
    { x: 256, y:  55, l: 60, w: 18, a: -0.35, c1: '#2c6d20', c2: '#439e33' },
    { x: 256, y:  35, l: 55, w: 16, a:  0.00, c1: '#2f7422', c2: '#49aa38' },
    // Right branch 1
    { x: 310, y: 345, l: 68, w: 22, a: 1.15, c1: '#1f4a16', c2: '#2f6e22' },
    { x: 350, y: 315, l: 64, w: 20, a: 1.35, c1: '#225218', c2: '#357b27' },
    // Left branch 1
    { x: 200, y: 280, l: 68, w: 22, a: -1.15, c1: '#1f4a16', c2: '#2f6e22' },
    { x: 155, y: 245, l: 64, w: 20, a: -1.35, c1: '#225218', c2: '#357b27' },
    // Right branch 2
    { x: 315, y: 190, l: 65, w: 21, a: 1.20, c1: '#23561a', c2: '#378129' },
    { x: 360, y: 160, l: 60, w: 19, a: 1.40, c1: '#265f1c', c2: '#3d8e2d' },
    // Left branch 2
    { x: 205, y: 120, l: 65, w: 21, a: -1.20, c1: '#23561a', c2: '#378129' },
    { x: 165, y:  85, l: 60, w: 19, a: -1.40, c1: '#265f1c', c2: '#3d8e2d' },
  ];

  for (const lc of leafClusters) {
    drawTropicalLeaf(lc.x, lc.y, lc.l, lc.w, lc.a, lc.c1, lc.c2);
  }
  ctx.restore();

  // --- Quadrant 1: Tropical Feather Palm Frond (top-right: 512,0 to 1024,512)
  ctx.save();
  ctx.translate(512, 0);
  ctx.beginPath();
  ctx.rect(0, 0, 512, 512);
  ctx.clip();

  // Arching golden-green palm rachis
  ctx.beginPath();
  ctx.moveTo(256, 505);
  ctx.bezierCurveTo(256, 300, 290, 140, 365, 25);
  ctx.strokeStyle = '#5a7522';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Slender tapering pinnae (leaflets) with realistic width taper and slight droop
  const numPinnae = 58;
  for (let i = 0; i < numPinnae; i++) {
    const t = i / numPinnae;
    const px = 256 + Math.pow(t, 1.75) * 105;
    const py = 485 - t * 455;
    const pLen = Math.sin(t * Math.PI) * 125 + 32;
    const tipWidth = 1.2;
    const baseWidth = 4.2;

    // Left pinna
    ctx.save();
    ctx.translate(px, py);
    const leftRot = -1.05 - t * 0.45;
    ctx.rotate(leftRot);
    ctx.beginPath();
    ctx.moveTo(0, -baseWidth * 0.5);
    ctx.lineTo(pLen, -tipWidth * 0.5);
    ctx.lineTo(pLen, tipWidth * 0.5);
    ctx.lineTo(0, baseWidth * 0.5);
    ctx.closePath();
    ctx.fillStyle = (i % 3 === 0) ? '#286214' : (i % 2 === 0) ? '#347b1c' : '#225210';
    ctx.fill();
    ctx.restore();

    // Right pinna
    ctx.save();
    ctx.translate(px, py);
    const rightRot = 0.95 + t * 0.52;
    ctx.rotate(rightRot);
    ctx.beginPath();
    ctx.moveTo(0, -baseWidth * 0.5);
    ctx.lineTo(pLen * 0.95, -tipWidth * 0.5);
    ctx.lineTo(pLen * 0.95, tipWidth * 0.5);
    ctx.lineTo(0, baseWidth * 0.5);
    ctx.closePath();
    ctx.fillStyle = (i % 3 === 0) ? '#38831f' : (i % 2 === 0) ? '#286214' : '#1d480d';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // --- Quadrant 2: Tree Fern Bipinnate Frond (bottom-left: 0,512 to 512,1024)
  ctx.save();
  ctx.translate(0, 512);
  ctx.beginPath();
  ctx.rect(0, 0, 512, 512);
  ctx.clip();

  // Delicate tapering dark stipe
  ctx.beginPath();
  ctx.moveTo(256, 505);
  ctx.quadraticCurveTo(256, 240, 256, 25);
  ctx.strokeStyle = '#181f0b';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Intricate feathery pinnae
  const numFernPinnae = 42;
  for (let i = 0; i < numFernPinnae; i++) {
    const t = i / numFernPinnae;
    const fy = 475 - t * 440;
    const span = Math.sin(t * Math.PI) * 110 + 22;

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(256, fy);
      ctx.rotate(side * (0.75 + t * 0.35));

      // Delicate rachis
      ctx.strokeStyle = '#22300f';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(span, 0);
      ctx.stroke();

      // Sub-leaflets (pinnules)
      const numSubs = 12;
      for (let s = 1; s <= numSubs; s++) {
        const st = s / numSubs;
        const subLen = (1.0 - st) * 20 + 4;
        const sx = st * span;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + 2.5, -subLen * 0.5);
        ctx.lineTo(sx + 3.5, 0);
        ctx.lineTo(sx + 2.5, subLen * 0.5);
        ctx.closePath();
        ctx.fillStyle = (s % 2 === 0) ? '#286f18' : '#1b520e';
        ctx.fill();
      }
      ctx.restore();
    }
  }
  ctx.restore();

  // --- Quadrant 3: Giant Monstera / Elephant Ear (bottom-right: 512,512 to 1024,1024)
  ctx.save();
  ctx.translate(512, 512);
  ctx.beginPath();
  ctx.rect(0, 0, 512, 512);
  ctx.clip();
  
  // Massive cordate tropical leaf with deep sinuses and organic contour
  ctx.translate(256, 256);
  ctx.beginPath();
  ctx.moveTo(0, -215); // Tip
  ctx.bezierCurveTo(165, -185, 215, 30, 155, 185);
  ctx.bezierCurveTo(115, 225, 20, 165, 0, 115); // Basal sinus
  ctx.bezierCurveTo(-20, 165, -115, 225, -155, 185);
  ctx.bezierCurveTo(-215, 30, -165, -185, 0, -215);
  
  const mGrad = ctx.createRadialGradient(0, -30, 20, 0, 0, 240);
  mGrad.addColorStop(0, '#286a1c');
  mGrad.addColorStop(0.6, '#184711');
  mGrad.addColorStop(1, '#0c2609');
  ctx.fillStyle = mGrad;
  ctx.fill();

  // Subtle translucent cream midrib and lateral veins
  ctx.strokeStyle = 'rgba(150, 210, 90, 0.45)';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(0, 115);
  ctx.lineTo(0, -205);
  ctx.stroke();

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgba(140, 200, 80, 0.3)';
  ctx.beginPath();
  for (let v = -4; v <= 4; v++) {
    if (v === 0) continue;
    const vy = -40 + v * 32;
    const vx = (v > 0 ? 1 : -1) * 135;
    ctx.moveTo(0, vy);
    ctx.quadraticCurveTo(vx * 0.5, vy - 20, vx, vy - 40);
  }
  ctx.stroke();

  // Monstera fenestrations (organic oval holes through alpha)
  ctx.globalCompositeOperation = 'destination-out';
  const holes = [
    [-65, -80, 12, 42, -0.55], [65, -80, 12, 42, 0.55],
    [-88, -15, 14, 50, -0.48], [88, -15, 14, 50, 0.48],
    [-72,  55, 13, 44, -0.38], [72,  55, 13, 44, 0.38],
    [-45, 120, 10, 32, -0.28], [45, 120, 10, 32, 0.28],
  ];
  for (const h of holes) {
    ctx.save();
    ctx.translate(h[0], h[1]);
    ctx.rotate(h[4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, h[2], h[3], 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Generate mipmaps and dilated texture
  const { baseImg, mipmaps } = makeMipmaps(canvas, W, H);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.mipmaps = mipmaps;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
}
