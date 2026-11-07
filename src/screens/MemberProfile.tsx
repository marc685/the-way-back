import { useState } from 'react';
import type { Member } from '../lib/types';
import { ChipInput } from '../components/ChipInput';

const REWARDS = [
  { icon: '🎮', label: 'Roblox credit' },
  { icon: '💰', label: 'Pocket money' },
  { icon: '🏕️', label: 'Weekend away' },
  { icon: '🍕', label: 'Choose Friday dinner' },
  { icon: '🎬', label: 'Movie outing' },
  { icon: '🛍️', label: 'Something small I want' },
  { icon: '🌳', label: 'A day out of my choice' },
  { icon: '😴', label: 'A lie-in + breakfast in bed' },
];

export function MemberProfile({ member, index, total, onSave, onBack }: {
  member: Member; index: number; total: number; onSave: (m: Member) => void; onBack: () => void;
}) {
  const [m, setM] = useState(member);
  const [custom, setCustom] = useState(REWARDS.some((r) => r.label === member.reward) ? '' : member.reward);
  const set = (p: Partial<Member>) => setM({ ...m, ...p });
  const ready = m.activities.length > 0 && m.reward && m.rewardApproved;

  return (
    <div className="screen" key={member.id}>
      <p className="step">Profile {index + 1} of {total} – pass the phone to {m.name}</p>
      <h1><span className="big-avatar">{m.avatar}</span> {m.name}'s profile</h1>

      <ChipInput label="🎣 Things I like doing with people at home" values={m.activities}
        onChange={(activities) => set({ activities })} placeholder="e.g. fishing, baking"
        suggestions={['fishing', 'baking', 'cooking', 'gaming', 'soccer', 'reading', 'drawing', 'hiking', 'music', 'swimming', 'board games', 'gardening']} />

      <ChipInput label="👵 Extended family I'd like to see more" values={m.extended}
        onChange={(extended) => set({ extended })} placeholder="e.g. Gran, Uncle Pieter"
        suggestions={['Gran', 'Grandpa', 'Ouma', 'Oupa', 'my aunt', 'my uncle', 'my cousins']} />

      <ChipInput label="🔥 Family friends I'd love to have over for a braai" values={m.friends}
        onChange={(friends) => set({ friends })} placeholder="e.g. the Naidoos" />

      <div className="field">
        <label>🏆 My reward when I complete the whole circle</label>
        <div className="reward-grid">
          {REWARDS.map((r) => (
            <button key={r.label} className={`reward ${m.reward === r.label ? 'on' : ''}`}
              onClick={() => { set({ reward: r.label, rewardApproved: false }); setCustom(''); }}>
              <span>{r.icon}</span>{r.label}
            </button>
          ))}
        </div>
        <input value={custom} placeholder="…or write your own"
          onChange={(e) => { setCustom(e.target.value); set({ reward: e.target.value, rewardApproved: false }); }} />
        {m.reward && (
          <label className="check">
            <input type="checkbox" checked={m.rewardApproved} onChange={(e) => set({ rewardApproved: e.target.checked })} />
            A parent agrees to this reward
          </label>
        )}
      </div>

      <div className="row gap">
        <button className="btn ghost" onClick={onBack}>← Back</button>
        <button className="btn grow" disabled={!ready} onClick={() => onSave(m)}>
          {index + 1 < total ? 'Save & next person →' : 'Save & start playing 🎉'}
        </button>
      </div>
      {!ready && <p className="muted small center-text">Add at least one activity and an approved reward.</p>}
    </div>
  );
}
