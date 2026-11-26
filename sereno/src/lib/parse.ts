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
  category?: CategoryId;
}

const DAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};
const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const KEYWORDS: [CategoryId, RegExp][] = [
  ['social', /\b(amig|cena con|comida con|cafe con|quedar|quedada|llamar a|familia|cumple|mama|papa|abuel|herman|pareja|cita con|boda|fiesta)/],
  ['bienestar', /\b(medit|yoga|correr|running|gym|gimnasio|deporte|entren|paseo|pasear|caminar|respir|nadar|piscina|bici|pilates|estirar)/],
  ['autocuidado', /\b(medic|dentista|peluquer|bano|skincare|siesta|masaje|terapia|psicolog|leer|lectura|dormir|manicura|revision)/],
  ['hogar', /\b(limpi|compra|lavadora|casa|cocinar|ordenar|factura|plancha|recados|super|banco|mudanza)/],
  ['trabajo', /\b(informe|reunion|trabajo|cliente|email|correo|presentacion|oficina|jefe)/],
  ['proyectos', /\b(proyecto|curso|estudi|aprend|escribir|web|app|tesis|examen|idioma|ingles|portfolio|blog)/],
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

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

export function parseQuick(input: string, today: string): Parsed {
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
  let m = cut(/\s(\d+)\s*(?:veces|vez|x)\s*(?:por|a la|cada|\/)\s*semana\b/);
  if (m) {
    out.kind = 'habito';
    out.timesPerWeek = Number(m[1]);
  } else if ((m = cut(/\s(?:cada dia|todos los dias|a diario)\b/))) {
    out.kind = 'habito';
    out.timesPerWeek = 7;
  } else if ((m = cut(/\s(?:cada semana|semanal(?:mente)?|una vez (?:a la|por) semana)\b/))) {
    out.kind = 'habito';
    out.timesPerWeek = 1;
  }

  // duración: 10h, 1h30, 1,5 horas, 45 min
  m = cut(/\s(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|horas?)\s*(?:y\s*)?(?:(\d+)\s*(?:m|min|minutos?)?)?(?=\s)/);
  if (m) {
    out.totalMinutes = Math.round(Number(m[1].replace(',', '.')) * 60) + (m[2] ? Number(m[2]) : 0);
  } else if ((m = cut(/\s(\d+)\s*(?:m|min|mins|minutos?)(?=\s)/))) {
    out.totalMinutes = Number(m[1]);
  } else if ((m = cut(/\s(?:media hora)(?=\s)/))) {
    out.totalMinutes = 30;
  }

  // hora: "a las 21:30", "a las 9", "21h" no (choca con duración)
  m = cut(/\s(?:a las|a la)\s(\d{1,2})(?::|\.)?(\d{2})?\s*(?:h\b)?/);
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

  const low = norm(input);
  for (const [cat, re] of KEYWORDS) {
    if (re.test(low)) {
      out.category = cat;
      break;
    }
  }

  const title = text.replace(/\s+/g, ' ').replace(/\s([,.;:])/g, '$1').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '').trim();
  out.title = title ? title[0].toUpperCase() + title.slice(1) : '';
  return out;
}
