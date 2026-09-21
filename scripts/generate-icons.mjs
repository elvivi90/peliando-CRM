import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
// Mismo cuadro que usa el splash (ver scripts/generate-splash.py): asi el
// splash nativo de Android (icono sobre background_color) y el de la app
// muestran exactamente la misma imagen.
const source = path.join(__dirname, "..", "public", "splash", "logo-splash.png");
mkdirSync(outDir, { recursive: true });

// La imagen ya es cuadrada con fondo propio (rosa del logo), asi que alcanza
// con reescalarla a cada tamano necesario.
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
    background: { r: 191, g: 144, b: 172, alpha: 1 }, // rosa del logo (#bf90ac, igual a background_color del manifest)
  })
  .png()
  .toFile(path.join(outDir, "icon-maskable-512.png"));

console.log("Iconos generados en", outDir, "a partir de", source);
