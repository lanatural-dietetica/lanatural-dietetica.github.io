#!/usr/bin/env python3
"""Normaliza fondo, escala y centrado de un ícono fotográfico de categoría.

Uso: python3 scripts/icono-categoria.py <entrada> <salida.webp>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

FONDO = np.array([250, 230, 208], dtype=float)  # #FAE6D0
TAM = 260
DIAMETRO = 226
CERCA, LEJOS = 32.0, 82.0


def marco(a):
    grosor = max(8, min(a.shape[:2]) // 120)
    return np.concatenate([
        a[:grosor].reshape(-1, 3),
        a[-grosor:].reshape(-1, 3),
        a[:, :grosor].reshape(-1, 3),
        a[:, -grosor:].reshape(-1, 3),
    ])


def preparar(entrada, salida):
    original = np.asarray(Image.open(entrada).convert('RGB'), dtype=float)
    fondo_original = np.median(marco(original), axis=0)
    distancia = np.sqrt(((original - fondo_original) ** 2).sum(axis=-1))

    peso_fondo = np.clip((LEJOS - distancia) / (LEJOS - CERCA), 0.0, 1.0)[..., None]
    corregida = np.clip(original + (FONDO - fondo_original) * peso_fondo, 0, 255).astype(np.uint8)
    corregida[distancia <= CERCA] = FONDO.astype(np.uint8)

    contenido = distancia > 25
    ys, xs = np.where(contenido)
    if not len(xs):
        raise ValueError('No se pudo detectar el contenido del ícono')

    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    recorte = Image.fromarray(corregida[y0:y1, x0:x1], 'RGB')
    escala = DIAMETRO / max(recorte.size)
    nuevo = tuple(max(1, round(valor * escala)) for valor in recorte.size)
    recorte = recorte.resize(nuevo, Image.Resampling.LANCZOS)

    lienzo = Image.new('RGB', (TAM, TAM), tuple(FONDO.astype(np.uint8)))
    posicion = ((TAM - nuevo[0]) // 2, (TAM - nuevo[1]) // 2)
    lienzo.paste(recorte, posicion)

    salida = Path(salida)
    salida.parent.mkdir(parents=True, exist_ok=True)
    base = np.asarray(lienzo)
    fondo_plano = np.sqrt(((base.astype(float) - FONDO) ** 2).sum(axis=-1)) < 18
    reducida = lienzo.quantize(colors=160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    reducida = np.asarray(reducida).copy()
    reducida[fondo_plano] = FONDO.astype(np.uint8)
    Image.fromarray(reducida).save(salida, 'WEBP', lossless=True, method=6)
    comprobacion = np.asarray(Image.open(salida).convert('RGB'))
    fondo_final = np.median(marco(comprobacion), axis=0)
    print('%-18s contenido %dx%d → %dx%d · %d bytes' % (
        salida.name, x1 - x0, y1 - y0, nuevo[0], nuevo[1], salida.stat().st_size
    ))
    print(' ' * 19 + 'fondo final #%02X%02X%02X' % tuple(fondo_final.astype(int)))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Uso: icono-categoria.py <entrada> <salida.webp>')
    preparar(sys.argv[1], sys.argv[2])
