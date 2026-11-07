import { useState } from 'react';
import type { DrawnCard, GameState, JournalEntry, Member, WedgeId } from '../lib/types';
import { WEDGES, wedgeById } from '../lib/wedges';
import { DECKS } from '../lib/decks';
import { drawCard } from '../lib/cardEngine';
import { Dice } from '../components/Dice';
import { WedgePie } from '../components/WedgePie';
import { today, uid } from '../lib/store';

type Phase = 'roll' | 'rolling' | 'card' | 'letter' | 'repair' | 'done';

export function Play({ state, member, onUpdate, onExit, onComplete }: {
  state: GameState;
  member: Member;
  onUpdate: (m: Member) => void;
  onExit: () => void;
  onComplete: (m: Member, entry: JournalEntry) => void;
}) {
  const [phase, setPhase] = useState<Phase>(member.currentCard ? 'card' : 'roll');
  const [card, setCard] = useState<DrawnCard | undefined>(member.currentCard);
  const [note, setNote] = useState('');
  const partner = state.members.find((m) => m.id === member.currentCard?.withMemberId);
  const [letter, setLetter] = useState({ to: partner ? `Dear ${partner.name},` : '', body: '', deliver: false });
  const [repair, setRepair] = useState({ happened: '', felt: '', step: '' });
  const [repairStep, setRepairStep] = useState(0);
  const [skips, setSkips] = useState(0);

  const alreadyPlayed = member.lastRollDate === today() && !member.currentCard;
  // Avoid repeating cards this member has done recently.
  const recent = state.journal.filter((j) => j.memberId === member.id).slice(-15).map((j) => j.cardId);

  const draw = (wedge: WedgeId, avoidId?: string) =>
    drawCard(DECKS[wedge], wedge, member, state.members, {
      plus: state.plus, avoid: avoidId ? [...recent, avoidId] : recent,
    });

  const roll = () => {
    setPhase('rolling');
    const missing = WEDGES.filter((w) => !member.wedges.includes(w.id)).map((w) => w.id);
    const wedge = missing[Math.floor(Math.random() * missing.length)];
    setTimeout(() => {
      const c = draw(wedge)!;
      setCard(c);
      const p = state.members.find((m) => m.id === c.withMemberId);
      setLetter((l) => ({ ...l, to: p ? `Dear ${p.name},` : '' }));
      onUpdate({ ...member, lastRollDate: today(), currentCard: c });
      setTimeout(() => setPhase('card'), 700);
    }, 1400);
  };

  const notToday = () => {
    if (!card) return;
    const c = draw(card.wedge, card.cardId)!;
    setCard(c);
    const p = state.members.find((m) => m.id === c.withMemberId);
    setLetter((l) => ({ ...l, to: p ? `Dear ${p.name},` : '' }));
    setSkips(skips + 1);
    onUpdate({ ...member, currentCard: c });
  };

  const finish = () => {
    if (!card) return;
    const entry: JournalEntry = {
      id: uid(), cardId: card.cardId, memberId: member.id, wedge: card.wedge, cardText: card.text, date: today(),
      note: note.trim() || undefined,
      letter: card.type === 'letter' && letter.body.trim() ? letter : undefined,
      repair: card.type === 'repair' ? repair : undefined,
    };
    const wedges = member.wedges.includes(card.wedge) ? member.wedges : [...member.wedges, card.wedge];
    const updated = { ...member, wedges, currentCard: undefined };
    setPhase('done');
    onComplete(updated, entry);
  };

  const w = card ? wedgeById(card.wedge) : undefined;

  if (phase === 'roll' || phase === 'rolling') {
    return (
      <div className="screen center">
        <button className="link back" onClick={onExit}>← Home</button>
        <h1>{member.avatar} {member.name}'s turn</h1>
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

  if (!card || !w) return null;

  if (phase === 'done') {
    return (
      <div className="screen center">
        <div className="pop-in"><WedgePie earned={member.wedges.includes(card.wedge) ? member.wedges : [...member.wedges, card.wedge]} size={160} highlight={card.wedge} /></div>
        <h1>You earned the {w.name} wedge! {w.icon}</h1>
        <button className="btn big" onClick={onExit}>Back to the family</button>
      </div>
    );
  }

  return (
    <div className="screen">
      <button className="link back" onClick={onExit}>← Save for later</button>
      <div className="task-card" style={{ ['--w' as string]: w.color }}>
        <div className="task-head"><span>{w.icon}</span><b>{w.name}</b><small>{w.tagline}</small></div>
        <p className="task-text">{card.text}</p>
        {card.type === 'repair' && phase === 'card' && (
          <p className="task-hint">Repair doesn't mean pretending nothing happened. It means finding a way to reconnect while acknowledging what did.</p>
        )}
        {card.type === 'letter' && phase === 'card' && (
          <p className="task-hint">Writing can be easier than talking. You decide if and when to share it.</p>
        )}
      </div>

      {phase === 'card' && (
        <>
          {card.type === 'task' && (
            <div className="field">
              <label htmlFor="note">How did it go? (optional)</label>
              <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="A moment you want to remember…" />
            </div>
          )}
          <div className="col gap">
            {card.type === 'task' && <button className="btn big" onClick={finish}>✅ We did it!</button>}
            {card.type === 'letter' && <button className="btn big" onClick={() => setPhase('letter')}>✍️ Start writing</button>}
            {card.type === 'repair' && <button className="btn big" onClick={() => setPhase('repair')}>🧭 Let's think it through</button>}
            <button className="btn ghost" onClick={notToday}>🌙 Not today – show another card</button>
            {skips > 0 && <p className="muted small center-text">That's OK. Skipping never costs you anything.</p>}
          </div>
        </>
      )}

      {phase === 'letter' && (
        <div className="paper">
          <input aria-label="Letter to" value={letter.to} placeholder="Dear…"
            onChange={(e) => setLetter({ ...letter, to: e.target.value })} />
          <textarea aria-label="Letter" rows={8} value={letter.body}
            onChange={(e) => setLetter({ ...letter, body: e.target.value })}
            placeholder="Take your time. There's no wrong way to write this." />
          <label className="check">
            <input type="checkbox" checked={letter.deliver} onChange={(e) => setLetter({ ...letter, deliver: e.target.checked })} />
            I'd like to share this letter (otherwise it stays private)
          </label>
          <button className="btn big" disabled={!letter.body.trim()} onClick={finish}>Done – earn my wedge</button>
          <button className="btn ghost" onClick={() => setPhase('card')}>← Back</button>
        </div>
      )}

      {phase === 'repair' && (
        <div className="repair">
          <div className="dots">{[0, 1, 2].map((i) => <i key={i} className={i <= repairStep ? 'on' : ''} />)}</div>
          {repairStep === 0 && <RepairStep label="1. What happened?" hint="Just the facts, as you remember them."
            value={repair.happened} onChange={(happened) => setRepair({ ...repair, happened })} />}
          {repairStep === 1 && <RepairStep label="2. How did it feel – for me, and maybe for them?" hint="Angry, hurt, scared, embarrassed, lonely… all feelings are allowed."
            value={repair.felt} onChange={(felt) => setRepair({ ...repair, felt })} />}
          {repairStep === 2 && <RepairStep label="3. One small step to reconnect" hint="A note, a cup of tea, a sorry, a hug, asking a trusted adult to help you talk."
            value={repair.step} onChange={(step) => setRepair({ ...repair, step })} />}
          <div className="row gap">
            <button className="btn ghost" onClick={() => repairStep ? setRepairStep(repairStep - 1) : setPhase('card')}>← Back</button>
            {repairStep < 2
              ? <button className="btn grow" onClick={() => setRepairStep(repairStep + 1)}>Next →</button>
              : <button className="btn grow" disabled={!repair.step.trim()} onClick={finish}>I'll take this step</button>}
          </div>
          <p className="muted small">If this brings up something big, it's OK to stop and talk to someone you trust. 💛</p>
        </div>
      )}
    </div>
  );
}

function RepairStep({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <p className="muted small">{hint}</p>
      <textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </div>
  );
}
