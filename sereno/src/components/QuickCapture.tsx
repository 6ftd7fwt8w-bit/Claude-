import { useState, type CSSProperties } from 'react';
import type { AppState, CategoryId, DayType } from '../types';
import type { ConflictFix } from '../lib/scheduler';
import { ConflictBox } from './ConflictBox';
import { CATEGORIES, catById } from '../types';
import type { NewTaskInput } from '../lib/scheduler';
import { detectCategory, estimateMinutes, parseQuick } from '../lib/parse';
import { addDays, fmtShort, hmToMin, minToHm, monthEnd, todayKey, weekday } from '../lib/time';
import { DurationPicker, NumberChips, Sheet, TimeMode } from './ui';

type Repeat = 'una' | 'semana' | 'mes' | 'hora';
type When = 'hoy' | 'manana' | 'semana' | 'proxima' | 'mes' | 'sinprisa' | 'fecha';

interface Draft {
  title: string;
  category: CategoryId;
  detected?: CategoryId;
  repeat: Repeat;
  when?: When;
  date: string; // para 'fecha' y para citas
  start: number;
  minutes: number;
  big: boolean;
  times: number;
  /** hora fija (si la quiere) */
  fixedStart?: number;
  after?: number;
  dayType: DayType;
  /** proyectos: por partes o todo seguido */
  whole: boolean;
}

export interface CaptureResult {
  title: string;
  category: CategoryId;
  message?: string;
  taskId?: string;
}

const WHEN: { id: When; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'manana', label: 'Mañana' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'proxima', label: 'La próxima semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'sinprisa', label: 'Sin prisa' },
  { id: 'fecha', label: '📅 Elegir fecha' },
];

const REPEAT: { id: Repeat; label: string }[] = [
  { id: 'una', label: '1️⃣ Una vez' },
  { id: 'semana', label: '🔁 Cada semana' },
  { id: 'mes', label: '🗓️ Cada mes' },
  { id: 'hora', label: '📌 Cita con hora' },
];

function deadlineFor(when: When | undefined, date: string, today: string): string | undefined {
  const sunday = (from: string) => addDays(from, (7 - weekday(from)) % 7);
  switch (when) {
    case 'hoy':
      return today;
    case 'manana':
      return addDays(today, 1);
    case 'semana':
      return sunday(today);
    case 'proxima':
      return sunday(addDays(sunday(today), 1));
    case 'mes':
      return monthEnd(today);
    case 'fecha':
      return date;
    default:
      return undefined;
  }
}

function toDraft(line: string, today: string, learned?: Record<string, CategoryId>): Draft {
  const q = parseQuick(line, today, learned);
  const detected = q.category ?? detectCategory(line, learned);
  const category = detected ?? 'gestiones';
  const title = q.title || line.trim();
  const est = estimateMinutes(title, category);
  const repeat: Repeat = q.kind === 'evento' ? 'hora' : q.timesPerMonth ? 'mes' : q.kind === 'habito' ? 'semana' : 'una';
  return {
    title,
    category,
    detected,
    repeat,
    when: q.deadline ? 'fecha' : undefined,
    date: q.deadline ?? q.date ?? today,
    start: q.start ?? 19 * 60,
    minutes: q.totalMinutes ?? est.minutes,
    big: est.big && !q.totalMinutes,
    times: q.timesPerMonth ?? q.timesPerWeek ?? (repeat === 'mes' ? 1 : 2),
    fixedStart: repeat !== 'hora' && q.start != null ? q.start : undefined,
    dayType: 'any',
    whole: false,
  };
}

function toTask(d: Draft, today: string): NewTaskInput {
  const extra = { fixedStart: d.fixedStart, after: d.after, dayType: d.dayType };
  if (d.repeat === 'hora') return { title: d.title, category: d.category, kind: 'evento', totalMinutes: d.minutes, date: d.date, start: d.start };
  if (d.repeat === 'semana') return { title: d.title, category: d.category, kind: 'habito', totalMinutes: d.minutes, timesPerWeek: d.times, ...extra };
  if (d.repeat === 'mes') return { title: d.title, category: d.category, kind: 'habito', totalMinutes: d.minutes, timesPerMonth: d.times, ...extra };
  return {
    title: d.title,
    category: d.category,
    kind: 'flexible',
    totalMinutes: d.minutes,
    sessionMinutes: d.whole ? d.minutes : Math.min(60, d.minutes),
    deadline: deadlineFor(d.when, d.date, today),
    ...extra,
  };
}

/**
 * El "+" de Sereno: vuelca todo lo que tienes en la cabeza y te pregunto lo que falte.
 */
export function QuickCapture({
  learned,
  state,
  onFix,
  onFinish,
  onFullForm,
  onClose,
}: {
  learned?: Record<string, CategoryId>;
  state: AppState;
  onFix: (taskId: string, fix: ConflictFix) => void;
  /** añade las tareas; devuelve dónde ha quedado cada una */
  onFinish: (tasks: NewTaskInput[], corrections: { title: string; category: CategoryId }[]) => CaptureResult[];
  onFullForm: () => void;
  onClose: () => void;
}) {
  const today = todayKey();
  const [stage, setStage] = useState<'dump' | 'ask' | 'done'>('dump');
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<CaptureResult[]>([]);

  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[-•*·\d.)]+\s*/, '').trim())
    .filter(Boolean);

  const start = () => {
    setDrafts(lines.map((l) => toDraft(l, today, learned)));
    setI(0);
    setStage('ask');
  };

  const d = drafts[i];
  const set = (patch: Partial<Draft>) => setDrafts((ds) => ds.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const ready = d && (d.repeat !== 'una' || !!d.when);

  const finish = () => {
    const corrections = drafts.filter((x) => x.detected !== x.category).map((x) => ({ title: x.title, category: x.category }));
    setResults(onFinish(drafts.map((x) => toTask(x, today)), corrections));
    setStage('done');
  };

  if (stage === 'dump')
    return (
      <Sheet title="¿Qué tienes en la cabeza?" onClose={onClose}>
        <p className="muted">Escríbelo todo, una cosa por línea, como te salga. Yo lo ordeno y te pregunto lo que falte.</p>
        <textarea
          autoFocus
          className="dump"
          rows={6}
          value={text}
          placeholder={'Trabajar en las láminas de la tienda\nReclamar el vuelo\nLlamar a natación\nQuedar con amigas 2 veces al mes'}
          onChange={(e) => setText(e.target.value)}
        />
        {lines.length > 0 && (
          <div className="dump-preview">
            {lines.map((l, k) => {
              const c = catById(detectCategory(l, learned) ?? 'gestiones');
              return (
                <span key={k} className="tag" style={{ background: `color-mix(in srgb, ${c.color} 22%, var(--surface))` }}>
                  {c.emoji} {l.length > 28 ? `${l.slice(0, 28)}…` : l}
                </span>
              );
            })}
          </div>
        )}
        <button className="btn primary wide" disabled={!lines.length} onClick={start}>
          {lines.length > 1 ? `Organizar ${lines.length} cosas ✨` : 'Organizar ✨'}
        </button>
        <button className="btn ghost wide" onClick={onFullForm}>
          Prefiero el formulario completo
        </button>
      </Sheet>
    );

  if (stage === 'done')
    return (
      <Sheet title="¡Organizado! 🌿" onClose={onClose}>
        <div className="capture-results">
          {results.map((r, k) => (
            <div key={k} className="capture-result" style={{ '--cat': catById(r.category).color } as CSSProperties}>
              <span className="cr-icon">{catById(r.category).emoji}</span>
              <div className="grow">
                <strong>{r.title}</strong>
                <span className="muted small">{r.message?.replace(/ Ojo: faltan .*$/, '')}</span>
                {r.taskId && <ConflictBox state={state} taskId={r.taskId} onFix={onFix} />}
              </div>
            </div>
          ))}
        </div>
        <button className="btn primary wide" onClick={onClose}>
          Ver mi día
        </button>
      </Sheet>
    );

  const cat = catById(d.category);
  return (
    <Sheet title={drafts.length > 1 ? `${i + 1} de ${drafts.length}` : 'Un par de preguntas'} onClose={onClose}>
      <div className="ask-progress">
        {drafts.map((_, k) => (
          <span key={k} className={k < i ? 'done' : k === i ? 'current' : ''} />
        ))}
      </div>
      <div className="ask-card" style={{ '--cat': cat.color } as CSSProperties}>
        <span className="ask-icon">{cat.emoji}</span>
        <div className="grow">
          <input className="ask-title" value={d.title} aria-label="Nombre" onChange={(e) => set({ title: e.target.value })} />
          <span className="ask-cat">
            {d.detected ? 'Creo que es' : 'Elige qué es'} <strong>{cat.label}</strong>
          </span>
        </div>
      </div>
      <div className="field">
        <span>¿De qué tipo es? (cuenta para tus valores)</span>
        <div className="cat-grid">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`cat-tile ${d.category === c.id ? 'on' : ''}`}
              style={{ '--cat': c.color } as CSSProperties}
              onClick={() => {
                const est = estimateMinutes(d.title, c.id);
                set({ category: c.id, ...(d.big !== est.big ? { minutes: est.minutes, big: est.big } : {}) });
              }}
            >
              <span>{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>¿Es algo de una vez o se repite?</span>
        <div className="chips">
          {REPEAT.map((r) => (
            <button key={r.id} className={`chip ${d.repeat === r.id ? 'on' : ''}`} onClick={() => set({ repeat: r.id, times: r.id === 'mes' ? 1 : r.id === 'semana' ? 2 : d.times })}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {d.repeat === 'una' && (
        <div className="field">
          <span>¿Para cuándo tiene que estar?</span>
          <div className="chips">
            {WHEN.map((w) => (
              <button key={w.id} className={`chip ${d.when === w.id ? 'on' : ''}`} onClick={() => set({ when: w.id })}>
                {w.id === 'fecha' && d.when === 'fecha' ? `📅 ${fmtShort(d.date)}` : w.label}
              </button>
            ))}
          </div>
          {d.when === 'fecha' && <input type="date" value={d.date} min={today} onChange={(e) => e.target.value && set({ date: e.target.value })} />}
          {d.when && d.when !== 'sinprisa' && d.when !== 'fecha' && <small className="muted">Fecha límite: {fmtShort(deadlineFor(d.when, d.date, today)!)}</small>}
        </div>
      )}

      {d.repeat === 'hora' && (
        <div className="row2">
          <label className="field">
            <span>Día</span>
            <input type="date" value={d.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
          </label>
          <label className="field">
            <span>Hora</span>
            <input type="time" value={minToHm(d.start)} onChange={(e) => e.target.value && set({ start: hmToMin(e.target.value) })} />
          </label>
        </div>
      )}

      {(d.repeat === 'semana' || d.repeat === 'mes') && (
        <div className="field">
          <span>¿Cuántas veces {d.repeat === 'semana' ? 'a la semana' : 'al mes'}?</span>
          <NumberChips
            value={d.times}
            options={d.repeat === 'semana' ? [1, 2, 3, 4, 5, 7] : [1, 2, 3, 4]}
            onChange={(times) => set({ times })}
            fmt={(n) => (d.repeat === 'semana' && n === 7 ? 'Cada día' : `${n}×`)}
          />
        </div>
      )}

      <div className="field">
        <span>{d.big && d.repeat === 'una' ? '¿Cuánto tiempo crees que necesitas en total?' : '¿Cuánto tiempo te llevará?'}</span>
        <DurationPicker
          value={d.minutes}
          onChange={(minutes) => set({ minutes })}
          options={d.big && d.repeat === 'una' ? [60, 120, 180, 300, 600, 1200] : [5, 10, 15, 20, 30, 45, 60, 90, 120]}
        />
      </div>

      {d.repeat === 'una' && d.minutes > 60 && (
        <div className="field">
          <span>¿Cómo prefieres hacerlo?</span>
          <div className="chips">
            <button className={`chip ${!d.whole ? 'on' : ''}`} onClick={() => set({ whole: false })}>
              ✂️ Por partes (sesiones de 1 h)
            </button>
            <button className={`chip ${d.whole ? 'on' : ''}`} onClick={() => set({ whole: true })}>
              🧱 Todo seguido en un día
            </button>
          </div>
        </div>
      )}

      {d.repeat !== 'hora' && (
        <>
          <div className="field">
            <span>¿A qué hora?</span>
            <TimeMode fixed={d.fixedStart} after={d.after} onChange={(v) => set({ fixedStart: v.fixed, after: v.after })} />
          </div>
          <div className="field">
            <span>¿Qué días?</span>
            <div className="chips">
              {(
                [
                  ['any', 'Cualquier día'],
                  ['weekdays', 'Entre semana'],
                  ['weekends', 'Fines de semana'],
                ] as [DayType, string][]
              ).map(([v, l]) => (
                <button key={v} className={`chip ${d.dayType === v ? 'on' : ''}`} onClick={() => set({ dayType: v })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="ask-actions">
        {i > 0 && (
          <button className="btn ghost" onClick={() => setI(i - 1)}>
            Atrás
          </button>
        )}
        {i < drafts.length - 1 ? (
          <button
            className="btn primary"
            disabled={!ready}
            onClick={() => {
              setI(i + 1);
              document.querySelector('.sheet')?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Siguiente
          </button>
        ) : (
          <button className="btn primary" disabled={!ready} onClick={finish}>
            Buscar huecos ✨
          </button>
        )}
      </div>
      {!ready && <p className="muted small center">Dime para cuándo y sigo 🙂</p>}
    </Sheet>
  );
}
