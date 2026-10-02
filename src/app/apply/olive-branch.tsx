// A sprig of olive drawn in SVG, and the blurred shadow a sprig casts on the wall.
// Leaves are placed by hand along a gently curving stem: [x, y, angle, length].
const LEAVES: [number, number, number, number][] = [
  [40, 18, -40, 58],
  [62, 26, 35, 62],
  [96, 40, -30, 66],
  [120, 52, 45, 60],
  [154, 66, -20, 70],
  [178, 80, 55, 64],
  [212, 96, -10, 68],
  [236, 112, 60, 58],
  [262, 128, 15, 54],
  [282, 142, 70, 46],
];
const OLIVES: [number, number, number][] = [
  [108, 62, 20],
  [124, 70, -15],
  [200, 106, 30],
];
const STEM = "M0 0 C 70 20, 160 60, 300 150";
const LEAF = (len: number) =>
  `M0 0 C ${len * 0.25} ${-len * 0.2}, ${len * 0.7} ${-len * 0.18}, ${len} 0 C ${len * 0.7} ${len * 0.18}, ${len * 0.25} ${len * 0.2}, 0 0 Z`;

export function OliveBranch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-10 -40 330 230" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="olive-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d8a5a" />
          <stop offset="1" stopColor="#4c5a33" />
        </linearGradient>
        <radialGradient id="olive-fruit" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#9aa25c" />
          <stop offset="1" stopColor="#4f5626" />
        </radialGradient>
      </defs>
      <path d={STEM} fill="none" stroke="#6b5d45" strokeWidth="2.5" strokeLinecap="round" />
      {LEAVES.map(([x, y, angle, len]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${angle})`}>
          <path d={LEAF(len)} fill="url(#olive-leaf)" />
          <path d={`M2 0 L ${len - 4} 0`} stroke="#c9cfae" strokeWidth="0.8" opacity="0.7" />
        </g>
      ))}
      {OLIVES.map(([x, y, angle]) => (
        <ellipse
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          rx="11"
          ry="14"
          transform={`rotate(${angle} ${x} ${y})`}
          fill="url(#olive-fruit)"
        />
      ))}
    </svg>
  );
}

// The same sprig as a soft shadow, as if a tree outside the frame were lit by low sun.
export function OliveShadow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-10 -40 330 230" aria-hidden="true" className={className}>
      <defs>
        <filter id="olive-blur">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <g filter="url(#olive-blur)" fill="#3d3a30">
        <path d={STEM} fill="none" stroke="#3d3a30" strokeWidth="3" />
        {LEAVES.map(([x, y, angle, len]) => (
          <path key={`${x}-${y}`} d={LEAF(len)} transform={`translate(${x} ${y}) rotate(${angle})`} />
        ))}
      </g>
    </svg>
  );
}
