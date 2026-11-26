import { useState } from 'react';
import type { AppState, Session } from '../types';
import { catById } from '../types';
import { bedEff, dayLoad, energyFor, sessionsOn, type Interval } from '../lib/scheduler';
import { LEVEL_TEXT, tipsFor } from '../lib/tips';
import { addDays, fmtDuration, fmtLong, fmtMonth, fmtShort, fromKey, minToHm, monthKey, nowMinutes, pad, weekStart } from '../lib/time';
import { DayAgenda, type Block } from './DayAgenda';
import { DayStrip, StripLegend } from './DayStrip';

const WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function CalendarView({
  state,
  today,
  onComplete,
  onUndo,
  onTap,
  onTapTime,
  onTapGap,
  onDrop,
  onTapBlock,
}: {
  state: AppState;
  today: string;
  onComplete: (s: Session) => void;
  onUndo: (s: Session) => void;
  onTap: (s: Session) => void;
  onTapTime: (date: string, minute: number) => void;
  onTapGap: (date: string, gap: Interval) => void;
  onDrop: (s: Session, start: number) => void;
  onTapBlock: (date: string, b: Block, minute: number) => void;
}) {
  const [month, setMonth] = useState(monthKey(today));
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<'mes' | 'semana'>('mes');
  const [week, setWeek] = useState(weekStart(today));

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
      <div className="segmented two">
        <button className={mode === 'mes' ? 'on' : ''} onClick={() => setMode('mes')}>
          Mes
        </button>
        <button className={mode === 'semana' ? 'on' : ''} onClick={() => setMode('semana')}>
          Semana
        </button>
      </div>
      {mode === 'semana' ? (
        <WeekView state={state} week={week} setWeek={setWeek} today={today} selected={selected} onSelect={setSelected} />
      ) : (
      <>
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
      </>
      )}

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
        <DayAgenda
          state={state}
          date={selected}
          now={selected === today ? nowMinutes() : undefined}
          onTap={onTap}
          onToggle={(s) => (s.status === 'done' ? onUndo(s) : selected <= today ? onComplete(s) : onTap(s))}
          onTapTime={(m) => onTapTime(selected, m)}
          onTapGap={selected >= today ? (g) => onTapGap(selected, g) : undefined}
          onDrop={selected >= today ? onDrop : undefined}
          onTapBlock={(b, m) => onTapBlock(selected, b, m)}
        />
      </section>
    </div>
  );
}

/** Semana como agenda: cada día es una barra desde que te levantas hasta que te acuestas. */
function WeekView({
  state,
  week,
  setWeek,
  today,
  selected,
  onSelect,
}: {
  state: AppState;
  week: string;
  setWeek: (w: string) => void;
  today: string;
  selected: string;
  onSelect: (d: string) => void;
}) {
  const p = state.profile!;
  const from = p.wake;
  const to = bedEff(p);
  const span = Math.max(60, to - from);
  const pct = (m: number) => `${((Math.min(to, Math.max(from, m)) - from) / span) * 100}%`;
  const hours = Array.from({ length: Math.floor(span / 180) + 1 }, (_, i) => from + i * 180).filter((h) => h < to);
  return (
    <>
      <header className="cal-head">
        <button className="icon-btn" onClick={() => setWeek(addDays(week, -7))} aria-label="Semana anterior">
          ‹
        </button>
        <h1 className="cap week-title">
          {fmtShort(week).replace(/^\S+ /, '')} – {fmtShort(addDays(week, 6)).replace(/^\S+ /, '')}
        </h1>
        <button className="icon-btn" onClick={() => setWeek(addDays(week, 7))} aria-label="Semana siguiente">
          ›
        </button>
      </header>
      <div className="week">
        <div className="week-hours">
          {hours.map((h) => (
            <span key={h} style={{ left: pct(h) }}>
              {minToHm(h)}
            </span>
          ))}
        </div>
        {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((d) => {
          const load = dayLoad(state, d);
          return (
            <button key={d} className={`week-row ${d === selected ? 'sel' : ''} ${d === today ? 'today' : ''}`} onClick={() => onSelect(d)}>
              <span className="week-day">
                <strong>{WEEK[(new Date(fromKey(d)).getDay() + 6) % 7]}</strong>
                <span>{Number(d.slice(8))}</span>
                <i className={`lg ${load.level}`} />
              </span>
              <DayStrip state={state} date={d} now={d === today ? nowMinutes() : undefined} />
            </button>
          );
        })}
        <StripLegend />
      </div>
    </>
  );
}

