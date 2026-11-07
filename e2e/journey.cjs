// End-to-end walkthrough at phone size. Usage: node e2e/journey.cjs <baseUrl> <outDir>
const { chromium } = require('playwright');
const [, , base = 'http://localhost:4173', out = 'shots'] = process.argv;

(async () => {
  const browser = await chromium.launch();
  const { devices } = require('playwright');
  const page = await browser.newPage(process.env.DEVICE ? devices[process.env.DEVICE] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let n = 0;
  const shot = async (name) => { await page.waitForTimeout(500); return page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const click = (name) => page.getByRole('button', { name }).first().click();

  await page.goto(base);
  await shot('safety');
  await click(/let's begin/);

  await page.getByLabel('Family name').fill('The van der Merwe family');
  const fam = [['Mom', 'Adult'], ['Dad', 'Adult'], ['Liam', 'Child (≤12)'], ['Zoe', 'Teen'], ['Ben', 'Child (≤12)']];
  for (const [name, age] of fam) {
    await page.getByLabel('Add a family member').fill(name);
    await page.getByRole('radio', { name: age }).click();
    await click('+ Add member');
  }
  await shot('family');
  await click(/Next: everyone/);

  const profiles = { Mom: 'baking', Dad: 'hiking', Liam: 'fishing', Zoe: 'drawing', Ben: 'soccer' };
  const check = (cond, msg) => { if (!cond) throw new Error('CHECK FAILED: ' + msg); console.log('ok -', msg); };
  for (const [name, act] of Object.entries(profiles)) {
    await page.getByText(`${name}'s profile`).waitFor();
    const isAdult = name === 'Mom' || name === 'Dad';
    if (name === 'Mom') {
      // Activity typed but never "Add"-ed should still be saved.
      await page.getByPlaceholder('e.g. fishing, baking').fill('baking');
      await click(/Save &/);
      check(await page.getByRole('alert').filter({ hasText: 'Choose at least one reward' }).count() === 1, 'save without a reward explains what is missing');
      await click(/A spa day or massage/);
      await click(/Date night/);
      await page.getByLabel('Add my own reward').fill('A hike up Table Mountain');
      await page.getByLabel('Add my own reward').press('Enter');
      check(await page.locator('.reward.on').count() === 3, 'two ready-made rewards and one custom reward are selected');
      check(await page.getByText('A parent agrees').count() === 0, 'adult is not asked for parent approval');
      await shot('rewards-adult');
    } else {
      await click(`+ ${act}`);
      if (name === 'Liam') { await click(/Roblox credit/); await click(/A sleepover with a friend/); }
      else await click(/Weekend away/);
      if (!isAdult) {
        await click(/Save &/);
        check(await page.getByRole('alert').filter({ hasText: 'parent' }).count() === 1, `${name}: child/teen needs parent approval`);
        await page.getByLabel('A parent agrees').check();
      }
      if (name === 'Liam') await shot('profile-liam');
    }
    await click(/Save &/);
  }
  await page.getByText("Who's playing today?").waitFor();
  await shot('home');

  // Liam plays until he has all 5 wedges. Each card is confirmed by the other person.
  check(await page.getByText('Extended family').count() === 0, 'profile no longer asks about extended family');
  const seenTypes = new Set();
  for (let round = 0; round < 5; round++) {
    await page.getByRole('button', { name: /Liam/ }).first().click();
    if (round > 0) await click('Parent: give a bonus roll');
    await click(/Roll the dice/);
    await page.locator('.task-card').waitFor({ timeout: 5000 });
    if (round === 0) { await shot('card'); await click(/Not today/); }
    const doIt = async () => {
      if (await page.getByRole('button', { name: /Write to/ }).count()) {
        seenTypes.add('letter');
        await click(/Write to/);
        await page.getByLabel('Letter', { exact: true }).fill('Thank you for always being there for me.');
        await click(/Done – give it to/);
      } else {
        seenTypes.add('task');
        await click(/I've done it/);
      }
      return (await page.locator('.handover h2').textContent()).replace('Hand the phone to ', '');
    };
    const partner = await doIt();
    if (round === 0) {
      await shot('handover');
      await click(/will confirm later/);
      await page.locator('.banner').waitFor();
      check(await page.getByText(`Waiting for ${partner}`).count() === 1, 'player row shows who they are waiting for');
      await shot('home-waiting');
      await page.locator('.banner').click();
      await click(/Not yet/);
      check(await page.locator('.banner').count() === 0, '"Not yet" gives the card back');
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('famjam-state-v1')));
      check(saved.members.find((m) => m.name === 'Liam').wedges.length === 0, 'no wedge until confirmed');
      await page.getByRole('button', { name: /Liam/ }).first().click();
      await doIt();
    }
    await click(/is here – confirm now/);
    await page.getByText(`${partner}, did Liam do this with you?`).waitFor();
    if (seenTypes.has('letter') && (await page.locator('.paper.read').count())) {
      check(await page.getByText('Thank you for always being there for me.').count() === 1, `${partner} can read the letter`);
    }
    check(await page.getByRole('button', { name: /Yes, we did this/ }).isDisabled(), 'confirmer must choose a feeling first');
    await page.getByRole('radio', { name: /Loved it/ }).click();
    await page.getByLabel(/A message back to Liam/).fill(`That was lovely, Liam – from ${partner}`);
    if (round === 0) await shot('confirm');
    await click(/Yes, we did this/);
    await page.getByText(/Liam earned the/).waitFor();
    if (round === 0) await shot('wedge-earned');
    await click(/Back to the family/);
  }
  await page.getByText(/completed the circle/).waitFor();
  check(await page.getByRole('button', { name: 'Start a new circle' }).isDisabled(), 'must choose which reward to claim first');
  await click(/A sleepover with a friend/);
  await shot('celebration');
  await click(/Start a new circle/);
  await click(/Family journal/);
  check(await page.getByText(/That was lovely, Liam/).count() === 5, 'journal shows the replies from the people who confirmed');
  await shot('journal');
  await click('← Home');
  await click(/Family Plus/);
  await shot('paywall');
  await click(/Not now/);
  await click(/Need support/);
  await shot('support');

  // Persistence check
  await page.reload();
  await page.getByText('The van der Merwe family').waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('famjam-state-v1')));
  const mom = saved.members.find((m) => m.name === 'Mom');
  check(mom.activities.includes('baking'), 'typed-but-not-added activity was saved');
  check(mom.rewards.length === 3 && mom.rewards.includes('A hike up Table Mountain'), 'all of Mom\'s rewards were saved');
  console.log('card types seen:', [...seenTypes].join(', '));
  console.log('page errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
