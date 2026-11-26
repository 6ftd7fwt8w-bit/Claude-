import type { CSSProperties } from 'react';
import type { AppState, Session } from '../types';
import { catById } from '../types';
import { fmtDuration, fmtLong, minToHm } from '../lib/time';
import { sessionLabel } from './TodayView';
import { Sheet } from './ui';

/** Al tocar un bloque de la agenda: todo lo que se puede hacer con él. */
export function SessionSheet({
  state,
  session,
  today,
  onClose,
  onComplete,
  onUndo,
  onMove,
  onPostpone,
  onPrepare,
  onEdit,
}: {
  state: AppState;
  session: Session;
  today: string;
  onClose: () => void;
  onComplete: (s: Session) => void;
  onUndo: (s: Session) => void;
  onMove: (s: Session) => void;
  onPostpone: (s: Session) => void;
  onPrepare: () => void;
  onEdit: () => void;
}) {
  const task = state.tasks.find((t) => t.id === session.taskId);
  const c = catById(task?.category ?? 'bienestar');
  const done = session.status === 'done';
  const focus = task?.category === 'proyectos' || task?.category === 'trabajo';
  const act = (fn: () => void) => () => {
    onClose();
    fn();
  };
  return (
    <Sheet title={c.label} onClose={onClose}>
      <div className="ss-head" style={{ '--cat': c.color } as CSSProperties}>
        <span className="ss-icon">{task?.icon ?? c.emoji}</span>
        <div>
          <p className="h3">{task?.title}</p>
          <p className="muted small">
            <span className="cap">{fmtLong(session.date)}</span> · {minToHm(session.start)}–{minToHm(session.start + session.duration)} (
            {fmtDuration(session.duration)})
          </p>
          <p className="muted small">
            {c.label} · {sessionLabel(state, session)}
          </p>
        </div>
      </div>
      <div className="ss-actions">
        {done ? (
          <button className="btn soft" onClick={act(() => onUndo(session))}>
            ↩︎ Marcar como pendiente
          </button>
        ) : (
          session.date <= today && (
            <button className="btn primary" onClick={act(() => onComplete(session))}>
              ✓ Hecho
            </button>
          )
        )}
        {!done && focus && (
          <button className="btn soft" onClick={act(onPrepare)}>
            🫧 Prepárate (respirar 1 min)
          </button>
        )}
        {!done && session.date >= today && (
          <button className="btn soft" onClick={act(() => onMove(session))}>
            🕐 Mover a otra hora o día
          </button>
        )}
        {!done && session.date >= today && (
          <button className="btn soft" onClick={act(() => onPostpone(session))}>
            {task?.kind === 'evento' ? '🗑 Quitar del calendario' : '🌿 Hoy no puedo (recolócalo)'}
          </button>
        )}
        {task && (
          <button className="btn ghost" onClick={act(onEdit)}>
            ✏️ Editar la tarea
          </button>
        )}
      </div>
    </Sheet>
  );
}
