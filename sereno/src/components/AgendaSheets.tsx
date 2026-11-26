import { useState } from 'react';
import type { CategoryId } from '../types';
import { catById } from '../types';
import { gapCandidates, type Interval, type NewTaskInput } from '../lib/scheduler';
import type { AppState } from '../types';
import { detectCategory } from '../lib/parse';
import { HOBBY_SUGGESTIONS } from '../lib/suggestions';
import { fmtDuration, fmtLong, fmtRelative, hmToMin, minToHm } from '../lib/time';
import { currentCtx } from '../store';
import { CategoryPicker, DurationPicker, Sheet } from './ui';

/** Tocar una hora de la agenda: añadir algo justo ahí (una cita, un paseo durante una reunión…) */
export function AddAtSheet({
  date,
  start: initialStart,
  learned,
  maxMinutes,
  onAdd,
  onClose,
}: {
  date: string;
  start: number;
  learned?: Record<string, CategoryId>;
  maxMinutes?: number;
  onAdd: (t: NewTaskInput) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(initialStart);
  const [minutes, setMinutes] = useState(Math.min(maxMinutes ?? 30, 30));
  const [category, setCategory] = useState<CategoryId | null>(null);
  const detected = detectCategory(title, learned) ?? 'gestiones';
  const cat = category ?? detected;
  const add = () => title.trim() && onAdd({ title: title.trim(), category: cat, kind: 'evento', totalMinutes: minutes, date, start });
  return (
    <Sheet title={`Añadir a las ${minToHm(start)}`} onClose={onClose}>
      <p className="muted small cap">{fmtLong(date)}</p>
      <label className="field">
        <span>¿Qué es?</span>
        <input autoFocus value={title} placeholder="Ej.: Dentista, caminar durante la reunión…" onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      </label>
      {title.trim() && (
        <p className="small">
          Lo pongo en <strong>{catById(cat).emoji} {catById(cat).label}</strong>
        </p>
      )}
      <div className="row2">
        <label className="field">
          <span>Hora</span>
          <input type="time" value={minToHm(start)} onChange={(e) => e.target.value && setStart(hmToMin(e.target.value))} />
        </label>
      </div>
      <div className="field">
        <span>Duración</span>
        <DurationPicker value={minutes} onChange={setMinutes} />
      </div>
      <details className="more">
        <summary>Cambiar tipo</summary>
        <CategoryPicker value={cat} onChange={setCategory} />
      </details>
      <button className="btn primary wide" disabled={!title.trim()} onClick={add}>
        Añadir {fmtDuration(minutes)} a las {minToHm(start)}
      </button>
    </Sheet>
  );
}

/** Tocar un hueco libre: adelantar algo pendiente o dedicarlo a una afición */
export function FillGapSheet({
  state,
  date,
  gap,
  onPull,
  onAdd,
  onOther,
  onClose,
}: {
  state: AppState;
  date: string;
  gap: Interval;
  onPull: (sessionId: string) => void;
  onAdd: (t: NewTaskInput) => void;
  onOther: () => void;
  onClose: () => void;
}) {
  const length = gap.end - gap.start;
  const ctx = currentCtx();
  const candidates = gapCandidates(state, date, gap.start, length, ctx);
  const [minutes, setMinutes] = useState(Math.min(60, length));
  return (
    <Sheet title="¿Qué hacemos en este hueco?" onClose={onClose}>
      <p className="gap-range">
        {minToHm(gap.start)}–{minToHm(gap.end)} · {fmtDuration(length)} libres
      </p>

      {candidates.length > 0 && (
        <div className="pd-section">
          <p className="h3">Adelantar algo pendiente</p>
          <div className="gap-list">
            {candidates.map(({ session, task }) => (
              <button key={session.id} className="gap-item" onClick={() => onPull(session.id)}>
                <span className="cr-icon">{catById(task.category).emoji}</span>
                <span className="grow">
                  <strong>{task.title}</strong>
                  <span className="muted small">
                    {fmtDuration(session.duration)} · ahora {fmtRelative(session.date, ctx.today)} a las {minToHm(session.start)}
                    {task.deadline ? ` · para ${fmtRelative(task.deadline, ctx.today)}` : ''}
                  </span>
                </span>
                <span className="chev">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pd-section">
        <p className="h3">Una afición o algo para ti</p>
        <div className="field">
          <span>Durante</span>
          <DurationPicker value={minutes} onChange={setMinutes} options={[10, 15, 20, 30, 45, 60, 90, 120].filter((m) => m <= length)} />
        </div>
        <div className="hobbies">
          {HOBBY_SUGGESTIONS.map((h) => (
            <button
              key={h.title}
              className="hobby"
              onClick={() => onAdd({ title: h.title, category: h.category, kind: 'evento', totalMinutes: Math.min(minutes, length), date, start: gap.start, icon: h.icon } as NewTaskInput)}
            >
              <span>{catById(h.category).emoji}</span>
              {h.title}
            </button>
          ))}
        </div>
      </div>

      <button className="btn soft wide" onClick={onOther}>
        ✎ Otra cosa…
      </button>
    </Sheet>
  );
}
