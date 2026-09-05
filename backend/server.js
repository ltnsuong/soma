import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { Resend } from 'resend'
import WebSocket from 'ws'

dotenv.config()

const app = express()
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
app.delete('/auth/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId
    // Delete from all tables in order (likes → messages → users)
    await supabase.from('likes').delete().or(`from_user.eq.${userId},to_user.eq.${userId}`)
    await supabase.from('messages').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('user_id', userId)
    await supabase.from('users').delete().eq('id', userId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
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
    const appUrl = process.env.APP_URL || 'https://dist-mysomaapp.vercel.app'
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
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)
      if (!googleRes.ok) return res.status(401).json({ error: 'Invalid Google token' })
      const payload = await googleRes.json()

      // Must have a valid audience (your Google client ID) and a sub (user ID)
      if (!payload.sub || payload.error) return res.status(401).json({ error: 'Invalid Google token payload' })

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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'token required' })
    await supabase.from('users').update({ push_token: token }).eq('id', req.user.userId)
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
    const { name, age, photo, photos, bio, interests, values, loveLanguage, attachment, lookingFor, work, lat, lng, city } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const row = {
      user_id: req.user.userId,
      name, age: age || null, photo: photo || '', photos: (photos || []).slice(0, 6), bio: bio || '',
      interests: interests || [], values: values || [],
      love_language: loveLanguage || '', attachment: attachment || '',
      looking_for: lookingFor || '', work: work || '',
      lat: lat != null ? roundCoord(lat) : null,
      lng: lng != null ? roundCoord(lng) : null,
      city: city || '',
      active: true,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('dating_profiles').upsert(row, { onConflict: 'user_id' })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ ok: true })
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
    if (nearbyIds.length) {
      const { data: photoRows } = await supabase.from('dating_profiles')
        .select('user_id, photos').in('user_id', nearbyIds)
      ;(photoRows || []).forEach(r => { photosMap[r.user_id] = r.photos || [] })
    }

    const results = (nearbyRows || [])
      .filter(r => !likedIds.has(r.user_id))
      .map(r => ({
        userId: r.user_id, name: r.name, age: r.age, photo: r.photo,
        photos: photosMap[r.user_id] || (r.photo ? [r.photo] : []),
        bio: r.bio, interests: r.interests, values: r.values, loveLanguage: r.love_language,
        attachment: r.attachment, work: r.work, city: r.city,
        distanceKm: Math.round(r.distance_km * 10) / 10,
        compatibility: compatibility(me, r),
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

app.post('/ai/chat', async (req, res) => {
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

// ════════════════════════════════════════════════════════════
// DISCOVER — all registered SOMA users (for "For You" tab)
// ════════════════════════════════════════════════════════════
app.get('/users/discover', optionalAuth, async (req, res) => {
  try {
    const me = req.user?.userId
    // Get all users (exclude self if authenticated), join dating_profiles if they have one
    let query = supabase.from('users').select('id, name, created_at').order('created_at', { ascending: false }).limit(100)
    if (me) query = query.neq('id', me)
    const { data: users, error } = await query
    if (error) throw error

    // Also fetch their dating profiles if available
    const ids = (users || []).map(u => u.id)
    const { data: profiles } = ids.length
      ? await supabase.from('dating_profiles').select('user_id, age, photo, photos, bio, interests, values, love_language, attachment, work, city').in('user_id', ids)
      : { data: [] }
    const profileMap = {}
    ;(profiles || []).forEach(p => { profileMap[p.user_id] = p })

    const results = (users || []).map(u => {
      const dp = profileMap[u.id] || {}
      return {
        userId: u.id,
        name: u.name,
        age: dp.age || null,
        photo: dp.photo || null,
        photos: dp.photos || [],
        bio: dp.bio || null,
        interests: dp.interests || [],
        values: dp.values || [],
        loveLanguage: dp.love_language || null,
        attachment: dp.attachment || null,
        work: dp.work || null,
        city: dp.city || null,
        hasDatingProfile: !!dp.age,
        distanceKm: null,
        compatibility: 50,
      }
    })
    res.json({ results })
  } catch (err) {
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
      query = query.ilike('id', `${code.toLowerCase().trim().replace(/-/g,'')}%`)
    } else {
      return res.status(400).json({ error: 'Provide an email address or a code (min 4 chars)' })
    }
    const { data: users, error } = await query.limit(5)
    if (error) throw error
    if (!users || users.length === 0) return res.status(404).json({ error: 'No user found' })
    const results = users.map(u => ({
      name: u.name,
      code: u.id.replace(/-/g, '').slice(0, 6).toUpperCase(),
      userId: u.id,
      email: u.email
    }))
    res.json({ users: results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Privacy policy
app.get('/privacy', (req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.send(readFileSync(join(__dirname, 'privacy.html'), 'utf8'))
})

// HEALTH (also serves "/" for Railway/uptime root checks)
app.get(['/', '/health'], (req, res) => res.json({ status: 'ok', service: 'soma-backend' }))

// START
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ SOMA backend running at http://localhost:${PORT}`)
  console.log(`🔐 Auth endpoints ready`)
  console.log(`📧 Email via Resend (set RESEND_API_KEY in env)`)
  console.log(`🔑 OAuth ready to wire (add provider SDKs)`)
  console.log(`💎 Premium endpoints ready`)
})
