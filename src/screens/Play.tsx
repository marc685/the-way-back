import { useState } from 'react';
import type { DrawnCard, GameState, Member, WedgeId } from '../lib/types';
import { WEDGES, wedgeById } from '../lib/wedges';
import { deckFor } from '../lib/catalogue';
import { pendingNudge } from '../lib/nudges';
import { NudgeCard } from '../components/NudgeCard';
import { drawCard } from '../lib/cardEngine';
import { Dice } from '../components/Dice';
import { WedgePie } from '../components/WedgePie';
import { today } from '../lib/store';

type Phase = 'roll' | 'rolling' | 'card' | 'letter' | 'handover';

export function Play({ state, member, onUpdate, onExit, onHandOver }: {
  state: GameState;
  member: Member;
  onUpdate: (m: Member) => void;
  onExit: () => void;
  /** Player has done the card. confirmNow = the other person is here to confirm straight away. */
  onHandOver: (letter: string | undefined, confirmNow: boolean) => void;
}) {
  const startCard = member.currentCard;
  const [phase, setPhase] = useState<Phase>(!startCard ? 'roll' : startCard.status === 'awaiting' ? 'handover' : 'card');
  const [card, setCard] = useState<DrawnCard | undefined>(startCard);
  const [letter, setLetter] = useState(startCard?.letter ?? '');
  const [skips, setSkips] = useState(0);
  const [nudgeLater, setNudgeLater] = useState(false);
  const waiting = nudgeLater ? undefined : pendingNudge(member, today());

  const partner = state.members.find((m) => m.id === card?.withMemberId);
  const alreadyPlayed = member.lastRollDate === today() && !member.currentCard;
  // Avoid repeating cards this member has done recently.
  const recent = state.journal.filter((j) => j.memberId === member.id).slice(-15).map((j) => j.cardId);

  const draw = (wedge: WedgeId, avoidId?: string) =>
    drawCard(deckFor(state, wedge), wedge, member, state.members, {
      plus: state.plus, avoid: avoidId ? [...recent, avoidId] : recent,
      hidden: state.hidden, favourites: state.favourites,
    });

  const roll = () => {
    setPhase('rolling');
    const missing = WEDGES.filter((w) => !member.wedges.includes(w.id)).map((w) => w.id);
    const wedge = missing[Math.floor(Math.random() * missing.length)];
    setTimeout(() => {
      const c = draw(wedge)!;
      setCard(c);
      setLetter('');
      onUpdate({ ...member, lastRollDate: today(), currentCard: c });
      setTimeout(() => setPhase('card'), 700);
    }, 1400);
  };

  const notToday = () => {
    if (!card) return;
    const c = draw(card.wedge, card.cardId)!;
    setCard(c);
    setLetter('');
    setSkips(skips + 1);
    onUpdate({ ...member, currentCard: c });
  };

  const w = card ? wedgeById(card.wedge) : undefined;

  if (phase === 'roll' || phase === 'rolling') {
    return (
      <div className="screen center">
        <button className="link back" onClick={onExit}>← Home</button>
        <h1>{member.avatar} {member.name}'s turn</h1>
        {waiting && phase === 'roll' && (
          <NudgeCard name={member.name} nudge={waiting.nudge} onLater={() => setNudgeLater(true)}
            onRead={(note) => onUpdate({ ...member, nudgeLog: [...member.nudgeLog, { date: waiting.date, id: waiting.nudge.id, note }] })} />
        )}
        <WedgePie earned={member.wedges} size={120} />
        {alreadyPlayed ? (
          <>
            <p className="lead">You've already played today. Come back tomorrow for a new card! 🌙</p>
            <button className="link" onClick={() => onUpdate({ ...member, lastRollDate: undefined })}>
              Parent: give a bonus roll
            </button>
          </>
        ) : (
          <>
            <Dice rolling={phase === 'rolling'} result={card?.wedge} />
            {phase === 'roll' && <button className="btn big" onClick={roll}>Roll the dice 🎲</button>}
            {phase === 'rolling' && <p className="lead">Rolling…</p>}
          </>
        )}
      </div>
    );
  }

  if (!card || !w || !partner) return null;

  return (
    <div className="screen">
      <button className="link back" onClick={onExit}>← Save for later</button>
      <div className="task-card" style={{ ['--w' as string]: w.color }}>
        <div className="task-head"><span>{w.icon}</span><b>{w.name}</b><small>{w.tagline}</small></div>
        <p className="task-text">{card.text}</p>
        <p className="task-hint">
          {card.type === 'letter' ? `Write it here – ${partner.name} will read it when they confirm. ` : ''}
          When you've done it, {partner.name} confirms – then you get the wedge.
        </p>
      </div>

      {phase === 'card' && (
        <div className="col gap">
          {card.type === 'letter'
            ? <button className="btn big" onClick={() => setPhase('letter')}>✍️ Write to {partner.name}</button>
            : <button className="btn big" onClick={() => setPhase('handover')}>✅ I've done it</button>}
          <button className="btn ghost" onClick={notToday}>🌙 Not today – show another card</button>
          {skips > 0 && <p className="muted small center-text">That's OK. Skipping never costs you anything.</p>}
        </div>
      )}

      {phase === 'letter' && (
        <div className="paper">
          <p className="letter-to">Dear {partner.name},</p>
          <textarea aria-label="Letter" rows={8} value={letter} onChange={(e) => setLetter(e.target.value)}
            placeholder="Take your time. There's no wrong way to write this." />
          <button className="btn big" disabled={!letter.trim()} onClick={() => setPhase('handover')}>Done – give it to {partner.name}</button>
          <button className="btn ghost" onClick={() => setPhase('card')}>← Back</button>
        </div>
      )}

      {phase === 'handover' && (
        <div className="handover">
          <div className="handover-avatar">{partner.avatar}</div>
          <h2>Hand the phone to {partner.name}</h2>
          <p className="muted">{partner.name} confirms you did it and sends you a message back. Then the wedge is yours.</p>
          <button className="btn big" onClick={() => onHandOver(card.type === 'letter' ? letter : undefined, true)}>
            {partner.name} is here – confirm now
          </button>
          <button className="btn ghost" onClick={() => onHandOver(card.type === 'letter' ? letter : undefined, false)}>
            {partner.name} will confirm later
          </button>
          {card.status !== 'awaiting' && (
            <button className="link" onClick={() => setPhase(card.type === 'letter' ? 'letter' : 'card')}>← Back</button>
          )}
        </div>
      )}
    </div>
  );
}
