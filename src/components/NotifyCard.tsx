import { useEffect, useState } from 'react';
import { enablePush, pushEnabled, pushSupport } from '../lib/push';
import { local } from '../lib/store';

/** Invites this person to turn on notifications, so letters and cards reach them. */
export function NotifyCard() {
  const support = pushSupport();
  const [on, setOn] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(() => local.get('notify-dismissed', false));
  const [msg, setMsg] = useState('');
  useEffect(() => { pushEnabled().then(setOn).catch(() => setOn(false)); }, []);
  if (on !== false || dismissed || support === 'unsupported') return null;
  const dismiss = () => { local.set('notify-dismissed', true); setDismissed(true); };
  return (
    <div className="notify-card">
      <p><b>🔔 Get a message when a letter or card arrives</b></p>
      {support === 'needs-home-screen' ? (
        <p className="small">On iPhone: tap the <b>Share</b> button <span aria-hidden="true">⬆️</span>, then <b>Add to Home Screen</b>. Open FamJam from your Home Screen and you'll be able to turn on notifications.</p>
      ) : (
        <button className="btn small" onClick={async () => {
          try { setOn(await enablePush()); if (!(await pushEnabled())) setMsg('Notifications are blocked. You can allow them in your phone’s settings.'); }
          catch { setMsg('Couldn’t turn on notifications on this phone.'); }
        }}>Turn on notifications</button>
      )}
      {msg && <p className="small">{msg}</p>}
      <button className="link small" onClick={dismiss}>Not now</button>
    </div>
  );
}
