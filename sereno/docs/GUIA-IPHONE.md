# 📱 Sereno en tu iPhone

Hay dos maneras de tener Sereno en el iPhone:

| | **A. App de verdad (con widget)** | **B. Web instalada (sin widget)** |
|---|---|---|
| Widget en pantalla de inicio y de bloqueo | ✅ | ❌ |
| Marcar como hecho desde el widget | ✅ | ❌ |
| Avisos amables (10 min antes, buenos días…) | ✅ | ❌ |
| Leer el Calendario del iPhone automáticamente | ✅ | Importando un archivo .ics |
| Qué necesitas | Un Mac con Xcode | Solo Safari |

---

## A. App nativa con widget (necesitas un Mac)

### Lo que necesitas
- Un **Mac** con **Xcode 16 o posterior** (gratis en la App Store del Mac).
- **Node.js 20+** en el Mac (https://nodejs.org).
- Un **iPhone con iOS 17 o posterior** para el widget (la app funciona desde iOS 15).
- Tu **Apple ID**. Para el **widget** casi seguro necesitarás la cuenta de **Apple Developer de pago
  (99 €/año)**: el widget comparte datos con la app mediante *App Groups*, y por lo que sé las
  cuentas gratuitas no lo admiten. Sin cuenta de pago puedes probar la app sin el widget (ver
  [Problemas frecuentes](#problemas-frecuentes)).

### Paso 1 · Descargar y preparar
En el Terminal del Mac:

```bash
git clone https://github.com/6ftd7fwt8w-bit/Claude-.git
cd Claude-
git checkout claude/keen-cannon-om5e5c   # o main, cuando lo fusionemos
cd sereno
npm install
npm run ios        # compila la web, la copia al proyecto y abre Xcode
```

### Paso 2 · Firmar la app en Xcode
1. En la barra lateral de Xcode, pulsa el proyecto **App** (icono azul).
2. Target **App** → pestaña **Signing & Capabilities**:
   - **Team**: elige tu cuenta (Xcode → Settings → Accounts para añadirla).
   - **Bundle Identifier**: cámbialo por uno único, p. ej. `com.tunombre.sereno`.
   - En **App Groups**, cambia `group.app.sereno.ios` por `group.com.tunombre.sereno`.
3. Target **SerenoWidget** → **Signing & Capabilities**:
   - Mismo **Team**.
   - **Bundle Identifier**: `com.tunombre.sereno.SerenoWidget` (debe empezar como el de la app).
   - **App Groups**: el mismo grupo que pusiste en la app.
4. Abre `Shared/SharedStore.swift` y pon ese mismo grupo en `appGroup`.

### Paso 3 · Instalar en tu iPhone
1. Conecta el iPhone por cable (o en la misma wifi) y desbloquéalo.
2. En el iPhone: **Ajustes → Privacidad y seguridad → Modo de desarrollador → Activar** (se reinicia).
3. En Xcode, arriba, elige tu iPhone como destino y pulsa **▶︎**.
4. La primera vez, en el iPhone: **Ajustes → General → VPN y gestión de dispositivos →** confía en tu cuenta.

### Paso 4 · Añadir el widget
- **Pantalla de inicio**: mantén pulsado un hueco → **Editar → Añadir widget** → busca **Sereno**.
  - *Tu día* (pequeño, mediano o grande): progreso, lo siguiente que toca y círculos para marcar como hecho.
  - *Acciones rápidas*: Añadir · Respirar · Energía · Bonsái.
- **Pantalla de bloqueo**: mantén pulsada la pantalla de bloqueo → **Personalizar → Bloqueo** → añade el widget de Sereno.

Lo que marques desde el widget se apunta y, al abrir la app, se suman las gotas y las hojas del bonsái.

### Paso 5 · Permisos
- **Notificaciones**: la app las pide la primera vez. Se pueden desactivar en *Rutina → Avisos amables*.
- **Calendario**: *Rutina → Sincronizar con el Calendario del iPhone*. Después se mantiene al día solo
  cada vez que abres la app.

### Cuando cambiemos el código
```bash
git pull
npm install
npm run ios:sync   # y vuelve a pulsar ▶︎ en Xcode
```

### Problemas frecuentes
- **"Personal development teams do not support the App Groups capability"**: tu cuenta es gratuita.
  Para probar la app sin widget, en el target **App**:
  1. *Signing & Capabilities* → borra **App Groups** (la ✕).
  2. *Build Phases* → **Embed Foundation Extensions** → quita `SerenoWidget.appex`.
  3. *Build Phases* → **Target Dependencies** → quita `SerenoWidget`.

  Todo lo demás (avisos, calendario, bonsái…) sigue funcionando.
- **El widget sale vacío**: abre la app una vez (es la app la que le pasa los datos) y comprueba que
  el App Group es **idéntico** en los dos targets y en `SharedStore.swift`.
- **Si regeneras la carpeta `ios/`** (`npx cap add ios`): ejecuta `npm run ios:setup` para volver a
  añadir el widget y el plugin al proyecto de Xcode.

---

## B. Web instalada (sin Mac, sin widget)

1. Publica la web: en GitHub, **Settings → Pages → Source: GitHub Actions**. El flujo
   `.github/workflows/sereno-pages.yml` la publica cada vez que se actualiza `main`
   (en repositorios privados, GitHub Pages requiere un plan de pago).
2. En el iPhone, abre la dirección en **Safari** → botón **Compartir** → **Añadir a pantalla de inicio**.
3. Se abre a pantalla completa y funciona sin conexión. Tus datos se guardan en el iPhone.

---

## Cómo está hecho (para curiosos)

- La app es la misma web (React) dentro de **Capacitor**, que la convierte en app nativa.
- `ios/App/App/SerenoBridge.swift`: plugin propio que comparte datos con el widget y lee el calendario.
- `ios/App/SerenoWidget/SerenoWidget.swift`: el widget en SwiftUI/WidgetKit, con botones interactivos (iOS 17).
- `src/native.ts`: el lado web de todo esto (en el navegador no hace nada).
- `scripts/setup-ios.rb`: añade el widget al proyecto de Xcode de forma automática.
