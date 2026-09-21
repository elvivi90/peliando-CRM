"""Genera los assets del splash y de la carga a partir del GIF animado del logo.

Uso (requiere Pillow y numpy):  python scripts/generate-splash.py "ruta/al/logo.gif"

Salida en public/splash/:
  - logo-splash.png : cuadro estatico (fuente de los iconos de la PWA, ver
                      scripts/generate-icons.mjs, y del splash con
                      "reducir movimiento")
  - splash.webp     : animacion del splash de arranque; arranca en ese mismo
                      cuadro, asi el splash nativo de Android (icono sobre el
                      fondo del manifest) y el de la app se leen como uno solo
  - logo-cargando.webp : logo SIN fondo (transparente) que "respira", para
                      flotar sobre el backdrop del indicador de carga. El nombre
                      cambio a proposito (antes era cargando.webp, con fondo)
                      para que ningun navegador siga sirviendo la version vieja.

El GIF original pesa ~31 MB; estos archivos pesan menos de 1 MB cada uno.

Notas sobre el GIF:
  - Desde el cuadro ~99 la animacion se deshace en una transicion borrosa.
  - Desde el cuadro ~18 el zoom hace que el claqueta toque los bordes de la
    imagen; sin el fondo se veria cortado, por eso el indicador de carga usa
    solo los cuadros 0..CUADRO_MAX_CARGA, en ida y vuelta.
  - Las letras "PELI-" tienen el mismo rosa que el fondo: el fondo se quita
    con un relleno desde los bordes (no por color global), asi las letras,
    que estan rodeadas por el contorno del logo, se conservan.
"""

import os
import statistics
import sys

import numpy as np
from PIL import Image, ImageFilter

CUADRO_ESTATICO = 8  # logo limpio, coincide con la imagen de marca
ULTIMO_CUADRO_SPLASH = 74  # ~2.2 s desde el cuadro estatico
CUADRO_MAX_CARGA = 16  # ultimo cuadro donde el logo entra completo
UMBRAL_FONDO = 26  # distancia RGB para considerar un pixel como fondo

if len(sys.argv) != 2:
    sys.exit(__doc__)

raiz = os.path.join(os.path.dirname(__file__), "..")
salida = os.path.join(raiz, "public", "splash")
os.makedirs(salida, exist_ok=True)

gif = Image.open(sys.argv[1])


def cuadro(i, tam):
    gif.seek(i)
    return gif.convert("RGB").resize((tam, tam), Image.LANCZOS)


def guardar_webp(frames, duraciones, destino, **opciones):
    ruta = os.path.join(salida, destino)
    frames[0].save(
        ruta,
        save_all=True,
        append_images=frames[1:],
        duration=duraciones,
        loop=0,
        method=6,
        **opciones,
    )
    print(f"{destino}: {len(frames)} cuadros, {os.path.getsize(ruta) // 1024} KB")


def animar(desde, hasta, tam, destino, calidad):
    frames, duraciones, acumulado = [], [], 0
    for i in range(desde, hasta + 1):
        gif.seek(i)
        acumulado += gif.info.get("duration", 30)
        if (i - desde) % 2 == 0:  # ~15 fps
            frames.append(cuadro(i, tam))
            duraciones.append(acumulado)
            acumulado = 0
    guardar_webp(frames, duraciones, destino, quality=calidad)


def quitar_fondo(img):
    """RGB -> RGBA: hace transparente el fondo conectado con los bordes."""
    arr = np.array(img)
    borde = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
    fondo = np.median(borde, axis=0)
    parecido = np.sqrt(((arr.astype(int) - fondo) ** 2).sum(axis=2)) < UMBRAL_FONDO

    # relleno desde los bordes, solo a traves de pixeles parecidos al fondo
    fondo_conectado = np.zeros_like(parecido)
    fondo_conectado[0, :] = parecido[0, :]
    fondo_conectado[-1, :] = parecido[-1, :]
    fondo_conectado[:, 0] = parecido[:, 0]
    fondo_conectado[:, -1] = parecido[:, -1]
    while True:
        n = fondo_conectado.copy()
        n[1:, :] |= fondo_conectado[:-1, :]
        n[:-1, :] |= fondo_conectado[1:, :]
        n[:, 1:] |= fondo_conectado[:, :-1]
        n[:, :-1] |= fondo_conectado[:, 1:]
        n &= parecido
        if (n == fondo_conectado).all():
            break
        fondo_conectado = n

    # se descarta 1 px del borde (mezcla rosa/contorno) y se suaviza el alfa
    logo = ~fondo_conectado
    erosion = logo.copy()
    erosion[1:, :] &= logo[:-1, :]
    erosion[:-1, :] &= logo[1:, :]
    erosion[:, 1:] &= logo[:, :-1]
    erosion[:, :-1] &= logo[:, 1:]
    alfa = Image.fromarray((erosion * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))

    rgba = img.convert("RGBA")
    rgba.putalpha(alfa)
    return rgba


# Color de fondo: mediana de los bordes del cuadro estatico. Tiene que
# coincidir con --color-splash (globals.css) y background_color (manifest).
base = cuadro(CUADRO_ESTATICO, gif.size[0])
w, h = base.size
borde = [base.getpixel((x, y)) for x in range(0, w, 8) for y in (2, 6, h - 3, h - 7)]
borde += [base.getpixel((x, y)) for y in range(0, h, 8) for x in (2, 6, w - 3, w - 7)]
fondo = tuple(round(statistics.median(c[i] for c in borde)) for i in range(3))
print("fondo: #%02x%02x%02x" % fondo)

estatico = base.resize((720, 720), Image.LANCZOS).quantize(
    colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
)
ruta_estatico = os.path.join(salida, "logo-splash.png")
estatico.save(ruta_estatico, optimize=True)
print(f"logo-splash.png: {os.path.getsize(ruta_estatico) // 1024} KB")

animar(CUADRO_ESTATICO, ULTIMO_CUADRO_SPLASH, 480, "splash.webp", 55)

# Indicador de carga: cuadros 0..MAX en ida y vuelta, a mitad de velocidad,
# para que el logo "respire" en un loop sin cortes.
ida = [quitar_fondo(cuadro(i, 512)) for i in range(0, CUADRO_MAX_CARGA + 1)]
secuencia = ida + ida[-2:0:-1]
duracion = 70  # ms por cuadro (~14 fps)
# alpha_quality=100: alfa sin perdida, para que el fondo quede 100% transparente
guardar_webp(secuencia, [duracion] * len(secuencia), "logo-cargando.webp", quality=75, alpha_quality=100)
