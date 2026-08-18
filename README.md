# 📊 ReelPulse — Analizador de alcance para Instagram Reels

Aplicación web móvil (instalable como PWA) que analiza tus Reels con la **API oficial de Instagram**, les asigna un **ReelScore (0–100)** alineado con las señales reales del algoritmo, y te dice **exactamente qué cambiar** en cada reel: hook, duración, caption, hashtags, CTA y horario. Incluye espía legal de competencia, optimizador de captions y checklist pre-publicación.

Todo corre **100 % en tu navegador**: el token de Instagram nunca sale de tu dispositivo (las llamadas van directas a `graph.facebook.com`).

## 🚀 Usarla

1. **Opción rápida (GitHub Pages)**: en este repo → *Settings → Pages → Deploy from branch* → elige la rama y `/ (root)`. Abre la URL que te da GitHub en el móvil y **Compartir → Añadir a pantalla de inicio**.
2. **Opción local**: descarga `index.html` y ábrelo en cualquier navegador.
3. Dentro de la app pulsa **✨ Ver demo** para explorarla sin cuenta, o **🔗 Conectar** con tu token.

## 🔑 Conectar tu cuenta real (gratis, ~10 min)

Requisitos: cuenta de Instagram **Profesional** (Business o Creator) vinculada a una Página de Facebook.

1. Crea una app tipo *Business* en [developers.facebook.com](https://developers.facebook.com).
2. Abre el **Graph API Explorer**, selecciona tu app y añade los permisos:
   `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `business_management`.
3. Pulsa *Generate Access Token*, inicia sesión y copia el token.
4. Pégalo en la pestaña **Conectar** de ReelPulse. La app detecta sola tu cuenta de IG.
5. (Opcional) Canjéalo por un token de larga duración (60 días) en la misma herramienta.

## 🧠 Qué mide y por qué (investigación 2025–2026)

Señales de ranking confirmadas por Adam Mosseri (jefe de Instagram), por orden de peso:

| Señal | Peso en el algoritmo | Peso en ReelScore |
|---|---|---|
| ⏱️ Watch time / retención | Nº 1 en todas las superficies | 34 % |
| 📤 Envíos por DM / alcance | 3–5× más que un like; la que más alcance a no-seguidores da | 22 % |
| 🔖 Guardados / alcance | Muy fuerte | 15 % |
| 💬 Comentarios / alcance | Fuerte | 10 % |
| 📝 Calidad del caption (SEO, CTA, hashtags 3–5) | Clasificación + búsqueda | 12 % |
| ❤️ Likes / alcance | La más débil del grupo | 7 % |

Además, en 2026 Instagram prioriza contenido humano y original, penaliza marcas de agua de otras apps y el engagement-bait, y funciona cada vez más como buscador (palabras clave en el caption > hashtags masivos).

## 🔌 Hasta dónde llega la API oficial (lo que puede y no puede hacer)

**Puede** (y ReelPulse lo usa):
- `GET /{ig-user-id}/media` — tus reels con miniatura, caption, fecha, likes y comentarios.
- `GET /{ig-media-id}/insights` — `views`, `reach`, `saved`, `shares`, `total_interactions`, `ig_reels_avg_watch_time` (¡llega en milisegundos!). La app degrada automáticamente el set de métricas según la versión/permisos.
- `business_discovery` — datos públicos de cualquier cuenta Business/Creator: seguidores, nº de posts y sus últimos medios con likes/comentarios (pestaña Competencia).

**No puede** (nadie puede, con la API oficial):
- Curva de retención segundo a segundo (solo visible en la app de Instagram).
- Datos de cuentas personales o privadas, listas de seguidores ajenas, ni hashtags en streaming.
- Los insights requieren cuenta profesional; algunos necesitan ≥100 seguidores.

## 🗂️ Estructura

- `index.html` — toda la app (HTML + CSS + JS, sin dependencias ni build).
- `manifest.json` — manifiesto PWA para instalarla en el móvil.

## 🛣️ Ideas de evolución

- OAuth completo (botón "Login con Facebook") para no pegar tokens a mano — requiere registrar dominio en la app de Meta.
- Reescritura de hooks/captions con la API de Claude (ahora es un motor de reglas local).
- Histórico: guardar snapshots en localStorage/IndexedDB y graficar la evolución del ReelScore.
- Alertas semanales y análisis A/B de horarios con datos acumulados.
- Publicación programada vía `POST /{ig-user-id}/media` (la API permite publicar reels).
