import { useMemo } from 'react';
import type { CategoryId } from '../types';
import { catById } from '../types';

interface Props {
  leaves: { id: string; category: CategoryId; big: boolean }[];
  buds: number;
  flowers: number;
  size?: number;
}

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

export function Bonsai({ leaves, buds, flowers, size = 300 }: Props) {
  const shown = leaves.slice(0, MAX);
  const growth = Math.min(1, shown.length / 45);
  const budCount = Math.min(buds, MAX - shown.length, 30);
  const flowerCount = Math.min(flowers, FLOWER_POS.length);

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
    >
      <defs>
        <linearGradient id="pot" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--pot-1)" />
          <stop offset="1" stopColor="var(--pot-2)" />
        </linearGradient>
      </defs>
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
      {/* maceta */}
      <rect x="88" y="232" width="124" height="10" rx="4" fill="var(--pot-1)" />
      <path d="M96 242 H204 L194 276 Q 193 280 188 280 H112 Q 107 280 106 276 Z" fill="url(#pot)" />
    </svg>
  );
}
