# 🌿 Sereno

**Consigue tus objetivos sin estrés.**

Organizador de vida tipo calendario: le cuentas lo que quieres conseguir («proyecto personal, 10 h,
antes del 15/12») y Sereno lo reparte en los huecos reales de tu rutina, según tu energía de cada día.
Si algo no se hace, lo recoloca sin culpa. Y cada cosa que completas hace crecer **el bonsái de la vida**.

Lista completa de funcionalidades y hoja de ruta: [`docs/FUNCIONALIDADES.md`](docs/FUNCIONALIDADES.md).

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
    time.ts        ← utilidades de fechas
  components/      ← pantallas: Hoy, Calendario, Objetivos, Bonsái, onboarding, añadir…
  store.ts         ← estado guardado en el dispositivo (localStorage)
public/            ← icono, manifest (accesos directos) y service worker
```

La lógica (`src/lib`) no depende de React, así que se podrá reutilizar tal cual en la app nativa con widget.
