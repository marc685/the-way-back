import type { GameState } from '../lib/types';
import { wedgeById } from '../lib/wedges';
import { FEELINGS } from '../lib/confirm';

export function Journal({ state, onBack }: { state: GameState; onBack: () => void }) {
  const byId = Object.fromEntries(state.members.map((m) => [m.id, m]));
  const entries = [...state.journal].reverse();
  return (
    <div className="screen">
      <button className="link back" onClick={onBack}>← Home</button>
      <h1>📖 Family journal</h1>
      <p className="muted">Everything your family has done together – and what you said to each other.</p>
      {entries.length === 0 && <p className="card soft">Nothing here yet – roll the dice to make your first memory!</p>}
      <ul className="journal">
        {entries.map((e) => {
          const w = wedgeById(e.wedge);
          const m = byId[e.memberId];
          const by = e.confirmedBy ? byId[e.confirmedBy] : undefined;
          const f = FEELINGS.find((x) => x.id === e.feeling);
          return (
            <li key={e.id} style={{ borderColor: w.color }}>
              <small className="muted">{e.date} · {m?.avatar} {m?.name} · {w.icon} {w.name}</small>
              <p>{e.cardText}</p>
              {e.letter && <p className="quote">✉️ {e.letter}</p>}
              {by && <p className="reply">{by.avatar} <b>{by.name}</b> {f ? `${f.icon} ${f.label.toLowerCase()}` : 'confirmed'}{e.reply ? `: “${e.reply}”` : ''}</p>}
              {!by && e.note && <p className="quote">“{e.note}”</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
