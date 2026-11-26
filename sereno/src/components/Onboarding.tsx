import { useState, type CSSProperties } from 'react';
import { DEFAULT_PROFILE, catById, type Chronotype, type Profile, type WorkHours } from '../types';
import { baseFreeMinutes, type NewTaskInput } from '../lib/scheduler';
import { parseQuick } from '../lib/parse';
import {
  HABIT_SUGGESTIONS,
  PROJECT_EXAMPLES,
  ROUTINE_SUGGESTIONS,
  timesLabel,
  type RecurringSuggestion,
} from '../lib/suggestions';
import { addDays, fmtDuration, fmtShort, todayKey, weekStart } from '../lib/time';
import { BreaksEditor } from './BreaksEditor';
import { NumberChips, TimeInput } from './ui';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function DayPicker({ value, options = DAY_VALUES, onChange }: { value: number[]; options?: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="chips days">
      {DAY_VALUES.filter((d) => options.includes(d)).map((d) => (
        <button
          key={d}
          type="button"
          className={`chip round ${value.includes(d) ? 'on' : ''}`}
          aria-pressed={value.includes(d)}
          onClick={() => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d])}
        >
          {DAY_LABELS[DAY_VALUES.indexOf(d)]}
        </button>
      ))}
    </div>
  );
}

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
                ['manana', '🌅 Por la mañana'],
                ['neutro', '🌤️ Me da igual'],
                ['noche', '🌙 Por la tarde-noche'],
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
              <span>🏠 ¿Qué días teletrabajas?</span>
              <DayPicker value={p.remoteDays ?? []} options={p.workDays} onChange={(remoteDays) => set({ remoteDays })} />
              <small className="muted">Esos días no cuento desplazamiento.</small>
            </div>
            {(p.remoteDays ?? []).length < p.workDays.length && (
              <div className="field">
                <span>🚆 Desplazamiento los días de oficina (cada trayecto)</span>
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
          <NumberChips value={p.relaxMinutes} options={[30, 45, 60, 90, 120]} onChange={(relaxMinutes) => set({ relaxMinutes })} fmt={fmtDuration} />
          <small className="muted">Ese tiempo queda protegido: nunca te pondré tareas ahí 🌙</small>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={p.gentleWeekends} onChange={(e) => set({ gentleWeekends: e.target.checked })} />
          <span>Fines de semana más suaves (menos tareas)</span>
        </label>
      </>
    );
  return null;
}

/** Cuadrícula de sugerencias seleccionables + "añadir la mía" */
export function SuggestionTiles({
  items,
  selected,
  onToggle,
  onAddCustom,
  placeholder,
}: {
  items: RecurringSuggestion[];
  selected: string[];
  onToggle: (title: string) => void;
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
            <button
              key={s.title}
              type="button"
              className={`tile ${on ? 'on' : ''}`}
              aria-pressed={on}
              style={{ '--cat': catById(s.category).color } as CSSProperties}
              onClick={() => onToggle(s.title)}
            >
              <span className="tile-check">{on ? '✓' : ''}</span>
              <span className="tile-icon">{s.icon}</span>
              <span className="tile-title">{s.title}</span>
              <span className="tile-meta">
                {fmtDuration(s.minutes)} · {timesLabel(s.times)}
              </span>
            </button>
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
    timeOfDay: fallback.timeOfDay ?? 'cualquiera',
  };
}

export function recurringToTask(s: RecurringSuggestion, routine: boolean): NewTaskInput {
  return {
    title: s.title,
    category: s.category,
    kind: 'habito',
    totalMinutes: s.minutes,
    timesPerWeek: s.times,
    routine,
    timeOfDay: s.timeOfDay,
    icon: s.icon,
  };
}

/** Paso de proyectos: escribe en lenguaje natural y ves lo que se entiende */
function ProjectsStep({ projects, setProjects }: { projects: NewTaskInput[]; setProjects: (p: NewTaskInput[]) => void }) {
  const [text, setText] = useState('');
  const [hours, setHours] = useState<number | null>(null);
  const today = todayKey();
  const q = parseQuick(text, today);
  const minutes = q.totalMinutes ?? (hours ? hours * 60 : null);
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
          <span className="tag">✨ {q.title || '…'}</span>
          {q.totalMinutes ? <span className="tag">⏱ {fmtDuration(q.totalMinutes)}</span> : null}
          {q.deadline ? <span className="tag">🎯 antes del {fmtShort(q.deadline)}</span> : <span className="tag soft">sin fecha límite</span>}
        </div>
      )}
      {text.trim() && !q.totalMinutes && (
        <div className="field">
          <span>¿Cuántas horas crees que necesitas en total?</span>
          <NumberChips value={hours ?? 0} options={[2, 5, 10, 20, 40]} onChange={setHours} fmt={(v) => `${v} h`} />
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
              <span className="tile-icon">{catById(pr.category).emoji}</span>
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

type Step = 'hola' | 'nombre' | 'despertar' | 'trabajo' | 'pausas' | 'comidas' | 'noche' | 'cotidianas' | 'cuidar' | 'proyectos' | 'listo';

const TITLES: Record<Step, string> = {
  hola: '',
  nombre: '¿Cómo te llamas?',
  despertar: 'Tus mañanas',
  trabajo: 'Tu trabajo',
  pausas: '¿Puedes hacer pausas?',
  comidas: 'Tus comidas',
  noche: 'Tus noches',
  cotidianas: 'Lo de cada día',
  cuidar: '¿Qué quieres cuidar?',
  proyectos: '¿Qué quieres conseguir?',
  listo: 'Todo listo',
};

export function Onboarding({ onDone }: { onDone: (p: Profile, tasks: NewTaskInput[]) => void }) {
  const [i, setI] = useState(0);
  const [p, setP] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [routines, setRoutines] = useState<string[]>([]);
  const [habits, setHabits] = useState<string[]>([]);
  const [customRoutines, setCustomRoutines] = useState<RecurringSuggestion[]>([]);
  const [customHabits, setCustomHabits] = useState<RecurringSuggestion[]>([]);
  const [projects, setProjects] = useState<NewTaskInput[]>([]);

  const steps: Step[] = ['hola', 'nombre', 'despertar', 'trabajo', ...(p.works ? (['pausas'] as Step[]) : []), 'comidas', 'noche', 'cotidianas', 'cuidar', 'proyectos', 'listo'];
  const step = steps[Math.min(i, steps.length - 1)];
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const next = () => setI((x) => Math.min(steps.length - 1, x + 1));
  const back = () => setI((x) => Math.max(0, x - 1));
  const toggle = (list: string[], setList: (l: string[]) => void) => (t: string) =>
    setList(list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);

  const allRoutines = [...ROUTINE_SUGGESTIONS, ...customRoutines];
  const allHabits = [...HABIT_SUGGESTIONS, ...customHabits];
  const ws = weekStart(todayKey());
  const weekFree = Array.from({ length: 7 }, (_, d) => baseFreeMinutes(p, addDays(ws, d))).reduce((a, b) => a + b, 0);

  const finish = () =>
    onDone(p, [
      ...allRoutines.filter((r) => routines.includes(r.title)).map((r) => recurringToTask(r, true)),
      ...allHabits.filter((h) => habits.includes(h.title)).map((h) => recurringToTask(h, false)),
      ...projects,
    ]);

  return (
    <div className="onboarding">
      <div className="progress-dots">
        {steps.map((s, k) => (
          <span key={s} className={k <= i ? 'on' : ''} />
        ))}
      </div>

      {step === 'hola' ? (
        <div className="hello">
          <div className="hello-mark">🌿</div>
          <h1>Sereno</h1>
          <p className="lead">Consigue tus objetivos sin estrés.</p>
          <p className="muted">
            Cuéntame tu rutina y lo que quieres conseguir. Yo busco los huecos, reparto el trabajo según tu energía y
            me aseguro de que no se te olvide vivir.
          </p>
        </div>
      ) : (
        <div className="step">
          <h2>{TITLES[step]}</h2>
          {step === 'nombre' && (
            <label className="field">
              <span>Así podré saludarte cada mañana</span>
              <input autoFocus value={p.name} placeholder="Tu nombre" onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && next()} />
            </label>
          )}
          <ProfileFields p={p} set={set} step={step} />
          {step === 'cotidianas' && (
            <>
              <p className="muted">
                Las tareas de siempre también ocupan tiempo. Marca las tuyas y las tendré en cuenta. Si la ducha ya la
                cuentas en tu rutina de la mañana, no hace falta marcarla.
              </p>
              <SuggestionTiles
                items={allRoutines}
                selected={routines}
                onToggle={toggle(routines, setRoutines)}
                placeholder="Otra: p. ej. «Recoger a los niños 30 min cada día»"
                onAddCustom={(t) => {
                  const c = customRecurring(t, { category: 'hogar', icon: '🏡', times: 7, minutes: 30 });
                  setCustomRoutines((x) => [...x, c]);
                  setRoutines((x) => [...x, c.title]);
                }}
              />
            </>
          )}
          {step === 'cuidar' && (
            <>
              <p className="muted">
                Ideas para cuidarte y no olvidarte de la gente. Son solo sugerencias: elige las que quieras o escribe las tuyas.
              </p>
              <SuggestionTiles
                items={allHabits}
                selected={habits}
                onToggle={toggle(habits, setHabits)}
                placeholder="La tuya: p. ej. «Yoga 45 min 2 veces por semana»"
                onAddCustom={(t) => {
                  const c = customRecurring(t, { category: 'bienestar', times: 2, minutes: 30 });
                  setCustomHabits((x) => [...x, c]);
                  setHabits((x) => [...x, c.title]);
                }}
              />
            </>
          )}
          {step === 'proyectos' && <ProjectsStep projects={projects} setProjects={setProjects} />}
          {step === 'listo' && (
            <div className="summary">
              <p className="big-number">{fmtDuration(weekFree)}</p>
              <p className="muted">
                es tu tiempo libre real a la semana, después de trabajo, comidas y descanso. Usaré solo una parte según
                tu energía, para que siempre te quede aire 🌬️
              </p>
              <div className="summary-chips">
                <span className="tag">🧺 {routines.length} cotidianas</span>
                <span className="tag">💛 {habits.length} para cuidarte</span>
                <span className="tag">✨ {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}</span>
                {p.works && (p.breaks ?? []).length > 0 && <span className="tag">☕ {(p.breaks ?? []).length} pausas</span>}
              </div>
              <p className="muted small">Todo se puede cambiar después.</p>
            </div>
          )}
        </div>
      )}

      <div className="onboarding-actions">
        {i > 0 && (
          <button className="btn ghost" onClick={back}>
            Atrás
          </button>
        )}
        {step === 'listo' ? (
          <button className="btn primary" onClick={finish}>
            Plantar mi bonsái 🌱
          </button>
        ) : (
          <button className="btn primary" onClick={next}>
            {i === 0
              ? 'Empezar'
              : (step === 'cotidianas' && routines.length === 0) || (step === 'cuidar' && habits.length === 0) || (step === 'proyectos' && projects.length === 0)
                ? 'Saltar por ahora'
                : 'Siguiente'}
          </button>
        )}
      </div>
    </div>
  );
}

