import { useState } from 'react';

export function SupportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="support-bar">
        <button className="support-fab" onClick={() => setOpen(true)} aria-label="Need support?">
          💛 Need support?
        </button>
      </div>
      {open && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>You don't have to carry this alone</h2>
            <p>If someone is unsafe or in crisis, please reach out now. These South African services are free and confidential.</p>
            <ul className="helplines">
              <li><b>SADAG Suicide Crisis Line</b><a href="tel:0800567567">0800 567 567</a></li>
              <li><span><b>SADAG Helpline</b><small>8am–8pm</small></span><a href="tel:0800212223">0800 21 22 23</a></li>
              <li><b>Childline South Africa</b><a href="tel:116">116</a></li>
              <li><b>Lifeline</b><a href="tel:0861322322">0861 322 322</a></li>
              <li><b>Emergency (from a cellphone)</b><a href="tel:112">112</a></li>
              <li><b>Police</b><a href="tel:10111">10111</a></li>
            </ul>
            <p className="muted">If you're in therapy, you can also bring anything that comes up in the game to your next session.</p>
            <button className="btn" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
