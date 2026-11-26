import { useCallback, useEffect, useRef, useState } from 'react';
import { hydrate, useStore, type Action } from './store';
import type { AppState, Profile, Session, Task } from './types';
import {
  addRechargeBefore,
  addTask,
  archiveTask,
  breaksFor,
  isWorkDay,
  setDayBreaks,
  completeSession,
  editTask,
  importEvents,
  moveSession,
  postponeSession,
  pullForward,
  replanAll,
  rollover,
  setEnergy,
  uncompleteSession,
  type NewTaskInput,
} from './lib/scheduler';
import { randomDonePhrase } from './lib/phrases';
import { buy, claimAchievements, writeJournal } from './lib/rewards';
import { icsToEvents } from './lib/ics';
import { guessCategory } from './lib/parse';
import type { Tip } from './lib/tips';
import { todayKey } from './lib/time';
import {
  isNative,
  onOpenUrl,
  onResume,
  readIphoneCalendar,
  scheduleNotifications,
  syncWidget,
  takeWidgetActions,
  tapFeedback,
} from './native';
import { Onboarding, recurringToTask } from './components/Onboarding';
import { ProjectSheet } from './components/ProjectSheet';
import { MindSheet } from './components/MindCard';
import { EnergyCheck } from './components/EnergyCheck';
import { TodayView } from './components/TodayView';
import { CalendarView } from './components/CalendarView';
import { GoalsView } from './components/GoalsView';
import { BonsaiView } from './components/BonsaiView';
import { SettingsView } from './components/SettingsView';
import { AddTask, type AddPreset } from './components/AddTask';
import { MoveSheet } from './components/MoveSheet';
import { Breathe, Celebration, Confirm, Toast } from './components/ui';

type Tab = 'hoy' | 'calendario' | 'objetivos' | 'bonsai';
type Modal = null | 'add' | 'energy' | 'breathe' | 'settings' | 'mind';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'hoy', icon: '☀️', label: 'Hoy' },
  { id: 'calendario', icon: '🗓️', label: 'Calendario' },
  { id: 'objetivos', icon: '🎯', label: 'Objetivos' },
  { id: 'bonsai', icon: '🌳', label: 'Bonsái' },
];

export default function App() {
  const { state, act: rawAct, reset, replace } = useStore();
  const [today, setToday] = useState(todayKey());
  const [tab, setTab] = useState<Tab>('hoy');
  const [modal, setModal] = useState<Modal>(null);
  const [preset, setPreset] = useState<AddPreset | undefined>();
  const [editing, setEditing] = useState<Task | undefined>();
  const [moving, setMoving] = useState<Session | undefined>();
  const [openedId, setOpenedId] = useState<string | undefined>();
  const [toast, setToast] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ text: string; sub?: string } | null>(null);
  const [question, setQuestion] = useState<{ text: string; yes: string; onYes: () => void } | null>(null);
  const ask = (text: string, yes: string, onYes: () => void) => setQuestion({ text, yes, onYes });
  const stateRef = useRef(state);
  stateRef.current = state;

  const say = (m?: string) => m && setToast(m);

  /** Cada acción comprueba además si se ha desbloqueado algún logro. */
  const act = useCallback(
    (fn: Action): string | undefined => {
      const msg = rawAct(fn);
      let fresh: string[] = [];
      rawAct((s, ctx) => {
        const r = claimAchievements(s, ctx.today);
        fresh = r.fresh.map((a) => `${a.emoji} ¡Logro: ${a.name}! +${a.reward} gotas`);
        return r.state;
      });
      if (fresh.length) setTimeout(() => setToast(fresh.join(' · ')), msg ? 3000 : 0);
      return msg;
    },
    [rawAct],
  );

  const openAction = useCallback((a: string) => {
    if (a === 'add') {
      setPreset(undefined);
      setEditing(undefined);
      setModal('add');
    }
    if (a === 'breathe') setModal('breathe');
    if (a === 'energy') setModal('energy');
    if (a === 'today') setTab('hoy');
    if (a === 'bonsai') setTab('bonsai');
  }, []);

  // nuevo día / volver a la app: recolocar lo pendiente, aplicar lo hecho desde el widget, energía
  const wakeUp = useCallback(async () => {
    setToday(todayKey());
    let moved = 0;
    let needEnergy = false;
    rawAct((s, ctx) => {
      if (!s.profile) return s;
      needEnergy = s.energy[ctx.today] == null;
      if (s.lastOpen === ctx.today) return s;
      const r = rollover(s, ctx);
      moved = r.moved;
      return r.state;
    });
    if (moved > 0) setToast(`Lo que quedó pendiente lo he recolocado (${moved}) 🌿 Sin culpa.`);
    if (needEnergy) setModal((m) => m ?? 'energy');

    const actions = await takeWidgetActions();
    const ids = actions.filter((a) => a.type === 'complete').map((a) => a.sessionId);
    if (ids.length) {
      act((s) =>
        ids.reduce(
          (acc, id) => (acc.sessions.find((x) => x.id === id && x.status === 'planned') ? completeSession(acc, id).state : acc),
          s,
        ),
      );
      setToast(`Desde el widget: ${ids.length} ${ids.length === 1 ? 'cosa hecha' : 'cosas hechas'} 🍃`);
    }
    // si ya sincronizaste el calendario del iPhone alguna vez, se mantiene al día solo
    if (isNative && stateRef.current.tasks.some((t) => t.source === 'ios')) {
      const events = await readIphoneCalendar(todayKey()).catch(() => null);
      if (events) rawAct((s, ctx) => importEvents(s, events, 'ios', ctx, guessCategory));
    }
  }, [rawAct, act]);

  useEffect(() => {
    wakeUp();
    const onVis = () => document.visibilityState === 'visible' && wakeUp();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [wakeUp]);

  useEffect(() => {
    onResume(() => wakeUp());
    onOpenUrl(openAction);
    // solo una vez: los listeners nativos viven lo que la app
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // acciones rápidas del icono (web): ?action=add | breathe | energy
  useEffect(() => {
    const a = new URLSearchParams(location.search).get('action');
    if (!a || !state.profile) return;
    openAction(a);
    history.replaceState(null, '', location.pathname);
  }, [state.profile, openAction]);

  // widget y avisos siempre al día (con un pequeño retraso para agrupar cambios)
  useEffect(() => {
    const t = setTimeout(() => {
      syncWidget(state, today);
      scheduleNotifications(state, today);
    }, 1200);
    return () => clearTimeout(t);
  }, [state, today]);

  if (!state.profile) {
    return (
      <Onboarding
        onDone={(p: Profile, tasks: NewTaskInput[]) => {
          const t = todayKey();
          act((s, ctx) => {
            let st: AppState = { ...s, profile: { ...p, createdAt: t }, lastOpen: t };
            // primero lo recurrente (cotidianas y cuidarte), después los proyectos en los huecos que queden
            for (const task of tasks.filter((x) => x.kind === 'habito')) st = addTask(st, task, ctx).state;
            for (const task of tasks.filter((x) => x.kind !== 'habito')) st = addTask(st, task, ctx).state;
            return st;
          });
          setModal('energy');
        }}
      />
    );
  }

  const complete = (s: Session) => {
    tapFeedback();
    const msg = act((st) => completeSession(st, s.id));
    const big = msg?.startsWith('🎉');
    setCelebration({ text: big ? msg! : randomDonePhrase(), sub: big ? undefined : msg });
  };
  const undo = (s: Session) => act((st) => uncompleteSession(st, s.id));
  const postpone = (s: Session) => say(act((st, ctx) => postponeSession(st, s.id, ctx)));
  const archive = (t: Task) => {
    ask(`¿Quitar «${t.title}»? Las hojas que ya ganaste se quedan en tu bonsái.`, 'Sí, quitar', () => {
      act((st) => archiveTask(st, t.id));
      say('Quitado. Soltar también es avanzar 🍃');
    });
  };
  const onTip = (t: Tip) => {
    if (t.action === 'breathe') setModal('breathe');
    if (t.action === 'add-social' || t.action === 'add-bienestar') {
      setPreset(
        t.action === 'add-social'
          ? { category: 'social', kind: 'flexible', minutes: 60, title: 'Quedar con alguien' }
          : { category: 'bienestar', kind: 'flexible', minutes: 20, title: 'Paseo tranquilo' },
      );
      setEditing(undefined);
      setModal('add');
    }
  };

  const exportBackup = async () => {
    const json = JSON.stringify(state, null, 2);
    // dentro de un marco (p. ej. la versión de prueba en Claude) no se pueden descargar archivos
    if (window.top !== window.self) {
      navigator.clipboard
        .writeText(json)
        .then(() => say('Copia copiada al portapapeles 📋 Pégala en una nota para guardarla.'))
        .catch(() => say('Aquí no puedo exportar la copia. En la app de iPhone sí funciona.'));
      return;
    }
    const name = `sereno-copia-${today}.json`;
    const file = new File([json], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Copia de Sereno' });
        return;
      }
    } catch {
      /* cancelado: probamos la descarga */
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('Copia exportada 💾');
  };

  const importBackup = (json: string) => {
    try {
      const next = hydrate(JSON.parse(json));
      if (!next.profile) throw new Error('sin perfil');
      setModal(null);
      ask('¿Sustituir tus datos actuales por los de la copia?', 'Sí, restaurar', () => {
        replace(next);
        say('Copia restaurada 🌳');
      });
    } catch {
      say('Ese archivo no parece una copia de Sereno.');
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
            onMove={setMoving}
            onJournal={(text) => say(act((st, ctx) => writeJournal(st, ctx.today, text)))}
            onEnergy={() => setModal('energy')}
            onPull={() => say(act((st, ctx) => pullForward(st, ctx)))}
            onTipAction={onTip}
            onBreathe={() => setModal('breathe')}
            onRecharge={(id) => say(act((st, ctx) => addRechargeBefore(st, id, ctx)))}
            onOpenMind={() => setModal('mind')}
          />
        )}
        {tab === 'calendario' && (
          <CalendarView state={state} today={today} onComplete={complete} onUndo={undo} onPostpone={postpone} onMove={setMoving} />
        )}
        {tab === 'objetivos' && (
          <GoalsView
            state={state}
            today={today}
            onArchive={archive}
            onEdit={(t) => {
              setEditing(t);
              setModal('add');
            }}
            onOpen={(t) => setOpenedId(t.id)}
            onQuickAdd={(sug, routine) => say(act((st, ctx) => addTask(st, recurringToTask(sug, routine), ctx)))}
            onPatch={(id, patch) => say(act((st, ctx) => editTask(st, id, patch, ctx)))}
          />
        )}
        {tab === 'bonsai' && <BonsaiView state={state} today={today} onBuy={(id) => say(act((st) => buy(st, id)))} />}
      </main>

      <button className="fab" aria-label="Añadir" onClick={() => openAction('add')}>
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
          key={editing?.id ?? 'new'}
          preset={preset}
          editing={editing}
          onClose={() => {
            setModal(null);
            setEditing(undefined);
          }}
          onAdd={(input: NewTaskInput) => {
            setModal(null);
            say(act((st, ctx) => addTask(st, input, ctx)));
          }}
          onEdit={(id, patch) => {
            setModal(null);
            setEditing(undefined);
            say(act((st, ctx) => editTask(st, id, patch, ctx)));
          }}
        />
      )}
      {openedId && state.tasks.find((t) => t.id === openedId) && (
        <ProjectSheet
          state={state}
          task={state.tasks.find((t) => t.id === openedId)!}
          today={today}
          onClose={() => setOpenedId(undefined)}
          onEdit={(t) => {
            setOpenedId(undefined);
            setEditing(t);
            setModal('add');
          }}
        />
      )}
      {moving && (
        <MoveSheet
          state={state}
          session={moving}
          today={today}
          onClose={() => setMoving(undefined)}
          onMove={(date, start) => {
            const id = moving.id;
            setMoving(undefined);
            say(act((st, ctx) => moveSession(st, id, date, start, ctx)));
          }}
        />
      )}
      {modal === 'energy' && (
        <EnergyCheck
          name={state.profile.name}
          initial={state.energy[today]}
          breaks={isWorkDay(state.profile, today) ? breaksFor(state.profile, today) : undefined}
          onClose={() => setModal(null)}
          onPick={(v, breaks) => {
            setModal(null);
            const m1 = act((st, ctx) => setEnergy(st, ctx.today, v, ctx));
            const m2 = breaks ? act((st, ctx) => setDayBreaks(st, ctx.today, breaks, ctx)) : undefined;
            say(m2?.startsWith('He puesto') ? `${m1 ?? ''} ${m2}` : m1);
          }}
        />
      )}
      {modal === 'breathe' && <Breathe onClose={() => setModal(null)} />}
      {modal === 'mind' && <MindSheet state={state} today={today} onClose={() => setModal(null)} />}
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
          onImportIcs={(text) => {
            setModal(null);
            const events = icsToEvents(text, todayKey());
            say(act((st, ctx) => importEvents(st, events, 'ics', ctx, guessCategory)));
          }}
          onSyncIphone={async () => {
            setModal(null);
            const events = await readIphoneCalendar(todayKey()).catch(() => null);
            if (!events) {
              say('Necesito permiso para ver tu calendario: Ajustes del iPhone → Sereno → Calendarios.');
              return;
            }
            say(act((st, ctx) => importEvents(st, events, 'ios', ctx, guessCategory)));
          }}
          onExport={exportBackup}
          onImport={importBackup}
          ask={ask}
        />
      )}

      {question && <Confirm text={question.text} yes={question.yes} onYes={question.onYes} onClose={() => setQuestion(null)} />}
      {celebration && <Celebration text={celebration.text} sub={celebration.sub} onDone={() => setCelebration(null)} />}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
