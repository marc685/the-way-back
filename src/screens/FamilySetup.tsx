import { useState } from 'react';
import type { AgeGroup, GameState, Member } from '../lib/types';
import { uid } from '../lib/store';

const AVATARS = ['🦁', '🐻', '🦊', '🐼', '🐨', '🐯', '🐸', '🐵', '🦄', '🐙', '🐢', '🦉'];

export function FamilySetup({ state, onDone }: {
  state: GameState; onDone: (familyName: string, members: Member[]) => void;
}) {
  const [familyName, setFamilyName] = useState(state.familyName);
  const [members, setMembers] = useState<Member[]>(state.members);
  const [name, setName] = useState('');
  const [age, setAge] = useState<AgeGroup>('adult');

  const add = () => {
    if (!name.trim()) return;
    setMembers([...members, {
      id: uid(), name: name.trim(), avatar: AVATARS[members.length % AVATARS.length], age,
      activities: [], rewards: [], rewardApproved: false, wedges: [], rounds: 0, nudges: true, nudgeLog: [],
    }]);
    setName('');
  };

  return (
    <div className="screen">
      <h1>Who's in your family?</h1>
      <div className="field">
        <label htmlFor="fam">Family name</label>
        <input id="fam" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="e.g. The Nkosi family" />
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="mname">Add a family member</label>
          <input id="mname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Mom, Liam)" />
        </div>
        <div className="seg" role="radiogroup" aria-label="Age group">
          {(['child', 'teen', 'adult'] as AgeGroup[]).map((a) => (
            <button key={a} role="radio" aria-checked={age === a} className={age === a ? 'on' : ''} onClick={() => setAge(a)}>
              {a === 'child' ? 'Child (≤12)' : a === 'teen' ? 'Teen' : 'Adult'}
            </button>
          ))}
        </div>
        <button className="btn" onClick={add} disabled={!name.trim()}>+ Add member</button>
      </div>

      <ul className="member-list">
        {members.map((m) => (
          <li key={m.id}>
            <button className="avatar" aria-label={`Change avatar for ${m.name}`}
              onClick={() => setMembers(members.map((x) => x.id === m.id
                ? { ...x, avatar: AVATARS[(AVATARS.indexOf(x.avatar) + 1) % AVATARS.length] } : x))}>
              {m.avatar}
            </button>
            <span className="grow">{m.name} <small className="muted">· {m.age}</small></span>
            <button className="link" onClick={() => setMembers(members.filter((x) => x.id !== m.id))}>Remove</button>
          </li>
        ))}
      </ul>
      {members.length > 0 && <p className="muted small">Tip: tap an avatar to change it.</p>}

      <button className="btn big" disabled={members.length < 2 || !familyName.trim()}
        onClick={() => onDone(familyName.trim(), members)}>
        Next: everyone's profile →
      </button>
      {members.length < 2 && <p className="muted small center-text">Add at least two people to play together.</p>}
    </div>
  );
}
