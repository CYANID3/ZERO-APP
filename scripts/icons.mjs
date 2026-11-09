// Растровые иконки для старых Android (< 8.0); на новых — векторная адаптивная
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'build/res';
const ring = (s, bg, round) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 108 108">
  ${round ? `<circle cx="54" cy="54" r="54" fill="${bg}"/>` : `<rect width="108" height="108" rx="22" fill="${bg}"/>`}
  <g transform="translate(54 54) scale(1.25) translate(-54 -54)">
  <circle cx="54" cy="55" r="19" fill="none" stroke="#8AB4FF" stroke-width="7"/>
  <rect x="48" y="24" width="12" height="6" rx="1.5" fill="#8AB4FF"/>
  <path d="M54 55 L61 48" stroke="#8AB4FF" stroke-width="4.5" stroke-linecap="round"/></g></svg>`;
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, s] of Object.entries(sizes)) {
  const dir = path.join(OUT, 'mipmap-' + d);
  fs.mkdirSync(dir, { recursive: true });
  await sharp(Buffer.from(ring(s, '#0E0F12', false))).png().toFile(path.join(dir, 'ic_launcher.png'));
  await sharp(Buffer.from(ring(s, '#0E0F12', true))).png().toFile(path.join(dir, 'ic_launcher_round.png'));
}
fs.mkdirSync('build', { recursive: true });
await sharp(Buffer.from(ring(512, '#0E0F12', false))).png().toFile('build/icon-512.png');
console.log('icons ok');
