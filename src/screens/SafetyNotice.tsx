export function SafetyNotice({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="screen center">
      <div className="hero-icon"><img src="/icon.svg" alt="" width={96} height={96} /></div>
      <h1>FamJam</h1>
      <p className="lead">A game about finding yourself, finding words, finding each other – and coming back together.</p>
      <div className="card soft">
        <h3>Before you start</h3>
        <ul className="ticks">
          <li>This is a family game, <b>not therapy</b> and not a substitute for professional help.</li>
          <li>Every card has a <b>“Not today”</b> button. Skipping is always OK – no one loses anything.</li>
          <li>Nobody should be asked to face something hard alone. Bring in a trusted adult when it feels big.</li>
          <li>Everything you type stays on this phone.</li>
          <li>If anyone is unsafe, tap <b>💛 Need support?</b> at any time.</li>
        </ul>
      </div>
      <button className="btn big" onClick={onAccept}>I understand – let's begin</button>
    </div>
  );
}
