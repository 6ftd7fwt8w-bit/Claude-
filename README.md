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

## 🛡️ Seguridad: ¿puede Instagram penalizar o suspender la cuenta?

**No por esto.** ReelPulse usa exclusivamente la Graph API oficial de Meta en modo lectura — el canal documentado y permitido para cuentas Business/Creator — con un token que el propio usuario genera y puede revocar. No publica, no da likes, no sigue a nadie, no envía mensajes ni pide la contraseña.

Las suspensiones históricas vinieron de otra cosa: bots de automatización (Instagress, Mass Planner, Instaplus — cerradas por Instagram en 2017), apps de API privada/scraping que piden usuario y contraseña, y compra de seguidores o engagement (oleadas de bans por detección de patrones desde finales de 2025). Nada de eso ocurre aquí.

Protecciones incorporadas en la app:
- **Caché de métricas de 12 h** en el dispositivo + **máximo 3 peticiones simultáneas**: queda muy por debajo del límite de Meta (~200 llamadas/hora/usuario). El contador de llamadas se muestra en el dashboard.
- Si Meta devuelve un error de rate-limit (códigos 4/17), la app lo explica y pide reintentar más tarde — ese error es temporal y **no** afecta al estado de la cuenta.
- El token y la clave de IA se guardan solo en `localStorage` del dispositivo; las llamadas van directas del navegador a Meta/Anthropic, sin servidores intermedios.

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

## 🤖 Optimizador con IA (opcional)

En **Conectar → Optimizador con IA** se puede guardar una clave de la API de Claude (console.anthropic.com). Con ella, el detalle de cada reel ofrece "Reescritura con Claude": envía caption + métricas + debilidades detectadas y devuelve 3 hooks y un caption optimizado (JSON), vía `POST https://api.anthropic.com/v1/messages` (modelo `claude-opus-5`, fallback automático activado) directamente desde el navegador. Sin clave, funciona el motor de reglas local.

## 📈 Histórico

Cada análisis en vivo guarda un snapshot diario (ReelScore y alcance medios) en `localStorage` (máx. 90). El dashboard dibuja la evolución del ReelScore y el alcance por reel en orden cronológico, con puntos/barras tocables.

## 🛣️ Ideas de evolución

- OAuth completo (botón "Login con Facebook") para no pegar tokens a mano — requiere registrar dominio en la app de Meta.
- Alertas semanales y análisis A/B de horarios con datos acumulados.
- Publicación programada vía `POST /{ig-user-id}/media` (la API permite publicar reels).
- Exportar informe PDF/imagen para compartir con clientes.
