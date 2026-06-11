import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView,
  Platform, Animated, Image, ImageBackground, Switch
} from 'react-native'
import Svg, { Circle as SvgCircle, Line as SvgLine, Polygon as SvgPolygon, Path as SvgPath, Polyline as SvgPolyline } from 'react-native-svg'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'
import { SchedulableTriggerInputTypes } from 'expo-notifications'

WebBrowser.maybeCompleteAuthSession() // finish the OAuth redirect when the app reopens

// ════════════════════════════════════════════════════════════
//  SOMA — Life OS built on self-knowledge
//  Pillars: Try Soma · Register · Soma+Memory · Diary · Circle · Dating
// ════════════════════════════════════════════════════════════

const AI_KEY      = process.env.EXPO_PUBLIC_AI_KEY ?? ''
// Google OAuth client IDs (create in Google Cloud Console; leave blank to disable)
const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? ''
const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? ''
const GOOGLE_ENABLED = !!(GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID)
const STORAGE_KEY = 'soma_v3'
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3000'
const TOKEN_KEY   = 'soma_auth_token'
const REFRESH_KEY = 'soma_refresh_token'

// ── LIFE DOMAINS (Circle of Life) ──────────────────────────
const DOMAINS = [
  { key: 'health',       label: 'Health',  icon: '❤️',  color: '#F66E8E' },
  { key: 'career',       label: 'Career',  icon: '💼',  color: '#6E8BF6' },
  { key: 'finance',      label: 'Finance', icon: '💰',  color: '#6EF6A8' },
  { key: 'relationship', label: 'Love',    icon: '💞',  color: '#7B6EF6' },
  { key: 'family',       label: 'Family',  icon: '👨‍👩‍👧', color: '#F6C26E' },
  { key: 'growth',       label: 'Growth',  icon: '🌱',  color: '#6EE6C0' },
  { key: 'hobby',        label: 'Fun',     icon: '🎨',  color: '#F6A86E' },
  { key: 'purpose',      label: 'Purpose', icon: '🎯',  color: '#6ECFF6' },
  { key: 'mind',         label: 'Mind',    icon: '🧘',  color: '#A89BFA' },
  { key: 'environment',  label: 'Home',    icon: '🏡',  color: '#C9A0F6' },
] as const
type DomainKey = typeof DOMAINS[number]['key']
type Sentiment = 'positive' | 'neutral' | 'negative'

// ── i18n ───────────────────────────────────────────────────
const LANGS = [
  { code: 'en', name: 'English',    label: 'English',    flag: '🇺🇸' },
  { code: 'ru', name: 'Russian',    label: 'Русский',    flag: '🇷🇺' },
  { code: 'es', name: 'Spanish',    label: 'Español',    flag: '🇪🇸' },
  { code: 'fr', name: 'French',     label: 'Français',   flag: '🇫🇷' },
  { code: 'de', name: 'German',     label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', label: 'Português',  flag: '🇧🇷' },
  { code: 'vi', name: 'Vietnamese', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: 'Chinese',    label: '中文',        flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese',   label: '日本語',       flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic',     label: 'العربية',    flag: '🇸🇦' },
] as const

function detectLang(): string {
  try {
    const n = (typeof navigator !== 'undefined' && (navigator as any).language) ? (navigator as any).language.slice(0, 2).toLowerCase() : 'en'
    return LANGS.some(l => l.code === n) ? n : 'en'
  } catch { return 'en' }
}
function currentLangCode(): string { try { return DB.get().language || 'en' } catch { return 'en' } }
function currentLangName(): string { return LANGS.find(l => l.code === currentLangCode())?.name || 'English' }
// Appended to conversational AI prompts so Soma replies in the user's language.
function langDirective(): string {
  return currentLangCode() === 'en' ? '' : `\n\nIMPORTANT: Write your entire response in ${currentLangName()} — the user's language — naturally and fluently.`
}

// UI strings. t(key) returns the current language's string, falling back to English.
const STRINGS: Record<string, Record<string, string>> = {
  en: {
    hello: 'Hello', feeling: 'How are you feeling today?', circleOfLife: 'Circle of Life', details: 'Details →',
    yourInsights: 'Your Insights', wheelTitle: 'Wheel of Life', back: '← Back', settings: 'Settings',
    language: 'Language', save: 'Save', talkToSoma: 'Talk with Soma', overallBalance: 'OVERALL LIFE BALANCE',
    reflecting: '🧠 Soma is reflecting on everything you\'ve shared…',
    wheelSub: 'Assessed by Soma, weighing everything you\'ve shared — like a thoughtful psychologist.',
  },
  ru: {
    hello: 'Привет', feeling: 'Как вы себя чувствуете сегодня?', circleOfLife: 'Круг жизни', details: 'Подробнее →',
    yourInsights: 'Ваши наблюдения', wheelTitle: 'Колесо жизни', back: '← Назад', settings: 'Настройки',
    language: 'Язык', save: 'Сохранить', talkToSoma: 'Поговорите с Сомой', overallBalance: 'ОБЩИЙ БАЛАНС ЖИЗНИ',
    reflecting: '🧠 Сома обдумывает всё, чем вы поделились…',
    wheelSub: 'Оценка Сомы — она взвешивает всё, чем вы поделились, как внимательный психолог.',
  },
  es: {
    hello: 'Hola', feeling: '¿Cómo te sientes hoy?', circleOfLife: 'Círculo de la vida', details: 'Detalles →',
    yourInsights: 'Tus reflexiones', wheelTitle: 'Rueda de la vida', back: '← Atrás', settings: 'Ajustes',
    language: 'Idioma', save: 'Guardar', talkToSoma: 'Habla con Soma', overallBalance: 'EQUILIBRIO DE VIDA',
    reflecting: '🧠 Soma está reflexionando sobre todo lo que compartiste…',
    wheelSub: 'Evaluado por Soma, sopesando todo lo que compartiste, como un psicólogo atento.',
  },
}
function t(key: string): string {
  const c = currentLangCode()
  return (STRINGS[c] && STRINGS[c][key]) || STRINGS.en[key] || key
}

// Fallback sentiment for older memories saved before sentiment was tracked.
function inferSentiment(text: string): Sentiment {
  const t = text.toLowerCase()
  if (/(wrong|regret|lost|losing|fail|quit|can.?t|cannot|difficult|struggl|worri|anxious|stress|debt|broke|sad|lonely|hurt|sick|tired|overwhelm|mistake|fired|breakup|broke up|argument|conflict|afraid|scared|depress)/.test(t)) return 'negative'
  if (/(love|happy|joy|proud|grateful|win|won|achiev|progress|excited|great|better|healthy|saved|promotion|success|hope|grow|accomplish)/.test(t)) return 'positive'
  return 'neutral'
}
// Wellbeing of a single life domain (0-100), based on the SENTIMENT of what was
// shared — not just how much. Struggles pull it down; wins lift it up. Empty = 0.
function domainWellbeing(memories: Memory[], d: DomainKey): number {
  const items = memories.filter(m => m.domain === d)
  if (!items.length) return 0
  let s = 45 // having opened up about an area is a small positive start
  for (const m of items) {
    const sent = m.sentiment || inferSentiment(m.content)
    s += sent === 'positive' ? 16 : sent === 'negative' ? -18 : 5
  }
  return Math.max(8, Math.min(100, s))
}
// Overall life balance = average wellbeing across all domains (empty domains drag it down).
function overallBalance(memories: Memory[]): number {
  return Math.round(DOMAINS.reduce((sum, d) => sum + domainWellbeing(memories, d.key), 0) / DOMAINS.length)
}

// The app's "psychologist": weigh EVERYTHING shared in each domain and assign a
// considered Wheel-of-Life score (0-100) + a brief insight. One LLM call, cached.
async function assessWheel(p: UserProfile): Promise<WheelAssessment> {
  const basis = p.memories.length
  const byDomain = DOMAINS.map(d => {
    const lines = p.memories.filter(m => m.domain === d.key).map(m => `- ${m.content}`).join('\n')
    return `${d.label} [${d.key}]:\n${lines || '(nothing shared yet)'}`
  }).join('\n\n')
  const sys = `You are an experienced, compassionate clinical psychologist completing a Wheel of Life assessment. For each life domain, weigh EVERYTHING the client shared holistically: severity and recency of struggles, whether difficulties are being actively worked through, sources of meaning and fulfilment, and overall satisfaction. Be realistic and honest, not flattering — a domain where they only voiced a serious struggle scores LOW; genuine fulfilment scores HIGH; nothing shared = 0 (unexplored). Return ONLY JSON.`
  const prompt = `CLIENT: ${p.name || 'the user'}

WHAT THEY HAVE SHARED, BY LIFE DOMAIN:
${byDomain}

For EACH domain give a wellbeing score (0-100) and a brief insight (<=12 words, warm and clinical).
JSON shape exactly:
{"health":{"score":0,"note":""},"career":{"score":0,"note":""},"finance":{"score":0,"note":""},"relationship":{"score":0,"note":""},"family":{"score":0,"note":""},"growth":{"score":0,"note":""},"hobby":{"score":0,"note":""},"purpose":{"score":0,"note":""},"mind":{"score":0,"note":""},"environment":{"score":0,"note":""}}
${currentLangCode() === 'en' ? '' : `Write every "note" in ${currentLangName()}, but keep the JSON keys exactly as shown (English).\n`}JSON only:`
  const scores: Partial<Record<DomainKey, WheelDomain>> = {}
  try {
    const res = await groq([{ role: 'user', content: prompt }], sys, 600, 0.3)
    const m = res.match(/\{[\s\S]*\}/)
    if (m) {
      const parsed = JSON.parse(m[0])
      for (const d of DOMAINS) {
        const hasData = p.memories.some(mm => mm.domain === d.key)
        if (!hasData) { scores[d.key] = { score: 0, note: '' }; continue }
        const v = parsed[d.key]
        if (v && typeof v.score === 'number') scores[d.key] = { score: Math.max(0, Math.min(100, Math.round(v.score))), note: String(v.note || '').slice(0, 90) }
      }
    }
  } catch {}
  // Heuristic fallback for any domain the model didn't return
  for (const d of DOMAINS) if (!scores[d.key]) scores[d.key] = { score: domainWellbeing(p.memories, d.key), note: '' }
  const vals = DOMAINS.map(d => scores[d.key]!.score)
  const overall = Math.round(vals.reduce((a, b) => a + b, 0) / DOMAINS.length)
  return { scores, overall, basis, at: new Date().toISOString() }
}

// ── DATA TYPES ─────────────────────────────────────────────
interface Memory { id: string; domain: DomainKey; content: string; createdAt: string; sentiment?: Sentiment }
type WheelDomain = { score: number; note: string }
interface WheelAssessment { scores: Partial<Record<DomainKey, WheelDomain>>; overall: number; basis: number; at: string }
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
interface GratitudeEntry { id: string; date: string; items: string[]; somaNote?: string }
interface LoveEntry { id: string; date: string; affirmation: string; checks: Record<string,boolean>; note?: string }
interface Medication { id: string; name: string; dosage: string; times: string[]; color: string; notes?: string; active: boolean }
interface MedLog { date: string; taken: Record<string, boolean> } // key = `${medId}_${time}`
interface TherapySession { id: string; date: string; notes: string; somaReflection?: string }
interface DailyHealthLog {
  date: string
  steps?: number
  sleepHours?: number
  heartRate?: number        // bpm resting
  activeMinutes?: number
  calories?: number
  weight?: number           // kg
  source: 'manual' | 'apple_health' | 'google_fit' | 'fitbit' | 'garmin' | 'samsung'
}
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
  wheel?: WheelAssessment                            // psychologist's wheel-of-life assessment (cached)
  language?: string                                  // UI + AI language code (e.g. 'en','ru','es')
  languageChosen?: boolean                           // true once the user explicitly picked a language
  manualScores?: Partial<Record<DomainKey, number>>  // user's own 1-10 self-rating per domain (overrides AI)
  wheelHistory?: WheelSnapshot[]                     // dated snapshots of the wheel for the progress view
  gratitudeEntries?: GratitudeEntry[]                // daily thankful diary entries
  loveEntries?: LoveEntry[]                          // daily love yourself check-ins
  medications?: Medication[]                         // medication list
  medLogs?: MedLog[]                                 // daily medication adherence logs
  therapySessions?: TherapySession[]                 // therapy session notes
  healthLogs?: DailyHealthLog[]                      // daily health metrics (steps, sleep, HR…)
  connectedApps?: string[]                           // 'apple_health' | 'google_fit' | 'fitbit' | 'garmin' | 'samsung'
  notifSettings?: {
    enabled: boolean
    medReminders: boolean
    gratitudeEnabled: boolean
    gratitudeHour: number    // 0-23, default 21
    gratitudeMinute: number  // 0-59, default 0
  }
  notifMessages?: string[]   // 7 AI-personalized messages (one per weekday), cached
  voiceSettings?: {
    voiceName?: string        // chosen system voice (undefined = best available)
    rate: number              // 0.8 calm · 0.95 natural · 1.1 lively
    pitch: number
  }
  onboarding?: {
    goals: string[]              // why they came (heal, habits, know-myself…)
    focusDomains: DomainKey[]    // up to 3 life areas they want to work on
    completedAt: string
  }
  somaMessage?: { text: string; date: string }  // cached daily proactive message from Soma
}
type WheelSnapshot = { date: string; overall: number; scores: Partial<Record<DomainKey, number>> }

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
        if (p.language === undefined) p.language = detectLang()
        return p
      }
    } catch {}
    return { name: '', registered: false, memories: [], circle: [], diary: [], conversations: 0, dating: { ...EMPTY_DATING }, premium: false, likesToday: 0, likesDate: '', connections: [], likedYou: [], aiName: 'Soma', aiPhoto: '', trustedContact: { name: '', phone: '' } }
  },
  save: (p: UserProfile) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {} },
  addMemory: (domain: DomainKey, content: string, sentiment: Sentiment = 'neutral') => {
    const p = DB.get()
    if (p.memories.some(m => m.content.toLowerCase() === content.toLowerCase())) return
    p.memories.unshift({ id: Date.now() + '' + Math.random(), domain, content, sentiment, createdAt: new Date().toLocaleDateString() })
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
  setWheel: (wheel: WheelAssessment) => { const p = DB.get(); p.wheel = wheel; DB.save(p) },
  setLanguage: (code: string) => { const p = DB.get(); p.language = code; p.languageChosen = true; p.wheel = undefined; DB.save(p) },
  setManualScore: (domain: DomainKey, value: number | undefined) => {
    const p = DB.get(); const ms: any = { ...(p.manualScores || {}) }
    if (value === undefined) delete ms[domain]; else ms[domain] = value
    p.manualScores = ms; DB.save(p)
  },
  recordWheelSnapshot: (overall: number, scores: Partial<Record<DomainKey, number>>) => {
    const p = DB.get(); const today = new Date().toISOString().slice(0, 10)
    const hist = (p.wheelHistory || []).filter(h => h.date !== today) // one snapshot per day (latest wins)
    hist.push({ date: today, overall, scores })
    p.wheelHistory = hist.slice(-60); DB.save(p)
  },
  addGratitude: (items: string[], somaNote?: string) => {
    const p = DB.get()
    const today = new Date().toISOString().slice(0, 10)
    const entries = (p.gratitudeEntries || []).filter(e => e.date !== today)
    entries.unshift({ id: Date.now() + '', date: today, items, somaNote })
    p.gratitudeEntries = entries.slice(0, 365); DB.save(p)
  },
  addLoveEntry: (affirmation: string, checks: Record<string,boolean>, note?: string) => {
    const p = DB.get()
    const today = new Date().toISOString().slice(0, 10)
    const entries = (p.loveEntries || []).filter(e => e.date !== today)
    entries.unshift({ id: Date.now() + '', date: today, affirmation, checks, note })
    p.loveEntries = entries.slice(0, 365); DB.save(p)
  },
  // Medication management
  addMedication: (name: string, dosage: string, times: string[], color: string, notes?: string) => {
    const p = DB.get()
    const med: Medication = { id: Date.now() + '', name, dosage, times, color, notes, active: true }
    p.medications = [med, ...(p.medications || [])]
    DB.save(p)
  },
  removeMedication: (id: string) => {
    const p = DB.get()
    p.medications = (p.medications || []).map(m => m.id === id ? { ...m, active: false } : m)
    DB.save(p)
  },
  logMedTaken: (medId: string, time: string, taken: boolean) => {
    const p = DB.get()
    const today = new Date().toISOString().slice(0, 10)
    const logs = p.medLogs || []
    let todayLog = logs.find(l => l.date === today)
    if (!todayLog) { todayLog = { date: today, taken: {} }; logs.unshift(todayLog) }
    todayLog.taken[`${medId}_${time}`] = taken
    p.medLogs = logs.slice(0, 365); DB.save(p)
  },
  getMedLog: (date: string): MedLog | undefined => {
    return (DB.get().medLogs || []).find(l => l.date === date)
  },
  // Therapy sessions
  addTherapySession: (notes: string, somaReflection?: string) => {
    const p = DB.get()
    const session: TherapySession = { id: Date.now() + '', date: new Date().toISOString().slice(0, 10), notes, somaReflection }
    p.therapySessions = [session, ...(p.therapySessions || [])].slice(0, 100)
    DB.save(p)
  },
  // Health logs
  logHealth: (data: Omit<DailyHealthLog, 'date'>, date?: string) => {
    const p = DB.get()
    const today = date || new Date().toISOString().slice(0, 10)
    const logs = (p.healthLogs || []).filter(l => l.date !== today)
    const existing = (p.healthLogs || []).find(l => l.date === today) || {}
    logs.unshift({ ...existing, ...data, date: today } as DailyHealthLog)
    p.healthLogs = logs.slice(0, 365); DB.save(p)
  },
  getTodayHealth: (): DailyHealthLog | undefined => {
    const today = new Date().toISOString().slice(0, 10)
    return (DB.get().healthLogs || []).find(l => l.date === today)
  },
  connectApp: (appId: string) => {
    const p = DB.get()
    const apps = p.connectedApps || []
    if (!apps.includes(appId)) { p.connectedApps = [...apps, appId]; DB.save(p) }
  },
  disconnectApp: (appId: string) => {
    const p = DB.get()
    p.connectedApps = (p.connectedApps || []).filter(a => a !== appId); DB.save(p)
  },
  setNotifSettings: (settings: NonNullable<UserProfile['notifSettings']>) => {
    const p = DB.get(); p.notifSettings = settings; DB.save(p)
  },
  setNotifMessages: (messages: string[]) => {
    const p = DB.get(); p.notifMessages = messages; DB.save(p)
  },
  setVoiceSettings: (settings: NonNullable<UserProfile['voiceSettings']>) => {
    const p = DB.get(); p.voiceSettings = settings; DB.save(p)
  },
  setOnboarding: (goals: string[], focusDomains: DomainKey[]) => {
    const p = DB.get()
    p.onboarding = { goals, focusDomains, completedAt: new Date().toISOString().slice(0, 10) }
    DB.save(p)
  },
  setSomaMessage: (text: string) => {
    const p = DB.get()
    p.somaMessage = { text, date: new Date().toISOString().slice(0, 10) }
    DB.save(p)
  },
  reset: () => DB.save({ name: '', registered: false, memories: [], circle: [], diary: [], conversations: 0, dating: { ...EMPTY_DATING }, premium: false, likesToday: 0, likesDate: '', connections: [], likedYou: [], aiName: 'Soma', aiPhoto: '', trustedContact: { name: '', phone: '' } }),
}

// ════════════════════════════════════════════════════════════
//  PUSH NOTIFICATIONS — local scheduling, AI-personalized
// ════════════════════════════════════════════════════════════

// Map med time keys → notification hour
const MED_TIME_HOURS: Record<string, number> = {
  morning: 8, afternoon: 13, evening: 18, night: 21,
}

// Weekday labels for expo-notifications (1=Sunday…7=Saturday)
const WEEKDAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const NOTIF_TONE_LABELS = ['😄 Playful','🔥 Streak','💜 Personal','🎁 Curiosity','🌅 Morning','😑 Nudge','🏆 Celebrate']

// Set the foreground notification handler once
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

async function requestNotifPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('soma-reminders', {
        name: 'SOMA Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      })
    }
    const { status: existing } = await Notifications.getPermissionsAsync()
    if (existing === 'granted') return true
    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  } catch { return false }
}

async function cancelNotifsByPrefix(prefix: string) {
  if (Platform.OS === 'web') return
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    for (const n of scheduled) {
      if (n.identifier.startsWith(prefix)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier)
      }
    }
  } catch {}
}

async function syncMedNotifications(medications: Medication[], enabled: boolean) {
  await cancelNotifsByPrefix('med_')
  if (!enabled || Platform.OS === 'web') return
  const active = medications.filter(m => m.active)
  for (const med of active) {
    for (const timeKey of med.times) {
      const hour = MED_TIME_HOURS[timeKey] ?? 8
      const id = `med_${med.id}_${timeKey}`
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: `💊 Time for ${med.name}`,
            body: med.dosage ? `${med.dosage} — tap to log your dose` : 'Tap to log your dose',
            data: { screen: 'medication' },
            sound: 'default',
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DAILY,
            hour,
            minute: 0,
            channelId: 'soma-reminders',
          },
        })
      } catch {}
    }
  }
}

// Schedule 7 weekly notifications (Sun–Sat), each with a unique personalized message
async function syncGratitudeNotification(hour: number, minute: number, enabled: boolean, messages: string[]) {
  await cancelNotifsByPrefix('gratitude_')
  if (!enabled || Platform.OS === 'web') return
  const fallback = [
    'What made you smile today? 🌟',
    "Name 3 things you're grateful for 🙏",
    'Your daily reflection is waiting ✨',
    'A moment of gratitude changes everything 💜',
    'How did your day go? Tell Soma 🌙',
    'Reflect on one good thing that happened 🌈',
    'You showed up today — that matters 💪',
  ]
  const pool = messages.length >= 7 ? messages : fallback
  for (let weekday = 1; weekday <= 7; weekday++) {
    const body = pool[(weekday - 1) % pool.length]
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `gratitude_w${weekday}`,
        content: {
          title: '🌸 SOMA Check-in',
          body,
          data: { screen: 'gratitude' },
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.WEEKLY,
          weekday,   // 1=Sunday … 7=Saturday
          hour,
          minute,
          channelId: 'soma-reminders',
        },
      })
    } catch {}
  }
}

// ── AI message generation ──────────────────────────────────
// Builds a rich context from everything the user shared,
// then asks Groq to write 7 warm, personal notification bodies.
// Calculate gratitude streak (consecutive days)
function calcActivityStreak(profile: UserProfile): number {
  const days = new Set<string>()
  profile.diary.forEach(e => { if (e.date) days.add(e.date.slice(0, 10)) })
  profile.gratitudeEntries?.forEach(e => { if (e.date) days.add(e.date.slice(0, 10)) })
  profile.loveEntries?.forEach(e => { if (e.date) days.add(e.date.slice(0, 10)) })
  let streak = 0
  const d = new Date()
  while (days.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

async function generateSomaDailyMessage(profile: UserProfile): Promise<string> {
  const name = profile.name || 'friend'
  const aiName = profile.aiName || 'Soma'
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const streak = calcActivityStreak(profile)
  const recentMem = profile.memories.slice(0, 5).map(m => m.content).join('; ')
  const goals = profile.onboarding?.goals?.join(', ') || ''
  const focus = profile.onboarding?.focusDomains?.[0] || ''
  const focusLabel = focus ? (DOMAINS.find(d => d.key === focus)?.label || focus) : ''
  const ctx = [
    recentMem && `Recent: ${recentMem}`,
    goals && `Goals: ${goals}`,
    focusLabel && `Focus area: ${focusLabel}`,
    streak > 1 && `${streak}-day streak`,
  ].filter(Boolean).join('. ')
  const prompt = `Write a warm, personal ${timeOfDay} message to ${name} as ${aiName}, their AI companion. Be specific, caring, under 40 words. Reference their life if you know it. End with one gentle open question or encouragement. No quotes, no "Good ${timeOfDay}" opener — jump straight in. Context: ${ctx || 'new user'}`
  const reply = await groq([{ role: 'user', content: prompt }], `You are ${aiName}, a warm AI life companion. Write in first person as ${aiName}.`, 80, 0.9)
  return reply || `Thinking of you today, ${name}. What's one thing on your mind right now?`
}

function calcGratitudeStreak(profile: UserProfile): number {
  const entries = (profile.gratitudeEntries || []).map(e => e.date).sort().reverse()
  if (!entries.length) return 0
  let streak = 0
  let check = new Date()
  for (const date of entries) {
    const d = check.toISOString().slice(0, 10)
    if (date === d) { streak++; check.setDate(check.getDate() - 1) }
    else if (date < d) break
  }
  return streak
}

async function generatePersonalizedMessages(profile: UserProfile): Promise<string[]> {
  const name = profile.name || 'friend'
  const aiName = profile.aiName || 'Soma'
  const streak = calcGratitudeStreak(profile)
  const totalEntries = (profile.gratitudeEntries || []).length + (profile.loveEntries || []).length
  const activeMeds = (profile.medications || []).filter(m => m.active).map(m => m.name)

  // Gather positive signals from their data
  const posMemories = (profile.memories || [])
    .filter(m => m.sentiment === 'positive').slice(-8).map(m => m.content)
  const gratItems = (profile.gratitudeEntries || [])
    .slice(-5).flatMap(e => e.items).filter(Boolean)
  const affirmations = (profile.loveEntries || [])
    .slice(-4).map(e => e.affirmation).filter(Boolean)
  const circleNames = (profile.circle || [])
    .filter(c => c.relationship !== 'self').map(c => c.name).slice(0, 4)
  const diaryHighlights = (profile.diary || [])
    .slice(-4).map(e => e.summary).filter(Boolean)

  const context = [
    posMemories.length ? `Positive memories: ${posMemories.join('; ')}` : '',
    gratItems.length ? `Gratitude entries: ${gratItems.join(', ')}` : '',
    affirmations.length ? `Personal affirmations: ${affirmations.join('; ')}` : '',
    circleNames.length ? `Important people: ${circleNames.join(', ')}` : '',
    diaryHighlights.length ? `Recent diary notes: ${diaryHighlights.join('; ')}` : '',
    activeMeds.length ? `On healing journey with: ${activeMeds.join(', ')}` : '',
    streak > 0 ? `Current check-in streak: ${streak} days` : '',
    totalEntries > 0 ? `Total reflections written: ${totalEntries}` : '',
  ].filter(Boolean).join('\n')

  const noDataFallback = [
    `Psst, ${name}… I've been waiting all day 👀`,
    `${name}! ${aiName} misses you. Come say hi 💜`,
    `Your streak won't build itself, ${name} 🔥`,
    `One minute. That's all I'm asking, ${name} ⏱️`,
    `${name}, I saved something for you. Come see 🎁`,
    `You opened me yesterday. Don't break the habit 😤`,
    `${name}, even 30 seconds of reflection changes your day ✨`,
  ]

  if (!context.trim()) return noDataFallback

  const prompt = `You are ${aiName}, the AI companion in ${name}'s SOMA app — a personal life OS for healing and growth.

Your job: write 7 short push notification messages to get ${name} to open the app today.

Be like Duolingo's owl — fun, a little cheeky, sometimes creating playful urgency, sometimes warm and personal. Mix these 7 tones (one message per tone, in this order):
1. PLAYFUL NUDGE — tease them into opening the app (fun, a little dramatic)
2. STREAK URGENCY — reference their ${streak > 0 ? streak + '-day streak' : 'check-in habit'}, make them not want to lose it
3. PERSONAL WARM — reference something specific from their life (a memory, gratitude, or person they love)
4. FOMO / CURIOSITY — hint that something is waiting for them inside the app
5. MORNING BOOST — energise them to start the day with a reflection (reference their affirmations or goals)
6. GENTLE GUILT — playfully guilt them the way a caring friend would ("I waited… again 😑")
7. CELEBRATION — celebrate their progress, streak, or healing journey

Rules:
- Each message under 85 characters
- End with ONE emoji that fits the tone
- Use ${name}'s name in at least 3 of the 7 messages
- Reference their REAL data below — not generic phrases
- No numbering, no quotes, just the message text

${name}'s data:
${context}

Write exactly 7 lines:`

  try {
    const raw = await groq([{ role: 'user', content: prompt }],
      `You are ${aiName}, a fun, warm, and slightly cheeky AI companion. You write punchy notification copy.`, 500, 0.92)
    const lines = raw.split('\n')
      .map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '').trim())
      .filter(l => l.length > 8 && l.length < 130)
    if (lines.length >= 5) return lines.slice(0, 7)
  } catch {}

  // Personalised fallback using their real data
  const mem = posMemories[0] ? `"${posMemories[0].slice(0, 40)}…"` : 'something great'
  const grat = gratItems[0] || 'what you are grateful for'
  const person = circleNames[0] || ''
  return [
    `${name}, I've been thinking about you all day 👀`,
    streak > 1 ? `${streak}-day streak on the line, ${name}. Don't blow it now 🔥` : `${name}, let's start a streak today 🔥`,
    `You mentioned ${mem} — let's build on that 💜`,
    `I saved something for you, ${name}. Come see 🎁`,
    affirmations[0] ? `"${affirmations[0].slice(0, 50)}" — remember this today 🌅` : `${name}, what's one intention for today? 🌅`,
    `I waited yesterday… and the day before 😑 Miss me?`,
    totalEntries > 0 ? `${totalEntries} reflections in. You're actually doing this, ${name} 🏆` : `${name}, you're stronger than you think 🏆`,
  ]
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

// ════════════════════════════════════════════════════════════
// GEO LOCATION + REAL MATCHING API
// ════════════════════════════════════════════════════════════

// Get approximate device location. Web → browser API, native → expo-location.
async function getApproxLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return null
      return await new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
        )
      })
    }
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return null
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  } catch { return null }
}

// Real user returned by the backend nearby search
interface NearbyUser {
  userId: string; name: string; age: number; photo: string; bio: string
  interests: string[]; values: string[]; loveLanguage: string; attachment: string
  work: string; city: string; distanceKm: number; compatibility: number
}

const datingApi = {
  authed: () => !!auth.getToken() && !!BACKEND_URL && !BACKEND_URL.includes('localhost'),

  saveProfile: async (p: UserProfile, loc: { lat: number; lng: number } | null) => {
    const d = p.dating
    const res = await fetch(`${BACKEND_URL}/dating/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.getToken()}` },
      body: JSON.stringify({
        name: p.name, age: Number(d.age) || null, photo: d.photo, bio: d.bio,
        interests: d.interests, values: d.relationshipValues,
        loveLanguage: d.loveLanguage, attachment: d.attachment,
        lookingFor: d.lookingFor, work: d.work,
        lat: loc?.lat, lng: loc?.lng, city: d.location,
      }),
    })
    if (!res.ok) throw new Error((await res.json()).error || 'Profile save failed')
  },

  nearby: async (radiusKm = 50): Promise<NearbyUser[]> => {
    const res = await fetch(`${BACKEND_URL}/dating/nearby?radius=${radiusKm}`, {
      headers: { Authorization: `Bearer ${auth.getToken()}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Nearby search failed')
    return data.results || []
  },

  like: async (targetId: string): Promise<{ matched: boolean }> => {
    const res = await fetch(`${BACKEND_URL}/dating/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.getToken()}` },
      body: JSON.stringify({ targetId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Like failed')
    return { matched: !!data.matched }
  },

  matches: async (): Promise<NearbyUser[]> => {
    const res = await fetch(`${BACKEND_URL}/dating/matches`, {
      headers: { Authorization: `Bearer ${auth.getToken()}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Matches fetch failed')
    return data.matches || []
  },
}

// Map a real backend user into the Candidate card shape used by the UI
function nearbyToCandidate(u: NearbyUser): Candidate & { realUserId: string } {
  return {
    realUserId: u.userId,
    name: u.name, age: u.age || 0, emoji: '💜', color: '#7B6EF6',
    photo: u.photo || '', location: u.city || 'Nearby',
    distance: `${u.distanceKm} km`, height: '', weight: '',
    bio: u.bio || '', values: u.values || [], interests: u.interests || [],
    agentName: 'their Soma', loveLanguage: u.loveLanguage || '', attachment: u.attachment || '',
    intimacy: '', work: u.work || '', children: '', pets: '',
    tags: (u.interests || []).slice(0, 5).map(i => ({ icon: '✨', label: i })),
  }
}

// ── MATCH CONFETTI ─────────────────────────────────────────
const CONFETTI_COLORS = ['#7B6EF6', '#F6A86E', '#6EE6C0', '#F66E8E', '#F6E86E', '#6ECFF6', '#A89BFA']
function MatchConfetti() {
  const particles = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      x: new Animated.Value(Math.random()),
      y: new Animated.Value(0),
      op: new Animated.Value(1),
      rot: new Animated.Value(0),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + Math.random() * 7,
      startX: 0.1 + Math.random() * 0.8,
    }))
  ).current
  useEffect(() => {
    const anims = particles.map(p =>
      Animated.parallel([
        Animated.timing(p.y, { toValue: 1, duration: 1400 + Math.random() * 600, useNativeDriver: true }),
        Animated.timing(p.op, { toValue: 0, duration: 1600 + Math.random() * 400, useNativeDriver: true }),
        Animated.timing(p.rot, { toValue: 1, duration: 1200 + Math.random() * 800, useNativeDriver: true }),
      ])
    )
    Animated.stagger(60, anims).start()
  }, [])
  const W = 340, H = 280
  return (
    <View style={{ width: W, height: H, position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const tx = p.y.interpolate({ inputRange: [0, 1], outputRange: [0, (Math.random() - 0.5) * 120] })
        const ty = p.y.interpolate({ inputRange: [0, 1], outputRange: [0, -H * 0.85] })
        const rotate = p.rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(Math.random() > 0.5 ? 1 : -1) * 540}deg`] })
        return (
          <Animated.View key={i} style={{
            position: 'absolute',
            left: p.startX * W, top: H * 0.7,
            width: p.size, height: p.size,
            borderRadius: Math.random() > 0.5 ? p.size / 2 : 2,
            backgroundColor: p.color,
            opacity: p.op,
            transform: [{ translateX: tx }, { translateY: ty }, { rotate }],
          }} />
        )
      })}
    </View>
  )
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
async function groq(messages: any[], system: string, maxTokens = 200, temperature = 0.85): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000) // never hang forever
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_KEY}` },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', max_tokens: maxTokens, temperature,
        messages: [{ role: 'system', content: system }, ...messages] }),
      signal: ctrl.signal,
    })
    if (!res.ok) { console.warn('[groq] HTTP', res.status, await res.text().catch(() => '')); return '' }
    const d = await res.json()
    return d.choices?.[0]?.message?.content ?? ''
  } catch (e) {
    console.warn('[groq] request failed:', e instanceof Error ? e.message : e)
    return ''
  } finally {
    clearTimeout(timer)
  }
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
- If someone sounds hopeless or mentions not wanting to live, you stay warm, take it seriously, never minimize, and always steer them toward a real human and crisis support.${langDirective()}`
  const ob = p.onboarding
  const obContext = ob && (ob.goals.length || ob.focusDomains.length) ? `
WHY THEY CAME (from onboarding — weave this in naturally, don't list it back at them):
${ob.goals.length ? `- Goals: ${ob.goals.join(', ')}` : ''}
${ob.focusDomains.length ? `- Life areas they want to work on: ${ob.focusDomains.join(', ')}` : ''}` : ''
  if (mode === 'try') return `${base}${obContext}
This person is trying SOMA for the first time. Make them feel deeply heard. Be their friend right now. ${ob?.goals.length ? 'Open by gently acknowledging what brought them here.' : ''} 2-3 sentences. One warm question. After 3-4 exchanges, gently mention they can keep this forever by joining SOMA.`
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

async function extract(msg: string): Promise<{ memories: { domain: DomainKey; content: string; sentiment?: Sentiment }[]; people: { name: string; relationship: string; context: string; interests: string[] }[]; name?: string }> {
  try {
    const res = await groq([{ role: 'user', content:
`Extract facts from this message. Return ONLY JSON.
Message: "${msg}"
{
 "name": "their first name if they introduce themselves else null",
 "memories": [{"domain":"health|career|finance|relationship|family|growth|hobby|purpose|mind|environment","content":"fact under 12 words","sentiment":"positive|neutral|negative"}],
 "people": [{"name":"name","relationship":"mom|friend|partner|etc","context":"brief","interests":["shared interest"]}]
}
Rules: Skip vague or incomplete fragments (e.g. "I want to", "maybe"). Only store clear, self-contained facts.
sentiment = how this is going for them: "negative" for a struggle/loss/regret/worry, "positive" for a win/joy/progress, "neutral" for a plain fact.
${currentLangCode() === 'en' ? '' : `Write the "content" and "context" text in ${currentLangName()}, but keep "domain" and "sentiment" exactly as the English keyword options above.\n`}Max 3 memories, 2 people. JSON only:` }],
      'You are a precise JSON extractor. Return only valid JSON.', 400, 0.2)
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
// Voices load asynchronously on web — cache them and refresh on voiceschanged.
let cachedVoices: SpeechSynthesisVoice[] = []
if (typeof window !== 'undefined' && window.speechSynthesis) {
  cachedVoices = window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => { cachedVoices = window.speechSynthesis.getVoices() }
}

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices()
  return cachedVoices
}

// macOS/iOS novelty voices — funny, not companion material
const NOVELTY_VOICES = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i

// Voices for the app's language, best quality first (local/premium voices on top)
function voicesForLang(lang: string): SpeechSynthesisVoice[] {
  const all = getVoices().filter(v => !NOVELTY_VOICES.test(v.name))
  const prefix = (lang || 'en').slice(0, 2).toLowerCase()
  const match = all.filter(v => v.lang.toLowerCase().startsWith(prefix))
  const pool = match.length ? match : all.filter(v => v.lang.toLowerCase().startsWith('en'))
  // Premium/natural voices first, then local, then the rest
  const score = (v: SpeechSynthesisVoice) =>
    (/premium|enhanced|natural|neural/i.test(v.name) ? 4 : 0) +
    (/samantha|karen|moira|daniel|serena|allison|ava|zoe|tom/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0)
  return [...pool].sort((a, b) => score(b) - score(a))
}

const DEFAULT_VOICE_RATE = 0.95
const DEFAULT_VOICE_PITCH = 1.0

function speak(t: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const p = DB.get()
  const vs = p.voiceSettings
  const u = new SpeechSynthesisUtterance(t)
  u.rate = vs?.rate ?? DEFAULT_VOICE_RATE
  u.pitch = vs?.pitch ?? DEFAULT_VOICE_PITCH
  u.lang = p.language || 'en'
  const ranked = voicesForLang(p.language || 'en')
  const chosen = vs?.voiceName ? ranked.find(v => v.name === vs.voiceName) : undefined
  const v = chosen || ranked[0]
  if (v) { u.voice = v; u.lang = v.lang }
  window.speechSynthesis.speak(u)
}

function listen(onResult: (t: string) => void, onEnd: () => void) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { alert('Use Chrome for voice'); return }
  const lang = DB.get().language || 'en'
  const r = new SR(); r.lang = lang === 'en' ? 'en-US' : lang; r.interimResults = false
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
type Screen = 'splash' | 'language' | 'onboarding' | 'try' | 'register' | 'home' | 'aura' | 'diary' | 'circle' | 'lifebalance' | 'meetpeople' | 'myprofile' | 'buildprofile' | 'connections' | 'likedyou' | 'diaryhistory' | 'insights' | 'settings' | 'login' | 'gratitude' | 'loveyourself' | 'medication' | 'therapy' | 'healthhub'

// ════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [profile, setProfile] = useState<UserProfile>(DB.get())
  const refresh = () => setProfile(DB.get())

  useEffect(() => {
    const t = setTimeout(() => {
      const p = DB.get()
      setScreen(p.registered ? 'home' : !p.languageChosen ? 'language' : !p.onboarding ? 'onboarding' : 'try')
    }, 1900)
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

  // Sync local notifications whenever relevant profile data changes
  useEffect(() => {
    const ns = profile.notifSettings
    if (!ns?.enabled) { cancelNotifsByPrefix('med_'); cancelNotifsByPrefix('gratitude_'); return }
    syncMedNotifications(profile.medications || [], ns.medReminders)
    const msgs = profile.notifMessages || []
    syncGratitudeNotification(ns.gratitudeHour ?? 21, ns.gratitudeMinute ?? 0, ns.gratitudeEnabled, msgs)
  }, [profile.notifSettings, profile.medications, profile.notifMessages])

  // Regenerate personalized messages when user's positive data grows
  useEffect(() => {
    const ns = profile.notifSettings
    if (!ns?.enabled || !ns.gratitudeEnabled) return
    const dataSize = (profile.memories?.length || 0) + (profile.gratitudeEntries?.length || 0) + (profile.loveEntries?.length || 0)
    const cachedSize = (profile.notifMessages || []).length
    // Regenerate if no cache yet, or data has grown significantly (every 3 new entries)
    const shouldRegen = cachedSize === 0 || dataSize > 0 && dataSize % 3 === 0
    if (!shouldRegen) return
    generatePersonalizedMessages(profile).then(msgs => {
      DB.setNotifMessages(msgs)
      refresh()
    })
  }, [profile.memories?.length, profile.gratitudeEntries?.length, profile.loveEntries?.length])

  const go = (s: Screen) => { refresh(); setScreen(s) }

  if (screen === 'splash')      return <Splash />
  if (screen === 'language')    return <LanguageSelect onDone={() => go('onboarding')} />
  if (screen === 'onboarding')  return <Onboarding onDone={() => go('try')} />
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
  if (screen === 'settings')    return <Settings profile={profile} onBack={() => go('home')} onRefresh={refresh} onReset={() => { DB.reset(); go('language') }} />
  if (screen === 'gratitude')   return <ThankfulDiary profile={profile} onBack={() => go('home')} onRefresh={refresh} />
  if (screen === 'loveyourself')return <LoveYourself profile={profile} onBack={() => go('home')} onRefresh={refresh} />
  if (screen === 'medication')  return <MedicationTracker profile={profile} onBack={() => go('healthhub')} onRefresh={refresh} />
  if (screen === 'therapy')     return <TherapyConnect profile={profile} onBack={() => go('home')} onRefresh={refresh} />
  if (screen === 'healthhub')   return <HealthHub profile={profile} onBack={() => go('home')} onRefresh={refresh} onMedication={() => go('medication')} />
  return <Home profile={profile} go={go} onReset={() => { DB.reset(); go('language') }} />
}

// ── SPLASH ─────────────────────────────────────────────────
// First-run language picker — choose before talking with Soma.
function LanguageSelect({ onDone }: { onDone: () => void }) {
  return (
    <View style={[g.screen, { paddingHorizontal: 28, paddingTop: 84 }]}>
      <Text style={{ fontSize: 44, textAlign: 'center' }}>🌍</Text>
      <Text style={{ fontSize: 25, fontWeight: '800', color: '#222540', textAlign: 'center', marginTop: 14 }}>Choose your language</Text>
      <Text style={{ fontSize: 14, color: '#6E7191', textAlign: 'center', marginTop: 8, marginBottom: 26 }}>Soma will talk with you in this language. You can change it anytime in Settings.</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 50 }}>
        {LANGS.map(l => (
          <TouchableOpacity key={l.code} activeOpacity={0.85} onPress={() => { DB.setLanguage(l.code); onDone() }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 17, borderWidth: 1.5, borderColor: '#E9E6F2', ...shadowSm }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#222540' }}>{l.label}</Text>
            <Text style={{ fontSize: 13, color: '#8A8FA8' }}>{l.name} →</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

// ── ONBOARDING ─────────────────────────────────────────────
// 4 steps: welcome → why are you here → focus areas → meet Soma.
// Everything chosen here seeds Soma's first conversation.
const ONBOARDING_GOALS = [
  { key: 'heal',    emoji: '🌱', label: 'Heal & feel better',          sub: 'Recover, rebuild, breathe again' },
  { key: 'know',    emoji: '🪞', label: 'Understand myself',           sub: 'Patterns, emotions, what drives me' },
  { key: 'habits',  emoji: '🔄', label: 'Build better habits',         sub: 'Small daily wins that stick' },
  { key: 'balance', emoji: '⚖️', label: 'Balance my life',             sub: 'Work, rest, people, purpose' },
  { key: 'love',    emoji: '💞', label: 'Find meaningful connection',  sub: 'Friendship, love, belonging' },
  { key: 'health',  emoji: '❤️', label: 'Take care of my health',      sub: 'Body, sleep, energy, meds' },
]

function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [goals, setGoals] = useState<string[]>([])
  const [domains, setDomains] = useState<DomainKey[]>([])
  const fade = useRef(new Animated.Value(1)).current

  const next = () => {
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setStep(s => s + 1)
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start()
    })
  }

  const toggleGoal = (key: string) =>
    setGoals(g => g.includes(key) ? g.filter(x => x !== key) : [...g, key])
  const toggleDomain = (key: DomainKey) =>
    setDomains(d => d.includes(key) ? d.filter(x => x !== key) : d.length < 3 ? [...d, key] : d)

  const finish = () => { DB.setOnboarding(goals, domains); onDone() }

  const Dots = () => (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === step ? '#7B6EF6' : '#DDD9EE' }} />
      ))}
    </View>
  )

  return (
    <View style={[g.screen, { paddingHorizontal: 26, paddingTop: 70 }]}>
      <Dots />
      <Animated.View style={{ flex: 1, opacity: fade }}>

        {/* STEP 0 — Welcome */}
        {step === 0 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 22 }}>
              <Image source={require('./assets/icon.png')} style={{ width: 76, height: 76, borderRadius: 20 }} />
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#222540', marginTop: 16, textAlign: 'center', lineHeight: 29 }}>
                Life gets heavy.{'\n'}You don't have to carry it alone.
              </Text>
              <Text style={{ fontSize: 14, color: '#6E7191', textAlign: 'center', marginTop: 10, lineHeight: 21 }}>
                SOMA is your private space to heal, grow, and understand yourself — with an AI companion who actually remembers you.
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              {[
                ['🧠', 'A companion who listens and remembers'],
                ['📖', 'Daily reflection that builds self-knowledge'],
                ['❤️‍🩹', 'Tools for healing — meds, therapy, gratitude'],
                ['🤝', 'Deeper connections, with yourself first'],
              ].map(([e, t]) => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, ...shadowSm }}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#3A3D55', flex: 1 }}>{t}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* STEP 1 — Why are you here */}
        {step === 1 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#222540' }}>What brings you here?</Text>
            <Text style={{ fontSize: 14, color: '#6E7191', marginTop: 6, marginBottom: 20 }}>Pick everything that feels true. Soma shapes itself around this.</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 110 }}>
              {ONBOARDING_GOALS.map(gl => {
                const on = goals.includes(gl.key)
                return (
                  <TouchableOpacity key={gl.key} activeOpacity={0.85} onPress={() => toggleGoal(gl.key)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: on ? '#F1EEFF' : '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 2, borderColor: on ? '#7B6EF6' : '#ECE9F4', ...shadowSm }}>
                    <Text style={{ fontSize: 26 }}>{gl.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15.5, fontWeight: '800', color: '#222540' }}>{gl.label}</Text>
                      <Text style={{ fontSize: 12.5, color: '#8A8FA8', marginTop: 2 }}>{gl.sub}</Text>
                    </View>
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? '#7B6EF6' : '#D5D1E4', backgroundColor: on ? '#7B6EF6' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* STEP 2 — Focus domains */}
        {step === 2 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#222540' }}>Where do we start?</Text>
            <Text style={{ fontSize: 14, color: '#6E7191', marginTop: 6, marginBottom: 20 }}>Choose up to 3 areas of life you want to work on first.</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {DOMAINS.map(d => {
                  const on = domains.includes(d.key)
                  return (
                    <TouchableOpacity key={d.key} activeOpacity={0.85} onPress={() => toggleDomain(d.key)}
                      style={{ width: '47.5%' as any, backgroundColor: on ? d.color + '22' : '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: on ? d.color : '#ECE9F4', ...shadowSm }}>
                      <Text style={{ fontSize: 30 }}>{d.icon}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: on ? '#222540' : '#4A4D66', marginTop: 8 }}>{d.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              {domains.length === 3 && <Text style={{ textAlign: 'center', fontSize: 12.5, color: '#7B6EF6', fontWeight: '600', marginTop: 14 }}>Perfect — 3 picked. We'll grow from here. 🌱</Text>}
            </ScrollView>
          </View>
        )}

        {/* STEP 3 — Meet Soma */}
        {step === 3 && (
          <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 90, alignItems: 'center' }}>
            <Image source={require('./assets/icon.png')} style={{ width: 116, height: 116, borderRadius: 30, marginBottom: 24 }} />
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#222540', textAlign: 'center' }}>Soma is ready for you</Text>
            <Text style={{ fontSize: 15, color: '#6E7191', textAlign: 'center', marginTop: 12, lineHeight: 23, paddingHorizontal: 10 }}>
              {goals.length > 0
                ? `You came here to ${ONBOARDING_GOALS.filter(gl => goals.includes(gl.key)).map(gl => gl.label.toLowerCase()).slice(0, 2).join(' and ')}. Soma will remember that — and everything you share from now on.`
                : 'Everything you share stays between you and Soma. The more you talk, the better Soma knows you.'}
            </Text>
            <View style={{ marginTop: 26, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, width: '100%', ...shadowSm }}>
              <Text style={{ fontSize: 13, color: '#8A8FA8', lineHeight: 19, textAlign: 'center' }}>
                🔒 Your conversations are private and stay on your device.
              </Text>
            </View>
          </View>
        )}

      </Animated.View>

      {/* Bottom CTA */}
      <View style={{ paddingBottom: 40, paddingTop: 10 }}>
        <TouchableOpacity activeOpacity={0.9}
          onPress={step === 3 ? finish : next}
          disabled={step === 1 && goals.length === 0}
          style={{ backgroundColor: step === 1 && goals.length === 0 ? '#C9C4E4' : '#7B6EF6', borderRadius: 16, paddingVertical: 17, alignItems: 'center', ...shadowSm }}>
          <Text style={{ color: '#fff', fontSize: 16.5, fontWeight: '800' }}>
            {step === 0 ? 'Get started' : step === 1 ? (goals.length > 0 ? 'Continue' : 'Pick at least one') : step === 2 ? (domains.length > 0 ? 'Continue' : 'Skip for now') : 'Meet Soma →'}
          </Text>
        </TouchableOpacity>
        {step > 0 && step < 3 && (
          <TouchableOpacity onPress={next} style={{ alignItems: 'center', marginTop: 14 }}>
            <Text style={{ color: '#9CA0B5', fontSize: 13.5, fontWeight: '600' }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// SOMA brand mark — the glowing app icon, rounded like an app tile.
function SomaMark({ size = 56 }: { size?: number }) {
  return <Image source={require('./assets/icon.png')} style={{ width: size, height: size, borderRadius: size * 0.26 }} />
}

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
        <SomaMark size={108} />
        <Text style={[g.logo, { marginTop: 16 }]}>SOMA</Text>
        <Text style={g.logoSub}>Know yourself before knowing each other.</Text>
      </Animated.View>
    </View>
  )
}

// ── REGISTER ───────────────────────────────────────────────
// Brand logos for the sign-up buttons (crisp vector marks).
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <SvgPath fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <SvgPath fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <SvgPath fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <SvgPath fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    </Svg>
  )
}
function AppleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 384 512">
      <SvgPath fill="#000000" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </Svg>
  )
}
function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 320 512">
      <SvgPath fill="#1877F2" d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
    </Svg>
  )
}

function Register({ onDone }: { onDone: (name: string) => void }) {
  const [step, setStep] = useState<'method' | 'email' | 'verify'>('method')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyToken, setVerifyToken] = useState('')

  // ── Real Google OAuth (expo-auth-session) ──
  const [gRequest, gResponse, gPromptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
  })
  useEffect(() => {
    if (gResponse?.type !== 'success') return
    const accessToken = gResponse.authentication?.accessToken
    const idToken = gResponse.authentication?.idToken
    if (!accessToken && !idToken) return
    setLoading(true)
    ;(async () => {
      try {
        // Prefer backend auth with idToken (gives us real JWT + Supabase user)
        if (idToken && BACKEND_URL && !BACKEND_URL.includes('localhost')) {
          const res = await fetch(`${BACKEND_URL}/auth/social`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'google', token: idToken }),
          })
          const data = await res.json()
          if (res.ok && data.accessToken) {
            await auth.saveTokens(data.accessToken, data.refreshToken)
            const userName = data.user?.name || 'Friend'
            DB.register(userName)
            onDone(userName)
            return
          }
        }
        // Fallback: fetch profile from Google directly (dev / no backend)
        const info = await fetch('https://www.googleapis.com/userinfo/v2/me',
          { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => r.json())
        const userName = info.name || info.given_name || (info.email ? String(info.email).split('@')[0] : 'Friend')
        DB.register(userName)
        onDone(userName)
      } catch {
        alert('Google sign-in failed. Please try again.')
      } finally {
        setLoading(false)
      }
    })()
  }, [gResponse])

  const handleSocial = (provider: string) => {
    if (provider === 'Google') {
      if (GOOGLE_ENABLED && gRequest) { gPromptAsync(); return }
      alert('Google sign-in isn\'t configured yet.\n\nAdd EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and iOS/Android IDs) to your .env from Google Cloud Console, then restart. For now, use email signup.')
      return
    }
    alert(`${provider} sign-in isn't wired up yet (Apple needs a paid Apple Developer account; Facebook needs a Facebook app). Use Google or email signup for now.`)
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
          <View style={{ marginBottom: 14 }}><SomaMark size={80} /></View>
          <Text style={g.logo}>Save your story</Text>
          <Text style={g.logoSub}>Keep your conversations with Soma and build your life.</Text>
        </View>

        <Text style={g.secLabel}>SIGN UP WITH</Text>

        <TouchableOpacity style={g.socialBtn} onPress={() => handleSocial('Google')}>
          <View style={{ width: 28, alignItems: 'center' }}><GoogleIcon size={20} /></View>
          <Text style={g.socialLabel}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={g.socialBtn} onPress={() => handleSocial('Apple')}>
          <View style={{ width: 28, alignItems: 'center' }}><AppleIcon size={20} /></View>
          <Text style={g.socialLabel}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={g.socialBtn} onPress={() => handleSocial('Facebook')}>
          <View style={{ width: 28, alignItems: 'center' }}><FacebookIcon size={20} /></View>
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
        <TextInput style={g.authInput} value={name} onChangeText={setName} placeholder="e.g. Alex" placeholderTextColor="#9A9DB2" />

        <Text style={[g.inputLabel, { marginTop: 16 }]}>Email</Text>
        <TextInput style={g.authInput} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#9A9DB2" keyboardType="email-address" autoCapitalize="none" />

        <Text style={[g.inputLabel, { marginTop: 16 }]}>Password</Text>
        <TextInput style={g.authInput} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#9A9DB2" secureTextEntry />

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

        <View style={{ marginTop: 28, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E9E6F2' }}>
          <Text style={{ color: '#222540', fontSize: 13, lineHeight: 20 }}>
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
    try {
      const [reply, intel] = await Promise.all([
        groq(updated, auraSystem(p, mode), 180),
        mode !== 'try' ? extract(text.trim()) : Promise.resolve({ memories: [], people: [] } as any),
      ])
      if (mode !== 'try') {
        if (intel.name) DB.setName(intel.name)
        intel.memories.forEach((m: any) => DB.addMemory(m.domain, m.content, m.sentiment))
        intel.people.forEach((pe: any) => DB.upsertPerson(pe.name, pe.relationship, pe.context, pe.interests || []))
        DB.syncDatingInterests()   // daily talk auto-updates dating profile interests
        onRefresh()
      }
      const content = reply || "I'm here with you — but I'm having trouble reaching my thoughts right now (connection issue). Give me a moment and try again?"
      const final = [...updated, { role: 'assistant' as const, content }]
      setMsgs(final); scroll()
      setSpeaking(true); speak(content)
      setTimeout(() => setSpeaking(false), content.length * 60)
    } finally {
      setLoading(false)   // always clear "Thinking…", even on failure
    }
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
    const summary = await groq([{ role: 'user', content: `Summarize this diary chat in ONE warm sentence from the user perspective:\n${convo}` }], 'You write brief diary summaries.' + langDirective(), 60)
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
            <Animated.View style={{ transform: [{ scale: pulse }], marginBottom: 24 }}>
              <Image source={p.aiPhoto ? { uri: p.aiPhoto } : require('./assets/icon.png')}
                style={{ width: 132, height: 132, borderRadius: 34 }} />
            </Animated.View>
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
              <TextInput style={g.input} value={input} onChangeText={setInput} placeholder="Type or speak..." placeholderTextColor="#9A9DB2" multiline />
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
  const totalMem = profile.memories.length
  const homeScore = (k: DomainKey) => {
    const m = profile.manualScores?.[k]
    return typeof m === 'number' ? m * 10 : (profile.wheel?.scores?.[k]?.score ?? domainWellbeing(profile.memories, k))
  }
  const streak = calcActivityStreak(profile)
  const focusDomain = profile.onboarding?.focusDomains?.[0]
  const focusLabel = focusDomain ? DOMAINS.find(d => d.key === focusDomain)?.label : null
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Soma daily proactive message
  const [somaMsg, setSomaMsg] = useState<string | null>(null)
  const [somaMsgDismissed, setSomaMsgDismissed] = useState(false)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const cached = profile.somaMessage
    if (cached?.date === today) { setSomaMsg(cached.text); return }
    if (profile.conversations < 1 && !profile.memories.length) return // too early
    generateSomaDailyMessage(profile).then(msg => {
      DB.setSomaMessage(msg)
      setSomaMsg(msg)
    }).catch(() => {})
  }, [])

  // Unread badge: connections with last message from AI not yet replied to
  const unreadCount = profile.connections.filter(c =>
    c.messages.length > 0 && c.messages[c.messages.length - 1].role === 'assistant'
  ).length

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}>
        <View>
          <Text style={g.greeting}>{profile.name ? `${greeting}, ${profile.name}` : greeting}</Text>
          <Text style={g.greetDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,160,40,0.13)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 14 }}>🔥</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B', marginLeft: 4 }}>{streak} day{streak !== 1 ? 's' : ''}</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => go('settings')} onLongPress={onReset}><Text style={g.logoSm}>⚙</Text></TouchableOpacity>
        </View>
      </View>

      {/* Daily focus card */}
      {focusLabel && (
        <TouchableOpacity style={{ backgroundColor: 'rgba(123,110,246,0.08)', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => go('aura')}>
          <Text style={{ fontSize: 22 }}>{DOMAINS.find(d => d.key === focusDomain)?.icon || '✦'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#7B6EF6', letterSpacing: 0.8, marginBottom: 2 }}>TODAY'S FOCUS</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#222540' }}>{focusLabel}</Text>
            <Text style={{ fontSize: 12, color: '#6E7191', marginTop: 1 }}>Talk to Soma about it →</Text>
          </View>
        </TouchableOpacity>
      )}


      {/* Soma morning message card */}
      {somaMsg && !somaMsgDismissed && (
        <TouchableOpacity onPress={() => go('aura')} style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 16, flexDirection: 'row', gap: 12, shadowColor: '#7B6EF6', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } }}>
          <SomaMark size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#7B6EF6', letterSpacing: 0.8, marginBottom: 4 }}>{profile.aiName?.toUpperCase() || 'SOMA'}</Text>
            <Text style={{ fontSize: 14, color: '#222540', lineHeight: 20 }}>{somaMsg}</Text>
            <Text style={{ fontSize: 12, color: '#9A9DB2', marginTop: 6 }}>Tap to reply →</Text>
          </View>
          <TouchableOpacity onPress={e => { e.stopPropagation?.(); setSomaMsgDismissed(true) }} style={{ padding: 4 }}>
            <Text style={{ fontSize: 16, color: '#C4BBFB' }}>×</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Circle of Life — the hero of the home screen */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={g.secLabel}>CIRCLE OF LIFE</Text>
        <TouchableOpacity onPress={() => go('lifebalance')}><Text style={[g.secLabel, { color: '#7B6EF6' }]}>Details →</Text></TouchableOpacity>
      </View>
      <TouchableOpacity activeOpacity={0.9} onPress={() => go('lifebalance')} style={{ alignItems: 'center', marginBottom: 4 }}>
        <WheelOfLifeChart domains={DOMAINS} scoreOf={homeScore} size={320} />
      </TouchableOpacity>

      <TouchableOpacity style={[g.auraMain, { marginTop: 20 }]} onPress={() => go('aura')}>
        <View style={g.orbSm}><Text style={{ color: '#fff', fontSize: 13 }}>✦</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={g.cardTag}>AURA · YOUR AI PARTNER</Text>
          <Text style={g.auraMainTitle}>Talk about anything</Text>
          <Text style={g.auraMainSub}>{totalMem > 0 ? `${totalMem} memories · ${profile.circle.length} people` : 'Start building your story'}</Text>
        </View>
        <Text style={g.arrow}>→</Text>
      </TouchableOpacity>

      {/* Daily rituals card */}
      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10)
        const diaryToday = profile.diary.some(e => e.date?.slice(0, 10) === todayStr)
        const loveToday = profile.loveEntries?.some(e => e.date?.slice(0, 10) === todayStr) ?? false
        const gratToday = profile.gratitudeEntries?.some(e => e.date?.slice(0, 10) === todayStr) ?? false
        const activeMeds = (profile.medications || []).filter(m => m.active)
        const medLog = (profile.medLogs || []).find(l => l.date === todayStr)
        const medsDone = activeMeds.length > 0 && activeMeds.every(m => medLog?.doses?.[m.id] !== undefined)
        const rituals = [
          { icon: '📖', label: 'Diary', done: diaryToday, screen: 'diary' as Screen },
          { icon: '🌸', label: 'Love Yourself', done: loveToday, screen: 'loveyourself' as Screen },
          { icon: '🙏', label: 'Gratitude', done: gratToday, screen: 'gratitude' as Screen },
          ...(activeMeds.length > 0 ? [{ icon: '💊', label: 'Medications', done: medsDone, screen: 'medication' as Screen }] : []),
        ]
        const doneCount = rituals.filter(r => r.done).length
        return (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={g.secLabel}>TODAY</Text>
              <Text style={{ fontSize: 12, color: doneCount === rituals.length ? '#22C55E' : '#9A9DB2', fontWeight: '600' }}>{doneCount}/{rituals.length} done</Text>
            </View>
            <View style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#7B6EF6', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } }}>
              {rituals.map((r, i) => (
                <TouchableOpacity key={r.label} onPress={() => go(r.screen)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i < rituals.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F5', gap: 12 }}>
                  <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{r.icon}</Text>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: '#222540' }}>{r.label}</Text>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: r.done ? '#22C55E' : '#F0F0F5', alignItems: 'center', justifyContent: 'center' }}>
                    {r.done && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={[g.diaryCard, { flex: 1, marginBottom: 0 }]} onPress={() => go('insights')}>
                <Text style={{ fontSize: 18 }}>✦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={g.diaryTitle}>Weekly Insights</Text>
                  <Text style={g.diarySub} numberOfLines={1}>Soma's reflection</Text>
                </View>
              </TouchableOpacity>
              {profile.diary.length > 0 && (
                <TouchableOpacity style={[g.diaryCard, { flex: 1, marginBottom: 0 }]} onPress={() => go('diaryhistory')}>
                  <Text style={{ fontSize: 18 }}>📖</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={g.diaryTitle}>Diary History</Text>
                    <Text style={g.diarySub} numberOfLines={1}>{profile.diary.length} entries</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )
      })()}

      {/* Healing Path row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <TouchableOpacity style={g.medCard} onPress={() => go('healthhub')}>
          <Text style={g.loveCardEmoji}>❤️‍🩹</Text>
          <Text style={g.loveCardTitle}>Health Hub</Text>
          <Text style={g.loveCardSub}>{(() => {
            const todayLog = (profile.healthLogs || []).find(l => l.date === new Date().toISOString().slice(0,10))
            if (todayLog?.steps) return `${todayLog.steps.toLocaleString()} steps today`
            const meds = (profile.medications || []).filter(m => m.active).length
            return meds > 0 ? `${meds} med${meds>1?'s':''} tracked` : 'Track your health'
          })()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={g.therapyCard} onPress={() => go('therapy')}>
          <Text style={g.loveCardEmoji}>🧠</Text>
          <Text style={g.loveCardTitle}>Therapy & Support</Text>
          <Text style={g.loveCardSub}>{(profile.therapySessions?.length ?? 0) > 0 ? `${profile.therapySessions!.length} sessions` : 'You\'re not alone'}</Text>
        </TouchableOpacity>
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
          <View style={{ position: 'relative' }}>
            <Text style={{ fontSize: 20 }}>💬</Text>
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: '#F66E8E', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{unreadCount}</Text>
              </View>
            )}
          </View>
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
function WheelSegment({ domain, profile, angle, index, score }: { domain: typeof DOMAINS[0]; profile: UserProfile; angle: number; index: number; score: number }) {
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
          opacity: 0.2 + 0.7 * (score / 100),  // brighter = healthier area
          alignItems: 'center',
          justifyContent: 'center',
          ...shadowMd,
          transform: [{ scaleX: 0.4 }, { scaleY: 0.8 }],
        }}
      >
        <View style={{ transform: [{ rotate: `${-rotation}deg` }] }}>
          <Text style={{ fontSize: 28, marginBottom: 4 }}>{domain.icon}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' }}>{domain.label}</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 4 }}>{items.length ? score : '–'}</Text>
        </View>
      </View>
    </View>
  )
}

// A real Wheel of Life: radial chart with a spoke per domain, scores plotted as
// dots and connected into a polygon. Balanced life = smooth circle; imbalanced = jagged.
function WheelOfLifeChart({ domains, scoreOf, size = 340 }: { domains: typeof DOMAINS; scoreOf: (k: DomainKey) => number; size?: number }) {
  const C = size / 2
  const R = size / 2 - 66 // room for labels
  const N = domains.length
  const ang = (i: number) => (-90 + (360 / N) * i) * Math.PI / 180
  const pt = (i: number, r: number) => ({ x: C + r * Math.cos(ang(i)), y: C + r * Math.sin(ang(i)) })
  const scores = domains.map(d => Math.max(0, Math.min(100, scoreOf(d.key))))
  // Animate the polygon growing out from the centre on mount.
  const [prog, setProg] = useState(0)
  const av = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const id = av.addListener(({ value }) => setProg(value))
    Animated.timing(av, { toValue: 1, duration: 850, useNativeDriver: false }).start()
    return () => av.removeListener(id)
  }, [])
  const dataPts = scores.map((s, i) => pt(i, (s / 100) * R * prog))
  const polygon = dataPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map((r, i) => (
          <SvgCircle key={i} cx={C} cy={C} r={R * r} fill={i === 3 ? 'rgba(123,110,246,0.04)' : 'none'} stroke="#E5E2F0" strokeWidth={1} />
        ))}
        {domains.map((d, i) => { const e = pt(i, R); return (
          <SvgLine key={d.key} x1={C} y1={C} x2={e.x} y2={e.y} stroke="#E5E2F0" strokeWidth={1} />
        ) })}
        <SvgPolygon points={polygon} fill="rgba(123,110,246,0.20)" stroke="#7B6EF6" strokeWidth={2.5} strokeLinejoin="round" />
        {dataPts.map((p, i) => (
          <SvgCircle key={i} cx={p.x} cy={p.y} r={4.5} fill={domains[i].color} stroke="#fff" strokeWidth={1.5} />
        ))}
      </Svg>
      {domains.map((d, i) => {
        const lp = pt(i, R + 34)
        return (
          <View key={d.key} style={{ position: 'absolute', width: 64, alignItems: 'center', left: lp.x - 32, top: lp.y - 20 }}>
            <Text style={{ fontSize: 15 }}>{d.icon}</Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#222540' }} numberOfLines={1}>{d.label}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: d.color }}>{Math.round(scores[i] / 10)}/10</Text>
          </View>
        )
      })}
    </View>
  )
}

// Progress over time: a sparkline of overall balance + biggest mover since the first snapshot.
function WheelHistory({ history }: { history: WheelSnapshot[] }) {
  if (!history || history.length < 2) {
    return (
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6E7191', letterSpacing: 1, marginBottom: 8 }}>PROGRESS OVER TIME</Text>
        <View style={[g.matchCard, { marginBottom: 0 }]}>
          <Text style={{ fontSize: 13, color: '#6E7191' }}>Check in over the next days — your balance trend will appear here. 📈</Text>
        </View>
      </View>
    )
  }
  const W = 280, H = 84, pad = 8
  const vals = history.map(h => h.overall)
  const n = vals.length
  const x = (i: number) => pad + (i / (n - 1)) * (W - pad * 2)
  const y = (v: number) => H - pad - (v / 100) * (H - pad * 2)
  const line = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const first = history[0], last = history[n - 1]
  const delta = last.overall - first.overall
  let moverKey: DomainKey | null = null, moverDelta = 0
  DOMAINS.forEach(d => {
    const a = first.scores[d.key] ?? 0, b = last.scores[d.key] ?? 0
    if (Math.abs(b - a) > Math.abs(moverDelta)) { moverDelta = b - a; moverKey = d.key }
  })
  const mover = moverKey ? DOMAINS.find(d => d.key === moverKey) : null
  return (
    <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#6E7191', letterSpacing: 1, marginBottom: 8 }}>PROGRESS OVER TIME</Text>
      <View style={[g.matchCard, { marginBottom: 0 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#7B6EF6' }}>{last.overall}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: delta >= 0 ? '#1FB57A' : '#E8636F' }}>{delta >= 0 ? '▲ +' : '▼ '}{Math.abs(delta)} · since {first.date.slice(5)}</Text>
        </View>
        <Svg width={W} height={H}>
          <SvgLine x1={pad} y1={y(50)} x2={W - pad} y2={y(50)} stroke="#E5E2F0" strokeWidth={1} />
          <SvgPolyline points={line} fill="none" stroke="#7B6EF6" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {vals.map((v, i) => <SvgCircle key={i} cx={x(i)} cy={y(v)} r={3} fill="#7B6EF6" />)}
        </Svg>
        {mover && moverDelta !== 0 ? (
          <Text style={{ fontSize: 12, color: '#6E7191', marginTop: 8 }}>
            Biggest change: {mover.icon} {mover.label} {moverDelta > 0 ? '▲' : '▼'} {Math.abs(Math.round(moverDelta / 10))} pts
          </Text>
        ) : null}
      </View>
    </View>
  )
}

// ── Rich content for each life domain ─────────────────────
const DOMAIN_INFO: Record<DomainKey, { about: string; questions: string[]; tips: { emoji: string; text: string }[]; resource?: string }> = {
  health: {
    about: 'Physical and mental wellbeing — your energy, fitness, sleep, nutrition, and how your body feels day to day. Health is the foundation everything else is built on.',
    questions: [
      'How is your energy level this week — depleted, okay, or strong?',
      'Are you sleeping 7–9 hours and waking up feeling rested?',
      'When did you last move your body for at least 20 minutes?',
      'Are you eating in a way that gives you energy, not just filling hunger?',
    ],
    tips: [
      { emoji: '🚶', text: 'Walk 20 minutes outdoors daily — sunlight + movement is the highest-ROI health habit.' },
      { emoji: '😴', text: 'Go to bed and wake up at the same time every day — even weekends. Your circadian rhythm matters.' },
      { emoji: '💧', text: 'Drink 2 litres of water before you reach for coffee or snacks. Dehydration mimics tiredness.' },
      { emoji: '🩺', text: 'Schedule your annual check-up if you\'ve skipped it. Prevention beats cure every time.' },
    ],
    resource: 'Talk to Soma about how you\'re feeling physically — she can help you track patterns and notice what\'s draining you.',
  },
  career: {
    about: 'Your work, professional growth, job satisfaction, and sense of progress. Career fulfilment comes from doing work that challenges you, aligns with your values, and feels meaningful.',
    questions: [
      'Do you feel engaged and challenged by your work most days?',
      'Are you learning and growing, or have you plateaued?',
      'Does your work align with your deeper values and goals?',
      'Is the balance between effort and recognition fair to you?',
    ],
    tips: [
      { emoji: '📚', text: 'Block 30 minutes weekly for deliberate learning — a course, book, or skill. Growth compounds.' },
      { emoji: '🗓️', text: 'Have a career conversation with your manager or mentor this month. Ask: "What should I focus on next?"' },
      { emoji: '✅', text: 'Keep a "wins log" — write down accomplishments weekly. It builds confidence and updates your résumé naturally.' },
      { emoji: '🌐', text: 'Nurture your network before you need it — one meaningful outreach per week.' },
    ],
    resource: 'Tell Soma about your work — what energises you, what frustrates you. She builds a picture of your career over time.',
  },
  finance: {
    about: 'Your financial security, savings habits, and freedom from money stress. Financial health isn\'t about wealth — it\'s about feeling in control and having a cushion for life\'s surprises.',
    questions: [
      'Do you know where your money goes each month?',
      'Do you have an emergency fund covering 3–6 months of expenses?',
      'Are you saving something — even a little — toward your future self?',
      'Does money stress take up mental space you\'d rather use elsewhere?',
    ],
    tips: [
      { emoji: '📊', text: 'Track expenses for 14 days — even roughly. Awareness alone changes behaviour.' },
      { emoji: '🛡️', text: 'Build a ₹/$/€ 1,000 starter emergency fund first — it breaks the "debt spiral" for most people.' },
      { emoji: '⚙️', text: 'Automate savings on payday. "Pay yourself first" beats willpower every time.' },
      { emoji: '📉', text: 'List your debts by interest rate. Attack the highest-rate debt first (avalanche method).' },
    ],
    resource: 'Share your financial worries with Soma — she can help you think through priorities without judgment.',
  },
  relationship: {
    about: 'Your romantic relationship — its depth, trust, communication, and how emotionally safe and loved you feel. Healthy love is built through daily attention, not grand gestures.',
    questions: [
      'Do you feel emotionally safe being fully yourself with your partner?',
      'Are you expressing your needs clearly, and listening to theirs?',
      'When did you last do something that made your partner feel truly seen?',
      'Are there patterns — arguments, distance — that keep repeating?',
    ],
    tips: [
      { emoji: '🗣️', text: 'Practice "bids for connection" — respond to your partner\'s small moments of reaching out. Gottman research shows these matter most.' },
      { emoji: '❤️', text: 'Learn your partner\'s love language and speak it intentionally this week.' },
      { emoji: '🚫', text: 'In conflict, pause before reacting. A 20-second breath prevents 80% of escalations.' },
      { emoji: '📅', text: 'Schedule a date night — recurring, protected time signals that the relationship is a priority.' },
    ],
    resource: 'Soma is a judgment-free space to talk through relationship patterns, fears, or hopes.',
  },
  family: {
    about: 'Your bonds with parents, siblings, children, and extended family — the quality of connection, love, and the weight of any unresolved tensions. Family shapes us deeply.',
    questions: [
      'How connected do you feel to the family members who matter most to you?',
      'Are there tensions or unsaid things that have built up over time?',
      'Are you making time for the people in your family who need you — or you need?',
      'What does "healthy family" mean to you, and how close are you to it?',
    ],
    tips: [
      { emoji: '📞', text: 'Call one family member this week just to check in — not to share news, but to listen.' },
      { emoji: '🍽️', text: 'Share a meal together — research consistently shows shared meals strengthen family bonds.' },
      { emoji: '✍️', text: 'Write a letter (or voice note) to a family member you appreciate. Say it out loud.' },
      { emoji: '🧘', text: 'Set gentle limits with family dynamics that drain you. Boundaries are acts of love, not rejection.' },
    ],
    resource: 'Tell Soma about your family — she remembers details across conversations and can help you think through complex dynamics.',
  },
  growth: {
    about: 'Your personal development, self-awareness, learning, and progress toward becoming who you want to be. Growth means choosing discomfort over comfort — on purpose.',
    questions: [
      'What are you actively learning or working to improve right now?',
      'Are you challenging yourself, or staying safely in your comfort zone?',
      'Are your daily actions moving you toward your goals, or just filling time?',
      'When did you last do something that genuinely stretched you?',
    ],
    tips: [
      { emoji: '📖', text: 'Read 10 pages of a non-fiction book daily. That\'s 12+ books per year without effort.' },
      { emoji: '🎯', text: 'Pick one skill to develop this month — just one. Depth beats breadth for growth.' },
      { emoji: '📓', text: 'Keep a learning journal: "What did I learn today? What will I do differently?" — even one line.' },
      { emoji: '🙋', text: 'Seek feedback from someone you respect. External mirrors are the fastest path to self-awareness.' },
    ],
    resource: 'Share your goals with Soma — she tracks what you\'re working toward and reflects your progress back to you.',
  },
  hobby: {
    about: 'Your hobbies, creativity, play, and activities that bring you joy for their own sake — with no performance pressure or outcome required. Play is not optional; it restores the rest of life.',
    questions: [
      'When did you last do something purely for the joy of it — no productivity, no goal?',
      'Do you have hobbies that fully absorb you and make you lose track of time?',
      'Are you nurturing your creative side, even in small ways?',
      'Are you giving yourself permission to be a beginner at something?',
    ],
    tips: [
      { emoji: '🗓️', text: 'Schedule "play time" like any other commitment — fun that\'s planned actually happens.' },
      { emoji: '🎨', text: 'Try one new creative activity this month — drawing, cooking, music, writing. Outcome doesn\'t matter.' },
      { emoji: '✅', text: 'Say yes to a spontaneous social plan this week. Novelty is the antidote to routine fatigue.' },
      { emoji: '📵', text: 'Do a hobby without your phone nearby. Full presence is what makes it restorative.' },
    ],
    resource: 'Tell Soma about what you enjoy — your hobbies automatically appear in your dating profile and matching.',
  },
  purpose: {
    about: 'Your sense of meaning, direction, and contribution — your "why." Purpose isn\'t found; it\'s built through action, reflection, and paying attention to what moves you.',
    questions: [
      'What makes you feel most alive and like you\'re exactly where you should be?',
      'Are your daily actions — work, relationships, habits — aligned with what you value most?',
      'What kind of impact do you want to have, and are you moving toward it?',
      'If you had all the time and money you needed, what would you spend your energy on?',
    ],
    tips: [
      { emoji: '✍️', text: 'Write your personal mission in one sentence: "I use [strength] to [impact] for [who]." Revisit it monthly.' },
      { emoji: '🤝', text: 'Volunteer for one cause you care about — purpose often lives where your skills meet the world\'s needs.' },
      { emoji: '🔍', text: 'Notice what you talk about with energy and what you do without being asked. That\'s a signal.' },
      { emoji: '🌅', text: 'Start your day with a "why" — one sentence about why today matters. It changes how you show up.' },
    ],
    resource: 'Soma\'s deepest conversations are about meaning and purpose. Share what you\'re wrestling with.',
  },
  mind: {
    about: 'Your mental health, emotional regulation, stress levels, focus, and inner peace. The mind is the lens through which you experience everything — it deserves the most care.',
    questions: [
      'How is your stress level right now — manageable, elevated, or overwhelming?',
      'Do you have practices that calm and restore your mind, or are you running on empty?',
      'Are you being kind to yourself — as kind as you\'d be to a good friend?',
      'Are you carrying anything you haven\'t talked about with anyone?',
    ],
    tips: [
      { emoji: '🧘', text: 'Meditate for 5 minutes daily — just notice your breath. Even this tiny practice reshapes the brain over weeks.' },
      { emoji: '✍️', text: 'Write 3 sentences each morning — whatever\'s in your head. No filter, no goal. It clears mental clutter.' },
      { emoji: '📵', text: 'Take 1 hour offline each day — social media is engineered to amplify anxiety. Your nervous system needs recovery.' },
      { emoji: '🗣️', text: 'Talk to someone — a friend, therapist, or Soma. Unexpressed emotion compounds. Saying it out loud helps.' },
    ],
    resource: 'Your mental wellbeing matters more than any other life area. Soma is always here — talk as much as you need.',
  },
  environment: {
    about: 'Your home and living environment — how safe, comfortable, organised, and restorative your physical space feels. Your environment shapes your mood, energy, and behaviour constantly.',
    questions: [
      'Does your home feel like a sanctuary — a place that restores you?',
      'Is clutter or disorganisation quietly draining your energy?',
      'Do you feel physically safe and secure where you live?',
      'Does your space reflect who you are and how you want to feel?',
    ],
    tips: [
      { emoji: '🧹', text: 'Declutter one drawer or surface today. Small order creates a surprising sense of calm.' },
      { emoji: '🌿', text: 'Add one plant or improve natural light — both measurably improve mood and focus.' },
      { emoji: '🕯️', text: 'Design a morning and evening routine anchored to your home — transitions need ritual.' },
      { emoji: '🎵', text: 'Curate your sonic environment — music, silence, or ambient sound changes your state more than you think.' },
    ],
    resource: 'Tell Soma about your living situation — she can help you think through what changes would most improve your everyday.',
  },
}

function LifeBalance({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const [selectedDomain, setSelectedDomain] = useState<DomainKey | null>(null)
  const [expandedInfo, setExpandedInfo] = useState<DomainKey | null>(null)
  const [wheel, setWheel] = useState<WheelAssessment | undefined>(profile.wheel)
  const [assessing, setAssessing] = useState(false)
  const [manual, setManual] = useState<Partial<Record<DomainKey, number>>>(profile.manualScores || {})
  const [hist, setHist] = useState<WheelSnapshot[]>(profile.wheelHistory || [])
  // Tap a pip to set your own 1-10 rating; tap the same value again to clear it.
  const setRating = (k: DomainKey, n: number) => {
    const next = { ...manual }
    if (next[k] === n) delete next[k]; else next[k] = n
    setManual(next); DB.setManualScore(k, next[k])
  }

  const runAssessment = () => {
    if (assessing || profile.memories.length === 0) return
    setAssessing(true)
    assessWheel(profile).then(w => { DB.setWheel(w); setWheel(w) }).catch(() => {}).then(() => setAssessing(false))
  }
  // Re-assess whenever new things have been shared since the last assessment.
  useEffect(() => {
    if (profile.memories.length > 0 && (!wheel || wheel.basis !== profile.memories.length)) runAssessment()
  }, [])

  // Your own rating wins; otherwise Soma's assessment; otherwise the quick heuristic.
  const domScore = (k: DomainKey) => (typeof manual[k] === 'number' ? manual[k]! * 10 : (wheel?.scores?.[k]?.score ?? domainWellbeing(profile.memories, k)))
  const domNote = (k: DomainKey) => (typeof manual[k] === 'number' ? '' : (wheel?.scores[k]?.note || ''))
  // Overall reflects manual ratings + assessment, averaged across all domains.
  const ob = Math.round(DOMAINS.reduce((s, d) => s + domScore(d.key), 0) / DOMAINS.length)

  // Record a daily snapshot of the wheel so the History view can show progress.
  useEffect(() => {
    const scores: Partial<Record<DomainKey, number>> = {}
    DOMAINS.forEach(d => { scores[d.key] = domScore(d.key) })
    DB.recordWheelSnapshot(ob, scores)
    setHist(DB.get().wheelHistory || [])
  }, [wheel, manual])

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ minHeight: '100%', paddingBottom: 60 }}>
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>{t('back')}</Text></TouchableOpacity></View>

      <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
        <Text style={g.greeting}>{t('wheelTitle')}</Text>
        <Text style={g.auraSub} style={{ marginTop: 6, fontSize: 13, color: '#6E7191' }}>
          {assessing ? t('reflecting') : t('wheelSub')}
        </Text>
      </View>

      {/* Wheel of Life — real radial chart */}
      <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <WheelOfLifeChart domains={DOMAINS} scoreOf={domScore} size={340} />
        {(() => {
          const sc = DOMAINS.map(d => domScore(d.key))
          const spread = Math.max(...sc) - Math.min(...sc)
          const smooth = spread <= 25 && Math.min(...sc) >= 40
          return (
            <Text style={{ marginTop: 10, fontSize: 13, color: '#6E7191', textAlign: 'center', paddingHorizontal: 34, lineHeight: 19 }}>
              {smooth ? 'A smooth, rounded wheel — your life feels well balanced right now. 🌿'
                : 'A jagged wheel — the dips are where life feels bumpy. Focus on your lowest 1–2 areas to round it out.'}
            </Text>
          )
        })()}
      </View>

      {/* Domain Details */}
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#222540', marginBottom: 16 }}>{t('yourInsights')}</Text>

        {DOMAINS.map(d => {
          const items = profile.memories.filter(m => m.domain === d.key)
          const score = domScore(d.key)
          const note = domNote(d.key)

          return (
            <View key={d.key} style={[g.lbCard, { borderLeftColor: d.color, marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 24 }}>{d.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={g.lbTitle}>{d.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: '#E9E6F2', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(score, 100)}%`, height: '100%', backgroundColor: d.color, borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: d.color }}>{items.length ? score : '–'}</Text>
                  </View>
                  {!!note && <Text style={{ fontSize: 12, color: '#6E7191', marginTop: 6, fontStyle: 'italic' }}>“{note}”</Text>}
                </View>
              </View>

              {/* Your own 1–10 self-rating (overrides Soma's score) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                <Text style={{ fontSize: 10, color: '#8A8FA8', marginRight: 4, fontWeight: '600' }}>Rate it yourself</Text>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                  const cur = manual[d.key]
                  const on = typeof cur === 'number' && n <= cur
                  return (
                    <TouchableOpacity key={n} onPress={() => setRating(d.key, n)} hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                      style={{ width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: d.color, backgroundColor: on ? d.color : 'transparent' }} />
                  )
                })}
                {typeof manual[d.key] === 'number' && <Text style={{ fontSize: 11, fontWeight: '800', color: d.color, marginLeft: 4 }}>{manual[d.key]}/10</Text>}
              </View>

              {/* About this area */}
              <Text style={g.lbAbout}>{DOMAIN_INFO[d.key].about}</Text>

              {/* Health domain: show live medication + activity data */}
              {d.key === 'health' && (() => {
                const today = new Date().toISOString().slice(0, 10)
                const todayHealth = (profile.healthLogs || []).find(l => l.date === today)
                const activeMeds = (profile.medications || []).filter(m => m.active)
                const todayMedLog = (profile.medLogs || []).find(l => l.date === today)
                const medTotal = activeMeds.reduce((acc, m) => acc + m.times.length, 0)
                const medTaken = activeMeds.reduce((acc, m) => acc + m.times.filter(t => todayMedLog?.taken[`${m.id}_${t}`]).length, 0)
                const week7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6-i)); return d.toISOString().slice(0,10) })
                const medAdherence = week7.reduce((acc, date) => {
                  const log = (profile.medLogs || []).find(l => l.date === date)
                  if (!log || !activeMeds.length) return acc
                  const t = activeMeds.reduce((a, m) => a + m.times.length, 0)
                  const done = activeMeds.reduce((a, m) => a + m.times.filter(ti => log.taken[`${m.id}_${ti}`]).length, 0)
                  return t > 0 ? { sum: acc.sum + (done/t)*100, days: acc.days + 1 } : acc
                }, { sum: 0, days: 0 })
                const adherencePct = medAdherence.days > 0 ? Math.round(medAdherence.sum / medAdherence.days) : null
                const hasAnyData = activeMeds.length > 0 || todayHealth
                if (!hasAnyData) return null
                return (
                  <View style={g.healthDataPanel}>
                    <Text style={g.lbSectionLabel}>TODAY'S HEALTH DATA</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {todayHealth?.steps !== undefined && (
                        <View style={g.healthMetricChip}>
                          <Text style={{ fontSize: 16 }}>🚶</Text>
                          <Text style={g.healthMetricVal}>{todayHealth.steps.toLocaleString()}</Text>
                          <Text style={g.healthMetricLbl}>steps</Text>
                        </View>
                      )}
                      {todayHealth?.sleepHours !== undefined && (
                        <View style={g.healthMetricChip}>
                          <Text style={{ fontSize: 16 }}>😴</Text>
                          <Text style={g.healthMetricVal}>{todayHealth.sleepHours}h</Text>
                          <Text style={g.healthMetricLbl}>sleep</Text>
                        </View>
                      )}
                      {todayHealth?.heartRate !== undefined && (
                        <View style={g.healthMetricChip}>
                          <Text style={{ fontSize: 16 }}>❤️</Text>
                          <Text style={g.healthMetricVal}>{todayHealth.heartRate}</Text>
                          <Text style={g.healthMetricLbl}>bpm</Text>
                        </View>
                      )}
                      {todayHealth?.activeMinutes !== undefined && (
                        <View style={g.healthMetricChip}>
                          <Text style={{ fontSize: 16 }}>⚡</Text>
                          <Text style={g.healthMetricVal}>{todayHealth.activeMinutes}m</Text>
                          <Text style={g.healthMetricLbl}>active</Text>
                        </View>
                      )}
                      {activeMeds.length > 0 && (
                        <View style={[g.healthMetricChip, { backgroundColor: medTaken === medTotal && medTotal > 0 ? '#6EE6C015' : '#FFF5F5' }]}>
                          <Text style={{ fontSize: 16 }}>💊</Text>
                          <Text style={[g.healthMetricVal, { color: medTaken === medTotal && medTotal > 0 ? '#2A7A5E' : '#E8636F' }]}>{medTaken}/{medTotal}</Text>
                          <Text style={g.healthMetricLbl}>meds</Text>
                        </View>
                      )}
                      {adherencePct !== null && (
                        <View style={g.healthMetricChip}>
                          <Text style={{ fontSize: 16 }}>📊</Text>
                          <Text style={[g.healthMetricVal, { color: adherencePct >= 80 ? '#2A7A5E' : adherencePct >= 50 ? '#C28A1A' : '#E8636F' }]}>{adherencePct}%</Text>
                          <Text style={g.healthMetricLbl}>7d meds</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )
              })()}

              {/* Memories from conversations */}
              {items.length > 0 && (
                <View style={{ gap: 6, marginBottom: 10 }}>
                  <Text style={g.lbSectionLabel}>WHAT YOU'VE SHARED</Text>
                  {items.slice(0, 3).map((m, i) => (
                    <View key={i} style={g.lbItem}>
                      <View style={[g.lbDot, { backgroundColor: d.color }]} />
                      <Text style={g.lbItemTxt}>{m.content}</Text>
                    </View>
                  ))}
                  {items.length > 3 && <Text style={[g.lbEmpty, { marginTop: 4 }]}>+{items.length - 3} more entries</Text>}
                </View>
              )}

              {/* Expand/collapse: questions + tips */}
              <TouchableOpacity
                style={[g.lbInfoToggle, { borderColor: d.color + '50' }]}
                onPress={() => setExpandedInfo(expandedInfo === d.key ? null : d.key)}
              >
                <Text style={[g.lbInfoToggleTxt, { color: d.color }]}>
                  {expandedInfo === d.key ? '▲ Hide tips & questions' : '▼ Tips & reflection questions'}
                </Text>
              </TouchableOpacity>

              {expandedInfo === d.key && (
                <View style={{ marginTop: 12 }}>
                  {/* Reflection questions */}
                  <Text style={g.lbSectionLabel}>REFLECT ON THIS</Text>
                  {DOMAIN_INFO[d.key].questions.map((q, i) => (
                    <View key={i} style={g.lbQuestion}>
                      <Text style={[g.lbQNum, { backgroundColor: d.color }]}>{i + 1}</Text>
                      <Text style={g.lbQTxt}>{q}</Text>
                    </View>
                  ))}

                  {/* Tips */}
                  <Text style={[g.lbSectionLabel, { marginTop: 14 }]}>PRACTICAL TIPS</Text>
                  {DOMAIN_INFO[d.key].tips.map((tip, i) => (
                    <View key={i} style={g.lbTipRow}>
                      <Text style={{ fontSize: 20, width: 32 }}>{tip.emoji}</Text>
                      <Text style={g.lbTipTxt}>{tip.text}</Text>
                    </View>
                  ))}

                  {/* Soma invite */}
                  <View style={[g.lbSomaInvite, { borderColor: d.color + '40', backgroundColor: d.color + '08' }]}>
                    <Text style={{ fontSize: 14 }}>✦</Text>
                    <Text style={[g.lbSomaInviteTxt, { color: d.color }]}>{DOMAIN_INFO[d.key].resource || `Talk to Soma about your ${d.label.toLowerCase()} to build this area.`}</Text>
                  </View>
                </View>
              )}

              {items.length === 0 && expandedInfo !== d.key && (
                <Text style={g.lbEmpty}>💭 Tap "Tips & reflection questions" to explore this area — or talk to Soma about it.</Text>
              )}
            </View>
          )
        })}
      </View>

      {/* Overall Balance Score */}
      <View style={{ paddingHorizontal: 24, marginTop: 20, marginBottom: 0 }}>
        <View style={[g.matchCard, { marginBottom: 0 }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#6E7191', letterSpacing: 1, marginBottom: 8 }}>{t('overallBalance')}</Text>
          {(() => { return (
            <>
              <Text style={{ fontSize: 48, fontWeight: '800', color: '#7B6EF6' }}>{ob}</Text>
              <Text style={{ fontSize: 14, color: '#6E7191', marginTop: 8 }}>
                {ob < 35 ? 'Some areas are weighing on you. Talk it through with Soma — one step at a time.'
                  : ob < 65 ? 'Finding your balance. Keep sharing the wins and the struggles.'
                  : 'You\'re in a good place across your life right now. 🌱'}
              </Text>
            </>
          ) })()}
        </View>
      </View>

      <WheelHistory history={hist} />
      <View style={{ height: 40 }} />
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
    const context = somaCircleContext(p.type as any, p.name) + langDirective()
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
          <TextInput style={g.input} value={input} onChangeText={setInput} placeholder={`Message ${p.name}...`} placeholderTextColor="#9A9DB2" multiline />
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
          <Animated.View style={{ transform: [{ scale: pulse }], marginBottom: 24 }}><SomaMark size={116} /></Animated.View>
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
          <TextInput style={g.input} value={input} onChangeText={setInput} placeholder="Speak or type your answer..." placeholderTextColor="#9A9DB2" multiline />
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
          <View style={{ marginBottom: 24 }}><SomaMark size={116} /></View>
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
  // Real users from the backend (live when logged in + backend deployed)
  const [realNearby, setRealNearby] = useState<NearbyUser[]>([])
  const [realStatus, setRealStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
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

  // Load real nearby users when the Nearby tab opens (requires login + deployed backend)
  useEffect(() => {
    if (browseTab !== 'nearby' || realStatus !== 'idle') return
    if (!datingApi.authed()) { setRealStatus('unavailable'); return }
    setRealStatus('loading')
    ;(async () => {
      try {
        const loc = await getApproxLocation()
        if (loc) await datingApi.saveProfile(profile, loc).catch(() => {})
        setRealNearby(await datingApi.nearby(50))
        setRealStatus('ready')
      } catch { setRealStatus('unavailable') }
    })()
  }, [browseTab])

  const realRanked = realNearby.map(u => {
    const c = nearbyToCandidate(u)
    return { c, score: u.compatibility, shared: (c.interests || []).slice(0, 3), psych: { attach: 0, love: 0, note: `${u.distanceKm} km away` } }
  })
  const useReal = browseTab === 'nearby' && realStatus === 'ready' && realRanked.length > 0
  const activeRanked = useReal ? realRanked : ranked

  const current = activeRanked[Math.min(index, activeRanked.length - 1)].c
  const currentScore = ranked[index].score
  const currentShared = ranked[index].shared
  const currentPsych = ranked[index].psych
  const pass = () => { if (index < activeRanked.length - 1) setIndex(index + 1); else setIndex(0) }

  const like = () => {
    // Daily like limit
    if (DB.likesLeft() <= 0) { setShowPaywall(true); return }
    DB.useLike()
    setLikesLeft(DB.likesLeft())
    const pick = activeRanked[Math.min(index, activeRanked.length - 1)].c
    setLiked([...liked, pick])
    // Real user? Record the like on the backend (mutual likes become matches)
    const realId = (pick as any).realUserId
    if (realId && datingApi.authed()) {
      datingApi.like(realId).then(res => {
        if (res.matched) {
          DB.upsertConnection({
            id: `real_${realId}`,
            name: pick.name, age: pick.age, photo: pick.photo,
            color: '#7B6EF6', bio: pick.bio || '',
            loveLanguage: (pick as any).loveLanguage || '',
            attachment: (pick as any).attachment || '',
            messages: [], matchScore: Math.round(currentScore),
          })
        }
      }).catch(() => {})
    }
    // ✨ Immediate match! AI agents start talking right away
    analytics.track('match_created', { with: pick.name })
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
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#6E7191', letterSpacing: 1, marginBottom: 12 }}>ABOUT YOU</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#222540', marginBottom: 12 }}>
            {profile.name || 'Your Dating Profile'}
          </Text>
          <Text style={{ fontSize: 14, color: '#6E7191', lineHeight: 22 }}>
            {extractedValues.length > 0
              ? `Looking for: ${extractedValues.slice(0, 2).join(' • ')}`
              : '💭 Talk to Soma about what you\'re looking for'}
          </Text>
        </View>

        {/* Values from conversations */}
        {extractedValues.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222540', marginBottom: 12 }}>💭 Your Values</Text>
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
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222540', marginBottom: 12 }}>🎨 Your Interests</Text>
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
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222540', marginBottom: 12 }}>🎯 Your Purpose</Text>
            <View style={[g.matchCard]}>
              <Text style={{ fontSize: 14, color: '#6E7191', lineHeight: 22 }}>
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
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#6E7191', marginBottom: 12, marginTop: 8 }}>More ways to connect</Text>

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
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#222540' }}>{cat.title}</Text>
                <Text style={{ fontSize: 13, color: '#6E7191', marginTop: 2 }}>{cat.subtitle}</Text>
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
    // Nearby tab: real users from the backend when available, demo profiles otherwise
    const filteredRanked = useReal
      ? realRanked
      : browseTab === 'nearby'
        ? [...CANDIDATES]
            .filter(c => {
              // Mock distance calculation (demo profiles until backend is live)
              const distance = Math.sqrt(Math.pow((c as any).lat - userLocation.lat, 2) + Math.pow((c as any).lng - userLocation.lng, 2)) * 111 // km
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

        {/* Live status for the Nearby tab */}
        {browseTab === 'nearby' && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: useReal ? '#34C759' : realStatus === 'loading' ? '#F6C26E' : '#C5BFEC' }} />
            <Text style={{ fontSize: 12, color: '#6E7191', fontWeight: '600' }}>
              {useReal ? `LIVE — ${realRanked.length} real ${realRanked.length === 1 ? 'person' : 'people'} near you`
                : realStatus === 'loading' ? 'Finding real people near you…'
                : realStatus === 'ready' ? 'No one nearby yet — showing example profiles'
                : 'Demo profiles — sign in to meet real people nearby'}
            </Text>
          </View>
        )}

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
          <TextInput style={g.input} value={chatInput} onChangeText={setChatInput} placeholder={`Message ${candidate.name}...`} placeholderTextColor="#9A9DB2" multiline />
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
          <View style={[g.matchedBanner, { overflow: 'hidden' }]}>
            <MatchConfetti />
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

  // Sync real backend matches into local connections on mount
  useEffect(() => {
    if (!datingApi.authed()) return
    datingApi.matches().then(matches => {
      matches.forEach(m => {
        const existing = DB.getConnection(`real_${m.userId}`)
        DB.upsertConnection({
          id: `real_${m.userId}`,
          name: m.name, age: m.age, photo: m.photo,
          color: '#7B6EF6', bio: m.bio || '',
          loveLanguage: m.loveLanguage || '', attachment: m.attachment || '',
          messages: existing?.messages || [],
          matchScore: m.compatibility,
        })
      })
      if (matches.length > 0) onRefresh()
    }).catch(() => {})
  }, [])

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
          <TextInput style={g.input} value={input} onChangeText={setInput} placeholder={`Message ${conn.name}...`} placeholderTextColor="#9A9DB2" multiline />
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
          <View style={{ marginBottom: 24 }}><SomaMark size={116} /></View>
          <Text style={g.startSub}>Soma is reflecting on{'\n'}everything you've shared...</Text>
        </View>
      ) : !insight ? (
        <View style={[g.centerWrap, { paddingTop: 60 }]}>
          <SomaMark size={88} />
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
// One clean settings row: icon-in-circle + title + subtitle + chevron.
function SettingRow({ icon, title, subtitle, onPress, right, danger, last }: {
  icon: string; title: string; subtitle?: string; onPress?: () => void; right?: any; danger?: boolean; last?: boolean
}) {
  const Wrap: any = onPress ? TouchableOpacity : View
  return (
    <Wrap onPress={onPress} activeOpacity={0.7} style={[g.setRow2, last && { borderBottomWidth: 0 }]}>
      <View style={[g.setIconWrap, danger && { backgroundColor: '#FCEAEA' }]}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={[g.setTitle, danger && { color: '#E8636F' }]}>{title}</Text>
        {!!subtitle && <Text style={g.setSub}>{subtitle}</Text>}
      </View>
      {right !== undefined ? right : (onPress ? <Text style={g.setChevron}>›</Text> : null)}
    </Wrap>
  )
}

// ── Twinby-style settings row ──────────────────────────────
function StgRow({ icon, label, value, onPress, danger, last }: {
  icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean; last?: boolean
}) {
  const Wrap: any = onPress ? TouchableOpacity : View
  return (
    <Wrap onPress={onPress} activeOpacity={0.6}
      style={[g.stgRow, last && { borderBottomWidth: 0 }]}>
      <View style={g.stgIconCircle}><Text style={g.stgIconTxt}>{icon}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={[g.stgLabel, danger && { color: '#E8636F' }]}>{label}</Text>
        {!!value && <Text style={g.stgValue}>{value}</Text>}
      </View>
      {onPress && <Text style={[g.stgChevron, danger && { color: '#E8636F' }]}>›</Text>}
    </Wrap>
  )
}

// ════════════════════════════════════════════════════════════
//  THANKFUL DIARY — 3 gratitudes a day
// ════════════════════════════════════════════════════════════
const GRATITUDE_PROMPTS = [
  'Something that made me smile today…',
  'A person I feel lucky to have…',
  'A small moment that felt good…',
]

function ThankfulDiary({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const todayEntry = (profile.gratitudeEntries || []).find(e => e.date === today)
  const [items, setItems] = useState<string[]>(todayEntry?.items || ['', '', ''])
  const [saving, setSaving] = useState(false)
  const [somaNote, setSomaNote] = useState(todayEntry?.somaNote || '')
  const [saved, setSaved] = useState(!!todayEntry)
  const aiName = profile.aiName || 'Soma'
  const streak = (() => {
    const entries = profile.gratitudeEntries || []
    let s = 0; let d = new Date()
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().slice(0, 10)
      if (entries.find(e => e.date === key)) { s++; d.setDate(d.getDate() - 1) } else if (i === 0) { d.setDate(d.getDate() - 1) } else break
    }
    return s
  })()

  const save = async () => {
    const filled = items.filter(x => x.trim())
    if (!filled.length) return
    setSaving(true)
    const note = await groq([{ role: 'user', content:
      `You are ${aiName}, a warm and emotionally intelligent companion. The user shared these 3 things they're grateful for today:\n1. ${items[0]}\n2. ${items[1]}\n3. ${items[2]}\nWrite a short (2-3 sentences), heartfelt reflection that honours what they shared. Be warm, personal, not generic.${langDirective()}`
    }], 0.8).catch(() => '')
    DB.addGratitude(items, note)
    setSomaNote(note); setSaved(true); setSaving(false); onRefresh()
  }

  const past = (profile.gratitudeEntries || []).filter(e => e.date !== today).slice(0, 10)

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>Thankful Diary</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        {/* Streak banner */}
        {streak > 0 && (
          <View style={g.streakBanner}>
            <Text style={g.streakEmoji}>🔥</Text>
            <Text style={g.streakTxt}>{streak} day streak — keep it going!</Text>
          </View>
        )}

        {/* Today's card */}
        <View style={g.gratCard2}>
          <Text style={g.gratDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          <Text style={g.gratHeading}>Today I am grateful for…</Text>

          {saved ? (
            <>
              {items.filter(x => x.trim()).map((item, i) => (
                <View key={i} style={g.gratSavedItem}>
                  <Text style={g.gratNum}>{i + 1}</Text>
                  <Text style={g.gratItemTxt}>{item}</Text>
                </View>
              ))}
              {!!somaNote && (
                <View style={g.gratSomaNote}>
                  <Text style={g.gratSomaName}>{aiName}</Text>
                  <Text style={g.gratSomaTxt}>{somaNote}</Text>
                </View>
              )}
              <TouchableOpacity style={g.gratEditBtn} onPress={() => setSaved(false)}>
                <Text style={g.gratEditTxt}>Edit today's entry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {GRATITUDE_PROMPTS.map((prompt, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <Text style={g.gratLabel}>{i + 1}. {prompt}</Text>
                  <TextInput
                    style={g.gratInput}
                    value={items[i]}
                    onChangeText={v => setItems(prev => { const n = [...prev]; n[i] = v; return n })}
                    placeholder="Write anything…"
                    placeholderTextColor="#B0B3C8"
                    multiline
                  />
                </View>
              ))}
              <TouchableOpacity
                style={[g.gratSaveBtn, saving && g.off]}
                onPress={save}
                disabled={saving}
              >
                <Text style={g.gratSaveTxt}>{saving ? `${aiName} is reflecting…` : 'Save & get reflection'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Past entries */}
        {past.length > 0 && (
          <>
            <Text style={[g.secLabel, { marginTop: 28, marginBottom: 12 }]}>PAST ENTRIES</Text>
            {past.map(entry => (
              <View key={entry.id} style={g.gratPastCard}>
                <Text style={g.gratPastDate}>{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                {entry.items.filter(x => x.trim()).map((item, i) => (
                  <Text key={i} style={g.gratPastItem}>· {item}</Text>
                ))}
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  LOVE YOURSELF — daily self-love ritual
// ════════════════════════════════════════════════════════════
const AFFIRMATIONS = [
  'I am enough, exactly as I am right now.',
  'I deserve kindness — especially from myself.',
  'My feelings are valid and I honour them.',
  'I am growing, even when it doesn\'t feel like it.',
  'I choose to treat myself with the same compassion I give others.',
  'I am worthy of love, rest, and joy.',
  'My presence is a gift to this world.',
  'I am allowed to take up space.',
  'Every day I am becoming more of who I truly am.',
  'I trust myself. I believe in myself.',
  'It\'s okay to not have everything figured out.',
  'I am resilient. I have overcome hard things before.',
  'I release what no longer serves me.',
  'I am proud of how far I have come.',
  'Small steps still count. I celebrate them.',
  'I am allowed to rest without guilt.',
  'My worth is not measured by my productivity.',
  'I bring something unique and beautiful to this world.',
  'I forgive myself for past mistakes. I was doing my best.',
  'I choose peace over perfection.',
  'I am learning to love all of me — the light and the shadow.',
  'Today I will be gentle with myself.',
]

const SELF_CARE_CHECKS = [
  { key: 'water', emoji: '💧', label: 'Drank enough water' },
  { key: 'ate', emoji: '🥗', label: 'Nourished my body' },
  { key: 'moved', emoji: '🚶', label: 'Moved my body' },
  { key: 'rested', emoji: '😴', label: 'Got enough rest' },
  { key: 'connected', emoji: '🤝', label: 'Connected with someone' },
  { key: 'offline', emoji: '📵', label: 'Took a break from screens' },
]

function LoveYourself({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const todayEntry = (profile.loveEntries || []).find(e => e.date === today)
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  const affirmation = AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length]
  const [checks, setChecks] = useState<Record<string,boolean>>(todayEntry?.checks || {})
  const [note, setNote] = useState(todayEntry?.note || '')
  const [saved, setSaved] = useState(!!todayEntry)
  const aiName = profile.aiName || 'Soma'
  const streak = (() => {
    const entries = profile.loveEntries || []
    let s = 0; let d = new Date()
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().slice(0, 10)
      if (entries.find(e => e.date === key)) { s++; d.setDate(d.getDate() - 1) } else if (i === 0) { d.setDate(d.getDate() - 1) } else break
    }
    return s
  })()

  const toggle = (key: string) => {
    if (saved) return
    setChecks(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const save = () => {
    DB.addLoveEntry(affirmation, checks, note.trim() || undefined)
    setSaved(true); onRefresh()
  }

  const checkedCount = Object.values(checks).filter(Boolean).length
  const past = (profile.loveEntries || []).filter(e => e.date !== today).slice(0, 7)

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>Love Yourself</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        {streak > 0 && (
          <View style={[g.streakBanner, { backgroundColor: '#FFF0F8', borderColor: '#F9B8D840' }]}>
            <Text style={g.streakEmoji}>🌸</Text>
            <Text style={[g.streakTxt, { color: '#C2668A' }]}>{streak} day streak — you keep showing up for yourself!</Text>
          </View>
        )}

        {/* Affirmation of the day */}
        <View style={g.affirmCard}>
          <Text style={g.affirmLabel}>TODAY'S AFFIRMATION</Text>
          <Text style={g.affirmTxt}>"{affirmation}"</Text>
          <Text style={g.affirmHint}>Read it slowly. Breathe. Let it land.</Text>
        </View>

        {/* Self-care checklist */}
        <Text style={[g.secLabel, { marginTop: 24, marginBottom: 12 }]}>HOW DID YOU CARE FOR YOURSELF?</Text>
        <View style={g.loveChecklist}>
          {SELF_CARE_CHECKS.map(item => {
            const checked = !!checks[item.key]
            return (
              <TouchableOpacity key={item.key} style={[g.loveCheck, checked && g.loveCheckDone]} onPress={() => toggle(item.key)} activeOpacity={0.7}>
                <Text style={g.loveCheckEmoji}>{item.emoji}</Text>
                <Text style={[g.loveCheckTxt, checked && { color: '#7B6EF6' }]}>{item.label}</Text>
                <View style={[g.loveCheckBox, checked && g.loveCheckBoxDone]}>
                  {checked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
        {checkedCount > 0 && (
          <Text style={g.loveScore}>{checkedCount === SELF_CARE_CHECKS.length ? '✨ You took amazing care of yourself today!' : `${checkedCount} of ${SELF_CARE_CHECKS.length} — every one counts.`}</Text>
        )}

        {/* Note to self */}
        <Text style={[g.secLabel, { marginTop: 24, marginBottom: 10 }]}>A NOTE TO YOURSELF</Text>
        <TextInput
          style={g.loveNoteInput}
          value={note}
          onChangeText={saved ? undefined : setNote}
          editable={!saved}
          placeholder={`What do you want to remember, feel, or tell yourself today?`}
          placeholderTextColor="#B0B3C8"
          multiline
          numberOfLines={4}
        />

        {!saved ? (
          <TouchableOpacity style={g.loveSaveBtn} onPress={save}>
            <Text style={g.loveSaveTxt}>Complete today's ritual 🌸</Text>
          </TouchableOpacity>
        ) : (
          <View style={g.loveDoneRow}>
            <Text style={g.loveDoneTxt}>✓ Today's ritual complete</Text>
            <TouchableOpacity onPress={() => setSaved(false)}><Text style={[g.secLabel, { color: '#7B6EF6' }]}>Edit</Text></TouchableOpacity>
          </View>
        )}

        {/* Past entries */}
        {past.length > 0 && (
          <>
            <Text style={[g.secLabel, { marginTop: 32, marginBottom: 12 }]}>PAST RITUALS</Text>
            {past.map(entry => {
              const done = Object.values(entry.checks).filter(Boolean).length
              return (
                <View key={entry.id} style={g.lovePastCard}>
                  <Text style={g.gratPastDate}>{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                  <Text style={g.lovePastAffirm} numberOfLines={2}>"{entry.affirmation}"</Text>
                  <Text style={g.lovePastChecks}>{done}/{SELF_CARE_CHECKS.length} self-care · {entry.note ? '📝 note' : ''}</Text>
                </View>
              )
            })}
          </>
        )}
      </View>
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  HEALTH HUB
// ════════════════════════════════════════════════════════════

function HealthAppLogo({ id, size = 48 }: { id: string; size?: number }) {
  const br = size * 0.26
  const ic = size * 0.62

  if (id === 'apple_health') return (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: '#FF2D55', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={ic} height={ic} viewBox="0 0 100 100">
        {/* White heart */}
        <SvgPath d="M50,78 C28,62 6,52 6,33 C6,17 19,9 31,9 C39,9 45,13 50,22 C55,13 61,9 69,9 C81,9 94,17 94,33 C94,52 72,62 50,78Z" fill="white"/>
        {/* Pink ECG line across heart */}
        <SvgPolyline points="8,44 22,44 29,28 37,62 44,38 50,48 56,44 76,44 92,44" fill="none" stroke="#FF2D55" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    </View>
  )

  if (id === 'google_fit') return (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={ic} height={ic} viewBox="0 0 100 100">
        {/* 4 Google-coloured teardrops meeting at centre */}
        {/* Blue — top */}
        <SvgPath d="M50,50 C50,50 37,38 37,24 C37,15 43,10 50,10 C57,10 63,15 63,24 C63,38 50,50 50,50Z" fill="#4285F4"/>
        {/* Red — left */}
        <SvgPath d="M50,50 C50,50 38,63 24,63 C15,63 10,57 10,50 C10,43 15,37 24,37 C38,37 50,50 50,50Z" fill="#EA4335"/>
        {/* Yellow — bottom */}
        <SvgPath d="M50,50 C50,50 63,62 63,76 C63,85 57,90 50,90 C43,90 37,85 37,76 C37,62 50,50 50,50Z" fill="#FBBC05"/>
        {/* Green — right */}
        <SvgPath d="M50,50 C50,50 62,37 76,37 C85,37 90,43 90,50 C90,57 85,63 76,63 C62,63 50,50 50,50Z" fill="#34A853"/>
      </Svg>
    </View>
  )

  if (id === 'fitbit') return (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: '#00B0B9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={ic} height={ic} viewBox="0 0 100 100">
        {/* 3×3 dot grid — bottom row brightest, top row faintest (Fitbit signature) */}
        {[{ y: 22, r: 8, op: 0.45 }, { y: 50, r: 10, op: 0.72 }, { y: 80, r: 13, op: 1 }].map(({ y, r, op }, row) =>
          [22, 50, 78].map((x, col) => (
            <SvgCircle key={`${row}-${col}`} cx={x} cy={y} r={r} fill="white" opacity={op}/>
          ))
        )}
      </Svg>
    </View>
  )

  if (id === 'garmin') return (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: '#003087', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={ic} height={ic} viewBox="0 0 100 110">
        {/* Simplified running figure */}
        <SvgCircle cx="62" cy="13" r="11" fill="white"/>
        {/* Torso */}
        <SvgPath d="M58,24 L46,58" stroke="white" strokeWidth="9" strokeLinecap="round"/>
        {/* Arms — back arm forward, front arm back */}
        <SvgPath d="M55,38 L38,28" stroke="white" strokeWidth="7.5" strokeLinecap="round"/>
        <SvgPath d="M52,35 L70,30" stroke="white" strokeWidth="7.5" strokeLinecap="round"/>
        {/* Legs — stride */}
        <SvgPath d="M46,58 L30,88" stroke="white" strokeWidth="8" strokeLinecap="round"/>
        <SvgPath d="M46,58 L62,85" stroke="white" strokeWidth="8" strokeLinecap="round"/>
        {/* Foot flick */}
        <SvgPath d="M30,88 L18,84" stroke="white" strokeWidth="6" strokeLinecap="round"/>
        <SvgPath d="M62,85 L74,90" stroke="white" strokeWidth="6" strokeLinecap="round"/>
      </Svg>
    </View>
  )

  if (id === 'samsung') return (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: '#1428A0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={ic} height={ic} viewBox="0 0 100 100">
        {/* Hexagon outline */}
        <SvgPolygon points="50,8 88,29 88,71 50,92 12,71 12,29" fill="none" stroke="white" strokeWidth="7" strokeLinejoin="round"/>
        {/* Heart inside */}
        <SvgPath d="M50,68 C36,57 20,50 20,38 C20,28 28,23 36,23 C42,23 47,26 50,32 C53,26 58,23 64,23 C72,23 80,28 80,38 C80,50 64,57 50,68Z" fill="white" opacity="0.9"/>
      </Svg>
    </View>
  )

  if (id === 'whoop') return (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={size * 0.78} height={size * 0.5} viewBox="0 0 130 70">
        {/* Bold W — WHOOP's signature mark */}
        <SvgPath d="M5,8 L24,62 L44,22 L64,62 L84,22 L104,62 L125,8" stroke="white" strokeWidth="13" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    </View>
  )

  return <Text style={{ fontSize: size * 0.5 }}>📱</Text>
}

const HEALTH_APPS = [
  { id: 'apple_health', name: 'Apple Health', emoji: '🍎', desc: 'Steps, sleep, heart rate, workouts', color: '#FF3B30', platform: 'iOS' },
  { id: 'google_fit',   name: 'Google Fit',   emoji: '🤖', desc: 'Activity, heart points, workouts',  color: '#4285F4', platform: 'Android' },
  { id: 'fitbit',       name: 'Fitbit',        emoji: '⌚', desc: 'Activity, sleep, stress, SpO2',    color: '#00B0B9', platform: 'Both' },
  { id: 'garmin',       name: 'Garmin Connect',emoji: '🏃', desc: 'GPS workouts, HRV, VO2 max',       color: '#007AC0', platform: 'Both' },
  { id: 'samsung',      name: 'Samsung Health',emoji: '📱', desc: 'Steps, blood pressure, sleep',     color: '#1428A0', platform: 'Android' },
  { id: 'whoop',        name: 'WHOOP',         emoji: '💪', desc: 'Recovery, strain, HRV, sleep',     color: '#000000', platform: 'Both' },
]
const METRIC_GOALS = { steps: 10000, sleepHours: 8, activeMinutes: 30, heartRate: 70 }

function HealthHub({ profile, onBack, onRefresh, onMedication }: { profile: UserProfile; onBack: () => void; onRefresh: () => void; onMedication: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [tab, setTab] = useState<'dashboard' | 'log' | 'connect'>('dashboard')
  const [logSteps, setLogSteps] = useState('')
  const [logSleep, setLogSleep] = useState('')
  const [logHR, setLogHR] = useState('')
  const [logActive, setLogActive] = useState('')
  const [logWeight, setLogWeight] = useState('')
  const [logCals, setLogCals] = useState('')
  const [saving, setSaving] = useState(false)
  const [connectedApps, setConnectedApps] = useState<string[]>(profile.connectedApps || [])

  const healthLogs = profile.healthLogs || []
  const todayLog = healthLogs.find(l => l.date === today)
  const activeMeds = (profile.medications || []).filter(m => m.active)
  const todayMedLog = (profile.medLogs || []).find(l => l.date === today)

  // Med adherence today
  const medTotal = activeMeds.reduce((a, m) => a + m.times.length, 0)
  const medTaken = activeMeds.reduce((a, m) => a + m.times.filter(t => todayMedLog?.taken[`${m.id}_${t}`]).length, 0)

  // 7-day data for mini chart
  const week7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const log = healthLogs.find(l => l.date === dateStr)
    const medLog = (profile.medLogs || []).find(l => l.date === dateStr)
    const medDone = activeMeds.length > 0 && medLog
      ? activeMeds.reduce((acc, m) => acc + m.times.filter(t => medLog.taken[`${m.id}_${t}`]).length, 0)
      : 0
    const medTot = activeMeds.reduce((a, m) => a + m.times.length, 0)
    return { date: dateStr, day: ['S','M','T','W','T','F','S'][d.getDay()], log, medPct: medTot > 0 ? Math.round((medDone/medTot)*100) : null }
  })

  function saveLog() {
    setSaving(true)
    const data: Omit<DailyHealthLog,'date'> = { source: 'manual' }
    if (logSteps.trim()) data.steps = parseInt(logSteps) || 0
    if (logSleep.trim()) data.sleepHours = parseFloat(logSleep) || 0
    if (logHR.trim()) data.heartRate = parseInt(logHR) || 0
    if (logActive.trim()) data.activeMinutes = parseInt(logActive) || 0
    if (logWeight.trim()) data.weight = parseFloat(logWeight) || 0
    if (logCals.trim()) data.calories = parseInt(logCals) || 0
    DB.logHealth(data)
    onRefresh()
    setLogSteps(''); setLogSleep(''); setLogHR(''); setLogActive(''); setLogWeight(''); setLogCals('')
    setSaving(false)
    setTab('dashboard')
  }

  function toggleApp(id: string) {
    const next = connectedApps.includes(id) ? connectedApps.filter(a => a !== id) : [...connectedApps, id]
    setConnectedApps(next)
    if (next.includes(id)) DB.connectApp(id); else DB.disconnectApp(id)
    onRefresh()
  }

  const MetricBar = ({ label, emoji, value, goal, unit, color }: { label: string; emoji: string; value?: number; goal: number; unit: string; color: string }) => {
    const pct = value !== undefined ? Math.min(100, Math.round((value / goal) * 100)) : 0
    return (
      <View style={g.metricBar}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#222540' }}>{emoji} {label}</Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: value !== undefined ? color : '#C0C0D0' }}>
            {value !== undefined ? `${value.toLocaleString()} ${unit}` : '— not logged'}
          </Text>
        </View>
        <View style={{ height: 8, backgroundColor: '#F0EFF8', borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
        </View>
        <Text style={{ fontSize: 10, color: '#9A9DB2', marginTop: 2 }}>Goal: {goal.toLocaleString()} {unit}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>❤️‍🩹 Health Hub</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Quick stats strip */}
      <View style={g.healthStatsStrip}>
        {[
          { emoji: '🚶', val: todayLog?.steps?.toLocaleString() ?? '—', lbl: 'Steps', color: '#6E8BF6' },
          { emoji: '😴', val: todayLog?.sleepHours ? `${todayLog.sleepHours}h` : '—', lbl: 'Sleep', color: '#A89BFA' },
          { emoji: '❤️', val: todayLog?.heartRate ? `${todayLog.heartRate}` : '—', lbl: 'BPM', color: '#F66E8E' },
          { emoji: '💊', val: medTotal > 0 ? `${medTaken}/${medTotal}` : '—', lbl: 'Meds', color: medTaken === medTotal && medTotal > 0 ? '#6EE6C0' : '#F6C26E' },
        ].map(s => (
          <View key={s.lbl} style={g.healthStatBox}>
            <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
            <Text style={[g.healthStatVal, { color: s.color }]}>{s.val}</Text>
            <Text style={g.healthStatLbl}>{s.lbl}</Text>
          </View>
        ))}
      </View>

      {/* Tab bar */}
      <View style={g.tabRow}>
        {([['dashboard','Today'],['log','Log Data'],['connect','Devices']] as [string,string][]).map(([t, label]) => (
          <TouchableOpacity key={t} style={[g.tabBtn, tab === t && g.tabBtnActive]} onPress={() => setTab(t as any)}>
            <Text style={[g.tabBtnTxt, tab === t && g.tabBtnTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* DASHBOARD */}
      {tab === 'dashboard' && (
        <View style={{ paddingHorizontal: 20 }}>
          {/* Metrics progress bars */}
          <Text style={[g.lbSectionLabel, { marginBottom: 12 }]}>TODAY'S PROGRESS</Text>
          <MetricBar label="Steps" emoji="🚶" value={todayLog?.steps} goal={METRIC_GOALS.steps} unit="steps" color="#6E8BF6" />
          <MetricBar label="Sleep" emoji="😴" value={todayLog?.sleepHours} goal={METRIC_GOALS.sleepHours} unit="hrs" color="#A89BFA" />
          <MetricBar label="Active time" emoji="⚡" value={todayLog?.activeMinutes} goal={METRIC_GOALS.activeMinutes} unit="min" color="#6EE6C0" />
          <MetricBar label="Resting HR" emoji="❤️" value={todayLog?.heartRate} goal={METRIC_GOALS.heartRate} unit="bpm" color="#F66E8E" />
          {todayLog?.calories !== undefined && <MetricBar label="Calories burned" emoji="🔥" value={todayLog?.calories} goal={500} unit="kcal" color="#F6A86E" />}
          {todayLog?.weight !== undefined && (
            <View style={g.metricBar}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#222540' }}>⚖️ Weight</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#7B6EF6', textAlign: 'right' }}>{todayLog.weight} kg</Text>
            </View>
          )}

          {/* Medication adherence */}
          {activeMeds.length > 0 && (
            <View style={[g.healthDataPanel, { marginTop: 16 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={g.lbSectionLabel}>MEDICATIONS TODAY</Text>
                <TouchableOpacity onPress={onMedication}><Text style={{ fontSize: 12, color: '#7B6EF6', fontWeight: '700' }}>Manage →</Text></TouchableOpacity>
              </View>
              {activeMeds.map(med => {
                const takenCount = med.times.filter(t => todayMedLog?.taken[`${med.id}_${t}`]).length
                const pct = med.times.length > 0 ? Math.round((takenCount / med.times.length) * 100) : 0
                return (
                  <View key={med.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <View style={[g.medDot, { backgroundColor: med.color, width: 10, height: 10 }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222540' }}>{med.name} <Text style={{ color: '#9A9DB2', fontWeight: '400' }}>{med.dosage}</Text></Text>
                      <View style={{ height: 4, backgroundColor: '#F0EFF8', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                        <View style={{ width: `${pct}%`, height: 4, backgroundColor: pct === 100 ? '#6EE6C0' : med.color, borderRadius: 2 }} />
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: pct === 100 ? '#6EE6C0' : med.color }}>{takenCount}/{med.times.length}</Text>
                  </View>
                )
              })}
            </View>
          )}

          {/* 7-day mini chart */}
          <Text style={[g.lbSectionLabel, { marginTop: 20, marginBottom: 12 }]}>THIS WEEK</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E9E6F2' }}>
            {week7.map((w, i) => {
              const stepH = w.log?.steps ? Math.min(60, Math.round((w.log.steps / METRIC_GOALS.steps) * 60)) : 0
              const isToday = w.date === today
              return (
                <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={{ height: 60, width: 16, justifyContent: 'flex-end', borderRadius: 4, backgroundColor: '#F0EFF8', overflow: 'hidden' }}>
                    {stepH > 0 && <View style={{ height: stepH, backgroundColor: isToday ? '#7B6EF6' : '#A89BFA', borderRadius: 4 }} />}
                  </View>
                  {w.medPct !== null && (
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: w.medPct >= 80 ? '#6EE6C0' : w.medPct >= 50 ? '#F6C26E' : '#F66E8E' }} />
                  )}
                  <Text style={{ fontSize: 10, color: isToday ? '#7B6EF6' : '#9A9DB2', fontWeight: isToday ? '800' : '500' }}>{w.day}</Text>
                </View>
              )
            })}
          </View>
          <Text style={{ fontSize: 11, color: '#9A9DB2', textAlign: 'center', marginTop: 6 }}>Purple bars = steps · Dots = medication adherence (🟢 ≥80% · 🟡 50–79% · 🔴 &lt;50%)</Text>

          {(!todayLog && activeMeds.length === 0) && (
            <TouchableOpacity style={[g.saveBtn, { backgroundColor: '#7B6EF6', marginTop: 20 }]} onPress={() => setTab('log')}>
              <Text style={g.saveBtnTxt}>+ Log today's health data</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* LOG DATA */}
      {tab === 'log' && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[g.lbSectionLabel, { marginBottom: 4 }]}>LOG TODAY'S METRICS</Text>
          <Text style={{ fontSize: 13, color: '#9A9DB2', marginBottom: 16 }}>Enter whatever you have — you don't need to fill everything.</Text>

          {[
            { label: '🚶 Steps', key: 'steps', val: logSteps, set: setLogSteps, placeholder: 'e.g. 8500', kb: 'numeric' as const },
            { label: '😴 Sleep (hours)', key: 'sleep', val: logSleep, set: setLogSleep, placeholder: 'e.g. 7.5', kb: 'decimal-pad' as const },
            { label: '❤️ Resting heart rate (bpm)', key: 'hr', val: logHR, set: setLogHR, placeholder: 'e.g. 62', kb: 'numeric' as const },
            { label: '⚡ Active minutes', key: 'active', val: logActive, set: setLogActive, placeholder: 'e.g. 45', kb: 'numeric' as const },
            { label: '🔥 Calories burned', key: 'cals', val: logCals, set: setLogCals, placeholder: 'e.g. 350', kb: 'numeric' as const },
            { label: '⚖️ Weight (kg)', key: 'weight', val: logWeight, set: setLogWeight, placeholder: 'e.g. 72.5', kb: 'decimal-pad' as const },
          ].map(f => (
            <View key={f.key}>
              <Text style={g.fieldLabel}>{f.label}</Text>
              <TextInput style={g.input} placeholder={f.placeholder} value={f.val} onChangeText={f.set} keyboardType={f.kb} />
            </View>
          ))}

          <TouchableOpacity
            style={[g.saveBtn, { backgroundColor: '#7B6EF6', opacity: saving ? 0.5 : 1, marginTop: 16 }]}
            onPress={saveLog} disabled={saving}
          >
            <Text style={g.saveBtnTxt}>Save health data ✓</Text>
          </TouchableOpacity>

          <View style={{ backgroundColor: '#F3F0FF', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#7B6EF620' }}>
            <Text style={{ fontSize: 13, color: '#7B6EF6', fontWeight: '700', marginBottom: 4 }}>💡 Tip: Connect a device for automatic sync</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Apple Watch, Fitbit and Google Fit can sync your data automatically without manual entry.</Text>
            <TouchableOpacity onPress={() => setTab('connect')} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 13, color: '#7B6EF6', fontWeight: '700' }}>Connect devices →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CONNECT DEVICES */}
      {tab === 'connect' && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[g.lbSectionLabel, { marginBottom: 4 }]}>CONNECT HEALTH APPS & DEVICES</Text>
          <Text style={{ fontSize: 13, color: '#9A9DB2', marginBottom: 16 }}>Connected apps sync your activity, sleep, and heart rate automatically into SOMA Health Hub.</Text>

          {HEALTH_APPS.map(app => {
            const connected = connectedApps.includes(app.id)
            return (
              <View key={app.id} style={[g.deviceRow, connected && { borderColor: app.color + '60', backgroundColor: app.color + '05' }]}>
                <HealthAppLogo id={app.id} size={52} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#222540' }}>{app.name}</Text>
                    <View style={{ backgroundColor: '#F0EFF8', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: '#9A9DB2', fontWeight: '700' }}>{app.platform}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#9A9DB2', marginTop: 2 }}>{app.desc}</Text>
                  {connected && <Text style={{ fontSize: 11, color: app.color, fontWeight: '700', marginTop: 4 }}>✓ Connected — syncing automatically</Text>}
                </View>
                <TouchableOpacity
                  style={[g.deviceConnectBtn, { backgroundColor: connected ? '#F5F4FA' : app.color }]}
                  onPress={() => toggleApp(app.id)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '800', color: connected ? '#9A9DB2' : '#fff' }}>
                    {connected ? 'Disconnect' : 'Connect'}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          })}

          <View style={{ backgroundColor: '#F0FAF5', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1, borderColor: '#6EE6C030' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#2A7A5E', marginBottom: 4 }}>🔐 Privacy first</Text>
            <Text style={{ fontSize: 12, color: '#555', lineHeight: 19 }}>Health data stays on your device. SOMA never uploads your steps, heart rate, or sleep data to any server. Connections use the app's secure OS-level permission system.</Text>
          </View>

          <Text style={{ fontSize: 11, color: '#C0C0D0', textAlign: 'center', marginTop: 16 }}>
            On a real device, Connect buttons open the official OS permission dialog (HealthKit on iOS, Health Connect on Android). Approval is required before any data syncs.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  MEDICATION TRACKER
// ════════════════════════════════════════════════════════════
const MED_COLORS = ['#7B6EF6','#F66E8E','#6EE6C0','#F6C26E','#6E8BF6','#F6A86E','#A89BFA','#6ECFF6']
const MED_TIMES = [
  { key: 'morning',   label: 'Morning',   emoji: '🌅' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { key: 'evening',   label: 'Evening',   emoji: '🌆' },
  { key: 'night',     label: 'Night',     emoji: '🌙' },
]

function MedicationTracker({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [tab, setTab] = useState<'today' | 'add' | 'history'>('today')
  const [newName, setNewName] = useState('')
  const [newDosage, setNewDosage] = useState('')
  const [newTimes, setNewTimes] = useState<string[]>(['morning'])
  const [newNotes, setNewNotes] = useState('')
  const [newColor, setNewColor] = useState(MED_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [todayLog, setTodayLog] = useState<Record<string, boolean>>(() => DB.getMedLog(today)?.taken || {})

  const activeMeds = (profile.medications || []).filter(m => m.active)
  const logs = profile.medLogs || []

  // Adherence streak: consecutive days where ALL scheduled meds were taken
  function calcStreak(): number {
    if (!activeMeds.length) return 0
    let streak = 0
    const d = new Date(); d.setDate(d.getDate() - 1) // start from yesterday
    for (let i = 0; i < 30; i++) {
      const dateStr = d.toISOString().slice(0, 10)
      const log = logs.find(l => l.date === dateStr)
      if (!log) break
      const allTaken = activeMeds.every(m => m.times.every(t => log.taken[`${m.id}_${t}`] === true))
      if (!allTaken) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  }

  function todayProgress(): { done: number; total: number } {
    let done = 0, total = 0
    activeMeds.forEach(m => {
      m.times.forEach(t => {
        total++
        if (todayLog[`${m.id}_${t}`]) done++
      })
    })
    return { done, total }
  }

  function toggleDose(medId: string, time: string) {
    const key = `${medId}_${time}`
    const next = { ...todayLog, [key]: !todayLog[key] }
    setTodayLog(next)
    DB.logMedTaken(medId, time, next[key])
    onRefresh()
  }

  function addMed() {
    if (!newName.trim()) return
    setSaving(true)
    DB.addMedication(newName.trim(), newDosage.trim(), newTimes, newColor, newNotes.trim() || undefined)
    onRefresh()
    setNewName(''); setNewDosage(''); setNewTimes(['morning']); setNewNotes(''); setNewColor(MED_COLORS[0])
    setSaving(false)
    setTab('today')
  }

  const { done, total } = todayProgress()
  const streak = calcStreak()
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>💊 Medications</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Streak banner */}
      {streak > 0 && (
        <View style={[g.streakBanner, { backgroundColor: '#7B6EF610', borderColor: '#7B6EF640' }]}>
          <Text style={{ fontSize: 22 }}>🏆</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#7B6EF6' }}>{streak} day streak!</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Keep going — every dose matters</Text>
          </View>
        </View>
      )}

      {/* Tab bar */}
      <View style={g.tabRow}>
        {(['today','add','history'] as const).map(t => (
          <TouchableOpacity key={t} style={[g.tabBtn, tab === t && g.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[g.tabBtnTxt, tab === t && g.tabBtnTxtActive]}>
              {t === 'today' ? 'Today' : t === 'add' ? '+ Add Med' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TODAY tab */}
      {tab === 'today' && (
        <View style={{ paddingHorizontal: 20 }}>
          {total > 0 && (
            <View style={g.medProgressCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#222540' }}>Today's doses</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: pct === 100 ? '#6EE6C0' : '#7B6EF6' }}>{done}/{total} taken</Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#E9E6F2', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: 8, backgroundColor: pct === 100 ? '#6EE6C0' : '#7B6EF6', borderRadius: 4 }} />
              </View>
              {pct === 100 && <Text style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#6EE6C0', fontWeight: '700' }}>✓ All done for today! Great job 🎉</Text>}
            </View>
          )}

          {activeMeds.length === 0 ? (
            <TouchableOpacity style={g.emptyCircle} onPress={() => setTab('add')}>
              <Text style={g.emptyCircleTxt}>No medications yet. Tap "+ Add Med" to start tracking.</Text>
            </TouchableOpacity>
          ) : (
            activeMeds.map(med => (
              <View key={med.id} style={[g.medCard2, { borderLeftColor: med.color }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={[g.medDot, { backgroundColor: med.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#222540' }}>{med.name}</Text>
                    {med.dosage ? <Text style={{ fontSize: 12, color: '#9A9DB2' }}>{med.dosage}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => { DB.removeMedication(med.id); onRefresh() }}>
                    <Text style={{ color: '#E8636F', fontSize: 12 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {med.times.map(time => {
                    const t = MED_TIMES.find(x => x.key === time)!
                    const key = `${med.id}_${time}`
                    const taken = todayLog[key]
                    return (
                      <TouchableOpacity
                        key={time}
                        style={[g.doseChip, taken && { backgroundColor: med.color + '25', borderColor: med.color }]}
                        onPress={() => toggleDose(med.id, time)}
                      >
                        <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: taken ? med.color : '#9A9DB2' }}>{t.label}</Text>
                        {taken && <Text style={{ fontSize: 14, color: med.color }}>✓</Text>}
                      </TouchableOpacity>
                    )
                  })}
                </View>
                {med.notes ? <Text style={{ fontSize: 12, color: '#9A9DB2', marginTop: 8 }}>📝 {med.notes}</Text> : null}
              </View>
            ))
          )}
        </View>
      )}

      {/* ADD tab */}
      {tab === 'add' && (
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[g.secLabel, { marginBottom: 16 }]}>NEW MEDICATION</Text>
          <Text style={g.fieldLabel}>Medication name *</Text>
          <TextInput style={g.input} placeholder="e.g. Sertraline, Vitamin D…" value={newName} onChangeText={setNewName} />
          <Text style={g.fieldLabel}>Dosage</Text>
          <TextInput style={g.input} placeholder="e.g. 50mg, 1 tablet" value={newDosage} onChangeText={setNewDosage} />
          <Text style={g.fieldLabel}>When to take</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {MED_TIMES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[g.timeChip, newTimes.includes(t.key) && g.timeChipActive]}
                onPress={() => setNewTimes(prev => prev.includes(t.key) ? prev.filter(x => x !== t.key) : [...prev, t.key])}
              >
                <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: newTimes.includes(t.key) ? '#fff' : '#222540' }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={g.fieldLabel}>Color</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {MED_COLORS.map(c => (
              <TouchableOpacity key={c} onPress={() => setNewColor(c)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: newColor === c ? 3 : 0, borderColor: '#fff', shadowColor: c, shadowOpacity: 0.5, shadowRadius: 4, elevation: 3 }} />
            ))}
          </View>
          <Text style={g.fieldLabel}>Notes (optional)</Text>
          <TextInput style={[g.input, { height: 70 }]} placeholder="Take with food, avoid grapefruit…" value={newNotes} onChangeText={setNewNotes} multiline />
          <TouchableOpacity style={[g.saveBtn, { backgroundColor: '#7B6EF6', opacity: !newName.trim() || saving ? 0.5 : 1 }]}
            onPress={addMed} disabled={!newName.trim() || saving}>
            <Text style={g.saveBtnTxt}>Add Medication</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HISTORY tab */}
      {tab === 'history' && (
        <View style={{ paddingHorizontal: 20 }}>
          {logs.length === 0 ? (
            <View style={g.emptyCircle}><Text style={g.emptyCircleTxt}>No history yet. Start tracking today!</Text></View>
          ) : (
            logs.slice(0, 30).map(log => {
              const meds = profile.medications || []
              const allDoses = meds.filter(m => m.active).flatMap(m => m.times.map(t => ({ med: m, time: t, taken: log.taken[`${m.id}_${t}`] })))
              const takenCount = allDoses.filter(d => d.taken).length
              const totalCount = allDoses.length
              const pctDay = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0
              return (
                <View key={log.date} style={[g.histRow, { marginBottom: 10 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#222540' }}>{log.date}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: pctDay === 100 ? '#6EE6C0' : pctDay >= 50 ? '#F6C26E' : '#F66E8E' }}>{pctDay}%</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E9E6F2', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${pctDay}%`, height: 6, backgroundColor: pctDay === 100 ? '#6EE6C0' : pctDay >= 50 ? '#F6C26E' : '#F66E8E', borderRadius: 3 }} />
                  </View>
                  <Text style={{ fontSize: 11, color: '#9A9DB2', marginTop: 3 }}>{takenCount}/{totalCount} doses taken</Text>
                </View>
              )
            })
          )}
        </View>
      )}
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  THERAPY & SUPPORT
// ════════════════════════════════════════════════════════════
const CRISIS_LINES = [
  { country: '🌍 International', name: 'Crisis Text Line', contact: 'Text HOME to 741741', url: 'https://www.crisistextline.org' },
  { country: '🇺🇸 USA', name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', url: 'https://988lifeline.org' },
  { country: '🇬🇧 UK', name: 'Samaritans', contact: '116 123 (free, 24/7)', url: 'https://www.samaritans.org' },
  { country: '🇦🇺 Australia', name: 'Lifeline', contact: '13 11 14', url: 'https://www.lifeline.org.au' },
  { country: '🇨🇦 Canada', name: 'Crisis Services Canada', contact: '1-833-456-4566', url: 'https://www.crisisservicescanada.ca' },
  { country: '🇩🇪 Germany', name: 'Telefonseelsorge', contact: '0800 111 0 111', url: 'https://www.telefonseelsorge.de' },
  { country: '🇫🇷 France', name: 'SOS Amitié', contact: '09 72 39 40 50', url: 'https://www.sos-amitie.com' },
  { country: '🌐 IASP Directory', name: 'Find your country\'s line', contact: 'International list', url: 'https://www.iasp.info/resources/Crisis_Centres' },
]
const THERAPY_PLATFORMS = [
  { name: 'BetterHelp', desc: 'Online therapy, matched in 48h', emoji: '💬', url: 'https://www.betterhelp.com' },
  { name: 'Talkspace', desc: 'Text, audio & video therapy', emoji: '🎙️', url: 'https://www.talkspace.com' },
  { name: 'Psychology Today', desc: 'Find local therapists', emoji: '🔍', url: 'https://www.psychologytoday.com/us/therapists' },
  { name: 'Open Path', desc: 'Affordable therapy ($30–$80)', emoji: '🌿', url: 'https://openpathcollective.org' },
]
const RECOVERY_STEPS = [
  { emoji: '😴', label: 'Sleep', tip: 'Aim for 7–9 hours. Same bedtime every night.' },
  { emoji: '🚶', label: 'Move', tip: '20 min walk outdoors. Sunlight resets your mood.' },
  { emoji: '💧', label: 'Hydrate', tip: 'Drink 2L water. Dehydration amplifies low mood.' },
  { emoji: '🥗', label: 'Eat', tip: 'One nourishing meal. Omega-3s support brain health.' },
  { emoji: '📵', label: 'Disconnect', tip: '1 hour offline. Social media amplifies anxiety.' },
  { emoji: '🤝', label: 'Connect', tip: 'Reach out to one person, even just a text.' },
  { emoji: '💊', label: 'Meds', tip: 'Take your medication if prescribed. Consistency matters.' },
  { emoji: '✍️', label: 'Express', tip: 'Write 3 sentences about how you feel. No filter.' },
]

function TherapyConnect({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const [tab, setTab] = useState<'support' | 'soma' | 'sessions'>('support')
  const [sessionNote, setSessionNote] = useState('')
  const [somaThought, setSomaThought] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [savingSession, setSavingSession] = useState(false)
  const [recoveryChecks, setRecoveryChecks] = useState<Record<string,boolean>>({})
  const sessions = profile.therapySessions || []

  const aiName = profile.aiName || 'Soma'

  async function getSomaSupport() {
    if (!sessionNote.trim()) return
    setAiLoading(true)
    try {
      const sys = `You are ${aiName}, a warm and compassionate AI companion trained in evidence-based emotional support (CBT, ACT, mindfulness). The user is going through a hard time and reaching out for mental health support. Be deeply empathetic, non-judgmental, and helpful. Offer concrete grounding techniques or coping strategies when appropriate. Never give medical diagnoses or replace professional therapy — gently encourage professional help when needed. Keep your response to 3-4 short paragraphs.${langDirective()}`
      const reflection = await groq([{ role: 'user', content: sessionNote }], sys, 500, 0.7)
      setSomaThought(reflection)
    } catch { setSomaThought('I\'m here with you. Take a slow breath — you reached out and that takes courage.') }
    setAiLoading(false)
  }

  async function saveSession() {
    if (!sessionNote.trim()) return
    setSavingSession(true)
    const reflection = somaThought || undefined
    DB.addTherapySession(sessionNote.trim(), reflection)
    onRefresh()
    setSessionNote(''); setSomaThought('')
    setSavingSession(false)
    setTab('sessions')
  }

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>🧠 Therapy & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Crisis banner — always visible */}
      <View style={g.crisisBanner}>
        <Text style={{ fontSize: 18 }}>🆘</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#E8636F' }}>In crisis right now?</Text>
          <Text style={{ fontSize: 12, color: '#666' }}>Call or text a crisis line — free, confidential, 24/7</Text>
        </View>
        <TouchableOpacity style={g.crisisBtn} onPress={() => setTab('support')}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Get Help</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={g.tabRow}>
        {([['support','Resources'],['soma',`Talk to ${aiName}`],['sessions','My Sessions']] as [string,string][]).map(([t, label]) => (
          <TouchableOpacity key={t} style={[g.tabBtn, tab === t && g.tabBtnActive]} onPress={() => setTab(t as any)}>
            <Text style={[g.tabBtnTxt, tab === t && g.tabBtnTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SUPPORT tab */}
      {tab === 'support' && (
        <View style={{ paddingHorizontal: 20 }}>
          {/* Recovery checklist */}
          <Text style={[g.secLabel, { marginBottom: 12 }]}>RECOVERY BASICS — TODAY</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {RECOVERY_STEPS.map(step => {
              const checked = recoveryChecks[step.label]
              return (
                <TouchableOpacity key={step.label}
                  style={[g.recoveryChip, checked && g.recoveryChipDone]}
                  onPress={() => setRecoveryChecks(prev => ({ ...prev, [step.label]: !prev[step.label] }))}
                >
                  <Text style={{ fontSize: 20 }}>{step.emoji}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: checked ? '#fff' : '#444', textAlign: 'center' }}>{step.label}</Text>
                  {checked && <Text style={{ fontSize: 11, color: '#ffffff99' }}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
          {Object.values(recoveryChecks).filter(Boolean).length > 0 && (
            <View style={{ backgroundColor: '#6EE6C010', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#6EE6C030' }}>
              <Text style={{ fontSize: 13, color: '#2A7A5E', fontWeight: '600' }}>
                {Object.values(recoveryChecks).filter(Boolean).length} of {RECOVERY_STEPS.length} basics done today — every step is progress. 💚
              </Text>
            </View>
          )}

          {/* Crisis lines */}
          <Text style={[g.secLabel, { marginBottom: 12 }]}>CRISIS HOTLINES</Text>
          {CRISIS_LINES.map(line => (
            <View key={line.name} style={g.crisisRow}>
              <Text style={{ fontSize: 12, color: '#9A9DB2', marginBottom: 2 }}>{line.country}</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#222540' }}>{line.name}</Text>
              <Text style={{ fontSize: 13, color: '#E8636F', fontWeight: '700', marginTop: 2 }}>{line.contact}</Text>
            </View>
          ))}

          {/* Online therapy platforms */}
          <Text style={[g.secLabel, { marginTop: 20, marginBottom: 12 }]}>FIND A THERAPIST</Text>
          {THERAPY_PLATFORMS.map(p => (
            <View key={p.name} style={g.therapyPlatformRow}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#222540' }}>{p.name}</Text>
                <Text style={{ fontSize: 12, color: '#9A9DB2' }}>{p.desc}</Text>
              </View>
              <Text style={{ fontSize: 18, color: '#7B6EF6' }}>→</Text>
            </View>
          ))}
          <Text style={{ fontSize: 11, color: '#C0C0D0', textAlign: 'center', marginTop: 12 }}>SOMA is not a replacement for professional therapy. Please reach out to a licensed therapist for ongoing care.</Text>
        </View>
      )}

      {/* SOMA SUPPORT tab */}
      {tab === 'soma' && (
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: '#7B6EF610', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#7B6EF630' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#7B6EF6', marginBottom: 4 }}>Talk to {aiName} about how you feel</Text>
            <Text style={{ fontSize: 13, color: '#666' }}>{aiName} uses evidence-based techniques — CBT, ACT, mindfulness — to support your recovery. Always confidential, always caring.</Text>
          </View>
          <Text style={g.fieldLabel}>How are you feeling right now?</Text>
          <TextInput
            style={[g.input, { height: 120, textAlignVertical: 'top' }]}
            placeholder={`Write freely — ${aiName} is listening. How are you really doing? What's weighing on you?`}
            value={sessionNote}
            onChangeText={setSessionNote}
            multiline
          />
          <TouchableOpacity
            style={[g.saveBtn, { backgroundColor: '#7B6EF6', opacity: (!sessionNote.trim() || aiLoading) ? 0.5 : 1, marginBottom: 12 }]}
            onPress={getSomaSupport} disabled={!sessionNote.trim() || aiLoading}
          >
            <Text style={g.saveBtnTxt}>{aiLoading ? `${aiName} is listening…` : `Share with ${aiName} 💜`}</Text>
          </TouchableOpacity>

          {somaThought ? (
            <View style={[g.somaReflCard, { marginBottom: 16 }]}>
              <Text style={g.somaReflLabel}>🧠 {aiName} says</Text>
              <Text style={g.somaReflTxt}>{somaThought}</Text>
              <TouchableOpacity
                style={[g.saveBtn, { backgroundColor: '#6EE6C0', marginTop: 12, opacity: savingSession ? 0.5 : 1 }]}
                onPress={saveSession} disabled={savingSession}
              >
                <Text style={[g.saveBtnTxt, { color: '#222540' }]}>Save this session ✓</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={{ backgroundColor: '#F5F4FA', borderRadius: 12, padding: 12, marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: '#9A9DB2', textAlign: 'center' }}>
              {aiName} is an AI companion, not a licensed therapist. In a crisis, please call a crisis line. 💙
            </Text>
          </View>
        </View>
      )}

      {/* MY SESSIONS tab */}
      {tab === 'sessions' && (
        <View style={{ paddingHorizontal: 20 }}>
          {sessions.length === 0 ? (
            <TouchableOpacity style={g.emptyCircle} onPress={() => setTab('soma')}>
              <Text style={g.emptyCircleTxt}>No sessions yet. Talk to {aiName} to record your first session.</Text>
            </TouchableOpacity>
          ) : (
            sessions.slice(0, 20).map(s => (
              <View key={s.id} style={[g.histRow, { marginBottom: 14 }]}>
                <Text style={{ fontSize: 12, color: '#9A9DB2', marginBottom: 4 }}>{s.date}</Text>
                <Text style={{ fontSize: 14, color: '#222540', marginBottom: 8 }} numberOfLines={3}>{s.notes}</Text>
                {s.somaReflection && (
                  <View style={{ backgroundColor: '#7B6EF608', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#7B6EF6' }}>
                    <Text style={{ fontSize: 11, color: '#7B6EF6', fontWeight: '700', marginBottom: 2 }}>🧠 {aiName}</Text>
                    <Text style={{ fontSize: 12, color: '#555', fontStyle: 'italic' }} numberOfLines={4}>{s.somaReflection}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  NOTIFICATION SETTINGS PANEL
// ════════════════════════════════════════════════════════════
const GRATITUDE_TIME_OPTIONS = [
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
]

function NotificationSettingsPanel({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const ns = profile.notifSettings ?? { enabled: false, medReminders: true, gratitudeEnabled: true, gratitudeHour: 21, gratitudeMinute: 0 }
  const [enabled, setEnabled] = useState(ns.enabled)
  const [medReminders, setMedReminders] = useState(ns.medReminders)
  const [gratitudeEnabled, setGratitudeEnabled] = useState(ns.gratitudeEnabled)
  const [gratitudeHour, setGratitudeHour] = useState(ns.gratitudeHour ?? 21)
  const [gratitudeMinute, setGratitudeMinute] = useState(ns.gratitudeMinute ?? 0)
  const [permDenied, setPermDenied] = useState(false)
  const [generating, setGenerating] = useState(false)

  const save = (patch: Partial<typeof ns>) => {
    const next = { enabled, medReminders, gratitudeEnabled, gratitudeHour, gratitudeMinute, ...patch }
    DB.setNotifSettings(next)
    onRefresh()
  }

  const toggleEnabled = async (val: boolean) => {
    if (val) {
      const granted = await requestNotifPermission()
      if (!granted) { setPermDenied(true); return }
      // Generate personalized messages on first enable
      if (!profile.notifMessages?.length) {
        setGenerating(true)
        const msgs = await generatePersonalizedMessages(profile)
        DB.setNotifMessages(msgs)
        setGenerating(false)
        onRefresh()
      }
    }
    setPermDenied(false)
    setEnabled(val)
    save({ enabled: val })
  }

  const toggleMed = (val: boolean) => { setMedReminders(val); save({ medReminders: val }) }
  const toggleGratitude = (val: boolean) => { setGratitudeEnabled(val); save({ gratitudeEnabled: val }) }
  const pickGratitudeTime = (hour: number, minute: number) => {
    setGratitudeHour(hour); setGratitudeMinute(minute)
    save({ gratitudeHour: hour, gratitudeMinute: minute })
  }

  const refreshMessages = async () => {
    setGenerating(true)
    const msgs = await generatePersonalizedMessages(profile)
    DB.setNotifMessages(msgs)
    setGenerating(false)
    onRefresh()
  }

  const activeMedCount = (profile.medications || []).filter(m => m.active).length
  const cachedMessages = profile.notifMessages || []
  const aiName = profile.aiName || 'Soma'

  // Count how much personal data feeds the AI
  const dataPoints = (profile.memories?.filter(m => m.sentiment === 'positive').length || 0) +
    (profile.gratitudeEntries?.length || 0) +
    (profile.loveEntries?.length || 0)
  const streak = calcGratitudeStreak(profile)

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {permDenied && (
        <View style={{ margin: 20, padding: 14, backgroundColor: '#FFF3F3', borderRadius: 12, borderColor: '#F66E6E', borderWidth: 1 }}>
          <Text style={{ fontSize: 13, color: '#C0392B', fontWeight: '600' }}>
            Permission denied. Please enable notifications in your device Settings → SOMA.
          </Text>
        </View>
      )}

      {/* Master toggle */}
      <View style={[g.stgGroup, { marginTop: 20 }]}>
        <View style={[g.notifRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={g.notifRowTitle}>Enable notifications</Text>
            <Text style={g.notifRowSub}>Allow SOMA to send you reminders</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: '#E0DCED', true: '#7B6EF6' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Medication reminders */}
      <Text style={g.stgSec}>Medication</Text>
      <View style={g.stgGroup}>
        <View style={[g.notifRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[g.notifRowTitle, !enabled && { color: '#B0B3C8' }]}>Medication reminders</Text>
            <Text style={g.notifRowSub}>
              {activeMedCount > 0
                ? `${activeMedCount} active medication${activeMedCount > 1 ? 's' : ''} — notified at each dose time`
                : 'Add medications in Health Hub to get reminders'}
            </Text>
          </View>
          <Switch
            value={medReminders && enabled}
            onValueChange={toggleMed}
            disabled={!enabled}
            trackColor={{ false: '#E0DCED', true: '#7B6EF6' }}
            thumbColor="#fff"
          />
        </View>
      </View>
      {enabled && medReminders && activeMedCount > 0 && (
        <View style={{ marginHorizontal: 20, marginTop: -4, marginBottom: 8 }}>
          {(profile.medications || []).filter(m => m.active).map(med => (
            <View key={med.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: med.color }} />
              <Text style={{ fontSize: 12, color: '#555' }}>
                {med.name} — {med.times.map(t => ({ morning: '8:00 AM', afternoon: '1:00 PM', evening: '6:00 PM', night: '9:00 PM' }[t] || t)).join(', ')}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Daily check-in */}
      <Text style={g.stgSec}>Daily check-in</Text>
      <View style={g.stgGroup}>
        <View style={g.notifRow}>
          <View style={{ flex: 1 }}>
            <Text style={[g.notifRowTitle, !enabled && { color: '#B0B3C8' }]}>Personalised reminder</Text>
            <Text style={g.notifRowSub}>
              {aiName} writes your reminders from what you've shared — gratitude, memories, loved ones
            </Text>
          </View>
          <Switch
            value={gratitudeEnabled && enabled}
            onValueChange={toggleGratitude}
            disabled={!enabled}
            trackColor={{ false: '#E0DCED', true: '#7B6EF6' }}
            thumbColor="#fff"
          />
        </View>
        {/* Time picker */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={[g.notifRowSub, { marginBottom: 8 }]}>Reminder time</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GRATITUDE_TIME_OPTIONS.map(opt => {
              const active = opt.hour === gratitudeHour && opt.minute === gratitudeMinute
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => pickGratitudeTime(opt.hour, opt.minute)}
                  disabled={!enabled || !gratitudeEnabled}
                  style={[g.notifTimeChip, active && g.notifTimeChipActive, (!enabled || !gratitudeEnabled) && { opacity: 0.4 }]}
                >
                  <Text style={[g.notifTimeChipTxt, active && { color: '#fff' }]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>

      {/* AI-generated message preview */}
      <Text style={g.stgSec}>This week's messages</Text>
      <View style={[g.stgGroup, { padding: 16 }]}>
        {/* Data source info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dataPoints > 0 ? '#6EE6C0' : '#E0DCED' }} />
          <Text style={{ fontSize: 12, color: '#9CA0B5', flex: 1 }}>
            {dataPoints > 0
              ? `${dataPoints} personal moment${dataPoints > 1 ? 's' : ''} · ${streak > 0 ? `🔥 ${streak}-day streak` : 'no streak yet'} — ${aiName} mixes fun + personal`
              : `Share more with ${aiName} to get truly personal messages`}
          </Text>
        </View>

        {generating ? (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ fontSize: 13, color: '#7B6EF6', fontWeight: '600' }}>✨ {aiName} is writing your messages…</Text>
          </View>
        ) : cachedMessages.length > 0 ? (
          <View style={{ gap: 6 }}>
            {cachedMessages.map((msg, i) => (
              <View key={i} style={g.notifMsgPreview}>
                <View style={{ width: 80 }}>
                  <Text style={g.notifMsgDay}>{WEEKDAY_LABELS[i % 7]}</Text>
                  <Text style={{ fontSize: 10, color: '#C5BFEC', marginTop: 1 }}>{NOTIF_TONE_LABELS[i % 7]}</Text>
                </View>
                <Text style={g.notifMsgText}>{msg}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ fontSize: 13, color: '#B0B3C8', textAlign: 'center', lineHeight: 20 }}>
              Enable notifications above and {aiName} will write messages just for you
            </Text>
          </View>
        )}

        {/* Refresh button */}
        {enabled && (
          <TouchableOpacity
            onPress={refreshMessages}
            disabled={generating}
            style={[g.settingsSaveBtn, { marginTop: 14, backgroundColor: generating ? '#E0DCED' : '#7B6EF6' }]}
          >
            <Text style={g.settingsSaveTxt}>
              {generating ? '✨ Generating…' : '✦ Refresh messages'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Privacy note */}
      <View style={{ margin: 20, padding: 14, backgroundColor: '#F5F3FF', borderRadius: 12 }}>
        <Text style={{ fontSize: 13, color: '#7B6EF6', fontWeight: '600', marginBottom: 4 }}>🔒 Privacy first</Text>
        <Text style={{ fontSize: 12, color: '#666', lineHeight: 18 }}>
          Your messages are generated from what you share with {aiName} and scheduled locally on your device. No data leaves your phone to trigger reminders.
        </Text>
      </View>
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  VOICE SETTINGS PANEL — pick Soma's voice + speaking style
// ════════════════════════════════════════════════════════════
const VOICE_STYLES = [
  { key: 'calm',    label: '🌙 Calm',    sub: 'Slow and soothing',  rate: 0.82, pitch: 0.95 },
  { key: 'natural', label: '🌿 Natural', sub: 'Easy, friendly pace', rate: 0.95, pitch: 1.0 },
  { key: 'lively',  label: '☀️ Lively',  sub: 'Bright and upbeat',  rate: 1.08, pitch: 1.1 },
]

function VoiceSettingsPanel({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const vs = profile.voiceSettings ?? { voiceName: undefined, rate: DEFAULT_VOICE_RATE, pitch: DEFAULT_VOICE_PITCH }
  const [voiceName, setVoiceName] = useState<string | undefined>(vs.voiceName)
  const [rate, setRate] = useState(vs.rate)
  const [pitch, setPitch] = useState(vs.pitch)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const aiName = profile.aiName || 'Soma'

  // Voices can arrive late on web — poll briefly until they show up
  useEffect(() => {
    const load = () => setVoices(voicesForLang(profile.language || 'en'))
    load()
    const t = setInterval(() => { if (!getVoices().length) return; load(); clearInterval(t) }, 300)
    return () => clearInterval(t)
  }, [])

  const preview = (name?: string, r?: number, pt?: number) => {
    DB.setVoiceSettings({ voiceName: name, rate: r ?? rate, pitch: pt ?? pitch })
    speak(`Hi, I'm ${aiName}. This is how I sound.`)
  }

  const pickVoice = (name?: string) => {
    setVoiceName(name)
    DB.setVoiceSettings({ voiceName: name, rate, pitch })
    onRefresh()
    preview(name)
  }

  const pickStyle = (r: number, pt: number) => {
    setRate(r); setPitch(pt)
    DB.setVoiceSettings({ voiceName, rate: r, pitch: pt })
    onRefresh()
    preview(voiceName, r, pt)
  }

  const activeStyle = VOICE_STYLES.find(s => Math.abs(s.rate - rate) < 0.04)?.key

  return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>{aiName}'s voice</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Speaking style */}
      <Text style={g.stgSec}>Speaking style</Text>
      <View style={[g.stgGroup, { padding: 14 }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {VOICE_STYLES.map(s => {
            const on = activeStyle === s.key
            return (
              <TouchableOpacity key={s.key} onPress={() => pickStyle(s.rate, s.pitch)}
                style={{ flex: 1, backgroundColor: on ? '#F1EEFF' : '#FAF9FD', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: on ? '#7B6EF6' : '#ECE9F4' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#222540' }}>{s.label}</Text>
                <Text style={{ fontSize: 10.5, color: '#8A8FA8', marginTop: 4, textAlign: 'center' }}>{s.sub}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Voice list */}
      <Text style={g.stgSec}>Voice</Text>
      <View style={g.stgGroup}>
        <TouchableOpacity onPress={() => pickVoice(undefined)}
          style={[g.notifRow, !voiceName && { backgroundColor: '#F8F6FF' }]}>
          <View style={{ flex: 1 }}>
            <Text style={g.notifRowTitle}>✨ Best available</Text>
            <Text style={g.notifRowSub}>{aiName} picks the highest-quality voice on this device</Text>
          </View>
          {!voiceName && <Text style={{ color: '#7B6EF6', fontWeight: '800' }}>✓</Text>}
        </TouchableOpacity>
        {voices.length === 0 && (
          <View style={{ padding: 16 }}>
            <Text style={g.notifRowSub}>No voices found yet — voices are provided by your device and may take a moment to load.</Text>
          </View>
        )}
        {voices.slice(0, 12).map((v, i) => {
          const on = voiceName === v.name
          return (
            <TouchableOpacity key={v.name} onPress={() => pickVoice(v.name)}
              style={[g.notifRow, i === Math.min(voices.length, 12) - 1 && { borderBottomWidth: 0 }, on && { backgroundColor: '#F8F6FF' }]}>
              <View style={{ flex: 1 }}>
                <Text style={g.notifRowTitle}>{v.name.replace(/\s*\(.*\)\s*/g, '')}</Text>
                <Text style={g.notifRowSub}>{v.lang}{v.localService ? ' · on-device' : ''}{/premium|enhanced|natural|neural/i.test(v.name) ? ' · ⭐ high quality' : ''}</Text>
              </View>
              {on ? <Text style={{ color: '#7B6EF6', fontWeight: '800' }}>✓</Text> : <Text style={{ color: '#C5BFEC', fontSize: 18 }}>▷</Text>}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Hear it */}
      <View style={{ marginHorizontal: 20, marginTop: 16 }}>
        <TouchableOpacity onPress={() => preview(voiceName)} style={g.settingsSaveBtn}>
          <Text style={g.settingsSaveTxt}>🔊 Hear {aiName}</Text>
        </TouchableOpacity>
        <Text style={[g.notifRowSub, { textAlign: 'center', marginTop: 12 }]}>
          Tap any voice to hear it. Voices come from your device — phones usually have more natural ones than browsers.
        </Text>
      </View>
    </ScrollView>
  )
}

function Settings({ profile, onBack, onRefresh, onReset }: { profile: UserProfile; onBack: () => void; onRefresh: () => void; onReset: () => void }) {
  type Panel = null | 'language' | 'companion' | 'safety' | 'notifications' | 'voice'
  const [panel, setPanel] = useState<Panel>(null)
  const [aiName, setAiName] = useState(profile.aiName || 'Soma')
  const [tcName, setTcName] = useState(profile.trustedContact?.name || '')
  const [tcPhone, setTcPhone] = useState(profile.trustedContact?.phone || '')
  const [showDanger, setShowDanger] = useState(false)
  const back = () => setPanel(null)
  const saveAiName = () => { DB.setAiName(aiName); onRefresh(); back() }
  const saveContact = () => { DB.setTrustedContact(tcName.trim(), tcPhone.trim()); onRefresh(); back() }
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
  const curLang = LANGS.find(l => l.code === (profile.language || 'en'))

  // ── Sub-screen: Language ──────────────────────────────────
  if (panel === 'language') return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={back} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>Language</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[g.stgGroup, { padding: 16, marginTop: 20 }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LANGS.map(l => {
            const active = (profile.language || 'en') === l.code
            return (
              <TouchableOpacity key={l.code} onPress={() => { DB.setLanguage(l.code); onRefresh() }}
                style={[g.settingsLangChip, active && g.settingsLangChipActive]}>
                <Text style={[g.settingsLangChipTxt, active && { color: '#fff' }]}>{l.flag}  {l.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </ScrollView>
  )

  // ── Sub-screen: Companion ─────────────────────────────────
  if (panel === 'companion') return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={back} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>Your companion</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[g.stgGroup, { padding: 20, marginTop: 20 }]}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          {profile.aiPhoto
            ? <Image source={{ uri: profile.aiPhoto }} style={{ width: 72, height: 72, borderRadius: 20 }} />
            : <SomaMark size={72} />}
          <Text style={[g.stgLabel, { marginTop: 10, textAlign: 'center' }]}>{profile.aiName || 'Soma'}</Text>
        </View>
        <Text style={g.settingsInputLabel}>Companion name</Text>
        <TextInput style={g.settingsInput} value={aiName} onChangeText={setAiName}
          placeholder="e.g. Soma, Maya, Kai" placeholderTextColor="#B0B3C8" />
        <TouchableOpacity style={[g.settingsSaveBtn, !aiName.trim() && g.off, { marginTop: 16 }]}
          onPress={saveAiName} disabled={!aiName.trim()}>
          <Text style={g.settingsSaveTxt}>Save</Text>
        </TouchableOpacity>
      </View>
      <View style={[g.stgGroup, { marginTop: 12 }]}>
        <StgRow icon={profile.aiPhoto ? '🖼' : '🌟'} label={profile.aiPhoto ? 'Change photo' : 'Add a photo'}
          value="Personalise your companion" onPress={changePipPhoto} last />
      </View>
    </ScrollView>
  )

  // ── Sub-screen: Safety ────────────────────────────────────
  if (panel === 'safety') return (
    <ScrollView style={g.screen} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={back} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>Trusted contact</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[g.stgGroup, { padding: 20, marginTop: 20 }]}>
        <Text style={g.settingsHelpTxt}>If you ever have a really hard moment, {profile.aiName} can help you reach this person in one tap.</Text>
        <Text style={g.settingsInputLabel}>Their name</Text>
        <TextInput style={g.settingsInput} value={tcName} onChangeText={setTcName}
          placeholder="e.g. Mom, best friend" placeholderTextColor="#B0B3C8" />
        <Text style={g.settingsInputLabel}>Their phone number</Text>
        <TextInput style={g.settingsInput} value={tcPhone} onChangeText={setTcPhone}
          placeholder="+1 555 000 0000" placeholderTextColor="#B0B3C8" keyboardType="phone-pad" />
        <TouchableOpacity style={[g.settingsSaveBtn, !(tcName.trim() && tcPhone.trim()) && g.off, { marginTop: 16 }]}
          onPress={saveContact} disabled={!(tcName.trim() && tcPhone.trim())}>
          <Text style={g.settingsSaveTxt}>{profile.trustedContact?.phone ? 'Update contact' : 'Save contact'}</Text>
        </TouchableOpacity>
        <Text style={g.settingsCrisisLine}>Need help now? Call or text <Text style={{ fontWeight: '700' }}>988</Text> (US) · findahelpline.com</Text>
      </View>
    </ScrollView>
  )

  // ── Sub-screen: Notifications ────────────────────────────
  if (panel === 'notifications') return <NotificationSettingsPanel profile={profile} onBack={back} onRefresh={onRefresh} />

  // ── Sub-screen: Voice ─────────────────────────────────────
  if (panel === 'voice') return <VoiceSettingsPanel profile={profile} onBack={back} onRefresh={onRefresh} />

  // ── Main settings list ────────────────────────────────────
  return (
    <ScrollView style={[g.screen, { backgroundColor: '#F5F4FA' }]} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={g.stgHeaderTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile */}
      <Text style={g.stgSec}>Profile</Text>
      <View style={g.stgGroup}>
        <StgRow icon="👤" label="Name" value={profile.name || '—'} />
        <StgRow icon="📊" label="Sessions" value={`${profile.conversations} conversations`} />
        <StgRow icon="🧠" label="Memories" value={`${profile.memories.length} saved`} last />
      </View>

      {/* Premium */}
      <Text style={g.stgSec}>Premium</Text>
      <View style={g.stgGroup}>
        {profile.premium
          ? <StgRow icon="★" label="SOMA+" value="Active" />
          : <StgRow icon="★" label="SOMA+" value="Not activated" onPress={() => { DB.goPremium(); onRefresh() }} />}
        <StgRow icon="📦" label="Export data" value="Download as JSON" onPress={exportData} last />
      </View>

      {/* Companion */}
      <Text style={g.stgSec}>Your companion</Text>
      <View style={g.stgGroup}>
        <StgRow icon="🌟" label="Name" value={profile.aiName || 'Soma'} onPress={() => setPanel('companion')} />
        <StgRow icon="🔊" label="Voice" value={profile.voiceSettings?.voiceName?.replace(/\s*\(.*\)\s*/g, '') || 'Best available'} onPress={() => setPanel('voice')} />
        <StgRow icon="🖼" label="Photo" value={profile.aiPhoto ? 'Set' : 'Not set'} onPress={changePipPhoto} last />
      </View>

      {/* Application */}
      <Text style={g.stgSec}>Application</Text>
      <View style={g.stgGroup}>
        <StgRow icon="🌍" label="Language" value={`${curLang?.flag} ${curLang?.label}`} onPress={() => setPanel('language')} />
        <StgRow icon="💜" label="Trusted contact"
          value={profile.trustedContact?.name || 'Not set'} onPress={() => setPanel('safety')} />
        <StgRow icon="🔔" label="Notifications"
          value={profile.notifSettings?.enabled ? 'On' : 'Off'} onPress={() => setPanel('notifications')} />
        <StgRow icon="🔒" label="Privacy" value="Data stays on your device" last />
      </View>

      {/* Bottom plain links */}
      <View style={g.stgLinks}>
        <TouchableOpacity onPress={() => setShowDanger(true)}><Text style={g.stgLinkDanger}>Delete account</Text></TouchableOpacity>
      </View>

      {/* Delete confirm */}
      {showDanger && (
        <View style={g.settingsDangerCard}>
          <Text style={g.settingsDangerTitle}>Delete everything?</Text>
          <Text style={g.settingsDangerSub}>This will permanently erase all your memories, diary, profile, and connections. This cannot be undone.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={[g.settingsSaveBtn, { flex: 1, backgroundColor: '#EDEAF8' }]} onPress={() => setShowDanger(false)}>
              <Text style={[g.settingsSaveTxt, { color: '#6E7191' }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[g.settingsSaveBtn, { flex: 1, backgroundColor: '#F66E6E' }]} onPress={onReset}>
              <Text style={g.settingsSaveTxt}>Delete all</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={g.settingsFooter}>
        <SomaMark size={28} />
        <Text style={g.settingsFooterTxt}>Account ID: {profile.name?.toLowerCase().replace(/\s/g, '') || 'soma'}_{profile.conversations || 0}{'\n'}v0.1  ·  SOMA</Text>
      </View>
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
  title: { color: '#222540', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  lead: { color: '#9CA0B5', fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 24 },
  breatheBox: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  breatheCircle: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#7B6EF6', opacity: 0.35 },
  breathePhase: { color: '#A89BFA', fontSize: 18, fontWeight: '700' },
  breatheHint: { color: '#6E7191', fontSize: 13, textAlign: 'center', marginBottom: 28 },
  sectionLbl: { color: '#6E7191', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, alignSelf: 'flex-start', marginTop: 20, marginBottom: 10 },
  helpBtn: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#6EF6A840' },
  helpBtnTitle: { color: '#222540', fontSize: 16, fontWeight: '700' },
  helpBtnSub: { color: '#6E7191', fontSize: 12, marginTop: 4 },
  contactBtn: { width: '100%', backgroundColor: '#F3F0FB', borderRadius: 16, padding: 16, marginTop: 6, borderWidth: 1, borderColor: '#7B6EF660' },
  contactTitle: { color: '#222540', fontSize: 16, fontWeight: '700' },
  contactSub: { color: '#6E7191', fontSize: 12, marginTop: 4 },
  contactEmpty: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E9E6F2' },
  contactEmptyTxt: { color: '#6E7191', fontSize: 13, lineHeight: 20 },
  groundCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E9E6F2' },
  groundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  groundNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  groundNumTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  groundTxt: { color: '#222540', fontSize: 15 },
  moveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  moveChip: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E9E6F2' },
  moveTxt: { color: '#222540', fontSize: 13, fontWeight: '600' },
  hope: { color: '#E8E6F0', fontSize: 15, lineHeight: 25, textAlign: 'center', marginTop: 26, fontStyle: 'italic' },
  closeBtn: { backgroundColor: '#7B6EF6', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, marginTop: 24 },
  closeTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: { color: '#9A9DB2', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 18 },
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
  screen: { flex: 1, backgroundColor: '#FBFAF8' },
  logo: { fontSize: 32, fontWeight: '700', color: '#7B6EF6', letterSpacing: 0 },
  logoSm: { fontSize: 26, fontWeight: '700', color: '#7B6EF6' },
  logoSub: { fontSize: 14, color: '#6E7191', fontStyle: 'italic', marginTop: 6 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14 },
  orbMd: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  orbSm: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  orbIcon: { fontSize: 17, color: '#fff' },
  auraTitle: { color: '#222540', fontSize: 16, fontWeight: '700' },
  auraSub: { color: '#8A8FA8', fontSize: 12, marginTop: 2, fontWeight: '400' },
  divider: { height: 1, backgroundColor: '#EFEDF6' },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#7B6EF640' },
  smallBtnTxt: { color: '#7B6EF6', fontSize: 12, fontWeight: '700' },
  bigOrb: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#7B6EF615', borderWidth: 1.5, borderColor: '#7B6EF650', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  bigOrbIcon: { fontSize: 36, color: '#7B6EF6' },
  miniOrb: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  startTitle: { fontSize: 28, fontWeight: '700', color: '#222540', marginBottom: 12, textAlign: 'center', letterSpacing: 0.5 },
  startSub: { fontSize: 15, color: '#6E7191', textAlign: 'center', lineHeight: 26, marginBottom: 40, fontWeight: '400' },
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
    backgroundColor: '#FFFFFF',
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
  ghostTxt: { color: '#9A9DB2', fontSize: 14, textAlign: 'center' },
  off: { opacity: 0.35 },
  nameInput: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, color: '#222540', fontSize: 16, fontWeight: '500', borderWidth: 1.5, borderColor: '#E9E6F2', marginBottom: 18, textAlign: 'center', ...shadowSm },
  msgList: { padding: 18, paddingBottom: 12, gap: 14 },
  bRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, width: '100%' },
  bLeft: { justifyContent: 'flex-start' },
  bRight: { justifyContent: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, maxWidth: '74%' },
  aBubble: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#7B6EF650', borderTopLeftRadius: 4, ...shadowSm },
  uBubble: { backgroundColor: '#EDE7FE', borderWidth: 1.5, borderColor: '#7B6EF650', borderTopRightRadius: 4, ...shadowSm },
  bTxt: { color: '#222540', fontSize: 15, lineHeight: 26, flexWrap: 'wrap', fontWeight: '400' },
  tdot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7B6EF6' },
  joinCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#7B6EF650', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', marginTop: 4 },
  joinTitle: { color: '#7B6EF6', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  joinSub: { color: '#222540', fontSize: 14, lineHeight: 22, marginBottom: 14 },
  joinBtn: { backgroundColor: '#7B6EF6', borderRadius: 12, padding: 12, alignItems: 'center' },
  joinBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#EFEDF6' },
  input: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, color: '#222540', fontSize: 15, borderWidth: 1.5, borderColor: '#E9E6F2', maxHeight: 100, ...shadowSm },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9E6F2', alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: '#7B6EF6', borderColor: '#7B6EF6' },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
  homePad: { padding: 24, paddingTop: 58 },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#222540', letterSpacing: 0.3 },
  greetDate: { fontSize: 12, color: '#6E7191', marginTop: 3, fontWeight: '500' },
  // ══ PREMIUM CARDS ══
  auraMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
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
  auraMainTitle: { color: '#222540', fontSize: 16, fontWeight: '700', marginTop: 4, letterSpacing: 0.3 },
  auraMainSub: { color: '#8A8FA8', fontSize: 12, marginTop: 2, fontWeight: '400' },
  cardTag: { color: '#7B6EF6', fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  arrow: { color: '#7B6EF6', fontSize: 20, fontWeight: '700' },
  diaryCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E9E6F2', ...shadowSm },
  diaryTitle: { color: '#222540', fontSize: 15, fontWeight: '700' },
  diarySub: { color: '#6E7191', fontSize: 12, marginTop: 2 },
  secLabel: { color: '#6E7191', fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  domainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 32 },
  domainCard: { width: '31%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E9E6F2', marginBottom: 8, ...shadowSm },
  domainLabel: { color: '#222540', fontSize: 12, fontWeight: '600', marginTop: 6 },
  domainBarBg: { width: '100%', height: 4, backgroundColor: '#E9E6F2', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  domainBarFill: { height: 4, borderRadius: 2 },
  domainCount: { fontSize: 10, marginTop: 5, fontWeight: '600' },
  avatarCol: { alignItems: 'center', gap: 6, marginRight: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#7B6EF6', ...shadowSm },
  avatarTxt: { color: '#fff', fontSize: 22, fontWeight: '700' },
  avatarName: { color: '#6E7191', fontSize: 11 },
  emptyCircle: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#E9E6F2', borderStyle: 'dashed', marginBottom: 16 },
  emptyCircleTxt: { color: '#6E7191', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  datingCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#F3F0FB', borderRadius: 20, padding: 18, marginTop: 4, borderWidth: 1, borderColor: '#7B6EF650', borderLeftWidth: 3, borderLeftColor: '#9B6EF6' },
  datingTitle: { color: '#222540', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  datingSub: { color: '#6E7191', fontSize: 12, marginTop: 3, lineHeight: 18 },
  backLink: { color: '#7B6EF6', fontSize: 15, fontWeight: '600' },
  lbCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E9E6F2', borderLeftWidth: 3, ...shadowSm },
  lbTitle: { color: '#222540', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  lbCount: { fontSize: 18, fontWeight: '700' },
  lbEmpty: { color: '#6E7191', fontSize: 13, fontStyle: 'italic' },
  lbItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  lbDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  lbItemTxt: { color: '#222540', fontSize: 14, lineHeight: 21, flex: 1 },
  lbAbout: { color: '#555', fontSize: 13.5, lineHeight: 21, marginBottom: 12 },
  // ── Health Hub ──
  healthDataPanel: { backgroundColor: '#F8F7FF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E9E6F2' },
  healthMetricChip: { flexDirection: 'column' as const, alignItems: 'center' as const, backgroundColor: '#F5F4FA', borderRadius: 12, padding: 10, gap: 2, minWidth: 64 },
  healthMetricVal: { fontSize: 15, fontWeight: '800', color: '#222540' },
  healthMetricLbl: { fontSize: 10, color: '#9A9DB2', fontWeight: '600' },
  healthStatsStrip: { flexDirection: 'row' as const, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EDEAF4', marginBottom: 16 },
  healthStatBox: { flex: 1, alignItems: 'center' as const, paddingVertical: 14, gap: 2 },
  healthStatVal: { fontSize: 17, fontWeight: '800' },
  healthStatLbl: { fontSize: 10, color: '#9A9DB2', fontWeight: '600' },
  metricBar: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E9E6F2' },
  deviceRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#E9E6F2' },
  deviceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
  deviceConnectBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  lbSectionLabel: { fontSize: 10, fontWeight: '800', color: '#9A9DB2', letterSpacing: 1.2, marginBottom: 8 },
  lbInfoToggle: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' as const, marginTop: 4 },
  lbInfoToggleTxt: { fontSize: 12, fontWeight: '700' },
  lbQuestion: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, marginBottom: 8 },
  lbQNum: { color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center' as const, lineHeight: 20, width: 20, height: 20, borderRadius: 10 },
  lbQTxt: { flex: 1, color: '#444', fontSize: 13.5, lineHeight: 21 },
  lbTipRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, marginBottom: 10 },
  lbTipTxt: { flex: 1, color: '#333', fontSize: 13.5, lineHeight: 21 },
  lbSomaInvite: { flexDirection: 'row' as const, gap: 8, alignItems: 'flex-start' as const, borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 8 },
  lbSomaInviteTxt: { flex: 1, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  suggestCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#7B6EF650', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', ...shadowMd },
  suggestTxt: { color: '#222540', fontSize: 15, lineHeight: 23, marginTop: 8, fontStyle: 'italic' },
  circleCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E9E6F2', ...shadowSm },
  personName: { color: '#222540', fontSize: 16, fontWeight: '700' },
  personRel: { color: '#6E7191', fontSize: 12, marginTop: 2 },
  personInt: { color: '#7B6EF6', fontSize: 12, marginTop: 4 },
  suggestBtn: { backgroundColor: '#7B6EF620', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#7B6EF650' },
  suggestBtnTxt: { color: '#7B6EF6', fontSize: 12, fontWeight: '700' },
  matchCard: {
    backgroundColor: '#FFFFFF',
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
  matchName: { color: '#222540', fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  matchBio: { color: '#6E7191', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  valuesRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  valueChip: { backgroundColor: '#7B6EF620', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#7B6EF650' },
  valueChipTxt: { color: '#7B6EF6', fontSize: 12, fontWeight: '600' },
  howCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E9E6F2', ...shadowMd },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  howNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  howNumTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  howTxt: { color: '#222540', fontSize: 14, flex: 1 },
  scoreCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#7B6EF650', ...shadowMd },
  scoreLabel: { color: '#6E7191', fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  scoreNum: { color: '#7B6EF6', fontSize: 56, fontWeight: '700', marginVertical: 6 },
  scoreWhy: { color: '#222540', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  reportCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#7B6EF640', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', ...shadowSm },
  reportDate: { color: '#222540', fontSize: 16, lineHeight: 25, marginTop: 8 },
  reportAct: { color: '#222540', fontSize: 15, lineHeight: 24, marginTop: 8 },
  agentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#E9E6F2', ...shadowMd },
  agentAv: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  agentAvTxt: { color: '#fff', fontSize: 18 },
  agentName: { color: '#222540', fontSize: 13, fontWeight: '700' },
  agentFor: { color: '#6E7191', fontSize: 10 },
  agentVs: { color: '#7B6EF6', fontSize: 22, fontWeight: '700' },
  agentRow: { flexDirection: 'row', marginBottom: 10, width: '100%' },
  agentBubble: { borderRadius: 16, padding: 14, maxWidth: '82%' },
  agentBubbleA: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#7B6EF640', borderTopLeftRadius: 4 },
  agentBubbleB: { backgroundColor: '#1A1612', borderWidth: 1, borderColor: '#F6A86E40', borderTopRightRadius: 4 },
  agentLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  agentText: { color: '#222540', fontSize: 14, lineHeight: 22 },
  agentTyping: { color: '#6E7191', fontSize: 16, letterSpacing: 2 },
  deckCounter: { color: '#6E7191', fontSize: 12, textAlign: 'center', marginBottom: 12, fontWeight: '600', letterSpacing: 0.5 },
  deckCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E9E6F2', marginBottom: 18, ...shadowMd },
  deckPhoto: { width: '100%', height: 180, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  deckName: { color: '#222540', fontSize: 22, fontWeight: '700' },
  deckBio: { color: '#6E7191', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 14 },
  interestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
  interestTag: { color: '#7B6EF6', fontSize: 12, fontWeight: '500' },
  swipeRow: { flexDirection: 'row', gap: 12 },
  passBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9E6F2', alignItems: 'center', justifyContent: 'center', ...shadowSm },
  passTxt: { color: '#6E7191', fontSize: 16, fontWeight: '700' },
  likeBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center', ...shadowMd },
  likeTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deckHint: { color: '#6E7191', fontSize: 12, textAlign: 'center', marginTop: 14 },
  matchedBanner: { alignItems: 'center', backgroundColor: '#F3F0FB', borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#7B6EF650', ...shadowMd },
  matchedTitle: { color: '#222540', fontSize: 26, fontWeight: '700', marginTop: 8, letterSpacing: 0.3 },
  matchedSub: { color: '#6E7191', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  alignBadge: { position: 'absolute', top: 16, right: 16, alignItems: 'center', backgroundColor: '#FBFAF8', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6, zIndex: 2 },
  alignNum: { fontSize: 18, fontWeight: '700' },
  alignLbl: { color: '#6E7191', fontSize: 9, marginTop: -2 },
  whyMatch: { backgroundColor: '#FBFAF8', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#7B6EF640', width: '100%' },
  whyMatchLbl: { color: '#7B6EF6', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  whyMatchTxt: { color: '#222540', fontSize: 13, lineHeight: 20 },
  // Cinematic dating profile
  dTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  dBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,20,24,0.7)', alignItems: 'center', justifyContent: 'center' },
  dBackTxt: { color: '#fff', fontSize: 24, marginTop: -2 },
  dToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,20,24,0.7)', borderRadius: 24, padding: 4 },
  dTogActive: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 9, alignItems: 'center' },
  dTogActiveTxt: { color: '#FBFAF8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  dTogTxt: { flex: 1, textAlign: 'center', color: '#6E7191', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  alignPill: { width: 48, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,20,24,0.85)', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  alignPillTxt: { fontSize: 13, fontWeight: '800' },
  dPhoto: { height: 540, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  dPhotoFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220, backgroundColor: '#FBFAF8', opacity: 0.55 },
  dPhotoOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: 24 },
  dPremium: { color: '#F6D66E', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  dName: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -0.5 },
  dAge: { color: '#C9CCDD', fontSize: 30, fontWeight: '300' },
  dHeart: { color: '#fff', fontSize: 28, marginBottom: 8 },
  dLoc: { color: '#C9CCDD', fontSize: 15, marginTop: 6 },
  dPills: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 18 },
  dPill: { backgroundColor: '#EFEDF6', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E9E6F2' },
  dPillTxt: { color: '#222540', fontSize: 14, fontWeight: '600' },
  dSection: { paddingHorizontal: 20, marginTop: 22 },
  dH: { color: '#222540', fontSize: 20, fontWeight: '700', marginBottom: 14, letterSpacing: 0.3 },
  dAbout: { color: '#9CA0B5', fontSize: 15, lineHeight: 24 },
  dWhy: { backgroundColor: '#F2F0FB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7B6EF650' },
  dWhyLbl: { color: '#7B6EF6', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  dWhyTxt: { color: '#222540', fontSize: 14, lineHeight: 21 },
  dTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dTag: { backgroundColor: '#EFEDF6', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E9E6F2' },
  dTagTxt: { color: '#222540', fontSize: 14, fontWeight: '600' },
  dActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32, backgroundColor: '#FBFAF8' },
  dPass: { flex: 1, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadowMd },
  dPassIcon: { fontSize: 24 },
  dMsg: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EFEDF6', borderWidth: 1, borderColor: '#E9E6F2', alignItems: 'center', justifyContent: 'center', ...shadowSm },
  dMsgIcon: { fontSize: 22 },
  dLike: { flex: 1.4, height: 60, borderRadius: 30, backgroundColor: '#F6379B', alignItems: 'center', justifyContent: 'center', ...shadowMd },
  dLikeIcon: { fontSize: 26, color: '#fff' },
  alignPillFloat: { position: 'absolute', top: 70, right: 16, zIndex: 5 },
  dMe: { width: 48, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,20,24,0.7)', alignItems: 'center', justifyContent: 'center' },
  dMeTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  styleCard: { flex: 1, backgroundColor: '#F2F0FB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7B6EF640' },
  styleLbl: { color: '#7B6EF6', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  styleVal: { color: '#222540', fontSize: 15, fontWeight: '700' },
  // Profile builder
  pbBody: { flex: 1, paddingHorizontal: 22, paddingTop: 24 },
  pbDots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 28 },
  pbDot: { width: 24, height: 5, borderRadius: 3, backgroundColor: '#E9E6F2' },
  pbDotOn: { backgroundColor: '#7B6EF6' },
  pbQCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#7B6EF650', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', ...shadowMd },
  pbQLabel: { color: '#7B6EF6', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  pbQ: { color: '#222540', fontSize: 19, fontWeight: '600', lineHeight: 28 },
  pbHint: { color: '#6E7191', fontSize: 13, textAlign: 'center', marginTop: 24, lineHeight: 20 },
  // My profile extras
  myAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' },
  autoTag: { color: '#6EF6A8', fontSize: 11, fontWeight: '700' },
  autoCard: { backgroundColor: '#EFF6EF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#6EF6A840' },
  autoCardTxt: { color: '#222540', fontSize: 14, lineHeight: 22 },
  autoCardDate: { color: '#6E7191', fontSize: 11, marginTop: 8 },
  uploadBtn: { position: 'absolute', top: '42%', backgroundColor: 'rgba(123,110,246,0.9)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, zIndex: 5 },
  uploadBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  changePhoto: { position: 'absolute', top: 70, right: 16, backgroundColor: 'rgba(20,20,24,0.8)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, zIndex: 5 },
  changePhotoTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  intimacyCard: { backgroundColor: '#FBF1F4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F6379B40' },
  intimacyLbl: { color: '#F6379B', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  intimacyTxt: { color: '#222540', fontSize: 14, lineHeight: 21 },
  intimacyNote: { color: '#6E7191', fontSize: 11, lineHeight: 17, marginTop: 10, fontStyle: 'italic' },
  psychRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  psychPill: { color: '#A89BFA', fontSize: 12, fontWeight: '700', backgroundColor: '#7B6EF618', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden' },
  psychNote: { color: '#9CA0B5', fontSize: 13, lineHeight: 20, marginTop: 10 },
  intimacyReport: { backgroundColor: '#FBF1F4', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F6379B50' },
  intimacyRLbl: { color: '#F6379B', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  intimacyRTxt: { color: '#222540', fontSize: 15, lineHeight: 23 },
  intimacyRNote: { color: '#6E7191', fontSize: 11, lineHeight: 17, marginTop: 10, fontStyle: 'italic' },
  likesBar: { position: 'absolute', bottom: 108, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  likesTxt: { color: '#6E7191', fontSize: 12, fontWeight: '600' },
  likesUpgrade: { color: '#F6D66E', fontSize: 12, fontWeight: '700' },
  secondaryBtn: { width: '100%', height: 52, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#7B6EF640', alignItems: 'center', justifyContent: 'center', marginBottom: 4, ...shadowSm },
  secondaryBtnTxt: { color: '#7B6EF6', fontSize: 15, fontWeight: '700' },
  matchPhoto: { width: 100, height: 100, borderRadius: 50, marginBottom: 14 },
  paywall: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,8,11,0.92)', alignItems: 'center', justifyContent: 'center', padding: 28, zIndex: 50 },
  paywallCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#F6D66E50', ...shadowLg },
  paywallTitle: { color: '#222540', fontSize: 24, fontWeight: '800', marginTop: 10, textAlign: 'center', letterSpacing: 0.5 },
  paywallSub: { color: '#6E7191', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 10, marginBottom: 18 },
  paywallPrice: { backgroundColor: '#F6D66E18', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 18 },
  paywallPriceTxt: { color: '#F6D66E', fontSize: 15, fontWeight: '800' },
  paywallBtn: { width: '100%', height: 54, borderRadius: 16, backgroundColor: '#F6D66E', alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...shadowMd },
  paywallBtnTxt: { color: '#FBFAF8', fontSize: 16, fontWeight: '800' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EFEDF6' },
  chatAvatar: { width: 42, height: 42, borderRadius: 21 },
  chatName: { color: '#222540', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  chatStatus: { color: '#6EF6A8', fontSize: 12, marginTop: 1 },
  chatAura: { color: '#7B6EF6', fontSize: 22 },
  matchStrip: { backgroundColor: '#F3F0FB', paddingVertical: 10, paddingHorizontal: 16 },
  matchStripTxt: { color: '#A89BFA', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  // Connections
  connRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E9E6F2', ...shadowSm },
  connAvatar: { width: 56, height: 56, borderRadius: 28 },
  connName: { color: '#222540', fontSize: 16, fontWeight: '700' },
  connScore: { color: '#7B6EF6', fontSize: 13, fontWeight: '700' },
  connLast: { color: '#6E7191', fontSize: 13, marginTop: 4 },
  // Who liked you
  likedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  likedCard: { width: '47%', height: 200, borderRadius: 18, overflow: 'hidden', marginBottom: 12, backgroundColor: '#FFFFFF', position: 'relative', ...shadowMd },
  likedPhoto: { width: '100%', height: '100%' },
  blurred: { opacity: 0.7 },
  likedInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: 'rgba(12,12,15,0.6)' },
  likedName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  likedLock: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  likedUpsell: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22, marginTop: 10, borderWidth: 1, borderColor: '#F6D66E50', alignItems: 'center' },
  likedUpsellTitle: { color: '#F6D66E', fontSize: 18, fontWeight: '800' },
  likedUpsellSub: { color: '#6E7191', fontSize: 14, textAlign: 'center', lineHeight: 21, marginVertical: 12 },
  // Diary history
  diaryEntry: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E9E6F2', borderLeftWidth: 3, borderLeftColor: '#7B6EF6', ...shadowSm },
  diaryEntryDate: { color: '#7B6EF6', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  diaryEntryTxt: { color: '#222540', fontSize: 15, lineHeight: 23 },
  // Insights
  insightHero: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#7B6EF640', marginBottom: 8, ...shadowMd },
  insightSummary: { color: '#222540', fontSize: 17, lineHeight: 27, marginTop: 10 },
  insightNote: { color: '#222540', fontSize: 15, lineHeight: 24, fontStyle: 'italic', marginTop: 8 },
  insightQ: { color: '#A89BFA', fontSize: 17, lineHeight: 26, marginTop: 10, fontWeight: '600' },
  // Settings (legacy rows — kept for shared components)
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E9E6F2', ...shadowSm },
  setIcon: { fontSize: 18 },
  setLabel: { color: '#222540', fontSize: 15, fontWeight: '600', flex: 1 },
  setArrow: { color: '#7B6EF6', fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E9E6F2', paddingVertical: 16, marginBottom: 24, ...shadowSm },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#7B6EF6' },
  statLbl: { fontSize: 11, color: '#6E7191', marginTop: 3, fontWeight: '600' },
  setGroup: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E9E6F2', overflow: 'hidden', marginBottom: 10, ...shadowSm },
  setRow2: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1EFF7' },
  setIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F1FB', alignItems: 'center', justifyContent: 'center' },
  setTitle: { fontSize: 15, fontWeight: '700', color: '#222540' },
  setSub: { fontSize: 12.5, color: '#8A8FA8', marginTop: 1 },
  setChevron: { fontSize: 22, color: '#C9CCDD', fontWeight: '400' },
  privacyCard: { backgroundColor: '#EFF6EF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#6EF6A830' },
  privacyTxt: { color: '#9CA0B5', fontSize: 13, lineHeight: 21 },
  aboutTxt: { color: '#9A9DB2', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 30 },
  // ── Settings (Twinby-style) ──
  stgHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 8, paddingTop: 20, paddingBottom: 8, backgroundColor: '#F5F4FA' },
  stgBackBtn: { width: 40, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  stgBackTxt: { fontSize: 34, lineHeight: 38, color: '#222540', fontWeight: '300' },
  stgHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#222540', textAlign: 'center' as const },
  stgSec: { fontSize: 22, fontWeight: '800', color: '#222540', marginTop: 24, marginBottom: 10, paddingHorizontal: 20 },
  stgGroup: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EDEAF4' },
  stgRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDEAF4', backgroundColor: '#FFFFFF' },
  stgIconCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#DDDAF0', alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: '#FAFAFA' },
  stgIconTxt: { fontSize: 15 },
  stgLabel: { fontSize: 16, fontWeight: '600', color: '#222540' },
  stgValue: { fontSize: 13, color: '#9A9DB2', marginTop: 1 },
  stgChevron: { fontSize: 22, color: '#C9CCDD' },
  stgLinks: { paddingHorizontal: 20, paddingTop: 28, gap: 20, alignItems: 'flex-start' as const },
  stgLinkDanger: { fontSize: 15, color: '#E8636F', fontWeight: '500' },
  // shared settings inputs / cards
  settingsLangChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#E9E6F2', backgroundColor: '#FAFAFA' },
  settingsLangChipActive: { backgroundColor: '#7B6EF6', borderColor: '#7B6EF6' },
  settingsLangChipTxt: { fontSize: 13, fontWeight: '700', color: '#222540' },
  settingsCompanionOrb: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0EEFF', alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 1.5, borderColor: '#7B6EF630' },
  settingsInputLabel: { color: '#6E7191', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6, marginTop: 10 },
  settingsInput: { backgroundColor: '#F5F4FB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#222540', fontSize: 15, borderWidth: 1.5, borderColor: '#E9E6F2', marginBottom: 4 },
  settingsSaveBtn: { backgroundColor: '#7B6EF6', borderRadius: 12, paddingVertical: 13, alignItems: 'center' as const },
  settingsSaveTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  settingsHelpTxt: { color: '#8A8FA8', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  settingsCrisisLine: { color: '#9CA0B5', fontSize: 11, lineHeight: 17, marginTop: 14, textAlign: 'center' as const },
  settingsDangerCard: { margin: 20, backgroundColor: '#FFF5F5', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#F66E6E40' },
  settingsDangerTitle: { color: '#E8636F', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  settingsDangerSub: { color: '#9A7070', fontSize: 13, lineHeight: 20 },
  settingsFooter: { alignItems: 'center' as const, gap: 8, marginTop: 40, marginBottom: 20, opacity: 0.5 },
  settingsFooterTxt: { color: '#9A9DB2', fontSize: 11, textAlign: 'center' as const, lineHeight: 17 },
  // Notification settings
  notifRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0EDF8' },
  notifRowTitle: { fontSize: 15, fontWeight: '600' as const, color: '#222540', marginBottom: 2 },
  notifRowSub: { fontSize: 12, color: '#9CA0B5', lineHeight: 17 },
  notifTimeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#EDE9F8', borderWidth: 1, borderColor: '#D4CFF0' },
  notifTimeChipActive: { backgroundColor: '#7B6EF6', borderColor: '#7B6EF6' },
  notifTimeChipTxt: { fontSize: 13, fontWeight: '600' as const, color: '#7B6EF6' },
  notifMsgPreview: { flexDirection: 'row' as const, gap: 10, alignItems: 'flex-start' as const, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0EDF8' },
  notifMsgDay: { fontSize: 11, fontWeight: '700' as const, color: '#A89BFA', width: 70, paddingTop: 1 },
  notifMsgText: { fontSize: 13, color: '#333', flex: 1, lineHeight: 19 },
  // ── Love & Gratitude home cards ──
  loveCard: { flex: 1, backgroundColor: '#FFF0F8', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F9B8D840', ...shadowSm },
  gratCard: { flex: 1, backgroundColor: '#F0F8FF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7B6EF630', ...shadowSm },
  loveCardEmoji: { fontSize: 26, marginBottom: 6 },
  loveCardTitle: { fontSize: 15, fontWeight: '800', color: '#222540', marginBottom: 2 },
  loveCardSub: { fontSize: 12, color: '#9A9DB2' },
  // ── Streak banner ──
  streakBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, backgroundColor: '#FFF8EC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F6C96E40', marginBottom: 16 },
  streakEmoji: { fontSize: 20 },
  streakTxt: { color: '#C28A1A', fontSize: 13, fontWeight: '700', flex: 1 },
  // ── Thankful Diary ──
  gratCard2: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E9E6F2', marginBottom: 8, ...shadowSm },
  gratDate: { color: '#9A9DB2', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  gratHeading: { color: '#222540', fontSize: 20, fontWeight: '800', marginBottom: 18 },
  gratLabel: { color: '#6E7191', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  gratInput: { backgroundColor: '#F5F4FB', borderRadius: 12, padding: 14, color: '#222540', fontSize: 15, borderWidth: 1.5, borderColor: '#E9E6F2', minHeight: 56 },
  gratSaveBtn: { backgroundColor: '#7B6EF6', borderRadius: 14, paddingVertical: 14, alignItems: 'center' as const, marginTop: 8 },
  gratSaveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  gratSavedItem: { flexDirection: 'row' as const, gap: 10, alignItems: 'flex-start' as const, marginBottom: 10 },
  gratNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#7B6EF6', color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center' as const, lineHeight: 22 },
  gratItemTxt: { flex: 1, color: '#222540', fontSize: 15, lineHeight: 22 },
  gratSomaNote: { backgroundColor: '#F5F4FB', borderRadius: 14, padding: 14, marginTop: 14, borderLeftWidth: 3, borderLeftColor: '#7B6EF6' },
  gratSomaName: { color: '#7B6EF6', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  gratSomaTxt: { color: '#444', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  gratEditBtn: { alignItems: 'center' as const, paddingTop: 14 },
  gratEditTxt: { color: '#9A9DB2', fontSize: 13 },
  gratPastCard: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E9E6F2', marginBottom: 10 },
  gratPastDate: { color: '#7B6EF6', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  gratPastItem: { color: '#555', fontSize: 14, lineHeight: 22 },
  // ── Love Yourself ──
  affirmCard: { backgroundColor: '#FFF0F8', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#F9B8D850', alignItems: 'center' as const, marginBottom: 4 },
  affirmLabel: { color: '#C2668A', fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 12 },
  affirmTxt: { color: '#222540', fontSize: 20, fontWeight: '700', lineHeight: 30, textAlign: 'center' as const, fontStyle: 'italic', marginBottom: 12 },
  affirmHint: { color: '#C2668A', fontSize: 12, opacity: 0.8 },
  loveChecklist: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E9E6F2', overflow: 'hidden' as const, ...shadowSm },
  loveCheck: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F1EFF7' },
  loveCheckDone: { backgroundColor: '#FAF9FF' },
  loveCheckEmoji: { fontSize: 20, width: 28 },
  loveCheckTxt: { flex: 1, color: '#222540', fontSize: 15, fontWeight: '500' },
  loveCheckBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D0CCE8', alignItems: 'center' as const, justifyContent: 'center' as const },
  loveCheckBoxDone: { backgroundColor: '#7B6EF6', borderColor: '#7B6EF6' },
  loveScore: { color: '#7B6EF6', fontSize: 13, fontWeight: '700', textAlign: 'center' as const, marginTop: 14 },
  loveNoteInput: { backgroundColor: '#F5F4FB', borderRadius: 14, padding: 16, color: '#222540', fontSize: 15, borderWidth: 1.5, borderColor: '#E9E6F2', minHeight: 100, textAlignVertical: 'top' as const },
  loveSaveBtn: { backgroundColor: '#C2668A', borderRadius: 14, paddingVertical: 14, alignItems: 'center' as const, marginTop: 14 },
  loveSaveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loveDoneRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingVertical: 14 },
  loveDoneTxt: { color: '#C2668A', fontSize: 14, fontWeight: '700' },
  lovePastCard: { backgroundColor: '#FAFAFA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F9B8D840', marginBottom: 10 },
  lovePastAffirm: { color: '#555', fontSize: 13, lineHeight: 20, fontStyle: 'italic', marginVertical: 4 },
  lovePastChecks: { color: '#9A9DB2', fontSize: 12, marginTop: 4 },
  dealbreak: { color: '#F6A86E', fontSize: 13, lineHeight: 20, marginTop: 12, fontWeight: '600' },
  dealgood: { color: '#6EF6A8', fontSize: 13, lineHeight: 20, marginTop: 12, fontWeight: '600' },
  contactSetup: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7B6EF640' },
  contactSetupTxt: { color: '#9CA0B5', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  contactInput: { backgroundColor: '#EFEDF6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#222540', fontSize: 15, borderWidth: 1, borderColor: '#E9E6F2', marginBottom: 10 },
  contactSave: { backgroundColor: '#7B6EF6', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  contactSaveTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  crisisLine: { color: '#6E7191', fontSize: 11, lineHeight: 17, marginTop: 12, textAlign: 'center' },
  typePill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9E6F2' },
  typePillActive: { backgroundColor: '#7B6EF6', borderColor: '#7B6EF6' },
  typePillTxt: { color: '#222540', fontSize: 14, fontWeight: '700' },
  circleMember: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E9E6F2' },
  invitePending: { color: '#F6A86E', fontSize: 11, fontWeight: '600' },
  inviteCode: { color: '#7B6EF6', fontSize: 11, fontWeight: '700' },
  msgCount: { color: '#6EF6A8', fontSize: 11, fontWeight: '600' },
  registerScroll: { paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center', minHeight: '100vh' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E9E6F2', ...shadowSm },
  socialIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  socialLabel: { color: '#222540', fontSize: 15, fontWeight: '600', flex: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E9E6F2' },
  dividerTxt: { color: '#9A9DB2', fontSize: 12, fontWeight: '600' },
  inputLabel: { color: '#222540', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  authInput: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: '#222540', fontSize: 15, borderWidth: 1.5, borderColor: '#E9E6F2', ...shadowSm },
  disclaimerTxt: { color: '#9A9DB2', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 24 },
  // ── Healing Path home cards ──
  medCard: { flex: 1, backgroundColor: '#F3F0FF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7B6EF630', ...shadowSm },
  therapyCard: { flex: 1, backgroundColor: '#F0FAF5', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#6EE6C030', ...shadowSm },
  // ── Shared screen primitives (medication / therapy) ──
  tabRow: { flexDirection: 'row' as const, marginHorizontal: 20, marginBottom: 18, backgroundColor: '#F5F4FA', borderRadius: 14, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' as const },
  tabBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabBtnTxt: { fontSize: 13, fontWeight: '600', color: '#9A9DB2' },
  tabBtnTxtActive: { color: '#222540', fontWeight: '700' },
  fieldLabel: { color: '#6E7191', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F5F4FB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: '#222540', fontSize: 15, borderWidth: 1.5, borderColor: '#E9E6F2', marginBottom: 4 },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' as const, marginTop: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  histRow: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E9E6F2', ...shadowSm },
  somaReflCard: { backgroundColor: '#F5F4FB', borderRadius: 16, padding: 16, borderLeftWidth: 3, borderLeftColor: '#7B6EF6' },
  somaReflLabel: { color: '#7B6EF6', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  somaReflTxt: { color: '#444', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  // ── Medication Tracker ──
  medProgressCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E9E6F2', ...shadowSm },
  medCard2: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E9E6F2', borderLeftWidth: 4, ...shadowSm },
  medDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  doseChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F5F4FA', borderWidth: 1.5, borderColor: '#E9E6F2' },
  timeChip: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F5F4FA', borderWidth: 1.5, borderColor: '#E9E6F2' },
  timeChipActive: { backgroundColor: '#7B6EF6', borderColor: '#7B6EF6' },
  // ── Therapy & Support ──
  crisisBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: '#FFF5F5', borderRadius: 14, padding: 14, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F66E6E30' },
  crisisBtn: { backgroundColor: '#E8636F', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  crisisRow: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F66E6E20', borderLeftWidth: 3, borderLeftColor: '#E8636F' },
  therapyPlatformRow: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E9E6F2', ...shadowSm },
  recoveryChip: { width: 80, alignItems: 'center' as const, padding: 10, borderRadius: 14, backgroundColor: '#F5F4FA', borderWidth: 1.5, borderColor: '#E9E6F2', gap: 4 },
  recoveryChipDone: { backgroundColor: '#6EE6C0', borderColor: '#6EE6C0' },
})
