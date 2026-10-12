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
- Por persona, sin suplementos por tipo (12/10/2026: +3 € en todas las personalizadas y lienzos al pasar a envío gratis siempre): A4 1 persona 49 € (retrato, bebé, comunión, tradición, mascota), 2 → 54 (pareja, boda), 3-4 → 64, 5-6 → 74, 7-8 → 84, 9 o más → 94 (+5 € por persona, tramo al número más alto). Mascotas igual (1, 2, 3-4, 5 o más). Paisaje 53.
- A3 = A4 + 10; lienzos = A4 + 63 / + 93.
- Láminas infantiles: sin cambio (17,95 A4 / 22,95 A3).

## Envío
- Península: gratis en todos los pedidos (12/10/2026). En Shopify, zona «España»: tarifa «Estándar» 6,90 desactivada y «Envío gratuito» sin importe mínimo. Baleares 10,90 y Canarias 14,90 sin cambios.
- Tema: ajuste «free_shipping_always» activado (no sale la barra de «añade X € más»; cesta y formulario dicen «Envío gratis (península)»). La política de envíos hay que cambiarla a mano (sin permiso write_legal_policies).

## Packs regalo (desde oct. 2026)
- Los packs incluyen marco blanco; en madera clara +2 € en A4 y +4 € en A3. Pack Regalo (variantes Tamaño × Marco): A4 blanco 28 / madera 30, A3 blanco 32 / madera 36. Pack Valentina (variante Marco, siempre A3): blanco 67 / madera 71.
- Con pack, el formulario no añade el producto de marco: elige la variante del pack según tamaño y color del marco, y guarda el color como propiedad «Marco (incluido en el pack)» en la ilustración, con aviso verde «¡Genial! Tu pack regalo ya incluye marco».

## Marcos sueltos (sin pack)
- Extra: Marco A4: blanco 16 / madera clara 18. Extra: Marco A3 (efecto profundidad): blanco 21 / madera clara 25. La diferencia madera–blanco coincide con el suplemento en los packs (+2 A4, +4 A3).

## Descuento de bienvenida HOLA10
- 10 % en la colección laminas-personalizadas, sin límite por cliente. Fecha de fin en Shopify: 31/10/2026 23:59 (hora de España); ajuste del tema «welcome_end» (2026-10-31) oculta el aviso a partir del día siguiente.
- Desde el 12/10/2026 no se anuncia en ningún sitio (barra, colección, tarjetas, lienzo express, pop-up y su botón negro quitados). Solo hay un aviso inferior en el formulario de personalizadas al subir fotos o llegar al resumen de precio: «¿Nuevo por aquí? · Ahorra un 10 % en tu primera ilustración · Se aplica automáticamente, no necesitas código · Activar descuento · Válido 24 horas desde la activación · No, gracias».
- Al activarlo, theme.js (window.vivaWelcome) guarda la hora en localStorage «vlh_welcome», añade HOLA10 a la cesta y lo quita a las 24 h. «No, gracias» no lo vuelve a ofrecer en 7 días; si ya lo activó, no se ofrece más.
- Carrito: línea dorada «Descuento de bienvenida del 10 % · válido durante 24 h», desglose (importe, «Te ahorras X en este pedido · si finalizas el pedido antes de 24 h», envío gratis) y total. Sin campo de código (está en el checkout), sin cuenta atrás ni oferta cruzada.
- Si se alarga la oferta: cambiar la fecha en el descuento de Shopify y en «welcome_end».

## Lienzos XL
- Tamaños (variantes de las 9 ilustraciones personalizadas): "Lienzo 70x100 cm" (proporción como A3) y "Lienzo 80x120 cm". Precio = precio A4 (misma 2ª opción) + 63 / + 93 € (desde sept. 2026: láminas personalizadas +3 € y lienzos +6 € para cubrir el envío gratis desde 60 € en península). El 60x90 se eliminó por ser casi igual que el 70x100.
- Tela 100 % algodón en bastidor, listo para colgar. Al elegir lienzo el formulario desactiva marco y packs regalo.
- Plazo y envío: igual que las personalizadas. Infantiles: sin lienzo de momento.
- Campaña: página /pages/lienzos-xl-fallera (plantilla page.lienzos-fallera), reel vlh-reel-lienzos-fallera.mov. Título de campaña: «Tu retrato de fallera». Debajo del vídeo, sección «Lienzo express» (sections/lienzo-express.liquid): precios con HOLA10, botón «Crear mi lienzo» y formulario corto (tamaño, personas, fotos) que añade la variante de lienzo del producto de tradición y aplica el código.

## Flujo
- El tema publicado es "Viva Galería – vídeo en hero" (191317540937; el hero de personalizadas usa un vídeo «cine» de Shopify con los ajustes video/video_mobile del slideshow, no la fila de vídeos). Nunca editarlo directamente: duplicarlo (themeDuplicate) a un borrador, subir ahí los cambios, verificarlos con preview_theme_id y que la dueña lo publique. Borrador actual: "Viva Galería – bienvenida 24 h y envío gratis" (191350407241), pendiente de publicar. Antes de empezar, comparar los checksums del tema publicado con el repo (la dueña y otras sesiones también lo cambian). Las plantillas JSON se editan partiendo de la versión del tema publicado.

## Hero con vídeos
- Probada una fila de clips (vlh-hero-reel-1…10 en Archivos, recortes en _media/hero-reel) pero el tema publicado usa otro planteamiento: vídeo único «cine» (vlh-hero-cine-escritorio.mp4 / -movil.mp4) en slide_2 con los ajustes «video»/«video_mobile» del slideshow.

## SEO
- Títulos y descripciones SEO rellenados en todos los productos y colecciones (sept. 2026). Productos nuevos: rellenar también «Vista previa del motor de búsqueda».
- Cambio de handles aplazado (la dueña prefiere esperar a ver cómo indexa). Las láminas infantiles tienen handles desordenados (p. ej. «Ríe» en .../salta-vivalahome-copia). Si se cambian, hacerlo con redirección (redirectNewHandle) y actualizar a la vez los handles en templates/index.json, collection.json y collection.sets.json (sets_def.py).
