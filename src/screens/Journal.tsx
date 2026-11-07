import type { GameState } from '../lib/types';
import { wedgeById } from '../lib/wedges';

export function Journal({ state, onBack }: { state: GameState; onBack: () => void }) {
  const byId = Object.fromEntries(state.members.map((m) => [m.id, m]));
  const entries = [...state.journal].reverse();
  return (
    <div className="screen">
      <button className="link back" onClick={onBack}>← Home</button>
      <h1>📖 Family journal</h1>
      <p className="muted">Moments your family has shared. Private letters and reflections are shown only as “kept private”.</p>
      {entries.length === 0 && <p className="card soft">Nothing here yet – roll the dice to make your first memory!</p>}
      <ul className="journal">
        {entries.map((e) => {
          const w = wedgeById(e.wedge);
          const m = byId[e.memberId];
          return (
            <li key={e.id} style={{ borderColor: w.color }}>
              <small className="muted">{e.date} · {m?.avatar} {m?.name} · {w.icon} {w.name}</small>
              <p>{e.cardText}</p>
              {e.note && <p className="quote">“{e.note}”</p>}
              {e.letter && (e.letter.deliver
                ? <p className="quote">✉️ {e.letter.to}<br />{e.letter.body}</p>
                : <p className="muted small">✉️ A letter was written and kept private.</p>)}
              {e.repair && <p className="muted small">🧭 A repair reflection was kept private. Next step: “{e.repair.step}”</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
