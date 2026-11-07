import { useState } from 'react';
import type { Feeling, GameState, Member } from '../lib/types';
import { wedgeById } from '../lib/wedges';
import { FEELINGS } from '../lib/confirm';
import { WedgePie } from '../components/WedgePie';

export function Confirm({ state, player, onConfirm, onNotYet, onDone, onBack }: {
  state: GameState;
  player: Member;
  onConfirm: (feeling: Feeling, reply: string) => void;
  onNotYet: () => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [card] = useState(player.currentCard);
  const [feeling, setFeeling] = useState<Feeling>();
  const [reply, setReply] = useState('');
  const [done, setDone] = useState(false);
  const confirmer = state.members.find((m) => m.id === card?.withMemberId);
  if (!card || !confirmer) return null;
  const w = wedgeById(card.wedge);

  if (done) {
    return (
      <div className="screen center">
        <div className="pop-in"><WedgePie earned={player.wedges} size={160} highlight={card.wedge} /></div>
        <h1>{player.name} earned the {w.name} wedge! {w.icon}</h1>
        <p className="lead">Thank you, {confirmer.name}. Your message is in the family journal for {player.name}.</p>
        <button className="btn big" onClick={onDone}>Back to the family</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <button className="link back" onClick={onBack}>← Confirm later</button>
      <p className="step">For {confirmer.avatar} {confirmer.name}</p>
      <h1>{confirmer.name}, did {player.name} do this with you?</h1>
      <div className="task-card" style={{ ['--w' as string]: w.color }}>
        <div className="task-head"><span>{w.icon}</span><b>{w.name}</b><small>{player.avatar} {player.name}'s card</small></div>
        <p className="task-text">{card.text}</p>
      </div>

      {card.letter && (
        <div className="paper read">
          <p className="letter-to">Dear {confirmer.name},</p>
          <p className="letter-body">{card.letter}</p>
          <p className="muted small">– {player.name}</p>
        </div>
      )}

      <div className="field">
        <label>How was it for you?</label>
        <div className="feelings" role="radiogroup" aria-label="How was it for you?">
          {FEELINGS.map((f) => (
            <button key={f.id} role="radio" aria-checked={feeling === f.id}
              className={`feeling ${feeling === f.id ? 'on' : ''}`} onClick={() => setFeeling(f.id)}>
              <span>{f.icon}</span>{f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="reply">A message back to {player.name} (optional)</label>
        <textarea id="reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)}
          placeholder={`e.g. Thank you – that made my day!`} />
      </div>

      <div className="col gap">
        <button className="btn big" disabled={!feeling} onClick={() => { onConfirm(feeling!, reply); setDone(true); }}>
          ✅ Yes, we did this
        </button>
        {!feeling && <p className="muted small center-text">Choose how it was for you first.</p>}
        <button className="btn ghost" onClick={onNotYet}>Not yet – give it back to {player.name}</button>
      </div>
    </div>
  );
}
