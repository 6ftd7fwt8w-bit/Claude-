/**
 * Todo lo que solo existe en la app de iPhone (Capacitor).
 * En el navegador, estas funciones no hacen nada, así que la web sigue funcionando igual.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppState } from './types';
import type { ExternalEvent } from './lib/scheduler';
import { relaxStart, sessionsOn } from './lib/scheduler';
import { widgetSnapshot, type WidgetAction } from './lib/widget';
import { addDays, fromKey, minToHm } from './lib/time';

export const isNative = Capacitor.isNativePlatform();

/** Plugin propio (ios/App/App/SerenoBridge.swift) */
interface SerenoBridgePlugin {
  setWidgetData(options: { json: string }): Promise<void>;
  getPendingActions(): Promise<{ json: string }>;
  clearPendingActions(): Promise<void>;
  requestCalendarAccess(): Promise<{ granted: boolean }>;
  getCalendarEvents(options: { from: string; days: number }): Promise<{ events: ExternalEvent[] }>;
}

const Bridge = registerPlugin<SerenoBridgePlugin>('SerenoBridge');

// ---------------------------------------------------------------- guardado

/** En iPhone, además de localStorage (que iOS puede borrar), guardamos en Preferences. */
export async function persist(json: string): Promise<void> {
  if (!isNative) return;
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key: 'sereno:v1', value: json });
}

export async function restore(): Promise<string | null> {
  if (!isNative) return null;
  const { Preferences } = await import('@capacitor/preferences');
  return (await Preferences.get({ key: 'sereno:v1' })).value;
}

// ---------------------------------------------------------------- widget

export async function syncWidget(state: AppState, today: string): Promise<void> {
  if (!isNative || !state.profile) return;
  try {
    await Bridge.setWidgetData({ json: JSON.stringify(widgetSnapshot(state, today)) });
  } catch (e) {
    console.warn('widget', e);
  }
}

export async function takeWidgetActions(): Promise<WidgetAction[]> {
  if (!isNative) return [];
  try {
    const { json } = await Bridge.getPendingActions();
    await Bridge.clearPendingActions();
    return JSON.parse(json || '[]');
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- calendario del iPhone

export async function readIphoneCalendar(from: string, days = 60): Promise<ExternalEvent[] | null> {
  if (!isNative) return null;
  const { granted } = await Bridge.requestCalendarAccess();
  if (!granted) return null;
  const { events } = await Bridge.getCalendarEvents({ from, days });
  return events;
}

// ---------------------------------------------------------------- notificaciones amables

const at = (date: string, minutes: number) => {
  const d = fromKey(date);
  d.setHours(0, minutes, 0, 0);
  return d;
};

/** Reprograma los avisos de los próximos 3 días (iOS permite 64 pendientes). */
export async function scheduleNotifications(state: AppState, today: string): Promise<void> {
  if (!isNative || !state.profile) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    if (!state.profile.notifications) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }
    const p = state.profile;
    const tasks = new Map(state.tasks.map((t) => [t.id, t]));
    const now = Date.now();
    const list: { id: number; title: string; body: string; schedule: { at: Date }; extra?: unknown }[] = [];
    let id = 1;
    for (let i = 0; i < 3; i++) {
      const d = addDays(today, i);
      const day = sessionsOn(state.sessions, d).filter((s) => s.status === 'planned');
      const morning = at(d, p.wake + p.morningRoutine);
      if (day.length) {
        list.push({
          id: id++,
          title: `Buenos días${p.name ? `, ${p.name}` : ''}`,
          body: `Hoy tienes ${day.length} ${day.length === 1 ? 'cosa' : 'cosas'}. Toca para decirme cómo está tu energía.`,
          schedule: { at: morning },
          extra: { action: 'energy' },
        });
      }
      for (const s of day) {
        const t = tasks.get(s.taskId);
        list.push({
          id: id++,
          title: `En 10 min: ${t?.title ?? 'tu siguiente cosa'}`,
          body: `A las ${minToHm(s.start)}, sin prisa. Si hoy no puede ser, lo muevo a otro día.`,
          schedule: { at: at(d, s.start - 10) },
        });
      }
      list.push({
        id: id++,
        title: 'Hora de desconectar ☾',
        body: '¿Qué te ha hecho bien hoy? Escríbelo en tu diario y deja el resto para mañana.',
        schedule: { at: at(d, relaxStart(p)) },
      });
    }
    await LocalNotifications.schedule({
      notifications: list.filter((n) => n.schedule.at.getTime() > now + 60000).slice(0, 60),
    });
  } catch (e) {
    console.warn('notificaciones', e);
  }
}

// ---------------------------------------------------------------- abrir desde fuera

/** Enlaces sereno://add, sereno://energy… (widget, notificaciones, atajos de Siri). */
export async function onOpenUrl(handler: (action: string) => void): Promise<void> {
  if (!isNative) return;
  const { App } = await import('@capacitor/app');
  await App.addListener('appUrlOpen', ({ url }) => {
    const m = /^sereno:\/\/([a-z-]+)/i.exec(url);
    if (m) handler(m[1]);
  });
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  await LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const action = (e.notification.extra as { action?: string } | undefined)?.action;
    if (action) handler(action);
  });
}

export async function onResume(handler: () => void): Promise<void> {
  if (!isNative) return;
  const { App } = await import('@capacitor/app');
  await App.addListener('resume', handler);
}

export async function tapFeedback(): Promise<void> {
  if (!isNative) {
    try {
      navigator.vibrate?.(25);
    } catch {
      /* no soportado */
    }
    return;
  }
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Light });
}
