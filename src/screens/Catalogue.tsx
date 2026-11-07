import { useMemo, useState } from 'react';
import type { AgeGroup, Card, CustomCard, WedgeId } from '../lib/types';
import type { FamilyView } from '../lib/api';
import { WEDGES, wedgeById } from '../lib/wedges';
import { allIdeas, filterIdeas, ideaText, type IdeaFilter } from '../lib/catalogue';
import { uid } from '../lib/store';

const PAGE = 30;
const AGES: { id: AgeGroup; label: string }[] = [{ id: 'child', label: 'Child' }, { id: 'teen', label: 'Teen' }, { id: 'adult', label: 'Adult' }];
const COSTS: { id: NonNullable<Card['cost']>; label: string }[] = [{ id: 'free', label: 'No cost' }, { id: 'low', label: 'Low cost' }, { id: 'outing', label: 'Outing' }];
const PLACES: { id: NonNullable<Card['place']>; label: string }[] = [{ id: 'home', label: 'At home' }, { id: 'outside', label: 'Outside' }, { id: 'out', label: 'Out & about' }];
const TIMES: { id: NonNullable<Card['time']>; label: string }[] = [{ id: 'quick', label: 'Quick (≤15 min)' }, { id: 'long', label: 'Longer' }];

export function Catalogue({ view: state, act, onBack }: {
  view: FamilyView; act: (a: any) => Promise<FamilyView | null>; onBack: () => void;
}) {
  const [f, setF] = useState<IdeaFilter>({});
  const [shown, setShown] = useState(PAGE);
  const [adding, setAdding] = useState<CustomCard | null>(null);
  const [more, setMore] = useState(false);
  const ideas = useMemo(() => allIdeas(state.customCards), [state.customCards]);
  const results = useMemo(() => filterIdeas(ideas, f, state).filter((i) => f.only === 'hidden' || !state.hidden.includes(i.card.id)),
    [ideas, f, state]);
  const mine = state.customCards;
  const activeExtra = [f.age, f.cost, f.place, f.time, f.only === 'hidden' ? 1 : undefined].filter(Boolean).length;

  const toggle = (key: 'favourites' | 'hidden', id: string) =>
    act({ type: key === 'favourites' ? 'toggleFavourite' : 'toggleHidden', id });
  const setFilter = (p: Partial<IdeaFilter>) => { setF((cur) => ({ ...cur, ...p })); setShown(PAGE); };
  const chip = <K extends keyof IdeaFilter>(key: K, value: IdeaFilter[K], label: string) => (
    <button key={String(value)} className={`chip ${f[key] === value ? 'on' : ''}`} aria-pressed={f[key] === value}
      onClick={() => setFilter({ [key]: f[key] === value ? undefined : value } as Partial<IdeaFilter>)}>{label}</button>
  );

  const saveCustom = async (c: CustomCard) => {
    if (await act({ type: 'saveCustom', card: c })) setAdding(null);
  };

  if (adding) return <CustomForm state={state} card={adding} onSave={saveCustom} onCancel={() => setAdding(null)}
    onDelete={mine.some((x) => x.id === adding.id) ? async () => {
      if (await act({ type: 'deleteCustom', id: adding.id })) setAdding(null);
    } : undefined} />;

  return (
    <div className="screen">
      <button className="link back" onClick={onBack}>← Home</button>
      <h1>💡 Ideas</h1>
      <p className="muted">{ideas.length} things to do together. Star the ones your family loves – they come up more often – and add your own.</p>

      <button className="btn" onClick={() => setAdding({ id: `own-${uid()}`, wedge: 'together', text: '', ages: ['child', 'teen', 'adult'] })}>
        ➕ Add our own activity
      </button>

      {mine.length > 0 && (
        <div className="field">
          <label>Our own activities ({mine.length})</label>
          <ul className="ideas">
            {mine.map((c) => {
              const w = wedgeById(c.wedge);
              const who = state.members.find((m) => m.id === c.withId);
              return (
                <li key={c.id} style={{ borderColor: w.color }}>
                  <small className="muted">{w.icon} {w.name}{who ? ` · with ${who.name}` : ''}</small>
                  <p>{c.text}</p>
                  <div className="idea-actions"><button className="link" onClick={() => setAdding(c)}>Edit</button></div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <input type="search" placeholder="Search ideas – e.g. cook, walk, tea" aria-label="Search ideas"
        value={f.query ?? ''} onChange={(e) => setFilter({ query: e.target.value })} />
      <div className="filters">
        <div className="chips scroll">{WEDGES.map((w) => chip('wedge', w.id as WedgeId, `${w.icon} ${w.name}`))}</div>
        <div className="chips">
          {chip('only', 'favourites', `⭐ Our list (${state.favourites.length})`)}
          <button className={`chip ${more ? 'on' : ''}`} aria-expanded={more} onClick={() => setMore(!more)}>
            ⚙️ More filters{activeExtra ? ` (${activeExtra})` : ''} {more ? '▴' : '▾'}
          </button>
        </div>
        {more && (
          <>
            <div className="chips">{AGES.map((a) => chip('age', a.id, a.label))}</div>
            <div className="chips">{COSTS.map((c) => chip('cost', c.id, c.label))}{TIMES.map((t) => chip('time', t.id, t.label))}</div>
            <div className="chips">{PLACES.map((p) => chip('place', p.id, p.label))}</div>
            <div className="chips">{chip('only', 'hidden', `🙈 Not for us (${state.hidden.length})`)}</div>
          </>
        )}
      </div>

      <p className="muted small" aria-live="polite">{results.length} idea{results.length === 1 ? '' : 's'}</p>
      <ul className="ideas">
        {results.slice(0, shown).map(({ card, wedge, custom }) => {
          const w = wedgeById(wedge);
          const fav = state.favourites.includes(card.id);
          const hid = state.hidden.includes(card.id);
          const locked = card.tier === 'plus' && !state.plus;
          return (
            <li key={card.id} style={{ borderColor: w.color }} className={locked ? 'locked' : ''}>
              <small className="muted">{w.icon} {w.name}{custom ? ' · our own' : ''}{locked ? ' · 🔒 Family Plus' : ''}</small>
              <p>{ideaText(card)}</p>
              <div className="idea-actions">
                <button className={`chip ${fav ? 'on' : ''}`} aria-pressed={fav} onClick={() => toggle('favourites', card.id)}>
                  {fav ? '⭐ On our list' : '☆ Our list'}
                </button>
                <button className="chip" onClick={() => toggle('hidden', card.id)}>{hid ? '↩︎ Bring back' : '🙈 Not for us'}</button>
              </div>
            </li>
          );
        })}
      </ul>
      {results.length > shown && <button className="btn ghost" onClick={() => setShown(shown + PAGE)}>Show more ideas</button>}
    </div>
  );
}

function CustomForm({ state, card, onSave, onCancel, onDelete }: {
  state: FamilyView; card: CustomCard; onSave: (c: CustomCard) => void; onCancel: () => void; onDelete?: () => void;
}) {
  const [c, setC] = useState(card);
  const toggleAge = (a: AgeGroup) => setC({ ...c, ages: c.ages.includes(a) ? c.ages.filter((x) => x !== a) : [...c.ages, a] });
  const ok = c.text.trim().length > 2 && c.ages.length > 0;
  return (
    <div className="screen">
      <button className="link back" onClick={onCancel}>← Back to ideas</button>
      <h1>{onDelete ? 'Edit activity' : 'Add our own activity'}</h1>
      <div className="field">
        <label htmlFor="own-text">What's the activity?</label>
        <input id="own-text" value={c.text} onChange={(e) => setC({ ...c, text: e.target.value })} placeholder="e.g. Go fishing at the dam" />
        <p className="muted small">The card will say who to do it with, e.g. “{c.text.trim() || 'Go fishing at the dam'} – with Mom”.</p>
      </div>
      <div className="field">
        <label>Which wedge is it?</label>
        <div className="chips">
          {WEDGES.map((w) => (
            <button key={w.id} className={`chip ${c.wedge === w.id ? 'on' : ''}`} aria-pressed={c.wedge === w.id}
              onClick={() => setC({ ...c, wedge: w.id })}>{w.icon} {w.name}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Who can draw it?</label>
        <div className="chips">
          {AGES.map((a) => (
            <button key={a.id} className={`chip ${c.ages.includes(a.id) ? 'on' : ''}`} aria-pressed={c.ages.includes(a.id)}
              onClick={() => toggleAge(a.id)}>{a.label}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Do it with…</label>
        <div className="chips">
          <button className={`chip ${!c.withId ? 'on' : ''}`} aria-pressed={!c.withId} onClick={() => setC({ ...c, withId: undefined })}>Anyone at home</button>
          {state.members.map((m) => (
            <button key={m.id} className={`chip ${c.withId === m.id ? 'on' : ''}`} aria-pressed={c.withId === m.id}
              onClick={() => setC({ ...c, withId: m.id })}>{m.avatar} {m.name}</button>
          ))}
        </div>
      </div>
      <button className="btn big" disabled={!ok} onClick={() => onSave({ ...c, text: c.text.trim() })}>Save activity</button>
      {onDelete && <button className="btn ghost" onClick={onDelete}>Delete this activity</button>}
    </div>
  );
}
