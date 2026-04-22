#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, '..');

const hexToRgba = (hex, a = 1) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b, a];
};

const fl = (hex, op = 100) => ({
  ty: 'fl',
  c: { a: 0, k: hexToRgba(hex) },
  o: { a: 0, k: op },
  r: 1,
  bm: 0,
  nm: 'fill',
});

const st = (hex, w, op = 100) => ({
  ty: 'st',
  c: { a: 0, k: hexToRgba(hex) },
  o: { a: 0, k: op },
  w: { a: 0, k: w },
  lc: 2,
  lj: 2,
  bm: 0,
  nm: 'stroke',
});

const tr = () => ({
  ty: 'tr',
  p: { a: 0, k: [0, 0] },
  a: { a: 0, k: [0, 0] },
  s: { a: 0, k: [100, 100] },
  r: { a: 0, k: 0 },
  o: { a: 0, k: 100 },
  sk: { a: 0, k: 0 },
  sa: { a: 0, k: 0 },
});

const ellipseShape = (cx, cy, rx, ry) => ({
  ty: 'el',
  p: { a: 0, k: [cx, cy] },
  s: { a: 0, k: [rx * 2, ry * 2] },
  d: 1,
  nm: 'ellipse',
});

const rectShape = (x, y, w, h, r = 0) => ({
  ty: 'rc',
  p: { a: 0, k: [x + w / 2, y + h / 2] },
  s: { a: 0, k: [w, h] },
  r: { a: 0, k: r },
  d: 1,
  nm: 'rect',
});

const diamondShape = (cx, cy, r) =>
  pathShape(
    [
      { x: cx, y: cy - r },
      { x: cx + r, y: cy },
      { x: cx, y: cy + r },
      { x: cx - r, y: cy },
    ],
    true
  );

// Build a closed path from an array of vertex objects {x,y, iX,iY, oX,oY} (tangents absolute; converted to relative here)
const pathShape = (verts, closed = true) => {
  const v = verts.map((p) => [p.x, p.y]);
  const i = verts.map((p) => [(p.iX ?? p.x) - p.x, (p.iY ?? p.y) - p.y]);
  const o = verts.map((p) => [(p.oX ?? p.x) - p.x, (p.oY ?? p.y) - p.y]);
  return {
    ty: 'sh',
    ks: { a: 0, k: { c: closed, v, i, o } },
    nm: 'path',
  };
};

// Approximate SVG quadratic (start, cp, end) as cubic by computing tangents 2/3 of the way
// Given a sequence of Q curves with a start vertex, emit Lottie-compatible verts.
const quadToVerts = (start, qs) => {
  // qs: [{cp:[cx,cy], end:[ex,ey]}, ...]
  const verts = [];
  // First vertex: in-tangent equals vertex itself (no control on left), out-tangent from first Q
  let prev = start;
  const firstQ = qs[0];
  const firstOutX = prev[0] + (2 / 3) * (firstQ.cp[0] - prev[0]);
  const firstOutY = prev[1] + (2 / 3) * (firstQ.cp[1] - prev[1]);
  verts.push({ x: prev[0], y: prev[1], iX: prev[0], iY: prev[1], oX: firstOutX, oY: firstOutY });
  for (let k = 0; k < qs.length; k++) {
    const q = qs[k];
    const end = q.end;
    const inX = end[0] + (2 / 3) * (q.cp[0] - end[0]);
    const inY = end[1] + (2 / 3) * (q.cp[1] - end[1]);
    let outX = end[0];
    let outY = end[1];
    if (k + 1 < qs.length) {
      const nextCp = qs[k + 1].cp;
      outX = end[0] + (2 / 3) * (nextCp[0] - end[0]);
      outY = end[1] + (2 / 3) * (nextCp[1] - end[1]);
    }
    verts.push({ x: end[0], y: end[1], iX: inX, iY: inY, oX: outX, oY: outY });
    prev = end;
  }
  return verts;
};

const group = (name, shapes) => ({ ty: 'gr', nm: name, it: [...shapes, tr()] });

const shapeLayerBase = (nm, ip, op, shapes, transform = {}) => ({
  ddd: 0,
  ind: transform.ind ?? 1,
  ty: 4,
  nm,
  sr: 1,
  ks: {
    o: transform.o ?? { a: 0, k: 100 },
    r: transform.r ?? { a: 0, k: 0 },
    p: transform.p ?? { a: 0, k: [0, 0, 0] },
    a: transform.a ?? { a: 0, k: [0, 0, 0] },
    s: transform.s ?? { a: 0, k: [100, 100, 100] },
  },
  ao: 0,
  shapes,
  ip,
  op,
  st: 0,
  bm: 0,
  parent: transform.parent,
});

// Deterministic PRNG (mulberry32)
const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

// ---- Confetti ----
const buildConfetti = () => {
  const W = 390;
  const H = 200;
  const FR = 30;
  const DUR = 42; // 1.4s
  const rng = mulberry32(20260422);
  const colors = ['#EE8A57', '#15695C', '#34C759', '#FFF1DB'];
  const N = 24;

  const layers = [];
  for (let k = 0; k < N; k++) {
    const color = colors[k % colors.length];
    const startX = rng() * W;
    const midX = startX + (rng() - 0.5) * 54;
    const endX = startX + (rng() - 0.5) * 92;
    const startFrame = Math.floor(rng() * 12);
    const midFrame = startFrame + 16 + Math.floor(rng() * 6);
    const rotMid = (rng() < 0.5 ? -1 : 1) * (120 + rng() * 160);
    const rotEnd = rotMid + (rng() < 0.5 ? -1 : 1) * (180 + rng() * 280);
    const size = 5 + Math.floor(rng() * 7);
    const opacity = 58 + Math.floor(rng() * 34);
    const type = k % 4;
    const shapeItem =
      type === 0
        ? rectShape(-size / 2, -size, size, size * 1.8, 1.4)
        : type === 1
          ? ellipseShape(0, 0, size * 0.55, size * 0.55)
          : type === 2
            ? diamondShape(0, 0, size * 0.78)
            : rectShape(-size / 2.6, -size * 1.35, size / 1.3, size * 2.7, size * 0.3);
    const shapes = [group(`conf-${k}`, [shapeItem, fl(color, opacity)])];
    const transform = {
      ind: k + 1,
      p: {
        a: 1,
        k: [
          { t: startFrame, s: [startX, -32, 0], i: { x: [0.16], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: midFrame, s: [midX, 86 + rng() * 28, 0], i: { x: [0.2], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: DUR, s: [endX, H + 26, 0] },
        ],
      },
      r: {
        a: 1,
        k: [
          { t: startFrame, s: [0], i: { x: [0.4], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: midFrame, s: [rotMid], i: { x: [0.3], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: DUR, s: [rotEnd] },
        ],
      },
      o: {
        a: 1,
        k: [
          { t: startFrame, s: [0], h: 1 },
          { t: startFrame + 1, s: [100], i: { x: [0.2], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: Math.max(midFrame, DUR - 8), s: [100], i: { x: [0.4], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: DUR, s: [0] },
        ],
      },
      a: { a: 0, k: [0, 0, 0] },
      s: {
        a: 1,
        k: [
          { t: startFrame, s: [70 + rng() * 20, 70 + rng() * 20, 100] },
          { t: midFrame, s: [105 + rng() * 16, 105 + rng() * 16, 100] },
          { t: DUR, s: [88 + rng() * 12, 88 + rng() * 12, 100] },
        ],
      },
    };
    layers.push(shapeLayerBase(`particle-${k}`, 0, DUR, shapes, transform));
  }

  return {
    v: '5.7.0',
    fr: FR,
    ip: 0,
    op: DUR,
    w: W,
    h: H,
    nm: 'confetti',
    ddd: 0,
    assets: [],
    layers,
  };
};

// ---- Mascot bounce ----
const buildMascotBounce = () => {
  const W = 200;
  const H = 200;
  const FR = 30;
  const DUR = 30; // 1.0s
  const tail = pathShape(
    quadToVerts([36, 132], [
      { cp: [18, 126], end: [16, 150] },
      { cp: [24, 168], end: [48, 170] },
      { cp: [34, 180], end: [20, 184] },
      { cp: [34, 190], end: [58, 178] },
      { cp: [68, 164], end: [56, 150] },
      { cp: [48, 140], end: [36, 132] },
    ]),
    true
  );
  const tuftBack = pathShape(
    quadToVerts([74, 34], [
      { cp: [58, 24], end: [50, 10] },
      { cp: [64, 4], end: [86, 26] },
      { cp: [82, 32], end: [74, 34] },
    ]),
    true
  );
  const tuftFront = pathShape(
    quadToVerts([62, 42], [
      { cp: [42, 36], end: [38, 22] },
      { cp: [52, 16], end: [72, 34] },
      { cp: [66, 40], end: [62, 42] },
    ]),
    true
  );
  const body = pathShape(
    quadToVerts([72, 32], [
      { cp: [118, 18], end: [162, 48] },
      { cp: [188, 72], end: [188, 120] },
      { cp: [182, 164], end: [146, 184] },
      { cp: [106, 196], end: [74, 182] },
      { cp: [38, 164], end: [34, 116] },
      { cp: [32, 70], end: [72, 32] },
    ]),
    true
  );
  const bodyDark = pathShape(
    quadToVerts([70, 38], [
      { cp: [48, 70], end: [44, 118] },
      { cp: [46, 156], end: [78, 178] },
      { cp: [62, 150], end: [66, 112] },
      { cp: [68, 76], end: [82, 44] },
      { cp: [76, 38], end: [70, 38] },
    ]),
    true
  );
  const bodyHighlight = pathShape(
    quadToVerts([104, 38], [
      { cp: [146, 28], end: [170, 58] },
      { cp: [150, 44], end: [118, 50] },
      { cp: [108, 44], end: [104, 38] },
    ]),
    true
  );
  const belly = pathShape(
    quadToVerts([112, 112], [
      { cp: [122, 98], end: [142, 98] },
      { cp: [168, 102], end: [176, 130] },
      { cp: [176, 164], end: [150, 182] },
      { cp: [112, 194], end: [82, 178] },
      { cp: [102, 162], end: [112, 112] },
    ]),
    true
  );
  const wing = pathShape(
    quadToVerts([64, 122], [
      { cp: [48, 94], end: [72, 74] },
      { cp: [104, 58], end: [128, 82] },
      { cp: [140, 104], end: [124, 134] },
      { cp: [106, 154], end: [82, 154] },
      { cp: [66, 150], end: [64, 122] },
    ]),
    true
  );
  const wingInnerTop = pathShape(
    quadToVerts([78, 118], [
      { cp: [76, 96], end: [96, 88] },
      { cp: [110, 90], end: [116, 108] },
      { cp: [104, 104], end: [92, 108] },
      { cp: [82, 112], end: [78, 118] },
    ]),
    false
  );
  const wingInnerBottom = pathShape(
    quadToVerts([94, 134], [
      { cp: [98, 118], end: [112, 114] },
      { cp: [124, 120], end: [124, 132] },
      { cp: [114, 128], end: [104, 130] },
      { cp: [96, 132], end: [94, 134] },
    ]),
    false
  );
  const beakTop = pathShape(
    quadToVerts([146, 104], [
      { cp: [152, 96], end: [166, 96] },
      { cp: [178, 100], end: [184, 108] },
      { cp: [176, 114], end: [164, 116] },
      { cp: [152, 116], end: [146, 104] },
    ]),
    true
  );
  const beakLower = pathShape(
    quadToVerts([148, 112], [
      { cp: [156, 120], end: [166, 122] },
      { cp: [174, 120], end: [178, 114] },
      { cp: [174, 128], end: [164, 130] },
      { cp: [152, 128], end: [148, 112] },
    ]),
    true
  );
  const beakMouth = pathShape(
    quadToVerts([151, 112], [
      { cp: [158, 118], end: [166, 119] },
      { cp: [170, 118], end: [174, 114] },
      { cp: [166, 114], end: [151, 112] },
    ]),
    true
  );
  const cheekL = ellipseShape(126, 108, 8, 8);
  const cheekR = ellipseShape(178, 100, 6.5, 6.5);
  const eyeL = ellipseShape(142, 86, 8.5, 11.5);
  const eyeR = ellipseShape(173, 78, 7.5, 10);
  const highlightL = ellipseShape(144, 82, 2.8, 3.8);
  const highlightR = ellipseShape(175, 75, 2.3, 3.2);
  const footL = pathShape(
    quadToVerts([96, 180], [
      { cp: [90, 184], end: [88, 192] },
      { cp: [92, 200], end: [100, 196] },
      { cp: [102, 202], end: [110, 196] },
      { cp: [116, 200], end: [122, 190] },
      { cp: [116, 182], end: [108, 180] },
      { cp: [104, 186], end: [96, 180] },
    ]),
    true
  );
  const footR = pathShape(
    quadToVerts([132, 178], [
      { cp: [126, 182], end: [124, 192] },
      { cp: [130, 200], end: [138, 196] },
      { cp: [140, 202], end: [148, 196] },
      { cp: [154, 200], end: [160, 190] },
      { cp: [154, 180], end: [144, 178] },
      { cp: [140, 184], end: [132, 178] },
    ]),
    true
  );

  const shapes = [
    group('tail', [tail, fl('#0D4E43', 100)]),
    group('tuft-back', [tuftBack, fl('#15695C', 100)]),
    group('tuft-front', [tuftFront, fl('#0F5E53', 100)]),
    group('body', [body, fl('#15695C', 100)]),
    group('body-dark', [bodyDark, fl('#0D4E43', 44)]),
    group('body-highlight', [bodyHighlight, fl('#6CC0B2', 28)]),
    group('belly', [belly, fl('#FFF1DB', 100)]),
    group('wing', [wing, fl('#0E5A4F', 100)]),
    group('wing-line-top', [wingInnerTop, st('#0A4A40', 1.6, 38)]),
    group('wing-line-bottom', [wingInnerBottom, st('#0A4A40', 1.6, 34)]),
    group('cheek-L', [cheekL, fl('#FF9C42', 100)]),
    group('cheek-R', [cheekR, fl('#FF9C42', 100)]),
    group('beak-top', [beakTop, fl('#FF9B38', 100)]),
    group('beak-lower', [beakLower, fl('#F57E17', 100)]),
    group('beak-mouth', [beakMouth, fl('#B74116', 100)]),
    group('eye-L', [eyeL, fl('#2F241F', 100)]),
    group('eye-L-hi', [highlightL, fl('#FFFFFF', 100)]),
    group('eye-R', [eyeR, fl('#2F241F', 100)]),
    group('eye-R-hi', [highlightR, fl('#FFFFFF', 100)]),
    group('foot-L', [footL, fl('#F27B14', 100)]),
    group('foot-R', [footR, fl('#F27B14', 100)]),
  ];

  const bodyTransform = {
    ind: 2,
    a: { a: 0, k: [108, 186, 0] },
    p: {
      a: 1,
      k: [
        { t: 0, s: [0, 0, 0], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 6, s: [0, 4, 0], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.2, 0.2, 0.2], y: [0, 0, 0] } },
        { t: 14, s: [0, -34, 0], i: { x: [0.75, 0.75, 0.75], y: [1, 1, 1] }, o: { x: [0.55, 0.55, 0.55], y: [0, 0, 0] } },
        { t: 22, s: [0, 2, 0], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 30, s: [0, 0, 0] },
      ],
    },
    s: {
      a: 1,
      k: [
        { t: 0, s: [100, 100, 100], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 6, s: [108, 90, 100], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 14, s: [93, 107, 100], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 22, s: [103, 95, 100], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 30, s: [100, 100, 100] },
      ],
    },
    r: {
      a: 1,
      k: [
        { t: 0, s: [0], i: { x: [0.4], y: [1] }, o: { x: [0.4], y: [0] } },
        { t: 10, s: [-1.5], i: { x: [0.4], y: [1] }, o: { x: [0.4], y: [0] } },
        { t: 18, s: [1.2], i: { x: [0.4], y: [1] }, o: { x: [0.4], y: [0] } },
        { t: 30, s: [0] },
      ],
    },
    o: { a: 0, k: 100 },
  };

  const shadowLayer = shapeLayerBase(
    'shadow',
    0,
    DUR,
    [group('shadow', [ellipseShape(108, 191, 42, 10), fl('#B98945', 22)])],
    {
      ind: 1,
      a: { a: 0, k: [108, 191, 0] },
      p: { a: 0, k: [0, 0, 0] },
      r: { a: 0, k: 0 },
      o: {
        a: 1,
        k: [
          { t: 0, s: [22] },
          { t: 14, s: [10] },
          { t: 30, s: [20] },
        ],
      },
      s: {
        a: 1,
        k: [
          { t: 0, s: [100, 100, 100] },
          { t: 6, s: [108, 90, 100] },
          { t: 14, s: [62, 70, 100] },
          { t: 22, s: [112, 92, 100] },
          { t: 30, s: [100, 100, 100] },
        ],
      },
    }
  );

  const bodyLayer = shapeLayerBase('mascot', 0, DUR, shapes, bodyTransform);

  return {
    v: '5.7.0',
    fr: FR,
    ip: 0,
    op: DUR,
    w: W,
    h: H,
    nm: 'mascot-bounce',
    ddd: 0,
    assets: [],
    layers: [shadowLayer, bodyLayer],
  };
};

const writeJson = async (rel, obj) => {
  const out = path.join(mobileRoot, rel);
  const json = JSON.stringify(obj);
  await writeFile(out, json);
  const kb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
  console.log(`wrote ${rel} (${kb} KB)`);
};

await writeJson('assets/lottie/confetti.json', buildConfetti());
await writeJson('assets/lottie/mascot-bounce.json', buildMascotBounce());
