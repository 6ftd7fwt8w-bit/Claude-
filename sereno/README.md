# 🌿 Sereno

**Mente tranquila, máximo potencial.** Consigue tus objetivos sin estrés.

Organizador de vida tipo calendario: le cuentas lo que quieres conseguir («proyecto personal, 10 h,
antes del 15/12») y Sereno lo reparte en los huecos reales de tu rutina, según tu energía de cada día.
Si algo no se hace, lo recoloca sin culpa. Y cada cosa que completas hace crecer **el bonsái de la vida**.

- Funcionalidades y hoja de ruta: [`docs/FUNCIONALIDADES.md`](docs/FUNCIONALIDADES.md)
- **Instalarla en tu iPhone (con widget):** [`docs/GUIA-IPHONE.md`](docs/GUIA-IPHONE.md)

## Probarla

```bash
cd sereno
npm install
npm run dev        # abre http://localhost:5173 (mejor en el móvil o con vista móvil)
```

Otros comandos:

```bash
npm test           # tests del planificador y del lenguaje natural
npm run build      # versión de producción en dist/ (instalable como app, funciona sin conexión)
npm run ios        # (en un Mac) compila, sincroniza con el proyecto iOS y abre Xcode
```

## Estructura

```
src/
  lib/
    scheduler.ts   ← el cerebro: tiempo libre, capacidad según energía, reparto, reprogramación
    parse.ts       ← entrada rápida en lenguaje natural (español)
    tips.ts        ← consejos del día
    phrases.ts     ← frases motivadoras
    stats.ts       ← hojas, flores, racha y equilibrio del mes
    mind.ts        ← análisis del plan, índice de mente tranquila e informe personal
    rewards.ts     ← tienda del bonsái, logros y diario
    ics.ts         ← importar calendarios .ics
    widget.ts      ← datos que se pasan al widget de iPhone
    time.ts        ← utilidades de fechas
  components/      ← pantallas: Hoy, Calendario, Objetivos, Bonsái, onboarding, añadir…
  store.ts         ← estado guardado en el dispositivo
  native.ts        ← puente con iOS (widget, avisos, calendario); en la web no hace nada
public/            ← icono, manifest (accesos directos) y service worker
ios/               ← proyecto de Xcode (Capacitor) + widget en SwiftUI (ios/App/SerenoWidget)
scripts/setup-ios.rb ← añade el widget y el plugin al proyecto de Xcode
```
