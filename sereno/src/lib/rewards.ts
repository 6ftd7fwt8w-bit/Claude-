/** Tienda del bonsái, logros y diario de gratitud. */
import type { AppState, Equipped } from '../types';
import type { Result } from './scheduler';
import { addDays, monthKey, weekStart } from './time';
import { monthStats, streak } from './stats';

export type Slot = 'season' | 'pot' | 'scene' | 'extras';

export interface ShopItem {
  id: string;
  slot: Slot;
  name: string;
  emoji: string;
  price: number;
  description: string;
}

export const SHOP: ShopItem[] = [
  // estaciones: cambian el color de la copa y de las flores
  { id: 'auto', slot: 'season', name: 'Al ritmo del año', emoji: '🗓️', price: 0, description: 'Cambia con la estación real' },
  { id: 'primavera', slot: 'season', name: 'Cerezo en flor', emoji: '🌸', price: 30, description: 'Copa rosada y muchas flores' },
  { id: 'verano', slot: 'season', name: 'Verano', emoji: '☀️', price: 30, description: 'Verde intenso y luminoso' },
  { id: 'otono', slot: 'season', name: 'Arce de otoño', emoji: '🍁', price: 30, description: 'Hojas rojas y doradas' },
  { id: 'invierno', slot: 'season', name: 'Invierno', emoji: '❄️', price: 30, description: 'Nieve suave sobre las ramas' },
  // macetas
  { id: 'terracota', slot: 'pot', name: 'Terracota', emoji: '🟤', price: 0, description: 'La de siempre' },
  { id: 'celadon', slot: 'pot', name: 'Celadón', emoji: '🟢', price: 20, description: 'Cerámica verde agua' },
  { id: 'indigo', slot: 'pot', name: 'Índigo', emoji: '🔵', price: 25, description: 'Esmalte azul noche' },
  { id: 'blanca', slot: 'pot', name: 'Porcelana', emoji: '⚪', price: 20, description: 'Blanca y sencilla' },
  { id: 'dorada', slot: 'pot', name: 'Kintsugi', emoji: '🟡', price: 60, description: 'Reparada con oro: lo roto también es bello' },
  // escenas de fondo
  { id: 'ninguno', slot: 'scene', name: 'Luz suave', emoji: '⬜', price: 0, description: 'Fondo limpio' },
  { id: 'amanecer', slot: 'scene', name: 'Amanecer', emoji: '🌅', price: 40, description: 'Cielo melocotón y sol' },
  { id: 'luna', slot: 'scene', name: 'Noche de luna', emoji: '🌙', price: 40, description: 'Cielo azul y estrellas' },
  { id: 'montana', slot: 'scene', name: 'Montañas', emoji: '⛰️', price: 50, description: 'Montañas en la niebla' },
  // detalles (se pueden llevar varios)
  { id: 'piedra', slot: 'extras', name: 'Piedras zen', emoji: '🪨', price: 15, description: 'Equilibrio' },
  { id: 'farolillo', slot: 'extras', name: 'Farolillo', emoji: '🏮', price: 35, description: 'Una luz cálida' },
  { id: 'mariposas', slot: 'extras', name: 'Mariposas', emoji: '🦋', price: 30, description: 'Revolotean alrededor' },
  { id: 'pajaro', slot: 'extras', name: 'Pajarito', emoji: '🐦', price: 45, description: 'Ha anidado en tu árbol' },
];

export const FREE_ITEMS = SHOP.filter((i) => i.price === 0).map((i) => i.id);

export function owns(state: AppState, id: string): boolean {
  return FREE_ITEMS.includes(id) || state.owned.includes(id);
}

export function buy(state: AppState, id: string): Result {
  const item = SHOP.find((i) => i.id === id);
  if (!item) return { state };
  if (owns(state, id)) return equip(state, id);
  if (state.drops < item.price) {
    return { state, message: `Te faltan ${item.price - state.drops} gotas 💧 Cada cosa que completas te acerca.` };
  }
  const s = { ...state, drops: state.drops - item.price, owned: [...state.owned, id] };
  return { state: equip(s, id).state, message: `${item.emoji} ¡${item.name} es tuyo!` };
}

export function equip(state: AppState, id: string): Result {
  const item = SHOP.find((i) => i.id === id);
  if (!item || !owns(state, id)) return { state };
  const e: Equipped = { ...state.equipped };
  if (item.slot === 'extras') {
    e.extras = e.extras.includes(id) ? e.extras.filter((x) => x !== id) : [...e.extras, id];
  } else {
    e[item.slot] = id;
  }
  return { state: { ...state, equipped: e } };
}

/** estación a mostrar: la elegida o la real */
export function seasonFor(equipped: Equipped, date: string): string {
  if (equipped.season !== 'auto') return equipped.season;
  const m = Number(date.slice(5, 7));
  if (m >= 3 && m <= 5) return 'primavera';
  if (m >= 6 && m <= 8) return 'verano';
  if (m >= 9 && m <= 11) return 'otono';
  return 'invierno';
}

// ---------------------------------------------------------------- logros

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  description: string;
  reward: number;
  check: (s: AppState, today: string) => boolean;
}

function doneOf(s: AppState, cat?: string) {
  const taskCat = new Map(s.tasks.map((t) => [t.id, t.category]));
  return s.sessions.filter((x) => x.status === 'done' && (!cat || taskCat.get(x.taskId) === cat));
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'primera-hoja', emoji: '🌱', name: 'Primera hoja', description: 'Completa tu primera cosa', reward: 5, check: (s) => doneOf(s).length >= 1 },
  { id: 'dia-redondo', emoji: '🌸', name: 'Día redondo', description: 'Completa todo lo de un día', reward: 5, check: (s, t) => monthStats(s, monthKey(t)).roundDays >= 1 },
  { id: 'escucharte', emoji: '💛', name: 'Te escuchas', description: 'Dile a Sereno que tienes poca energía', reward: 5, check: (s) => Object.values(s.energy).some((e) => e <= 40) },
  { id: 'racha-7', emoji: '🔥', name: 'Una semana cuidándote', description: '7 días seguidos haciendo algo', reward: 15, check: (s, t) => streak(s, t) >= 7 },
  { id: 'objetivo', emoji: '🏆', name: 'Objetivo cumplido', description: 'Termina todas las horas de un objetivo', reward: 15, check: (s) => s.tasks.some((t) => t.kind === 'flexible' && doneOf(s).filter((x) => x.taskId === t.id).reduce((a, x) => a + x.duration, 0) >= t.totalMinutes) },
  { id: 'social-5', emoji: '🫶', name: 'Buena compañía', description: '5 ratos de vida social', reward: 10, check: (s) => doneOf(s, 'social').length >= 5 },
  { id: 'bienestar-10', emoji: '🧘', name: 'Calma constante', description: '10 ratos de bienestar', reward: 10, check: (s) => doneOf(s, 'bienestar').length >= 10 },
  {
    id: 'equilibrio',
    emoji: '⚖️',
    name: 'Semana equilibrada',
    description: 'En una misma semana, cosas de 4 áreas distintas',
    reward: 15,
    check: (s) => {
      const taskCat = new Map(s.tasks.map((t) => [t.id, t.category]));
      const weeks = new Map<string, Set<string>>();
      for (const x of doneOf(s)) {
        const w = weekStart(x.date);
        weeks.set(w, (weeks.get(w) ?? new Set()).add(taskCat.get(x.taskId) ?? ''));
      }
      return [...weeks.values()].some((cats) => cats.size >= 4);
    },
  },
  { id: 'diario-5', emoji: '📖', name: 'Corazón agradecido', description: 'Escribe 5 días en tu diario', reward: 10, check: (s) => Object.keys(s.journal).length >= 5 },
  { id: 'cien-hojas', emoji: '🌳', name: 'Bonsái frondoso', description: '100 hojas en total', reward: 30, check: (s) => doneOf(s).length >= 100 },
];

/** Marca como vistos los logros nuevos, da su premio y devuelve cuáles son. */
export function claimAchievements(state: AppState, today: string): { state: AppState; fresh: Achievement[] } {
  const fresh = ACHIEVEMENTS.filter((a) => !state.seenAchievements.includes(a.id) && a.check(state, today));
  if (!fresh.length) return { state, fresh };
  return {
    state: {
      ...state,
      seenAchievements: [...state.seenAchievements, ...fresh.map((a) => a.id)],
      drops: state.drops + fresh.reduce((a, x) => a + x.reward, 0),
    },
    fresh,
  };
}

// ---------------------------------------------------------------- diario

export function writeJournal(state: AppState, date: string, text: string): Result {
  const first = !state.journal[date];
  const journal = { ...state.journal };
  if (text.trim()) journal[date] = text.trim();
  else delete journal[date];
  return {
    state: { ...state, journal, drops: state.drops + (first && text.trim() ? 2 : 0) },
    message: first && text.trim() ? 'Guardado en tu diario 📖 +2 gotas' : 'Diario actualizado 📖',
  };
}

export function recentJournal(state: AppState, today: string, n = 5): { date: string; text: string }[] {
  return Object.entries(state.journal)
    .filter(([d]) => d <= today && d >= addDays(today, -60))
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, n)
    .map(([date, text]) => ({ date, text }));
}
