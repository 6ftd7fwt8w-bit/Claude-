# Sereno — Funcionalidades

> **Consigue tus objetivos sin estrés.**
> Un organizador de vida que reparte lo que quieres conseguir en los huecos reales de tu
> rutina, se adapta a tu energía de cada día y se asegura de que no se te olvide vivir
> (amigos, descanso, cuidarte).

Leyenda: ✅ hecho en la v0.1 · 🔜 siguiente fase · 💡 idea para más adelante

---

## 1. Conocerte (onboarding)

| | Funcionalidad |
|---|---|
| ✅ | Bienvenida con la promesa de la app |
| ✅ | Nombre (para saludarte cada mañana) |
| ✅ | Hora de despertar + cuánto tardas en arrancar (ducha, desayuno…) |
| ✅ | ¿Trabajas/estudias? Días, hora de inicio y fin, desplazamiento |
| ✅ | Hora de comida y cena, y cuánto tiempo reservar |
| ✅ | Hora de acostarte + **tiempo de desconexión** antes de dormir (protegido: nunca se ponen tareas ahí) |
| ✅ | Fines de semana más suaves (opcional) |
| ✅ | Hábitos de equilibrio sugeridos: meditar, ejercicio, quedar con amigos, llamar a alguien, leer… |
| ✅ | Resumen: «tienes X h libres reales a la semana» |
| 🔜 | Horarios distintos por día (p. ej. viernes intensivo, días de teletrabajo) |
| 🔜 | Cronotipo: ¿eres de mañanas o de noches? → colocar lo que exige foco en tu mejor franja |

## 2. Energía del día

| | Funcionalidad |
|---|---|
| ✅ | Al abrir la app cada día: «¿Cómo te sientes hoy?» (20 % · 40 % · 60 % · 80 % · 100 %) |
| ✅ | La energía cambia la **capacidad** del día (cuánto del tiempo libre se usa) |
| ✅ | Con energía baja, la app **aligera el día**: mueve a otros días lo que tiene margen (nunca lo que vence hoy) |
| ✅ | Con energía alta: sugiere adelantar algo |
| 🔜 | Historial de energía → aprender tus patrones («los lunes sueles estar al 40 %») |
| 💡 | Conectar con sueño/pasos de Salud (Apple Health / Google Fit) para sugerir la energía |

## 3. Añadir cosas (y que la app las coloque)

| | Funcionalidad |
|---|---|
| ✅ | **Entrada en lenguaje natural**: «Proyecto personal 10h antes del 15/12», «Cena con Ana el viernes a las 21:30», «Meditar 10 min 5 veces por semana» |
| ✅ | Detecta duración, fecha límite, día y hora, repetición y **tipo** (por palabras clave) |
| ✅ | Tres clases de cosas: **Objetivo** (horas + deadline, se trocea en sesiones), **Con hora** (evento fijo) y **Hábito** (X veces/semana) |
| ✅ | Categorías: Bienestar · Vida social · Proyectos · Cuidado personal · Hogar · Trabajo |
| ✅ | Tras añadir, te dice dónde lo ha puesto: «Repartido en 10 sesiones. Propuesta: hoy a las 18:30» |
| ✅ | Avisa si no cabe antes del deadline y propone ampliar la fecha o reducir horas |
| 🔜 | Entrada por voz («Oye Sereno, apunta…») |
| 🔜 | Editar una tarea existente (horas, fecha, categoría) |
| 💡 | Subtareas / checklist dentro de un proyecto |

## 4. El planificador inteligente

Cómo decide (ver `src/lib/scheduler.ts`):

1. **Tiempo libre real** de cada día = 24 h − sueño − rutina de mañana − trabajo y desplazamiento − comidas − desconexión.
2. **Capacidad** = tiempo libre × energía (con 100 % se usa como mucho el 90 %; los findes, menos).
3. Los objetivos se **trocean** en sesiones (25 min, 1 h, 90 min…) y se reparten entre hoy y el deadline:
   - primero el día **más cercano** donde quepa y el día siga siendo *tranquilo* (verde) → «propuesta para hoy»;
   - si no, el día con más hueco;
   - si tampoco, el menos cargado (y el día se pinta naranja/rojo para que lo veas).
4. Siempre deja **10 minutos de respiro** entre una cosa y otra.
5. La vida social y el cuidado personal se proponen preferentemente por la tarde.

| | Funcionalidad |
|---|---|
| ✅ | Reparto automático respetando rutina, energía y deadlines |
| ✅ | Lo que **no completaste** ayer se reasigna solo al abrir la app («sin culpa») |
| ✅ | Botón **«Hoy no puedo»**: lo mueve a otro día y te dice a cuál |
| ✅ | Botón **«Tengo un hueco, ¿qué adelanto?»**: trae a hoy lo siguiente más urgente |
| ✅ | Un evento con hora fija **desplaza** lo flexible que pise |
| ✅ | Los hábitos se colocan cada semana en días distintos |
| ✅ | Al cambiar la rutina, reorganiza todo el calendario |
| 🔜 | Arrastrar una sesión a otro día/hora a mano (y que lo respete) |
| 🔜 | Sincronizar con Google Calendar / Calendario de iPhone (leer tus citas como ocupadas) |
| 💡 | Prioridad / importancia además del deadline |

## 5. Calendario con colores

| | Funcionalidad |
|---|---|
| ✅ | Vista mensual: cada día de color según su carga — **libre · verde (tranquilo) · naranja (con ritmo) · rojo (intenso)** |
| ✅ | Puntitos de color por categoría en cada día |
| ✅ | Al tocar un día: carga, energía, consejo y lista de lo planeado |
| 🔜 | Vista semanal tipo agenda con bloques por hora |

## 6. Consejos del día

| | Funcionalidad |
|---|---|
| ✅ | Según la carga: «Hoy es un día ajetreado, intenta hacer al menos 10 min de meditación» |
| ✅ | Según la energía: «Tu energía está baja, prioriza lo esencial» |
| ✅ | **Que no se te olvide vivir**: «Hace 9 días que no dedicas tiempo a tu vida social, ¿una llamada?» (con botón para planearlo) |
| ✅ | Deadlines cercanos: «Mañana vence X, vas por el 70 %» |
| ✅ | Frase motivadora diferente cada día («Los pequeños progresos también son avances») |
| ✅ | Respiración guiada (4-4-6) desde el consejo o un botón |
| 🔜 | Resumen de la noche: «Hoy has hecho 3 cosas. ¿Qué agradeces del día?» (mini-diario) |
| 💡 | Consejos generados con IA a partir de tu semana |

## 7. Juego y satisfacción

| | Funcionalidad |
|---|---|
| ✅ | **El bonsái de la vida**: cada cosa completada es una hoja (del color de su categoría). Las sesiones largas dan hojas más grandes |
| ✅ | Brotes: puntitos que muestran las hojas que aún pueden crecer este mes |
| ✅ | **Flores** 🌸 por cada «día redondo» (todo lo del día completado) |
| ✅ | Un bonsái por mes, con historial de meses anteriores |
| ✅ | **Gotas de agua** 💧 como puntos (más gotas cuanto más larga la sesión) |
| ✅ | Racha de días seguidos cuidándote |
| ✅ | Celebración al completar: hojas cayendo, vibración suave y frase de ánimo |
| ✅ | **Equilibrio del mes**: tiempo dedicado a cada área de tu vida |
| 🔜 | Canjear gotas: macetas, estaciones (cerezo en primavera, hojas rojas en otoño), fondos, sonidos |
| 🔜 | Logros suaves: «Primera semana equilibrada», «5 quedadas este mes»… |
| 💡 | Jardín de bonsáis: la colección de todos tus meses |
| 💡 | Sonidos ambiente relajantes (lluvia, bosque) mientras trabajas en una sesión + temporizador |

## 8. Widget y acciones rápidas

| | Funcionalidad |
|---|---|
| ✅ | Botón **+** siempre visible |
| ✅ | **Accesos directos** del icono de la app (mantener pulsado en Android / escritorio): *Añadir tarea · Energía · Respirar* |
| ✅ | Funciona sin conexión e instalable en la pantalla de inicio (PWA) |
| 🔜 | **Widget nativo** de pantalla de inicio (iOS/Android): próxima sesión, botón ✓, botón «+ añadir», mini-bonsái |
| 🔜 | Notificaciones amables: «En 10 min empieza tu rato de lectura», resumen de la mañana |
| 💡 | Atajos de Siri / Live Activity durante una sesión |

## 9. Privacidad y datos

| | Funcionalidad |
|---|---|
| ✅ | Todo se guarda solo en tu dispositivo |
| 🔜 | Exportar / importar copia de seguridad |
| 💡 | Cuenta opcional para sincronizar entre móvil y ordenador |

---

## Hoja de ruta técnica propuesta

1. **v0.1 (esta)** — Web app instalable (PWA) en React + TypeScript. Toda la lógica del planificador
   está en funciones puras y probadas (`src/lib`), independientes de la interfaz.
2. **v0.2** — Editar tareas, arrastrar sesiones, notificaciones, vista semanal, exportar datos.
3. **v0.3 — App nativa con widget**: empaquetar la misma web con **Capacitor** para iOS y Android y
   añadir el widget nativo (WidgetKit en iOS, App Widgets en Android) que lea el estado compartido.
   Así reutilizamos el 100 % del código actual. (Alternativa: reescribir la UI en React Native/Expo
   reutilizando `src/lib` tal cual.)
4. **v0.4** — Sincronizar con Google Calendar / iCloud, cuenta opcional y tienda de recompensas.
