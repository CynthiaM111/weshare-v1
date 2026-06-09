import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, '../assets/images');
const markSvg = readFileSync(join(imagesDir, 'weshare-logo-mark.svg'));

const NAVY = '#08111F';
const LOGO_SCALE = 10;
const LOGO_W = 70 * LOGO_SCALE;
const LOGO_H = 50 * LOGO_SCALE;

function centeredLogoSvg(size, { background = NAVY, transparent = false } = {}) {
  const x = Math.round((size - LOGO_W) / 2);
  const y = Math.round((size - LOGO_H) / 2);
  const bg = transparent ? '' : `<rect width="${size}" height="${size}" fill="${background}"/>`;
  const mark = markSvg
    .toString('utf8')
    .replace(/<\?xml.*?\?>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '');

  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      ${bg}
      <g transform="translate(${x} ${y}) scale(${LOGO_SCALE})">
        ${mark}
      </g>
    </svg>`,
  );
}

function monochromeLogoSvg(size) {
  const x = Math.round((size - LOGO_W) / 2);
  const y = Math.round((size - LOGO_H) / 2);
  const mark = markSvg
    .toString('utf8')
    .replace(/<\?xml.*?\?>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .replace(/fill="#00C9B1"/g, 'fill="#FFFFFF"')
    .replace(/fill="#FF6B35"/g, 'fill="#FFFFFF"')
    .replace(/fill="#08111F"/g, 'fill="#08111F"');

  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="none"/>
      <g transform="translate(${x} ${y}) scale(${LOGO_SCALE})">
        ${mark}
      </g>
    </svg>`,
  );
}

async function writePng(name, svg, size) {
  const out = join(imagesDir, name);
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(out);
  console.log(`wrote ${name} (${size}x${size})`);
}

await writePng('icon.png', centeredLogoSvg(1024), 1024);
await writePng('splash-icon.png', centeredLogoSvg(1024), 1024);
await writePng('android-icon-background.png', Buffer.from(
  `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><rect width="1024" height="1024" fill="${NAVY}"/></svg>`,
), 512);
await writePng('android-icon-foreground.png', centeredLogoSvg(1024, { transparent: true }), 512);
await writePng('android-icon-monochrome.png', monochromeLogoSvg(432), 432);
await writePng('favicon.png', centeredLogoSvg(1024), 48);
