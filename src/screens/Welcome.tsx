export function Welcome({ onStart, onJoin, notice }: { onStart: () => void; onJoin: () => void; notice?: string | null }) {
  return (
    <div className="screen center">
      <div className="hero-icon"><img src="/icon.svg" alt="" width={96} height={96} /></div>
      <h1>FamJam</h1>
      <p className="lead">A game about finding yourself, finding words, finding each other – and coming back together.</p>
      {notice && <div className="problem" role="alert"><p>{notice}</p></div>}
      <div className="card soft">
        <h3>Before you start</h3>
        <ul className="ticks">
          <li>This is a family game, <b>not therapy</b> and not a substitute for professional help.</li>
          <li>Everyone plays on <b>their own phone</b>. When you do a card with someone, <b>they</b> confirm it on theirs.</li>
          <li>Every card has a <b>“Not today”</b> button. Skipping is always OK – no one loses anything.</li>
          <li>Nobody should be asked to face something hard alone. Bring in a trusted adult when it feels big.</li>
          <li>If anyone is unsafe, tap <b>💛 Need support?</b> at any time.</li>
        </ul>
      </div>
      <button className="btn big" onClick={onStart}>👪 Start our family</button>
      <button className="btn big ghost" onClick={onJoin}>🔑 I have a join code</button>
      <p className="muted small">A parent starts the family, then sends everyone else a join code.</p>
    </div>
  );
}
