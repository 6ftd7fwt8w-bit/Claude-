import { useState, type CSSProperties } from 'react';
import { DEFAULT_PROFILE, catById, type CategoryId, type Chronotype, type Profile, type WorkHours } from '../types';
import { baseFreeMinutes } from '../lib/scheduler';
import { addDays, fmtDuration, todayKey, weekStart } from '../lib/time';
import { NumberChips, TimeInput } from './ui';

export interface HabitSuggestion {
  title: string;
  category: CategoryId;
  minutes: number;
  times: number;
  on: boolean;
}

export const HABIT_SUGGESTIONS: HabitSuggestion[] = [
  { title: 'Meditar', category: 'bienestar', minutes: 10, times: 5, on: true },
  { title: 'Moverme / ejercicio', category: 'bienestar', minutes: 30, times: 3, on: true },
  { title: 'Quedar con amigos o familia', category: 'social', minutes: 90, times: 1, on: true },
  { title: 'Llamar a alguien que quiero', category: 'social', minutes: 20, times: 2, on: false },
  { title: 'Leer por placer', category: 'autocuidado', minutes: 30, times: 3, on: false },
  { title: 'Tiempo para mí (baño, skincare…)', category: 'autocuidado', minutes: 30, times: 1, on: false },
  { title: 'Ordenar la casa', category: 'hogar', minutes: 30, times: 2, on: false },
];

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
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
              <div className="chips days">
                {DAY_VALUES.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    className={`chip round ${p.workDays.includes(d) ? 'on' : ''}`}
                    onClick={() =>
                      set({ workDays: p.workDays.includes(d) ? p.workDays.filter((x) => x !== d) : [...p.workDays, d] })
                    }
                  >
                    {DAY_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>
            <div className="row2">
              <TimeInput label="Empiezo" value={p.workStart} onChange={(workStart) => set({ workStart })} />
              <TimeInput label="Termino" value={p.workEnd} onChange={(workEnd) => set({ workEnd })} />
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={!!p.workByDay}
                onChange={(e) => set({ workByDay: e.target.checked ? {} : undefined })}
              />
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
              <span>Desplazamiento (cada trayecto)</span>
              <NumberChips value={p.commute} options={[0, 15, 30, 45, 60]} onChange={(commute) => set({ commute })} fmt={(v) => (v ? fmtDuration(v) : 'Teletrabajo')} />
            </div>
          </>
        )}
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

const STEPS = ['hola', 'nombre', 'despertar', 'trabajo', 'comidas', 'noche', 'habitos', 'listo'] as const;
const TITLES: Record<string, string> = {
  hola: '',
  nombre: '¿Cómo te llamas?',
  despertar: 'Tus mañanas',
  trabajo: 'Tu trabajo',
  comidas: 'Tus comidas',
  noche: 'Tus noches',
  habitos: '¿Qué no quieres olvidar?',
  listo: 'Todo listo',
};

export function Onboarding({ onDone }: { onDone: (p: Profile, habits: HabitSuggestion[]) => void }) {
  const [i, setI] = useState(0);
  const [p, setP] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [habits, setHabits] = useState(HABIT_SUGGESTIONS);
  const step = STEPS[i];
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const next = () => setI((x) => Math.min(STEPS.length - 1, x + 1));
  const back = () => setI((x) => Math.max(0, x - 1));

  const ws = weekStart(todayKey());
  const weekFree = Array.from({ length: 7 }, (_, d) => baseFreeMinutes(p, addDays(ws, d))).reduce((a, b) => a + b, 0);

  return (
    <div className="onboarding">
      <div className="progress-dots">
        {STEPS.map((s, k) => (
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
          {step === 'habitos' && (
            <>
              <p className="muted">Te los colocaré cada semana en tus huecos, para que tu vida no sea solo tareas.</p>
              <div className="habit-list">
                {habits.map((h, k) => (
                  <label key={h.title} className={`habit-option ${h.on ? 'on' : ''}`} style={{ '--chip': catById(h.category).color } as CSSProperties}>
                    <input type="checkbox" checked={h.on} onChange={() => setHabits((hs) => hs.map((x, j) => (j === k ? { ...x, on: !x.on } : x)))} />
                    <span className="habit-emoji">{catById(h.category).emoji}</span>
                    <span className="habit-title">{h.title}</span>
                    <span className="muted small">
                      {fmtDuration(h.minutes)} · {h.times}×/sem
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 'listo' && (
            <div className="summary">
              <p className="big-number">{fmtDuration(weekFree)}</p>
              <p className="muted">
                es el tiempo libre real que tienes a la semana, después de trabajo, comidas y descanso. Usaremos solo una
                parte según tu energía, para que siempre te quede aire 🌬️
              </p>
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
          <button className="btn primary" onClick={() => onDone(p, habits.filter((h) => h.on))}>
            Plantar mi bonsái 🌱
          </button>
        ) : (
          <button className="btn primary" onClick={next}>
            {i === 0 ? 'Empezar' : 'Siguiente'}
          </button>
        )}
      </div>
    </div>
  );
}
