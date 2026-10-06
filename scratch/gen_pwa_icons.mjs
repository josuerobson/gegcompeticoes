import { Jimp } from 'jimp';
import path from 'path';
import fs from 'fs';

const ROOT = 'C:\\Users\\carlo\\antigravity\\gegcompeticoes';
const SRC = path.join(ROOT, 'assets', 'logo_gg_competicoes.png');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

async function makeIcon({ size, outName, padRatio, bg }) {
  const logo = await Jimp.read(SRC);

  const canvas = new Jimp({ width: size, height: size, color: bg });

  const maxW = Math.round(size * (1 - padRatio * 2));
  const maxH = Math.round(size * (1 - padRatio * 2));

  const scale = Math.min(maxW / logo.bitmap.width, maxH / logo.bitmap.height);
  const targetW = Math.round(logo.bitmap.width * scale);
  const targetH = Math.round(logo.bitmap.height * scale);

  const resizedLogo = logo.clone().resize({ w: targetW, h: targetH });

  const x = Math.round((size - targetW) / 2);
  const y = Math.round((size - targetH) / 2);

  canvas.composite(resizedLogo, x, y);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  await canvas.write(path.join(OUT_DIR, outName));
  console.log('wrote', outName, size, 'x', size);
}

async function main() {
  await makeIcon({ size: 512, outName: 'icon-512.png', padRatio: 0.08, bg: 0xffffffff });
  await makeIcon({ size: 192, outName: 'icon-192.png', padRatio: 0.08, bg: 0xffffffff });
  await makeIcon({ size: 180, outName: 'apple-touch-icon.png', padRatio: 0.1, bg: 0xffffffff });
  // Maskable icon: logo must sit inside the center ~80% "safe zone" since OSes crop to a circle/squircle.
  await makeIcon({ size: 512, outName: 'icon-512-maskable.png', padRatio: 0.18, bg: 0xffffffff });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
