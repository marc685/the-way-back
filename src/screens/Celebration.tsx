import type { Member } from '../lib/types';
import { WedgePie } from '../components/WedgePie';

export function Celebration({ member, onNewRound }: { member: Member; onNewRound: () => void }) {
  return (
    <div className="screen center celebrate">
      <div className="confetti" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => ['🎉', '✨', '🎊', '💛', '🎈'][i % 5]).map((c, i) => <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.3}s` }}>{c}</span>)}</div>
      <WedgePie earned={member.wedges} size={180} />
      <h1>{member.name} completed the circle!</h1>
      <p className="lead">Every wedge, every colour. That took courage and care.</p>
      <div className="card reward-card">
        <small className="muted">Your reward</small>
        <h2>🏆 {member.reward}</h2>
        <p className="small">Show this screen to a parent to claim it.</p>
      </div>
      <button className="btn big" onClick={onNewRound}>Start a new circle</button>
    </div>
  );
}
