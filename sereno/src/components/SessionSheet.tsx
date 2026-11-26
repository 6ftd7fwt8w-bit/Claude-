import { useState, type CSSProperties } from 'react';
import type { AppState, Session } from '../types';
import { catById, taskColor } from '../types';
import { sessionsOn, stepsPlan } from '../lib/scheduler';
import { fmtDuration, fmtLong, minToHm } from '../lib/time';
import { sessionLabel } from './TodayView';
import { Sheet } from './ui';
import { CatIcon, CatMark } from './Icons';

/** Al tocar un bloque de la agenda: todo lo que se puede hacer con él. */
export function SessionSheet({
  state,
  session,
  today,
  onClose,
  onComplete,
  onUndo,
  onMove,
  onMoveTo,
  onMoveAfter,
  onPostpone,
  onPrepare,
  onEdit,
  onDuration,
  onNote,
  onToggleStep,
  onDelete,
}: {
  state: AppState;
  session: Session;
  today: string;
  onClose: () => void;
  onComplete: (s: Session) => void;
  onUndo: (s: Session) => void;
  onMove: (s: Session) => void;
  onMoveTo: (s: Session, start: number) => void;
  onMoveAfter: (s: Session, afterId: string) => void;
  onPostpone: (s: Session) => void;
  onPrepare: () => void;
  onEdit: () => void;
  onDuration: (s: Session, minutes: number) => void;
  onNote: (s: Session, note: string) => void;
  onToggleStep: (taskId: string, stepId: string) => void;
  onDelete: () => void;
}) {
  const task = state.tasks.find((t) => t.id === session.taskId);
  const c = catById(task?.category ?? 'bienestar');
  const done = session.status === 'done';
  const focus = task?.category === 'proyectos' || task?.category === 'trabajo';
  const [minutes, setMinutes] = useState(session.duration);
  const [note, setNote] = useState(session.note ?? '');
  const todaysSteps = task ? (stepsPlan(state, task.id, today).get(session.id) ?? []) : [];
  const others = sessionsOn(state.sessions, session.date).filter((x) => x.id !== session.id);
  const canChange = session.date >= today || done;
  const act = (fn: () => void) => () => {
    onClose();
    fn();
  };
  const close = () => {
    if (note !== (session.note ?? '')) onNote(session, note);
    if (minutes !== session.duration) onDuration(session, minutes);
    onClose();
  };
  return (
    <Sheet title={c.label} onClose={close}>
      <div className="ss-head" style={{ '--cat': taskColor(task) } as CSSProperties}>
        <CatIcon cat={task?.category ?? 'bienestar'} title={task?.title} color={taskColor(task)} size={46} />
        <div>
          <p className="h3">{task?.title}</p>
          <p className="muted small">
            <span className="cap">{fmtLong(session.date)}</span> · {minToHm(session.start)}–{minToHm(session.start + minutes)}
          </p>
          <p className="muted small">{sessionLabel(state, session)}</p>
        </div>
      </div>

      {canChange && (
        <div className="ss-row">
          <span className="ss-label">◷ {done ? 'Le dediqué' : 'Hoy le dedico'}</span>
          <div className="stepper">
            <button aria-label="15 minutos menos" onClick={() => setMinutes((m) => Math.max(5, m - 15))}>
              −
            </button>
            <strong>{fmtDuration(minutes)}</strong>
            <button aria-label="15 minutos más" onClick={() => setMinutes((m) => Math.min(600, m + 15))}>
              +
            </button>
          </div>
        </div>
      )}
      {minutes !== session.duration && task?.kind === 'flexible' && (
        <p className="muted small">
          {minutes < session.duration ? 'Lo que falte lo recolocaré otro día.' : 'Restaré ese tiempo de las próximas sesiones.'}
        </p>
      )}

      {todaysSteps.length > 0 && (
        <div className="ss-steps">
          <p className="ss-label">≡ Para esta sesión</p>
          {todaysSteps.map((st) => (
            <label key={st.id} className="step-row">
              <input type="checkbox" checked={!!st.done} onChange={() => task && onToggleStep(task.id, st.id)} />
              <span>{st.title}</span>
              {st.minutes ? <small className="muted">{fmtDuration(st.minutes)}</small> : null}
            </label>
          ))}
        </div>
      )}

      <label className="field">
        <span>✎ Nota para este día</span>
        <textarea className="note" rows={2} value={note} placeholder={focus ? 'Qué quiero hacer hoy de este proyecto…' : 'Algo que recordar…'} onChange={(e) => setNote(e.target.value)} />
      </label>

      <div className="ss-actions">
        {done ? (
          <button className="btn soft" onClick={act(() => onUndo(session))}>
            ↩︎ Marcar como pendiente
          </button>
        ) : (
          session.date <= today && (
            <button
              className="btn primary"
              onClick={() => {
                if (note !== (session.note ?? '')) onNote(session, note);
                if (minutes !== session.duration) onDuration(session, minutes);
                onClose();
                onComplete({ ...session, duration: minutes });
              }}
            >
              ✓ Hecho{minutes !== session.duration ? ` (${fmtDuration(minutes)})` : ''}
            </button>
          )
        )}
        {!done && focus && (
          <button className="btn soft" onClick={act(onPrepare)}>
            ○ Prepárate (respirar 1 min)
          </button>
        )}
        {!done && session.date >= today && (
          <>
            <div className="ss-move">
              <button className="btn soft" onClick={act(() => onMoveTo(session, session.start - 15))}>
                ↑ 15 min antes
              </button>
              <button className="btn soft" onClick={act(() => onMoveTo(session, session.start + 15))}>
                ↓ 15 min después
              </button>
            </div>
            {others.length > 0 && (
              <details className="more">
                <summary>Ponerlo justo después de…</summary>
                <div className="chips">
                  {others.map((o) => {
                    const t = state.tasks.find((x) => x.id === o.taskId);
                    return (
                      <button key={o.id} className="chip" onClick={act(() => onMoveAfter(session, o.id))}>
                        <CatMark cat={t?.category ?? 'bienestar'} /> {t?.title} ({minToHm(o.start + o.duration)})
                      </button>
                    );
                  })}
                </div>
              </details>
            )}
            <button className="btn soft" onClick={act(() => onMove(session))}>
              ◷ Mover a otro día u hora
            </button>
            <button className="btn soft" onClick={act(() => onPostpone(session))}>
              {task?.kind === 'evento' ? 'Quitar del calendario' : 'Hoy no puedo (recolócalo)'}
            </button>
          </>
        )}
        {task && (
          <button className="btn ghost" onClick={act(onEdit)}>
            ✎ Editar la tarea{task.kind === 'flexible' ? ', sus notas y pasos' : ''}
          </button>
        )}
        {task && (
          <button className="btn ghost danger" onClick={act(onDelete)}>
            Eliminar {task.kind === 'evento' ? 'este evento' : task.kind === 'habito' ? 'esta tarea (todas las veces)' : 'esta tarea'}
          </button>
        )}
      </div>
    </Sheet>
  );
}
