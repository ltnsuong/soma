# SOMA Backend — Authentication Server

Complete authentication backend with email verification, password reset, JWT tokens, and OAuth placeholder.

## Setup

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Set up Supabase

- Go to [supabase.com](https://supabase.com) and create a free project
- In **Settings → API**, copy:
  - `SUPABASE_URL` (Project URL)
  - `SUPABASE_KEY` (anon key)
  - `SUPABASE_SERVICE_KEY` (service_role key — keep secret!)

### 3. Create database schema

- Go to **SQL Editor** in Supabase Dashboard
- Copy the entire contents of `migrations.sql`
- Paste and run (this creates tables + RLS policies)

### 4. Configure email (optional, for email verification + password reset)

For Gmail:
1. Enable 2-Factor Authentication on your Google account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. Use that password in `.env` as `EMAIL_PASS`

For other services (Sendgrid, Mailgun, etc), update the `nodemailer` config in `server.js`.

### 5. Create `.env` file

Copy from `.env.example` and fill in your values:
```bash
cp .env.example .env
```

Then edit `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

JWT_SECRET=your-random-32-char-secret-here-min-32-chars
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

APP_URL=http://localhost:8081
BACKEND_URL=http://localhost:3000
NODE_ENV=development
```

### 6. Start the server

```bash
npm start        # Production
npm run dev      # Development (with auto-reload)
```

Server runs at `http://localhost:3000`

---

## API Endpoints

### Signup
```
POST /auth/signup
Body: { email, name, password }
Returns: { user, accessToken, refreshToken, message }
```

### Login
```
POST /auth/login
Body: { email, password }
Returns: { user, accessToken, refreshToken }
```

### Verify Email
```
POST /auth/verify-email
Body: { token }
Returns: { message: "Email verified" }
```

### Refresh Access Token
```
POST /auth/refresh
Body: { refreshToken }
Returns: { accessToken, refreshToken }
```

### Request Password Reset
```
POST /auth/password-reset-request
Body: { email }
Returns: { message: "Check your email for reset link" }
```

### Confirm Password Reset
```
POST /auth/password-reset
Body: { token, newPassword }
Returns: { message: "Password reset successful" }
```

### Get Current User (requires Bearer token)
```
GET /auth/me
Headers: Authorization: Bearer <accessToken>
Returns: { id, email, name, verified }
```

---

## Social OAuth Setup (Next Steps)

The backend has a placeholder at `POST /auth/social` for Google, Apple, and Facebook login.

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials (type: Web application)
3. Get Client ID + Secret
4. Install SDK: `npm install @react-oauth/google`
5. Update `backend/server.js` to verify Google tokens and create/find user

### Apple Sign-In
1. Register at [Apple Developer](https://developer.apple.com)
2. Create Sign in with Apple credentials
3. Get Team ID + Key
4. Install SDK: `npm install jsonwebtoken` (for JWT verification)
5. Update backend to verify Apple tokens

### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create app + get App ID + App Secret
3. Install SDK: `npm install axios`
4. Update backend to verify Facebook tokens

---

## Frontend Integration

The React Native app already has an `auth` object that calls these endpoints:

```typescript
// Signup
await auth.signup(email, name, password)

// Login
await auth.login(email, password)

// Refresh token
await auth.refreshToken()

// Verify email
await auth.verifyEmail(token)

// Password reset
await auth.requestPasswordReset(email)
await auth.resetPassword(token, newPassword)
```

Tokens are automatically stored in `localStorage`:
- `soma_auth_token` — JWT access token
- `soma_refresh_token` — Refresh token

---

## Deployment

### Heroku (Free)
```bash
heroku create soma-backend
git push heroku main
heroku config:set SUPABASE_URL=... (set all env vars)
heroku open
```

### Railway / Render (Recommended)
1. Connect your GitHub repo
2. Add environment variables
3. Deploy (automatic on git push)

### Docker (for self-hosted)
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Troubleshooting

**"No token" error when calling protected endpoints**
- Make sure `Authorization: Bearer <token>` header is set
- Token may have expired — call `POST /auth/refresh`

**Email not sending**
- Check `EMAIL_*` configuration
- Gmail: make sure you used App Password, not account password
- Check spam folder

**CORS errors from frontend**
- Make sure `APP_URL` in `.env` matches your frontend's origin
- Check that CORS middleware is configured in `server.js`

**"Invalid or expired token" on email verification**
- Token expires in 24 hours
- User should click the verification link in email

---

## Security Notes

- **JWT_SECRET**: Use a strong 32+ character random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Password hashing**: Uses bcrypt with 10 salt rounds (slow, secure)
- **RLS Policies**: Database uses Supabase RLS to ensure users can only see their own data
- **Service Key**: Never expose `SUPABASE_SERVICE_KEY` to frontend. Keep it server-only.
- **HTTPS**: Always use HTTPS in production (set `APP_URL=https://...`)

---

## Performance

- Token refresh is fast (< 100ms)
- Email sending is async (doesn't block signup)
- Database queries use indexes on email, token, user_id for speed

---

Questions? Check `server.js` for implementation details.
