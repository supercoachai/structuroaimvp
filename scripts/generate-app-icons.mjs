/**
 * Genereert brain-logo-no-bg.png + icon-192.png / icon-512.png met lichte achtergrond (#E8F0FE),
 * afgeronde hoeken (rx≈115 @ 512) en zonder zwarte vlakken in het logo.
 *
 * Run: node scripts/generate-app-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const BG = { r: 232, g: 240, b: 254 }; // #E8F0FE
const SUM_THRESH = 50;

async function loadLogoRgba(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  if (channels !== 4) {
    throw new Error(`Verwacht RGBA, kreeg ${channels} kanalen`);
  }

  return { data, width: info.width, height: info.height };
}

function keyOutDarkBackground(data) {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 5) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r + g + b < SUM_THRESH) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }
}

async function writePngFromRgba(outPath, data, width, height) {
  await sharp(Buffer.from(data), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toFile(outPath);
}

function roundedBackgroundSvg(size, rx) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${rx}" ry="${rx}" fill="rgb(${BG.r},${BG.g},${BG.b})"/>
    </svg>`
  );
}

async function compositeIcon({ size, rx, logoScalePad = 0.88 }) {
  const logoPath = path.join(PUBLIC, "Logo Structuro.png");
  const { data, width: lw, height: lh } = await loadLogoRgba(logoPath);
  keyOutDarkBackground(data);

  const bbox = (() => {
    let minX = lw;
    let minY = lh;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        const a = data[(y * lw + x) * 4 + 3];
        if (a < 8) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) return null;
    return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  })();

  if (!bbox) {
    throw new Error("Logo lijkt leeg na achtergrond verwijderen");
  }

  const cropped = await sharp(Buffer.from(data), {
    raw: { width: lw, height: lh, channels: 4 },
  })
    .extract({
      left: bbox.left,
      top: bbox.top,
      width: bbox.width,
      height: bbox.height,
    })
    .png()
    .toBuffer();

  const target = Math.round(size * logoScalePad);
  const logoBuf = await sharp(cropped)
    .resize(target, target, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();

  const meta = await sharp(logoBuf).metadata();
  const lw2 = meta.width ?? target;
  const lh2 = meta.height ?? target;
  const left = Math.round((size - lw2) / 2);
  const top = Math.round((size - lh2) / 2);

  const bgSvg = roundedBackgroundSvg(size, rx);

  return sharp(bgSvg).composite([
    { input: logoBuf, left, top, blend: "over" },
  ]);
}

async function main() {
  fs.mkdirSync(PUBLIC, { recursive: true });

  const logoSrc = path.join(PUBLIC, "Logo Structuro.png");
  if (!fs.existsSync(logoSrc)) {
    throw new Error(`Ontbrekend: ${logoSrc}`);
  }

  // 1) Transparante brain-only PNG voor SVG <image>
  {
    const { data, width, height } = await loadLogoRgba(logoSrc);
    keyOutDarkBackground(data);
    const out = path.join(PUBLIC, "brain-logo-no-bg.png");
    await writePngFromRgba(out, data, width, height);
    // eslint-disable-next-line no-console
    console.log("geschreven", path.relative(ROOT, out));
  }

  // 2) App icon PNG’s (licht thema achtergrond, geen zwart)
  const rx512 = 115;
  const out512 = path.join(PUBLIC, "icon-512.png");
  await (await compositeIcon({ size: 512, rx: rx512 })).png().toFile(out512);
  // eslint-disable-next-line no-console
  console.log("geschreven", path.relative(ROOT, out512));

  const out192 = path.join(PUBLIC, "icon-192.png");
  const rx192 = Math.round((rx512 / 512) * 192);
  await (await compositeIcon({ size: 192, rx: rx192 })).png().toFile(out192);
  // eslint-disable-next-line no-console
  console.log("geschreven", path.relative(ROOT, out192));

  // 3) Next metadata icons (src/app) — zelfde look als /icon-192 /icon-512
  const appDir = path.join(ROOT, "src", "app");
  fs.mkdirSync(appDir, { recursive: true });
  await fs.promises.copyFile(out512, path.join(appDir, "icon.png"));
  await fs.promises.copyFile(out192, path.join(appDir, "apple-icon.png"));
  // eslint-disable-next-line no-console
  console.log("gekopieerd naar src/app/icon.png + src/app/apple-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
