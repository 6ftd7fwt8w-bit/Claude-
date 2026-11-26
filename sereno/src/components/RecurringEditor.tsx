import { useState } from 'react';
import type { TimeOfDay } from '../types';
import { catById } from '../types';
import { ROUTINE_ICONS, TIME_OF_DAY_LABEL, timesLabel, type RecurringSuggestion } from '../lib/suggestions';
import { fmtDuration } from '../lib/time';
import { DayPicker, NumberChips, Sheet } from './ui';

const EXTRA_ICONS = ['🧘', '🏃', '🤸', '🌳', '🥂', '📞', '📖', '🛁', '🎨', '🎸', '🏊', '🚴', '🙏', '✍️'];

/** Ajustar una cotidiana o un hábito: cuánto dura, cuántas veces o qué días, y cuándo. */
export function RecurringEditor({
  value,
  onSave,
  onRemove,
  onClose,
}: {
  value: RecurringSuggestion;
  onSave: (v: RecurringSuggestion) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const [v, setV] = useState<RecurringSuggestion>({ ...value });
  const [byDays, setByDays] = useState(!!value.days?.length);
  const set = (patch: Partial<RecurringSuggestion>) => setV((x) => ({ ...x, ...patch }));
  const icons = [...new Set([v.icon, ...ROUTINE_ICONS, ...EXTRA_ICONS])];
  const save = () =>
    onSave({
      ...v,
      title: v.title.trim() || value.title,
      days: byDays && v.days?.length ? v.days : undefined,
      times: byDays && v.days?.length ? v.days.length : v.times,
    });
  return (
    <Sheet title="Ajustar" onClose={onClose}>
      <div className="re-head">
        <span className="re-icon" style={{ background: `color-mix(in srgb, ${catById(v.category).color} 22%, var(--surface))` }}>
          {v.icon}
        </span>
        <input className="re-title" value={v.title} aria-label="Nombre" onChange={(e) => set({ title: e.target.value })} />
      </div>
      <p className="re-summary">
        {fmtDuration(v.minutes)} · {timesLabel(v.times, byDays ? v.days : undefined)} · {TIME_OF_DAY_LABEL[v.timeOfDay]}
      </p>

      <div className="field">
        <span>⏱ ¿Cuánto tiempo cada vez?</span>
        <NumberChips value={v.minutes} options={[5, 10, 15, 20, 30, 45, 60, 90]} onChange={(minutes) => set({ minutes })} fmt={fmtDuration} />
      </div>

      <div className="field">
        <span>🔁 ¿Con qué frecuencia?</span>
        <div className="segmented two">
          <button className={!byDays ? 'on' : ''} onClick={() => setByDays(false)}>
            Veces por semana
          </button>
          <button className={byDays ? 'on' : ''} onClick={() => setByDays(true)}>
            Días concretos
          </button>
        </div>
        {byDays ? (
          <>
            <DayPicker value={v.days ?? []} onChange={(days) => set({ days })} />
            <small className="muted">Por ejemplo, la compra los sábados o pasear al perro cada día.</small>
          </>
        ) : (
          <NumberChips value={v.times} options={[1, 2, 3, 4, 5, 6, 7]} onChange={(times) => set({ times })} fmt={(n) => (n === 7 ? 'Cada día' : `${n}×`)} />
        )}
      </div>

      <div className="field">
        <span>🕐 ¿Cuándo te va mejor?</span>
        <div className="chips">
          {(Object.keys(TIME_OF_DAY_LABEL) as TimeOfDay[]).map((t) => (
            <button key={t} type="button" className={`chip ${v.timeOfDay === t ? 'on' : ''}`} onClick={() => set({ timeOfDay: t })}>
              {TIME_OF_DAY_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Icono</span>
        <div className="chips icons">
          {icons.map((i) => (
            <button key={i} type="button" className={`chip round ${v.icon === i ? 'on' : ''}`} onClick={() => set({ icon: i })} aria-label={`Icono ${i}`}>
              {i}
            </button>
          ))}
        </div>
      </div>

      <button className="btn primary wide" disabled={byDays && !v.days?.length} onClick={save}>
        Guardar
      </button>
      {onRemove && (
        <button className="btn ghost wide danger" onClick={onRemove}>
          Quitar
        </button>
      )}
    </Sheet>
  );
}
