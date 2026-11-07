import type { FamilyView } from '../lib/api';
import { WedgePie } from '../components/WedgePie';
import { NotifyCard } from '../components/NotifyCard';
import { WEDGES } from '../lib/wedges';
import { today } from '../lib/store';
import { pendingNudge } from '../lib/nudges';
import { inboxFor } from '../lib/inbox';

export function Home({ view, onMyTurn, onInbox, onIdeas, onPaywall, onJournal, onFamily, onProfile }: {
  view: FamilyView; onMyTurn: () => void; onInbox: () => void; onIdeas: () => void; onPaywall: () => void;
  onJournal: () => void; onFamily: () => void; onProfile: () => void;
}) {
  const me = view.members.find((m) => m.id === view.me)!;
  const inbox = inboxFor(view);
  const nameOf = (id?: string) => view.members.find((m) => m.id === id)?.name;
  const status = (m: typeof me) => {
    if (m.currentCard?.status === 'awaiting') return { cls: 'wait', text: `Waiting for ${nameOf(m.currentCard.withMemberId)}` };
    if (m.currentCard) return { cls: 'warn', text: 'Card to do' };
    if (m.wedges.length >= 5) return { cls: 'warn', text: '🏆 Circle complete!' };
    if (m.lastRollDate === today()) return { cls: 'done', text: 'Done today ✓' };
    return m.id === me.id ? { cls: '', text: 'Roll 🎲' } : { cls: 'done', text: 'Not played yet' };
  };
  const mine = status(me);
  const nudge = pendingNudge(me, today());

  return (
    <div className="screen">
      <header className="home-head">
        <div>
          <p className="muted small">FamJam · {view.familyName}</p>
          <h1>Hi {me.name} {me.avatar}</h1>
        </div>
        <button className="link" onClick={onProfile}>My profile</button>
      </header>

      {inbox.count > 0 && (
        <button className="banner" onClick={onInbox}>
          📬 <span className="grow"><b>{inbox.count} waiting for you</b> – {[
            inbox.toConfirm.filter((m) => m.currentCard?.type === 'letter').length && 'a letter',
            inbox.toConfirm.filter((m) => m.currentCard?.type !== 'letter').length && 'a card to confirm',
            inbox.toApprove.length && 'rewards to approve',
          ].filter(Boolean).join(', ')}</span> →
        </button>
      )}

      <button className="my-turn" onClick={onMyTurn}>
        <WedgePie earned={me.wedges} size={84} />
        <span className="grow">
          <b>My turn{nudge ? <span title="Something just for you"> · 💭</span> : null}</b>
          <small className="muted">{me.wedges.length}/5 wedges · 🏆 {me.rewards[0] ?? 'no reward yet'}{me.rewards.length > 1 ? ` +${me.rewards.length - 1}` : ''}</small>
        </span>
        <span className={`pill ${mine.cls}`}>{mine.text}</span>
      </button>

      <NotifyCard />

      <div className="legend">
        {WEDGES.map((w) => <span key={w.id}><i style={{ background: w.color }} />{w.name}</span>)}
      </div>

      <h2>The family</h2>
      <ul className="players">
        {view.members.filter((m) => m.id !== me.id).map((m) => {
          const st = status(m);
          const joined = view.connected.includes(m.id);
          return (
            <li key={m.id}>
              <div className="player">
                <WedgePie earned={m.wedges} size={52} />
                <span className="grow">
                  <b>{m.avatar} {m.name}</b>
                  <small className="muted">{joined ? `${m.wedges.length}/5 wedges` : 'Hasn’t joined yet'}</small>
                </span>
                {joined && <span className={`pill ${st.cls}`}>{st.text}</span>}
              </div>
            </li>
          );
        })}
      </ul>

      <button className="btn ideas" onClick={onIdeas}>💡 Ideas – browse & add your own activities</button>
      <div className="row gap wrap">
        <button className="btn ghost grow" onClick={onJournal}>📖 Journal</button>
        <button className="btn ghost grow" onClick={onFamily}>👪 {me.isParent ? 'Family & invites' : 'Family'}</button>
      </div>
      {!view.plus && <button className="btn plus" onClick={onPaywall}>✨ Family Plus</button>}
    </div>
  );
}
