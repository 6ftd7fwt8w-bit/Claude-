import type { CSSProperties } from 'react';
import type { AppState, Session } from '../types';
import { catById } from '../types';
import { bedEff, breaksFor, complement, isRemote, sessionsOn, workHours, type Interval } from '../lib/scheduler';
import { fmtDuration, minToHm } from '../lib/time';

const HOUR = 64; // px por hora

interface Block extends Interval {
  label: string;
  kind: 'routine' | 'work' | 'commute' | 'pause' | 'meal' | 'relax';
}

/** Bloques fijos del día según la rutina (lo que en Google Calendar serían tus eventos de siempre) */
function baseBlocks(state: AppState, date: string): Block[] {
  const p = state.profile!;
  const out: Block[] = [{ start: p.wake, end: p.wake + p.morningRoutine, label: '🌅 Despertar y arrancar', kind: 'routine' }];
  const w = workHours(p, date);
  if (w) {
    const remote = isRemote(p, date);
    if (!remote && p.commute) {
      out.push({ start: w.start - p.commute, end: w.start, label: '🚆 Trayecto', kind: 'commute' });
      out.push({ start: w.end, end: w.end + p.commute, label: '🚆 Trayecto', kind: 'commute' });
    }
    const breaks = breaksFor(p, date).map((b) => ({ start: b.start, end: b.start + b.duration }));
    for (const piece of complement(breaks, w.start, w.end)) {
      out.push({ ...piece, label: remote ? '🏠 Teletrabajo' : '💼 Trabajo', kind: 'work' });
    }
    for (const b of breaks) out.push({ ...b, label: '☕ Pausa', kind: 'pause' });
  }
  out.push({ start: p.lunch, end: p.lunch + p.lunchDuration, label: '🥗 Comida', kind: 'meal' });
  out.push({ start: p.dinner, end: p.dinner + p.dinnerDuration, label: '🍽️ Cena', kind: 'meal' });
  const bed = bedEff(p);
  out.push({ start: bed - p.relaxMinutes, end: bed, label: '🌙 Desconexión', kind: 'relax' });
  return out.filter((b) => b.end > b.start).sort((a, b) => a.start - b.start);
}

/** Columnas para sesiones que se solapan (como hace Google Calendar) */
function layout(sessions: Session[]): Map<string, { col: number; cols: number }> {
  const sorted = [...sessions].sort((a, b) => a.start - b.start || b.duration - a.duration);
  const out = new Map<string, { col: number; cols: number }>();
  let group: Session[] = [];
  let groupEnd = -1;
  const flush = () => {
    const ends: number[] = [];
    const cols = new Map<string, number>();
    for (const s of group) {
      let c = ends.findIndex((e) => e <= s.start);
      if (c < 0) c = ends.length;
      ends[c] = s.start + s.duration;
      cols.set(s.id, c);
    }
    for (const s of group) out.set(s.id, { col: cols.get(s.id)!, cols: ends.length });
    group = [];
  };
  for (const s of sorted) {
    if (s.start >= groupEnd && group.length) flush();
    group.push(s);
    groupEnd = Math.max(groupEnd, s.start + s.duration);
  }
  if (group.length) flush();
  return out;
}

export function DayAgenda({
  state,
  date,
  now,
  onTap,
  onToggle,
}: {
  state: AppState;
  date: string;
  /** minutos actuales si la fecha es hoy */
  now?: number;
  onTap: (s: Session) => void;
  onToggle: (s: Session) => void;
}) {
  const p = state.profile!;
  const tasks = new Map(state.tasks.map((t) => [t.id, t]));
  const sessions = sessionsOn(state.sessions, date);
  const blocks = baseBlocks(state, date);
  const from = Math.floor(Math.min(p.wake, ...sessions.map((s) => s.start)) / 60) * 60;
  const to = Math.min(1440, Math.ceil(Math.max(bedEff(p), ...sessions.map((s) => s.start + s.duration)) / 60) * 60);
  const y = (m: number) => ((m - from) / 60) * HOUR;
  const hours = Array.from({ length: (to - from) / 60 + 1 }, (_, i) => from + i * 60);
  // huecos libres de verdad (sin rutina ni tus cosas)
  const free = complement([...blocks, ...sessions.map((s) => ({ start: s.start, end: s.start + s.duration }))], from, to).filter(
    (f) => f.end - f.start >= 30,
  );
  const cols = layout(sessions);

  return (
    <div className="agenda" style={{ height: y(to) + 8 }}>
      {hours.map((h) => (
        <div key={h} className="ag-hour" style={{ top: y(h) }}>
          <span>{minToHm(h)}</span>
        </div>
      ))}
      {blocks.map((b, k) => (
        <div key={`b${k}`} className={`ag-block ${b.kind}`} style={{ top: y(b.start), height: Math.max(14, y(b.end) - y(b.start)) }}>
          {y(b.end) - y(b.start) >= 18 && (
            <span>
              {b.label} <small>{minToHm(b.start)}–{minToHm(b.end)}</small>
            </span>
          )}
        </div>
      ))}
      {free.map((f) => (
        <div key={`f${f.start}`} className="ag-free" style={{ top: y(f.start) + 2, height: y(f.end) - y(f.start) - 4 }}>
          <span>
            🌿 Libre · {minToHm(f.start)}–{minToHm(f.end)} <small>({fmtDuration(f.end - f.start)})</small>
          </span>
        </div>
      ))}
      {sessions.map((s) => {
        const t = tasks.get(s.taskId);
        const c = catById(t?.category ?? 'bienestar');
        const { col, cols: n } = cols.get(s.id)!;
        const h = Math.max(26, y(s.start + s.duration) - y(s.start) - 2);
        const done = s.status === 'done';
        return (
          <div
            key={s.id}
            className={`ag-event ${done ? 'done' : ''} ${h < 44 ? 'tiny' : ''}`}
            style={{ top: y(s.start) + 1, height: h, left: `calc(var(--gutter) + (100% - var(--gutter)) * ${col / n})`, width: `calc((100% - var(--gutter)) / ${n} - 4px)`, '--cat': c.color } as CSSProperties}
          >
            <button className="ag-main" onClick={() => onTap(s)}>
              <span className="ag-title">
                {t?.icon ?? c.emoji} {t?.title}
              </span>
              <span className="ag-time">
                {minToHm(s.start)}–{minToHm(s.start + s.duration)}
              </span>
            </button>
            <button className={`ag-check ${done ? 'on' : ''}`} aria-label={done ? 'Marcar como pendiente' : 'Marcar como hecho'} onClick={() => onToggle(s)}>
              {done ? '✓' : ''}
            </button>
          </div>
        );
      })}
      {now != null && now >= from && now <= to && (
        <div className="ag-now" style={{ top: y(now) }}>
          <span />
        </div>
      )}
    </div>
  );
}
