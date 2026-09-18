import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
const source = path.join(__dirname, "..", "public", "logo-peliando.png");
mkdirSync(outDir, { recursive: true });

// El logo real ya es cuadrado con fondo propio (malva), asi que alcanza
// con reescalarlo a cada tamano necesario.
for (const size of [192, 512]) {
  await sharp(source).resize(size, size).png().toFile(path.join(outDir, `icon-${size}.png`));
}

await sharp(source).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

// Maskable: Android puede recortar hasta un circulo central (~80% de
// "safe zone"), asi que dejamos margen para que el clapperboard no quede
// cortado.
await sharp(source)
  .resize(410, 410)
  .extend({
    top: 51,
    bottom: 51,
    left: 51,
    right: 51,
    background: { r: 178, g: 131, b: 176, alpha: 1 }, // malva del logo (muestreado de la esquina)
  })
  .png()
  .toFile(path.join(outDir, "icon-maskable-512.png"));

console.log("Iconos generados en", outDir, "a partir de", source);
