import { describe, it, expect, beforeEach } from 'vitest';
import { makeTestServer } from './testkit';

type Any = any;
let s: ReturnType<typeof makeTestServer>;
let mom: string; let ant: string; let liam: string;
let ids: Record<string, string>;
const view = (r: Any) => r.body.view;

async function setup() {
  s = makeTestServer();
  const r: Any = await s.call('POST', '/api/family', {
    consent: true, familyName: 'The Smiths', meIndex: 0,
    members: [{ name: 'Mom', age: 'adult', avatar: '🦁' }, { name: 'Ant', age: 'teen' }, { name: 'Liam', age: 'child' }],
  });
  expect(r.status).toBe(200);
  mom = r.body.token;
  ids = Object.fromEntries(view(r).members.map((m: Any) => [m.name, m.id]));
  const join = async (name: string) => {
    const inv: Any = await s.call('POST', '/api/invite', { memberId: ids[name] }, mom);
    const j: Any = await s.call('POST', '/api/join', { code: inv.body.code });
    expect(j.status).toBe(200);
    expect(view(j).me).toBe(ids[name]);
    return j.body.token as string;
  };
  ant = await join('Ant');
  liam = await join('Liam');
}
const act = (token: string, action: Any) => s.call('POST', '/api/action', { action }, token) as Promise<Any>;
const state = async (token: string) => view(await s.call('GET', '/api/state', undefined, token));
const memberIn = (v: Any, name: string) => v.members.find((m: Any) => m.name === name);

/** Give Mom a specific card with Ant, as if she'd drawn it. */
async function momDrawsWithAnt(type: 'task' | 'letter') {
  for (let i = 0; i < 40; i++) {
    const r = await act(mom, { type: 'roll' });
    expect(r.status).toBe(200);
    const c = memberIn(view(r), 'Mom').currentCard;
    if (c.withMemberId === ids.Ant && c.type === type) return c;
    // Not the one we want for this test: reset Mom's day (parent bonus) after clearing the card.
    const fam = (await s.store.getFamily((await s.store.findDevice(require('node:crypto').createHash('sha256').update(mom).digest('hex')))!.familyId))!;
    fam.doc.members = fam.doc.members.map((m: Any) => (m.name === 'Mom' ? { ...m, currentCard: undefined, lastRollDate: undefined } : m));
    await s.store.saveFamily(fam.doc, fam.version);
  }
  throw new Error('could not draw');
}

describe('family setup and joining', () => {
  beforeEach(setup);
  it('needs consent and an adult to set up', async () => {
    expect((await s.call('POST', '/api/family', { familyName: 'X', meIndex: 0, members: [{ name: 'a', age: 'adult' }, { name: 'b', age: 'child' }] })).status).toBe(400);
    expect((await s.call('POST', '/api/family', { consent: true, familyName: 'X', meIndex: 1, members: [{ name: 'a', age: 'adult' }, { name: 'b', age: 'child' }] })).status).toBe(400);
  });
  it('join codes work once only', async () => {
    const inv: Any = await s.call('POST', '/api/invite', { memberId: ids.Liam }, mom);
    expect((await s.call('POST', '/api/join', { code: inv.body.code.toLowerCase().replace('-', ' ') })).status).toBe(200);
    expect((await s.call('POST', '/api/join', { code: inv.body.code })).status).toBe(404);
  });
  it('join codes expire after 7 days', async () => {
    const inv: Any = await s.call('POST', '/api/invite', { memberId: ids.Liam }, mom);
    await s.store['sql'](`UPDATE join_codes SET expires_at = now() - interval '1 minute'`);
    expect((await s.call('POST', '/api/join', { code: inv.body.code })).status).toBe(404);
  });
  it('only parents can create join codes', async () => {
    expect((await s.call('POST', '/api/invite', { memberId: ids.Liam }, ant)).status).toBe(403);
  });
  it('joining on a new phone disconnects the old one', async () => {
    const inv: Any = await s.call('POST', '/api/invite', { memberId: ids.Ant }, mom);
    const j: Any = await s.call('POST', '/api/join', { code: inv.body.code });
    expect((await s.call('GET', '/api/state', undefined, ant)).status).toBe(401);
    expect((await s.call('GET', '/api/state', undefined, j.body.token)).status).toBe(200);
  });
  it('rejects unknown phones', async () => {
    expect((await s.call('GET', '/api/state', undefined, 'not-a-real-key')).status).toBe(401);
    expect((await s.call('POST', '/api/action', { action: { type: 'roll' } })).status).toBe(401);
  });
  it('slows down guessing join codes', async () => {
    for (let i = 0; i < 10; i++) expect((await s.call('POST', '/api/join', { code: 'AAA-AAA' }, undefined, '9.9.9.9')).status).toBe(404);
    expect((await s.call('POST', '/api/join', { code: 'AAA-AAA' }, undefined, '9.9.9.9')).status).toBe(429);
  });
});

describe('fair play', () => {
  beforeEach(setup);
  it('a letter goes to the recipient, only they can confirm it, and the writer gets the wedge', async () => {
    await momDrawsWithAnt('letter');
    expect((await act(mom, { type: 'send' })).status).toBe(400); // must write it first
    const sent = await act(mom, { type: 'send', letter: 'Dear Ant, I love you.' });
    expect(sent.status).toBe(200);
    expect(s.sent.at(-1)).toMatchObject({ memberId: ids.Ant, title: '✉️ Mom sent you a letter' });

    // Ant sees the letter; Liam does not.
    expect(memberIn(await state(ant), 'Mom').currentCard.letter).toBe('Dear Ant, I love you.');
    expect(memberIn(await state(liam), 'Mom').currentCard.letter).toBeUndefined();

    // Mom cannot confirm her own letter, and neither can Liam.
    expect((await act(mom, { type: 'confirm', playerId: ids.Mom, feeling: 'loved' })).status).toBe(403);
    expect((await act(liam, { type: 'confirm', playerId: ids.Mom, feeling: 'loved' })).status).toBe(403);
    expect(memberIn(await state(mom), 'Mom').wedges).toEqual([]);

    const r = await act(ant, { type: 'confirm', playerId: ids.Mom, feeling: 'loved', reply: 'Thanks Mom' });
    expect(r.status).toBe(200);
    expect(memberIn(view(r), 'Mom').wedges).toHaveLength(1);
    expect(memberIn(view(r), 'Ant').wedges).toHaveLength(0);
    expect(s.sent.at(-1)).toMatchObject({ memberId: ids.Mom, title: '🎉 Ant confirmed!' });

    // The journal shows the letter only to Mom and Ant.
    expect((await state(ant)).journal[0].letter).toBe('Dear Ant, I love you.');
    expect((await state(liam)).journal[0]).toMatchObject({ letter: undefined, privateLetter: true, reply: 'Thanks Mom' });
  });
  it('"not yet" gives the card back with no wedge', async () => {
    await momDrawsWithAnt('task');
    await act(mom, { type: 'send' });
    expect((await act(ant, { type: 'notYet', playerId: ids.Mom })).status).toBe(200);
    const m = memberIn(await state(mom), 'Mom');
    expect(m.currentCard.status).toBe('todo');
    expect(m.wedges).toEqual([]);
  });
  it('the server draws the card, once a day', async () => {
    const r = await act(liam, { type: 'roll' });
    expect(memberIn(view(r), 'Liam').currentCard).toBeDefined();
    expect((await act(liam, { type: 'roll' })).status).toBe(409);
    const c = memberIn(view(r), 'Liam').currentCard;
    await act(liam, { type: 'send', letter: 'x' });
    // A card can only be confirmed by the person on it – after that, still no second roll today.
    const confirmer = c.withMemberId === ids.Mom ? mom : ant;
    await act(confirmer, { type: 'confirm', playerId: ids.Liam, feeling: 'nice' });
    expect((await act(liam, { type: 'roll' })).status).toBe(409);
  });
  it('only a parent can give a bonus roll', async () => {
    expect((await act(liam, { type: 'bonusRoll', memberId: ids.Liam })).status).toBe(403);
    expect((await act(mom, { type: 'bonusRoll', memberId: ids.Liam })).status).toBe(200);
  });
  it('children choose rewards, but only a parent can approve them', async () => {
    const r = await act(liam, { type: 'updateProfile', memberId: ids.Liam, patch: { rewards: ['Roblox credit'] } });
    expect(memberIn(view(r), 'Liam').rewardApproved).toBe(false);
    expect(s.sent.at(-1)).toMatchObject({ memberId: ids.Mom, title: '🏆 Liam chose rewards' });
    expect((await act(liam, { type: 'approveRewards', memberId: ids.Liam })).status).toBe(403);
    expect((await act(ant, { type: 'approveRewards', memberId: ids.Liam })).status).toBe(403);
    expect(memberIn(view(await act(mom, { type: 'approveRewards', memberId: ids.Liam })), 'Liam').rewardApproved).toBe(true);
    // Changing rewards later needs approval again.
    expect(memberIn(view(await act(liam, { type: 'updateProfile', memberId: ids.Liam, patch: { rewards: ['Roblox credit', 'A new bike'] } })), 'Liam').rewardApproved).toBe(false);
  });
  it('adults do not need approval; nobody can edit someone else’s profile unless a parent', async () => {
    expect(memberIn(view(await act(mom, { type: 'updateProfile', memberId: ids.Mom, patch: { rewards: ['Spa day'] } })), 'Mom').rewardApproved).toBe(true);
    expect((await act(ant, { type: 'updateProfile', memberId: ids.Liam, patch: { rewards: ['x'] } })).status).toBe(403);
  });
  it('self-care prompt history is private', async () => {
    await act(liam, { type: 'readNudge', date: '2026-11-09', id: 'child-3' });
    expect(memberIn(await state(liam), 'Liam').nudgeLog).toHaveLength(1);
    expect(memberIn(await state(mom), 'Liam').nudgeLog).toEqual([]);
  });
  it('removing someone disconnects their phone', async () => {
    expect((await act(mom, { type: 'removeMember', memberId: ids.Liam })).status).toBe(200);
    expect((await s.call('GET', '/api/state', undefined, liam)).status).toBe(401);
  });
  it('sends self-care reminders only with the cron secret, without the prompt on the lock screen', async () => {
    expect((await s.call('GET', '/api/cron-nudges')).status).toBe(401);
    const r: Any = await s.call('GET', '/api/cron-nudges', undefined, 'test-cron-secret');
    expect(r.status).toBe(200);
    for (const n of s.sent.filter((x) => x.title.startsWith('💭'))) expect(n.body).not.toMatch(/\?/);
  });
});
