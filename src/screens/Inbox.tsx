import { useState } from 'react';
import type { FamilyView } from '../lib/api';
import { wedgeById } from '../lib/wedges';
import { inboxFor } from '../lib/inbox';

export function Inbox({ view, onOpen, onApprove, onBack }: {
  view: FamilyView; onOpen: (playerId: string) => void; onApprove: (memberId: string) => Promise<void>; onBack: () => void;
}) {
  const { toConfirm, toApprove, count } = inboxFor(view);
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="screen">
      <button className="link back" onClick={onBack}>← Home</button>
      <h1>📬 My inbox</h1>
      {count === 0 && <p className="card soft">Nothing waiting for you right now. 💛</p>}
      <ul className="ideas">
        {toConfirm.map((p) => {
          const c = p.currentCard!;
          const w = wedgeById(c.wedge);
          const letter = c.type === 'letter';
          return (
            <li key={p.id} style={{ borderColor: w.color }}>
              <small className="muted">{w.icon} {w.name}</small>
              <p><b>{letter ? `✉️ ${p.name} sent you a letter` : `🔔 ${p.name} did a card with you`}</b></p>
              <p className="muted small">{c.text}</p>
              <button className="btn" onClick={() => onOpen(p.id)}>{letter ? 'Read the letter' : 'Confirm it'}</button>
            </li>
          );
        })}
        {toApprove.map((m) => (
          <li key={m.id} style={{ borderColor: '#f4a259' }}>
            <p><b>🏆 {m.avatar} {m.name} chose these rewards</b></p>
            <ul className="reward-list">{m.rewards.map((r) => <li key={r}>{r}</li>)}</ul>
            <p className="muted small">If you’d like changes, talk to {m.name} – they can update their profile and send them again.</p>
            <button className="btn" disabled={busy === m.id}
              onClick={async () => { setBusy(m.id); try { await onApprove(m.id); } finally { setBusy(null); } }}>✅ Approve rewards</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
