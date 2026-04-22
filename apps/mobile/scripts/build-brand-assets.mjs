#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, '..');
const execFileAsync = promisify(execFile);

let Resvg = null;
try {
  ({ Resvg } = await import('@resvg/resvg-js'));
} catch {
  Resvg = null;
}

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
  const pngWrapper = svg.match(/<image[^>]+href="([^"]+\.png)"/i);
  if (pngWrapper) {
    const wrappedPath = path.resolve(path.dirname(srcPath), pngWrapper[1]);
    await copyFile(wrappedPath, outPath);
    const { size } = await import('node:fs/promises').then(({ stat }) => stat(outPath));
    const kb = (size / 1024).toFixed(1);
    console.log(`copied ${job.out} from ${pngWrapper[1]} (${job.w}x${job.h}, ${kb} KB)`);
    continue;
  }

  if (Resvg) {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: job.w },
      font: { loadSystemFonts: true },
    });
    const png = resvg.render().asPng();
    await writeFile(outPath, png);
    const kb = (png.byteLength / 1024).toFixed(1);
    console.log(`wrote ${job.out} (${job.w}x${job.h}, ${kb} KB)`);
    continue;
  }

  await execFileAsync(
    'convert',
    ['-background', 'none', path.basename(srcPath), '-resize', `${job.w}x${job.h}!`, `PNG32:${outPath}`],
    { cwd: path.dirname(srcPath) }
  );
  const { size } = await import('node:fs/promises').then(({ stat }) => stat(outPath));
  const kb = (size / 1024).toFixed(1);
  console.log(`wrote ${job.out} (${job.w}x${job.h}, ${kb} KB) via convert`);
}
