import { useState } from 'react';
import type { Feeling } from '../lib/types';
import type { FamilyView } from '../lib/api';
import { wedgeById } from '../lib/wedges';
import { FEELINGS } from '../lib/confirm';
import { WedgePie } from '../components/WedgePie';

/** On the recipient's own phone: read the letter (or check the card) and confirm it. */
export function Confirm({ view, playerId, act, onDone }: {
  view: FamilyView; playerId: string; act: (a: any) => Promise<FamilyView | null>; onDone: () => void;
}) {
  const player = view.members.find((m) => m.id === playerId);
  const me = view.members.find((m) => m.id === view.me)!;
  const [card] = useState(player?.currentCard);
  const [feeling, setFeeling] = useState<Feeling>();
  const [reply, setReply] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!player || !card || card.withMemberId !== me.id) {
    return (
      <div className="screen center">
        <p className="lead">This has already been confirmed. 💛</p>
        <button className="btn big" onClick={onDone}>Back</button>
      </div>
    );
  }
  const w = wedgeById(card.wedge);
  const letter = card.type === 'letter';

  if (done) {
    return (
      <div className="screen center">
        <div className="pop-in"><WedgePie earned={player.wedges} size={160} highlight={card.wedge} /></div>
        <h1>{player.name} earned the {w.name} wedge! {w.icon}</h1>
        <p className="lead">Thank you, {me.name}. {player.name} will see your message.</p>
        <button className="btn big" onClick={onDone}>Back</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <button className="link back" onClick={onDone}>← Later</button>
      <h1>{letter ? `✉️ A letter from ${player.name}` : `Did ${player.name} do this with you?`}</h1>
      <div className="task-card" style={{ ['--w' as string]: w.color }}>
        <div className="task-head"><span>{w.icon}</span><b>{w.name}</b><small>{player.avatar} {player.name}'s card</small></div>
        <p className="task-text">{card.text}</p>
      </div>

      {letter && (
        <div className="paper read">
          <p className="letter-to">Dear {me.name},</p>
          <p className="letter-body">{card.letter}</p>
          <p className="muted small">– {player.name}</p>
        </div>
      )}

      <div className="field">
        <label>{letter ? 'How did it feel to read it?' : 'How was it for you?'}</label>
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
        <textarea id="reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="e.g. Thank you – that made my day!" />
      </div>

      <div className="col gap">
        <button className="btn big" disabled={!feeling || busy} onClick={async () => {
          setBusy(true);
          try { if (await act({ type: 'confirm', playerId: player.id, feeling: feeling!, reply })) setDone(true); } finally { setBusy(false); }
        }}>
          ✅ {letter ? `Yes, I read the letter from ${player.name}` : 'Yes, we did this'}
        </button>
        {!feeling && <p className="muted small center-text">Choose how it was for you first.</p>}
        {!letter && (
          <button className="btn ghost" disabled={busy} onClick={async () => { if (await act({ type: 'notYet', playerId: player.id })) onDone(); }}>
            Not yet – give it back to {player.name}
          </button>
        )}
      </div>
    </div>
  );
}
