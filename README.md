# FamJam – family connection game prototype

A phone web app (PWA). **Everyone plays on their own phone, linked as one family.** Each family member builds a profile, rolls a die once a day,
and gets a practical card to do **with someone in the household**, in one of five wedges:

| Wedge | Theme |
|---|---|
| 🌱 Finding Myself | Sharing who you are with someone at home |
| ✉️ Finding Words | Notes and messages they receive |
| 🤝 Finding Each Other | Everyday time together |
| 🧭 Coming Back Together | Practical acts of care and repair |
| 🎈 Play | Building something together |

**The other person confirms, on their own phone.** When the player has done the card (or written the
letter), it arrives in the other person's inbox. Only that person can confirm it – picking how it felt
and writing a message back – and only then does the player earn the wedge. The server enforces this:
nobody can confirm their own card, approve their own rewards or choose their own card. Letters are
only visible to the writer and the reader. "Not yet" gives the card back with no penalty.

**Ideas catalogue.** 400 built-in ideas (80 per wedge) to browse, search and filter by wedge, age, cost,
place and time. Star favourites (drawn more often), hide ones that aren't for you, and add your own
activities – they go into the dice draw like any other card.

**Self-care prompts.** Each person gets a private, age-appropriate prompt three times a week on their turn
(`src/data/nudges.json`, 25 each for children, teens and adults). They never earn wedges and never appear in## How it's built
- `src/` – the phone app (React + Vite, installable as a PWA).
- `server/` – the game rules and permissions (`reducer.ts`), what each phone may see (`views.ts`),
  join codes and device keys (`auth.ts`), the database (`store.ts`) and push notifications (`push.ts`).
- `api/` – Vercel functions, **generated** from `server/` by `npm run build:api` (also part of `npm run build`).
- No emails or passwords: each phone gets a secret device key when it joins with a one-time code.

## Run locally
```bash
npm install
npm test                 # unit tests: card rules, fairness rules, privacy
npm run build            # builds the app and the API
npm run serve -- 4180    # local server with an in-memory database
node e2e/phones.cjs http://localhost:4180 shots   # three-phone walkthrough
```

## Set up on Vercel (one time)
1. **Database:** Vercel project → Storage → Create Database → **Neon** (Postgres). Pick the region
   closest to South Africa that's offered (e.g. Frankfurt) and connect it to the project. This adds
   `DATABASE_URL` automatically. Tables are created on first use.
2. **Notification keys:** run `npx web-push generate-vapid-keys` on your computer and add the two
   values as environment variables `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Also add `CRON_SECRET`
   (any long random text, e.g. from `openssl rand -hex 32`) and optionally `VAPID_SUBJECT`
   (`mailto:` + your email).
3. **Deployment Protection:** Settings → Deployment Protection → turn off Vercel Authentication, so
   family members can open the app.
4. Redeploy. The daily self-care reminder runs at 16:00 SAST (`vercel.json`).

iPhones only receive notifications on iOS 16.4+ after FamJam is added to the Home Screen; the app explains this.

all five wedges → choose which of your rewards to claim (children's rewards are approved by a parent).

## Run
```bash
npm install
npm run dev      # open the printed Network URL on your phone (same Wi‑Fi)
npm test         # unit tests (checks every card)
npm run build
```

## Edit the cards (no coding needed)
Cards live in `src/data/decks/*.json` (80 per wedge; the first 15 are free). Each card has a `child` and `adult` wording and
**must name a household member with `{member}`** – that person confirms the card. Other placeholders:
`{activity}` one of the player's activities · `{theirActivity}` one of the other member's activities.
`ages`, `cost`, `place` and `time` tags drive the catalogue filters and who can draw a card. `"tier": "plus"` cards only show with Family Plus. `"type"` is `task` or `letter` (the player writes the
note in the app and the other person reads it when confirming). `npm test` checks every card.
All cards are drafts for clinical review.

## Prototype limits
- Family data is stored online (Neon Postgres, EU region). Parents agree to this when they create the family.
  Check POPIA requirements before a public launch.
- Family Plus paywall is a mock – no payments.
- Helpline numbers should be re-verified before any public release.
