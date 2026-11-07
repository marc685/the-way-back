import { useEffect, useState } from 'react';
import { WEDGES, wedgeById } from '../lib/wedges';
import type { WedgeId } from '../lib/types';

/**
 * A colour die. It tumbles through faces, then lands on `result`.
 * The landing wedge is decided by the caller, so it always lands on a wedge
 * the player still needs.
 */
export function Dice({ rolling, result }: { rolling: boolean; result?: WedgeId }) {
  const [face, setFace] = useState(0);
  useEffect(() => {
    if (!rolling) return;
    const t = setInterval(() => setFace((f) => (f + 1) % WEDGES.length), 90);
    return () => clearInterval(t);
  }, [rolling]);
  const w = !rolling && result ? wedgeById(result) : WEDGES[face];
  return (
    <div className={`dice ${rolling ? 'tumble' : 'landed'}`} style={{ background: w.color }} aria-live="polite">
      <span className="dice-icon">{w.icon}</span>
      {!rolling && result && <span className="sr-only">Landed on {w.name}</span>}
    </div>
  );
}
