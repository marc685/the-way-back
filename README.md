# The Way Back – family connection game prototype

A phone web app (PWA) where each family member builds a profile, rolls a die once a day,
and gets a personalised task card in one of five wedges:

| Wedge | Theme |
|---|---|
| 🌱 Finding Myself | Reconnecting with yourself |
| ✉️ Finding Words | Letters/notes when talking is too hard |
| 🤝 Finding Each Other | Everyday connection |
| 🧭 Finding the Way Back | Rupture & repair (3-step reflection: what happened → how it felt → one step) |
| 🎈 Play | Building something together |

Collect all five wedges → unlock the reward you chose (approved by a parent).

## Run
```bash
npm install
npm run dev      # open the printed Network URL on your phone (same Wi‑Fi)
npm test         # card-engine unit tests
npm run build
```

## Edit the cards (no coding needed)
Cards live in `src/data/decks/*.json`. Each card has a `child` and `adult` wording and can use
these placeholders, filled from the family profiles:
`{member}` another family member · `{activity}` the player's own activity ·
`{theirActivity}` the other member's activity · `{extended}` extended family · `{friend}` family friend.
`"tier": "plus"` cards only show with Family Plus. `"type"` is `task`, `letter` or `repair`.
All starter cards are drafts for clinical review.

## Prototype limits
- Data stays on one phone (localStorage); no accounts or sync.
- Family Plus paywall is a mock – no payments.
- Helpline numbers should be re-verified before any public release.
