export type CategoryId = 'bienestar' | 'familia' | 'pareja' | 'social' | 'proyectos' | 'aficiones' | 'autocuidado' | 'hogar' | 'gestiones' | 'trabajo';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'bienestar', label: 'Bienestar', emoji: '🧘', color: '#6FAF9A' },
  { id: 'familia', label: 'Familia', emoji: '🏠', color: '#D9708F' },
  { id: 'pareja', label: 'Amor y pareja', emoji: '❤️', color: '#C0577A' },
  { id: 'social', label: 'Amigos y vida social', emoji: '💛', color: '#E59A8C' },
  { id: 'proyectos', label: 'Proyectos', emoji: '✨', color: '#7E98D1' },
  { id: 'aficiones', label: 'Aficiones', emoji: '🎨', color: '#E8A33D' },
  { id: 'autocuidado', label: 'Cuidado personal', emoji: '🛁', color: '#B996D0' },
  { id: 'hogar', label: 'Hogar', emoji: '🏡', color: '#9DBB78' },
  { id: 'gestiones', label: 'Gestiones y papeles', emoji: '📋', color: '#7FAFC2' },
  { id: 'trabajo', label: 'Trabajo', emoji: '💼', color: '#B5713F' },
];

export function catById(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

/** cada proyecto y afición tiene su propio color, para distinguirlos en la agenda */
export const TASK_COLORS = ['#7E98D1', '#E07A8A', '#4FB3A9', '#9B8CE0', '#D49A4A', '#5FA8D3', '#C77DBA', '#6C9E5B', '#E8A33D', '#8A9FB0'];

export function taskColor(t: Pick<Task, 'category' | 'color'> | undefined): string {
  return t?.color ?? catById(t?.category ?? 'bienestar').color;
}

/** Tarea guardada en favoritos */
export interface Favorite {
  title: string;
  category: CategoryId;
  minutes: number;
  mode: 'fijo' | 'hueco';
  repeat: 'no' | 'semana' | 'mes';
  times: number;
  start?: number;
}

/** Áreas de la vida que se pueden marcar como valores */
export type AreaId = 'familia' | 'pareja' | 'social' | 'bienestar' | 'autocuidado' | 'proyectos' | 'aficiones';

export interface ValueGoal {
  area: AreaId;
  hours: number;
  per: 'semana' | 'mes';
}

/** paso de un proyecto (lista de cosas por hacer, en orden) */
export interface Step {
  id: string;
  title: string;
  minutes?: number;
  done?: boolean;
}

/** qué días puede ir una tarea */
export type DayType = 'any' | 'weekdays' | 'weekends';

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
  /** tarea cotidiana (ducha, compra, cocinar…): se muestra como checklist rápido */
  routine?: boolean;
  /** veces al mes (p. ej. quedar con amigas 2 veces al mes); si lo hay, manda sobre timesPerWeek */
  timesPerMonth?: number;
  /** días concretos de la semana (Date.getDay); si los hay, se hace esos días */
  days?: number[];
  /** momento del día preferido (hábitos y cotidianas) */
  timeOfDay?: TimeOfDay;
  /** icono propio (cotidianas) */
  icon?: string;
  /** a una hora fija (p. ej. llamar a mamá a las 20:00) */
  fixedStart?: number;
  /** a partir de una hora (p. ej. no antes de las 17:00) */
  after?: number;
  /** entre semana, fines de semana o cualquier día */
  dayType?: DayType;
  /** notas libres de la tarea o proyecto */
  notes?: string;
  /** lista de pasos de un proyecto (se sugieren por orden en cada sesión) */
  steps?: Step[];
  /** color propio (proyectos y aficiones) */
  color?: string;
  /** permitir fines de semana aunque en general no trabajes en proyectos el finde */
  allowWeekend?: boolean;
  /** se muestra como proyecto (con su página) aunque sea corto; false = tarea suelta */
  isProject?: boolean;
  /** bloque creado automáticamente para cumplir un valor (p. ej. tiempo en familia) */
  valueBlock?: AreaId;
  /** de dónde viene: creada en Sereno, importada de un .ics o del calendario del iPhone */
  source?: 'ics' | 'ios';
  externalId?: string;
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
  /** colocada a mano: el planificador no la mueve */
  pinned?: boolean;
  completedAt?: string;
  /** nota para este día concreto (qué quiero hacer hoy de este proyecto) */
  note?: string;
  /** tarea de trabajo colocada dentro del horario laboral (no cuenta como tiempo libre ocupado) */
  inWork?: boolean;
}

export type Chronotype = 'manana' | 'neutro' | 'noche';

export type TimeOfDay = 'manana' | 'tarde' | 'noche' | 'cualquiera';

/** pausa durante la jornada (p. ej. teletrabajo: 11:00 durante 15 min) */
export interface WorkBreak {
  start: number;
  duration: number;
}

/** Rutina distinta solo un día concreto */
export interface DayOverride {
  lunch?: number;
  lunchDuration?: number;
  dinner?: number;
  dinnerDuration?: number;
  workStart?: number;
  workEnd?: number;
  /** ese día no se trabaja */
  noWork?: boolean;
}

export interface WorkHours {
  start: number;
  end: number;
}

export interface Profile {
  name: string;
  wake: number;
  morningRoutine: number;
  works: boolean;
  workDays: number[]; // Date.getDay(): 0 = domingo
  workStart: number;
  workEnd: number;
  /** horario distinto para algún día (clave: Date.getDay()) */
  workByDay?: Record<number, WorkHours>;
  commute: number;
  /** días de teletrabajo (sin desplazamiento) */
  remoteDays: number[];
  /** pausas habituales durante la jornada, para cosas cortas */
  breaks: WorkBreak[];
  /** pausas de un día concreto (las elige en el check-in de la mañana) */
  breaksOn?: Record<string, WorkBreak[]>;
  /** cambios de rutina solo para un día (comer antes, trabajar más…) */
  dayOverrides?: Record<string, DayOverride>;
  /** cuándo se concentra mejor: ahí van los proyectos */
  chronotype: Chronotype;
  notifications: boolean;
  lunch: number;
  lunchDuration: number;
  dinner: number;
  dinnerDuration: number;
  bed: number;
  relaxMinutes: number;
  defaultEnergy: number;
  gentleWeekends: boolean;
  /** ¿proyectos y trabajo el fin de semana? sí, un poco, no */
  weekendFocus: 'si' | 'poco' | 'no' | 'franja';
  /** si weekendFocus = 'franja': cuándo sí (p. ej. domingo por la tarde) */
  weekendSlots?: { day: 0 | 6; part: 'manana' | 'tarde' | 'noche' }[];
  /** planificar también las tareas del trabajo (autónomos, artistas…) dentro del horario laboral */
  planWork?: boolean;
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
  /** gotas de agua: los puntos del juego (saldo actual) */
  drops: number;
  lastOpen?: string;
  /** recompensas compradas con gotas y las que están puestas */
  owned: string[];
  equipped: Equipped;
  /** diario de gratitud: una línea por día */
  journal: Record<string, string>;
  /** plantillas guardadas para añadir de un toque */
  favorites?: Favorite[];
  /** valores: cuánto tiempo quiere dedicar a cada área de su vida */
  values?: ValueGoal[];
  /** visión de vida elegida en la encuesta */
  vision?: string;
  /** palabras que la persona ha asociado a una categoría (aprende de sus correcciones) */
  learned?: Record<string, CategoryId>;
  /** logros ya celebrados */
  seenAchievements: string[];
  /** resumen de cada día pasado (para el informe personal) */
  history: Record<string, DayRecord>;
}

/** Cómo fue un día: se guarda al pasar al siguiente, porque lo no hecho se recoloca */
export interface DayRecord {
  energy: number;
  planned: number;
  done: number;
  /** sesiones de foco (proyectos y trabajo) */
  focusPlanned: number;
  focusDone: number;
  /** sesiones de foco hechas por la mañana (antes de las 14:00) y por la tarde */
  focusDoneAm: number;
  focusDonePm: number;
  focusPlannedAm: number;
  focusPlannedPm: number;
  /** minutos de recarga hechos (bienestar, cuidado personal, vida social) */
  rechargeMinutes: number;
}

export interface Equipped {
  season: string;
  pot: string;
  scene: string;
  extras: string[];
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
  remoteDays: [],
  breaks: [],
  chronotype: 'neutro',
  notifications: true,
  lunch: 14 * 60,
  lunchDuration: 60,
  dinner: 21 * 60,
  dinnerDuration: 60,
  bed: 23 * 60 + 30,
  relaxMinutes: 60,
  defaultEnergy: 60,
  gentleWeekends: true,
  weekendFocus: 'poco',
  createdAt: '',
};

export function emptyState(): AppState {
  return {
    version: 1,
    profile: null,
    tasks: [],
    sessions: [],
    energy: {},
    unplaced: {},
    drops: 0,
    owned: [],
    equipped: { season: 'auto', pot: 'terracota', scene: 'ninguno', extras: [] },
    journal: {},
    seenAchievements: [],
    history: {},
  };
}
