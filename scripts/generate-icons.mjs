import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// Icono chunky: cuadrado navy con esquinas redondeadas, franja de marca
// abajo y una "P" amarilla — coherente con el logo usado en header/login.
function svgIcon({ size, rounded }) {
  const stripeH = size * 0.08;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rounded}" fill="#142653"/>
  <text x="50%" y="46%" font-family="Arial, sans-serif" font-weight="900" font-size="${size * 0.52}"
    fill="#F9BD16" text-anchor="middle" dominant-baseline="central">P</text>
  <g>
    <rect x="0" y="${size - stripeH}" width="${size / 3}" height="${stripeH}" fill="#1A66AA"/>
    <rect x="${size / 3}" y="${size - stripeH}" width="${size / 3}" height="${stripeH}" fill="#C9579A"/>
    <rect x="${(size / 3) * 2}" y="${size - stripeH}" width="${size / 3}" height="${stripeH}" fill="#F9BD16"/>
  </g>
</svg>`;
}

const sizes = [192, 512];

for (const size of sizes) {
  const svg = svgIcon({ size, rounded: size * 0.22 });
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
}

// Apple touch icon: sin esquinas redondeadas propias (iOS las aplica solo).
const appleSvg = svgIcon({ size: 180, rounded: 0 });
await sharp(Buffer.from(appleSvg)).png().toFile(path.join(outDir, "apple-touch-icon.png"));

// Maskable: el contenido debe caber en el circulo interior "safe zone" (~80%).
function maskableSvg(size) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#142653"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-weight="900" font-size="${size * 0.4}"
    fill="#F9BD16" text-anchor="middle" dominant-baseline="central">P</text>
</svg>`;
}
await sharp(Buffer.from(maskableSvg(512)))
  .png()
  .toFile(path.join(outDir, "icon-maskable-512.png"));

console.log("Iconos generados en", outDir);
