import { WEDGES } from '../lib/wedges';
import type { WedgeId } from '../lib/types';

/** Trivial-Pursuit-style pie: one segment per wedge, filled when earned. */
export function WedgePie({ earned, size = 64, highlight }: { earned: WedgeId[]; size?: number; highlight?: WedgeId }) {
  const r = 46;
  const seg = (i: number) => {
    const a0 = (i / 5) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / 5) * 2 * Math.PI - Math.PI / 2;
    return `M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)}Z`;
  };
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" role="img"
      aria-label={`${earned.length} of 5 wedges earned`}>
      <circle r="49" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
      {WEDGES.map((w, i) => {
        const has = earned.includes(w.id);
        return (
          <path key={w.id} d={seg(i)} fill={has ? w.color : 'var(--empty)'}
            stroke="var(--surface)" strokeWidth="3"
            className={highlight === w.id ? 'pop' : undefined} />
        );
      })}
      <circle r="10" fill="var(--surface)" />
    </svg>
  );
}
