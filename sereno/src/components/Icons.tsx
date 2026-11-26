/** Iconos de línea, finos y geométricos (para la barra de navegación) */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function TabIcon({ name }: { name: 'hoy' | 'calendario' | 'objetivos' | 'valores' | 'bonsai' }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {name === 'hoy' && (
        <>
          <circle cx="12" cy="12" r="8" {...P} />
          <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
        </>
      )}
      {name === 'calendario' && (
        <>
          <rect x="4" y="5" width="16" height="15" rx="3" {...P} />
          <path d="M4 10h16M9 3v4M15 3v4" {...P} />
          <circle cx="12" cy="15" r="1.4" fill="currentColor" />
        </>
      )}
      {name === 'objetivos' && (
        <>
          <path d="M12 3.5 20.5 12 12 20.5 3.5 12Z" {...P} />
          <path d="M12 8.5 15.5 12 12 15.5 8.5 12Z" fill="currentColor" />
        </>
      )}
      {name === 'valores' && (
        <>
          <circle cx="12" cy="12" r="8" {...P} />
          <circle cx="12" cy="12" r="4.2" {...P} />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" />
        </>
      )}
      {name === 'bonsai' && (
        <>
          <path d="M12 20v-7M12 13c-2-1-3.5-1-5-3M12 15c2-1 3.5-1.5 5-3.5" {...P} />
          <circle cx="7" cy="8.5" r="2.6" {...P} />
          <circle cx="17" cy="9" r="2.6" {...P} />
          <circle cx="12" cy="6" r="2.8" {...P} />
          <path d="M8 20h8" {...P} />
        </>
      )}
    </svg>
  );
}
