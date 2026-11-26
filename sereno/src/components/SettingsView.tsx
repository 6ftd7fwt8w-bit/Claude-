import { useState } from 'react';
import type { Profile } from '../types';
import { isNative } from '../native';
import { ProfileFields } from './Onboarding';
import { NumberChips, Sheet } from './ui';

export function SettingsView({
  profile,
  onSave,
  onReplan,
  onReset,
  onClose,
  onImportIcs,
  onSyncIphone,
  onExport,
  onImport,
  ask,
}: {
  profile: Profile;
  onSave: (p: Profile) => void;
  onReplan: () => void;
  onReset: () => void;
  onClose: () => void;
  onImportIcs: (text: string) => void;
  onSyncIphone: () => void;
  onExport: () => void;
  onImport: (json: string) => void;
  ask: (text: string, yes: string, onYes: () => void) => void;
}) {
  const [p, setP] = useState(profile);
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const readFile = (file: File | undefined, cb: (text: string) => void) => {
    if (!file) return;
    file.text().then(cb);
  };
  return (
    <Sheet title="Tu rutina" onClose={onClose}>
      <label className="field">
        <span>Nombre</span>
        <input value={p.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      {['despertar', 'trabajo', ...(p.works ? ['pausas'] : []), 'comidas', 'noche'].map((s) => (
        <div key={s} className="settings-group">
          <ProfileFields p={p} set={set} step={s} />
        </div>
      ))}
      <div className="field">
        <span>Energía por defecto para días futuros</span>
        <NumberChips value={p.defaultEnergy} options={[40, 50, 60, 70, 80]} onChange={(defaultEnergy) => set({ defaultEnergy })} fmt={(v) => `${v}%`} />
      </div>
      <label className="toggle">
        <input type="checkbox" checked={p.notifications} onChange={(e) => set({ notifications: e.target.checked })} />
        <span>Avisos amables (10 min antes, buenos días y hora de desconectar)</span>
      </label>
      {!isNative && <p className="muted small">Los avisos funcionan en la app de iPhone.</p>}
      <button className="btn primary wide" onClick={() => onSave(p)}>
        Guardar y reorganizar
      </button>

      <div className="settings-section">
        <p className="h3">📅 Tu otro calendario</p>
        <p className="muted small">
          Trae tus citas (médico, reuniones, cumpleaños…) para que Sereno no te ponga nada encima.
        </p>
        {isNative && (
          <button className="btn soft wide" onClick={onSyncIphone}>
            Sincronizar con el Calendario del iPhone
          </button>
        )}
        <label className="btn soft wide file-btn">
          Importar archivo .ics (Google, iCloud, Outlook)
          <input type="file" accept=".ics,text/calendar" onChange={(e) => readFile(e.target.files?.[0], onImportIcs)} />
        </label>
        {!isNative && (
          <p className="muted small">
            En Google Calendar: Configuración → Importar y exportar → Exportar. En la app de iPhone se sincroniza solo.
          </p>
        )}
      </div>

      <div className="settings-section">
        <p className="h3">💾 Copia de seguridad</p>
        <p className="muted small">Tus datos se guardan solo en este dispositivo. Haz una copia de vez en cuando.</p>
        <button className="btn soft wide" onClick={onExport}>
          Exportar copia
        </button>
        <label className="btn soft wide file-btn">
          Restaurar una copia
          <input type="file" accept=".json,application/json" onChange={(e) => readFile(e.target.files?.[0], onImport)} />
        </label>
      </div>

      <div className="settings-section">
        <button className="btn soft wide" onClick={onReplan}>
          🔄 Reorganizar mi calendario desde cero
        </button>
        <button
          className="btn ghost wide danger"
          onClick={() => ask('¿Borrar todos tus datos de Sereno? No se puede deshacer.', 'Sí, borrar todo', onReset)}
        >
          Borrar todos mis datos
        </button>
      </div>
    </Sheet>
  );
}
