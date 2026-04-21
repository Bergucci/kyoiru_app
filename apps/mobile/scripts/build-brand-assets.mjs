#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, '..');

const jobs = [
  { src: 'assets/brand/icon.svg', out: 'assets/icon.png', w: 1024, h: 1024 },
  { src: 'assets/brand/adaptive-icon.svg', out: 'assets/adaptive-icon.png', w: 1024, h: 1024 },
  { src: 'assets/brand/splash.svg', out: 'assets/splash.png', w: 1284, h: 2778 },
  { src: 'assets/brand/splash-icon.svg', out: 'assets/splash-icon.png', w: 1024, h: 1024 },
  { src: 'assets/brand/notification-icon.svg', out: 'assets/notification-icon.png', w: 96, h: 96 },
];

for (const job of jobs) {
  const srcPath = path.join(mobileRoot, job.src);
  const outPath = path.join(mobileRoot, job.out);
  const svg = await readFile(srcPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: job.w },
    font: { loadSystemFonts: true },
  });
  const png = resvg.render().asPng();
  await writeFile(outPath, png);
  const kb = (png.byteLength / 1024).toFixed(1);
  console.log(`wrote ${job.out} (${job.w}x${job.h}, ${kb} KB)`);
}
