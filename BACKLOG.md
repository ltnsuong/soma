# Backlog

Ordered. Each item is a single atomic commit with `npm run verify` green before and after.

Current debt (`.quality-baseline.json`, 2026-09-20):

| metric | count |
|---|---|
| lint errors | 43 |
| lint warnings | 292 |
| type errors | 63 |
| circular deps | 0 |
| dead files | 10 |

The module graph is **16 modules, 11 dependencies** for the whole product. That number is the diagnosis: there is almost no structure to depend on, because it is one file.

---

## ~~1. Decide what `frontend/`~~ — done 2026-09-20

Deleted. It was the earlier Telegram Mini App (Aug 30–Sep 6), abandoned when the Expo approach became `App.tsx`, still carrying a second copy of the API client. 26 files, in git history if ever needed.

## 2. Five dead backend files

Nothing requires them:

- `backend/telegram-bot.js`
- `backend/telegram-bot-auth.js`
- `backend/agent-service.js`
- `backend/stripe-service.js`
- `backend/setup-bot-descriptions.js`

The live Telegram path is `POST /telegram/webhook` in `server.js` plus the separate `bot/bot.js`. The two `telegram-bot*.js` files are a third implementation of the same thing — likely the cause of the "which bot is actually running" confusion. Confirm against the Railway service list, then delete.

Also unused per knip: `node-telegram-bot-api` and `nodemailer` (backend), `axios` (bot), `expo-crypto`, `expo-device`, `expo-status-bar` (root).

## 3. Reconcile the two LLM paths

`backend/server.js` proxies `/ai/chat` to Groq (`qwen/qwen3.8-27b`, `whisper-large-v3` for transcription). `bot/bot.js` imports `@anthropic-ai/sdk` and commit `de827b5` pins `claude-sonnet-5`. **Soma currently has two different brains depending on which surface the user is on**, which means `SOMA_VOICE` — the whole fix for "it sounds too robotic" — applies to only one of them. Pick one path, route both surfaces through it, keep the voice spec in one place.

## 4. Fix the 63 type errors

They are standing, not new. `npm run typecheck`. Each fix lowers the baseline permanently. Do these before extraction — moving code with unresolved types just relocates the errors and makes the diff unreadable.

## 5. Extract App.tsx, one feature per commit

Target shape:

```
src/
  shared/      theme, types, DB, auth, api clients, t()/tr()
  features/
    chat/      SomaChat + the voice spec
    circle/    MyCircleTab, CircleScreen, BondJourney
    messages/  MessagesTab, friends chat
    dating/    MeetPeople, Connections, WhoLikesMe, SynergyScan
    wheel/     LifeBalance, WheelOfLife*, check-ins
    health/    HealthHub, MedicationTracker, TherapyConnect
    settings/  Settings + the panels
```

Order matters — extract in dependency order, leaves first:

1. `src/shared/types.ts` — the interfaces at App.tsx:991–1205. Pure types, zero runtime risk, and every later step imports from it.
2. `src/shared/i18n/` — `STRINGS` (154–925) is 770 lines of table that has no business sitting in the same file as UI. Keep `tr()` exported next to it.
3. `src/shared/theme.ts` — themes + `ThemeCtx` + `useT`. **When this moves, the `t` shadowing trap moves with it** — put the warning in a comment at the definition site.
4. `src/shared/db.ts` — `DB` (1218–1570).
5. `src/shared/api/` — `auth`, `cloudSync`, `datingApi`, `purchaseApi` (2142–2520).
6. Then one feature at a time, largest first: dating → wheel → circle → health → settings → messages → chat.

Rules, enforced by `.dependency-cruiser.json` and checked by `npm run verify`:

- a feature imports another feature only through its `index.ts`
- `src/shared` never imports a feature
- circular deps stay at **0** — this is the metric that must not move even once

After each extraction, run the app and click through that feature. The gate catches structure; it does not catch a screen that renders blank.

## 6. Flip warnings to errors

As each rule's real count hits zero, change it from `warn` to `error` in `eslint.config.mjs` so it can never come back. `max-lines: 600` will be the last one standing — it is the whole point.

## 7. Tests

`vitest` is installed and there is not one test. Don't backfill coverage across 18k lines; add a test with each extracted module in step 5, starting with the pure ones (`inferSentiment`, `domainWellbeing`, `overallBalance`, the streak calculators, `deriveDatingProfile`). Aim for the deck's 80% on *changed* lines, not on the repo.
