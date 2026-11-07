import { useState } from 'react';

export function Join({ initialCode, onJoin, onBack }: { initialCode?: string; onJoin: (code: string) => Promise<void>; onBack: () => void }) {
  const [code, setCode] = useState(initialCode ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <div className="screen">
      <button className="link back" onClick={onBack}>← Back</button>
      <h1>🔑 Join your family</h1>
      <p className="muted">Ask a parent for your join code. It looks like <b>K7Q-4MD</b>.</p>
      <form className="col gap" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onJoin(code); } finally { setBusy(false); } }}>
        <input aria-label="Join code" className="code-input" value={code} autoCapitalize="characters" autoComplete="off"
          onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC-123" maxLength={9} />
        <button className="btn big" type="submit" disabled={code.replace(/[^A-Z0-9]/gi, '').length !== 6 || busy}>
          {busy ? 'Joining…' : 'Join'}
        </button>
      </form>
      <p className="muted small">This phone will become yours in FamJam. If you used FamJam on another phone before, that phone will be disconnected.</p>
    </div>
  );
}
