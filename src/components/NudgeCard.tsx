import { useState } from 'react';
import type { Nudge } from '../lib/nudges';

/** A personal self-care prompt. Private – never shown in the family journal, never earns anything. */
export function NudgeCard({ name, nudge, onRead, onLater }: {
  name: string; nudge: Nudge; onRead: (note?: string) => void; onLater: () => void;
}) {
  const [note, setNote] = useState('');
  const [writing, setWriting] = useState(false);
  return (
    <div className="nudge" role="region" aria-label="Just for you">
      <p className="nudge-head">💭 Just for you, {name}</p>
      <p className="nudge-text">{nudge.text}</p>
      {writing && (
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Private note"
          placeholder="Only you will see this. It stays on this phone." />
      )}
      <div className="row gap wrap">
        <button className="btn" onClick={() => onRead(note.trim() || undefined)}>Thanks 💛</button>
        {!writing && <button className="btn ghost" onClick={() => setWriting(true)}>Write a private note</button>}
        <button className="link" onClick={onLater}>Remind me later</button>
      </div>
    </div>
  );
}
