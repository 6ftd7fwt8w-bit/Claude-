/**
 * Lector mínimo de calendarios .ics (iCloud, Google Calendar, Outlook…).
 * Devuelve las citas con hora de los próximos días; las de "todo el día" se ignoran
 * (no ocupan un hueco concreto). Soporta repeticiones diarias y semanales sencillas.
 */
import type { ExternalEvent } from './scheduler';
import { addDays, fromKey, toKey, weekday } from './time';

interface RawEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
  rrule?: Record<string, string>;
  exdates: Set<string>;
}

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function unescape(v: string): string {
  return v.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\').trim();
}

/** 20261127T193000Z · 20261127T193000 · 20261127 */
function parseDate(value: string): { date: Date; allDay: boolean } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, se, z] = m;
  if (!h) return { date: new Date(+y, +mo - 1, +d), allDay: true };
  const date = z
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(se ?? 0)))
    : new Date(+y, +mo - 1, +d, +h, +mi, +(se ?? 0)); // con TZID: se asume la zona del dispositivo
  return { date, allDay: false };
}

export function parseIcs(text: string): RawEvent[] {
  const events: RawEvent[] = [];
  let cur: Partial<RawEvent> | null = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') {
      cur = { exdates: new Set() };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur?.start) {
        const end = cur.end ?? new Date(cur.start.getTime() + 60 * 60000);
        events.push({
          uid: cur.uid ?? `${cur.summary}-${cur.start.getTime()}`,
          summary: cur.summary ?? 'Cita',
          start: cur.start,
          end,
          allDay: !!cur.allDay,
          rrule: cur.rrule,
          exdates: cur.exdates ?? new Set(),
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).split(';')[0].toUpperCase();
    const value = line.slice(idx + 1);
    if (key === 'UID') cur.uid = value.trim();
    else if (key === 'SUMMARY') cur.summary = unescape(value);
    else if (key === 'DTSTART') {
      const d = parseDate(value);
      if (d) {
        cur.start = d.date;
        cur.allDay = d.allDay;
      }
    } else if (key === 'DTEND') {
      const d = parseDate(value);
      if (d) cur.end = d.date;
    } else if (key === 'RRULE') {
      cur.rrule = Object.fromEntries(value.split(';').map((kv) => kv.split('=') as [string, string]));
    } else if (key === 'EXDATE') {
      for (const v of value.split(',')) {
        const d = parseDate(v);
        if (d) cur.exdates?.add(toKey(d.date));
      }
    }
  }
  return events;
}

const BYDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** Expande las citas (y sus repeticiones) entre `from` y `from + days`. */
export function icsToEvents(text: string, from: string, days = 60): ExternalEvent[] {
  const to = addDays(from, days);
  const out: ExternalEvent[] = [];
  for (const e of parseIcs(text)) {
    if (e.allDay) continue;
    const duration = Math.max(5, Math.round((e.end.getTime() - e.start.getTime()) / 60000));
    const start = e.start.getHours() * 60 + e.start.getMinutes();
    const first = toKey(e.start);
    const push = (date: string) => {
      if (date >= from && date <= to && !e.exdates.has(date)) {
        out.push({ uid: e.uid, title: e.summary, date, start, duration });
      }
    };
    const r = e.rrule;
    if (!r || !['DAILY', 'WEEKLY'].includes(r.FREQ)) {
      push(first);
      continue;
    }
    const interval = Math.max(1, Number(r.INTERVAL ?? 1));
    const until = r.UNTIL ? parseDate(r.UNTIL)?.date : undefined;
    const untilKey = until ? toKey(until) : to;
    const maxCount = r.COUNT ? Number(r.COUNT) : Infinity;
    const days2 = r.BYDAY ? r.BYDAY.split(',').map((d) => BYDAY[d.slice(-2)]) : [weekday(first)];
    let count = 0;
    for (let d = first; d <= untilKey && d <= to && count < maxCount; d = addDays(d, 1)) {
      const diff = Math.round((fromKey(d).getTime() - fromKey(first).getTime()) / 86400000);
      const ok =
        r.FREQ === 'DAILY'
          ? diff % interval === 0
          : days2.includes(weekday(d)) && Math.floor(diff / 7) % interval === 0;
      if (!ok) continue;
      count++;
      push(d);
    }
  }
  return out;
}
