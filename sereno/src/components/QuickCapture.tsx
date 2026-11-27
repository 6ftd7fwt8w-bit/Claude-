import { useState, type CSSProperties } from 'react';
import type { AppState, CategoryId, DayType, Favorite } from '../types';
import type { ConflictFix } from '../lib/scheduler';
import { ConflictBox } from './ConflictBox';
import { CATEGORIES, catById } from '../types';
import type { NewTaskInput } from '../lib/scheduler';
import { detectCategory, estimateMinutes, parseQuick } from '../lib/parse';
import { addDays, fmtLong, fmtShort, hmToMin, minToHm, monthEnd, todayKey, weekday } from '../lib/time';
import { DurationPicker, NumberChips, Sheet, TimeMode } from './ui';
import { CatIcon, CatMark, Icon } from './Icons';
import { ADD_EXAMPLES } from './AskBar';

/** fijo: un día y hora concretos (se apunta tal cual) · hueco: Sereno le busca sitio */
type Mode = 'fijo' | 'hueco';
type Repeat = 'no' | 'semana' | 'mes';
type When = 'hoy' | 'manana' | 'semana' | 'proxima' | 'mes' | 'sinprisa' | 'fecha';

interface Draft {
  title: string;
  category: CategoryId;
  detected?: CategoryId;
  mode: Mode;
  repeat: Repeat;
  when?: When;
  date: string;
  start: number;
  minutes: number;
  big: boolean;
  times: number;
  fixedStart?: number;
  after?: number;
  dayType: DayType;
  whole: boolean;
  /** se crea como proyecto (con su página, pasos y progreso) */
  asProject: boolean;
  /** guardar en favoritos para añadirlo de un toque otra vez */
  favorite: boolean;
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
  { id: 'fecha', label: 'Elegir fecha' },
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

const PROJECTISH: CategoryId[] = ['proyectos', 'aficiones', 'trabajo'];

function toDraft(line: string, today: string, learned?: Record<string, CategoryId>, favorites: Favorite[] = [], defaultDate?: string): Draft {
  const fav = favorites.find((f) => f.title.toLowerCase() === line.trim().toLowerCase());
  const q = parseQuick(line, today, learned);
  const detected = fav?.category ?? q.category ?? detectCategory(line, learned);
  const category = detected ?? 'gestiones';
  const title = fav?.title ?? (q.title || line.trim());
  const est = estimateMinutes(title, category);
  const fixed = q.kind === 'evento' && q.start != null;
  const repeat: Repeat = fav?.repeat ?? (q.timesPerMonth ? 'mes' : q.kind === 'habito' ? 'semana' : 'no');
  const minutes = fav?.minutes ?? q.totalMinutes ?? (fixed ? 60 : est.minutes);
  return {
    title,
    category,
    detected,
    mode: fav?.mode ?? (fixed ? 'fijo' : 'hueco'),
    repeat,
    when: q.deadline || (defaultDate && !q.date) ? 'fecha' : undefined,
    date: q.date ?? q.deadline ?? defaultDate ?? today,
    start: fav?.start ?? q.start ?? 19 * 60,
    minutes,
    big: est.big && !q.totalMinutes && !fav,
    times: fav?.times ?? q.timesPerMonth ?? q.timesPerWeek ?? (repeat === 'mes' ? 1 : 2),
    fixedStart: !fixed && q.start != null ? q.start : undefined,
    dayType: 'any',
    whole: false,
    asProject: PROJECTISH.includes(category) && minutes > 60,
    favorite: false,
  };
}

function toTask(d: Draft, today: string): NewTaskInput {
  const base = { title: d.title, category: d.category };
  if (d.mode === 'fijo') {
    if (d.repeat === 'no') return { ...base, kind: 'evento', totalMinutes: d.minutes, date: d.date, start: d.start };
    // se repite a esa misma hora: cada semana ese día, o una vez al mes
    return d.repeat === 'semana'
      ? { ...base, kind: 'habito', totalMinutes: d.minutes, timesPerWeek: 1, days: [weekday(d.date)], fixedStart: d.start }
      : { ...base, kind: 'habito', totalMinutes: d.minutes, timesPerMonth: 1, fixedStart: d.start };
  }
  const extra = { fixedStart: d.fixedStart, after: d.after, dayType: d.dayType };
  if (d.repeat === 'semana') return { ...base, kind: 'habito', totalMinutes: d.minutes, timesPerWeek: d.times, ...extra };
  if (d.repeat === 'mes') return { ...base, kind: 'habito', totalMinutes: d.minutes, timesPerMonth: d.times, ...extra };
  return {
    ...base,
    kind: 'flexible',
    totalMinutes: d.minutes,
    sessionMinutes: d.whole ? d.minutes : Math.min(60, d.minutes),
    deadline: deadlineFor(d.when, d.date, today),
    isProject: d.asProject,
    ...extra,
  };
}

function toFavorite(d: Draft): Favorite {
  return { title: d.title, category: d.category, minutes: d.minutes, mode: d.mode, repeat: d.repeat, times: d.times, start: d.mode === 'fijo' ? d.start : undefined };
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
  initialText,
  defaultDate,
}: {
  /** texto escrito en la barra de Hoy: empezamos directamente por las preguntas */
  initialText?: string;
  /** día elegido en el calendario */
  defaultDate?: string;
  learned?: Record<string, CategoryId>;
  state: AppState;
  onFix: (taskId: string, fix: ConflictFix) => void;
  /** añade las tareas; devuelve dónde ha quedado cada una */
  onFinish: (tasks: NewTaskInput[], corrections: { title: string; category: CategoryId }[], favorites: Favorite[]) => CaptureResult[];
  onFullForm: () => void;
  onClose: () => void;
}) {
  const today = todayKey();
  const splitLines = (t: string) =>
    t
      .split(/\n+/)
      .map((l) => l.replace(/^\s*[-•*·\d.)]+\s*/, '').trim())
      .filter(Boolean);
  const [stage, setStage] = useState<'dump' | 'ask' | 'done'>(initialText ? 'ask' : 'dump');
  const [text, setText] = useState(initialText ?? '');
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    initialText ? splitLines(initialText).map((l) => toDraft(l, today, learned, state.favorites, defaultDate)) : [],
  );
  const [i, setI] = useState(0);
  const [results, setResults] = useState<CaptureResult[]>([]);

  const lines = splitLines(text);

  const start = () => {
    setDrafts(lines.map((l) => toDraft(l, today, learned, state.favorites, defaultDate)));
    setI(0);
    setStage('ask');
  };

  const d = drafts[i];
  const set = (patch: Partial<Draft>) => setDrafts((ds) => ds.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const ready = d && (d.mode === 'fijo' || d.repeat !== 'no' || !!d.when);
  const allFixed = drafts.every((x) => x.mode === 'fijo' && x.repeat === 'no');

  const finish = () => {
    const corrections = drafts.filter((x) => x.detected !== x.category).map((x) => ({ title: x.title, category: x.category }));
    setResults(onFinish(drafts.map((x) => toTask(x, today)), corrections, drafts.filter((x) => x.favorite).map(toFavorite)));
    setStage('done');
  };
  const favorites = state.favorites ?? [];

  if (stage === 'dump')
    return (
      <Sheet title={defaultDate ? `¿Qué tienes ${defaultDate === today ? 'hoy' : `el ${fmtShort(defaultDate).toLowerCase()}`}?` : '¿Qué tienes en mente?'} onClose={onClose}>
        <div className="how-strip" aria-hidden="true">
          <span>
            <Icon name="note" size={16} /> Escribe
          </span>
          <i>›</i>
          <span>
            <Icon name="spark" size={16} /> Te pregunto
          </span>
          <i>›</i>
          <span>
            <Icon name="calendar" size={16} /> Lo coloco
          </span>
        </div>
        <p className="muted">Una cita, una tarea, un proyecto, un hábito… Escribe una cosa por línea, como te salga.</p>
        <textarea
          autoFocus
          className="dump"
          rows={6}
          value={text}
          placeholder={
            defaultDate
              ? 'Dentista a las 17:00\nComprar el regalo de Ana\nCena con amigos de 21 a 23'
              : 'El sábado como con mis padres de 10 a 2\nTrabajar en las láminas de la tienda\nReclamar el vuelo\nQuedar con amigas 2 veces al mes'
          }
          onChange={(e) => setText(e.target.value)}
        />
        {!text && !defaultDate && (
          <div className="examples">
            <span className="muted small">Toca un ejemplo para probar:</span>
            <div className="chips">
              {ADD_EXAMPLES.map((e) => (
                <button key={e} type="button" className="chip example" onClick={() => setText(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {favorites.length > 0 && (
          <div className="favs">
            <span className="muted small fav-label"><Icon name="star" size={15} /> Tus favoritos</span>
            <div className="chips">
              {favorites.map((f) => (
                <button key={f.title} type="button" className="chip" onClick={() => setText((t) => (t.trim() ? `${t.trim()}\n${f.title}` : f.title))}>
                  <CatMark cat={f.category} title={f.title} /> {f.title}
                </button>
              ))}
            </div>
          </div>
        )}
        {lines.length > 0 && (
          <div className="dump-preview">
            {lines.map((l, k) => {
              const c = catById(detectCategory(l, learned) ?? 'gestiones');
              return (
                <span key={k} className="tag" style={{ background: `color-mix(in srgb, ${c.color} 22%, var(--surface))` }}>
                  <CatMark cat={c.id} /> {l.length > 28 ? `${l.slice(0, 28)}…` : l}
                </span>
              );
            })}
          </div>
        )}
        <button className="btn primary wide" disabled={!lines.length} onClick={start}>
          {lines.length > 1 ? `Continuar con ${lines.length} cosas` : 'Continuar'}
        </button>
        <button className="btn ghost wide" onClick={onFullForm}>
          Prefiero el formulario completo
        </button>
      </Sheet>
    );

  if (stage === 'done')
    return (
      <Sheet title="Hecho" onClose={onClose}>
        <div className="capture-results">
          {results.map((r, k) => (
            <div key={k} className="capture-result" style={{ '--cat': catById(r.category).color } as CSSProperties}>
              <CatIcon cat={r.category} title={r.title} size={40} />
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
        <CatIcon cat={cat.id} size={48} />
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
              <CatIcon cat={c.id} size={30} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>¿Cuándo es?</span>
        <div className="segmented two">
          <button className={d.mode === 'fijo' ? 'on' : ''} onClick={() => set({ mode: 'fijo' })}>
            Un día y hora concretos
          </button>
          <button className={d.mode === 'hueco' ? 'on' : ''} onClick={() => set({ mode: 'hueco' })}>
            Búscale un hueco
          </button>
        </div>
      </div>

      {d.mode === 'fijo' && (
        <>
          <div className="row2">
            <label className="field">
              <span>Día</span>
              <input type="date" value={d.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
            </label>
            <label className="field">
              <span>Empieza</span>
              <input type="time" value={minToHm(d.start)} onChange={(e) => e.target.value && set({ start: hmToMin(e.target.value) })} />
            </label>
          </div>
          <p className="fixed-summary cap">
            {fmtLong(d.date)} · {minToHm(d.start)}–{minToHm(d.start + d.minutes)}
          </p>
        </>
      )}

      <div className="field">
        <span>¿Se repite?</span>
        <div className="chips">
          {(
            [
              ['no', d.mode === 'fijo' ? 'No, solo ese día' : 'No, es una vez'],
              ['semana', d.mode === 'fijo' ? `Cada semana (${fmtLong(d.date).split(',')[0]})` : 'Cada semana'],
              ['mes', 'Cada mes'],
            ] as [Repeat, string][]
          ).map(([r, label]) => (
            <button key={r} className={`chip ${d.repeat === r ? 'on' : ''}`} onClick={() => set({ repeat: r, times: r === 'mes' ? 1 : r === 'semana' ? 2 : d.times })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {d.mode === 'hueco' && d.repeat === 'no' && (
        <div className="field">
          <span>¿Para cuándo tiene que estar?</span>
          <div className="chips">
            {WHEN.map((w) => (
              <button key={w.id} className={`chip ${d.when === w.id ? 'on' : ''}`} onClick={() => set({ when: w.id })}>
                {w.id === 'fecha' && d.when === 'fecha' ? fmtShort(d.date) : w.label}
              </button>
            ))}
          </div>
          {d.when === 'fecha' && <input type="date" value={d.date} min={today} onChange={(e) => e.target.value && set({ date: e.target.value })} />}
          {d.when && d.when !== 'sinprisa' && d.when !== 'fecha' && <small className="muted">Fecha límite: {fmtShort(deadlineFor(d.when, d.date, today)!)}</small>}
        </div>
      )}

      {d.mode === 'hueco' && d.repeat !== 'no' && (
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
        <span>{d.mode === 'fijo' ? '¿Cuánto dura?' : d.big && d.repeat === 'no' ? '¿Cuánto tiempo necesitas en total?' : '¿Cuánto tiempo te llevará?'}</span>
        <DurationPicker
          value={d.minutes}
          onChange={(minutes) => set({ minutes, asProject: d.asProject || (PROJECTISH.includes(d.category) && minutes > 60) })}
          options={d.big && d.repeat === 'no' && d.mode === 'hueco' ? [60, 120, 180, 300, 600, 1200, 2400] : [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240]}
        />
      </div>

      {d.mode === 'hueco' && d.repeat === 'no' && d.minutes > 60 && (
        <div className="field">
          <span>¿Cómo prefieres hacerlo?</span>
          <div className="chips">
            <button className={`chip ${!d.whole ? 'on' : ''}`} onClick={() => set({ whole: false })}>
              Por partes (sesiones de 1 h)
            </button>
            <button className={`chip ${d.whole ? 'on' : ''}`} onClick={() => set({ whole: true })}>
              Todo seguido en un día
            </button>
          </div>
        </div>
      )}

      {d.mode === 'hueco' && (
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

      <div className="ask-extras">
        {d.mode === 'hueco' && d.repeat === 'no' && (
          <label className={`toggle-card ${d.asProject ? 'on' : ''}`}>
            <input type="checkbox" checked={d.asProject} onChange={(e) => set({ asProject: e.target.checked })} />
            <span>
              <strong>Crear como proyecto</strong>
              <small>Con su propia página: progreso, pasos y notas.</small>
            </span>
          </label>
        )}
        <label className={`toggle-card ${d.favorite ? 'on' : ''}`}>
          <input type="checkbox" checked={d.favorite} onChange={(e) => set({ favorite: e.target.checked })} />
          <span>
            <strong>Guardar en favoritos</strong>
            <small>Para añadirlo otra vez de un toque.</small>
          </span>
        </label>
      </div>

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
            {allFixed ? 'Apuntar' : 'Organizar'}
          </button>
        )}
      </div>
      {!ready && <p className="muted small center">Dime para cuándo tiene que estar y sigo.</p>}
    </Sheet>
  );
}
