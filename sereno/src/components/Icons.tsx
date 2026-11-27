/**
 * Iconos propios de Sereno: trazo redondeado + relleno suave (dos tonos).
 * Sustituyen a los emojis para que todo tenga el mismo estilo, cálido y cuidado.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { CategoryId } from '../types';
import { catById } from '../types';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const F = { fill: 'currentColor', opacity: 0.22, stroke: 'none' };

export type IconName =
  | CategoryId
  | 'sunrise'
  | 'commute'
  | 'laptop'
  | 'coffee'
  | 'meal'
  | 'moon'
  | 'clock'
  | 'wind'
  | 'gear'
  | 'leaf'
  | 'note'
  | 'trash'
  | 'check'
  | 'plus'
  | 'spark'
  | 'balance'
  | 'person'
  | 'calendar'
  | 'flame'
  | 'star'
  | 'drag'
  | 'drop'
  | 'cart'
  | 'washer'
  | 'broom'
  | 'paw'
  | 'mail'
  | 'book'
  | 'run'
  | 'phone'
  | 'cheers'
  | 'music'
  | 'game'
  | 'camera'
  | 'film'
  | 'palette'
  | 'wand';

const PATHS: Record<IconName, ReactNode> = {
  bienestar: (
    <>
      <path d="M12 19c-3.5-1.5-5-4.5-5-8 2.2.6 4 2 5 4 1-2 2.8-3.4 5-4 0 3.5-1.5 6.5-5 8Z" {...F} />
      <path d="M12 19c-3.5-1.5-5-4.5-5-8 2.2.6 4 2 5 4 1-2 2.8-3.4 5-4 0 3.5-1.5 6.5-5 8Z" {...S} />
      <path d="M12 15c-1.2-2.5-1.2-5.5 0-9 1.2 3.5 1.2 6.5 0 9Z" {...S} />
      <path d="M4 19.5h16" {...S} />
    </>
  ),
  familia: (
    <>
      <path d="M4.5 10.5 12 4l7.5 6.5V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" {...F} />
      <path d="M4.5 10.5 12 4l7.5 6.5V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" {...S} />
      <path d="M12 17.2s-3-1.8-3-3.7a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.9-3 3.7-3 3.7Z" fill="currentColor" />
    </>
  ),
  pareja: (
    <>
      <path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" {...F} />
      <path d="M12 20s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z" {...S} />
      <path d="M8 10.2a2 2 0 0 1 1.6-1.6" {...S} />
    </>
  ),
  social: (
    <>
      <circle cx="9" cy="8.5" r="3" {...F} />
      <circle cx="9" cy="8.5" r="3" {...S} />
      <path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" {...S} />
      <circle cx="16.5" cy="9.5" r="2.4" {...S} />
      <path d="M16 14.3c2.4-.2 4.1 1.4 4.6 4" {...S} />
    </>
  ),
  proyectos: (
    <>
      <path d="M12 3.5c.7 4.3 2.2 5.8 6.5 6.5-4.3.7-5.8 2.2-6.5 6.5-.7-4.3-2.2-5.8-6.5-6.5 4.3-.7 5.8-2.2 6.5-6.5Z" {...F} />
      <path d="M12 3.5c.7 4.3 2.2 5.8 6.5 6.5-4.3.7-5.8 2.2-6.5 6.5-.7-4.3-2.2-5.8-6.5-6.5 4.3-.7 5.8-2.2 6.5-6.5Z" {...S} />
      <path d="M18.5 16v4M16.5 18h4" {...S} />
    </>
  ),
  aficiones: (
    <>
      <path d="M12 4a8 8 0 1 0 0 16c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.3-1.6-1.3-2.8 0-1 .8-1.7 1.8-1.7H17a3 3 0 0 0 3-3C20 7 16.4 4 12 4Z" {...F} />
      <path d="M12 4a8 8 0 1 0 0 16c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.3-1.6-1.3-2.8 0-1 .8-1.7 1.8-1.7H17a3 3 0 0 0 3-3C20 7 16.4 4 12 4Z" {...S} />
      <circle cx="8" cy="11" r="1.1" fill="currentColor" />
      <circle cx="10.5" cy="7.8" r="1.1" fill="currentColor" />
      <circle cx="14.5" cy="7.8" r="1.1" fill="currentColor" />
    </>
  ),
  autocuidado: (
    <>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="7" rx="2.6" ry="3.4" transform={`rotate(${a} 12 12)`} {...F} />
      ))}
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={`s${a}`} cx="12" cy="7" rx="2.6" ry="3.4" transform={`rotate(${a} 12 12)`} {...S} strokeWidth={1.5} />
      ))}
    </>
  ),
  hogar: (
    <>
      <path d="M7 14h10l-1.3 6H8.3Z" {...F} />
      <path d="M7 14h10l-1.3 6H8.3Z" {...S} />
      <path d="M12 14V9" {...S} />
      <path d="M12 10c-3 0-4.5-1.6-4.5-4.5 3 0 4.5 1.5 4.5 4.5Zm0-1c0-2.6 1.4-4 4.5-4 0 2.8-1.6 4-4.5 4Z" {...S} />
    </>
  ),
  gestiones: (
    <>
      <rect x="5.5" y="4" width="13" height="16.5" rx="2.4" {...F} />
      <rect x="5.5" y="4" width="13" height="16.5" rx="2.4" {...S} />
      <path d="M9 9h6M9 12.5h6M9 16h3.5" {...S} />
    </>
  ),
  trabajo: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.6" {...F} />
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.6" {...S} />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" {...S} />
    </>
  ),
  sunrise: (
    <>
      <path d="M6.5 17a5.5 5.5 0 0 1 11 0Z" {...F} />
      <path d="M6.5 17a5.5 5.5 0 0 1 11 0M3 17h18M12 4.5v2.5M5.6 8.6l1.6 1.6M18.4 8.6l-1.6 1.6M8 20h8" {...S} />
    </>
  ),
  commute: (
    <>
      <rect x="6" y="4" width="12" height="13" rx="3" {...F} />
      <rect x="6" y="4" width="12" height="13" rx="3" {...S} />
      <path d="M6 11h12M9 20l1.5-3M15 20l-1.5-3" {...S} />
      <circle cx="9.3" cy="14" r=".9" fill="currentColor" />
      <circle cx="14.7" cy="14" r=".9" fill="currentColor" />
    </>
  ),
  laptop: (
    <>
      <rect x="5" y="5.5" width="14" height="9.5" rx="1.8" {...F} />
      <rect x="5" y="5.5" width="14" height="9.5" rx="1.8" {...S} />
      <path d="M3 18.5h18" {...S} />
    </>
  ),
  coffee: (
    <>
      <path d="M5 10h11v4.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5Z" {...F} />
      <path d="M5 10h11v4.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5ZM16 11.5h1.2a2.3 2.3 0 0 1 0 4.6H16M8.5 4.5c-.8 1 .8 2 0 3M12 4.5c-.8 1 .8 2 0 3" {...S} />
    </>
  ),
  meal: (
    <>
      <path d="M4 12h16a8 8 0 0 1-16 0Z" {...F} />
      <path d="M4 12h16a8 8 0 0 1-16 0ZM9 8.5c0-1.4 1-1.4 1-2.8M13 8.5c0-1.4 1-1.4 1-2.8" {...S} />
    </>
  ),
  moon: (
    <>
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" {...F} />
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" {...S} />
      <path d="M16.5 4.5v2M15.5 5.5h2" {...S} />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" {...F} />
      <circle cx="12" cy="12" r="8" {...S} />
      <path d="M12 7.5V12l3 2" {...S} />
    </>
  ),
  wind: (
    <>
      <path d="M3.5 9h10a2.5 2.5 0 1 0-2.5-2.5M3.5 13h14a2.5 2.5 0 1 1-2.5 2.5M3.5 17h6" {...S} />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" {...S} />
      <path
        d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6"
        {...S}
      />
      <circle cx="12" cy="12" r="6" {...S} />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-14-.5 9-6 14-14 14Z" {...F} />
      <path d="M5 19c0-8 5-13 14-14-.5 9-6 14-14 14ZM5 19l7-7" {...S} />
    </>
  ),
  note: (
    <>
      <path d="M5 19.5 6 15 15.5 5.5a2.1 2.1 0 0 1 3 3L9 18Z" {...F} />
      <path d="M5 19.5 6 15 15.5 5.5a2.1 2.1 0 0 1 3 3L9 18ZM14 7l3 3" {...S} />
    </>
  ),
  trash: (
    <>
      <path d="M6.5 7.5h11l-.9 11.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3Z" {...F} />
      <path d="M4.5 7.5h15M9.5 7.5V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6.5 7.5l.9 11.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3l.9-11.2" {...S} />
    </>
  ),
  check: <path d="M5 12.5 10 17.5 19 7" {...S} strokeWidth={2.4} />,
  plus: <path d="M12 5v14M5 12h14" {...S} strokeWidth={2.4} />,
  spark: (
    <>
      <path d="M10 4c.6 3.6 1.9 4.9 5.5 5.5-3.6.6-4.9 1.9-5.5 5.5-.6-3.6-1.9-4.9-5.5-5.5C8.1 8.9 9.4 7.6 10 4Z" fill="currentColor" />
      <path d="M17.5 13.5c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8Z" fill="currentColor" opacity={0.6} />
    </>
  ),
  balance: (
    <>
      <circle cx="12" cy="12" r="8" {...S} />
      <path d="M12 4a4 4 0 0 1 0 8 4 4 0 0 0 0 8 8 8 0 0 1 0-16Z" {...F} opacity={0.45} />
      <circle cx="12" cy="8" r="1.1" fill="currentColor" />
      <circle cx="12" cy="16" r="1.1" fill="currentColor" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.4" {...F} />
      <circle cx="12" cy="8" r="3.4" {...S} />
      <path d="M5.5 20c.7-3.7 3.2-5.8 6.5-5.8s5.8 2.1 6.5 5.8" {...S} />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" {...F} />
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" {...S} />
      <path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" {...S} />
    </>
  ),
  flame: (
    <>
      <path d="M12 20.5a6 6 0 0 1-6-6c0-3.5 2.5-5 3.5-8.5 1.2 1.4 1.6 2.8 1.7 4 1-.8 1.8-2 2-3.5 2.7 2 4.8 4.8 4.8 8a6 6 0 0 1-6 6Z" {...F} />
      <path d="M12 20.5a6 6 0 0 1-6-6c0-3.5 2.5-5 3.5-8.5 1.2 1.4 1.6 2.8 1.7 4 1-.8 1.8-2 2-3.5 2.7 2 4.8 4.8 4.8 8a6 6 0 0 1-6 6Z" {...S} />
    </>
  ),
  star: (
    <>
      <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6Z" {...F} />
      <path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6Z" {...S} />
    </>
  ),
  drag: (
    <>
      {[8, 12, 16].map((y) => (
        <g key={y}>
          <circle cx="9.5" cy={y} r="1.2" fill="currentColor" />
          <circle cx="14.5" cy={y} r="1.2" fill="currentColor" />
        </g>
      ))}
    </>
  ),
  drop: (
    <>
      <path d="M12 3.8s6 6.4 6 10.4a6 6 0 0 1-12 0c0-4 6-10.4 6-10.4Z" {...F} />
      <path d="M12 3.8s6 6.4 6 10.4a6 6 0 0 1-12 0c0-4 6-10.4 6-10.4Z" {...S} />
      <path d="M9.2 14.5a2.8 2.8 0 0 0 2.3 2.6" {...S} />
    </>
  ),
  cart: (
    <>
      <path d="M6.5 7.5h13l-1.6 6.6a1.5 1.5 0 0 1-1.5 1.1H9.3a1.5 1.5 0 0 1-1.5-1.2Z" {...F} />
      <path d="M3.5 4.5h2.2l2.1 9.5a1.5 1.5 0 0 0 1.5 1.2h7.1a1.5 1.5 0 0 0 1.5-1.1l1.6-6.6H6.5" {...S} />
      <circle cx="9.5" cy="19" r="1.3" fill="currentColor" />
      <circle cx="16.5" cy="19" r="1.3" fill="currentColor" />
    </>
  ),
  washer: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="3" {...S} />
      <circle cx="12" cy="13.2" r="4.3" {...F} />
      <circle cx="12" cy="13.2" r="4.3" {...S} />
      <path d="M8 6.8h1.5M13.5 6.8h2.5" {...S} />
    </>
  ),
  broom: (
    <>
      <path d="M9.5 13.5 5 19.5h9l1.2-4.4Z" {...F} />
      <path d="M9.5 13.5 5 19.5h9l1.2-4.4ZM12.4 14.3 19 4.5M8 19.5l2-3.2M11 19.5l1.4-2.6" {...S} />
    </>
  ),
  paw: (
    <>
      <path d="M12 12.5c-3 0-5 2.6-5 4.6 0 1.6 1.3 2.4 2.6 2.4 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.3 0 2.6-.8 2.6-2.4 0-2-2-4.6-5-4.6Z" {...F} />
      <path d="M12 12.5c-3 0-5 2.6-5 4.6 0 1.6 1.3 2.4 2.6 2.4 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.3 0 2.6-.8 2.6-2.4 0-2-2-4.6-5-4.6Z" {...S} />
      <ellipse cx="6" cy="10.5" rx="1.6" ry="2" fill="currentColor" />
      <ellipse cx="9.5" cy="6.8" rx="1.6" ry="2.1" fill="currentColor" />
      <ellipse cx="14.5" cy="6.8" rx="1.6" ry="2.1" fill="currentColor" />
      <ellipse cx="18" cy="10.5" rx="1.6" ry="2" fill="currentColor" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="6" width="17" height="12.5" rx="2.6" {...F} />
      <rect x="3.5" y="6" width="17" height="12.5" rx="2.6" {...S} />
      <path d="m4.5 7.5 7.5 6 7.5-6" {...S} />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10.3 5.2 8 4.8 4.5 5v13c3.5-.2 5.8.2 7.5 1.5 1.7-1.3 4-1.7 7.5-1.5V5c-3.5-.2-5.8.2-7.5 1.5Z" {...F} />
      <path d="M12 6.5C10.3 5.2 8 4.8 4.5 5v13c3.5-.2 5.8.2 7.5 1.5 1.7-1.3 4-1.7 7.5-1.5V5c-3.5-.2-5.8.2-7.5 1.5ZM12 6.5v13" {...S} />
    </>
  ),
  run: (
    <>
      <circle cx="14.5" cy="4.8" r="1.9" fill="currentColor" />
      <path d="m7 11 3.2-2.6 3.8.6 2.2 3.2 2.8.6M10.5 20l2.2-5.2-2.7-2.4M12.8 14.8l3.2 1.6v3.6M5 16.5l3.5-.2 1.5-3.9" {...S} />
    </>
  ),
  phone: (
    <>
      <path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" {...F} />
      <path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" {...S} />
    </>
  ),
  cheers: (
    <>
      <path d="M5.5 4.5h5l-.4 4.3a2.1 2.1 0 0 1-4.2 0ZM13.5 4.5h5l-.4 4.3a2.1 2.1 0 0 1-4.2 0Z" {...F} />
      <path d="M5.5 4.5h5l-.4 4.3a2.1 2.1 0 0 1-4.2 0ZM13.5 4.5h5l-.4 4.3a2.1 2.1 0 0 1-4.2 0ZM8 11v8M16 11v8M5.5 19.5h5M13.5 19.5h5" {...S} />
    </>
  ),
  music: (
    <>
      <circle cx="7.5" cy="17" r="2.6" {...F} />
      <circle cx="16.5" cy="15" r="2.6" {...F} />
      <circle cx="7.5" cy="17" r="2.6" {...S} />
      <circle cx="16.5" cy="15" r="2.6" {...S} />
      <path d="M10.1 17V6.5l9-2V15" {...S} />
    </>
  ),
  game: (
    <>
      <path d="M7.5 7.5h9a4 4 0 0 1 4 4.4l-.5 4.4a2.3 2.3 0 0 1-4 1.2l-1.5-1.9h-5l-1.5 1.9a2.3 2.3 0 0 1-4-1.2l-.5-4.4a4 4 0 0 1 4-4.4Z" {...F} />
      <path d="M7.5 7.5h9a4 4 0 0 1 4 4.4l-.5 4.4a2.3 2.3 0 0 1-4 1.2l-1.5-1.9h-5l-1.5 1.9a2.3 2.3 0 0 1-4-1.2l-.5-4.4a4 4 0 0 1 4-4.4ZM8 10.5v3M6.5 12h3" {...S} />
      <circle cx="15.5" cy="11" r="1" fill="currentColor" />
      <circle cx="17" cy="13" r="1" fill="currentColor" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" {...F} />
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" {...S} />
      <circle cx="12" cy="12.8" r="3.3" {...S} />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.6" {...F} />
      <rect x="3.5" y="6" width="17" height="12" rx="2.6" {...S} />
      <path d="m10.3 9.6 4.2 2.4-4.2 2.4Z" fill="currentColor" />
    </>
  ),
  palette: (
    <>
      <circle cx="8.5" cy="9" r="4.5" fill="currentColor" opacity={0.35} />
      <circle cx="15.5" cy="9" r="4.5" fill="currentColor" opacity={0.6} />
      <circle cx="12" cy="15" r="4.5" fill="currentColor" opacity={0.85} />
    </>
  ),
  wand: (
    <>
      <path d="M4.5 19.5 15 9" {...S} strokeWidth={2.2} />
      <path d="M16.5 3.5c.4 2 1 2.6 3 3-2 .4-2.6 1-3 3-.4-2-1-2.6-3-3 2-.4 2.6-1 3-3Z" fill="currentColor" />
      <path d="M8 4.5c.2 1 .5 1.3 1.5 1.5-1 .2-1.3.5-1.5 1.5-.2-1-.5-1.3-1.5-1.5 1-.2 1.3-.5 1.5-1.5ZM19 13.5c.2 1 .5 1.3 1.5 1.5-1 .2-1.3.5-1.5 1.5-.2-1-.5-1.3-1.5-1.5 1-.2 1.3-.5 1.5-1.5Z" fill="currentColor" opacity={0.6} />
    </>
  ),
};


/** Icono concreto según lo que pone en la tarea (si no, el de su categoría) */
const BY_TITLE: [RegExp, IconName][] = [
  [/duch|bañ/i, 'drop'],
  [/compra|super/i, 'cart'],
  [/lavadora|ropa|tender|planchar/i, 'washer'],
  [/limpi|barrer|fregar el suelo|aspirar/i, 'broom'],
  [/cocin|comida|cena|almuerz|desayun|fregar|recoger|tupper/i, 'meal'],
  [/perro|gato|mascota/i, 'paw'],
  [/plantas|regar|jard/i, 'hogar'],
  [/recados|papeles|correo|email|factura|banco/i, 'mail'],
  [/leer|libro|estudi/i, 'book'],
  [/correr|ejercicio|moverme|gimnasio|gym|deporte|yoga|abdominal|estirar|nadar|natación/i, 'run'],
  [/llamar|teléfono|llamada/i, 'phone'],
  [/quedar|amig|cerveza|fiesta/i, 'cheers'],
  [/guitarra|piano|música|cantar|instrument|bailar/i, 'music'],
  [/foto/i, 'camera'],
  [/serie|cine|película/i, 'film'],
  [/dibuj|pint|manualidad/i, 'aficiones'],
  [/escribir|diario/i, 'note'],
  [/idioma|inglés|novela/i, 'book'],
  [/senderismo|monte/i, 'leaf'],
  [/juegos de mesa|puzzle/i, 'game'],
  [/videojuego|jugar|consola/i, 'game'],
  [/medit|respirar|recarga/i, 'bienestar'],
  [/pasear|paseo|aire libre/i, 'leaf'],
];
export function taskIcon(title: string | undefined, cat: CategoryId): IconName {
  if (title) for (const [re, icon] of BY_TITLE) if (re.test(title)) return icon;
  return cat;
}

export function Icon({ name, size = 22, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={`ico ${className ?? ''}`} style={style}>
      {PATHS[name]}
    </svg>
  );
}

/** Insignia redondeada con el color de la categoría (o el color propio de la tarea) */
export function CatIcon({ cat, size = 36, color, icon, title }: { cat: CategoryId; size?: number; color?: string; icon?: IconName; title?: string }) {
  return (
    <span className="cat-badge" style={{ '--c': color ?? catById(cat).color, width: size, height: size } as CSSProperties}>
      <Icon name={icon ?? taskIcon(title, cat)} size={Math.round(size * 0.58)} />
    </span>
  );
}

/** Icono pequeño en línea con el texto (chips, frases) */
export function CatMark({ cat, color, title }: { cat: CategoryId; color?: string; title?: string }) {
  return (
    <span className="cat-mark" style={{ '--c': color ?? catById(cat).color } as CSSProperties}>
      <Icon name={taskIcon(title, cat)} size={16} />
    </span>
  );
}

/** Pila: se llena y cambia de color con tu energía */
export function EnergyIcon({ value, size = 22 }: { value: number; size?: number }) {
  const color = value <= 30 ? '#E0705A' : value <= 50 ? '#F0A43A' : value <= 70 ? '#9BC25B' : '#3FAE7E';
  const w = Math.max(1.5, (13 * Math.min(100, value)) / 100);
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="ico energy-ico">
      <rect x="3" y="7.5" width="16.5" height="9" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" opacity={0.55} />
      <path d="M21 10.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.55} />
      <rect x="4.8" y="9.3" width={w} height="5.4" rx="1.4" fill={color} />
    </svg>
  );
}

/** Iconos de la barra de navegación */
export function TabIcon({ name }: { name: 'hoy' | 'calendario' | 'objetivos' | 'valores' | 'bonsai' }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" className="ico">
      {name === 'hoy' && (
        <>
          <circle cx="12" cy="12" r="4.2" {...F} opacity={0.35} />
          <circle cx="12" cy="12" r="4.2" {...S} />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" {...S} />
        </>
      )}
      {name === 'calendario' && PATHS.calendar}
      {name === 'objetivos' && (
        <>
          <circle cx="12" cy="12" r="8" {...F} />
          <circle cx="12" cy="12" r="8" {...S} />
          <circle cx="12" cy="12" r="4.3" {...S} />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        </>
      )}
      {name === 'valores' && (
        <>
          <circle cx="12" cy="12" r="8" {...S} />
          <path d="m14.8 9.2-1.7 3.9-3.9 1.7 1.7-3.9Z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </>
      )}
      {name === 'bonsai' && (
        <>
          <path d="M8 16h8l-1 4H9Z" {...F} opacity={0.35} />
          <path d="M8 16h8l-1 4H9ZM12 16v-4M12 12c-1.5-1-3-1.2-4.2-2.6M12 13c1.4-.8 2.8-1 4-2.6" {...S} />
          <circle cx="7.5" cy="8" r="2.6" {...F} opacity={0.35} />
          <circle cx="12" cy="6" r="3" {...F} opacity={0.35} />
          <circle cx="16.5" cy="8.4" r="2.6" {...F} opacity={0.35} />
          <circle cx="7.5" cy="8" r="2.6" {...S} />
          <circle cx="12" cy="6" r="3" {...S} />
          <circle cx="16.5" cy="8.4" r="2.6" {...S} />
        </>
      )}
    </svg>
  );
}
