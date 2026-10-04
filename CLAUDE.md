# Viva la Home — notas para trabajar en este tema

## Imágenes generadas (Higgsfield u otras)
- **Marcos:** siempre como los que se venden en la tienda: marco fino de **madera marrón/natural** o **blanco**, **sin paspartú** (la lámina llega hasta el borde del marco). Referencias: fotos de los productos "Extra: Marco A4" / "Extra: Marco A3".
- Usar como referencia las ilustraciones reales de los productos y reproducirlas sin cambios.
- **Si las láminas o los packs tienen que salir exactos, no generarlos con IA**: usar la foto real del producto (ampliar solo los laterales con outpaint y volver a pegar encima la foto original) o componer la portada con las fotos reales sobre fondo crema.
- Paleta: crema, arena, avena; luz natural suave; estilo catálogo, sin textos ni logos.

## Textos
- No decir "trazo a trazo" ni "la dibujamos nosotras" (usamos varias herramientas).
- Lo que sí hacen a mano: diseñar las ilustraciones, imprimir, enmarcar y montar los packs regalo (telas, ramitos).
- Papel: algodón verjurado 300 g.

## Precios personalizadas (desde oct. 2026)
- Por persona, sin suplementos por tipo: A4 1 persona 46 € (retrato, bebé, comunión, tradición, mascota), 2 → 51 (pareja, boda), 3-4 → 61, 5-6 → 71, 7-8 → 81, 9 o más → 91 (+5 € por persona, tramo al número más alto). Mascotas igual (1, 2, 3-4, 5 o más). Paisaje 50.
- A3 = A4 + 10; lienzos = A4 + 63 / + 93.

## Lienzos XL
- Tamaños (variantes de las 9 ilustraciones personalizadas): "Lienzo 70x100 cm" (proporción como A3) y "Lienzo 80x120 cm". Precio = precio A4 (misma 2ª opción) + 63 / + 93 € (desde sept. 2026: láminas personalizadas +3 € y lienzos +6 € para cubrir el envío gratis desde 60 € en península). El 60x90 se eliminó por ser casi igual que el 70x100.
- Tela 100 % algodón en bastidor, listo para colgar. Al elegir lienzo el formulario desactiva marco y packs regalo.
- Plazo y envío: igual que las personalizadas. Infantiles: sin lienzo de momento.
- Campaña: página /pages/lienzos-xl-fallera (plantilla page.lienzos-fallera), reel vlh-reel-lienzos-fallera.mov. Título de campaña: «Tu retrato de fallera».

## Flujo
- El tema publicado es "Viva Galería – SEO" (191079350345). Nunca editarlo directamente: duplicarlo (themeDuplicate) a un borrador, subir ahí los cambios, verificarlos con preview_theme_id y que la dueña lo publique. Borrador actual: "Viva Galería – banner" (191165104201), con el banner de confianza sin «hasta 3 cambios» (pendiente de publicar).

## SEO
- Títulos y descripciones SEO rellenados en todos los productos y colecciones (sept. 2026). Productos nuevos: rellenar también «Vista previa del motor de búsqueda».
- Cambio de handles aplazado (la dueña prefiere esperar a ver cómo indexa). Las láminas infantiles tienen handles desordenados (p. ej. «Ríe» en .../salta-vivalahome-copia). Si se cambian, hacerlo con redirección (redirectNewHandle) y actualizar a la vez los handles en templates/index.json, collection.json y collection.sets.json (sets_def.py).
