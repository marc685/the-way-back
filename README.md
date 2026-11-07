# FamJam – family connection game prototype

A phone web app (PWA) where each family member builds a profile, rolls a die once a day,
and gets a practical card to do **with someone in the household**, in one of five wedges:

| Wedge | Theme |
|---|---|
| 🌱 Finding Myself | Sharing who you are with someone at home |
| ✉️ Finding Words | Notes and messages they receive |
| 🤝 Finding Each Other | Everyday time together |
| 🧭 Coming Back Together | Practical acts of care and repair |
| 🎈 Play | Building something together |

**The other person confirms.** When the player has done the card, they hand the phone to the
person named on it. That person confirms it, picks how it felt and can write a message back.
Only then does the player earn the wedge. "Not yet" gives the card back with no penalty.

**Ideas catalogue.** 400 built-in ideas (80 per wedge) to browse, search and filter by wedge, age, cost,
place and time. Star favourites (drawn more often), hide ones that aren't for you, and add your own
activities – they go into the dice draw like any other card.

**Self-care prompts.** Each person gets a private, age-appropriate prompt three times a week on their turn
(`src/data/nudges.json`, 25 each for children, teens and adults). They never earn wedges and never appear in
the journal. Can be switched off per person. The schedule (`src/lib/nudges.ts`) is deterministic so a future
push-notification server can send the same prompts.

Collect all five wedges → choose which of your rewards to claim (children's rewards are approved by a parent).

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
- Data stays on one phone (localStorage); no accounts or sync.
- Family Plus paywall is a mock – no payments.
- Helpline numbers should be re-verified before any public release.
