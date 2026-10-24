#!/usr/bin/env python3
"""Dibuja una rejilla con coordenadas sobre la imagen (o un recorte) para
localizar en píxeles de la imagen original las zonas que se quieren proteger.

Uso:
  python3 rejilla.py entrada.jpg rejilla.png                 # imagen completa
  python3 rejilla.py entrada.jpg rejilla.png --recorte x,y,w,h --paso 25
"""
import argparse

import cv2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("salida")
    ap.add_argument("--recorte", help="x,y,ancho,alto en píxeles de la imagen original")
    ap.add_argument("--paso", type=int, default=0, help="separación de la rejilla (auto si se omite)")
    a = ap.parse_args()

    img = cv2.imread(a.entrada)
    x0, y0 = 0, 0
    if a.recorte:
        x0, y0, w, h = (int(v) for v in a.recorte.split(","))
        img = img[y0:y0 + h, x0:x0 + w]
    h, w = img.shape[:2]
    step = a.paso or max(10, int(round(max(w, h) / 12 / 10)) * 10)
    zoom = max(1.0, 800 / max(w, h))  # se amplía para leer bien las etiquetas
    img = cv2.resize(img, None, fx=zoom, fy=zoom, interpolation=cv2.INTER_CUBIC)
    first_x = (-x0) % step
    first_y = (-y0) % step
    for v in range(first_x, w, step):
        X = int(v * zoom)
        cv2.line(img, (X, 0), (X, img.shape[0]), (0, 255, 0), 1)
        cv2.putText(img, str(x0 + v), (X + 2, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
    for v in range(first_y, h, step):
        Y = int(v * zoom)
        cv2.line(img, (0, Y), (img.shape[1], Y), (0, 255, 0), 1)
        cv2.putText(img, str(y0 + v), (2, Y + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
    cv2.imwrite(a.salida, img)


if __name__ == "__main__":
    main()
