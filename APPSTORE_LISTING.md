# App Store Connect — every field, with the answer

App: SOMA · Apple ID `6815187221` · bundle `site.mysoma.app` · SKU `12345678`
Version 1.0, build 8. Status: "1.0 Подготовка к отправке".

Fill the pages in this order. The first two block submission; the last one blocks
the build from being *worth* submitting.

---

## 1. App Information (`/distribution/info`) — the page in your screenshot

| Field | Value |
|---|---|
| Name | `SOMA` |
| Subtitle | `Talk. Be understood. Be matched.` (30 char max — this is 34, use `Talk. Be understood.` at 20) |
| Privacy Policy URL | `https://mysoma.site/privacy.html` |
| Category — Primary | **Lifestyle** |
| Category — Secondary | **Health & Fitness** |
| Content Rights | No third-party content |

**Why not "Social Networking" as primary?** Either is defensible. Lifestyle is the
weaker-competition category and matches the Life-OS framing. Do not pick
**Dating** as a category unless you have decided the answer in §2 — the category
and the age rating have to tell the same story.

---

## 2. Age Rating — DONE, calculated 13+

Worked through in the browser on 2026-09-28. **There is no dating question in the
questionnaire.** An earlier draft of this file said one existed and forced 18+,
and built a whole decision around it. It does not exist. Ignore that advice.

Final answers, all verified against the code:

**Step 1 — Функции**

| Question | Answer | Why |
|---|---|---|
| Родительский контроль | НЕТ | None exist |
| Подтверждение возраста | **ДА** | `AgeGate` takes a DOB; `agegate.js` enforces bands server-side |
| Неограниченный веб-доступ | НЕТ | 9 `openLink` call sites, every one a hardcoded constant; no WebView |
| Пользовательский контент | ДА | Conversations, profiles, Circle |
| Соцсети | НЕТ | Circle feed is `myPosts` only (`authorId: 'me'`); no feed endpoint exists |
| Отключение соцсетей <13 | НЕТ | Apple's Declared Age Range API is not used — 0 refs |
| Обмен сообщениями и чат | ДА | 1:1 messaging |
| Реклама | НЕТ | Zero ad SDKs; SOMA+ is IAP, asked elsewhere |

**Step 2 — Темы для взрослых:** all НЕ УКАЗАНО. No alcohol/tobacco/substance
tracking anywhere (verified, 0 matches); the medication screen is prescribed-meds
and belongs to Step 3. Crisis resources are support, not horror.

**Step 3 — Медицина или ЗОЖ:** Медицинская информация → РЕДКО/УМЕРЕННО,
Темы здоровья → ДА. [App.tsx:17812](App.tsx#L17812) prompts the model as trained
in CBT/ACT/mindfulness and tells it to offer coping strategies. That is health
advice; НЕ УКАЗАНО would have been a misrepresentation.

**Step 4 — Сексуальность/нагота:** Непристойные темы → РЕДКО/УМЕРЕННО (dating,
orientation, crisis material). Both sexual-content rows → НЕ УКАЗАНО. "Intimacy"
in the app is attachment language ("Needs emotional safety before physical
closeness"), not sexual content, and nothing depicts nudity.

**Step 5 — Насилие:** all НЕ УКАЗАНО. If a self-harm/suicide row appears below
the fold, that one is РЕДКО/УМЕРЕННО — the crisis screen names the Suicide &
Crisis Lifeline. Prefer a "prevention resources" option if offered.

**Step 6 — Азартные игры:** all НЕТ / НЕ УКАЗАНО. No leaderboard, no ranking
between users, no prizes; the streak is a personal banner. SOMA+ is a fixed-price
subscription, never chance-based.

**Step 7 — result: 13+. Leave "Неприменимо". Leave the URL field blank.**

### Why 13+ is the right answer, and why it is safe

13+ describes what was actually built. A 13-year-old lands in the minor band,
gets friends-only, and never sees an adult — enforced server-side across
`/users/discover`, `/dating/nearby`, `/users/find`, `/users/:id/profile` and the
`/dating/like` write, with unknown ages failing closed.

The asymmetry that makes this easy: **raising a rating later is one click and
needs no new build.** If a reviewer takes the conventional line that anything
with dating is 17+, raise it then and resubmit the same binary. Choosing 18+ now
permanently forecloses the under-17 product and cannot be undone without another
review.

**This rating is conditional on moderation existing — see §8.** A 13+ app with
open stranger messaging and no block or report is both indefensible at review
and genuinely unsafe for the 13-year-olds it admits.

---

## 3. App Privacy (`/distribution/privacy`)

Answers below match what the code actually does and what
`web/privacy.html` already publishes. Keep them in sync — a mismatch between the
form and the policy is its own rejection.

Nothing is used for **tracking** and nothing is used for **advertising**. There
are no analytics or attribution SDKs in `package.json` at all.

| Data type | Collected | Linked to user | Purpose |
|---|---|---|---|
| Name | Yes | Yes | App Functionality |
| Email Address | Yes | Yes | App Functionality |
| Photos | Yes | Yes | App Functionality |
| **Sensitive Info** (face) | Yes | Yes | App Functionality |
| Health & Fitness | Yes | Yes | App Functionality |
| Coarse Location | Yes | Yes | App Functionality |
| User Content — other | Yes | Yes | App Functionality, Personalization |
| User ID | Yes | Yes | App Functionality |
| Purchase History | Yes | Yes | App Functionality |
| Contacts | **No** | — | Nothing reads the address book — verified, 0 refs |
| Precise Location | **No** | — | `Accuracy.Low` only |
| Browsing History, Search History, Contact Info (other), Diagnostics, Usage Data, Financial Info | No | | |

Two notes you will need if a reviewer asks:

- **Face** must be declared even though the selfie is never stored. Apple's
  question is about collection, and the image is transmitted to the server and to
  AWS Rekognition for one comparison. Only the verdict is retained
  (`face_verifications`). Say exactly that.
- **Health & Fitness** is mood, sleep and medication that the user types. It does
  not come from HealthKit and the app does not read HealthKit.

### One code change to make first

`app.json` declares `NSUserTrackingUsageDescription` while nothing in the app
ever calls ATT. Declaring the tracking prompt and then answering "not used to
track you" is an inconsistency reviewers do flag. Remove the key in the next
build — it buys nothing, since no tracking exists.

---

## 4. Version 1.0 page — the store listing

**Promotional text** (170 char, changeable without review):
```
SOMA learns who you are from one honest conversation — then finds the people you'd actually want to meet, and tells you why.
```

**Description:**
```
Most apps ask you to fill in a profile. SOMA asks you to talk.

One conversation — typed or spoken, in your language — and SOMA starts to
understand what you care about, how you spend your days, and who matters to you.
No forms, no checkboxes, no performing a version of yourself for strangers.

WHAT SOMA DOES

Listens. A real conversation, not a questionnaire. SOMA remembers what you tell
it and builds on it next time.

Understands. From what you've said, SOMA works out the things a profile can't
hold — the shape of your week, what you're working towards, what you're carrying.

Introduces. When you meet someone new, their SOMA and yours compare notes first.
You get a readable explanation of where you actually overlap and what a first
meeting could look like — before you decide whether to reply.

Keeps track. Your Circle holds the people in your life. Your Wheel of Life shows
where your attention has gone. Check-ins, mood, sleep, medication, and a diary
that only you can read.

WHY IT'S DIFFERENT

You don't market yourself here. There's no swiping through faces and no score.
The introduction comes with reasons.

Photo verification uses a live selfie to confirm you are the person in your
photo. The selfie is compared once and never stored.

SOMA+ unlocks unlimited introductions and deeper insight. Free to use without
it.

Available in English, Russian, Vietnamese, Spanish, French, German, and more.
```

**Keywords** (100 char, comma-separated, no spaces, no plurals, never repeat a
word already in the app name):
```
meet,friends,connect,social,ai,companion,mood,journal,diary,wellbeing,habits,chat,introvert,match
```
That is 98 characters. Do not include "SOMA", "app", "free", or any competitor
name — competitor names in keywords are a 2.3 rejection.

**Support URL:** `https://mysoma.site`
**Marketing URL:** `https://mysoma.site`
**Copyright:** `2026 Le Thi Nhu Suong`

**Version release:** manual release. You want to see it approved before it's
live, not wake up to it.

---

## 5. Screenshots

15 are captured at 1284×2778 in `appstore-screenshots/`. Required: 6.7"
(1290×2796 or 1284×2778 — yours qualify). Upload up to 10, in this order — the
first three are all most people see:

1. `12-ai-to-ai.png` — the two agents talking. This is the thing nobody else has; lead with it.
2. `13-synergy-report.png` — the first-meeting recommendation
3. `03-conversation.png` — the conversation that starts everything
4. `10-match-card.png`
5. `09-outer-world.png`
6. `05-home.png`
7. `06-ai-insight.png`
8. `04-profile.png`
9. `11-synergy-how.png`
10. `02-languages.png`

Skip `07-consent.png` and `08-age.png` — a consent form is a bad advert.

No 5.5" set is needed; Apple scales the 6.7" set down.

---

## 6. App Review Information

| Field | Value |
|---|---|
| Sign-in required | Yes |
| Username | `appreview@mysoma.site` |
| Password | in your password manager — do not put it in this file |
| Contact | your name, phone, `lethinhutsuong@gmail.com` |

**Notes — write these, they prevent a rejection:**
```
SOMA is an AI companion that learns about you through conversation and then
introduces you to compatible people.

To see the core feature: sign in with the account above, open Explore, and open
any profile — the two AI agents compare notes and produce a first-meeting
recommendation. The review account already has a completed profile, so no
onboarding is needed.

Photo verification (Profile > Verify) compares a live selfie against the profile
photo using AWS Rekognition. The selfie is held in memory for one request and is
never stored; only the pass/fail verdict is retained.

Account deletion is in Settings > Privacy & data > Delete account, and removes
all associated data.

Health-related features (mood, sleep, medication) are self-reported notes. The
app does not read HealthKit and offers no medical advice.
```

---

## 7. Monetization → Subscriptions — the actual blocker

Everything above is typing. This is the part that is not done, and until it is,
build 8 cannot be submitted as a paid app at all.

`RC_USABLE` in `App.tsx` is `!!RC_KEY && !(RC_IS_TEST_KEY && !__DEV__)`. The key
on EAS is a `test_` key, so in a release build `purchaseApi.configured()` is
false and **SOMA+ cannot be purchased**. A reviewer who taps Upgrade gets
nothing, which is a guideline 2.1 rejection.

The chain, in order — each step needs the one before it:

1. **App Store Connect → Monetization → Subscriptions.** Create a group ("SOMA+"),
   then the products. Each product needs: reference name, product ID (e.g.
   `soma_plus_monthly`, `soma_plus_yearly`), duration, price, a localized display
   name and description, and **a review screenshot**. Missing any one leaves it
   "Missing Metadata" and it will not appear to RevenueCat.
2. **Agreements, Tax, and Banking.** The Paid Apps agreement must be active and
   banking + tax forms complete. Without it the products stay in a state
   RevenueCat cannot read, and this is the step that takes days, not minutes.
   Start it now even if you do nothing else on this list.
3. **RevenueCat** → Apps → + New → App Store. Bundle ID `site.mysoma.app`,
   ASC App ID `6815187221`, paste the App-Specific Shared Secret, upload the
   `.p8` In-App Purchase key (App Store Connect → Users and Access →
   Integrations → In-App Purchase; one download only). Copy the Server
   Notifications URL it gives you into BOTH the Production and Sandbox fields in
   App Store Connect, Version 2 — without it, refunds and cancellations never
   reach RevenueCat and a refunded user keeps premium.

   **Three identifiers must match the code exactly. Each fails silently.**

   | Thing | Must be | Read at | If wrong |
   |---|---|---|---|
   | Entitlement | `premium` (lowercase) | [App.tsx:3446](App.tsx#L3446) | Purchase succeeds, app still says not premium |
   | Offering | marked **Default** | `offerings.current` | Paywall shows nothing |
   | Packages | standard **Monthly** / **Annual** types (`$rc_monthly`, `$rc_annual`) | `cur.monthly`, `cur.annual` | `getOffering` returns null, no price |

4. **Copy the `appl_` public SDK key** from RevenueCat → Project → API keys.
   The public one, not the secret key.
5. Set it on EAS and in `eas.json`:
   ```bash
   cd ~/soma && eas env:create --environment production \
     --name EXPO_PUBLIC_RC_IOS_KEY --value appl_XXXX --visibility plaintext
   ```
   Then add the same key to `build.production.env` in `eas.json`. Never an empty
   string — that breaks every `eas` command. Omit the key or set it properly.
6. **Rebuild.** The key is inlined at build time, so build 8 can never pick it
   up. This will be build 9, and build 9 is the submission candidate.

---

## 8. Block and report — guideline 1.2, missing, blocks submission

Declaring Пользовательский контент = ДА and Обмен сообщениями = ДА commits you to
guideline 1.2, which requires a content filter, a **report** mechanism, the
ability to **block** abusive users, and published contact info.

None of it exists. Searched on 2026-09-28: no report-user feature, no block
feature, no `reports` or `blocks` table in `migrations.sql`. The two endpoints
that match a naive grep are false positives — `/reports/send` is the therapist
email summary and `/dating/match-report` is the synergy report.

So SOMA ships open 1:1 messaging between strangers with no way to block anyone
and no way to report anything, at a 13+ rating. For a social app this is one of
the most reliable rejections Apple issues, and it is a real safety gap
independent of Apple.

What it needs, built the way `agegate.js` was:

- `blocks` and `reports` tables, `ON DELETE CASCADE` like every other table
- a block enforced **server-side** in discovery, find, profile and messaging —
  not hidden in the UI, for the same reason the band filter is not
- report and block actions on a profile and in a conversation
- a stated moderation commitment in the policy and the Review Notes
- tests pinning that a blocked pair can never see or message each other

Build 9 is needed anyway for the `appl_` key, so this rides along on a build
already being made.

---

## What is left, shortest path

1. **Block and report (§8).** Blocks submission, and the 13+ rating depends on it.
2. Start Agreements, Tax, and Banking today. It is the longest pole.
3. Fill §1, §3, §4, §5, §6 in the browser — an evening's work with this file open.
4. Create the subscription products, wire RevenueCat, get the `appl_` key.
5. Remove `NSUserTrackingUsageDescription`, build 9, submit.

Still outstanding outside App Store Connect:

- **Groq tier.** On-demand caps output at 1000 tokens/minute org-wide; one
  Synergy Scan spends ~1200. Under review-time load the headline feature renders
  five hardcoded turns with no error shown. The 429 retry helps a brief overage
  and does not raise the ceiling.
- **Build 8 on real hardware.** The iOS mic fix, the chat keyboard fix, the
  shorter onboarding and the Circle fix are all unverified on a device.
- **A solicitor.** The app processes three Art. 9 special categories (biometric,
  health, sexual orientation) and the named controller is a personal Gmail
  address. That is not a code problem and I cannot sign it off.
- **Nobody has finished a first conversation.** 12 real signups, zero memories.
  Worth understanding before you pay to send more people at it.

---

## 9. Review Notes — moderation paragraph

Guideline 1.2 asks how reporting works. Paste this into App Review
Information → Notes, after the sign-in instructions in §6:

```
MODERATION (guideline 1.2)

Every profile and every conversation carries a "Report or block" control.
On a profile it is at the bottom of the profile sheet; in a conversation
it is the ⋯ button in the header.

Blocking is immediate and symmetric — enforced server-side in discovery,
search, profile lookup and the like/match write, not only hidden in the
UI. Any existing match and likes between the two accounts are deleted.

Reporting offers seven reasons and blocks the person as well. Reports
email a moderator immediately; those flagging a safety concern or a
possibly under-17 account are marked urgent. A person acts within 24
hours: removing content, warning, suspending or deleting the account.

Blocks can be undone at Settings > Privacy > Blocked people. The policy
is published at https://mysoma.site/terms.html under "Reporting and
blocking", with a contact address.

To test: sign in with the review account, open any profile from Explore,
and use "Report or block" at the bottom of the profile sheet.
```
