import { useState } from 'react';
import type { AppState, Session } from '../types';
import { catById } from '../types';
import { dayLoad, energyFor, sessionsOn } from '../lib/scheduler';
import { LEVEL_TEXT, tipsFor } from '../lib/tips';
import { addDays, fmtDuration, fmtLong, fmtMonth, fromKey, monthKey, pad, weekStart } from '../lib/time';
import { SessionCard } from './TodayView';

const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function CalendarView({
  state,
  today,
  onComplete,
  onUndo,
  onPostpone,
}: {
  state: AppState;
  today: string;
  onComplete: (s: Session) => void;
  onUndo: (s: Session) => void;
  onPostpone: (s: Session) => void;
}) {
  const [month, setMonth] = useState(monthKey(today));
  const [selected, setSelected] = useState(today);

  const first = `${month}-01`;
  const gridStart = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const lastRowNeeded = cells.findIndex((d, i) => i % 7 === 0 && monthKey(d) > month);
  const visible = lastRowNeeded > 0 ? cells.slice(0, lastRowNeeded) : cells;

  const shift = (n: number) => {
    const d = fromKey(first);
    d.setMonth(d.getMonth() + n);
    setMonth(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };

  const taskCat = new Map(state.tasks.map((t) => [t.id, t.category]));
  const sel = dayLoad(state, selected);
  const selSessions = sessionsOn(state.sessions, selected);

  return (
    <div className="view">
      <header className="cal-head">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <h1 className="cap">{fmtMonth(month)}</h1>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Mes siguiente">
          ›
        </button>
      </header>

      <div className="cal-grid">
        {WEEK.map((w) => (
          <div key={w} className="cal-wd">
            {w}
          </div>
        ))}
        {visible.map((d) => {
          const inMonth = monthKey(d) === month;
          const load = dayLoad(state, d);
          const cats = [...new Set(sessionsOn(state.sessions, d).map((s) => taskCat.get(s.taskId)))].slice(0, 4);
          return (
            <button
              key={d}
              className={`cal-day ${load.level} ${inMonth ? '' : 'out'} ${d === today ? 'today' : ''} ${d === selected ? 'sel' : ''} ${d < today ? 'past' : ''}`}
              onClick={() => setSelected(d)}
              aria-label={`${fmtLong(d)}: ${LEVEL_TEXT[load.level]}`}
            >
              <span className="num">{Number(d.slice(8))}</span>
              <span className="dots">
                {cats.map((c) => c && <i key={c} style={{ background: catById(c).color }} />)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="legend">
        <span><i className="lg libre" /> Libre</span>
        <span><i className="lg verde" /> Tranquilo</span>
        <span><i className="lg naranja" /> Con ritmo</span>
        <span><i className="lg rojo" /> Intenso</span>
      </div>

      <section className="card day-detail">
        <p className="eyebrow cap">{fmtLong(selected)}</p>
        <p className={`level-chip ${sel.level}`}>
          {LEVEL_TEXT[sel.level]} · {fmtDuration(sel.planned)} de {fmtDuration(sel.capacity)} disponibles · energía {energyFor(state, selected)}%
        </p>
        {tipsFor(state, selected, today).slice(0, 1).map((t) => (
          <p key={t.text} className="tip-inline">
            {t.icon} {t.text}
          </p>
        ))}
        {selSessions.length === 0 && <p className="muted">Nada planeado. Espacio para respirar 🌿</p>}
        <div className="timeline">
          {selSessions.map((s) => (
            <SessionCard
              key={s.id}
              state={state}
              s={s}
              onComplete={selected <= today ? onComplete : undefined}
              onUndo={onUndo}
              onPostpone={selected >= today ? onPostpone : undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
