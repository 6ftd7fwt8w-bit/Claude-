import { useState, type CSSProperties } from 'react';
import type { AppState, Session } from '../types';
import { catById } from '../types';
import { dayBudget, energyFor, sessionsOn, type DayBudget } from '../lib/scheduler';
import { phraseOfDay } from '../lib/phrases';
import { timesLabel } from '../lib/suggestions';
import { LEVEL_TEXT, tipsFor, type Tip } from '../lib/tips';
import { fmtDuration, fmtLong, minToHm, nowMinutes } from '../lib/time';
import { energyEmoji } from './EnergyCheck';
import { Ring } from './ui';
import { DayAgenda } from './DayAgenda';
import { MindCard } from './MindCard';

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
    <div className={`session ${done ? 'done' : ''}`} style={{ '--cat': cat.color } as CSSProperties}>
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

const LEVEL_HELP: Record<string, string> = {
  libre: 'Hoy no tienes nada: el día es para ti.',
  verde: 'Vas por debajo de lo recomendado: margen de sobra.',
  naranja: 'Cerca de lo recomendado: día con ritmo, pero llevable.',
  rojo: 'Por encima de lo recomendado. Si puedes, mueve algo con «Hoy no puedo».',
};

function BudgetCard({ b, done, total }: { b: DayBudget; done: number; total: number }) {
  const [open, setOpen] = useState(false);
  const pct = (m: number) => `${Math.min(100, (m / Math.max(1, b.free)) * 100)}%`;
  return (
    <section className="card budget">
      <div className="budget-top">
        <Ring value={total ? done / total : 0} label="Progreso de hoy" />
        <div className="grow">
          <p className="h3">{total === 0 ? 'Nada asignado hoy' : `${done} de ${total} hechas`}</p>
          <button className={`level-chip ${b.level}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {LEVEL_TEXT[b.level]} <span className="info">ⓘ</span>
          </button>
        </div>
      </div>
      <div className="budget-bar" aria-hidden="true">
        <span className="seg done" style={{ width: pct(b.done) }} />
        <span className="seg pending" style={{ width: pct(b.pending) }} />
        <span className="reco" style={{ left: pct(b.recommended) }} />
      </div>
      <div className="budget-nums">
        <div>
          <strong>{fmtDuration(b.free)}</strong>
          <span>libres hoy</span>
        </div>
        <div>
          <strong>{fmtDuration(b.used)}</strong>
          <span>ocupadas</span>
        </div>
        <div>
          <strong>{fmtDuration(b.left)}</strong>
          <span>te quedan</span>
        </div>
      </div>
      {open && (
        <p className="budget-help">
          <strong>Libres hoy</strong> es lo que te queda tras dormir, tu rutina, trabajar, comer y desconectar.{' '}
          Con tu energía de hoy ({b.energy}%) te recomiendo ocupar como mucho <strong>{fmtDuration(b.recommended)}</strong>{' '}
          (la rayita de la barra), para que siempre te quede aire. {LEVEL_HELP[b.level]}
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
  const budget = dayBudget(state, today);
  const tips = tipsFor(state, today, today);
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

      <MindCard state={state} today={today} onRecharge={props.onRecharge} onOpen={props.onOpenMind} />

      <BudgetCard b={budget} done={done} total={sessions.length} />

      {routines.length > 0 && (
        <section className="card routines-today">
          <p className="h3">Lo de cada día</p>
          <div className="routine-chips">
            {routines.map((s) => {
              const t = tasks.get(s.taskId)!;
              const on = s.status === 'done';
              return (
                <button
                  key={s.id}
                  className={`routine-chip ${on ? 'on' : ''}`}
                  style={{ '--cat': catById(t.category).color } as CSSProperties}
                  onClick={() => (on ? props.onUndo(s) : props.onComplete(s))}
                  aria-pressed={on}
                >
                  <span className="routine-icon">{on ? '✓' : t.icon ?? catById(t.category).emoji}</span>
                  <span className="routine-name">{t.title}</span>
                  <span className="routine-time">{minToHm(s.start)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {tips.map((t) => (
        <section key={t.text} className="tip">
          <span className="tip-icon">{t.icon}</span>
          <div>
            <p>{t.text}</p>
            {t.action && (
              <button className="link" onClick={() => props.onTipAction(t)}>
                {t.action === 'breathe' ? 'Respirar 1 minuto →' : t.action === 'add-social' ? 'Planear algo con alguien →' : 'Reservar un rato →'}
              </button>
            )}
          </div>
        </section>
      ))}

      <div className="agenda-head">
        <h2 className="section-title">Tu agenda</h2>
        <span className="muted small">Toca cualquier bloque para ver opciones</span>
      </div>
      {main.length === 0 && routines.length === 0 && (
        <p className="empty small-empty">
          Hoy no tienes nada planificado: disfruta 🌿 Pulsa <strong>+</strong> para contarme qué tienes en la cabeza.
        </p>
      )}
      <div className="card agenda-card">
        <DayAgenda state={state} date={today} now={nowMinutes()} onTap={props.onTap} onToggle={(s) => (s.status === 'done' ? props.onUndo(s) : props.onComplete(s))} />
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

