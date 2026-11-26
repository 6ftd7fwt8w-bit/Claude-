import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import type { AppState, Session } from '../types';
import { catById, taskColor } from '../types';
import { bedAbs, bedEff, breaksFor, complement, isRemote, mealsFor, relaxStart, sessionsOn, workHours, type Interval } from '../lib/scheduler';
import { fmtDuration, minToHm } from '../lib/time';

const HOUR = 64; // px por hora

export interface Block extends Interval {
  label: string;
  kind: 'routine' | 'work' | 'commute' | 'pause' | 'meal' | 'relax';
  key?: 'lunch' | 'dinner';
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
  const meals = mealsFor(p, date);
  out.push({ ...meals.lunch, label: '🥗 Comida', kind: 'meal', key: 'lunch' });
  out.push({ ...meals.dinner, label: '🍽️ Cena', kind: 'meal', key: 'dinner' });
  // si te acuestas después de medianoche, la desconexión empieza más tarde (y puede seguir pasadas las 00:00)
  const rs = relaxStart(p);
  if (rs < 1440) {
    out.push({ start: rs, end: Math.min(1440, bedAbs(p)), label: `🌙 Desconexión hasta las ${minToHm(bedAbs(p))}`, kind: 'relax' });
  }
  return out.filter((b) => b.end > b.start).sort((a, b) => a.start - b.start);
}

/** Lo mínimo para considerar un hueco "libre" (lo mismo en la agenda y en el resumen) */
export const MIN_GAP = 30;

/** Huecos libres de verdad (sin rutina ni tus cosas) de al menos MIN_GAP, desde `fromMin` */
export function freeGaps(state: AppState, date: string, fromMin = 0): Interval[] {
  const p = state.profile!;
  const blocks = baseBlocks(state, date);
  const sessions = sessionsOn(state.sessions, date);
  const end = Math.min(1440, relaxStart(p));
  return complement([...blocks, ...sessions.map((s) => ({ start: s.start, end: s.start + s.duration }))], Math.max(p.wake, fromMin), end).filter(
    (f) => f.end - f.start >= MIN_GAP,
  );
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
  onTapTime,
  onTapGap,
  onDrop,
  onTapBlock,
}: {
  state: AppState;
  date: string;
  /** minutos actuales si la fecha es hoy */
  now?: number;
  onTap: (s: Session) => void;
  onToggle: (s: Session) => void;
  /** tocar una hora cualquiera (aunque sea de trabajo) para añadir algo ahí */
  onTapTime?: (minute: number) => void;
  /** tocar un hueco libre para llenarlo */
  onTapGap?: (gap: Interval) => void;
  /** soltar un bloque arrastrado en otra hora */
  onDrop?: (s: Session, start: number) => void;
  /** tocar un bloque de la rutina (comida, trabajo…) */
  onTapBlock?: (b: Block, minute: number) => void;
}) {
  const p = state.profile!;
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; y0: number; dy: number } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const tasks = new Map(state.tasks.map((t) => [t.id, t]));
  const sessions = sessionsOn(state.sessions, date);
  const blocks = baseBlocks(state, date);
  const from = Math.floor(Math.min(p.wake, ...sessions.map((s) => s.start)) / 60) * 60;
  const to = Math.min(1440, Math.ceil(Math.max(bedEff(p), ...sessions.map((s) => s.start + s.duration)) / 60) * 60);
  const y = (m: number) => ((m - from) / 60) * HOUR;
  const hours = Array.from({ length: (to - from) / 60 + 1 }, (_, i) => from + i * 60);
  // huecos libres de verdad (sin rutina ni tus cosas)
  // en el día de hoy, solo los huecos que quedan (desde ahora)
  const freeFrom = now != null ? Math.max(from, Math.ceil(now / 15) * 15) : from;
  const free = freeGaps(state, date, freeFrom);
  const cols = layout(sessions);
  const snap = (m: number, step = 15) => Math.round(m / step) * step;

  const tapBackground = (e: ReactMouseEvent) => {
    if (!onTapTime || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const minute = snap(from + ((e.clientY - rect.top) / HOUR) * 60);
    onTapTime(Math.max(0, Math.min(1440 - 15, minute)));
  };

  // arrastrar con el asa ⠿ (funciona con dedo y ratón)
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, dy: e.clientY - d.y0 } : d));
    const up = () => {
      const d = dragRef.current;
      setDrag(null);
      if (!d || !onDrop) return;
      const s0 = sessions.find((x) => x.id === d.id);
      if (s0 && Math.abs(d.dy) > 4) {
        const start = Math.max(0, Math.min(1440 - s0.duration, snap(s0.start + (d.dy / HOUR) * 60, 5)));
        if (start !== s0.start) onDrop(s0, start);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    window.addEventListener('pointercancel', up, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id]);

  return (
    <div ref={ref} className={`agenda ${onTapTime ? 'tappable' : ''}`} style={{ height: y(to) + 8 }} onClick={tapBackground}>
      {hours.map((h) => (
        <div key={h} className="ag-hour" style={{ top: y(h) }}>
          <span>{minToHm(h)}</span>
        </div>
      ))}
      {blocks.map((b, k) => (
        <div
          key={`b${k}`}
          className={`ag-block ${b.kind}`}
          style={{ top: y(b.start), height: Math.max(14, y(b.end) - y(b.start)) }}
          onClick={(e) => {
            if (!onTapBlock || !ref.current) return;
            e.stopPropagation();
            const rect = ref.current.getBoundingClientRect();
            onTapBlock(b, Math.max(0, Math.min(1440 - 15, snap(from + ((e.clientY - rect.top) / HOUR) * 60))));
          }}
        >
          {y(b.end) - y(b.start) >= 18 && (
            <span>
              {b.label} <small>{minToHm(b.start)}–{minToHm(b.end)}</small>
            </span>
          )}
        </div>
      ))}
      {free.map((f) => (
        <button
          key={`f${f.start}`}
          className="ag-free"
          style={{ top: y(f.start) + 2, height: y(f.end) - y(f.start) - 4 }}
          onClick={(e) => {
            e.stopPropagation();
            onTapGap?.(f);
          }}
        >
          <span>
            🌿 Libre · {minToHm(f.start)}–{minToHm(f.end)} <small>({fmtDuration(f.end - f.start)})</small>
          </span>
          {onTapGap && <span className="ag-free-add">+ Añadir algo</span>}
        </button>
      ))}
      {sessions.map((s) => {
        const t = tasks.get(s.taskId);
        const c = catById(t?.category ?? 'bienestar');
        const { col, cols: n } = cols.get(s.id)!;
        const h = Math.max(26, y(s.start + s.duration) - y(s.start) - 2);
        const done = s.status === 'done';
        const dragging = drag?.id === s.id;
        const shownStart = dragging ? snap(s.start + (drag!.dy / HOUR) * 60, 5) : s.start;
        return (
          <div
            key={s.id}
            className={`ag-event ${done ? 'done' : ''} ${h < 44 ? 'tiny' : ''} ${dragging ? 'dragging' : ''} ${s.inWork ? 'in-work' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={
              {
                top: y(s.start) + 1,
                height: h,
                transform: dragging ? `translateY(${drag!.dy}px)` : undefined,
                left: `calc(var(--gutter) + (100% - var(--gutter)) * ${col / n})`,
                width: `calc((100% - var(--gutter)) / ${n} - 4px)`,
                '--cat': taskColor(t),
              } as CSSProperties
            }
          >
            {onDrop && !done && (
              <span
                className="ag-handle"
                role="button"
                aria-label={`Arrastrar ${t?.title ?? ''} para cambiar la hora`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDrag({ id: s.id, y0: e.clientY, dy: 0 });
                }}
              >
                ⠿
              </span>
            )}
            <button className="ag-main" onClick={() => onTap(s)}>
              <span className="ag-title">
                {t?.icon ?? c.emoji} {t?.title}
                {s.note && <span className="ag-note-dot" title={s.note}> 📝</span>}
              </span>
              <span className="ag-time">
                {minToHm(shownStart)}–{minToHm(shownStart + s.duration)}
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
