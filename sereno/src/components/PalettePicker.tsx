import type { CSSProperties } from 'react';
import { PALETTES, type PaletteId } from '../lib/palettes';

/** Muestras de color: se ve de un vistazo cómo quedará la app */
export function PalettePicker({ value, onChange }: { value?: PaletteId; onChange: (id: PaletteId) => void }) {
  const current = value ?? 'bosque';
  return (
    <div className="palettes" role="radiogroup" aria-label="Estilo de color">
      {PALETTES.map((p) => {
        const [bg, h1, h2, accent] = p.swatch;
        const on = current === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`palette ${on ? 'on' : ''}`}
            onClick={() => onChange(p.id)}
            style={{ '--sw-bg': bg, '--sw-1': h1, '--sw-2': h2, '--sw-a': accent } as CSSProperties}
          >
            <span className="palette-preview" aria-hidden="true">
              <span className="pp-hero" />
              <span className="pp-line" />
              <span className="pp-line short" />
              <span className="pp-dot" />
            </span>
            <span className="palette-name">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
