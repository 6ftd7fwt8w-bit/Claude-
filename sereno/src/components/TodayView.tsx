import { useState, type CSSProperties } from 'react';
import type { AppState, Session } from '../types';
import { catById, taskColor } from '../types';
import { energyFor, sessionsOn, type Interval } from '../lib/scheduler';
import { phraseOfDay } from '../lib/phrases';
import { timesLabel } from '../lib/suggestions';
import type { Tip } from '../lib/tips';
import { fmtDuration, fmtLong, minToHm, nowMinutes } from '../lib/time';
import { energyEmoji } from './EnergyCheck';
import { Ring } from './ui';
import { DayAgenda, freeGaps } from './DayAgenda';
import { mindIndex } from '../lib/mind';

interface Props {
  state: AppState;
  today: string;
  onComplete: (s: Session) => void;
  onUndo: (s: Session) => void;
  onPostpone: (s: Session) => void;
  onMove: (s: Session) => void;
  onJournal: (text: string) => void;
  onEnergy: () => void;
  onPull: () => void;
  onTipAction: (t: Tip) => void;
  onBreathe: () => void;
  onRecharge: (sessionId: string) => void;
  onOpenMind: () => void;
  onTap: (s: Session) => void;
  onTapTime: (minute: number) => void;
  onTapGap: (gap: Interval) => void;
  onDrop: (s: Session, start: number) => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

export function sessionLabel(state: AppState, s: Session): string {
  const task = state.tasks.find((t) => t.id === s.taskId);
  if (!task) return '';
  if (task.kind === 'flexible') {
    const all = state.sessions
      .filter((x) => x.taskId === task.id)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
    return `Sesión ${all.findIndex((x) => x.id === s.id) + 1} de ${all.length}`;
  }
  if (task.kind === 'habito') return `${task.routine ? 'Cotidiana' : 'Hábito'} · ${timesLabel(task.timesPerWeek ?? 1, task.days, task.timesPerMonth)}`;
  return 'Con hora fija';
}

export function SessionCard({
  state,
  s,
  onComplete,
  onUndo,
  onPostpone,
  onMove,
  onPrepare,
  compact,
}: {
  state: AppState;
  s: Session;
  onComplete?: (s: Session) => void;
  onUndo?: (s: Session) => void;
  onPostpone?: (s: Session) => void;
  onMove?: (s: Session) => void;
  onPrepare?: () => void;
  compact?: boolean;
}) {
  const task = state.tasks.find((t) => t.id === s.taskId);
  const cat = catById(task?.category ?? 'bienestar');
  const done = s.status === 'done';
  return (
    <div className={`session ${done ? 'done' : ''}`} style={{ '--cat': taskColor(task) } as CSSProperties}>
      <div className="session-time">
        <strong>{minToHm(s.start)}</strong>
        <span>{fmtDuration(s.duration)}</span>
      </div>
      <div className="session-body">
        <div className="session-title">
          {task?.title ?? '—'}
          {s.pinned && <span title="Colocada a mano"> 📌</span>}
          {task?.source && <span title="De tu calendario"> 📅</span>}
        </div>
        <div className="session-meta">
          <span className="cat-dot" /> {cat.emoji} {cat.label}
          {!compact && <span className="muted"> · {sessionLabel(state, s)}</span>}
        </div>
        {!done && (onPostpone || onMove) && (
          <div className="session-actions">
            {onPostpone && (
              <button className="link" onClick={() => onPostpone(s)}>
                {task?.kind === 'evento' ? 'Quitar' : 'Hoy no puedo'}
              </button>
            )}
            {onMove && (
              <button className="link muted-link" onClick={() => onMove(s)}>
                Mover
              </button>
            )}
            {onPrepare && (task?.category === 'proyectos' || task?.category === 'trabajo') && (
              <button className="link prepare-link" onClick={onPrepare}>
                🫧 Prepárate
              </button>
            )}
          </div>
        )}
      </div>
      {onComplete && (
        <button
          className={`check ${done ? 'on' : ''}`}
          aria-label={done ? 'Marcar como pendiente' : 'Marcar como hecho'}
          onClick={() => (done ? onUndo?.(s) : onComplete(s))}
        >
          {done ? '✓' : ''}
        </button>
      )}
    </div>
  );
}

/** Resumen compacto: lo hecho, lo libre que te queda (lo mismo que ves en la agenda) y tu mente. */
function TodaySummary({
  state,
  today,
  done,
  total,
  onOpenMind,
}: {
  state: AppState;
  today: string;
  done: number;
  total: number;
  onOpenMind: () => void;
}) {
  const [help, setHelp] = useState(false);
  const left = freeGaps(state, today, Math.ceil(nowMinutes() / 15) * 15).reduce((a, g) => a + g.end - g.start, 0);
  const m = mindIndex(state, today);
  return (
    <section className="card summary-card">
      <div className="summary-row">
        <Ring value={total ? done / total : 0} label="Progreso de hoy" size={58} />
        <div className="grow">
          <p className="h3">{total === 0 ? 'Nada planificado hoy' : `${done} de ${total} hechas`}</p>
          <button className="summary-free" onClick={() => setHelp((h) => !h)} aria-expanded={help}>
            🌿 {left ? `Te quedan ${fmtDuration(left)} libres` : 'Hoy ya no quedan huecos libres'} <span className="info">ⓘ</span>
          </button>
        </div>
        <button className="mind-pill" onClick={onOpenMind} aria-label="Ver tu mente hoy">
          <strong>{m.score}</strong>
          <span>mente</span>
        </button>
      </div>
      {help && (
        <p className="budget-help">
          Es la suma de los huecos marcados como <strong>«Libre»</strong> en tu agenda (de 30 min o más), desde ahora hasta
          que empieza tu desconexión. Toca cualquier hueco libre para llenarlo con algo.
        </p>
      )}
    </section>
  );
}

export function TodayView(props: Props) {
  const { state, today } = props;
  const p = state.profile!;
  const tasks = new Map(state.tasks.map((t) => [t.id, t]));
  const sessions = sessionsOn(state.sessions, today);
  const routines = sessions.filter((s) => tasks.get(s.taskId)?.routine);
  const main = sessions.filter((s) => !tasks.get(s.taskId)?.routine);
  const done = sessions.filter((s) => s.status === 'done').length;
  const energy = energyFor(state, today);
  const declared = state.energy[today] != null;


  return (
    <div className="view">
      <header className="today-head">
        <div>
          <p className="eyebrow">{fmtLong(today)}</p>
          <h1>
            {greeting()}
            {p.name ? `, ${p.name}` : ''}
          </h1>
        </div>
        <button className={`energy-pill ${declared ? '' : 'pulse'}`} onClick={props.onEnergy} aria-label="Cambiar energía de hoy">
          {energyEmoji(energy)} {energy}%
        </button>
      </header>

      <section className="phrase-card">
        <span className="quote">“</span>
        <p>{phraseOfDay(today)}</p>
      </section>

      <TodaySummary state={state} today={today} done={done} total={sessions.length} onOpenMind={props.onOpenMind} />

      <div className="agenda-head">
        <h2 className="section-title">Tu agenda</h2>
        <span className="muted small">Toca una hora para añadir · ⠿ para arrastrar</span>
      </div>
      {main.length === 0 && routines.length === 0 && (
        <p className="empty small-empty">
          Hoy no tienes nada planificado: disfruta 🌿 Pulsa <strong>+</strong> para contarme qué tienes en la cabeza.
        </p>
      )}
      <div className="card agenda-card">
        <DayAgenda
          state={state}
          date={today}
          now={nowMinutes()}
          onTap={props.onTap}
          onToggle={(s) => (s.status === 'done' ? props.onUndo(s) : props.onComplete(s))}
          onTapTime={props.onTapTime}
          onTapGap={props.onTapGap}
          onDrop={props.onDrop}
        />
      </div>

      <div className="quick-row">
        <button className="btn soft" onClick={props.onPull}>
          ⏳ Tengo un hueco, ¿qué adelanto?
        </button>
        <button className="btn soft" onClick={props.onBreathe}>
          🫧 Respirar
        </button>
      </div>

      {(new Date().getHours() >= 17 || state.journal[today]) && (
        <JournalCard key={today} initial={state.journal[today] ?? ''} onSave={props.onJournal} />
      )}
    </div>
  );
}

function JournalCard({ initial, onSave }: { initial: string; onSave: (t: string) => void }) {
  const [text, setText] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  return (
    <section className="card journal">
      <p className="h3">🌙 Antes de dormir</p>
      {editing ? (
        <>
          <p className="muted small">¿Qué te ha hecho bien hoy? Una cosa pequeña basta.</p>
          <textarea value={text} rows={2} placeholder="Hoy agradezco…" onChange={(e) => setText(e.target.value)} />
          <button
            className="btn primary"
            disabled={!text.trim()}
            onClick={() => {
              onSave(text);
              setEditing(false);
            }}
          >
            Guardar en mi diario
          </button>
        </>
      ) : (
        <p className="journal-text" onClick={() => setEditing(true)}>
          “{text}”
        </p>
      )}
    </section>
  );
}

