// Multi-phone walkthrough: Mom, Ant and Liam each on their own "phone" (separate browser profiles).
// Needs the local server: npm run serve -- 4180   then: node e2e/phones.cjs http://localhost:4180 shots
const { chromium, devices } = require('playwright');
const [, , base = 'http://localhost:4180', out = 'shots'] = process.argv;
const check = (cond, msg) => { if (!cond) throw new Error('CHECK FAILED: ' + msg); console.log('ok -', msg); };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const phone = async (who) => {
    const ctx = await browser.newContext(process.env.DEVICE ? devices[process.env.DEVICE] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    let n = 0;
    page.shot = async (name) => { await page.waitForTimeout(450); await page.screenshot({ path: `${out}/phone-${who.toLowerCase()}-${String(++n).padStart(2, '0')}-${name}.png` }); };
    page.tap = (name) => page.getByRole('button', { name }).first().click();
    page.token = () => page.evaluate(() => localStorage.getItem('famjam-device'));
    page.api = (path, body) => page.evaluate(async ([p, b]) => {
      const r = await fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('famjam-device')}` }, body: JSON.stringify(b) });
      return { status: r.status, body: await r.json() };
    }, [path, body]);
    return page;
  };
  const profile = async (page, activity, rewards) => {
    await page.getByText('My profile').waitFor();
    await page.tap(`+ ${activity}`);
    for (const r of rewards) await page.tap(new RegExp(r));
    await page.tap(/Save/);
  };

  // ---- Mom starts the family on her phone ----
  const mom = await phone('Mom');
  await mom.goto(base);
  await mom.shot('welcome');
  await mom.tap(/Start our family/);
  await mom.getByLabel('Family name').fill('The van der Merwe family');
  for (const [name, age] of [['Mom', 'Adult'], ['Ant', 'Teen'], ['Liam', 'Child (≤12)']]) {
    await mom.getByLabel(/Add everyone/).fill(name);
    await mom.getByRole('radio', { name: age }).click();
    await mom.tap('+ Add person');
  }
  check(await mom.getByRole('button', { name: /Create our family/ }).isDisabled(), 'cannot create the family without agreeing to how data is stored');
  await mom.getByText(/I agree that FamJam stores/).click();
  await mom.shot('create');
  await mom.tap(/Create our family/);
  await profile(mom, 'baking', ['A spa day or massage']);
  await mom.getByText('Not joined yet').first().waitFor();
  check(true, 'after her profile, Mom lands on Family & invites');
  const codeFor = async (name) => {
    const row = mom.locator('.member-list li').filter({ hasText: name });
    await row.getByRole('button', { name: /Get join link/ }).click();
    return (await row.locator('.code').textContent()).trim();
  };
  const antCode = await codeFor('Ant');
  const liamCode = await codeFor('Liam');
  await mom.shot('invites');
  check(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(antCode), `join codes look right (${antCode})`);

  // ---- Ant joins with the link, Liam types the code ----
  const ant = await phone('Ant');
  await ant.goto(`${base}/join/${antCode}`);
  await ant.tap(/^Join$/);
  await profile(ant, 'drawing', ['Airtime or data']);
  const liam = await phone('Liam');
  await liam.goto(base);
  await liam.tap(/I have a join code/);
  await liam.getByLabel('Join code').fill(liamCode.replace('-', '').toLowerCase());
  await liam.shot('join');
  await liam.tap(/^Join$/);
  await liam.getByText('My profile').waitFor();
  await liam.tap('+ fishing');
  await liam.tap(/Roblox credit/);
  check(await liam.getByText(/a parent gets a message to approve/).count() === 1, 'Liam is told a parent approves rewards on their own phone');
  await liam.shot('profile');
  await liam.tap(/Save/);
  await liam.getByText('Hi Liam').waitFor();

  // A used code can't be used again.
  const again = await phone('Again');
  await again.goto(`${base}/join/${liamCode}`);
  await again.tap(/^Join$/);
  await again.getByText(/didn’t work/).waitFor();
  check(true, 'a join code only works once');

  // ---- Mom approves the children's rewards on HER phone ----
  await mom.reload();
  await mom.getByRole('button', { name: /← Home/ }).click().catch(() => {});
  await mom.getByText(/waiting for you/).waitFor();
  await mom.locator('.banner').click();
  await mom.getByText('Liam chose these rewards').waitFor();
  await mom.shot('approve');
  check((await liam.api('/api/action', { action: { type: 'approveRewards', memberId: 'x' } })).status === 403, 'Liam cannot approve rewards himself');
  for (const who of ['Liam', 'Ant']) await mom.locator('.ideas li').filter({ hasText: `${who} chose` }).getByRole('button', { name: /Approve/ }).click();
  await mom.getByText('Nothing waiting for you').waitFor();
  check(true, 'Mom approved Ant and Liam’s rewards from her own phone');

  // ---- The letter: Mom writes to Ant ----
  await fetch(`${base}/__test/card`, { method: 'POST', body: JSON.stringify({ player: 'Mom', withName: 'Ant', cardId: 'words-1' }) });
  await mom.tap('← Home');
  await mom.reload();
  await mom.locator('.my-turn').click();
  await mom.getByText(/Write Ant a note/).waitFor();
  await mom.shot('letter-card');
  await mom.tap(/Write to Ant/);
  await mom.getByLabel('Letter').fill('Thank you for always making me laugh, even on hard days. Love, Mom');
  await mom.shot('letter-writing');
  await mom.tap(/Send to Ant/);
  await mom.getByText('Sent to Ant ✉️').waitFor();
  await mom.shot('letter-sent');
  check(true, 'Mom sent the letter to Ant');

  const momId = (await mom.evaluate(async () => (await (await fetch('/api/state', { headers: { Authorization: `Bearer ${localStorage.getItem('famjam-device')}` } })).json()).view.me));
  check((await mom.api('/api/action', { action: { type: 'confirm', playerId: momId, feeling: 'loved' } })).status === 403, 'Mom cannot confirm her own letter, even by calling the server directly');
  check((await liam.api('/api/action', { action: { type: 'confirm', playerId: momId, feeling: 'loved' } })).status === 403, 'Liam cannot confirm a letter meant for Ant');
  await liam.reload();
  await liam.getByText('Hi Liam').waitFor();
  check(await liam.locator('.banner').count() === 0, 'nothing arrives on Liam’s phone');
  check(!(await liam.content()).includes('making me laugh'), 'Liam’s phone never receives the letter text');

  // ---- Ant's phone: the letter arrives ----
  await ant.reload();
  await ant.getByText(/1 waiting for you/).waitFor();
  await ant.shot('home-letter-waiting');
  await ant.locator('.banner').click();
  await ant.getByText('✉️ Mom sent you a letter').waitFor();
  await ant.shot('inbox');
  await ant.tap('Read the letter');
  await ant.getByText('Thank you for always making me laugh').waitFor();
  await ant.getByRole('radio', { name: /Loved it/ }).click();
  await ant.getByLabel(/A message back to Mom/).fill('That made my day, Mom ❤️');
  await ant.shot('read-letter');
  await ant.tap(/Yes, I read the letter from Mom/);
  await ant.getByText(/Mom earned the Finding Words wedge/).waitFor();
  check(true, 'Ant confirmed on his own phone');

  await mom.reload();
  await mom.getByText('1/5 wedges').waitFor();
  check(true, 'Mom gets the wedge once Ant confirms');
  await mom.shot('home-wedge');
  await mom.tap(/Journal/);
  await mom.getByText('That made my day, Mom').waitFor();
  check(await mom.getByText('Thank you for always making me laugh').count() === 1, 'Mom sees her letter and Ant’s reply in the journal');
  await mom.shot('journal');
  await liam.reload();
  await liam.tap(/Journal/);
  await liam.getByText('That made my day, Mom').waitFor();
  check(await liam.getByText(/A private letter to Ant/).count() === 1 && !(await liam.content()).includes('making me laugh'), 'Liam sees that a letter was sent, but not what it says');
  await liam.tap('← Home');

  const sent = await (await fetch(`${base}/__test/sent`)).json();
  check(sent.some((n) => n.title === '✉️ Mom sent you a letter'), 'a notification was sent to Ant’s phone when the letter arrived');
  check(sent.some((n) => n.title === '🎉 Ant confirmed!'), 'a notification was sent to Mom’s phone when Ant confirmed');

  // ---- A normal card: Liam does one with someone, they confirm on their phone ----
  await liam.locator('.my-turn').click();
  if (await liam.getByRole('button', { name: 'Remind me later' }).count()) await liam.tap('Remind me later');
  await liam.tap(/Roll the dice/);
  await liam.locator('.task-card').waitFor({ timeout: 8000 });
  await liam.shot('card');
  if (await liam.getByRole('button', { name: /Write to/ }).count()) {
    await liam.tap(/Write to/);
    await liam.getByLabel('Letter').fill('You are the best!');
    await liam.tap(/Send to/);
  } else {
    await liam.tap(/I’ve done it/);
  }
  const partner = (await liam.locator('.handover h2').textContent()).replace(/^(Sent to |Waiting for )/, '').replace(' ✉️', '').trim();
  const other = partner === 'Mom' ? mom : ant;
  await other.reload();
  await other.locator('.banner').click();
  await other.locator('.ideas li').first().getByRole('button').click();
  if (await other.getByRole('button', { name: /Not yet/ }).count()) {
    await other.tap(/Not yet/);
    const s = await liam.evaluate(async () => (await (await fetch('/api/state', { headers: { Authorization: `Bearer ${localStorage.getItem('famjam-device')}` } })).json()).view);
    check(s.members.find((m) => m.name === 'Liam').wedges.length === 0, `${partner} said "not yet": no wedge for Liam`);
    await liam.reload();
    await liam.locator('.my-turn').click();
    await liam.tap(/I’ve done it/);
    await other.reload();
    await other.locator('.banner').click();
    await other.locator('.ideas li').first().getByRole('button').click();
  }
  await other.getByRole('radio', { name: /It was nice/ }).click();
  await other.tap(/Yes,/);
  await other.getByText(/Liam earned the/).waitFor();
  check(true, `${partner} confirmed Liam’s card on their own phone`);

  // ---- Self-care prompt on Liam's own phone ----
  let prompt = false;
  for (let d = 0; d < 7 && !prompt; d++) {
    await liam.clock.setFixedTime(new Date(Date.UTC(2026, 10, 9 + d, 10)));
    await liam.reload();
    await liam.getByText('Hi Liam').waitFor();
    if (await liam.locator('.my-turn').getByText('💭').count()) {
      prompt = true;
      await liam.locator('.my-turn').click();
      await liam.getByText('💭 Just for you, Liam').waitFor();
      await liam.shot('prompt');
      await liam.tap('Thanks 💛');
      await liam.tap('← Home');
    }
  }
  check(prompt, 'Liam gets a child-friendly self-care prompt on his own phone this week');

  // ---- New phone for Ant: the old one is disconnected ----
  await mom.reload();
  await mom.tap(/Family & invites/);
  const row = mom.locator('.member-list li').filter({ hasText: 'Ant' });
  await row.getByRole('button', { name: /New phone/ }).click();
  const newCode = (await row.locator('.code').textContent()).trim();
  const ant2 = await phone('Ant2');
  await ant2.goto(`${base}/join/${newCode}`);
  await ant2.tap(/^Join$/);
  await ant2.getByText('Hi Ant').waitFor();
  await ant.reload();
  await ant.getByText(/no longer connected/).waitFor();
  check(true, 'when Ant joins on a new phone, the old phone is disconnected');

  console.log('page errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
