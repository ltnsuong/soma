import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import nodemailer from 'nodemailer'
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
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed'))
    }
  }
}
app.use(cors(corsOptions))

// Health check (uptime monitors / Railway healthcheck)
app.get(['/', '/health'], (req, res) => res.json({ status: 'ok', service: 'soma-backend' }))

// Supabase (with ws transport for Node.js 20)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  realtime: { transport: WebSocket }
})

// Email transporter (configure with your email service)
const emailer = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
})

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

// ════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ════════════════════════════════════════════════════════════

// SIGNUP
app.post('/auth/signup', async (req, res) => {
  const { email, name, password } = req.body
  if (!email || !name || !password) return res.status(400).json({ error: 'Missing fields' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be 8+ chars' })

  try {
    // Check if user exists
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single()
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    // Hash password
    const hash = await bcrypt.hash(password, 10)

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, name, password_hash: hash, verified: false })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Generate verification token
    const verifyToken = jwt.sign({ userId: user.id, email }, process.env.JWT_SECRET, { expiresIn: '24h' })
    const verifyLink = `${process.env.APP_URL}/?verify=${verifyToken}`

    // Try to send verification email (optional, for testing can skip)
    try {
      if (process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your-email')) {
        await emailer.sendMail({
          to: email,
          subject: 'Verify your SOMA account',
          html: `<p>Hi ${name},</p><p>Click <a href="${verifyLink}">here</a> to verify your email and activate your SOMA account.</p><p>This link expires in 24 hours.</p>`
        })
      }
    } catch (emailErr) {
      console.warn('⚠️  Email sending skipped (configure EMAIL_* in .env for production):', emailErr.message)
    }

    const { accessToken, refreshToken } = generateTokens(user.id, email)
    res.json({ user: { id: user.id, email, name }, accessToken, refreshToken, message: 'Signup successful! Email verification skipped for testing.' })
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

    const { accessToken, refreshToken } = generateTokens(user.id, email)
    res.json({ user: { id: user.id, email, name: user.name }, accessToken, refreshToken })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// VERIFY EMAIL
app.post('/auth/verify-email', async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'No token' })

  try {
    const verified = verifyToken(token)
    if (!verified) return res.status(401).json({ error: 'Invalid or expired token' })

    await supabase.from('users').update({ verified: true }).eq('id', verified.userId)
    res.json({ message: 'Email verified' })
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
    const resetLink = `${process.env.APP_URL}/?reset=${resetToken}`

    await emailer.sendMail({
      to: email,
      subject: 'SOMA - Reset your password',
      html: `<p>Hi ${user.name},</p><p>Click <a href="${resetLink}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p><p>If you didn't request this, ignore this email.</p>`
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

// SOCIAL LOGIN (Google, Apple, Facebook) — Placeholder
app.post('/auth/social', async (req, res) => {
  const { provider, token } = req.body
  // TODO: Verify token with provider, create or find user, return JWT
  res.status(501).json({ error: 'Social login not yet implemented. Add provider SDK.' })
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

// HEALTH
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// START
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`✅ SOMA backend running at http://localhost:${PORT}`)
  console.log(`🔐 Auth endpoints ready`)
  console.log(`📧 Email verification enabled (configure EMAIL_* in .env)`)
  console.log(`🔑 OAuth ready to wire (add provider SDKs)`)
  console.log(`💎 Premium endpoints ready`)
})
