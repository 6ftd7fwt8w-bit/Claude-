import { useCallback, useEffect, useState } from 'react';
import { useStore } from './store';
import type { AppState, Profile, Session, Task } from './types';
import {
  addTask,
  archiveTask,
  completeSession,
  postponeSession,
  pullForward,
  replanAll,
  rollover,
  setEnergy,
  uncompleteSession,
  type NewTaskInput,
} from './lib/scheduler';
import { randomDonePhrase } from './lib/phrases';
import type { Tip } from './lib/tips';
import { todayKey } from './lib/time';
import { Onboarding, type HabitSuggestion } from './components/Onboarding';
import { EnergyCheck } from './components/EnergyCheck';
import { TodayView } from './components/TodayView';
import { CalendarView } from './components/CalendarView';
import { GoalsView } from './components/GoalsView';
import { BonsaiView } from './components/BonsaiView';
import { SettingsView } from './components/SettingsView';
import { AddTask, type AddPreset } from './components/AddTask';
import { Breathe, Celebration, Toast } from './components/ui';

type Tab = 'hoy' | 'calendario' | 'objetivos' | 'bonsai';
type Modal = null | 'add' | 'energy' | 'breathe' | 'settings';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'hoy', icon: '☀️', label: 'Hoy' },
  { id: 'calendario', icon: '🗓️', label: 'Calendario' },
  { id: 'objetivos', icon: '🎯', label: 'Objetivos' },
  { id: 'bonsai', icon: '🌳', label: 'Bonsái' },
];

export default function App() {
  const { state, act, reset } = useStore();
  const [today, setToday] = useState(todayKey());
  const [tab, setTab] = useState<Tab>('hoy');
  const [modal, setModal] = useState<Modal>(null);
  const [preset, setPreset] = useState<AddPreset | undefined>();
  const [toast, setToast] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ text: string; sub?: string } | null>(null);

  const say = (m?: string) => m && setToast(m);

  // nuevo día: recolocar lo pendiente y preguntar por la energía
  const wakeUp = useCallback(() => {
    setToday(todayKey());
    let moved = 0;
    let needEnergy = false;
    act((s, ctx) => {
      if (!s.profile) return s;
      needEnergy = s.energy[ctx.today] == null;
      if (s.lastOpen === ctx.today) return s;
      const r = rollover(s, ctx);
      moved = r.moved;
      return r.state;
    });
    if (moved > 0) setToast(`Lo que quedó pendiente lo he recolocado (${moved}) 🌿 Sin culpa.`);
    if (needEnergy) setModal((m) => m ?? 'energy');
  }, [act]);

  useEffect(() => {
    wakeUp();
    const onVis = () => document.visibilityState === 'visible' && wakeUp();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [wakeUp]);

  // acciones rápidas (atajos del icono de la app / widget): ?action=add | breathe | energy
  useEffect(() => {
    const a = new URLSearchParams(location.search).get('action');
    if (!a || !state.profile) return;
    if (a === 'add') setModal('add');
    if (a === 'breathe') setModal('breathe');
    if (a === 'energy') setModal('energy');
    history.replaceState(null, '', location.pathname);
  }, [state.profile]);

  if (!state.profile) {
    return (
      <Onboarding
        onDone={(p: Profile, habits: HabitSuggestion[]) => {
          const t = todayKey();
          act((s, ctx) => {
            let st: AppState = { ...s, profile: { ...p, createdAt: t }, lastOpen: t };
            for (const h of habits) {
              st = addTask(st, { title: h.title, category: h.category, kind: 'habito', totalMinutes: h.minutes, timesPerWeek: h.times }, ctx).state;
            }
            return st;
          });
          setModal('energy');
        }}
      />
    );
  }

  const complete = (s: Session) => {
    const msg = act((st) => completeSession(st, s.id));
    setCelebration({ text: msg?.startsWith('🎉') ? msg : randomDonePhrase(), sub: msg?.startsWith('🎉') ? undefined : msg });
  };
  const undo = (s: Session) => act((st) => uncompleteSession(st, s.id));
  const postpone = (s: Session) => say(act((st, ctx) => postponeSession(st, s.id, ctx)));
  const archive = (t: Task) => {
    if (confirm(`¿Quitar «${t.title}»? Las hojas que ya ganaste se quedan en tu bonsái.`)) {
      act((st) => archiveTask(st, t.id));
      say('Quitado. Soltar también es avanzar 🍃');
    }
  };
  const onTip = (t: Tip) => {
    if (t.action === 'breathe') setModal('breathe');
    if (t.action === 'add-social') {
      setPreset({ category: 'social', kind: 'flexible', minutes: 60, title: 'Quedar con alguien' });
      setModal('add');
    }
    if (t.action === 'add-bienestar') {
      setPreset({ category: 'bienestar', kind: 'flexible', minutes: 20, title: 'Paseo tranquilo' });
      setModal('add');
    }
  };

  return (
    <div className="app">
      <main>
        {tab === 'hoy' && (
          <TodayView
            state={state}
            today={today}
            onComplete={complete}
            onUndo={undo}
            onPostpone={postpone}
            onEnergy={() => setModal('energy')}
            onPull={() => say(act((st, ctx) => pullForward(st, ctx)))}
            onTipAction={onTip}
            onBreathe={() => setModal('breathe')}
          />
        )}
        {tab === 'calendario' && <CalendarView state={state} today={today} onComplete={complete} onUndo={undo} onPostpone={postpone} />}
        {tab === 'objetivos' && <GoalsView state={state} today={today} onArchive={archive} />}
        {tab === 'bonsai' && <BonsaiView state={state} today={today} />}
      </main>

      <button
        className="fab"
        aria-label="Añadir"
        onClick={() => {
          setPreset(undefined);
          setModal('add');
        }}
      >
        +
      </button>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
        <button onClick={() => setModal('settings')}>
          <span className="tab-icon">⚙️</span>
          <span>Rutina</span>
        </button>
      </nav>

      {modal === 'add' && (
        <AddTask
          preset={preset}
          onClose={() => setModal(null)}
          onAdd={(input: NewTaskInput) => {
            setModal(null);
            say(act((st, ctx) => addTask(st, input, ctx)));
          }}
        />
      )}
      {modal === 'energy' && (
        <EnergyCheck
          name={state.profile.name}
          initial={state.energy[today]}
          onClose={() => setModal(null)}
          onPick={(v) => {
            setModal(null);
            say(act((st, ctx) => setEnergy(st, ctx.today, v, ctx)));
          }}
        />
      )}
      {modal === 'breathe' && <Breathe onClose={() => setModal(null)} />}
      {modal === 'settings' && (
        <SettingsView
          profile={state.profile}
          onClose={() => setModal(null)}
          onSave={(p) => {
            setModal(null);
            act((st, ctx) => replanAll({ ...st, profile: p }, ctx));
            say('Rutina guardada. He reorganizado tu calendario 🌿');
          }}
          onReplan={() => {
            setModal(null);
            act((st, ctx) => replanAll(st, ctx));
            say('Calendario reorganizado desde cero ✨');
          }}
          onReset={() => {
            setModal(null);
            reset();
          }}
        />
      )}

      {celebration && <Celebration text={celebration.text} sub={celebration.sub} onDone={() => setCelebration(null)} />}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
