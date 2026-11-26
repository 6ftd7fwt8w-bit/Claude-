import { useMemo, type CSSProperties } from 'react';
import type { CategoryId } from '../types';
import { catById } from '../types';

interface Props {
  leaves: { id: string; category: CategoryId; big: boolean }[];
  buds: number;
  flowers: number;
  size?: number;
  season?: string;
  pot?: string;
  scene?: string;
  extras?: string[];
}

const SEASONS: Record<string, { canopy: string; blossom: string; core: string; extraFlowers: number }> = {
  primavera: { canopy: '#e8b4c3', blossom: '#f7c9d4', core: '#e27f98', extraFlowers: 8 },
  verano: { canopy: '#86c493', blossom: '#fff3b0', core: '#f0b840', extraFlowers: 0 },
  otono: { canopy: '#e6a46b', blossom: '#f6c47a', core: '#c8643b', extraFlowers: 2 },
  invierno: { canopy: '#c9d9de', blossom: '#ffffff', core: '#b9cfe0', extraFlowers: 0 },
};

const POTS: Record<string, [string, string]> = {
  terracota: ['#c98b6b', '#a96d51'],
  celadon: ['#a7d3c0', '#74a993'],
  indigo: ['#5a70ad', '#38487f'],
  blanca: ['#f4f2ec', '#d9d4c8'],
  dorada: ['#3d3a38', '#262423'],
};

const CLUSTERS = [
  { x: 150, y: 74, rx: 60, ry: 30 },
  { x: 86, y: 126, rx: 46, ry: 24 },
  { x: 216, y: 116, rx: 48, ry: 25 },
  { x: 110, y: 178, rx: 36, ry: 18 },
  { x: 198, y: 172, rx: 34, ry: 17 },
];
// orden de crecimiento: reparte las hojas entre las copas según su tamaño
const ORDER = [0, 1, 2, 0, 3, 4, 1, 2, 0, 3, 1, 2, 4, 0];
const MAX = 120;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function positions(seed: number, n: number) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const c = CLUSTERS[ORDER[i % ORDER.length]];
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.95;
    return { x: c.x + Math.cos(a) * c.rx * d, y: c.y + Math.sin(a) * c.ry * d, rot: r() * 180 - 90 };
  });
}

const LEAF_POS = positions(7, MAX);
const FLOWER_POS = positions(99, 12);

export function Bonsai({ leaves, buds, flowers, size = 300, season = 'verano', pot = 'terracota', scene = 'ninguno', extras = [] }: Props) {
  const shown = leaves.slice(0, MAX);
  const growth = Math.min(1, shown.length / 45);
  const budCount = Math.min(buds, MAX - shown.length, 30);
  const sea = SEASONS[season] ?? SEASONS.verano;
  const flowerCount = Math.min(flowers + (shown.length ? Math.min(sea.extraFlowers, Math.ceil(shown.length / 4)) : 0), FLOWER_POS.length);
  const [pot1, pot2] = POTS[pot] ?? POTS.terracota;

  const leafEls = useMemo(
    () =>
      shown.map((l, i) => {
        const p = LEAF_POS[i];
        const c = catById(l.category).color;
        const s = l.big ? 1.35 : 1;
        return (
          <g key={l.id} transform={`translate(${p.x} ${p.y}) rotate(${p.rot}) scale(${s})`}>
            <ellipse className="leaf" style={{ animationDelay: `${Math.min(i, 30) * 12}ms` }} rx="7" ry="4" fill={c} />
          </g>
        );
      }),
    [shown],
  );

  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      role="img"
      aria-label={`Bonsái con ${shown.length} hojas y ${flowerCount} flores`}
      className="bonsai"
      style={{ '--canopy': sea.canopy, '--blossom': sea.blossom, '--blossom-core': sea.core, '--pot-1': pot1, '--pot-2': pot2 } as CSSProperties}
    >
      <defs>
        <linearGradient id="pot" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--pot-1)" />
          <stop offset="1" stopColor="var(--pot-2)" />
        </linearGradient>
      </defs>
      <Scene scene={scene} />
      <ellipse cx="150" cy="284" rx="88" ry="8" fill="var(--shadow)" />
      <g className="sway">
        {/* tronco y ramas */}
        <g stroke="var(--bark)" strokeLinecap="round" fill="none">
          <path d="M150 238 C 138 216, 128 200, 146 184 C 164 168, 162 150, 148 136 C 136 122, 146 102, 150 84" strokeWidth="15" />
          <path d="M146 150 Q 118 140 90 128" strokeWidth="7" />
          <path d="M152 126 Q 186 122 212 116" strokeWidth="7" />
          <path d="M146 188 Q 128 182 112 178" strokeWidth="6" />
          <path d="M156 170 Q 180 174 196 172" strokeWidth="5" />
          <path d="M150 96 Q 132 84 118 76" strokeWidth="4" />
          <path d="M150 92 Q 170 80 186 72" strokeWidth="4" />
        </g>
        {/* copas: se hacen más densas con el progreso */}
        {CLUSTERS.map((c, i) => (
          <ellipse key={i} cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} fill="var(--canopy)" opacity={0.18 + growth * 0.45} />
        ))}
        {/* brotes: lo que aún puede crecer este mes */}
        {Array.from({ length: budCount }, (_, i) => {
          const p = LEAF_POS[shown.length + i];
          return <circle key={`b${i}`} cx={p.x} cy={p.y} r="2.6" className="bud" />;
        })}
        {leafEls}
        {Array.from({ length: flowerCount }, (_, i) => {
          const p = FLOWER_POS[i];
          return (
            <g key={`f${i}`} transform={`translate(${p.x} ${p.y})`} className="flower">
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} rx="2.6" ry="4.4" cy="-3.6" fill="var(--blossom)" transform={`rotate(${a})`} />
              ))}
              <circle r="2" fill="var(--blossom-core)" />
            </g>
          );
        })}
      </g>
      {season === 'invierno' &&
        CLUSTERS.map((c, i) => (
          <path key={`snow${i}`} d={`M${c.x - c.rx * 0.8} ${c.y - c.ry * 0.55} Q ${c.x} ${c.y - c.ry * 1.25} ${c.x + c.rx * 0.8} ${c.y - c.ry * 0.55} Q ${c.x} ${c.y - c.ry * 0.8} ${c.x - c.rx * 0.8} ${c.y - c.ry * 0.55} Z`} fill="#fff" opacity="0.9" />
        ))}
      {/* maceta */}
      <rect x="88" y="232" width="124" height="10" rx="4" fill="var(--pot-1)" />
      <path d="M96 242 H204 L194 276 Q 193 280 188 280 H112 Q 107 280 106 276 Z" fill="url(#pot)" />
      {pot === 'dorada' && (
        <path d="M118 244 L 132 258 L 126 268 L 140 279 M 176 243 L 168 256 L 182 266" stroke="#e5c15b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
      {extras.includes('piedra') && (
        <g>
          <ellipse cx="236" cy="278" rx="16" ry="7" fill="#9aa39c" />
          <ellipse cx="236" cy="268" rx="11" ry="5.5" fill="#b4bcb5" />
          <ellipse cx="236" cy="260" rx="7" ry="4" fill="#cbd2cc" />
        </g>
      )}
      {extras.includes('farolillo') && (
        <g className="lantern">
          <rect x="52" y="246" width="6" height="34" fill="#6e6259" />
          <rect x="43" y="226" width="24" height="22" rx="4" fill="#e7a65a" />
          <rect x="47" y="230" width="16" height="14" rx="3" fill="#ffe1a3" />
          <rect x="40" y="222" width="30" height="5" rx="2" fill="#6e6259" />
        </g>
      )}
      {extras.includes('mariposas') && (
        <g fontSize="14">
          <text x="236" y="70" className="flutter">🦋</text>
          <text x="48" y="104" className="flutter slow">🦋</text>
        </g>
      )}
      {extras.includes('pajaro') && (
        <text x="194" y="104" fontSize="17">🐦</text>
      )}
    </svg>
  );
}

function Scene({ scene }: { scene: string }) {
  if (scene === 'amanecer')
    return (
      <g>
        <defs>
          <linearGradient id="sky-am" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffd8b8" />
            <stop offset="1" stopColor="#fff3e6" />
          </linearGradient>
        </defs>
        <rect width="300" height="300" rx="26" fill="url(#sky-am)" />
        <circle cx="236" cy="66" r="26" fill="#ffb27a" opacity="0.8" />
      </g>
    );
  if (scene === 'luna')
    return (
      <g>
        <rect width="300" height="300" rx="26" fill="#2b3a5c" />
        {[[30, 40], [80, 22], [130, 50], [250, 120], [270, 30], [40, 150], [200, 30], [110, 18]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 ? 1.2 : 1.8} fill="#fff" opacity="0.8" />
        ))}
        <circle cx="242" cy="62" r="20" fill="#f6efd5" />
        <circle cx="252" cy="56" r="18" fill="#2b3a5c" />
      </g>
    );
  if (scene === 'montana')
    return (
      <g>
        <rect width="300" height="300" rx="26" fill="#eef1f4" />
        <path d="M0 210 L 60 140 L 110 190 L 170 120 L 240 200 L 300 150 L 300 300 L 0 300 Z" fill="#c9d3de" />
        <path d="M0 240 L 80 190 L 150 235 L 220 185 L 300 230 L 300 300 L 0 300 Z" fill="#dbe2e9" />
      </g>
    );
  return null;
}
