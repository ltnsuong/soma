# SOMA

An AI companion / "Life-OS" mobile app — built with Expo (React Native) and a
Node/Express + Supabase backend.

<p align="center">
  <img src="assets/icon.png" width="120" alt="SOMA app icon" />
</p>

## Stack

| Layer | Tech |
|---|---|
| App | Expo SDK 56, React Native 0.85, React 19, TypeScript |
| Backend | Node (Express), Supabase (Postgres), JWT auth, nodemailer |
| AI | Groq API (`EXPO_PUBLIC_AI_PROVIDER=groq`) |
| Builds | EAS Build (cloud) |

The app UI lives in a single `App.tsx`. The backend lives in `backend/`.

## Prerequisites

- Node 20+
- An Expo account (free) for EAS builds
- A Supabase project (free) for the backend
- A Groq API key for AI features

## Running locally

```bash
npm install
cp .env.example .env            # if present; otherwise create .env (see below)
npm run web                     # web preview (fastest)
# native (needs Xcode / Android SDK):
npm run ios
npm run android
```

### App env (`.env`, gitignored)

```
EXPO_PUBLIC_AI_PROVIDER=groq
EXPO_PUBLIC_AI_KEY=<your-groq-api-key>
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000   # your deployed backend in prod
```

> Note: `EXPO_PUBLIC_*` values are bundled into the client app. The Groq key is
> therefore visible to users — fine for a prototype; proxy it through the backend
> before a real launch.

## Backend

```bash
cd backend
npm install
cp .env.example .env            # fill in Supabase / JWT / email / CORS values
npm start                       # http://localhost:3000  (GET /health -> ok)
```

Run `backend/migrations.sql` in the Supabase SQL editor to create the schema
(users, profiles, reset_tokens + RLS policies).

See **DEPLOYMENT.md** for the full Railway deploy runbook. Required env vars are
documented in `backend/.env.example`. In production, set `CORS_ORIGINS` to your
web app's origin(s).

## Building the app (EAS)

```bash
eas login
eas init                        # writes the EAS projectId into app.json
eas build --profile preview --platform android   # installable APK
eas build --profile preview --platform ios       # iOS simulator build
```

Profiles are defined in `eas.json`:
- **development** — dev-client APK for on-device debugging
- **preview** — Android APK + iOS simulator build (no store account needed)
- **production** — Android `.aab` + auto version bump, for store submission

## Branding

The violet neon "S-in-O" icon is generated from vector sources:
`soma-icon.svg` (full icon), `soma-logo-trans.svg` (transparent),
`soma-logo-mono.svg` (Android monochrome), `soma-glow.svg` (logo only).
Rendered PNGs live in `assets/` (wired into `app.json`) and `logo-exports/`.

## Repo layout

```
App.tsx              # entire app UI
index.ts             # entry
app.json             # Expo config (icon, adaptive icon, EAS projectId)
eas.json             # EAS build profiles
assets/              # app icons, splash, favicon
backend/             # Express + Supabase auth/API server
logo-exports/        # generated logo PNGs (all sizes)
soma-*.svg           # logo vector sources
DEPLOYMENT.md        # backend deploy runbook
```
