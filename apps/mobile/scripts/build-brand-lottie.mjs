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
  const DUR = 45; // 1.5s
  const rng = mulberry32(20260422);
  const colors = ['#EE8A57', '#1F5A4A', '#34C759'];
  const N = 22;

  const layers = [];
  for (let k = 0; k < N; k++) {
    const color = colors[k % colors.length];
    const startX = rng() * W;
    const drift = (rng() - 0.5) * 80;
    const endX = startX + drift;
    const startFrame = Math.floor(rng() * 12);
    const rotEnd = (rng() < 0.5 ? -1 : 1) * (360 + rng() * 360);
    const w = 6 + Math.floor(rng() * 6); // 6-11
    const h = 10 + Math.floor(rng() * 8); // 10-17
    // Shape placed at origin; we move via layer transform.
    const shapes = [
      group(`conf-${k}`, [rectShape(-w / 2, -h / 2, w, h, 1), fl(color, 100)]),
    ];
    const transform = {
      ind: k + 1,
      p: {
        a: 1,
        k: [
          { t: startFrame, s: [startX, -30, 0], i: { x: [0.16], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: DUR, s: [endX, H + 30, 0] },
        ],
      },
      r: {
        a: 1,
        k: [
          { t: startFrame, s: [0], i: { x: [0.4], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: DUR, s: [rotEnd] },
        ],
      },
      o: {
        a: 1,
        k: [
          { t: startFrame, s: [100], h: 1 },
          { t: Math.max(startFrame + 1, DUR - 10), s: [100], i: { x: [0.4], y: [1] }, o: { x: [0.4], y: [0] } },
          { t: DUR, s: [0] },
        ],
      },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
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
// Source coords from cheer.svg (viewBox 320). Scale factor = 200/320 = 0.625.
// We draw all shapes in a 200×200 world with the mascot centered.
const buildMascotBounce = () => {
  const W = 200;
  const H = 200;
  const FR = 30;
  const DUR = 30; // 1.0s
  const S = 0.625;
  const sc = (n) => n * S;

  // Tail triangle: (64,208) (102,176) (104,236)
  const tail = pathShape(
    [
      { x: sc(64), y: sc(208) },
      { x: sc(102), y: sc(176) },
      { x: sc(104), y: sc(236) },
    ],
    true
  );

  // Wing L (shadow) quadratic sequence
  const wingLStart = [sc(54), sc(124)];
  const wingLQs = [
    { cp: [sc(100), sc(90)], end: [sc(152), sc(120)] },
    { cp: [sc(180), sc(162)], end: [sc(146), sc(212)] },
    { cp: [sc(94), sc(224)], end: [sc(54), sc(182)] },
    { cp: [sc(54), sc(153)], end: [sc(54), sc(124)] },
  ];
  const wingL = pathShape(quadToVerts(wingLStart, wingLQs), true);

  // Wing R (shadow)
  const wingRStart = [sc(182), sc(122)];
  const wingRQs = [
    { cp: [sc(226), sc(88)], end: [sc(282), sc(118)] },
    { cp: [sc(306), sc(162)], end: [sc(276), sc(214)] },
    { cp: [sc(220), sc(220)], end: [sc(182), sc(180)] },
    { cp: [sc(182), sc(151)], end: [sc(182), sc(122)] },
  ];
  const wingR = pathShape(quadToVerts(wingRStart, wingRQs), true);

  // Body main shadow pass (upper)
  const bodyShadowStart = [sc(108), sc(178)];
  const bodyShadowQs = [
    { cp: [sc(138), sc(134)], end: [sc(214), sc(148)] },
    { cp: [sc(242), sc(198)], end: [sc(174), sc(248)] },
    { cp: [sc(116), sc(244)], end: [sc(108), sc(178)] },
  ];
  const bodyShadow = pathShape(quadToVerts(bodyShadowStart, bodyShadowQs), true);

  // Body ellipse: cx=168, cy=182, rx=98, ry=88
  const body = ellipseShape(sc(168), sc(182), sc(98), sc(88));

  // Beak triangle: (246,186) (284,202) (246,220)
  const beak = pathShape(
    [
      { x: sc(246), y: sc(186) },
      { x: sc(284), y: sc(202) },
      { x: sc(246), y: sc(220) },
    ],
    true
  );

  // Eyes
  const eyeL = ellipseShape(sc(198), sc(150), sc(10), sc(10));
  const eyeR = ellipseShape(sc(244), sc(150), sc(10), sc(10));
  const highlightL = ellipseShape(sc(201.5), sc(147), sc(3), sc(3));
  const highlightR = ellipseShape(sc(247.5), sc(147), sc(3), sc(3));

  // Mouth: Q curve (206,188) (222,204) (238,188) — open stroke, not closed
  const mouth = pathShape(
    quadToVerts([sc(206), sc(188)], [{ cp: [sc(222), sc(204)], end: [sc(238), sc(188)] }]),
    false
  );

  // Feet: two short vertical strokes
  const footL = pathShape(
    [
      { x: sc(132), y: sc(266) },
      { x: sc(132), y: sc(284) },
    ],
    false
  );
  const footR = pathShape(
    [
      { x: sc(184), y: sc(266) },
      { x: sc(184), y: sc(284) },
    ],
    false
  );

  // Group shapes with fills/strokes, back-to-front
  const shapes = [
    group('tail', [tail, fl('#E2814E', 100)]),
    group('wing-L', [wingL, fl('#E89366', 56)]),
    group('wing-R', [wingR, fl('#E89366', 88)]),
    group('body', [body, fl('#EE8A57', 100)]),
    group('body-hi', [ellipseShape(sc(150), sc(158), sc(56), sc(40)), fl('#FFC89B', 55)]),
    group('body-lo', [bodyShadow, fl('#E89366', 84)]),
    group('beak', [beak, fl('#FFB04A', 100)]),
    group('eye-L', [eyeL, fl('#3A2418', 100)]),
    group('eye-L-hi', [highlightL, fl('#FFFFFF', 100)]),
    group('eye-R', [eyeR, fl('#3A2418', 100)]),
    group('eye-R-hi', [highlightR, fl('#FFFFFF', 100)]),
    group('mouth', [mouth, st('#8B4E2E', 6, 100)]),
    group('foot-L', [footL, st('#C46A3E', 5, 100)]),
    group('foot-R', [footR, st('#C46A3E', 5, 100)]),
  ];

  // Bounce transform on the whole shape layer
  // Anchor at (100, 170) in canvas — near feet — so squash/stretch feels grounded.
  const ax = 100;
  const ay = 170;
  const transform = {
    ind: 1,
    a: { a: 0, k: [ax, ay, 0] },
    p: {
      a: 1,
      k: [
        { t: 0, s: [ax, ay, 0], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 6, s: [ax, ay + 6, 0], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.2, 0.2, 0.2], y: [0, 0, 0] } },
        { t: 14, s: [ax, ay - 34, 0], i: { x: [0.8, 0.8, 0.8], y: [1, 1, 1] }, o: { x: [0.6, 0.6, 0.6], y: [0, 0, 0] } },
        { t: 22, s: [ax, ay + 5, 0], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 30, s: [ax, ay, 0] },
      ],
    },
    s: {
      a: 1,
      k: [
        { t: 0, s: [100, 100, 100], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 6, s: [112, 86, 100], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 14, s: [94, 110, 100], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 22, s: [108, 88, 100], i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.4, 0.4, 0.4], y: [0, 0, 0] } },
        { t: 30, s: [100, 100, 100] },
      ],
    },
    r: { a: 0, k: 0 },
    o: { a: 0, k: 100 },
  };

  const layer = shapeLayerBase('mascot', 0, DUR, shapes, transform);

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
    layers: [layer],
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
