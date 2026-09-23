import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import { pickNudge, NUDGE_VOICE } from './nudges.js'
import { deriveDatingProfile } from './derive.js'
import { verifyAppleToken, appleAudiences } from './apple-auth.js'
import { createLimiter, checkAiRequest, checkFaceAttempt, retryAfterSeconds, clientIp } from './ratelimit.js'
import {
  decideVerification, pickGesture, readImage, grantsBadge, isChallengeFresh, CHALLENGE_TTL_MS,
} from './faceverify.js'
import { compareFaces, isConfigured } from './facematch.js'

import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { Resend } from 'resend'
import WebSocket from 'ws'

dotenv.config()

const app = express()
// Railway puts a proxy in front, so without this req.ip is the proxy for everyone.
app.set('trust proxy', true)
app.use(express.json())

// CORS - localhost in dev; production origins via CORS_ORIGINS (comma-separated) or APP_URL.
// Requests with no Origin header (native apps, curl) are always allowed.
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.APP_URL || '')
  .split(',').map(o => o.trim()).filter(Boolean)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') ||
        origin.includes('mysomaapp') || origin.includes('ysomaapp') ||
        origin.includes('mysoma.site') ||
        allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed'))
    }
  }
}
app.use(cors(corsOptions))

// Supabase (with ws transport for Node.js 20)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  realtime: { transport: WebSocket }
})

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not set — email skipped:', subject)
    return
  }
  const r = new Resend(process.env.RESEND_API_KEY)
  await r.emails.send({ from: process.env.EMAIL_FROM || 'SOMA <onboarding@resend.dev>', to, subject, html })
}

// JWT helpers
const generateTokens = (userId, email) => {
  const accessToken = jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '7d' })
  const refreshToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d' })
  return { accessToken, refreshToken }
}

const verifyToken = (token) => {
  try { return jwt.verify(token, process.env.JWT_SECRET) } catch { return null }
}

// Middleware: verify auth
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  const user = verifyToken(token)
  if (!user) return res.status(401).json({ error: 'Invalid token' })
  req.user = user
  next()
}

// Like auth but doesn't reject unauthenticated requests — sets req.user if token valid
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (token) { const user = verifyToken(token); if (user) req.user = user }
  next()
}

// ════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ════════════════════════════════════════════════════════════

// SIGNUP
const sendVerificationEmail = async (userId, email, name) => {
  const appUrl = process.env.APP_URL || 'https://mysoma.site'
  const token = jwt.sign({ userId, purpose: 'verify' }, process.env.JWT_SECRET, { expiresIn: '48h' })
  const link = `${appUrl}/?verify=${token}`
  await sendEmail({
    to: email,
    subject: 'Confirm your SOMA account',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;color:#1A1A2E;background:#fff">
      <div style="text-align:center;margin-bottom:32px">
        <div style="display:inline-block;background:#7B6EF6;border-radius:16px;padding:14px 20px">
          <span style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px">SOMA</span>
        </div>
      </div>
      <h2 style="font-size:22px;font-weight:800;margin:0 0 8px">Hi ${name} 👋</h2>
      <p style="color:#444;line-height:1.6;margin:0 0 24px">You're one step away from SOMA. Confirm your email to activate your account.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="display:inline-block;background:#7B6EF6;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">Confirm my email</a>
      </div>
      <p style="color:#888;font-size:12px;margin-top:32px;line-height:1.6">This link expires in 48 hours. If you didn't create a SOMA account, you can safely ignore this email.<br><br>Or copy this link: <a href="${link}" style="color:#7B6EF6">${link}</a></p>
    </div>`
  })
}

app.post('/auth/signup', async (req, res) => {
  const { email, name, password } = req.body
  if (!email || !name || !password) return res.status(400).json({ error: 'Missing fields' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be 8+ chars' })

  try {
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single()
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const hash = await bcrypt.hash(password, 10)

    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, name, password_hash: hash, verified: false })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Send verification email — don't block if it fails
    sendVerificationEmail(user.id, email, name).catch(() => {})

    res.json({ message: 'Account created — check your email to confirm', needsVerification: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// LOGIN
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' })

  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single()
    if (error || !user) return res.status(401).json({ error: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    if (!user.verified) return res.status(403).json({ error: 'Please verify your email first', needsVerification: true, email })

    const { accessToken, refreshToken } = generateTokens(user.id, email)
    res.json({ user: { id: user.id, email, name: user.name }, accessToken, refreshToken })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// VERIFY EMAIL (called when user clicks link — token comes from URL ?verify=TOKEN)
app.post('/auth/verify-email', async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'No token' })

  try {
    const decoded = verifyToken(token)
    if (!decoded || decoded.purpose !== 'verify') return res.status(401).json({ error: 'Invalid or expired link' })

    const { data: user } = await supabase.from('users').select('email, name').eq('id', decoded.userId).single()
    if (!user) return res.status(404).json({ error: 'User not found' })

    await supabase.from('users').update({ verified: true }).eq('id', decoded.userId)

    // Issue tokens so the frontend can auto-login without a second step
    const { accessToken, refreshToken } = generateTokens(decoded.userId, user.email)

    // Send welcome email now that they're verified
    sendEmail({
      to: user.email,
      subject: 'Welcome to SOMA 💜',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 32px;color:#1A1A2E">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;background:#7B6EF6;border-radius:16px;padding:14px 20px">
            <span style="font-size:24px;font-weight:900;color:#fff">SOMA</span>
          </div>
        </div>
        <h2 style="font-size:22px;font-weight:800;margin:0 0 8px">You're in, ${user.name} ✨</h2>
        <p style="color:#444;line-height:1.6;margin:0 0 24px">Your account is verified. Meet yourself before meeting others.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${process.env.APP_URL || 'https://mysoma.site'}" style="display:inline-block;background:#7B6EF6;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">Open SOMA</a>
        </div>
      </div>`
    }).catch(() => {})

    res.json({ message: 'Email verified', accessToken, refreshToken, user: { id: decoded.userId, email: user.email, name: user.name } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE ACCOUNT — required for App Store (Apple mandates account deletion)
// Apple guideline 5.1.1(v): an app that lets people create an account must let
// them delete it from inside the app.
//
// Deleting the users row is the whole operation — every table that references
// users(id) declares ON DELETE CASCADE, so profiles, memories, diary entries,
// dating profiles, likes, matches and direct messages go with it. Do not remove
// those cascades without replacing this.
//
// The three deletes that used to run first named tables that do not exist
// ('likes' and 'messages' — they are dating_likes and direct_messages). Supabase
// returns those as error objects rather than throwing, so they were swallowed
// and the cascade did the real work regardless. Removed rather than corrected:
// the cascade already covers them.
app.delete('/auth/account', auth, async (req, res) => {
  const userId = req.user.userId
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId)
    if (error) throw error
    // Read it back. A row surviving here means someone dropped a cascade, and
    // the user has just been told their data was erased.
    const { data: still } = await supabase.from('users').select('id').eq('id', userId).maybeSingle()
    if (still) throw new Error('account row survived deletion')
    console.log('[account] deleted', userId)
    res.json({ ok: true })
  } catch (err) {
    console.error('[account] delete failed for', userId, err.message)
    res.status(500).json({ error: 'Could not delete the account' })
  }
})

// RESEND VERIFICATION EMAIL
app.post('/auth/resend-verification', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })

  try {
    const { data: user } = await supabase.from('users').select('id, name, verified').eq('email', email).single()
    if (!user) return res.status(404).json({ error: 'No account found' })
    if (user.verified) return res.json({ message: 'Already verified' })

    await sendVerificationEmail(user.id, email, user.name)
    res.json({ message: 'Verification email sent' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// REFRESH TOKEN
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'No refresh token' })

  try {
    const verified = verifyToken(refreshToken)
    if (!verified) return res.status(401).json({ error: 'Invalid refresh token' })

    const { data: user } = await supabase.from('users').select('email').eq('id', verified.userId).single()
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(verified.userId, user.email)
    res.json({ accessToken, refreshToken: newRefreshToken })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PASSWORD RESET REQUEST
app.post('/auth/password-reset-request', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })

  try {
    const { data: user } = await supabase.from('users').select('id, name').eq('email', email).single()
    if (!user) return res.status(404).json({ error: 'User not found' })

    const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' })
    const appUrl = process.env.APP_URL || 'https://mysoma.site'
    const resetLink = `${appUrl}/?reset=${resetToken}`

    await sendEmail({
      to: email,
      subject: 'SOMA — Reset your password',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#1A1A2E">
        <h2 style="color:#7B6EF6">Reset your SOMA password</h2>
        <p>Hi ${user.name}, we received a request to reset your password.</p>
        <a href="${resetLink}" style="display:inline-block;background:#7B6EF6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">Reset Password</a>
        <p style="color:#555;font-size:13px;margin-top:24px">This link expires in 1 hour. If you didn't request this, you can safely ignore it.</p>
      </div>`
    })

    res.json({ message: 'Check your email for reset link' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PASSWORD RESET CONFIRM
app.post('/auth/password-reset', async (req, res) => {
  const { token, newPassword } = req.body
  if (!token || !newPassword) return res.status(400).json({ error: 'Missing fields' })
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be 8+ chars' })

  try {
    const verified = verifyToken(token)
    if (!verified) return res.status(401).json({ error: 'Invalid or expired token' })

    const hash = await bcrypt.hash(newPassword, 10)
    await supabase.from('users').update({ password_hash: hash }).eq('id', verified.userId)
    res.json({ message: 'Password reset successful' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// TEMP ADMIN: reset password by email (remove after use)
app.post('/auth/admin-reset', async (req, res) => {
  const { secret, email, newPassword } = req.body
  if (secret !== 'soma-admin-2024') return res.status(403).json({ error: 'Forbidden' })
  try {
    const hash = await bcrypt.hash(newPassword, 10)
    const { error } = await supabase.from('users').update({ password_hash: hash, verified: true }).eq('email', email)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true, message: `Password reset for ${email}` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// SOCIAL LOGIN — Google (ID token verification)
// The app sends the Google ID token it received from expo-auth-session.
// We verify it with Google's tokeninfo endpoint, then find-or-create the user.
app.post('/auth/social', async (req, res) => {
  const { provider, token } = req.body
  if (!provider || !token) return res.status(400).json({ error: 'provider and token required' })

  if (provider === 'google') {
    try {
      // Verify the ID token with Google
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`)
      if (!googleRes.ok) return res.status(401).json({ error: 'Invalid Google token' })
      const payload = await googleRes.json()

      if (!payload.sub || payload.error) return res.status(401).json({ error: 'Invalid Google token payload' })

      // The token must have been minted for OUR client. Without this, an id_token issued
      // to any other Google OAuth app is accepted — so anyone who can get a user to sign
      // into an app they control can replay that token here and take over the account.
      const allowedAudiences = (process.env.GOOGLE_CLIENT_IDS || '')
        .split(',').map(s => s.trim()).filter(Boolean)
      if (!allowedAudiences.length) {
        console.error('[Google OAuth] GOOGLE_CLIENT_IDS is not set — refusing to verify tokens')
        return res.status(500).json({ error: 'Google sign-in is not configured on the server' })
      }
      if (!allowedAudiences.includes(payload.aud)) {
        console.warn('[Google OAuth] rejected token with aud=', payload.aud)
        return res.status(401).json({ error: 'Invalid Google token audience' })
      }
      if (payload.email && payload.email_verified === 'false') {
        return res.status(401).json({ error: 'Google email not verified' })
      }

      const email = payload.email
      const name  = payload.name || payload.email.split('@')[0]
      const googleId = payload.sub
      const avatar = payload.picture || ''

      if (!email) return res.status(400).json({ error: 'Google account has no email' })

      // Find existing user by google_id or email
      let { data: user } = await supabase
        .from('users')
        .select('id, email, name, premium')
        .or(`google_id.eq.${googleId},email.eq.${email}`)
        .maybeSingle()

      if (user) {
        // Update google_id + avatar if missing
        await supabase
          .from('users')
          .update({ google_id: googleId, avatar, verified: true })
          .eq('id', user.id)
      } else {
        // Create new user — no password needed for social login
        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert({ email, name, google_id: googleId, avatar, verified: true, premium: false })
          .select()
          .single()
        if (createErr) return res.status(500).json({ error: createErr.message })
        user = newUser
      }

      const { accessToken, refreshToken } = generateTokens(user.id, email)
      return res.json({
        user: { id: user.id, email, name: user.name || name, premium: user.premium || false },
        accessToken,
        refreshToken,
        isNew: !user,
      })
    } catch (err) {
      console.error('[Google OAuth]', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // Telegram
  if (provider === 'telegram') {
    try {
      const telegramData = req.body.telegramData || {}
      const telegramId = String(telegramData.id || token || '')

      if (!telegramId) return res.status(400).json({ error: 'Telegram ID required' })

      // Verify hash from Telegram Login Widget
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
      if (BOT_TOKEN && telegramData.hash) {
        const { hash, ...dataWithoutHash } = telegramData
        const dataCheckString = Object.keys(dataWithoutHash)
          .sort()
          .map(k => `${k}=${dataWithoutHash[k]}`)
          .join('\n')
        const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest()
        const expectedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
        if (hash !== expectedHash) {
          return res.status(401).json({ error: 'Invalid Telegram auth data' })
        }
        // Check auth_date not older than 1 day
        if (Date.now() / 1000 - Number(telegramData.auth_date) > 86400) {
          return res.status(401).json({ error: 'Telegram auth data expired' })
        }
      }

      // Look for existing user by telegram_id
      let { data: user } = await supabase
        .from('users')
        .select('id, email, name, premium, telegram_id')
        .eq('telegram_id', telegramId)
        .maybeSingle()

      if (user) {
        // User exists - update avatar if provided
        if (telegramData.photo_url) {
          await supabase
            .from('users')
            .update({ avatar: telegramData.photo_url })
            .eq('id', user.id)
        }
      } else {
        // Create new user
        const email = telegramData.username
          ? `${telegramData.username}@telegram.soma`
          : `user_${telegramId}@telegram.soma`

        const name = telegramData.first_name
          ? `${telegramData.first_name}${telegramData.last_name ? ' ' + telegramData.last_name : ''}`
          : `Telegram User ${telegramId.slice(-6)}`

        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert({
            telegram_id: telegramId,
            email,
            name,
            avatar: telegramData.photo_url || '',
            verified: true, // Telegram provides verified identity
            premium: false,
          })
          .select()
          .single()

        if (createErr) {
          console.error('[Telegram Signup]', createErr)
          return res.status(500).json({ error: createErr.message })
        }

        user = newUser
      }

      const { accessToken, refreshToken } = generateTokens(user.id, user.email)
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          premium: user.premium || false,
          telegram_id: user.telegram_id,
        },
        accessToken,
        refreshToken,
        isNew: !user,
      })
    } catch (err) {
      console.error('[Telegram Auth]', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // Apple — placeholder (needs Apple JWT verification)
  if (provider === 'apple') {
    return res.status(501).json({ error: 'Apple login coming soon' })
  }

  return res.status(400).json({ error: `Unsupported provider: ${provider}` })
})

// TELEGRAM MINI APP AUTH — verifies initData from window.Telegram.WebApp
// Find the Apple account, link it to an existing one, or create it. Split out
// of the route so the route stays inside the complexity budget.
async function findOrCreateAppleUser(claims, fullName) {
  const cols = 'id, email, name, premium'
  const { data: byApple } = await supabase
    .from('users').select(cols).eq('apple_id', claims.appleId).maybeSingle()
  if (byApple) return { user: byApple, isNew: false }

  if (claims.email) {
    // Same person who signed up with email or Google before. Link, never duplicate.
    const { data: byEmail } = await supabase
      .from('users').select(cols).eq('email', claims.email).maybeSingle()
    if (byEmail) {
      await supabase.from('users').update({ apple_id: claims.appleId, verified: true }).eq('id', byEmail.id)
      return { user: byEmail, isNew: false }
    }
  }

  // A private-relay address is real and deliverable. Accounts that hide their
  // email give us none at all, hence the placeholder.
  const email = claims.email || `${claims.appleId}@privaterelay.appleid.com`
  const name = String(fullName || '').trim().slice(0, 60) || email.split('@')[0]
  const { data: created, error } = await supabase.from('users')
    .insert({ email, name, apple_id: claims.appleId, verified: true, premium: false })
    .select(cols).single()
  if (error) throw new Error(error.message)
  return { user: created, isNew: true }
}

// Seeded example people, so a brand-new visitor does not meet an empty app.
// They all share the @soma.demo domain, which is the only reliable marker —
// nothing else distinguishes them from a real profile.
//
// A SIGNED-IN user never sees them. Showing invented people to someone who
// registered would be presenting fabrications as members, which is both
// dishonest and an App Review problem (Guideline 4.2 / fake accounts). Guests
// still see them, under the "Demo mode" banner that says exactly what they are.
const DEMO_EMAIL_DOMAIN = '@soma.demo'
const isDemoAccount = (email) => String(email || '').endsWith(DEMO_EMAIL_DOMAIN)

// Sign in with Apple. Required by App Store Guideline 4.8 wherever Google or
// Telegram sign-in is offered, which is both of ours.
//
// Apple gives the name and email ONCE, on first authorisation — and the name
// arrives from the CLIENT, not inside the token, so it is only ever trusted as
// a display name and only when creating the account.
app.post('/auth/apple', async (req, res) => {
  try {
    const { identityToken, fullName } = req.body
    const claims = await verifyAppleToken(identityToken, appleAudiences())

    const { user, isNew } = await findOrCreateAppleUser(claims, fullName)
    const { accessToken, refreshToken } = generateTokens(user.id, user.email)
    res.json({
      user: { id: user.id, email: user.email, name: user.name, premium: user.premium || false },
      accessToken, refreshToken, isNew,
    })
  } catch (err) {
    // Anything that fails verification is a 401, not a 500 — a bad token is the
    // client's problem, and the message says which check rejected it.
    console.warn('[Apple sign-in]', err.message)
    res.status(401).json({ error: err.message })
  }
})

app.post('/auth/telegram-webapp', async (req, res) => {
  try {
    const { initData } = req.body
    if (!initData) return res.status(400).json({ error: 'initData required' })

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    if (!BOT_TOKEN) return res.status(500).json({ error: 'Bot token not configured' })

    // Verify using WebAppData HMAC (different from Login Widget)
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    params.delete('hash')
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
    const expectedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
    if (hash !== expectedHash) return res.status(401).json({ error: 'Invalid initData' })

    // Check auth_date freshness (max 1 day)
    const authDate = Number(params.get('auth_date') || 0)
    if (Date.now() / 1000 - authDate > 86400) return res.status(401).json({ error: 'initData expired' })

    const tgUser = JSON.parse(params.get('user') || '{}')
    if (!tgUser.id) return res.status(400).json({ error: 'No user in initData' })

    const telegramId = String(tgUser.id)

    let { data: user } = await supabase.from('users').select('id, email, name, premium, telegram_id').eq('telegram_id', telegramId).maybeSingle()
    if (user) {
      if (tgUser.photo_url) await supabase.from('users').update({ avatar: tgUser.photo_url }).eq('id', user.id)
    } else {
      const email = tgUser.username ? `${tgUser.username}@telegram.soma` : `user_${telegramId}@telegram.soma`
      const name = tgUser.first_name ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}` : `Telegram User`
      const { data: newUser, error: createErr } = await supabase.from('users').insert({
        telegram_id: telegramId, email, name,
        avatar: tgUser.photo_url || '', verified: true, premium: false,
      }).select().single()
      if (createErr) return res.status(500).json({ error: createErr.message })
      user = newUser
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email)
    res.json({ user: { id: user.id, email: user.email, name: user.name, premium: user.premium || false }, accessToken, refreshToken, isNew: !user })
  } catch (err) {
    console.error('[Telegram WebApp Auth]', err)
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// TELEGRAM BOT LOGIN — deep-link based flow
// ════════════════════════════════════════════════════════════

// In-memory token store: token → { createdAt, user?, tokens? }
const tgLoginTokens = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of tgLoginTokens) { if (now - v.createdAt > 10 * 60 * 1000) tgLoginTokens.delete(k) }
}, 60 * 1000)

// Step 1: frontend requests a login token → gets a Telegram deep-link
app.post('/auth/tg-link', (req, res) => {
  const token = crypto.randomBytes(16).toString('hex')
  tgLoginTokens.set(token, { createdAt: Date.now() })
  res.json({ token, url: `https://t.me/yoursomabot?start=login_${token}` })
})

// Step 2: poll — frontend checks every 2s until token is validated by bot
app.get('/auth/tg-link-poll', (req, res) => {
  const { token } = req.query
  const entry = tgLoginTokens.get(token)
  if (!entry) return res.status(404).json({ error: 'Token expired or not found' })
  if (!entry.done) return res.json({ pending: true })
  tgLoginTokens.delete(token)
  res.json({ done: true, user: entry.user, accessToken: entry.accessToken, refreshToken: entry.refreshToken })
})

// Step 3: Telegram bot webhook — receives /start login_TOKEN command from user
app.post('/telegram/webhook', async (req, res) => {
  res.sendStatus(200) // always ack Telegram immediately
  try {
    const message = req.body?.message
    if (!message) return
    const text = message.text || ''
    const tgUser = message.from
    if (!tgUser) return

    // Handle /start login_TOKEN
    const match = text.match(/^\/start login_([0-9a-f]{32})$/)
    if (!match) {
      // Generic /start — send welcome message
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
      if (BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgUser.id,
            text: `👋 Welcome to SOMA!\n\nOpen the app here: https://mysoma.site`,
            reply_markup: { inline_keyboard: [[{ text: '🌟 Open SOMA', web_app: { url: 'https://mysoma.site' } }]] }
          })
        })
      }
      return
    }

    const loginToken = match[1]
    if (!tgLoginTokens.has(loginToken)) return // expired or invalid

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const telegramId = String(tgUser.id)

    let { data: user } = await supabase.from('users').select('id, email, name, premium, telegram_id').eq('telegram_id', telegramId).maybeSingle()
    if (user) {
      if (tgUser.photo_url) await supabase.from('users').update({ avatar: tgUser.photo_url }).eq('id', user.id)
    } else {
      const email = tgUser.username ? `${tgUser.username}@telegram.soma` : `user_${telegramId}@telegram.soma`
      const name = tgUser.first_name ? `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}` : 'Telegram User'
      const { data: newUser, error: createErr } = await supabase.from('users').insert({
        telegram_id: telegramId, email, name,
        avatar: tgUser.photo_url || '', verified: true, premium: false,
      }).select().single()
      if (createErr) { console.error('[TG Bot Login] create user error:', createErr); return }
      user = newUser
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email)
    tgLoginTokens.set(loginToken, {
      createdAt: tgLoginTokens.get(loginToken).createdAt,
      done: true,
      user: { id: user.id, email: user.email, name: user.name, premium: user.premium || false },
      accessToken, refreshToken
    })

    // Send success message in bot
    if (BOT_TOKEN) {
      const name = tgUser.first_name || 'there'
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgUser.id,
          text: `✅ You're signed in to SOMA, ${name}! Go back to the app.`,
          reply_markup: { inline_keyboard: [[{ text: '🌟 Open SOMA', web_app: { url: 'https://mysoma.site' } }]] }
        })
      })
    }
  } catch (err) {
    console.error('[Telegram Webhook]', err)
  }
})

// GET CURRENT USER (protected)
app.get('/auth/me', auth, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('id, email, name, verified').eq('id', req.user.userId).single()
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// PROFILE SYNC — persist full UserProfile to Supabase
// ════════════════════════════════════════════════════════════

// GET /profile/sync — pull cloud profile for this user
app.get('/profile/sync', auth, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.user.userId)
      .maybeSingle()
    if (!row) return res.json({ profile: null })
    res.json({ profile: row })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /profile/sync — push local profile to cloud (upsert)
app.put('/profile/sync', auth, async (req, res) => {
  try {
    const p = req.body
    if (!p) return res.status(400).json({ error: 'No profile data' })

    const row = {
      user_id: req.user.userId,
      name: p.name || null,
      language: p.language || 'en',
      profile_bio: p.profileBio || null,
      profile_photo: p.profilePhoto || null,
      dark_mode: p.darkMode || false,
      ai_name: p.aiName || 'Soma',
      ai_photo: p.aiPhoto || null,
      trusted_contact_name: p.trustedContact?.name || null,
      trusted_contact_phone: p.trustedContact?.phone || null,
      onboarding: p.onboarding || {},
      memories: p.memories || [],
      circle: p.circle || [],
      diary: p.diary || [],
      connections: p.connections || [],
      mood_logs: p.moodLogs || [],
      gratitude_entries: p.gratitudeEntries || [],
      love_entries: p.loveEntries || [],
      life_wheel_history: p.lifeWheelHistory || [],
      medications: p.medications || [],
      med_logs: p.medLogs || [],
      notif_settings: p.notifSettings || {},
      data: p,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(row, { onConflict: 'user_id' })

    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })

    // Answer the client first, then derive their dating profile from what they've told
    // Soma. Matching reads dating_profiles; talking to Soma writes profiles.memories.
    // Without this bridge nothing a user says to Soma ever reaches matching, and they
    // stay invisible in Explore until they happen to open the "nearby" tab with
    // location enabled. Fire-and-forget: a failure here must not fail the sync.
    deriveDatingProfile(supabase, callGroq, req.user.userId, p).catch(e =>
      console.error('[deriveDatingProfile]', e.message))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Turn the memories someone shared with Soma into the fields matching actually reads.
// Only runs when their memories have changed since the last derivation, so an idle
// client polling sync doesn't burn an LLM call every time.

// ════════════════════════════════════════════════════════════
// PREMIUM / SUBSCRIPTION
// ════════════════════════════════════════════════════════════

// Check premium status
app.get('/premium/status', auth, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('premium').eq('id', req.user.userId).single()
    res.json({ premium: user?.premium || false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Upgrade to premium (mock implementation - would connect to Stripe in production)
app.post('/premium/upgrade', auth, async (req, res) => {
  try {
    const { paymentMethodId } = req.body
    if (!paymentMethodId) return res.status(400).json({ error: 'Payment method required' })

    // In production: verify with Stripe, create subscription, etc
    // For now: just mark user as premium
    await supabase.from('users').update({ premium: true }).eq('id', req.user.userId)

    res.json({
      message: 'Upgraded to premium!',
      premium: true,
      features: ['Unlimited matches', 'See who liked you', 'Voice calls', 'Advanced matching', 'Life balance reports']
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Cancel premium
app.post('/premium/cancel', auth, async (req, res) => {
  try {
    await supabase.from('users').update({ premium: false }).eq('id', req.user.userId)
    res.json({ message: 'Premium cancelled', premium: false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get insights (premium feature)
app.get('/insights', auth, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('premium').eq('id', req.user.userId).single()
    if (!user?.premium) return res.status(403).json({ error: 'Premium only' })

    res.json({
      weekSummary: 'You had meaningful conversations with 5 people and built 2 new connections.',
      topDomains: ['relationships', 'mind', 'health'],
      matchScore: 87,
      growthTrend: 'up'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════════════════════════

// Track user events (no auth required - for analytics)
app.post('/analytics/track', (req, res) => {
  const { event, timestamp, userId, ...properties } = req.body
  console.log(`📊 [${timestamp}] ${event} by ${userId}`, properties)

  // In production: save to analytics DB or send to service like Mixpanel, Segment, etc
  // const { data } = await supabase.from('events').insert({ event, userId, properties, timestamp })

  res.json({ ok: true })
})

// Track errors (no auth required - for crash reporting)
app.post('/analytics/error', (req, res) => {
  const { error, context, timestamp, userId } = req.body
  console.error(`🔴 [${timestamp}] Error by ${userId}: ${error}`, context)

  // In production: save to error tracking service (Sentry, etc)
  res.json({ ok: true })
})

// ════════════════════════════════════════════════════════════
// MATCHING ENGINE
// ════════════════════════════════════════════════════════════

// Calculate compatibility score based on psychological matching
function calculateMatch(profile1, profile2) {
  let score = 50 // base score

  // Attachment style compatibility
  const attachmentMatch = {
    'secure-secure': 25,
    'secure-anxious': 15,
    'secure-avoidant': 10,
    'anxious-anxious': 5,
    'anxious-avoidant': -10,
    'avoidant-avoidant': 5,
  }
  const key = [profile1.attachment, profile2.attachment].sort().join('-')
  score += attachmentMatch[key] || 0

  // Love language compatibility
  if (profile1.loveLanguage === profile2.loveLanguage) score += 20
  else if (['quality-time', 'physical-touch'].includes(profile1.loveLanguage) &&
           ['quality-time', 'physical-touch'].includes(profile2.loveLanguage)) score += 10

  // Values alignment
  const sharedValues = profile1.values?.filter(v => profile2.values?.includes(v))?.length || 0
  score += Math.min(sharedValues * 8, 25)

  // Interests overlap
  const sharedInterests = profile1.interests?.filter(i => profile2.interests?.includes(i))?.length || 0
  score += Math.min(sharedInterests * 3, 15)

  // Life goals alignment
  if (profile1.lifeGoal === profile2.lifeGoal) score += 15

  return Math.max(0, Math.min(100, score))
}

// Get match suggestions
app.get('/matches', auth, async (req, res) => {
  try {
    const { data: myProfile } = await supabase.from('profiles').select('*').eq('user_id', req.user.userId).single()

    // In production: fetch other profiles and calculate matches
    // For now: return mock matches
    res.json({
      matches: [
        { id: '1', name: 'Alex', age: 28, score: 87, reason: 'Shared values in growth & adventure' },
        { id: '2', name: 'Jordan', age: 26, score: 82, reason: 'Compatible attachment styles' },
        { id: '3', name: 'Casey', age: 30, score: 78, reason: 'Aligned life goals' }
      ]
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — via Expo Push Service (free, no Apple account needed for Android)
// ════════════════════════════════════════════════════════════

async function sendPush(token, title, body, data = {}) {
  if (!token || !token.startsWith('ExponentPushToken')) return
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default', badge: 1 }),
    })
  } catch {}
}

async function getUserPushToken(userId) {
  const { data } = await supabase.from('users').select('push_token').eq('id', userId).single()
  return data?.push_token || null
}

// Save/update device push token for the authenticated user
app.post('/notifications/token', auth, async (req, res) => {
  try {
    const { token, tzOffset } = req.body
    if (!token) return res.status(400).json({ error: 'token required' })
    const patch = { push_token: token }
    if (Number.isInteger(tzOffset)) patch.tz_offset = tzOffset
    await supabase.from('users').update(patch).eq('id', req.user.userId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// REAL GEO MATCHING — dating profiles, nearby search, likes, matches
// ════════════════════════════════════════════════════════════

// Round coordinates to ~1 km so exact homes are never stored
const roundCoord = (n) => Math.round(Number(n) * 100) / 100

// Compatibility score from shared signals (0–100)
function compatibility(me, them) {
  let score = 50
  const myInterests = new Set((me.interests || []).map(s => s.toLowerCase()))
  const shared = (them.interests || []).filter(i => myInterests.has(i.toLowerCase())).length
  score += Math.min(shared * 8, 24)
  if (me.love_language && me.love_language === them.love_language) score += 10
  // Secure attachment pairs well with everything; anxious+avoidant is the hard pairing
  if (me.attachment === 'Secure' || them.attachment === 'Secure') score += 8
  else if ((me.attachment === 'Anxious' && them.attachment === 'Avoidant') ||
           (me.attachment === 'Avoidant' && them.attachment === 'Anxious')) score -= 6
  if (me.looking_for && me.looking_for === them.looking_for) score += 8
  return Math.max(10, Math.min(99, score))
}

// UPSERT my dating profile (+ rounded location)
app.put('/dating/profile', auth, async (req, res) => {
  try {
    const { name, age, photo, photos, bio, interests, values, loveLanguage, attachment, lookingFor, connectionType, work, lat, lng, city } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const row = {
      user_id: req.user.userId,
      name, age: age || null, photo: photo || '', photos: (photos || []).slice(0, 6), bio: bio || '',
      interests: interests || [], values: values || [],
      love_language: loveLanguage || '', attachment: attachment || '',
      looking_for: lookingFor || '', connection_type: connectionType || 'dating', work: work || '',
      lat: lat != null ? roundCoord(lat) : null,
      lng: lng != null ? roundCoord(lng) : null,
      city: city || '',
      active: true,
      updated_at: new Date().toISOString(),
    }

    // A verified badge is a claim about one specific picture. Swapping the main
    // photo afterwards would leave the badge sitting next to a face nobody
    // checked — which is exactly the impersonation it exists to prevent — so
    // changing it withdraws the badge and verification has to be done again.
    const nextHash = photoHash(row.photo)
    const { data: prior } = await supabase.from('dating_profiles')
      .select('photo_verified, verified_photo_hash').eq('user_id', req.user.userId).maybeSingle()
    if (prior?.photo_verified && prior.verified_photo_hash !== nextHash) {
      row.photo_verified = false
      row.photo_verified_at = null
      row.verified_photo_hash = null
    }

    const { error } = await supabase.from('dating_profiles').upsert(row, { onConflict: 'user_id' })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true, photoVerified: row.photo_verified ?? prior?.photo_verified ?? false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// PHOTO VERIFICATION (face)
// ════════════════════════════════════════════════════════════
//
// Three routes: ask for a challenge, answer it with a selfie, read your status.
//
// The selfie never leaves this request. It is not written to the database, not
// put in storage, and not logged — see the comment above the migration for why
// that is a constraint and not a preference.
//
// The challenge is a short-lived signed token rather than a row: it survives a
// restart, works if this ever runs on more than one instance, and cannot be
// forged into a longer window. It is not burned after use, which would need
// shared state again; replaying one buys nothing, because a replayed selfie
// gets the same verdict and the attempt limit below counts it either way.

const faceLimiter = createLimiter()
setInterval(() => faceLimiter.sweep(Date.now()), 10 * 60 * 1000).unref?.()

/** Identifies a picture without storing it. */
const photoHash = (dataUrl) =>
  dataUrl ? crypto.createHash('sha256').update(dataUrl).digest('hex') : null

/** Record the decision. Never the image. */
async function recordAttempt(userId, { verdict, reason, similarity, gesture }) {
  try {
    await supabase.from('face_verifications').insert({
      user_id: userId, verdict, reason,
      similarity: typeof similarity === 'number' ? similarity : null,
      gesture: gesture || null, provider: 'rekognition',
    })
  } catch { /* an audit row must never fail the user's request */ }
}

// Ask for a gesture to perform. Requires consent to have been given.
app.post('/verify/face/challenge', auth, async (req, res) => {
  try {
    const { data: profile } = await supabase.from('dating_profiles')
      .select('photo, photo_verified').eq('user_id', req.user.userId).maybeSingle()
    if (!profile?.photo) {
      return res.status(400).json({ error: 'no_profile_photo' })
    }
    if (profile.photo_verified) return res.json({ alreadyVerified: true })

    // Consent is recorded when the challenge is issued, which is the screen
    // that explains what is about to happen. Art. 9 wants a specific yes, so
    // this is its own timestamp and not the signup terms.
    if (req.body?.consent === true) {
      await supabase.from('users')
        .update({ face_consent_at: new Date().toISOString() })
        .eq('id', req.user.userId)
    } else {
      const { data: u } = await supabase.from('users')
        .select('face_consent_at').eq('id', req.user.userId).maybeSingle()
      if (!u?.face_consent_at) return res.status(400).json({ error: 'consent_required' })
    }

    const gesture = pickGesture()
    const challenge = jwt.sign(
      { userId: req.user.userId, gesture, purpose: 'face' },
      process.env.JWT_SECRET,
      { expiresIn: Math.floor(CHALLENGE_TTL_MS / 1000) },
    )
    res.json({ gesture, challenge, expiresInMs: CHALLENGE_TTL_MS })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Answer the challenge with a selfie.
/**
 * Check the challenge token belongs to this caller and is still young enough.
 * Separated so the route reads as a sequence rather than a nest of guards.
 */
function readChallenge(token, userId) {
  const claim = token ? verifyToken(token) : null
  if (!claim || claim.purpose !== 'face' || claim.userId !== userId) return null
  // The JWT's own expiry already matches the TTL, so this only bites if a token
  // is ever minted with a longer life — but the alternative is finding out
  // after a database read and a billed provider call.
  if (!isChallengeFresh(claim.iat * 1000, Date.now())) return null
  return claim
}

/** Everything after the rate limit. Returns the body to send. */
async function runFaceVerification(userId, { selfie, challenge }) {
  const claim = readChallenge(challenge, userId)
  if (!claim) return { verdict: 'retry', reason: 'challenge_expired' }

  const image = readImage(selfie)
  if (!image.ok) {
    await recordAttempt(userId, { verdict: 'retry', reason: image.reason, gesture: claim.gesture })
    return { verdict: 'retry', reason: image.reason }
  }

  const { data: profile } = await supabase.from('dating_profiles')
    .select('photo').eq('user_id', userId).maybeSingle()
  const reference = readImage(profile?.photo || '')
  if (!reference.ok) return { verdict: 'retry', reason: 'no_profile_photo' }

  const match = await compareFaces(image.base64, reference.base64)
  const decision = decideVerification({ match, challengeIssuedAt: claim.iat * 1000 })
  await recordAttempt(userId, { ...decision, gesture: claim.gesture })

  if (grantsBadge(decision.verdict)) {
    await supabase.from('dating_profiles').update({
      photo_verified: true,
      photo_verified_at: new Date().toISOString(),
      verified_photo_hash: photoHash(profile.photo),
    }).eq('user_id', userId)
  }

  // The similarity score stays on the server. Telling a caller they scored 88
  // against a threshold of 92 hands them a dial to tune a spoof against.
  return { verdict: decision.verdict, reason: decision.reason }
}

app.post('/verify/face', auth, async (req, res) => {
  try {
    const gate = checkFaceAttempt(faceLimiter, req.user.userId)
    if (!gate.ok) {
      res.set('Retry-After', String(retryAfterSeconds(gate.retryAfterMs)))
      return res.status(429).json({ error: 'too_many_attempts', retryAfterMs: gate.retryAfterMs })
    }
    res.json(await runFaceVerification(req.user.userId, req.body || {}))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Where do I stand?
// ════════════════════════════════════════════════════════════
// CONSENT
// ════════════════════════════════════════════════════════════
//
// Art. 7(1) puts the burden of *demonstrating* consent on us, so these routes
// record a version and a time, not a boolean. Two rules they exist to keep:
//
//   Consent is per purpose. There is no endpoint that sets everything at once,
//   because a single "I agree to all of it" is the bundled consent regulators
//   treat as no consent at all. Biometrics keep their own route entirely.
//
//   Withdrawing is as easy as giving. Every field here accepts false, over the
//   same endpoint, with no extra step — Art. 7(3) requires that symmetry.

/** Bump when the terms change materially; it is how we find who to re-ask. */
const TERMS_VERSION = '2026-09-23'

/**
 * Shape one users row into the consent view.
 *
 * Null survives on purpose for the three purposes: it means "never asked",
 * which is a different thing from "said no" and must not be re-prompted as if
 * it were new. Only face collapses to a boolean, because its record is a
 * timestamp rather than a tri-state.
 */
function consentView(row) {
  const r = row || {}
  return {
    currentVersion: TERMS_VERSION,
    termsAcceptedAt: r.terms_consent_at || null,
    termsVersion: r.terms_version || null,
    location: r.consent_location ?? null,
    notifications: r.consent_notifications ?? null,
    health: r.consent_health ?? null,
    face: !!r.face_consent_at,
    needsReconsent: !!r.terms_consent_at && r.terms_version !== TERMS_VERSION,
  }
}

app.get('/consent', auth, async (req, res) => {
  try {
    const { data } = await supabase.from('users')
      .select('terms_consent_at, terms_version, consent_location, consent_notifications, consent_health, face_consent_at')
      .eq('id', req.user.userId).maybeSingle()
    res.json(consentView(data))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Accept the terms. Records which version, so a later change can be detected.
app.post('/consent/terms', auth, async (req, res) => {
  try {
    const { error } = await supabase.from('users').update({
      terms_consent_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    }).eq('id', req.user.userId)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true, version: TERMS_VERSION })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Set one purpose. `granted: false` is a withdrawal and is equally valid here.
app.post('/consent/purpose', auth, async (req, res) => {
  try {
    const { purpose, granted } = req.body || {}
    const column = { location: 'consent_location', notifications: 'consent_notifications', health: 'consent_health' }[purpose]
    // Face verification is not settable here on purpose: Art. 9 needs its own
    // specific yes, given on the screen that explains what happens to the selfie.
    if (!column) return res.status(400).json({ error: 'unknown_purpose' })
    if (typeof granted !== 'boolean') return res.status(400).json({ error: 'granted_must_be_boolean' })

    const { error } = await supabase.from('users')
      .update({ [column]: granted, consent_updated_at: new Date().toISOString() })
      .eq('id', req.user.userId)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true, purpose, granted })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Withdraw biometric consent. Clears the badge too: the badge exists because
// of a comparison the user has now told us not to make.
app.post('/consent/face/withdraw', auth, async (req, res) => {
  try {
    await Promise.all([
      supabase.from('users').update({ face_consent_at: null }).eq('id', req.user.userId),
      supabase.from('dating_profiles').update({
        photo_verified: false, photo_verified_at: null, verified_photo_hash: null,
      }).eq('user_id', req.user.userId),
    ])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/verify/face/status', auth, async (req, res) => {
  try {
    const [{ data: profile }, { data: last }] = await Promise.all([
      supabase.from('dating_profiles')
        .select('photo, photo_verified, photo_verified_at').eq('user_id', req.user.userId).maybeSingle(),
      supabase.from('face_verifications')
        .select('verdict, reason, created_at').eq('user_id', req.user.userId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    res.json({
      verified: !!profile?.photo_verified,
      verifiedAt: profile?.photo_verified_at || null,
      hasPhoto: !!profile?.photo,
      available: await isConfigured(),
      last: last ? { verdict: last.verdict, reason: last.reason, at: last.created_at } : null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// NEARBY — real users within radius km, sorted by distance, with compatibility
app.get('/dating/nearby', auth, async (req, res) => {
  try {
    const radius = Math.min(Number(req.query.radius) || 50, 500)
    const { data: me } = await supabase.from('dating_profiles').select('*').eq('user_id', req.user.userId).single()
    if (!me || me.lat == null) return res.status(400).json({ error: 'Set your profile and location first' })

    // People I already liked — don't show them again
    const { data: likedRows } = await supabase.from('dating_likes').select('target_id').eq('liker_id', req.user.userId)
    const likedIds = new Set((likedRows || []).map(r => r.target_id))

    // Fetch full profiles (incl. photos) for nearby users
    const { data: nearbyRows, error: rpcErr } = await supabase.rpc('nearby_profiles', {
      p_user_id: req.user.userId, p_lat: me.lat, p_lng: me.lng, p_radius_km: radius, p_limit: 50,
    })
    if (rpcErr) return res.status(500).json({ error: rpcErr.message })

    // RPC doesn't return photos column — fetch it separately
    const nearbyIds = (nearbyRows || []).map(r => r.user_id)
    const photosMap = {}
    const sectorBiosMap = {}
    const demoIds = new Set()
    const verifiedIds = new Set()
    if (nearbyIds.length) {
      const { data: photoRows } = await supabase.from('dating_profiles')
        .select('user_id, photos, sector_bios, photo_verified').in('user_id', nearbyIds)
      ;(photoRows || []).filter(r => r.photo_verified).forEach(r => verifiedIds.add(r.user_id))
      ;(photoRows || []).forEach(r => {
        photosMap[r.user_id] = r.photos || []
        sectorBiosMap[r.user_id] = r.sector_bios || {}
      })
      // This route is always authenticated, so the seeded example people are
      // never appropriate here — everyone reaching it has registered.
      const { data: emailRows } = await supabase.from('users').select('id, email').in('id', nearbyIds)
      ;(emailRows || []).forEach(u => { if (isDemoAccount(u.email)) demoIds.add(u.id) })
    }

    const results = (nearbyRows || [])
      .filter(r => !likedIds.has(r.user_id) && !demoIds.has(r.user_id))
      .map(r => ({
        userId: r.user_id, name: r.name, age: r.age, photo: r.photo,
        photos: photosMap[r.user_id] || (r.photo ? [r.photo] : []),
        sectorBios: sectorBiosMap[r.user_id] || {},
        bio: r.bio, interests: r.interests, values: r.values, loveLanguage: r.love_language,
        attachment: r.attachment, connectionType: r.connection_type || 'dating', work: r.work, city: r.city,
        distanceKm: Math.round(r.distance_km * 10) / 10,
        compatibility: compatibility(me, r),
        photoVerified: verifiedIds.has(r.user_id),
      }))
      .sort((a, b) => b.compatibility - a.compatibility || a.distanceKm - b.distanceKm)
    res.json({ results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// LIKE someone — creates a match when it's mutual
app.post('/dating/like', auth, async (req, res) => {
  try {
    const { targetId } = req.body
    if (!targetId) return res.status(400).json({ error: 'targetId required' })
    if (targetId === req.user.userId) return res.status(400).json({ error: 'Cannot like yourself' })

    await supabase.from('dating_likes').upsert(
      { liker_id: req.user.userId, target_id: targetId },
      { onConflict: 'liker_id,target_id' }
    )

    // Mutual?
    const { data: reciprocal } = await supabase.from('dating_likes')
      .select('liker_id').eq('liker_id', targetId).eq('target_id', req.user.userId).maybeSingle()

    if (reciprocal) {
      const [a, b] = [req.user.userId, targetId].sort()
      await supabase.from('dating_matches').upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' })

      // Notify both users about the new match (fire-and-forget)
      const [myName, theirName, myToken, theirToken] = await Promise.all([
        supabase.from('dating_profiles').select('name').eq('user_id', req.user.userId).single().then(r => r.data?.name || 'Someone'),
        supabase.from('dating_profiles').select('name').eq('user_id', targetId).single().then(r => r.data?.name || 'Someone'),
        getUserPushToken(req.user.userId),
        getUserPushToken(targetId),
      ])
      sendPush(theirToken, '🎉 New match!', `You and ${myName} matched on SOMA`, { screen: 'connections' })
      sendPush(myToken,   '🎉 New match!', `You and ${theirName} matched on SOMA`, { screen: 'connections' })

      // Fire-and-forget: generate AI agent-to-agent compatibility report
      generateMatchReport(req.user.userId, targetId)

      return res.json({ matched: true })
    }
    res.json({ matched: false })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// MY MATCHES — mutual likes with their profiles
app.get('/dating/matches', auth, async (req, res) => {
  try {
    const uid = req.user.userId
    const { data: ms } = await supabase.from('dating_matches')
      .select('user_a, user_b, created_at')
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
    const otherIds = (ms || []).map(m => m.user_a === uid ? m.user_b : m.user_a)
    if (!otherIds.length) return res.json({ matches: [] })
    const { data: profiles } = await supabase.from('dating_profiles')
      .select('user_id, name, age, photo, bio, city').in('user_id', otherIds)
    res.json({ matches: profiles || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// WHO LIKED ME (premium feature — gated client-side)
app.get('/dating/liked-you', auth, async (req, res) => {
  try {
    const { data: rows } = await supabase.from('dating_likes')
      .select('liker_id').eq('target_id', req.user.userId)
    const ids = (rows || []).map(r => r.liker_id)
    if (!ids.length) return res.json({ likedYou: [] })
    const { data: profiles } = await supabase.from('dating_profiles')
      .select('user_id, name, age, photo, city').in('user_id', ids)
    res.json({ likedYou: profiles || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// AGENT-TO-AGENT MATCH REPORTS
// ════════════════════════════════════════════════════════════

async function callGroq(systemPrompt, userPrompt, maxTokens = 600) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    }),
  })
  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}

function buildProfileSummary(profile, name) {
  const p = profile?.data || profile || {}
  const dating = p.dating || {}
  const memories = (p.memories || []).slice(-15).map(m => m.content || m.text || m).filter(Boolean)
  const diary = (p.diary || []).slice(-5).map(d => d.text || d.content || d).filter(Boolean)
  const goals = p.onboarding?.goals || []
  const focusDomains = p.onboarding?.focusDomains || []

  const lines = [
    `Name: ${name || p.name || 'Unknown'}`,
    dating.age ? `Age: ${dating.age}` : null,
    dating.city || dating.location ? `Lives in: ${dating.city || dating.location}` : null,
    dating.loveLanguage ? `Love language: ${dating.loveLanguage}` : null,
    dating.attachment ? `Attachment style: ${dating.attachment}` : null,
    dating.interests?.length ? `Interests: ${dating.interests.slice(0, 8).join(', ')}` : null,
    dating.bio ? `About: ${dating.bio}` : null,
    dating.lookingFor ? `Looking for: ${dating.lookingFor}` : null,
    dating.relationshipValues?.length ? `Relationship values: ${dating.relationshipValues.join(', ')}` : null,
    goals.length ? `Life goals: ${goals.join(', ')}` : null,
    focusDomains.length ? `Working on: ${focusDomains.join(', ')}` : null,
    memories.length ? `Recent things on their mind:\n${memories.slice(0, 8).map(m => `- ${String(m).slice(0, 120)}`).join('\n')}` : null,
    diary.length ? `Recent journal notes:\n${diary.map(d => `- ${String(d).slice(0, 100)}`).join('\n')}` : null,
  ].filter(Boolean)

  return lines.join('\n')
}

async function generateMatchReport(userAId, userBId) {
  try {
    // Check if report already exists
    const [a, b] = [userAId, userBId].sort()
    const { data: existing } = await supabase.from('match_reports')
      .select('id').eq('user_a', a).eq('user_b', b).maybeSingle()
    if (existing) return

    // Fetch both profiles
    const [{ data: profA }, { data: profB }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userAId).maybeSingle(),
      supabase.from('profiles').select('*').eq('user_id', userBId).maybeSingle(),
    ])
    const [{ data: dpA }, { data: dpB }] = await Promise.all([
      supabase.from('dating_profiles').select('*').eq('user_id', userAId).maybeSingle(),
      supabase.from('dating_profiles').select('*').eq('user_id', userBId).maybeSingle(),
    ])

    const nameA = profA?.name || dpA?.name || 'Person A'
    const nameB = profB?.name || dpB?.name || 'Person B'

    // Merge dating profile into profile data for summary
    const mergedA = { ...(profA || {}), data: { ...(profA?.data || {}), dating: { ...(profA?.data?.dating || {}), ...(dpA || {}) } } }
    const mergedB = { ...(profB || {}), data: { ...(profB?.data || {}), dating: { ...(profB?.data?.dating || {}), ...(dpB || {}) } } }

    const summaryA = buildProfileSummary(mergedA, nameA)
    const summaryB = buildProfileSummary(mergedB, nameB)

    const systemPrompt = `You are SOMA's compatibility intelligence. Two people just matched. You have access to their AI companion's deep knowledge of each person. Your job is to find genuine connection points — not generic flattery — and help them start a real conversation.

Respond ONLY with valid JSON in this exact shape:
{
  "score": <number 0-100>,
  "scoreReason": "<one sentence why>",
  "commonGround": ["<thing 1>", "<thing 2>", "<thing 3>"],
  "growthArea": "<one sentence about how they could grow each other>",
  "firstMessage": "<a natural opening message ${nameA} could send ${nameB}, max 2 sentences, referencing something real about them>",
  "vibe": "<one evocative sentence describing the energy of their potential connection>"
}`

    const userPrompt = `PROFILE OF ${nameA.toUpperCase()}:\n${summaryA}\n\n---\n\nPROFILE OF ${nameB.toUpperCase()}:\n${summaryB}`

    const raw = await callGroq(systemPrompt, userPrompt, 700)

    let report = {}
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) report = JSON.parse(jsonMatch[0])
    } catch {}

    await supabase.from('match_reports').upsert({
      user_a: a,
      user_b: b,
      compatibility_score: report.score || null,
      common_ground: report.commonGround || [],
      growth_area: report.growthArea || null,
      first_message: report.firstMessage || null,
      vibe: report.vibe || null,
      raw_report: report,
    }, { onConflict: 'user_a,user_b' })
  } catch (err) {
    console.error('generateMatchReport error:', err.message)
  }
}

// GET /dating/match-report/:otherId — fetch the agent report for a match
app.get('/dating/match-report/:otherId', auth, async (req, res) => {
  try {
    const me = req.user.userId
    const other = req.params.otherId
    const [a, b] = [me, other].sort()
    const { data } = await supabase.from('match_reports')
      .select('*').eq('user_a', a).eq('user_b', b).maybeSingle()
    if (!data) return res.json({ report: null })
    res.json({ report: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// REAL-TIME CHAT
// ════════════════════════════════════════════════════════════

// Helper — verify two users are mutual matches
async function assertMatch(me, other) {
  const [a, b] = [me, other].sort()
  const { data } = await supabase.from('dating_matches')
    .select('user_a').eq('user_a', a).eq('user_b', b).maybeSingle()
  return !!data
}

// GET /chat/unread — unread count per sender (MUST be before /:otherId route)
app.get('/chat/unread', auth, async (req, res) => {
  try {
    const me = req.user.userId
    const { data, error } = await supabase.from('messages')
      .select('from_user_id')
      .eq('to_user_id', me)
      .is('read_at', null)
    if (error) return res.status(500).json({ error: error.message })
    const counts = {}
    for (const row of (data || [])) {
      counts[row.from_user_id] = (counts[row.from_user_id] || 0) + 1
    }
    res.json({ unread: counts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /chat/:otherId — message history (last 100), newest last
app.get('/chat/:otherId', auth, async (req, res) => {
  try {
    const me = req.user.userId
    const other = req.params.otherId
    if (!(await assertMatch(me, other))) return res.status(403).json({ error: 'Not matched' })

    const { data, error } = await supabase.from('messages')
      .select('id, from_user_id, content, created_at, read_at')
      .or(`and(from_user_id.eq.${me},to_user_id.eq.${other}),and(from_user_id.eq.${other},to_user_id.eq.${me})`)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ messages: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /chat/:otherId — send a message
app.post('/chat/:otherId', auth, async (req, res) => {
  try {
    const me = req.user.userId
    const other = req.params.otherId
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'content required' })
    if (!(await assertMatch(me, other))) return res.status(403).json({ error: 'Not matched' })

    const { data, error } = await supabase.from('messages')
      .insert({ from_user_id: me, to_user_id: other, content: content.trim() })
      .select('id, from_user_id, content, created_at')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ message: data })

    // Notify recipient (fire-and-forget after response sent)
    const [senderName, recipientToken] = await Promise.all([
      supabase.from('dating_profiles').select('name').eq('user_id', me).single().then(r => r.data?.name || 'Someone'),
      getUserPushToken(other),
    ])
    sendPush(recipientToken, `💬 ${senderName}`, content.trim().slice(0, 120), { screen: 'connections', fromUserId: me })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /chat/:otherId/read — mark their messages to me as read
app.put('/chat/:otherId/read', auth, async (req, res) => {
  try {
    const me = req.user.userId
    const other = req.params.otherId
    await supabase.from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('from_user_id', other).eq('to_user_id', me).is('read_at', null)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── THERAPIST REPORTS ──────────────────────────────────────
app.post('/reports/send', auth, async (req, res) => {
  const { therapistEmail, therapistName, patientName, reportText } = req.body
  if (!therapistEmail || !reportText) return res.status(400).json({ error: 'Missing therapistEmail or reportText' })

  const htmlBody = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #2a2a3a;">
      <div style="text-align:center; margin-bottom: 32px;">
        <h1 style="font-size:28px; color:#7B6EF6; margin:0;">◈ Soma</h1>
        <p style="color:#888; font-size:13px; margin-top:4px;">AI Companion — Clinical Summary</p>
      </div>
      <p style="color:#555; font-size:14px;">Dear ${therapistName},</p>
      <p style="color:#555; font-size:14px;">
        Your patient <strong>${patientName}</strong> has consented to share this Soma-generated emotional summary
        ahead of your next session. This report is based on their recent mood check-ins, journal entries,
        and conversations with Soma. It is not a diagnostic tool — please interpret it in the context of
        your clinical relationship.
      </p>
      <div style="background:#F8F7FF; border-left:4px solid #7B6EF6; border-radius:8px; padding:20px; margin:24px 0; white-space:pre-wrap; font-size:14px; line-height:1.7; color:#2a2a3a;">${reportText}</div>
      <p style="color:#888; font-size:12px; border-top:1px solid #eee; padding-top:16px; margin-top:32px;">
        This summary was generated by Soma, an AI companion app, and shared with patient consent.
        Soma is not a medical device. For urgent mental health concerns, follow your standard clinical protocols.
      </p>
    </div>
  `

  try {
    await sendEmail({ to: therapistEmail, subject: `Soma session summary for ${patientName}`, html: htmlBody })
    res.json({ ok: true })
  } catch (err) {
    console.error('Report email error:', err.message)
    res.status(500).json({ error: 'Failed to send email. Check RESEND_API_KEY in server configuration.' })
  }
})

// ── AI PROXY ────────────────────────────────────────────────────────────────
// Proxies Groq calls so the API key stays server-side and CORS is avoided
app.get('/ai/models', async (req, res) => {
  try {
    const r = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
    })
    const d = await r.json()
    res.json(d)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ════════════════════════════════════════════════════════════
// AI PROXY
// ════════════════════════════════════════════════════════════
//
// These two routes spend the shared GROQ_API_KEY. They stay open to
// unauthenticated callers on purpose — the First Conversation runs before an
// account exists — so the budget, not a login, is what stops abuse. Signed-in
// callers are counted by user id and get a much larger allowance.
const aiLimiter = createLimiter()
setInterval(() => aiLimiter.sweep(Date.now()), 10 * 60 * 1000).unref?.()

const aiBudget = (req, res, next) => {
  const verdict = checkAiRequest(aiLimiter, {
    userId: req.user?.userId,
    ip: clientIp(req.headers, req.ip),
  })
  if (verdict.ok) return next()
  const seconds = retryAfterSeconds(verdict.retryAfterMs)
  if (verdict.scope === 'global') console.warn('[ai] global budget exhausted')
  res.set('Retry-After', String(seconds))
  return res.status(429).json({
    error: 'rate_limited',
    scope: verdict.scope,
    retryAfter: seconds,
  })
}

app.post('/ai/chat', optionalAuth, aiBudget, async (req, res) => {
  const { messages, system, maxTokens = 200, temperature = 0.85 } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' })
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
        max_tokens: maxTokens,
        temperature,
        messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
      }),
    })
    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Groq error' })
    res.json({ content: data.choices?.[0]?.message?.content ?? '' })
  } catch (err) {
    console.error('AI proxy error:', err.message)
    res.status(500).json({ error: 'AI request failed' })
  }
})

// SPEECH → TEXT (Whisper). Body is the raw audio blob, not JSON — the global
// express.json() 100kb cap can't carry audio, so this route parses its own body.
app.post('/ai/transcribe', optionalAuth, aiBudget, express.raw({ type: '*/*', limit: '25mb' }), async (req, res) => {
  if (!req.body?.length) return res.status(400).json({ error: 'audio body required' })
  try {
    const contentType = req.get('content-type') || 'audio/webm'
    const ext = contentType.includes('mp4') ? 'mp4' : contentType.includes('mpeg') ? 'mp3' : contentType.includes('wav') ? 'wav' : 'webm'
    const form = new FormData()
    form.append('file', new Blob([req.body], { type: contentType }), `audio.${ext}`)
    form.append('model', 'whisper-large-v3')
    form.append('response_format', 'json')
    // Telling Whisper the language markedly improves accuracy for non-English speech.
    const lang = String(req.query.lang || '').slice(0, 5)
    if (lang) form.append('language', lang)

    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    })
    const d = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: d.error?.message || 'transcription failed' })
    res.json({ text: (d.text || '').trim() })
  } catch (err) {
    console.error('[transcribe]', err.message)
    res.status(500).json({ error: 'transcription failed' })
  }
})

// ════════════════════════════════════════════════════════════
// FRIEND CHAT — direct messaging between any two SOMA users
// No dating match required; both must be authenticated users
// ════════════════════════════════════════════════════════════

// GET /friends/chat/:userId — last 100 messages with this user
app.get('/friends/chat/:userId', auth, async (req, res) => {
  try {
    const me = req.user.userId
    const other = req.params.userId
    if (me === other) return res.status(400).json({ error: 'Cannot chat with yourself' })

    const { data, error } = await supabase.from('direct_messages')
      .select('id, from_user_id, content, created_at, read_at')
      .or(`and(from_user_id.eq.${me},to_user_id.eq.${other}),and(from_user_id.eq.${other},to_user_id.eq.${me})`)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) return res.status(500).json({ error: error.message })

    // Mark incoming as read
    await supabase.from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('from_user_id', other).eq('to_user_id', me).is('read_at', null)

    res.json({ messages: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /friends/chat/:userId — send a message
app.post('/friends/chat/:userId', auth, async (req, res) => {
  try {
    const me = req.user.userId
    const other = req.params.userId
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'content required' })
    if (me === other) return res.status(400).json({ error: 'Cannot chat with yourself' })

    // Verify other user exists
    const { data: otherUser } = await supabase.from('users').select('id, name').eq('id', other).single()
    if (!otherUser) return res.status(404).json({ error: 'User not found' })

    const { data, error } = await supabase.from('direct_messages')
      .insert({ from_user_id: me, to_user_id: other, content: content.trim() })
      .select('id, from_user_id, content, created_at')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ message: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /friends/unread — unread count per sender
app.get('/friends/unread', auth, async (req, res) => {
  try {
    const me = req.user.userId
    const { data, error } = await supabase.from('direct_messages')
      .select('from_user_id')
      .eq('to_user_id', me)
      .is('read_at', null)
    if (error) return res.status(500).json({ error: error.message })
    const counts = {}
    for (const row of (data || [])) counts[row.from_user_id] = (counts[row.from_user_id] || 0) + 1
    res.json({ unread: counts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /friends/conversations — list all DM threads with last message + unread count
app.get('/friends/conversations', auth, async (req, res) => {
  try {
    const me = req.user.userId

    // All messages where I'm involved
    const { data: msgs, error } = await supabase.from('direct_messages')
      .select('id, from_user_id, to_user_id, content, created_at, read_at')
      .or(`from_user_id.eq.${me},to_user_id.eq.${me}`)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) return res.status(500).json({ error: error.message })

    // Group by conversation partner
    const threads = {}
    for (const m of (msgs || [])) {
      const otherId = m.from_user_id === me ? m.to_user_id : m.from_user_id
      if (!threads[otherId]) {
        threads[otherId] = { lastMessage: m.content, lastTime: m.created_at, unread: 0 }
      }
      if (m.to_user_id === me && !m.read_at) threads[otherId].unread++
    }

    if (Object.keys(threads).length === 0) return res.json({ conversations: [] })

    // Fetch user names
    const otherIds = Object.keys(threads)
    const { data: users } = await supabase.from('users').select('id, name, email').in('id', otherIds)
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]))

    const conversations = otherIds.map(id => ({
      userId: id,
      name: userMap[id]?.name || userMap[id]?.email || 'Unknown',
      lastMessage: threads[id].lastMessage,
      lastTime: threads[id].lastTime,
      unread: threads[id].unread,
    })).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime())

    res.json({ conversations })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// DISCOVER — all registered SOMA users (for "For You" tab)
// ════════════════════════════════════════════════════════════
// Profile columns that pass through as-is, empty becoming null.
// Listed rather than written out one per line: fifteen `|| null` expressions
// is fifteen branches, which put this over the complexity budget on its own.
const DISCOVER_PASSTHROUGH = [
  ['age', 'age'], ['photo', 'photo'], ['bio', 'bio'],
  ['loveLanguage', 'love_language'], ['attachment', 'attachment'],
  ['work', 'work'], ['city', 'city'],
]

const discoverRow = (u, dp) => {
  const row = {
    userId: u.id,
    name: u.name,
    isExample: isDemoAccount(u.email),
    photos: dp.photos || [],
    // The four per-connection bios. Without these the client falls back to the
    // single `bio` and all four categories show the same paragraph — which is
    // exactly what happened: they were returned by /dating/nearby and
    // /users/:id/profile but not here, and this is the route the browse list uses.
    sectorBios: dp.sector_bios || {},
    interests: dp.interests || [],
    values: dp.values || [],
    connectionType: dp.connection_type || 'dating',
    hasDatingProfile: !!dp.age,
    photoVerified: !!dp.photo_verified,
    distanceKm: null,
    compatibility: 50,
  }
  for (const [out, col] of DISCOVER_PASSTHROUGH) row[out] = dp[col] || null
  return row
}

app.get('/users/discover', optionalAuth, async (req, res) => {
  try {
    const me = req.user?.userId
    // Get all users (exclude self if authenticated), join dating_profiles if they have one
    let query = supabase.from('users').select('id, name, email, created_at').order('created_at', { ascending: false }).limit(100)
    if (me) query = query.neq('id', me)
    const { data: allUsers, error } = await query
    if (error) throw error

    // Signed in: real people only. Guest: examples included, clearly labelled.
    const users = me ? (allUsers || []).filter(u => !isDemoAccount(u.email)) : (allUsers || [])

    // Also fetch their dating profiles if available
    const ids = (users || []).map(u => u.id)
    const { data: profiles } = ids.length
      ? await supabase.from('dating_profiles').select('user_id, age, photo, photos, bio, sector_bios, interests, values, love_language, attachment, connection_type, work, city, photo_verified').in('user_id', ids)
      : { data: [] }
    const profileMap = {}
    ;(profiles || []).forEach(p => { profileMap[p.user_id] = p })

    res.json({ results: (users || []).map(u => discoverRow(u, profileMap[u.id] || {})) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUBLIC PROFILE FOR ONE USER — what the person chose to share, for viewing
// from a chat header. Never returns email, telegram_id or auth fields.
app.get('/users/:id/profile', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { data: u, error } = await supabase
      .from('users').select('id, name, avatar, created_at').eq('id', id).maybeSingle()
    if (error) throw error
    if (!u) return res.status(404).json({ error: 'User not found' })

    const { data: dp } = await supabase
      .from('dating_profiles')
      .select('age, photo, photos, bio, sector_bios, interests, values, love_language, attachment, connection_type, work, city, photo_verified')
      .eq('user_id', id).maybeSingle()

    res.json({
      userId: u.id,
      name: u.name,
      // Same derivation /users/find uses, so a shared code actually resolves.
      somaCode: u.id.replace(/-/g, '').slice(0, 6).toUpperCase(),
      avatar: u.avatar || null,
      joinedAt: u.created_at,
      age: dp?.age ?? null,
      photo: dp?.photo ?? null,
      photos: dp?.photos ?? [],
      bio: dp?.bio ?? null,
      sectorBios: dp?.sector_bios ?? {},
      interests: dp?.interests ?? [],
      values: dp?.values ?? [],
      loveLanguage: dp?.love_language ?? null,
      attachment: dp?.attachment ?? null,
      connectionType: dp?.connection_type ?? null,
      work: dp?.work ?? null,
      city: dp?.city ?? null,
      photoVerified: !!dp?.photo_verified,
      hasDatingProfile: !!dp,
    })
  } catch (err) {
    console.error('[user profile]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
// FIND USER BY INVITE CODE
// code = first 6 chars of user UUID (uppercase)
// ════════════════════════════════════════════════════════════
app.get('/users/find', async (req, res) => {
  const { code, email } = req.query
  try {
    let query = supabase.from('users').select('id, name, email')
    if (email && typeof email === 'string' && email.includes('@')) {
      query = query.ilike('email', email.trim())
    } else if (code && typeof code === 'string' && code.length >= 4) {
      // `id` is a uuid column, and Postgres has no ILIKE for uuid — the old
      // query.ilike('id', ...) threw "operator does not exist: uuid ~~*" on every
      // lookup. The code is the leading hex of the uuid, so match it as a range
      // instead: everything from <code>00.. to <code>ff.., which uses the PK index.
      const hex = code.toLowerCase().trim().replace(/[^0-9a-f]/g, '').slice(0, 8)
      if (hex.length < 4) return res.status(400).json({ error: 'Code must be at least 4 characters' })
      const lo = hex.padEnd(8, '0'), hi = hex.padEnd(8, 'f')
      query = query
        .gte('id', `${lo}-0000-0000-0000-000000000000`)
        .lte('id', `${hi}-ffff-ffff-ffff-ffffffffffff`)
    } else {
      return res.status(400).json({ error: 'Provide an email address or a code (min 4 chars)' })
    }
    const { data: users, error } = await query.limit(5)
    if (error) throw error
    if (!users || users.length === 0) return res.status(404).json({ error: 'No user found' })

    // Synergy Scan compares two people, so a name is not enough — it needs
    // something to compare. These are the same public fields the browse list
    // already shows; nothing private (diary, memories, Circle) is included.
    const ids = users.map(u => u.id)
    const { data: dps } = await supabase
      .from('dating_profiles')
      .select('user_id, bio, sector_bios, interests, values, work, city, age, photo_verified')
      .in('user_id', ids)
    const byUser = {}
    ;(dps || []).forEach(d => { byUser[d.user_id] = d })

    const results = users.map(u => {
      const dp = byUser[u.id] || {}
      return {
        name: u.name,
        code: u.id.replace(/-/g, '').slice(0, 6).toUpperCase(),
        userId: u.id,
        email: u.email,
        bio: dp.bio || '',
        // The four per-purpose bios. A professional QR should compare the
        // professional profile, not a blended one — that split is the whole
        // reason four separate codes exist.
        sectorBios: dp.sector_bios || {},
        interests: dp.interests || [],
        values: dp.values || [],
        work: dp.work || '',
        city: dp.city || '',
      }
    })
    res.json({ users: results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Privacy policy
// One canonical privacy policy, at web/privacy.html, served by Vercel.
//
// This used to serve its own copy from backend/privacy.html, and the two drifted:
// the backend copy still claimed "We never store your conversation content on our
// servers" long after `profiles` grew memories, diary and circle columns. A policy
// that describes the wrong product is worse than no policy, so there is now one
// document and this redirects to it rather than keeping a second one in sync.
app.get('/privacy', (req, res) => res.redirect(301, 'https://mysoma.site/privacy.html'))
app.get('/terms', (req, res) => res.redirect(301, 'https://mysoma.site/terms.html'))

// HEALTH (also serves "/" for Railway/uptime root checks)
// ════════════════════════════════════════════════════════════
// PROACTIVE MESSAGES FROM SOMA
// ════════════════════════════════════════════════════════════
//
// Everything about WHETHER and WHAT lives in nudges.js and is unit-tested.
// This half only gathers state, asks, writes the sentence, and sends it.
//
// Runs on one Railway instance. Scaled to more, this would double-send — the
// fix then is a per-user advisory lock, not a longer interval.

const NUDGE_SWEEP_MS = 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Everything the decision needs, for every user who could receive one.
async function gatherNudgeState() {
  const { data: users } = await supabase
    .from('users').select('id, push_token, tz_offset').not('push_token', 'is', null).limit(500)
  if (!users?.length) return []

  const ids = users.map(u => u.id)
  const [{ data: profiles }, { data: recent }] = await Promise.all([
    supabase.from('profiles').select('user_id, data, updated_at').in('user_id', ids),
    supabase.from('nudges').select('user_id, sent_at')
      .in('user_id', ids).gte('sent_at', new Date(Date.now() - WEEK_MS).toISOString()),
  ])

  const byUser = new Map(ids.map(id => [id, { profile: null, lastActiveAt: null, sent: [] }]))
  for (const p of profiles || []) {
    const e = byUser.get(p.user_id)
    if (e) { e.profile = p.data || {}; e.lastActiveAt = p.updated_at }
  }
  for (const n of recent || []) byUser.get(n.user_id)?.sent.push(n.sent_at)

  return users.map(u => {
    const e = byUser.get(u.id)
    const sent = e.sent.sort()
    return {
      userId: u.id,
      pushToken: u.push_token,
      state: {
        profile: e.profile || {},
        lastActiveAt: e.lastActiveAt,
        lastNudgeAt: sent[sent.length - 1] || null,
        sentThisWeek: sent.length,
        tzOffsetMinutes: u.tz_offset || 0,
        hasPushToken: true,
      },
    }
  })
}

// Turn a brief into one sentence that sounds like Soma and not like an app.
async function writeNudge(brief, profile) {
  const name = profile?.name ? `Their name is ${profile.name}. ` : ''
  const text = await callGroq(
    NUDGE_VOICE,
    `${name}${brief}\n\nWrite only the notification text. No quotes, no emoji, no sign-off.`,
    90,
  )
  return (text || '').replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 160)
}

async function nudgeOne(entry, now) {
  const decision = pickNudge(entry.state, now)
  if (!decision) return false
  const body = await writeNudge(decision.brief, entry.state.profile)
  if (!body) return false

  await sendPush(entry.pushToken, 'Soma', body, { screen: 'aura', nudge: decision.kind })
  await supabase.from('nudges').insert({ user_id: entry.userId, kind: decision.kind, body })
  return true
}

async function runNudgeSweep() {
  if (process.env.NUDGES_ENABLED !== 'true') return
  try {
    const now = Date.now()
    const entries = await gatherNudgeState()
    let sent = 0
    for (const e of entries) {
      try { if (await nudgeOne(e, now)) sent++ }
      catch (err) { console.error('[nudge] failed for', e.userId, err.message) }
    }
    if (sent) console.log(`[nudge] sent ${sent} of ${entries.length} candidates`)
  } catch (err) {
    console.error('[nudge] sweep failed:', err.message)
  }
}

setInterval(runNudgeSweep, NUDGE_SWEEP_MS)
setTimeout(runNudgeSweep, 60 * 1000)   // once shortly after boot, not during it

// Mark a nudge opened. Without this there is no way to tell whether any of
// this works — opened_at against sent_at is the entire measurement.
app.post('/notifications/opened', auth, async (req, res) => {
  try {
    const { data: last } = await supabase.from('nudges')
      .select('id').eq('user_id', req.user.userId).is('opened_at', null)
      .order('sent_at', { ascending: false }).limit(1).maybeSingle()
    if (last) await supabase.from('nudges').update({ opened_at: new Date().toISOString() }).eq('id', last.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get(['/', '/health'], (req, res) => res.json({ status: 'ok', service: 'soma-backend' }))

// START
const PORT = process.env.PORT || 3000
app.listen(PORT, async () => {
  console.log(`✅ SOMA backend running at http://localhost:${PORT}`)
  console.log(`🔐 Auth endpoints ready`)
  console.log(`📧 Email via Resend (set RESEND_API_KEY in env)`)
  console.log(`🔑 OAuth ready to wire (add provider SDKs)`)
  console.log(`💎 Premium endpoints ready`)
  // Auto-register Telegram bot webhook
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  // Must be THIS server's own public URL, never APP_URL — APP_URL is the web app,
  // and pointing the webhook there silently kills the bot.
  const BACKEND_URL_ENV = process.env.BACKEND_PUBLIC_URL
    || (process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`)
    || 'https://soma-backend-production-4a3b.up.railway.app'
  if (BOT_TOKEN) {
    try {
      const webhookUrl = `${BACKEND_URL_ENV}/telegram/webhook`
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] })
      })
      const data = await r.json()
      console.log(`🤖 Telegram webhook → ${webhookUrl}:`, data.ok ? '✅ set' : `❌ ${data.description}`)
    } catch (e) {
      console.warn('⚠️  Telegram webhook registration failed:', e.message)
    }
  }
})
