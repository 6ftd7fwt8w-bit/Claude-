/**
 * Entrada rápida en lenguaje natural (español):
 *   "Proyecto personal 10h antes del 15/12"
 *   "Cena con Ana el viernes a las 21:30"
 *   "Meditar 10 min 5 veces por semana"
 */
import type { CategoryId, TaskKind } from '../types';
import { addDays, hmToMin, pad, weekday } from './time';

export interface Parsed {
  title: string;
  kind?: TaskKind;
  totalMinutes?: number;
  deadline?: string;
  date?: string;
  start?: number;
  timesPerWeek?: number;
  timesPerMonth?: number;
  category?: CategoryId;
}

const NUM: Record<string, number> = { una: 1, un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6 };
const num = (w: string) => NUM[w] ?? Number(w);

const DAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};
const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

// el orden importa: gana la primera que encaje
const KEYWORDS: [CategoryId, RegExp][] = [
  ['familia', /\b(mama|papa|madre|padre|abuel|herman|hijo|hija|hijos|famili|ninos|peques|sobrin|suegr|tia |tio |prim[oa]s?\b|bebe)/],
  ['pareja', /\b(pareja|novi[oa]|marido|esposa|esposo|mi mujer|mi chic[oa]|cita romantica|aniversario|san valentin|escapada romantica|noche de cita)/],
  ['social', /\b(amig|cena con|comida con|cafe con|quedar|quedada|cumple|boda|fiesta|cita con)/],
  ['gestiones', /\b(reclam|vuelo|prorroga|alquiler|contrato|seguro|papeles|papeleo|document|tramite|factura|hacienda|impuesto|renta|declaracion|gasto|finanz|presupuesto|pagar|pago|recibo|devoluc|reembolso|banco|transferencia|gestor|notari|dni|pasaporte|carnet|renovar|matricul|inscrib|apuntar|cancelar|darse de baja|dar de baja|suscripc|cita previa|multa|ayuntamiento|seguimiento|follow ?up|garantia|abogad|nomina|hipoteca|factura de)/],
  ['bienestar', /\b(medit|yoga|correr|running|gym|gimnasio|deporte|entren|paseo|pasear|caminar|respir|nadar|piscina|bici|pilates|estirar|abdominal)/],
  ['aficiones', /\b(videojuego|jugar a|jugar al|consola|play|switch|guitarra|piano|ukelele|bateria|bajo electrico|instrumento|tocar el|tocar la|cantar|acuarela|pintar un|pintar cuadro|manualidad|ganchillo|punto|costura|bordar|puzzle|lego|fotografia|serie|peli|cine|jardineria|ajedrez|juego de mesa|bailar|danza|novela|poesia|afici|hobby)/],
  ['autocuidado', /\b(medic|dentista|peluquer|bano|skincare|siesta|masaje|terapia|psicolog|leer|lectura|dormir|manicura|revision medica|analitica|fisio)/],
  ['hogar', /\b(limpi|compra|lavadora|casa|cocinar|ordenar|plancha|recados|super|mudanza|regar|basura|fregar)/],
  ['trabajo', /\b(informe|reunion|trabajo|cliente|presentacion|oficina|jefe|equipo)/],
  ['proyectos', /\b(proyecto|curso|estudi|aprend|escribir|web|app|tesis|examen|idioma|ingles|portfolio|blog|trabajar en|lamina|ilustr|disen|dibuj|tienda|shop|etsy|producto|catalogo|coleccion|fotos de producto|newsletter|instagram|contenido)/],
  // llamadas y correos sin más pistas: suelen ser gestiones
  ['gestiones', /\b(llamar|telefonear|email|correo|mail|escribir a|enviar|mandar|pedir|preguntar|reservar|confirmar)/],
];

const STOP = new Set(['para', 'con', 'que', 'del', 'las', 'los', 'una', 'uno', 'unos', 'unas', 'hacer', 'mi', 'mis', 'por', 'sobre', 'antes', 'esta', 'este']);

/** palabras significativas de un título (para aprender categorías) */
export function keywordsOf(text: string): string[] {
  return [...new Set(norm(text).split(/[^a-z0-9ñ]+/).filter((w) => w.length >= 4 && !STOP.has(w)))];
}

/** recuerda que estas palabras van con esta categoría */
export function learnCategory(learned: Record<string, CategoryId> | undefined, title: string, cat: CategoryId): Record<string, CategoryId> {
  const out = { ...(learned ?? {}) };
  for (const w of keywordsOf(title)) out[w] = cat;
  return out;
}

/** minutos estimados para una tarea, y si parece un proyecto grande (mejor preguntar horas) */
export function estimateMinutes(text: string, cat: CategoryId): { minutes: number; big: boolean } {
  const t = norm(text);
  if (/\b(trabajar en|preparar|disenar|crear|escribir|estudiar|terminar|desarrollar|montar|lanzar|organizar el|organizar la)/.test(t)) return { minutes: 180, big: true };
  if (/\b(llamar|telefonear)/.test(t)) return { minutes: 15, big: false };
  if (/\b(gasto|finanz|presupuesto|declaracion|renta)/.test(t)) return { minutes: 45, big: false };
  if (/\b(revisar|leer|mirar|comparar|buscar)/.test(t)) return { minutes: 30, big: false };
  if (/\b(reclam|follow|seguimiento|email|correo|mail|enviar|mandar|pedir|cancelar|pagar|reservar|confirmar)/.test(t)) return { minutes: 20, big: false };
  const byCat: Record<CategoryId, number> = { gestiones: 20, proyectos: 120, aficiones: 60, familia: 90, pareja: 120, hogar: 45, trabajo: 60, bienestar: 30, autocuidado: 45, social: 90 };
  return { minutes: byCat[cat], big: cat === 'proyectos' };
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** categoría: primero lo que ha aprendido de ti, después palabras clave (o undefined si no hay pistas) */
export function detectCategory(text: string, learned?: Record<string, CategoryId>): CategoryId | undefined {
  if (learned) {
    for (const w of keywordsOf(text)) if (learned[w]) return learned[w];
  }
  const low = norm(text);
  if (KEYWORDS[0][1].test(low)) return 'familia';
  // «Llamar a Laura», «Ver a Marcos»: un nombre propio suele ser una persona
  if (/\b(?:[Ll]lamar|[Ee]scribir|[Vv]isitar|[Vv]er|[Ff]elicitar) a [A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/.test(text)) return 'social';
  for (const [cat, re] of KEYWORDS) if (re.test(low)) return cat;
  return undefined;
}

/** para citas importadas: si no hay pistas, se asume trabajo */
export function guessCategory(text: string): CategoryId {
  return detectCategory(text) ?? 'trabajo';
}

function nextWeekday(today: string, target: number): string {
  const diff = (target - weekday(today) + 7) % 7 || 7;
  return addDays(today, diff);
}

function makeDate(today: string, d: number, m: number, y?: number): string {
  let year = y ?? Number(today.slice(0, 4));
  if (year < 100) year += 2000;
  let key = `${year}-${pad(m)}-${pad(d)}`;
  if (!y && key < today) key = `${year + 1}-${pad(m)}-${pad(d)}`;
  return key;
}

export function parseQuick(input: string, today: string, learned?: Record<string, CategoryId>): Parsed {
  let text = ` ${input} `;
  const n = () => norm(text);
  const out: Parsed = { title: '' };

  const cut = (re: RegExp) => {
    // corta el fragmento encontrado en la versión normalizada (misma longitud que el original)
    const m = re.exec(n());
    if (!m) return null;
    text = text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length);
    return m;
  };

  // veces por semana / cada día
  let m = cut(/\s(\d+|una|un|dos|tres|cuatro|cinco|seis)\s*(?:veces|vez|x)\s*(?:al|por|cada|a|\/)\s*(?:el\s)?mes\b/);
  if (m) {
    out.kind = 'habito';
    out.timesPerMonth = num(m[1]);
  } else if ((m = cut(/\s(?:cada mes|mensual(?:mente)?|todos los meses)\b/))) {
    out.kind = 'habito';
    out.timesPerMonth = 1;
  } else if ((m = cut(/\s(\d+|una|un|dos|tres|cuatro|cinco|seis)\s*(?:veces|vez|x)\s*(?:por|a la|cada|\/)\s*semana\b/))) {
    out.kind = 'habito';
    out.timesPerWeek = num(m[1]);
  } else if ((m = cut(/\s(?:cada dia|todos los dias|a diario)\b/))) {
    out.kind = 'habito';
    out.timesPerWeek = 7;
  } else if ((m = cut(/\s(?:cada semana|semanal(?:mente)?|una vez (?:a la|por) semana)\b/))) {
    out.kind = 'habito';
    out.timesPerWeek = 1;
  }

  // franja: «de 10 a 2», «de 10:00 a 14:00», «desde las 18 hasta las 20»
  m = cut(/\s(?:de|desde)(?: las?)?\s(\d{1,2})(?:[:.](\d{2}))?\s*h?\s(?:a|hasta)(?: las?)?\s(\d{1,2})(?:[:.](\d{2}))?\s*h?(?=\s)/);
  if (m) {
    const evening = /\s(?:de la tarde|de la noche|pm)\b/.test(n());
    cut(/\s(?:de la manana|de la tarde|de la noche|am|pm)\b/);
    let h1 = Number(m[1]);
    let h2 = Number(m[3]);
    if (evening && h1 < 12) h1 += 12;
    else if (h1 < 7) h1 += 12; // «de 5 a 7» suele ser por la tarde
    const start = h1 * 60 + Number(m[2] ?? 0);
    let end = h2 * 60 + Number(m[4] ?? 0);
    while (end <= start && h2 < 24) {
      h2 += 12;
      end = h2 * 60 + Number(m[4] ?? 0);
    }
    if (end > start) {
      out.start = start;
      out.totalMinutes = end - start;
    }
  }

  // duración: 10h, 1h30, 1,5 horas, 45 min
  m = out.totalMinutes ? null : cut(/\s(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|horas?)\s*(?:y\s*)?(?:(\d+)\s*(?:m|min|minutos?)?)?(?=\s)/);
  if (m) {
    out.totalMinutes = Math.round(Number(m[1].replace(',', '.')) * 60) + (m[2] ? Number(m[2]) : 0);
  } else if (!out.totalMinutes && (m = cut(/\s(\d+)\s*(?:m|min|mins|minutos?)(?=\s)/))) {
    out.totalMinutes = Number(m[1]);
  } else if ((m = cut(/\s(?:media hora)(?=\s)/))) {
    out.totalMinutes = 30;
  }

  // hora: "a las 21:30", "a las 9", "21h" no (choca con duración)
  m = out.start != null ? null : cut(/\s(?:a las|a la)\s(\d{1,2})(?::|\.)?(\d{2})?\s*(?:h\b)?/);
  if (m) {
    let h = Number(m[1]);
    const after = n();
    if (h < 12 && /\s(?:de la tarde|de la noche|pm)\b/.test(after)) h += 12;
    cut(/\s(?:de la manana|de la tarde|de la noche|am|pm)\b/);
    out.start = hmToMin(`${h}:${m[2] ?? '00'}`);
  }

  // fecha (con prefijo opcional que indica deadline)
  const prefix = '(?:\\s(antes del?|para el|para|hasta el|deadline|el|este|esta))?';
  // (sin hora, cualquier fecha se toma como deadline; con hora, como el día del evento)
  let date: string | undefined;
  const take = (re: RegExp, f: (mm: RegExpExecArray) => string) => {
    if (date) return;
    const mm = cut(re);
    if (mm) date = f(mm);
  };
  take(new RegExp(`${prefix}\\s(pasado manana)\\b`), () => addDays(today, 2));
  take(new RegExp(`${prefix}\\s(manana)\\b`), () => addDays(today, 1));
  take(new RegExp(`${prefix}\\s(hoy)\\b`), () => today);
  take(new RegExp(`${prefix}\\s(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?\\b`), (mm) =>
    makeDate(today, Number(mm[2]), Number(mm[3]), mm[4] ? Number(mm[4]) : undefined),
  );
  take(new RegExp(`${prefix}\\s(\\d{1,2}) de (${Object.keys(MONTHS).join('|')})\\b`), (mm) =>
    makeDate(today, Number(mm[2]), MONTHS[mm[3]]),
  );
  take(new RegExp(`${prefix}\\s(${Object.keys(DAYS).join('|')})\\b`), (mm) => nextWeekday(today, DAYS[mm[2]]));
  take(new RegExp(`${prefix}\\s(fin de semana|finde)\\b`), () => nextWeekday(today, 0));
  take(/(\s(?:en|dentro de))\s(\d+)\s(dias?|semanas?)\b/, (mm) =>
    addDays(today, Number(mm[2]) * (mm[3].startsWith('semana') ? 7 : 1)),
  );
  if (!date && cut(/\s(?:esta semana)\b/)) date = nextWeekday(addDays(today, -1), 0);

  if (out.kind !== 'habito') {
    if (out.start != null) {
      out.kind = 'evento';
      out.date = date ?? today;
    } else if (date) {
      out.kind = 'flexible';
      out.deadline = date;
    } else if (out.totalMinutes) {
      out.kind = 'flexible';
    }
  }

  out.category = detectCategory(input, learned);

  const title = text.replace(/\s+/g, ' ').replace(/\s([,.;:])/g, '$1').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '').trim();
  out.title = title ? title[0].toUpperCase() + title.slice(1) : '';
  return out;
}
