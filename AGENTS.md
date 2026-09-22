# SOMA — map of content

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

SDK **56**. If `npx expo` offers to upgrade to 57 you are running it from the wrong directory — `cd ~/soma` first.

---

## What ships

Three deployables, three manifests, one repo:

| What | Lives in | Runs on | Entry |
|---|---|---|---|
| The app | `App.tsx` (18,903 lines) | Vercel (web), Expo (native) | `index.ts` |
| The API | `backend/` | Railway | `backend/server.js` (1,717 lines) |
| Telegram bot | `bot/` | Railway | `bot/bot.js` |

That is the complete list. A `frontend/` directory — an earlier Telegram Mini App built Aug 30–Sep 6 and abandoned when the Expo approach became `App.tsx` — was deleted on 2026-09-20 because nothing imported or deployed it while it carried a second, diverging copy of the API client. Recover it from git history if you ever need it; do not reintroduce a parallel client.

## Commands

```bash
npm run verify        # the gate: lint + types + cycles + dead code vs baseline
npm run lint          # eslint (cyclomatic ≤10, cognitive ≤15)
npm run typecheck     # tsc --noEmit
npm run cycles        # dependency-cruiser — circular imports must stay 0
npm run deadcode      # knip
```

Deploy web — **all four steps, in order**:

```bash
cd ~/soma && npx expo export -p web && bash scripts/postbuild-web.sh && npx vercel build --prod && npx vercel deploy --prebuilt --prod
```

Both deploys have a trap that looks like something else:

**Vercel needs `--scope mysomaapp`.** `.vercel/project.json` has no `projectId`, so without the
scope the deploy fails with `Not authorized` — and the CLI reports that as a *deploy* failure,
not an auth one. Nothing ships and the previous output stays live.

**Railway deploys from `backend/`, not the repo root.** `backend/railway.json` is the service
config, and `railway up` from the root installs dependencies against the Expo app's
package.json — the container then dies with `Cannot find package 'express'` and the API returns
502. The service also lives in the Railway project **`soma-backend`**, not `Soma`; `Soma` is a
different project whose deployments were all removed in June, and linking to it shows a
deploy history that has nothing to do with production. It is not connected to GitHub either, so
pushing does nothing — `cd backend && railway up` is the deploy.

`--prebuilt` deploys `.vercel/output`, **not** `dist/`. Skip `vercel build` and the deploy silently ships whatever snapshot was in `.vercel/output` last time. This once redeployed a two-week-old build five times in a row without any error. After deploying, compare the local bundle hash against the live one before believing it worked.

## Invariants — each of these has cost a multi-day outage

**`t` is shadowed inside components.** `ThemeCtx` is `{ t: TTheme; dark: boolean }`, so `const { t } = useT()` binds `t` to the *theme object* and hides the global `t(key)` translator. Inside any such component call **`tr(key)`** ([App.tsx:925](App.tsx#L925)), never `t(key)`. Getting this wrong produced 66 simultaneous `t is not a function` crashes.

**`profiles.user_id` must be UNIQUE.** `/profile/sync` upserts with `ON CONFLICT (user_id)`. Without the constraint every sync 500s — and the client swallows it in a bare `catch {}`, so the symptom is not an error but *silently empty profiles*, failed matching, and demo accounts appearing instead of real people. `migrations.sql` has both the inline constraint and an idempotent backfill.

**`railway logs` shows the last SUCCESSFUL deploy.** A failing deploy leaves the old logs in place, so a crash-on-boot looks like healthy silence. 13 consecutive deploys failed for 11 days on a one-word error (`requireAuth` vs `auth`) that `node server.js` locally would have surfaced in a second. Run it locally before blaming the platform.

**Google sign-in needs an ID token, not an access token.** Use `Google.useIdTokenAuthRequest` and read `response.params.id_token` — the backend validates against `tokeninfo?id_token=`. `useAuthRequest` returns an access token and fails with "Invalid Google token".

**`migrations.sql` is read top to bottom.** An `ALTER TABLE ... ADD COLUMN` must sit *after* the `CREATE TABLE` it alters, or a fresh database fails on it.

**A CirclePerson needs its full shape.** `messages`, `somaMessages`, `type`, `inviteCode` and
`invitationStatus` are required. `upsertPerson` omitted all five, so every person Soma
extracted from a conversation — which is everyone, since the first conversation extracts
people — crashed `computeNotifs` on Home with `Cannot read properties of undefined (reading
'length')`. Read these defensively anyway; there is old data in the wild.

**Demo accounts stay.** They are not test data to clean up.

**`EXPO_PUBLIC_*` is inlined into the shipped bundle.** Expo substitutes the literal value
wherever the variable is referenced, at build time. `AI_KEY` was declared at App.tsx:75 and never
used, but the reference alone was enough to carry the production Groq key inside any native
binary, where anyone can unzip it out. Never reference a secret through `EXPO_PUBLIC_*` — even
into a variable you do not use. Secrets live on the server; the client reaches them through
`/ai/chat`, which is rate-limited by `backend/ratelimit.js`.

**Account deletion already exists**, at `backend/server.js` under `app.delete('/auth/account')`.
Apple guideline 5.1.1(v) requires it, so do not "add" it again — grep for `app.delete(`, not for
`deleteAccount`, which is only the client-side caller. It works by deleting the `users` row and
letting `ON DELETE CASCADE` take everything else; every referencing table declares it, and
removing one silently orphans a user's data after they were told it was erased.

**`expo-font` and `expo-asset` are required peers**, of `@expo/vector-icons` and `expo-audio`
respectively. Without them the app builds for web and crashes on a device. `npx expo-doctor`
catches this; run it before any native build.

**After every web deploy, check the legal pages are still served.** They 404'd
silently once between deploys, and App Store Connect rejects a submission whose privacy
policy URL does not resolve:

```bash
for u in privacy.html terms.html; do
  printf "%s -> %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' https://mysoma.site/$u)"
done
```

**Static pages need two edits, not one.** `vercel.json`'s SPA rewrite swallows every path, so a
new page (privacy.html, terms.html) must be added to the rewrite's exclusion list *and* copied
into `dist/` by `scripts/postbuild-web.sh` — `expo export` does not know it exists. Miss either
and the URL quietly returns the app instead of the page, which App Store Connect treats as a
missing privacy policy.

**The App Store review account** is `appreview@mysoma.site`, verified and premium, with a seeded
profile so the reviewer lands on a populated app rather than an empty first run. It is not a demo
account and is not in the `@soma.demo` set; `isDemoAccount()` does not filter it.

## App.tsx layout

One file, read by line number until it isn't:

| Lines | What |
|---|---|
| 19–146 | config, themes, `ThemeCtx`, languages |
| 154–925 | `STRINGS` translation table, `t()`, `tr()` |
| 991–1205 | every domain type (`Memory`, `UserProfile`, `DatingProfile`, …) |
| 1218–1570 | `DB` — the local-storage layer, single source of client truth |
| 2142–2291 | `auth` — tokens, refresh, social sign-in |
| 2300–2520 | `cloudSync`, `datingApi`, `purchaseApi` |
| 5366–5995 | auth screens (Register, Login, Forgot, Verify, Reset) |
| 5995–6240 | `SomaChat` — the conversation surface, the product's core |
| 6240–7930 | tabs: Circle, Messages, OuterWorld, Bond, `SomaConnectionButton` |
| 7982–12160 | Home, Wheel of Life, check-ins, moments, profile |
| 12326–14600 | MeetPeople, matching, connections |
| 14591–18900 | diary, insights, health, medication, therapy, settings |

## How Soma talks

`SOMA_VOICE` (just above `auraSystem`) is the voice spec, and it is a product decision, not a prompt tweak — it exists because a user said the product "sounds too robotic". Contractions always; varied sentence length; real opinions; questions only when actually curious; informal address in every language (ты, tu, du). Never: restate what the user said, open with validation, name their emotion, use therapy-speak, or mention being an AI.

The dating profile is **derived server-side from what the user tells Soma** (`deriveDatingProfile` in `backend/server.js`), fingerprinted by `derived_from` so it only re-derives on new memories. Fields the user set by hand always win. This is the whole premise: the user talks, Soma fills in the indicators.

## The gate

`.quality-baseline.json` records current debt. `npm run verify` fails only when a number goes **up**; when a number goes down it rewrites the baseline, so the bar can tighten but never loosen. Thresholds come from the "AI-кодинг, не вайб-кодинг" talk. Everything is `warn` today because erroring on day one on an 18k-line file means the gate gets switched off within a week — flip rules to `error` as their real count reaches zero.

**A syntax error can make the gate report an improvement.** eslint and tsc both stop
early on a file they cannot parse, so they report *fewer* problems, and the ratchet writes
those numbers into `.quality-baseline.json` as the new bar. An invalid JSX comment did this
once — 30 type errors became 4, the gate said "Improved", and the next honest run failed
with +26. If a number drops by more than a change plausibly explains, do not accept it:
check the file parses, then `git checkout HEAD -- .quality-baseline.json`.

To land a change: `npm run verify` before committing. If a number legitimately rises, say why and run `npm run verify:accept`.

**Do not add a native module to `devDependencies`.** EAS runs `npm ci --include=dev` on the iOS
builder, so every devDependency is installed there too. `sharp` lived there to generate one
180×180 `apple-touch-icon.png` for the *web* build; on the builder it could not resolve a
prebuilt binary, fell back to compiling via node-gyp, and failed the Install dependencies phase —
no iOS build could start, and the CLI reported only "Unknown error". The icon is now generated
once and committed at `web/apple-touch-icon.png`, and `sharp` is gone. If you need image
processing at build time, do it once and commit the output.

## Where this is going

App.tsx comes apart into `src/features/<feature>/` with shared code in `src/shared/`, one feature per atomic commit, gate green at every step. Two rules enforced by `.dependency-cruiser.json`: features reach each other only through `index.ts`, and `src/shared` never imports a feature. See BACKLOG.md.
