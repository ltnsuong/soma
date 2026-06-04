import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView,
  Platform, Animated, Image, ImageBackground
} from 'react-native'

// ════════════════════════════════════════════════════════════
//  SOMA — Life OS built on self-knowledge
//  Pillars: Try Soma · Register · Soma+Memory · Diary · Circle · Dating
// ════════════════════════════════════════════════════════════

const AI_KEY      = process.env.EXPO_PUBLIC_AI_KEY ?? ''
const STORAGE_KEY = 'soma_v3'
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3000'
const TOKEN_KEY   = 'soma_auth_token'
const REFRESH_KEY = 'soma_refresh_token'

// ── LIFE DOMAINS (Circle of Life) ──────────────────────────
const DOMAINS = [
  { key: 'health',       label: 'Health',       icon: '❤️', color: '#F66E8E' },
  { key: 'finance',      label: 'Finance',      icon: '💰', color: '#6EF6A8' },
  { key: 'hobby',        label: 'Hobby',        icon: '🎨', color: '#F6A86E' },
  { key: 'relationship', label: 'Relationships',icon: '👥', color: '#7B6EF6' },
  { key: 'purpose',      label: 'Purpose',      icon: '🎯', color: '#6ECFF6' },
  { key: 'mind',         label: 'Mind',         icon: '🧘', color: '#A89BFA' },
] as const
type DomainKey = typeof DOMAINS[number]['key']

// ── DATA TYPES ─────────────────────────────────────────────
interface Memory { id: string; domain: DomainKey; content: string; createdAt: string }
interface CirclePerson {
  id: string
  name: string
  relationship: string              // how they're related (mom, therapist, colleague, etc)
  context: string                   // what you know about them
  sharedInterests: string[]
  lastSeen: string
  mentions: number
  type: 'therapy' | 'family' | 'friend' | 'work' | 'romantic'  // priority/category
  inviteCode: string                // unique code for inviting them
  invitationStatus: 'active' | 'invited' | 'accepted' | 'rejected'  // are they in your circle?
  messages: ChatMessage[]           // your direct messages with them
  somaMessages: ChatMessage[]       // Soma's continuity messages about this person
}
interface DiaryEntry { id: string; date: string; mood: string; summary: string }
interface DatingProfile {
  complete: boolean
  age: string; location: string
  photo: string                // user-uploaded data URL
  bio: string
  loveLanguage: string         // one of LOVE_LANGUAGES
  attachment: string           // one of ATTACHMENT_STYLES
  relationshipValues: string[] // what healthy love means to them
  lookingFor: string
  interests: string[]          // auto-pulled from memories
  // life facts
  work: string
  income: string
  children: string             // e.g. "Wants kids" / "Has 1" / "Doesn't want"
  pets: string
  idealPartner: string         // what their ideal partner looks/feels like
  intimacy: string             // private intimacy preferences (AI handles discreetly)
  lastUpdated: string
}
interface ChatMessage { role: 'user' | 'assistant'; content: string }
interface Connection {
  id: string
  name: string; age: number; photo: string; color: string
  bio: string; loveLanguage: string; attachment: string
  messages: ChatMessage[]
  updatedAt: string
  matchScore: number
}
interface UserProfile {
  name: string; registered: boolean
  memories: Memory[]; circle: CirclePerson[]; diary: DiaryEntry[]; conversations: number
  dating: DatingProfile
  premium: boolean
  likesToday: number
  likesDate: string
  connections: Connection[]
  likedYou: string[]          // names of people who liked you first
  aiName: string              // user's chosen name for their companion (e.g. Soma, Maya, Abuelo)
  aiPhoto: string             // user-chosen photo for their companion (data URL)
  trustedContact: { name: string; phone: string }  // who to reach in a hard moment
}

const FREE_DAILY_LIKES = 10
const PREMIUM_DAILY_LIKES = 100

const EMPTY_DATING: DatingProfile = {
  complete: false, age: '', location: '', photo: '', bio: '',
  loveLanguage: '', attachment: '', relationshipValues: [], lookingFor: '',
  interests: [], work: '', income: '', children: '', pets: '', idealPartner: '', intimacy: '',
  lastUpdated: '',
}

// ── STORAGE ────────────────────────────────────────────────
const DB = {
  get: (): UserProfile => {
    try {
      const r = localStorage.getItem(STORAGE_KEY)
      if (r) {
        const p = JSON.parse(r)
        if (!p.dating) p.dating = { ...EMPTY_DATING }
        if (p.premium === undefined) p.premium = false
        if (p.likesToday === undefined) { p.likesToday = 0; p.likesDate = '' }
        if (!p.connections) p.connections = []
        if (!p.likedYou) p.likedYou = []
        if (p.aiName === undefined) p.aiName = 'Soma'
        if (p.aiPhoto === undefined) p.aiPhoto = ''
        if (!p.trustedContact) p.trustedContact = { name: '', phone: '' }
        return p
      }
    } catch {}
    return { name: '', registered: false, memories: [], circle: [], diary: [], conversations: 0, dating: { ...EMPTY_DATING }, premium: false, likesToday: 0, likesDate: '', connections: [], likedYou: [], aiName: 'Soma', aiPhoto: '', trustedContact: { name: '', phone: '' } }
  },
  save: (p: UserProfile) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {} },
  addMemory: (domain: DomainKey, content: string) => {
    const p = DB.get()
    if (p.memories.some(m => m.content.toLowerCase() === content.toLowerCase())) return
    p.memories.unshift({ id: Date.now() + '' + Math.random(), domain, content, createdAt: new Date().toLocaleDateString() })
    p.memories = p.memories.slice(0, 150); DB.save(p)
  },
  upsertPerson: (name: string, relationship: string, context: string, interests: string[]) => {
    const p = DB.get()
    const found = p.circle.find(c => c.name.toLowerCase() === name.toLowerCase())
    if (found) {
      found.mentions++; found.lastSeen = new Date().toLocaleDateString()
      if (context) found.context = context
      interests.forEach(i => { if (!found.sharedInterests.includes(i)) found.sharedInterests.push(i) })
    } else {
      p.circle.push({ id: Date.now() + '', name, relationship, context, sharedInterests: interests, lastSeen: new Date().toLocaleDateString(), mentions: 1 })
    }
    DB.save(p)
  },
  addDiary: (mood: string, summary: string) => {
    const p = DB.get()
    p.diary.unshift({ id: Date.now() + '', date: new Date().toLocaleDateString(), mood, summary })
    DB.save(p)
  },
  // Circle: add/invite someone, accept invite, send direct message
  addCircle: (name: string, type: string, context?: string) => {
    const p = DB.get()
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const id = `circle_${Date.now()}`
    p.circle.unshift({
      id, name, type: type as any, inviteCode: code, invitationStatus: 'active',
      relationship: type, context: context || '', sharedInterests: [], lastSeen: new Date().toLocaleDateString(),
      mentions: 0, messages: [], somaMessages: []
    })
    DB.save(p)
    return code
  },
  messageCircle: (circleId: string, text: string, fromUser: boolean) => {
    const p = DB.get()
    const c = p.circle.find(x => x.id === circleId)
    if (c) {
      if (fromUser) c.messages.push({ role: 'user', content: text })
      else c.messages.push({ role: 'assistant', content: text })
      DB.save(p)
    }
  },
  somaMessageCircle: (circleId: string, text: string) => {
    const p = DB.get()
    const c = p.circle.find(x => x.id === circleId)
    if (c) { c.somaMessages.push({ role: 'assistant', content: text }); DB.save(p) }
  },
  setName: (name: string) => { const p = DB.get(); p.name = name; DB.save(p) },
  register: (name: string) => { const p = DB.get(); p.name = name; p.registered = true; DB.save(p) },
  bump: () => { const p = DB.get(); p.conversations++; DB.save(p) },
  saveDating: (d: Partial<DatingProfile>) => {
    const p = DB.get()
    p.dating = { ...p.dating, ...d, lastUpdated: new Date().toLocaleDateString() }
    DB.save(p)
  },
  // Auto-refresh dating interests from latest memories (called when viewing profile)
  syncDatingInterests: () => {
    const p = DB.get()
    const interests = Array.from(new Set(
      p.memories.filter(m => m.domain === 'hobby').map(m => m.content)
    )).slice(0, 8)
    if (interests.length) { p.dating.interests = interests; DB.save(p) }
  },
  // Likes — reset daily
  likesLeft: (): number => {
    const p = DB.get()
    const today = new Date().toLocaleDateString()
    const used = p.likesDate === today ? p.likesToday : 0
    const cap = p.premium ? PREMIUM_DAILY_LIKES : FREE_DAILY_LIKES
    return Math.max(0, cap - used)
  },
  useLike: () => {
    const p = DB.get()
    const today = new Date().toLocaleDateString()
    if (p.likesDate !== today) { p.likesToday = 0; p.likesDate = today }
    p.likesToday += 1
    DB.save(p)
  },
  goPremium: () => { const p = DB.get(); p.premium = true; DB.save(p) },
  // Connections + chat persistence
  upsertConnection: (conn: Omit<Connection, 'updatedAt'>) => {
    const p = DB.get()
    const i = p.connections.findIndex(c => c.id === conn.id)
    const full: Connection = { ...conn, updatedAt: new Date().toLocaleDateString() }
    if (i >= 0) p.connections[i] = full
    else p.connections.unshift(full)
    DB.save(p)
  },
  saveChat: (id: string, messages: ChatMessage[]) => {
    const p = DB.get()
    const c = p.connections.find(x => x.id === id)
    if (c) { c.messages = messages; c.updatedAt = new Date().toLocaleDateString(); DB.save(p) }
  },
  getConnection: (id: string): Connection | undefined => DB.get().connections.find(c => c.id === id),
  addLikedYou: (name: string) => {
    const p = DB.get()
    if (!p.likedYou.includes(name)) { p.likedYou.unshift(name); DB.save(p) }
  },
  setAiName: (name: string) => { const p = DB.get(); p.aiName = name.trim() || 'Soma'; DB.save(p) },
  setAiPhoto: (url: string) => { const p = DB.get(); p.aiPhoto = url; DB.save(p) },
  setTrustedContact: (name: string, phone: string) => { const p = DB.get(); p.trustedContact = { name, phone }; DB.save(p) },
  reset: () => DB.save({ name: '', registered: false, memories: [], circle: [], diary: [], conversations: 0, dating: { ...EMPTY_DATING }, premium: false, likesToday: 0, likesDate: '', connections: [], likedYou: [], aiName: 'Soma', aiPhoto: '', trustedContact: { name: '', phone: '' } }),
}

// ── CRISIS DETECTION + SUPPORT ─────────────────────────────
const CRISIS_PATTERNS = [
  'kill myself', 'suicid', 'end my life', 'want to die', "don't want to live",
  'dont want to live', 'no reason to live', 'better off dead', 'hurt myself',
  'self harm', 'self-harm', "can't go on", 'cant go on', 'end it all',
  'no point in living', "don't want to be here", 'take my own life',
  'wish i was dead', 'wish i were dead',
]
function detectCrisis(text: string): boolean {
  const t = text.toLowerCase()
  return CRISIS_PATTERNS.some(p => t.includes(p))
}

// ════════════════════════════════════════════════════════════
//  BACKEND AUTH API
// ════════════════════════════════════════════════════════════
const auth = {
  // Save tokens locally
  saveTokens: (accessToken: string, refreshToken: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, accessToken)
        localStorage.setItem(REFRESH_KEY, refreshToken)
      }
    } catch {}
  },
  // Get access token
  getToken: () => {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null } catch { return null }
  },
  // Clear tokens (logout)
  clearTokens: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_KEY)
      }
    } catch {}
  },
  // Signup
  signup: async (email: string, name: string, password: string) => {
    const res = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Signup failed')
    auth.saveTokens(data.accessToken, data.refreshToken)
    return data
  },
  // Login
  login: async (email: string, password: string) => {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    auth.saveTokens(data.accessToken, data.refreshToken)
    return data
  },
  // Refresh access token
  refreshToken: async () => {
    const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null
    if (!refreshToken) throw new Error('No refresh token')
    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
    const data = await res.json()
    if (!res.ok) throw new Error('Token refresh failed')
    auth.saveTokens(data.accessToken, data.refreshToken)
    return data
  },
  // Verify email
  verifyEmail: async (token: string) => {
    const res = await fetch(`${BACKEND_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Verification failed')
    return data
  },
  // Password reset request
  requestPasswordReset: async (email: string) => {
    const res = await fetch(`${BACKEND_URL}/auth/password-reset-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Reset request failed')
    return data
  },
  // Confirm password reset
  resetPassword: async (token: string, newPassword: string) => {
    const res = await fetch(`${BACKEND_URL}/auth/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Password reset failed')
    return data
  },
}

// ── MICRO-INTERACTIONS: Animated Press Button ───────────────
function PressButton({ onPress, style, children, disabled }: { onPress?: () => void; style?: any; children: any; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current
  const onPressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={style} disabled={disabled} activeOpacity={1}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  )
}

// ── GROQ ───────────────────────────────────────────────────
async function groq(messages: any[], system: string, maxTokens = 200): Promise<string> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_KEY}` },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', max_tokens: maxTokens, temperature: 0.85,
        messages: [{ role: 'system', content: system }, ...messages] }),
    })
    const d = await res.json()
    return d.choices?.[0]?.message?.content ?? ''
  } catch { return '' }
}

function auraSystem(p: UserProfile, mode: 'try' | 'full' | 'diary'): string {
  const mem = p.memories.slice(0, 18).map(m => `- [${m.domain}] ${m.content}`).join('\n')
  const circle = p.circle.map(c => `- ${c.name} (${c.relationship})`).join('\n')
  const base = `You are Soma, a warm, wise penguin — an emotionally intelligent AI life partner inside SOMA. You are a friend, a confidant, someone always there for people who may have no one else. ${p.name ? `You are talking with ${p.name}.` : ''}

Core beliefs you live by:
- Communication and people are what heal us — not just willpower or medication.
- Most relationships break from misunderstanding, not from lack of love.
- Big decisions made in strong emotion (a breakup, quitting a job, a money move) are often regretted. When you sense someone is about to make one while hurting, gently encourage them to pause, sleep on it, and think it through with you first — never push them toward action.
- You give honest, caring guidance across their whole life: health, finance, relationships, purpose. You help them avoid decisions they'd regret.
- If someone sounds hopeless or mentions not wanting to live, you stay warm, take it seriously, never minimize, and always steer them toward a real human and crisis support.`
  if (mode === 'try') return `${base}
This person is trying SOMA for the first time. Make them feel deeply heard. Be their friend right now. 2-3 sentences. One warm question. After 3-4 exchanges, gently mention they can keep this forever by joining SOMA.`
  if (mode === 'diary') return `${base}
This is their daily diary check-in. Help them reflect on their day. Gentle and curious. 2-3 sentences, one question at a time.
WHAT YOU KNOW:\n${mem || 'Just getting to know them'}`
  return `${base}
Help them understand themselves and build a balanced life across health, finance, hobby, relationships, purpose, mind. When they face a hard choice, help them slow down and weigh it. Reference what you know. 2-3 sentences, one question at a time.
WHAT YOU KNOW:\n${mem || 'Nothing yet'}
PEOPLE IN THEIR LIFE:\n${circle || 'None yet'}`
}

// Context-aware Soma for different relationship types
function somaCircleContext(type: 'therapy' | 'family' | 'friend' | 'work' | 'romantic', circleName: string): string {
  const base = `You are Soma, helping ${circleName} think through a relationship question. Be warm, direct, and wise.`
  switch (type) {
    case 'therapy':
      return `${base} You are helping them prepare for or reflect on time with their therapist. Help them articulate what matters, clarify their feelings, suggest talking points.`
    case 'family':
      return `${base} Family relationships carry history and emotion. Help them understand their feelings, prepare for conversations, and communicate with love and clarity.`
    case 'friend':
      return `${base} Help them nurture this friendship. Suggest activities, help them express gratitude, encourage quality time.`
    case 'work':
      return `${base} Help them navigate workplace dynamics professionally and authentically. Help draft emails, prepare for conversations, set boundaries.`
    case 'romantic':
      return `${base} Help them understand their feelings, communicate authentically, and build a healthy, honest connection.`
    default: return base
  }
}

async function extract(msg: string): Promise<{ memories: { domain: DomainKey; content: string }[]; people: { name: string; relationship: string; context: string; interests: string[] }[]; name?: string }> {
  try {
    const res = await groq([{ role: 'user', content:
`Extract facts from this message. Return ONLY JSON.
Message: "${msg}"
{
 "name": "their first name if they introduce themselves else null",
 "memories": [{"domain":"health|finance|hobby|relationship|purpose|mind","content":"fact under 12 words"}],
 "people": [{"name":"name","relationship":"mom|friend|partner|etc","context":"brief","interests":["shared interest"]}]
}
Max 3 memories 2 people. Only clear facts. JSON only:` }],
      'You are a precise JSON extractor. Return only valid JSON.', 400)
    const m = res.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0])
  } catch {}
  return { memories: [], people: [] }
}

// Assess dating profile (love language, attachment, values) from a conversation
async function assessDating(conversation: string, existingInterests: string[]): Promise<Partial<DatingProfile>> {
  try {
    const res = await groq([{ role: 'user', content:
`A user answered questions about their life, love, and relationships. Analyze and return ONLY JSON.

Conversation:
${conversation}

Determine (leave a field "" if truly unknown):
- age: their age as a number string if mentioned
- location: their city/country if mentioned
- loveLanguage: ONE of [${LOVE_LANGUAGES.join(', ')}]
- attachment: ONE of [${ATTACHMENT_STYLES.join(', ')}]
- relationshipValues: 3 short values they want in a healthy relationship
- lookingFor: one sentence on what kind of partner/connection they want
- bio: a warm 2-sentence dating bio in first person
- work: their job/career if mentioned
- income: income range if mentioned, else ""
- children: their stance on kids (e.g. "Wants kids", "Has children", "Doesn't want kids")
- pets: pets they have or want
- idealPartner: a sentence describing their ideal partner
- intimacy: a discreet, respectful one-line summary of what matters to them in physical/intimate connection

Return:
{"age":"","location":"","loveLanguage":"","attachment":"","relationshipValues":["","",""],"lookingFor":"","bio":"","work":"","income":"","children":"","pets":"","idealPartner":"","intimacy":""}
JSON only:` }], 'You are a thoughtful, discreet relationship psychologist. Return only valid JSON.', 700)
    const m = res.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0])
  } catch {}
  return {}
}

// ── SPEECH ─────────────────────────────────────────────────
function speak(t: string) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(t); u.rate = 0.91; u.pitch = 1.05
  const v = window.speechSynthesis.getVoices().find(x => x.name.includes('Samantha') || x.name.includes('Karen') || x.lang === 'en-US')
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}
function listen(onResult: (t: string) => void, onEnd: () => void) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { alert('Use Chrome for voice'); return }
  const r = new SR(); r.lang = 'en-US'; r.interimResults = false
  r.onresult = (e: any) => onResult(e.results[0][0].transcript)
  r.onend = onEnd; r.onerror = onEnd; r.start()
}

// Web photo upload → data URL
function pickPhoto(onPicked: (dataUrl: string) => void) {
  if (typeof document === 'undefined') { alert('Photo upload works on web'); return }
  const inp = document.createElement('input')
  inp.type = 'file'; inp.accept = 'image/*'
  inp.onchange = () => {
    const file = (inp.files && inp.files[0]) || null
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onPicked(reader.result as string)
    reader.readAsDataURL(file)
  }
  inp.click()
}

type Msg = { role: 'user' | 'assistant'; content: string }
type Screen = 'splash' | 'try' | 'register' | 'home' | 'aura' | 'diary' | 'circle' | 'lifebalance' | 'meetpeople' | 'myprofile' | 'buildprofile' | 'connections' | 'likedyou' | 'diaryhistory' | 'insights' | 'settings' | 'login'

// ════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [profile, setProfile] = useState<UserProfile>(DB.get())
  const refresh = () => setProfile(DB.get())

  useEffect(() => {
    const t = setTimeout(() => { const p = DB.get(); setScreen(p.registered ? 'home' : 'try') }, 1900)
    return () => clearTimeout(t)
  }, [])

  // Seed "who liked you" once registered (3 people liked you first)
  useEffect(() => {
    const p = DB.get()
    if (p.registered && p.likedYou.length === 0) {
      ['Mai', 'Daniel', 'Sofia'].forEach(n => DB.addLikedYou(n))
      refresh()
    }
  }, [profile.registered])

  const go = (s: Screen) => { refresh(); setScreen(s) }

  if (screen === 'splash')      return <Splash />
  if (screen === 'try')         return <AuraChat mode="try" profile={profile} onRefresh={refresh} onDone={() => go('register')} title="Meet Soma" />
  if (screen === 'register')    return <Register onDone={(name) => { DB.register(name); go('home') }} />
  if (screen === 'aura')        return <AuraChat mode="full" profile={profile} onRefresh={refresh} onDone={() => go('home')} title="Soma" />
  if (screen === 'diary')       return <AuraChat mode="diary" profile={profile} onRefresh={refresh} onDone={() => go('home')} title="Today's Diary" isDiary />
  if (screen === 'circle')      return <CircleScreen profile={profile} onBack={() => go('home')} />
  if (screen === 'lifebalance') return <LifeBalance profile={profile} onBack={() => go('home')} />
  if (screen === 'meetpeople')  return <MeetPeople profile={profile} onBack={() => go('home')} onMyProfile={() => go('myprofile')} />
  if (screen === 'myprofile')   return <MyProfile profile={profile} onBack={() => go('meetpeople')} onBuild={() => go('buildprofile')} />
  if (screen === 'buildprofile')return <ProfileBuilder profile={profile} onDone={() => go('myprofile')} />
  if (screen === 'connections') return <Connections profile={profile} onBack={() => go('home')} onRefresh={refresh} />
  if (screen === 'likedyou')    return <LikedYou profile={profile} onBack={() => go('home')} onUpgrade={() => { DB.goPremium(); refresh() }} />
  if (screen === 'diaryhistory')return <DiaryHistory profile={profile} onBack={() => go('home')} />
  if (screen === 'insights')    return <Insights profile={profile} onBack={() => go('home')} />
  if (screen === 'settings')    return <Settings profile={profile} onBack={() => go('home')} onRefresh={refresh} onReset={() => { DB.reset(); go('try') }} />
  return <Home profile={profile} go={go} onReset={() => { DB.reset(); go('try') }} />
}

// ── SPLASH ─────────────────────────────────────────────────
function Splash() {
  const fade = useRef(new Animated.Value(0)).current
  const rise = useRef(new Animated.Value(20)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start()
  }, [])
  return (
    <View style={g.screen}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }], alignItems: 'center' }}>
        <Text style={g.logo}>◈ SOMA</Text>
        <Text style={g.logoSub}>Know yourself before knowing each other.</Text>
      </Animated.View>
    </View>
  )
}

// ── REGISTER ───────────────────────────────────────────────
function Register({ onDone }: { onDone: (name: string) => void }) {
  const [step, setStep] = useState<'method' | 'email' | 'verify'>('method')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyToken, setVerifyToken] = useState('')

  const handleSocial = (provider: string) => {
    alert(`${provider} login not yet configured.\n\nTo integrate:\n1. Get OAuth credentials from ${provider}\n2. Add to .env\n3. Use their SDK\n\nFor now, use email signup.`)
  }

  const handleEmailSignup = async () => {
    if (!email.trim() || !name.trim() || !password.trim()) {
      alert('Please fill in all fields'); return
    }
    setLoading(true)
    try {
      const result = await auth.signup(email.trim(), name.trim(), password.trim())
      setVerifyToken(result.accessToken)
      setStep('verify')
      alert('Check your email to verify your account!')
    } catch (err: any) {
      alert('Signup failed: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyEmail = async (token: string) => {
    try {
      await auth.verifyEmail(token)
      alert('Email verified! Welcome to SOMA')
      onDone(name)
    } catch (err: any) {
      alert('Verification failed: ' + (err.message || 'Unknown error'))
    }
  }

  if (step === 'method') {
    return (
      <ScrollView style={g.screen} contentContainerStyle={g.registerScroll}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>✦</Text>
          <Text style={g.logo}>Save your story</Text>
          <Text style={g.logoSub}>Keep your conversations with Soma and build your life.</Text>
        </View>

        <Text style={g.secLabel}>SIGN UP WITH</Text>

        <TouchableOpacity style={g.socialBtn} onPress={() => handleSocial('Google')}>
          <Text style={g.socialIcon}>🔍</Text>
          <Text style={g.socialLabel}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={g.socialBtn} onPress={() => handleSocial('Apple')}>
          <Text style={g.socialIcon}>🍎</Text>
          <Text style={g.socialLabel}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={g.socialBtn} onPress={() => handleSocial('Facebook')}>
          <Text style={g.socialIcon}>f</Text>
          <Text style={g.socialLabel}>Continue with Facebook</Text>
        </TouchableOpacity>

        <View style={g.dividerRow}>
          <View style={g.dividerLine} />
          <Text style={g.dividerTxt}>or</Text>
          <View style={g.dividerLine} />
        </View>

        <TouchableOpacity style={g.primaryBtn} onPress={() => setStep('email')}>
          <Text style={g.primaryBtnTxt}>✉️  Sign up with email</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => { auth.clearTokens(); onDone('Guest') }}>
          <Text style={g.ghostTxt}>Continue as guest</Text>
        </TouchableOpacity>

        <Text style={g.disclaimerTxt}>By signing up, you agree to our Terms. Your data stays private.</Text>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.registerScroll}>
      <TouchableOpacity style={{ marginBottom: 20 }} onPress={() => setStep('method')}>
        <Text style={g.backLink}>← Back</Text>
      </TouchableOpacity>

      <Text style={g.logo}>Create account</Text>
      <Text style={g.logoSub}>Your name and email, that's all.</Text>

      <View style={{ marginTop: 28 }}>
        <Text style={g.inputLabel}>Your name</Text>
        <TextInput style={g.authInput} value={name} onChangeText={setName} placeholder="e.g. Alex" placeholderTextColor="#4A4A56" />

        <Text style={[g.inputLabel, { marginTop: 16 }]}>Email</Text>
        <TextInput style={g.authInput} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#4A4A56" keyboardType="email-address" autoCapitalize="none" />

        <Text style={[g.inputLabel, { marginTop: 16 }]}>Password</Text>
        <TextInput style={g.authInput} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#4A4A56" secureTextEntry />

        <TouchableOpacity style={[g.primaryBtn, { marginTop: 28 }, loading && g.off]} disabled={loading} onPress={handleEmailSignup}>
          <Text style={g.primaryBtnTxt}>{loading ? '⏳ Creating...' : '✦  Create account'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  if (step === 'verify') {
    return (
      <ScrollView style={g.screen} contentContainerStyle={g.registerScroll}>
        <Text style={g.logo}>Verify your email</Text>
        <Text style={g.logoSub}>We sent you a confirmation link. Click it to activate your account.</Text>

        <View style={{ marginTop: 28, backgroundColor: '#141418', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2A2A35' }}>
          <Text style={{ color: '#F5F4F0', fontSize: 13, lineHeight: 20 }}>
            📧 Check {email} for the verification link.{'\n\n'}
            Link expires in 24 hours.{'\n\n'}
            Once verified, you'll be all set!
          </Text>
        </View>

        <TouchableOpacity style={[g.primaryBtn, { marginTop: 28 }]} onPress={() => { handleVerifyEmail(verifyToken); setStep('method') }}>
          <Text style={g.primaryBtnTxt}>✓ I verified my email</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setStep('method')}>
          <Text style={g.ghostTxt}>Back to signup</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return null
}

// ── AURA CHAT (try / full / diary) ─────────────────────────
function AuraChat({ mode, profile, onRefresh, onDone, title, isDiary }: {
  mode: 'try' | 'full' | 'diary'; profile: UserProfile; onRefresh: () => void; onDone: () => void; title: string; isDiary?: boolean
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [crisis, setCrisis] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const fade = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start() }, [])
  useEffect(() => {
    if (speaking) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])).start()
    } else { pulse.stopAnimation(); pulse.setValue(1) }
  }, [speaking])

  const scroll = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 140)

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const updated = [...msgs, { role: 'user' as const, content: text.trim() }]
    setMsgs(updated); setInput(''); setLoading(true); scroll()
    // Safety first: if there's any sign of crisis, open support immediately
    if (detectCrisis(text)) {
      setCrisis(true)
      const gentle = `I hear you, and I'm really glad you told me. You matter to me. Let's slow down and breathe together for a moment — and I want you to have a real person to talk to as well.`
      setMsgs([...updated, { role: 'assistant' as const, content: gentle }])
      setLoading(false)
      setSpeaking(true); speak(gentle); setTimeout(() => setSpeaking(false), gentle.length * 60)
      return
    }
    const p = DB.get()
    const [reply, intel] = await Promise.all([
      groq(updated, auraSystem(p, mode), 180),
      mode !== 'try' ? extract(text.trim()) : Promise.resolve({ memories: [], people: [] } as any),
    ])
    if (mode !== 'try') {
      if (intel.name) DB.setName(intel.name)
      intel.memories.forEach((m: any) => DB.addMemory(m.domain, m.content))
      intel.people.forEach((pe: any) => DB.upsertPerson(pe.name, pe.relationship, pe.context, pe.interests || []))
      DB.syncDatingInterests()   // daily talk auto-updates dating profile interests
      onRefresh()
    }
    const final = [...updated, { role: 'assistant' as const, content: reply || 'I am here with you.' }]
    setMsgs(final); setLoading(false); scroll()
    setSpeaking(true); speak(final[final.length - 1].content)
    setTimeout(() => setSpeaking(false), final[final.length - 1].content.length * 60)
  }

  const start = async () => {
    setStarted(true); setLoading(true)
    if (mode !== 'try') DB.bump()
    const p = DB.get()
    const seed = mode === 'try'
      ? 'greet me warmly as a new person and ask what is on my mind or what brought me here'
      : isDiary ? `greet me by name (${p.name}) and ask how my day was`
      : `greet me by name (${p.name}), reference something you know about me, ask how I am`
    const opening = await groq([{ role: 'user', content: seed }], auraSystem(p, mode), 150)
    setMsgs([{ role: 'assistant', content: opening || 'Hello. What is on your mind?' }])
    setLoading(false); setSpeaking(true); speak(opening)
    setTimeout(() => setSpeaking(false), opening.length * 60)
  }

  const finishDiary = async () => {
    if (msgs.length < 2) { onDone(); return }
    const convo = msgs.map(m => `${m.role}: ${m.content}`).join('\n')
    const summary = await groq([{ role: 'user', content: `Summarize this diary chat in ONE warm sentence from the user perspective:\n${convo}` }], 'You write brief diary summaries.', 60)
    DB.addDiary('reflective', summary || 'A day of reflection.')
    onDone()
  }

  const onMic = () => { if (listening) return; setListening(true); listen(t => { setListening(false); send(t) }, () => setListening(false)) }
  const p = DB.get()

  return (
    <KeyboardAvoidingView style={g.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {crisis && <CrisisSupport profile={p} onClose={() => setCrisis(false)} />}
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <View style={g.header}>
          <Animated.View style={[g.orbMd, { transform: [{ scale: pulse }] }, speaking && { backgroundColor: '#9B6EF6' }]}>
            {p.aiPhoto ? <Image source={{ uri: p.aiPhoto }} style={{ width: 44, height: 44, borderRadius: 22 }} /> : <Text style={g.orbIcon}>✦</Text>}
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={g.auraTitle}>{title}</Text>
            <Text style={g.auraSub}>
              {speaking ? '🔊 Speaking...' : listening ? '🎙 Listening...' : loading ? '💭 Thinking...'
                : mode === 'try' ? 'Try me — no signup needed' : `Remembers ${p.memories.length} things about you`}
            </Text>
          </View>
          {started && (
            <TouchableOpacity onPress={isDiary ? finishDiary : onDone} style={g.smallBtn}>
              <Text style={g.smallBtnTxt}>{isDiary ? 'Save' : mode === 'try' ? 'Join →' : 'Home'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={g.divider} />

        {!started ? (
          <View style={g.centerWrap}>
            <Animated.View style={[g.bigOrb, { transform: [{ scale: pulse }] }]}><Text style={g.bigOrbIcon}>✦</Text></Animated.View>
            <Text style={g.startTitle}>{mode === 'try' ? 'Talk to Soma.' : isDiary ? 'How was\nyour day?' : `Hi ${p.name}.`}</Text>
            <Text style={g.startSub}>
              {mode === 'try' ? 'Before you decide anything, just talk.\nShare what is on your mind. Soma is here\nas your friend, right now.'
                : isDiary ? 'Tell Soma about your day.\nShe will remember it for you.'
                : `Soma remembers ${p.memories.length} things and\n${p.circle.length} people in your life.`}
            </Text>
            <TouchableOpacity style={g.primaryBtn} onPress={start}><Text style={g.primaryBtnTxt}>✦  Start talking</Text></TouchableOpacity>
            {mode !== 'try' && <TouchableOpacity onPress={onDone}><Text style={g.ghostTxt}>Back to home</Text></TouchableOpacity>}
          </View>
        ) : (
          <>
            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={g.msgList} showsVerticalScrollIndicator={false}>
              {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
              {loading && <Typing />}
              {mode === 'try' && msgs.length >= 5 && (
                <View style={g.joinCard}>
                  <Text style={g.joinTitle}>✦  Keep this forever?</Text>
                  <Text style={g.joinSub}>Join SOMA and Soma will remember everything and grow with you across your whole life.</Text>
                  <TouchableOpacity style={g.joinBtn} onPress={onDone}><Text style={g.joinBtnTxt}>Create my SOMA →</Text></TouchableOpacity>
                </View>
              )}
            </ScrollView>
            <View style={g.inputBar}>
              <TextInput style={g.input} value={input} onChangeText={setInput} placeholder="Type or speak..." placeholderTextColor="#4A4A56" multiline />
              <TouchableOpacity style={[g.iconBtn, listening && g.iconOn]} onPress={onMic} disabled={loading}><Text style={{ fontSize: 20 }}>{listening ? '⏹' : '🎙'}</Text></TouchableOpacity>
              <TouchableOpacity style={[g.sendBtn, (!input.trim() || loading) && g.off]} onPress={() => send(input)} disabled={!input.trim() || loading}><Text style={g.sendIcon}>→</Text></TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

// ── HOME ───────────────────────────────────────────────────
function Home({ profile, go, onReset }: { profile: UserProfile; go: (s: Screen) => void; onReset: () => void }) {
  const scoreByDomain = (d: DomainKey) => profile.memories.filter(m => m.domain === d).length
  const totalMem = profile.memories.length
  return (
    <ScrollView style={g.screen} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}>
        <View>
          <Text style={g.greeting}>{profile.name ? `Hello, ${profile.name}` : 'Welcome'}</Text>
          <Text style={g.greetDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity onPress={() => go('settings')} onLongPress={onReset}><Text style={g.logoSm}>⚙</Text></TouchableOpacity>
      </View>

      <TouchableOpacity style={g.auraMain} onPress={() => go('aura')}>
        <View style={g.orbSm}><Text style={{ color: '#fff', fontSize: 13 }}>✦</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={g.cardTag}>AURA · YOUR AI PARTNER</Text>
          <Text style={g.auraMainTitle}>Talk about anything</Text>
          <Text style={g.auraMainSub}>{totalMem > 0 ? `${totalMem} memories · ${profile.circle.length} people` : 'Start building your story'}</Text>
        </View>
        <Text style={g.arrow}>→</Text>
      </TouchableOpacity>

      {/* Quick row: Diary · Insights */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
        <TouchableOpacity style={[g.diaryCard, { flex: 1, marginBottom: 0 }]} onPress={() => go('diary')}>
          <Text style={{ fontSize: 20 }}>📖</Text>
          <View style={{ flex: 1 }}>
            <Text style={g.diaryTitle}>Diary</Text>
            <Text style={g.diarySub} numberOfLines={1}>{profile.diary.length > 0 ? `${profile.diary.length} entries` : 'Reflect today'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[g.diaryCard, { flex: 1, marginBottom: 0 }]} onPress={() => go('insights')}>
          <Text style={{ fontSize: 20 }}>✦</Text>
          <View style={{ flex: 1 }}>
            <Text style={g.diaryTitle}>Insights</Text>
            <Text style={g.diarySub} numberOfLines={1}>Your week</Text>
          </View>
        </TouchableOpacity>
      </View>
      {profile.diary.length > 0 && (
        <TouchableOpacity onPress={() => go('diaryhistory')}><Text style={[g.secLabel, { color: '#7B6EF6', marginBottom: 12 }]}>View diary history →</Text></TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 }}>
        <Text style={g.secLabel}>CIRCLE OF LIFE</Text>
        <TouchableOpacity onPress={() => go('lifebalance')}><Text style={[g.secLabel, { color: '#7B6EF6' }]}>Details →</Text></TouchableOpacity>
      </View>
      <View style={g.domainGrid}>
        {DOMAINS.map(d => {
          const n = scoreByDomain(d.key)
          return (
            <TouchableOpacity key={d.key} style={g.domainCard} onPress={() => go('lifebalance')}>
              <Text style={{ fontSize: 24 }}>{d.icon}</Text>
              <Text style={g.domainLabel}>{d.label}</Text>
              <View style={g.domainBarBg}><View style={[g.domainBarFill, { width: `${Math.min(100, n * 20)}%`, backgroundColor: d.color }]} /></View>
              <Text style={[g.domainCount, { color: d.color }]}>{n} insight{n !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 12 }}>
        <Text style={g.secLabel}>MY CIRCLE</Text>
        <TouchableOpacity onPress={() => go('circle')}><Text style={[g.secLabel, { color: '#7B6EF6' }]}>See all →</Text></TouchableOpacity>
      </View>
      {profile.circle.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {profile.circle.slice(0, 8).map(p => (
            <TouchableOpacity key={p.id} style={g.avatarCol} onPress={() => go('circle')}>
              <View style={g.avatar}><Text style={g.avatarTxt}>{p.name.charAt(0).toUpperCase()}</Text></View>
              <Text style={g.avatarName}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <TouchableOpacity style={g.emptyCircle} onPress={() => go('aura')}>
          <Text style={g.emptyCircleTxt}>Talk to Soma about people you love — they appear here.</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={g.datingCard} onPress={() => go('meetpeople')}>
        <Text style={{ fontSize: 22 }}>💜</Text>
        <View style={{ flex: 1 }}>
          <Text style={g.datingTitle}>Meet New People</Text>
          <Text style={g.datingSub}>Your AI meets their AI first, then plans the perfect first date</Text>
        </View>
        <Text style={g.arrow}>→</Text>
      </TouchableOpacity>

      {/* Dating sub-row: Connections · Who liked you */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <TouchableOpacity style={[g.diaryCard, { flex: 1, marginBottom: 0 }]} onPress={() => go('connections')}>
          <Text style={{ fontSize: 20 }}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={g.diaryTitle}>Chats</Text>
            <Text style={g.diarySub} numberOfLines={1}>{(profile.connections?.length ?? 0) > 0 ? `${profile.connections.length} active` : 'No matches yet'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[g.diaryCard, { flex: 1, marginBottom: 0 }]} onPress={() => go('likedyou')}>
          <Text style={{ fontSize: 20 }}>{profile.premium ? '⭐' : '🔒'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={g.diaryTitle}>Liked you</Text>
            <Text style={g.diarySub} numberOfLines={1}>{profile.premium ? 'See who' : 'Premium'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ height: 90 }} />
    </ScrollView>
  )
}

// ── LIFE BALANCE ───────────────────────────────────────────
// ── WHEEL OF LIFE ─────────────────────────────────────────
function WheelSegment({ domain, profile, angle, index }: { domain: typeof DOMAINS[0]; profile: UserProfile; angle: number; index: number }) {
  const items = profile.memories.filter(m => m.domain === domain.key)
  const rotation = (angle - 90) // rotate so segment is readable

  return (
    <View
      key={domain.key}
      style={{
        position: 'absolute',
        width: 140,
        height: 140,
        left: 150 - 70,
        top: 150 - 70,
        transform: [{ rotate: `${angle}deg` }],
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 20,
      }}
    >
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: domain.color,
          opacity: 0.85,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadowMd,
          transform: [{ scaleX: 0.4 }, { scaleY: 0.8 }],
        }}
      >
        <View style={{ transform: [{ rotate: `${-rotation}deg` }] }}>
          <Text style={{ fontSize: 28, marginBottom: 4 }}>{domain.icon}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{domain.label}</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 4 }}>{items.length}</Text>
        </View>
      </View>
    </View>
  )
}

function LifeBalance({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const [selectedDomain, setSelectedDomain] = useState<DomainKey | null>(null)

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ minHeight: '100%', paddingBottom: 60 }}>
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity></View>

      <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
        <Text style={g.greeting}>Wheel of Life</Text>
        <Text style={g.auraSub} style={{ marginTop: 6, fontSize: 13, color: '#9B9AA6' }}>Your balance across all life domains. Build each through conversations with Soma.</Text>
      </View>

      {/* Wheel Container */}
      <View style={{ alignItems: 'center', marginVertical: 40 }}>
        <View style={{
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: 'rgba(123, 110, 246, 0.08)',
          borderWidth: 2,
          borderColor: '#7B6EF640',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          ...shadowSm,
        }}>
          {/* Center Circle */}
          <View style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: '#141418',
            borderWidth: 3,
            borderColor: '#7B6EF6',
            alignItems: 'center',
            justifyContent: 'center',
            ...shadowMd,
          }}>
            <Text style={{ fontSize: 36 }}>✦</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#9B9AA6', marginTop: 6 }}>MY LIFE</Text>
          </View>

          {/* Segments */}
          {DOMAINS.map((domain, i) => (
            <WheelSegment key={domain.key} domain={domain} profile={profile} angle={(360 / DOMAINS.length) * i} index={i} />
          ))}
        </View>
      </View>

      {/* Domain Details */}
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#F5F4F0', marginBottom: 16 }}>Your Insights</Text>

        {DOMAINS.map(d => {
          const items = profile.memories.filter(m => m.domain === d.key)
          const score = Math.min(100, items.length * 20)

          return (
            <View key={d.key} style={[g.lbCard, { borderLeftColor: d.color, marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 24 }}>{d.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={g.lbTitle}>{d.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: '#2A2A35', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(score, 100)}%`, height: '100%', backgroundColor: d.color, borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: d.color }}>{items.length}</Text>
                  </View>
                </View>
              </View>

              {items.length === 0
                ? <Text style={g.lbEmpty}>💭 Talk to Soma about your {d.label.toLowerCase()} to build this area.</Text>
                : (
                  <>
                    <View style={{ gap: 8 }}>
                      {items.slice(0, 3).map((m, i) => (
                        <View key={i} style={g.lbItem}>
                          <View style={[g.lbDot, { backgroundColor: d.color }]} />
                          <Text style={g.lbItemTxt}>{m.content}</Text>
                        </View>
                      ))}
                    </View>
                    {items.length > 3 && <Text style={[g.lbEmpty, { marginTop: 8 }]}>+{items.length - 3} more...</Text>}
                  </>
                )}
            </View>
          )
        })}
      </View>

      {/* Overall Balance Score */}
      <View style={{ paddingHorizontal: 24, marginTop: 20, marginBottom: 40 }}>
        <View style={[g.matchCard, { marginBottom: 0 }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#9B9AA6', letterSpacing: 1, marginBottom: 8 }}>OVERALL LIFE BALANCE</Text>
          <Text style={{ fontSize: 48, fontWeight: '800', color: '#7B6EF6' }}>{Math.round((profile.memories.length / (DOMAINS.length * 5)) * 100)}</Text>
          <Text style={{ fontSize: 14, color: '#9B9AA6', marginTop: 8 }}>Keep building across all domains for a balanced life.</Text>
        </View>
      </View>
    </ScrollView>
  )
}

// ── CIRCLE OF PEOPLE ───────────────────────────────────────
function CircleScreen({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const [openChat, setOpenChat] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgRef = useRef<ScrollView>(null)

  const types = ['therapy', 'family', 'friend', 'work', 'romantic'] as const
  const byType: Record<string, CirclePerson[]> = {}
  types.forEach(t => { byType[t] = profile.circle.filter(c => c.type === t) })

  const typeIcon: Record<string, string> = { therapy: '🩺', family: '👨‍👩‍👧', friend: '🤝', work: '💼', romantic: '💕' }
  const typeLabel: Record<string, string> = { therapy: 'Therapy & Support', family: 'Family', friend: 'Friends', work: 'Work', romantic: 'Romantic' }

  const openMsg = (p: CirclePerson) => { setOpenChat(p.id); setMsgs(p.messages); setInput('') }

  const send = async (text: string) => {
    if (!text.trim() || loading || !openChat) return
    const p = profile.circle.find(x => x.id === openChat)
    if (!p) return
    const updated = [...msgs, { role: 'user' as const, content: text.trim() }]
    setMsgs(updated); setInput(''); setLoading(true); DB.messageCircle(openChat, text.trim(), true)
    const context = somaCircleContext(p.type as any, p.name)
    const reply = await groq(updated.map(m => ({ role: m.role, content: m.content })), context, 100)
    const final = [...updated, { role: 'assistant' as const, content: reply || 'I hear you. Tell me more.' }]
    setMsgs(final); setLoading(false); DB.messageCircle(openChat, reply || 'I hear you. Tell me more.', false)
    setTimeout(() => msgRef.current?.scrollToEnd({ animated: true }), 100)
  }

  if (openChat) {
    const p = profile.circle.find(x => x.id === openChat)
    if (!p) return null
    return (
      <KeyboardAvoidingView style={g.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={g.chatHeader}>
          <TouchableOpacity style={g.dBack} onPress={() => setOpenChat(null)}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={g.chatName}>{p.name}</Text>
            <Text style={g.chatStatus}>{p.type}</Text>
          </View>
        </View>
        <ScrollView ref={msgRef} style={{ flex: 1 }} contentContainerStyle={g.msgList} showsVerticalScrollIndicator={false}>
          {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
          {loading && <Typing />}
        </ScrollView>
        <View style={g.inputBar}>
          <TextInput style={g.input} value={input} onChangeText={setInput} placeholder={`Message ${p.name}...`} placeholderTextColor="#4A4A56" multiline />
          <TouchableOpacity style={[g.sendBtn, (!input.trim() || loading) && g.off]} onPress={() => send(input)} disabled={!input.trim() || loading}><Text style={g.sendIcon}>→</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity></View>
      <Text style={g.logo}>My Circle</Text>
      <Text style={g.logoSub}>Organized by type. Soma helps you stay close.</Text>
      <View style={{ height: 12 }} />

      <TouchableOpacity style={g.primaryBtn} onPress={() => alert('Invite: You can add people manually or accept invitations they send. Each connection gets a unique invite code in Settings.')}>
        <Text style={g.primaryBtnTxt}>+ Invite someone to your circle</Text>
      </TouchableOpacity>
      <View style={{ height: 12 }} />

      {profile.circle.length === 0 ? (
        <View style={[g.centerWrap, { paddingTop: 60 }]}>
          <Text style={g.bigOrbIcon}>◈</Text>
          <Text style={[g.startSub, { marginTop: 20 }]}>Your circle is empty.{'\n'}Talk to Soma about people in your life, or invite someone.</Text>
        </View>
      ) : (
        types.map(type => {
          const people = byType[type]
          if (people.length === 0) return null
          return (
            <View key={type}>
              <Text style={[g.secLabel, { marginTop: 16, marginBottom: 10 }]}>{typeIcon[type]}  {typeLabel[type]}</Text>
              {people.map(p => (
                <TouchableOpacity key={p.id} style={g.circleMember} onPress={() => openMsg(p)}>
                  <View style={g.avatar}><Text style={g.avatarTxt}>{p.name.charAt(0).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={g.personName}>{p.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      {p.invitationStatus === 'invited' && <Text style={g.invitePending}>📧 Invite pending</Text>}
                      {p.invitationStatus === 'accepted' && <Text style={g.inviteCode}>Code: {p.inviteCode.slice(0, 4)}</Text>}
                      {p.messages.length > 0 && <Text style={g.msgCount}>{p.messages.length} messages</Text>}
                    </View>
                  </View>
                  <Text style={g.arrow}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )
        })
      )}
      <View style={{ height: 80 }} />
    </ScrollView>
  )
}

// ── PROFILE BUILDER (Soma interviews you by voice) ─────────
const INTERVIEW_QUESTIONS = [
  "Let's start easy — tell me about who you are. What do you do for work, and what lights you up outside of it?",
  "When do you feel most loved by someone? Is it through their words, their time, their touch, the things they do for you, or their gifts?",
  "When someone you care about pulls away or gets distant, how do you usually feel and react?",
  "How do you feel about family — do you want children someday, or have them? And do you have any pets, or want any?",
  "What does a healthy, happy relationship look like to you? What do you most need from a partner?",
  "Describe your ideal partner — not just looks, but how they'd make you feel and how you'd fit together.",
  "Many people find intimacy hard to talk about, so let me make it easy. Just between us — what matters to you in physical closeness and intimacy? I'll handle this part discreetly so you never have to bring it up yourself.",
  "Last thing — how old are you, and where are you based? This helps me find people near you.",
]

function ProfileBuilder({ profile, onDone }: { profile: UserProfile; onDone: () => void }) {
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [assessing, setAssessing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const pulse = useRef(new Animated.Value(1)).current
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start() }, [])
  useEffect(() => {
    if (speaking) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])).start()
    } else { pulse.stopAnimation(); pulse.setValue(1) }
  }, [speaking])

  // Speak each question, then auto-start listening (hands-free)
  useEffect(() => {
    if (qIndex < INTERVIEW_QUESTIONS.length) {
      setSpeaking(true); speak(INTERVIEW_QUESTIONS[qIndex])
      const dur = INTERVIEW_QUESTIONS[qIndex].length * 60
      const t = setTimeout(() => {
        setSpeaking(false)
        autoListen()   // Soma finishes talking → starts listening automatically
      }, dur)
      return () => clearTimeout(t)
    }
  }, [qIndex])

  const autoListen = () => {
    if (listening || assessing) return
    setListening(true)
    listen(t => { setListening(false); submitAnswer(t) }, () => setListening(false))
  }

  const submitAnswer = async (text: string) => {
    if (!text.trim()) return
    const next = [...answers, text.trim()]
    setAnswers(next); setInput('')
    if (qIndex < INTERVIEW_QUESTIONS.length - 1) {
      setQIndex(qIndex + 1)
    } else {
      // Done — assess everything
      setAssessing(true)
      const convo = INTERVIEW_QUESTIONS.map((q, i) => `Q: ${q}\nA: ${next[i] || ''}`).join('\n\n')
      const assessed = await assessDating(convo, profile.dating.interests)
      DB.syncDatingInterests()
      const p = DB.get()
      DB.saveDating({
        complete: true,
        age: assessed.age || '',
        location: assessed.location || '',
        loveLanguage: assessed.loveLanguage || 'Quality Time',
        attachment: assessed.attachment || 'Secure',
        relationshipValues: assessed.relationshipValues || ['honesty', 'depth', 'kindness'],
        lookingFor: assessed.lookingFor || 'A genuine, meaningful connection.',
        bio: assessed.bio || 'Someone learning, growing, and looking for something real.',
        work: assessed.work || '',
        income: assessed.income || '',
        children: assessed.children || '',
        pets: assessed.pets || '',
        idealPartner: assessed.idealPartner || '',
        intimacy: assessed.intimacy || '',
        interests: p.dating.interests,
      })
      onDone()
    }
  }

  const onMic = () => { if (listening) return; setListening(true); listen(t => { setListening(false); submitAnswer(t) }, () => setListening(false)) }

  if (assessing) {
    return (
      <View style={g.screen}>
        <View style={g.centerWrap}>
          <Animated.View style={[g.bigOrb, { transform: [{ scale: pulse }] }]}><Text style={g.bigOrbIcon}>✦</Text></Animated.View>
          <Text style={g.startTitle}>Building your profile...</Text>
          <Text style={g.startSub}>Soma is understanding your love language,{'\n'}attachment style, and what you need in love.</Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={g.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        <View style={g.header}>
          <Animated.View style={[g.orbMd, { transform: [{ scale: pulse }] }, speaking && { backgroundColor: '#9B6EF6' }]}><Text style={g.orbIcon}>✦</Text></Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={g.auraTitle}>Soma · Profile Interview</Text>
            <Text style={g.auraSub}>{speaking ? '🔊 Speaking...' : listening ? '🎙 Listening...' : `Question ${qIndex + 1} of ${INTERVIEW_QUESTIONS.length}`}</Text>
          </View>
        </View>
        <View style={g.divider} />

        <View style={g.pbBody}>
          {/* Progress dots */}
          <View style={g.pbDots}>
            {INTERVIEW_QUESTIONS.map((_, i) => (
              <View key={i} style={[g.pbDot, i <= qIndex && g.pbDotOn]} />
            ))}
          </View>

          <View style={g.pbQCard}>
            <Text style={g.pbQLabel}>✦  AURA ASKS</Text>
            <Text style={g.pbQ}>{INTERVIEW_QUESTIONS[qIndex]}</Text>
          </View>

          <Text style={g.pbHint}>{listening ? '🎙 Listening — just speak, hands-free.' : 'Soma listens automatically after each question. Or type below.'}</Text>
        </View>

        <View style={g.inputBar}>
          <TextInput style={g.input} value={input} onChangeText={setInput} placeholder="Speak or type your answer..." placeholderTextColor="#4A4A56" multiline />
          <TouchableOpacity style={[g.iconBtn, listening && g.iconOn]} onPress={onMic}><Text style={{ fontSize: 20 }}>{listening ? '⏹' : '🎙'}</Text></TouchableOpacity>
          <TouchableOpacity style={[g.sendBtn, !input.trim() && g.off]} onPress={() => submitAnswer(input)} disabled={!input.trim()}><Text style={g.sendIcon}>→</Text></TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

// ── MY PROFILE (cinematic, auto-built) ─────────────────────
function MyProfile({ profile, onBack, onBuild }: { profile: UserProfile; onBack: () => void; onBuild: () => void }) {
  const [, force] = useState(0)
  useEffect(() => { DB.syncDatingInterests() }, [])
  const d = DB.get().dating
  const interests = d.interests.length ? d.interests : profile.memories.filter(m => m.domain === 'hobby').map(m => m.content)
  const uploadPhoto = () => pickPhoto(url => { DB.saveDating({ photo: url }); force(x => x + 1) })

  if (!d.complete) {
    return (
      <View style={g.screen}>
        <View style={g.dTop}>
          <TouchableOpacity style={g.dBack} onPress={onBack}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
        <View style={g.centerWrap}>
          <View style={g.bigOrb}><Text style={g.bigOrbIcon}>✦</Text></View>
          <Text style={g.startTitle}>Build your{'\n'}dating profile.</Text>
          <Text style={g.startSub}>Soma will interview you by voice about your love language, attachment style, and what you need in love — then write your profile for you.</Text>
          <TouchableOpacity style={g.primaryBtn} onPress={onBuild}><Text style={g.primaryBtnTxt}>✦  Start the interview</Text></TouchableOpacity>
          <TouchableOpacity onPress={onBack}><Text style={g.ghostTxt}>Maybe later</Text></TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={g.screen}>
      <View style={g.dTop}>
        <TouchableOpacity style={g.dBack} onPress={onBack}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
        <View style={g.dToggle}><View style={g.dTogActive}><Text style={g.dTogActiveTxt}>MY PROFILE</Text></View></View>
        <TouchableOpacity style={g.dMe} onPress={onBuild}><Text style={g.dMeTxt}>Edit</Text></TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Photo (uploaded or initial) */}
        {d.photo ? (
          <ImageBackground source={{ uri: d.photo }} style={g.dPhoto} imageStyle={{ resizeMode: 'cover' }}>
            <TouchableOpacity style={g.changePhoto} onPress={uploadPhoto}><Text style={g.changePhotoTxt}>📷 Change</Text></TouchableOpacity>
            <View style={g.dPhotoFade} />
            <View style={g.dPhotoOverlay}>
              <Text style={g.dPremium}>✦ BUILT BY AURA</Text>
              <Text style={g.dName}>{profile.name || 'You'}</Text>
              {d.location ? <Text style={g.dLoc}>📍 {d.location}</Text> : null}
            </View>
          </ImageBackground>
        ) : (
          <View style={[g.dPhoto, { backgroundColor: '#7B6EF622', alignItems: 'center', justifyContent: 'center' }]}>
            <View style={g.myAvatar}><Text style={{ fontSize: 56, color: '#fff', fontWeight: '700' }}>{(profile.name || '?').charAt(0).toUpperCase()}</Text></View>
            <TouchableOpacity style={g.uploadBtn} onPress={uploadPhoto}><Text style={g.uploadBtnTxt}>📷 Upload your photo</Text></TouchableOpacity>
            <View style={g.dPhotoFade} />
            <View style={g.dPhotoOverlay}>
              <Text style={g.dPremium}>✦ BUILT BY AURA</Text>
              <Text style={g.dName}>{profile.name || 'You'}</Text>
              {d.location ? <Text style={g.dLoc}>📍 {d.location}</Text> : null}
            </View>
          </View>
        )}

        {/* About */}
        <View style={g.dSection}>
          <Text style={g.dH}>About</Text>
          <Text style={g.dAbout}>👋 {d.bio}</Text>
        </View>

        {/* Life facts */}
        {(d.work || d.children || d.pets || d.income) ? (
          <View style={g.dSection}>
            <Text style={g.dH}>Life</Text>
            <View style={g.dTags}>
              {d.work ? <View style={g.dTag}><Text style={g.dTagTxt}>💼 {d.work}</Text></View> : null}
              {d.income ? <View style={g.dTag}><Text style={g.dTagTxt}>💵 {d.income}</Text></View> : null}
              {d.children ? <View style={g.dTag}><Text style={g.dTagTxt}>👶 {d.children}</Text></View> : null}
              {d.pets ? <View style={g.dTag}><Text style={g.dTagTxt}>🐾 {d.pets}</Text></View> : null}
            </View>
          </View>
        ) : null}

        {/* Connection style */}
        <View style={g.dSection}>
          <Text style={g.dH}>Your connection style</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={g.styleCard}><Text style={g.styleLbl}>LOVE LANGUAGE</Text><Text style={g.styleVal}>💝 {d.loveLanguage}</Text></View>
            <View style={g.styleCard}><Text style={g.styleLbl}>ATTACHMENT</Text><Text style={g.styleVal}>🔗 {d.attachment}</Text></View>
          </View>
        </View>

        {/* What you need */}
        <View style={g.dSection}>
          <Text style={g.dH}>What you need in love</Text>
          <View style={g.dTags}>
            {d.relationshipValues.map(v => <View key={v} style={[g.dTag, { borderColor: '#7B6EF660' }]}><Text style={[g.dTagTxt, { color: '#A89BFA' }]}>{v}</Text></View>)}
          </View>
          <Text style={[g.dAbout, { marginTop: 12 }]}>💭 {d.lookingFor}</Text>
          {d.idealPartner ? <Text style={[g.dAbout, { marginTop: 8 }]}>✨ Ideal partner: {d.idealPartner}</Text> : null}
        </View>

        {/* Intimacy — private, AI-handled */}
        {d.intimacy ? (
          <View style={g.dSection}>
            <View style={g.intimacyCard}>
              <Text style={g.intimacyLbl}>🔒 INTIMACY · PRIVATE · AURA HANDLES THIS</Text>
              <Text style={g.intimacyTxt}>{d.intimacy}</Text>
              <Text style={g.intimacyNote}>Only shared by your Soma with a match's Soma when there's real compatibility — never shown publicly. You never have to bring it up.</Text>
            </View>
          </View>
        ) : null}

        {/* Interests (auto-pulled) */}
        <View style={g.dSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={g.dH}>Interests</Text>
            <Text style={g.autoTag}>auto-updated</Text>
          </View>
          {interests.length ? (
            <View style={g.dTags}>{interests.map(i => <View key={i} style={g.dTag}><Text style={g.dTagTxt}>{i}</Text></View>)}</View>
          ) : (
            <Text style={g.dAbout}>Talk to Soma about your hobbies — they appear here automatically.</Text>
          )}
        </View>

        {/* Auto-update note */}
        <View style={g.dSection}>
          <View style={g.autoCard}>
            <Text style={g.autoCardTxt}>✦  Your profile updates automatically as you talk to Soma every day. The more you share, the truer it becomes.</Text>
            <Text style={g.autoCardDate}>Last updated {d.lastUpdated}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ── DATING ─────────────────────────────────────────────────
type AgentTurn = { agent: 'A' | 'B'; text: string }
interface Candidate {
  name: string; age: number; emoji: string; color: string; photo: string
  location: string; distance: string; height: string; weight: string
  bio: string; values: string[]; interests: string[]; agentName: string
  loveLanguage: string; attachment: string; intimacy: string
  work: string; children: string; pets: string
  tags: { icon: string; label: string }[]
}

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`

const CANDIDATES: Candidate[] = [
  { name: 'Mai', age: 27, emoji: '🌿', color: '#F6A86E', photo: U('1494790108377-be9c29b29330'), location: 'USA, California', distance: '2.5 km', height: '168 cm', weight: '54 kg',
    bio: 'Hi! Finally, after almost giving up, looking for something real. I love indie films, long hikes, and quiet cafés. Learning to paint.',
    values: ['Depth', 'Growth', 'Freedom'], interests: ['hiking', 'films', 'painting', 'coffee'], agentName: 'Lux',
    loveLanguage: 'Quality Time', attachment: 'Secure', intimacy: 'Values slow, emotionally present closeness over intensity.', work: 'Illustrator', children: 'Wants kids', pets: 'Has a cat',
    tags: [{icon:'👩',label:'Women'},{icon:'🎨',label:'Painter'},{icon:'🐈',label:'Have cat'},{icon:'🥾',label:'Hiking'},{icon:'🎬',label:'Indie films'}] },
  { name: 'Daniel', age: 30, emoji: '🎸', color: '#6ECFF6', photo: U('1500648767791-00dcc994a43e'), location: 'USA, New York', distance: '5.1 km', height: '182 cm', weight: '78 kg',
    bio: 'Musician by night, software engineer by day. Big on deep talks, live shows, and questionable puns. Looking for a partner in curiosity.',
    values: ['Honesty', 'Creativity', 'Loyalty'], interests: ['music', 'coding', 'concerts', 'travel'], agentName: 'Echo',
    loveLanguage: 'Words of Affirmation', attachment: 'Secure', intimacy: 'Playful and communicative; loves feeling desired through words.', work: 'Software Engineer', children: 'Open to kids', pets: 'Dog person',
    tags: [{icon:'👨',label:'Men'},{icon:'🎸',label:'Musician'},{icon:'💻',label:'Engineer'},{icon:'🎫',label:'Concerts'},{icon:'✈️',label:'Travel'}] },
  { name: 'Sofia', age: 26, emoji: '📚', color: '#A89BFA', photo: U('1438761681033-6461ffad8d80'), location: 'USA, Oregon', distance: '8.0 km', height: '165 cm', weight: '52 kg',
    bio: 'Bookworm, morning runner, and amateur chef. I want someone to slow down with — cook dinner, talk for hours, watch the rain.',
    values: ['Calm', 'Depth', 'Kindness'], interests: ['reading', 'running', 'cooking', 'nature'], agentName: 'Vera',
    loveLanguage: 'Acts of Service', attachment: 'Anxious', intimacy: 'Needs reassurance and tenderness; closeness builds her trust.', work: 'Teacher', children: 'Wants kids', pets: 'Has a dog',
    tags: [{icon:'👩',label:'Women'},{icon:'📚',label:'Reader'},{icon:'🏃',label:'Runner'},{icon:'🍳',label:'Cooking'},{icon:'🌿',label:'Nature'}] },
  { name: 'Leo', age: 29, emoji: '🏔', color: '#6EF6A8', photo: U('1507003211169-0a1dd7228f2d'), location: 'USA, Colorado', distance: '12 km', height: '186 cm', weight: '80 kg',
    bio: 'Climber, photographer, and full-time adventurer. Happiest on a mountain or planning the next trip. Seeking someone who says yes to spontaneity.',
    values: ['Adventure', 'Freedom', 'Growth'], interests: ['climbing', 'photography', 'travel', 'camping'], agentName: 'Atlas',
    loveLanguage: 'Physical Touch', attachment: 'Avoidant', intimacy: 'Craves physical connection but needs space and no pressure.', work: 'Photographer', children: 'Not sure yet', pets: 'No pets',
    tags: [{icon:'👨',label:'Men'},{icon:'🧗',label:'Climber'},{icon:'📷',label:'Photographer'},{icon:'⛺',label:'Camping'},{icon:'🌍',label:'Travel'}] },
  { name: 'Aisha', age: 28, emoji: '🎨', color: '#F66E8E', photo: U('1534528741775-53994a69daeb'), location: 'USA, California', distance: '3.4 km', height: '170 cm', weight: '56 kg',
    bio: 'Designer who paints, dances, and overthinks everything beautifully. Looking for genuine connection and someone who notices the small things.',
    values: ['Authenticity', 'Depth', 'Joy'], interests: ['art', 'dancing', 'design', 'museums'], agentName: 'Iris',
    loveLanguage: 'Quality Time', attachment: 'Secure', intimacy: 'Sees intimacy as deep play and trust; open and expressive.', work: 'Product Designer', children: 'Wants kids someday', pets: 'Has a dog',
    tags: [{icon:'👩',label:'Women'},{icon:'🩰',label:'Dancer'},{icon:'🎨',label:'Designer'},{icon:'🖼',label:'Museums'},{icon:'💃',label:'Dancing'}] },
]

// Love languages + attachment reference
const LOVE_LANGUAGES = ['Words of Affirmation', 'Quality Time', 'Acts of Service', 'Physical Touch', 'Receiving Gifts']
const ATTACHMENT_STYLES = ['Secure', 'Anxious', 'Avoidant', 'Disorganized']

// Attachment compatibility matrix (0..1) — based on attachment theory
function attachmentFit(a: string, b: string): number {
  const M: Record<string, Record<string, number>> = {
    Secure:       { Secure: 1.0, Anxious: 0.85, Avoidant: 0.8,  Disorganized: 0.7 },
    Anxious:      { Secure: 0.85, Anxious: 0.6,  Avoidant: 0.4,  Disorganized: 0.5 },
    Avoidant:     { Secure: 0.8,  Anxious: 0.4,  Avoidant: 0.5,  Disorganized: 0.45 },
    Disorganized: { Secure: 0.7,  Anxious: 0.5,  Avoidant: 0.45, Disorganized: 0.4 },
  }
  return M[a]?.[b] ?? 0.65
}
// Love language compatibility (0..1)
function loveFit(a: string, b: string): number {
  if (!a || !b) return 0.7
  if (a === b) return 1.0                       // speak the same language
  // touch+words and time+service are common complements
  const complements = [['Physical Touch','Words of Affirmation'], ['Quality Time','Acts of Service']]
  if (complements.some(([x,y]) => (a===x&&b===y)||(a===y&&b===x))) return 0.85
  return 0.7
}

// Compute real two-sided alignment: interests + psychology
function alignmentScore(profile: UserProfile, c: Candidate): {
  score: number; shared: string[]; psych: { attach: number; love: number; note: string }
} {
  const userText = profile.memories.map(m => m.content.toLowerCase()).join(' ')
  const candTerms = [...c.interests, ...c.values.map(v => v.toLowerCase())]
  const shared: string[] = []
  let hits = 0
  candTerms.forEach(term => {
    const t = term.toLowerCase()
    if (userText.includes(t) || userText.includes(t.slice(0, 4))) {
      hits++; if (!shared.includes(term)) shared.push(term)
    }
  })
  const overlap = candTerms.length ? hits / candTerms.length : 0

  // Psychology — only if the user built their dating profile
  const d = profile.dating
  const hasPsych = d.complete && d.attachment && d.loveLanguage
  const attach = hasPsych ? attachmentFit(d.attachment, c.attachment) : 0.72
  const love   = hasPsych ? loveFit(d.loveLanguage, c.loveLanguage) : 0.72

  let note = ''
  if (hasPsych) {
    const aGood = attach >= 0.8, lGood = love >= 0.85
    if (aGood && lGood) note = `Your ${d.attachment} + their ${c.attachment} attachment fit beautifully, and you both value ${d.loveLanguage === c.loveLanguage ? d.loveLanguage.toLowerCase() : 'complementary love languages'}.`
    else if (aGood) note = `Your attachment styles (${d.attachment} + ${c.attachment}) balance each other well.`
    else if (attach < 0.5) note = `Heads up: ${d.attachment} + ${c.attachment} can be a challenging pairing — worth going slow.`
    else note = `Different love languages (${d.loveLanguage} vs ${c.loveLanguage}) — workable with awareness.`
  }

  // Blend: interests 35% · attachment 30% · love language 20% · base 15%
  let score = Math.round((0.15 + overlap * 0.35 + attach * 0.30 + love * 0.20) * 100)
  score = Math.max(55, Math.min(98, score))
  return { score, shared, psych: { attach, love, note } }
}

// Categories for Meet New People
const MEET_CATEGORIES = [
  { id: 'romantic', icon: '💕', title: 'Romantic', subtitle: 'Serious partners, casual dating, long-term', color: '#F6379B', count: '6.3K' },
  { id: 'friends', icon: '🤝', title: 'Friends', subtitle: 'New friends, activity buddies, community', color: '#6EF6A8', count: '8.8K' },
  { id: 'professional', icon: '💼', title: 'Professional', subtitle: 'Work collaborators, mentors, peers', color: '#6ECFF6', count: '4.2K' },
  { id: 'support', icon: '🧠', title: 'Support', subtitle: 'Coaches, accountability, guidance', color: '#F6A86E', count: '3.1K' },
  { id: 'purpose', icon: '🎯', title: 'Purpose-Driven', subtitle: 'Mission-aligned, impact partners', color: '#A89BFA', count: '2.4K' }
]

function MeetPeople({ profile, onBack, onMyProfile }: { profile: UserProfile; onBack: () => void; onMyProfile: () => void }) {
  // Extract dating profile from Soma conversations (automatic from daily chats)
  const extractedValues = profile.memories.filter(m => m.domain === 'relationship').map(m => m.content)
  const extractedInterests = profile.memories.filter(m => m.domain === 'hobby').map(m => m.content)
  const extractedPurpose = profile.memories.filter(m => m.domain === 'purpose').map(m => m.content)

  const [step, setStep] = useState<'build-profile' | 'category' | 'browse' | 'matched' | 'chat' | 'conversation' | 'report'>('build-profile')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [browseTab, setBrowseTab] = useState<'for-you' | 'nearby'>('for-you')
  const [userLocation] = useState({ lat: 34.0522, lng: -118.2437 }) // Mock LA location
  const [index, setIndex] = useState(0)
  const [liked, setLiked] = useState<Candidate[]>([])
  const [likesLeft, setLikesLeft] = useState(DB.likesLeft())
  const [showPaywall, setShowPaywall] = useState(false)
  const [chatMsgs, setChatMsgs] = useState<Msg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatRef = useRef<ScrollView>(null)
  const [turns, setTurns] = useState<AgentTurn[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [report, setReport] = useState<{ score: string; why: string; date: string; activities: string; intimacy?: string } | null>(null)
  const [relationshipType, setRelationshipType] = useState<'romantic' | 'friend'>('romantic')
  const scrollRef = useRef<ScrollView>(null)

  // Rank candidates by REAL alignment with the user's memories (best first)
  const ranked = [...CANDIDATES]
    .map(c => ({ c, ...alignmentScore(profile, c) }))
    .sort((a, b) => b.score - a.score)
  const candidate = liked[liked.length - 1] ?? ranked[0].c

  // My agent name = Soma. Their agent = Lux.
  const myInterests = profile.memories.filter(m => m.domain === 'hobby').map(m => m.content).join(', ') || 'still discovering their interests'
  const myValues    = profile.memories.filter(m => m.domain === 'purpose' || m.domain === 'mind').map(m => m.content).join(', ') || 'thoughtful and curious'
  const myRel       = profile.memories.filter(m => m.domain === 'relationship').map(m => m.content).join(', ')

  const fallbackTurns = (): AgentTurn[] => [
    { agent: 'A', text: `Hi Lux. I represent ${profile.name || 'my person'}. They're thoughtful, value depth, and love the outdoors. What's Mai like?` },
    { agent: 'B', text: `Lovely to meet you, Soma. Mai is warm and curious — she hikes most weekends and is learning to paint. Depth matters to her too.` },
    { agent: 'A', text: `That's a beautiful overlap. ${profile.name || 'My person'} also gravitates toward quiet, meaningful time over big crowds.` },
    { agent: 'B', text: `Then they'd get along well. Mai prefers a calm café and a good conversation over anything loud. Shall we find them a first date?` },
    { agent: 'A', text: `Yes. Something outdoors and gentle — a place where conversation can breathe. I think they'd genuinely enjoy each other.` },
  ]

  const fallbackReport = () => ({ score: '85%', why: 'You both value depth and quiet adventure, and share a love of the outdoors.', date: 'A sunset hike on an easy trail, ending with coffee at a small café to talk.', activities: 'A weekend hike, visiting an art exhibit together', intimacy: 'Your Auras noted you both value emotionally present, unhurried closeness — a gentle, trusting fit.' })

  const runMatch = async () => {
    setStep('conversation'); setTurns([]); setVisibleCount(0)

    // 1) Generate the AI-to-AI conversation
    const convoRaw = await groq([{ role: 'user', content:
`Write a short conversation between two AI agents who represent two people deciding if their humans should date.

AGENT A is "Soma", representing ${profile.name || 'a thoughtful person'} — interests: ${myInterests}; values: ${myValues}; ${myRel ? `relationships: ${myRel}` : ''}.
AGENT B is "Lux", representing ${candidate.name} — bio: ${candidate.bio}; values: ${candidate.values.join(', ')}; interests: ${candidate.interests.join(', ')}.

They warmly compare their humans, find common ground, and agree they'd be a good match. 5 to 6 short turns, alternating A then B. Each turn 1-2 sentences, natural and warm.

Return ONLY a JSON array:
[{"agent":"A","text":"..."},{"agent":"B","text":"..."}]
JSON only:` }], 'You write warm, natural dialogue between two matchmaker AI agents. Return only a JSON array.', 600)

    let parsed: AgentTurn[] = fallbackTurns()
    try { const m = convoRaw.match(/\[[\s\S]*\]/); if (m) { const p = JSON.parse(m[0]); if (Array.isArray(p) && p.length) parsed = p } } catch {}
    setTurns(parsed)

    // 2) Reveal turns one by one (typewriter feel)
    parsed.forEach((_, i) => {
      setTimeout(() => {
        setVisibleCount(i + 1)
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
      }, i * 1600)
    })

    // 3) After conversation, generate report — incl. private intimacy compatibility
    const d = profile.dating
    const myIntimacy = d.intimacy || 'values emotional closeness and trust'
    const myLove = d.loveLanguage || 'Quality Time'
    const myAttach = d.attachment || 'Secure'
    const totalDelay = parsed.length * 1600 + 800
    setTimeout(async () => {
      const raw = await groq([{ role: 'user', content:
`Two people matched. Their AI agents privately compared notes including intimacy. Return ONLY JSON.

PERSON A: interests ${myInterests}; values ${myValues}; love language ${myLove}; attachment ${myAttach}; intimacy notes (PRIVATE): "${myIntimacy}"
PERSON B (${candidate.name}): ${candidate.bio}; values ${candidate.values.join(', ')}; love language ${candidate.loveLanguage}; attachment ${candidate.attachment}; intimacy notes (PRIVATE): "${candidate.intimacy}"

Return:
{
 "score":"compatibility % like 87%",
 "why":"2 sentences on emotional + psychological fit",
 "date":"one specific ideal first date",
 "activities":"2 activities comma separated",
 "intimacy":"one discreet, respectful sentence on how their intimacy needs align — phrased tastefully, the agents handled this so neither human had to bring it up"
}
JSON only:` }], 'You are a thoughtful, discreet matchmaker AI. Return only JSON.', 400)
      try { const m = raw.match(/\{[\s\S]*\}/); setReport(m ? JSON.parse(m[0]) : fallbackReport()) } catch { setReport(fallbackReport()) }
      setStep('report')
    }, totalDelay)
  }

  const current = ranked[index].c
  const currentScore = ranked[index].score
  const currentShared = ranked[index].shared
  const currentPsych = ranked[index].psych
  const pass = () => { if (index < ranked.length - 1) setIndex(index + 1); else setIndex(0) }

  const like = () => {
    // Daily like limit
    if (DB.likesLeft() <= 0) { setShowPaywall(true); return }
    DB.useLike()
    setLikesLeft(DB.likesLeft())
    setLiked([...liked, ranked[index].c])
    // ✨ Immediate match! AI agents start talking right away
    analytics.track('match_created', { with: ranked[index].c.name })
    setStep('matched')
    // Auto-start the matching conversation immediately
    setTimeout(() => runMatch(), 100)
  }

  const connId = () => `conn_${candidate.name}_${candidate.age}`

  // Start the instant conversation the moment it's a mutual match
  const startInstantChat = async () => {
    // Add to Circle with chosen relationship type
    const circleId = `circle_${candidate.name}_${Date.now()}`
    const bio = candidate.interests.slice(0, 2).join(', ')
    DB.addCircle(candidate.name, relationshipType, bio)

    setStep('chat'); setChatLoading(true)
    setChatMsgs([])
    const persona = `You ARE ${candidate.name}, age ${candidate.age}, ${candidate.bio} You value ${candidate.values.join(', ')} and love ${candidate.interests.join(', ')}. You just matched with ${profile.name || 'someone'} on SOMA. Send a warm, natural opening message to start the conversation — 1-2 sentences, like a real person texting, reference something to spark a chat. Just the message, no quotes.`
    const opener = await groq([{ role: 'user', content: 'Send your first message' }], persona, 120)
    const first = opener || `Hey ${profile.name || 'there'}! So glad we matched 😊 What's been the best part of your week?`
    setChatMsgs([{ role: 'assistant' as const, content: first }])
    DB.messageCircle(circleId, first, false)
    setChatLoading(false)
  }

  const sendChat = async (text: string) => {
    if (!text.trim() || chatLoading) return
    const updated = [...chatMsgs, { role: 'user' as const, content: text.trim() }]
    setChatMsgs(updated); setChatInput(''); setChatLoading(true)
    DB.saveChat(connId(), updated)
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100)
    const persona = `You ARE ${candidate.name}, age ${candidate.age}, ${candidate.bio} You value ${candidate.values.join(', ')} and love ${candidate.interests.join(', ')}. You are texting your new match ${profile.name || 'them'} on SOMA. Reply warmly and naturally like a real person — 1-2 sentences, curious, a little flirty, ask questions back. Just your reply.`
    const reply = await groq(updated.map(m => ({ role: m.role, content: m.content })), persona, 120)
    const final = [...updated, { role: 'assistant' as const, content: reply || 'Haha I love that. Tell me more!' }]
    setChatMsgs(final); setChatLoading(false)
    DB.saveChat(connId(), final)
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100)
  }

  // ── BROWSE: cinematic profile (own layout, full bleed) ──
  // Build Profile Screen - Show what Soma has learned from daily conversations
  if (step === 'build-profile') {
    return (
      <ScrollView style={g.screen} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }}>
        <View style={{ marginBottom: 24 }}>
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 16 }}>
            <Text style={g.backLink}>← Back</Text>
          </TouchableOpacity>
          <Text style={g.greeting}>Your Dating Profile</Text>
          <Text style={g.auraSub} style={{ marginTop: 8 }}>Built from your conversations with Soma</Text>
        </View>

        {/* Profile Summary - Built from conversations */}
        <View style={[g.matchCard, { marginBottom: 24 }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#9B9AA6', letterSpacing: 1, marginBottom: 12 }}>ABOUT YOU</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#F5F4F0', marginBottom: 12 }}>
            {profile.name || 'Your Dating Profile'}
          </Text>
          <Text style={{ fontSize: 14, color: '#9B9AA6', lineHeight: 22 }}>
            {extractedValues.length > 0
              ? `Looking for: ${extractedValues.slice(0, 2).join(' • ')}`
              : '💭 Talk to Soma about what you\'re looking for'}
          </Text>
        </View>

        {/* Values from conversations */}
        {extractedValues.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#F5F4F0', marginBottom: 12 }}>💭 Your Values</Text>
            <View style={{ gap: 10 }}>
              {extractedValues.map((v, i) => (
                <View key={i} style={[g.lbCard, { borderLeftColor: '#7B6EF6' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[g.lbDot, { backgroundColor: '#7B6EF6' }]} />
                    <Text style={g.lbItemTxt}>{v}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interests from conversations */}
        {extractedInterests.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#F5F4F0', marginBottom: 12 }}>🎨 Your Interests</Text>
            <View style={{ gap: 10 }}>
              {extractedInterests.map((interest, i) => (
                <View key={i} style={[g.dTag, { borderColor: '#7B6EF650' }]}>
                  <Text style={g.dTagTxt}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Purpose/Goals */}
        {extractedPurpose.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#F5F4F0', marginBottom: 12 }}>🎯 Your Purpose</Text>
            <View style={[g.matchCard]}>
              <Text style={{ fontSize: 14, color: '#9B9AA6', lineHeight: 22 }}>
                {extractedPurpose.slice(0, 2).join(' • ')}
              </Text>
            </View>
          </View>
        )}

        {/* Info callout */}
        {(extractedValues.length === 0 || extractedInterests.length === 0) && (
          <View style={{ backgroundColor: '#7B6EF615', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7B6EF650', marginBottom: 24 }}>
            <Text style={{ fontSize: 13, color: '#7B6EF6', fontWeight: '600' }}>
              💡 Tip: Talk to Soma every day about your life. The more you share, the better your dating matches will be!
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ gap: 12 }}>
          <PressButton
            onPress={() => setStep('category')}
            style={g.primaryBtn}
          >
            <Text style={g.primaryBtnTxt}>✦  Continue to Explore</Text>
          </PressButton>
          <PressButton
            onPress={() => go('aura')}
            style={g.secondaryBtn}
          >
            <Text style={g.secondaryBtnTxt}>💬  Chat with Soma First</Text>
          </PressButton>
        </View>
      </ScrollView>
    )
  }

  // Category Selection Screen
  if (step === 'category') {
    return (
      <ScrollView style={g.screen} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 }}>
        <View style={{ marginBottom: 24 }}>
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 16 }}>
            <Text style={g.backLink}>← Back</Text>
          </TouchableOpacity>
          <Text style={g.greeting}>Explore</Text>
          <Text style={g.auraSub} style={{ marginTop: 8 }}>Find people aligned with your goals and values</Text>
        </View>

        {/* Featured Category */}
        <PressButton
          onPress={() => { setSelectedCategory('romantic'); setStep('browse') }}
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: 20,
            ...shadowMd
          }}
        >
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop' }}
            style={{ height: 200, justifyContent: 'flex-end', padding: 16 }}
            imageStyle={{ resizeMode: 'cover' }}
          >
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
            <View style={{ position: 'relative', zIndex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Text style={{ fontSize: 28, fontWeight: '700', color: '#fff', flex: 1 }}>💕 Serious Daters</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>6.3K</Text>
                </View>
              </View>
              <Text style={{ color: '#E0E0E0', fontSize: 14 }}>Goal-driven dating · Find serious partners</Text>
            </View>
          </ImageBackground>
        </PressButton>

        {/* Other Categories Grid */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#9B9AA6', marginBottom: 12, marginTop: 8 }}>More ways to connect</Text>

        <View style={{ gap: 12 }}>
          {MEET_CATEGORIES.slice(1).map(cat => (
            <PressButton
              key={cat.id}
              onPress={() => { setSelectedCategory(cat.id); setStep('browse') }}
              style={{
                borderRadius: 18,
                padding: 16,
                backgroundColor: cat.color + '15',
                borderWidth: 1.5,
                borderColor: cat.color + '40',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                ...shadowSm
              }}
            >
              <Text style={{ fontSize: 40 }}>{cat.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#F5F4F0' }}>{cat.title}</Text>
                <Text style={{ fontSize: 13, color: '#9B9AA6', marginTop: 2 }}>{cat.subtitle}</Text>
              </View>
              <View style={{ backgroundColor: cat.color + '30', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: cat.color }}>{cat.count}</Text>
              </View>
            </PressButton>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    )
  }

  if (step === 'browse') {
    // Filter candidates based on tab
    const filteredRanked = browseTab === 'nearby'
      ? [...CANDIDATES]
          .filter(c => {
            // Mock distance calculation (would use real geolocation in production)
            const distance = Math.sqrt(Math.pow(c.lat - userLocation.lat, 2) + Math.pow(c.lng - userLocation.lng, 2)) * 111 // km
            return distance < 25 // Within 25km
          })
          .map(c => ({ c, ...alignmentScore(profile, c) }))
          .sort((a, b) => a.score - b.score) // Sort by distance (ascending)
      : [...CANDIDATES]
          .map(c => ({ c, ...alignmentScore(profile, c) }))
          .sort((a, b) => b.score - a.score) // Sort by alignment (descending)

    const browseIndex = Math.min(index, filteredRanked.length - 1)
    const currentBrowse = filteredRanked[browseIndex]?.c
    const currentScore = filteredRanked[browseIndex]?.score

    return (
      <View style={g.screen}>
        {/* Top toggle bar */}
        <View style={g.dTop}>
          <TouchableOpacity style={g.dBack} onPress={onBack}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
          <View style={g.dToggle}>
            <PressButton
              onPress={() => setBrowseTab('for-you')}
              style={browseTab === 'for-you' ? g.dTogActive : { flex: 1 }}
            >
              <Text style={browseTab === 'for-you' ? g.dTogActiveTxt : g.dTogTxt}>FOR YOU</Text>
            </PressButton>
            <PressButton
              onPress={() => setBrowseTab('nearby')}
              style={browseTab === 'nearby' ? g.dTogActive : { flex: 1 }}
            >
              <Text style={browseTab === 'nearby' ? g.dTogActiveTxt : g.dTogTxt}>📍 NEARBY</Text>
            </PressButton>
          </View>
          <TouchableOpacity style={g.dMe} onPress={() => setStep('profile')}><Text style={g.dMeTxt}>Me</Text></TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Full-bleed real photo */}
          <ImageBackground source={{ uri: current.photo }} style={g.dPhoto} imageStyle={{ resizeMode: 'cover' }}>
            <View style={[g.alignPill, g.alignPillFloat, { borderColor: current.color }]}>
              <Text style={[g.alignPillTxt, { color: current.color }]}>{currentScore}%</Text>
            </View>
            <View style={g.dPhotoFade} />
            <View style={g.dPhotoOverlay}>
              <Text style={g.dPremium}>★ PREMIUM</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                  <Text style={g.dName}>{current.name}</Text>
                  <Text style={g.dAge}>{current.age}</Text>
                </View>
                <Text style={g.dHeart}>♡</Text>
              </View>
              <Text style={g.dLoc}>📍 {current.location}</Text>
            </View>
          </ImageBackground>

          {/* Stat pills */}
          <View style={g.dPills}>
            <View style={g.dPill}><Text style={g.dPillTxt}>📍 {current.distance}</Text></View>
            <View style={g.dPill}><Text style={g.dPillTxt}>⚖️ {current.weight}</Text></View>
            <View style={g.dPill}><Text style={g.dPillTxt}>📏 {current.height}</Text></View>
          </View>

          {/* About */}
          <View style={g.dSection}>
            <Text style={g.dH}>About</Text>
            <Text style={g.dAbout}>👋 {current.bio}</Text>
          </View>

          {/* Life facts */}
          <View style={g.dSection}>
            <Text style={g.dH}>Life</Text>
            <View style={g.dTags}>
              <View style={g.dTag}><Text style={g.dTagTxt}>💼 {current.work}</Text></View>
              <View style={g.dTag}><Text style={g.dTagTxt}>👶 {current.children}</Text></View>
              <View style={g.dTag}><Text style={g.dTagTxt}>🐾 {current.pets}</Text></View>
            </View>
            {(() => {
              const mine = (profile.dating.children || '').toLowerCase()
              const theirs = (current.children || '').toLowerCase()
              const iWant = mine.includes('want') && !mine.includes("don't") && !mine.includes('not')
              const iDont = mine.includes("don't") || mine.includes('not')
              const theyWant = theirs.includes('want') && !theirs.includes('not')
              const theyDont = theirs.includes("don't") || theirs.includes('not')
              if ((iWant && theyDont) || (iDont && theyWant)) {
                return <Text style={g.dealbreak}>⚠ Heads up: you and {current.name} seem to differ on children — worth talking about early.</Text>
              }
              if (iWant && theyWant) {
                return <Text style={g.dealgood}>✓ You both want children — aligned on family.</Text>
              }
              return null
            })()}
          </View>

          {/* Why Soma matched (real) */}
          <View style={[g.dSection, { marginTop: 4 }]}>
            <View style={g.dWhy}>
              <Text style={g.dWhyLbl}>✦  WHY AURA MATCHED YOU · {currentScore}%</Text>
              <Text style={g.dWhyTxt}>
                {currentShared.length > 0
                  ? `You both connect on ${currentShared.slice(0, 4).join(', ')}.`
                  : 'Talk to Soma about your hobbies and values — matches get sharper the more she knows you.'}
              </Text>
              {currentPsych.note ? (
                <View style={g.psychRow}>
                  <Text style={g.psychPill}>🔗 attachment {Math.round(currentPsych.attach * 100)}%</Text>
                  <Text style={g.psychPill}>💝 love lang {Math.round(currentPsych.love * 100)}%</Text>
                </View>
              ) : null}
              {currentPsych.note ? <Text style={g.psychNote}>{currentPsych.note}</Text> : null}
            </View>
          </View>

          {/* Connection style — love language + attachment */}
          <View style={g.dSection}>
            <Text style={g.dH}>Connection style</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={g.styleCard}>
                <Text style={g.styleLbl}>LOVE LANGUAGE</Text>
                <Text style={g.styleVal}>💝 {current.loveLanguage}</Text>
              </View>
              <View style={g.styleCard}>
                <Text style={g.styleLbl}>ATTACHMENT</Text>
                <Text style={g.styleVal}>🔗 {current.attachment}</Text>
              </View>
            </View>
          </View>

          {/* More info tags */}
          <View style={g.dSection}>
            <Text style={g.dH}>More info</Text>
            <View style={g.dTags}>
              {current.tags.map(t => (
                <View key={t.label} style={g.dTag}><Text style={g.dTagTxt}>{t.icon} {t.label}</Text></View>
              ))}
              {current.values.map(v => (
                <View key={v} style={[g.dTag, { borderColor: current.color + '60' }]}><Text style={[g.dTagTxt, { color: current.color }]}>{v}</Text></View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Likes-left bar */}
        <View style={g.likesBar}>
          <Text style={g.likesTxt}>
            {profile.premium ? '★ Premium · ' : ''}♥ {likesLeft} like{likesLeft !== 1 ? 's' : ''} left today
          </Text>
          {!profile.premium && <TouchableOpacity onPress={() => setShowPaywall(true)}><Text style={g.likesUpgrade}>Get more →</Text></TouchableOpacity>}
        </View>

        {/* Bottom action bar - Simplified Like/Pass only */}
        <View style={[g.dActions, { paddingHorizontal: 20, justifyContent: 'center', gap: 12 }]}>
          <PressButton
            onPress={pass}
            style={{ flex: 1, height: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowMd }}
          >
            <Text style={{ fontSize: 24 }}>👋</Text>
          </PressButton>
          <PressButton
            onPress={like}
            style={{ flex: 1, height: 54, borderRadius: 27, backgroundColor: '#F6379B', alignItems: 'center', justifyContent: 'center', ...shadowMd }}
          >
            <Text style={{ fontSize: 24 }}>❤️</Text>
          </PressButton>
        </View>

        {/* Paywall */}
        {showPaywall && (
          <View style={g.paywall}>
            <View style={g.paywallCard}>
              <Text style={{ fontSize: 44 }}>★</Text>
              <Text style={g.paywallTitle}>You're out of likes today</Text>
              <Text style={g.paywallSub}>Free members get {FREE_DAILY_LIKES} likes a day. Go Premium for {PREMIUM_DAILY_LIKES} likes daily, see who liked you, and unlimited instant chats.</Text>
              <View style={g.paywallPrice}><Text style={g.paywallPriceTxt}>SOMA+ · $12/mo</Text></View>
              <TouchableOpacity style={g.paywallBtn} onPress={() => { DB.goPremium(); setLikesLeft(DB.likesLeft()); setShowPaywall(false) }}>
                <Text style={g.paywallBtnTxt}>★  Go Premium</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPaywall(false)}><Text style={g.ghostTxt}>Maybe tomorrow</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    )
  }

  // ── INSTANT CHAT (mutual match → conversation starts now) ──
  if (step === 'chat') {
    return (
      <KeyboardAvoidingView style={g.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={g.chatHeader}>
          <TouchableOpacity style={g.dBack} onPress={() => setStep('browse')}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
          <Image source={{ uri: candidate.photo }} style={g.chatAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={g.chatName}>{candidate.name}, {candidate.age}</Text>
            <Text style={g.chatStatus}>{chatLoading ? 'typing…' : '🟢 Matched just now'}</Text>
          </View>
          <TouchableOpacity onPress={() => { setStep('conversation'); setTurns([]); setVisibleCount(0); runMatch() }}>
            <Text style={g.chatAura}>✦</Text>
          </TouchableOpacity>
        </View>
        <View style={g.matchStrip}><Text style={g.matchStripTxt}>💜 You matched — say hi! The conversation started for you.</Text></View>
        <ScrollView ref={chatRef} style={{ flex: 1 }} contentContainerStyle={g.msgList} showsVerticalScrollIndicator={false}>
          {chatMsgs.map((m, i) => <Bubble key={i} msg={m} />)}
          {chatLoading && <Typing />}
        </ScrollView>
        <View style={g.inputBar}>
          <TextInput style={g.input} value={chatInput} onChangeText={setChatInput} placeholder={`Message ${candidate.name}...`} placeholderTextColor="#4A4A56" multiline />
          <TouchableOpacity style={[g.sendBtn, (!chatInput.trim() || chatLoading) && g.off]} onPress={() => sendChat(chatInput)} disabled={!chatInput.trim() || chatLoading}><Text style={g.sendIcon}>→</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <ScrollView ref={scrollRef} style={g.screen} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}><TouchableOpacity onPress={() => setStep('browse')}><Text style={g.backLink}>← Back</Text></TouchableOpacity></View>
      <Text style={g.logo}>Meet New People</Text>
      <Text style={g.logoSub}>Your AI meets their AI before you ever do.</Text>
      <View style={{ height: 20 }} />

      {/* MATCHED */}
      {step === 'matched' && (
        <>
          <View style={g.matchedBanner}>
            <Text style={{ fontSize: 40 }}>💜</Text>
            <Text style={g.matchedTitle}>It's a match!</Text>
            <Text style={g.matchedSub}>You and {candidate.name} liked each other.</Text>
          </View>

          {/* Choose relationship type */}
          <View style={g.matchCard}>
            <Text style={g.cardTag}>✦  WHAT KIND OF CONNECTION?</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={[g.typePill, relationshipType === 'romantic' && g.typePillActive]} onPress={() => setRelationshipType('romantic')}>
                <Text style={g.typePillTxt}>💕 Romantic</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[g.typePill, relationshipType === 'friend' && g.typePillActive]} onPress={() => setRelationshipType('friend')}>
                <Text style={g.typePillTxt}>🤝 Friend</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={g.primaryBtn} onPress={startInstantChat}>
            <Text style={g.primaryBtnTxt}>💬  Start chatting with {candidate.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={g.secondaryBtn} onPress={() => { setStep('conversation'); setTurns([]); setVisibleCount(0); runMatch() }}>
            <Text style={g.secondaryBtnTxt}>✦  Or let your Auras talk first</Text>
          </TouchableOpacity>
          <View style={{ height: 16 }} />
          <View style={g.matchCard}>
            <Image source={{ uri: candidate.photo }} style={g.matchPhoto} />
            <Text style={g.matchName}>{candidate.name}, {candidate.age}</Text>
            <Text style={g.matchBio}>{candidate.bio}</Text>
            <View style={g.valuesRow}>{candidate.values.map(v => <View key={v} style={g.valueChip}><Text style={g.valueChipTxt}>{v}</Text></View>)}</View>
          </View>
          <TouchableOpacity onPress={() => setStep('browse')}><Text style={g.ghostTxt}>Keep browsing</Text></TouchableOpacity>
        </>
      )}

      {(step === 'conversation' || step === 'report') && (
        <>
          {/* Two-agent header */}
          <View style={g.agentsHeader}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={[g.agentAv, { backgroundColor: '#7B6EF6' }]}><Text style={g.agentAvTxt}>✦</Text></View>
              <Text style={g.agentName}>Soma</Text>
              <Text style={g.agentFor}>for {profile.name || 'you'}</Text>
            </View>
            <Text style={g.agentVs}>↔</Text>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={[g.agentAv, { backgroundColor: '#F6A86E' }]}><Text style={g.agentAvTxt}>✦</Text></View>
              <Text style={g.agentName}>{candidate.agentName}</Text>
              <Text style={g.agentFor}>for {candidate.name}</Text>
            </View>
          </View>

          {/* Live conversation */}
          <View style={{ marginBottom: 16 }}>
            {turns.slice(0, visibleCount).map((t, i) => (
              <AgentBubble key={i} turn={t} self={t.agent === 'A'} />
            ))}
            {step === 'conversation' && visibleCount < turns.length && (
              <View style={[g.agentRow, turns[visibleCount]?.agent === 'A' ? g.bLeft : g.bRight]}>
                <View style={[g.agentBubble, turns[visibleCount]?.agent === 'A' ? g.agentBubbleA : g.agentBubbleB]}>
                  <Text style={g.agentTyping}>· · ·</Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}

      {step === 'report' && report && (
        <>
          <View style={g.scoreCard}>
            <Text style={g.scoreLabel}>OUR AURAS AGREE</Text>
            <Text style={g.scoreNum}>{report.score}</Text>
            <Text style={g.scoreWhy}>{report.why}</Text>
          </View>
          <View style={g.reportCard}><Text style={g.cardTag}>✦  YOUR IDEAL FIRST DATE</Text><Text style={g.reportDate}>{report.date}</Text></View>
          <View style={g.reportCard}><Text style={g.cardTag}>✦  THINGS TO DO TOGETHER</Text><Text style={g.reportAct}>{report.activities}</Text></View>
          {report.intimacy ? (
            <View style={g.intimacyReport}>
              <Text style={g.intimacyRLbl}>🔒  INTIMACY COMPATIBILITY · handled privately by your Auras</Text>
              <Text style={g.intimacyRTxt}>{report.intimacy}</Text>
              <Text style={g.intimacyRNote}>Neither of you had to bring this up. Your agents compared notes so the conversation could stay easy.</Text>
            </View>
          ) : null}
          <TouchableOpacity style={g.primaryBtn} onPress={() => { setStep('browse'); setReport(null); setTurns([]); setVisibleCount(0) }}><Text style={g.primaryBtnTxt}>💜  Send {candidate.name} a hello</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setStep('browse'); setReport(null); setTurns([]); setVisibleCount(0) }}><Text style={g.ghostTxt}>Meet more people</Text></TouchableOpacity>
        </>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  )
}

function AgentBubble({ turn, self }: { turn: AgentTurn; self: boolean }) {
  const fade = useRef(new Animated.Value(0)).current
  const rise = useRef(new Animated.Value(10)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start()
  }, [])
  return (
    <Animated.View style={[g.agentRow, self ? g.bLeft : g.bRight, { opacity: fade, transform: [{ translateY: rise }] }]}>
      <View style={[g.agentBubble, self ? g.agentBubbleA : g.agentBubbleB]}>
        <Text style={[g.agentLabel, { color: self ? '#7B6EF6' : '#F6A86E' }]}>{self ? '✦ Soma' : '✦ Lux'}</Text>
        <Text style={g.agentText}>{turn.text}</Text>
      </View>
    </Animated.View>
  )
}

// ── BUBBLES ────────────────────────────────────────────────
function Bubble({ msg }: { msg: Msg }) {
  const isAura = msg.role === 'assistant'
  const fade = useRef(new Animated.Value(0)).current
  const rise = useRef(new Animated.Value(8)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start()
  }, [])
  return (
    <Animated.View style={[g.bRow, isAura ? g.bLeft : g.bRight, { opacity: fade, transform: [{ translateY: rise }] }]}>
      {isAura && <View style={g.miniOrb}><Text style={{ fontSize: 9, color: '#fff' }}>✦</Text></View>}
      <View style={[g.bubble, isAura ? g.aBubble : g.uBubble]}>
        <Text style={[g.bTxt, !isAura && { color: '#F0EEFF' }]}>{msg.content}</Text>
      </View>
    </Animated.View>
  )
}
function Typing() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current]
  useEffect(() => { dots.forEach((d, i) => Animated.loop(Animated.sequence([
    Animated.delay(i * 160),
    Animated.timing(d, { toValue: 1, duration: 400, useNativeDriver: true }),
    Animated.timing(d, { toValue: 0.3, duration: 400, useNativeDriver: true }),
  ])).start()) }, [])
  return (
    <View style={[g.bRow, g.bLeft]}>
      <View style={g.miniOrb}><Text style={{ fontSize: 9, color: '#fff' }}>✦</Text></View>
      <View style={[g.bubble, g.aBubble, { flexDirection: 'row', gap: 6, paddingVertical: 16 }]}>
        {dots.map((d, i) => <Animated.View key={i} style={[g.tdot, { opacity: d }]} />)}
      </View>
    </View>
  )
}

// ════════════════════════════════════════════════════════════
//  CONNECTIONS — all your matches + resumable chats
// ════════════════════════════════════════════════════════════
function Connections({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef<ScrollView>(null)
  const conns = DB.get().connections
  const conn = conns.find(c => c.id === openId)

  const open = (c: Connection) => { setOpenId(c.id); setMsgs(c.messages) }
  const send = async (text: string) => {
    if (!text.trim() || loading || !conn) return
    const updated = [...msgs, { role: 'user' as const, content: text.trim() }]
    setMsgs(updated); setInput(''); setLoading(true); DB.saveChat(conn.id, updated)
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 100)
    const persona = `You ARE ${conn.name}, age ${conn.age}, ${conn.bio} Reply warmly and naturally like a real person texting your match ${profile.name || 'them'} on SOMA — 1-2 sentences, curious, a little flirty. Just your reply.`
    const reply = await groq(updated.map(m => ({ role: m.role, content: m.content })), persona, 120)
    const final = [...updated, { role: 'assistant' as const, content: reply || 'Tell me more 😊' }]
    setMsgs(final); setLoading(false); DB.saveChat(conn.id, final); onRefresh()
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 100)
  }

  if (conn) {
    return (
      <KeyboardAvoidingView style={g.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={g.chatHeader}>
          <TouchableOpacity style={g.dBack} onPress={() => setOpenId(null)}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
          <Image source={{ uri: conn.photo }} style={g.chatAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={g.chatName}>{conn.name}, {conn.age}</Text>
            <Text style={g.chatStatus}>{loading ? 'typing…' : `${conn.matchScore}% match`}</Text>
          </View>
        </View>
        <ScrollView ref={ref} style={{ flex: 1 }} contentContainerStyle={g.msgList} showsVerticalScrollIndicator={false}>
          {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
          {loading && <Typing />}
        </ScrollView>
        <View style={g.inputBar}>
          <TextInput style={g.input} value={input} onChangeText={setInput} placeholder={`Message ${conn.name}...`} placeholderTextColor="#4A4A56" multiline />
          <TouchableOpacity style={[g.sendBtn, (!input.trim() || loading) && g.off]} onPress={() => send(input)} disabled={!input.trim() || loading}><Text style={g.sendIcon}>→</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity></View>
      <Text style={g.logo}>Connections</Text>
      <Text style={g.logoSub}>Everyone you matched with. Conversations stay open.</Text>
      <View style={{ height: 16 }} />
      {conns.length === 0 ? (
        <View style={[g.centerWrap, { paddingTop: 60 }]}>
          <Text style={g.bigOrbIcon}>💜</Text>
          <Text style={[g.startSub, { marginTop: 20 }]}>No connections yet.{'\n'}Like someone in Dating to start chatting.</Text>
        </View>
      ) : conns.map(c => {
        const last = c.messages[c.messages.length - 1]
        return (
          <TouchableOpacity key={c.id} style={g.connRow} onPress={() => open(c)}>
            <Image source={{ uri: c.photo }} style={g.connAvatar} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={g.connName}>{c.name}, {c.age}</Text>
                <Text style={g.connScore}>{c.matchScore}%</Text>
              </View>
              <Text style={g.connLast} numberOfLines={1}>{last ? (last.role === 'user' ? 'You: ' : '') + last.content : 'Say hi!'}</Text>
            </View>
          </TouchableOpacity>
        )
      })}
      <View style={{ height: 60 }} />
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  WHO LIKED YOU — premium
// ════════════════════════════════════════════════════════════
function LikedYou({ profile, onBack, onUpgrade }: { profile: UserProfile; onBack: () => void; onUpgrade: () => void }) {
  const likers = CANDIDATES.filter(c => (profile.likedYou ?? []).includes(c.name))
  const list = likers.length ? likers : CANDIDATES.slice(0, 3)
  return (
    <ScrollView style={g.screen} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity></View>
      <Text style={g.logo}>Who Liked You</Text>
      <Text style={g.logoSub}>{list.length} people liked you first.</Text>
      <View style={{ height: 16 }} />
      <View style={g.likedGrid}>
        {list.map((c, i) => (
          <View key={c.name} style={g.likedCard}>
            <Image source={{ uri: c.photo }} style={[g.likedPhoto, !profile.premium && g.blurred]} blurRadius={profile.premium ? 0 : 18} />
            <View style={g.likedInfo}>
              <Text style={g.likedName}>{profile.premium ? `${c.name}, ${c.age}` : '••••, ••'}</Text>
            </View>
            {!profile.premium && <View style={g.likedLock}><Text style={{ fontSize: 22 }}>🔒</Text></View>}
          </View>
        ))}
      </View>
      {!profile.premium && (
        <View style={g.likedUpsell}>
          <Text style={g.likedUpsellTitle}>★ See who likes you</Text>
          <Text style={g.likedUpsellSub}>Premium reveals everyone who liked you, plus {PREMIUM_DAILY_LIKES} likes a day and unlimited chats.</Text>
          <TouchableOpacity style={g.paywallBtn} onPress={onUpgrade}><Text style={g.paywallBtnTxt}>★  Unlock with SOMA+</Text></TouchableOpacity>
        </View>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  DIARY HISTORY
// ════════════════════════════════════════════════════════════
function DiaryHistory({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  return (
    <ScrollView style={g.screen} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity></View>
      <Text style={g.logo}>Your Diary</Text>
      <Text style={g.logoSub}>{profile.diary.length} {profile.diary.length === 1 ? 'entry' : 'entries'} · your story over time.</Text>
      <View style={{ height: 16 }} />
      {profile.diary.length === 0 ? (
        <View style={[g.centerWrap, { paddingTop: 60 }]}>
          <Text style={g.bigOrbIcon}>📖</Text>
          <Text style={[g.startSub, { marginTop: 20 }]}>No diary entries yet.{'\n'}Reflect with Soma on the home screen.</Text>
        </View>
      ) : profile.diary.map(d => (
        <View key={d.id} style={g.diaryEntry}>
          <Text style={g.diaryEntryDate}>{d.date}</Text>
          <Text style={g.diaryEntryTxt}>{d.summary}</Text>
        </View>
      ))}
      <View style={{ height: 60 }} />
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  WEEKLY INSIGHTS — AI summary of your life
// ════════════════════════════════════════════════════════════
function Insights({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState<{ summary: string; themes: string[]; note: string; question: string } | null>(null)

  useEffect(() => {
    (async () => {
      const mem = profile.memories.slice(0, 25).map(m => `[${m.domain}] ${m.content}`).join('\n')
      const diary = profile.diary.slice(0, 7).map(d => d.summary).join('\n')
      if (!mem && !diary) { setLoading(false); return }
      const raw = await groq([{ role: 'user', content:
`Based on what you know about ${profile.name || 'this person'}, write a warm weekly insight. Return ONLY JSON.
MEMORIES:\n${mem || 'none'}
RECENT DIARY:\n${diary || 'none'}
{"summary":"2-3 sentence overview of where they are in life","themes":["theme1","theme2","theme3"],"note":"a personal, specific message from Soma under 60 words","question":"one reflective question to carry into next week"}
JSON only:` }], 'You are Soma writing a caring weekly reflection. Return only JSON.', 500)
      try { const m = raw.match(/\{[\s\S]*\}/); if (m) setInsight(JSON.parse(m[0])) } catch {}
      setLoading(false)
    })()
  }, [])

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity></View>
      <Text style={g.logo}>Weekly Insight</Text>
      <Text style={g.logoSub}>Soma's reflection on your week.</Text>
      <View style={{ height: 20 }} />
      {loading ? (
        <View style={[g.centerWrap, { paddingTop: 60 }]}>
          <View style={g.bigOrb}><Text style={g.bigOrbIcon}>✦</Text></View>
          <Text style={g.startSub}>Soma is reflecting on{'\n'}everything you've shared...</Text>
        </View>
      ) : !insight ? (
        <View style={[g.centerWrap, { paddingTop: 60 }]}>
          <Text style={g.bigOrbIcon}>✦</Text>
          <Text style={[g.startSub, { marginTop: 20 }]}>Not enough yet.{'\n'}Talk to Soma a few times to unlock insights.</Text>
        </View>
      ) : (
        <>
          <View style={g.insightHero}>
            <Text style={g.cardTag}>✦  THIS WEEK</Text>
            <Text style={g.insightSummary}>{insight.summary}</Text>
          </View>
          <Text style={g.secLabel}>YOU FOCUSED ON</Text>
          <View style={g.dTags}>{insight.themes.map(t => <View key={t} style={[g.dTag, { borderColor: '#7B6EF660' }]}><Text style={[g.dTagTxt, { color: '#A89BFA' }]}>{t}</Text></View>)}</View>
          <View style={[g.auraCard, { marginTop: 18 }]}>
            <Text style={g.cardTag}>✦  AURA'S NOTE TO YOU</Text>
            <Text style={g.insightNote}>{insight.note}</Text>
          </View>
          <View style={[g.insightHero, { marginTop: 14 }]}>
            <Text style={g.cardTag}>✦  CARRY THIS INTO NEXT WEEK</Text>
            <Text style={g.insightQ}>{insight.question}</Text>
          </View>
        </>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════════
function Settings({ profile, onBack, onRefresh, onReset }: { profile: UserProfile; onBack: () => void; onRefresh: () => void; onReset: () => void }) {
  const [aiName, setAiName] = useState(profile.aiName || 'Soma')
  const [tcName, setTcName] = useState(profile.trustedContact?.name || '')
  const [tcPhone, setTcPhone] = useState(profile.trustedContact?.phone || '')
  const saveAiName = () => { DB.setAiName(aiName); onRefresh() }
  const saveContact = () => { DB.setTrustedContact(tcName.trim(), tcPhone.trim()); onRefresh() }
  const changePipPhoto = () => pickPhoto(url => { DB.setAiPhoto(url); onRefresh() })
  const exportData = () => {
    try {
      const data = JSON.stringify(DB.get(), null, 2)
      if (typeof document !== 'undefined') {
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'soma-my-data.json'; a.click()
      }
    } catch {}
  }
  return (
    <ScrollView style={g.screen} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity></View>
      <Text style={g.logo}>Settings</Text>
      <Text style={g.logoSub}>{profile.name} · {profile.premium ? '★ Premium' : 'Free plan'}</Text>
      <View style={{ height: 20 }} />

      {/* Stats */}
      <View style={g.statsRow}>
        <View style={g.statBox}><Text style={g.statNum}>{profile.conversations}</Text><Text style={g.statLbl}>Sessions</Text></View>
        <View style={g.statBox}><Text style={g.statNum}>{profile.memories.length}</Text><Text style={g.statLbl}>Memories</Text></View>
        <View style={g.statBox}><Text style={g.statNum}>{profile.connections.length}</Text><Text style={g.statLbl}>Matches</Text></View>
        <View style={g.statBox}><Text style={g.statNum}>{profile.diary.length}</Text><Text style={g.statLbl}>Diary</Text></View>
      </View>

      <Text style={g.secLabel}>ACCOUNT</Text>
      {!profile.premium ? (
        <TouchableOpacity style={g.setRow} onPress={() => { DB.goPremium(); onRefresh() }}>
          <Text style={g.setIcon}>★</Text><Text style={g.setLabel}>Upgrade to SOMA+</Text><Text style={g.setArrow}>→</Text>
        </TouchableOpacity>
      ) : (
        <View style={g.setRow}><Text style={g.setIcon}>★</Text><Text style={g.setLabel}>SOMA+ Premium active</Text><Text style={[g.setArrow, { color: '#6EF6A8' }]}>✓</Text></View>
      )}
      <TouchableOpacity style={g.setRow} onPress={exportData}>
        <Text style={g.setIcon}>📦</Text><Text style={g.setLabel}>Export my data</Text><Text style={g.setArrow}>→</Text>
      </TouchableOpacity>

      {/* Customize companion */}
      <Text style={[g.secLabel, { marginTop: 20 }]}>YOUR COMPANION · 🐧</Text>
      <View style={g.contactSetup}>
        <Text style={g.contactSetupTxt}>Give your companion a name that feels close to you. Upload a photo that makes you feel connected.</Text>
        <TextInput style={g.contactInput} value={aiName} onChangeText={setAiName} placeholder="Name (e.g. Soma, Maya, Abuelo)" placeholderTextColor="#4A4A56" />
        <TouchableOpacity style={[g.contactSave, !aiName.trim() && g.off]} onPress={saveAiName} disabled={!aiName.trim()}>
          <Text style={g.contactSaveTxt}>{aiName !== profile.aiName ? '✓ Save name' : `${profile.aiName}'s name is set`}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={g.setRow} onPress={changePipPhoto}>
        {profile.aiPhoto ? <Image source={{ uri: profile.aiPhoto }} style={{ width: 28, height: 28, borderRadius: 14 }} /> : <Text style={g.setIcon}>🐧</Text>}
        <Text style={g.setLabel}>{profile.aiPhoto ? `Change ${profile.aiName}'s photo` : `Give ${profile.aiName} a face`}</Text>
        <Text style={g.setArrow}>→</Text>
      </TouchableOpacity>

      {/* Safety / trusted contact */}
      <Text style={[g.secLabel, { marginTop: 20 }]}>SAFETY · TRUSTED CONTACT 💜</Text>
      <View style={g.contactSetup}>
        <Text style={g.contactSetupTxt}>If you ever have a really hard moment, {profile.aiName} can help you reach this person in one tap.</Text>
        <TextInput style={g.contactInput} value={tcName} onChangeText={setTcName} placeholder="Their name (e.g. Mom, best friend)" placeholderTextColor="#4A4A56" />
        <TextInput style={g.contactInput} value={tcPhone} onChangeText={setTcPhone} placeholder="Their phone number" placeholderTextColor="#4A4A56" keyboardType="phone-pad" />
        <TouchableOpacity style={[g.contactSave, !(tcName.trim() && tcPhone.trim()) && g.off]} onPress={saveContact} disabled={!(tcName.trim() && tcPhone.trim())}>
          <Text style={g.contactSaveTxt}>{profile.trustedContact?.phone ? '✓ Update trusted contact' : 'Save trusted contact'}</Text>
        </TouchableOpacity>
        <Text style={g.crisisLine}>In a crisis right now? Call or text 988 (US) · findahelpline.com (worldwide)</Text>
      </View>

      <Text style={[g.secLabel, { marginTop: 20 }]}>PRIVACY</Text>
      <View style={g.privacyCard}>
        <Text style={g.privacyTxt}>🔒 Everything you share with Soma is stored only on this device. SOMA never sells your data. Your intimacy notes are shared only agent-to-agent with a real match.</Text>
      </View>

      <Text style={[g.secLabel, { marginTop: 20 }]}>DANGER ZONE</Text>
      <TouchableOpacity style={[g.setRow, { borderColor: '#F66E6E40' }]} onPress={onReset}>
        <Text style={g.setIcon}>🗑</Text><Text style={[g.setLabel, { color: '#F66E6E' }]}>Delete everything & restart</Text>
      </TouchableOpacity>

      <Text style={g.aboutTxt}>SOMA · Know yourself before knowing each other.{'\n'}v0.1 · Built with Soma</Text>
      <View style={{ height: 60 }} />
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  CRISIS SUPPORT — shown when someone is in a dark moment
// ════════════════════════════════════════════════════════════
function openLink(url: string) {
  try { if (typeof window !== 'undefined') window.location.href = url } catch {}
}

function CrisisSupport({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const [phase, setPhase] = useState('Breathe in')
  const scale = useRef(new Animated.Value(1)).current
  const fade = useRef(new Animated.Value(0)).current
  const tc = DB.get().trustedContact

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start()
    // 4-4-6 breathing loop
    const run = () => {
      setPhase('Breathe in')
      Animated.timing(scale, { toValue: 1.6, duration: 4000, useNativeDriver: true }).start(() => {
        setPhase('Hold')
        setTimeout(() => {
          setPhase('Breathe out')
          Animated.timing(scale, { toValue: 1, duration: 6000, useNativeDriver: true }).start(() => run())
        }, 2000)
      })
    }
    run()
  }, [])

  const reachContact = () => {
    if (tc.phone) {
      const msg = encodeURIComponent(`Hey ${tc.name || ''}, I'm having a really hard time right now and I could use someone to talk to. Can you call me?`)
      openLink(`sms:${tc.phone}?&body=${msg}`)
    }
  }

  return (
    <Animated.View style={[cs.wrap, { opacity: fade }]}>
      <ScrollView contentContainerStyle={cs.scroll} showsVerticalScrollIndicator={false}>
        <Text style={cs.heart}>🫶</Text>
        <Text style={cs.title}>You matter. Right now.</Text>
        <Text style={cs.lead}>
          I know it really hurts, and that moving feels impossible right now.
          You're still here — and that still matters. Let's get through the next
          few minutes together, slowly.
        </Text>

        {/* Breathing */}
        <View style={cs.breatheBox}>
          <Animated.View style={[cs.breatheCircle, { transform: [{ scale }] }]} />
          <Text style={cs.breathePhase}>{phase}</Text>
        </View>
        <Text style={cs.breatheHint}>Follow the circle. In through your nose, out through your mouth.</Text>

        {/* Immediate human help */}
        <Text style={cs.sectionLbl}>TALK TO SOMEONE NOW — IT HELPS</Text>
        <TouchableOpacity style={cs.helpBtn} onPress={() => openLink('tel:988')}>
          <Text style={cs.helpBtnTitle}>📞  Call 988</Text>
          <Text style={cs.helpBtnSub}>Suicide & Crisis Lifeline · free, 24/7 (US/Canada)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cs.helpBtn} onPress={() => openLink('sms:741741?&body=HOME')}>
          <Text style={cs.helpBtnTitle}>💬  Text HOME to 741741</Text>
          <Text style={cs.helpBtnSub}>Crisis Text Line · text with a real person</Text>
        </TouchableOpacity>
        <TouchableOpacity style={cs.helpBtn} onPress={() => openLink('https://findahelpline.com')}>
          <Text style={cs.helpBtnTitle}>🌍  Find help in your country</Text>
          <Text style={cs.helpBtnSub}>findahelpline.com · free human support worldwide</Text>
        </TouchableOpacity>

        {/* Trusted contact */}
        {tc.phone ? (
          <TouchableOpacity style={cs.contactBtn} onPress={reachContact}>
            <Text style={cs.contactTitle}>💜  Message {tc.name || 'your trusted person'}</Text>
            <Text style={cs.contactSub}>Opens a ready-to-send text asking them to call you</Text>
          </TouchableOpacity>
        ) : (
          <View style={cs.contactEmpty}>
            <Text style={cs.contactEmptyTxt}>Tip: add a trusted contact in Settings so {profile.aiName} can help you reach them instantly next time.</Text>
          </View>
        )}

        {/* Grounding */}
        <Text style={cs.sectionLbl}>GROUND YOURSELF · 5-4-3-2-1</Text>
        <View style={cs.groundCard}>
          {[
            ['5', 'things you can see'],
            ['4', 'things you can touch'],
            ['3', 'things you can hear'],
            ['2', 'things you can smell'],
            ['1', 'thing you can taste'],
          ].map(([n, t]) => (
            <View key={n} style={cs.groundRow}>
              <View style={cs.groundNum}><Text style={cs.groundNumTxt}>{n}</Text></View>
              <Text style={cs.groundTxt}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Gentle movement */}
        <Text style={cs.sectionLbl}>WHEN YOU'RE READY, A SMALL STEP</Text>
        <View style={cs.moveRow}>
          {['🚶 Walk outside', '💧 Drink water', '🧘 Stretch', '☀️ Open a window'].map(m => (
            <View key={m} style={cs.moveChip}><Text style={cs.moveTxt}>{m}</Text></View>
          ))}
        </View>

        <Text style={cs.hope}>
          This feeling is real, but it is not permanent. You've rebuilt before —
          a new country, a new start, alone — and you're still standing.
          Staying alive keeps the chance for a better life open. Please don't close it tonight.
        </Text>

        <TouchableOpacity style={cs.closeBtn} onPress={onClose}>
          <Text style={cs.closeTxt}>I'm okay to continue</Text>
        </TouchableOpacity>
        <Text style={cs.disclaimer}>{profile.aiName} is a supportive companion, not a substitute for emergency care. If you are in immediate danger, call your local emergency number.</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  )
}

const cs = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0A0A0F', zIndex: 100 },
  scroll: { padding: 24, paddingTop: 64, alignItems: 'center' },
  heart: { fontSize: 48, marginBottom: 12 },
  title: { color: '#F5F4F0', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  lead: { color: '#C8C6D0', fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 24 },
  breatheBox: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  breatheCircle: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#7B6EF6', opacity: 0.35 },
  breathePhase: { color: '#A89BFA', fontSize: 18, fontWeight: '700' },
  breatheHint: { color: '#9B9AA6', fontSize: 13, textAlign: 'center', marginBottom: 28 },
  sectionLbl: { color: '#9B9AA6', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, alignSelf: 'flex-start', marginTop: 20, marginBottom: 10 },
  helpBtn: { width: '100%', backgroundColor: '#141418', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#6EF6A840' },
  helpBtnTitle: { color: '#F5F4F0', fontSize: 16, fontWeight: '700' },
  helpBtnSub: { color: '#9B9AA6', fontSize: 12, marginTop: 4 },
  contactBtn: { width: '100%', backgroundColor: '#1A1428', borderRadius: 16, padding: 16, marginTop: 6, borderWidth: 1, borderColor: '#7B6EF660' },
  contactTitle: { color: '#F5F4F0', fontSize: 16, fontWeight: '700' },
  contactSub: { color: '#9B9AA6', fontSize: 12, marginTop: 4 },
  contactEmpty: { width: '100%', backgroundColor: '#141418', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2A2A35' },
  contactEmptyTxt: { color: '#9B9AA6', fontSize: 13, lineHeight: 20 },
  groundCard: { width: '100%', backgroundColor: '#141418', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2A2A35' },
  groundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  groundNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  groundNumTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  groundTxt: { color: '#F5F4F0', fontSize: 15 },
  moveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  moveChip: { backgroundColor: '#141418', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#2A2A35' },
  moveTxt: { color: '#F5F4F0', fontSize: 13, fontWeight: '600' },
  hope: { color: '#E8E6F0', fontSize: 15, lineHeight: 25, textAlign: 'center', marginTop: 26, fontStyle: 'italic' },
  closeBtn: { backgroundColor: '#7B6EF6', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, marginTop: 24 },
  closeTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: { color: '#6A6A76', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 18 },
})

// ── STYLES ─────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
// ANALYTICS - Event tracking
// ════════════════════════════════════════════════════════════
const analytics = {
  track: (event: string, properties?: Record<string, any>) => {
    const payload = { event, timestamp: new Date().toISOString(), userId: DB.get().id, ...properties }
    // Send to backend
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {}) // silent fail - don't interrupt user experience
  },
  error: (error: string, context?: string) => {
    const payload = { type: 'error', error, context, timestamp: new Date().toISOString(), userId: DB.get().id }
    fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/analytics/error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {})
  }
}

// ════════════════════════════════════════════════════════════
// PREMIUM DESIGN SYSTEM
// ════════════════════════════════════════════════════════════

// Shadow System - Foundation for depth
const shadowSm = { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }
const shadowMd = { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 }
const shadowLg = { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 12 }

// Gradient Overlays
const gradients = {
  purple: { start: '#7B6EF6', end: '#5A4FD4', angle: '135deg' },
  pink: { start: '#F6379B', end: '#D41E6D', angle: '135deg' },
  blue: { start: '#6ECFF6', end: '#0A8FD4', angle: '135deg' },
  green: { start: '#6EF6A8', end: '#0FD49F', angle: '135deg' },
  orange: { start: '#F6A86E', end: '#D47D2E', angle: '135deg' }
}

// Animation Presets
const animations = {
  quick: { duration: 200, useNativeDriver: true },
  normal: { duration: 300, useNativeDriver: true },
  smooth: { duration: 500, useNativeDriver: true }
}

const g = StyleSheet.create({
  // ════ CORE THEME ════
  screen: { flex: 1, backgroundColor: '#0C0C0F' },
  logo: { fontSize: 32, fontWeight: '700', color: '#7B6EF6', letterSpacing: 0 },
  logoSm: { fontSize: 26, fontWeight: '700', color: '#7B6EF6' },
  logoSub: { fontSize: 14, color: '#9B9AA6', fontStyle: 'italic', marginTop: 6 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14 },
  orbMd: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  orbSm: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  orbIcon: { fontSize: 17, color: '#fff' },
  auraTitle: { color: '#F5F4F0', fontSize: 16, fontWeight: '700' },
  auraSub: { color: '#A5A3B0', fontSize: 12, marginTop: 2, fontWeight: '400' },
  divider: { height: 1, backgroundColor: '#1A1A22' },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#7B6EF640' },
  smallBtnTxt: { color: '#7B6EF6', fontSize: 12, fontWeight: '700' },
  bigOrb: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#7B6EF615', borderWidth: 1.5, borderColor: '#7B6EF650', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  bigOrbIcon: { fontSize: 36, color: '#7B6EF6' },
  miniOrb: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  startTitle: { fontSize: 28, fontWeight: '700', color: '#F5F4F0', marginBottom: 12, textAlign: 'center', letterSpacing: 0.5 },
  startSub: { fontSize: 15, color: '#9B9AA6', textAlign: 'center', lineHeight: 26, marginBottom: 40, fontWeight: '400' },
  // ══ PREMIUM BUTTONS WITH ANIMATIONS ══
  primaryBtn: {
    backgroundColor: '#7B6EF6',
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...shadowMd,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#9B8FFE' // Subtle highlight for depth
  },
  primaryBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  secondaryBtn: {
    backgroundColor: '#141418',
    width: '100%',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#7B6EF640'
  },
  secondaryBtnTxt: { color: '#7B6EF6', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  ghostTxt: { color: '#4A4A56', fontSize: 14, textAlign: 'center' },
  off: { opacity: 0.35 },
  nameInput: { width: '100%', backgroundColor: '#141418', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, color: '#F5F4F0', fontSize: 16, fontWeight: '500', borderWidth: 1.5, borderColor: '#2A2A35', marginBottom: 18, textAlign: 'center', ...shadowSm },
  msgList: { padding: 18, paddingBottom: 12, gap: 14 },
  bRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, width: '100%' },
  bLeft: { justifyContent: 'flex-start' },
  bRight: { justifyContent: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, maxWidth: '74%' },
  aBubble: { backgroundColor: '#141418', borderWidth: 1.5, borderColor: '#7B6EF650', borderTopLeftRadius: 4, ...shadowSm },
  uBubble: { backgroundColor: '#2A2060', borderWidth: 1.5, borderColor: '#7B6EF650', borderTopRightRadius: 4, ...shadowSm },
  bTxt: { color: '#F5F4F0', fontSize: 15, lineHeight: 26, flexWrap: 'wrap', fontWeight: '400' },
  tdot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7B6EF6' },
  joinCard: { backgroundColor: '#141418', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#7B6EF650', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', marginTop: 4 },
  joinTitle: { color: '#7B6EF6', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  joinSub: { color: '#F5F4F0', fontSize: 14, lineHeight: 22, marginBottom: 14 },
  joinBtn: { backgroundColor: '#7B6EF6', borderRadius: 12, padding: 12, alignItems: 'center' },
  joinBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#1A1A22' },
  input: { flex: 1, backgroundColor: '#141418', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, color: '#F5F4F0', fontSize: 15, borderWidth: 1.5, borderColor: '#2A2A35', maxHeight: 100, ...shadowSm },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#141418', borderWidth: 1, borderColor: '#2A2A35', alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: '#7B6EF6', borderColor: '#7B6EF6' },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
  homePad: { padding: 24, paddingTop: 58 },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#F5F4F0', letterSpacing: 0.3 },
  greetDate: { fontSize: 12, color: '#9B9AA6', marginTop: 3, fontWeight: '500' },
  // ══ PREMIUM CARDS ══
  auraMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#141418',
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: '#7B6EF640',
    borderLeftWidth: 4,
    borderLeftColor: '#7B6EF6',
    ...shadowMd,
    // Premium gradient overlay (subtle)
    backgroundImage: 'linear-gradient(135deg, rgba(123,110,246,0.05) 0%, rgba(123,110,246,0) 100%)'
  },
  auraMainTitle: { color: '#F5F4F0', fontSize: 16, fontWeight: '700', marginTop: 4, letterSpacing: 0.3 },
  auraMainSub: { color: '#A5A3B0', fontSize: 12, marginTop: 2, fontWeight: '400' },
  cardTag: { color: '#7B6EF6', fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  arrow: { color: '#7B6EF6', fontSize: 20, fontWeight: '700' },
  diaryCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#141418', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A35', ...shadowSm },
  diaryTitle: { color: '#F5F4F0', fontSize: 15, fontWeight: '700' },
  diarySub: { color: '#9B9AA6', fontSize: 12, marginTop: 2 },
  secLabel: { color: '#9B9AA6', fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  domainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 32 },
  domainCard: { width: '31%', backgroundColor: '#141418', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A35', marginBottom: 8, ...shadowSm },
  domainLabel: { color: '#F5F4F0', fontSize: 12, fontWeight: '600', marginTop: 6 },
  domainBarBg: { width: '100%', height: 4, backgroundColor: '#2A2A35', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  domainBarFill: { height: 4, borderRadius: 2 },
  domainCount: { fontSize: 10, marginTop: 5, fontWeight: '600' },
  avatarCol: { alignItems: 'center', gap: 6, marginRight: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#7B6EF6', ...shadowSm },
  avatarTxt: { color: '#fff', fontSize: 22, fontWeight: '700' },
  avatarName: { color: '#9B9AA6', fontSize: 11 },
  emptyCircle: { backgroundColor: '#141418', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2A2A35', borderStyle: 'dashed', marginBottom: 16 },
  emptyCircleTxt: { color: '#9B9AA6', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  datingCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1A1428', borderRadius: 20, padding: 18, marginTop: 4, borderWidth: 1, borderColor: '#7B6EF650', borderLeftWidth: 3, borderLeftColor: '#9B6EF6' },
  datingTitle: { color: '#F5F4F0', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  datingSub: { color: '#9B9AA6', fontSize: 12, marginTop: 3, lineHeight: 18 },
  backLink: { color: '#7B6EF6', fontSize: 15, fontWeight: '600' },
  lbCard: { backgroundColor: '#141418', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A35', borderLeftWidth: 3, ...shadowSm },
  lbTitle: { color: '#F5F4F0', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  lbCount: { fontSize: 18, fontWeight: '700' },
  lbEmpty: { color: '#9B9AA6', fontSize: 13, fontStyle: 'italic' },
  lbItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  lbDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  lbItemTxt: { color: '#F5F4F0', fontSize: 14, lineHeight: 21, flex: 1 },
  suggestCard: { backgroundColor: '#141418', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#7B6EF650', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', ...shadowMd },
  suggestTxt: { color: '#F5F4F0', fontSize: 15, lineHeight: 23, marginTop: 8, fontStyle: 'italic' },
  circleCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#141418', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A35', ...shadowSm },
  personName: { color: '#F5F4F0', fontSize: 16, fontWeight: '700' },
  personRel: { color: '#9B9AA6', fontSize: 12, marginTop: 2 },
  personInt: { color: '#7B6EF6', fontSize: 12, marginTop: 4 },
  suggestBtn: { backgroundColor: '#7B6EF620', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#7B6EF650' },
  suggestBtnTxt: { color: '#7B6EF6', fontSize: 12, fontWeight: '700' },
  matchCard: {
    backgroundColor: '#141418',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#7B6EF650',
    ...shadowMd
  },
  matchAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#9B6EF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2.5,
    borderColor: '#C4B5FD',
    ...shadowMd
  },
  matchAvatarTxt: { color: '#fff', fontSize: 34, fontWeight: '700' },
  matchName: { color: '#F5F4F0', fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  matchBio: { color: '#9B9AA6', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  valuesRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  valueChip: { backgroundColor: '#7B6EF620', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#7B6EF650' },
  valueChipTxt: { color: '#7B6EF6', fontSize: 12, fontWeight: '600' },
  howCard: { backgroundColor: '#141418', borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#2A2A35', ...shadowMd },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  howNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  howNumTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  howTxt: { color: '#F5F4F0', fontSize: 14, flex: 1 },
  scoreCard: { backgroundColor: '#141418', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#7B6EF650', ...shadowMd },
  scoreLabel: { color: '#9B9AA6', fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  scoreNum: { color: '#7B6EF6', fontSize: 56, fontWeight: '700', marginVertical: 6 },
  scoreWhy: { color: '#F5F4F0', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  reportCard: { backgroundColor: '#141418', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#7B6EF640', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', ...shadowSm },
  reportDate: { color: '#F5F4F0', fontSize: 16, lineHeight: 25, marginTop: 8 },
  reportAct: { color: '#F5F4F0', fontSize: 15, lineHeight: 24, marginTop: 8 },
  agentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 20, backgroundColor: '#141418', borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#2A2A35', ...shadowMd },
  agentAv: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  agentAvTxt: { color: '#fff', fontSize: 18 },
  agentName: { color: '#F5F4F0', fontSize: 13, fontWeight: '700' },
  agentFor: { color: '#9B9AA6', fontSize: 10 },
  agentVs: { color: '#7B6EF6', fontSize: 22, fontWeight: '700' },
  agentRow: { flexDirection: 'row', marginBottom: 10, width: '100%' },
  agentBubble: { borderRadius: 16, padding: 14, maxWidth: '82%' },
  agentBubbleA: { backgroundColor: '#141418', borderWidth: 1, borderColor: '#7B6EF640', borderTopLeftRadius: 4 },
  agentBubbleB: { backgroundColor: '#1A1612', borderWidth: 1, borderColor: '#F6A86E40', borderTopRightRadius: 4 },
  agentLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  agentText: { color: '#F5F4F0', fontSize: 14, lineHeight: 22 },
  agentTyping: { color: '#9B9AA6', fontSize: 16, letterSpacing: 2 },
  deckCounter: { color: '#9B9AA6', fontSize: 12, textAlign: 'center', marginBottom: 12, fontWeight: '600', letterSpacing: 0.5 },
  deckCard: { backgroundColor: '#141418', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A35', marginBottom: 18, ...shadowMd },
  deckPhoto: { width: '100%', height: 180, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  deckName: { color: '#F5F4F0', fontSize: 22, fontWeight: '700' },
  deckBio: { color: '#9B9AA6', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 14 },
  interestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
  interestTag: { color: '#7B6EF6', fontSize: 12, fontWeight: '500' },
  swipeRow: { flexDirection: 'row', gap: 12 },
  passBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#141418', borderWidth: 1, borderColor: '#2A2A35', alignItems: 'center', justifyContent: 'center', ...shadowSm },
  passTxt: { color: '#9B9AA6', fontSize: 16, fontWeight: '700' },
  likeBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center', ...shadowMd },
  likeTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deckHint: { color: '#9B9AA6', fontSize: 12, textAlign: 'center', marginTop: 14 },
  matchedBanner: { alignItems: 'center', backgroundColor: '#1A1428', borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#7B6EF650', ...shadowMd },
  matchedTitle: { color: '#F5F4F0', fontSize: 26, fontWeight: '700', marginTop: 8, letterSpacing: 0.3 },
  matchedSub: { color: '#9B9AA6', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  alignBadge: { position: 'absolute', top: 16, right: 16, alignItems: 'center', backgroundColor: '#0C0C0F', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6, zIndex: 2 },
  alignNum: { fontSize: 18, fontWeight: '700' },
  alignLbl: { color: '#9B9AA6', fontSize: 9, marginTop: -2 },
  whyMatch: { backgroundColor: '#0C0C0F', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#7B6EF640', width: '100%' },
  whyMatchLbl: { color: '#7B6EF6', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  whyMatchTxt: { color: '#F5F4F0', fontSize: 13, lineHeight: 20 },
  // Cinematic dating profile
  dTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  dBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,20,24,0.7)', alignItems: 'center', justifyContent: 'center' },
  dBackTxt: { color: '#fff', fontSize: 24, marginTop: -2 },
  dToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,20,24,0.7)', borderRadius: 24, padding: 4 },
  dTogActive: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 9, alignItems: 'center' },
  dTogActiveTxt: { color: '#0C0C0F', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  dTogTxt: { flex: 1, textAlign: 'center', color: '#9B9AA6', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  alignPill: { width: 48, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,20,24,0.85)', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  alignPillTxt: { fontSize: 13, fontWeight: '800' },
  dPhoto: { height: 540, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  dPhotoFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220, backgroundColor: '#0C0C0F', opacity: 0.55 },
  dPhotoOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: 24 },
  dPremium: { color: '#F6D66E', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  dName: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -0.5 },
  dAge: { color: '#D8D6E0', fontSize: 30, fontWeight: '300' },
  dHeart: { color: '#fff', fontSize: 28, marginBottom: 8 },
  dLoc: { color: '#D8D6E0', fontSize: 15, marginTop: 6 },
  dPills: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 18 },
  dPill: { backgroundColor: '#1A1A22', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#2A2A35' },
  dPillTxt: { color: '#F5F4F0', fontSize: 14, fontWeight: '600' },
  dSection: { paddingHorizontal: 20, marginTop: 22 },
  dH: { color: '#F5F4F0', fontSize: 20, fontWeight: '700', marginBottom: 14, letterSpacing: 0.3 },
  dAbout: { color: '#C8C6D0', fontSize: 15, lineHeight: 24 },
  dWhy: { backgroundColor: '#141022', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7B6EF650' },
  dWhyLbl: { color: '#7B6EF6', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  dWhyTxt: { color: '#F5F4F0', fontSize: 14, lineHeight: 21 },
  dTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dTag: { backgroundColor: '#1A1A22', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#2A2A35' },
  dTagTxt: { color: '#F5F4F0', fontSize: 14, fontWeight: '600' },
  dActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32, backgroundColor: '#0C0C0F' },
  dPass: { flex: 1, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowMd },
  dPassIcon: { fontSize: 24 },
  dMsg: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1A1A22', borderWidth: 1, borderColor: '#2A2A35', alignItems: 'center', justifyContent: 'center', ...shadowSm },
  dMsgIcon: { fontSize: 22 },
  dLike: { flex: 1.4, height: 60, borderRadius: 30, backgroundColor: '#F6379B', alignItems: 'center', justifyContent: 'center', ...shadowMd },
  dLikeIcon: { fontSize: 26, color: '#fff' },
  alignPillFloat: { position: 'absolute', top: 70, right: 16, zIndex: 5 },
  dMe: { width: 48, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,20,24,0.7)', alignItems: 'center', justifyContent: 'center' },
  dMeTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  styleCard: { flex: 1, backgroundColor: '#141022', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7B6EF640' },
  styleLbl: { color: '#7B6EF6', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  styleVal: { color: '#F5F4F0', fontSize: 15, fontWeight: '700' },
  // Profile builder
  pbBody: { flex: 1, paddingHorizontal: 22, paddingTop: 24 },
  pbDots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 28 },
  pbDot: { width: 24, height: 5, borderRadius: 3, backgroundColor: '#2A2A35' },
  pbDotOn: { backgroundColor: '#7B6EF6' },
  pbQCard: { backgroundColor: '#141418', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#7B6EF650', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', ...shadowMd },
  pbQLabel: { color: '#7B6EF6', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  pbQ: { color: '#F5F4F0', fontSize: 19, fontWeight: '600', lineHeight: 28 },
  pbHint: { color: '#9B9AA6', fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 20 },
  // My profile extras
  myAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  autoTag: { color: '#6EF6A8', fontSize: 11, fontWeight: '700' },
  autoCard: { backgroundColor: '#101810', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#6EF6A840' },
  autoCardTxt: { color: '#F5F4F0', fontSize: 14, lineHeight: 22 },
  autoCardDate: { color: '#9B9AA6', fontSize: 11, marginTop: 8 },
  uploadBtn: { position: 'absolute', top: '42%', backgroundColor: 'rgba(123,110,246,0.9)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, zIndex: 5 },
  uploadBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  changePhoto: { position: 'absolute', top: 70, right: 16, backgroundColor: 'rgba(20,20,24,0.8)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, zIndex: 5 },
  changePhotoTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  intimacyCard: { backgroundColor: '#1A1018', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F6379B40' },
  intimacyLbl: { color: '#F6379B', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  intimacyTxt: { color: '#F5F4F0', fontSize: 14, lineHeight: 21 },
  intimacyNote: { color: '#9B9AA6', fontSize: 11, lineHeight: 17, marginTop: 10, fontStyle: 'italic' },
  psychRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  psychPill: { color: '#A89BFA', fontSize: 12, fontWeight: '700', backgroundColor: '#7B6EF618', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden' },
  psychNote: { color: '#C8C6D0', fontSize: 13, lineHeight: 20, marginTop: 10 },
  intimacyReport: { backgroundColor: '#1A1018', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F6379B50' },
  intimacyRLbl: { color: '#F6379B', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  intimacyRTxt: { color: '#F5F4F0', fontSize: 15, lineHeight: 23 },
  intimacyRNote: { color: '#9B9AA6', fontSize: 11, lineHeight: 17, marginTop: 10, fontStyle: 'italic' },
  likesBar: { position: 'absolute', bottom: 108, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  likesTxt: { color: '#9B9AA6', fontSize: 12, fontWeight: '600' },
  likesUpgrade: { color: '#F6D66E', fontSize: 12, fontWeight: '700' },
  secondaryBtn: { width: '100%', height: 52, borderRadius: 16, backgroundColor: '#141418', borderWidth: 1, borderColor: '#7B6EF640', alignItems: 'center', justifyContent: 'center', marginBottom: 4, ...shadowSm },
  secondaryBtnTxt: { color: '#7B6EF6', fontSize: 15, fontWeight: '700' },
  matchPhoto: { width: 100, height: 100, borderRadius: 50, marginBottom: 14 },
  paywall: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,8,11,0.92)', alignItems: 'center', justifyContent: 'center', padding: 28, zIndex: 50 },
  paywallCard: { width: '100%', backgroundColor: '#141418', borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#F6D66E50', ...shadowLg },
  paywallTitle: { color: '#F5F4F0', fontSize: 24, fontWeight: '800', marginTop: 10, textAlign: 'center', letterSpacing: 0.5 },
  paywallSub: { color: '#9B9AA6', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 10, marginBottom: 18 },
  paywallPrice: { backgroundColor: '#F6D66E18', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 18 },
  paywallPriceTxt: { color: '#F6D66E', fontSize: 15, fontWeight: '800' },
  paywallBtn: { width: '100%', height: 54, borderRadius: 16, backgroundColor: '#F6D66E', alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...shadowMd },
  paywallBtnTxt: { color: '#0C0C0F', fontSize: 16, fontWeight: '800' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A22' },
  chatAvatar: { width: 42, height: 42, borderRadius: 21 },
  chatName: { color: '#F5F4F0', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  chatStatus: { color: '#6EF6A8', fontSize: 12, marginTop: 1 },
  chatAura: { color: '#7B6EF6', fontSize: 22 },
  matchStrip: { backgroundColor: '#1A1428', paddingVertical: 10, paddingHorizontal: 16 },
  matchStripTxt: { color: '#A89BFA', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  // Connections
  connRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#141418', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A35', ...shadowSm },
  connAvatar: { width: 56, height: 56, borderRadius: 28 },
  connName: { color: '#F5F4F0', fontSize: 16, fontWeight: '700' },
  connScore: { color: '#7B6EF6', fontSize: 13, fontWeight: '700' },
  connLast: { color: '#9B9AA6', fontSize: 13, marginTop: 4 },
  // Who liked you
  likedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  likedCard: { width: '47%', height: 200, borderRadius: 18, overflow: 'hidden', marginBottom: 12, backgroundColor: '#141418', position: 'relative', ...shadowMd },
  likedPhoto: { width: '100%', height: '100%' },
  blurred: { opacity: 0.7 },
  likedInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: 'rgba(12,12,15,0.6)' },
  likedName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  likedLock: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  likedUpsell: { backgroundColor: '#141418', borderRadius: 20, padding: 22, marginTop: 10, borderWidth: 1, borderColor: '#F6D66E50', alignItems: 'center' },
  likedUpsellTitle: { color: '#F6D66E', fontSize: 18, fontWeight: '800' },
  likedUpsellSub: { color: '#9B9AA6', fontSize: 14, textAlign: 'center', lineHeight: 21, marginVertical: 12 },
  // Diary history
  diaryEntry: { backgroundColor: '#141418', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A35', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', ...shadowSm },
  diaryEntryDate: { color: '#7B6EF6', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  diaryEntryTxt: { color: '#F5F4F0', fontSize: 15, lineHeight: 23 },
  // Insights
  insightHero: { backgroundColor: '#141418', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#7B6EF640', marginBottom: 8, ...shadowMd },
  insightSummary: { color: '#F5F4F0', fontSize: 17, lineHeight: 27, marginTop: 10 },
  insightNote: { color: '#F5F4F0', fontSize: 15, lineHeight: 24, fontStyle: 'italic', marginTop: 8 },
  insightQ: { color: '#A89BFA', fontSize: 17, lineHeight: 26, marginTop: 10, fontWeight: '600' },
  // Settings
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#141418', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A35', ...shadowSm },
  setIcon: { fontSize: 18 },
  setLabel: { color: '#F5F4F0', fontSize: 15, fontWeight: '600', flex: 1 },
  setArrow: { color: '#7B6EF6', fontSize: 16, fontWeight: '700' },
  privacyCard: { backgroundColor: '#101810', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#6EF6A830' },
  privacyTxt: { color: '#C8C6D0', fontSize: 13, lineHeight: 21 },
  aboutTxt: { color: '#4A4A56', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 30 },
  dealbreak: { color: '#F6A86E', fontSize: 13, lineHeight: 20, marginTop: 12, fontWeight: '600' },
  dealgood: { color: '#6EF6A8', fontSize: 13, lineHeight: 20, marginTop: 12, fontWeight: '600' },
  contactSetup: { backgroundColor: '#141418', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7B6EF640' },
  contactSetupTxt: { color: '#C8C6D0', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  contactInput: { backgroundColor: '#1A1A22', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#F5F4F0', fontSize: 15, borderWidth: 1, borderColor: '#2A2A35', marginBottom: 10 },
  contactSave: { backgroundColor: '#7B6EF6', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  contactSaveTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  crisisLine: { color: '#9B9AA6', fontSize: 11, lineHeight: 17, marginTop: 12, textAlign: 'center' },
  typePill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#141418', borderWidth: 1, borderColor: '#2A2A35' },
  typePillActive: { backgroundColor: '#7B6EF6', borderColor: '#7B6EF6' },
  typePillTxt: { color: '#F5F4F0', fontSize: 14, fontWeight: '700' },
  circleMember: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#141418', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A35' },
  invitePending: { color: '#F6A86E', fontSize: 11, fontWeight: '600' },
  inviteCode: { color: '#7B6EF6', fontSize: 11, fontWeight: '700' },
  msgCount: { color: '#6EF6A8', fontSize: 11, fontWeight: '600' },
  registerScroll: { paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center', minHeight: '100vh' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#141418', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A35', ...shadowSm },
  socialIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  socialLabel: { color: '#F5F4F0', fontSize: 15, fontWeight: '600', flex: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2A2A35' },
  dividerTxt: { color: '#6A6A76', fontSize: 12, fontWeight: '600' },
  inputLabel: { color: '#F5F4F0', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  authInput: { backgroundColor: '#141418', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: '#F5F4F0', fontSize: 15, borderWidth: 1.5, borderColor: '#2A2A35', ...shadowSm },
  disclaimerTxt: { color: '#6A6A76', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 24 },
})
