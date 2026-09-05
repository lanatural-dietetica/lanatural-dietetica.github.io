#!/usr/bin/env python3
"""
Prepara una foto de producto para el catálogo de La Natural.

Lleva el fondo al color oficial de las tarjetas (FONDO_OFICIAL), redimensiona a
800x800 y guarda .webp y .jpg. El generador de imágenes nunca clava el hex
exacto, así que la corrección se hace acá: se mide el fondo real en el marco y
se aplica el desplazamiento de color, entero en el fondo y diluido sobre el
bowl y la sombra para que no quede halo.

Uso:  python3 scripts/foto-producto.py <entrada> <nombre> [tamaño] [carpeta]
      Por defecto sale en assets/productos/<nombre>.webp y .jpg a 800 px.
"""
import sys
import numpy as np
from PIL import Image

FONDO_OFICIAL = np.array([246, 238, 227], dtype=float)   # #F6EEE3
CERCA, LEJOS = 22.0, 80.0

def invadio_el_centro(fondo):
    """El producto ocupa el centro. Si el fondo se metió ahí, la foto no se puede
    corregir sin arruinar el producto (blanco sobre blanco, por ejemplo)."""
    h, w = fondo.shape
    centro = fondo[int(h * .3):int(h * .7), int(w * .3):int(w * .7)]
    return centro.mean() > 0.35


def pegado_al_borde(candidato, a, PASO=3.0):
    """Marca sólo el fondo que se toca con el marco de la foto.

    Avanza de a un píxel y frena en cuanto hay un escalón de color: así el fondo
    y su sombra se corrigen enteros, pero un envase blanco sobre fondo blanco
    queda intacto, porque su borde es un escalón aunque el color sea parecido.
    """
    salto = [np.zeros(candidato.shape, dtype=bool) for _ in range(4)]
    d0 = np.abs(np.diff(a, axis=0)).max(axis=-1) < PASO   # entre filas
    d1 = np.abs(np.diff(a, axis=1)).max(axis=-1) < PASO   # entre columnas
    salto[0][1:] = d0            # viniendo de arriba
    salto[1][:-1] = d0           # viniendo de abajo
    salto[2][:, 1:] = d1         # viniendo de la izquierda
    salto[3][:, :-1] = d1        # viniendo de la derecha

    m = np.zeros_like(candidato)
    m[0], m[-1] = candidato[0], candidato[-1]
    m[:, 0], m[:, -1] = candidato[:, 0], candidato[:, -1]
    while True:
        antes = m.sum()
        for i in range(1, m.shape[0]):
            m[i] |= m[i - 1] & candidato[i] & salto[0][i]
        for i in range(m.shape[0] - 2, -1, -1):
            m[i] |= m[i + 1] & candidato[i] & salto[1][i]
        for j in range(1, m.shape[1]):
            m[:, j] |= m[:, j - 1] & candidato[:, j] & salto[2][:, j]
        for j in range(m.shape[1] - 2, -1, -1):
            m[:, j] |= m[:, j + 1] & candidato[:, j] & salto[3][:, j]
        if m.sum() == antes:
            return m


def preparar(entrada, nombre, TAM=800, carpeta='assets/productos'):
    im = Image.open(entrada).convert('RGB')
    a = np.asarray(im, dtype=float)
    h, w, _ = a.shape

    marco = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3),
                            a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    fondo = np.median(marco, axis=0)
    delta = FONDO_OFICIAL - fondo

    dist = np.sqrt(((a - fondo) ** 2).sum(axis=-1))
    fondo_real = pegado_al_borde(dist < LEJOS, a)

    if invadio_el_centro(fondo_real):
        # el producto es casi del color del fondo: mejor no tocar nada
        print('%-26s OJO: producto del color del fondo, se deja sin corregir' % nombre)
        corregida = a.astype(np.uint8)
    else:
        peso = np.clip((LEJOS - dist) / (LEJOS - CERCA), 0.0, 1.0)
        peso[~fondo_real] = 0.0
        corregida = np.clip(a + delta * peso[..., None], 0, 255).astype(np.uint8)
        corregida[fondo_real & (dist <= CERCA)] = FONDO_OFICIAL.astype(np.uint8)

    out = Image.fromarray(corregida).resize((TAM, TAM), Image.LANCZOS)
    out.save('%s/%s.webp' % (carpeta, nombre), 'WEBP', quality=84, method=6)
    out.save('%s/%s.jpg' % (carpeta, nombre), 'JPEG', quality=86, optimize=True, progressive=True)

    v = np.asarray(Image.open('%s/%s.webp' % (carpeta, nombre)).convert('RGB'))
    esquinas = [v[6, 6], v[6, TAM-7], v[TAM-7, 6], v[TAM-7, TAM-7]]
    print('%-26s fondo original #%02X%02X%02X → final %s' % (
        nombre, int(fondo[0]), int(fondo[1]), int(fondo[2]),
        ' '.join('#%02X%02X%02X' % tuple(e) for e in esquinas)))

if __name__ == '__main__':
    preparar(sys.argv[1], sys.argv[2],
             int(sys.argv[3]) if len(sys.argv) > 3 else 800,
             sys.argv[4] if len(sys.argv) > 4 else 'assets/productos')
