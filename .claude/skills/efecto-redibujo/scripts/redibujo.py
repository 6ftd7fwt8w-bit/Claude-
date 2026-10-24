#!/usr/bin/env python3
"""Efecto "redibujo a mano" (line boil de 2 dibujos) para una ilustración.

Crea una copia de la imagen en la que cada trazo parece vuelto a dibujar a mano
(la mayoría casi quietos, unos pocos desplazados/girados unos píxeles, algunos
un poco más finos o gruesos) y alterna original y copia en bucle.

Calibrado con un vídeo de referencia (haojing.co): 2 dibujos, 8 cambios por
segundo, cambios muy locales (~10-15 px) y de cola larga.

Uso:
  python3 redibujo.py entrada.jpg salida.mp4
  python3 redibujo.py entrada.jpg salida.mp4 --proteger "482,478 530,470 ... 485,530"
Las coordenadas de --proteger van en píxeles de la imagen ORIGINAL.
"""
import argparse
import os
import subprocess
import sys

import cv2
import numpy as np
from scipy.ndimage import distance_transform_edt

REF_WIDTH = 1080  # anchura a la que se calibraron tamaños e intensidades


def parse_poly(text):
    pts = [tuple(float(v) for v in p.split(",")) for p in text.split()]
    if len(pts) < 3:
        raise argparse.ArgumentTypeError("Un polígono necesita al menos 3 puntos 'x,y'")
    return pts


def load(path, width):
    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if img is None:
        sys.exit(f"No se pudo abrir la imagen: {path}")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[2] == 4:  # fondo blanco bajo la transparencia
        a = img[:, :, 3:4].astype(np.float32) / 255
        img = (img[:, :, :3] * a + 255 * (1 - a)).astype(np.uint8)
    h0, w0 = img.shape[:2]
    W = width - width % 2
    H = int(round(h0 * W / w0)); H -= H % 2  # H.264 necesita dimensiones pares
    interp = cv2.INTER_LANCZOS4 if W > w0 else cv2.INTER_AREA
    return cv2.resize(img, (W, H), interpolation=interp), W / w0


def redraw(A, intensity, cell, seed):
    H, W = A.shape[:2]
    k = W / REF_WIDTH
    cell = max(6.0, cell * k)
    rng = np.random.default_rng(seed)

    # Tinta = píxeles claramente más oscuros que su entorno + bordes fuertes
    L = cv2.cvtColor(A, cv2.COLOR_BGR2LAB)[:, :, 0].astype(np.float32)
    ink = (L < cv2.GaussianBlur(L, (0, 0), 4 * k) - 8) | (cv2.Canny(A, 60, 150) > 0)
    ink = cv2.morphologyEx(ink.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    grouped = cv2.dilate(ink, np.ones((3, 3), np.uint8))
    _, comp = cv2.connectedComponents(grouped, connectivity=8)

    # Trazos = piezas de tinta conectadas, cortadas en trozos (Voronoi) para que
    # las líneas largas varíen a lo largo de su recorrido
    gy, gx = np.mgrid[0:H:cell, 0:W:cell]
    sx = (gx + rng.uniform(0, cell, gx.shape)).ravel()
    sy = (gy + rng.uniform(0, cell, gy.shape)).ravel()
    seedmask = np.ones((H, W), bool)
    seedmask[np.clip(sy.astype(int), 0, H - 1), np.clip(sx.astype(int), 0, W - 1)] = False
    _, (cy_, cx_) = distance_transform_edt(seedmask, return_indices=True)
    cellid = cy_ * W + cx_

    ys, xs = np.mgrid[0:H, 0:W]
    on = grouped > 0
    label = comp.astype(np.int64) * (H * W) + cellid
    _, inv = np.unique(label[on], return_inverse=True)
    n = int(inv.max()) + 1
    lab = np.full((H, W), -1, np.int64); lab[on] = inv
    cnt = np.bincount(inv, minlength=n).astype(np.float32)
    cx = np.bincount(inv, xs[on], n) / cnt
    cy = np.bincount(inv, ys[on], n) / cnt
    rx = np.sqrt(np.bincount(inv, (xs[on] - cx[inv]) ** 2 + (ys[on] - cy[inv]) ** 2, n) / cnt) + 1
    comp_area = np.bincount(comp[on], minlength=comp.max() + 1)[comp[on]]
    area_of = np.bincount(inv, comp_area, n) / cnt

    # Cola larga: la mayoría casi quietos, algunos redibujados claramente desviados
    tier = rng.choice(3, n, p=[0.62, 0.23, 0.15])
    amp = np.array([0.1, 1.2, 4.5])[tier] * intensity * k
    amp *= np.clip(np.sqrt(4000 * k * k / np.maximum(area_of, 1)), 0.35, 1.0)  # masas grandes (pelo) se mueven menos
    ang = rng.uniform(0, 2 * np.pi, n)
    r = amp * np.sqrt(rng.uniform(0.3, 1, n))
    tx, ty = r * np.cos(ang), r * np.sin(ang)
    th = rng.uniform(-1, 1, n) * np.minimum(amp / (2 * rx), np.radians(3))
    thick = rng.choice([-1, 0, 0, 0, 1], n)  # algunos trazos algo más finos/gruesos

    # Cada píxel sigue a su trazo más cercano: los rellenos viajan con su contorno
    _, (ny, nx) = distance_transform_edt(~on, return_indices=True)
    idx = lab[ny, nx]
    px, py = xs - cx[idx], ys - cy[idx]
    c, s = np.cos(th[idx]), np.sin(th[idx])
    dx = cv2.GaussianBlur((c * px - s * py - px + tx[idx]).astype(np.float32), (0, 0), 1.0)
    dy = cv2.GaussianBlur((s * px + c * py - py + ty[idx]).astype(np.float32), (0, 0), 1.0)
    mx, my = (xs - dx).astype(np.float32), (ys - dy).astype(np.float32)
    B = cv2.remap(A, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)

    inkB = cv2.remap(ink.astype(np.float32), mx, my, cv2.INTER_LINEAR)
    tB = cv2.remap(thick[idx].astype(np.float32), mx, my, cv2.INTER_NEAREST)
    k3 = np.ones((3, 3), np.uint8)
    area = cv2.GaussianBlur(cv2.dilate(inkB, k3), (0, 0), 0.8)[..., None]
    thicker = cv2.erode(B, k3).astype(np.float32)
    thinner = cv2.dilate(B, k3).astype(np.float32)
    Bf = B.astype(np.float32)
    Bf = np.where((tB > 0)[..., None], Bf * (1 - 0.6 * area) + thicker * 0.6 * area, Bf)
    Bf = np.where((tB < 0)[..., None], Bf * (1 - 0.4 * area) + thinner * 0.4 * area, Bf)
    return Bf


def protect(A, Bf, polys, scale):
    H, W = A.shape[:2]
    m = np.zeros((H, W), np.uint8)
    for poly in polys:
        cv2.fillPoly(m, [np.round(np.array(poly) * scale).astype(np.int32)], 255)
    grow = max(3, int(13 * W / REF_WIDTH)) | 1
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow, grow)))
    m = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 6 * W / REF_WIDTH)[..., None]
    return A * m + Bf * (1 - m)


def write_video(A, B, out, seconds, swaps, fps=24):
    hold = max(1, round(fps / swaps))
    H, W = A.shape[:2]
    p = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
        "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
        "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "15",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for i in range(int(round(seconds * fps))):
        p.stdin.write((A if (i // hold) % 2 == 0 else B).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        sys.exit("ffmpeg falló al crear el vídeo")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada")
    ap.add_argument("salida", help="vídeo .mp4 de salida")
    ap.add_argument("--duracion", type=float, default=4.0, help="segundos (por defecto 4)")
    ap.add_argument("--cambios", type=float, default=8.0, help="cambios de dibujo por segundo (por defecto 8)")
    ap.add_argument("--intensidad", type=float, default=3.0,
                    help="cuánto se desvían los trazos; 3 = como la referencia, 2 = más sutil, 4 = más marcado")
    ap.add_argument("--trozo", type=float, default=30.0, help="tamaño de cada trozo de trazo en px (a 1080 de ancho)")
    ap.add_argument("--ancho", type=int, default=1080, help="anchura del vídeo en px (por defecto 1080)")
    ap.add_argument("--proteger", type=parse_poly, action="append", default=[],
                    help="zona que queda quieta: polígono 'x1,y1 x2,y2 ...' en píxeles de la imagen original; repetible")
    ap.add_argument("--semilla", type=int, default=23, help="cambia la semilla para otra variante del redibujo")
    ap.add_argument("--guardar-dibujos", action="store_true", help="guarda también las dos imágenes (A y B) junto al vídeo")
    a = ap.parse_args()

    A, scale = load(a.entrada, a.ancho)
    Bf = redraw(A, a.intensidad, a.trozo, a.semilla)
    if a.proteger:
        Bf = protect(A.astype(np.float32), Bf, a.proteger, scale)
    B = np.clip(Bf, 0, 255).astype(np.uint8)
    write_video(A, B, a.salida, a.duracion, a.cambios)
    if a.guardar_dibujos:
        base = os.path.splitext(a.salida)[0]
        cv2.imwrite(base + "_A.jpg", A, [cv2.IMWRITE_JPEG_QUALITY, 97])
        cv2.imwrite(base + "_B.jpg", B, [cv2.IMWRITE_JPEG_QUALITY, 97])
    print(f"OK {a.salida} {A.shape[1]}x{A.shape[0]} {a.duracion:g}s")


if __name__ == "__main__":
    main()
