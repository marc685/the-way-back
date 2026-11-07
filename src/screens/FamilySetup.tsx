import { useState } from 'react';
import type { AgeGroup } from '../lib/types';
import type { NewMember } from '../lib/api';

const AVATARS = ['🦁', '🐻', '🦊', '🐼', '🐨', '🐯', '🐸', '🐵', '🦄', '🐙', '🐢', '🦉'];

/** A parent creates the family on their phone. Everyone else joins later with a code. */
export function FamilySetup({ onCreate, onBack }: {
  onCreate: (familyName: string, members: NewMember[], meIndex: number) => Promise<void>; onBack: () => void;
}) {
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<NewMember[]>([]);
  const [me, setMe] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState<AgeGroup>('adult');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = () => {
    if (!name.trim()) return;
    const next = [...members, { name: name.trim(), avatar: AVATARS[members.length % AVATARS.length], age, isParent: false }];
    setMembers(next);
    if (me === null && age === 'adult') setMe(next.length - 1);
    setName('');
  };
  const update = (i: number, p: Partial<NewMember>) => setMembers(members.map((m, j) => (j === i ? { ...m, ...p } : m)));
  const remove = (i: number) => {
    setMembers(members.filter((_, j) => j !== i));
    setMe(me === i ? null : me !== null && me > i ? me - 1 : me);
  };
  const ready = familyName.trim() && members.length >= 2 && me !== null && members[me]?.age === 'adult' && consent;

  return (
    <div className="screen">
      <button className="link back" onClick={onBack}>← Back</button>
      <h1>Start our family</h1>
      <div className="field">
        <label htmlFor="fam">Family name</label>
        <input id="fam" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="e.g. The Nkosi family" />
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="mname">Add everyone who lives at home – including you</label>
          <input id="mname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Mom, Ant)"
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
        </div>
        <div className="seg" role="radiogroup" aria-label="Age group">
          {(['child', 'teen', 'adult'] as AgeGroup[]).map((a) => (
            <button key={a} role="radio" aria-checked={age === a} className={age === a ? 'on' : ''} onClick={() => setAge(a)}>
              {a === 'child' ? 'Child (≤12)' : a === 'teen' ? 'Teen' : 'Adult'}
            </button>
          ))}
        </div>
        <button className="btn" onClick={add} disabled={!name.trim()}>+ Add person</button>
      </div>

      <ul className="member-list">
        {members.map((m, i) => (
          <li key={i}>
            <button className="avatar" aria-label={`Change avatar for ${m.name}`}
              onClick={() => update(i, { avatar: AVATARS[(AVATARS.indexOf(m.avatar) + 1) % AVATARS.length] })}>{m.avatar}</button>
            <span className="grow">
              {m.name} <small className="muted">· {m.age}</small>
              <span className="member-opts">
                {m.age === 'adult' && (
                  <label className="mini-check"><input type="radio" name="me" checked={me === i} onChange={() => setMe(i)} /> This is me</label>
                )}
                {m.age === 'adult' && me !== i && (
                  <label className="mini-check"><input type="checkbox" checked={!!m.isParent} onChange={(e) => update(i, { isParent: e.target.checked })} /> Parent</label>
                )}
              </span>
            </span>
            <button className="link" onClick={() => remove(i)}>Remove</button>
          </li>
        ))}
      </ul>
      {members.length > 0 && <p className="muted small">Tap an avatar to change it. Parents can approve children’s rewards and invite people.</p>}

      <label className="check consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I agree that FamJam stores our first names, profiles, cards and letters on a secure server (in the EU) so our phones can stay in sync. Letters are only shown to the writer and the person they’re for. No email addresses or phone numbers are collected.</span>
      </label>

      <button className="btn big" disabled={!ready || busy}
        onClick={async () => { setBusy(true); try { await onCreate(familyName.trim(), members, me!); } finally { setBusy(false); } }}>
        {busy ? 'Creating…' : 'Create our family →'}
      </button>
      {!ready && <p className="muted small center-text">
        {members.length < 2 ? 'Add at least two people.' : me === null ? 'Tick “This is me” next to your name.' : !consent ? 'Tick the box above to continue.' : 'Add your family name.'}
      </p>}
    </div>
  );
}
