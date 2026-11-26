import type { AppState } from '../types';
import { taskColor } from '../types';
import { baseBusy, bedEff, breaksFor, sessionsOn } from '../lib/scheduler';
import { minToHm } from '../lib/time';

/**
 * El día de un vistazo: una barra desde que te levantas hasta que te acuestas.
 * Rayado = trabajo, comidas y descanso · huecos claros = tiempo libre · color = tus cosas.
 */
export function DayStrip({
  state,
  date,
  now,
  tall,
  showHours,
}: {
  state: AppState;
  date: string;
  now?: number;
  tall?: boolean;
  showHours?: boolean;
}) {
  const p = state.profile!;
  const from = p.wake;
  const to = bedEff(p);
  const span = Math.max(60, to - from);
  const pos = (m: number) => ((Math.min(to, Math.max(from, m)) - from) / span) * 100;
  const tasks = new Map(state.tasks.map((t) => [t.id, t]));
  const hours = Array.from({ length: Math.floor(span / 180) + 1 }, (_, i) => from + i * 180).filter((h) => h < to - 60);
  return (
    <div className="strip-wrap">
      {showHours && (
        <div className="strip-hours" aria-hidden="true">
          {hours.map((h) => (
            <span key={h} style={{ left: `${pos(h)}%` }}>
              {minToHm(h)}
            </span>
          ))}
        </div>
      )}
      <div className={`strip ${tall ? 'tall' : ''}`} role="img" aria-label="Tu día de un vistazo">
        {baseBusy(p, date)
          .filter((b) => b.end > from && b.start < to)
          .map((b, k) => (
            <span key={`b${k}`} className="blk busy" style={{ left: `${pos(b.start)}%`, width: `${pos(b.end) - pos(b.start)}%` }} />
          ))}
        {breaksFor(p, date).map((b) => (
          <span key={`p${b.start}`} className="blk pause" title={`Pausa ${minToHm(b.start)}`} style={{ left: `${pos(b.start)}%`, width: `${pos(b.start + b.duration) - pos(b.start)}%` }} />
        ))}
        {sessionsOn(state.sessions, date).map((x) => {
          const t = tasks.get(x.taskId);
          return (
            <span
              key={x.id}
              className={`blk ${x.status === 'done' ? 'done' : ''}`}
              title={`${minToHm(x.start)} ${t?.title ?? ''}`}
              style={{
                left: `${pos(x.start)}%`,
                width: `max(4px, ${pos(x.start + x.duration) - pos(x.start)}%)`,
                background: taskColor(t),
              }}
            />
          );
        })}
        {now != null && now > from && now < to && <span className="now" style={{ left: `${pos(now)}%` }} />}
      </div>
    </div>
  );
}

export function StripLegend() {
  return (
    <p className="legend strip-legend">
      <span><i className="lg busy" /> Trabajo, comidas, descanso</span>
      <span><i className="lg free" /> Libre</span>
      <span><i className="lg pause" /> Pausa</span>
      <span><i className="lg mine" /> Tus cosas</span>
    </p>
  );
}
