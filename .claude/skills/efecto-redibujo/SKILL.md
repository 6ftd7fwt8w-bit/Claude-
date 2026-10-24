---
name: efecto-redibujo
description: Anima una ilustración con el efecto "redibujo a mano" (line boil / boiling lines de 2 dibujos, estilo GIF stop motion), como en los carruseles de ilustradores tipo haojing.co. Crea una copia del dibujo en la que los trazos parecen vueltos a dibujar por el mismo artista, con leves imperfecciones, y alterna original y copia en bucle en un vídeo MP4 (por defecto 4 segundos, 8 cambios por segundo). Puede dejar quietas zonas concretas, como la cara de un personaje. Usa este skill siempre que alguien suba una ilustración, dibujo o imagen y pida "el efecto", "que los trazos se muevan", "que parezca dibujado a mano", "efecto stop motion", "líneas que tiemblan o vibran", "line boil", "como el vídeo de Instagram" o simplemente "anímala igual que la otra", aunque no use el nombre del efecto.
---

# Efecto redibujo a mano

Convierte una ilustración fija en un vídeo corto en el que el dibujo "respira" como una animación hecha a mano. La persona que usa este skill normalmente no es técnica: solo sube la imagen y quiere el vídeo. Pide lo mínimo, haz el resto y entrega el MP4.

## Qué es exactamente el efecto (y qué no)

Se calibró midiendo un vídeo de referencia fotograma a fotograma:

- Solo hay **2 dibujos**: el original (A) y una copia "redibujada" (B). El vídeo alterna A, B, A, B… **8 veces por segundo**.
- En la copia, **la mayoría de los trazos casi no cambian**, y unos pocos (brillos, puntitos, trazos cortos, contornos pequeños) se desplazan o giran unos píxeles. Algunos salen un poco más finos o más gruesos. Así parece que el artista ha vuelto a trazar el dibujo, no que se deforma.
- **No es** una ondulación ni una deformación suave de toda la imagen (eso se probó y no gustó: parece agua), ni un parallax ni un zoom. La imagen no cambia de encuadre, colores ni contenido.

El script `scripts/redibujo.py` ya lo hace todo con estos valores por defecto. No reinventes el algoritmo.

## Pasos

1. **Preparar el entorno** (solo si falta algo). Hacen falta `ffmpeg` y los paquetes de Python `numpy`, `opencv-python-headless` y `scipy`:
   ```bash
   python3 -c "import cv2, scipy, numpy" 2>/dev/null || pip install -q numpy opencv-python-headless scipy
   which ffmpeg || echo "falta ffmpeg"
   ```

2. **Mirar la imagen** y decidir si hay zonas que proteger. Por defecto, **deja quietas las caras de las personas**, porque el efecto en ojos, boca y nariz suele quedar raro, y a la usuaria original no le gustó en la cara. Si la persona dice lo contrario, o pide proteger otras zonas (un texto, un logo, unas manos), haz lo que pida. Si la imagen no tiene caras, no protejas nada.

3. **Localizar la zona a proteger** (si la hay). Genera una rejilla con coordenadas y mírala:
   ```bash
   python3 scripts/rejilla.py imagen.jpg /tmp/rejilla.png
   # para afinar alrededor de la cara:
   python3 scripts/rejilla.py imagen.jpg /tmp/rejilla_cara.png --recorte 300,250,400,400 --paso 25
   ```
   Con la rejilla, traza un polígono de 10 a 16 puntos que siga el contorno de la cara: frente bajo el flequillo, sienes, mejillas, mandíbula y barbilla, incluyendo ojos, pestañas, nariz y boca. Las coordenadas son las de la imagen **original**. El script ya amplía y suaviza el borde, así que no hace falta que sea perfecto.

4. **Generar el vídeo**:
   ```bash
   python3 scripts/redibujo.py imagen.jpg salida.mp4 --guardar-dibujos \
       --proteger "362,359 398,353 436,359 481,365 526,367 547,383 547,429 530,451 519,481 496,519 451,530 417,519 398,489 376,444 365,398"
   ```
   (Ejemplo real: la cara de una ilustración de 812×1114 px.)
   Si hay varias zonas, repite `--proteger` una vez por zona. Sin zonas, quita la opción.

5. **Revisar antes de entregar.** Haz un recorte comparando `salida_A.jpg` con `salida_B.jpg` y míralo: una zona con detalle y, si protegiste algo, el borde de esa zona. Debe parecer el mismo dibujo con trazos ligeramente distintos, sin roturas ni manchas. Si la zona protegida se mueve, ajusta el polígono.

6. **Entregar** el MP4 a la persona y explicarle cómo guardarlo. En iPhone: abrir el vídeo, pulsar compartir y elegir "Guardar vídeo". Claude no puede guardarlo directamente en su galería.

## Ajustes que puede pedir la persona

| Petición | Opción |
|---|---|
| "Más sutil" / "se mueve demasiado" | `--intensidad 2` (o 1.5) |
| "Más marcado" / "casi no se nota" | `--intensidad 4` |
| "Más lento" / "más rápido" | `--cambios 6` / `--cambios 12` |
| Otra duración | `--duracion 6` |
| "Otra variante" / "no me gusta cómo queda X" | `--semilla 7` (cualquier otro número) |
| Vídeo más grande o más pequeño | `--ancho 1440` / `--ancho 720` |

El vídeo final siempre es MP4 H.264 a 24 fps, compatible con iPhone, Instagram y WhatsApp, con la misma proporción que la imagen original.

## Cómo hablar con la persona

Responde en su idioma y sin tecnicismos. Cuenta en una o dos frases qué has hecho (por ejemplo: "He dejado la cara quieta y el resto del dibujo alterna entre el original y una copia redibujada") y ofrece los ajustes de la tabla, dichos en lenguaje normal.
