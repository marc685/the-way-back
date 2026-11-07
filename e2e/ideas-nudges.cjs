// Ideas catalogue, our own activities and self-care prompts. Usage: node e2e/ideas-nudges.cjs <baseUrl> <outDir>
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , base = 'http://localhost:4173', out = 'shots'] = process.argv;
const check = (cond, msg) => { if (!cond) throw new Error('CHECK FAILED: ' + msg); console.log('ok -', msg); };

const decks = ['self', 'words', 'together', 'wayback', 'play'];
const allIds = (w) => JSON.parse(fs.readFileSync(path.join(__dirname, `../src/data/decks/${w}.json`))).map((c) => c.id);
const mk = (id, name, avatar, age, p = {}) => ({ id, name, avatar, age, activities: [], rewards: ['Pocket money'], rewardApproved: true,
  wedges: [], rounds: 0, nudges: true, nudgeLog: [], ...p });
const family = (extra = {}) => ({
  version: 1, safetyAccepted: true, familyName: 'The van der Merwe family', plus: false, journal: [],
  customCards: [], favourites: [], hidden: [],
  members: [mk('liam', 'Liam', '🦊', 'child', { activities: ['fishing'] }), mk('mom', 'Mom', '🦁', 'adult', { activities: ['baking'] }), mk('zoe', 'Zoe', '🐼', 'teen')],
  ...extra,
});

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(process.env.DEVICE ? devices[process.env.DEVICE] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let n = 0;
  const shot = async (name) => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/ideas-${String(++n).padStart(2, '0')}-${name}.png` }); };
  const click = (name) => page.getByRole('button', { name }).first().click();
  const load = async (state, time) => {
    await page.goto(base);
    await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('famjam-state-v1', JSON.stringify(s)); }, state);
    await page.reload();
    await page.getByText("Who's playing today?").waitFor();
  };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('famjam-state-v1')));

  // --- Catalogue ---
  await load(family());
  await click(/💡 Ideas/);
  await page.getByText('400 things to do together').waitFor();
  check(true, 'catalogue shows all 400 ideas');
  await shot('catalogue');
  await page.getByLabel('Search ideas').fill('tea');
  const teaCount = Number((await page.locator('[aria-live]').textContent()).split(' ')[0]);
  check(teaCount > 0 && teaCount < 400, `search narrows results (${teaCount} for "tea")`);
  await page.getByLabel('Search ideas').fill('');
  await click(/🎈 Play/);
  await click(/More filters/);
  await click(/^No cost$/);
  await click(/^At home$/);
  const filtered = Number((await page.locator('[aria-live]').textContent()).split(' ')[0]);
  check(filtered > 0 && filtered < 80, `filters narrow to free play ideas at home (${filtered})`);
  await shot('filtered');
  const firstIdea = page.locator('.ideas li').first();
  const firstText = await firstIdea.locator('p').textContent();
  await firstIdea.getByRole('button', { name: /Our list/ }).click();
  check((await saved()).favourites.length === 1, 'starring an idea adds it to our list');
  await page.locator('.ideas li').nth(1).getByRole('button', { name: /Not for us/ }).click();
  check((await saved()).hidden.length === 1, '"Not for us" hides an idea');
  await click(/⭐ Our list/);
  check((await page.locator('.ideas li p').first().textContent()) === firstText, 'our list shows the starred idea');
  await click(/⭐ Our list/);

  // --- Our own activity ---
  await click(/Add our own activity/);
  await page.getByLabel("What's the activity?").fill('Go fishing at the dam');
  await page.locator('.field').filter({ hasText: 'Which wedge is it?' }).getByRole('button', { name: /Play/ }).click();
  await page.locator('.field').filter({ hasText: 'Do it with' }).getByRole('button', { name: /Mom/ }).click();
  await shot('add-own');
  await click('Save activity');
  await page.getByText('Our own activities (1)').waitFor();
  check(true, 'our own activity is saved and listed');
  await shot('own-listed');

  // Force a draw from the Play wedge where every built-in idea is hidden: the dice must pick our own activity.
  const s1 = await saved();
  s1.members[0].wedges = ['self', 'words', 'together', 'wayback'];
  s1.hidden = allIds('play');
  await load(s1);
  await page.getByRole('button', { name: /Liam/ }).first().click();
  if (await page.getByRole('button', { name: 'Remind me later' }).count()) await click('Remind me later');
  await click(/Roll the dice/);
  await page.locator('.task-card').waitFor({ timeout: 5000 });
  check(await page.getByText('Go fishing at the dam – with Mom').count() === 1, 'the dice draws our own activity, with the chosen person');
  await shot('own-card');
  await click(/I've done it/);
  await click(/is here – confirm now/);
  await page.getByRole('radio', { name: /Loved it/ }).click();
  await click(/Yes, we did this/);
  await page.getByText(/Liam earned the Play wedge/).waitFor();
  check(true, 'our own activity is confirmed and earns the wedge');

  // --- Self-care prompts: find a day this week when each person has one ---
  for (const who of ['Liam', 'Zoe', 'Mom']) {
    let found = false;
    for (let d = 0; d < 7 && !found; d++) {
      await page.clock.setFixedTime(new Date(Date.UTC(2026, 10, 9 + d, 10)));
      await load(family());
      const row = page.getByRole('button', { name: new RegExp(who) }).first();
      if (await row.getByText('💭').count()) {
        found = true;
        await row.click();
        await page.getByText(`💭 Just for you, ${who}`).waitFor();
        await shot(`nudge-${who.toLowerCase()}`);
        if (who === 'Liam') {
          await click('Write a private note');
          await page.getByLabel('Private note').fill('I feel happy when I go fishing');
        }
        await click('Thanks 💛');
        check(await page.getByText('💭 Just for you').count() === 0, `${who}: prompt disappears once read`);
        const st = await saved();
        const m = st.members.find((x) => x.name === who);
        check(m.nudgeLog.length === 1, `${who}: prompt recorded as read (${m.nudgeLog[0].id})`);
        check(m.nudgeLog[0].id.startsWith(m.age), `${who}: prompt matches age (${m.age})`);
        check(st.journal.length === 0, `${who}: prompt is private – nothing in the family journal`);
      }
    }
    check(found, `${who} gets a prompt this week`);
  }
  // Switching prompts off
  await page.clock.setFixedTime(new Date(Date.UTC(2026, 10, 9, 10)));
  const off = family();
  off.members.forEach((m) => { m.nudges = false; });
  for (let d = 0; d < 7; d++) {
    await page.clock.setFixedTime(new Date(Date.UTC(2026, 10, 9 + d, 10)));
    await load(off);
    if (await page.getByText('💭').count()) throw new Error('CHECK FAILED: prompts shown while switched off');
  }
  check(true, 'prompts never show when switched off');

  console.log('page errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
