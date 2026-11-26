export type CategoryId = 'bienestar' | 'social' | 'proyectos' | 'autocuidado' | 'hogar' | 'trabajo';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'bienestar', label: 'Bienestar', emoji: '🧘', color: '#6FAF9A' },
  { id: 'social', label: 'Vida social', emoji: '💛', color: '#E59A8C' },
  { id: 'proyectos', label: 'Proyectos', emoji: '✨', color: '#7E98D1' },
  { id: 'autocuidado', label: 'Cuidado personal', emoji: '🛁', color: '#B996D0' },
  { id: 'hogar', label: 'Hogar', emoji: '🏡', color: '#9DBB78' },
  { id: 'trabajo', label: 'Trabajo', emoji: '💼', color: '#D3AC6A' },
];

export function catById(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

/**
 * flexible: tiene una duración total y (opcional) un deadline; la app lo trocea y lo coloca.
 * evento:   tiene fecha y hora concretas (una cena, el dentista...).
 * habito:   se repite X veces por semana (meditar, ver a amigos...).
 */
export type TaskKind = 'flexible' | 'evento' | 'habito';

export interface Task {
  id: string;
  title: string;
  category: CategoryId;
  kind: TaskKind;
  /** flexible: minutos totales · evento: duración · hábito: duración de cada vez */
  totalMinutes: number;
  /** flexible: duración de cada sesión */
  sessionMinutes: number;
  deadline?: string;
  date?: string;
  start?: number;
  timesPerWeek?: number;
  createdAt: string;
  archived?: boolean;
}

export type SessionStatus = 'planned' | 'done';

export interface Session {
  id: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  start: number; // minutos desde las 00:00
  duration: number; // minutos
  status: SessionStatus;
  fixed?: boolean;
  completedAt?: string;
}

export interface Profile {
  name: string;
  wake: number;
  morningRoutine: number;
  works: boolean;
  workDays: number[]; // Date.getDay(): 0 = domingo
  workStart: number;
  workEnd: number;
  commute: number;
  lunch: number;
  lunchDuration: number;
  dinner: number;
  dinnerDuration: number;
  bed: number;
  relaxMinutes: number;
  defaultEnergy: number;
  gentleWeekends: boolean;
  createdAt: string;
}

export interface AppState {
  version: 1;
  profile: Profile | null;
  tasks: Task[];
  sessions: Session[];
  /** energía (0-100) declarada por día */
  energy: Record<string, number>;
  /** minutos que no cupieron antes del deadline, por tarea */
  unplaced: Record<string, number>;
  /** gotas de agua: los puntos del juego */
  drops: number;
  lastOpen?: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  wake: 7 * 60,
  morningRoutine: 45,
  works: true,
  workDays: [1, 2, 3, 4, 5],
  workStart: 9 * 60,
  workEnd: 18 * 60,
  commute: 30,
  lunch: 14 * 60,
  lunchDuration: 60,
  dinner: 21 * 60,
  dinnerDuration: 60,
  bed: 23 * 60 + 30,
  relaxMinutes: 60,
  defaultEnergy: 60,
  gentleWeekends: true,
  createdAt: '',
};

export function emptyState(): AppState {
  return { version: 1, profile: null, tasks: [], sessions: [], energy: {}, unplaced: {}, drops: 0 };
}
