import { useState } from 'react';
import type { AppState, Session } from '../types';
import { freeWindows, sessionsOn } from '../lib/scheduler';
import { addDays, fmtRelative, hmToMin, minToHm } from '../lib/time';
import { Sheet } from './ui';

/** Mover una sesión a mano: elige día y hora (con los huecos libres de ese día como sugerencia). */
export function MoveSheet({
  state,
  session,
  today,
  onMove,
  onClose,
}: {
  state: AppState;
  session: Session;
  today: string;
  onMove: (date: string, start: number) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(session.date < today ? today : session.date);
  const [start, setStart] = useState(session.start);
  const task = state.tasks.find((t) => t.id === session.taskId);
  const others = state.sessions.filter((x) => x.id !== session.id);
  const windows = state.profile
    ? freeWindows(state.profile, date, others).filter((w) => w.end - w.start >= session.duration)
    : [];
  const quick = [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(today, n));
  return (
    <Sheet title={`Mover «${task?.title ?? ''}»`} onClose={onClose}>
      <div className="chips">
        {quick.map((d) => (
          <button key={d} className={`chip ${d === date ? 'on' : ''}`} onClick={() => setDate(d)}>
            {fmtRelative(d, today).replace(/^el /, '')}
            <small className="muted"> · {sessionsOn(others, d).length}</small>
          </button>
        ))}
      </div>
      <div className="row2">
        <label className="field">
          <span>Día</span>
          <input type="date" value={date} min={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Hora</span>
          <input type="time" value={minToHm(start)} onChange={(e) => e.target.value && setStart(hmToMin(e.target.value))} />
        </label>
      </div>
      <div className="field">
        <span>Huecos libres ese día</span>
        {windows.length === 0 && <p className="muted small">Ese día no queda un hueco tan largo, pero puedes ponerlo igualmente.</p>}
        <div className="chips">
          {windows.map((w) => (
            <button key={w.start} className={`chip ${start >= w.start && start < w.end ? 'on' : ''}`} onClick={() => setStart(Math.ceil(w.start / 15) * 15)}>
              {minToHm(w.start)}–{minToHm(w.end)}
            </button>
          ))}
        </div>
      </div>
      <button className="btn primary wide" onClick={() => onMove(date, start)}>
        Mover aquí •
      </button>
      <p className="muted small center">Lo que muevas a mano queda fijado: no lo recolocaré yo.</p>
    </Sheet>
  );
}
