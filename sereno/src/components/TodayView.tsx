import type { CSSProperties, ReactNode } from 'react';
import type { AppState, Session } from '../types';
import { catById } from '../types';
import { bedEff, dayLoad, energyFor, isWorkDay, sessionsOn } from '../lib/scheduler';
import { phraseOfDay } from '../lib/phrases';
import { LEVEL_TEXT, tipsFor, type Tip } from '../lib/tips';
import { fmtDuration, fmtLong, minToHm } from '../lib/time';
import { energyEmoji } from './EnergyCheck';
import { Ring } from './ui';

interface Props {
  state: AppState;
  today: string;
  onComplete: (s: Session) => void;
  onUndo: (s: Session) => void;
  onPostpone: (s: Session) => void;
  onEnergy: () => void;
  onPull: () => void;
  onTipAction: (t: Tip) => void;
  onBreathe: () => void;
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
  if (task.kind === 'habito') return `Hábito · ${task.timesPerWeek}×/semana`;
  return 'Con hora fija';
}

export function SessionCard({
  state,
  s,
  onComplete,
  onUndo,
  onPostpone,
  compact,
}: {
  state: AppState;
  s: Session;
  onComplete?: (s: Session) => void;
  onUndo?: (s: Session) => void;
  onPostpone?: (s: Session) => void;
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
        <div className="session-title">{task?.title ?? '—'}</div>
        <div className="session-meta">
          <span className="cat-dot" /> {cat.emoji} {cat.label}
          {!compact && <span className="muted"> · {sessionLabel(state, s)}</span>}
        </div>
        {!done && onPostpone && (
          <button className="link" onClick={() => onPostpone(s)}>
            {task?.kind === 'evento' ? 'Quitar' : 'Hoy no puedo'}
          </button>
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

export function TodayView(props: Props) {
  const { state, today } = props;
  const p = state.profile!;
  const sessions = sessionsOn(state.sessions, today);
  const done = sessions.filter((s) => s.status === 'done').length;
  const load = dayLoad(state, today);
  const tips = tipsFor(state, today, today);
  const energy = energyFor(state, today);
  const declared = state.energy[today] != null;

  // línea del día: rutina + sesiones
  type Item = { t: number; key: string; node: ReactNode };
  const items: Item[] = [
    { t: p.wake, key: 'wake', node: <Marker icon="🌅" text={`Despertar · ${minToHm(p.wake)}`} /> },
  ];
  if (isWorkDay(p, today)) {
    items.push({
      t: p.workStart,
      key: 'work',
      node: <Marker icon="💼" text={`Trabajo · ${minToHm(p.workStart)}–${minToHm(p.workEnd)}`} />,
    });
  }
  items.push({ t: p.dinner, key: 'dinner', node: <Marker icon="🍽️" text={`Cena · ${minToHm(p.dinner)}`} /> });
  items.push({
    t: bedEff(p) - p.relaxMinutes,
    key: 'relax',
    node: <Marker icon="🌙" text={`Tiempo para desconectar · desde las ${minToHm(bedEff(p) - p.relaxMinutes)}`} protectedTime />,
  });
  for (const s of sessions) {
    items.push({
      t: s.start,
      key: s.id,
      node: <SessionCard state={state} s={s} onComplete={props.onComplete} onUndo={props.onUndo} onPostpone={props.onPostpone} />,
    });
  }
  items.sort((a, b) => a.t - b.t);

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

      <section className="card progress-card">
        <Ring value={sessions.length ? done / sessions.length : 0} label="Progreso de hoy" />
        <div>
          <p className="h3">
            {sessions.length === 0 ? 'Nada asignado hoy' : `${done} de ${sessions.length} hechas`}
          </p>
          <p className={`level-chip ${load.level}`}>
            {LEVEL_TEXT[load.level]} · {fmtDuration(load.planned)} de {fmtDuration(load.capacity)} disponibles
          </p>
        </div>
      </section>

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

      <h2 className="section-title">Tu propuesta para hoy</h2>
      {sessions.length === 0 && (
        <p className="empty">
          Hoy no tienes nada asignado. Disfruta del día 🌿 <br />
          <span className="muted">Pulsa + para contarme qué quieres conseguir.</span>
        </p>
      )}
      <div className="timeline">
        {items.map((it) => (
          <div key={it.key}>{it.node}</div>
        ))}
      </div>

      <div className="quick-row">
        <button className="btn soft" onClick={props.onPull}>
          ⏳ Tengo un hueco, ¿qué adelanto?
        </button>
        <button className="btn soft" onClick={props.onBreathe}>
          🫧 Respirar
        </button>
      </div>
    </div>
  );
}

function Marker({ icon, text, protectedTime }: { icon: string; text: string; protectedTime?: boolean }) {
  return (
    <div className={`marker ${protectedTime ? 'protected' : ''}`}>
      <span>{icon}</span> {text}
    </div>
  );
}
