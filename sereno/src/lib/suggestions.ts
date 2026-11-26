/** Sugerencias para empezar rápido. Son solo ideas: la persona elige y puede añadir las suyas. */
import type { CategoryId, TimeOfDay } from '../types';

export interface RecurringSuggestion {
  title: string;
  icon: string;
  category: CategoryId;
  minutes: number;
  times: number; // veces por semana (7 = cada día)
  timeOfDay: TimeOfDay;
  /** días concretos (Date.getDay); si hay, mandan sobre `times` */
  days?: number[];
  /** veces al mes; si hay, manda sobre `times` */
  perMonth?: number;
  /** hora fija (p. ej. llamar a mamá a las 20:00) */
  fixedStart?: number;
  /** a partir de una hora */
  after?: number;
  /** entre semana / fines de semana */
  dayType?: 'any' | 'weekdays' | 'weekends';
}

/** Lo de cada día: ocupa tiempo real aunque no sea un "objetivo" */
export const ROUTINE_SUGGESTIONS: RecurringSuggestion[] = [
  { title: 'Ducha', icon: '🚿', category: 'autocuidado', minutes: 15, times: 7, timeOfDay: 'noche' },
  { title: 'Hacer la compra', icon: '🛒', category: 'hogar', minutes: 60, times: 1, timeOfDay: 'cualquiera' },
  { title: 'Cocinar', icon: '🍳', category: 'hogar', minutes: 45, times: 5, timeOfDay: 'tarde' },
  { title: 'Poner lavadora', icon: '🧺', category: 'hogar', minutes: 20, times: 2, timeOfDay: 'cualquiera' },
  { title: 'Limpiar la casa', icon: '🧹', category: 'hogar', minutes: 60, times: 1, timeOfDay: 'cualquiera' },
  { title: 'Fregar y recoger', icon: '🍽️', category: 'hogar', minutes: 15, times: 7, timeOfDay: 'noche' },
  { title: 'Pasear al perro', icon: '🐕', category: 'hogar', minutes: 30, times: 7, timeOfDay: 'tarde' },
  { title: 'Regar las plantas', icon: '🪴', category: 'hogar', minutes: 10, times: 2, timeOfDay: 'manana' },
  { title: 'Preparar la comida de mañana', icon: '🥡', category: 'hogar', minutes: 20, times: 4, timeOfDay: 'noche' },
  { title: 'Recados y papeles', icon: '📮', category: 'hogar', minutes: 30, times: 1, timeOfDay: 'cualquiera' },
];

/** Para cuidarte y no olvidar a la gente */
export const HABIT_SUGGESTIONS: RecurringSuggestion[] = [
  { title: 'Meditar', icon: '🧘', category: 'bienestar', minutes: 10, times: 5, timeOfDay: 'cualquiera' },
  { title: 'Moverme / ejercicio', icon: '🏃', category: 'bienestar', minutes: 30, times: 3, timeOfDay: 'cualquiera' },
  { title: 'Estirar o abdominales', icon: '🤸', category: 'bienestar', minutes: 10, times: 5, timeOfDay: 'manana' },
  { title: 'Paseo al aire libre', icon: '🌳', category: 'bienestar', minutes: 30, times: 3, timeOfDay: 'cualquiera' },
  { title: 'Quedar con amigos o familia', icon: '🥂', category: 'social', minutes: 90, times: 1, timeOfDay: 'tarde' },
  { title: 'Llamar a alguien que quiero', icon: '📞', category: 'social', minutes: 20, times: 2, timeOfDay: 'tarde' },
  { title: 'Leer por placer', icon: '📖', category: 'autocuidado', minutes: 30, times: 3, timeOfDay: 'noche' },
  { title: 'Tiempo para mí', icon: '🛁', category: 'autocuidado', minutes: 30, times: 1, timeOfDay: 'noche' },
];

/** Ejemplos para que se entienda cómo escribir un proyecto (se rellenan en el campo, no se añaden solos) */
export const PROJECT_EXAMPLES = [
  'Proyecto personal 10h antes del 31/12',
  'Estudiar inglés 20h en 8 semanas',
  'Ordenar el trastero 3h esta semana',
  'Preparar el viaje 4h antes del 15/1',
  'Leer el libro del club 6h en 3 semanas',
];

export const ROUTINE_ICONS = ['🚿', '🛒', '🍳', '🧺', '🧹', '🍽️', '🐕', '🪴', '🥡', '📮', '👶', '🚗', '💊', '🐈', '🧴', '🛏️'];

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  manana: '🌅 Mañana',
  tarde: '🌤️ Tarde',
  noche: '🌙 Noche',
  cualquiera: '🕊️ Cuando sea',
};

const SHORT_DAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export function timesLabel(times: number, days?: number[], perMonth?: number): string {
  if (perMonth) return `${perMonth}×/mes`;
  if (days?.length) {
    if (days.length === 7) return 'cada día';
    return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => SHORT_DAYS[d]).join(' ');
  }
  return times >= 7 ? 'cada día' : `${times}×/semana`;
}

/** Aficiones y cosas para ti, para llenar un hueco libre */
export const HOBBY_SUGGESTIONS: { title: string; icon: string; category: CategoryId; minutes: number }[] = [
  { title: 'Jugar a videojuegos', icon: '🎮', category: 'aficiones', minutes: 60 },
  { title: 'Tocar un instrumento', icon: '🎸', category: 'aficiones', minutes: 30 },
  { title: 'Leer', icon: '📚', category: 'autocuidado', minutes: 30 },
  { title: 'Dibujar o pintar', icon: '🎨', category: 'aficiones', minutes: 45 },
  { title: 'Manualidades', icon: '🧶', category: 'aficiones', minutes: 45 },
  { title: 'Ver una serie', icon: '🎬', category: 'aficiones', minutes: 45 },
  { title: 'Paseo', icon: '🌳', category: 'bienestar', minutes: 30 },
  { title: 'Meditar', icon: '🧘', category: 'bienestar', minutes: 10 },
  { title: 'Llamar a alguien', icon: '📞', category: 'social', minutes: 20 },
  { title: 'Cocinar algo rico', icon: '🍲', category: 'aficiones', minutes: 60 },
];
