import { useState } from 'react';
import type { FamilyView } from '../lib/api';
import { wedgeById } from '../lib/wedges';
import { Dice } from '../components/Dice';
import { WedgePie } from '../components/WedgePie';
import { NudgeCard } from '../components/NudgeCard';
import { pendingNudge } from '../lib/nudges';
import { local, today } from '../lib/store';

type Phase = 'card' | 'letter' | 'sent';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** My turn, on my own phone: roll, do the card, send it to the other person to confirm. */
export function Play({ view, act, onExit }: { view: FamilyView; act: (a: any) => Promise<FamilyView | null>; onExit: () => void }) {
  const me = view.members.find((m) => m.id === view.me)!;
  const card = me.currentCard;
  const [phase, setPhase] = useState<Phase>(card?.status === 'awaiting' ? 'sent' : 'card');
  const [rolling, setRolling] = useState(false);
  const [letter, setLetter] = useState('');
  const [skips, setSkips] = useState(0);
  const [busy, setBusy] = useState(false);
  const [nudgeLater, setNudgeLater] = useState(false);
  const partner = view.members.find((m) => m.id === card?.withMemberId);
  const waiting = nudgeLater ? undefined : pendingNudge(me, today());

  const roll = async () => {
    setRolling(true);
    const [v] = await Promise.all([act({ type: 'roll' }), wait(1400)]);
    setRolling(false);
    if (v) { setPhase('card'); setLetter(''); }
  };
  const run = async (a: any, after?: () => void) => {
    setBusy(true);
    try { if (await act(a)) after?.(); } finally { setBusy(false); }
  };

  // No card yet: the dice.
  if (!card || rolling) {
    const played = me.lastRollDate === today();
    return (
      <div className="screen center">
        <button className="link back" onClick={onExit}>← Home</button>
        <h1>{me.avatar} My turn</h1>
        {waiting && !rolling && (
          <NudgeCard name={me.name} nudge={waiting.nudge} onLater={() => setNudgeLater(true)}
            onRead={(note) => {
              // A private note stays on this phone only – it is never sent to the server.
              if (note) local.set('notes', [...local.get<unknown[]>('notes', []), { date: waiting.date, id: waiting.nudge.id, note }]);
              act({ type: 'readNudge', date: waiting.date, id: waiting.nudge.id });
            }} />
        )}
        <WedgePie earned={me.wedges} size={120} />
        {me.wedges.length >= 5 ? (
          <p className="lead">You’ve completed the circle! Go back home to claim your reward. 🏆</p>
        ) : played && !rolling ? (
          <>
            <p className="lead">You've already played today. Come back tomorrow for a new card! 🌙</p>
            {me.isParent && <button className="link" onClick={() => run({ type: 'bonusRoll', memberId: me.id })}>Parent: give myself a bonus roll</button>}
          </>
        ) : (
          <>
            <Dice rolling={rolling} result={card?.wedge} />
            {!rolling && <button className="btn big" onClick={roll}>Roll the dice 🎲</button>}
            {rolling && <p className="lead">Rolling…</p>}
          </>
        )}
      </div>
    );
  }

  const w = wedgeById(card.wedge);
  const who = partner?.name ?? 'them';
  return (
    <div className="screen">
      <button className="link back" onClick={onExit}>← Home</button>
      <div className="task-card" style={{ ['--w' as string]: w.color }}>
        <div className="task-head"><span>{w.icon}</span><b>{w.name}</b><small>{w.tagline}</small></div>
        <p className="task-text">{card.text}</p>
        {phase !== 'sent' && (
          <p className="task-hint">
            {card.type === 'letter'
              ? `Write it here and send it – it arrives on ${who}’s phone. When ${who} has read it, you get the wedge.`
              : `When you’ve done it, ${who} confirms it on their own phone – then you get the wedge.`}
          </p>
        )}
      </div>

      {phase === 'card' && (
        <div className="col gap">
          {card.type === 'letter'
            ? <button className="btn big" onClick={() => setPhase('letter')}>✍️ Write to {who}</button>
            : <button className="btn big" disabled={busy} onClick={() => run({ type: 'send' }, () => setPhase('sent'))}>✅ I’ve done it – ask {who} to confirm</button>}
          <button className="btn ghost" disabled={busy} onClick={() => run({ type: 'notToday' }, () => setSkips(skips + 1))}>🌙 Not today – show another card</button>
          {skips > 0 && <p className="muted small center-text">That's OK. Skipping never costs you anything.</p>}
        </div>
      )}

      {phase === 'letter' && (
        <div className="paper">
          <p className="letter-to">Dear {who},</p>
          <textarea aria-label="Letter" rows={8} value={letter} onChange={(e) => setLetter(e.target.value)}
            placeholder="Take your time. There's no wrong way to write this." />
          <p className="muted small">Only {who} will be able to read this.</p>
          <button className="btn big" disabled={!letter.trim() || busy} onClick={() => run({ type: 'send', letter }, () => setPhase('sent'))}>
            ✉️ Send to {who}
          </button>
          <button className="btn ghost" onClick={() => setPhase('card')}>← Back</button>
        </div>
      )}

      {phase === 'sent' && (
        <div className="handover">
          <div className="handover-avatar">{partner?.avatar ?? '💌'}</div>
          <h2>{card.type === 'letter' ? `Sent to ${who} ✉️` : `Waiting for ${who}`}</h2>
          <p className="muted">
            {card.type === 'letter'
              ? `Your letter is waiting in ${who}’s inbox. When ${who} says they’ve read it, you get the ${w.name} wedge.`
              : `${who} will confirm on their own phone. Then the ${w.name} wedge is yours.`}
          </p>
          <button className="btn big" onClick={onExit}>Back home</button>
        </div>
      )}
    </div>
  );
}
