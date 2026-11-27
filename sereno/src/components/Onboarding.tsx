import { useState, type CSSProperties } from 'react';
import { DEFAULT_PROFILE, catById, type Chronotype, type DayType, type Profile, type ValueGoal, type WorkHours } from '../types';
import { VISIONS, goalsFromVision, weeklyMinutes } from '../lib/values';
import type { PaletteId } from '../lib/palettes';
import { PalettePicker } from './PalettePicker';
import { ValuesEditor } from './ValuesEditor';
import type { NewTaskInput } from '../lib/scheduler';
import { parseQuick } from '../lib/parse';
import {
  AFICION_SUGGESTIONS,
  HABIT_SUGGESTIONS,
  PROJECT_EXAMPLES,
  ROUTINE_SUGGESTIONS,
  TIME_OF_DAY_LABEL,
  timesLabel,
  spreadHobbies,
  type RecurringSuggestion,
} from '../lib/suggestions';
import { fmtDuration, fmtShort, todayKey } from '../lib/time';
import { BreaksEditor } from './BreaksEditor';
import { RecurringEditor } from './RecurringEditor';
import { PlanAnalysisView } from './PlanAnalysis';
import { RECHARGE_TASK, analyzePlan } from '../lib/mind';
import { DayPicker, DurationPicker, NumberChips, TimeInput } from './ui';
import { CatIcon, Icon, type IconName } from './Icons';

const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function ProfileFields({ p, set, step }: { p: Profile; set: (patch: Partial<Profile>) => void; step: string }) {
  if (step === 'despertar')
    return (
      <>
        <TimeInput label="¿A qué hora te despiertas?" value={p.wake} onChange={(wake) => set({ wake })} />
        <div className="field">
          <span>¿Cuánto tardas en arrancar? (ducha, desayuno…)</span>
          <NumberChips value={p.morningRoutine} options={[15, 30, 45, 60, 90]} onChange={(morningRoutine) => set({ morningRoutine })} fmt={fmtDuration} />
        </div>
        <div className="field">
          <span>¿Cuándo te concentras mejor?</span>
          <div className="chips">
            {(
              [
                ['manana', '◐ Por la mañana'],
                ['neutro', '◑ Me da igual'],
                ['noche', '☾ Por la tarde-noche'],
              ] as [Chronotype, string][]
            ).map(([v, label]) => (
              <button key={v} type="button" className={`chip ${p.chronotype === v ? 'on' : ''}`} onClick={() => set({ chronotype: v })}>
                {label}
              </button>
            ))}
          </div>
          <small className="muted">Ahí colocaré tus proyectos, que piden más foco.</small>
        </div>
      </>
    );
  if (step === 'trabajo')
    return (
      <>
        <div className="field">
          <span>¿Trabajas o estudias con horario fijo?</span>
          <div className="chips">
            <button type="button" className={`chip ${p.works ? 'on' : ''}`} onClick={() => set({ works: true })}>
              Sí
            </button>
            <button type="button" className={`chip ${!p.works ? 'on' : ''}`} onClick={() => set({ works: false })}>
              No
            </button>
          </div>
        </div>
        {p.works && (
          <>
            <div className="field">
              <span>¿Qué días?</span>
              <DayPicker value={p.workDays} onChange={(workDays) => set({ workDays, remoteDays: (p.remoteDays ?? []).filter((d) => workDays.includes(d)) })} />
            </div>
            <div className="row2">
              <TimeInput label="Empiezo" value={p.workStart} onChange={(workStart) => set({ workStart })} />
              <TimeInput label="Termino" value={p.workEnd} onChange={(workEnd) => set({ workEnd })} />
            </div>
            <label className="toggle">
              <input type="checkbox" checked={!!p.workByDay} onChange={(e) => set({ workByDay: e.target.checked ? {} : undefined })} />
              <span>Algún día tengo otro horario (intensivo, media jornada…)</span>
            </label>
            {p.workByDay && (
              <div className="per-day">
                {DAY_VALUES.filter((d) => p.workDays.includes(d)).map((d) => {
                  const h = p.workByDay?.[d] ?? { start: p.workStart, end: p.workEnd };
                  const setDay = (patch: Partial<WorkHours>) => set({ workByDay: { ...p.workByDay, [d]: { ...h, ...patch } } });
                  return (
                    <div key={d} className="per-day-row">
                      <strong>{DAY_NAMES[d]}</strong>
                      <TimeInput label="" value={h.start} onChange={(start) => setDay({ start })} />
                      <TimeInput label="" value={h.end} onChange={(end) => setDay({ end })} />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="field">
              <span>⌂ ¿Qué días teletrabajas?</span>
              <DayPicker value={p.remoteDays ?? []} options={p.workDays} onChange={(remoteDays) => set({ remoteDays })} />
              <small className="muted">Esos días no cuento desplazamiento.</small>
            </div>
            <label className="toggle work-plan">
              <input type="checkbox" checked={!!p.planWork} onChange={(e) => set({ planWork: e.target.checked })} />
              <span>
                <strong>Quiero planificar también las tareas de mi trabajo</strong>
                <small className="muted">Ideal si eres autónomo, artista o llevas tu propio proyecto: las coloco dentro de tu horario laboral, en color propio.</small>
              </span>
            </label>
            {(p.remoteDays ?? []).length < p.workDays.length && (
              <div className="field">
                <span>→ Desplazamiento los días de oficina (cada trayecto)</span>
                <NumberChips value={p.commute} options={[0, 15, 30, 45, 60]} onChange={(commute) => set({ commute })} fmt={(v) => (v ? fmtDuration(v) : 'Nada')} />
              </div>
            )}
          </>
        )}
      </>
    );
  if (step === 'pausas')
    return (
      <>
        <p className="muted">
          Si puedes parar un ratito mientras trabajas (por ejemplo en teletrabajo), aprovecharé esas pausas para cosas
          cortas: meditar, estirar, unos abdominales, poner una lavadora…
        </p>
        <div className="field">
          <span>Tus pausas habituales</span>
          <BreaksEditor value={p.breaks ?? []} onChange={(breaks) => set({ breaks })} />
          <small className="muted">Cada mañana podrás decirme si ese día las tienes o no.</small>
        </div>
      </>
    );
  if (step === 'comidas')
    return (
      <>
        <div className="row2">
          <TimeInput label="Suelo comer a las" value={p.lunch} onChange={(lunch) => set({ lunch })} />
          <TimeInput label="Suelo cenar a las" value={p.dinner} onChange={(dinner) => set({ dinner })} />
        </div>
        <div className="field">
          <span>¿Cuánto tiempo te reservo para cada comida?</span>
          <NumberChips value={p.dinnerDuration} options={[30, 45, 60, 90]} onChange={(v) => set({ dinnerDuration: v, lunchDuration: v })} fmt={fmtDuration} />
        </div>
      </>
    );
  if (step === 'noche')
    return (
      <>
        <TimeInput label="¿A qué hora te acuestas?" value={p.bed} onChange={(bed) => set({ bed })} />
        <div className="field">
          <span>¿Cuánto tiempo necesitas para desconectar antes de dormir?</span>
          <DurationPicker value={p.relaxMinutes} onChange={(relaxMinutes) => set({ relaxMinutes })} options={[30, 45, 60, 90, 120, 150, 180, 240]} />
          <small className="muted">Ese tiempo queda protegido: nunca te pondré tareas ahí ☾</small>
        </div>
        <WeekendFocusField p={p} set={set} />
      </>
    );
  return null;
}


/** ¿Proyectos en fin de semana? (encuesta y ajustes) */
export function WeekendFocusField({ p, set }: { p: Profile; set: (patch: Partial<Profile>) => void }) {
  return (
        <div className="field">
          <span>¿Trabajas en tus proyectos los fines de semana?</span>
          <div className="chips">
            {(
              [
                ['si', 'Sí, como cualquier día'],
                ['poco', 'Un poco'],
                ['franja', '◷ Solo en un horario concreto'],
                ['no', 'No, los fines de semana son para mí'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" className={`chip ${(p.weekendFocus ?? 'poco') === v ? 'on' : ''}`} onClick={() => set({ weekendFocus: v, gentleWeekends: v !== 'si' })}>
                {l}
              </button>
            ))}
          </div>
          {p.weekendFocus === 'franja' && (
            <div className="slot-grid">
              {(
                [
                  [6, 'manana', 'Sábado mañana'],
                  [6, 'tarde', 'Sábado tarde'],
                  [0, 'manana', 'Domingo mañana'],
                  [0, 'tarde', 'Domingo tarde'],
                ] as const
              ).map(([day, part, label]) => {
                const on = (p.weekendSlots ?? []).some((s) => s.day === day && s.part === part);
                return (
                  <button
                    key={label}
                    type="button"
                    className={`chip ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    onClick={() =>
                      set({
                        weekendSlots: on
                          ? (p.weekendSlots ?? []).filter((s) => !(s.day === day && s.part === part))
                          : [...(p.weekendSlots ?? []), { day, part }],
                      })
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          <small className="muted">Además, puedes marcar cualquier cosa (quedar con amigas, la compra…) como «solo fines de semana».</small>
        </div>
  );
}

/** Cuadrícula de sugerencias seleccionables + "añadir la mía" */
export function SuggestionTiles({
  items,
  selected,
  onToggle,
  onEdit,
  onAddCustom,
  placeholder,
}: {
  items: RecurringSuggestion[];
  selected: string[];
  onToggle: (title: string) => void;
  onEdit: (title: string) => void;
  onAddCustom: (text: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    onAddCustom(text);
    setText('');
  };
  return (
    <>
      <div className="tiles">
        {items.map((s) => {
          const on = selected.includes(s.title);
          return (
            <div key={s.title} className="tile-wrap" style={{ '--cat': catById(s.category).color } as CSSProperties}>
              <button type="button" className={`tile ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onToggle(s.title)}>
                <span className="tile-check">{on ? '✓' : ''}</span>
                <CatIcon cat={s.category} title={s.title} size={38} />
                <span className="tile-title">{s.title}</span>
                <span className="tile-meta">
                  {fmtDuration(s.minutes)} · {timesLabel(s.times, s.days, s.perMonth)}
                  {s.timeOfDay !== 'cualquiera' && ` · ${TIME_OF_DAY_LABEL[s.timeOfDay].toLowerCase()}`}
                </span>
                {on && <span className="tile-spacer" />}
              </button>
              {on && (
                <button type="button" className="tile-edit" onClick={() => onEdit(s.title)}>
                  ✎ Ajustar
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="add-own">
        <input value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button type="button" className="btn soft" disabled={!text.trim()} onClick={add}>
          Añadir
        </button>
      </div>
    </>
  );
}

/** Convierte "Yoga 45 min 2 veces por semana" en una sugerencia propia */
export function customRecurring(text: string, fallback: Partial<RecurringSuggestion>): RecurringSuggestion {
  const q = parseQuick(text, todayKey());
  return {
    title: q.title || text.trim(),
    icon: fallback.icon ?? catById(q.category ?? fallback.category ?? 'bienestar').emoji,
    category: q.category ?? fallback.category ?? 'bienestar',
    minutes: q.totalMinutes ?? fallback.minutes ?? 30,
    times: q.timesPerWeek ?? fallback.times ?? 3,
    perMonth: q.timesPerMonth,
    timeOfDay: fallback.timeOfDay ?? 'cualquiera',
  };
}

export function recurringToTask(s: RecurringSuggestion, routine: boolean): NewTaskInput {
  return {
    title: s.title,
    category: s.category,
    kind: 'habito',
    totalMinutes: s.minutes,
    timesPerWeek: s.days?.length ? s.days.length : s.times,
    timesPerMonth: s.perMonth,
    fixedStart: s.fixedStart,
    after: s.after,
    dayType: s.dayType,
    routine,
    timeOfDay: s.timeOfDay,
    icon: s.icon,
    days: s.days,
  };
}

/** Paso de proyectos: escribe en lenguaje natural y ves lo que se entiende */
function ProjectsStep({ projects, setProjects }: { projects: NewTaskInput[]; setProjects: (p: NewTaskInput[]) => void }) {
  const [text, setText] = useState('');
  const [hours, setHours] = useState<number | null>(null);
  const today = todayKey();
  const q = parseQuick(text, today);
  const minutes = q.totalMinutes ?? (hours ?? 5) * 60;
  const add = () => {
    if (!q.title || !minutes) return;
    setProjects([
      ...projects,
      { title: q.title, category: q.category ?? 'proyectos', kind: 'flexible', totalMinutes: minutes, sessionMinutes: Math.min(60, minutes), deadline: q.deadline },
    ]);
    setText('');
    setHours(null);
  };
  return (
    <>
      <p className="muted">
        Escríbelo como lo dirías: cuánto tiempo crees que necesitas y para cuándo. Yo lo reparto en tus huecos.
      </p>
      <div className="add-own">
        <input autoFocus value={text} placeholder="Ej.: Proyecto personal 10h antes del 31/12" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      </div>
      {text.trim() && (
        <div className="parsed">
          <span className="tag">{q.title || '…'}</span>
          {q.totalMinutes ? <span className="tag">◷ {fmtDuration(q.totalMinutes)}</span> : null}
          {q.deadline ? <span className="tag">◇ antes del {fmtShort(q.deadline)}</span> : <span className="tag soft">sin fecha límite</span>}
        </div>
      )}
      {text.trim() && !q.totalMinutes && (
        <div className="field">
          <span>¿Cuántas horas crees que necesitas en total?</span>
          <DurationPicker value={(hours ?? 0) * 60 || 300} onChange={(m) => setHours(m / 60)} options={[120, 300, 600, 1200, 2400, 4800, 6000]} />
        </div>
      )}
      <button className="btn primary wide" disabled={!q.title || !minutes} onClick={add}>
        Añadir proyecto
      </button>
      {!text && (
        <div className="examples">
          <span className="muted small">Ideas para inspirarte:</span>
          <div className="chips">
            {PROJECT_EXAMPLES.map((e) => (
              <button key={e} type="button" className="chip" onClick={() => setText(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
      {projects.length > 0 && (
        <div className="project-list">
          {projects.map((pr, i) => (
            <div key={i} className="project-item" style={{ '--cat': catById(pr.category).color } as CSSProperties}>
              <CatIcon cat={pr.category} size={38} />
              <div className="grow">
                <strong>{pr.title}</strong>
                <span className="muted small">
                  {fmtDuration(pr.totalMinutes)}
                  {pr.deadline ? ` · antes del ${fmtShort(pr.deadline)}` : ''}
                </span>
              </div>
              <button className="icon-btn" aria-label={`Quitar ${pr.title}`} onClick={() => setProjects(projects.filter((_, k) => k !== i))}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Selección compacta: píldoras con icono, en dos columnas (se ve todo de un vistazo) */
export function PickPills({
  items,
  selected,
  onToggle,
  onEdit,
  onAddCustom,
  placeholder,
}: {
  items: RecurringSuggestion[];
  selected: string[];
  onToggle: (title: string) => void;
  onEdit: (title: string) => void;
  onAddCustom: (text: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    onAddCustom(text);
    setText('');
  };
  return (
    <>
      <div className="pills">
        {items.map((it, k) => {
          const on = selected.includes(it.title);
          return (
            <div key={it.title} className={`pill ${on ? 'on' : ''}`} style={{ '--cat': catById(it.category).color, '--i': k } as CSSProperties}>
              <button type="button" className="pill-main" aria-pressed={on} onClick={() => onToggle(it.title)}>
                <CatIcon cat={it.category} title={it.title} size={32} />
                <span className="pill-text">
                  <strong>{it.title}</strong>
                  <small>
                    {fmtDuration(it.minutes)} · {timesLabel(it.times, it.days, it.perMonth)}
                  </small>
                </span>
                <span className="pill-check">{on && <Icon name="check" size={14} />}</span>
              </button>
              {on && (
                <button type="button" className="pill-edit" aria-label={`Ajustar ${it.title}`} onClick={() => onEdit(it.title)}>
                  <Icon name="note" size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="add-own">
        <input value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button type="button" className="btn soft" disabled={!text.trim()} onClick={add}>
          Añadir
        </button>
      </div>
    </>
  );
}

type Step = 'hola' | 'tu' | 'horario' | 'trabajo' | 'valores' | 'habitos' | 'proyectos' | 'listo';
type ListKey = 'routine' | 'habit' | 'hobby';

const STEP_INFO: Record<Step, { title: string; sub?: string; icon: IconName }> = {
  hola: { title: '', icon: 'leaf' },
  tu: { title: 'Encantado de conocerte', sub: 'Dos preguntas rápidas para empezar.', icon: 'person' },
  horario: { title: 'Tu día tipo', sub: 'Lo justo para saber dónde caben tus cosas.', icon: 'clock' },
  trabajo: { title: 'Tu trabajo', sub: 'Así nunca te pongo nada encima.', icon: 'trabajo' },
  valores: { title: '¿Qué es importante para ti?', icon: 'balance' },
  habitos: { title: 'Tu semana ideal', sub: 'Toca lo que quieras incluir. Todo es opcional y se puede cambiar.', icon: 'star' },
  proyectos: { title: '¿Qué quieres conseguir?', icon: 'proyectos' },
  listo: { title: 'Preparando tu plan', icon: 'spark' },
};

const HOBBY_WHEN: [DayType, string][] = [
  ['any', 'Cuando haya hueco'],
  ['weekdays', 'Entre semana'],
  ['weekends', 'Sobre todo el finde'],
];

export function Onboarding({
  onDone,
  palette,
  onPalette,
}: {
  onDone: (p: Profile, tasks: NewTaskInput[], values: ValueGoal[], vision?: string) => void;
  palette?: PaletteId;
  onPalette: (id: PaletteId) => void;
}) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [p, setP] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [picked, setPicked] = useState<Record<ListKey, string[]>>({ routine: [], habit: [], hobby: [] });
  const [custom, setCustom] = useState<Record<ListKey, RecurringSuggestion[]>>({ routine: [], habit: [], hobby: [] });
  const [tab, setTab] = useState<ListKey>('routine');
  const [hobbyWhen, setHobbyWhen] = useState<DayType>('any');
  const [projects, setProjects] = useState<NewTaskInput[]>([]);
  // ajustes de la persona sobre las sugerencias (duración, días, momento…), por título
  const [tweaks, setTweaks] = useState<Record<string, RecurringSuggestion>>({});
  const [editing, setEditing] = useState<{ title: string; list: ListKey } | null>(null);
  const [addRecharge, setAddRecharge] = useState(true);
  const [values, setValues] = useState<ValueGoal[]>(goalsFromVision(VISIONS[3]));
  const [vision, setVision] = useState<string | undefined>();

  const steps: Step[] = ['hola', 'tu', 'horario', 'trabajo', 'valores', 'habitos', 'proyectos', 'listo'];
  const step = steps[Math.min(i, steps.length - 1)];
  const info = STEP_INFO[step];
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const go = (d: 1 | -1) => {
    setDir(d);
    setI((x) => Math.max(0, Math.min(steps.length - 1, x + d)));
    window.scrollTo({ top: 0 });
  };

  const BASE: Record<ListKey, RecurringSuggestion[]> = { routine: ROUTINE_SUGGESTIONS, habit: HABIT_SUGGESTIONS, hobby: AFICION_SUGGESTIONS };
  const all = (k: ListKey) => [...BASE[k], ...custom[k]].map((x) => tweaks[x.title] ?? x);
  const toggle = (k: ListKey) => (t: string) => setPicked((pk) => ({ ...pk, [k]: pk[k].includes(t) ? pk[k].filter((x) => x !== t) : [...pk[k], t] }));
  const editingItem = editing ? all(editing.list).find((x) => x.title === editing.title) : undefined;
  /** título original (clave de los ajustes) de una sugerencia que quizá se ha renombrado */
  const originalTitle = (shown: string, k: ListKey) => [...BASE[k], ...custom[k]].find((b) => (tweaks[b.title]?.title ?? b.title) === shown)?.title ?? shown;

  const hobbyGoal = values.find((g) => g.area === 'aficiones');
  const hobbies = spreadHobbies(
    all('hobby')
      .filter((h) => picked.hobby.includes(h.title))
      .map((h) => (tweaks[h.title] || hobbyWhen === 'any' ? h : { ...h, dayType: hobbyWhen })),
    hobbyGoal ? weeklyMinutes(hobbyGoal) : 0,
  );
  const chosen: NewTaskInput[] = [
    ...all('routine').filter((r) => picked.routine.includes(r.title)).map((r) => recurringToTask(r, true)),
    ...all('habit').filter((h) => picked.habit.includes(h.title)).map((h) => recurringToTask(h, false)),
    ...hobbies.map((h) => recurringToTask(h, false)),
    ...projects,
  ];
  const needsRecharge = analyzePlan(p, chosen).suggestRecharge;
  const finish = () => onDone(p, needsRecharge && addRecharge ? [...chosen, RECHARGE_TASK] : chosen, values, vision);
  const total = picked.routine.length + picked.habit.length + picked.hobby.length;
  const middle = steps.length - 2;

  const TABS: { id: ListKey; label: string; hint: string; placeholder: string; fallback: Partial<RecurringSuggestion> }[] = [
    {
      id: 'routine',
      label: 'Cada día',
      hint: 'Las tareas de siempre también ocupan tiempo: así las tengo en cuenta.',
      placeholder: 'Otra: «Recoger a los niños 30 min cada día»',
      fallback: { category: 'hogar', icon: '', times: 7, minutes: 30 },
    },
    {
      id: 'habit',
      label: 'Cuidarte',
      hint: 'Bienestar y la gente que quieres: lo coloco cada semana.',
      placeholder: 'La tuya: «Yoga 45 min 2 veces por semana»',
      fallback: { category: 'bienestar', times: 2, minutes: 30 },
    },
    {
      id: 'hobby',
      label: 'Aficiones',
      hint: '¿Qué te gusta hacer? Reparto en tus ratos libres las horas que quieres dedicarle.',
      placeholder: 'Otra: «Cerámica 2 h los sábados»',
      fallback: { category: 'aficiones', times: 1, minutes: 60 },
    },
  ];
  const cur = TABS.find((t) => t.id === tab)!;

  return (
    <div className="onboarding">
      {step !== 'hola' && (
        <div className="ob-progress">
          <span className="ob-progress-bar">
            <span style={{ width: `${(Math.min(i, middle) / middle) * 100}%` }} />
          </span>
          <span className="ob-progress-text">{step === 'listo' ? 'Último paso' : `${i} de ${middle}`}</span>
        </div>
      )}

      {step === 'hola' ? (
        <div className="hello" key="hola">
          <div className="hello-art" aria-hidden="true">
            <div className="hello-sun">
              <Icon name="leaf" size={54} />
            </div>
            {(['bienestar', 'pareja', 'proyectos', 'social', 'aficiones', 'familia'] as const).map((c, k) => (
              <span key={c} className={`hello-orbit o${k}`}>
                <CatIcon cat={c} size={40} />
              </span>
            ))}
          </div>
          <h1>Sereno</h1>
          <p className="lead">Mente tranquila, máximo potencial.</p>
          <p className="muted">Cuéntame tu rutina y lo que quieres conseguir. Yo lo coloco en tu calendario, sin estrés.</p>
          <div className="hello-style">
            <span className="muted small">Elige tu estilo</span>
            <PalettePicker value={palette} onChange={onPalette} />
          </div>
        </div>
      ) : (
        <div className={`step ${dir > 0 ? 'in-right' : 'in-left'}`} key={step}>
          <div className="step-head">
            <span className="step-badge">
              <Icon name={info.icon} size={26} />
            </span>
            <div>
              <h2>{info.title}</h2>
              {info.sub && <p className="muted small">{info.sub}</p>}
            </div>
          </div>

          {step === 'tu' && (
            <>
              <label className="field">
                <span>¿Cómo te llamas?</span>
                <input autoFocus value={p.name} placeholder="Tu nombre" onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && go(1)} />
              </label>
              <div className="field">
                <span>¿Cuándo te concentras mejor?</span>
                <div className="choice-cards">
                  {(
                    [
                      ['manana', 'Por la mañana', 'sunrise'],
                      ['neutro', 'Me da igual', 'balance'],
                      ['noche', 'Por la tarde-noche', 'moon'],
                    ] as [Chronotype, string, IconName][]
                  ).map(([v, label, icon]) => (
                    <button key={v} type="button" className={`choice-card ${p.chronotype === v ? 'on' : ''}`} onClick={() => set({ chronotype: v })}>
                      <Icon name={icon} size={26} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <small className="muted">Ahí colocaré lo que pide más foco.</small>
              </div>
            </>
          )}

          {step === 'horario' && (
            <div className="day-cards">
              <section className="day-card" style={{ '--c': '#F2A74B' } as CSSProperties}>
                <span className="day-card-icon">
                  <Icon name="sunrise" size={22} />
                </span>
                <div className="grow">
                  <TimeInput label="Me despierto" value={p.wake} onChange={(wake) => set({ wake })} />
                  <div className="field mini">
                    <span>Tardo en arrancar</span>
                    <NumberChips value={p.morningRoutine} options={[15, 30, 45, 60, 90]} onChange={(morningRoutine) => set({ morningRoutine })} fmt={fmtDuration} />
                  </div>
                </div>
              </section>
              <section className="day-card" style={{ '--c': '#F0875A' } as CSSProperties}>
                <span className="day-card-icon">
                  <Icon name="meal" size={22} />
                </span>
                <div className="grow">
                  <div className="row2">
                    <TimeInput label="Como" value={p.lunch} onChange={(lunch) => set({ lunch })} />
                    <TimeInput label="Ceno" value={p.dinner} onChange={(dinner) => set({ dinner })} />
                  </div>
                  <div className="field mini">
                    <span>Cada comida, unos</span>
                    <NumberChips value={p.dinnerDuration} options={[30, 45, 60, 90]} onChange={(v) => set({ dinnerDuration: v, lunchDuration: v })} fmt={fmtDuration} />
                  </div>
                </div>
              </section>
              <section className="day-card" style={{ '--c': '#8E7AD8' } as CSSProperties}>
                <span className="day-card-icon">
                  <Icon name="moon" size={22} />
                </span>
                <div className="grow">
                  <TimeInput label="Me acuesto" value={p.bed} onChange={(bed) => set({ bed })} />
                  <div className="field mini">
                    <span>Antes, para desconectar (tiempo protegido)</span>
                    <DurationPicker value={p.relaxMinutes} onChange={(relaxMinutes) => set({ relaxMinutes })} options={[30, 60, 90, 120, 180]} />
                  </div>
                </div>
              </section>
            </div>
          )}

          {step === 'trabajo' && (
            <>
              <ProfileFields p={p} set={set} step="trabajo" />
              {p.works && (
                <details className="more ob-more">
                  <summary>¿Puedes hacer pausas cortas mientras trabajas?</summary>
                  <p className="muted small">Si teletrabajas, aprovecho esas pausas para cosas cortas: meditar, estirar, poner una lavadora…</p>
                  <BreaksEditor value={p.breaks ?? []} onChange={(breaks) => set({ breaks })} />
                </details>
              )}
            </>
          )}

          {step === 'valores' && (
            <ValuesEditor
              vision={vision}
              goals={values}
              onChange={(g, v) => {
                setValues(g);
                setVision(v);
              }}
            />
          )}

          {step === 'habitos' && (
            <>
              <div className="segmented three ob-tabs">
                {TABS.map((t) => (
                  <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                    {t.label}
                    {picked[t.id].length > 0 && <span className="count">{picked[t.id].length}</span>}
                  </button>
                ))}
              </div>
              <div className="ob-tab-body" key={tab}>
                <p className="muted small">{cur.hint}</p>
                {tab === 'hobby' && (
                  <div className="chips hobby-when">
                    {HOBBY_WHEN.map(([v, l]) => (
                      <button key={v} type="button" className={`chip ${hobbyWhen === v ? 'on' : ''}`} onClick={() => setHobbyWhen(v)}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
                <PickPills
                  items={all(tab)}
                  selected={picked[tab]}
                  onToggle={toggle(tab)}
                  onEdit={(title) => setEditing({ title, list: tab })}
                  placeholder={cur.placeholder}
                  onAddCustom={(t) => {
                    const c = customRecurring(t, cur.fallback);
                    setCustom((x) => ({ ...x, [tab]: [...x[tab], c] }));
                    setPicked((x) => ({ ...x, [tab]: [...x[tab], c.title] }));
                  }}
                />
                {tab === 'hobby' && hobbyGoal && picked.hobby.length > 0 && (
                  <p className="ob-note">
                    <Icon name="spark" size={16} /> Quieres dedicar {hobbyGoal.hours} h {hobbyGoal.per === 'semana' ? 'a la semana' : 'al mes'} a tus aficiones: lo reparto entre{' '}
                    {picked.hobby.length === 1 ? 'esta' : `estas ${picked.hobby.length}`}.
                  </p>
                )}
              </div>
            </>
          )}

          {step === 'proyectos' && (
            <>
              <ProjectsStep projects={projects} setProjects={setProjects} />
              <WeekendFocusField p={p} set={set} />
            </>
          )}
          {step === 'listo' && <PlanAnalysisView profile={p} tasks={chosen} values={values} addRecharge={addRecharge} setAddRecharge={setAddRecharge} />}
        </div>
      )}

      {editing && editingItem && (
        <RecurringEditor
          value={editingItem}
          onClose={() => setEditing(null)}
          onRemove={() => {
            setPicked((pk) => ({ ...pk, [editing.list]: pk[editing.list].filter((t) => t !== editing.title) }));
            setEditing(null);
          }}
          onSave={(v) => {
            // los ajustes se guardan bajo el título original de la sugerencia
            const key = originalTitle(editing.title, editing.list);
            setTweaks((t) => ({ ...t, [key]: v }));
            if (v.title !== editing.title) {
              setPicked((pk) => ({ ...pk, [editing.list]: pk[editing.list].map((t) => (t === editing.title ? v.title : t)) }));
            }
            setEditing(null);
          }}
        />
      )}

      <div className="onboarding-actions">
        {i > 0 && (
          <button className="btn ghost" onClick={() => go(-1)}>
            Atrás
          </button>
        )}
        {step === 'listo' ? (
          <button className="btn primary" onClick={finish}>
            Empezar mi plan
          </button>
        ) : (
          <button className="btn primary" onClick={() => go(1)}>
            {i === 0 ? 'Empezar' : (step === 'habitos' && total === 0) || (step === 'proyectos' && projects.length === 0) ? 'Saltar por ahora' : 'Siguiente'}
          </button>
        )}
      </div>
    </div>
  );
}
