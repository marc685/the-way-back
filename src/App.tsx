import { useState } from 'react';
import { useGameState } from './lib/store';
import { isProfileComplete } from './lib/profile';
import type { Member } from './lib/types';
import { SupportButton } from './components/SupportButton';
import { SafetyNotice } from './screens/SafetyNotice';
import { FamilySetup } from './screens/FamilySetup';
import { MemberProfile } from './screens/MemberProfile';
import { Home } from './screens/Home';
import { Play } from './screens/Play';
import { Celebration } from './screens/Celebration';
import { Journal } from './screens/Journal';
import { Paywall } from './screens/Paywall';

type View =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'profile'; index: number }
  | { name: 'play'; memberId: string }
  | { name: 'celebrate'; memberId: string }
  | { name: 'journal' }
  | { name: 'paywall' };

export default function App() {
  const [state, setState] = useGameState();
  const [view, setView] = useState<View>(() => {
    if (!state.members.length) return { name: 'setup' };
    const i = state.members.findIndex((m) => !isProfileComplete(m));
    return i >= 0 ? { name: 'profile', index: i } : { name: 'home' };
  });

  const updateMember = (m: Member) =>
    setState((s) => ({ ...s, members: s.members.map((x) => (x.id === m.id ? m : x)) }));
  const member = (id: string) => state.members.find((m) => m.id === id)!;

  let screen: JSX.Element;
  if (!state.safetyAccepted) {
    screen = <SafetyNotice onAccept={() => setState((s) => ({ ...s, safetyAccepted: true }))} />;
  } else if (view.name === 'setup') {
    screen = <FamilySetup state={state} onDone={(familyName, members) => {
      setState((s) => ({ ...s, familyName, members }));
      setView({ name: 'profile', index: 0 });
    }} />;
  } else if (view.name === 'profile') {
    const i = view.index;
    screen = <MemberProfile key={i} member={state.members[i]} index={i} total={state.members.length}
      onBack={() => setView(i ? { name: 'profile', index: i - 1 } : { name: 'setup' })}
      onSave={(m) => {
        updateMember(m);
        setView(i + 1 < state.members.length ? { name: 'profile', index: i + 1 } : { name: 'home' });
      }} />;
  } else if (view.name === 'play') {
    const m = member(view.memberId);
    screen = <Play key={m.id} state={state} member={m} onUpdate={updateMember}
      onExit={() => setView(m.wedges.length === 5 ? { name: 'celebrate', memberId: m.id } : { name: 'home' })}
      onComplete={(updated, entry) => setState((s) => ({
        ...s,
        members: s.members.map((x) => (x.id === updated.id ? updated : x)),
        journal: [...s.journal, entry],
      }))} />;
  } else if (view.name === 'celebrate') {
    const m = member(view.memberId);
    screen = <Celebration member={m} onNewRound={() => {
      updateMember({ ...m, wedges: [], rounds: m.rounds + 1 });
      setView({ name: 'home' });
    }} />;
  } else if (view.name === 'journal') {
    screen = <Journal state={state} onBack={() => setView({ name: 'home' })} />;
  } else if (view.name === 'paywall') {
    screen = <Paywall onBack={() => setView({ name: 'home' })}
      onUnlock={() => { setState((s) => ({ ...s, plus: true })); setView({ name: 'home' }); }} />;
  } else {
    screen = <Home state={state}
      onPlay={(m) => setView(m.wedges.length === 5 ? { name: 'celebrate', memberId: m.id } : { name: 'play', memberId: m.id })}
      onPaywall={() => setView({ name: 'paywall' })}
      onJournal={() => setView({ name: 'journal' })}
      onEdit={() => setView({ name: 'setup' })} />;
  }

  return (
    <main className="app">
      {screen}
      <SupportButton />
    </main>
  );
}
