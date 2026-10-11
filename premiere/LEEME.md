# Reel DJ v5 · proyecto para Premiere

## Qué hay
- `pablo_dj_reel_v5.xml`: la línea de tiempo montada (1080x1920, 30 fps, 7,5 s, 128 BPM).
- `pablo_audio_master.wav`: el audio masterizado (sacado de IMG_0430).

## Cómo abrirlo
1. Pon en una misma carpeta: el XML, el WAV y tus vídeos originales (IMG_0430, 0446, 0447, 0451, 0459, 1359, 1361).
2. En Premiere: Archivo > Importar > `pablo_dj_reel_v5.xml`.
3. Si te pide "Vincular medios", señala la carpeta de los vídeos. Los nombres tienen que coincidir (IMG_0430.MOV, etc.).

## Qué viene montado
- Los 11 planos, con los mismos tramos y cortes que la v5. Cada corte cae en un bombo.
- Marcadores en la secuencia en cada beat (16 en total).
- La escala de cada plano como punto de partida (los planos de público van más cerrados).

## Qué tienes que hacer tú
- **Plano 7 (IMG_0459, de 3,75 a 4,7 s):** clic derecho > Velocidad/Duración > 50 %, y recorta para que vuelva a durar 2 beats. Así queda en cámara lenta, como en la v5.
- **Encuadre:** recoloca la posición de los planos de público. Sobre todo el plano 3 (IMG_1361, ~1,4 s), donde hay que mover el encuadre de derecha a izquierda para esquivar el altavoz.
- **Zoom:** los acercamientos animados y el golpe de zoom en cada bombo no vienen en el XML. Añádelos con fotogramas clave en Escala si los quieres.
- **Color:** iguala los planos con Lumetri (contraste, negros profundos, viñeta suave, grano).
- **Final:** fundido a negro en los últimos 6 fotogramas.

## Exportar para Instagram
H.264, 1080x1920, 30 fps, VBR 1 pasada a unos 16–20 Mbps, audio AAC a 320 kbps.
