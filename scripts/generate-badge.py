"""Genera el badge de las notificaciones push: public/icons/badge-96.png.

Uso (requiere Pillow y numpy):  python scripts/generate-badge.py

Android dibuja el badge (el iconito de la barra de estado) usando SOLO el
canal alfa: todo pixel no transparente sale blanco. Con un icono opaco se ve
un cuadrado blanco, asi que el badge tiene que ser una silueta sobre fondo
transparente. Se arma a partir del mismo cuadro que los iconos de la PWA
(public/splash/logo-splash.png):
  - el fondo rosa se quita con un relleno desde los bordes, igual que en
    scripts/generate-splash.py (las letras "PELI-" tienen el mismo rosa que
    el fondo, pero quedan encerradas por el contorno de la claqueta);
  - las rayas claras del palo de la claqueta se vacian, para que a 24 px se
    siga leyendo como claqueta y no como una mancha.
"""

import os

import numpy as np
from PIL import Image

UMBRAL_FONDO = 26  # distancia RGB para considerar un pixel como fondo
UMBRAL_RAYA = 160  # canal mas bajo por encima de esto = raya clara (celeste ~190)
ENSANCHE_RAYA = 3  # px que se agranda cada raya para comerse su borde difuminado
TAM = 96  # tamano recomendado por Android para el badge
MARGEN = 4  # px transparentes alrededor de la silueta

raiz = os.path.join(os.path.dirname(__file__), "..")
fuente = os.path.join(raiz, "public", "splash", "logo-splash.png")
destino = os.path.join(raiz, "public", "icons", "badge-96.png")

arr = np.array(Image.open(fuente).convert("RGB"))

borde = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
fondo = np.median(borde, axis=0)
parecido = np.sqrt(((arr.astype(int) - fondo) ** 2).sum(axis=2)) < UMBRAL_FONDO

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

raya = arr.min(axis=2) > UMBRAL_RAYA
for _ in range(ENSANCHE_RAYA):
    r = raya.copy()
    r[1:, :] |= raya[:-1, :]
    r[:-1, :] |= raya[1:, :]
    r[:, 1:] |= raya[:, :-1]
    r[:, :-1] |= raya[:, 1:]
    raya = r
silueta = ~fondo_conectado & ~raya

# recorte a la silueta y centrado en un cuadrado con margen
filas = np.where(silueta.any(axis=1))[0]
cols = np.where(silueta.any(axis=0))[0]
recorte = silueta[filas[0] : filas[-1] + 1, cols[0] : cols[-1] + 1]
lado = max(recorte.shape)
cuadrado = np.zeros((lado, lado), dtype=bool)
y0 = (lado - recorte.shape[0]) // 2
x0 = (lado - recorte.shape[1]) // 2
cuadrado[y0 : y0 + recorte.shape[0], x0 : x0 + recorte.shape[1]] = recorte

interior = TAM - 2 * MARGEN
alfa = Image.fromarray((cuadrado * 255).astype(np.uint8)).resize(
    (interior, interior), Image.LANCZOS
)
badge = Image.new("RGBA", (TAM, TAM), (255, 255, 255, 0))
blanco = Image.new("RGBA", (interior, interior), (255, 255, 255, 255))
blanco.putalpha(alfa)
badge.paste(blanco, (MARGEN, MARGEN))
badge.save(destino, optimize=True)

print("Badge generado en", destino)
