import { useState } from 'react';
import type { FamilyView } from '../lib/api';
import type { AgeGroup } from '../lib/types';
import { api } from '../lib/api';

const AVATARS = ['🦁', '🐻', '🦊', '🐼', '🐨', '🐯', '🐸', '🐵', '🦄', '🐙', '🐢', '🦉'];

/** Parents: invite people, add or remove them. Everyone else: see who's in the family. */
export function Family({ view, act, onBack, onError }: {
  view: FamilyView; act: (a: any) => Promise<unknown>; onBack: () => void; onError: (msg: string) => void;
}) {
  const me = view.members.find((m) => m.id === view.me)!;
  const [codes, setCodes] = useState<Record<string, { code: string; expiresAt: string }>>({});
  const [name, setName] = useState('');
  const [age, setAge] = useState<AgeGroup>('child');
  const [copied, setCopied] = useState('');

  const invite = async (memberId: string) => {
    try { const r = await api.invite(memberId); setCodes({ ...codes, [memberId]: r }); }
    catch (e: any) { onError(e.message); }
  };
  const link = (code: string) => `${location.origin}/join/${code}`;
  const message = (who: string, code: string) =>
    `Hi ${who}! Join our family on FamJam 💛 Open this link on your phone: ${link(code)} (or enter code ${code}). It works once and expires in 7 days.`;
  const share = async (who: string, code: string) => {
    const text = message(who, code);
    if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(text); setCopied(code); } catch { /* ignore */ }
  };

  return (
    <div className="screen">
      <button className="link back" onClick={onBack}>← Home</button>
      <h1>👪 {view.familyName}</h1>
      {me.isParent && <p className="muted">Everyone plays on their own phone. Send each person their own join link – it works once.</p>}
      <ul className="member-list family">
        {view.members.map((m) => {
          const joined = view.connected.includes(m.id);
          const c = codes[m.id];
          return (
            <li key={m.id}>
              <div className="row gap">
                <span className="avatar">{m.avatar}</span>
                <span className="grow">
                  <b>{m.name}</b>{m.id === me.id ? ' (me)' : ''}
                  <small className="muted"> · {m.age}{m.isParent ? ' · parent' : ''}</small>
                  <br /><small className={joined ? 'ok-text' : 'muted'}>{joined ? '📱 Phone connected' : 'Not joined yet'}</small>
                </span>
              </div>
              {me.isParent && m.id !== me.id && (
                <div className="invite">
                  {c ? (
                    <>
                      <p className="code">{c.code}</p>
                      <p className="muted small">Link: {link(c.code)}</p>
                      <div className="row gap wrap">
                        <a className="btn small" href={`https://wa.me/?text=${encodeURIComponent(message(m.name, c.code))}`} target="_blank" rel="noreferrer">Send on WhatsApp</a>
                        <button className="btn small ghost" onClick={() => share(m.name, c.code)}>{copied === c.code ? 'Copied ✓' : 'Share / copy'}</button>
                      </div>
                    </>
                  ) : (
                    <div className="row gap wrap">
                      <button className="btn small" onClick={() => invite(m.id)}>{joined ? 'New phone? Get a new join link' : 'Get join link'}</button>
                      <button className="link small" onClick={async () => {
                        if (confirm(`Remove ${m.name} from the family? Their phone will be disconnected.`)) await act({ type: 'removeMember', memberId: m.id });
                      }}>Remove</button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {me.isParent && (
        <div className="card">
          <div className="field">
            <label htmlFor="newname">Add someone who lives at home</label>
            <input id="newname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          </div>
          <div className="seg" role="radiogroup" aria-label="Age group">
            {(['child', 'teen', 'adult'] as AgeGroup[]).map((a) => (
              <button key={a} role="radio" aria-checked={age === a} className={age === a ? 'on' : ''} onClick={() => setAge(a)}>
                {a === 'child' ? 'Child (≤12)' : a === 'teen' ? 'Teen' : 'Adult'}
              </button>
            ))}
          </div>
          <button className="btn" disabled={!name.trim()} onClick={async () => {
            await act({ type: 'addMember', name: name.trim(), age, avatar: AVATARS[view.members.length % AVATARS.length] });
            setName('');
          }}>+ Add person</button>
        </div>
      )}
    </div>
  );
}
