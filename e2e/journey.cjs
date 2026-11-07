// End-to-end walkthrough at phone size. Usage: node e2e/journey.cjs <baseUrl> <outDir>
const { chromium } = require('playwright');
const [, , base = 'http://localhost:4173', out = 'shots'] = process.argv;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
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
  for (const [name, act] of Object.entries(profiles)) {
    await page.getByText(`${name}'s profile`).waitFor();
    await click(`+ ${act}`);
    await click('+ Gran');
    await page.getByPlaceholder('e.g. the Naidoos').fill('the Naidoos');
    await page.getByPlaceholder('e.g. the Naidoos').press('Enter');
    await click(name === 'Liam' ? /Roblox credit/ : /Weekend away/);
    await page.getByLabel('A parent agrees').check();
    if (name === 'Liam') await shot('profile-liam');
    await click(/Save &/);
  }
  await page.getByText("Who's playing today?").waitFor();
  await shot('home');

  // Liam plays until he has all 5 wedges, using parent bonus rolls.
  const seenTypes = new Set();
  for (let round = 0; round < 5; round++) {
    await page.getByRole('button', { name: /Liam/ }).click();
    if (round > 0) await click('Parent: give a bonus roll');
    await click(/Roll the dice/);
    await page.locator('.task-card').waitFor({ timeout: 5000 });
    const type = (await page.getByRole('button', { name: /We did it|Start writing|think it through/ }).textContent()) || '';
    if (round === 0) { await shot('card'); await click(/Not today/); await shot('card-not-today'); }
    const t = (await page.getByRole('button', { name: /We did it|Start writing|think it through/ }).textContent()) || '';
    if (t.includes('We did it')) {
      seenTypes.add('task');
      await page.getByLabel(/How did it go/).fill('We laughed a lot!');
      await click(/We did it/);
    } else if (t.includes('Start writing')) {
      seenTypes.add('letter');
      await click(/Start writing/);
      await page.getByLabel('Letter', { exact: true }).fill('Thank you for always being there for me.');
      await shot('letter');
      await click(/Done – earn/);
    } else {
      seenTypes.add('repair');
      await click(/think it through/);
      await page.getByRole('textbox').fill('We argued about screen time.');
      await click('Next →');
      await page.getByRole('textbox').fill('I felt angry and Mom felt hurt.');
      await click('Next →');
      await page.getByRole('textbox').fill('Make Mom a cup of tea and say sorry.');
      await shot('repair');
      await click(/I'll take this step/);
    }
    void type;
    await page.getByText(/You earned the/).waitFor();
    if (round === 0) await shot('wedge-earned');
    await click(/Back to the family/);
  }
  await page.getByText(/completed the circle/).waitFor();
  await shot('celebration');
  await click(/Start a new circle/);
  await click(/Family journal/);
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
  console.log('card types seen:', [...seenTypes].join(', '));
  console.log('page errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
