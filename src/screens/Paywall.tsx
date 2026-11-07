export function Paywall({ canBuy, onUnlock, onBack }: { canBuy: boolean; onUnlock: () => void; onBack: () => void }) {
  return (
    <div className="screen">
      <button className="link back" onClick={onBack}>← Not now</button>
      <h1>✨ Family Plus</h1>
      <p className="lead">More cards, more ways to connect – for the whole family on one subscription.</p>
      <ul className="ticks card">
        <li>The full deck: 100+ cards across all five wedges</li>
        <li>Seasonal decks: holidays, school stress, new sibling, moving house</li>
        <li>Deeper “Coming Back Together” repair cards for teens and parents</li>
        <li>Clinician packs: decks your psychologist can assign <em>(coming soon)</em></li>
        <li>Unlimited family members and multiple households (e.g. co-parenting)</li>
      </ul>
      <div className="plans">
        <div className="plan"><b>Monthly</b><span>R79</span><small>per family / month</small></div>
        <div className="plan best"><b>Yearly</b><span>R699</span><small>save 26% · 7-day free trial</small></div>
      </div>
      {canBuy
        ? <button className="btn big plus" onClick={onUnlock}>Start free trial (demo)</button>
        : <p className="card soft">Ask a parent to start Family Plus – it unlocks everything for the whole family.</p>}
      <p className="muted small center-text">Prototype only – no payment is taken. Prices are placeholders.</p>
    </div>
  );
}
