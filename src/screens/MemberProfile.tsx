import { useRef, useState } from 'react';
import type { Member } from '../lib/types';
import { ChipInput } from '../components/ChipInput';
import { needsApproval, profileProblems } from '../lib/profile';

const REWARDS = [
  { icon: '🎮', label: 'Roblox credit' },
  { icon: '💰', label: 'Pocket money' },
  { icon: '📱', label: 'Airtime or data' },
  { icon: '📺', label: 'Extra screen time' },
  { icon: '🛌', label: 'A sleepover with a friend' },
  { icon: '🌙', label: 'Stay up late' },
  { icon: '📚', label: 'A new book' },
  { icon: '🍦', label: 'An ice-cream outing' },
  { icon: '🍕', label: 'Choose Friday dinner' },
  { icon: '🎬', label: 'Movie outing' },
  { icon: '🛍️', label: 'Something small I want' },
  { icon: '🌳', label: 'A day out of my choice' },
  { icon: '🏕️', label: 'Weekend away' },
  { icon: '😴', label: 'A lie-in + breakfast in bed' },
  { icon: '💆', label: 'A spa day or massage' },
  { icon: '🕯️', label: 'Date night' },
  { icon: '🍳', label: 'A night off cooking' },
  { icon: '☕', label: 'Coffee with a friend' },
  { icon: '🧘', label: 'An afternoon to myself' },
  { icon: '🪴', label: 'A new plant for the garden' },
];
const PRESET = new Set(REWARDS.map((r) => r.label));

export function MemberProfile({ member, firstTime, onSave, onBack }: {
  member: Member; firstTime: boolean; onSave: (m: Member) => Promise<void>; onBack?: () => void;
}) {
  const [m, setM] = useState(member);
  const [own, setOwn] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const rewardRef = useRef<HTMLDivElement>(null);
  const set = (p: Partial<Member>) => { setM((cur) => ({ ...cur, ...p })); setProblems([]); };

  const toggle = (label: string) =>
    set({ rewards: m.rewards.includes(label) ? m.rewards.filter((r) => r !== label) : [...m.rewards, label] });

  const addOwn = () => {
    const t = own.trim();
    if (t && !m.rewards.some((r) => r.toLowerCase() === t.toLowerCase())) set({ rewards: [...m.rewards, t] });
    setOwn('');
  };

  const save = () => {
    // Count a reward that was typed but not yet added.
    const pending = own.trim();
    const final = pending && !m.rewards.includes(pending) ? { ...m, rewards: [...m.rewards, pending] } : m;
    const p = profileProblems(final);
    if (p.length) {
      setM(final);
      setProblems(p);
      rewardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    onSave(final).finally(() => setSaving(false));
  };
  const [saving, setSaving] = useState(false);

  const customRewards = m.rewards.filter((r) => !PRESET.has(r));
  const approval = needsApproval(m);

  return (
    <div className="screen" key={member.id}>
      {onBack && <button className="link back" onClick={onBack}>← Back</button>}
      {firstTime && <p className="step">Welcome, {m.name}! Tell your family a little about you.</p>}
      <h1><span className="big-avatar">{m.avatar}</span> My profile</h1>

      <ChipInput label="🎣 Things I like doing with people at home" values={m.activities}
        onChange={(activities) => set({ activities })} placeholder="e.g. fishing, baking"
        suggestions={['fishing', 'baking', 'cooking', 'gaming', 'soccer', 'reading', 'drawing', 'hiking', 'music', 'swimming', 'board games', 'gardening']} />

      <div className="field" ref={rewardRef}>
        <label>🏆 My rewards for completing the whole circle</label>
        <p className="muted small">Tap as many as you like. When you finish the circle, you choose which one to claim.</p>
        <div className="reward-grid">
          {REWARDS.map((r) => {
            const on = m.rewards.includes(r.label);
            return (
              <button key={r.label} className={`reward ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(r.label)}>
                <span className="reward-icon">{r.icon}</span>
                <span className="grow">{r.label}</span>
                {on && <span className="tick" aria-hidden="true">✓</span>}
              </button>
            );
          })}
          {customRewards.map((r) => (
            <button key={r} className="reward on" aria-pressed="true" onClick={() => toggle(r)} aria-label={`Remove ${r}`}>
              <span className="reward-icon">⭐</span>
              <span className="grow">{r}</span>
              <span className="tick" aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); addOwn(); }}>
          <input value={own} onChange={(e) => setOwn(e.target.value)} onBlur={() => own.trim() && addOwn()}
            placeholder="Add my own reward…" aria-label="Add my own reward" />
          <button className="btn small" type="submit">Add</button>
        </form>
        <p className="muted small">{m.rewards.length ? `${m.rewards.length} chosen` : 'None chosen yet'}</p>
        {approval && m.rewards.length > 0 && (
          <p className={`approval ${m.rewardApproved ? 'ok' : ''}`}>
            {m.rewardApproved ? '✅ A parent approved these rewards.' : '⏳ When you save, a parent gets a message to approve your rewards on their phone.'}
          </p>
        )}
      </div>

      <label className="check toggle">
        <input type="checkbox" checked={m.nudges} onChange={(e) => set({ nudges: e.target.checked })} />
        <span>💭 Self-care prompts for {m.name}<small className="muted"> – a private, {m.age === 'adult' ? 'reflective' : m.age === 'teen' ? 'teen-friendly' : 'child-friendly'} prompt a few times a week</small></span>
      </label>

      {problems.length > 0 && (
        <div className="problem" role="alert">{problems.map((p) => <p key={p}>⚠️ {p}</p>)}</div>
      )}

      <button className="btn big" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : firstTime ? 'Save & start playing 🎉' : 'Save my profile'}
      </button>
    </div>
  );
}
