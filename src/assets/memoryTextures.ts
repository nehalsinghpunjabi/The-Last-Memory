import * as THREE from 'three';
import { makeRng, range, type Rng } from '@/utils/random';

/**
 * The memories.
 *
 * Every photograph in this film is painted at runtime on a 2D canvas. This is a
 * deliberate creative choice as much as a technical one: the AI is not showing
 * us photographs, it is *reconstructing* them from a failing archive, so they
 * should look like impressions — soft, over-exposed, half-remembered — rather
 * than stock imagery. It also means the entire experience ships with zero image
 * assets and works offline.
 *
 * Every image is deterministic (seeded), so a given fragment looks the same on
 * every visit. A memory that changed shape between viewings would break the
 * premise.
 */

export type MemoryKind =
  | 'family'
  | 'nature'
  | 'city'
  | 'friendship'
  | 'celebration'
  | 'ocean'
  | 'window'
  | 'final'
  // Archival records — the founding papers, schematics and headlines of the
  // history of AI, painted as luminous reconstructions rather than photographs.
  | 'paper'
  | 'diagram'
  | 'headline';

const PALETTES: Record<MemoryKind, string[]> = {
  family: ['#f7d9b0', '#e8a76b', '#8d5a3b', '#3a2418'],
  nature: ['#cfe3c0', '#7ba86a', '#3f5f3d', '#1d2a1c'],
  city: ['#ffd9a0', '#c98a55', '#4a4f63', '#171a24'],
  friendship: ['#ffe0c0', '#e58f6a', '#7a4a52', '#2a1a20'],
  celebration: ['#fff0c8', '#ffb45a', '#c85a7a', '#241428'],
  ocean: ['#d9ecff', '#6fa9d8', '#2f5f8a', '#101f2e'],
  window: ['#ffeacb', '#e0b184', '#6d5a4a', '#241c16'],
  final: ['#ffeccb', '#ffbe7d', '#b06a3c', '#2b1a10'],
  // Archival records: luminous ink on dark ground (suits additive blending).
  paper: ['#cfe0ec', '#8aa6bc', '#38424e', '#070a0e'],
  diagram: ['#bfe6dd', '#7fb3a6', '#33484a', '#060a0b'],
  headline: ['#ecdcc0', '#c2a074', '#5a4830', '#0a0806'],
};

interface Ctx2D extends CanvasRenderingContext2D {}

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: Ctx2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.round(size * 0.72);
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

/* ------------------------------------------------------------------ *
 * Painting primitives
 * ------------------------------------------------------------------ */

function sky(ctx: Ctx2D, w: number, h: number, palette: string[], rng: Rng) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, palette[3]);
  g.addColorStop(0.42, palette[2]);
  g.addColorStop(0.78, palette[1]);
  g.addColorStop(1, palette[0]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // A low, blown-out sun. Almost every human memory has one.
  const sx = range(rng, w * 0.2, w * 0.8);
  const sy = range(rng, h * 0.45, h * 0.72);
  const rad = range(rng, w * 0.18, w * 0.42);
  const s = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
  s.addColorStop(0, 'rgba(255,246,225,0.95)');
  s.addColorStop(0.25, 'rgba(255,214,160,0.55)');
  s.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, w, h);
  return { sx, sy };
}

/** A human silhouette. Not detailed — memory does not store detail. */
function figure(ctx: Ctx2D, x: number, baseY: number, height: number, color: string, rng: Rng) {
  const headR = height * 0.115;
  const bodyW = height * 0.2;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, baseY - height + headR, headR, 0, Math.PI * 2);
  ctx.fill();

  // Torso — a soft tapered shape rather than a rectangle.
  ctx.beginPath();
  ctx.moveTo(x - bodyW * 0.5, baseY);
  ctx.quadraticCurveTo(x - bodyW * 0.62, baseY - height * 0.55, x - bodyW * 0.34, baseY - height * 0.78);
  ctx.quadraticCurveTo(x, baseY - height * 0.86, x + bodyW * 0.34, baseY - height * 0.78);
  ctx.quadraticCurveTo(x + bodyW * 0.62, baseY - height * 0.55, x + bodyW * 0.5, baseY);
  ctx.closePath();
  ctx.fill();

  // Arms, sometimes raised, sometimes around a shoulder.
  const raised = rng() < 0.35;
  ctx.strokeStyle = color;
  ctx.lineWidth = height * 0.055;
  ctx.lineCap = 'round';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + dir * bodyW * 0.4, baseY - height * 0.68);
    if (raised) {
      ctx.quadraticCurveTo(
        x + dir * bodyW * 1.1,
        baseY - height * 0.9,
        x + dir * bodyW * 1.25,
        baseY - height * 1.05
      );
    } else {
      ctx.quadraticCurveTo(
        x + dir * bodyW * 0.95,
        baseY - height * 0.45,
        x + dir * bodyW * 0.85,
        baseY - height * 0.2
      );
    }
    ctx.stroke();
  }
}

function tree(ctx: Ctx2D, x: number, baseY: number, height: number, color: string, rng: Rng) {
  ctx.fillStyle = color;
  ctx.fillRect(x - height * 0.025, baseY - height * 0.45, height * 0.05, height * 0.45);
  const blobs = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < blobs; i++) {
    const bx = x + range(rng, -height * 0.22, height * 0.22);
    const by = baseY - height * range(rng, 0.5, 0.85);
    const br = height * range(rng, 0.12, 0.24);
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
}

function skyline(ctx: Ctx2D, w: number, h: number, baseY: number, color: string, rng: Rng) {
  let x = -20;
  while (x < w + 20) {
    const bw = range(rng, w * 0.03, w * 0.11);
    const bh = range(rng, h * 0.12, h * 0.5);
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - bh, bw, bh);
    // Lit windows.
    ctx.fillStyle = 'rgba(255,220,160,0.55)';
    for (let wy = baseY - bh + 6; wy < baseY - 6; wy += 9) {
      for (let wx = x + 4; wx < x + bw - 4; wx += 7) {
        if (rng() < 0.32) ctx.fillRect(wx, wy, 2.6, 3.4);
      }
    }
    x += bw + range(rng, 2, 10);
  }
}

function bokeh(ctx: Ctx2D, w: number, h: number, rng: Rng, count: number, hue: string) {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = range(rng, w * 0.012, w * 0.075);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hue.replace('ALPHA', String(range(rng, 0.06, 0.3))));
    g.addColorStop(0.7, hue.replace('ALPHA', String(range(rng, 0.02, 0.09))));
    g.addColorStop(1, hue.replace('ALPHA', '0'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Film finishing: halation, grain, vignette, and a light leak. */
function finish(ctx: Ctx2D, w: number, h: number, rng: Rng, grainAmount = 22) {
  // Light leak.
  if (rng() < 0.75) {
    const lx = rng() < 0.5 ? 0 : w;
    const g = ctx.createLinearGradient(lx, 0, w - lx, h);
    g.addColorStop(0, `rgba(255,${140 + Math.floor(rng() * 60)},90,0.22)`);
    g.addColorStop(0.45, 'rgba(255,180,120,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Vignette.
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, w * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  // Grain.
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * grainAmount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

/* ------------------------------------------------------------------ *
 * Scene painters
 * ------------------------------------------------------------------ */

function paint(kind: MemoryKind, seed: number, size: number): HTMLCanvasElement {
  const rng = makeRng(seed);
  const { canvas, ctx } = makeCanvas(size);
  const w = canvas.width;
  const h = canvas.height;
  const palette = PALETTES[kind];

  sky(ctx, w, h, palette, rng);
  const ground = h * range(rng, 0.72, 0.86);

  // Ground plane.
  const gg = ctx.createLinearGradient(0, ground - h * 0.1, 0, h);
  gg.addColorStop(0, palette[2]);
  gg.addColorStop(1, palette[3]);
  ctx.fillStyle = gg;
  ctx.fillRect(0, ground, w, h - ground);

  // Everything behind the subject is drawn softly — depth of field, in paint.
  ctx.filter = 'blur(2.4px)';

  switch (kind) {
    case 'nature': {
      for (let i = 0; i < 9; i++) {
        tree(ctx, range(rng, -20, w + 20), ground + range(rng, -6, 10), range(rng, h * 0.28, h * 0.62), palette[3], rng);
      }
      ctx.filter = 'blur(0.9px)';
      figure(ctx, w * range(rng, 0.35, 0.65), ground + h * 0.04, h * 0.3, 'rgba(30,22,16,0.86)', rng);
      break;
    }
    case 'city': {
      skyline(ctx, w, h, ground + h * 0.02, palette[3], rng);
      ctx.filter = 'blur(0.8px)';
      for (let i = 0; i < 5; i++) {
        figure(ctx, range(rng, w * 0.1, w * 0.9), h * range(rng, 0.9, 1.0), h * range(rng, 0.16, 0.3), 'rgba(20,16,14,0.75)', rng);
      }
      break;
    }
    case 'ocean': {
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (let i = 0; i < 40; i++) {
        const y = range(rng, ground, h);
        ctx.fillRect(range(rng, 0, w), y, range(rng, 6, w * 0.22), 1.6);
      }
      ctx.filter = 'blur(1.1px)';
      figure(ctx, w * range(rng, 0.3, 0.7), ground + h * 0.06, h * 0.26, 'rgba(16,24,32,0.8)', rng);
      break;
    }
    case 'window': {
      // Sunlight through a window frame — the most human image there is.
      ctx.fillStyle = 'rgba(20,14,10,0.9)';
      ctx.fillRect(0, 0, w, h);
      const fx = w * 0.18;
      const fy = h * 0.14;
      const fw = w * 0.64;
      const fh = h * 0.62;
      const gr = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
      gr.addColorStop(0, '#fff2d6');
      gr.addColorStop(1, '#e8a860');
      ctx.fillStyle = gr;
      ctx.fillRect(fx, fy, fw, fh);
      ctx.fillStyle = 'rgba(20,14,10,0.92)';
      ctx.fillRect(fx + fw * 0.48, fy, fw * 0.045, fh);
      ctx.fillRect(fx, fy + fh * 0.45, fw, fh * 0.045);
      break;
    }
    case 'celebration': {
      bokeh(ctx, w, h, rng, 26, 'rgba(255,190,120,ALPHA)');
      ctx.filter = 'blur(1.0px)';
      for (let i = 0; i < 6; i++) {
        figure(ctx, range(rng, w * 0.08, w * 0.92), ground + range(rng, 0, h * 0.08), h * range(rng, 0.22, 0.36), 'rgba(28,16,22,0.82)', rng);
      }
      // Sparks.
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,225,170,0.9)';
      for (let i = 0; i < 120; i++) {
        ctx.fillRect(rng() * w, rng() * ground, 1.6, 1.6);
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'friendship': {
      ctx.filter = 'blur(1.6px)';
      skyline(ctx, w, h, ground, palette[3], rng);
      ctx.filter = 'blur(0.7px)';
      const cx = w * 0.5;
      figure(ctx, cx - h * 0.13, ground + h * 0.06, h * 0.34, 'rgba(26,16,18,0.86)', rng);
      figure(ctx, cx + h * 0.13, ground + h * 0.06, h * 0.32, 'rgba(26,16,18,0.86)', rng);
      break;
    }
    case 'family':
    default: {
      ctx.filter = 'blur(2.0px)';
      for (let i = 0; i < 5; i++) {
        tree(ctx, range(rng, -20, w + 20), ground, range(rng, h * 0.2, h * 0.45), palette[3], rng);
      }
      ctx.filter = 'blur(0.7px)';
      const n = 3 + Math.floor(rng() * 2);
      const spacing = w / (n + 1);
      for (let i = 0; i < n; i++) {
        const tall = i === 0 || i === n - 1;
        figure(
          ctx,
          spacing * (i + 1) + range(rng, -8, 8),
          ground + h * 0.05,
          h * (tall ? range(rng, 0.3, 0.36) : range(rng, 0.18, 0.24)),
          'rgba(28,18,12,0.88)',
          rng
        );
      }
      break;
    }
  }

  ctx.filter = 'none';
  bokeh(ctx, w, h, rng, 10, 'rgba(255,210,160,ALPHA)');
  finish(ctx, w, h, rng);
  return canvas;
}

/**
 * A posed silhouette for the final photograph.
 *
 * Backlit against the sun, so there are no faces — the humanity is entirely in
 * the *body language*. Drawn as solid filled shapes (not strokes) so each
 * figure reads cleanly, with arms posed for connection: an arm around a
 * shoulder, a child reaching up, a head tilted toward the group. This is the
 * whole point of the ending, so it is drawn deliberately rather than randomly.
 */
interface Pose {
  /** -1 reaches left, +1 reaches right, 0 rests at side, 2 raised overhead. */
  leftArm: number;
  rightArm: number;
  headTilt: number;
  build: number; // 0.85 slim .. 1.15 broad
}

function finalFigure(
  ctx: Ctx2D,
  x: number,
  baseY: number,
  height: number,
  color: string,
  pose: Pose
) {
  const headR = height * 0.11;
  const neckY = baseY - height + headR * 2;
  const shoulderW = height * 0.2 * pose.build;
  const hipW = height * 0.13 * pose.build;
  const shoulderY = neckY + height * 0.02;
  const hipY = baseY - height * 0.42;

  ctx.fillStyle = color;

  // Head (tilted).
  const hx = x + pose.headTilt * headR * 0.9;
  ctx.beginPath();
  ctx.ellipse(hx, baseY - height + headR, headR * 0.9, headR, pose.headTilt * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Neck.
  ctx.fillRect(x - headR * 0.32, neckY - headR * 0.5, headR * 0.64, headR);

  // Torso — shoulders to hips, gently tapered.
  ctx.beginPath();
  ctx.moveTo(x - shoulderW * 0.5, shoulderY);
  ctx.quadraticCurveTo(x - shoulderW * 0.55, (shoulderY + hipY) / 2, x - hipW * 0.5, hipY);
  ctx.lineTo(x + hipW * 0.5, hipY);
  ctx.quadraticCurveTo(x + shoulderW * 0.55, (shoulderY + hipY) / 2, x + shoulderW * 0.5, shoulderY);
  ctx.closePath();
  ctx.fill();

  // Legs.
  const legW = hipW * 0.52;
  const legTop = hipY - height * 0.01;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + dir * hipW * 0.12, legTop);
    ctx.lineTo(x + dir * (hipW * 0.12 + legW), legTop);
    ctx.quadraticCurveTo(
      x + dir * (hipW * 0.4 + legW),
      (legTop + baseY) / 2,
      x + dir * hipW * 0.55,
      baseY
    );
    ctx.lineTo(x + dir * hipW * 0.08, baseY);
    ctx.closePath();
    ctx.fill();
  }

  // Arms — the language of the picture.
  const armW = shoulderW * 0.2;
  const drawArm = (side: number, reach: number) => {
    const sx = x + side * shoulderW * 0.42;
    const sy = shoulderY + height * 0.01;
    let ex: number, ey: number, mx: number, my: number;
    if (reach === 2) {
      // Raised overhead (the child's joy).
      ex = x + side * shoulderW * 0.5;
      ey = baseY - height - headR * 0.4;
      mx = x + side * shoulderW * 0.9;
      my = sy - height * 0.16;
    } else if (reach !== 0 && Math.sign(reach) !== side) {
      // Reaching across — an arm around the neighbour's shoulder.
      ex = x + reach * shoulderW * 1.7;
      ey = neckY + height * 0.02;
      mx = x + side * shoulderW * 0.5;
      my = sy + height * 0.02;
    } else {
      // Resting at the side.
      ex = x + side * (hipW * 0.5 + armW);
      ey = hipY + height * 0.04;
      mx = x + side * shoulderW * 0.7;
      my = (sy + hipY) / 2;
    }
    ctx.beginPath();
    ctx.moveTo(sx - side * armW * 0.5, sy);
    ctx.lineTo(sx + side * armW * 0.5, sy);
    ctx.quadraticCurveTo(mx + side * armW * 0.5, my, ex + armW * 0.5, ey);
    ctx.lineTo(ex - armW * 0.5, ey);
    ctx.quadraticCurveTo(mx - side * armW * 0.5, my, sx - side * armW * 0.5, sy);
    ctx.closePath();
    ctx.fill();
  };
  drawArm(-1, pose.leftArm);
  drawArm(1, pose.rightArm);
}

/**
 * The final photograph.
 *
 * Painted at higher fidelity and warmer than every other memory, because the
 * camera holds on it for nine seconds and the whole film lands on it. Four
 * people, standing close, in ordinary afternoon light. Nothing grand.
 */
function paintFinal(seed: number, size: number): HTMLCanvasElement {
  const rng = makeRng(seed);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.round(size * 0.75);
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  // Late-afternoon sky.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#6d4a33');
  g.addColorStop(0.35, '#c98a52');
  g.addColorStop(0.62, '#ffc887');
  g.addColorStop(0.82, '#ffe3b4');
  g.addColorStop(1, '#c9a06a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // The sun, low and directly behind them.
  const sx = w * 0.52;
  const sy = h * 0.6;
  const s = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.46);
  s.addColorStop(0, 'rgba(255,250,236,1)');
  s.addColorStop(0.12, 'rgba(255,236,200,0.9)');
  s.addColorStop(0.4, 'rgba(255,200,140,0.42)');
  s.addColorStop(1, 'rgba(255,180,110,0)');
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, w, h);

  const ground = h * 0.78;

  // Grass, out of focus.
  ctx.filter = 'blur(3px)';
  const gg = ctx.createLinearGradient(0, ground - h * 0.06, 0, h);
  gg.addColorStop(0, '#8a6a3a');
  gg.addColorStop(1, '#2e2015');
  ctx.fillStyle = gg;
  ctx.fillRect(0, ground - h * 0.04, w, h - ground + h * 0.04);

  // A treeline, far away.
  ctx.filter = 'blur(4.5px)';
  for (let i = 0; i < 12; i++) {
    tree(ctx, range(rng, -30, w + 30), ground - h * 0.01, range(rng, h * 0.14, h * 0.3), 'rgba(58,38,24,0.85)', rng);
  }

  // Four people, standing close, posed for connection. Read left to right:
  // an adult with an arm around a child; the child reaching up in delight; a
  // second adult leaning in with a hand on the child's shoulder; and a friend
  // at the edge, head tilted toward the group. Crisp (the subject), warm, and
  // deliberately arranged — this is the image the whole film is about.
  const baseY = ground + h * 0.05;
  const group: Array<{ x: number; height: number; pose: Pose }> = [
    { x: w * 0.36, height: h * 0.35, pose: { leftArm: 0, rightArm: 0.55, headTilt: 0.4, build: 1.12 } },
    { x: w * 0.47, height: h * 0.21, pose: { leftArm: 2, rightArm: 2, headTilt: -0.2, build: 0.9 } },
    { x: w * 0.56, height: h * 0.34, pose: { leftArm: -0.5, rightArm: 0, headTilt: -0.35, build: 1.1 } },
    { x: w * 0.66, height: h * 0.31, pose: { leftArm: -0.4, rightArm: 0, headTilt: -0.5, build: 1.0 } },
  ];

  // Figures are the sharpest thing in the frame — only the faintest softening.
  ctx.filter = 'blur(0.4px)';
  for (const p of group) {
    finalFigure(ctx, p.x, baseY, p.height, 'rgba(30,17,10,0.94)', p.pose);
  }
  ctx.filter = 'none';

  // Rim light: the sun burning a bright edge around every silhouette — the
  // detail that reads as "photographed" rather than "drawn". Warmer and
  // stronger than the other memories.
  ctx.filter = 'blur(5px)';
  ctx.globalCompositeOperation = 'lighter';
  for (const p of group) {
    const rg = ctx.createRadialGradient(
      p.x,
      baseY - p.height * 0.62,
      0,
      p.x,
      baseY - p.height * 0.62,
      p.height * 0.72
    );
    rg.addColorStop(0, 'rgba(255,232,190,0.62)');
    rg.addColorStop(0.6, 'rgba(255,208,150,0.22)');
    rg.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';

  bokeh(ctx, w, h, rng, 16, 'rgba(255,220,170,ALPHA)');
  finish(ctx, w, h, rng, 14);
  return canvas;
}

/**
 * Archival records — the founding papers, schematics and headlines of AI.
 *
 * Painted as luminous ink on a dark ground rather than dark ink on white paper:
 * the memories render through an additive hologram shader, so a bright page
 * would blow out, but glowing lines on black read exactly as a reconstructed
 * record floating in the archive. The content is abstract — the *shape* of a
 * paper, a network diagram, a newspaper — not legible text, matching the film's
 * "half-remembered impression" language.
 */
function paintDocument(kind: MemoryKind, seed: number, size: number): HTMLCanvasElement {
  const rng = makeRng(seed);
  const { canvas, ctx } = makeCanvas(size);
  const w = canvas.width;
  const h = canvas.height;
  const palette = PALETTES[kind];

  // Dark ground with a faint page edge.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, palette[3]);
  bg.addColorStop(1, '#03060a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const ink = palette[0];
  const rgb = hexToRgb(ink);
  const lit = (a: number) => `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
  const line = (x: number, y: number, len: number, thick: number, a: number) => {
    ctx.fillStyle = lit(a);
    ctx.fillRect(x, y, len, thick);
  };
  const m = w * 0.1;

  if (kind === 'diagram') {
    // A layered network / flowchart sketch — the shape of a perceptron.
    const layers = 3 + Math.floor(rng() * 2);
    const cols: Array<Array<{ x: number; y: number }>> = [];
    for (let l = 0; l < layers; l++) {
      const n = 2 + Math.floor(rng() * 3);
      const cx = m + (w - 2 * m) * (layers === 1 ? 0.5 : l / (layers - 1));
      const nodes: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < n; i++) {
        const cy = h * 0.26 + h * 0.5 * (n === 1 ? 0.5 : i / (n - 1));
        nodes.push({ x: cx, y: cy });
      }
      cols.push(nodes);
    }
    ctx.strokeStyle = lit(0.25);
    ctx.lineWidth = 1;
    for (let l = 0; l < cols.length - 1; l++)
      for (const a of cols[l])
        for (const b of cols[l + 1]) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
    for (const col of cols)
      for (const nd of col) {
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, w * 0.026, 0, Math.PI * 2);
        ctx.fillStyle = palette[3];
        ctx.fill();
        ctx.strokeStyle = lit(0.85);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    line(m, h * 0.12, (w - 2 * m) * 0.5, 4, 0.8); // title
    line(m, h * 0.86, (w - 2 * m) * 0.66, 2, 0.42); // caption
    line(m, h * 0.9, (w - 2 * m) * 0.4, 2, 0.34);
  } else if (kind === 'headline') {
    line(m, h * 0.1, w - 2 * m, 2, 0.5); // masthead rule
    let y = h * 0.15;
    for (let row = 0; row < 2; row++) {
      let x = m;
      const words = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < words; i++) {
        const wl = range(rng, (w - 2 * m) * 0.1, (w - 2 * m) * 0.24);
        if (x + wl > w - m) break;
        line(x, y, wl, h * 0.05, 0.85);
        x += wl + w * 0.02;
      }
      y += h * 0.09;
    }
    // Photo box + body columns.
    const px = m;
    const py = h * 0.4;
    const pw = (w - 2 * m) * 0.44;
    const ph = h * 0.28;
    ctx.strokeStyle = lit(0.5);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = lit(0.12);
    ctx.fillRect(px, py, pw, ph);
    const colX = px + pw + w * 0.04;
    let ty = py;
    for (let i = 0; ty < py + ph; i++) {
      line(colX, ty, (w - m - colX) * (i % 4 === 3 ? 0.6 : 1), 2, 0.4);
      ty += h * 0.035;
    }
    for (let c = 0; c < 2; c++) {
      const bx = m + c * ((w - 2 * m) / 2 + w * 0.02);
      let by = h * 0.72;
      for (let i = 0; i < 6; i++) {
        line(bx, by, ((w - 2 * m) / 2 - w * 0.02) * (i % 3 === 2 ? 0.5 : 0.95), 2, 0.38);
        by += h * 0.032;
      }
    }
  } else {
    // 'paper' — a research paper: title, authors, two columns of text.
    line(w * 0.2, h * 0.1, w * 0.6, 4, 0.82);
    line(w * 0.28, h * 0.15, w * 0.44, 4, 0.82);
    line(w * 0.34, h * 0.2, w * 0.32, 2.5, 0.5);
    const colW = (w - 2 * m - w * 0.04) / 2;
    for (let c = 0; c < 2; c++) {
      const cx = m + c * (colW + w * 0.04);
      let y = h * 0.28;
      while (y < h * 0.9) {
        const paraLines = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < paraLines && y < h * 0.9; i++) {
          const last = i === paraLines - 1;
          line(cx, y, colW * (last ? range(rng, 0.3, 0.7) : range(rng, 0.9, 1.0)), 2, 0.4);
          y += h * 0.028;
        }
        y += h * 0.02;
        if (rng() < 0.2 && y < h * 0.72) {
          const fh = h * range(rng, 0.08, 0.15);
          ctx.strokeStyle = lit(0.45);
          ctx.lineWidth = 1.4;
          ctx.strokeRect(cx, y, colW, fh);
          y += fh + h * 0.02;
        }
      }
    }
  }

  finish(ctx, w, h, rng, 14);
  return canvas;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/* ------------------------------------------------------------------ *
 * Texture factory + cache
 * ------------------------------------------------------------------ */

const DOCUMENT_KINDS = new Set<MemoryKind>(['paper', 'diagram', 'headline']);

const cache = new Map<string, THREE.CanvasTexture>();

export function getMemoryTexture(kind: MemoryKind, seed: number, size = 384): THREE.CanvasTexture {
  const key = `${kind}:${seed}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas =
    kind === 'final'
      ? paintFinal(seed, size)
      : DOCUMENT_KINDS.has(kind)
        ? paintDocument(kind, seed, size)
        : paint(kind, seed, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  cache.set(key, texture);
  return texture;
}

export const MEMORY_KINDS: MemoryKind[] = [
  'family',
  'nature',
  'city',
  'friendship',
  'celebration',
  'ocean',
  'window',
  // Archival records mixed into the halls — the founding papers, schematics and
  // headlines of AI. Weighted so roughly a third of the hall reads as documents.
  'paper',
  'paper',
  'diagram',
  'diagram',
  'headline',
];

/** Dispose every cached texture — called when the experience unmounts. */
export function disposeMemoryTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
