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

Deploy web — **`npm run deploy:web`, and nothing else**:

```bash
cd ~/soma && npm run deploy:web
```

That wraps the four required steps and then verifies the result. Running a
subset has taken the site down three times: Vercel serves the repo instead of
the build, so `mysoma.site` returns the raw text of `index.ts` with a 200 and
`privacy.html`/`terms.html` 404. A 200 on the root is therefore not proof of
anything — the script checks the body is actually HTML. A missing privacy
policy is an App Store rejection, not just a broken page.

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

**A face-verification answer we did not get is never a pass.** `backend/faceverify.js`
turns every unknown — provider down, no AWS credentials, an error nobody anticipated — into
the verdict `review`, which leaves the badge off. If that ever becomes `verified`, an outage
turns into a way to mint verified accounts, and the badge stops meaning anything. The tests
in `faceverify.test.js` under "an answer we do not have is never a pass" exist to hold this;
do not relax them to make a refactor pass.

**The verification selfie is never stored.** Not in a column, not in storage, not in a log,
not appended to `photos`. It lives in memory for one request and is dropped. A face is
special-category data under GDPR Art. 9, so storing it would pull consent records, retention
limits and deletion deadlines onto every row — keeping only the verdict avoids all of it.
`face_verifications` holds a verdict, a reason and a score, and that is the whole record.
Consent is its own timestamp (`users.face_consent_at`), captured by its own tap, because
Art. 9 needs a specific yes and not the signup terms.

**Changing your main photo withdraws the badge.** `PUT /dating/profile` compares a hash of
the new photo against `verified_photo_hash` and clears verification when they differ.
Without that, someone verifies one face and then swaps in another — which is the exact
impersonation the badge is supposed to prevent.

**Adults and under-17s never see each other, and the server decides.** Under 17 the dating
side is closed and only other under-17s are visible. The rule is `backend/agegate.js`, applied
in `/users/discover`, `/dating/nearby`, `/users/find`, `/users/:id/profile` and `/dating/like` —
the write included, because filtering the feed only keeps people apart in the UI. The client's
`isMinor` flag hides tabs and nothing more; anyone can call the API without the app.

**An unknown age fails closed.** No `adult_at` means seen by nobody and sees nobody. The
tempting alternative — treat unknown as adult so the feed is not empty — is the bug that puts a
14-year-old in an adult's feed the first time a write fails. An empty list is recoverable; the
other direction is not. `agegate.test.js` pins this.

**`users.adult_at` is the only source of a band.** `dating_profiles.is_minor` exists so the
nearby RPC can filter without a join. Reading it anywhere else is a bug that has already
happened once: accounts with an age but no connection profile read as UNKNOWN and disappeared
from discovery entirely — every "just joined SOMA" user, erased.

**Signed-out callers see seeded examples only.** `/users/discover` used to hand anonymous
callers every real profile in the database, photos included, while the app's own banner said
"Register to see real people". It also meant an under-17 browsed adults before anything could
ask their age.

**Consent is never one box.** There is no endpoint and no switch that grants everything
at once. A single "I agree to share all my information" is bundled consent, which regulators
treat as *no* consent, and it is also the weakest possible answer to "what did this person
actually agree to?". `ConsentGate` covers the terms and the privacy notice; location,
notifications, health and face verification are each asked at the point of use and stored in
their own column. If someone asks for a simpler one-tap version, this is why it does not exist.

**Withdrawing must stay as easy as consenting** (Art. 7(3)). `Settings → Privacy & data` is one
tap per purpose over the same endpoint that grants it — no confirmation maze, no email request.
Withdrawing face consent also clears the badge, because the badge exists on the strength of a
comparison the user has now told us not to make.

**One privacy policy, at `web/privacy.html`.** `backend/privacy.html` used to be a second copy
and the two drifted: the backend one still claimed "We never store your conversation content on
our servers" long after `profiles` grew `memories`, `diary` and `circle`. A policy that
describes the wrong product is worse than none, so `/privacy` on the API now 301s to the
canonical page. Do not reintroduce a second copy. When you ship a feature that touches personal
data, the policy is part of the change, not follow-up work.

**`TERMS_VERSION` appears twice** — `backend/server.js` and `App.tsx` — and they must match.
It is how re-consent is detected when the terms change materially: `/consent` returns
`needsReconsent` when the stored version differs from the current one.

**`.env` never reaches EAS, and the two build profiles were configured differently.**
`.gitignore` has `.env*` and EAS Build uploads the project respecting gitignore, so nothing in
`.env` is available at build time. What fills the gap is **EAS environment variables**, set
server-side (`eas env:list --environment production`). Production had `EXPO_PUBLIC_BACKEND_URL`
there and built correctly; **preview had only `AI_KEY` and `AI_PROVIDER`**, so a preview build
fell back to `'http://localhost:3000'` and every network call in it failed — an app that
installs, launches and then does nothing, which reads as a backend outage rather than a build
problem. The public values now also live in `eas.json` under `build.<profile>.env`, which is
committed and reviewable; when both exist the `eas.json` values win.

**`eas.json` rejects empty-string env values.** `"EXPO_PUBLIC_RC_IOS_KEY": ""` fails
validation and takes down every `eas` command, `build:list` included, with `is not allowed to
be empty`. To leave a variable unset, omit the key — `App.tsx` reads it as
`process.env.X ?? ''`, so absent and empty behave identically.

**`EXPO_PUBLIC_AI_KEY` is still configured on EAS** (production and preview), holding the real
Groq key. It is referenced nowhere in source, so nothing inlines it today — but the invariant
above exists because a single reference is enough to bake it into every binary. It should be
deleted from EAS rather than left as a loaded gun.

**A Test Store RevenueCat key disables subscriptions in a release build.** `RC_USABLE` is
`!!RC_KEY && !(RC_IS_TEST_KEY && !__DEV__)`, so a `test_` key means `purchaseApi.configured()`
is false and SOMA+ cannot be bought at all. `eas.json` holds `EXPO_PUBLIC_RC_IOS_KEY` as an
empty string on purpose — obviously unset beats silently wrong. It needs the `appl_` key from
the RevenueCat dashboard before any submission.

**Google sign-in is per-platform and only the web client ID exists.** `GOOGLE_ENABLED` is
computed from *this* platform's client ID, so the button is hidden on iOS rather than shown and
broken. Do not "fix" it by ORing the three ids together — that is what once threw from
`useIdTokenAuthRequest` at hook-call time and rendered a red box instead of the sign-in form.

**Groq's on-demand tier caps OUTPUT tokens per minute at 1000 for the whole organisation**,
and one Synergy Scan spends more than that by itself — 600 for the agent conversation, then 600
for the report, back to back. When it is refused, `App.tsx:15546` silently shows five hardcoded
conversation turns instead, so the product's headline feature renders as a template with no
error anywhere. `/ai/chat` now retries on 429 using the delay Groq states in its own refusal
(`backend/airetry.js`), which rescues a brief overage; measured in production, an ask of 3s is
retried and succeeds, while 14.7s and 34.14s are refused fast because nobody holds a phone that
long. The retry does not fix the ceiling. **Upgrade the Groq tier before launch** — with more
than one person scanning at a time, this feature degrades to canned text.

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
