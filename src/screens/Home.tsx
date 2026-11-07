import type { GameState, Member } from '../lib/types';
import { WedgePie } from '../components/WedgePie';
import { WEDGES } from '../lib/wedges';
import { today } from '../lib/store';

export function Home({ state, onPlay, onPaywall, onJournal, onEdit }: {
  state: GameState; onPlay: (m: Member) => void; onPaywall: () => void; onJournal: () => void; onEdit: () => void;
}) {
  return (
    <div className="screen">
      <header className="home-head">
        <div>
          <p className="muted small">FamJam</p>
          <h1>{state.familyName}</h1>
        </div>
        <button className="link" onClick={onEdit}>Edit family</button>
      </header>

      <div className="legend">
        {WEDGES.map((w) => (
          <span key={w.id}><i style={{ background: w.color }} />{w.name}</span>
        ))}
      </div>

      <h2>Who's playing today?</h2>
      <ul className="players">
        {state.members.map((m) => {
          const played = m.lastRollDate === today() && !m.currentCard;
          return (
            <li key={m.id}>
              <button className="player" onClick={() => onPlay(m)}>
                <WedgePie earned={m.wedges} size={58} />
                <span className="grow">
                  <b>{m.avatar} {m.name}</b>
                  <small className="muted">
                    {m.wedges.length}/5 wedges · 🏆 {m.rewards[0]}{m.rewards.length > 1 ? ` +${m.rewards.length - 1} more` : ''}{m.rounds ? ` · ${m.rounds} circle${m.rounds > 1 ? 's' : ''} done` : ''}
                  </small>
                </span>
                <span className={`pill ${m.currentCard ? 'warn' : played ? 'done' : ''}`}>
                  {m.currentCard ? 'Card waiting' : played ? 'Done today ✓' : 'Roll 🎲'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="row gap">
        <button className="btn ghost grow" onClick={onJournal}>📖 Family journal</button>
        {!state.plus && <button className="btn plus grow" onClick={onPaywall}>✨ Family Plus</button>}
      </div>
    </div>
  );
}
