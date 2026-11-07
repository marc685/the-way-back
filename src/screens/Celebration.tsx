import { useState } from 'react';
import type { Member } from '../lib/types';
import { WedgePie } from '../components/WedgePie';

export function Celebration({ member, onNewRound }: { member: Member; onNewRound: () => void }) {
  const [claimed, setClaimed] = useState<string | undefined>(member.rewards.length === 1 ? member.rewards[0] : undefined);
  return (
    <div className="screen center celebrate">
      <div className="confetti" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => ['🎉', '✨', '🎊', '💛', '🎈'][i % 5]).map((c, i) => <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.3}s` }}>{c}</span>)}</div>
      <WedgePie earned={member.wedges} size={180} />
      <h1>{member.name} completed the circle!</h1>
      <p className="lead">Every wedge, every colour. That took courage and care.</p>
      {member.rewards.length > 1 && (
        <div className="claim">
          <p><b>Choose the reward you're claiming:</b></p>
          {member.rewards.map((r) => (
            <button key={r} className={`reward ${claimed === r ? 'on' : ''}`} aria-pressed={claimed === r} onClick={() => setClaimed(r)}>
              <span className="reward-icon">🏆</span><span className="grow">{r}</span>{claimed === r && <span className="tick">✓</span>}
            </button>
          ))}
        </div>
      )}
      {claimed && (
        <div className="card reward-card">
          <small className="muted">Your reward</small>
          <h2>🏆 {claimed}</h2>
          <p className="small">Show this screen to {member.age === 'adult' ? 'your family' : 'a parent'} to claim it.</p>
        </div>
      )}
      <button className="btn big" onClick={onNewRound} disabled={!claimed && member.rewards.length > 0}>Start a new circle</button>
    </div>
  );
}
