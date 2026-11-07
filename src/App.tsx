import { useCallback, useEffect, useState } from 'react';
import { useFamily } from './lib/store';
import { api, ApiError, type Action, type FamilyView } from './lib/api';
import { isProfileComplete } from './lib/profile';
import { SupportButton } from './components/SupportButton';
import { Welcome } from './screens/Welcome';
import { FamilySetup } from './screens/FamilySetup';
import { Join } from './screens/Join';
import { MemberProfile } from './screens/MemberProfile';
import { Home } from './screens/Home';
import { Play } from './screens/Play';
import { Confirm } from './screens/Confirm';
import { Inbox } from './screens/Inbox';
import { Family } from './screens/Family';
import { Celebration } from './screens/Celebration';
import { Journal } from './screens/Journal';
import { Paywall } from './screens/Paywall';
import { Catalogue } from './screens/Catalogue';

type View =
  | { name: 'home' } | { name: 'play' } | { name: 'confirm'; playerId: string } | { name: 'inbox' }
  | { name: 'family' } | { name: 'profile' } | { name: 'celebrate' } | { name: 'journal' } | { name: 'ideas' } | { name: 'paywall' };
type Start = { name: 'welcome' } | { name: 'create' } | { name: 'join'; code?: string };

/** Where a link or notification wants to go: /join/CODE, /inbox, /journal. */
function fromUrl(): { start?: Start; view?: View } {
  const p = location.pathname;
  const join = p.match(/^\/join\/([A-Za-z0-9-]{6,9})\/?$/);
  if (join) return { start: { name: 'join', code: join[1].toUpperCase() } };
  if (p.startsWith('/inbox')) return { view: { name: 'inbox' } };
  if (p.startsWith('/journal')) return { view: { name: 'journal' } };
  return {};
}

export default function App() {
  const fam = useFamily();
  const [initial] = useState(fromUrl);
  const [view, setView] = useState<View>(initial.view ?? { name: 'home' });
  const [start, setStart] = useState<Start>(initial.start ?? { name: 'welcome' });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (location.pathname !== '/') history.replaceState(null, '', '/'); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);
  // A notification tapped while the app is open navigates the page: pick that up too.
  useEffect(() => {
    const onNav = () => { const r = fromUrl(); if (r.view) setView(r.view); };
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);

  /** Run a server action; on failure show the reason and return null. */
  const act = useCallback(async (a: Action): Promise<FamilyView | null> => {
    try { return await fam.act(a); } catch (e) { setToast(e instanceof Error ? e.message : 'Something went wrong.'); return null; }
  }, [fam.act]);
  const home = () => setView({ name: 'home' });

  let screen: JSX.Element;
  const v = fam.view;
  const me = v?.members.find((m) => m.id === v.me);

  if (fam.loading && !v) {
    screen = <div className="screen center"><p className="lead">Loading your family…</p></div>;
  } else if (!v || !me) {
    // This phone isn't part of a family yet (or was disconnected).
    if (start.name === 'create') {
      screen = <FamilySetup onBack={() => setStart({ name: 'welcome' })} onCreate={async (familyName, members, meIndex) => {
        try { const r = await api.createFamily(familyName, members, meIndex); fam.signIn(r.token, r.view); setView({ name: 'home' }); }
        catch (e) { setToast((e as ApiError).message); }
      }} />;
    } else if (start.name === 'join') {
      screen = <Join initialCode={start.code} onBack={() => setStart({ name: 'welcome' })} onJoin={async (code) => {
        try { const r = await api.join(code); fam.signIn(r.token, r.view); setView({ name: 'home' }); }
        catch (e) { setToast((e as ApiError).message); }
      }} />;
    } else {
      screen = <Welcome notice={fam.signedOut} onStart={() => setStart({ name: 'create' })} onJoin={() => setStart({ name: 'join' })} />;
    }
  } else if (!isProfileComplete(me) || view.name === 'profile') {
    const first = !isProfileComplete(me);
    screen = <MemberProfile key={me.id + String(first)} member={me} firstTime={first} onBack={first ? undefined : home}
      onSave={async (m) => {
        const r = await act({ type: 'updateProfile', memberId: me.id, patch: { activities: m.activities, rewards: m.rewards, nudges: m.nudges, avatar: m.avatar } });
        if (r) setView(first && me.isParent && v.connected.length < v.members.length ? { name: 'family' } : { name: 'home' });
      }} />;
  } else if (view.name === 'play') {
    screen = me.wedges.length >= 5 && !me.currentCard
      ? <Celebration member={me} onClaim={async (reward) => { if (await act({ type: 'claimReward', reward })) home(); }} />
      : <Play view={v} act={act} onExit={home} />;
  } else if (view.name === 'confirm') {
    screen = <Confirm key={view.playerId} view={v} playerId={view.playerId} act={act} onDone={() => setView({ name: 'inbox' })} />;
  } else if (view.name === 'inbox') {
    screen = <Inbox view={v} onBack={home} onOpen={(playerId) => setView({ name: 'confirm', playerId })}
      onApprove={async (memberId) => { await act({ type: 'approveRewards', memberId }); }} />;
  } else if (view.name === 'family') {
    screen = <Family view={v} act={act} onBack={home} onError={setToast} />;
  } else if (view.name === 'ideas') {
    screen = <Catalogue view={v} act={act} onBack={home} />;
  } else if (view.name === 'journal') {
    screen = <Journal view={v} onBack={home} />;
  } else if (view.name === 'paywall') {
    screen = <Paywall canBuy={!!me.isParent} onBack={home} onUnlock={async () => { if (await act({ type: 'unlockPlus' })) home(); }} />;
  } else {
    screen = <Home view={v}
      onMyTurn={() => setView({ name: 'play' })}
      onInbox={() => setView({ name: 'inbox' })}
      onIdeas={() => setView({ name: 'ideas' })}
      onPaywall={() => setView({ name: 'paywall' })}
      onJournal={() => setView({ name: 'journal' })}
      onFamily={() => setView({ name: 'family' })}
      onProfile={() => setView({ name: 'profile' })} />;
  }

  return (
    <main className="app">
      {fam.offline && <div className="offline" role="status">📶 No connection – showing what we had. Changes need internet.</div>}
      {screen}
      {toast && <div className="toast" role="alert" onClick={() => setToast(null)}>{toast}</div>}
      <SupportButton />
    </main>
  );
}
