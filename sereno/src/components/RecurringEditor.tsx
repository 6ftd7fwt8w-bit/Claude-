import { useState } from 'react';
import type { TimeOfDay } from '../types';
import { catById } from '../types';
import { ROUTINE_ICONS, TIME_OF_DAY_LABEL, timesLabel, type RecurringSuggestion } from '../lib/suggestions';
import { fmtDuration, hmToMin, minToHm } from '../lib/time';
import { DayPicker, DurationPicker, NumberChips, Sheet } from './ui';

export type Freq = 'semana' | 'mes' | 'dias';

export function FreqTabs({ value, onChange }: { value: Freq; onChange: (f: Freq) => void }) {
  return (
    <div className="segmented three">
      <button type="button" className={value === 'semana' ? 'on' : ''} onClick={() => onChange('semana')}>
        Por semana
      </button>
      <button type="button" className={value === 'mes' ? 'on' : ''} onClick={() => onChange('mes')}>
        Por mes
      </button>
      <button type="button" className={value === 'dias' ? 'on' : ''} onClick={() => onChange('dias')}>
        Días concretos
      </button>
    </div>
  );
}

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
  const [freq, setFreq] = useState<'semana' | 'mes' | 'dias'>(value.perMonth ? 'mes' : value.days?.length ? 'dias' : 'semana');
  const byDays = freq === 'dias';
  const set = (patch: Partial<RecurringSuggestion>) => setV((x) => ({ ...x, ...patch }));
  const icons = [...new Set([v.icon, ...ROUTINE_ICONS, ...EXTRA_ICONS])];
  const save = () =>
    onSave({
      ...v,
      title: v.title.trim() || value.title,
      days: byDays && v.days?.length ? v.days : undefined,
      times: byDays && v.days?.length ? v.days.length : v.times,
      perMonth: freq === 'mes' ? (v.perMonth ?? 1) : undefined,
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
        {fmtDuration(v.minutes)} · {timesLabel(v.times, byDays ? v.days : undefined, freq === 'mes' ? (v.perMonth ?? 1) : undefined)} ·{' '}
        {v.fixedStart != null ? `a las ${minToHm(v.fixedStart)}` : TIME_OF_DAY_LABEL[v.timeOfDay]}
        {v.dayType === 'weekends' ? ' · fines de semana' : v.dayType === 'weekdays' ? ' · entre semana' : ''}
      </p>

      <div className="field">
        <span>⏱ ¿Cuánto tiempo cada vez?</span>
        <DurationPicker value={v.minutes} onChange={(minutes) => set({ minutes })} />
      </div>

      <div className="field">
        <span>🔁 ¿Con qué frecuencia?</span>
        <FreqTabs value={freq} onChange={setFreq} />
        {freq === 'dias' && (
          <>
            <DayPicker value={v.days ?? []} onChange={(days) => set({ days })} />
            <small className="muted">Por ejemplo, la compra los sábados o pasear al perro cada día.</small>
          </>
        )}
        {freq === 'semana' && (
          <NumberChips value={v.times} options={[1, 2, 3, 4, 5, 6, 7]} onChange={(times) => set({ times })} fmt={(n) => (n === 7 ? 'Cada día' : `${n}×`)} />
        )}
        {freq === 'mes' && (
          <>
            <NumberChips value={v.perMonth ?? 1} options={[1, 2, 3, 4]} onChange={(perMonth) => set({ perMonth })} fmt={(n) => `${n}× al mes`} />
            <small className="muted">Las repartiré a lo largo del mes. Por ejemplo, quedar con amigas 2 veces al mes.</small>
          </>
        )}
      </div>

      {freq !== 'dias' && (
        <div className="field">
          <span>📆 ¿Qué días?</span>
          <div className="chips">
            {(
              [
                ['any', 'Cualquier día'],
                ['weekdays', 'Entre semana'],
                ['weekends', 'Fines de semana'],
              ] as const
            ).map(([d, l]) => (
              <button key={d} type="button" className={`chip ${(v.dayType ?? 'any') === d ? 'on' : ''}`} onClick={() => set({ dayType: d })}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span>🕐 ¿A una hora fija?</span>
        <div className="chips">
          <button type="button" className={`chip ${v.fixedStart == null ? 'on' : ''}`} onClick={() => set({ fixedStart: undefined })}>
            ✨ No, cuando haya hueco
          </button>
          <button type="button" className={`chip ${v.fixedStart != null ? 'on' : ''}`} onClick={() => set({ fixedStart: v.fixedStart ?? 20 * 60 })}>
            Sí, a las…
          </button>
        </div>
        {v.fixedStart != null && (
          <input type="time" value={minToHm(v.fixedStart)} onChange={(e) => e.target.value && set({ fixedStart: hmToMin(e.target.value) })} />
        )}
      </div>

      {v.fixedStart == null && (
      <div className="field">
        <span>🌤️ ¿En qué momento del día?</span>
        <div className="chips">
          {(Object.keys(TIME_OF_DAY_LABEL) as TimeOfDay[]).map((t) => (
            <button key={t} type="button" className={`chip ${v.timeOfDay === t ? 'on' : ''}`} onClick={() => set({ timeOfDay: t })}>
              {TIME_OF_DAY_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      )}

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
