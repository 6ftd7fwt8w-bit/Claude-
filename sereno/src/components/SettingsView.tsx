import { useState } from 'react';
import type { Profile } from '../types';
import { ProfileFields } from './Onboarding';
import { NumberChips, Sheet } from './ui';

export function SettingsView({
  profile,
  onSave,
  onReplan,
  onReset,
  onClose,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onReplan: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [p, setP] = useState(profile);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  return (
    <Sheet title="Tu rutina" onClose={onClose}>
      <label className="field">
        <span>Nombre</span>
        <input value={p.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      {['despertar', 'trabajo', 'comidas', 'noche'].map((s) => (
        <div key={s} className="settings-group">
          <ProfileFields p={p} set={set} step={s} />
        </div>
      ))}
      <div className="field">
        <span>Energía por defecto para días futuros</span>
        <NumberChips value={p.defaultEnergy} options={[40, 50, 60, 70, 80]} onChange={(defaultEnergy) => set({ defaultEnergy })} fmt={(v) => `${v}%`} />
      </div>
      <button className="btn primary wide" onClick={() => onSave(p)}>
        Guardar y reorganizar
      </button>
      <button className="btn soft wide" onClick={onReplan}>
        🔄 Reorganizar mi calendario desde cero
      </button>
      <button
        className="btn ghost wide danger"
        onClick={() => {
          if (confirm('¿Borrar todos tus datos de Sereno? No se puede deshacer.')) onReset();
        }}
      >
        Borrar todos mis datos
      </button>
      <p className="muted small center">Tus datos se guardan solo en este dispositivo.</p>
    </Sheet>
  );
}
