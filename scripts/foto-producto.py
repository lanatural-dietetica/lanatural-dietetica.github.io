#!/usr/bin/env python3
"""
Prepara una foto de producto para el catálogo de La Natural.

Lleva el fondo al color oficial de las tarjetas (FONDO_OFICIAL), redimensiona a
800x800 y guarda .webp y .jpg. El generador de imágenes nunca clava el hex
exacto, así que la corrección se hace acá: se mide el fondo real en el marco y
se aplica el desplazamiento de color, entero en el fondo y diluido sobre el
bowl y la sombra para que no quede halo.

Uso:  python3 scripts/foto-producto.py <entrada> <nombre-de-salida>
      (la salida va a assets/productos/<nombre>.webp y .jpg)
"""
import sys
import numpy as np
from PIL import Image

FONDO_OFICIAL = np.array([250, 230, 208], dtype=float)   # #FAE6D0
CERCA, LEJOS = 22.0, 80.0
TAM = 800

def preparar(entrada, nombre):
    im = Image.open(entrada).convert('RGB')
    a = np.asarray(im, dtype=float)
    h, w, _ = a.shape

    marco = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3),
                            a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    fondo = np.median(marco, axis=0)
    delta = FONDO_OFICIAL - fondo

    dist = np.sqrt(((a - fondo) ** 2).sum(axis=-1))
    peso = np.clip((LEJOS - dist) / (LEJOS - CERCA), 0.0, 1.0)[..., None]
    corregida = np.clip(a + delta * peso, 0, 255).astype(np.uint8)

    out = Image.fromarray(corregida).resize((TAM, TAM), Image.LANCZOS)
    out.save('assets/productos/%s.webp' % nombre, 'WEBP', quality=84, method=6)
    out.save('assets/productos/%s.jpg' % nombre, 'JPEG', quality=86, optimize=True, progressive=True)

    v = np.asarray(Image.open('assets/productos/%s.webp' % nombre).convert('RGB'))
    esquinas = [v[6, 6], v[6, TAM-7], v[TAM-7, 6], v[TAM-7, TAM-7]]
    print('%-26s fondo original #%02X%02X%02X → final %s' % (
        nombre, int(fondo[0]), int(fondo[1]), int(fondo[2]),
        ' '.join('#%02X%02X%02X' % tuple(e) for e in esquinas)))

if __name__ == '__main__':
    preparar(sys.argv[1], sys.argv[2])
