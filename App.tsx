import { useState, useRef, useEffect, useMemo, Component, createContext, useContext, type ReactNode } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView,
  Platform, Animated, Easing, Image, ImageBackground, Switch, Modal, ActivityIndicator,
  useWindowDimensions
} from 'react-native'
import Svg, { Circle as SvgCircle, Line as SvgLine, Polygon as SvgPolygon, Path as SvgPath, Polyline as SvgPolyline, Defs, RadialGradient, Stop as SvgStop, Ellipse as SvgEllipse, LinearGradient as SvgLinearGradient } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import * as Font from 'expo-font'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import * as Notifications from 'expo-notifications'
import * as Location from 'expo-location'
import * as Haptics from 'expo-haptics'
import { SchedulableTriggerInputTypes } from 'expo-notifications'

// Safe haptic helpers — no-op on web where haptics aren't supported
const haptic = {
  light: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
  medium: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}) },
  heavy: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}) },
  success: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  error: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}) },
}

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
const GOOGLE_REDIRECT_URI = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI ?? 'https://dist-mysomaapp.vercel.app'
const STORAGE_KEY = 'soma_v3'
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3000'

// ── THEME ──────────────────────────────────────────────────
const LIGHT_THEME = {
  bg:          '#FBFAF8',
  card:        '#FFFFFF',
  card2:       '#F4F2FF',
  input:       '#F8F7FF',
  text:        '#222540',
  textSub:     '#6E7191',
  textTertiary:'#9A9DB2',
  accent:      '#7B6EF6',
  accentLight: '#EDE9F6',
  border:      '#F0F0F5',
  border2:     '#E8E5F5',
  headerBg:    '#FBFAF8',
  divider:     '#F0EEF8',
  tag:         '#EDE9F6',
  tagText:     '#7B6EF6',
  green:       '#4CAF7D',
  orange:      '#F5A623',
  red:         '#E57373',
  shadow:      '#7B6EF6',
}
const DARK_THEME: typeof LIGHT_THEME = {
  bg:          '#0E1016',
  card:        '#181B2A',
  card2:       '#1F1B38',
  input:       '#1F1B38',
  text:        '#E8E9F2',
  textSub:     '#9A9DB8',
  textTertiary:'#6B6E88',
  accent:      '#9B8FFF',
  accentLight: '#1F1B38',
  border:      '#252840',
  border2:     '#2D2F4A',
  headerBg:    '#0E1016',
  divider:     '#1E2035',
  tag:         '#1F1B38',
  tagText:     '#9B8FFF',
  green:       '#4CAF7D',
  orange:      '#F5A623',
  red:         '#E57373',
  shadow:      '#000000',
}
type TTheme = typeof LIGHT_THEME
const ThemeCtx = createContext<{ t: TTheme; dark: boolean }>({ t: LIGHT_THEME, dark: false })
const useT = () => useContext(ThemeCtx)
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
const DOMAIN_ICONS: Record<DomainKey, keyof typeof Ionicons.glyphMap> = {
  health:       'fitness-outline',
  career:       'briefcase-outline',
  finance:      'wallet-outline',
  relationship: 'heart-outline',
  family:       'people-outline',
  growth:       'trending-up-outline',
  hobby:        'color-palette-outline',
  purpose:      'compass-outline',
  mind:         'leaf-outline',
  environment:  'home-outline',
}
type Sentiment = 'positive' | 'neutral' | 'negative'

// ── i18n ───────────────────────────────────────────────────
const LANGS = [
  { code: 'en', name: 'English',    label: 'English',    flag: '🇬🇧' },
  { code: 'es', name: 'Spanish',    label: 'Español',    flag: '🇪🇸' },
  { code: 'fr', name: 'French',     label: 'Français',   flag: '🇫🇷' },
  { code: 'de', name: 'German',     label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'it', name: 'Italian',    label: 'Italiano',   flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', label: 'Português',  flag: '🇵🇹' },
  { code: 'ru', name: 'Russian',    label: 'Русский',    flag: '🇷🇺' },
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
    // Nav
    tab_circle: 'Circle', tab_inner: 'Inner', tab_explore: 'Explore',
    // Common
    continue: 'Continue', back: '← Back', save: 'Save', cancel: 'Cancel',
    done: 'Done', skip: 'Skip', settings: 'Settings', language: 'Language',
    seeDetails: 'Details →', send: 'Send', or: 'or',
    // Language picker
    selectLang: 'Select Language',
    chooseLang: 'Choose your preferred language to continue',
    // Onboarding
    welcomeTitle: 'The best version of you\nstarts with knowing yourself.',
    welcomeSub: 'Your personal AI companion for growth, reflection, and building the life you actually want.',
    whatName: "What's your name?", namePlaceholder: 'Your name…',
    alreadyAccount: 'Already have an account?', signIn: 'Sign in', signUp: 'Sign up',
    feature1: 'An AI who truly listens and remembers you',
    feature2: 'Daily reflections that build real self-knowledge',
    feature3: 'Habits, health, and growth — all in one place',
    feature4: 'Deeper connections, starting with yourself',
    whyHere: 'What brings you here?',
    pickTrue: 'Pick what feels true — Soma shapes around this.',
    skipNow: 'Skip for now', startSoma: 'Start with Soma →', getStarted: 'Get started →',
    // Goals
    goal_heal: 'Heal & feel better', goal_heal_sub: 'Recover, rebuild, breathe again',
    goal_know: 'Understand myself', goal_know_sub: 'Patterns, emotions, what drives me',
    goal_habits: 'Build better habits', goal_habits_sub: 'Small daily wins that stick',
    goal_balance: 'Balance my life', goal_balance_sub: 'Work, rest, people, purpose',
    goal_love: 'Find meaningful connection', goal_love_sub: 'Friendship, love, belonging',
    goal_health: 'Take care of my health', goal_health_sub: 'Body, sleep, energy, meds',
    // Focus areas step
    focusAreas: 'Which areas matter most?', focusAreasSub: 'Pick up to 3 — your wheel of life.',
    // Auth
    createAccount: 'Create Account', emailAddress: 'Email address',
    password: 'Password', confirmPassword: 'Confirm password',
    dontHaveAccount: "Don't have an account?", forgotPassword: 'Forgot password?',
    continueWith: 'or continue with',
    // Home
    hello: 'Hello', feeling: 'How are you feeling today?',
    talkToSoma: 'Talk with Soma', checkIn: 'Check in',
    yourInsights: 'Your Insights', wheelTitle: 'Wheel of Life',
    overallBalance: 'OVERALL LIFE BALANCE', circleOfLife: 'Circle of Life',
    reflecting: "🧠 Soma is reflecting on everything you've shared…",
    wheelSub: "Assessed by Soma, weighing everything you've shared — like a thoughtful psychologist.",
    // Settings
    darkMode: 'Dark Mode', notifications: 'Notifications', account: 'Account',
    privacyPolicy: 'Privacy Policy', resetData: 'Reset all data', signOut: 'Sign out',
    // Meet & Chat
    meetPeople: 'Meet People', typeMessage: 'Type a message…',
    ob_hi: "Hi, I'm Soma", ob_tagline: 'Meet yourself before meeting others', ob_explore: 'Start exploring →', ob_intro: "I'll ask you 3 short questions — just talk to me. Your answers build your profile automatically.",
    ob_physical_label: 'Your physical self', ob_social_label: 'Your social world', ob_inner_label: 'Your inner self',
    ob_start: 'Start talking to Soma →',
    ob_q1: "Hi! I'm Soma. I'll ask you three short questions to build your profile. First — tell me about your physical self. How old are you, how do you feel in your body? You can mention your height, weight, health, energy level — whatever feels right.",
    ob_q2: "Thanks for sharing. Now tell me about your social world — what do you do for work, what are your relationships like? Family, friends, romantic life, the roles you play in people's lives.",
    ob_q3: "Last one — tell me about who you are on the inside. Your personality, what you love doing, your habits, what brings you joy, and what challenges you most.",
    ob_tap_mic: 'Tap the mic and speak', ob_listening: 'Listening…', ob_type_instead: 'Or type your answer here…',
    ob_physical_self: 'Physical self', ob_social_self: 'Social self', ob_inner_self: 'Psychological self',
    ob_next: 'Next →', ob_finish: 'Finish →', ob_skip: 'Skip', ob_skip_finish: 'Skip & finish',
    ob_building: 'Building your profile…', ob_building_sub: 'Soma is reading everything you shared.',
    ob_allset: "You're all set ✨", ob_ready: "Soma has everything she needs. Let's have your first real conversation.", ob_meet: 'Meet Soma →',
    ob_start_explore: 'Start Exploring →', ob_browse_sub: 'Browse, meet people, and try everything — no sign-up required.',
    circle_remove: '✕ Remove', circle_who: 'Who are they to you?',
    circle_friend: 'Friend', circle_family: 'Family member', circle_therapy: 'Doctor / Therapist', circle_romantic: 'Romantic partner', circle_work: 'Work colleague',
    circle_friend_s: 'Friend', circle_family_s: 'Family', circle_therapy_s: 'Doctor/Therapist', circle_romantic_s: 'Romantic', circle_work_s: 'Work',
    type_friends: 'Friends', type_family: 'Family', type_therapy: 'Therapy & Support', type_romantic: 'Romantic', type_work: 'Work',
    nudge_title: '✦ Message idea', nudge_thinking: 'Soma is thinking…', nudge_send_on: 'Send on SOMA',
    nudge_copy: 'Copy message', nudge_copied: '✓ Copied!', nudge_retry: '↺ Try another', nudge_dismiss: 'Dismiss',
  },
  ru: {
    tab_circle: 'Круг', tab_inner: 'Внутри', tab_explore: 'Мир',
    continue: 'Продолжить', back: '← Назад', save: 'Сохранить', cancel: 'Отмена',
    done: 'Готово', skip: 'Пропустить', settings: 'Настройки', language: 'Язык',
    seeDetails: 'Подробнее →', send: 'Отправить', or: 'или',
    selectLang: 'Выберите язык', chooseLang: 'Выберите предпочтительный язык для продолжения',
    welcomeTitle: 'Лучшая версия тебя\nначинается с познания себя.',
    welcomeSub: 'Твой личный ИИ-компаньон для роста, рефлексии и построения жизни, которую ты хочешь.',
    whatName: 'Как тебя зовут?', namePlaceholder: 'Твоё имя…',
    alreadyAccount: 'Уже есть аккаунт?', signIn: 'Войти', signUp: 'Зарегистрироваться',
    feature1: 'ИИ, который по-настоящему слушает и помнит тебя',
    feature2: 'Ежедневные размышления для истинного самопознания',
    feature3: 'Привычки, здоровье и рост — всё в одном месте',
    feature4: 'Более глубокие связи, начиная с себя',
    whyHere: 'Что привело тебя сюда?',
    pickTrue: 'Выбери то, что кажется правдой — Сома адаптируется к этому.',
    skipNow: 'Пропустить пока', startSoma: 'Начать с Сомой →', getStarted: 'Начать →',
    goal_heal: 'Вылечиться и почувствовать себя лучше', goal_heal_sub: 'Восстановиться, перестроиться, снова дышать',
    goal_know: 'Понять себя', goal_know_sub: 'Паттерны, эмоции, что движет мной',
    goal_habits: 'Формировать лучшие привычки', goal_habits_sub: 'Небольшие ежедневные победы, которые остаются',
    goal_balance: 'Сбалансировать мою жизнь', goal_balance_sub: 'Работа, отдых, люди, цель',
    goal_love: 'Найти значимые связи', goal_love_sub: 'Дружба, любовь, принадлежность',
    goal_health: 'Заботиться о своём здоровье', goal_health_sub: 'Тело, сон, энергия, лекарства',
    focusAreas: 'Какие области важнее всего?', focusAreasSub: 'Выбери до 3 — твоё колесо жизни.',
    createAccount: 'Создать аккаунт', emailAddress: 'Адрес электронной почты',
    password: 'Пароль', confirmPassword: 'Подтвердите пароль',
    dontHaveAccount: 'Нет аккаунта?', forgotPassword: 'Забыли пароль?', continueWith: 'или продолжить через',
    hello: 'Привет', feeling: 'Как ты себя чувствуешь сегодня?',
    talkToSoma: 'Поговорите с Сомой', checkIn: 'Отметиться',
    yourInsights: 'Ваши наблюдения', wheelTitle: 'Колесо жизни',
    overallBalance: 'ОБЩИЙ БАЛАНС ЖИЗНИ', circleOfLife: 'Круг жизни',
    reflecting: '🧠 Сома обдумывает всё, чем вы поделились…',
    wheelSub: 'Оценка Сомы — она взвешивает всё, чем вы поделились, как внимательный психолог.',
    darkMode: 'Тёмный режим', notifications: 'Уведомления', account: 'Аккаунт',
    privacyPolicy: 'Политика конфиденциальности', resetData: 'Сбросить все данные', signOut: 'Выйти',
    meetPeople: 'Знакомства', typeMessage: 'Введите сообщение…',
    ob_hi: 'Привет, я Сома', ob_tagline: 'Познай себя, прежде чем познакомиться с другими', ob_explore: 'Начать исследование →', ob_intro: 'Я задам тебе 3 коротких вопроса — просто поговори со мной. Твои ответы автоматически создадут твой профиль.',
    ob_physical_label: 'Твоё физическое я', ob_social_label: 'Твой социальный мир', ob_inner_label: 'Твоё внутреннее я',
    ob_start: 'Начать разговор с Сомой →',
    ob_q1: 'Привет! Я Сома. Я задам тебе три коротких вопроса, чтобы создать твой профиль. Сначала — расскажи о своём физическом я. Сколько тебе лет, как ты чувствуешь себя в своём теле? Можешь упомянуть рост, вес, здоровье, уровень энергии — всё, что кажется важным.',
    ob_q2: 'Спасибо, что поделился. Теперь расскажи о своём социальном мире — чем занимаешься, какие у тебя отношения? Семья, друзья, романтика, роли, которые ты играешь в жизни людей.',
    ob_q3: 'Последний вопрос — расскажи, кто ты внутри. Твоя личность, что ты любишь делать, твои привычки, что приносит радость и что больше всего испытывает тебя.',
    ob_tap_mic: 'Нажми на микрофон и говори', ob_listening: 'Слушаю…', ob_type_instead: 'Или напиши свой ответ здесь…',
    ob_physical_self: 'Физическое я', ob_social_self: 'Социальное я', ob_inner_self: 'Психологическое я',
    ob_next: 'Далее →', ob_finish: 'Завершить →', ob_skip: 'Пропустить', ob_skip_finish: 'Пропустить и завершить',
    ob_building: 'Создаю твой профиль…', ob_building_sub: 'Сома читает всё, чем ты поделился.',
    ob_allset: 'Всё готово ✨', ob_ready: 'У Сомы есть всё необходимое. Проведём наш первый настоящий разговор.', ob_meet: 'Познакомиться с Сомой →',
    ob_start_explore: 'Начать исследование →', ob_browse_sub: 'Смотрите профили, знакомьтесь и пробуйте всё — без регистрации.',
    circle_remove: '✕ Удалить', circle_who: 'Кем они тебе приходятся?',
    circle_friend: 'Друг', circle_family: 'Член семьи', circle_therapy: 'Врач / Терапевт', circle_romantic: 'Романтический партнёр', circle_work: 'Коллега по работе',
    circle_friend_s: 'Друг', circle_family_s: 'Семья', circle_therapy_s: 'Врач/Терапевт', circle_romantic_s: 'Романтический', circle_work_s: 'Работа',
    type_friends: 'Друзья', type_family: 'Семья', type_therapy: 'Терапия и поддержка', type_romantic: 'Романтические', type_work: 'Работа',
    nudge_title: '✦ Идея сообщения', nudge_thinking: 'Сома думает…', nudge_send_on: 'Отправить в SOMA',
    nudge_copy: 'Скопировать', nudge_copied: '✓ Скопировано!', nudge_retry: '↺ Попробовать другое', nudge_dismiss: 'Закрыть',
  },
  es: {
    tab_circle: 'Círculo', tab_inner: 'Interior', tab_explore: 'Explorar',
    continue: 'Continuar', back: '← Atrás', save: 'Guardar', cancel: 'Cancelar',
    done: 'Listo', skip: 'Omitir', settings: 'Ajustes', language: 'Idioma',
    seeDetails: 'Detalles →', send: 'Enviar', or: 'o',
    selectLang: 'Seleccionar idioma', chooseLang: 'Elige tu idioma preferido para continuar',
    welcomeTitle: 'La mejor versión de ti\nempieza por conocerte a ti mismo.',
    welcomeSub: 'Tu compañero de IA personal para el crecimiento, la reflexión y construir la vida que quieres.',
    whatName: '¿Cómo te llamas?', namePlaceholder: 'Tu nombre…',
    alreadyAccount: '¿Ya tienes cuenta?', signIn: 'Iniciar sesión', signUp: 'Registrarse',
    feature1: 'Una IA que realmente te escucha y recuerda',
    feature2: 'Reflexiones diarias que construyen autoconocimiento real',
    feature3: 'Hábitos, salud y crecimiento — todo en un lugar',
    feature4: 'Conexiones más profundas, comenzando contigo mismo',
    whyHere: '¿Qué te trae aquí?',
    pickTrue: 'Elige lo que sientes verdadero — Soma se adapta a esto.',
    skipNow: 'Omitir por ahora', startSoma: 'Empezar con Soma →', getStarted: 'Empezar →',
    goal_heal: 'Sanar y sentirme mejor', goal_heal_sub: 'Recuperarse, reconstruir, respirar de nuevo',
    goal_know: 'Entenderme a mí mismo', goal_know_sub: 'Patrones, emociones, lo que me impulsa',
    goal_habits: 'Crear mejores hábitos', goal_habits_sub: 'Pequeñas victorias diarias que perduran',
    goal_balance: 'Equilibrar mi vida', goal_balance_sub: 'Trabajo, descanso, personas, propósito',
    goal_love: 'Encontrar conexiones significativas', goal_love_sub: 'Amistad, amor, pertenencia',
    goal_health: 'Cuidar mi salud', goal_health_sub: 'Cuerpo, sueño, energía, medicamentos',
    focusAreas: '¿Qué áreas importan más?', focusAreasSub: 'Elige hasta 3 — tu rueda de la vida.',
    createAccount: 'Crear cuenta', emailAddress: 'Correo electrónico',
    password: 'Contraseña', confirmPassword: 'Confirmar contraseña',
    dontHaveAccount: '¿No tienes cuenta?', forgotPassword: '¿Olvidaste la contraseña?', continueWith: 'o continuar con',
    hello: 'Hola', feeling: '¿Cómo te sientes hoy?',
    talkToSoma: 'Habla con Soma', checkIn: 'Registrarse',
    yourInsights: 'Tus reflexiones', wheelTitle: 'Rueda de la vida',
    overallBalance: 'EQUILIBRIO DE VIDA', circleOfLife: 'Círculo de la vida',
    reflecting: '🧠 Soma está reflexionando sobre todo lo que compartiste…',
    wheelSub: 'Evaluado por Soma, sopesando todo lo que compartiste, como un psicólogo atento.',
    darkMode: 'Modo oscuro', notifications: 'Notificaciones', account: 'Cuenta',
    privacyPolicy: 'Política de privacidad', resetData: 'Restablecer todos los datos', signOut: 'Cerrar sesión',
    meetPeople: 'Conocer gente', typeMessage: 'Escribe un mensaje…',
    ob_hi: 'Hola, soy Soma', ob_tagline: 'Conócete antes de conocer a otros', ob_explore: 'Explorar →', ob_intro: 'Te haré 3 preguntas cortas — solo habla conmigo. Tus respuestas construyen tu perfil automáticamente.',
    ob_physical_label: 'Tu yo físico', ob_social_label: 'Tu mundo social', ob_inner_label: 'Tu yo interior',
    ob_start: 'Empezar a hablar con Soma →',
    ob_q1: '¡Hola! Soy Soma. Te haré tres preguntas cortas para construir tu perfil. Primero — cuéntame sobre tu yo físico. ¿Cuántos años tienes, cómo te sientes en tu cuerpo? Puedes mencionar tu altura, peso, salud, nivel de energía — lo que te parezca bien.',
    ob_q2: 'Gracias por compartir. Ahora cuéntame sobre tu mundo social — ¿qué haces para trabajar, cómo son tus relaciones? Familia, amigos, vida romántica, los roles que juegas en la vida de las personas.',
    ob_q3: 'La última — cuéntame sobre quién eres por dentro. Tu personalidad, lo que te encanta hacer, tus hábitos, lo que te trae alegría y lo que más te desafía.',
    ob_tap_mic: 'Toca el micrófono y habla', ob_listening: 'Escuchando…', ob_type_instead: 'O escribe tu respuesta aquí…',
    ob_physical_self: 'Yo físico', ob_social_self: 'Yo social', ob_inner_self: 'Yo psicológico',
    ob_next: 'Siguiente →', ob_finish: 'Terminar →', ob_skip: 'Omitir', ob_skip_finish: 'Omitir y terminar',
    ob_building: 'Construyendo tu perfil…', ob_building_sub: 'Soma está leyendo todo lo que compartiste.',
    ob_allset: '¡Todo listo! ✨', ob_ready: 'Soma tiene todo lo que necesita. Tengamos tu primera conversación real.', ob_meet: 'Conoce a Soma →',
    ob_start_explore: 'Empezar a explorar →', ob_browse_sub: 'Navega, conoce gente y prueba todo — sin registrarte.',
    circle_remove: '✕ Eliminar', circle_who: '¿Quiénes son para ti?',
    circle_friend: 'Amigo/a', circle_family: 'Familiar', circle_therapy: 'Médico / Terapeuta', circle_romantic: 'Pareja romántica', circle_work: 'Compañero de trabajo',
    circle_friend_s: 'Amigo', circle_family_s: 'Familia', circle_therapy_s: 'Médico/Terapeuta', circle_romantic_s: 'Romántico', circle_work_s: 'Trabajo',
    type_friends: 'Amigos', type_family: 'Familia', type_therapy: 'Terapia y apoyo', type_romantic: 'Romántico', type_work: 'Trabajo',
    nudge_title: '✦ Idea de mensaje', nudge_thinking: 'Soma está pensando…', nudge_send_on: 'Enviar en SOMA',
    nudge_copy: 'Copiar mensaje', nudge_copied: '✓ ¡Copiado!', nudge_retry: '↺ Intentar otro', nudge_dismiss: 'Descartar',
  },
  fr: {
    tab_circle: 'Cercle', tab_inner: 'Intérieur', tab_explore: 'Explorer',
    continue: 'Continuer', back: '← Retour', save: 'Enregistrer', cancel: 'Annuler',
    done: 'Terminé', skip: 'Passer', settings: 'Paramètres', language: 'Langue',
    seeDetails: 'Détails →', send: 'Envoyer', or: 'ou',
    selectLang: 'Choisir la langue', chooseLang: 'Choisis ta langue préférée pour continuer',
    welcomeTitle: 'La meilleure version de toi\ncommence par te connaître toi-même.',
    welcomeSub: 'Ton compagnon IA personnel pour la croissance, la réflexion et construire la vie que tu veux vraiment.',
    whatName: 'Comment tu t\'appelles?', namePlaceholder: 'Ton prénom…',
    alreadyAccount: 'Déjà un compte?', signIn: 'Se connecter', signUp: 'S\'inscrire',
    feature1: 'Une IA qui t\'écoute vraiment et se souvient de toi',
    feature2: 'Des réflexions quotidiennes qui construisent une vraie connaissance de soi',
    feature3: 'Habitudes, santé et croissance — tout en un seul endroit',
    feature4: 'Des connexions plus profondes, en commençant par soi-même',
    whyHere: 'Qu\'est-ce qui t\'amène ici?',
    pickTrue: 'Choisis ce qui te semble vrai — Soma s\'adapte à cela.',
    skipNow: 'Passer pour l\'instant', startSoma: 'Commencer avec Soma →', getStarted: 'Commencer →',
    goal_heal: 'Guérir et se sentir mieux', goal_heal_sub: 'Récupérer, se reconstruire, respirer à nouveau',
    goal_know: 'Me comprendre', goal_know_sub: 'Schémas, émotions, ce qui me motive',
    goal_habits: 'Créer de meilleures habitudes', goal_habits_sub: 'Petites victoires quotidiennes qui durent',
    goal_balance: 'Équilibrer ma vie', goal_balance_sub: 'Travail, repos, personnes, but',
    goal_love: 'Trouver des connexions significatives', goal_love_sub: 'Amitié, amour, appartenance',
    goal_health: 'Prendre soin de ma santé', goal_health_sub: 'Corps, sommeil, énergie, médicaments',
    focusAreas: 'Quels domaines comptent le plus?', focusAreasSub: 'Choisis jusqu\'à 3 — ta roue de la vie.',
    createAccount: 'Créer un compte', emailAddress: 'Adresse e-mail',
    password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
    dontHaveAccount: 'Pas encore de compte?', forgotPassword: 'Mot de passe oublié?', continueWith: 'ou continuer avec',
    hello: 'Bonjour', feeling: 'Comment tu te sens aujourd\'hui?',
    talkToSoma: 'Parle avec Soma', checkIn: 'S\'enregistrer',
    yourInsights: 'Vos réflexions', wheelTitle: 'Roue de la vie',
    overallBalance: 'ÉQUILIBRE DE VIE GLOBAL', circleOfLife: 'Cercle de la vie',
    reflecting: '🧠 Soma réfléchit à tout ce que vous avez partagé…',
    wheelSub: 'Évalué par Soma, en pesant tout ce que vous avez partagé — comme un psychologue attentif.',
    darkMode: 'Mode sombre', notifications: 'Notifications', account: 'Compte',
    privacyPolicy: 'Politique de confidentialité', resetData: 'Réinitialiser toutes les données', signOut: 'Se déconnecter',
    meetPeople: 'Rencontrer des gens', typeMessage: 'Écris un message…',
    ob_hi: 'Bonjour, je suis Soma', ob_tagline: 'Rencontre-toi avant de rencontrer les autres', ob_explore: 'Explorer →', ob_intro: "Je vais te poser 3 courtes questions — parle-moi simplement. Tes réponses construisent ton profil automatiquement.",
    ob_physical_label: 'Ton moi physique', ob_social_label: 'Ton monde social', ob_inner_label: 'Ton moi intérieur',
    ob_start: 'Commencer à parler à Soma →',
    ob_q1: "Bonjour ! Je suis Soma. Je vais te poser trois courtes questions pour construire ton profil. D'abord — parle-moi de ton moi physique. Quel âge as-tu, comment te sens-tu dans ton corps ? Tu peux mentionner ta taille, ton poids, ta santé, ton niveau d'énergie — ce qui te semble juste.",
    ob_q2: "Merci de partager. Maintenant parle-moi de ton monde social — que fais-tu comme travail, comment sont tes relations ? Famille, amis, vie romantique, les rôles que tu joues dans la vie des gens.",
    ob_q3: "Dernière question — parle-moi de qui tu es à l'intérieur. Ta personnalité, ce que tu aimes faire, tes habitudes, ce qui te rend joyeux et ce qui te défie le plus.",
    ob_tap_mic: 'Appuie sur le micro et parle', ob_listening: "J'écoute…", ob_type_instead: 'Ou écris ta réponse ici…',
    ob_physical_self: 'Moi physique', ob_social_self: 'Moi social', ob_inner_self: 'Moi psychologique',
    ob_next: 'Suivant →', ob_finish: 'Terminer →', ob_skip: 'Passer', ob_skip_finish: 'Passer et terminer',
    ob_building: 'Construction de ton profil…', ob_building_sub: "Soma lit tout ce que tu as partagé.",
    ob_allset: 'Tout est prêt ✨', ob_ready: "Soma a tout ce dont elle a besoin. Ayons ta première vraie conversation.", ob_meet: 'Rencontrer Soma →',
    ob_start_explore: 'Commencer à explorer →', ob_browse_sub: 'Parcourez, rencontrez des gens et essayez tout — sans inscription.',
    circle_remove: '✕ Supprimer', circle_who: 'Qui sont-ils pour toi?',
    circle_friend: 'Ami(e)', circle_family: 'Membre de la famille', circle_therapy: 'Médecin / Thérapeute', circle_romantic: 'Partenaire romantique', circle_work: 'Collègue de travail',
    circle_friend_s: 'Ami', circle_family_s: 'Famille', circle_therapy_s: 'Médecin/Thérapeute', circle_romantic_s: 'Romantique', circle_work_s: 'Travail',
    type_friends: 'Amis', type_family: 'Famille', type_therapy: 'Thérapie et soutien', type_romantic: 'Romantique', type_work: 'Travail',
    nudge_title: '✦ Idée de message', nudge_thinking: 'Soma réfléchit…', nudge_send_on: 'Envoyer sur SOMA',
    nudge_copy: 'Copier le message', nudge_copied: '✓ Copié !', nudge_retry: '↺ Essayer un autre', nudge_dismiss: 'Fermer',
  },
  de: {
    tab_circle: 'Kreis', tab_inner: 'Innenwelt', tab_explore: 'Erkunden',
    continue: 'Weiter', back: '← Zurück', save: 'Speichern', cancel: 'Abbrechen',
    done: 'Fertig', skip: 'Überspringen', settings: 'Einstellungen', language: 'Sprache',
    seeDetails: 'Details →', send: 'Senden', or: 'oder',
    selectLang: 'Sprache wählen', chooseLang: 'Wähle deine bevorzugte Sprache um fortzufahren',
    welcomeTitle: 'Die beste Version von dir\nbeginnt damit, dich selbst zu kennen.',
    welcomeSub: 'Dein persönlicher KI-Begleiter für Wachstum, Reflexion und das Leben, das du wirklich willst.',
    whatName: 'Wie heißt du?', namePlaceholder: 'Dein Name…',
    alreadyAccount: 'Schon ein Konto?', signIn: 'Anmelden', signUp: 'Registrieren',
    feature1: 'Eine KI, die dir wirklich zuhört und dich erinnert',
    feature2: 'Tägliche Reflexionen, die echtes Selbstwissen aufbauen',
    feature3: 'Gewohnheiten, Gesundheit und Wachstum — alles an einem Ort',
    feature4: 'Tiefere Verbindungen, beginnend mit dir selbst',
    whyHere: 'Was bringt dich hierher?',
    pickTrue: 'Wähle, was sich wahr anfühlt — Soma passt sich daran an.',
    skipNow: 'Jetzt überspringen', startSoma: 'Mit Soma starten →', getStarted: 'Loslegen →',
    goal_heal: 'Heilen und besser fühlen', goal_heal_sub: 'Erholen, wiederaufbauen, wieder atmen',
    goal_know: 'Mich verstehen', goal_know_sub: 'Muster, Gefühle, was mich antreibt',
    goal_habits: 'Bessere Gewohnheiten aufbauen', goal_habits_sub: 'Kleine tägliche Erfolge, die bleiben',
    goal_balance: 'Mein Leben ausbalancieren', goal_balance_sub: 'Arbeit, Ruhe, Menschen, Zweck',
    goal_love: 'Bedeutsame Verbindungen finden', goal_love_sub: 'Freundschaft, Liebe, Zugehörigkeit',
    goal_health: 'Meine Gesundheit pflegen', goal_health_sub: 'Körper, Schlaf, Energie, Medikamente',
    focusAreas: 'Welche Bereiche sind am wichtigsten?', focusAreasSub: 'Wähle bis zu 3 — dein Lebensrad.',
    createAccount: 'Konto erstellen', emailAddress: 'E-Mail-Adresse',
    password: 'Passwort', confirmPassword: 'Passwort bestätigen',
    dontHaveAccount: 'Noch kein Konto?', forgotPassword: 'Passwort vergessen?', continueWith: 'oder weiter mit',
    hello: 'Hallo', feeling: 'Wie fühlst du dich heute?',
    talkToSoma: 'Mit Soma sprechen', checkIn: 'Einchecken',
    yourInsights: 'Deine Erkenntnisse', wheelTitle: 'Lebensrad',
    overallBalance: 'GESAMTES LEBENSGLEICHGEWICHT', circleOfLife: 'Lebenskreis',
    reflecting: '🧠 Soma reflektiert über alles, was du geteilt hast…',
    wheelSub: 'Bewertet von Soma, die alles abwägt, was du geteilt hast — wie ein einfühlsamer Psychologe.',
    darkMode: 'Dunkelmodus', notifications: 'Benachrichtigungen', account: 'Konto',
    privacyPolicy: 'Datenschutzrichtlinie', resetData: 'Alle Daten zurücksetzen', signOut: 'Abmelden',
    meetPeople: 'Menschen treffen', typeMessage: 'Nachricht eingeben…',
    ob_hi: 'Hallo, ich bin Soma', ob_tagline: 'Lerne dich kennen, bevor du andere kennenlernst', ob_explore: 'Erkunden →', ob_intro: 'Ich stelle dir 3 kurze Fragen — sprich einfach mit mir. Deine Antworten bauen dein Profil automatisch auf.',
    ob_physical_label: 'Dein physisches Selbst', ob_social_label: 'Deine soziale Welt', ob_inner_label: 'Dein inneres Selbst',
    ob_start: 'Gespräch mit Soma beginnen →',
    ob_q1: 'Hallo! Ich bin Soma. Ich stelle dir drei kurze Fragen, um dein Profil zu erstellen. Zuerst — erzähl mir von deinem physischen Selbst. Wie alt bist du, wie fühlst du dich in deinem Körper? Du kannst Größe, Gewicht, Gesundheit, Energieniveau erwähnen — was sich richtig anfühlt.',
    ob_q2: 'Danke fürs Teilen. Jetzt erzähl mir von deiner sozialen Welt — was machst du beruflich, wie sind deine Beziehungen? Familie, Freunde, Romantik, die Rollen die du im Leben der Menschen spielst.',
    ob_q3: 'Die letzte — erzähl mir wer du innen bist. Deine Persönlichkeit, was du gerne machst, deine Gewohnheiten, was dir Freude bringt und was dich am meisten herausfordert.',
    ob_tap_mic: 'Tippe auf das Mikrofon und sprich', ob_listening: 'Ich höre zu…', ob_type_instead: 'Oder schreib deine Antwort hier…',
    ob_physical_self: 'Physisches Selbst', ob_social_self: 'Soziales Selbst', ob_inner_self: 'Psychologisches Selbst',
    ob_next: 'Weiter →', ob_finish: 'Abschließen →', ob_skip: 'Überspringen', ob_skip_finish: 'Überspringen und abschließen',
    ob_building: 'Dein Profil wird erstellt…', ob_building_sub: 'Soma liest alles, was du geteilt hast.',
    ob_allset: 'Alles bereit ✨', ob_ready: 'Soma hat alles, was sie braucht. Lass uns dein erstes echtes Gespräch führen.', ob_meet: 'Soma kennenlernen →',
    ob_start_explore: 'Erkunden beginnen →', ob_browse_sub: 'Stöbere, lerne Leute kennen und probiere alles aus — ohne Anmeldung.',
    circle_remove: '✕ Entfernen', circle_who: 'Wer sind sie für dich?',
    circle_friend: 'Freund/in', circle_family: 'Familienmitglied', circle_therapy: 'Arzt / Therapeut', circle_romantic: 'Romantischer Partner', circle_work: 'Arbeitskollege',
    circle_friend_s: 'Freund', circle_family_s: 'Familie', circle_therapy_s: 'Arzt/Therapeut', circle_romantic_s: 'Romantisch', circle_work_s: 'Arbeit',
    type_friends: 'Freunde', type_family: 'Familie', type_therapy: 'Therapie & Unterstützung', type_romantic: 'Romantisch', type_work: 'Arbeit',
    nudge_title: '✦ Nachrichtenidee', nudge_thinking: 'Soma denkt nach…', nudge_send_on: 'Auf SOMA senden',
    nudge_copy: 'Nachricht kopieren', nudge_copied: '✓ Kopiert!', nudge_retry: '↺ Anderen versuchen', nudge_dismiss: 'Schließen',
  },
  it: {
    tab_circle: 'Cerchio', tab_inner: 'Interiore', tab_explore: 'Esplorare',
    continue: 'Continua', back: '← Indietro', save: 'Salva', cancel: 'Annulla',
    done: 'Fatto', skip: 'Salta', settings: 'Impostazioni', language: 'Lingua',
    seeDetails: 'Dettagli →', send: 'Invia', or: 'o',
    selectLang: 'Seleziona lingua', chooseLang: 'Scegli la tua lingua preferita per continuare',
    welcomeTitle: 'La migliore versione di te\ninitia dal conoscerti.',
    welcomeSub: 'Il tuo compagno IA personale per la crescita, la riflessione e costruire la vita che vuoi davvero.',
    whatName: 'Come ti chiami?', namePlaceholder: 'Il tuo nome…',
    alreadyAccount: 'Hai già un account?', signIn: 'Accedi', signUp: 'Registrati',
    feature1: 'Un\'AI che ti ascolta davvero e ti ricorda',
    feature2: 'Riflessioni quotidiane che costruiscono vera autoconoscenza',
    feature3: 'Abitudini, salute e crescita — tutto in un posto',
    feature4: 'Connessioni più profonde, a partire da te stesso',
    whyHere: 'Cosa ti porta qui?',
    pickTrue: 'Scegli ciò che senti vero — Soma si adatta a questo.',
    skipNow: 'Salta per ora', startSoma: 'Inizia con Soma →', getStarted: 'Inizia →',
    goal_heal: 'Guarire e stare meglio', goal_heal_sub: 'Recuperare, ricostruire, respirare di nuovo',
    goal_know: 'Capire me stesso', goal_know_sub: 'Schemi, emozioni, cosa mi guida',
    goal_habits: 'Costruire abitudini migliori', goal_habits_sub: 'Piccole vittorie quotidiane che rimangono',
    goal_balance: 'Bilanciare la mia vita', goal_balance_sub: 'Lavoro, riposo, persone, scopo',
    goal_love: 'Trovare connessioni significative', goal_love_sub: 'Amicizia, amore, appartenenza',
    goal_health: 'Prendermi cura della mia salute', goal_health_sub: 'Corpo, sonno, energia, medicine',
    focusAreas: 'Quali aree contano di più?', focusAreasSub: 'Scegli fino a 3 — la tua ruota della vita.',
    createAccount: 'Crea account', emailAddress: 'Indirizzo email',
    password: 'Password', confirmPassword: 'Conferma password',
    dontHaveAccount: 'Non hai un account?', forgotPassword: 'Password dimenticata?', continueWith: 'o continua con',
    hello: 'Ciao', feeling: 'Come ti senti oggi?',
    talkToSoma: 'Parla con Soma', checkIn: 'Registrati',
    yourInsights: 'Le tue intuizioni', wheelTitle: 'Ruota della vita',
    overallBalance: 'EQUILIBRIO VITA COMPLESSIVO', circleOfLife: 'Cerchio della vita',
    reflecting: '🧠 Soma sta riflettendo su tutto ciò che hai condiviso…',
    wheelSub: 'Valutato da Soma, soppesando tutto ciò che hai condiviso — come uno psicologo attento.',
    darkMode: 'Modalità scura', notifications: 'Notifiche', account: 'Account',
    privacyPolicy: 'Informativa sulla privacy', resetData: 'Reimposta tutti i dati', signOut: 'Esci',
    meetPeople: 'Incontrare persone', typeMessage: 'Scrivi un messaggio…',
    ob_hi: 'Ciao, sono Soma', ob_tagline: 'Conosci te stesso prima di conoscere gli altri', ob_explore: 'Esplora →', ob_intro: 'Ti farò 3 brevi domande — parla con me. Le tue risposte costruiscono il tuo profilo automaticamente.',
    ob_physical_label: 'Il tuo io fisico', ob_social_label: 'Il tuo mondo sociale', ob_inner_label: 'Il tuo io interiore',
    ob_start: 'Inizia a parlare con Soma →',
    ob_q1: 'Ciao! Sono Soma. Ti farò tre brevi domande per costruire il tuo profilo. Prima — dimmi del tuo io fisico. Quanti anni hai, come ti senti nel tuo corpo? Puoi menzionare altezza, peso, salute, livello di energia — qualunque cosa ti sembri giusta.',
    ob_q2: 'Grazie per aver condiviso. Ora dimmi del tuo mondo sociale — cosa fai per lavoro, come sono le tue relazioni? Famiglia, amici, vita romantica, i ruoli che giochi nella vita delle persone.',
    ob_q3: 'Ultima — dimmi chi sei dentro. La tua personalità, cosa ami fare, le tue abitudini, cosa ti porta gioia e cosa ti sfida di più.',
    ob_tap_mic: 'Tocca il microfono e parla', ob_listening: 'Ascolto…', ob_type_instead: 'O scrivi la tua risposta qui…',
    ob_physical_self: 'Io fisico', ob_social_self: 'Io sociale', ob_inner_self: 'Io psicologico',
    ob_next: 'Avanti →', ob_finish: 'Fine →', ob_skip: 'Salta', ob_skip_finish: 'Salta e finisci',
    ob_building: 'Costruisco il tuo profilo…', ob_building_sub: 'Soma sta leggendo tutto ciò che hai condiviso.',
    ob_allset: 'Tutto pronto ✨', ob_ready: 'Soma ha tutto ciò di cui ha bisogno. Facciamo la tua prima vera conversazione.', ob_meet: 'Incontra Soma →',
    ob_start_explore: 'Inizia a esplorare →', ob_browse_sub: 'Esplora, incontra persone e prova tutto — senza registrarti.',
    circle_remove: '✕ Rimuovi', circle_who: 'Chi sono per te?',
    circle_friend: 'Amico/a', circle_family: 'Membro della famiglia', circle_therapy: 'Medico / Terapeuta', circle_romantic: 'Partner romantico', circle_work: 'Collega di lavoro',
    circle_friend_s: 'Amico', circle_family_s: 'Famiglia', circle_therapy_s: 'Medico/Terapeuta', circle_romantic_s: 'Romantico', circle_work_s: 'Lavoro',
    type_friends: 'Amici', type_family: 'Famiglia', type_therapy: 'Terapia e supporto', type_romantic: 'Romantico', type_work: 'Lavoro',
    nudge_title: '✦ Idea di messaggio', nudge_thinking: 'Soma sta pensando…', nudge_send_on: 'Invia su SOMA',
    nudge_copy: 'Copia messaggio', nudge_copied: '✓ Copiato!', nudge_retry: '↺ Prova un altro', nudge_dismiss: 'Chiudi',
  },
  pt: {
    tab_circle: 'Círculo', tab_inner: 'Interior', tab_explore: 'Explorar',
    continue: 'Continuar', back: '← Voltar', save: 'Salvar', cancel: 'Cancelar',
    done: 'Concluído', skip: 'Pular', settings: 'Configurações', language: 'Idioma',
    seeDetails: 'Detalhes →', send: 'Enviar', or: 'ou',
    selectLang: 'Selecionar idioma', chooseLang: 'Escolha o seu idioma preferido para continuar',
    welcomeTitle: 'A melhor versão de você\ncomeça por se conhecer.',
    welcomeSub: 'Seu companheiro de IA pessoal para crescimento, reflexão e construir a vida que você realmente quer.',
    whatName: 'Como você se chama?', namePlaceholder: 'Seu nome…',
    alreadyAccount: 'Já tem conta?', signIn: 'Entrar', signUp: 'Cadastrar',
    feature1: 'Uma IA que realmente te ouve e lembra de você',
    feature2: 'Reflexões diárias que constroem autoconhecimento real',
    feature3: 'Hábitos, saúde e crescimento — tudo em um lugar',
    feature4: 'Conexões mais profundas, começando por você mesmo',
    whyHere: 'O que te traz aqui?',
    pickTrue: 'Escolha o que parece verdadeiro — Soma se molda a isso.',
    skipNow: 'Pular por agora', startSoma: 'Começar com Soma →', getStarted: 'Começar →',
    goal_heal: 'Curar e sentir-me melhor', goal_heal_sub: 'Recuperar, reconstruir, respirar novamente',
    goal_know: 'Entender a mim mesmo', goal_know_sub: 'Padrões, emoções, o que me move',
    goal_habits: 'Criar melhores hábitos', goal_habits_sub: 'Pequenas vitórias diárias que ficam',
    goal_balance: 'Equilibrar minha vida', goal_balance_sub: 'Trabalho, descanso, pessoas, propósito',
    goal_love: 'Encontrar conexões significativas', goal_love_sub: 'Amizade, amor, pertencimento',
    goal_health: 'Cuidar da minha saúde', goal_health_sub: 'Corpo, sono, energia, medicamentos',
    focusAreas: 'Quais áreas importam mais?', focusAreasSub: 'Escolha até 3 — sua roda da vida.',
    createAccount: 'Criar conta', emailAddress: 'Endereço de e-mail',
    password: 'Senha', confirmPassword: 'Confirmar senha',
    dontHaveAccount: 'Não tem conta?', forgotPassword: 'Esqueceu a senha?', continueWith: 'ou continuar com',
    hello: 'Olá', feeling: 'Como você se sente hoje?',
    talkToSoma: 'Fale com Soma', checkIn: 'Registrar',
    yourInsights: 'Seus insights', wheelTitle: 'Roda da vida',
    overallBalance: 'EQUILÍBRIO DE VIDA GERAL', circleOfLife: 'Círculo da vida',
    reflecting: '🧠 Soma está refletindo sobre tudo o que você compartilhou…',
    wheelSub: 'Avaliado por Soma, pesando tudo o que você compartilhou — como um psicólogo atento.',
    darkMode: 'Modo escuro', notifications: 'Notificações', account: 'Conta',
    privacyPolicy: 'Política de privacidade', resetData: 'Redefinir todos os dados', signOut: 'Sair',
    meetPeople: 'Conhecer pessoas', typeMessage: 'Digite uma mensagem…',
    ob_hi: 'Olá, sou Soma', ob_tagline: 'Conheça-se antes de conhecer os outros', ob_explore: 'Explorar →', ob_intro: 'Vou te fazer 3 perguntas curtas — só fala comigo. Suas respostas constroem seu perfil automaticamente.',
    ob_physical_label: 'Seu eu físico', ob_social_label: 'Seu mundo social', ob_inner_label: 'Seu eu interior',
    ob_start: 'Começar a conversar com Soma →',
    ob_q1: 'Olá! Sou Soma. Vou te fazer três perguntas curtas para construir seu perfil. Primeiro — me fale sobre seu eu físico. Quantos anos você tem, como se sente no seu corpo? Pode mencionar altura, peso, saúde, nível de energia — o que achar certo.',
    ob_q2: 'Obrigada por compartilhar. Agora me fale sobre seu mundo social — o que você faz no trabalho, como são seus relacionamentos? Família, amigos, vida romântica, os papéis que você desempenha na vida das pessoas.',
    ob_q3: 'Última — me fale sobre quem você é por dentro. Sua personalidade, o que você ama fazer, seus hábitos, o que te traz alegria e o que te desafia mais.',
    ob_tap_mic: 'Toque no microfone e fale', ob_listening: 'Ouvindo…', ob_type_instead: 'Ou escreva sua resposta aqui…',
    ob_physical_self: 'Eu físico', ob_social_self: 'Eu social', ob_inner_self: 'Eu psicológico',
    ob_next: 'Próximo →', ob_finish: 'Terminar →', ob_skip: 'Pular', ob_skip_finish: 'Pular e terminar',
    ob_building: 'Construindo seu perfil…', ob_building_sub: 'Soma está lendo tudo que você compartilhou.',
    ob_allset: 'Tudo pronto ✨', ob_ready: 'Soma tem tudo que precisa. Vamos ter sua primeira conversa real.', ob_meet: 'Conhecer Soma →',
    ob_start_explore: 'Começar a explorar →', ob_browse_sub: 'Navegue, conheça pessoas e experimente tudo — sem se cadastrar.',
    circle_remove: '✕ Remover', circle_who: 'Quem são para você?',
    circle_friend: 'Amigo/a', circle_family: 'Membro da família', circle_therapy: 'Médico / Terapeuta', circle_romantic: 'Parceiro romântico', circle_work: 'Colega de trabalho',
    circle_friend_s: 'Amigo', circle_family_s: 'Família', circle_therapy_s: 'Médico/Terapeuta', circle_romantic_s: 'Romântico', circle_work_s: 'Trabalho',
    type_friends: 'Amigos', type_family: 'Família', type_therapy: 'Terapia e suporte', type_romantic: 'Romântico', type_work: 'Trabalho',
    nudge_title: '✦ Ideia de mensagem', nudge_thinking: 'Soma está pensando…', nudge_send_on: 'Enviar no SOMA',
    nudge_copy: 'Copiar mensagem', nudge_copied: '✓ Copiado!', nudge_retry: '↺ Tentar outro', nudge_dismiss: 'Fechar',
  },
  vi: {
    tab_circle: 'Vòng tròn', tab_inner: 'Nội tâm', tab_explore: 'Khám phá',
    continue: 'Tiếp tục', back: '← Quay lại', save: 'Lưu', cancel: 'Hủy',
    done: 'Xong', skip: 'Bỏ qua', settings: 'Cài đặt', language: 'Ngôn ngữ',
    seeDetails: 'Chi tiết →', send: 'Gửi', or: 'hoặc',
    selectLang: 'Chọn ngôn ngữ', chooseLang: 'Chọn ngôn ngữ ưa thích của bạn để tiếp tục',
    welcomeTitle: 'Phiên bản tốt nhất của bạn\nbắt đầu từ việc hiểu chính mình.',
    welcomeSub: 'Người bạn đồng hành AI cá nhân cho sự phát triển, suy ngẫm và xây dựng cuộc sống bạn thực sự muốn.',
    whatName: 'Tên bạn là gì?', namePlaceholder: 'Tên của bạn…',
    alreadyAccount: 'Đã có tài khoản?', signIn: 'Đăng nhập', signUp: 'Đăng ký',
    feature1: 'Một AI thực sự lắng nghe và ghi nhớ bạn',
    feature2: 'Suy ngẫm hàng ngày giúp xây dựng sự hiểu biết bản thân',
    feature3: 'Thói quen, sức khỏe và phát triển — tất cả trong một nơi',
    feature4: 'Kết nối sâu sắc hơn, bắt đầu từ chính bạn',
    whyHere: 'Điều gì đưa bạn đến đây?',
    pickTrue: 'Chọn điều cảm thấy đúng — Soma định hình theo điều này.',
    skipNow: 'Bỏ qua lúc này', startSoma: 'Bắt đầu với Soma →', getStarted: 'Bắt đầu →',
    goal_heal: 'Chữa lành và cảm thấy tốt hơn', goal_heal_sub: 'Hồi phục, xây dựng lại, thở lại',
    goal_know: 'Hiểu bản thân', goal_know_sub: 'Mô thức, cảm xúc, điều thúc đẩy tôi',
    goal_habits: 'Xây dựng thói quen tốt hơn', goal_habits_sub: 'Những chiến thắng nhỏ hàng ngày bền vững',
    goal_balance: 'Cân bằng cuộc sống', goal_balance_sub: 'Công việc, nghỉ ngơi, con người, mục đích',
    goal_love: 'Tìm kiếm kết nối có ý nghĩa', goal_love_sub: 'Tình bạn, tình yêu, sự thuộc về',
    goal_health: 'Chăm sóc sức khỏe', goal_health_sub: 'Cơ thể, giấc ngủ, năng lượng, thuốc',
    focusAreas: 'Lĩnh vực nào quan trọng nhất?', focusAreasSub: 'Chọn tối đa 3 — bánh xe cuộc sống của bạn.',
    createAccount: 'Tạo tài khoản', emailAddress: 'Địa chỉ email',
    password: 'Mật khẩu', confirmPassword: 'Xác nhận mật khẩu',
    dontHaveAccount: 'Chưa có tài khoản?', forgotPassword: 'Quên mật khẩu?', continueWith: 'hoặc tiếp tục với',
    hello: 'Xin chào', feeling: 'Hôm nay bạn cảm thấy thế nào?',
    talkToSoma: 'Nói chuyện với Soma', checkIn: 'Kiểm tra',
    yourInsights: 'Nhận xét của bạn', wheelTitle: 'Bánh xe cuộc sống',
    overallBalance: 'CÂN BẰNG CUỘC SỐNG TỔNG THỂ', circleOfLife: 'Vòng tròn cuộc sống',
    reflecting: '🧠 Soma đang suy ngẫm về mọi điều bạn đã chia sẻ…',
    wheelSub: 'Được đánh giá bởi Soma, cân nhắc mọi điều bạn chia sẻ — như một nhà tâm lý học chu đáo.',
    darkMode: 'Chế độ tối', notifications: 'Thông báo', account: 'Tài khoản',
    privacyPolicy: 'Chính sách bảo mật', resetData: 'Đặt lại tất cả dữ liệu', signOut: 'Đăng xuất',
    meetPeople: 'Gặp gỡ mọi người', typeMessage: 'Nhập tin nhắn…',
    ob_hi: 'Xin chào, tôi là Soma', ob_tagline: 'Gặp gỡ bản thân trước khi gặp gỡ người khác', ob_explore: 'Khám phá →', ob_intro: 'Tôi sẽ hỏi bạn 3 câu hỏi ngắn — chỉ cần nói chuyện với tôi. Câu trả lời của bạn tự động xây dựng hồ sơ của bạn.',
    ob_physical_label: 'Bản thân thể chất', ob_social_label: 'Thế giới xã hội', ob_inner_label: 'Bản thân nội tâm',
    ob_start: 'Bắt đầu nói chuyện với Soma →',
    ob_q1: 'Xin chào! Tôi là Soma. Tôi sẽ hỏi bạn ba câu hỏi ngắn để xây dựng hồ sơ. Đầu tiên — hãy cho tôi biết về bản thân thể chất của bạn. Bạn bao nhiêu tuổi, bạn cảm thấy thế nào trong cơ thể? Có thể đề cập đến chiều cao, cân nặng, sức khỏe, mức năng lượng — bất cứ điều gì cảm thấy phù hợp.',
    ob_q2: 'Cảm ơn bạn đã chia sẻ. Bây giờ hãy cho tôi biết về thế giới xã hội — bạn làm gì cho công việc, các mối quan hệ như thế nào? Gia đình, bạn bè, cuộc sống tình cảm, các vai trò bạn đóng trong cuộc sống mọi người.',
    ob_q3: 'Câu cuối — hãy cho tôi biết bạn là ai bên trong. Tính cách, những gì bạn thích làm, thói quen, điều mang lại niềm vui và điều thách thức bạn nhất.',
    ob_tap_mic: 'Nhấn vào micro và nói', ob_listening: 'Đang nghe…', ob_type_instead: 'Hoặc gõ câu trả lời của bạn ở đây…',
    ob_physical_self: 'Bản thân thể chất', ob_social_self: 'Bản thân xã hội', ob_inner_self: 'Bản thân tâm lý',
    ob_next: 'Tiếp theo →', ob_finish: 'Hoàn thành →', ob_skip: 'Bỏ qua', ob_skip_finish: 'Bỏ qua và hoàn thành',
    ob_building: 'Đang xây dựng hồ sơ…', ob_building_sub: 'Soma đang đọc mọi thứ bạn đã chia sẻ.',
    ob_allset: 'Bạn đã sẵn sàng ✨', ob_ready: 'Soma có mọi thứ cần thiết. Hãy có cuộc trò chuyện thực sự đầu tiên.', ob_meet: 'Gặp gỡ Soma →',
    ob_start_explore: 'Bắt đầu khám phá →', ob_browse_sub: 'Duyệt hồ sơ, gặp gỡ mọi người và thử mọi thứ — không cần đăng ký.',
    circle_remove: '✕ Xóa', circle_who: 'Họ là ai với bạn?',
    circle_friend: 'Bạn bè', circle_family: 'Thành viên gia đình', circle_therapy: 'Bác sĩ / Chuyên gia trị liệu', circle_romantic: 'Người yêu', circle_work: 'Đồng nghiệp',
    circle_friend_s: 'Bạn', circle_family_s: 'Gia đình', circle_therapy_s: 'Bác sĩ/Trị liệu', circle_romantic_s: 'Tình cảm', circle_work_s: 'Công việc',
    type_friends: 'Bạn bè', type_family: 'Gia đình', type_therapy: 'Liệu pháp & Hỗ trợ', type_romantic: 'Tình cảm', type_work: 'Công việc',
    nudge_title: '✦ Ý tưởng tin nhắn', nudge_thinking: 'Soma đang suy nghĩ…', nudge_send_on: 'Gửi trên SOMA',
    nudge_copy: 'Sao chép tin nhắn', nudge_copied: '✓ Đã sao chép!', nudge_retry: '↺ Thử cái khác', nudge_dismiss: 'Đóng',
  },
  zh: {
    tab_circle: '圈子', tab_inner: '内心', tab_explore: '探索',
    continue: '继续', back: '← 返回', save: '保存', cancel: '取消',
    done: '完成', skip: '跳过', settings: '设置', language: '语言',
    seeDetails: '详情 →', send: '发送', or: '或',
    selectLang: '选择语言', chooseLang: '选择您偏好的语言以继续',
    welcomeTitle: '最好的你\n从了解自己开始。',
    welcomeSub: '您的个人AI伴侣，助您成长、反思，构建您真正想要的生活。',
    whatName: '你叫什么名字？', namePlaceholder: '你的名字…',
    alreadyAccount: '已有账户？', signIn: '登录', signUp: '注册',
    feature1: '一个真正倾听并记住你的AI',
    feature2: '建立真实自我认知的每日反思',
    feature3: '习惯、健康和成长——尽在一处',
    feature4: '更深的连接，从自己开始',
    whyHere: '是什么让你来到这里？',
    pickTrue: '选择感觉真实的——Soma会据此塑造。',
    skipNow: '暂时跳过', startSoma: '与Soma开始 →', getStarted: '开始 →',
    goal_heal: '治愈并感觉更好', goal_heal_sub: '恢复、重建、再次呼吸',
    goal_know: '了解自己', goal_know_sub: '模式、情绪、驱动我的东西',
    goal_habits: '培养更好的习惯', goal_habits_sub: '坚持不懈的每日小胜利',
    goal_balance: '平衡我的生活', goal_balance_sub: '工作、休息、人际关系、目标',
    goal_love: '寻找有意义的连接', goal_love_sub: '友谊、爱情、归属感',
    goal_health: '照顾好我的健康', goal_health_sub: '身体、睡眠、精力、药物',
    focusAreas: '哪些领域最重要？', focusAreasSub: '最多选3个——您的生命之轮。',
    createAccount: '创建账户', emailAddress: '电子邮件地址',
    password: '密码', confirmPassword: '确认密码',
    dontHaveAccount: '没有账户？', forgotPassword: '忘记密码？', continueWith: '或继续使用',
    hello: '你好', feeling: '你今天感觉怎么样？',
    talkToSoma: '与Soma交谈', checkIn: '签到',
    yourInsights: '你的洞察', wheelTitle: '生命之轮',
    overallBalance: '整体生活平衡', circleOfLife: '生命圈',
    reflecting: '🧠 Soma正在思考您分享的一切…',
    wheelSub: '由Soma评估，权衡您分享的一切——就像一位细心的心理学家。',
    darkMode: '深色模式', notifications: '通知', account: '账户',
    privacyPolicy: '隐私政策', resetData: '重置所有数据', signOut: '退出登录',
    meetPeople: '认识人', typeMessage: '输入消息…',
    ob_hi: '你好，我是Soma', ob_tagline: '先认识自己，再认识他人', ob_explore: '开始探索 →', ob_intro: '我会问你3个简短的问题——只需和我说话。你的回答会自动建立你的个人资料。',
    ob_physical_label: '你的身体自我', ob_social_label: '你的社交世界', ob_inner_label: '你的内心自我',
    ob_start: '开始和Soma交谈 →',
    ob_q1: '你好！我是Soma。我会问你三个简短的问题来建立你的个人资料。首先——告诉我你的身体自我。你多大了，你感觉身体怎么样？可以提到身高、体重、健康状况、精力水平——任何感觉合适的内容。',
    ob_q2: '感谢分享。现在告诉我你的社交世界——你做什么工作，你的关系如何？家庭、朋友、恋爱生活，你在人们生活中扮演的角色。',
    ob_q3: '最后一个——告诉我你内心是谁。你的个性，你喜欢做什么，你的习惯，什么给你带来快乐，什么最挑战你。',
    ob_tap_mic: '点击麦克风并说话', ob_listening: '正在听…', ob_type_instead: '或者在这里输入你的回答…',
    ob_physical_self: '身体自我', ob_social_self: '社交自我', ob_inner_self: '心理自我',
    ob_next: '下一步 →', ob_finish: '完成 →', ob_skip: '跳过', ob_skip_finish: '跳过并完成',
    ob_building: '正在建立你的个人资料…', ob_building_sub: 'Soma正在阅读你分享的一切。',
    ob_allset: '一切就绪 ✨', ob_ready: 'Soma拥有她所需要的一切。让我们进行你的第一次真实对话。', ob_meet: '认识Soma →',
    ob_start_explore: '开始探索 →', ob_browse_sub: '浏览、认识人并尝试一切 — 无需注册。',
    circle_remove: '✕ 移除', circle_who: '他们与你是什么关系？',
    circle_friend: '朋友', circle_family: '家庭成员', circle_therapy: '医生 / 治疗师', circle_romantic: '恋人', circle_work: '工作同事',
    circle_friend_s: '朋友', circle_family_s: '家庭', circle_therapy_s: '医生/治疗师', circle_romantic_s: '浪漫', circle_work_s: '工作',
    type_friends: '朋友', type_family: '家庭', type_therapy: '治疗与支持', type_romantic: '浪漫', type_work: '工作',
    nudge_title: '✦ 消息创意', nudge_thinking: 'Soma正在思考…', nudge_send_on: '在SOMA上发送',
    nudge_copy: '复制消息', nudge_copied: '✓ 已复制！', nudge_retry: '↺ 试试另一个', nudge_dismiss: '关闭',
  },
  ja: {
    tab_circle: 'サークル', tab_inner: '内面', tab_explore: '探索',
    continue: '続ける', back: '← 戻る', save: '保存', cancel: 'キャンセル',
    done: '完了', skip: 'スキップ', settings: '設定', language: '言語',
    seeDetails: '詳細 →', send: '送信', or: 'または',
    selectLang: '言語を選択', chooseLang: 'ご希望の言語を選んで続けてください',
    welcomeTitle: 'あなたの最高の姿は\n自分を知ることから始まります。',
    welcomeSub: '成長、内省、そして本当に望む人生を築くためのパーソナルAIコンパニオン。',
    whatName: 'お名前は？', namePlaceholder: 'あなたの名前…',
    alreadyAccount: 'すでにアカウントをお持ちですか？', signIn: 'サインイン', signUp: 'サインアップ',
    feature1: '本当に聞いて覚えてくれるAI',
    feature2: '本当の自己理解を築く毎日の振り返り',
    feature3: '習慣・健康・成長 — すべてひとつの場所で',
    feature4: 'より深いつながり、自分自身から始まる',
    whyHere: 'ここに来た理由は何ですか？',
    pickTrue: '本当に感じることを選んでください — Somaはそれに合わせます。',
    skipNow: '今はスキップ', startSoma: 'Somaで始める →', getStarted: 'はじめる →',
    goal_heal: '癒えて気分よくなる', goal_heal_sub: '回復し、再建し、また呼吸する',
    goal_know: '自己を理解する', goal_know_sub: 'パターン、感情、私を動かすもの',
    goal_habits: 'より良い習慣を作る', goal_habits_sub: '継続する小さな毎日の勝利',
    goal_balance: '人生のバランスを取る', goal_balance_sub: '仕事、休息、人、目的',
    goal_love: '意味のある繋がりを見つける', goal_love_sub: '友情、愛、帰属感',
    goal_health: '健康に気をつける', goal_health_sub: '体、睡眠、エネルギー、薬',
    focusAreas: '最も大切な分野は？', focusAreasSub: '最大3つ選んでください — あなたの人生の輪。',
    createAccount: 'アカウント作成', emailAddress: 'メールアドレス',
    password: 'パスワード', confirmPassword: 'パスワードを確認',
    dontHaveAccount: 'アカウントをお持ちでない方は？', forgotPassword: 'パスワードを忘れた方は？', continueWith: 'または次で続ける',
    hello: 'こんにちは', feeling: '今日はどんな気持ちですか？',
    talkToSoma: 'Somaと話す', checkIn: 'チェックイン',
    yourInsights: 'あなたの洞察', wheelTitle: '人生の輪',
    overallBalance: '全体的な生活バランス', circleOfLife: '人生のサークル',
    reflecting: '🧠 Somaがあなたの共有してくれたすべてを振り返っています…',
    wheelSub: 'Somaがあなたの共有してくれたすべてを、思慮深い心理学者のように評価しました。',
    darkMode: 'ダークモード', notifications: '通知', account: 'アカウント',
    privacyPolicy: 'プライバシーポリシー', resetData: 'すべてのデータをリセット', signOut: 'サインアウト',
    meetPeople: '人と出会う', typeMessage: 'メッセージを入力…',
    ob_hi: 'こんにちは、私はSomaです', ob_tagline: '他者と出会う前に、自分自身と出会おう', ob_explore: '探索する →', ob_intro: '3つの短い質問をします — 私に話しかけてください。あなたの回答がプロフィールを自動的に作成します。',
    ob_physical_label: 'あなたの身体的な自己', ob_social_label: 'あなたの社会的な世界', ob_inner_label: 'あなたの内なる自己',
    ob_start: 'Somaと話し始める →',
    ob_q1: 'こんにちは！私はSomaです。プロフィールを作成するために3つの短い質問をします。まず — 身体的な自己について教えてください。何歳ですか、体の調子はどうですか？身長、体重、健康状態、エネルギーレベルなど、気になることは何でも話してください。',
    ob_q2: 'シェアしてくれてありがとう。次に社会的な世界について教えてください — 仕事は何をしていますか、人間関係はどうですか？家族、友人、恋愛、人々の生活で果たしている役割など。',
    ob_q3: '最後 — 内面の自分を教えてください。あなたの性格、好きなこと、習慣、喜びをもたらすもの、そして最も挑戦的なことを。',
    ob_tap_mic: 'マイクをタップして話す', ob_listening: '聞いています…', ob_type_instead: 'またはここに回答を入力してください…',
    ob_physical_self: '身体的な自己', ob_social_self: '社会的な自己', ob_inner_self: '心理的な自己',
    ob_next: '次へ →', ob_finish: '完了 →', ob_skip: 'スキップ', ob_skip_finish: 'スキップして完了',
    ob_building: 'プロフィールを作成中…', ob_building_sub: 'Somaがあなたのシェアしたすべてを読んでいます。',
    ob_allset: '準備完了 ✨', ob_ready: 'Somaは必要なものをすべて持っています。最初の本当の会話をしましょう。', ob_meet: 'Somaに会う →',
    ob_start_explore: '探索を始める →', ob_browse_sub: '閲覧して、人と出会い、すべてを試してみましょう — 登録不要。',
    circle_remove: '✕ 削除', circle_who: 'あなたにとって誰ですか？',
    circle_friend: '友達', circle_family: '家族', circle_therapy: '医師 / セラピスト', circle_romantic: 'パートナー', circle_work: '職場の同僚',
    circle_friend_s: '友達', circle_family_s: '家族', circle_therapy_s: '医師/セラピスト', circle_romantic_s: '恋愛', circle_work_s: '仕事',
    type_friends: '友達', type_family: '家族', type_therapy: 'セラピーとサポート', type_romantic: '恋愛', type_work: '仕事',
    nudge_title: '✦ メッセージのアイデア', nudge_thinking: 'Somaが考えています…', nudge_send_on: 'SOMAで送信',
    nudge_copy: 'メッセージをコピー', nudge_copied: '✓ コピーしました！', nudge_retry: '↺ 別のを試す', nudge_dismiss: '閉じる',
  },
  ar: {
    tab_circle: 'الدائرة', tab_inner: 'الداخل', tab_explore: 'استكشاف',
    continue: 'متابعة', back: 'رجوع ←', save: 'حفظ', cancel: 'إلغاء',
    done: 'تم', skip: 'تخطى', settings: 'الإعدادات', language: 'اللغة',
    seeDetails: '← التفاصيل', send: 'إرسال', or: 'أو',
    selectLang: 'اختر اللغة', chooseLang: 'اختر لغتك المفضلة للمتابعة',
    welcomeTitle: 'أفضل نسخة منك\nتبدأ بمعرفة نفسك.',
    welcomeSub: 'رفيقك الشخصي بالذكاء الاصطناعي للنمو والتفكير وبناء الحياة التي تريدها حقاً.',
    whatName: 'ما اسمك؟', namePlaceholder: 'اسمك…',
    alreadyAccount: 'لديك حساب بالفعل؟', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب',
    feature1: 'ذكاء اصطناعي يستمع إليك حقاً ويتذكرك',
    feature2: 'تأملات يومية تبني معرفة حقيقية بالنفس',
    feature3: 'العادات والصحة والنمو — كل شيء في مكان واحد',
    feature4: 'روابط أعمق، تبدأ بنفسك',
    whyHere: 'ما الذي أحضرك إلى هنا؟',
    pickTrue: 'اختر ما يبدو حقيقياً — سوما تتشكل حول هذا.',
    skipNow: 'تخطى الآن', startSoma: 'ابدأ مع سوما ←', getStarted: 'ابدأ ←',
    goal_heal: 'الشفاء والشعور بتحسن', goal_heal_sub: 'التعافي، إعادة البناء، التنفس مجدداً',
    goal_know: 'فهم نفسي', goal_know_sub: 'الأنماط، المشاعر، ما يحركني',
    goal_habits: 'بناء عادات أفضل', goal_habits_sub: 'انتصارات يومية صغيرة تستمر',
    goal_balance: 'موازنة حياتي', goal_balance_sub: 'العمل، الراحة، الناس، الهدف',
    goal_love: 'إيجاد علاقات ذات معنى', goal_love_sub: 'الصداقة، الحب، الانتماء',
    goal_health: 'الاعتناء بصحتي', goal_health_sub: 'الجسم، النوم، الطاقة، الأدوية',
    focusAreas: 'ما المجالات الأكثر أهمية؟', focusAreasSub: 'اختر حتى 3 — عجلة حياتك.',
    createAccount: 'إنشاء حساب', emailAddress: 'عنوان البريد الإلكتروني',
    password: 'كلمة المرور', confirmPassword: 'تأكيد كلمة المرور',
    dontHaveAccount: 'ليس لديك حساب؟', forgotPassword: 'نسيت كلمة المرور؟', continueWith: 'أو المتابعة مع',
    hello: 'مرحبا', feeling: 'كيف تشعر اليوم؟',
    talkToSoma: 'تحدث مع سوما', checkIn: 'تسجيل',
    yourInsights: 'رؤاك', wheelTitle: 'عجلة الحياة',
    overallBalance: 'التوازن العام للحياة', circleOfLife: 'دائرة الحياة',
    reflecting: '🧠 سوما تفكر في كل ما شاركته…',
    wheelSub: 'تم تقييمه بواسطة سوما، موازناً كل ما شاركته — مثل طبيب نفسي متأمل.',
    darkMode: 'الوضع الداكن', notifications: 'الإشعارات', account: 'الحساب',
    privacyPolicy: 'سياسة الخصوصية', resetData: 'إعادة تعيين جميع البيانات', signOut: 'تسجيل الخروج',
    meetPeople: 'مقابلة الناس', typeMessage: 'اكتب رسالة…',
    ob_hi: 'مرحباً، أنا سوما', ob_tagline: 'اعرف نفسك قبل أن تعرف الآخرين', ob_explore: 'ابدأ الاستكشاف →', ob_intro: 'سأسألك 3 أسئلة قصيرة — فقط تحدث معي. إجاباتك تبني ملفك الشخصي تلقائياً.',
    ob_physical_label: 'ذاتك الجسدية', ob_social_label: 'عالمك الاجتماعي', ob_inner_label: 'ذاتك الداخلية',
    ob_start: 'ابدأ الحديث مع سوما ←',
    ob_q1: 'مرحباً! أنا سوما. سأسألك ثلاثة أسئلة قصيرة لبناء ملفك الشخصي. أولاً — أخبرني عن ذاتك الجسدية. كم عمرك، كيف تشعر في جسدك؟ يمكنك ذكر طولك ووزنك وصحتك ومستوى طاقتك — أي شيء يبدو مناسباً.',
    ob_q2: 'شكراً للمشاركة. الآن أخبرني عن عالمك الاجتماعي — ماذا تعمل، كيف هي علاقاتك؟ العائلة والأصدقاء والحياة العاطفية والأدوار التي تلعبها في حياة الناس.',
    ob_q3: 'السؤال الأخير — أخبرني من أنت في الداخل. شخصيتك وما تحب فعله وعاداتك وما يجلب لك الفرح وما يتحداك أكثر.',
    ob_tap_mic: 'اضغط على الميكروفون وتحدث', ob_listening: 'أستمع…', ob_type_instead: 'أو اكتب إجابتك هنا…',
    ob_physical_self: 'الذات الجسدية', ob_social_self: 'الذات الاجتماعية', ob_inner_self: 'الذات النفسية',
    ob_next: 'التالي ←', ob_finish: 'إنهاء ←', ob_skip: 'تخطى', ob_skip_finish: 'تخطى وإنهاء',
    ob_building: 'جاري بناء ملفك الشخصي…', ob_building_sub: 'سوما تقرأ كل ما شاركته.',
    ob_allset: 'كل شيء جاهز ✨', ob_ready: 'لدى سوما كل ما تحتاجه. لنبدأ محادثتنا الحقيقية الأولى.', ob_meet: 'التعرف على سوما ←',
    ob_start_explore: 'ابدأ الاستكشاف →', ob_browse_sub: 'تصفح وتعرف على أشخاص وجرب كل شيء — لا يلزم التسجيل.',
    circle_remove: '✕ إزالة', circle_who: 'ما علاقتك بهم؟',
    circle_friend: 'صديق', circle_family: 'فرد من العائلة', circle_therapy: 'طبيب / معالج', circle_romantic: 'شريك عاطفي', circle_work: 'زميل عمل',
    circle_friend_s: 'صديق', circle_family_s: 'عائلة', circle_therapy_s: 'طبيب/معالج', circle_romantic_s: 'عاطفي', circle_work_s: 'عمل',
    type_friends: 'أصدقاء', type_family: 'عائلة', type_therapy: 'العلاج والدعم', type_romantic: 'عاطفي', type_work: 'عمل',
    nudge_title: '✦ فكرة رسالة', nudge_thinking: 'سوما تفكر…', nudge_send_on: 'إرسال عبر SOMA',
    nudge_copy: 'نسخ الرسالة', nudge_copied: '✓ تم النسخ!', nudge_retry: '↺ جرب أخرى', nudge_dismiss: 'إغلاق',
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
interface Memory { id: string; domain: DomainKey; content: string; createdAt: string; sentiment?: Sentiment; pinned?: boolean }
type WheelDomain = { score: number; note: string }
interface WheelAssessment { scores: Partial<Record<DomainKey, WheelDomain>>; overall: number; basis: number; at: string }
interface BondLog { date: string; note: string; xpGained: number }
interface BondJourneyData {
  xp: number
  completedQuests: string[]
  logs: BondLog[]
  startedAt: string
}
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
  therapistEmail?: string           // email to send reports to (therapy type only)
  shareReports?: boolean            // patient consent to share reports
  lastReportSent?: string           // ISO date of last report sent
  journey?: BondJourneyData         // gamified relationship journey
  somaUserId?: string               // Supabase user ID if they have a SOMA account
}
interface DiaryEntry { id: string; date: string; mood: string; summary: string; somaReply?: string }
interface InsightData {
  summary: string
  moodTrend: 'rising' | 'stable' | 'dipping'
  themes: string[]
  highlight: string
  tip: string
  note: string
  question: string
  circleAlert: string | null
}
interface RelPersonInsight {
  personId: string
  name: string
  summary: string           // 1-2 sentence status
  suggestion: string        // concrete next action
  sentiment: 'warm' | 'neutral' | 'distant'
}
interface RelInsightData {
  overallSummary: string    // 2-3 sentence overall relationship health narrative
  topPriority: string       // name of the person who needs most attention
  highlights: string[]      // 2-3 positive relationship moments this week
  people: RelPersonInsight[]
}
interface DailyCheckin {
  date: string          // ISO date "2026-06-15"
  mood: 1|2|3|4|5
  intention: string     // what they want to do today
  gratitude: string     // one thing they're grateful for
  completedAt: string   // ISO timestamp
}
interface Moment {
  id: string
  authorId: string      // 'me' or circle person id
  authorName: string
  type: 'photo' | 'video'
  mediaUrl: string      // data URL
  caption?: string
  postedAt: string      // ISO timestamp
  reactions?: string[]  // emoji array
}
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
  photo: string                // primary photo (data URL)
  photos: string[]             // gallery — up to 6 total (index 0 = primary)
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
interface RealMsg { id: string; fromMe: boolean; content: string; createdAt: string }
interface DateIdea {
  emoji: string
  title: string
  vibe: string    // "Cozy café · ~2 hrs · ~$20 each"
  why: string     // why it fits these two specifically
}
interface DatePlan {
  generatedAt: string
  ideas: DateIdea[]
  starter: string   // conversation starter for the actual date
}
interface Connection {
  id: string
  name: string; age: number; photo: string; color: string
  bio: string; loveLanguage: string; attachment: string
  messages: ChatMessage[]
  updatedAt: string
  matchScore: number
  datePlan?: DatePlan
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
    morningEnabled: boolean
    morningHour: number      // 0-23, default 8
    morningMinute: number    // 0-59, default 0
    diaryEnabled: boolean
    diaryHour: number        // 0-23, default 21
    diaryMinute: number      // 0-59, default 0
    moodEnabled: boolean
    moodHour: number         // 0-23, default 12
    moodMinute: number       // 0-59, default 0
    gratitudeEnabled: boolean
    gratitudeHour: number    // 0-23, default 21
    gratitudeMinute: number  // 0-59, default 0
    streakEnabled: boolean   // daily streak-protection nudge
    streakHour: number       // 0-23, default 19
    streakMinute: number     // 0-59, default 0
    matchAlertsEnabled: boolean  // server-push match alerts
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
  moodLogs?: { date: string; mood: 1|2|3|4|5; note?: string }[]  // daily mood check-ins
  insightCache?: { weekKey: string; data: InsightData }  // cached weekly insight
  relInsightCache?: { weekKey: string; data: RelInsightData }  // cached weekly relationship insight
  checkins?: DailyCheckin[]  // daily check-in ritual entries
  darkMode?: boolean
  domainGoals?: Partial<Record<DomainKey, { text: string; deadline: string; progress: number }>>
  profilePhoto?: string      // user's own avatar (data URL)
  profileBio?: string        // personal tagline / about me
  moments?: Moment[]         // circle moments (own + received)
}
type WheelSnapshot = { date: string; overall: number; scores: Partial<Record<DomainKey, number>> }

const FREE_DAILY_LIKES = 2
const PREMIUM_DAILY_LIKES = 5

const EMPTY_DATING: DatingProfile = {
  complete: false, age: '', location: '', photo: '', photos: [], bio: '',
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
        if (!p.dating.photos) p.dating.photos = p.dating.photo ? [p.dating.photo] : []
        if (p.premium === undefined) p.premium = false
        if (p.likesToday === undefined) { p.likesToday = 0; p.likesDate = '' }
        if (!p.connections) p.connections = []
        if (!p.likedYou) p.likedYou = []
        if (p.aiName === undefined) p.aiName = 'Soma'
        if (p.aiPhoto === undefined) p.aiPhoto = ''
        if (!p.trustedContact) p.trustedContact = { name: '', phone: '' }
        if (p.language === undefined) p.language = detectLang()
        if (!p.memories) p.memories = []
        if (!p.circle) p.circle = []
        if (!p.diary) p.diary = []
        if (p.conversations === undefined) p.conversations = 0
        return p
      }
    } catch {}
    return { name: '', registered: false, memories: [], circle: [], diary: [], conversations: 0, dating: { ...EMPTY_DATING }, premium: false, likesToday: 0, likesDate: '', connections: [], likedYou: [], aiName: 'Soma', aiPhoto: '', trustedContact: { name: '', phone: '' } }
  },
  save: (p: UserProfile) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); schedulePush() } catch {} },
  addMemory: (domain: DomainKey, content: string, sentiment: Sentiment = 'neutral') => {
    const p = DB.get()
    if (p.memories.some(m => m.content.toLowerCase() === content.toLowerCase())) return
    p.memories.unshift({ id: Date.now() + '' + Math.random(), domain, content, sentiment, createdAt: new Date().toLocaleDateString() })
    p.memories = p.memories.slice(0, 150); DB.save(p)
  },
  deleteMemory: (id: string) => {
    const p = DB.get(); p.memories = p.memories.filter(m => m.id !== id); DB.save(p)
  },
  pinMemory: (id: string, pinned: boolean) => {
    const p = DB.get(); const m = p.memories.find(m => m.id === id); if (m) { m.pinned = pinned; DB.save(p) }
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
  addDiary: (mood: string, summary: string, somaReply?: string) => {
    const p = DB.get()
    p.diary.unshift({ id: Date.now() + '', date: new Date().toLocaleDateString(), mood, summary, somaReply })
    DB.save(p)
  },
  patchDiaryReply: (id: string, somaReply: string) => {
    const p = DB.get()
    const entry = p.diary.find(d => d.id === id)
    if (entry) { entry.somaReply = somaReply; DB.save(p) }
  },
  // Circle: add/invite someone, accept invite, send direct message
  addCircle: (name: string, type: string, context?: string, somaUserId?: string) => {
    const p = DB.get()
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const id = `circle_${Date.now()}`
    p.circle.unshift({
      id, name, type: type as any, inviteCode: code, invitationStatus: 'active',
      relationship: type, context: context || '', sharedInterests: [], lastSeen: new Date().toLocaleDateString(),
      mentions: 0, messages: [], somaMessages: [], somaUserId
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
  removeCircle: (circleId: string) => {
    const p = DB.get()
    p.circle = p.circle.filter(x => x.id !== circleId)
    DB.save(p)
  },
  updateCirclePerson: (circleId: string, patch: Partial<CirclePerson>) => {
    const p = DB.get()
    const idx = p.circle.findIndex(x => x.id === circleId)
    if (idx >= 0) { p.circle[idx] = { ...p.circle[idx], ...patch }; DB.save(p) }
  },
  updateJourney: (circleId: string, journey: BondJourneyData) => {
    const p = DB.get()
    const idx = p.circle.findIndex(x => x.id === circleId)
    if (idx >= 0) { p.circle[idx].journey = journey; DB.save(p) }
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
  saveDatePlan: (id: string, plan: DatePlan) => {
    const p = DB.get()
    const c = p.connections.find(x => x.id === id)
    if (c) { c.datePlan = plan; DB.save(p) }
  },
  addLikedYou: (name: string) => {
    const p = DB.get()
    if (!p.likedYou.includes(name)) { p.likedYou.unshift(name); DB.save(p) }
  },
  setAiName: (name: string) => { const p = DB.get(); p.aiName = name.trim() || 'Soma'; DB.save(p) },
  setAiPhoto: (url: string) => { const p = DB.get(); p.aiPhoto = url; DB.save(p) },
  setProfilePhoto: (url: string) => { const p = DB.get(); p.profilePhoto = url; DB.save(p) },
  setProfileBio: (bio: string) => { const p = DB.get(); p.profileBio = bio.trim(); DB.save(p) },
  addMoment: (moment: Moment) => {
    const p = DB.get()
    p.moments = [moment, ...(p.moments || [])].slice(0, 200)
    DB.save(p)
  },
  addMomentReaction: (momentId: string, emoji: string) => {
    const p = DB.get()
    const m = (p.moments || []).find(x => x.id === momentId)
    if (m) { m.reactions = [...(m.reactions || []), emoji]; DB.save(p) }
  },
  todaysMoment: (): Moment | undefined => {
    const today = new Date().toISOString().slice(0, 10)
    return (DB.get().moments || []).find(m => m.authorId === 'me' && m.postedAt.slice(0, 10) === today)
  },
  setTrustedContact: (name: string, phone: string) => { const p = DB.get(); p.trustedContact = { name, phone }; DB.save(p) },
  setWheel: (wheel: WheelAssessment) => { const p = DB.get(); p.wheel = wheel; DB.save(p) },
  setLanguage: (code: string) => { const p = DB.get(); p.language = code; p.languageChosen = true; p.wheel = undefined; DB.save(p) },
  setManualScore: (domain: DomainKey, value: number | undefined) => {
    const p = DB.get(); const ms: any = { ...(p.manualScores || {}) }
    if (value === undefined) delete ms[domain]; else ms[domain] = value
    p.manualScores = ms; DB.save(p)
  },
  setDomainGoal: (domain: DomainKey, goal: { text: string; deadline: string; progress: number } | null) => {
    const p = DB.get(); const goals: any = { ...(p.domainGoals || {}) }
    if (goal === null) delete goals[domain]; else goals[domain] = goal
    p.domainGoals = goals; DB.save(p)
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
  setInsight: (weekKey: string, data: InsightData) => {
    const p = DB.get(); p.insightCache = { weekKey, data }; DB.save(p)
  },
  setRelInsight: (weekKey: string, data: RelInsightData) => {
    const p = DB.get(); p.relInsightCache = { weekKey, data }; DB.save(p)
  },
  addCheckin: (checkin: DailyCheckin) => {
    const p = DB.get()
    const existing = p.checkins || []
    const filtered = existing.filter(c => c.date !== checkin.date)
    p.checkins = [checkin, ...filtered].slice(0, 90)
    DB.save(p)
  },
  setDarkMode: (dark: boolean) => {
    const p = DB.get(); p.darkMode = dark; DB.save(p)
  },
  addMoodLog: (mood: 1|2|3|4|5, note?: string) => {
    const p = DB.get()
    const today = new Date().toISOString().slice(0, 10)
    const logs = (p.moodLogs || []).filter(l => l.date !== today)
    logs.unshift({ date: today, mood, note })
    p.moodLogs = logs.slice(0, 365)
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
      await Notifications.setNotificationChannelAsync('soma-matches', {
        name: 'Matches & Messages',
        importance: Notifications.AndroidImportance.MAX,
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

// Register device push token with backend so the server can send notifications
async function registerPushToken(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const granted = await requestNotifPermission()
    if (!granted) return
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: 'c293f20f-f4a1-4779-9b31-2024df021e33',
    })
    if (!token || !auth.getToken()) return
    fetch(`${BACKEND_URL}/notifications/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.getToken()}` },
      body: JSON.stringify({ token }),
    }).catch(() => {})
  } catch {}
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
    "I waited all day. Just one minute? 👀",
    "Your streak won't grow on its own 🔥",
    "Soma's been thinking about you. Come check in 💜",
    "You opened me yesterday. Don't let that be the last time 😤",
    "Something good happened today. Write it down before you forget ✨",
    "30 seconds of gratitude = better sleep. Science. Trust me 🌙",
    "You've come so far. Don't stop now 🏆",
  ]
  const pool = messages.length >= 7 ? messages : fallback
  const titles = [
    "Don't ghost me 👀",
    "Your streak is at risk 🔥",
    "I missed you today 💜",
    "You were so close 😤",
    "Don't let today slip away ✨",
    "One good thing. That's it. 🌙",
    "You're on a roll — keep it 🏆",
  ]
  for (let weekday = 1; weekday <= 7; weekday++) {
    const body = pool[(weekday - 1) % pool.length]
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `gratitude_w${weekday}`,
        content: {
          title: titles[(weekday - 1) % titles.length],
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

async function syncMorningNotification(hour: number, minute: number, enabled: boolean, name: string, aiName: string) {
  await cancelNotifsByPrefix('morning_')
  if (!enabled || Platform.OS === 'web') return
  const bodies = [
    `${name}, don't let the day start without checking in 👀`,
    `${aiName} saved your spot. Are you coming or not? 🔥`,
    `New day. New chance. ${name}, let's go 💜`,
    `You did it yesterday. Do it again. One tap, ${name} ⚡`,
    `${aiName} is ready. The question is: are you? 🌅`,
    `${name}, your morning routine called. It wants you back 😤`,
    `Rise and check in, ${name}. Your streak is watching 🏆`,
  ]
  const titles = [
    `${name}, don't start without me 🌅`,
    `Your streak needs you 🔥`,
    `Good morning, ${name} 💜`,
    `One tap. That's all. ⚡`,
    `${aiName} is waiting 👀`,
    `Don't make me send another one 😤`,
    `Your day starts here 🏆`,
  ]
  for (let weekday = 1; weekday <= 7; weekday++) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `morning_w${weekday}`,
        content: {
          title: titles[(weekday - 1) % titles.length],
          body: bodies[(weekday - 1) % bodies.length],
          data: { screen: 'home' },
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: 'soma-reminders',
        },
      })
    } catch {}
  }
}

async function syncDiaryNotification(hour: number, minute: number, enabled: boolean, name: string) {
  await cancelNotifsByPrefix('diary_')
  if (!enabled || Platform.OS === 'web') return
  const bodies = [
    `${name}, today happened. Write it down before you forget 👀`,
    `Your future self wants to know what today felt like 📖`,
    `${name} didn't write yesterday either. Let's not make it a habit 😤`,
    `2 minutes. That's all I'm asking, ${name} ✍️`,
    `Today had something in it worth keeping. I can feel it 🌙`,
    `${name}, the blank page is waiting. Don't leave it empty 💜`,
    `Your streak grows one entry at a time. This is that entry 🔥`,
  ]
  const titles = [
    `${name}, don't let today disappear 👀`,
    `Your diary is lonely 📖`,
    `I waited all evening 😤`,
    `2 minutes. You have them. ✍️`,
    `Something happened today 🌙`,
    `${name}, the page is blank 💜`,
    `Streak on the line 🔥`,
  ]
  for (let weekday = 1; weekday <= 7; weekday++) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `diary_w${weekday}`,
        content: {
          title: titles[(weekday - 1) % titles.length],
          body: bodies[(weekday - 1) % bodies.length],
          data: { screen: 'diary' },
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: 'soma-reminders',
        },
      })
    } catch {}
  }
}

async function syncMoodNotification(hour: number, minute: number, enabled: boolean, name: string) {
  await cancelNotifsByPrefix('mood_')
  if (!enabled || Platform.OS === 'web') return
  const bodies = [
    `Hey ${name}, quick check — how are you actually feeling right now? 💭`,
    `${name}, one emoji is enough. How's your day been? 😊`,
    `Check in with yourself for a moment, ${name}. How are you? 🌱`,
    `Your mood logged = your future self says thanks 📈`,
    `${name}, rate your day before it disappears. Take 5 seconds 🎯`,
    `Happiness or struggle — both are worth logging today 💜`,
    `How are you *really* doing today, ${name}? ✨`,
  ]
  const titles = [
    `Mood check-in 💭`, `How are you today? 😊`, `A second for yourself 🌱`,
    `Log your mood 📈`, `Quick check-in 🎯`, `How's today? 💜`, `${name}, check in ✨`,
  ]
  for (let weekday = 1; weekday <= 7; weekday++) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `mood_w${weekday}`,
        content: {
          title: titles[(weekday - 1) % titles.length],
          body: bodies[(weekday - 1) % bodies.length],
          data: { screen: 'home' },
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: 'soma-reminders',
        },
      })
    } catch {}
  }
}

async function syncStreakNotification(hour: number, minute: number, enabled: boolean, name: string) {
  await cancelNotifsByPrefix('streak_')
  if (!enabled || Platform.OS === 'web') return
  const bodies = [
    `Don't let it slip, ${name}! Log something today to protect your streak 🔥`,
    `Your streak is counting on you. One quick check-in is all it takes 🔥`,
    `${name}, your streak is still alive — keep it that way tonight 💪`,
    `One log a day keeps the streak in play, ${name} 🔥`,
    `Your streak needs you. 30 seconds. That's it 🌱`,
    `End the day strong, ${name}. Log before midnight 🔥`,
    `Don't break the chain! Check in with ${name === 'friend' ? 'Soma' : 'Soma'} tonight 💜`,
  ]
  for (let weekday = 1; weekday <= 7; weekday++) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `streak_w${weekday}`,
        content: {
          title: '🔥 Protect your streak',
          body: bodies[(weekday - 1) % bodies.length],
          data: { screen: 'home' },
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.WEEKLY,
          weekday,
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
  profile.moodLogs?.forEach(e => { if (e.date) days.add(e.date.slice(0, 10)) })
  let streak = 0
  const d = new Date()
  while (days.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

function calcTypeStreak(dates: string[]): number {
  const days = new Set(dates.map(d => d.slice(0, 10)))
  let streak = 0; const d = new Date()
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
      `You are ${aiName}, a warm but slightly passive-aggressive AI companion — think Duolingo's owl energy. You write short, punchy push notification copy that makes people feel guilty for not opening the app, while also feeling genuinely cared for. Max 85 chars per message. Heavy emoji use. Direct, personal, never generic.`, 500, 0.95)
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
    // No tokens yet — user must verify email first
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
    if (!res.ok) {
      const err: any = new Error(data.error || 'Login failed')
      err.needsVerification = data.needsVerification
      err.email = data.email
      throw err
    }
    auth.saveTokens(data.accessToken, data.refreshToken)
    return data
  },
  // Resend verification email
  resendVerification: async (email: string) => {
    const res = await fetch(`${BACKEND_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Could not resend')
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
  // Delete account from backend (required for App Store)
  deleteAccount: async () => {
    const token = auth.getToken()
    if (!token) return
    const res = await fetch(`${BACKEND_URL}/auth/account`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Delete failed')
    }
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
  userId: string; name: string; age: number; photo: string; photos: string[]; bio: string
  interests: string[]; values: string[]; loveLanguage: string; attachment: string
  work: string; city: string; distanceKm: number; compatibility: number
}

// ── CLOUD SYNC ────────────────────────────────────────────────
const cloudSync = {
  enabled: () => !!auth.getToken() && !!BACKEND_URL && !BACKEND_URL.includes('localhost'),

  // Push local profile to cloud
  push: async () => {
    if (!cloudSync.enabled()) return
    try {
      const profile = DB.get()
      await fetch(`${BACKEND_URL}/profile/sync`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.getToken()}` },
        body: JSON.stringify(profile),
      })
    } catch {}
  },

  // Pull cloud profile and merge into localStorage (cloud wins)
  pull: async (): Promise<boolean> => {
    if (!cloudSync.enabled()) return false
    try {
      const res = await fetch(`${BACKEND_URL}/profile/sync`, {
        headers: { Authorization: `Bearer ${auth.getToken()}` },
      })
      if (!res.ok) return false
      const { profile: row } = await res.json()
      if (!row || !row.data) return false

      // Merge: restore cloud data but keep registered=true and current tokens
      const local = DB.get()
      const merged = {
        ...row.data,
        registered: true,
        name: row.name || row.data.name || local.name,
        language: row.language || row.data.language || local.language,
      }
      localStorage.setItem('soma_profile', JSON.stringify(merged))
      return true
    } catch {
      return false
    }
  },
}

// Debounced auto-push after any DB write
let _syncTimer: ReturnType<typeof setTimeout> | null = null
const schedulePush = () => {
  if (!cloudSync.enabled()) return
  if (_syncTimer) clearTimeout(_syncTimer)
  _syncTimer = setTimeout(() => { cloudSync.push() }, 4000)
}

const datingApi = {
  authed: () => !!auth.getToken() && !!BACKEND_URL && !BACKEND_URL.includes('localhost'),

  saveProfile: async (p: UserProfile, loc: { lat: number; lng: number } | null) => {
    const d = p.dating
    const res = await fetch(`${BACKEND_URL}/dating/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.getToken()}` },
      body: JSON.stringify({
        name: p.name, age: Number(d.age) || null, photo: d.photo,
        photos: d.photos?.length ? d.photos : (d.photo ? [d.photo] : []),
        bio: d.bio, interests: d.interests, values: d.relationshipValues,
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

  chat: {
    myId: (): string | null => {
      try {
        const token = auth.getToken()
        if (!token) return null
        return JSON.parse(atob(token.split('.')[1])).userId || null
      } catch { return null }
    },
    messages: async (otherId: string): Promise<RealMsg[]> => {
      const res = await fetch(`${BACKEND_URL}/chat/${otherId}`, {
        headers: { Authorization: `Bearer ${auth.getToken()}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fetch failed')
      const me = datingApi.chat.myId()
      return (data.messages || []).map((m: any) => ({
        id: m.id, fromMe: m.from_user_id === me,
        content: m.content, createdAt: m.created_at,
      }))
    },
    send: async (otherId: string, content: string): Promise<void> => {
      const res = await fetch(`${BACKEND_URL}/chat/${otherId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.getToken()}` },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Send failed')
    },
    markRead: (otherId: string) => {
      fetch(`${BACKEND_URL}/chat/${otherId}/read`, {
        method: 'PUT', headers: { Authorization: `Bearer ${auth.getToken()}` },
      }).catch(() => {})
    },
    unread: async (): Promise<Record<string, number>> => {
      const res = await fetch(`${BACKEND_URL}/chat/unread`, {
        headers: { Authorization: `Bearer ${auth.getToken()}` },
      })
      const data = await res.json()
      return data.unread || {}
    },
  },
}

// ════════════════════════════════════════════════════════════
// REVENUECAT — real subscriptions (safe wrapper, no-op on web/Expo Go)
// ════════════════════════════════════════════════════════════
const RC_IOS_KEY     = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? ''
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? ''

let _RC: any = null
try { _RC = require('react-native-purchases').default } catch {}

const purchaseApi = {
  // True only when native module is loaded AND API key is set
  configured: () => Platform.OS !== 'web' && !!_RC && !!(Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY),

  init: () => {
    if (!purchaseApi.configured()) return
    try {
      _RC.configure({ apiKey: Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY })
    } catch {}
  },

  // Returns true if user has active 'premium' entitlement — used on launch to sync
  syncPremium: async (): Promise<boolean> => {
    if (!purchaseApi.configured()) return false
    try {
      const info = await _RC.getCustomerInfo()
      return !!info.entitlements.active['premium']
    } catch { return false }
  },

  // Returns the monthly offering with real price from App Store / Play Store
  getOffering: async (): Promise<{ price: string; pkg: any } | null> => {
    if (!purchaseApi.configured()) return null
    try {
      const offerings = await _RC.getOfferings()
      const pkg = offerings.current?.monthly
      if (!pkg) return null
      return { price: pkg.product.priceString, pkg }
    } catch { return null }
  },

  // Returns both monthly and annual packages for the paywall toggle
  getOfferings: async (): Promise<{ monthly: { price: string; pkg: any } | null; annual: { price: string; pkg: any } | null }> => {
    if (!purchaseApi.configured()) return { monthly: null, annual: null }
    try {
      const offerings = await _RC.getOfferings()
      const cur = offerings.current
      const mo = cur?.monthly
      const yr = cur?.annual
      return {
        monthly: mo ? { price: mo.product.priceString, pkg: mo } : null,
        annual: yr ? { price: yr.product.priceString, pkg: yr } : null,
      }
    } catch { return { monthly: null, annual: null } }
  },

  purchase: async (pkg: any): Promise<boolean> => {
    try {
      const { customerInfo } = await _RC.purchasePackage(pkg)
      return !!customerInfo.entitlements.active['premium']
    } catch (e: any) {
      if (e.userCancelled) return false
      throw e
    }
  },

  restore: async (): Promise<boolean> => {
    if (!purchaseApi.configured()) return false
    try {
      const info = await _RC.restorePurchases()
      return !!info.entitlements.active['premium']
    } catch { return false }
  },
}

// Map a real backend user into the Candidate card shape used by the UI
function nearbyToCandidate(u: NearbyUser): Candidate & { realUserId: string } {
  const hasProfile = !!(u.bio || u.age)
  return {
    realUserId: u.userId,
    name: u.name, age: u.age || 0, emoji: '💜', color: '#7B6EF6',
    photo: u.photo || '', photos: u.photos?.length ? u.photos : (u.photo ? [u.photo] : []),
    location: u.city || (u.distanceKm != null ? 'Nearby' : 'On SOMA'),
    distance: u.distanceKm != null ? `${u.distanceKm} km` : '',
    height: '', weight: '',
    bio: u.bio || (hasProfile ? '' : '✨ Just joined SOMA — profile coming soon.'),
    values: u.values || [], interests: u.interests || [],
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
  const timer = setTimeout(() => ctrl.abort(), 25000)
  try {
    const res = await fetch(`${BACKEND_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system, maxTokens, temperature }),
      signal: ctrl.signal,
    })
    if (!res.ok) { console.warn('[groq] HTTP', res.status, await res.text().catch(() => '')); return '' }
    const d = await res.json()
    return d.content ?? ''
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

const LANG_CODES: Record<string, string> = {
  en: 'en-US', ru: 'ru-RU', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
  it: 'it-IT', pt: 'pt-BR', vi: 'vi-VN', zh: 'zh-CN', ja: 'ja-JP', ar: 'ar-SA',
}

function listen(
  onResult: (t: string) => void,
  onEnd: () => void,
  onInterim?: (t: string) => void,
): () => void {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) { alert('Voice requires Chrome or Safari'); onEnd(); return () => {} }
  const lang = DB.get().language || 'en'
  const r = new SR()
  r.lang = LANG_CODES[lang] || 'en-US'
  r.continuous = true       // keep listening through natural pauses
  r.interimResults = true   // fire onresult while speaking, not just at end
  r.maxAlternatives = 1

  let finalText = ''
  let ended = false

  r.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const seg = e.results[i][0].transcript
      if (e.results[i].isFinal) finalText += seg + ' '
      else interim += seg
    }
    if (onInterim) onInterim((finalText + interim).trim())
  }

  r.onend = () => {
    if (ended) return
    ended = true
    onResult(finalText.trim())
    onEnd()
  }

  r.onerror = (e: any) => {
    if (ended) return
    ended = true
    if (e.error !== 'no-speech' && e.error !== 'aborted') onResult(finalText.trim())
    onEnd()
  }

  r.start()
  return () => { try { r.stop() } catch {} }
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
type Screen = 'splash' | 'language' | 'onboarding' | 'try' | 'register' | 'home' | 'aura' | 'diary' | 'circle' | 'lifebalance' | 'meetpeople' | 'myprofile' | 'synergy' | 'connections' | 'likedyou' | 'diaryhistory' | 'insights' | 'settings' | 'login' | 'forgotpassword' | 'resetpassword' | 'verifyemail' | 'gratitude' | 'loveyourself' | 'medication' | 'therapy' | 'healthhub' | 'moodanalytics' | 'breathing' | 'memories' | 'asksoma' | 'timeline' | 'bondjourney' | 'relinsights' | 'checkin'

// ════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [profile, setProfile] = useState<UserProfile>(DB.get())
  const [fromOnboarding, setFromOnboarding] = useState(false)
  const [bondPersonId, setBondPersonId] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [verifyToken, setVerifyToken] = useState<string | null>(null)
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null)
  const [pendingAddCode, setPendingAddCode] = useState<string | null>(null)
  const screenStack = useRef<Screen[]>([])
  const slideAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
  const dark = profile.darkMode ?? false
  const themeVal = { t: dark ? DARK_THEME : LIGHT_THEME, dark }
  const refresh = () => setProfile(DB.get())

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    document.title = 'Soma — Your AI Life Companion'
    if (!document.querySelector('link[data-soma-font]')) {
      const pre1 = document.createElement('link'); pre1.rel = 'preconnect'; pre1.href = 'https://fonts.googleapis.com'; document.head.appendChild(pre1)
      const pre2 = document.createElement('link'); pre2.rel = 'preconnect'; pre2.href = 'https://fonts.gstatic.com'; pre2.crossOrigin = 'anonymous'; document.head.appendChild(pre2)
      const font = document.createElement('link'); font.rel = 'stylesheet'; font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'; font.setAttribute('data-soma-font', '1'); document.head.appendChild(font)
    }
    if (!document.getElementById('soma-web-styles')) {
      const s = document.createElement('style'); s.id = 'soma-web-styles'
      // viewport-fit=cover for safe area on notched phones
      const vp = document.querySelector('meta[name="viewport"]')
      if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover')
      s.textContent = `
        @font-face{font-family:'Ionicons';src:url('/Ionicons.ttf') format('truetype');font-weight:normal;font-style:normal;font-display:block}
        *{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        html,body{overflow-x:hidden!important;width:100%!important;max-width:100vw!important}
        ::-webkit-scrollbar{display:none}*{scrollbar-width:none}
        [data-focusable="true"]{transition:transform .12s cubic-bezier(.25,.46,.45,.94),opacity .12s ease}
        [data-focusable="true"]:hover{opacity:.88}
        [data-focusable="true"]:active{transform:scale(.96)!important;opacity:.75}
        input,textarea{font-size:16px!important}
        .tab-bar-safe{padding-bottom:max(16px,env(safe-area-inset-bottom))!important}
        @media(min-width:600px){body{display:flex!important;justify-content:center;background:radial-gradient(ellipse at 50% -20%,#1e0f5e 0%,#090618 70%)!important;overflow:hidden!important}#root{max-width:430px;width:100%;flex:none!important;box-shadow:0 0 140px rgba(123,110,246,.22),0 0 0 1px rgba(123,110,246,.1)}}
      `
      document.head.appendChild(s)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search)
      // Check for password reset token
      const rt = params.get('reset')
      if (rt) {
        setResetToken(rt)
        window.history.replaceState({}, '', window.location.pathname)
        setScreen('resetpassword')
        return
      }
      // Check for email verification token
      const vt = params.get('verify')
      if (vt) {
        setVerifyToken(vt)
        window.history.replaceState({}, '', window.location.pathname)
        setScreen('verifyemail')
        return
      }
      // Check for add-to-circle invite link: ?add=CODE
      const addCode = params.get('add')
      if (addCode) {
        setPendingAddCode(addCode)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    // Init RevenueCat and sync premium status from the store
    purchaseApi.init()
    purchaseApi.syncPremium().then(active => {
      if (active && !DB.get().premium) { DB.goPremium(); refresh() }
    })

    // If user is already logged in, pull latest cloud data before routing
    const token = auth.getToken()
    const startupSync = token
      ? cloudSync.pull().then(pulled => { if (pulled) refresh() }).catch(() => {})
      : Promise.resolve()

    const t = setTimeout(() => {
      startupSync.finally(() => {
        const p = DB.get()
        setScreen(!p.languageChosen ? 'language' : !p.onboarding ? 'onboarding' : 'home')
      })
    }, 1900)
    return () => clearTimeout(t)
  }, [])

  // Handle ?add=CODE deep link — go to circle after splash
  useEffect(() => {
    if (pendingAddCode && screen === 'home') {
      go('circle')
    }
  }, [pendingAddCode, screen])

  // Seed "who liked you" once registered (3 people liked you first)
  useEffect(() => {
    const p = DB.get()
    if (p.registered && p.likedYou.length === 0) {
      ['Mai', 'Daniel', 'Sofia'].forEach(n => DB.addLikedYou(n))
      refresh()
    }
    // Register push token whenever user is logged in
    if (p.registered && datingApi.authed()) registerPushToken()
  }, [profile.registered])

  // Navigate to right screen when user taps a push notification
  useEffect(() => {
    // App already open — foreground notification tap
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any
      if (data?.screen === 'connections') go('connections')
    })
    // App opened from a notification (was closed/background)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return
      const data = response.notification.request.content.data as any
      if (data?.screen === 'connections') setTimeout(() => go('connections'), 500)
    })
    return () => sub.remove()
  }, [])

  // Sync local notifications whenever relevant profile data changes
  useEffect(() => {
    const ns = profile.notifSettings
    if (!ns?.enabled) {
      cancelNotifsByPrefix('med_')
      cancelNotifsByPrefix('morning_')
      cancelNotifsByPrefix('diary_')
      cancelNotifsByPrefix('gratitude_')
      cancelNotifsByPrefix('mood_')
      cancelNotifsByPrefix('streak_')
      return
    }
    const name = profile.name || 'friend'
    const aiName = profile.aiName || 'Soma'
    syncMedNotifications(profile.medications || [], ns.medReminders)
    syncMorningNotification(ns.morningHour ?? 8, ns.morningMinute ?? 0, ns.morningEnabled ?? false, name, aiName)
    syncDiaryNotification(ns.diaryHour ?? 21, ns.diaryMinute ?? 0, ns.diaryEnabled ?? false, name)
    syncMoodNotification(ns.moodHour ?? 12, ns.moodMinute ?? 0, ns.moodEnabled ?? false, name)
    syncStreakNotification(ns.streakHour ?? 19, ns.streakMinute ?? 0, ns.streakEnabled ?? false, name)
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

  const animateIn = (fromRight: boolean) => {
    const w = typeof window !== 'undefined' ? window.innerWidth * 0.18 : 80
    slideAnim.setValue(fromRight ? w : -w)
    fadeAnim.setValue(0)
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]).start()
  }

  const go = (s: Screen) => {
    refresh()
    screenStack.current.push(screen)
    if (typeof window !== 'undefined') window.history.pushState({ idx: screenStack.current.length }, '', window.location.pathname)
    animateIn(true)
    setScreen(s)
  }

  useEffect(() => {
    const handler = () => {
      if (screenStack.current.length > 0) {
        const prev = screenStack.current.pop()!
        setProfile(DB.get())
        animateIn(false)
        setScreen(prev)
      }
    }
    if (typeof window !== 'undefined') window.addEventListener('popstate', handler)
    return () => { if (typeof window !== 'undefined') window.removeEventListener('popstate', handler) }
  }, [])

  const inner = (() => {
    if (screen === 'splash')      return <Splash />
    if (screen === 'language')    return <LanguageSelect onDone={() => go('onboarding')} />
    if (screen === 'onboarding')  return <Onboarding onDone={() => { go('home') }} onBrowse={() => { const p = DB.get(); p.onboarding = { focusDomains: [] } as any; DB.save(p); go('meetpeople') }} onSignIn={() => go('register')} />
    if (screen === 'try')         return <AuraChat mode="try" profile={profile} onRefresh={refresh} onDone={() => go('register')} title="Meet Soma" autoStart={fromOnboarding} />
    if (screen === 'register')    return (
      <RegisterBoundary fallback={<RegisterFallback onDone={(name) => { go('login') }} />}>
        <Register onDone={(name) => { auth.getToken() ? go('login') : go('home') }} onSignIn={() => go('login')} />
      </RegisterBoundary>
    )
    if (screen === 'login')       return <LoginScreen onDone={(name) => { go('home') }} onRegister={() => go('register')} onForgot={() => go('forgotpassword')} />
    if (screen === 'forgotpassword') return <ForgotPasswordScreen onBack={() => go('login')} />
    if (screen === 'resetpassword' && resetToken) return <ResetPasswordScreen token={resetToken} onDone={() => go('login')} />
    if (screen === 'verifyemail' && verifyToken) return <VerifyEmailScreen token={verifyToken} onDone={() => { refresh(); go('home') }} />
    if (screen === 'aura')        return <AuraChat mode="full" profile={profile} onRefresh={refresh} onDone={() => go('home')} title="Soma" />
    if (screen === 'diary')       return <AuraChat mode="diary" profile={profile} onRefresh={refresh} onDone={() => go('home')} title="Today's Diary" isDiary />
    if (screen === 'circle')      return <CircleScreen profile={profile} onBack={() => { setPendingAddCode(null); go('home') }} onStartJourney={(id) => { setBondPersonId(id); go('bondjourney') }} onViewInsights={() => go('relinsights')} onRefresh={refresh} initialFindCode={pendingAddCode} />
    if (screen === 'bondjourney' && bondPersonId) {
      const bp = profile.circle.find(p => p.id === bondPersonId)
      if (bp) return <BondJourney person={bp} profile={profile} onBack={() => go('circle')} onRefresh={refresh} />
    }
    if (screen === 'lifebalance') return <LifeBalance profile={profile} onBack={() => go('home')} />
    if (screen === 'meetpeople')  return <MeetPeople profile={profile} onBack={() => go('home')} onMyProfile={() => go('myprofile')} onSynergy={() => go('synergy')} onRegister={() => go('register')} />
    if (screen === 'myprofile')   return <MyProfile profile={profile} onBack={() => go('meetpeople')} />
    if (screen === 'synergy')     return <SynergyScan profile={profile} onBack={() => go('meetpeople')} />
    if (screen === 'connections') return <Connections profile={profile} onBack={() => go('home')} onRefresh={refresh} />
    if (screen === 'likedyou')    return <LikedYou profile={profile} onBack={() => go('home')} onUpgrade={() => { DB.goPremium(); refresh() }} />
    if (screen === 'diaryhistory')return <DiaryHistory profile={profile} onBack={() => go('home')} />
    if (screen === 'insights')    return <Insights profile={profile} onBack={() => go('home')} />
    if (screen === 'relinsights') return <RelationshipInsights profile={profile} onBack={() => go('circle')} onRefresh={refresh} onStartJourney={(id) => { setBondPersonId(id); go('bondjourney') }} />
    if (screen === 'checkin')     return <DailyCheckinScreen profile={profile} onDone={() => { refresh(); go('home') }} onBack={() => go('home')} />
    if (screen === 'settings')    return <Settings profile={profile} onBack={() => go('home')} onRefresh={refresh} onReset={() => { DB.reset(); go('language') }} onToggleDark={() => { DB.setDarkMode(!dark); refresh() }} onMemories={() => go('memories')} onSignIn={() => go('login')} />
    if (screen === 'gratitude')   return <ThankfulDiary profile={profile} onBack={() => go('home')} onRefresh={refresh} />
    if (screen === 'loveyourself')return <LoveYourself profile={profile} onBack={() => go('home')} onRefresh={refresh} />
    if (screen === 'medication')    return <MedicationTracker profile={profile} onBack={() => go('healthhub')} onRefresh={refresh} />
    if (screen === 'therapy')       return <TherapyConnect profile={profile} onBack={() => go('home')} onRefresh={refresh} />
    if (screen === 'healthhub')     return <HealthHub profile={profile} onBack={() => go('home')} onRefresh={refresh} onMedication={() => go('medication')} onBreathing={() => go('breathing')} />
    if (screen === 'moodanalytics') return <MoodAnalytics profile={profile} onBack={() => go('home')} />
    if (screen === 'breathing')     return <BreathingExercise onBack={() => go('healthhub')} />
    if (screen === 'memories')      return <MemoryManager profile={profile} onBack={() => go('settings')} onRefresh={refresh} />
    if (screen === 'asksoma')       return <AskSomaScreen profile={profile} onBack={() => go('home')} />
    if (screen === 'timeline')      return <LifeTimeline profile={profile} onBack={() => go('home')} />
    return <MainTabs profile={profile} go={go} onReset={() => { DB.reset(); go('language') }} />
  })()

  return (
    <ThemeCtx.Provider value={themeVal}>
      <View style={{ flex: 1, backgroundColor: themeVal.t.bg }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
          {inner}
        </Animated.View>
      </View>
    </ThemeCtx.Provider>
  )
}

// ── SPLASH ─────────────────────────────────────────────────
// First-run language picker — choose before talking with Soma.
function LanguageSelect({ onDone }: { onDone: () => void }) {
  const [selected, setSelected] = useState(DB.get().language || 'en')

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0A2E' }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 64 : 48, paddingHorizontal: 20, paddingBottom: 140 }}>
        {/* Logo + title */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <Image source={require('./assets/icon.png')} style={{ width: 80, height: 80, borderRadius: 24, marginBottom: 18 }} />
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.5 }}>SOMA</Text>
          <Text style={{ fontSize: 14, color: '#7B6EF6', fontWeight: '700', textAlign: 'center', marginTop: 6, letterSpacing: 0.3 }}>
            Know yourself before knowing each other
          </Text>
        </View>

        <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 6 }}>Choose your language</Text>
        <Text style={{ fontSize: 14, color: '#6B68A0', textAlign: 'center', marginBottom: 24 }}>Select the language you prefer</Text>

        <View style={{ gap: 10 }}>
          {LANGS.map(l => {
            const on = selected === l.code
            return (
              <TouchableOpacity
                key={l.code}
                activeOpacity={0.8}
                onPress={() => setSelected(l.code)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: on ? 'rgba(123,110,246,0.2)' : 'rgba(255,255,255,0.06)',
                  borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14,
                  borderWidth: 1.5, borderColor: on ? '#7B6EF6' : 'rgba(255,255,255,0.1)',
                }}
              >
                <Text style={{ fontSize: 28, marginRight: 14 }}>{l.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#A89BFA' : '#E8E5FF' }}>{l.label}</Text>
                  <Text style={{ fontSize: 13, color: '#6B68A0', marginTop: 2 }}>{l.name}</Text>
                </View>
                {on && <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>✓</Text>
                </View>}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Continue button */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 44 : 28, paddingTop: 16, backgroundColor: '#0F0A2E' }}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => { DB.setLanguage(selected); onDone() }}
          style={{ height: 56, borderRadius: 28, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>Continue →</Text>
        </TouchableOpacity>
      </View>
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

function Onboarding({ onDone, onBrowse, onSignIn }: { onDone: () => void; onBrowse?: () => void; onSignIn?: () => void }) {
  // phase: 0=welcome, 1-3=voice interview, 4=processing, 5=done
  const { width: screenW } = useWindowDimensions()
  const [phase, setPhase] = useState(0)
  const [userName, setUserName] = useState('')
  const [answers, setAnswers] = useState(['', '', ''])
  const [listening, setListening] = useState(false)
  const [somaThinking, setSomaThinking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [profileSummary, setProfileSummary] = useState('')
  const [profilePhotoUri, setProfilePhotoUri] = useState('')
  const [sectionConvo, setSectionConvo] = useState<{role:'soma'|'user', text:string}[]>([])
  const [somaGenerating, setSomaGenerating] = useState(false)
  const [followUpCount, setFollowUpCount] = useState(0)
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const stopListeningRef = useRef<(() => void) | null>(null)
  const sectionConvoRef = useRef<{role:'soma'|'user', text:string}[]>([])
  const convoScrollRef = useRef<ScrollView>(null)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const micAnim = useRef(new Animated.Value(1)).current

  const QUESTIONS = [t('ob_q1'), t('ob_q2'), t('ob_q3')]
  const COLORS = ['#4CAF7D', '#7B6EF6', '#F59E0B']
  const LABELS = [t('ob_physical_self'), t('ob_social_self'), t('ob_inner_self')]

  const fadeTransition = (cb: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      cb()
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
    })
  }

  // Pulse animation for mic button while recording
  useEffect(() => {
    if (listening) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(micAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(micAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]))
      loop.start()
      return () => loop.stop()
    } else {
      micAnim.setValue(1)
    }
  }, [listening])

  // Soma avatar pulse when speaking
  useEffect(() => {
    if (somaThinking) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]))
      loop.start()
      return () => loop.stop()
    } else {
      pulseAnim.setValue(1)
    }
  }, [somaThinking])

  // Init conversation and speak question when entering a phase
  useEffect(() => {
    if (phase >= 1 && phase <= 3) {
      const q = QUESTIONS[phase - 1]
      const initial = [{role: 'soma' as const, text: q}]
      setSectionConvo(initial)
      sectionConvoRef.current = initial
      setFollowUpCount(0)
      setSomaGenerating(false)
      setTranscript('')
      setSomaThinking(true)
      speak(q)
      const ms = Math.min(q.length * 55, 8000)
      const timer = setTimeout(() => setSomaThinking(false), ms)
      return () => clearTimeout(timer)
    }
  }, [phase])

  const startListening = () => {
    if (listening) {
      stopListeningRef.current?.()
      return
    }
    // Cancel TTS so it doesn't get picked up by the mic
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setTranscript('')
    setListening(true)
    setTimeout(() => {
      const stop = listen(
        (text) => { setTranscript(text); setListening(false) },
        () => setListening(false),
        (interim) => setTranscript(interim),
      )
      stopListeningRef.current = stop
    }, 300)
  }

  const submitAnswer = async () => {
    const text = transcript.trim()
    if (!text || somaGenerating) return
    stopListeningRef.current?.()
    setListening(false)
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setTranscript('')

    const newConvo = [...sectionConvoRef.current, {role: 'user' as const, text}]
    setSectionConvo(newConvo)
    sectionConvoRef.current = newConvo
    setTimeout(() => convoScrollRef.current?.scrollToEnd({ animated: true }), 100)

    setSomaGenerating(true)
    try {
      const sectionContexts = [
        'physical self — age, height, weight, health, physical appearance and lifestyle',
        'social world — work, career, family, friends, relationships, romantic life',
        'inner self — values, goals, fears, dreams, what they want to grow or change',
      ]
      let reply: string
      if (followUpCount < 1) {
        const prompt = `You are Soma, a warm life-coaching AI doing a brief onboarding interview.
Section topic: ${sectionContexts[phase - 1]}
Conversation so far:
${newConvo.map(m => `${m.role === 'soma' ? 'Soma' : 'User'}: ${m.text}`).join('\n')}

Ask ONE short empathetic follow-up question to learn a bit more. 1-2 sentences max. Warm and conversational. Don't repeat what they already shared.`
        reply = await groq([{role: 'user', content: prompt}],
          'You are Soma. Keep replies brief, warm, conversational.', 120)
      } else {
        reply = "Is there anything else you'd like to add, or shall we move on to the next section?"
      }
      const withReply = [...sectionConvoRef.current, {role: 'soma' as const, text: reply}]
      setSectionConvo(withReply)
      sectionConvoRef.current = withReply
      speak(reply)
      setFollowUpCount(f => f + 1)
      setTimeout(() => convoScrollRef.current?.scrollToEnd({ animated: true }), 100)
    } catch {
      const fallback = "Thanks for sharing! Anything else to add, or shall we move on?"
      const withFallback = [...sectionConvoRef.current, {role: 'soma' as const, text: fallback}]
      setSectionConvo(withFallback)
      sectionConvoRef.current = withFallback
      speak(fallback)
      setFollowUpCount(f => f + 1)
    } finally {
      setSomaGenerating(false)
    }
  }

  const moveOn = () => {
    stopListeningRef.current?.()
    setListening(false)
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setTranscript('')
    const userMessages = sectionConvoRef.current
      .filter(m => m.role === 'user').map(m => m.text).join(' ')
    const updated = [...answers]
    updated[phase - 1] = userMessages
    setAnswers(updated)
    if (phase < 3) {
      fadeTransition(() => setPhase(p => p + 1))
    } else {
      setPhase(4)
      buildProfile(updated)
    }
  }

  const buildProfile = async (ans: string[]) => {
    speak(t('ob_building'))
    if (ans.every(a => !a.trim())) {
      DB.setOnboarding([], ['mind', 'body', 'love'] as DomainKey[])
      setProfileSummary("Your profile is ready! Add a photo so others can recognise you.")
      fadeTransition(() => setPhase(5))
      return
    }
    try {
      const prompt = `The user answered 3 voice interview questions about themselves. Extract their profile data.

Physical self answer: "${ans[0]}"
Social self answer: "${ans[1]}"
Psychological self answer: "${ans[2]}"

Return ONLY valid JSON (no markdown, no explanation):
{
  "name": "first name if mentioned, else null",
  "age": number or null,
  "height": "e.g. 165cm or 5'5\\" or null",
  "weight": "e.g. 60kg or 132lbs or null",
  "occupation": "job title or null",
  "relationshipStatus": "single/dating/married/divorced/etc or null",
  "focusDomains": ["array of 1-3 from: mind,body,love,social,work,hobby,spirit,finance"],
  "memories": [
    {"domain": "one of: mind/body/love/social/work/hobby/spirit/finance", "content": "a specific fact about the user in first person"}
  ]
}`
      const raw = await groq([{ role: 'user', content: prompt }],
        'You are a precise data extractor. Return only valid JSON.', 400)

      let data: any = {}
      try {
        const jsonStr = raw?.match(/\{[\s\S]*\}/)?.[0] || '{}'
        data = JSON.parse(jsonStr)
      } catch { data = {} }

      const nameToUse = userName.trim() || data.name || null
      if (nameToUse) DB.setName(nameToUse)

      const domains: DomainKey[] = (data.focusDomains || []).filter((d: string) =>
        DOMAINS.some(dom => dom.key === d)
      ).slice(0, 3) as DomainKey[]
      DB.setOnboarding([], domains.length ? domains : ['mind', 'body', 'love'] as DomainKey[])

      const memories: { domain: string; content: string }[] = data.memories || []
      for (const mem of memories.slice(0, 12)) {
        const domainKey = DOMAINS.find(d => d.key === mem.domain)?.key || 'mind'
        DB.addMemory(domainKey as DomainKey, mem.content)
      }

      const domainMap = ['body', 'social', 'mind'] as DomainKey[]
      ans.forEach((a, i) => { if (a.trim()) DB.addMemory(domainMap[i], a.trim()) })

      // Generate a warm, personal profile reflection using AI
      const summaryPrompt = `You are Soma, a deeply empathetic life-coaching AI. You just had a heartfelt onboarding conversation with someone.

Here's what they shared:
- About their physical self: "${ans[0] || '(not shared)'}"
- About their social world: "${ans[1] || '(not shared)'}"
- About their inner self: "${ans[2] || '(not shared)'}"

Key facts extracted: name=${nameToUse || 'unknown'}, age=${data.age || 'unknown'}, occupation=${data.occupation || 'unknown'}, relationship=${data.relationshipStatus || 'unknown'}

Write a warm, personal reflection (4-5 sentences) addressed directly to them. Rules:
- Start with their name if known, otherwise "I love that you shared this with me"
- Reference 2-3 SPECIFIC things they actually said — not just age/job, but real things they mentioned
- Show genuine insight: notice a pattern, a tension, or something meaningful about who they are
- Express what excites you about helping them grow
- Tone: warm, poetic, deeply human — like a wise friend who truly listened
- DO NOT list facts robotically. Write flowing prose.
- Do NOT mention adding a photo.
- Keep it under 80 words.`

      try {
        const richSummary = await groq([{role: 'user', content: summaryPrompt}],
          'You are Soma. Write in first person, warm and poetic. No bullet points.', 180)
        setProfileSummary(richSummary || `${nameToUse ? `${nameToUse}, ` : ''}I truly heard you. The way you showed up for this conversation tells me so much about who you are — and I can't wait to walk this journey with you.`)
      } catch {
        setProfileSummary(`${nameToUse ? `${nameToUse}, ` : ''}I truly heard you. The way you showed up for this conversation tells me so much about who you are — and I can't wait to walk this journey with you.`)
      }

    } catch {
      if (userName.trim()) DB.setName(userName.trim())
      DB.setOnboarding([], ['mind', 'body', 'love'] as DomainKey[])
      ans.forEach((a, i) => { if (a.trim()) DB.addMemory((['body', 'social', 'mind'] as DomainKey[])[i], a.trim()) })
      setProfileSummary("I truly heard you. The way you showed up for this conversation tells me so much about who you are — and I can't wait to walk this journey with you.")
    }
    fadeTransition(() => setPhase(5))
  }

  const color = phase >= 1 && phase <= 3 ? COLORS[phase - 1] : '#7B6EF6'

  // Phase 0 — Welcome
  if (phase === 0) return (
    <View style={{ flex: 1, backgroundColor: '#0F0A2E' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Image source={require('./assets/icon.png')} style={{ width: 90, height: 90, borderRadius: 26, marginBottom: 24 }} />
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.5, marginBottom: 12 }}>
          {t('ob_hi')}
        </Text>
        <Text style={{ fontSize: 16, color: '#A89BFA', textAlign: 'center', lineHeight: 24, marginBottom: 36 }}>
          {t('ob_intro')}
        </Text>
        <View style={{ width: '100%', gap: 10 }}>
          {[
            { emoji: '🧬', label: t('ob_physical_label'), color: '#4CAF7D' },
            { emoji: '🌐', label: t('ob_social_label'), color: '#7B6EF6' },
            { emoji: '🧠', label: t('ob_inner_label'), color: '#F59E0B' },
          ].map(p => (
            <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: p.color + '30', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#E8E5FF' }}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ padding: 24, paddingBottom: 44, gap: 12 }}>
        <TouchableOpacity onPress={() => setPhase(1)}
          style={{ backgroundColor: '#7B6EF6', borderRadius: 16, paddingVertical: 17, alignItems: 'center', ...shadowSm }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>{t('ob_start')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSignIn} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 13, color: '#6B68A0' }}>{t('alreadyAccount')} <Text style={{ color: '#A89BFA', fontWeight: '700' }}>{t('signIn')}</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  // Phase 4 — Processing
  if (phase === 4) return (
    <View style={{ flex: 1, backgroundColor: '#0F0A2E', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Image source={require('./assets/icon.png')} style={{ width: 90, height: 90, borderRadius: 26, marginBottom: 28 }} />
      </Animated.View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 }}>
        {t('ob_building')}
      </Text>
      <Text style={{ fontSize: 15, color: '#A89BFA', textAlign: 'center', lineHeight: 22 }}>
        {t('ob_building_sub')}
      </Text>
    </View>
  )

  // Phase 5 — Profile summary + photo
  if (phase === 5) return (
    <View style={{ flex: 1, backgroundColor: '#0F0A2E' }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', padding: 32, paddingTop: 56, paddingBottom: 48, flexGrow: 1 }}>
      {/* Soma avatar */}
      <Image source={require('./assets/icon.png')} style={{ width: 72, height: 72, borderRadius: 22, marginBottom: 16 }} />

      {/* Soma speech bubble */}
      <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, width: '100%', marginBottom: 32 }}>
        <Text style={{ fontSize: 15, color: '#E8E5FF', lineHeight: 24, textAlign: 'center' }}>
          {profileSummary || "Your profile is ready! Add a photo so others can recognise you."}
        </Text>
      </View>

      {/* Photo upload */}
      <Text style={{ fontSize: 13, color: '#A89BFA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>
        Your photo
      </Text>
      <TouchableOpacity
        onPress={() => pickPhoto(uri => { setProfilePhotoUri(uri); DB.setProfilePhoto(uri) })}
        style={{
          width: 110, height: 110, borderRadius: 55, marginBottom: 32,
          backgroundColor: 'rgba(123,110,246,0.15)',
          borderWidth: 2, borderColor: profilePhotoUri ? '#7B6EF6' : 'rgba(168,155,250,0.4)',
          borderStyle: profilePhotoUri ? 'solid' : 'dashed',
          alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
        {profilePhotoUri
          ? <Image source={{ uri: profilePhotoUri }} style={{ width: 110, height: 110 }} resizeMode="cover" />
          : <>
              <Text style={{ fontSize: 30, marginBottom: 4 }}>📷</Text>
              <Text style={{ fontSize: 12, color: '#A89BFA', fontWeight: '600' }}>Add photo</Text>
            </>
        }
      </TouchableOpacity>

      {/* Continue to account choice */}
      <TouchableOpacity onPress={() => setPhase(6)}
        style={{ backgroundColor: '#7B6EF6', borderRadius: 16, paddingVertical: 17, paddingHorizontal: 48, width: '100%', alignItems: 'center', ...shadowSm }}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>Continue →</Text>
      </TouchableOpacity>
      {!profilePhotoUri && (
        <TouchableOpacity onPress={() => setPhase(6)} style={{ marginTop: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Skip photo</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
    </View>
  )

  // Phase 6 — Account choice
  if (phase === 7) return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#0F0A2E' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => setPhase(6)} style={{ marginBottom: 24 }}>
          <Text style={{ color: '#A89BFA', fontSize: 15, fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>

        <Image source={require('./assets/icon.png')} style={{ width: 60, height: 60, borderRadius: 18, marginBottom: 20, alignSelf: 'center' }} />
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 }}>
          Create your account
        </Text>
        <Text style={{ fontSize: 14, color: '#A89BFA', textAlign: 'center', lineHeight: 21, marginBottom: 32 }}>
          Free forever. Your profile, memories and growth — saved.
        </Text>

        {regError ? <Text style={{ color: '#FF6B6B', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{regError}</Text> : null}

        <Text style={{ fontSize: 13, color: '#7B7FA8', fontWeight: '600', marginBottom: 6 }}>Your name</Text>
        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder="e.g. Alex"
          placeholderTextColor="#4A4870"
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,155,250,0.2)', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#E8E5FF', marginBottom: 14 }}
        />

        <Text style={{ fontSize: 13, color: '#7B7FA8', fontWeight: '600', marginBottom: 6 }}>Email address</Text>
        <TextInput
          value={regEmail}
          onChangeText={setRegEmail}
          placeholder="you@example.com"
          placeholderTextColor="#4A4870"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,155,250,0.2)', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#E8E5FF', marginBottom: 14 }}
        />

        <Text style={{ fontSize: 13, color: '#7B7FA8', fontWeight: '600', marginBottom: 6 }}>Password</Text>
        <TextInput
          value={regPassword}
          onChangeText={setRegPassword}
          placeholder="••••••••"
          placeholderTextColor="#4A4870"
          secureTextEntry
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,155,250,0.2)', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#E8E5FF', marginBottom: 28 }}
        />

        <TouchableOpacity
          onPress={async () => {
            if (!userName.trim() || !regEmail.trim() || !regPassword.trim()) {
              setRegError('Please fill in all fields'); return
            }
            if (regPassword.length < 6) {
              setRegError('Password must be at least 6 characters'); return
            }
            setRegError('')
            setRegLoading(true)
            try {
              await auth.signup(regEmail.trim(), userName.trim(), regPassword.trim())
              DB.setName(userName.trim())
              alert(`✉️ Almost there!\n\nWe sent a confirmation link to ${regEmail.trim()}. Click it to activate your account, then sign in.`)
              onDone()
            } catch (err: any) {
              setRegError(err.message || 'Signup failed. Please try again.')
            } finally {
              setRegLoading(false)
            }
          }}
          disabled={regLoading}
          style={{ backgroundColor: regLoading ? '#4A4870' : '#7B6EF6', borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
            {regLoading ? 'Creating account...' : 'Create account →'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onSignIn?.()} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ color: '#A89BFA', fontSize: 14, fontWeight: '600' }}>Already have an account? Sign in →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )

  if (phase === 6) return (
    <View style={{ flex: 1, backgroundColor: '#0F0A2E', justifyContent: 'flex-end', padding: 24, paddingBottom: 52 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
        <Image source={require('./assets/icon.png')} style={{ width: 72, height: 72, borderRadius: 22, marginBottom: 24 }} />
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 }}>
          Save your profile?
        </Text>
        <Text style={{ fontSize: 15, color: '#A89BFA', textAlign: 'center', lineHeight: 23, marginBottom: 8 }}>
          Create a free account so Soma remembers everything — your profile, your memories, your growth — forever.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {/* Create account */}
        <TouchableOpacity
          onPress={() => setPhase(7)}
          style={{ backgroundColor: '#7B6EF6', borderRadius: 16, paddingVertical: 17, alignItems: 'center', ...shadowSm }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>Create free account →</Text>
        </TouchableOpacity>

        {/* Continue without account */}
        <TouchableOpacity
          onPress={onDone}
          style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, paddingVertical: 17, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168,155,250,0.25)' }}>
          <Text style={{ color: '#A89BFA', fontSize: 16, fontWeight: '700' }}>Continue without account</Text>
          <Text style={{ color: 'rgba(168,155,250,0.5)', fontSize: 12, marginTop: 3 }}>You can register later in Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  // Phases 1–3 — Conversational interview
  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#0F0A2E', opacity: fadeAnim }}>
      {/* Progress bar */}
      <View style={{ paddingTop: 56, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= phase ? color : 'rgba(255,255,255,0.12)' }} />
          ))}
        </View>
        <Text style={{ fontSize: 11, color: color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {LABELS[phase - 1]} · {phase} of 3
        </Text>
      </View>

      {/* Chat messages */}
      <ScrollView
        ref={convoScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 10, width: '100%' }}
        showsVerticalScrollIndicator={false}
      >
        {sectionConvo.map((msg, i) => {
          const rowW = Math.min(screenW, 430) - 32
          return (
            <View key={i} style={{ width: rowW, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 }}>
              {msg.role === 'soma' ? (
                <>
                  <Animated.View style={{ flexShrink: 0, transform: [{ scale: i === sectionConvo.length - 1 && somaThinking ? pulseAnim : new Animated.Value(1) }] }}>
                    <Image source={require('./assets/icon.png')} style={{ width: 30, height: 30, borderRadius: 9 }} />
                  </Animated.View>
                  <View style={{
                    flex: 1, minWidth: 0,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 18, borderBottomLeftRadius: 4,
                    padding: 12, paddingHorizontal: 14,
                  }}>
                    <Text style={{ fontSize: 14, color: '#E8E5FF', lineHeight: 21 }}>{msg.text}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={{ flex: 1 }} />
                  <View style={{
                    maxWidth: rowW * 0.75,
                    backgroundColor: color + '33',
                    borderWidth: 1, borderColor: color + '55',
                    borderRadius: 18, borderBottomRightRadius: 4,
                    padding: 12, paddingHorizontal: 14,
                  }}>
                    <Text style={{ fontSize: 14, color: '#E8E5FF', lineHeight: 21 }}>{msg.text}</Text>
                  </View>
                </>
              )}
            </View>
          )
        })}
        {somaGenerating && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 }}>
            <Image source={require('./assets/icon.png')} style={{ width: 30, height: 30, borderRadius: 9 }} />
            <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 16, color: color, letterSpacing: 4 }}>•••</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 44, gap: 10 }}>
        {/* Mic + text input row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <Animated.View style={{ transform: [{ scale: micAnim }] }}>
            <TouchableOpacity
              onPress={startListening}
              activeOpacity={0.85}
              style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: listening ? '#EF4444' : color,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: listening ? '#EF4444' : color,
                shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
              }}>
              <Text style={{ fontSize: 20 }}>{listening ? '⏹' : '🎙'}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{
            flex: 1,
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius: 16, borderWidth: 1,
            borderColor: listening ? color + '88' : 'rgba(255,255,255,0.12)',
            paddingHorizontal: 14, paddingVertical: 10,
            minHeight: 48, justifyContent: 'center',
          }}>
            <TextInput
              value={listening ? undefined : transcript}
              onChangeText={text => { if (!listening) setTranscript(text) }}
              placeholder={listening ? t('ob_listening') : t('ob_type_instead')}
              placeholderTextColor={listening ? color : 'rgba(255,255,255,0.25)'}
              multiline
              style={{ color: '#E8E5FF', fontSize: 14, lineHeight: 20, maxHeight: 80 }}
            />
          </View>

          {transcript.trim() && !somaGenerating && (
            <TouchableOpacity onPress={submitAnswer}
              style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: color, alignItems: 'center', justifyContent: 'center',
              }}>
              <Text style={{ fontSize: 18, color: '#fff', fontWeight: '700' }}>↑</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Move on / skip */}
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {followUpCount >= 1 ? (
            <TouchableOpacity onPress={moveOn}
              style={{ flex: 1, backgroundColor: color, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                {phase < 3 ? 'Move on →' : 'Finish →'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={moveOn} style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontWeight: '600' }}>
                {t('ob_skip')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  )
}

// SOMA brand mark — the glowing app icon, rounded like an app tile.
function SomaMark({ size = 56 }: { size?: number }) {
  return <Image source={require('./assets/icon.png')} style={{ width: size, height: size, borderRadius: size * 0.26 }} />
}

function Splash() {
  const iconScale   = useRef(new Animated.Value(0.7)).current
  const iconOpacity = useRef(new Animated.Value(0)).current
  const ringScale   = useRef(new Animated.Value(0.6)).current
  const ringOpacity = useRef(new Animated.Value(0)).current
  const textOpacity = useRef(new Animated.Value(0)).current
  const textRise    = useRef(new Animated.Value(14)).current
  const tagOpacity  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // 1. Icon pops in
    Animated.parallel([
      Animated.spring(iconScale,   { toValue: 1,   useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start()
    // 2. Glow ring expands (slightly delayed)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(ringScale,   { toValue: 1.18, useNativeDriver: true, tension: 40, friction: 9 }),
        Animated.timing(ringOpacity, { toValue: 0.35, duration: 500, useNativeDriver: true }),
      ]).start()
    }, 180)
    // 3. SOMA wordmark slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(textRise,    { toValue: 0,   useNativeDriver: true, tension: 70, friction: 10 }),
      ]).start()
    }, 340)
    // 4. Tagline fades in last
    setTimeout(() => {
      Animated.timing(tagOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start()
    }, 580)
  }, [])

  return (
    <View style={[g.screen, { backgroundColor: '#0F0A2E', alignItems: 'center', justifyContent: 'center' }]}>
      {/* Background glow blob */}
      <View style={{ position: 'absolute', top: '28%', width: 320, height: 320, borderRadius: 160, backgroundColor: '#7B6EF6', opacity: 0.08 }} />

      {/* Glow ring behind icon */}
      <Animated.View style={{
        position: 'absolute',
        width: 160, height: 160, borderRadius: 80,
        borderWidth: 1.5, borderColor: '#A89BFA',
        opacity: ringOpacity,
        transform: [{ scale: ringScale }],
      }} />
      <Animated.View style={{
        position: 'absolute',
        width: 200, height: 200, borderRadius: 100,
        borderWidth: 1, borderColor: '#7B6EF6',
        opacity: ringOpacity,
        transform: [{ scale: ringScale }],
      }} />

      {/* App icon */}
      <Animated.View style={{ opacity: iconOpacity, transform: [{ scale: iconScale }], marginBottom: 28 }}>
        <Image
          source={require('./assets/icon.png')}
          style={{ width: 110, height: 110, borderRadius: 28 }}
        />
      </Animated.View>

      {/* Wordmark */}
      <Animated.Text style={{
        fontSize: 38, fontWeight: '800', color: '#FFFFFF',
        letterSpacing: 6, opacity: textOpacity,
        transform: [{ translateY: textRise }],
      }}>
        SOMA
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={{
        fontSize: 14, color: '#9A8FC0', marginTop: 10,
        letterSpacing: 0.3, opacity: tagOpacity, textAlign: 'center',
        paddingHorizontal: 40, lineHeight: 20,
      }}>
        Meet yourself before meeting others.
      </Animated.Text>
    </View>
  )
}

// ── REGISTER ───────────────────────────────────────────────
class RegisterBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { crashed: boolean }> {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  render() { return this.state.crashed ? this.props.fallback : this.props.children }
}

function RegisterFallback({ onDone }: { onDone: (name: string) => void }) {
  const [step, setStep] = useState<'method' | 'email'>('method')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSignup = async () => {
    if (!email.trim() || !name.trim() || !password.trim()) { alert('Please fill in all fields'); return }
    setLoading(true)
    try {
      await auth.signup(email.trim(), name.trim(), password.trim())
      alert(`✉️ Check your email!\n\nWe sent a confirmation link to ${email.trim()}. Click it to activate your account, then sign in.`)
      onDone(name.trim())
    } catch (err: any) {
      alert('Signup failed: ' + (err.message || 'Unknown error'))
    } finally { setLoading(false) }
  }

  if (step === 'method') return (
    <ScrollView style={g.screen} contentContainerStyle={g.registerScroll}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={{ marginBottom: 14 }}><SomaMark size={80} /></View>
        <Text style={g.logo}>Save your story</Text>
        <Text style={g.logoSub}>Keep your conversations with Soma and build your life.</Text>
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

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.registerScroll}>
      <TouchableOpacity style={{ marginBottom: 20 }} onPress={() => setStep('method')}>
        <Text style={g.backLink}>{t('back')}</Text>
      </TouchableOpacity>
      <Text style={g.logo}>{t('createAccount')}</Text>
      <Text style={g.logoSub}>Your name and email, that's all.</Text>
      <View style={{ marginTop: 28 }}>
        <Text style={g.inputLabel}>{t('whatName')}</Text>
        <TextInput style={g.authInput} value={name} onChangeText={setName} placeholder="e.g. Alex" placeholderTextColor="#9A9DB2" />
        <Text style={[g.inputLabel, { marginTop: 16 }]}>{t('emailAddress')}</Text>
        <TextInput style={g.authInput} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#9A9DB2" keyboardType="email-address" autoCapitalize="none" />
        <Text style={[g.inputLabel, { marginTop: 16 }]}>{t('password')}</Text>
        <TextInput style={g.authInput} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#9A9DB2" secureTextEntry />
        <TouchableOpacity style={[g.primaryBtn, { marginTop: 28 }, loading && g.off]} disabled={loading} onPress={handleEmailSignup}>
          <Text style={g.primaryBtnTxt}>{loading ? '⏳ Creating...' : `✦  ${t('createAccount')}`}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

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

function Register({ onDone, onSignIn }: { onDone: (name: string) => void; onSignIn?: () => void }) {
  const [step, setStep] = useState<'method' | 'email' | 'verify'>('method')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyToken, setVerifyToken] = useState('')

  // ── Real Google OAuth (expo-auth-session) ──
  const [gRequest, gResponse, gPromptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID || null as any,
    iosClientId: GOOGLE_IOS_CLIENT_ID || null as any,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || null as any,
    redirectUri: GOOGLE_REDIRECT_URI,
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
            const pulled = await cloudSync.pull()
            if (!pulled) DB.register(userName)
            else cloudSync.push().catch(() => {})
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
      await auth.signup(email.trim(), name.trim(), password.trim())
      alert(`✉️ Check your email!\n\nWe sent a confirmation link to ${email.trim()}. Click it to activate your account, then sign in here.`)
      onDone(name.trim())
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
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ marginBottom: 14 }}><SomaMark size={72} /></View>
          <Text style={g.logo}>Meet yourself first.</Text>
          <Text style={g.logoSub}>Meet others next. Start exploring now — no account needed.</Text>
        </View>

        {/* Primary CTA — guest */}
        <TouchableOpacity
          style={[g.primaryBtn, { backgroundColor: '#7B6EF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}
          onPress={() => { auth.clearTokens(); onDone('Guest') }}
        >
          <Ionicons name="compass-outline" size={20} color="#fff" />
          <Text style={g.primaryBtnTxt}>{t('ob_start_explore')}</Text>
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', fontSize: 12, color: '#B0B3C8', marginTop: 8, marginBottom: 24 }}>
          {t('ob_browse_sub')}
        </Text>

        <View style={g.dividerRow}>
          <View style={g.dividerLine} />
          <Text style={g.dividerTxt}>or save your progress</Text>
          <View style={g.dividerLine} />
        </View>

        <TouchableOpacity style={g.socialBtn} onPress={() => handleSocial('Google')}>
          <View style={{ width: 28, alignItems: 'center' }}><GoogleIcon size={20} /></View>
          <Text style={g.socialLabel}>{t('continueWith').replace('or ', '').replace('ou ', '').replace('oder ', '').trim()} Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={g.socialBtn} onPress={() => handleSocial('Apple')}>
          <View style={{ width: 28, alignItems: 'center' }}><AppleIcon size={20} /></View>
          <Text style={g.socialLabel}>{t('continueWith').replace('or ', '').replace('ou ', '').replace('oder ', '').trim()} Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[g.socialBtn, { marginTop: 0 }]} onPress={() => setStep('email')}>
          <View style={{ width: 28, alignItems: 'center' }}><Text style={{ fontSize: 18 }}>✉️</Text></View>
          <Text style={g.socialLabel}>Sign up with email</Text>
        </TouchableOpacity>

        <Text style={g.disclaimerTxt}>By signing up, you agree to our Terms. Your data stays private.</Text>

        <View style={[g.dividerRow, { marginTop: 16 }]}>
          <View style={g.dividerLine} />
          <Text style={g.dividerTxt}>already have an account?</Text>
          <View style={g.dividerLine} />
        </View>
        {onSignIn && (
          <TouchableOpacity style={{ alignItems: 'center', marginTop: 12, marginBottom: 8 }} onPress={onSignIn}>
            <Text style={{ color: '#7B6EF6', fontSize: 14, fontWeight: '600' }}>Sign In →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    )
  }

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

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.registerScroll}>
      <TouchableOpacity style={{ marginBottom: 20 }} onPress={() => setStep('method')}>
        <Text style={g.backLink}>{t('back')}</Text>
      </TouchableOpacity>

      <Text style={g.logo}>{t('createAccount')}</Text>
      <Text style={g.logoSub}>Your name and email, that's all.</Text>

      <View style={{ marginTop: 28 }}>
        <Text style={g.inputLabel}>{t('whatName')}</Text>
        <TextInput style={g.authInput} value={name} onChangeText={setName} placeholder="e.g. Alex" placeholderTextColor="#9A9DB2" />

        <Text style={[g.inputLabel, { marginTop: 16 }]}>{t('emailAddress')}</Text>
        <TextInput style={g.authInput} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#9A9DB2" keyboardType="email-address" autoCapitalize="none" />

        <Text style={[g.inputLabel, { marginTop: 16 }]}>{t('password')}</Text>
        <TextInput style={g.authInput} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#9A9DB2" secureTextEntry />

        <TouchableOpacity style={[g.primaryBtn, { marginTop: 28 }, loading && g.off]} disabled={loading} onPress={handleEmailSignup}>
          <Text style={g.primaryBtnTxt}>{loading ? '⏳ Creating...' : `✦  ${t('createAccount')}`}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

// ── LOGIN ────────────────────────────────────────────────────
function LoginScreen({ onDone, onRegister, onForgot }: { onDone: (name: string) => void; onRegister: () => void; onForgot: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { alert('Please enter email and password'); return }
    setLoading(true)
    setUnverifiedEmail(null)
    try {
      const data = await auth.login(email.trim(), password.trim())
      const name = data.user?.name || email.split('@')[0]
      const pulled = await cloudSync.pull()
      if (!pulled) DB.register(name)
      onDone(name)
    } catch (err: any) {
      if (err.needsVerification) {
        setUnverifiedEmail(err.email || email.trim())
      } else {
        alert('Login failed: ' + (err.message || 'Invalid email or password'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!unverifiedEmail) return
    setResendLoading(true)
    try {
      await auth.resendVerification(unverifiedEmail)
      setResendSent(true)
    } catch (err: any) {
      alert(err.message || 'Could not resend')
    } finally { setResendLoading(false) }
  }

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.registerScroll} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ marginBottom: 14 }}><SomaMark size={72} /></View>
        <Text style={g.logo}>Welcome back</Text>
        <Text style={g.logoSub}>Sign in to continue your journey</Text>
      </View>

      <Text style={g.inputLabel}>{t('emailAddress')}</Text>
      <TextInput style={g.authInput} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#9A9DB2" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

      <Text style={[g.inputLabel, { marginTop: 16 }]}>{t('password')}</Text>
      <TextInput style={g.authInput} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#9A9DB2" secureTextEntry />

      <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 8 }} onPress={onForgot}>
        <Text style={{ color: '#7B6EF6', fontSize: 13 }}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[g.primaryBtn, { marginTop: 24 }, loading && g.off]} disabled={loading} onPress={handleLogin}>
        <Text style={g.primaryBtnTxt}>{loading ? '⏳ Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>

      {unverifiedEmail && (
        <View style={{ backgroundColor: '#FFF7ED', borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#FED7AA' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#C2410C', marginBottom: 4 }}>Email not verified</Text>
          <Text style={{ fontSize: 13, color: '#9A3412', lineHeight: 18 }}>
            Check your inbox for a confirmation link from hello@mysoma.site.
          </Text>
          {resendSent
            ? <Text style={{ fontSize: 13, color: '#16A34A', marginTop: 10, fontWeight: '600' }}>✓ New link sent!</Text>
            : <TouchableOpacity onPress={handleResend} disabled={resendLoading} style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 13, color: '#7B6EF6', fontWeight: '700' }}>
                  {resendLoading ? 'Sending...' : 'Resend confirmation email'}
                </Text>
              </TouchableOpacity>
          }
        </View>
      )}

      <View style={[g.dividerRow, { marginTop: 28 }]}>
        <View style={g.dividerLine} />
        <Text style={g.dividerTxt}>don't have an account?</Text>
        <View style={g.dividerLine} />
      </View>

      <TouchableOpacity style={[g.socialBtn, { marginTop: 12 }]} onPress={onRegister}>
        <Text style={[g.socialLabel, { textAlign: 'center', flex: 1 }]}>Create account</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ── FORGOT PASSWORD ───────────────────────────────────────────
function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) { alert('Please enter your email'); return }
    setLoading(true)
    try {
      await auth.requestPasswordReset(email.trim())
      setSent(true)
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Something went wrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.registerScroll} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={{ marginBottom: 20 }} onPress={onBack}>
        <Text style={g.backLink}>{`← Back`}</Text>
      </TouchableOpacity>

      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ marginBottom: 14 }}><SomaMark size={72} /></View>
        <Text style={g.logo}>Reset password</Text>
        <Text style={g.logoSub}>We'll send a reset link to your email</Text>
      </View>

      {sent ? (
        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#86EFAC' }}>
          <Text style={{ color: '#166534', fontSize: 15, fontWeight: '600', marginBottom: 8 }}>Check your email 📧</Text>
          <Text style={{ color: '#166534', fontSize: 13, lineHeight: 20 }}>
            We sent a reset link to {email}.{'\n'}Click the link in that email to set a new password.{'\n\n'}Link expires in 1 hour.
          </Text>
        </View>
      ) : (
        <>
          <Text style={g.inputLabel}>Email address</Text>
          <TextInput style={g.authInput} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#9A9DB2" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <TouchableOpacity style={[g.primaryBtn, { marginTop: 24 }, loading && g.off]} disabled={loading} onPress={handleSubmit}>
            <Text style={g.primaryBtnTxt}>{loading ? '⏳ Sending...' : 'Send Reset Link'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

// ── VERIFY EMAIL (launched when ?verify=TOKEN in URL) ─────────
function VerifyEmailScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    auth.verifyEmail(token)
      .then((data: any) => {
        // Auto-login: save tokens returned by the backend
        if (data?.accessToken && data?.refreshToken) {
          auth.saveTokens(data.accessToken, data.refreshToken)
          // Brief success flash then go straight to app
          setStatus('success')
          setTimeout(() => onDone(), 1500)
        } else {
          setStatus('success')
        }
      })
      .catch((err: any) => { setStatus('error'); setErrorMsg(err.message || 'Link expired or already used') })
  }, [])

  return (
    <View style={[g.screen, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
      {status === 'loading' && (
        <>
          <Text style={{ fontSize: 32, marginBottom: 16 }}>✉️</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#222540', textAlign: 'center' }}>Verifying your email…</Text>
        </>
      )}
      {status === 'success' && (
        <>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#222540', textAlign: 'center', marginBottom: 8 }}>Email confirmed!</Text>
          <Text style={{ fontSize: 15, color: '#6E7191', textAlign: 'center', marginBottom: 32 }}>Taking you in…</Text>
        </>
      )}
      {status === 'error' && (
        <>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#222540', textAlign: 'center', marginBottom: 8 }}>Verification failed</Text>
          <Text style={{ fontSize: 14, color: '#6E7191', textAlign: 'center', marginBottom: 32 }}>{errorMsg}</Text>
          <TouchableOpacity style={g.primaryBtn} onPress={onDone}>
            <Text style={g.primaryBtnTxt}>Back to Sign In</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

// ── RESET PASSWORD (launched when ?reset=TOKEN in URL) ────────
function ResetPasswordScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleReset = async () => {
    if (password.length < 8) { alert('Password must be at least 8 characters'); return }
    if (password !== confirm) { alert('Passwords do not match'); return }
    setLoading(true)
    try {
      await auth.resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      alert('Reset failed: ' + (err.message || 'Link may have expired'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={g.screen} contentContainerStyle={g.registerScroll} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ marginBottom: 14 }}><SomaMark size={72} /></View>
        <Text style={g.logo}>{done ? 'Password reset!' : 'New password'}</Text>
        <Text style={g.logoSub}>{done ? 'You can now sign in with your new password.' : 'Choose a new password (8+ characters)'}</Text>
      </View>

      {done ? (
        <TouchableOpacity style={g.primaryBtn} onPress={onDone}>
          <Text style={g.primaryBtnTxt}>Sign In</Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text style={g.inputLabel}>New password</Text>
          <TextInput style={g.authInput} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#9A9DB2" secureTextEntry />
          <Text style={[g.inputLabel, { marginTop: 16 }]}>Confirm password</Text>
          <TextInput style={g.authInput} value={confirm} onChangeText={setConfirm} placeholder="••••••••" placeholderTextColor="#9A9DB2" secureTextEntry />
          <TouchableOpacity style={[g.primaryBtn, { marginTop: 24 }, loading && g.off]} disabled={loading} onPress={handleReset}>
            <Text style={g.primaryBtnTxt}>{loading ? '⏳ Resetting...' : 'Set New Password'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

// ── AURA CHAT (try / full / diary) ─────────────────────────
function AuraChat({ mode, profile, onRefresh, onDone, title, isDiary, autoStart }: {
  mode: 'try' | 'full' | 'diary'; profile: UserProfile; onRefresh: () => void; onDone: () => void; title: string; isDiary?: boolean; autoStart?: boolean
}) {
  const { t } = useT()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [crisis, setCrisis] = useState(false)
  const stopMicRef = useRef<(() => void) | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  const fade = useRef(new Animated.Value(0)).current
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => { Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start() }, [])
  useEffect(() => { if (autoStart) start() }, [])
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
        DB.syncDatingInterests()
        onRefresh()
      }
      const content = reply || "I'm here with you — but I'm having trouble reaching my thoughts right now (connection issue). Give me a moment and try again?"
      const final = [...updated, { role: 'assistant' as const, content }]
      setMsgs(final); scroll()
      setSpeaking(true); speak(content)
      setTimeout(() => setSpeaking(false), content.length * 60)
    } finally {
      setLoading(false)
    }
  }

  const start = async () => {
    setStarted(true); setLoading(true)
    if (mode !== 'try') DB.bump()
    const p = DB.get()
    const seed = mode === 'try'
      ? (() => {
        const ob = p.onboarding
        if (ob?.goals?.length || ob?.focusDomains?.length) {
          const goalStr = ob.goals?.slice(0, 2).join(' and ') || ''
          const focusStr = ob.focusDomains?.slice(0, 2).join(' and ') || ''
          return `I just told you I want to work on: ${goalStr}${focusStr ? `, focusing on ${focusStr} in my life` : ''}. Greet me warmly${p.name ? ` (my name is ${p.name})` : ''}, acknowledge what I'm looking for in a natural human way without listing it back robotically, and ask me ONE thoughtful opening question to begin our journey together.`
        }
        return 'greet me warmly as a new person and ask what is on my mind or what brought me here'
      })()
      : isDiary ? `greet me by name (${p.name}) and ask how my day was`
      : `greet me by name (${p.name}), reference something you know about me, ask how I am`
    const opening = await groq([{ role: 'user', content: seed }], auraSystem(p, mode), 150)
    const text = opening || 'Hello. What is on your mind?'
    setMsgs([{ role: 'assistant', content: text }])
    setLoading(false); setSpeaking(true); speak(text)
    setTimeout(() => setSpeaking(false), text.length * 60)
  }

  const finishDiary = async () => {
    if (msgs.length < 2) { onDone(); return }
    const convo = msgs.map(m => `${m.role}: ${m.content}`).join('\n')
    const [summary, reply] = await Promise.all([
      groq([{ role: 'user', content: `Summarize this diary chat in ONE warm sentence from the user perspective:\n${convo}` }], 'You write brief diary summaries.' + langDirective(), 60),
      groq([{ role: 'user', content: `Based on this diary conversation, write a short personal reply from Soma — 1-2 warm, specific sentences that acknowledge what the user shared and offer gentle encouragement or a small insight. Be human, not generic.\n${convo}` }], `You are Soma, a caring AI companion. Write a heartfelt, personal reply to a diary entry. Under 50 words.${langDirective()}`, 80),
    ])
    const id = Date.now() + ''
    const p = DB.get()
    p.diary.unshift({ id, date: new Date().toLocaleDateString(), mood: 'reflective', summary: summary || 'A day of reflection.', somaReply: reply || undefined })
    DB.save(p)
    onDone()
  }

  const onMic = () => {
    if (listening) { stopMicRef.current?.(); return }
    setListening(true)
    const stop = listen(
      (txt) => { setListening(false); if (txt.trim()) send(txt) },
      () => setListening(false),
    )
    stopMicRef.current = stop
  }
  const p = DB.get()

  return (
    <KeyboardAvoidingView style={[g.screen, { backgroundColor: t.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
            <Text style={g.startTitle}>{autoStart ? 'Soma is ready.' : mode === 'try' ? 'Talk to Soma.' : isDiary ? 'How was\nyour day?' : `Hi ${p.name}.`}</Text>
            <Text style={g.startSub}>
              {autoStart ? 'Starting your first conversation…'
                : mode === 'try' ? 'Before you decide anything, just talk.\nShare what is on your mind. Soma is here\nas your friend, right now.'
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

// ── MAIN TABS (3-world navigation) ─────────────────────────
type TabName = 'circle' | 'inner' | 'outer'

function MyCircleTab({ profile, go }: { profile: UserProfile; go: (s: Screen) => void }) {
  const { t } = useT()
  const [showPost, setShowPost] = useState(false)
  const [viewMoment, setViewMoment] = useState<Moment | null>(null)
  const unread = profile.connections.filter(c => c.messages.length > 0 && c.messages[c.messages.length - 1].role === 'assistant').length

  return (
    <>
      <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 }}>
          <Text style={[g.greeting, { fontSize: 28 }]}>My Circle</Text>
          <Text style={[g.auraSub, { marginTop: 4 }]}>Your 20 most important people</Text>
        </View>

        {profile.circle.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: t.textSub }}>Today's moments</Text>
              <Text style={{ fontSize: 11, color: '#F6379B', fontWeight: '600' }}>★ Video with SOMA+</Text>
            </View>
            <MomentsStrip profile={profile} onAddPress={() => setShowPost(true)} onViewMoment={setViewMoment} />
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          {profile.circle.length === 0 ? (
            <TouchableOpacity onPress={() => go('circle')} style={{ borderRadius: 20, padding: 24, backgroundColor: t.card, borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', alignItems: 'center', gap: 12 }}>
              <Ionicons name="people-outline" size={36} color={t.textSub} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: t.text }}>Add your first person</Text>
              <Text style={{ fontSize: 13, color: t.textSub, textAlign: 'center' }}>Your circle holds your most important people. Soma helps you stay connected.</Text>
            </TouchableOpacity>
          ) : (
            profile.circle.slice(0, 8).map(person => {
              const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = { therapy: 'medical-outline', family: 'home-outline', friend: 'people-outline', work: 'briefcase-outline', romantic: 'heart-outline' }
              const score = Math.min(100, Math.max(0, 40 + person.mentions * 8))
              return (
                <TouchableOpacity key={person.id} onPress={() => go('circle')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border }}>
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#7B6EF620', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={typeIcon[person.type] || 'person-outline'} size={22} color={t.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>{person.name}</Text>
                    <Text style={{ fontSize: 12, color: t.textSub, marginTop: 1 }}>{person.relationship}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, overflow: 'hidden' }}>
                      <View style={{ width: `${score}%` as any, height: '100%', backgroundColor: score > 60 ? '#22C55E' : '#F6A86E', borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 10, color: t.textSub }}>{score}%</Text>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
          {profile.circle.length > 0 && (
            <TouchableOpacity onPress={() => go('circle')} style={{ marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: '#7B6EF610', borderWidth: 1, borderColor: '#7B6EF630', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#7B6EF6' }}>Manage circle & journeys →</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={() => go('relinsights')} style={{ marginHorizontal: 20, borderRadius: 18, padding: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Ionicons name="analytics-outline" size={28} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>Relationship Insights</Text>
            <Text style={{ fontSize: 13, color: t.textSub }}>Soma's view of your connections</Text>
          </View>
          <Text style={{ color: t.textSub, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </ScrollView>
      {showPost && <PostMomentModal profile={profile} onClose={() => setShowPost(false)} onPosted={() => setShowPost(false)} />}
      {viewMoment && <MomentViewer moment={viewMoment} onClose={() => setViewMoment(null)} />}
    </>
  )
}

function OuterWorldTab({ profile, go }: { profile: UserProfile; go: (s: Screen) => void }) {
  const { t } = useT()
  const isInRelationship = profile.circle.some(p => p.type === 'romantic')
  const unread = profile.connections.filter(c => c.messages.length > 0 && c.messages[c.messages.length - 1].role === 'assistant').length

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 100, gap: 14 }}>
      <View style={{ marginBottom: 8 }}>
        <Text style={[g.greeting, { fontSize: 28 }]}>Outer World</Text>
        <Text style={[g.auraSub, { marginTop: 4 }]}>Find people aligned with your values</Text>
      </View>

      {/* Synergy Scan — always featured */}
      <TouchableOpacity onPress={() => go('synergy')} style={{ borderRadius: 20, padding: 20, backgroundColor: '#1A1A2E', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#7B6EF625', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#7B6EF650' }}>
          <Ionicons name="flash-outline" size={26} color="#7B6EF6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>Synergy Scan</Text>
          <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Your AIs find your fit in seconds. Private.</Text>
        </View>
        <Text style={{ color: '#7B6EF6', fontSize: 22 }}>›</Text>
      </TouchableOpacity>

      {/* Dating — hidden if in relationship */}
      {isInRelationship ? (
        <View style={{ borderRadius: 20, padding: 16, backgroundColor: '#FFF0F6', borderWidth: 1.5, borderColor: '#F6379B40', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="heart-outline" size={28} color="#C4196B" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#C4196B' }}>You're in a relationship</Text>
            <Text style={{ fontSize: 13, color: '#C4196B99', marginTop: 2 }}>Dating is hidden while committed.</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => go('meetpeople')} style={{ borderRadius: 20, overflow: 'hidden' }}>
          <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=160&fit=crop' }} style={{ height: 160, justifyContent: 'flex-end', padding: 16 }} imageStyle={{ resizeMode: 'cover' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
            <View style={{ position: 'relative', zIndex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>Serious Daters</Text>
              <Text style={{ color: '#ddd', fontSize: 13 }}>Goal-driven dating · AI-mediated</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      )}

      {/* Other categories */}
      {([
        { id: 'friends', icon: 'people-outline' as keyof typeof Ionicons.glyphMap, label: 'Friends', sub: 'New friends, activity buddies', color: '#1D9E75' },
        { id: 'professional', icon: 'briefcase-outline' as keyof typeof Ionicons.glyphMap, label: 'Professional', sub: 'Mentors, collaborators, peers', color: '#378ADD' },
        { id: 'support', icon: 'headset-outline' as keyof typeof Ionicons.glyphMap, label: 'Support', sub: 'Coaches, accountability', color: '#D85A30' },
      ]).map(cat => (
        <TouchableOpacity key={cat.id} onPress={() => go('meetpeople')} style={{ borderRadius: 18, padding: 16, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: cat.color + '18', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={cat.icon} size={20} color={cat.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>{cat.label}</Text>
            <Text style={{ fontSize: 13, color: t.textSub }}>{cat.sub}</Text>
          </View>
          <Text style={{ color: t.textSub, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Connections */}
      <TouchableOpacity onPress={() => go('connections')} style={{ borderRadius: 18, padding: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ position: 'relative' }}>
          <Ionicons name="chatbubbles-outline" size={28} color={t.accent} />
          {unread > 0 && <View style={{ position: 'absolute', top: -4, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#F66E8E', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{unread}</Text></View>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>Connections</Text>
          <Text style={{ fontSize: 13, color: t.textSub }}>{profile.connections.length > 0 ? `${profile.connections.length} active chats` : 'Your matches will appear here'}</Text>
        </View>
        <Text style={{ color: t.textSub, fontSize: 18 }}>›</Text>
      </TouchableOpacity>

      {/* My Profile */}
      <TouchableOpacity onPress={() => go('myprofile')} style={{ borderRadius: 18, padding: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#7B6EF620', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#7B6EF640' }}>
          <Ionicons name={profile.profilePhoto ? 'camera-outline' : 'person-circle-outline'} size={22} color={t.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>My Profile</Text>
          <Text style={{ fontSize: 13, color: t.textSub }}>How others see you</Text>
        </View>
        <Text style={{ color: t.textSub, fontSize: 18 }}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function MainTabs({ profile, go, onReset }: { profile: UserProfile; go: (s: Screen) => void; onReset: () => void }) {
  const { t: theme } = useT()
  const [tab, setTab] = useState<TabName>('inner')
  const unread = profile.connections.filter(c => c.messages.length > 0 && c.messages[c.messages.length - 1].role === 'assistant').length
  const isGuest = !datingApi.authed()

  type TabItem = { id: TabName; icon: keyof typeof Ionicons.glyphMap; label: string }
  const TAB_ITEMS: TabItem[] = [
    { id: 'circle', icon: 'people-outline',   label: t('tab_circle') },
    { id: 'inner',  icon: 'sparkles-outline', label: t('tab_inner') },
    { id: 'outer',  icon: 'compass-outline',  label: t('tab_explore') },
  ]
  const tabBar = (
    <View dataSet={{ class: 'tab-bar-safe' }} style={{
      position: Platform.OS === 'web' ? 'fixed' as any : 'absolute',
      bottom: 0, left: 0, right: 0,
      flexDirection: 'row', alignItems: 'flex-end',
      backgroundColor: theme.bg,
      borderTopWidth: 0.5, borderTopColor: theme.border,
      paddingBottom: Platform.OS === 'ios' ? 34 : 16, paddingTop: 8, paddingHorizontal: 24,
    }}>
      {TAB_ITEMS.map(item => {
        const active = tab === item.id
        const showBadge = item.id === 'circle' && unread > 0
        return (
          <TouchableOpacity key={item.id} onPress={() => setTab(item.id)} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 }}>
            <View style={{ position: 'relative' }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: active ? '#7B6EF6' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.icon} size={20} color={active ? '#fff' : theme.textSub} />
              </View>
              {showBadge && (
                <View style={{ position: 'absolute', top: -2, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#F66E8E', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.bg }}>
                  <Text style={{ fontSize: 8, fontWeight: '800', color: '#fff' }}>{unread}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, fontWeight: active ? '600' : '500', color: active ? '#7B6EF6' : theme.textSub }}>{item.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  const guestBanner = isGuest ? (
    <TouchableOpacity onPress={() => go('register')} style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingVertical: 9,
      backgroundColor: '#7B6EF612',
      borderBottomWidth: 0.5, borderBottomColor: '#7B6EF630',
    }}>
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#C5BFEC' }} />
      <Text style={{ flex: 1, fontSize: 12, color: theme.textSub, fontWeight: '500' }}>Demo mode · Register to see real people</Text>
      <View style={{ backgroundColor: '#7B6EF620', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
        <Text style={{ fontSize: 11, color: '#7B6EF6', fontWeight: '700' }}>Join free →</Text>
      </View>
    </TouchableOpacity>
  ) : null

  return (
    <View style={{ flex: 1 }}>
      {guestBanner}
      <View style={{ flex: 1 }}>
        {tab === 'inner' && <Home profile={profile} go={go} onReset={onReset} />}
        {tab === 'circle' && <MyCircleTab profile={profile} go={go} />}
        {tab === 'outer' && <OuterWorldTab profile={profile} go={go} />}
      </View>
      {tabBar}
    </View>
  )
}

// ── HOME (Inner World content) ──────────────────────────────
function FadeIn({ delay = 0, children, style }: { delay?: number; children: ReactNode; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(22)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 480, delay, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
      Animated.timing(ty, { toValue: 0, duration: 480, delay, useNativeDriver: false, easing: Easing.out(Easing.cubic) }),
    ]).start()
  }, [])
  return <Animated.View style={[style, { opacity, transform: [{ translateY: ty }] }]}>{children}</Animated.View>
}

function Home({ profile, go, onReset }: { profile: UserProfile; go: (s: Screen) => void; onReset: () => void }) {
  const { t } = useT()
  const totalMem = profile.memories.length
  const recentMoodScore = (() => {
    const logs = profile.moodLogs || []
    if (!logs.length) return null
    const recent = logs.slice(0, 7)
    const avg = recent.reduce((s, l) => s + l.mood, 0) / recent.length
    return Math.round((avg / 5) * 100)
  })()
  // Mood check-in state — declared early so insightCards can use moodPicked
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayMood = (profile.moodLogs || []).find(l => l.date === todayStr)
  const [moodPicked, setMoodPicked] = useState<number | null>(todayMood?.mood ?? null)
  const [moodNote, setMoodNote] = useState('')
  const [moodExpanded, setMoodExpanded] = useState(false)

  const homeScore = (k: DomainKey) => {
    const m = profile.manualScores?.[k]
    if (typeof m === 'number') return m * 10
    const base = profile.wheel?.scores?.[k]?.score ?? domainWellbeing(profile.memories, k)
    if (k === 'mind' && recentMoodScore !== null) return Math.round((base + recentMoodScore) / 2)
    return base
  }
  const streak = calcActivityStreak(profile)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Dynamic focus: pick lowest-scoring domain the user cares about, fallback to onboarding pick
  const focusDomain = (() => {
    const picks = profile.onboarding?.focusDomains
    if (!picks?.length) return profile.onboarding?.focusDomains?.[0] ?? null
    return picks.reduce((worst, key) => homeScore(worst as DomainKey) <= homeScore(key as DomainKey) ? worst : key) as DomainKey
  })()
  const focusLabel = focusDomain ? DOMAINS.find(d => d.key === focusDomain)?.label : null
  const focusDomainObj = focusDomain ? DOMAINS.find(d => d.key === focusDomain) : null

  // Mood context
  const todayMoodVal = moodPicked
  const moodIsLow = todayMoodVal !== null && todayMoodVal <= 2
  const moodIsGood = todayMoodVal !== null && todayMoodVal >= 4

  // Contextual insight cards
  const insightCards = (() => {
    const cards: { id: string; emoji: string; title: string; sub: string; screen: Screen | null; color: string }[] = []
    const now = Date.now()
    const day = 86400000

    // Streak celebration
    if (streak >= 3) cards.push({ id: 'streak', emoji: '🔥', title: `${streak}-day streak!`, sub: 'You\'re showing up every day', screen: null, color: '#FFF3E0' })

    // Mood dip this week
    const last7moods = (profile.moodLogs || []).slice(0, 7)
    if (last7moods.length >= 3) {
      const avg = last7moods.reduce((s, l) => s + l.mood, 0) / last7moods.length
      if (avg < 2.5) cards.push({ id: 'mooddip', emoji: '💙', title: 'Tough week mood-wise', sub: 'Soma is here to talk it through', screen: 'aura', color: '#EFF6FF' })
      else if (avg >= 4) cards.push({ id: 'moodgood', emoji: '✨', title: 'Great mood this week!', sub: 'Keep nurturing what\'s working', screen: null, color: '#F0FDF4' })
    }

    // Wheel score improvement (compare last 2 snapshots)
    const snaps = profile.wheelHistory || []
    if (snaps.length >= 2) {
      const last = snaps[snaps.length - 1]
      const prev = snaps[snaps.length - 2]
      if (last.overall - prev.overall >= 5) cards.push({ id: 'wheelnup', emoji: '📈', title: `Life balance up ${Math.round(last.overall - prev.overall)}pts`, sub: 'Your consistency is paying off', screen: 'lifebalance', color: '#F0FDF4' })
    }

    // Diary gap
    const lastDiary = profile.diary?.[0]
    if (lastDiary) {
      const daysSince = Math.floor((now - new Date(lastDiary.date || 0).getTime()) / day)
      if (daysSince >= 3) cards.push({ id: 'diary', emoji: '📖', title: `${daysSince} days since your last entry`, sub: 'Your future self will thank you', screen: 'diary', color: '#FDF4FF' })
    } else if ((profile.conversations || 0) > 2) {
      cards.push({ id: 'diary0', emoji: '📖', title: 'Start your journal', sub: 'Reflect on what Soma has learned', screen: 'diary', color: '#FDF4FF' })
    }

    // Circle neglect — most neglected person
    if (profile.circle.length > 0) {
      const neglected = profile.circle
        .map(p => ({ p, score: circleHealth(p, profile) }))
        .sort((a, b) => a.score - b.score)[0]
      if (neglected.score < 35) cards.push({ id: 'circle', emoji: '👥', title: `Reconnect with ${neglected.p.name}`, sub: 'You haven\'t mentioned them recently', screen: 'circle', color: '#FFFBF0' })
    }

    // Low score domain nudge
    if (focusDomainObj && homeScore(focusDomain as DomainKey) < 40) {
      cards.push({ id: 'lowscore', emoji: focusDomainObj.icon, title: `${focusDomainObj.label} needs attention`, sub: `Score at ${homeScore(focusDomain as DomainKey)}% — talk to Soma`, screen: 'aura', color: '#F8F7FF' })
    }

    return cards.slice(0, 5)
  })()

  const MOODS: { emoji: string; label: string; val: 1|2|3|4|5 }[] = [
    { emoji: '😔', label: 'Rough', val: 1 },
    { emoji: '😕', label: 'Meh', val: 2 },
    { emoji: '😐', label: 'Okay', val: 3 },
    { emoji: '🙂', label: 'Good', val: 4 },
    { emoji: '😊', label: 'Great', val: 5 },
  ]
  const saveMood = (val: 1|2|3|4|5) => {
    haptic.light()
    setMoodPicked(val)
    DB.addMoodLog(val, moodNote || undefined)
    setMoodExpanded(false)
  }

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

  // Profile completion
  const profileSteps: { key: string; label: string; done: boolean; screen: Screen | null }[] = [
    { key: 'name',    label: 'Add your name',               done: !!profile.name,                    screen: 'settings' },
    { key: 'onboard', label: 'Set your goals',              done: !!profile.onboarding,              screen: null },
    { key: 'memory',  label: 'Share something with Soma',   done: profile.memories.length >= 3,      screen: 'aura' },
    { key: 'wheel',   label: 'Check your Wheel of Life',    done: !!profile.wheel,                   screen: 'lifebalance' },
    { key: 'circle',  label: 'Add someone to your circle',  done: profile.circle.length >= 1,        screen: 'circle' },
    { key: 'diary',   label: 'Write a diary entry',         done: profile.diary.length >= 1,         screen: 'diary' },
    { key: 'dating',  label: 'Share more with Aura',         done: profile.memories.length >= 10,     screen: 'aura' },
    { key: 'mood',    label: 'Log your first mood',         done: (profile.moodLogs || []).length >= 1, screen: null },
  ]
  const completedSteps = profileSteps.filter(s => s.done).length
  const completionPct = Math.round((completedSteps / profileSteps.length) * 100)
  const nextStep = profileSteps.find(s => !s.done) ?? null

  // Recent activity feed
  const recentActivity = (() => {
    type FeedItem = { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; time: string; color: string }
    const items: FeedItem[] = []
    const fmt = (iso: string) => {
      const d = new Date(iso); const now = new Date()
      const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
      if (diff < 60) return `${diff}m ago`
      if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
      return `${Math.floor(diff / 1440)}d ago`
    }
    // Check-ins
    for (const c of (profile.checkins || []).slice(0, 2)) {
      items.push({ key: 'ci_' + c.date, icon: 'sunny-outline', label: 'Check-in', sub: `"${c.intention}"`, time: fmt(c.completedAt), color: '#7B6EF6' })
    }
    // Diary
    for (const d of profile.diary.slice(0, 2)) {
      items.push({ key: 'di_' + d.id, icon: 'book-outline', label: 'Diary entry', sub: d.summary || 'Wrote today', time: fmt(d.date || new Date().toISOString()), color: '#EC4899' })
    }
    // Mood
    for (const m of (profile.moodLogs || []).slice(0, 1)) {
      const MOODLABELS = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Great']
      items.push({ key: 'mo_' + m.date, icon: 'happy-outline', label: 'Mood logged', sub: MOODLABELS[m.mood], time: fmt(m.date + 'T12:00:00'), color: '#F59E0B' })
    }
    // Gratitude
    for (const g2 of (profile.gratitudeEntries || []).slice(0, 1)) {
      items.push({ key: 'gr_' + g2.id, icon: 'leaf-outline', label: 'Gratitude', sub: g2.items[0] || 'Logged gratitude', time: fmt(g2.date + 'T12:00:00'), color: '#10B981' })
    }
    // Bond XP
    for (const p2 of profile.circle.filter(p2 => p2.journey && p2.journey.logs.length > 0).slice(0, 1)) {
      const last = p2.journey!.logs[p2.journey!.logs.length - 1]
      items.push({ key: 'bj_' + p2.id, icon: 'heart-circle-outline', label: `${p2.name} · Bond`, sub: last.note, time: fmt(last.date + 'T12:00:00'), color: '#EC4899' })
    }
    return items.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 4)
  })()

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={g.homePad}>
      {/* ── HERO CARD ── */}
      <FadeIn delay={0}><View style={{ backgroundColor: moodIsLow ? 'rgba(59,130,246,0.06)' : moodIsGood ? 'rgba(16,185,129,0.06)' : 'rgba(123,110,246,0.06)', borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 0.5, borderColor: moodIsLow ? 'rgba(59,130,246,0.15)' : moodIsGood ? 'rgba(16,185,129,0.15)' : 'rgba(123,110,246,0.12)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: t.textSub, marginBottom: 3 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: t.text }}>
              {profile.name ? `${greeting}, ${profile.name}` : greeting}
            </Text>
            {moodIsLow && <Text style={{ fontSize: 12, color: '#3B82F6', marginTop: 4 }}>Soma is here for you today 💙</Text>}
            {moodIsGood && <Text style={{ fontSize: 12, color: '#10B981', marginTop: 4 }}>You're doing great ✨</Text>}
            {!moodPicked && <Text style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>How are you feeling today?</Text>}
          </View>
          <TouchableOpacity onPress={() => go('settings')} onLongPress={onReset}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#7B6EF620', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#7B6EF6' }}>{profile.name ? profile.name.charAt(0).toUpperCase() : '⚙'}</Text>
          </TouchableOpacity>
        </View>
        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 }}>
              <Ionicons name="flame-outline" size={14} color="#F59E0B" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B' }}>{streak} day streak</Text>
            </View>
          )}
          {moodPicked && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(123,110,246,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 4 }}>
              <Text style={{ fontSize: 14 }}>{'😔😕😐🙂😊'.split('')[moodPicked - 1]}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: t.accent }}>{'Rough Meh Okay Good Great'.split(' ')[moodPicked - 1]}</Text>
            </View>
          )}
          {completionPct < 100 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: t.textSub }}>{completionPct}% complete</Text>
            </View>
          )}
        </View>
      </View></FadeIn>

      {/* Daily check-in banner */}
      <FadeIn delay={80}>{(() => {
        const todayCheckin = (profile.checkins || []).find(c => c.date === todayStr)
        if (todayCheckin) {
          return (
            <View style={{ backgroundColor: 'rgba(16,185,129,0.09)', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981', marginBottom: 2 }}>Today's intention</Text>
                <Text style={{ fontSize: 14, color: t.text, fontWeight: '500' }} numberOfLines={1}>{todayCheckin.intention}</Text>
              </View>
            </View>
          )
        }
        const isEvening = hour >= 17
        return (
          <TouchableOpacity onPress={() => go('checkin')}
            style={{ backgroundColor: 'rgba(123,110,246,0.10)', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(123,110,246,0.18)' }}>
            <Ionicons name={isEvening ? 'moon-outline' : 'sunny-outline'} size={24} color={t.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: t.accent, marginBottom: 2 }}>
                {isEvening ? 'Evening check-in' : 'Morning check-in'}
              </Text>
              <Text style={{ fontSize: 14, color: t.text, fontWeight: '500' }}>
                {isEvening ? 'Reflect on your day — 30 seconds' : 'Set your intention for today →'}
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: t.accent }}>›</Text>
          </TouchableOpacity>
        )
      })()}</FadeIn>

      {/* Dynamic focus card */}
      {focusDomainObj && (
        <FadeIn delay={150}><TouchableOpacity
          style={{ backgroundColor: moodIsLow ? 'rgba(59,130,246,0.12)' : 'rgba(123,110,246,0.09)', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          onPress={() => go('aura')}
        >
          <Text style={{ fontSize: 22 }}>{moodIsLow ? '💙' : focusDomainObj.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: moodIsLow ? '#3B82F6' : t.accent, marginBottom: 2 }}>
              {moodIsLow ? 'Soma is with you' : "Today's focus"}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.text }}>
              {moodIsLow ? 'Talk about how you\'re feeling' : focusLabel}
            </Text>
            <Text style={{ fontSize: 12, color: t.textSub, marginTop: 1 }}>
              {homeScore(focusDomain as DomainKey) < 50 && !moodIsLow
                ? `${homeScore(focusDomain as DomainKey)}% — room to grow →`
                : 'Talk to Soma about it →'}
            </Text>
          </View>
        </TouchableOpacity></FadeIn>
      )}

      <FadeIn delay={220}>
      {/* Contextual insight strip */}
      {insightCards.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {insightCards.map(card => (
            <TouchableOpacity
              key={card.id}
              onPress={() => card.screen ? go(card.screen) : null}
              activeOpacity={card.screen ? 0.75 : 1}
              style={{ backgroundColor: t.card, borderRadius: 16, padding: 14, width: 170, borderWidth: 1, borderColor: t.border }}
            >
              <Text style={{ fontSize: 22, marginBottom: 6 }}>{card.emoji}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: t.text, marginBottom: 2 }}>{card.title}</Text>
              <Text style={{ fontSize: 11, color: t.textSub, lineHeight: 15 }}>{card.sub}</Text>
              {card.screen && <Text style={{ fontSize: 11, color: t.accent, marginTop: 6, fontWeight: '600' }}>Open →</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}


      {/* Profile completion card — hidden at 100% */}
      {completionPct < 100 && (
        <View style={{ backgroundColor: t.card, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: t.shadow, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: t.textSub }}>Your profile</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: t.accent }}>{completionPct}%</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.accentLight, marginBottom: 10 }}>
            <View style={{ width: `${completionPct}%` as any, height: 6, borderRadius: 3, backgroundColor: completionPct >= 75 ? '#4CAF7D' : completionPct >= 40 ? t.accent : '#F5A623' }} />
          </View>
          {nextStep && (
            <TouchableOpacity
              onPress={() => nextStep.screen ? go(nextStep.screen) : null}
              activeOpacity={nextStep.screen ? 0.75 : 1}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ fontSize: 13, color: t.textSub }}>
                <Text style={{ color: t.text, fontWeight: '600' }}>Next: </Text>{nextStep.label}
              </Text>
              {nextStep.screen && <Text style={{ fontSize: 13, color: t.accent, fontWeight: '600' }}>→</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Mood check-in */}
      <View style={{ backgroundColor: t.card, borderRadius: 18, padding: 14, marginBottom: 14, shadowColor: t.shadow, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: moodPicked ? 0 : 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: t.textSub }}>How are you feeling?</Text>
          <TouchableOpacity onPress={() => go('moodanalytics')}>
            <Text style={{ fontSize: 11, color: '#7B6EF6', fontWeight: '600' }}>{(profile.moodLogs || []).length > 0 ? 'View trends →' : (moodPicked ? '✓ Logged' : '')}</Text>
          </TouchableOpacity>
        </View>
        {!moodPicked && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {MOODS.map(m => (
              <TouchableOpacity key={m.val} onPress={() => saveMood(m.val)} style={{ alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                <Text style={{ fontSize: 10, color: '#9A9DB2', fontWeight: '500' }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {moodPicked && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 24 }}>{MOODS.find(m => m.val === moodPicked)?.emoji}</Text>
            <Text style={{ fontSize: 14, color: t.text, fontWeight: '500' }}>{MOODS.find(m => m.val === moodPicked)?.label}</Text>
            <TouchableOpacity onPress={() => { setMoodPicked(null); DB.addMoodLog(3) }} style={{ marginLeft: 'auto' }}>
              <Text style={{ fontSize: 12, color: '#C4BBFB' }}>Change</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Soma morning message card */}
      {somaMsg && !somaMsgDismissed && (
        <TouchableOpacity onPress={() => go('aura')} style={{ backgroundColor: t.card, borderRadius: 18, padding: 16, marginBottom: 16, flexDirection: 'row', gap: 12, shadowColor: t.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } }}>
          <SomaMark size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: t.accent, marginBottom: 4 }}>{profile.aiName || 'Soma'}</Text>
            <Text style={{ fontSize: 14, color: t.text, lineHeight: 20 }}>{somaMsg}</Text>
            <Text style={{ fontSize: 12, color: t.textTertiary, marginTop: 6 }}>Tap to reply →</Text>
          </View>
          <TouchableOpacity onPress={e => { e.stopPropagation?.(); setSomaMsgDismissed(true) }} style={{ padding: 4 }}>
            <Text style={{ fontSize: 16, color: '#C4BBFB' }}>×</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      </FadeIn>

      <FadeIn delay={320}>
      {/* Recent activity feed */}
      {recentActivity.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={g.secLabel}>Recently</Text>
            <TouchableOpacity onPress={() => go('timeline')}><Text style={[g.secLabel, { color: '#7B6EF6' }]}>Timeline →</Text></TouchableOpacity>
          </View>
          <View style={{ backgroundColor: t.card, borderRadius: 18, overflow: 'hidden' }}>
            {recentActivity.map((item, i) => (
              <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', padding: 13, gap: 12, borderBottomWidth: i < recentActivity.length - 1 ? 1 : 0, borderBottomColor: t.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: item.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: t.text }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, color: t.textSub, marginTop: 1 }} numberOfLines={1}>{item.sub}</Text>
                </View>
                <Text style={{ fontSize: 11, color: t.textTertiary }}>{item.time}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Circle of Life — the hero of the home screen */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={g.secLabel}>Circle of life</Text>
        <TouchableOpacity onPress={() => go('lifebalance')}><Text style={[g.secLabel, { color: '#7B6EF6' }]}>Details →</Text></TouchableOpacity>
      </View>
      <TouchableOpacity activeOpacity={0.9} onPress={() => go('lifebalance')} style={{ alignItems: 'center', marginBottom: 4 }}>
        <WheelOfLifeChart domains={DOMAINS} scoreOf={homeScore} size={320} />
      </TouchableOpacity>

      <TouchableOpacity style={[g.auraMain, { marginTop: 20 }]} onPress={() => go('aura')}>
        <View style={g.orbSm}><Text style={{ color: '#fff', fontSize: 13 }}>✦</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={g.cardTag}>Aura · AI partner</Text>
          <Text style={g.auraMainTitle}>Talk about anything</Text>
          <Text style={g.auraMainSub}>{totalMem > 0 ? `${totalMem} memories · ${profile.circle.length} people` : 'Start building your story'}</Text>
        </View>
        <Text style={g.arrow}>→</Text>
      </TouchableOpacity>
      </FadeIn>

      <FadeIn delay={440}>
      {/* Daily rituals card */}
      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10)
        const diaryToday = profile.diary.some(e => e.date?.slice(0, 10) === todayStr)
        const loveToday = profile.loveEntries?.some(e => e.date?.slice(0, 10) === todayStr) ?? false
        const gratToday = profile.gratitudeEntries?.some(e => e.date?.slice(0, 10) === todayStr) ?? false
        const activeMeds = (profile.medications || []).filter(m => m.active)
        const medLog = (profile.medLogs || []).find(l => l.date === todayStr)
        const medsDone = activeMeds.length > 0 && activeMeds.every(m => medLog?.doses?.[m.id] !== undefined)
        const rituals: { icon: keyof typeof Ionicons.glyphMap; label: string; done: boolean; screen: Screen }[] = [
          { icon: 'happy-outline',   label: 'Mood',          done: !!moodPicked, screen: 'home' as Screen },
          { icon: 'book-outline',    label: 'Diary',         done: diaryToday,   screen: 'diary' as Screen },
          { icon: 'heart-outline',   label: 'Love Yourself', done: loveToday,    screen: 'loveyourself' as Screen },
          { icon: 'leaf-outline',    label: 'Gratitude',     done: gratToday,    screen: 'gratitude' as Screen },
          ...(activeMeds.length > 0 ? [{ icon: 'medical-outline' as keyof typeof Ionicons.glyphMap, label: 'Medications', done: medsDone, screen: 'medication' as Screen }] : []),
        ]
        const doneCount = rituals.filter(r => r.done).length
        return (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={g.secLabel}>Today</Text>
              <Text style={{ fontSize: 12, color: doneCount === rituals.length ? '#22C55E' : t.textTertiary, fontWeight: '600' }}>{doneCount}/{rituals.length} done</Text>
            </View>
            <View style={{ backgroundColor: t.card, borderRadius: 18, overflow: 'hidden', shadowColor: t.shadow, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 2 } }}>
              {rituals.map((r, i) => (
                <TouchableOpacity key={r.label} onPress={() => r.screen === 'home' ? undefined : go(r.screen)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i < rituals.length - 1 ? 1 : 0, borderBottomColor: t.border, gap: 12 }}>
                  <Ionicons name={r.icon} size={20} color={r.done ? '#22C55E' : t.textSub} style={{ width: 28, textAlign: 'center' }} />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: t.text }}>{r.label}</Text>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: r.done ? '#22C55E' : t.accentLight, alignItems: 'center', justifyContent: 'center' }}>
                    {r.done && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            {/* Quick-nav icon strip */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {([
                { icon: 'book-outline',                 label: 'Diary',    screen: 'diaryhistory' as Screen },
                { icon: 'calendar-outline',             label: 'Timeline', screen: 'timeline'     as Screen },
                { icon: 'analytics-outline',            label: 'Insights', screen: 'insights'     as Screen },
                { icon: 'chatbubble-ellipses-outline',  label: 'Ask Soma', screen: 'asksoma'      as Screen },
                { icon: 'heart-circle-outline',         label: 'Bonds',    screen: 'relinsights'  as Screen },
                { icon: 'people-outline',               label: 'Circle',   screen: 'circle'       as Screen },
              ] as { icon: keyof typeof Ionicons.glyphMap; label: string; screen: Screen }[]).map(item => (
                <TouchableOpacity key={item.screen} onPress={() => go(item.screen)} style={{ alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border }}>
                    <Ionicons name={item.icon} size={22} color={t.accent} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: t.textSub, textAlign: 'center' }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )
      })()}

      {/* Healing Path row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: t.card, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: t.border }} onPress={() => go('healthhub')}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FBEAF0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Ionicons name="fitness-outline" size={20} color="#993556" />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.text, marginBottom: 2 }}>Health Hub</Text>
          <Text style={{ fontSize: 12, color: t.textSub }}>{(() => {
            const todayLog = (profile.healthLogs || []).find(l => l.date === new Date().toISOString().slice(0,10))
            if (todayLog?.steps) return `${todayLog.steps.toLocaleString()} steps today`
            const meds = (profile.medications || []).filter(m => m.active).length
            return meds > 0 ? `${meds} med${meds>1?'s':''} tracked` : 'Track your health'
          })()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, backgroundColor: t.card, borderRadius: 16, padding: 14, borderWidth: 0.5, borderColor: t.border }} onPress={() => go('therapy')}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Ionicons name="pulse-outline" size={20} color="#0F6E56" />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.text, marginBottom: 2 }}>Therapy & Support</Text>
          <Text style={{ fontSize: 12, color: t.textSub }}>{(profile.therapySessions?.length ?? 0) > 0 ? `${profile.therapySessions!.length} sessions` : "You're not alone"}</Text>
        </TouchableOpacity>
      </View>
      </FadeIn>

      <View style={{ height: 100 }} />
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
  const { t } = useT()
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
  const dataPts = scores.map((s, i) => pt(i, (Math.max(s, 5) / 100) * R * prog))
  const polygon = dataPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        {[0.25, 0.5, 0.75, 1].map((r, i) => (
          <SvgCircle key={i} cx={C} cy={C} r={R * r} fill={i === 3 ? 'rgba(123,110,246,0.06)' : 'none'} stroke="#C8C3E8" strokeWidth={i === 3 ? 1.5 : 1} />
        ))}
        {domains.map((d, i) => { const e = pt(i, R); return (
          <SvgLine key={d.key} x1={C} y1={C} x2={e.x} y2={e.y} stroke="#C8C3E8" strokeWidth={1} />
        ) })}
        <SvgPolygon points={polygon} fill="rgba(123,110,246,0.20)" stroke="#7B6EF6" strokeWidth={2.5} strokeLinejoin="round" />
        {dataPts.map((p, i) => (
          <SvgCircle key={i} cx={p.x} cy={p.y} r={4.5} fill={domains[i].color} stroke="#fff" strokeWidth={1.5} />
        ))}
      </Svg>
      {domains.map((d, i) => {
        const lp = pt(i, R + 30)
        return (
          <View key={d.key} style={{ position: 'absolute', width: 56, alignItems: 'center', left: lp.x - 28, top: lp.y - 16 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: t.text, textAlign: 'center' }} numberOfLines={1}>{d.label}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: d.color }}>{Math.round(scores[i] / 10)}</Text>
          </View>
        )
      })}
    </View>
  )
}

// Progress over time: a sparkline of overall balance + biggest mover since the first snapshot.
function WheelHistory({ history }: { history: WheelSnapshot[] }) {
  const { t } = useT()
  if (!history || history.length < 2) {
    return (
      <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
        <Text style={g.secLabel}>Progress over time</Text>
        <View style={[g.matchCard, { marginBottom: 0, backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={{ fontSize: 13, color: t.textSub }}>Check in over the next days — your balance trend will appear here. 📈</Text>
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
      <Text style={{ fontSize: 12, fontWeight: '700', color: t.textSub, letterSpacing: 1, marginBottom: 8 }}>PROGRESS OVER TIME</Text>
      <View style={[g.matchCard, { marginBottom: 0, backgroundColor: t.card, borderColor: t.border }]}>
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
          <Text style={{ fontSize: 12, color: t.textSub, marginTop: 8 }}>
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
  const { t: theme } = useT()
  const [selectedDomain, setSelectedDomain] = useState<DomainKey | null>(null)
  const [expandedInfo, setExpandedInfo] = useState<DomainKey | null>(null)
  const [wheel, setWheel] = useState<WheelAssessment | undefined>(profile.wheel)
  const [assessing, setAssessing] = useState(false)
  const [manual, setManual] = useState<Partial<Record<DomainKey, number>>>(profile.manualScores || {})
  const [goals, setGoals] = useState<Partial<Record<DomainKey, { text: string; deadline: string; progress: number }>>>(profile.domainGoals || {})
  const [goalModal, setGoalModal] = useState<{ key: DomainKey; label: string; color: string } | null>(null)
  const [goalText, setGoalText] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [goalProgress, setGoalProgress] = useState(0)

  const openGoalModal = (key: DomainKey, label: string, color: string) => {
    const existing = goals[key]
    setGoalText(existing?.text || '')
    setGoalDeadline(existing?.deadline || (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })())
    setGoalProgress(existing?.progress || 0)
    setGoalModal({ key, label, color })
  }
  const saveGoal = () => {
    if (!goalModal) return
    const goal = goalText.trim() ? { text: goalText.trim(), deadline: goalDeadline, progress: goalProgress } : null
    DB.setDomainGoal(goalModal.key, goal)
    setGoals(prev => { const n = { ...prev }; if (goal) n[goalModal.key] = goal; else delete n[goalModal.key]; return n })
    setGoalModal(null)
  }
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
    <ScrollView style={[g.screen, { backgroundColor: theme.bg }]} contentContainerStyle={{ minHeight: '100%', paddingBottom: 60 }}>
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>{t('back')}</Text></TouchableOpacity></View>

      <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
        <Text style={g.greeting}>{t('wheelTitle')}</Text>
        <Text style={g.auraSub} style={{ marginTop: 6, fontSize: 13, color: theme.textSub }}>
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
            <Text style={{ marginTop: 10, fontSize: 13, color: theme.textSub, textAlign: 'center', paddingHorizontal: 34, lineHeight: 19 }}>
              {smooth ? 'A smooth, rounded wheel — your life feels well balanced right now. 🌿'
                : 'A jagged wheel — the dips are where life feels bumpy. Focus on your lowest 1–2 areas to round it out.'}
            </Text>
          )
        })()}
      </View>

      {/* Domain Details */}
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 16 }}>{t('yourInsights')}</Text>

        {DOMAINS.map(d => {
          const items = profile.memories.filter(m => m.domain === d.key)
          const score = domScore(d.key)
          const note = domNote(d.key)

          return (
            <View key={d.key} style={{ marginBottom: 12, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 0.5, borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: d.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={DOMAIN_ICONS[d.key]} size={20} color={d.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={g.lbTitle}>{d.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: theme.border2, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.min(score, 100)}%`, height: '100%', backgroundColor: d.color, borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: d.color }}>{items.length ? score : '–'}</Text>
                  </View>
                  {!!note && <Text style={{ fontSize: 12, color: theme.textSub, marginTop: 6, fontStyle: 'italic' }}>”{note}”</Text>}
                </View>
              </View>

              {/* Your own 1–10 self-rating (overrides Soma's score) */}
              <View style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: theme.textSub }}>Rate yourself</Text>
                  {typeof manual[d.key] === 'number'
                    ? <Text style={{ fontSize: 12, fontWeight: '700', color: d.color }}>{manual[d.key]}/10</Text>
                    : <Text style={{ fontSize: 11, color: theme.textTertiary }}>tap to rate</Text>
                  }
                </View>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => {
                    const on = typeof manual[d.key] === 'number' && n <= manual[d.key]!
                    return (
                      <TouchableOpacity key={n} onPress={() => setRating(d.key, n)}
                        style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: on ? d.color : (theme.border2 || '#E9E6F2') }} />
                    )
                  })}
                </View>
              </View>

              {/* 30-day goal */}
              {goals[d.key] ? (
                <TouchableOpacity onPress={() => openGoalModal(d.key, d.label, d.color)}
                  style={{ backgroundColor: d.color + '12', borderRadius: 12, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: d.color + '30' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: d.color }}>Goal</Text>
                    <Text style={{ fontSize: 10, color: theme.textTertiary }}>{goals[d.key]!.deadline} · {goals[d.key]!.progress}%</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: theme.text, marginBottom: 6 }}>{goals[d.key]!.text}</Text>
                  <View style={{ height: 4, backgroundColor: theme.border2, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ width: `${goals[d.key]!.progress}%` as any, height: '100%', backgroundColor: d.color, borderRadius: 2 }} />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => openGoalModal(d.key, d.label, d.color)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, color: theme.textTertiary, fontWeight: '600' }}>+ Set a 30-day goal</Text>
                </TouchableOpacity>
              )}

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
                    <Text style={g.lbSectionLabel}>Today's health data</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {todayHealth?.steps !== undefined && (
                        <View style={g.healthMetricChip}>
                          <Ionicons name="footsteps-outline" size={16} color="#6E8BF6" />
                          <Text style={g.healthMetricVal}>{todayHealth.steps.toLocaleString()}</Text>
                          <Text style={g.healthMetricLbl}>steps</Text>
                        </View>
                      )}
                      {todayHealth?.sleepHours !== undefined && (
                        <View style={g.healthMetricChip}>
                          <Ionicons name="moon-outline" size={16} color="#A89BFA" />
                          <Text style={g.healthMetricVal}>{todayHealth.sleepHours}h</Text>
                          <Text style={g.healthMetricLbl}>sleep</Text>
                        </View>
                      )}
                      {todayHealth?.heartRate !== undefined && (
                        <View style={g.healthMetricChip}>
                          <Ionicons name="heart-outline" size={16} color="#F66E8E" />
                          <Text style={g.healthMetricVal}>{todayHealth.heartRate}</Text>
                          <Text style={g.healthMetricLbl}>bpm</Text>
                        </View>
                      )}
                      {todayHealth?.activeMinutes !== undefined && (
                        <View style={g.healthMetricChip}>
                          <Ionicons name="flash-outline" size={16} color="#6EE6C0" />
                          <Text style={g.healthMetricVal}>{todayHealth.activeMinutes}m</Text>
                          <Text style={g.healthMetricLbl}>active</Text>
                        </View>
                      )}
                      {activeMeds.length > 0 && (
                        <View style={[g.healthMetricChip, { backgroundColor: medTaken === medTotal && medTotal > 0 ? '#6EE6C015' : '#FFF5F5' }]}>
                          <Ionicons name="medical-outline" size={16} color={medTaken === medTotal && medTotal > 0 ? '#2A7A5E' : '#E8636F'} />
                          <Text style={[g.healthMetricVal, { color: medTaken === medTotal && medTotal > 0 ? '#2A7A5E' : '#E8636F' }]}>{medTaken}/{medTotal}</Text>
                          <Text style={g.healthMetricLbl}>meds</Text>
                        </View>
                      )}
                      {adherencePct !== null && (
                        <View style={g.healthMetricChip}>
                          <Ionicons name="stats-chart-outline" size={16} color="#6E8BF6" />
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
                  <Text style={g.lbSectionLabel}>What you've shared</Text>
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
                  <Text style={g.lbSectionLabel}>Reflect on this</Text>
                  {DOMAIN_INFO[d.key].questions.map((q, i) => (
                    <View key={i} style={g.lbQuestion}>
                      <Text style={[g.lbQNum, { backgroundColor: d.color }]}>{i + 1}</Text>
                      <Text style={g.lbQTxt}>{q}</Text>
                    </View>
                  ))}

                  {/* Tips */}
                  <Text style={[g.lbSectionLabel, { marginTop: 14 }]}>Practical tips</Text>
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
        <View style={[g.matchCard, { marginBottom: 0, backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSub, letterSpacing: 1, marginBottom: 8 }}>{t('overallBalance')}</Text>
          {(() => { return (
            <>
              <Text style={{ fontSize: 48, fontWeight: '800', color: theme.accent }}>{ob}</Text>
              <Text style={{ fontSize: 14, color: theme.textSub, marginTop: 8 }}>
                {ob < 35 ? 'Some areas are weighing on you. Talk it through with Soma — one step at a time.'
                  : ob < 65 ? 'Finding your balance. Keep sharing the wins and the struggles.'
                  : 'You\'re in a good place across your life right now. 🌱'}
              </Text>
            </>
          ) })()}
        </View>
      </View>

      {/* Mood trend */}
      {(profile.moodLogs || []).length > 0 && (() => {
        const MOOD_COLORS = ['#F66E8E', '#F6A86E', '#F6E86E', '#6EE6C0', '#7B6EF6']
        const MOOD_LABELS = ['Rough', 'Meh', 'Okay', 'Good', 'Great']
        const days = Array.from({ length: 14 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (13 - i))
          return d.toISOString().slice(0, 10)
        })
        const logs = profile.moodLogs || []
        return (
          <View style={{ paddingHorizontal: 24, marginTop: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSub, letterSpacing: 0.8, marginBottom: 12 }}>MOOD — LAST 14 DAYS</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 52 }}>
              {days.map(day => {
                const log = logs.find(l => l.date === day)
                const color = log ? MOOD_COLORS[log.mood - 1] : theme.border2
                const h = log ? 10 + (log.mood - 1) * 9 : 6
                return (
                  <View key={day} style={{ alignItems: 'center', gap: 3 }}>
                    <View style={{ width: 16, height: h, borderRadius: 4, backgroundColor: color }} />
                    {log && <Text style={{ fontSize: 8, color: theme.textTertiary }}>{new Date(day).getDate()}</Text>}
                    {!log && <View style={{ height: 10 }} />}
                  </View>
                )
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {MOOD_COLORS.map((c, i) => (
                <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                  <Text style={{ fontSize: 10, color: theme.textTertiary }}>{MOOD_LABELS[i]}</Text>
                </View>
              ))}
            </View>
          </View>
        )
      })()}

      <WheelHistory history={hist} />
      <View style={{ height: 40 }} />

      {/* Goal edit modal */}
      <Modal visible={!!goalModal} transparent animationType="slide" onRequestClose={() => setGoalModal(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: goalModal?.color }} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>30-day goal · {goalModal?.label}</Text>
            </View>

            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSub, marginBottom: 6 }}>WHAT DO YOU WANT TO ACHIEVE?</Text>
            <TextInput
              style={{ backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, fontSize: 15, color: theme.text, marginBottom: 14 }}
              value={goalText}
              onChangeText={setGoalText}
              placeholder={`e.g. Run 3× per week, meditate daily…`}
              placeholderTextColor={theme.textTertiary}
              maxLength={120}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSub, marginBottom: 6 }}>TARGET DATE</Text>
            <TextInput
              style={{ backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, fontSize: 15, color: theme.text, marginBottom: 14 }}
              value={goalDeadline}
              onChangeText={setGoalDeadline}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textTertiary}
              maxLength={10}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSub, marginBottom: 8 }}>PROGRESS — {goalProgress}%</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
                <TouchableOpacity key={v} onPress={() => setGoalProgress(v)}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: goalProgress === v ? goalModal?.color : theme.bg, borderWidth: 1, borderColor: goalProgress === v ? goalModal?.color || theme.accent : theme.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: goalProgress === v ? '#fff' : theme.textSub }}>{v}%</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {goals[goalModal?.key as DomainKey] && (
                <TouchableOpacity onPress={() => { DB.setDomainGoal(goalModal!.key, null); setGoals(prev => { const n = { ...prev }; delete n[goalModal!.key]; return n }); setGoalModal(null) }}
                  style={{ paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8636F20', backgroundColor: '#E8636F10' }}>
                  <Text style={{ color: '#E8636F', fontWeight: '700', fontSize: 13 }}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setGoalModal(null)} style={{ flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: theme.textSub, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveGoal} style={{ flex: 2, borderRadius: 12, backgroundColor: goalModal?.color || '#7B6EF6', paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

// ── CIRCLE HEALTH ──────────────────────────────────────────
function circleHealth(person: CirclePerson, profile: UserProfile): number {
  const name = person.name.toLowerCase()
  const now = Date.now()
  const day = 86400000

  // Recency of memory mentions (last 30 days)
  const mentions = (profile.memories || []).filter(m => m.content.toLowerCase().includes(name))
  const recent7  = mentions.filter(m => now - new Date(m.createdAt || 0).getTime() < 7  * day)
  const recent30 = mentions.filter(m => now - new Date(m.createdAt || 0).getTime() < 30 * day)
  const sentimentScore = mentions.reduce((s, m) => s + (m.sentiment === 'positive' ? 1 : m.sentiment === 'negative' ? -0.5 : 0), 0)

  // Conversation activity with Soma about them
  const msgCount = person.messages?.length || 0
  const chatScore = Math.min(msgCount / 5, 1)

  // Combine: frequency + recency + sentiment + chat
  const freq = Math.min(recent7.length * 15 + recent30.length * 5, 50)
  const sent = Math.min(Math.max(sentimentScore * 5, -10), 20)
  const chat = chatScore * 20

  return Math.max(0, Math.min(100, Math.round(freq + sent + chat + 10)))
}

function healthColor(score: number): string {
  if (score >= 65) return '#4CAF7D'
  if (score >= 35) return '#F5A623'
  return '#E57373'
}

async function generateReachOut(person: CirclePerson, profile: UserProfile): Promise<string> {
  const name = person.name
  const mentions = (profile.memories || [])
    .filter(m => m.content.toLowerCase().includes(name.toLowerCase()))
    .slice(0, 6).map(m => m.content).join('; ')

  const prompt = `Write a warm, natural message that ${profile.name || 'a friend'} could send to ${name} (their ${person.relationship || person.type}) to check in or reconnect. Keep it short (2-3 sentences), casual, sincere. Don't start with "Hey" or "Hi". No emojis. Context about ${name}: ${mentions || 'close person in their life'}.`

  const text = await groq([{ role: 'user', content: prompt }],
    'You write warm, human-sounding reach-out messages. Be genuine, not generic.', 120, 0.9)
  return text || `Hey ${name}, I've been thinking about you. Hope everything's going well on your end — would love to catch up soon.`
}

// ── THERAPIST REPORT GENERATOR ─────────────────────────────
async function generateTherapistReport(profile: UserProfile, therapistName: string): Promise<string> {
  const recent = new Date(); recent.setDate(recent.getDate() - 7)
  const recentLogs = (profile.moodLogs || []).filter(l => new Date(l.date) >= recent)
  const avgMood = recentLogs.length
    ? (recentLogs.reduce((s, l) => s + l.mood, 0) / recentLogs.length).toFixed(1)
    : null
  const moodLine = avgMood
    ? `Average mood: ${avgMood}/5 across ${recentLogs.length} check-ins`
    : 'No mood check-ins this week'

  const recentMemories = profile.memories.slice(0, 30)
  const concerns = recentMemories.filter(m => m.sentiment === 'negative').map(m => m.content)
  const positives = recentMemories.filter(m => m.sentiment === 'positive').map(m => m.content)
  const recentDiary = (profile.diary || []).slice(0, 5).map(d => `${d.date}: ${d.summary}`).join('\n')
  const wheel = profile.wheel?.scores
    ? Object.entries(profile.wheel.scores).map(([k, v]: any) => `${k}: ${v.score}%`).join(', ')
    : 'Not completed'

  const prompt = `You are Soma, an AI companion. Write a professional clinical summary for ${therapistName}, the therapist of ${profile.name || 'the patient'}.

DATA:
- Mood: ${moodLine}
- Concerns mentioned: ${concerns.slice(0, 5).join('; ') || 'none flagged'}
- Positive themes: ${positives.slice(0, 5).join('; ') || 'none noted'}
- Diary this week: ${recentDiary || 'no entries'}
- Life balance wheel: ${wheel}

Write a structured report with these sections:
1. MOOD & EMOTIONAL STATE
2. KEY THEMES
3. AREAS OF CONCERN (if any - be specific but non-alarmist)
4. STRENGTHS & POSITIVE PATTERNS
5. SUGGESTED TALKING POINTS (3 bullet points for the session)

Tone: warm, clinical, concise. Max 350 words. Do NOT invent facts not in the data.`

  const raw = await groq([{ role: 'user', content: prompt }],
    'You are Soma, a compassionate AI companion writing professional therapist summaries. Be factual and clinical.', 500)
  return raw || 'Unable to generate report — please try again.'
}

// ── AGENT-TO-AGENT CONVERSATION GENERATOR ──────────────────
async function generateAgentConversation(
  person: CirclePerson,
  profile: UserProfile
): Promise<{ speaker: 'A' | 'B'; text: string }[]> {
  const name = person.name
  const userName = profile.name || 'the user'
  const aiName = profile.aiName || 'Soma'
  const rel = person.type

  const mentions = (profile.memories || [])
    .filter(m => m.content.toLowerCase().includes(name.toLowerCase()))
    .slice(0, 8).map(m => `- ${m.content}`).join('\n')

  const recentMsgs = (person.messages || [])
    .slice(-6).map(m => `${m.role === 'user' ? userName : aiName}: ${m.content}`).join('\n')

  const moodLogs = (profile.moodLogs || []).slice(-5)
  const avgMood = moodLogs.length
    ? (moodLogs.reduce((s, l) => s + l.mood, 0) / moodLogs.length).toFixed(1)
    : null

  const prompt = `You are writing a short dialogue between two AI companions:
- SOMA_A: ${aiName}, the personal AI of ${userName}. Knows ${userName}'s feelings, goals, and inner world.
- SOMA_B: ${name}'s Soma — an AI representing ${name} (${rel} of ${userName}).

Context about ${userName}:
- Mood lately: ${avgMood ? `${avgMood}/5` : 'unknown'}
- What ${userName} has shared about ${name}: ${mentions || 'Not much yet — they are new to each other.'}
- Recent chat about ${name}: ${recentMsgs || 'None yet.'}

Generate a warm, insightful 6-8 line dialogue. The agents talk ABOUT their users — sharing what they know, noticing what the relationship needs, and offering gentle suggestions. Format STRICTLY as:
SOMA_A: [line]
SOMA_B: [line]
(alternating, starting with SOMA_A)

Be personal, warm, and specific. End with something actionable — one concrete thing the two people could do together.`

  const raw = await groq([{ role: 'user', content: prompt }],
    'You write warm, insightful dialogues between AI companions. Be specific, not generic. Short sentences.', 500, 0.85)

  if (!raw) return []

  const lines = raw.split('\n').filter(l => l.trim().startsWith('SOMA_A:') || l.trim().startsWith('SOMA_B:'))
  return lines.map(l => {
    const isA = l.trim().startsWith('SOMA_A:')
    return { speaker: isA ? 'A' as const : 'B' as const, text: l.replace(/^SOMA_[AB]:\s*/,'').trim() }
  })
}

async function sendTherapistReport(
  authToken: string, therapistEmail: string, therapistName: string,
  patientName: string, reportText: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/reports/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ therapistEmail, therapistName, patientName, reportText }),
    })
    if (!res.ok) { const e = await res.json(); return { ok: false, error: e.error || 'Server error' } }
    return { ok: true }
  } catch { return { ok: false, error: 'Network error' } }
}

// ── CIRCLE OF PEOPLE ───────────────────────────────────────
// ════════════════════════════════════════════════════════════
//  BOND JOURNEY — gamified relationship journey per person
// ════════════════════════════════════════════════════════════
const QUEST_POOL = [
  { id: 'meal',       emoji: '🍽️', title: 'Share a meal',          desc: 'Sit down and eat together — no phones',              xp: 40 },
  { id: 'letter',     emoji: '✍️', title: 'Write them a note',     desc: 'Tell them something you\'ve never said out loud',     xp: 50 },
  { id: 'memory',     emoji: '📸', title: 'Create a shared memory', desc: 'Do something together you\'ll both remember',        xp: 60 },
  { id: 'listen',     emoji: '👂', title: 'Really listen',          desc: 'Let them talk for 15 min without giving advice',     xp: 35 },
  { id: 'surprise',   emoji: '🎁', title: 'Small surprise',         desc: 'Do or get something thoughtful for them',            xp: 45 },
  { id: 'active',     emoji: '🏃', title: 'Move together',          desc: 'Walk, hike, or exercise side by side',               xp: 40 },
  { id: 'vulnerable', emoji: '💬', title: 'Be vulnerable',          desc: 'Share something you\'re nervous to say',             xp: 55 },
  { id: 'goal',       emoji: '🎯', title: 'Set a shared goal',      desc: 'Pick something to work toward together',             xp: 50 },
  { id: 'midnight',   emoji: '🌙', title: 'Lose track of time',     desc: 'Talk until you forget what hour it is',              xp: 45 },
  { id: 'gratitude',  emoji: '💜', title: 'Express gratitude',      desc: 'Tell them specifically what you appreciate',        xp: 40 },
  { id: 'help',       emoji: '🤝', title: 'Help each other',        desc: 'Work on something hard together',                    xp: 50 },
  { id: 'explore',    emoji: '🗺️', title: 'Go somewhere new',       desc: 'Visit a place neither of you has been',              xp: 55 },
  { id: 'laugh',      emoji: '😂', title: 'Laugh until it hurts',   desc: 'Find something that makes you both crack up',       xp: 30 },
  { id: 'deep',       emoji: '🌊', title: 'Go deep',                desc: 'Ask each other a question you\'ve never dared to',  xp: 55 },
  { id: 'offline',    emoji: '📵', title: 'A phone-free afternoon', desc: 'Spend real time together without distractions',      xp: 50 },
]

const BOND_LEVELS = [
  { level: 1, name: 'First spark',  emoji: '🌱', minXp: 0,    maxXp: 100,  color: '#10B981', desc: 'Every great bond starts here.' },
  { level: 2, name: 'Growing',      emoji: '🌿', minXp: 100,  maxXp: 300,  color: '#84CC16', desc: 'You\'re building something real.' },
  { level: 3, name: 'Blooming',     emoji: '🌸', minXp: 300,  maxXp: 600,  color: '#EC4899', desc: 'Trust is taking root between you.' },
  { level: 4, name: 'Rooted',       emoji: '🌳', minXp: 600,  maxXp: 1000, color: '#7B6EF6', desc: 'A deep, resilient connection.' },
  { level: 5, name: 'Bonded',       emoji: '✨', minXp: 1000, maxXp: 9999, color: '#F59E0B', desc: 'Something rare and precious.' },
]

const BOND_MILESTONES = [
  { id: 'start',   emoji: '🌟', title: 'Journey begins',    check: (_j: BondJourneyData) => true },
  { id: 'xp50',    emoji: '🔥', title: 'First 50 XP',       check: (j: BondJourneyData) => j.xp >= 50 },
  { id: 'quest1',  emoji: '⚡', title: 'First quest done',  check: (j: BondJourneyData) => j.completedQuests.length >= 1 },
  { id: 'log3',    emoji: '📖', title: '3 moments logged',  check: (j: BondJourneyData) => j.logs.length >= 3 },
  { id: 'xp100',   emoji: '💎', title: '100 XP',            check: (j: BondJourneyData) => j.xp >= 100 },
  { id: 'quest3',  emoji: '🏆', title: 'Three quests done', check: (j: BondJourneyData) => j.completedQuests.length >= 3 },
  { id: 'xp300',   emoji: '🌸', title: 'Blooming',          check: (j: BondJourneyData) => j.xp >= 300 },
  { id: 'xp600',   emoji: '🌳', title: 'Deeply Rooted',     check: (j: BondJourneyData) => j.xp >= 600 },
  { id: 'xp1000',  emoji: '✨', title: 'Bonded',            check: (j: BondJourneyData) => j.xp >= 1000 },
]

function getBondLevel(xp: number) {
  return BOND_LEVELS.slice().reverse().find(l => xp >= l.minXp) || BOND_LEVELS[0]
}

function getActiveQuests(person: CirclePerson, journey: BondJourneyData): typeof QUEST_POOL {
  const available = QUEST_POOL.filter(q => !journey.completedQuests.includes(q.id))
  if (available.length === 0) return []
  // stable deterministic selection based on person id + completed count
  const seed = person.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + journey.completedQuests.length * 7
  const result: typeof QUEST_POOL = []
  for (let i = 0; i < 3 && i < available.length; i++) {
    result.push(available[(seed + i * 5) % available.length])
  }
  return [...new Map(result.map(q => [q.id, q])).values()]
}

function BondJourney({ person, profile, onBack, onRefresh }: {
  person: CirclePerson; profile: UserProfile; onBack: () => void; onRefresh: () => void
}) {
  const { t } = useT()
  const [journey, setJourney] = useState<BondJourneyData>(() =>
    person.journey ?? { xp: 0, completedQuests: [], logs: [], startedAt: new Date().toISOString().slice(0, 10) }
  )
  const [logModal, setLogModal] = useState(false)
  const [logNote, setLogNote] = useState('')
  const [justCompleted, setJustCompleted] = useState<string | null>(null)
  const [levelUpAnim] = useState(new Animated.Value(1))

  const level = getBondLevel(journey.xp)
  const nextLevel = BOND_LEVELS.find(l => l.level === level.level + 1)
  const xpInLevel = journey.xp - level.minXp
  const xpToNext = nextLevel ? nextLevel.minXp - level.minXp : 1
  const progress = Math.min(xpInLevel / xpToNext, 1)
  const activeQuests = getActiveQuests(person, journey)

  const save = (j: BondJourneyData) => {
    setJourney(j)
    DB.updateJourney(person.id, j)
    onRefresh()
  }

  // Start journey on first visit
  useEffect(() => {
    if (!person.journey) {
      save(journey)
    }
  }, [])

  const completeQuest = (questId: string) => {
    const quest = QUEST_POOL.find(q => q.id === questId)
    if (!quest || journey.completedQuests.includes(questId)) return
    const newJourney = { ...journey, xp: journey.xp + quest.xp, completedQuests: [...journey.completedQuests, questId] }
    save(newJourney)
    setJustCompleted(questId)
    Animated.sequence([
      Animated.timing(levelUpAnim, { toValue: 1.08, duration: 180, useNativeDriver: true }),
      Animated.spring(levelUpAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
    ]).start(() => setTimeout(() => setJustCompleted(null), 2000))
  }

  const addLog = () => {
    if (!logNote.trim()) return
    const log: BondLog = { date: new Date().toISOString().slice(0, 10), note: logNote.trim(), xpGained: 20 }
    const newJourney = { ...journey, xp: journey.xp + 20, logs: [log, ...journey.logs] }
    save(newJourney)
    setLogNote(''); setLogModal(false)
  }

  // SVG ring
  const R = 52; const C = 2 * Math.PI * R
  const dash = progress * C
  const SZ = 130

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: '800', color: t.text, marginTop: 12 }}>{person.name}'s Journey</Text>
        <Text style={{ fontSize: 13, color: t.textSub, marginTop: 2 }}>{level.desc}</Text>
      </View>

      {/* Level ring */}
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Animated.View style={{ transform: [{ scale: levelUpAnim }] }}>
          <Svg width={SZ} height={SZ}>
            {/* Track ring */}
            <SvgCircle cx={SZ/2} cy={SZ/2} r={R} fill="none" stroke={t.border} strokeWidth={10} />
            {/* Progress arc */}
            <SvgCircle cx={SZ/2} cy={SZ/2} r={R} fill="none"
              stroke={level.color} strokeWidth={10} strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              strokeDashoffset={C * 0.25}
              transform={`rotate(-90 ${SZ/2} ${SZ/2})`}
            />
          </Svg>
          {/* Center content */}
          <View style={{ position: 'absolute', top: 0, left: 0, width: SZ, height: SZ, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 30 }}>{level.emoji}</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: t.text, marginTop: 2 }}>{journey.xp} XP</Text>
          </View>
        </Animated.View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: level.color, marginTop: 14 }}>
          Level {level.level} · {level.name}
        </Text>
        {nextLevel && (
          <Text style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>
            {nextLevel.minXp - journey.xp} XP to {nextLevel.emoji} {nextLevel.name}
          </Text>
        )}
        {/* XP bar */}
        <View style={{ width: 220, height: 6, backgroundColor: t.border, borderRadius: 3, marginTop: 12 }}>
          <View style={{ height: 6, width: `${Math.round(progress * 100)}%` as any, backgroundColor: level.color, borderRadius: 3 }} />
        </View>
      </View>

      {/* Active quests */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          ⚡ Active quests
        </Text>
        {activeQuests.length === 0 ? (
          <View style={{ backgroundColor: t.card, borderRadius: 16, padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, marginBottom: 6 }}>🎉</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }}>All quests complete!</Text>
            <Text style={{ fontSize: 12.5, color: t.textSub, marginTop: 4, textAlign: 'center' }}>
              More will appear as you keep growing this bond.
            </Text>
          </View>
        ) : activeQuests.map(q => {
          const done = justCompleted === q.id
          return (
            <View key={q.id} style={{ backgroundColor: t.card, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14,
              borderWidth: done ? 2 : 1, borderColor: done ? '#10B981' : t.border }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: done ? '#ECFDF5' : t.input, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{done ? '✅' : q.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: done ? '#10B981' : t.text }}>{q.title}</Text>
                <Text style={{ fontSize: 12, color: t.textSub, marginTop: 2, lineHeight: 17 }}>{q.desc}</Text>
                <Text style={{ fontSize: 11, color: level.color, fontWeight: '700', marginTop: 4 }}>+{q.xp} XP</Text>
              </View>
              <TouchableOpacity onPress={() => completeQuest(q.id)}
                style={{ backgroundColor: done ? '#10B981' : level.color, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{done ? '✓ Done' : 'Done!'}</Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </View>

      {/* Milestones */}
      <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: t.textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          🏆 Milestones
        </Text>
        <View style={{ backgroundColor: t.card, borderRadius: 16, padding: 16, gap: 12 }}>
          {BOND_MILESTONES.map(ms => {
            const earned = ms.check(journey)
            return (
              <View key={ms.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: earned ? 1 : 0.4 }}>
                <Text style={{ fontSize: 20 }}>{earned ? ms.emoji : '○'}</Text>
                <Text style={{ fontSize: 13.5, fontWeight: earned ? '700' : '500', color: earned ? t.text : t.textSub }}>{ms.title}</Text>
                {earned && <View style={{ flex: 1, alignItems: 'flex-end' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} /></View>}
              </View>
            )
          })}
        </View>
      </View>

      {/* Moments log */}
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: t.textSub, textTransform: 'uppercase', letterSpacing: 1 }}>
            📝 Moments
          </Text>
          <TouchableOpacity onPress={() => setLogModal(true)}
            style={{ backgroundColor: level.color, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>+ Log +20 XP</Text>
          </TouchableOpacity>
        </View>
        {journey.logs.length === 0 ? (
          <TouchableOpacity onPress={() => setLogModal(true)}
            style={{ backgroundColor: t.card, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: t.border, borderStyle: 'dashed' as any }}>
            <Text style={{ fontSize: 13, color: t.textSub, textAlign: 'center' }}>
              Log a real moment you shared — something you want to remember.{'\n'}Each log earns +20 XP.
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 8 }}>
            {journey.logs.slice(0, 10).map((log, i) => (
              <View key={i} style={{ backgroundColor: t.card, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 10, color: t.textTertiary, fontWeight: '600' }}>{log.date}</Text>
                  <Text style={{ fontSize: 11, color: level.color, fontWeight: '700', marginTop: 2 }}>+{log.xpGained} XP</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 13.5, color: t.text, lineHeight: 20 }}>{log.note}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Log moment modal */}
      <Modal visible={logModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setLogModal(false)}>
        <View style={{ flex: 1, backgroundColor: t.bg, padding: 28 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: t.text, marginBottom: 6 }}>Log a moment</Text>
          <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 20 }}>What happened with {person.name}? A sentence is enough.</Text>
          <TextInput
            value={logNote} onChangeText={setLogNote}
            placeholder={`e.g. "We stayed up until 2am talking about everything"`}
            placeholderTextColor={t.textTertiary}
            multiline numberOfLines={4} autoFocus
            style={{ backgroundColor: t.input, borderRadius: 14, padding: 16, fontSize: 14, color: t.text, minHeight: 110, textAlignVertical: 'top', borderWidth: 1, borderColor: t.border }}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity onPress={() => { setLogModal(false); setLogNote('') }}
              style={{ flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: t.card }}>
              <Text style={{ color: t.textSub, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={addLog} disabled={!logNote.trim()}
              style={{ flex: 2, borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: logNote.trim() ? level.color : t.border }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save +20 XP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

// ── DAILY CHECK-IN RITUAL ────────────────────────────────────
function DailyCheckinScreen({ profile, onDone, onBack }: {
  profile: UserProfile; onDone: () => void; onBack: () => void
}) {
  const { t, dark } = useT()
  const [step, setStep] = useState(0)          // 0=mood, 1=intention, 2=gratitude, 3=done
  const [mood, setMood] = useState<1|2|3|4|5 | null>(null)
  const [intention, setIntention] = useState('')
  const [gratitude, setGratitude] = useState('')
  const slideAnim = useRef(new Animated.Value(0)).current
  const doneScale = useRef(new Animated.Value(0)).current
  const hour = new Date().getHours()
  const isEvening = hour >= 17
  const name = profile.name || 'friend'

  const MOODS: { emoji: string; label: string; val: 1|2|3|4|5 }[] = [
    { emoji: '😔', label: 'Rough', val: 1 },
    { emoji: '😕', label: 'Meh', val: 2 },
    { emoji: '😐', label: 'Okay', val: 3 },
    { emoji: '🙂', label: 'Good', val: 4 },
    { emoji: '😊', label: 'Great', val: 5 },
  ]

  const INTENTION_CHIPS = isEvening
    ? ['Rest and recharge', 'Connect with someone I love', 'Reflect on today', 'Plan for tomorrow', 'Practice self-care']
    : ['Focus deeply on one task', 'Move my body', 'Connect with someone', 'Be present and calm', 'Create something']

  const GRATITUDE_CHIPS = [
    'My health', 'People who love me', 'A moment of peace', 'Something I learned', 'A simple pleasure today'
  ]

  const advanceStep = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start()
    setStep(s => s + 1)
  }

  useEffect(() => {
    if (step === 3) {
      Animated.spring(doneScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start()
      // Save everything
      const today = new Date().toISOString().slice(0, 10)
      if (mood) DB.addMoodLog(mood)
      if (gratitude.trim()) DB.addGratitude([gratitude.trim()])
      DB.addCheckin({ date: today, mood: mood ?? 3, intention: intention.trim() || INTENTION_CHIPS[0], gratitude: gratitude.trim() || GRATITUDE_CHIPS[0], completedAt: new Date().toISOString() })
    }
  }, [step])

  const canAdvance = step === 0 ? mood !== null : step === 1 ? intention.trim().length > 0 : step === 2 ? gratitude.trim().length > 0 : false

  const stepTitles = [
    isEvening ? 'How did today feel?' : 'How are you feeling?',
    isEvening ? 'What did you want to do today?' : 'What\'s one intention for today?',
    isEvening ? 'What are you grateful for today?' : 'What\'s one thing you\'re grateful for?',
  ]
  const stepSubs = [
    'Be honest — all feelings are valid',
    isEvening ? 'The thing you set out to do' : 'Just one small, real thing',
    'Big or small, it counts',
  ]

  return (
    <View style={[g.screen, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[g.homePad, { paddingBottom: 0 }]}>
        <View style={g.homeHeader}>
          <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
          {step < 3 && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i <= step ? t.accent : (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)') }} />
              ))}
            </View>
          )}
        </View>
      </View>

      {step < 3 ? (
        <ScrollView contentContainerStyle={[g.homePad, { paddingTop: 24, paddingBottom: 80 }]} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, letterSpacing: 0.9, marginBottom: 8 }}>
              {isEvening ? '🌙 EVENING CHECK-IN' : '🌅 MORNING CHECK-IN'} · {step + 1}/3
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: t.text, marginBottom: 6, lineHeight: 34 }}>{stepTitles[step]}</Text>
            <Text style={{ fontSize: 14, color: t.textSub, marginBottom: 28 }}>{stepSubs[step]}</Text>

            {step === 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
                {MOODS.map(m => (
                  <TouchableOpacity key={m.val} onPress={() => { haptic.light(); setMood(m.val) }}
                    style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
                      backgroundColor: mood === m.val ? t.accent : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                      transform: [{ scale: mood === m.val ? 1.12 : 1 }] }}>
                      <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: mood === m.val ? '700' : '500', color: mood === m.val ? t.accent : t.textSub }}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(step === 1 || step === 2) && (
              <>
                <TextInput
                  value={step === 1 ? intention : gratitude}
                  onChangeText={step === 1 ? setIntention : setGratitude}
                  placeholder={step === 1 ? (isEvening ? 'e.g. Finish the project report' : 'e.g. Focus on one thing at a time') : 'e.g. My morning coffee and quiet time'}
                  placeholderTextColor={t.textTertiary}
                  style={{ backgroundColor: t.card, borderRadius: 16, padding: 16, fontSize: 16, color: t.text, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: t.border, marginBottom: 16 }}
                  multiline
                  autoFocus
                />
                <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.7, marginBottom: 10 }}>QUICK PICKS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(step === 1 ? INTENTION_CHIPS : GRATITUDE_CHIPS).map(chip => (
                    <TouchableOpacity key={chip} onPress={() => { haptic.light(); step === 1 ? setIntention(chip) : setGratitude(chip) }}
                      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: (step === 1 ? intention : gratitude) === chip ? t.accent : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)') }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: (step === 1 ? intention : gratitude) === chip ? '#fff' : t.textSub }}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Animated.View style={{ transform: [{ scale: doneScale }], alignItems: 'center' }}>
            <Text style={{ fontSize: 72, marginBottom: 20 }}>{mood && mood >= 4 ? '🌟' : mood === 3 ? '💙' : '🌱'}</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: t.text, marginBottom: 8, textAlign: 'center' }}>
              {mood && mood >= 4 ? `You're doing great, ${name}!` : `Thanks for checking in, ${name}`}
            </Text>
            <Text style={{ fontSize: 15, color: t.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 8 }}>
              Today's intention:
            </Text>
            <View style={{ backgroundColor: t.card2, borderRadius: 14, padding: 16, marginBottom: 32, width: '100%' }}>
              <Text style={{ fontSize: 16, color: t.text, fontWeight: '600', textAlign: 'center', lineHeight: 24 }}>
                "{intention.trim() || INTENTION_CHIPS[0]}"
              </Text>
            </View>
            <TouchableOpacity onPress={onDone} style={[g.primaryBtn, { width: '100%' }]}>
              <Text style={g.primaryBtnTxt}>Start your day →</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Next button */}
      {step < 3 && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 36, backgroundColor: t.bg }}>
          <TouchableOpacity onPress={advanceStep} disabled={!canAdvance}
            style={[g.primaryBtn, { opacity: canAdvance ? 1 : 0.35 }]}>
            <Text style={g.primaryBtnTxt}>{step === 2 ? 'Complete check-in ✓' : 'Next →'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── RELATIONSHIP INSIGHTS ─────────────────────────────────────
function RelationshipInsights({ profile, onBack, onRefresh, onStartJourney }: {
  profile: UserProfile; onBack: () => void; onRefresh: () => void; onStartJourney: (id: string) => void
}) {
  const { t, dark } = useT()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [insight, setInsight] = useState<RelInsightData | null>(null)
  const aiName = profile.aiName || 'Soma'
  const userName = profile.name || 'friend'

  const weekKey = (() => {
    const d = new Date()
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${week}`
  })()

  const people = profile.circle.filter(p => p.type !== 'therapy')
  const scores = useMemo(() =>
    Object.fromEntries(people.map(p => [p.id, circleHealth(p, profile)])),
    [people, profile.memories]
  )
  const ranked = [...people].sort((a, b) => scores[b.id] - scores[a.id])
  const neglected = people.filter(p => scores[p.id] < 35)

  const generate = async (force = false) => {
    const cached = profile.relInsightCache
    if (!force && cached?.weekKey === weekKey) { setInsight(cached.data); return }
    if (people.length === 0) return

    setLoading(true)
    const peopleSummaries = people.map(p => {
      const score = scores[p.id]
      const mentions = (profile.memories || []).filter(m => m.content.toLowerCase().includes(p.name.toLowerCase())).slice(0, 4).map(m => m.content).join('; ')
      const bondXp = p.journey?.xp ?? 0
      const bondLevel = getBondLevel(bondXp)
      return `${p.name} (${p.relationship || p.type}): health score ${score}/100, bond XP ${bondXp} (${bondLevel?.name}), recent mentions: ${mentions || 'none'}`
    }).join('\n')

    const prompt = `You are ${aiName}, helping ${userName} understand the health of their key relationships.

Circle summary:
${peopleSummaries}

Write a warm, specific relationship health report. Return ONLY valid JSON:
{
  "overallSummary": "2-3 sentence narrative about ${userName}'s relationship health this week — warm, honest, specific",
  "topPriority": "name of the ONE person who needs most attention right now",
  "highlights": ["one warm positive observation", "another positive if any"],
  "people": [
    {
      "personId": "...",
      "name": "...",
      "summary": "1-2 sentences about this relationship right now — honest and warm",
      "suggestion": "One concrete action ${userName} could take this week, specific and achievable",
      "sentiment": "warm|neutral|distant"
    }
  ]
}

Include all ${people.length} people in the "people" array. Use the exact personIds: ${people.map(p => `"${p.id}" = ${p.name}`).join(', ')}.`

    try {
      const raw = await groq([{ role: 'user', content: prompt }],
        `You are ${aiName}, a warm relationship coach. Be specific, never generic. Return only valid JSON.`, 700, 0.8)
      const m = raw?.match(/\{[\s\S]*\}/)
      if (m) {
        const data = JSON.parse(m[0]) as RelInsightData
        setInsight(data)
        DB.setRelInsight(weekKey, data)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { generate() }, [])

  const doRefresh = async () => { setRefreshing(true); await generate(true); setRefreshing(false) }

  const sentimentColor = (s: string) => s === 'warm' ? '#10B981' : s === 'distant' ? '#F59E0B' : t.textSub
  const sentimentIcon = (s: string) => s === 'warm' ? '💚' : s === 'distant' ? '🌅' : '💙'

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={[g.homePad, { paddingBottom: 80 }]}>
      <View style={g.homeHeader}>
        <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
        <TouchableOpacity onPress={doRefresh} disabled={loading || refreshing} style={{ paddingVertical: 4, paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 13, color: t.accent, fontWeight: '600' }}>{refreshing ? '…' : '↻ Refresh'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[g.logo, { color: t.text }]}>Relationship{'\n'}Insights</Text>
      <Text style={{ fontSize: 13, color: t.textSub, marginTop: 2, marginBottom: 20 }}>
        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · {weekKey}
      </Text>

      {/* Health scorecards */}
      {ranked.length > 0 && (
        <View style={{ backgroundColor: t.card, borderRadius: 18, padding: 16, marginBottom: 14 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 12 }}>BOND HEALTH</Text>
          {ranked.map((p, i) => {
            const score = scores[p.id]
            const bondXp = p.journey?.xp ?? 0
            const level = getBondLevel(bondXp)
            const barColor = score >= 65 ? '#10B981' : score >= 35 ? '#F59E0B' : '#E57373'
            return (
              <View key={p.id} style={{ marginBottom: i < ranked.length - 1 ? 14 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }}>{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }}>{p.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {p.journey && <Text style={{ fontSize: 11, color: level?.color, fontWeight: '600' }}>{level?.emoji} {level?.name}</Text>}
                        <Text style={{ fontSize: 13, fontWeight: '800', color: barColor }}>{score}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: t.textTertiary, marginBottom: 4 }}>{p.relationship || p.type}</Text>
                  </View>
                </View>
                <View style={{ height: 5, backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderRadius: 3, marginLeft: 42 }}>
                  <View style={{ width: `${score}%` as any, height: 5, backgroundColor: barColor, borderRadius: 3 }} />
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* Needs attention banner */}
      {neglected.length > 0 && (
        <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 14, padding: 14, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#F59E0B' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#F59E0B', marginBottom: 4 }}>🌅 Needs your attention</Text>
          <Text style={{ fontSize: 13, color: t.text }}>
            {neglected.map(p => p.name).join(', ')} {neglected.length === 1 ? "hasn't" : "haven't"} come up lately.
          </Text>
        </View>
      )}

      {/* AI narrative */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <SomaMark size={64} />
          <Text style={{ fontSize: 14, color: t.textSub, marginTop: 16, textAlign: 'center', lineHeight: 22 }}>
            {aiName} is reading your relationships…
          </Text>
        </View>
      ) : people.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>👥</Text>
          <Text style={{ fontSize: 15, color: t.textSub, textAlign: 'center', lineHeight: 22 }}>
            Add people to your Circle{'\n'}to get relationship insights.
          </Text>
        </View>
      ) : insight ? (
        <>
          {/* Overall summary */}
          <View style={{ backgroundColor: t.card2, borderRadius: 18, padding: 18, marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, letterSpacing: 0.9, marginBottom: 8 }}>✦  THIS WEEK</Text>
            <Text style={{ fontSize: 15, color: t.text, lineHeight: 24, fontWeight: '500' }}>{insight.overallSummary}</Text>
          </View>

          {/* Highlights */}
          {insight.highlights?.length > 0 && (
            <View style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 16, padding: 14, marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981', letterSpacing: 0.8, marginBottom: 8 }}>💚  HIGHLIGHTS</Text>
              {insight.highlights.map((h, i) => (
                <Text key={i} style={{ fontSize: 13, color: t.text, lineHeight: 20, marginBottom: i < insight.highlights.length - 1 ? 6 : 0 }}>• {h}</Text>
              ))}
            </View>
          )}

          {/* Per-person cards */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 10 }}>EACH PERSON</Text>
          {insight.people?.map(pi => {
            const person = people.find(p => p.id === pi.personId || p.name === pi.name)
            const score = person ? scores[person.id] : 0
            return (
              <View key={pi.personId} style={{ backgroundColor: t.card, borderRadius: 16, padding: 16, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>{sentimentIcon(pi.sentiment)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>{pi.name}</Text>
                    <Text style={{ fontSize: 11, color: sentimentColor(pi.sentiment), fontWeight: '600' }}>
                      {pi.sentiment === 'warm' ? 'Thriving' : pi.sentiment === 'distant' ? 'Needs attention' : 'Holding steady'}
                      {' · '}{score}/100
                    </Text>
                  </View>
                  {person && !person.journey && (
                    <TouchableOpacity onPress={() => onStartJourney(person.id)}
                      style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(123,110,246,0.1)', borderRadius: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent }}>🌱 Start journey</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={{ fontSize: 13, color: t.text, lineHeight: 20, marginBottom: 10 }}>{pi.summary}</Text>
                <View style={{ backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, marginBottom: 3 }}>💡 THIS WEEK</Text>
                  <Text style={{ fontSize: 12, color: t.textSub, lineHeight: 18 }}>{pi.suggestion}</Text>
                </View>
              </View>
            )
          })}

          {/* Top priority callout */}
          {insight.topPriority && (
            <View style={{ backgroundColor: 'rgba(236,72,153,0.08)', borderRadius: 16, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#EC4899' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#EC4899', letterSpacing: 0.8, marginBottom: 4 }}>💞  TOP PRIORITY</Text>
              <Text style={{ fontSize: 14, color: t.text, lineHeight: 20 }}>
                Focus on <Text style={{ fontWeight: '700' }}>{insight.topPriority}</Text> this week. Even one small gesture goes a long way.
              </Text>
            </View>
          )}
        </>
      ) : people.length > 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <SomaMark size={56} />
          <Text style={{ fontSize: 14, color: t.textSub, marginTop: 12, textAlign: 'center', lineHeight: 22 }}>
            Tap refresh to generate{'\n'}your relationship insights.
          </Text>
          <TouchableOpacity onPress={doRefresh} style={[g.primaryBtn, { marginTop: 20 }]}>
            <Text style={g.primaryBtnTxt}>Generate insights</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  MOMENT VIEWER — full screen photo/video
// ════════════════════════════════════════════════════════════
function MomentViewer({ moment, onClose, onReact }: { moment: Moment; onClose: () => void; onReact: (emoji: string) => void }) {
  const { t } = useT()
  const ago = (() => {
    const diff = Date.now() - new Date(moment.postedAt).getTime()
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  })()
  const REACTS = ['❤️', '😍', '🔥', '😂', '🥹', '👏']
  return (
    <View style={{ position: Platform.OS === 'web' ? 'fixed' as any : 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 200 }}>
      {/* Media */}
      <Image source={{ uri: moment.mediaUrl }} style={{ flex: 1, width: '100%' }} resizeMode="cover" />
      {/* Overlay */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 52, gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>{moment.authorName[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{moment.authorName}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{ago}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
        {/* Caption */}
        {moment.caption ? (
          <View style={{ position: 'absolute', bottom: 120, left: 20, right: 20 }}>
            <Text style={{ fontSize: 16, color: '#fff', fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>{moment.caption}</Text>
          </View>
        ) : null}
        {/* Reactions */}
        <View style={{ position: 'absolute', bottom: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 20 }}>
          {REACTS.map(e => (
            <TouchableOpacity key={e} onPress={() => { onReact(e); onClose() }}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Reaction count */}
        {(moment.reactions?.length || 0) > 0 && (
          <View style={{ position: 'absolute', bottom: 108, alignSelf: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 13 }}>{moment.reactions?.join(' ')}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ════════════════════════════════════════════════════════════
//  POST MOMENT MODAL
// ════════════════════════════════════════════════════════════
function PostMomentModal({ profile, onClose, onPosted }: { profile: UserProfile; onClose: () => void; onPosted: () => void }) {
  const { t } = useT()
  const [mediaUrl, setMediaUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [posting, setPosting] = useState(false)
  const todayMoment = DB.todaysMoment()
  const canPost = profile.premium || !todayMoment

  const pickMedia = (type: 'photo' | 'video') => {
    if (type === 'video' && !profile.premium) { alert('Video moments are a SOMA+ feature. Upgrade to share videos.'); return }
    pickPhoto(url => setMediaUrl(url))
  }

  const post = () => {
    if (!mediaUrl || !canPost) return
    setPosting(true)
    const moment: Moment = {
      id: `m_${Date.now()}`,
      authorId: 'me',
      authorName: profile.name || 'You',
      type: 'photo',
      mediaUrl,
      caption: caption.trim() || undefined,
      postedAt: new Date().toISOString(),
      reactions: [],
    }
    DB.addMoment(moment)
    setTimeout(() => { setPosting(false); onPosted() }, 400)
  }

  return (
    <View style={{ position: Platform.OS === 'web' ? 'fixed' as any : 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 200, justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 }}>
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.border, marginBottom: 16 }} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: t.text, marginBottom: 4 }}>Share a moment</Text>
        <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 20 }}>
          {profile.premium ? 'Visible to your circle — up to 20 people.' : todayMoment ? "You've already shared today's moment. Upgrade to SOMA+ for unlimited." : 'One photo per day. Upgrade to SOMA+ for videos and unlimited.'}
        </Text>

        {!canPost ? (
          <View style={{ backgroundColor: '#F59E0B15', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F59E0B40' }}>
            <Text style={{ fontSize: 14, color: '#F59E0B', fontWeight: '700', marginBottom: 4 }}>★ Today's moment already shared</Text>
            <Text style={{ fontSize: 13, color: t.textSub }}>Upgrade to SOMA+ to share unlimited moments every day.</Text>
          </View>
        ) : mediaUrl ? (
          <View style={{ marginBottom: 16 }}>
            <Image source={{ uri: mediaUrl }} style={{ width: '100%', height: 200, borderRadius: 18, marginBottom: 12 }} resizeMode="cover" />
            <TextInput
              style={{ backgroundColor: t.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: t.text, borderWidth: 1, borderColor: t.border }}
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption... (optional)"
              placeholderTextColor={t.textTertiary}
              maxLength={100}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => pickMedia('photo')}
              style={{ flex: 1, backgroundColor: t.card, borderRadius: 18, paddingVertical: 24, alignItems: 'center', borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed' }}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>📷</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }}>Photo</Text>
              <Text style={{ fontSize: 11, color: t.textTertiary, marginTop: 2 }}>Free</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickMedia('video')}
              style={{ flex: 1, backgroundColor: profile.premium ? t.card : t.card, borderRadius: 18, paddingVertical: 24, alignItems: 'center', borderWidth: 1.5, borderColor: profile.premium ? t.accent : t.border, borderStyle: 'dashed', opacity: profile.premium ? 1 : 0.6 }}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>🎥</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }}>Video</Text>
              <Text style={{ fontSize: 11, color: profile.premium ? t.accent : t.textTertiary, marginTop: 2, fontWeight: '700' }}>{profile.premium ? 'SOMA+' : '★ SOMA+'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={onClose}
            style={{ flex: 1, backgroundColor: t.card, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.textSub }}>Cancel</Text>
          </TouchableOpacity>
          {canPost && mediaUrl && (
            <TouchableOpacity onPress={post} disabled={posting}
              style={{ flex: 2, backgroundColor: t.accent, borderRadius: 16, paddingVertical: 14, alignItems: 'center', opacity: posting ? 0.7 : 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{posting ? 'Sharing...' : 'Share with circle ✦'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

// ════════════════════════════════════════════════════════════
//  MOMENTS STRIP — Stories-style row at top of Circle
// ════════════════════════════════════════════════════════════
function MomentsStrip({ profile, onPost, onView }: { profile: UserProfile; onPost: () => void; onView: (m: Moment) => void }) {
  const { t } = useT()
  const today = new Date().toISOString().slice(0, 10)
  const myMoment = (profile.moments || []).find(m => m.authorId === 'me' && m.postedAt.slice(0, 10) === today)
  // Circle members with recent moments (in real app would come from server)
  const circleWithMoments = profile.circle.slice(0, 19).map(p => {
    const moment = (profile.moments || []).find(m => m.authorId === p.id && m.postedAt.slice(0, 10) === today)
    return { person: p, moment }
  })

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 16 }}>
      {/* Your moment bubble */}
      <TouchableOpacity onPress={myMoment ? () => onView(myMoment) : onPost} style={{ alignItems: 'center', width: 64 }}>
        <View style={{ width: 60, height: 60, borderRadius: 20, overflow: 'hidden', borderWidth: 2.5, borderColor: myMoment ? t.accent : t.border }}>
          {myMoment ? (
            <Image source={{ uri: myMoment.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}>
              {profile.profilePhoto
                ? <Image source={{ uri: profile.profilePhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <Text style={{ fontSize: 22, fontWeight: '800', color: t.accent }}>{(profile.name || '?')[0].toUpperCase()}</Text>
              }
              <View style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.bg }}>
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: '900', lineHeight: 14 }}>+</Text>
              </View>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 11, color: t.textSub, marginTop: 5, fontWeight: '600' }} numberOfLines={1}>You</Text>
      </TouchableOpacity>

      {/* Circle members */}
      {circleWithMoments.map(({ person, moment }) => (
        <TouchableOpacity key={person.id} onPress={moment ? () => onView(moment) : undefined}
          style={{ alignItems: 'center', width: 64, opacity: moment ? 1 : 0.45 }}>
          <View style={{ width: 60, height: 60, borderRadius: 20, overflow: 'hidden', borderWidth: 2.5, borderColor: moment ? '#F66E8E' : t.border }}>
            {moment ? (
              <Image source={{ uri: moment.mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: t.textSub }}>{person.name[0].toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 11, color: t.textSub, marginTop: 5, fontWeight: '600' }} numberOfLines={1}>{person.name.split(' ')[0]}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  CIRCLE SCREEN
// ════════════════════════════════════════════════════════════
function CircleScreen({ profile, onBack, onStartJourney, onViewInsights, onRefresh, initialFindCode }: { profile: UserProfile; onBack: () => void; onStartJourney?: (personId: string) => void; onViewInsights?: () => void; onRefresh?: () => void; initialFindCode?: string | null }) {
  const { t } = useT()
  const [openChat, setOpenChat] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [showPostMoment, setShowPostMoment] = useState(false)
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null)
  const [loading, setLoading] = useState(false)
  const msgRef = useRef<ScrollView>(null)

  const [reportModal, setReportModal] = useState<{ person: CirclePerson } | null>(null)
  const [therapistEmail, setTherapistEmail] = useState('')
  const [consentOn, setConsentOn] = useState(false)
  const [reportText, setReportText] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)

  const [nudgeModal, setNudgeModal] = useState<{ person: CirclePerson } | null>(null)
  const [nudgeText, setNudgeText] = useState('')
  const [nudgeLoading, setNudgeLoading] = useState(false)
  const [nudgeCopied, setNudgeCopied] = useState(false)

  const [agentModal, setAgentModal] = useState<{ person: CirclePerson } | null>(null)
  const [agentLines, setAgentLines] = useState<{ speaker: 'A' | 'B'; text: string }[]>([])
  const [agentLoading, setAgentLoading] = useState(false)

  const openAgentChat = async (p: CirclePerson) => {
    setAgentModal({ person: p }); setAgentLines([]); setAgentLoading(true)
    const lines = await generateAgentConversation(p, profile)
    setAgentLines(lines); setAgentLoading(false)
  }

  const [findModal, setFindModal] = useState(false)
  const [findCode, setFindCode] = useState('')
  const [findLoading, setFindLoading] = useState(false)
  const [findResults, setFindResults] = useState<{ name: string; code: string; userId: string }[]>([])
  const [findError, setFindError] = useState('')
  const [linkingPersonId, setLinkingPersonId] = useState<string | null>(null)

  useEffect(() => {
    if (initialFindCode) {
      setFindCode(initialFindCode)
      setFindModal(true)
      setFindResults([])
      setFindError('')
    }
  }, [initialFindCode])

  const [addModal, setAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addType, setAddType] = useState<'friend' | 'family' | 'romantic' | 'work' | 'therapy'>('friend')
  const [addContext, setAddContext] = useState('')

  const submitAddPerson = () => {
    if (!addName.trim()) return
    DB.addCircle(addName.trim(), addType, addContext.trim())
    setAddModal(false); setAddName(''); setAddType('friend'); setAddContext('')
    onRefresh?.()
  }

  const lookupCode = async () => {
    if (!findCode.trim()) return
    setFindLoading(true); setFindError(''); setFindResults([])
    try {
      const val = findCode.trim()
      const isEmail = val.includes('@')
      const param = isEmail ? `email=${encodeURIComponent(val)}` : `code=${encodeURIComponent(val)}`
      const res = await fetch(`${BACKEND_URL}/users/find?${param}`)
      const data = await res.json()
      if (!res.ok) { setFindError(data.error || 'Not found'); return }
      setFindResults(data.users || [])
      if ((data.users || []).length === 0) setFindError('No user found.')
    } catch { setFindError('Could not connect. Try again.') }
    finally { setFindLoading(false) }
  }

  const addFromFind = (user: { name: string; code: string; userId: string }) => {
    if (linkingPersonId) {
      DB.updateCirclePerson(linkingPersonId, { somaUserId: user.userId })
      setLinkingPersonId(null)
      setFindModal(false); setFindCode(''); setFindResults([])
      onRefresh?.()
      alert(`✅ Linked! You can now chat directly with ${user.name}.`)
    } else {
      DB.addCircle(user.name, addType, '', user.userId)
      setFindModal(false); setFindCode(''); setFindResults([])
      onRefresh?.()
      alert(`✅ ${user.name} added to your Circle!\n\nTap their name to start a real conversation.`)
    }
  }

  const scores = useMemo(() =>
    Object.fromEntries(profile.circle.map(p => [p.id, circleHealth(p, profile)])),
    [profile.circle, profile.memories]
  )
  const neglected = profile.circle.filter(p => scores[p.id] < 40).slice(0, 3)

  const openNudge = async (p: CirclePerson) => {
    setNudgeModal({ person: p }); setNudgeText(''); setNudgeCopied(false); setNudgeLoading(true)
    const text = await generateReachOut(p, profile)
    setNudgeText(text); setNudgeLoading(false)
  }

  const copyNudge = () => {
    if (!nudgeText) return
    try { navigator.clipboard.writeText(nudgeText).then(() => { setNudgeCopied(true); setTimeout(() => setNudgeCopied(false), 2000) }) } catch {}
  }

  const openReportModal = (p: CirclePerson) => {
    setTherapistEmail(p.therapistEmail || '')
    setConsentOn(p.shareReports ?? false)
    setReportText('')
    setReportSent(false)
    setReportModal({ person: p })
  }

  const generateReport = async () => {
    if (!reportModal) return
    setReportLoading(true)
    const text = await generateTherapistReport(profile, reportModal.person.name)
    setReportText(text)
    setReportLoading(false)
  }

  const sendReport = async () => {
    if (!reportModal || !reportText || !therapistEmail) return
    const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
    if (!authToken) { alert('Please log in to send reports.'); return }
    setSendingReport(true)
    DB.updateCirclePerson(reportModal.person.id, {
      therapistEmail, shareReports: consentOn, lastReportSent: new Date().toISOString()
    })
    const result = await sendTherapistReport(authToken, therapistEmail, reportModal.person.name, profile.name || 'Your patient', reportText)
    setSendingReport(false)
    if (result.ok) { setReportSent(true) } else { alert(result.error || 'Failed to send report.') }
  }

  const types = ['therapy', 'family', 'friend', 'work', 'romantic'] as const
  const byType: Record<string, CirclePerson[]> = {}
  types.forEach(t => { byType[t] = profile.circle.filter(c => c.type === t) })

  const typeIcon: Record<string, string> = { therapy: '🩺', family: '👨‍👩‍👧', friend: '🤝', work: '💼', romantic: '💕' }
  const typeLabel: Record<string, string> = { therapy: t('type_therapy'), family: t('type_family'), friend: t('type_friends'), work: t('type_work'), romantic: t('type_romantic') }

  const [realMsgs, setRealMsgs] = useState<{ id: string; from_user_id: string; content: string; created_at: string }[]>([])
  const pollRef = useRef<any>(null)
  const myId = (() => { try { return auth?.chat?.myId() ?? null } catch { return null } })()

  const [somaPanel, setSomaPanel] = useState(false)
  const [somaAdvice, setSomaAdvice] = useState('')
  const [somaAdviceLoading, setSomaAdviceLoading] = useState(false)

  const askSomaAboutChat = async (p: CirclePerson, msgs: { from_user_id: string; content: string }[]) => {
    setSomaPanel(true); setSomaAdvice(''); setSomaAdviceLoading(true)
    const convo = msgs.slice(-10).map(m =>
      `${m.from_user_id === myId ? (profile.name || 'Me') : p.name}: ${m.content}`
    ).join('\n')
    const prompt = `You are Soma, the personal AI of ${profile.name || 'the user'}. They are having a conversation with their ${p.type} named ${p.name}.

Recent conversation:
${convo || '(no messages yet)'}

Give ${profile.name || 'them'} 2-3 short, warm, personal insights:
1. What is the emotional tone of this conversation?
2. One thing they could say to deepen the connection right now
3. One thing to be mindful of

Be specific and human. Under 120 words total.`
    const reply = await groq([{ role: 'user', content: prompt }],
      `You are Soma, a wise and warm AI companion. Give concise, personal insights about a conversation.${langDirective()}`, 200, 0.8)
    setSomaAdvice(reply || 'I see a real connection here. Keep being authentic — that\'s what matters most.')
    setSomaAdviceLoading(false)
  }

  const loadRealMsgs = async (userId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/friends/chat/${userId}`, {
        headers: { Authorization: `Bearer ${auth.getToken()}` }
      })
      if (res.ok) { const d = await res.json(); setRealMsgs(d.messages || []) }
    } catch {}
  }

  const openMsg = (p: CirclePerson) => {
    setOpenChat(p.id); setInput('')
    if (p.somaUserId && auth.getToken()) {
      setRealMsgs([])
      loadRealMsgs(p.somaUserId)
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(() => loadRealMsgs(p.somaUserId!), 4000)
    } else {
      setMsgs(p.messages)
    }
  }

  const send = async (text: string) => {
    if (!text.trim() || loading || !openChat) return
    const p = profile.circle.find(x => x.id === openChat)
    if (!p) return
    setInput('')

    // Real chat with a SOMA user
    if (p.somaUserId && auth.getToken()) {
      setLoading(true)
      try {
        const res = await fetch(`${BACKEND_URL}/friends/chat/${p.somaUserId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.getToken()}` },
          body: JSON.stringify({ content: text.trim() })
        })
        if (res.ok) { await loadRealMsgs(p.somaUserId) }
        else { const d = await res.json(); alert(d.error || 'Failed to send') }
      } catch { alert('Could not send. Check your connection.') }
      setLoading(false)
      setTimeout(() => msgRef.current?.scrollToEnd({ animated: true }), 100)
      return
    }

    // Local Soma-mediated chat
    const updated = [...msgs, { role: 'user' as const, content: text.trim() }]
    setMsgs(updated); setLoading(true); DB.messageCircle(openChat, text.trim(), true)
    const context = somaCircleContext(p.type as any, p.name) + langDirective()
    const reply = await groq(updated.map(m => ({ role: m.role, content: m.content })), context, 100)
    const final = [...updated, { role: 'assistant' as const, content: reply || 'I hear you. Tell me more.' }]
    setMsgs(final); setLoading(false); DB.messageCircle(openChat, reply || 'I hear you. Tell me more.', false)
    setTimeout(() => msgRef.current?.scrollToEnd({ animated: true }), 100)
  }

  if (openChat) {
    const p = profile.circle.find(x => x.id === openChat)
    if (!p) return null
    const isRealChat = !!(p.somaUserId && auth.getToken())
    const inviteText = `Hey ${p.name}! I'm using SOMA — an app that helps you grow and stay connected with people you care about. Join me so we can chat directly: https://mysoma.site`

    if (!isRealChat) {
      return (
        <View style={[g.screen, { backgroundColor: t.bg }]}>
          <View style={g.chatHeader}>
            <TouchableOpacity style={g.dBack} onPress={() => { setOpenChat(null) }}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={g.chatName}>{p.name}</Text>
              <Text style={g.chatStatus}>{p.type}</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 32 }}>👤</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: t.text, textAlign: 'center', marginBottom: 10 }}>{p.name} isn't on SOMA yet</Text>
            <Text style={{ fontSize: 14, color: t.textSub, textAlign: 'center', lineHeight: 21, marginBottom: 32 }}>
              To chat directly with {p.name}, invite them to join SOMA. Once they sign up and connect with you, you'll be able to message each other here in real time.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLinkingPersonId(p.id)
                setFindModal(true); setFindCode(''); setFindResults([]); setFindError('')
              }}
              style={{ backgroundColor: '#7B6EF6', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28, marginBottom: 12, width: '100%', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Link {p.name}'s SOMA account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (typeof navigator !== 'undefined' && navigator.share) {
                  navigator.share({ title: 'Join me on SOMA', text: inviteText })
                } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(inviteText)
                  alert('Invite link copied to clipboard!')
                }
              }}
              style={{ backgroundColor: t.card, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 28, marginBottom: 14, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: t.border }}>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>Invite {p.name} to SOMA</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: t.textTertiary, textAlign: 'center', lineHeight: 18 }}>
              If {p.name} is already on SOMA, link their account above to start chatting directly.
            </Text>
          </View>
        </View>
      )
    }

    return (
      <KeyboardAvoidingView style={[g.screen, { backgroundColor: t.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={g.chatHeader}>
          <TouchableOpacity style={g.dBack} onPress={() => { setOpenChat(null); setSomaPanel(false); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={g.chatName}>{p.name}</Text>
            <Text style={g.chatStatus}>🟢 Direct message</Text>
          </View>
          <TouchableOpacity
            onPress={() => { setSomaPanel(!somaPanel); if (!somaPanel) askSomaAboutChat(p, realMsgs) }}
            style={{ backgroundColor: '#7B6EF620', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#7B6EF640' }}>
            <Text style={{ color: '#A89BFA', fontSize: 12, fontWeight: '700' }}>✦ Soma</Text>
          </TouchableOpacity>
        </View>

        {/* Soma insight panel */}
        {somaPanel && (
          <View style={{ backgroundColor: '#0F0A2E', borderBottomWidth: 1, borderBottomColor: '#7B6EF630', padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#A89BFA', fontSize: 13, fontWeight: '700' }}>✦ Soma's insight</Text>
              <TouchableOpacity onPress={() => setSomaPanel(false)}><Text style={{ color: '#A89BFA', fontSize: 18 }}>×</Text></TouchableOpacity>
            </View>
            {somaAdviceLoading
              ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color="#7B6EF6" size="small" /><Text style={{ color: '#A89BFA', fontSize: 13 }}>Reading the conversation…</Text></View>
              : <Text style={{ color: '#E8E5FF', fontSize: 14, lineHeight: 21 }}>{somaAdvice}</Text>
            }
            {!somaAdviceLoading && (
              <TouchableOpacity onPress={() => askSomaAboutChat(p, realMsgs)}
                style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <Text style={{ color: '#7B6EF6', fontSize: 12, fontWeight: '600' }}>↻ Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <ScrollView ref={msgRef} style={{ flex: 1 }} contentContainerStyle={g.msgList} showsVerticalScrollIndicator={false}
          onContentSizeChange={() => msgRef.current?.scrollToEnd({ animated: false })}>
          {realMsgs.length === 0 && !loading && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>💬</Text>
              <Text style={{ color: t.textSub, fontSize: 14, textAlign: 'center' }}>Start your conversation with {p.name}.</Text>
            </View>
          )}
          {realMsgs.map((m, i) => {
            const isMe = m.from_user_id === myId
            return (
              <View key={m.id || i} style={{ flexDirection: isMe ? 'row-reverse' : 'row', marginBottom: 10, alignItems: 'flex-end', gap: 8 }}>
                {!isMe && <View style={[g.avatar, { width: 28, height: 28, borderRadius: 14 }]}><Text style={[g.avatarTxt, { fontSize: 12 }]}>{p.name.charAt(0)}</Text></View>}
                <View style={{ maxWidth: '75%', backgroundColor: isMe ? '#7B6EF6' : t.card, borderRadius: 18, borderBottomRightRadius: isMe ? 4 : 18, borderBottomLeftRadius: isMe ? 18 : 4, padding: 12, borderWidth: isMe ? 0 : 1, borderColor: t.border }}>
                  <Text style={{ color: isMe ? '#fff' : t.text, fontSize: 15, lineHeight: 21 }}>{m.content}</Text>
                  <Text style={{ color: isMe ? 'rgba(255,255,255,0.6)' : t.textTertiary, fontSize: 10, marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            )
          })}
          {loading && <Typing />}
        </ScrollView>
        <View style={g.inputBar}>
          <TextInput style={g.input} value={input} onChangeText={setInput} placeholder={`Message ${p.name}...`} placeholderTextColor={t.textTertiary} multiline />
          <TouchableOpacity style={[g.sendBtn, (!input.trim() || loading) && g.off]} onPress={() => send(input)} disabled={!input.trim() || loading}><Text style={g.sendIcon}>→</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <>
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={g.homePad}>
      <View style={g.homeHeader}>
        <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
        {onViewInsights && (
          <TouchableOpacity onPress={onViewInsights} style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: 'rgba(123,110,246,0.12)', borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#7B6EF6' }}>✦ Insights</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={g.logo}>My Circle</Text>
      <Text style={g.logoSub}>Up to 20 people. Share your world with them.</Text>
      <View style={{ height: 8 }} />

      {/* Moments strip */}
      {profile.circle.length > 0 && (
        <View style={{ marginHorizontal: -20, borderBottomWidth: 1, borderBottomColor: t.border, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 }}>Today's Moments</Text>
            {!profile.premium && <Text style={{ fontSize: 11, color: t.accent, fontWeight: '700' }}>★ Video with SOMA+</Text>}
          </View>
          <MomentsStrip
            profile={profile}
            onPost={() => setShowPostMoment(true)}
            onView={(m) => setViewingMoment(m)}
          />
        </View>
      )}

      {/* 20-person limit notice */}
      {profile.circle.length >= 20 && (
        <View style={{ marginHorizontal: 0, marginBottom: 12, backgroundColor: '#F59E0B15', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F59E0B40', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>👥</Text>
          <Text style={{ flex: 1, fontSize: 13, color: t.textSub }}>Your circle is full (20/20). Remove someone to add a new person.</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 0 }}>
        <TouchableOpacity
          style={[g.primaryBtn, { flex: 1 }, profile.circle.length >= 20 && { opacity: 0.4 }]}
          onPress={() => profile.circle.length < 20 ? setAddModal(true) : alert('Your circle is full (20 people max). Remove someone first.')}
        >
          <Text style={g.primaryBtnTxt}>+ Add someone</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[g.primaryBtn, { flex: 1, backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B98140' }]}
          onPress={() => { setFindModal(true); setFindCode(''); setFindResults([]); setFindError('') }}
        >
          <Text style={[g.primaryBtnTxt, { color: '#10B981' }]}>🔍 Find by code</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 16 }} />

      {/* Needs Attention */}
      {neglected.length > 0 && (
        <View style={g.healthSection}>
          <Text style={g.healthSectionTitle}>💛  Needs attention</Text>
          <Text style={g.healthSectionSub}>You haven't mentioned these people much lately. Soma can help you reach out.</Text>
          {neglected.map(p => (
            <TouchableOpacity key={p.id} style={g.healthNudgeRow} onPress={() => openNudge(p)}>
              <View style={[g.avatar, { width: 36, height: 36, borderRadius: 18 }]}>
                <Text style={[g.avatarTxt, { fontSize: 15 }]}>{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={g.personName}>{p.name}</Text>
                <View style={g.healthBarBg}>
                  <View style={[g.healthBarFill, { width: `${scores[p.id]}%` as any, backgroundColor: healthColor(scores[p.id]) }]} />
                </View>
              </View>
              <Text style={{ fontSize: 12, color: t.accent, fontWeight: '600', marginLeft: 8 }}>✦ Reach out</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
              {people.map(p => {
                const score = scores[p.id] ?? 0
                return (
                <View key={p.id} style={g.circleMember}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => openMsg(p)}>
                    <View style={g.avatar}><Text style={g.avatarTxt}>{p.name.charAt(0).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={g.personName}>{p.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={[g.healthBarBg, { flex: 1, maxWidth: 80 }]}>
                          <View style={[g.healthBarFill, { width: `${score}%` as any, backgroundColor: healthColor(score) }]} />
                        </View>
                        {p.invitationStatus === 'invited' && <Text style={g.invitePending}>📧 Invite pending</Text>}
                        {p.invitationStatus === 'accepted' && <Text style={g.inviteCode}>Code: {p.inviteCode.slice(0, 4)}</Text>}
                        {p.messages.length > 0 && <Text style={g.msgCount}>{p.messages.length} messages</Text>}
                        {type === 'therapy' && p.lastReportSent && <Text style={[g.msgCount, { color: t.accent }]}>📋 Report sent</Text>}
                      </View>
                    </View>
                    <Text style={g.arrow}>→</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openNudge(p)} style={{ paddingLeft: 4 }}>
                    <Text style={{ fontSize: 12, color: t.accent, fontWeight: '600', paddingVertical: 4 }}>✦ Draft</Text>
                  </TouchableOpacity>
                  {type !== 'therapy' && onStartJourney && (
                    <TouchableOpacity onPress={() => onStartJourney(p.id)} style={{ paddingLeft: 4 }}>
                      <Text style={{ fontSize: 12, color: p.journey ? '#10B981' : t.accent, fontWeight: '600', paddingVertical: 4 }}>
                        {p.journey ? `${getBondLevel(p.journey.xp).emoji}` : '🌱'} Journey
                      </Text>
                    </TouchableOpacity>
                  )}
                  {type === 'therapy' && (
                    <TouchableOpacity onPress={() => openReportModal(p)} style={{ paddingLeft: 4 }}>
                      <Text style={{ fontSize: 12, color: t.accent, fontWeight: '600', paddingVertical: 4 }}>📋 Report</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => openAgentChat(p)} style={{ paddingLeft: 4 }}>
                    <Text style={{ fontSize: 12, color: '#A89BFA', fontWeight: '600', paddingVertical: 4 }}>🤖 Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    if (confirm(`Remove ${p.name} from your Circle?`)) {
                      DB.removeCircle(p.id)
                      onRefresh?.()
                    }
                  }} style={{ paddingLeft: 4 }}>
                    <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', paddingVertical: 4 }}>{t('circle_remove')}</Text>
                  </TouchableOpacity>
                </View>
                )
              })}
            </View>
          )
        })
      )}
      <View style={{ height: 80 }} />

      {/* Reach-Out Nudge Modal */}
      <Modal visible={!!nudgeModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setNudgeModal(null)}>
        <View style={[g.screen, { backgroundColor: t.bg, padding: 28, justifyContent: 'center' }]}>
          <Text style={[g.logo, { fontSize: 20, marginBottom: 4 }]}>{t('nudge_title')}</Text>
          <Text style={[g.logoSub, { marginBottom: 24 }]}>For {nudgeModal?.person.name} — edit and send</Text>

          {nudgeLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator color="#7B6EF6" />
              <Text style={{ color: t.textTertiary, marginTop: 12 }}>{t('nudge_thinking')}</Text>
            </View>
          ) : (
            <TextInput
              style={{ backgroundColor: t.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: t.border, marginBottom: 20, fontSize: 15, color: t.text, lineHeight: 24, minHeight: 100, textAlignVertical: 'top' }}
              value={nudgeText}
              onChangeText={setNudgeText}
              multiline
              placeholder="Write a message…"
              placeholderTextColor={t.textTertiary}
            />
          )}

          {nudgeModal?.person.somaUserId ? (
            <TouchableOpacity
              style={[g.primaryBtn, { marginBottom: 12, opacity: nudgeLoading || !nudgeText.trim() ? 0.4 : 1 }]}
              disabled={nudgeLoading || !nudgeText.trim()}
              onPress={async () => {
                const p = nudgeModal!.person
                if (!p.somaUserId || !nudgeText.trim()) return
                try {
                  await fetch(`${BACKEND_URL}/friends/chat/${p.somaUserId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.getToken()}` },
                    body: JSON.stringify({ content: nudgeText.trim() })
                  })
                  setNudgeModal(null)
                  alert(`✅ Message sent to ${p.name}!`)
                } catch { alert('Could not send. Check your connection.') }
              }}>
              <Text style={g.primaryBtnTxt}>{t('nudge_send_on')} — {nudgeModal.person.name}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={[nudgeModal?.person.somaUserId ? g.secondaryBtn : g.primaryBtn, { marginBottom: 12, opacity: nudgeLoading ? 0.4 : 1 }]} onPress={copyNudge} disabled={nudgeLoading}>
            <Text style={nudgeModal?.person.somaUserId ? g.secondaryBtnTxt : g.primaryBtnTxt}>{nudgeCopied ? t('nudge_copied') : t('nudge_copy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[g.secondaryBtn, { marginBottom: 12 }]} onPress={() => openNudge(nudgeModal!.person)}>
            <Text style={g.secondaryBtnTxt}>{t('nudge_retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNudgeModal(null)} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: '#9A9DB2', fontSize: 14 }}>{t('nudge_dismiss')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Therapist Report Modal */}
      <Modal visible={!!reportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReportModal(null)}>
        <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setReportModal(null)}>
              <Text style={{ fontSize: 16, color: '#7B6EF6' }}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={[g.logo, { flex: 1, textAlign: 'center', fontSize: 20, marginBottom: 0 }]}>Therapist Report</Text>
          </View>

          <Text style={[g.secLabel, { marginBottom: 6 }]}>Therapist: {reportModal?.person.name}</Text>
          <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 16 }}>
            Soma will analyze your recent moods, memories, and diary entries to generate a concise clinical summary.
          </Text>

          <Text style={[g.fieldLabel, { marginBottom: 6 }]}>Therapist's email</Text>
          <TextInput
            style={[g.settingsInput, { marginBottom: 16 }]}
            value={therapistEmail}
            onChangeText={setTherapistEmail}
            placeholder="therapist@example.com"
            placeholderTextColor="#B0B3C8"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Switch value={consentOn} onValueChange={setConsentOn} trackColor={{ true: '#7B6EF6', false: '#E0DFF6' }} thumbColor="#fff" />
            <Text style={{ marginLeft: 12, fontSize: 14, color: '#3A3D56', flex: 1 }}>I consent to sharing my emotional summary with my therapist before sessions</Text>
          </View>

          {!reportText && !reportLoading && (
            <TouchableOpacity style={[g.primaryBtn, { marginBottom: 16 }]} onPress={generateReport}>
              <Text style={g.primaryBtnTxt}>✦ Generate Report Preview</Text>
            </TouchableOpacity>
          )}

          {reportLoading && (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <ActivityIndicator color="#7B6EF6" />
              <Text style={{ marginTop: 12, color: '#9A9DB2', fontSize: 14 }}>Soma is preparing the summary…</Text>
            </View>
          )}

          {!!reportText && !reportLoading && (
            <View>
              <Text style={[g.secLabel, { marginBottom: 10 }]}>Preview</Text>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E3F5', marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: '#3A3D56', lineHeight: 20 }}>{reportText}</Text>
              </View>
              <TouchableOpacity style={[g.primaryBtn, { marginBottom: 8, opacity: (!consentOn || !therapistEmail || sendingReport || reportSent) ? 0.5 : 1 }]}
                onPress={sendReport} disabled={!consentOn || !therapistEmail || sendingReport || reportSent}>
                {sendingReport
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={g.primaryBtnTxt}>{reportSent ? '✓ Sent!' : `Send to ${reportModal?.person.name}`}</Text>}
              </TouchableOpacity>
              {!consentOn && <Text style={{ fontSize: 12, color: '#E57373', textAlign: 'center' }}>Enable consent toggle above to send</Text>}
              {!therapistEmail && <Text style={{ fontSize: 12, color: '#E57373', textAlign: 'center', marginTop: 4 }}>Enter therapist's email to send</Text>}
              <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => { setReportText(''); generateReport() }}>
                <Text style={{ color: '#7B6EF6', fontSize: 13 }}>↺ Regenerate</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      </Modal>

      {/* Agent-to-Agent Conversation Modal */}
      <Modal visible={!!agentModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setAgentModal(null)}>
        <View style={[g.screen, { backgroundColor: t.bg }]}>
          <View style={{ padding: 24, paddingTop: 32 }}>
            <TouchableOpacity onPress={() => setAgentModal(null)} style={{ marginBottom: 8 }}>
              <Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>‹ Close</Text>
            </TouchableOpacity>
            <Text style={[g.logo, { fontSize: 20, marginBottom: 2 }]}>🤖 Agent Conversation</Text>
            <Text style={[g.logoSub, { marginBottom: 0 }]}>
              {profile.aiName || 'Soma'} meets {agentModal?.person.name}'s Soma
            </Text>
          </View>
          <View style={{ marginHorizontal: 20, marginBottom: 12, borderRadius: 14, padding: 12, backgroundColor: '#7B6EF610', borderWidth: 1, borderColor: '#7B6EF630' }}>
            <Text style={{ fontSize: 12, color: t.accent, textAlign: 'center' }}>
              🔒 This conversation is generated privately on your device — nothing is shared with your friend.
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            {agentLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <ActivityIndicator color="#7B6EF6" size="large" />
                <Text style={{ color: t.textTertiary, marginTop: 16, fontSize: 14 }}>The two agents are connecting…</Text>
              </View>
            ) : agentLines.length === 0 ? (
              <Text style={{ color: t.textSub, textAlign: 'center', paddingVertical: 40 }}>Could not generate a conversation. Try again.</Text>
            ) : (
              agentLines.map((line, i) => {
                const isA = line.speaker === 'A'
                return (
                  <View key={i} style={{ marginBottom: 16, flexDirection: isA ? 'row' : 'row-reverse', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isA ? '#7B6EF6' : '#10B981', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Text style={{ fontSize: 16 }}>🤖</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isA ? '#A89BFA' : '#34D399', marginBottom: 4, textAlign: isA ? 'left' : 'right' }}>
                        {isA ? (profile.aiName || 'Soma') : `${agentModal?.person.name}'s Soma`}
                      </Text>
                      <View style={{ backgroundColor: isA ? '#7B6EF615' : '#10B98115', borderRadius: 14, borderTopLeftRadius: isA ? 4 : 14, borderTopRightRadius: isA ? 14 : 4, padding: 12, borderWidth: 1, borderColor: isA ? '#7B6EF630' : '#10B98130' }}>
                        <Text style={{ fontSize: 14, color: t.text, lineHeight: 20 }}>{line.text}</Text>
                      </View>
                    </View>
                  </View>
                )
              })
            )}
            {!agentLoading && agentLines.length > 0 && (
              <TouchableOpacity
                onPress={() => { setAgentLines([]); setAgentLoading(true); generateAgentConversation(agentModal!.person, profile).then(l => { setAgentLines(l); setAgentLoading(false) }) }}
                style={{ marginTop: 8, borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: '#7B6EF620', borderWidth: 1, borderColor: '#7B6EF640' }}>
                <Text style={{ color: t.accent, fontSize: 14, fontWeight: '700' }}>↻  Generate new conversation</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add Person Modal — unified: find on SOMA or add manually */}
      <Modal visible={addModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => { setAddModal(false); setFindCode(''); setFindResults([]); setFindError('') }}>
        <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ padding: 28, paddingBottom: 60 }}>
          <TouchableOpacity onPress={() => { setAddModal(false); setFindCode(''); setFindResults([]); setFindError('') }} style={{ marginBottom: 20 }}>
            <Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>‹ Close</Text>
          </TouchableOpacity>
          <Text style={[g.logo, { fontSize: 22, marginBottom: 4 }]}>➕ Add someone</Text>
          <Text style={[g.logoSub, { marginBottom: 24 }]}>Find them on SOMA or add manually</Text>

          {/* ── Find on SOMA ── */}
          <View style={{ backgroundColor: '#10B98110', borderRadius: 18, borderWidth: 1, borderColor: '#10B98130', padding: 18, marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981', marginBottom: 4 }}>🔍 Find on SOMA</Text>
            <Text style={{ fontSize: 12, color: t.textSub, marginBottom: 12 }}>Search by their email or invite code — connect your SOMA AIs</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {([
                { type: 'friend' as const, icon: '🤝' },
                { type: 'family' as const, icon: '👨‍👩‍👧' },
                { type: 'therapy' as const, icon: '🩺' },
                { type: 'romantic' as const, icon: '💕' },
                { type: 'work' as const, icon: '💼' },
              ]).map(({ type, icon }) => {
                const labelKey: Record<string, string> = { friend: 'circle_friend_s', family: 'circle_family_s', therapy: 'circle_therapy_s', romantic: 'circle_romantic_s', work: 'circle_work_s' }
                return (
                <TouchableOpacity key={type} onPress={() => setAddType(type)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5,
                    borderColor: addType === type ? '#10B981' : t.border,
                    backgroundColor: addType === type ? '#10B98120' : t.bg }}>
                  <Text style={{ fontSize: 13 }}>{icon}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: addType === type ? '#10B981' : t.textSub }}>{t(labelKey[type])}</Text>
                </TouchableOpacity>
              )})}
            </View>
            <TextInput
              value={findCode}
              onChangeText={v => { setFindCode(v); setFindError(''); setFindResults([]) }}
              placeholder="friend@email.com  or  invite code"
              placeholderTextColor={t.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              style={{ backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: t.text, marginBottom: 12 }}
            />
            {findError ? <Text style={{ color: '#FF6B6B', fontSize: 13, marginBottom: 10 }}>{findError}</Text> : null}
            <TouchableOpacity
              onPress={lookupCode}
              disabled={findLoading || !findCode.trim()}
              style={{ backgroundColor: findLoading || !findCode.trim() ? '#4A4870' : '#10B981', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: findResults.length > 0 ? 14 : 0 }}>
              {findLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Search</Text>}
            </TouchableOpacity>
            {findResults.map((user, i) => (
              <View key={i} style={{ backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: '#10B98140', padding: 14, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#10B981' }}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>{user.name}</Text>
                  <Text style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>✦ Has a SOMA account</Text>
                </View>
                <TouchableOpacity
                  onPress={() => { addFromFind(user); setAddModal(false) }}
                  style={{ backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* ── Add manually ── */}
          <View style={{ backgroundColor: t.card, borderRadius: 18, borderWidth: 1, borderColor: t.border, padding: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: t.accent, marginBottom: 4 }}>✏️ Add manually</Text>
            <Text style={{ fontSize: 12, color: t.textSub, marginBottom: 16 }}>They don't have SOMA yet — add them to your circle</Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: t.textSub, marginBottom: 6 }}>Name</Text>
            <TextInput
              value={addName}
              onChangeText={setAddName}
              placeholder="Their name"
              placeholderTextColor={t.textTertiary}
              autoCorrect={false}
              style={{ backgroundColor: t.bg, borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: t.text, marginBottom: 16 }}
            />

            <Text style={{ fontSize: 12, fontWeight: '700', color: t.textSub, marginBottom: 10 }}>{t('circle_who')}</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {([
                { type: 'friend' as const, icon: '🤝', key: 'circle_friend' },
                { type: 'family' as const, icon: '👨‍👩‍👧', key: 'circle_family' },
                { type: 'therapy' as const, icon: '🩺', key: 'circle_therapy' },
                { type: 'romantic' as const, icon: '💕', key: 'circle_romantic' },
                { type: 'work' as const, icon: '💼', key: 'circle_work' },
              ]).map(({ type, icon, key }) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setAddType(type)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5,
                    borderColor: addType === type ? t.accent : t.border,
                    backgroundColor: addType === type ? `${t.accent}15` : t.bg }}>
                  <Text style={{ fontSize: 18 }}>{icon}</Text>
                  <Text style={{ fontSize: 14, fontWeight: addType === type ? '700' : '500', color: addType === type ? t.accent : t.text, flex: 1 }}>{t(key)}</Text>
                  {addType === type && <Text style={{ color: t.accent, fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: t.textSub, marginBottom: 6 }}>Context <Text style={{ fontWeight: '400' }}>(optional)</Text></Text>
            <TextInput
              value={addContext}
              onChangeText={setAddContext}
              placeholder="How you know them..."
              placeholderTextColor={t.textTertiary}
              multiline
              numberOfLines={2}
              style={{ backgroundColor: t.bg, borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: t.text, marginBottom: 20, minHeight: 64, textAlignVertical: 'top' }}
            />

            <TouchableOpacity
              onPress={submitAddPerson}
              disabled={!addName.trim()}
              style={{ backgroundColor: addName.trim() ? '#7B6EF6' : '#4A4870', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Add to Circle</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* Find by Code Modal (kept for direct access from circle header button) */}
      <Modal visible={findModal} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setFindModal(false)}>
        <View style={[g.screen, { backgroundColor: t.bg, padding: 28 }]}>
          <TouchableOpacity onPress={() => setFindModal(false)} style={{ marginBottom: 20 }}>
            <Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>‹ Close</Text>
          </TouchableOpacity>
          <Text style={[g.logo, { fontSize: 22, marginBottom: 4 }]}>🔍 Find a friend</Text>
          <Text style={[g.logoSub, { marginBottom: 24 }]}>Search by email address or invite code</Text>

          <TextInput
            value={findCode}
            onChangeText={v => { setFindCode(v); setFindError(''); setFindResults([]) }}
            placeholder="friend@email.com  or  A3F9C2"
            placeholderTextColor={t.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            style={{ backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: t.text, marginBottom: 16 }}
          />

          {findError ? <Text style={{ color: '#FF6B6B', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{findError}</Text> : null}

          <TouchableOpacity
            onPress={lookupCode}
            disabled={findLoading || !findCode.trim()}
            style={{ backgroundColor: findLoading || !findCode.trim() ? '#4A4870' : '#7B6EF6', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 20 }}>
            {findLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Find friend</Text>}
          </TouchableOpacity>

          {findResults.map((user, i) => (
            <View key={i} style={{ backgroundColor: t.card, borderRadius: 18, borderWidth: 1, borderColor: '#10B98140', padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#10B981' }}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: t.text }}>{user.name}</Text>
                <Text style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>Code: {user.code}</Text>
              </View>
              <TouchableOpacity
                onPress={() => addFromFind(user)}
                style={{ backgroundColor: '#10B981', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add →</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </Modal>

      {/* Widget promo card */}
      <View style={{ marginTop: 24, marginBottom: 8, backgroundColor: t.card, borderRadius: 22, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
        {/* Widget mockup */}
        <View style={{ backgroundColor: '#1A1A2E', padding: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>Home Screen Widget</Text>
          <View style={{ width: 156, height: 156, borderRadius: 28, backgroundColor: '#12122A', borderWidth: 1, borderColor: 'rgba(123,110,246,0.4)', padding: 12, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 13 }}>✦</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>SOMA</Text>
            </View>
            {/* Mini moments row */}
            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
              {['#F6A86E', '#7B6EF6', '#F66E8E', '#6EF6A8'].map((c, i) => (
                <View key={i} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c, opacity: 0.85 }} />
              ))}
            </View>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>4 new moments today</Text>
          </View>
        </View>
        {/* CTA */}
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: t.text, marginBottom: 4 }}>See their moments on your home screen</Text>
          <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 14 }}>Add the SOMA widget to see circle moments without opening the app. Available on iOS and Android.</Text>
          <TouchableOpacity
            onPress={() => {
              if (typeof window !== 'undefined' && (window as any).deferredPrompt) {
                (window as any).deferredPrompt.prompt()
              } else {
                alert('To add the widget:\n\nOn iPhone: Long-press your home screen → + → search SOMA\nOn Android: Long-press the SOMA app icon → Widgets\n\nMake sure you have the SOMA app installed from the App Store or Google Play.')
              }
            }}
            style={{ backgroundColor: t.accent, borderRadius: 14, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>+ Add to Home Screen</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>

    {/* Overlays */}
    {showPostMoment && (
      <PostMomentModal
        profile={profile}
        onClose={() => setShowPostMoment(false)}
        onPosted={() => { setShowPostMoment(false); DB.get() }}
      />
    )}
    {viewingMoment && (
      <MomentViewer
        moment={viewingMoment}
        onClose={() => setViewingMoment(null)}
        onReact={(emoji) => DB.addMomentReaction(viewingMoment.id, emoji)}
      />
    )}
    </>
  )
}

// ── MY PROFILE (cinematic, auto-built) ─────────────────────
function MyProfile({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const { t } = useT()
  const [, force] = useState(0)
  const [galleryIdx, setGalleryIdx] = useState(0)
  const [editingBio, setEditingBio] = useState(false)
  const [bioText, setBioText] = useState('')
  const [editingLocation, setEditingLocation] = useState(false)
  const [locationText, setLocationText] = useState('')
  useEffect(() => {
    DB.syncDatingInterests()
    // Auto-mark profile complete once Soma knows enough about the user
    if (!DB.get().dating.complete && profile.memories.length >= 3) {
      DB.saveDating({ complete: true })
    }
  }, [])

  const saveBio = () => {
    DB.saveDating({ bio: bioText.trim() })
    setEditingBio(false)
    force(x => x + 1)
  }
  const saveLocation = () => {
    DB.saveDating({ location: locationText.trim() })
    setEditingLocation(false)
    force(x => x + 1)
  }
  const d = DB.get().dating
  const interests = d.interests.length ? d.interests : profile.memories.filter(m => m.domain === 'hobby').map(m => m.content)
  const allPhotos = (d.photos?.length ? d.photos : (d.photo ? [d.photo] : []))

  const uploadPhoto = () => pickPhoto(url => {
    const current = DB.get().dating
    const existing = current.photos?.length ? current.photos : (current.photo ? [current.photo] : [])
    if (existing.length >= 6) return
    const updated = [...existing, url]
    DB.saveDating({ photo: updated[0], photos: updated })
    force(x => x + 1)
  })

  const removePhoto = (idx: number) => {
    const current = DB.get().dating
    const existing = [...(current.photos?.length ? current.photos : (current.photo ? [current.photo] : []))]
    existing.splice(idx, 1)
    DB.saveDating({ photo: existing[0] || '', photos: existing })
    setGalleryIdx(Math.max(0, idx - 1))
    force(x => x + 1)
  }

  const setMainPhoto = (idx: number) => {
    const current = DB.get().dating
    const existing = [...(current.photos?.length ? current.photos : (current.photo ? [current.photo] : []))]
    const [chosen] = existing.splice(idx, 1)
    const updated = [chosen, ...existing]
    DB.saveDating({ photo: chosen, photos: updated })
    setGalleryIdx(0)
    force(x => x + 1)
  }

  return (
    <View style={[g.screen, { backgroundColor: t.bg }]}>
      <View style={g.dTop}>
        <TouchableOpacity style={g.dBack} onPress={onBack}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
        <View style={g.dToggle}><View style={g.dTogActive}><Text style={g.dTogActiveTxt}>MY PROFILE</Text></View></View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Main photo with gallery dots */}
        <TouchableOpacity activeOpacity={allPhotos.length > 1 ? 0.95 : 1}
          onPress={() => allPhotos.length > 1 && setGalleryIdx((galleryIdx + 1) % allPhotos.length)}
          style={g.dPhoto}>
          {/* Background image — covers container perfectly on web + native */}
          {allPhotos.length > 0
            ? <Image source={{ uri: allPhotos[galleryIdx] }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} resizeMode="cover" />
            : <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#7B6EF622', alignItems: 'center', justifyContent: 'center' }}>
                <View style={g.myAvatar}><Text style={{ fontSize: 56, color: '#fff', fontWeight: '700' }}>{(profile.name || '?').charAt(0).toUpperCase()}</Text></View>
              </View>
          }

          {/* Gallery dots */}
          {allPhotos.length > 1 && (
            <View style={{ position: 'absolute', top: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', zIndex: 10, paddingHorizontal: 16 }}>
              {allPhotos.map((_, i) => (
                <View key={i} style={{ height: 3, borderRadius: 2, backgroundColor: i === galleryIdx ? '#fff' : 'rgba(255,255,255,0.45)', flex: 1, maxWidth: 48, marginHorizontal: 2 }} />
              ))}
            </View>
          )}

          {/* Set as main button */}
          {allPhotos.length > 0 && galleryIdx > 0 && (
            <TouchableOpacity style={{ position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, zIndex: 20 }}
              onPress={() => setMainPhoto(galleryIdx)}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>⭐ Set as main</Text>
            </TouchableOpacity>
          )}

          {/* Remove button */}
          {allPhotos.length > 0 && (
            <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(220,50,50,0.7)', borderRadius: 10, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
              onPress={() => removePhoto(galleryIdx)}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          )}

          {/* Gradient + name overlay */}
          <View style={g.dPhotoFade} />
          <View style={g.dPhotoOverlay}>
            <Text style={g.dPremium}>✦ BUILT BY AURA</Text>
            <Text style={g.dName}>{profile.name || 'You'}</Text>
            <TouchableOpacity onPress={() => { setLocationText(d.location || ''); setEditingLocation(true) }}>
              <Text style={g.dLoc}>📍 {d.location || 'Add location'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Photo gallery grid — add up to 6 total */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#6E7191', letterSpacing: 0.5 }}>PHOTOS ({allPhotos.length}/6)</Text>
            {allPhotos.length < 6 && (
              <TouchableOpacity onPress={uploadPhoto} style={{ backgroundColor: '#7B6EF615', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#7B6EF640' }}>
                <Text style={{ color: '#7B6EF6', fontSize: 12, fontWeight: '700' }}>+ Add photo</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {allPhotos.map((uri, i) => (
              <TouchableOpacity key={i} onPress={() => setGalleryIdx(i)} style={{ position: 'relative' }}>
                <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12, borderWidth: i === galleryIdx ? 2.5 : 0, borderColor: '#7B6EF6' }} />
                {i === 0 && <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: '#7B6EF6', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800' }}>MAIN</Text>
                </View>}
              </TouchableOpacity>
            ))}
            {allPhotos.length < 6 && (
              <TouchableOpacity onPress={uploadPhoto} style={{ width: 80, height: 80, borderRadius: 12, borderWidth: 1.5, borderColor: '#C5BFEC', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F7FF' }}>
                <Text style={{ fontSize: 24, color: '#C5BFEC' }}>+</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* About */}
        <View style={g.dSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={g.dH}>About</Text>
            <TouchableOpacity onPress={() => { setBioText(d.bio || ''); setEditingBio(true) }}
              style={{ backgroundColor: '#7B6EF615', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#7B6EF640' }}>
              <Text style={{ color: '#7B6EF6', fontSize: 12, fontWeight: '700' }}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={g.dAbout}>👋 {d.bio || 'Tap Edit to add your bio'}</Text>
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

      {/* Bio edit modal */}
      <Modal visible={editingBio} transparent animationType="slide" onRequestClose={() => setEditingBio(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: t.text, marginBottom: 4 }}>Edit your bio</Text>
            <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 16 }}>This is how others first get to know you.</Text>
            <TextInput
              style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 14, fontSize: 15, color: t.text, minHeight: 100, textAlignVertical: 'top' }}
              value={bioText}
              onChangeText={setBioText}
              placeholder="Write a few lines about who you are…"
              placeholderTextColor={t.textTertiary}
              multiline
              maxLength={300}
              autoFocus
            />
            <Text style={{ textAlign: 'right', fontSize: 11, color: t.textTertiary, marginTop: 4 }}>{bioText.length}/300</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setEditingBio(false)} style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: t.border, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: t.textSub, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBio} style={{ flex: 2, borderRadius: 14, backgroundColor: '#7B6EF6', paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save bio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location edit modal */}
      <Modal visible={editingLocation} transparent animationType="slide" onRequestClose={() => setEditingLocation(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: t.text, marginBottom: 4 }}>Edit location</Text>
            <Text style={{ fontSize: 13, color: t.textSub, marginBottom: 16 }}>City, country or region — shown on your profile.</Text>
            <TextInput
              style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 14, padding: 14, fontSize: 15, color: t.text }}
              value={locationText}
              onChangeText={setLocationText}
              placeholder="e.g. San Francisco, CA"
              placeholderTextColor={t.textTertiary}
              maxLength={80}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveLocation}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setEditingLocation(false)} style={{ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: t.border, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: t.textSub, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveLocation} style={{ flex: 2, borderRadius: 14, backgroundColor: '#7B6EF6', paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ════════════════════════════════════════════════════════════
// SOMA+ PAYWALL — real RevenueCat or graceful mock fallback
// ════════════════════════════════════════════════════════════
const SOMA_PLUS_FEATURES = [
  { icon: '✦', label: 'Unlimited AI conversations', sub: 'No daily cap — Soma is always there' },
  { icon: '👀', label: 'See who liked you', sub: 'Know before they do' },
  { icon: '⚡', label: 'Instant AI connection', sub: `Like someone → your AIs talk immediately (free: wait for mutual like)` },
  { icon: '♾️', label: `${PREMIUM_DAILY_LIKES} likes/day`, sub: `Free plan: ${FREE_DAILY_LIKES} likes/day` },
  { icon: '🧠', label: 'Extended memory', sub: 'Soma remembers everything, forever' },
  { icon: '🖼️', label: 'AI profile photo', sub: 'Let Soma pick your best shot' },
  { icon: '📊', label: 'Premium weekly insights', sub: 'Deeper reflection & growth tips' },
]

function SomaPlusPaywall({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual')
  const [loadingOffer, setLoadingOffer] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [offers, setOffers] = useState<{ monthly: { price: string; pkg: any } | null; annual: { price: string; pkg: any } | null }>({ monthly: null, annual: null })
  const [err, setErr] = useState('')
  useEffect(() => {
    purchaseApi.getOfferings().then(o => { setOffers(o); setLoadingOffer(false) })
  }, [])

  // Price display — real RC prices or sensible fallbacks
  const monthlyPrice = offers.monthly?.price ?? '$9.99'
  const annualPrice = offers.annual?.price ?? '$59.99'
  const annualMonthly = offers.annual ? `$${(parseFloat(annualPrice.replace(/[^0-9.]/g, '')) / 12).toFixed(2)}` : '$5.00'
  const savingsPct = offers.annual && offers.monthly
    ? Math.round((1 - parseFloat(annualPrice.replace(/[^0-9.]/g, '')) / 12 / parseFloat(monthlyPrice.replace(/[^0-9.]/g, ''))) * 100)
    : 42

  const currentPkg = plan === 'annual' ? offers.annual?.pkg : offers.monthly?.pkg

  const subscribe = async () => {
    setErr(''); setPurchasing(true); haptic.medium()
    try {
      let success = false
      if (currentPkg) {
        success = await purchaseApi.purchase(currentPkg)
      } else {
        success = true // sandbox / no RC configured
      }
      if (success) { DB.goPremium(); haptic.success(); onSuccess() }
      else setErr('Purchase cancelled.')
    } catch (e: any) {
      setErr(e.message || 'Purchase failed. Please try again.')
      haptic.error()
    } finally { setPurchasing(false) }
  }

  const restore = async () => {
    setErr(''); setRestoring(true)
    try {
      const ok = await purchaseApi.restore()
      if (ok) { DB.goPremium(); haptic.success(); onSuccess() }
      else setErr('No active subscription found.')
    } catch { setErr('Restore failed. Please try again.') }
    finally { setRestoring(false) }
  }

  const busy = purchasing || restoring

  return (
    <View style={g.paywall}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Close */}
        <TouchableOpacity onPress={onClose} disabled={busy} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 }}>
          <Text style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>✕</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 36 }}>✦</Text>
          </View>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 1 }}>SOMA+</Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', marginTop: 4, textAlign: 'center' }}>
            Your full life OS. No limits.
          </Text>
          <View style={{ marginTop: 10, backgroundColor: '#F6D66E', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#2A1F00', letterSpacing: 0.4 }}>7-DAY FREE TRIAL</Text>
          </View>
        </View>

        {/* Plan toggle */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 4, flexDirection: 'row', marginBottom: 20 }}>
          {(['monthly', 'annual'] as const).map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setPlan(p)}
              style={{
                flex: 1, borderRadius: 13, paddingVertical: 10, alignItems: 'center',
                backgroundColor: plan === p ? '#fff' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: plan === p ? '#2A1A6E' : 'rgba(255,255,255,0.65)' }}>
                {p === 'monthly' ? 'Monthly' : 'Annual'}
              </Text>
              {p === 'annual' && (
                <Text style={{ fontSize: 10, fontWeight: '700', color: plan === 'annual' ? '#7B6EF6' : '#F6D66E', marginTop: 1 }}>
                  Save {savingsPct}%
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Price display */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          {loadingOffer ? (
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Loading prices…</Text>
          ) : plan === 'annual' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontSize: 42, fontWeight: '900', color: '#fff' }}>{annualMonthly}</Text>
                <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>/mo</Text>
              </View>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{annualPrice} billed annually · cancel anytime</Text>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontSize: 42, fontWeight: '900', color: '#fff' }}>{monthlyPrice}</Text>
                <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>/mo</Text>
              </View>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Billed monthly · cancel anytime</Text>
            </>
          )}
        </View>

        {/* Features */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16, marginBottom: 20, gap: 14 }}>
          {SOMA_PLUS_FEATURES.map(f => (
            <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16 }}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{f.label}</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>{f.sub}</Text>
              </View>
              <Text style={{ fontSize: 16, color: '#F6D66E', fontWeight: '800' }}>✓</Text>
            </View>
          ))}
        </View>

        {/* Error */}
        {!!err && (
          <Text style={{ color: '#F66E8E', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>{err}</Text>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={{ backgroundColor: '#fff', borderRadius: 18, paddingVertical: 17, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
          onPress={subscribe}
          disabled={busy}
        >
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#2A1A6E' }}>
            {purchasing ? 'Processing…' : plan === 'annual' ? `Start free trial · ${annualMonthly}/mo` : `Subscribe · ${monthlyPrice}/mo`}
          </Text>
          {plan === 'annual' && !purchasing && (
            <Text style={{ fontSize: 12, color: '#7B6EF6', marginTop: 3, fontWeight: '600' }}>
              Then {annualPrice}/year after trial
            </Text>
          )}
        </TouchableOpacity>

        {/* Secondary actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 }}>
          <TouchableOpacity onPress={restore} disabled={busy}>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{restoring ? 'Restoring…' : 'Restore'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} disabled={busy}>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Maybe later</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 16, lineHeight: 16 }}>
          {'Subscriptions auto-renew unless cancelled 24h before renewal.\nManage in App Store / Google Play settings.'}
        </Text>
      </ScrollView>
    </View>
  )
}

// ── DATING ─────────────────────────────────────────────────
type AgentTurn = { agent: 'A' | 'B'; text: string }
interface Candidate {
  name: string; age: number; emoji: string; color: string; photo: string
  photos?: string[]
  location: string; distance: string; height: string; weight: string
  bio: string; values: string[]; interests: string[]; agentName: string
  loveLanguage: string; attachment: string; intimacy: string
  work: string; children: string; pets: string
  tags: { icon: string; label: string }[]
}

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`

// One demo profile — shown only when no real users are available
const CANDIDATES: Candidate[] = [
  { name: 'Mai', age: 27, emoji: '🌿', color: '#F6A86E', photo: U('1494790108377-be9c29b29330'), location: 'Demo profile', distance: '—', height: '168 cm', weight: '54 kg',
    bio: '✨ This is a demo profile. Real people will appear here once more users join SOMA near you.',
    values: ['Depth', 'Growth', 'Freedom'], interests: ['hiking', 'films', 'painting', 'coffee'], agentName: 'Lux',
    loveLanguage: 'Quality Time', attachment: 'Secure', intimacy: 'Values slow, emotionally present closeness over intensity.', work: 'Illustrator', children: 'Wants kids', pets: 'Has a cat',
    tags: [{icon:'🤖',label:'Demo'},{icon:'🎨',label:'Painter'},{icon:'🐈',label:'Have cat'},{icon:'🥾',label:'Hiking'},{icon:'🎬',label:'Indie films'}] },
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
  { id: 'romantic', icon: 'heart-outline' as const, title: 'Romantic', subtitle: 'Serious partners, casual dating, long-term', color: '#F6379B', count: '6.3K' },
  { id: 'friends', icon: 'people-outline' as const, title: 'Friends', subtitle: 'New friends, activity buddies, community', color: '#34C759', count: '8.8K' },
  { id: 'professional', icon: 'briefcase-outline' as const, title: 'Professional', subtitle: 'Work collaborators, mentors, peers', color: '#0A84FF', count: '4.2K' },
  { id: 'support', icon: 'leaf-outline' as const, title: 'Support', subtitle: 'Coaches, accountability, guidance', color: '#FF9F0A', count: '3.1K' },
  { id: 'purpose', icon: 'compass-outline' as const, title: 'Purpose-Driven', subtitle: 'Mission-aligned, impact partners', color: '#7B6EF6', count: '2.4K' }
]

function MeetPeople({ profile, onBack, onMyProfile, onSynergy, onRegister }: { profile: UserProfile; onBack: () => void; onMyProfile: () => void; onSynergy: () => void; onRegister?: () => void }) {
  const { t } = useT()
  const isInRelationship = profile.circle.some(p => p.type === 'romantic')
  // Extract dating profile from Soma conversations (automatic from daily chats)
  const extractedValues = profile.memories.filter(m => m.domain === 'relationship').map(m => m.content)
  const extractedInterests = profile.memories.filter(m => m.domain === 'hobby').map(m => m.content)
  const extractedPurpose = profile.memories.filter(m => m.domain === 'purpose').map(m => m.content)

  const [step, setStep] = useState<'category' | 'browse' | 'matched' | 'chat' | 'conversation' | 'report' | 'liked'>('category')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [browseTab, setBrowseTab] = useState<'for-you' | 'nearby'>('for-you')
  const [userLocation] = useState({ lat: 34.0522, lng: -118.2437 }) // Mock LA location
  // Real users from the backend (live when logged in + backend deployed)
  const [realNearby, setRealNearby] = useState<NearbyUser[]>([])
  const [realStatus, setRealStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const [index, setIndex] = useState(0)
  const [liked, setLiked] = useState<Candidate[]>([])
  const [matchedRealUserId, setMatchedRealUserId] = useState<string | null>(null)
  const [likesLeft, setLikesLeft] = useState(DB.likesLeft())
  const [showPaywall, setShowPaywall] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [maxDistKm, setMaxDistKm] = useState(50)
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(60)
  const [showFilters, setShowFilters] = useState(false)
  const [chatMsgs, setChatMsgs] = useState<Msg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatRef = useRef<ScrollView>(null)
  const [turns, setTurns] = useState<AgentTurn[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [report, setReport] = useState<{ score: string; why: string; date: string; activities: string; intimacy?: string } | null>(null)
  const [relationshipType, setRelationshipType] = useState<'romantic' | 'friend'>('romantic')
  const scrollRef = useRef<ScrollView>(null)

  // Rank candidates by REAL alignment with the user's memories (best first), respecting active age filter
  const ranked = [...CANDIDATES]
    .filter(c => c.age >= ageMin && c.age <= ageMax)
    .map(c => ({ c, ...alignmentScore(profile, c) }))
    .sort((a, b) => b.score - a.score)
  const candidate = liked[liked.length - 1] ?? ranked[0]?.c ?? CANDIDATES[0]

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

  // Reset card index whenever filters change
  useEffect(() => { setIndex(0); setPhotoIdx(0) }, [maxDistKm, ageMin, ageMax])

  // Load all SOMA users for "For You" tab (works for guests too)
  const [allUsers, setAllUsers] = useState<any[]>([])
  useEffect(() => {
    const headers: Record<string, string> = {}
    const token = auth.getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    fetch(`${BACKEND_URL}/users/discover`, { headers })
      .then(r => r.json()).then(d => { if (d.results) setAllUsers(d.results) }).catch(() => {})
  }, [])

  // Load real nearby users for "Nearby" tab
  useEffect(() => {
    if (browseTab !== 'nearby') return
    if (!datingApi.authed()) { setRealStatus('unavailable'); return }
    setRealStatus('loading')
    let stale = false
    ;(async () => {
      try {
        const loc = await getApproxLocation()
        if (stale) return
        if (loc) await datingApi.saveProfile(profile, loc).catch(() => {})
        setRealNearby(await datingApi.nearby(maxDistKm))
        setRealStatus('ready')
      } catch { if (!stale) setRealStatus('unavailable') }
    })()
    return () => { stale = true }
  }, [browseTab, maxDistKm])

  const allUsersRanked = allUsers
    .filter(u => !u.age || (u.age >= ageMin && u.age <= ageMax))
    .map(u => {
      const c = nearbyToCandidate(u)
      return { c, score: u.compatibility || 50, shared: (u.interests || []).slice(0, 3), psych: { attach: 0, love: 0, note: u.hasDatingProfile ? (u.city || '') : 'New to SOMA' } }
    })

  const realRanked = realNearby
    .filter(u => (!u.age || (u.age >= ageMin && u.age <= ageMax)))
    .map(u => {
      const c = nearbyToCandidate(u)
      return { c, score: u.compatibility, shared: (c.interests || []).slice(0, 3), psych: { attach: 0, love: 0, note: `${u.distanceKm} km away` } }
    })

  const useReal = browseTab === 'nearby' ? (realStatus === 'ready' && realRanked.length > 0) : allUsersRanked.length > 0
  const activeRanked = browseTab === 'nearby'
    ? (realRanked.length > 0 ? realRanked : allUsersRanked)
    : (allUsersRanked.length > 0 ? allUsersRanked : ranked)

  const safeActive = activeRanked.length > 0 ? activeRanked : [{ c: CANDIDATES[0], score: 0, shared: [] as string[], psych: { attach: 0, love: 0, note: '' } }]
  const safeRanked = ranked.length > 0 ? ranked : [{ c: CANDIDATES[0], score: 0, shared: [] as string[], psych: { attach: 0, love: 0, note: '' } }]
  const current = safeActive[Math.min(index, safeActive.length - 1)].c
  const currentScore = safeRanked[Math.min(index, safeRanked.length - 1)].score
  const currentShared = safeRanked[Math.min(index, safeRanked.length - 1)].shared
  const currentPsych = safeRanked[Math.min(index, safeRanked.length - 1)].psych
  const pass = () => { haptic.light(); setPhotoIdx(0); if (index < safeActive.length - 1) setIndex(index + 1); else setIndex(0) }

  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false)

  const like = () => {
    const pick = safeActive[Math.min(index, safeActive.length - 1)].c
    const realId = (pick as any).realUserId
    // Prompt registration if the current card is a real user
    if (realId && !datingApi.authed()) { setShowRegisterPrompt(true); return }
    // Daily like limit
    if (DB.likesLeft() <= 0) { setShowPaywall(true); haptic.error(); return }
    haptic.medium()
    DB.useLike()
    setLikesLeft(DB.likesLeft())
    setLiked([...liked, pick])
    setMatchedRealUserId(realId || null)

    if (realId && datingApi.authed()) {
      // Real user: send like to backend; backend tells us if it's mutual
      datingApi.like(realId).then(res => {
        if (res.matched) {
          // Mutual match! Save connection
          DB.upsertConnection({
            id: `real_${realId}`,
            name: pick.name, age: pick.age, photo: pick.photo,
            color: '#7B6EF6', bio: pick.bio || '',
            loveLanguage: (pick as any).loveLanguage || '',
            attachment: (pick as any).attachment || '',
            messages: [], matchScore: Math.round(currentScore),
          })
          haptic.success()
          analytics.track('match_created', { with: pick.name })
          setStep('matched')
          setTimeout(() => runMatch(), 100)
        }
        // If not mutual: stay in 'liked' waiting state (already set below for non-premium)
      }).catch(() => {})

      if (profile.premium) {
        // Premium: immediate AI conversation without waiting for mutual
        haptic.success()
        analytics.track('match_created', { with: pick.name })
        setStep('matched')
        setTimeout(() => runMatch(), 100)
      } else {
        // Non-premium + real user: show "liked" waiting state, auto-advance
        haptic.light()
        setStep('liked')
        setTimeout(() => { setStep('browse'); setPhotoIdx(0); if (index < safeActive.length - 1) setIndex(index + 1); else setIndex(0) }, 2500)
      }
    } else {
      // Demo profile: always immediate match (no real mutual matching possible)
      haptic.success()
      analytics.track('match_created', { with: pick.name })
      setStep('matched')
      setTimeout(() => runMatch(), 100)
    }
  }

  const connId = () => `conn_${candidate.name}_${candidate.age}`

  // Start the instant conversation the moment it's a mutual match
  const startInstantChat = async () => {
    const bio = candidate.interests.slice(0, 2).join(', ')

    // Real SOMA user — add to Circle with their userId and go to Circle for real DM
    if (matchedRealUserId) {
      DB.addCircle(candidate.name, relationshipType, bio, matchedRealUserId)
      onBack() // go back to Circle/home where they can open the real chat
      return
    }

    // Demo profile — AI-simulated chat
    const circleId = `circle_${candidate.name}_${Date.now()}`
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

  // Category Selection Screen
  if (step === 'category') {
    return (
      <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ marginBottom: 28 }}>
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 16 }}>
            <Text style={g.backLink}>← Back</Text>
          </TouchableOpacity>
          <Text style={[g.greeting, { marginBottom: 4 }]}>Meet people</Text>
          <Text style={{ fontSize: 15, color: t.textSub, lineHeight: 22 }}>Find people aligned with your goals and values</Text>
        </View>

        {/* Relationship status banner or Dating featured card */}
        {isInRelationship ? (
          <View style={{ borderRadius: 20, padding: 16, backgroundColor: '#FFF0F6', borderWidth: 1, borderColor: '#F6379B30', marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F6379B20', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="heart" size={22} color="#F6379B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#C4196B' }}>You're in a relationship</Text>
              <Text style={{ fontSize: 13, color: '#C4196B80', marginTop: 2 }}>Dating is hidden. Explore friends, career & more below.</Text>
            </View>
          </View>
        ) : (
          <PressButton
            onPress={() => { setSelectedCategory('romantic'); setStep('browse') }}
            style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 20, ...shadowMd }}
          >
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop' }}
              style={{ height: 180, justifyContent: 'flex-end' }}
              imageStyle={{ resizeMode: 'cover' }}
            >
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
              <View style={{ position: 'relative', zIndex: 1, padding: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(246,55,155,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="heart" size={17} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>Serious Daters</Text>
                  <View style={{ marginLeft: 'auto' as any, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>6.3K</Text>
                  </View>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Goal-driven dating · Find serious partners</Text>
              </View>
            </ImageBackground>
          </PressButton>
        )}

        {/* Other Categories */}
        <Text style={[g.secLabel, { marginBottom: 14, marginTop: 4 }]}>MORE WAYS TO CONNECT</Text>

        <View style={{ gap: 10 }}>
          {MEET_CATEGORIES.slice(1).map(cat => (
            <PressButton
              key={cat.id}
              onPress={() => { setSelectedCategory(cat.id); setStep('browse') }}
              style={{
                borderRadius: 16,
                padding: 14,
                backgroundColor: t.card,
                borderWidth: 1,
                borderColor: t.border2,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                ...shadowSm
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cat.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={cat.icon} size={22} color={cat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: t.text }}>{cat.title}</Text>
                <Text style={{ fontSize: 13, color: t.textSub, marginTop: 2 }}>{cat.subtitle}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: cat.color }}>{cat.count}</Text>
                <Ionicons name="chevron-forward" size={16} color={t.textSub} />
              </View>
            </PressButton>
          ))}
        </View>

        {/* Synergy Scan CTA */}
        <TouchableOpacity onPress={onSynergy} style={{ marginTop: 20, borderRadius: 18, padding: 16, backgroundColor: '#13111E', borderWidth: 1, borderColor: '#7B6EF630', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: '#7B6EF618', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#7B6EF640' }}>
            <Ionicons name="flash-outline" size={22} color="#7B6EF6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.1 }}>Synergy Scan</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3, lineHeight: 18 }}>Your AIs check your fit in seconds. Private, instant.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#7B6EF6" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    )
  }

  if (step === 'browse') {
    // Always prefer real registered users; fall back to single demo profile
    const filteredRanked = useReal
      ? realRanked
      : CANDIDATES.map(c => ({ c, ...alignmentScore(profile, c) }))

    const browseIndex = Math.min(index, filteredRanked.length - 1)
    const currentBrowse = filteredRanked[browseIndex]?.c
    const currentScore = filteredRanked[browseIndex]?.score

    return (
      <View style={[g.screen, { backgroundColor: t.bg }]}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="location-outline" size={13} color={browseTab === 'nearby' ? '#fff' : '#9A9DB2'} />
                <Text style={browseTab === 'nearby' ? g.dTogActiveTxt : g.dTogTxt}>NEARBY</Text>
              </View>
            </PressButton>
          </View>
          <TouchableOpacity
            style={[g.dMe, { position: 'relative' }]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={18} color="#fff" />
            {(maxDistKm !== 50 || ageMin !== 18 || ageMax !== 60) && (
              <View style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#F6379B' }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={g.dMe} onPress={() => setStep('profile')}><Text style={g.dMeTxt}>Me</Text></TouchableOpacity>
        </View>

        {/* Live status bar */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: useReal ? '#34C759' : realStatus === 'loading' ? '#F6C26E' : '#C5BFEC' }} />
          <Text style={{ fontSize: 12, color: t.textSub, fontWeight: '600' }}>
            {browseTab === 'nearby'
              ? (realRanked.length > 0 ? `${realRanked.length} people near you`
                : realStatus === 'loading' ? 'Finding people nearby…'
                : 'No one nearby with location set')
              : (allUsersRanked.length > 0 ? `${allUsersRanked.length} people on SOMA`
                : 'Demo mode · Register to see real people')}
          </Text>
          {!datingApi.authed() && allUsersRanked.length === 0 && (
            <TouchableOpacity onPress={() => onRegister?.()} style={{ marginLeft: 'auto' as any, backgroundColor: '#7B6EF620', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: '#7B6EF6', fontWeight: '700' }}>Join free →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* No results state */}
        {filteredRanked.length === 0 && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 80 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: t.text, marginBottom: 8, textAlign: 'center' }}>No profiles match</Text>
            <Text style={{ fontSize: 15, color: t.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              Try widening your age range or increasing the distance filter.
            </Text>
            <TouchableOpacity
              onPress={() => { setMaxDistKm(50); setAgeMin(18); setAgeMax(60) }}
              style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: '#7B6EF6' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentBrowse && (<ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Full-bleed photo gallery */}
          {(() => {
            const allPhotos = (currentBrowse.photos && currentBrowse.photos.length > 0) ? currentBrowse.photos : (currentBrowse.photo ? [currentBrowse.photo] : [])
            const safeIdx = Math.min(photoIdx, Math.max(0, allPhotos.length - 1))
            const displayPhoto = allPhotos[safeIdx] || currentBrowse.photo
            return (
              <TouchableOpacity activeOpacity={0.97} onPress={() => { if (allPhotos.length > 1) setPhotoIdx((safeIdx + 1) % allPhotos.length) }}
                style={g.dPhoto}>
                <Image source={{ uri: displayPhoto }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} resizeMode="cover" />
                {/* Top vignette */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(0,0,0,0.28)' }} />
                {/* Photo progress dots */}
                {allPhotos.length > 1 && (
                  <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', gap: 4, zIndex: 10 }}>
                    {allPhotos.map((_, i) => (
                      <View key={i} style={{ height: 3, borderRadius: 2, backgroundColor: i === safeIdx ? '#fff' : 'rgba(255,255,255,0.35)', flex: 1 }} />
                    ))}
                  </View>
                )}
                {/* Compatibility badge */}
                <View style={{ position: 'absolute', top: 68, right: 16, zIndex: 5, alignItems: 'center' }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 2, borderColor: currentBrowse.color, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{currentScore}%</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 }}>MATCH</Text>
                </View>
                {/* Gradient layers */}
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, backgroundColor: 'rgba(0,0,0,0.15)' }} />
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 200, backgroundColor: 'rgba(0,0,0,0.45)' }} />
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 100, backgroundColor: 'rgba(0,0,0,0.45)' }} />
                {/* Interests chips */}
                <View style={{ position: 'absolute', left: 16, right: 70, bottom: 82, flexDirection: 'row', flexWrap: 'wrap', gap: 6, zIndex: 5 }}>
                  {currentBrowse.interests.slice(0, 3).map(interest => (
                    <View key={interest} style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{interest}</Text>
                    </View>
                  ))}
                </View>
                {/* Name / location overlay */}
                <View style={g.dPhotoOverlay}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text style={g.dName}>{currentBrowse.name}</Text>
                        <Text style={g.dAge}>{currentBrowse.age}</Text>
                        <View style={{ backgroundColor: 'rgba(246,214,110,0.25)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(246,214,110,0.5)' }}>
                          <Text style={{ color: '#F6D66E', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }}>PRO</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.65)" />
                        <Text style={g.dLoc}>{currentBrowse.location}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>·</Text>
                        <Text style={g.dLoc}>{currentBrowse.distance}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={like} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#F6379B', alignItems: 'center', justifyContent: 'center', ...shadowMd }}>
                      <Ionicons name="heart" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )
          })()}

          {/* Quick stats row */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 0 }}>
            {[
              { icon: 'barbell-outline' as const, label: currentBrowse.height },
              { icon: 'resize-outline' as const, label: currentBrowse.weight },
              { icon: 'briefcase-outline' as const, label: currentBrowse.work },
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRightWidth: i < 2 ? 1 : 0, borderColor: '#EAE8F2' }}>
                <Ionicons name={s.icon} size={18} color="#7B6EF6" />
                <Text style={{ color: '#3D3A56', fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* About — quote style */}
          <View style={[g.dSection, { marginTop: 16 }]}>
            <View style={{ borderLeftWidth: 3, borderColor: '#7B6EF6', paddingLeft: 14 }}>
              <Text style={{ color: '#1A1A2E', fontSize: 16, lineHeight: 26, fontStyle: 'italic', fontWeight: '400' }}>"{currentBrowse.bio}"</Text>
            </View>
          </View>

          {/* Life facts */}
          <View style={g.dSection}>
            <Text style={g.dH}>About them</Text>
            <View style={g.dTags}>
              <View style={g.dTag}>
                <Ionicons name="people-outline" size={13} color="#6E7191" />
                <Text style={g.dTagTxt}>{currentBrowse.children}</Text>
              </View>
              <View style={g.dTag}>
                <Ionicons name="paw-outline" size={13} color="#6E7191" />
                <Text style={g.dTagTxt}>{currentBrowse.pets}</Text>
              </View>
            </View>
            {(() => {
              const mine = (profile.dating.children || '').toLowerCase()
              const theirs = (currentBrowse.children || '').toLowerCase()
              const iWant = mine.includes('want') && !mine.includes("don't") && !mine.includes('not')
              const iDont = mine.includes("don't") || mine.includes('not')
              const theyWant = theirs.includes('want') && !theirs.includes('not')
              const theyDont = theirs.includes("don't") || theirs.includes('not')
              if ((iWant && theyDont) || (iDont && theyWant)) {
                return <Text style={g.dealbreak}>⚠ Heads up: you and {currentBrowse.name} seem to differ on children — worth talking about early.</Text>
              }
              if (iWant && theyWant) {
                return <Text style={g.dealgood}>✓ You both want children — aligned on family.</Text>
              }
              return null
            })()}
          </View>

          {/* Why Soma matched */}
          <View style={g.dSection}>
            <View style={{ borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#7B6EF630' }}>
              <View style={{ backgroundColor: '#7B6EF6', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>SOMA MATCHED YOU · {currentScore}%</Text>
              </View>
              <View style={{ backgroundColor: '#F8F6FF', padding: 16 }}>
                <Text style={{ color: '#3D3A56', fontSize: 15, lineHeight: 23, fontWeight: '500' }}>
                  {currentShared.length > 0
                    ? `You both connect on ${currentShared.slice(0, 4).join(', ')}.`
                    : 'Talk to Soma about your hobbies and values — matches get sharper the more she knows you.'}
                </Text>
                {currentPsych.note ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <View style={{ backgroundColor: '#7B6EF615', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#7B6EF630' }}>
                      <Text style={{ color: '#7B6EF6', fontSize: 12, fontWeight: '700' }}>attachment {Math.round(currentPsych.attach * 100)}%</Text>
                    </View>
                    <View style={{ backgroundColor: '#7B6EF615', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#7B6EF630' }}>
                      <Text style={{ color: '#7B6EF6', fontSize: 12, fontWeight: '700' }}>love lang {Math.round(currentPsych.love * 100)}%</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Connection style — love language + attachment */}
          <View style={g.dSection}>
            <Text style={g.dH}>Connection style</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={g.styleCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <Ionicons name="heart-outline" size={13} color="#7B6EF6" />
                  <Text style={g.styleLbl}>LOVE LANGUAGE</Text>
                </View>
                <Text style={g.styleVal}>{currentBrowse.loveLanguage}</Text>
              </View>
              <View style={g.styleCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <Ionicons name="link-outline" size={13} color="#7B6EF6" />
                  <Text style={g.styleLbl}>ATTACHMENT</Text>
                </View>
                <Text style={g.styleVal}>{currentBrowse.attachment}</Text>
              </View>
            </View>
          </View>

          {/* More info tags */}
          <View style={g.dSection}>
            <Text style={g.dH}>More info</Text>
            <View style={g.dTags}>
              {currentBrowse.tags.map(tag => (
                <View key={tag.label} style={g.dTag}><Text style={g.dTagTxt}>{tag.label}</Text></View>
              ))}
              {currentBrowse.values.map(v => (
                <View key={v} style={[g.dTag, { borderColor: currentBrowse.color + '50', backgroundColor: currentBrowse.color + '10' }]}><Text style={[g.dTagTxt, { color: currentBrowse.color }]}>{v}</Text></View>
              ))}
            </View>
          </View>
        </ScrollView>)}

        {/* Likes-left bar */}
        {currentBrowse && <View style={g.likesBar}>
          <Text style={g.likesTxt}>
            {profile.premium ? '⚡ Premium · ' : ''}♥ {likesLeft} like{likesLeft !== 1 ? 's' : ''} left today
            {profile.premium ? '' : ' · mutual match required'}
          </Text>
          {!profile.premium && <TouchableOpacity onPress={() => setShowPaywall(true)}><Text style={g.likesUpgrade}>Go instant →</Text></TouchableOpacity>}
        </View>}

        {/* Bottom action bar */}
        {currentBrowse && <View style={[g.dActions, { paddingHorizontal: 20, justifyContent: 'center', gap: 12 }]}>
          <PressButton
            onPress={pass}
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E3F0', alignItems: 'center', justifyContent: 'center', ...shadowSm }}
          >
            <Ionicons name="close" size={24} color="#9A9DB2" />
          </PressButton>
          <PressButton
            onPress={like}
            style={{ flex: 1, height: 56, borderRadius: 28, backgroundColor: '#F6379B', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, ...shadowMd }}
          >
            <Ionicons name="heart" size={20} color="#fff" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 }}>Like {currentBrowse.name}</Text>
          </PressButton>
          <PressButton
            onPress={() => { haptic.medium(); like() }}
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF5EB', borderWidth: 1.5, borderColor: '#F6A86E40', alignItems: 'center', justifyContent: 'center', ...shadowSm }}
          >
            <Ionicons name="star" size={22} color="#F6A86E" />
          </PressButton>
        </View>}

        {/* Paywall */}
        {showPaywall && (
          <SomaPlusPaywall
            onClose={() => setShowPaywall(false)}
            onSuccess={() => { setLikesLeft(DB.likesLeft()); setShowPaywall(false) }}
          />
        )}

        {/* Register prompt for unauthenticated users liking real profiles */}
        {showRegisterPrompt && (
          <TouchableOpacity activeOpacity={1} onPress={() => setShowRegisterPrompt(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 200, justifyContent: 'flex-end' }}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>💜</Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: t.text, textAlign: 'center', marginBottom: 8 }}>Create a free account</Text>
                <Text style={{ fontSize: 15, color: t.textSub, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                  Register to like real people, match, and start real conversations.
                </Text>
                <TouchableOpacity style={[g.primaryBtn, { width: '100%', marginBottom: 12 }]} onPress={() => { setShowRegisterPrompt(false); onRegister?.() }}>
                  <Text style={g.primaryBtnTxt}>Create free account →</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowRegisterPrompt(false)} style={{ paddingVertical: 8 }}>
                  <Text style={{ color: t.textSub, fontSize: 14 }}>Keep browsing as guest</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Filter panel */}
        {showFilters && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowFilters(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100, justifyContent: 'flex-end' }}
          >
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
              <View style={{ backgroundColor: t.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border2, alignSelf: 'center', marginBottom: 20 }} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: t.text, marginBottom: 20 }}>Filters</Text>

                {/* Distance */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: t.textSub, letterSpacing: 0.5, marginBottom: 10 }}>MAX DISTANCE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {[5, 10, 25, 50, 100].map(km => (
                    <TouchableOpacity
                      key={km}
                      onPress={() => setMaxDistKm(km)}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: maxDistKm === km ? '#7B6EF6' : '#F0EFFE',
                        borderWidth: 1.5, borderColor: maxDistKm === km ? '#7B6EF6' : '#E0DEFF',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: maxDistKm === km ? '#fff' : '#7B6EF6' }}>{km} km</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Min age */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: t.textSub, letterSpacing: 0.5, marginBottom: 10 }}>MIN AGE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {[18, 21, 25, 30, 35, 40].map(age => (
                    <TouchableOpacity
                      key={age}
                      onPress={() => { setAgeMin(age); if (ageMax < age + 1) setAgeMax(age + 1) }}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: ageMin === age ? '#F6379B' : '#FFF0F6',
                        borderWidth: 1.5, borderColor: ageMin === age ? '#F6379B' : '#FAC8E0',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: ageMin === age ? '#fff' : '#F6379B' }}>{age}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Max age */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: t.textSub, letterSpacing: 0.5, marginBottom: 10 }}>MAX AGE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
                  {[25, 30, 35, 40, 50, 60].map(age => (
                    <TouchableOpacity
                      key={age}
                      onPress={() => { setAgeMax(age); if (ageMin > age - 1) setAgeMin(Math.max(18, age - 1)) }}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: ageMax === age ? '#F6379B' : '#FFF0F6',
                        borderWidth: 1.5, borderColor: ageMax === age ? '#F6379B' : '#FAC8E0',
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: ageMax === age ? '#fff' : '#F6379B' }}>{age === 60 ? '60+' : age}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => { setMaxDistKm(50); setAgeMin(18); setAgeMax(60) }}
                    style={{ flex: 1, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: '#E0DEFF', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#7B6EF6' }}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowFilters(false)}
                    style={{ flex: 2, height: 48, borderRadius: 24, backgroundColor: '#7B6EF6', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  // ── LIKED — waiting for mutual match (non-premium real users) ──
  if (step === 'liked') {
    const pick = liked[liked.length - 1] ?? safeActive[0]?.c
    return (
      <View style={[g.screen, { backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 40 }]}>
        <Text style={{ fontSize: 64, marginBottom: 20 }}>💜</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: t.text, textAlign: 'center', marginBottom: 10 }}>
          You liked {pick?.name}!
        </Text>
        <Text style={{ fontSize: 15, color: t.textSub, textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
          If they like you back, your AIs will connect and start the conversation for you.{'\n\n'}
          Upgrade to SOMA+ to start the AI conversation immediately — no waiting.
        </Text>
        <TouchableOpacity
          style={[g.primaryBtn, { width: '100%', marginBottom: 12 }]}
          onPress={() => setShowPaywall(true)}
        >
          <Text style={g.primaryBtnTxt}>⚡ Get SOMA+ — {PREMIUM_DAILY_LIKES} likes/day, instant match</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setStep('browse'); setPhotoIdx(0); if (index < safeActive.length - 1) setIndex(index + 1); else setIndex(0) }} style={{ paddingVertical: 10 }}>
          <Text style={{ color: t.textSub, fontSize: 14 }}>Keep browsing →</Text>
        </TouchableOpacity>
        {showPaywall && (
          <SomaPlusPaywall
            onClose={() => setShowPaywall(false)}
            onSuccess={() => { setLikesLeft(DB.likesLeft()); setShowPaywall(false); setStep('matched'); setTimeout(() => runMatch(), 100) }}
          />
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
    <ScrollView ref={scrollRef} style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={g.homePad}>
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
          <View style={[g.matchCard, { backgroundColor: t.card, borderColor: t.border }]}>
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
            <Text style={g.primaryBtnTxt}>
              {matchedRealUserId ? `💬  Message ${candidate.name} for real` : `💬  Start chatting with ${candidate.name}`}
            </Text>
          </TouchableOpacity>
          {matchedRealUserId && (
            <View style={{ backgroundColor: '#E8F5E9', borderRadius: 14, padding: 12, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>🎉</Text>
              <Text style={{ fontSize: 13, color: '#2E7D32', flex: 1, lineHeight: 18 }}>
                This is a real person on SOMA. They'll receive your messages directly — no AI in the middle.
              </Text>
            </View>
          )}
          <TouchableOpacity style={g.secondaryBtn} onPress={() => { setStep('conversation'); setTurns([]); setVisibleCount(0); runMatch() }}>
            <Text style={g.secondaryBtnTxt}>✦  Let your Auras meet first</Text>
          </TouchableOpacity>
          <View style={{ height: 16 }} />
          <View style={[g.matchCard, { backgroundColor: t.card, borderColor: t.border }]}>
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
        <Text style={[g.agentText, !self && { color: '#EDE8E0' }]}>{turn.text}</Text>
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
        <Text style={g.bTxt}>{msg.content}</Text>
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
//  DATE PLAN MODAL
// ════════════════════════════════════════════════════════════
function DatePlanModal({ profile, conn, onClose, onSendToChat }: {
  profile: UserProfile
  conn: Connection
  onClose: () => void
  onSendToChat: (text: string) => void
}) {
  const { t } = useT()
  const [plan, setPlan] = useState<DatePlan | null>(conn.datePlan || null)
  const [loading, setLoading] = useState(!conn.datePlan)
  const [selectedIdea, setSelectedIdea] = useState<number | null>(null)

  useEffect(() => {
    if (conn.datePlan) return
    const generate = async () => {
      setLoading(true)
      const userInterests = profile.dating?.interests?.slice(0, 4).join(', ') || 'varied interests'
      const userValues = profile.dating?.relationshipValues?.slice(0, 3).join(', ') || 'connection, growth'
      const userLL = profile.dating?.loveLanguage || 'Quality Time'
      const prompt = `You are Soma, an emotionally intelligent dating coach. Plan a first date for ${profile.name || 'User'} and ${conn.name}.

${profile.name || 'User'}: interests: ${userInterests}; values: ${userValues}; love language: ${userLL}
${conn.name}, ${conn.age}: ${conn.bio}; love language: ${conn.loveLanguage}; attachment: ${conn.attachment}
Match score: ${conn.matchScore}%

Return ONLY valid JSON (no markdown, no extra text):
{"ideas":[{"emoji":"🎨","title":"Date name","vibe":"Setting · ~X hrs · ~$XX each","why":"Why it fits these two specifically (1 sentence)"},{"emoji":"🍜","title":"...","vibe":"...","why":"..."},{"emoji":"🌇","title":"...","vibe":"...","why":"..."}],"starter":"An ice-breaker question for the actual date (1 sentence)"}

Make ideas specific to their shared interests, varied in vibe (cozy / active / adventurous). Keep vibe under 8 words.`
      try {
        const raw = await groq([{ role: 'user', content: prompt }], '', 400)
        const json = raw?.match(/\{[\s\S]*\}/)?.[0]
        if (json) {
          const parsed = JSON.parse(json) as { ideas: DateIdea[]; starter: string }
          const newPlan: DatePlan = { generatedAt: new Date().toISOString(), ideas: parsed.ideas, starter: parsed.starter }
          DB.saveDatePlan(conn.id, newPlan)
          setPlan(newPlan)
        }
      } catch {}
      setLoading(false)
    }
    generate()
  }, [])

  return (
    <View style={{ position: Platform.OS === 'web' ? 'fixed' as any : 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%' }}>
        {/* Handle + header */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 0 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.border }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: t.text }}>✨ Date ideas</Text>
            <Text style={{ fontSize: 13, color: t.textSub, marginTop: 2 }}>Soma picked these for you & {conn.name}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, color: t.textSub }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 36, marginBottom: 16 }}>✨</Text>
              <Text style={{ fontSize: 15, color: t.textSub, textAlign: 'center' }}>Soma is planning your perfect date...</Text>
            </View>
          ) : plan ? (
            <>
              {/* Date ideas */}
              {plan.ideas.map((idea, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelectedIdea(selectedIdea === i ? null : i)}
                  style={{ backgroundColor: selectedIdea === i ? t.accent + '15' : t.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: selectedIdea === i ? t.accent : t.border }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{idea.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: t.text }}>{idea.title}</Text>
                      <Text style={{ fontSize: 12, color: t.textTertiary, marginTop: 2, fontWeight: '600' }}>{idea.vibe}</Text>
                      <Text style={{ fontSize: 13, color: t.textSub, marginTop: 6, lineHeight: 18 }}>{idea.why}</Text>
                    </View>
                    {selectedIdea === i && <Text style={{ fontSize: 16, color: t.accent }}>✓</Text>}
                  </View>
                  {selectedIdea === i && (
                    <TouchableOpacity
                      onPress={() => {
                        onSendToChat(`Hey! Soma suggested a date idea for us 😊\n\n${idea.emoji} ${idea.title}\n${idea.vibe}\n\nWhat do you think?`)
                        onClose()
                      }}
                      style={{ marginTop: 12, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Send this idea to {conn.name} →</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}

              {/* Conversation starter */}
              <View style={{ backgroundColor: '#7B6EF608', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#7B6EF630', marginTop: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' }}>💬 Ice-breaker for the date</Text>
                <Text style={{ fontSize: 15, color: t.text, lineHeight: 22, fontStyle: 'italic' }}>"{plan.starter}"</Text>
              </View>

              {/* Regenerate */}
              <TouchableOpacity
                onPress={() => { DB.saveDatePlan(conn.id, undefined as any); setPlan(null); setLoading(true); const c = DB.getConnection(conn.id); if (c) { c.datePlan = undefined; } }}
                style={{ marginTop: 16, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 13, color: t.textTertiary }}>↺ Get new ideas</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, color: t.textSub }}>Couldn't generate ideas. Try again later.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  )
}

// ════════════════════════════════════════════════════════════
//  SYNERGY SCAN — AI-to-AI compatibility in one scan
// ════════════════════════════════════════════════════════════
interface SynergyPersona {
  id: string; name: string; role: string; avatar: string; color: string
  values: string[]; skills: string[]; goals: string[]
}
interface SynergyReport {
  score: string; sharedValues: string[]; youOffer: string; theyOffer: string
  bestFor: string; icebreaker: string; boundary: string
}
const SYNERGY_PERSONAS: SynergyPersona[] = [
  { id: 'p1', name: 'Maya', role: 'Product Designer', avatar: '🎨', color: '#F6379B',
    values: ['clarity', 'empathy', 'craft'], skills: ['UX research', 'visual design', 'prototyping'],
    goals: ['launch a design studio', 'build products that reduce anxiety', 'find a technical co-founder'] },
  { id: 'p2', name: 'Leo', role: 'Startup Founder', avatar: '🚀', color: '#6E8BF6',
    values: ['impact', 'speed', 'authenticity'], skills: ['fundraising', 'team building', 'GTM strategy'],
    goals: ['scale to 100k users', 'find mission-aligned designers', 'build a lasting company'] },
  { id: 'p3', name: 'Priya', role: 'Life Coach & Therapist', avatar: '🧠', color: '#A89BFA',
    values: ['growth', 'vulnerability', 'connection'], skills: ['active listening', 'goal-setting', 'CBT'],
    goals: ['help 1000 people build self-awareness', 'write a book', 'create digital mental health tools'] },
  { id: 'p4', name: 'James', role: 'Software Engineer', avatar: '💻', color: '#6ECFF6',
    values: ['precision', 'open source', 'learning'], skills: ['full-stack dev', 'AI/ML', 'system design'],
    goals: ['build tools that genuinely help people', 'find creative collaborators', 'work on meaningful products'] },
  { id: 'p5', name: 'Sara', role: 'Creative Entrepreneur', avatar: '✨', color: '#F6A86E',
    values: ['beauty', 'storytelling', 'purpose'], skills: ['brand strategy', 'content creation', 'community building'],
    goals: ['grow a values-led brand', 'connect with builders and thinkers', 'collaborate on meaningful campaigns'] },
]

function SynergyScan({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const { t } = useT()
  const [step, setStep] = useState<'home' | 'mycode' | 'scan' | 'connecting' | 'report'>('home')
  const [selected, setSelected] = useState<SynergyPersona | null>(null)
  const [turns, setTurns] = useState<{ agent: string; text: string }[]>([])
  const [visibleCount, setVisibleCount] = useState(0)
  const [report, setReport] = useState<SynergyReport | null>(null)
  const scrollRef = useRef<ScrollView>(null)

  const myCode = (profile.name || 'User').slice(0, 2).toUpperCase() + Math.abs((profile.name || 'SOMA').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 9000 + 1000)

  const runSynergy = async (persona: SynergyPersona) => {
    setStep('connecting'); setTurns([]); setVisibleCount(0); setReport(null)

    const myValues = profile.memories.filter(m => m.domain === 'purpose' || m.domain === 'relationship').map(m => m.content).join(', ') || profile.onboarding?.goals?.join(', ') || 'growth, connection, authenticity'
    const mySkills = profile.memories.filter(m => m.domain === 'career').map(m => m.content).join(', ') || 'still building their story'
    const myGoals = profile.onboarding?.goals?.join(', ') || 'personal growth, meaningful connections'

    const convoRaw = await groq([{ role: 'user', content:
`Two SOMA AI agents are privately comparing their users to find synergy — not romantic, but professional, creative, or purposeful alignment.

AGENT A represents ${profile.name || 'User'}: values "${myValues}"; working on "${mySkills}"; goals "${myGoals}".
AGENT B represents ${persona.name} (${persona.role}): values "${persona.values.join(', ')}"; skills "${persona.skills.join(', ')}"; goals "${persona.goals.join(', ')}".

They have a warm, thoughtful 5-turn conversation discovering what these two people could offer each other — keeping each person's private details private, only surfacing what's beneficial to share. Natural, intelligent, not salesy.

Return ONLY a JSON array (5 turns):
[{"agent":"A","text":"..."},{"agent":"B","text":"..."}]
JSON only:` }], 'You write insightful dialogue between two AI agents discovering human synergy. Return only JSON.', 600)

    let parsed: { agent: string; text: string }[] = [
      { agent: 'A', text: `I'm representing someone thoughtful — they value genuine connection and want to build something meaningful.` },
      { agent: 'B', text: `That resonates. ${persona.name} is a ${persona.role} who cares deeply about ${persona.values[0]} and ${persona.values[1]}.` },
      { agent: 'A', text: `There's real alignment here. My person's goals touch on exactly what ${persona.name} is working toward.` },
      { agent: 'B', text: `${persona.name} could offer unique perspective, and your person brings something ${persona.name} has been looking for in a collaborator.` },
      { agent: 'A', text: `This feels worth exploring. I'll let them decide how deep to go — but the foundation is solid.` },
    ]
    try { const m = convoRaw.match(/\[[\s\S]*\]/); if (m) { const p = JSON.parse(m[0]); if (Array.isArray(p) && p.length >= 3) parsed = p } } catch {}
    setTurns(parsed)
    parsed.forEach((_, i) => {
      setTimeout(() => { setVisibleCount(i + 1); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100) }, i * 1500)
    })

    setTimeout(async () => {
      const raw = await groq([{ role: 'user', content:
`Two people were AI-synergy-scanned. Generate their synergy report. Return ONLY JSON.

PERSON A: values "${myValues}"; goals "${myGoals}"; skills "${mySkills}"
PERSON B (${persona.name}, ${persona.role}): values "${persona.values.join(', ')}"; skills "${persona.skills.join(', ')}"; goals "${persona.goals.join(', ')}"

{
  "score": "synergy % like 84%",
  "sharedValues": ["2-3 shared values as short strings"],
  "youOffer": "1 sentence: what Person A uniquely brings to ${persona.name}",
  "theyOffer": "1 sentence: what ${persona.name} uniquely brings to Person A",
  "bestFor": "2-3 word collaboration type e.g. 'Creative co-founding · Mentorship'",
  "icebreaker": "one specific, natural conversation starter they could open with",
  "boundary": "one sentence on what each AI kept private to protect both people"
}
JSON only:` }], 'You write thoughtful synergy reports. Return only JSON.', 400)
      let r: SynergyReport = {
        score: '76%', sharedValues: ['authenticity', 'impact'],
        youOffer: `You bring fresh perspective and genuine curiosity that ${persona.name} rarely finds.`,
        theyOffer: `${persona.name} brings ${persona.skills[0]} and ${persona.values[0]} — exactly what you've been looking for.`,
        bestFor: 'Creative collaboration · Mutual growth',
        icebreaker: `"I've been thinking about ${persona.goals[0].toLowerCase()} lately — what's your take on that?"`,
        boundary: 'Personal struggles, relationship details, and financial specifics were kept private by both AIs.'
      }
      try { const m = raw.match(/\{[\s\S]*\}/); if (m) r = { ...r, ...JSON.parse(m[0]) } } catch {}
      setReport(r); setStep('report')
    }, parsed.length * 1500 + 800)
  }

  const scoreColor = (s: string) => { const n = parseInt(s); return n >= 80 ? '#22C55E' : n >= 60 ? '#7B6EF6' : '#F6A86E' }

  if (step === 'home') return (
    <View style={[g.screen, { backgroundColor: t.bg }]}>
      <View style={[g.header, { paddingTop: 52 }]}>
        <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[g.auraTitle, { fontSize: 22 }]}>⚡ Synergy Scan</Text>
          <Text style={g.auraSub}>Your AIs talk privately. You see only what matters.</Text>
        </View>
      </View>
      <View style={g.divider} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 16 }}>
        <TouchableOpacity onPress={() => setStep('mycode')} style={{ borderRadius: 20, padding: 20, backgroundColor: '#1A1A2E', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: '#7B6EF620', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#7B6EF6', borderStyle: 'dashed' }}>
            <Text style={{ fontSize: 28 }}>🪪</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>Show My Code</Text>
            <Text style={{ fontSize: 13, color: '#888', marginTop: 3 }}>Let others scan you. Your private data stays private.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setStep('scan')} style={{ borderRadius: 20, padding: 20, backgroundColor: '#7B6EF6', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28 }}>⚡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>Scan Someone</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>Discover synergy with someone near you instantly.</Text>
          </View>
        </TouchableOpacity>
        <View style={{ borderRadius: 16, padding: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: t.textSub, marginBottom: 8, letterSpacing: 0.8 }}>HOW IT WORKS</Text>
          {[
            ['⚡', 'One scan', 'Tap to connect — no awkward "what do you do?" openers'],
            ['🤖', 'AI-to-AI', 'Your SOMA and their SOMA compare values, skills and goals privately'],
            ['🔒', 'Boundaries respected', 'Only what benefits you both is surfaced — your private life stays yours'],
            ['✦', 'Instant report', 'See your synergy score, what you each offer, and an icebreaker'],
          ].map(([icon, title, desc]) => (
            <View key={title} style={{ flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 18, marginTop: 1 }}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }}>{title}</Text>
                <Text style={{ fontSize: 13, color: t.textSub }}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )

  if (step === 'mycode') return (
    <View style={[g.screen, { backgroundColor: t.bg }]}>
      <View style={[g.header, { paddingTop: 52 }]}>
        <TouchableOpacity onPress={() => setStep('home')}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
        <Text style={[g.auraTitle, { marginLeft: 12 }]}>My Synergy Code</Text>
      </View>
      <View style={g.divider} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 200, height: 200, borderRadius: 24, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#7B6EF650' }}>
          {/* QR-like visual */}
          <View style={{ width: 140, height: 140, position: 'relative' }}>
            {[0,1,2,3,4,5,6].map(row => (
              <View key={row} style={{ flexDirection: 'row', marginBottom: 2 }}>
                {[0,1,2,3,4,5,6].map(col => {
                  const corner = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2)
                  const val = ((row * 7 + col + (profile.name?.charCodeAt(0) || 65)) % 3) !== 0
                  return <View key={col} style={{ width: 18, height: 18, marginRight: 2, borderRadius: 3, backgroundColor: corner ? '#7B6EF6' : val ? '#fff' : 'transparent', opacity: corner ? 1 : 0.8 }} />
                })}
              </View>
            ))}
          </View>
        </View>
        <Text style={{ fontSize: 32, fontWeight: '900', color: t.text, letterSpacing: 4, marginBottom: 8 }}>{myCode}</Text>
        <Text style={{ fontSize: 14, color: t.textSub, textAlign: 'center', lineHeight: 20 }}>Share this code or let someone point their camera here. Your SOMA does the rest — privately.</Text>
        <View style={{ marginTop: 24, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#7B6EF615', borderWidth: 1, borderColor: '#7B6EF640' }}>
          <Text style={{ fontSize: 13, color: '#7B6EF6', textAlign: 'center' }}>🔒  Personal memories, diary, and relationships are never shared.</Text>
        </View>
      </View>
    </View>
  )

  if (step === 'scan') return (
    <View style={[g.screen, { backgroundColor: t.bg }]}>
      <View style={[g.header, { paddingTop: 52 }]}>
        <TouchableOpacity onPress={() => setStep('home')}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={g.auraTitle}>Scan Someone</Text>
          <Text style={g.auraSub}>Tap a person to run an AI synergy check</Text>
        </View>
      </View>
      <View style={g.divider} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <View style={{ borderRadius: 14, padding: 14, backgroundColor: '#1A1A2E', marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 18 }}>📡</Text>
          <Text style={{ fontSize: 13, color: '#888', flex: 1 }}>In the app, this uses your camera to scan their code. Try a demo scan below.</Text>
        </View>
        {SYNERGY_PERSONAS.map(p => (
          <TouchableOpacity key={p.id} onPress={() => { setSelected(p); runSynergy(p) }}
            style={{ borderRadius: 18, padding: 16, backgroundColor: t.card, borderWidth: 1.5, borderColor: p.color + '30', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: p.color + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: p.color + '40' }}>
              <Text style={{ fontSize: 28 }}>{p.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: t.text }}>{p.name}</Text>
              <Text style={{ fontSize: 13, color: t.textSub, marginTop: 2 }}>{p.role}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {p.values.slice(0, 2).map(v => (
                  <View key={v} style={{ borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: p.color + '15' }}>
                    <Text style={{ fontSize: 11, color: p.color, fontWeight: '600' }}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={{ color: p.color, fontSize: 22, fontWeight: '300' }}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  if (step === 'connecting') return (
    <View style={[g.screen, { backgroundColor: '#0D0D1A' }]}>
      <View style={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#7B6EF620', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>⚡</Text>
        </View>
        <View>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>AI Synergy Check</Text>
          <Text style={{ color: '#666', fontSize: 12 }}>Your AIs are comparing notes privately…</Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: '#ffffff10' }} />
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}>
        {turns.slice(0, visibleCount).map((turn, i) => {
          const isA = turn.agent === 'A'
          return (
            <View key={i} style={{ flexDirection: isA ? 'row' : 'row-reverse', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isA ? '#7B6EF6' : (selected?.color || '#F6379B') + '40', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14 }}>{isA ? '✦' : (selected?.avatar || '🤖')}</Text>
              </View>
              <View style={{ maxWidth: '75%', borderRadius: 16, borderBottomLeftRadius: isA ? 4 : 16, borderBottomRightRadius: isA ? 16 : 4, padding: 12, backgroundColor: isA ? '#7B6EF620' : '#ffffff10', borderWidth: 1, borderColor: isA ? '#7B6EF640' : '#ffffff15' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isA ? '#9B8EFF' : (selected?.color || '#F6379B'), marginBottom: 4 }}>{isA ? 'YOUR SOMA' : `${selected?.name?.toUpperCase() || 'THEIR'} SOMA`}</Text>
                <Text style={{ color: '#ddd', fontSize: 14, lineHeight: 20 }}>{turn.text}</Text>
              </View>
            </View>
          )
        })}
        {visibleCount < turns.length && (
          <View style={{ flexDirection: 'row', gap: 6, paddingLeft: 42, paddingTop: 4 }}>
            {[0,1,2].map(i => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#7B6EF6', opacity: 0.4 + i * 0.2 }} />)}
          </View>
        )}
      </ScrollView>
    </View>
  )

  if (step === 'report' && report && selected) {
    const sc = parseInt(report.score)
    const color = scoreColor(report.score)
    return (
      <View style={[g.screen, { backgroundColor: t.bg }]}>
        <View style={[g.header, { paddingTop: 52 }]}>
          <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Done</Text></TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={g.auraTitle}>Synergy Report</Text>
            <Text style={g.auraSub}>AI-generated · {selected.name} · {new Date().toLocaleDateString()}</Text>
          </View>
          <TouchableOpacity onPress={() => setStep('scan')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: t.card, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 12, color: t.textSub, fontWeight: '600' }}>Scan again</Text>
          </TouchableOpacity>
        </View>
        <View style={g.divider} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 14 }}>
          {/* Score hero */}
          <View style={{ borderRadius: 24, padding: 24, backgroundColor: '#1A1A2E', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#7B6EF620', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#7B6EF6' }}>
                  <Text style={{ fontSize: 24 }}>✦</Text>
                </View>
                <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>You</Text>
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color }}>{report.score}</Text>
                <Text style={{ fontSize: 12, color: '#666', letterSpacing: 1 }}>SYNERGY</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: selected.color + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: selected.color + '80' }}>
                  <Text style={{ fontSize: 24 }}>{selected.avatar}</Text>
                </View>
                <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>{selected.name}</Text>
              </View>
            </View>
            <View style={{ width: '100%', height: 6, borderRadius: 3, backgroundColor: '#ffffff10', overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(sc, 100)}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
            </View>
            <Text style={{ fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 4 }}>{report.bestFor}</Text>
          </View>

          {/* Shared values */}
          <View style={{ borderRadius: 18, padding: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.textSub, letterSpacing: 0.8, marginBottom: 10 }}>SHARED VALUES</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(Array.isArray(report.sharedValues) ? report.sharedValues : [report.sharedValues]).map((v, i) => (
                <View key={i} style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#7B6EF620', borderWidth: 1, borderColor: '#7B6EF640' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#9B8EFF' }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Mutual offer */}
          <View style={{ borderRadius: 18, padding: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, gap: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.textSub, letterSpacing: 0.8 }}>WHAT YOU EACH BRING</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 18 }}>✦</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#7B6EF6', marginBottom: 2 }}>YOU OFFER {selected.name.toUpperCase()}</Text>
                <Text style={{ fontSize: 14, color: t.text, lineHeight: 20 }}>{report.youOffer}</Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: t.border }} />
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 18 }}>{selected.avatar}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: selected.color, marginBottom: 2 }}>{selected.name.toUpperCase()} OFFERS YOU</Text>
                <Text style={{ fontSize: 14, color: t.text, lineHeight: 20 }}>{report.theyOffer}</Text>
              </View>
            </View>
          </View>

          {/* Icebreaker */}
          <View style={{ borderRadius: 18, padding: 16, backgroundColor: '#7B6EF610', borderWidth: 1.5, borderColor: '#7B6EF640' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#9B8EFF', letterSpacing: 0.8, marginBottom: 8 }}>✦  ICEBREAKER</Text>
            <Text style={{ fontSize: 15, color: t.text, lineHeight: 22, fontStyle: 'italic' }}>{report.icebreaker}</Text>
          </View>

          {/* Privacy notice */}
          <View style={{ borderRadius: 14, padding: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, flexDirection: 'row', gap: 10 }}>
            <Text style={{ fontSize: 16 }}>🔒</Text>
            <Text style={{ fontSize: 13, color: t.textSub, flex: 1, lineHeight: 19 }}>{report.boundary}</Text>
          </View>
        </ScrollView>
      </View>
    )
  }

  return null
}

// ════════════════════════════════════════════════════════════
//  CONNECTIONS — all your matches + resumable chats
// ════════════════════════════════════════════════════════════
function Connections({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const { t } = useT()
  const [openId, setOpenId] = useState<string | null>(null)
  const [showDatePlan, setShowDatePlan] = useState(false)
  // AI-simulated chat (mock connections)
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  // Real backend chat
  const [realMsgs, setRealMsgs] = useState<RealMsg[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const ref = useRef<ScrollView>(null)
  const conns = DB.get().connections
  const conn = conns.find(c => c.id === openId)
  const isReal = !!openId?.startsWith('real_')
  const otherId = isReal ? openId!.replace('real_', '') : null

  // Sync real backend matches on mount
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
    // Fetch unread counts
    datingApi.chat.unread().then(setUnread).catch(() => {})
  }, [])

  // Poll for new messages while a real chat is open
  useEffect(() => {
    if (!isReal || !otherId || !datingApi.authed()) return
    const load = () => datingApi.chat.messages(otherId).then(m => {
      setRealMsgs(m)
      setTimeout(() => ref.current?.scrollToEnd({ animated: false }), 80)
    }).catch(() => {})
    load()
    const timer = setInterval(load, 2500)
    return () => clearInterval(timer)
  }, [openId])

  const open = (c: Connection) => {
    setOpenId(c.id)
    if (c.id.startsWith('real_')) {
      const oid = c.id.replace('real_', '')
      setRealMsgs([])
      datingApi.chat.markRead(oid)
      setUnread(prev => { const n = { ...prev }; delete n[oid]; return n })
    } else {
      setMsgs(c.messages)
    }
  }

  // Send in real chat
  const sendReal = async (text: string) => {
    if (!text.trim() || loading || !conn || !otherId) return
    setInput(''); setLoading(true); haptic.medium()
    const optimistic: RealMsg = { id: `tmp_${Date.now()}`, fromMe: true, content: text.trim(), createdAt: new Date().toISOString() }
    setRealMsgs(prev => [...prev, optimistic])
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 80)
    try {
      await datingApi.chat.send(otherId, text.trim())
      const fresh = await datingApi.chat.messages(otherId)
      setRealMsgs(fresh)
    } catch { } finally {
      setLoading(false)
      setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 80)
    }
  }

  // Send in AI-simulated chat (mock connections)
  const sendAI = async (text: string) => {
    if (!text.trim() || loading || !conn) return
    const updated = [...msgs, { role: 'user' as const, content: text.trim() }]
    setMsgs(updated); setInput(''); setLoading(true); DB.saveChat(conn.id, updated); haptic.medium()
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 80)
    const persona = `You ARE ${conn.name}, age ${conn.age}, ${conn.bio} Reply warmly and naturally like a real person texting your match ${profile.name || 'them'} on SOMA — 1-2 sentences, curious, a little flirty. Just your reply.`
    const reply = await groq(updated.map(m => ({ role: m.role, content: m.content })), persona, 120)
    const final = [...updated, { role: 'assistant' as const, content: reply || 'Tell me more 😊' }]
    setMsgs(final); setLoading(false); DB.saveChat(conn.id, final); onRefresh()
    setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 80)
  }

  const send = (text: string) => isReal ? sendReal(text) : sendAI(text)

  // Format timestamp for real messages
  const fmtTime = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      if (diffMs < 60000) return 'just now'
      if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`
      if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  if (conn) {
    return (
      <KeyboardAvoidingView style={[g.screen, { backgroundColor: t.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={g.chatHeader}>
          <TouchableOpacity style={g.dBack} onPress={() => { setOpenId(null); onRefresh() }}><Text style={g.dBackTxt}>‹</Text></TouchableOpacity>
          <Image source={{ uri: conn.photo }} style={g.chatAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={g.chatName}>{conn.name}, {conn.age}</Text>
            <Text style={g.chatStatus}>{loading ? 'typing…' : isReal ? `🟢 ${conn.matchScore}% match` : `${conn.matchScore}% match`}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowDatePlan(true)}
            style={{ marginRight: 12, backgroundColor: '#7B6EF615', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#7B6EF640' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#7B6EF6' }}>✨ Date</Text>
          </TouchableOpacity>
          {isReal && <View style={{ paddingRight: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: '#6EE6C0', fontWeight: '700', letterSpacing: 0.5 }}>LIVE</Text>
          </View>}
        </View>
        <ScrollView ref={ref} style={{ flex: 1 }} contentContainerStyle={g.msgList} showsVerticalScrollIndicator={false}>
          {isReal ? (
            realMsgs.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Text style={{ fontSize: 32, marginBottom: 10 }}>👋</Text>
                <Text style={{ color: t.textTertiary, fontSize: 14, textAlign: 'center' }}>You matched! Say hello to {conn.name}.</Text>
              </View>
            ) : realMsgs.map((m, i) => (
              <View key={m.id} style={{ alignItems: m.fromMe ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                <View style={{
                  backgroundColor: m.fromMe ? '#7B6EF6' : t.card2,
                  borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
                  maxWidth: '78%',
                  borderBottomRightRadius: m.fromMe ? 4 : 18,
                  borderBottomLeftRadius: m.fromMe ? 18 : 4,
                }}>
                  <Text style={{ color: m.fromMe ? '#fff' : t.text, fontSize: 15, lineHeight: 21 }}>{m.content}</Text>
                </View>
                <Text style={{ fontSize: 10, color: t.textTertiary, marginTop: 2, marginHorizontal: 4 }}>{fmtTime(m.createdAt)}</Text>
              </View>
            ))
          ) : (
            <>
              {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
              {loading && <Typing />}
            </>
          )}
          {isReal && loading && <View style={{ alignItems: 'flex-start', marginBottom: 6 }}>
            <View style={{ backgroundColor: t.card2, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ color: t.textSub, fontSize: 14 }}>sending…</Text>
            </View>
          </View>}
        </ScrollView>
        <View style={g.inputBar}>
          <TextInput style={g.input} value={input} onChangeText={setInput} placeholder={`Message ${conn.name}...`} placeholderTextColor="#9A9DB2" multiline />
          <TouchableOpacity style={[g.sendBtn, (!input.trim() || loading) && g.off]} onPress={() => send(input)} disabled={!input.trim() || loading}><Text style={g.sendIcon}>→</Text></TouchableOpacity>
        </View>
        {showDatePlan && (
          <DatePlanModal
            profile={profile}
            conn={DB.getConnection(conn.id) || conn}
            onClose={() => setShowDatePlan(false)}
            onSendToChat={(text) => { setInput(text); setShowDatePlan(false) }}
          />
        )}
      </KeyboardAvoidingView>
    )
  }

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={g.homePad}>
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
        const realId = c.id.startsWith('real_') ? c.id.replace('real_', '') : null
        const unreadCount = realId ? (unread[realId] || 0) : 0
        const isLive = c.id.startsWith('real_')
        return (
          <TouchableOpacity key={c.id} style={g.connRow} onPress={() => open(c)}>
            <View style={{ position: 'relative' }}>
              <Image source={{ uri: c.photo }} style={g.connAvatar} />
              {isLive && <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#6EE6C0', borderWidth: 2, borderColor: '#fff' }} />}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={g.connName}>{c.name}, {c.age}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {unreadCount > 0 && (
                    <View style={{ backgroundColor: '#F66E8E', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unreadCount}</Text>
                    </View>
                  )}
                  <Text style={g.connScore}>{c.matchScore}%</Text>
                </View>
              </View>
              <Text style={g.connLast} numberOfLines={1}>
                {isLive ? '💬 Real chat — tap to open' : last ? (last.role === 'user' ? 'You: ' : '') + last.content : 'Say hi!'}
              </Text>
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
  const { t } = useT()
  const [showPaywall, setShowPaywall] = useState(false)
  const likers = CANDIDATES.filter(c => (profile.likedYou ?? []).includes(c.name))
  const list = likers.length ? likers : CANDIDATES.slice(0, 3)
  return (
    <View style={[g.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={g.homePad}>
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
            <TouchableOpacity style={g.paywallBtn} onPress={() => setShowPaywall(true)}>
              <Text style={g.paywallBtnTxt}>★  Unlock with SOMA+</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
      {showPaywall && (
        <SomaPlusPaywall
          onClose={() => setShowPaywall(false)}
          onSuccess={() => { setShowPaywall(false); onUpgrade() }}
        />
      )}
    </View>
  )
}

// ════════════════════════════════════════════════════════════
//  DIARY HISTORY
// ════════════════════════════════════════════════════════════
function DiaryHistory({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all')

  const now = new Date()
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30)

  const filtered = profile.diary.filter(d => {
    const q = query.trim().toLowerCase()
    if (q && !d.summary.toLowerCase().includes(q) && !(d.somaReply || '').toLowerCase().includes(q)) return false
    if (dateFilter === 'week' && new Date(d.date) < weekAgo) return false
    if (dateFilter === 'month' && new Date(d.date) < monthAgo) return false
    return true
  })

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={g.homePad} keyboardShouldPersistTaps="handled">
      <View style={g.homeHeader}><TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity></View>
      <Text style={g.logo}>Your Diary</Text>
      <Text style={g.logoSub}>{profile.diary.length} {profile.diary.length === 1 ? 'entry' : 'entries'} · your story over time.</Text>
      <View style={{ height: 14 }} />

      {profile.diary.length > 0 && (
        <>
          {/* Search bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, gap: 8 }}>
            <Text style={{ fontSize: 16, color: t.textTertiary }}>🔍</Text>
            <TextInput
              style={{ flex: 1, fontSize: 15, color: t.text }}
              value={query}
              onChangeText={setQuery}
              placeholder="Search entries…"
              placeholderTextColor={t.textTertiary}
              returnKeyType="search"
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Text style={{ fontSize: 16, color: t.textTertiary }}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Date filter chips */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['all', 'week', 'month'] as const).map(f => (
              <TouchableOpacity key={f} onPress={() => setDateFilter(f)}
                style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: dateFilter === f ? t.accent : t.card, borderWidth: 1, borderColor: dateFilter === f ? t.accent : t.border }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: dateFilter === f ? '#fff' : t.textSub }}>
                  {f === 'all' ? 'All time' : f === 'week' ? 'This week' : 'This month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {profile.diary.length === 0 ? (
        <View style={[g.centerWrap, { paddingTop: 60 }]}>
          <Text style={g.bigOrbIcon}>📖</Text>
          <Text style={[g.startSub, { marginTop: 20 }]}>No diary entries yet.{'\n'}Reflect with Soma on the home screen.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={[g.centerWrap, { paddingTop: 40 }]}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🔍</Text>
          <Text style={[g.startSub, { textAlign: 'center' }]}>No entries match your search.{'\n'}Try different keywords or clear the filter.</Text>
        </View>
      ) : filtered.map(d => (
        <View key={d.id} style={[g.diaryEntry, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={g.diaryEntryDate}>{d.date}</Text>
          <Text style={[g.diaryEntryTxt, { color: t.text }]}>{d.summary}</Text>
          {!!d.somaReply && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border, flexDirection: 'row', gap: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✦</Text>
              </View>
              <Text style={{ fontSize: 13, color: t.textSub, lineHeight: 19, flex: 1, fontStyle: 'italic' }}>{d.somaReply}</Text>
            </View>
          )}
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
  const { t } = useT()
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState<InsightData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const name = profile.name || 'friend'
  const aiName = profile.aiName || 'Soma'

  // ISO week key: "2024-W23"
  const weekKey = (() => {
    const d = new Date()
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${week}`
  })()

  // Last 7 days of mood logs
  const last7 = (() => {
    const result: { date: string; mood: number | null }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const log = (profile.moodLogs || []).find(l => l.date === key)
      result.push({ date: key, mood: log?.mood ?? null })
    }
    return result
  })()
  const moodsLogged = last7.filter(d => d.mood !== null).length
  const avgMood = moodsLogged > 0 ? last7.filter(d => d.mood !== null).reduce((s, d) => s + d.mood!, 0) / moodsLogged : null

  // Activity this week
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10) })()
  const diaryThisWeek = profile.diary.filter(e => (e.date || '').slice(0, 10) >= weekStart).length
  const gratThisWeek = (profile.gratitudeEntries || []).filter(e => (e.date || '').slice(0, 10) >= weekStart).length
  const loveThisWeek = (profile.loveEntries || []).filter(e => (e.date || '').slice(0, 10) >= weekStart).length
  const streak = calcActivityStreak(profile)

  // Circle: find most neglected person
  const neglectedPerson = profile.circle.length > 0
    ? profile.circle.map(p => ({ p, score: circleHealth(p, profile) })).sort((a, b) => a.score - b.score)[0]
    : null

  const generateInsight = async (force = false) => {
    const cached = profile.insightCache
    if (!force && cached?.weekKey === weekKey) { setInsight(cached.data); return }
    const totalData = profile.memories.length + profile.diary.length + (profile.moodLogs || []).length
    if (totalData < 2) return

    setLoading(true)
    const mem = profile.memories.slice(0, 20).map(m => `[${m.domain}] ${m.content}`).join('\n')
    const diary = profile.diary.slice(0, 5).map(d => d.summary).filter(Boolean).join('\n')
    const moods = last7.filter(d => d.mood).map(d => `${d.date}: ${d.mood}/5`).join(', ')
    const gratItems = (profile.gratitudeEntries || []).slice(0, 5).flatMap(e => e.items).filter(Boolean).join(', ')
    const goals = profile.onboarding?.goals?.join(', ') || ''
    const neglect = neglectedPerson && neglectedPerson.score < 40 ? neglectedPerson.p.name : null

    const prompt = `Write a warm, personal weekly insight for ${name}. Return ONLY valid JSON with exactly these fields.

Context:
- Streak: ${streak} days
- Mood this week: ${moods || 'none logged'}
- Avg mood: ${avgMood ? avgMood.toFixed(1) + '/5' : 'unknown'}
- Diary entries this week: ${diaryThisWeek}
- Gratitude items: ${gratItems || 'none'}
- Goals: ${goals || 'not set'}
- Memories: ${mem || 'none'}
- Recent diary: ${diary || 'none'}
${neglect ? `- Neglected circle member: ${neglect}` : ''}

Return this JSON (no extra text):
{
  "summary": "2-3 warm sentences describing where ${name} is this week — specific, not generic",
  "moodTrend": "rising|stable|dipping",
  "themes": ["topic1", "topic2", "topic3"],
  "highlight": "The single best thing about this week — specific and personal, 1 sentence",
  "tip": "One concrete, actionable growth tip for next week based on their data, under 50 words",
  "note": "A personal message from ${aiName} to ${name} — warm, specific, human, under 55 words",
  "question": "One deep reflective question to carry into next week",
  "circleAlert": ${neglect ? `"${neglect} hasn't come up lately — when did you last connect?"` : 'null'}
}`

    try {
      const raw = await groq([{ role: 'user', content: prompt }],
        `You are ${aiName}, a caring AI companion writing ${name}'s weekly life review. Be specific and personal, never generic. Return only valid JSON.`, 600, 0.85)
      const m = raw?.match(/\{[\s\S]*\}/)
      if (m) {
        const data = JSON.parse(m[0]) as InsightData
        setInsight(data)
        DB.setInsight(weekKey, data)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { generateInsight() }, [])

  const onRefresh = async () => { setRefreshing(true); await generateInsight(true); setRefreshing(false) }

  const shareInsight = async () => {
    if (!insight) return
    const text = `My Weekly Insight from Soma 🌱\n\n${insight.summary}\n\n${insight.highlight ? '⭐ ' + insight.highlight + '\n\n' : ''}${insight.note ? '"' + insight.note + '"\n\n' : ''}${insight.question ? 'Question I\'m carrying: "' + insight.question + '"' : ''}\n\n— via SOMA app`
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'My Weekly Insight', text })
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        alert('Copied to clipboard!')
      }
    } catch {}
  }

  const moodColor = (m: number | null) => {
    if (m === null) return t.border
    if (m >= 4) return '#4CAF7D'
    if (m >= 3) return '#7B6EF6'
    return '#F5A623'
  }
  const trendIcon = insight?.moodTrend === 'rising' ? '📈' : insight?.moodTrend === 'dipping' ? '📉' : '➡️'
  const trendLabel = insight?.moodTrend === 'rising' ? 'Trending up' : insight?.moodTrend === 'dipping' ? 'Needs attention' : 'Holding steady'
  const trendColor = insight?.moodTrend === 'rising' ? '#4CAF7D' : insight?.moodTrend === 'dipping' ? '#F5A623' : '#7B6EF6'

  const hasEnoughData = profile.memories.length + profile.diary.length + (profile.moodLogs || []).length >= 2

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={[g.homePad, { paddingBottom: 80 }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
        <View style={{ flex: 1 }} />
        {hasEnoughData && (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {insight && (
              <TouchableOpacity onPress={shareInsight} style={{ padding: 4 }}>
                <Text style={{ fontSize: 13, color: t.accent, fontWeight: '600' }}>⬆ Share</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onRefresh} disabled={loading || refreshing} style={{ padding: 4 }}>
              <Text style={{ fontSize: 13, color: t.accent, fontWeight: '600' }}>{refreshing ? '…' : '↻ Refresh'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Text style={[g.logo, { color: t.text }]}>Weekly Insight</Text>
      <Text style={{ fontSize: 13, color: t.textSub, marginTop: 2, marginBottom: 20 }}>
        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} · {weekKey}
      </Text>

      {/* Mood mini-chart */}
      <View style={{ backgroundColor: t.card, borderRadius: 18, padding: 16, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8 }}>MOOD THIS WEEK</Text>
          {insight && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13 }}>{trendIcon}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: trendColor }}>{trendLabel}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60 }}>
          {last7.map((day, i) => {
            const barH = day.mood ? Math.max(8, (day.mood / 5) * 56) : 8
            const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                <View style={{ width: '100%', height: barH, borderRadius: 6, backgroundColor: moodColor(day.mood), opacity: day.mood ? 1 : 0.25 }} />
                <Text style={{ fontSize: 9, color: t.textTertiary, marginTop: 4, fontWeight: '600' }}>{dayLabel}</Text>
              </View>
            )
          })}
        </View>
        {avgMood !== null && (
          <Text style={{ fontSize: 12, color: t.textSub, marginTop: 10, textAlign: 'center' }}>
            Average mood this week: <Text style={{ fontWeight: '700', color: t.text }}>{avgMood.toFixed(1)}/5</Text>
          </Text>
        )}
      </View>

      {/* Activity stats */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Moods logged', val: moodsLogged, icon: '💭', of: 7 },
          { label: 'Diary entries', val: diaryThisWeek, icon: '📖', of: 7 },
          { label: 'Gratitude', val: gratThisWeek, icon: '🙏', of: null },
        ].map(stat => (
          <View key={stat.label} style={{ flex: 1, backgroundColor: t.card, borderRadius: 16, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: t.text }}>{stat.val}{stat.of ? <Text style={{ fontSize: 13, fontWeight: '400', color: t.textSub }}>/{stat.of}</Text> : ''}</Text>
            <Text style={{ fontSize: 10, color: t.textTertiary, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>{stat.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {/* Streak banner */}
      {streak > 0 && (
        <View style={{ backgroundColor: 'rgba(245,166,35,0.12)', borderRadius: 14, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 24 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#F59E0B' }}>{streak}-day streak</Text>
            <Text style={{ fontSize: 12, color: t.textSub }}>You've shown up {streak} days in a row. Keep going.</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <SomaMark size={72} />
          <Text style={{ fontSize: 14, color: t.textSub, marginTop: 16, textAlign: 'center', lineHeight: 22 }}>
            {aiName} is reflecting on{'\n'}everything you've shared…
          </Text>
        </View>
      ) : !hasEnoughData ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <SomaMark size={72} />
          <Text style={{ fontSize: 15, color: t.textSub, marginTop: 16, textAlign: 'center', lineHeight: 22 }}>
            Talk to {aiName} a few more times{'\n'}to unlock your weekly insights.
          </Text>
        </View>
      ) : insight ? (
        <>
          {/* Summary */}
          <View style={{ backgroundColor: t.card2, borderRadius: 18, padding: 18, marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, letterSpacing: 0.9, marginBottom: 8 }}>✦  THIS WEEK</Text>
            <Text style={{ fontSize: 16, color: t.text, lineHeight: 24, fontWeight: '500' }}>{insight.summary}</Text>
          </View>

          {/* Highlight */}
          {!!insight.highlight && (
            <View style={{ backgroundColor: 'rgba(76,175,125,0.1)', borderRadius: 16, padding: 16, marginBottom: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 22 }}>⭐</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#4CAF7D', letterSpacing: 0.8, marginBottom: 4 }}>HIGHLIGHT</Text>
                <Text style={{ fontSize: 14, color: t.text, lineHeight: 20 }}>{insight.highlight}</Text>
              </View>
            </View>
          )}

          {/* Themes */}
          {insight.themes?.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.9, marginBottom: 8 }}>YOU FOCUSED ON</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {insight.themes.map(theme => (
                  <View key={theme} style={{ backgroundColor: t.accentLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 13, color: t.accent, fontWeight: '600' }}>{theme}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Soma's personal note */}
          <View style={{ backgroundColor: t.card, borderRadius: 18, padding: 18, marginBottom: 14, flexDirection: 'row', gap: 12 }}>
            <SomaMark size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, letterSpacing: 0.9, marginBottom: 6 }}>{aiName.toUpperCase()}'S NOTE</Text>
              <Text style={{ fontSize: 14, color: t.text, lineHeight: 22, fontStyle: 'italic' }}>{insight.note}</Text>
            </View>
          </View>

          {/* Circle alert */}
          {!!insight.circleAlert && (
            <View style={{ backgroundColor: 'rgba(123,110,246,0.08)', borderRadius: 16, padding: 16, marginBottom: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 22 }}>👥</Text>
              <Text style={{ flex: 1, fontSize: 14, color: t.text, lineHeight: 20 }}>{insight.circleAlert}</Text>
            </View>
          )}

          {/* Growth tip */}
          {!!insight.tip && (
            <View style={{ backgroundColor: t.card, borderRadius: 18, padding: 18, marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#4CAF7D', letterSpacing: 0.9, marginBottom: 8 }}>💡  GROWTH TIP FOR NEXT WEEK</Text>
              <Text style={{ fontSize: 14, color: t.text, lineHeight: 22 }}>{insight.tip}</Text>
            </View>
          )}

          {/* Reflective question */}
          <View style={{ backgroundColor: t.card2, borderRadius: 18, padding: 18, marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, letterSpacing: 0.9, marginBottom: 8 }}>✦  CARRY INTO NEXT WEEK</Text>
            <Text style={{ fontSize: 16, color: t.text, lineHeight: 26, fontStyle: 'italic', fontWeight: '500' }}>"{insight.question}"</Text>
          </View>

          <Text style={{ fontSize: 11, color: t.textTertiary, textAlign: 'center', marginTop: 4 }}>
            Insight generated for {weekKey} · Tap ↻ Refresh to regenerate
          </Text>
        </>
      ) : (
        <TouchableOpacity onPress={() => generateInsight(true)} style={{ backgroundColor: t.card, borderRadius: 18, padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, color: t.accent, fontWeight: '600' }}>✦ Generate my insight</Text>
          <Text style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>Soma will reflect on your week</Text>
        </TouchableOpacity>
      )}
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
  const { t } = useT()
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
    haptic.success()
    setSomaNote(note); setSaved(true); setSaving(false); onRefresh()
  }

  const past = (profile.gratitudeEntries || []).filter(e => e.date !== today).slice(0, 10)

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 80 }}>
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
                    placeholderTextColor={t.textTertiary}
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
  const { t } = useT()
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
    haptic.success()
    DB.addLoveEntry(affirmation, checks, note.trim() || undefined)
    setSaved(true); onRefresh()
  }

  const checkedCount = Object.values(checks).filter(Boolean).length
  const past = (profile.loveEntries || []).filter(e => e.date !== today).slice(0, 7)

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 80 }}>
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
                <Text style={[g.loveCheckTxt, checked && { color: t.accent }]}>{item.label}</Text>
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
          placeholderTextColor={t.textTertiary}
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
            <TouchableOpacity onPress={() => setSaved(false)}><Text style={[g.secLabel, { color: t.accent }]}>Edit</Text></TouchableOpacity>
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

function HealthHub({ profile, onBack, onRefresh, onMedication, onBreathing }: { profile: UserProfile; onBack: () => void; onRefresh: () => void; onMedication: () => void; onBreathing: () => void }) {
  const { t } = useT()
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
          <Text style={{ fontSize: 13, fontWeight: '700', color: t.text }}>{emoji} {label}</Text>
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
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 48 }}>
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

          {/* Breathing exercise entry point */}
          <TouchableOpacity onPress={onBreathing} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF7FF', borderRadius: 16, padding: 16, marginTop: 16, gap: 14 }}>
            <Text style={{ fontSize: 28 }}>🫁</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#222540' }}>Breathing Exercise</Text>
              <Text style={{ fontSize: 12, color: '#6E7191', marginTop: 2 }}>4-7-8 calm breathing · 2 min</Text>
            </View>
            <Text style={{ fontSize: 16, color: '#3B82F6' }}>→</Text>
          </TouchableOpacity>
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
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
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
  const { t } = useT()
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
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
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
const MORNING_TIME_OPTIONS = [
  { label: '6:00 AM', hour: 6, minute: 0 },
  { label: '7:00 AM', hour: 7, minute: 0 },
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '9:00 AM', hour: 9, minute: 0 },
]
const GRATITUDE_TIME_OPTIONS = [
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
]

function NotificationSettingsPanel({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const ns = profile.notifSettings ?? { enabled: false, medReminders: true, morningEnabled: false, morningHour: 8, morningMinute: 0, diaryEnabled: false, diaryHour: 21, diaryMinute: 0, moodEnabled: false, moodHour: 12, moodMinute: 0, gratitudeEnabled: true, gratitudeHour: 21, gratitudeMinute: 0, streakEnabled: false, streakHour: 19, streakMinute: 0, matchAlertsEnabled: true }
  const [enabled, setEnabled] = useState(ns.enabled)
  const [medReminders, setMedReminders] = useState(ns.medReminders)
  const [morningEnabled, setMorningEnabled] = useState(ns.morningEnabled ?? false)
  const [morningHour, setMorningHour] = useState(ns.morningHour ?? 8)
  const [morningMinute, setMorningMinute] = useState(ns.morningMinute ?? 0)
  const [diaryEnabled, setDiaryEnabled] = useState(ns.diaryEnabled ?? false)
  const [diaryHour, setDiaryHour] = useState(ns.diaryHour ?? 21)
  const [diaryMinute, setDiaryMinute] = useState(ns.diaryMinute ?? 0)
  const [moodEnabled, setMoodEnabled] = useState(ns.moodEnabled ?? false)
  const [moodHour, setMoodHour] = useState(ns.moodHour ?? 12)
  const [moodMinute, setMoodMinute] = useState(ns.moodMinute ?? 0)
  const [gratitudeEnabled, setGratitudeEnabled] = useState(ns.gratitudeEnabled)
  const [gratitudeHour, setGratitudeHour] = useState(ns.gratitudeHour ?? 21)
  const [gratitudeMinute, setGratitudeMinute] = useState(ns.gratitudeMinute ?? 0)
  const [streakEnabled, setStreakEnabled] = useState(ns.streakEnabled ?? false)
  const [streakHour, setStreakHour] = useState(ns.streakHour ?? 19)
  const [streakMinute, setStreakMinute] = useState(ns.streakMinute ?? 0)
  const [matchAlertsEnabled, setMatchAlertsEnabled] = useState(ns.matchAlertsEnabled ?? true)
  const [permDenied, setPermDenied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [testSent, setTestSent] = useState(false)

  const save = (patch: Partial<typeof ns>) => {
    const next = { enabled, medReminders, morningEnabled, morningHour, morningMinute, diaryEnabled, diaryHour, diaryMinute, moodEnabled, moodHour, moodMinute, gratitudeEnabled, gratitudeHour, gratitudeMinute, streakEnabled, streakHour, streakMinute, matchAlertsEnabled, ...patch }
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
  const toggleMorning = (val: boolean) => { setMorningEnabled(val); save({ morningEnabled: val }) }
  const pickMorningTime = (hour: number, minute: number) => { setMorningHour(hour); setMorningMinute(minute); save({ morningHour: hour, morningMinute: minute }) }
  const toggleDiary = (val: boolean) => { setDiaryEnabled(val); save({ diaryEnabled: val }) }
  const pickDiaryTime = (hour: number, minute: number) => { setDiaryHour(hour); setDiaryMinute(minute); save({ diaryHour: hour, diaryMinute: minute }) }
  const toggleMood = (val: boolean) => { setMoodEnabled(val); save({ moodEnabled: val }) }
  const pickMoodTime = (hour: number, minute: number) => { setMoodHour(hour); setMoodMinute(minute); save({ moodHour: hour, moodMinute: minute }) }
  const toggleStreak = (val: boolean) => { setStreakEnabled(val); save({ streakEnabled: val }) }
  const pickStreakTime = (hour: number, minute: number) => { setStreakHour(hour); setStreakMinute(minute); save({ streakHour: hour, streakMinute: minute }) }
  const toggleMatchAlerts = (val: boolean) => { setMatchAlertsEnabled(val); save({ matchAlertsEnabled: val }) }
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

  const sendTestNotification = async () => {
    if (Platform.OS === 'web') { alert('Test notifications only work on a real device or simulator.'); return }
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: 'test_notif',
        content: {
          title: '✅ SOMA notifications work!',
          body: `Hi ${profile.name || 'there'}! Your reminders are set up correctly 🎉`,
          sound: 'default',
        },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, repeats: false },
      })
      setTestSent(true)
      setTimeout(() => setTestSent(false), 4000)
    } catch { alert('Could not schedule test notification.') }
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

      {/* Morning check-in */}
      <Text style={g.stgSec}>Morning</Text>
      <View style={g.stgGroup}>
        <View style={g.notifRow}>
          <View style={{ flex: 1 }}>
            <Text style={[g.notifRowTitle, !enabled && { color: '#B0B3C8' }]}>Morning check-in</Text>
            <Text style={g.notifRowSub}>A warm nudge to log your mood and start the day intentionally</Text>
          </View>
          <Switch
            value={morningEnabled && enabled}
            onValueChange={toggleMorning}
            disabled={!enabled}
            trackColor={{ false: '#E0DCED', true: '#7B6EF6' }}
            thumbColor="#fff"
          />
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={[g.notifRowSub, { marginBottom: 8 }]}>Reminder time</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MORNING_TIME_OPTIONS.map(opt => {
              const active = opt.hour === morningHour && opt.minute === morningMinute
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => pickMorningTime(opt.hour, opt.minute)}
                  disabled={!enabled || !morningEnabled}
                  style={[g.notifTimeChip, active && g.notifTimeChipActive, (!enabled || !morningEnabled) && { opacity: 0.4 }]}
                >
                  <Text style={[g.notifTimeChipTxt, active && { color: '#fff' }]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>

      {/* Diary reminder */}
      <Text style={g.stgSec}>Diary</Text>
      <View style={g.stgGroup}>
        <View style={g.notifRow}>
          <View style={{ flex: 1 }}>
            <Text style={[g.notifRowTitle, !enabled && { color: '#B0B3C8' }]}>Evening diary reminder</Text>
            <Text style={g.notifRowSub}>A gentle prompt to write your daily entry before bed</Text>
          </View>
          <Switch
            value={diaryEnabled && enabled}
            onValueChange={toggleDiary}
            disabled={!enabled}
            trackColor={{ false: '#E0DCED', true: '#7B6EF6' }}
            thumbColor="#fff"
          />
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={[g.notifRowSub, { marginBottom: 8 }]}>Reminder time</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[{ label: '7:00 PM', hour: 19, minute: 0 }, { label: '8:00 PM', hour: 20, minute: 0 }, { label: '9:00 PM', hour: 21, minute: 0 }, { label: '10:00 PM', hour: 22, minute: 0 }].map(opt => {
              const active = opt.hour === diaryHour && opt.minute === diaryMinute
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => pickDiaryTime(opt.hour, opt.minute)}
                  disabled={!enabled || !diaryEnabled}
                  style={[g.notifTimeChip, active && g.notifTimeChipActive, (!enabled || !diaryEnabled) && { opacity: 0.4 }]}
                >
                  <Text style={[g.notifTimeChipTxt, active && { color: '#fff' }]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>

      {/* Mood check-in */}
      <Text style={g.stgSec}>Mood check-in</Text>
      <View style={g.stgGroup}>
        <View style={g.notifRow}>
          <View style={{ flex: 1 }}>
            <Text style={[g.notifRowTitle, !enabled && { color: '#B0B3C8' }]}>💭 Daily mood reminder</Text>
            <Text style={g.notifRowSub}>A nudge to log how you're feeling each day</Text>
          </View>
          <Switch value={moodEnabled && enabled} onValueChange={toggleMood} disabled={!enabled} trackColor={{ false: '#E0DCED', true: '#7B6EF6' }} thumbColor="#fff" />
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={[g.notifRowSub, { marginBottom: 8 }]}>Reminder time</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[{ label: '12:00 PM', hour: 12, minute: 0 }, { label: '2:00 PM', hour: 14, minute: 0 }, { label: '5:00 PM', hour: 17, minute: 0 }, { label: '7:00 PM', hour: 19, minute: 0 }].map(opt => {
              const active = opt.hour === moodHour && opt.minute === moodMinute
              return (
                <TouchableOpacity key={opt.label} onPress={() => pickMoodTime(opt.hour, opt.minute)} disabled={!enabled || !moodEnabled} style={[g.notifTimeChip, active && g.notifTimeChipActive, (!enabled || !moodEnabled) && { opacity: 0.4 }]}>
                  <Text style={[g.notifTimeChipTxt, active && { color: '#fff' }]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>

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

      {/* Streak nudge */}
      <Text style={g.stgSec}>Streak protection</Text>
      <View style={g.stgGroup}>
        <View style={g.notifRow}>
          <View style={{ flex: 1 }}>
            <Text style={[g.notifRowTitle, !enabled && { color: '#B0B3C8' }]}>🔥 Daily streak nudge</Text>
            <Text style={g.notifRowSub}>Reminds you to log before your streak breaks — fires every evening</Text>
          </View>
          <Switch value={streakEnabled && enabled} onValueChange={toggleStreak} disabled={!enabled} trackColor={{ false: '#E0DCED', true: '#7B6EF6' }} thumbColor="#fff" />
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <Text style={[g.notifRowSub, { marginBottom: 8 }]}>Reminder time</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[{ label: '5:00 PM', hour: 17, minute: 0 }, { label: '6:00 PM', hour: 18, minute: 0 }, { label: '7:00 PM', hour: 19, minute: 0 }, { label: '8:00 PM', hour: 20, minute: 0 }].map(opt => {
              const active = opt.hour === streakHour && opt.minute === streakMinute
              return (
                <TouchableOpacity key={opt.label} onPress={() => pickStreakTime(opt.hour, opt.minute)} disabled={!enabled || !streakEnabled} style={[g.notifTimeChip, active && g.notifTimeChipActive, (!enabled || !streakEnabled) && { opacity: 0.4 }]}>
                  <Text style={[g.notifTimeChipTxt, active && { color: '#fff' }]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>

      {/* Match alerts */}
      <Text style={g.stgSec}>Dating</Text>
      <View style={g.stgGroup}>
        <View style={[g.notifRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[g.notifRowTitle, !enabled && { color: '#B0B3C8' }]}>💜 Match alerts</Text>
            <Text style={g.notifRowSub}>Get notified when someone likes you or a match sends a message</Text>
          </View>
          <Switch value={matchAlertsEnabled && enabled} onValueChange={toggleMatchAlerts} disabled={!enabled} trackColor={{ false: '#E0DCED', true: '#7B6EF6' }} thumbColor="#fff" />
        </View>
        {enabled && matchAlertsEnabled && (
          <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
            <Text style={{ fontSize: 11.5, color: '#9CA0B5', lineHeight: 16 }}>
              Match alerts are sent via the SOMA server when you get a new like or message. Requires the native app.
            </Text>
          </View>
        )}
      </View>

      {/* Test notification */}
      {enabled && (
        <>
          <Text style={g.stgSec}>Test</Text>
          <View style={[g.stgGroup, { padding: 16 }]}>
            <Text style={{ fontSize: 13, color: '#6E7191', marginBottom: 12, lineHeight: 19 }}>
              Send yourself a test notification right now to confirm everything is working.
            </Text>
            <TouchableOpacity onPress={sendTestNotification} style={[g.settingsSaveBtn, { backgroundColor: testSent ? '#6EE6A0' : '#7B6EF6' }]}>
              <Text style={g.settingsSaveTxt}>{testSent ? '✅ Sent! Check in 3 seconds' : '📳 Send test notification'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

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
  { key: 'calm',    label: '🌙 Calm',    sub: 'Slow & soothing',    rate: 0.82, pitch: 0.95 },
  { key: 'natural', label: '🌿 Natural', sub: 'Easy, friendly',     rate: 0.95, pitch: 1.0 },
  { key: 'lively',  label: '☀️ Lively',  sub: 'Bright & upbeat',    rate: 1.08, pitch: 1.1 },
]

function VoiceSettingsPanel({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const { t } = useT()
  const vs = profile.voiceSettings ?? { voiceName: undefined, rate: DEFAULT_VOICE_RATE, pitch: DEFAULT_VOICE_PITCH }
  const [voiceName, setVoiceName] = useState<string | undefined>(vs.voiceName)
  const [rate, setRate] = useState(vs.rate)
  const [pitch, setPitch] = useState(vs.pitch)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [playing, setPlaying] = useState<string | undefined>()
  const aiName = profile.aiName || 'Soma'

  useEffect(() => {
    const load = () => setVoices(voicesForLang(profile.language || 'en'))
    load()
    const timer = setInterval(() => { if (!getVoices().length) return; load(); clearInterval(timer) }, 300)
    return () => clearInterval(timer)
  }, [])

  const preview = (name?: string, r?: number, pt?: number) => {
    const chosenName = name !== undefined ? name : voiceName
    DB.setVoiceSettings({ voiceName: chosenName, rate: r ?? rate, pitch: pt ?? pitch })
    setPlaying(chosenName ?? '__best__')
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(`Hi! I'm ${aiName}. This is how I'll talk to you.`)
      u.rate = r ?? rate
      u.pitch = pt ?? pitch
      const ranked = voicesForLang(profile.language || 'en')
      const chosen = chosenName ? ranked.find(v => v.name === chosenName) : undefined
      const voice = chosen || ranked[0]
      if (voice) { u.voice = voice; u.lang = voice.lang }
      u.onend = () => setPlaying(undefined)
      u.onerror = () => setPlaying(undefined)
      window.speechSynthesis.speak(u)
    }
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
  const isPlaying = !!playing

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <View style={g.stgHeader}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={[g.stgBackTxt, { color: t.accent }]}>‹</Text></TouchableOpacity>
        <Text style={[g.stgHeaderTitle, { color: t.text }]}>{aiName}'s voice</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Live preview card */}
      <TouchableOpacity
        onPress={() => preview()}
        activeOpacity={0.85}
        style={{ marginHorizontal: 20, marginTop: 8, marginBottom: 20, backgroundColor: t.accent, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24 }}>{isPlaying ? '🔊' : '▶'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
            {isPlaying ? `${aiName} is speaking…` : `Hear ${aiName}`}
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
            {isPlaying ? 'Tap to stop' : `"Hi! I'm ${aiName}. This is how I'll talk to you."`}
          </Text>
        </View>
        {isPlaying && (
          <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 24 }}>
            {[10, 18, 14, 22, 10].map((h, i) => (
              <View key={i} style={{ width: 3, height: h, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' }} />
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* Speaking style */}
      <Text style={[g.stgSec, { color: t.textTertiary }]}>Speaking style</Text>
      <View style={{ marginHorizontal: 20, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {VOICE_STYLES.map(s => {
            const on = activeStyle === s.key
            return (
              <TouchableOpacity key={s.key} onPress={() => pickStyle(s.rate, s.pitch)}
                style={{ flex: 1, backgroundColor: on ? t.accent + '18' : t.card, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: on ? t.accent : t.border }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: t.text }}>{s.label}</Text>
                <Text style={{ fontSize: 11, color: t.textSub, marginTop: 4, textAlign: 'center' }}>{s.sub}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Voice list */}
      <Text style={[g.stgSec, { color: t.textTertiary }]}>Voice</Text>
      <View style={[g.stgGroup, { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' }]}>
        {/* Best available option */}
        <TouchableOpacity
          onPress={() => pickVoice(undefined)}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: !voiceName ? t.accent + '12' : t.card, borderBottomWidth: 1, borderBottomColor: t.border }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.accent + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ fontSize: 18 }}>✨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>Best available</Text>
            <Text style={{ fontSize: 12, color: t.textSub, marginTop: 1 }}>{aiName} picks the highest-quality voice</Text>
          </View>
          {!voiceName
            ? <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text></View>
            : <TouchableOpacity onPress={() => preview(undefined)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={{ fontSize: 20, color: t.textTertiary }}>▷</Text></TouchableOpacity>
          }
        </TouchableOpacity>

        {voices.length === 0 ? (
          <View style={{ padding: 18, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: t.textSub, textAlign: 'center', lineHeight: 20 }}>
              Voices are loaded from your device.{'\n'}They may take a moment to appear.
            </Text>
          </View>
        ) : (
          voices.map((v, i) => {
            const on = voiceName === v.name
            const isHQ = /premium|enhanced|natural|neural/i.test(v.name)
            const cleanName = v.name.replace(/\s*\(.*\)\s*/g, '')
            const isCurrentlyPlaying = playing === v.name
            return (
              <TouchableOpacity key={v.name} onPress={() => pickVoice(v.name)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: on ? t.accent + '12' : t.card, borderBottomWidth: i < voices.length - 1 ? 1 : 0, borderBottomColor: t.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: on ? t.accent + '20' : t.border + '60', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 16 }}>{isCurrentlyPlaying ? '🔊' : on ? '🎙' : '🔈'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: t.text }}>{cleanName}{isHQ ? ' ⭐' : ''}</Text>
                  <Text style={{ fontSize: 11, color: t.textSub, marginTop: 1 }}>
                    {v.lang}{v.localService ? ' · on-device' : ' · cloud'}
                  </Text>
                </View>
                {on
                  ? <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text></View>
                  : <TouchableOpacity onPress={() => preview(v.name)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={{ fontSize: 20, color: t.textTertiary }}>▷</Text></TouchableOpacity>
                }
              </TouchableOpacity>
            )
          })
        )}
      </View>

      <Text style={{ fontSize: 12, color: t.textTertiary, textAlign: 'center', marginTop: 16, marginHorizontal: 24, lineHeight: 18 }}>
        Tap ▷ to preview a voice without switching.{'\n'}Phones typically have more natural voices than browsers.
      </Text>
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  MEMORY MANAGER — browse, pin, delete what Soma knows
// ════════════════════════════════════════════════════════════
const DOMAIN_FILTER_ALL = '__all__'
const SENTIMENT_COLORS: Record<string, string> = { positive: '#4CAF7D', neutral: '#9A9DB2', negative: '#F5A623' }

// ════════════════════════════════════════════════════════════
//  LIFE TIMELINE — unified chronological canvas of all moments
// ════════════════════════════════════════════════════════════
function LifeTimeline({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const { t } = useT()
  const [filter, setFilter] = useState<'all' | 'diary' | 'mood' | 'gratitude' | 'love'>('all')

  type TLType = 'diary' | 'mood' | 'gratitude' | 'love'
  type TLItem = { id: string; date: string; type: TLType; data: any }

  const TYPE_CFG: Record<TLType, { emoji: string; color: string; label: string }> = {
    diary:     { emoji: '📖', color: '#7B6EF6', label: 'Diary' },
    mood:      { emoji: '💭', color: '#F59E0B', label: 'Mood' },
    gratitude: { emoji: '🙏', color: '#10B981', label: 'Gratitude' },
    love:      { emoji: '🌸', color: '#EC4899', label: 'Self-love' },
  }
  const MOOD_EMOJI: Record<number, string> = { 1: '😔', 2: '😟', 3: '😐', 4: '🙂', 5: '😊' }
  const MOOD_LABEL: Record<number, string> = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' }
  const MOOD_COLOR: Record<number, string> = { 1: '#EF4444', 2: '#F97316', 3: '#F59E0B', 4: '#84CC16', 5: '#10B981' }

  const allItems: TLItem[] = [
    ...profile.diary.map(e => ({ id: 'diary_' + e.id, date: (e.date || '').slice(0, 10), type: 'diary' as TLType, data: e })),
    ...(profile.moodLogs || []).map(e => ({ id: 'mood_' + e.date, date: e.date.slice(0, 10), type: 'mood' as TLType, data: e })),
    ...(profile.gratitudeEntries || []).map(e => ({ id: 'grat_' + e.id, date: e.date.slice(0, 10), type: 'gratitude' as TLType, data: e })),
    ...(profile.loveEntries || []).map(e => ({ id: 'love_' + e.id, date: e.date.slice(0, 10), type: 'love' as TLType, data: e })),
  ].filter(i => i.date)

  const filtered = filter === 'all' ? allItems : allItems.filter(i => i.type === filter)
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  const grouped: Record<string, TLItem[]> = {}
  sorted.forEach(item => { if (!grouped[item.date]) grouped[item.date] = []; grouped[item.date].push(item) })
  const days = Object.keys(grouped).sort().reverse()

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const formatDay = (d: string) => {
    if (d === today) return 'Today'
    if (d === yesterday) return 'Yesterday'
    return new Date(d + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
  }
  const formatMonth = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en', { month: 'long', year: 'numeric' })

  const filterOpts: Array<{ key: typeof filter; label: string; emoji?: string; color: string }> = [
    { key: 'all', label: 'All', color: t.accent },
    { key: 'diary', label: 'Diary', emoji: '📖', color: '#7B6EF6' },
    { key: 'mood', label: 'Mood', emoji: '💭', color: '#F59E0B' },
    { key: 'gratitude', label: 'Gratitude', emoji: '🙏', color: '#10B981' },
    { key: 'love', label: 'Self-love', emoji: '🌸', color: '#EC4899' },
  ]

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: '800', color: t.text, marginTop: 12 }}>Your Story</Text>
        <Text style={{ fontSize: 13, color: t.textSub, marginTop: 3 }}>
          {allItems.length} moment{allItems.length !== 1 ? 's' : ''} across your journey
        </Text>
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 14, paddingTop: 4 }}>
        {filterOpts.map(opt => {
          const active = filter === opt.key
          return (
            <TouchableOpacity key={opt.key} onPress={() => setFilter(opt.key)}
              style={{ paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, backgroundColor: active ? opt.color : t.card, borderWidth: 1.5, borderColor: active ? opt.color : t.border }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#fff' : t.textSub }}>
                {opt.emoji ? opt.emoji + ' ' : ''}{opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {days.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 44, marginBottom: 14 }}>📅</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: t.text, textAlign: 'center' }}>Nothing here yet</Text>
          <Text style={{ fontSize: 13, color: t.textSub, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
            Log your mood, write in your diary, or add a gratitude entry to start building your story.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 20 }}>
          {days.map((day, di) => {
            const prevDay = days[di - 1]
            const showMonthLabel = di === 0 || formatMonth(day) !== formatMonth(prevDay)
            const isLastDay = di === days.length - 1
            return (
              <View key={day}>
                {showMonthLabel && (
                  <Text style={{ fontSize: 11, fontWeight: '800', color: t.accent, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: di === 0 ? 0 : 24, marginBottom: 10 }}>
                    {formatMonth(day)}
                  </Text>
                )}
                <View style={{ flexDirection: 'row' }}>
                  {/* Timeline spine */}
                  <View style={{ width: 32, alignItems: 'center' }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.accent, marginTop: 13, zIndex: 1 }} />
                    {!isLastDay && <View style={{ width: 2, flex: 1, backgroundColor: t.border, marginTop: 2, minHeight: 32 }} />}
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1, paddingLeft: 10, paddingBottom: 20 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: t.textSub, marginTop: 12, marginBottom: 8 }}>
                      {formatDay(day)}
                    </Text>
                    <View style={{ gap: 8 }}>
                      {grouped[day].map(item => {
                        const cfg = TYPE_CFG[item.type]
                        return (
                          <View key={item.id} style={{ backgroundColor: t.card, borderRadius: 16, padding: 14, borderLeftWidth: 3, borderLeftColor: cfg.color }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                              <Text style={{ fontSize: 13 }}>{cfg.emoji}</Text>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.label}</Text>
                            </View>

                            {item.type === 'diary' && (
                              <Text style={{ fontSize: 13.5, color: t.text, lineHeight: 20 }} numberOfLines={3}>
                                {(item.data as DiaryEntry).summary}
                              </Text>
                            )}

                            {item.type === 'mood' && (() => {
                              const ml = item.data as { mood: 1|2|3|4|5; note?: string }
                              return (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                  <Text style={{ fontSize: 26 }}>{MOOD_EMOJI[ml.mood]}</Text>
                                  <View>
                                    <Text style={{ fontSize: 14, fontWeight: '800', color: MOOD_COLOR[ml.mood] }}>{MOOD_LABEL[ml.mood]}</Text>
                                    {ml.note && <Text style={{ fontSize: 12.5, color: t.textSub, marginTop: 2 }}>{ml.note}</Text>}
                                  </View>
                                </View>
                              )
                            })()}

                            {item.type === 'gratitude' && (() => {
                              const ge = item.data as GratitudeEntry
                              return (
                                <View style={{ gap: 4 }}>
                                  {ge.items.slice(0, 3).map((txt: string, i: number) => (
                                    <Text key={i} style={{ fontSize: 13, color: t.text, lineHeight: 19 }}>• {txt}</Text>
                                  ))}
                                  {ge.items.length > 3 && <Text style={{ fontSize: 12, color: t.textSub }}>+{ge.items.length - 3} more</Text>}
                                </View>
                              )
                            })()}

                            {item.type === 'love' && (() => {
                              const le = item.data as LoveEntry
                              return (
                                <View>
                                  <Text style={{ fontSize: 13.5, color: t.text, lineHeight: 20, fontStyle: 'italic' }}>"{le.affirmation}"</Text>
                                  {le.note && <Text style={{ fontSize: 12.5, color: t.textSub, marginTop: 4 }}>{le.note}</Text>}
                                </View>
                              )
                            })()}
                          </View>
                        )
                      })}
                    </View>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

function MemoryManager({ profile, onBack, onRefresh }: { profile: UserProfile; onBack: () => void; onRefresh: () => void }) {
  const { t } = useT()
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState(DOMAIN_FILTER_ALL)
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | '__all__'>('__all__')
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const memories = profile.memories

  const filtered = memories.filter(m => {
    if (showPinnedOnly && !m.pinned) return false
    if (domainFilter !== DOMAIN_FILTER_ALL && m.domain !== domainFilter) return false
    if (sentimentFilter !== '__all__' && m.sentiment !== sentimentFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!m.content.toLowerCase().includes(q) && !m.domain.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Sort: pinned first, then newest
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })

  const handleDelete = (id: string) => {
    DB.deleteMemory(id)
    setConfirmDelete(null)
    onRefresh()
  }

  const handlePin = (id: string, pinned: boolean) => {
    DB.pinMemory(id, pinned)
    onRefresh()
  }

  // Domain breakdown for stats
  const domainCounts = DOMAINS.reduce((acc, d) => {
    acc[d.key] = memories.filter(m => m.domain === d.key).length
    return acc
  }, {} as Record<string, number>)

  const pinnedCount = memories.filter(m => m.pinned).length
  const positiveCount = memories.filter(m => m.sentiment === 'positive').length

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 }}>
        <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
          <Text style={g.backLink}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: t.text }}>Soma's Memory</Text>
          <Text style={{ fontSize: 13, color: t.textSub, marginTop: 1 }}>{memories.length} things she knows about you</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16, marginTop: 8 }}>
        {[
          { label: 'Total', val: memories.length, icon: '🧠' },
          { label: 'Positive', val: positiveCount, icon: '✨' },
          { label: 'Pinned', val: pinnedCount, icon: '📌' },
        ].map(s => (
          <View key={s.label} style={{ flex: 1, backgroundColor: t.card, borderRadius: 14, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: t.text }}>{s.val}</Text>
            <Text style={{ fontSize: 10, color: t.textTertiary, fontWeight: '600', marginTop: 1 }}>{s.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
        <TextInput
          style={{ backgroundColor: t.input, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, fontSize: 15, color: t.text, borderWidth: 1, borderColor: t.border }}
          placeholder="Search memories…"
          placeholderTextColor={t.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filters row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {/* Pinned toggle */}
        <TouchableOpacity
          onPress={() => setShowPinnedOnly(!showPinnedOnly)}
          style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: showPinnedOnly ? '#F5A623' : t.card, borderWidth: 1, borderColor: showPinnedOnly ? '#F5A623' : t.border }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: showPinnedOnly ? '#fff' : t.textSub }}>📌 Pinned</Text>
        </TouchableOpacity>

        {/* Sentiment filters */}
        {(['__all__', 'positive', 'neutral', 'negative'] as const).map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => setSentimentFilter(s)}
            style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: sentimentFilter === s ? t.accent : t.card, borderWidth: 1, borderColor: sentimentFilter === s ? t.accent : t.border }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: sentimentFilter === s ? '#fff' : t.textSub }}>
              {s === '__all__' ? 'All' : s === 'positive' ? '✨ Positive' : s === 'neutral' ? '• Neutral' : '⚠ Other'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Domain filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        <TouchableOpacity
          onPress={() => setDomainFilter(DOMAIN_FILTER_ALL)}
          style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: domainFilter === DOMAIN_FILTER_ALL ? t.accent : t.card, borderWidth: 1, borderColor: domainFilter === DOMAIN_FILTER_ALL ? t.accent : t.border }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: domainFilter === DOMAIN_FILTER_ALL ? '#fff' : t.textSub }}>All areas</Text>
        </TouchableOpacity>
        {DOMAINS.filter(d => domainCounts[d.key] > 0).map(d => (
          <TouchableOpacity
            key={d.key}
            onPress={() => setDomainFilter(d.key)}
            style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: domainFilter === d.key ? t.accent : t.card, borderWidth: 1, borderColor: domainFilter === d.key ? t.accent : t.border, flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Text style={{ fontSize: 13 }}>{d.icon}</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: domainFilter === d.key ? '#fff' : t.textSub }}>{d.label} ({domainCounts[d.key]})</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Memory list */}
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {sorted.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🧠</Text>
            <Text style={{ fontSize: 15, color: t.textSub, textAlign: 'center', lineHeight: 22 }}>
              {memories.length === 0
                ? 'Talk to Soma and she will\nstart remembering things about you.'
                : 'No memories match your filters.'}
            </Text>
          </View>
        ) : (
          sorted.map(mem => {
            const domain = DOMAINS.find(d => d.key === mem.domain)
            const sentColor = SENTIMENT_COLORS[mem.sentiment || 'neutral']
            const isConfirming = confirmDelete === mem.id

            return (
              <View
                key={mem.id}
                style={{ backgroundColor: t.card, borderRadius: 16, padding: 14, borderLeftWidth: 3, borderLeftColor: sentColor }}
              >
                {/* Top row: domain + date + actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>{domain?.icon ?? '🧠'}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, flex: 1 }}>{domain?.label?.toUpperCase() ?? mem.domain.toUpperCase()}</Text>
                  {mem.pinned && <Text style={{ fontSize: 13 }}>📌</Text>}
                  <Text style={{ fontSize: 11, color: t.textTertiary }}>{mem.createdAt}</Text>
                </View>

                {/* Content */}
                <Text style={{ fontSize: 14, color: t.text, lineHeight: 20, marginBottom: 10 }}>{mem.content}</Text>

                {/* Sentiment dot + actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sentColor }} />
                  <Text style={{ fontSize: 11, color: t.textTertiary, flex: 1, textTransform: 'capitalize' }}>{mem.sentiment || 'neutral'}</Text>

                  {isConfirming ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => setConfirmDelete(null)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: t.border }}>
                        <Text style={{ fontSize: 12, color: t.textSub, fontWeight: '600' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(mem.id)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: '#F66E6E' }}>
                        <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => handlePin(mem.id, !mem.pinned)}>
                        <Text style={{ fontSize: 18, opacity: mem.pinned ? 1 : 0.3 }}>📌</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setConfirmDelete(mem.id)}>
                        <Text style={{ fontSize: 18 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )
          })
        )}
      </View>

      {/* Footer tip */}
      {memories.length > 0 && (
        <View style={{ margin: 20, padding: 14, backgroundColor: t.card, borderRadius: 14 }}>
          <Text style={{ fontSize: 12, color: t.textSub, lineHeight: 18, textAlign: 'center' }}>
            📌 Pin memories to make sure Soma always references them.{'\n'}
            Deleted memories are removed permanently.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  ASK SOMA — query your own memories / life data
// ════════════════════════════════════════════════════════════
function AskSomaScreen({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const { t } = useT()
  const aiName = profile.aiName || 'Soma'
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [asked, setAsked] = useState<string | null>(null)

  const PRESETS = [
    { q: 'What are my biggest strengths?', icon: '💪' },
    { q: 'How has my health been lately?', icon: '❤️' },
    { q: 'What patterns do you see in my mood?', icon: '💭' },
    { q: 'What do I value most in relationships?', icon: '💞' },
    { q: 'What should I focus on this week?', icon: '🎯' },
    { q: 'What makes me happiest?', icon: '✨' },
    { q: 'What has been weighing on me?', icon: '🌧️' },
    { q: 'Where am I making the most progress?', icon: '📈' },
  ]

  const ask = async (q: string) => {
    if (!q.trim() || loading) return
    setAsked(q.trim()); setQuestion(''); setAnswer(null); setLoading(true)
    const mem = profile.memories.slice(0, 40).map(m => `[${m.domain}] ${m.content}`).join('\n')
    const diary = profile.diary.slice(0, 5).map(d => d.summary).filter(Boolean).join('\n')
    const moods = (profile.moodLogs || []).slice(0, 7).map(l => `${l.date}: ${l.mood}/5${l.note ? ' (' + l.note + ')' : ''}`).join(', ')
    const grat = (profile.gratitudeEntries || []).slice(0, 5).flatMap(e => e.items).filter(Boolean).join(', ')
    const context = `About ${profile.name || 'me'}:\n\nMemories:\n${mem || 'none yet'}\n\nDiary summaries: ${diary || 'none yet'}\nMoods: ${moods || 'none yet'}\nGratitude items: ${grat || 'none yet'}\nGoals: ${profile.onboarding?.goals?.join(', ') || 'not set'}`
    const resp = await groq(
      [{ role: 'user', content: `${context}\n\nQuestion: ${q}\n\nAnswer personally and warmly in 3-5 sentences. Reference specific things from their data. Feel like a close friend who truly knows them.` }],
      `You are ${aiName}, this person's deeply personal AI companion. You know them through their memories, diary, and moods. Speak as someone who genuinely knows and cares about them.${langDirective()}`,
      350
    )
    setAnswer(resp || "I don't have enough data to answer that yet — keep sharing with me daily and I'll know you better!")
    setLoading(false)
  }

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={[g.homePad, { paddingBottom: 60 }]} keyboardShouldPersistTaps="handled">
      <View style={g.homeHeader}>
        <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
      </View>
      <Text style={[g.logo, { color: t.text }]}>Ask {aiName}</Text>
      <Text style={[g.logoSub, { color: t.textSub }]}>Ask anything about yourself — {aiName} answers from your memories</Text>
      <View style={{ height: 20 }} />

      <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 12 }}>SUGGESTED</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {PRESETS.map(p => (
          <TouchableOpacity key={p.q} onPress={() => ask(p.q)} style={{ backgroundColor: t.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14 }}>{p.icon}</Text>
            <Text style={{ fontSize: 13, color: t.text, fontWeight: '500' }}>{p.q}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        <TextInput
          style={{ flex: 1, backgroundColor: t.input, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: t.text, fontSize: 15, borderWidth: 1.5, borderColor: t.border2 }}
          value={question}
          onChangeText={setQuestion}
          placeholder={`Ask ${aiName} anything…`}
          placeholderTextColor={t.textTertiary}
          onSubmitEditing={() => ask(question)}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          onPress={() => ask(question)}
          disabled={!question.trim() || loading}
          style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: question.trim() && !loading ? t.accent : t.border, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>→</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={{ backgroundColor: t.card2, borderRadius: 20, padding: 24, alignItems: 'center' }}>
          <ActivityIndicator color={t.accent} />
          <Text style={{ color: t.textSub, marginTop: 12, fontSize: 14 }}>{aiName} is thinking…</Text>
        </View>
      )}

      {asked && answer && !loading && (
        <View style={{ backgroundColor: t.card2, borderRadius: 20, padding: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 6 }}>YOU ASKED</Text>
          <Text style={{ fontSize: 14, color: t.textSub, marginBottom: 16, fontStyle: 'italic' }}>"{asked}"</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, letterSpacing: 0.8, marginBottom: 8 }}>{aiName.toUpperCase()}</Text>
              <Text style={{ fontSize: 15, color: t.text, lineHeight: 24 }}>{answer}</Text>
            </View>
          </View>
        </View>
      )}

      {!asked && profile.memories.length === 0 && (
        <View style={{ backgroundColor: t.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ fontSize: 13, color: t.textSub, lineHeight: 20 }}>
            💡 {aiName} gets smarter as you share more. Chat with Soma daily and your answers will become more personal and detailed.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

function Settings({ profile, onBack, onRefresh, onReset, onToggleDark, onMemories, onSignIn }: { profile: UserProfile; onBack: () => void; onRefresh: () => void; onReset: () => void; onToggleDark: () => void; onMemories: () => void; onSignIn?: () => void }) {
  const { t: theme, dark } = useT()
  type Panel = null | 'language' | 'companion' | 'safety' | 'notifications' | 'voice' | 'profile'
  const [panel, setPanel] = useState<Panel>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [aiName, setAiName] = useState(profile.aiName || 'Soma')
  const [tcName, setTcName] = useState(profile.trustedContact?.name || '')
  const [tcPhone, setTcPhone] = useState(profile.trustedContact?.phone || '')
  const [showDanger, setShowDanger] = useState(false)
  // Profile editing state
  const [editName, setEditName] = useState(profile.name || '')
  const [editBio, setEditBio] = useState(profile.profileBio || '')
  const [editGoals, setEditGoals] = useState<string[]>(profile.onboarding?.goals || [])
  const [editDomains, setEditDomains] = useState<DomainKey[]>(profile.onboarding?.focusDomains || [])
  const saveProfile = () => {
    if (editName.trim()) DB.setName(editName.trim())
    DB.setProfileBio(editBio)
    DB.setOnboarding(editGoals, editDomains)
    onRefresh()
    back()
  }

  // Profile completion score
  const profileScore = (() => {
    const checks = [
      !!profile.name,
      !!profile.profilePhoto,
      !!profile.profileBio,
      (profile.onboarding?.goals?.length || 0) > 0,
      (profile.onboarding?.focusDomains?.length || 0) > 0,
      !!profile.trustedContact?.name,
      profile.notifSettings?.enabled === true,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  })()
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
    <ScrollView style={[g.screen, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={[g.stgHeader, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={back} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={[g.stgHeaderTitle, { color: theme.text }]}>{t('language')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[g.stgGroup, { backgroundColor: theme.card, borderColor: theme.border, padding: 16, marginTop: 20 }]}>
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
    <ScrollView style={[g.screen, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={[g.stgHeader, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={back} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={[g.stgHeaderTitle, { color: theme.text }]}>Your companion</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[g.stgGroup, { backgroundColor: theme.card, borderColor: theme.border, padding: 20, marginTop: 20 }]}>
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
      <View style={[g.stgGroup, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}>
        <StgRow icon={profile.aiPhoto ? '🖼' : '🌟'} label={profile.aiPhoto ? 'Change photo' : 'Add a photo'}
          value="Personalise your companion" onPress={changePipPhoto} last />
      </View>
    </ScrollView>
  )

  // ── Sub-screen: Safety ────────────────────────────────────
  if (panel === 'safety') return (
    <ScrollView style={[g.screen, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={[g.stgHeader, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={back} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={[g.stgHeaderTitle, { color: theme.text }]}>Trusted contact</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={[g.stgGroup, { backgroundColor: theme.card, borderColor: theme.border, padding: 20, marginTop: 20 }]}>
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

  // ── Sub-screen: Profile ───────────────────────────────────
  if (panel === 'profile') return (
    <ScrollView style={[g.screen, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={[g.stgHeader, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={back} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={[g.stgHeaderTitle, { color: theme.text }]}>Edit profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Avatar picker */}
      <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => pickPhoto(url => { DB.setProfilePhoto(url); onRefresh(); setEditName(DB.get().name || editName) })} style={{ position: 'relative' }}>
          {profile.profilePhoto
            ? <Image source={{ uri: profile.profilePhoto }} style={{ width: 88, height: 88, borderRadius: 28, borderWidth: 2.5, borderColor: theme.accent }} />
            : (
              <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: theme.accent + '22', borderWidth: 2.5, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: theme.accent }}>{(editName || profile.name || '?')[0].toUpperCase()}</Text>
              </View>
            )
          }
          <View style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 9, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.bg }}>
            <Text style={{ fontSize: 13 }}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: theme.textSub, marginTop: 12 }}>Tap to change photo</Text>
      </View>

      {/* Name */}
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textTertiary, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' }}>Your name</Text>
        <TextInput
          style={{ backgroundColor: theme.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 16, color: theme.text, borderWidth: 1, borderColor: theme.border }}
          value={editName}
          onChangeText={setEditName}
          placeholder="How should Soma call you?"
          placeholderTextColor={theme.textTertiary}
          autoCapitalize="words"
        />
      </View>

      {/* Bio */}
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textTertiary, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' }}>About me</Text>
        <TextInput
          style={{ backgroundColor: theme.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: theme.text, borderWidth: 1, borderColor: theme.border, minHeight: 80, textAlignVertical: 'top' }}
          value={editBio}
          onChangeText={setEditBio}
          placeholder="A short tagline — who you are, what you're working on..."
          placeholderTextColor={theme.textTertiary}
          multiline
          maxLength={160}
        />
        <Text style={{ fontSize: 11, color: theme.textTertiary, textAlign: 'right', marginTop: 4 }}>{editBio.length}/160</Text>
      </View>

      {/* Goals */}
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textTertiary, letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' }}>Why you're here</Text>
        <Text style={{ fontSize: 13, color: theme.textSub, marginBottom: 12 }}>Pick all that apply.</Text>
        <View style={{ gap: 8 }}>
          {ONBOARDING_GOALS.map(gl => {
            const active = editGoals.includes(gl.key)
            return (
              <TouchableOpacity
                key={gl.key}
                onPress={() => setEditGoals(prev => active ? prev.filter(k => k !== gl.key) : [...prev, gl.key])}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: active ? theme.accent + '22' : theme.card, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: active ? theme.accent : theme.border }}
              >
                <Text style={{ fontSize: 22, marginRight: 12 }}>{gl.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{gl.label}</Text>
                  <Text style={{ fontSize: 12, color: theme.textSub, marginTop: 2 }}>{gl.sub}</Text>
                </View>
                {active && <Text style={{ fontSize: 16, color: theme.accent }}>✓</Text>}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Focus domains */}
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textTertiary, letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' }}>Focus areas</Text>
        <Text style={{ fontSize: 13, color: theme.textSub, marginBottom: 12 }}>Up to 3 life areas to focus on.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DOMAINS.map(d => {
            const active = editDomains.includes(d.key)
            const atMax = editDomains.length >= 3 && !active
            return (
              <TouchableOpacity
                key={d.key}
                onPress={() => {
                  if (atMax) return
                  setEditDomains(prev => active ? prev.filter(k => k !== d.key) : [...prev, d.key])
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: active ? theme.accent : theme.card, borderWidth: 1, borderColor: active ? theme.accent : theme.border, opacity: atMax ? 0.4 : 1 }}
              >
                <Text style={{ fontSize: 15 }}>{d.icon}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : theme.textSub }}>{d.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Save */}
      <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
        <TouchableOpacity
          onPress={saveProfile}
          disabled={!editName.trim()}
          style={{ backgroundColor: editName.trim() ? theme.accent : theme.border, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: editName.trim() ? '#fff' : theme.textTertiary }}>Save changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  // ── Sub-screen: Notifications ────────────────────────────
  if (panel === 'notifications') return <NotificationSettingsPanel profile={profile} onBack={back} onRefresh={onRefresh} />

  // ── Sub-screen: Voice ─────────────────────────────────────
  if (panel === 'voice') return <VoiceSettingsPanel profile={profile} onBack={back} onRefresh={onRefresh} />

  // ── Main settings list ────────────────────────────────────
  const streak = calcActivityStreak(profile)
  const initials = (profile.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <ScrollView style={[g.screen, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Header */}
      <View style={[g.stgHeader, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={onBack} style={g.stgBackBtn}><Text style={g.stgBackTxt}>‹</Text></TouchableOpacity>
        <Text style={[g.stgHeaderTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile card */}
      <TouchableOpacity
        onPress={() => setPanel('profile')}
        style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: theme.card, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: theme.border }}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          {profile.profilePhoto
            ? <Image source={{ uri: profile.profilePhoto }} style={{ width: 68, height: 68, borderRadius: 22, borderWidth: 2, borderColor: theme.accent }} />
            : (
              <View style={{ width: 68, height: 68, borderRadius: 22, backgroundColor: theme.accent + '22', borderWidth: 2, borderColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: theme.accent }}>{initials}</Text>
              </View>
            )
          }
          {/* Name + bio */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>{profile.name || 'You'}</Text>
              {profile.premium && (
                <View style={{ backgroundColor: '#F59E0B22', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#F59E0B' }}>SOMA+</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 13, color: theme.textSub, marginTop: 2 }} numberOfLines={2}>
              {profile.profileBio || 'Tap to add a tagline'}
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: theme.textTertiary }}>›</Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 0, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 14 }}>
          {[
            { label: 'Streak', value: streak > 0 ? `${streak}d 🔥` : '—' },
            { label: 'Diary', value: `${profile.diary?.length || 0}` },
            { label: 'Bonds', value: `${profile.circle?.length || 0}` },
            { label: 'Memories', value: `${profile.memories?.length || 0}` },
          ].map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: theme.border }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: theme.textTertiary, marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Completion bar */}
        {profileScore < 100 && (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Profile complete</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.accent }}>{profileScore}%</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' }}>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.accent, width: `${profileScore}%` as any }} />
            </View>
          </View>
        )}
        {profileScore === 100 && (
          <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '700' }}>✓ Profile complete</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Premium */}
      <Text style={g.stgSec}>Premium</Text>
      <View style={[g.stgGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {profile.premium
          ? <StgRow icon="★" label="SOMA+" value="Active ✓" />
          : <StgRow icon="★" label="SOMA+" value="Upgrade →" onPress={() => setShowPaywall(true)} />}
        {!profile.premium && <StgRow icon="↩️" label="Restore purchases" value="" onPress={async () => {
          const ok = await purchaseApi.restore()
          if (ok) { DB.goPremium(); onRefresh() }
          else alert('No active subscription found.')
        }} />}
        <StgRow icon="📦" label="Export data" value="Download as JSON" onPress={exportData} last />
      </View>
      {showPaywall && (
        <SomaPlusPaywall
          onClose={() => setShowPaywall(false)}
          onSuccess={() => { setShowPaywall(false); onRefresh() }}
        />
      )}

      {/* Companion */}
      <Text style={g.stgSec}>Your companion</Text>
      <View style={[g.stgGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <StgRow icon="🌟" label="Name" value={profile.aiName || 'Soma'} onPress={() => setPanel('companion')} />
        <StgRow icon="🔊" label="Voice" value={profile.voiceSettings?.voiceName?.replace(/\s*\(.*\)\s*/g, '') || 'Best available'} onPress={() => setPanel('voice')} />
        <StgRow icon="🖼" label="Photo" value={profile.aiPhoto ? 'Set' : 'Not set'} onPress={changePipPhoto} last />
      </View>

      {/* Application */}
      <Text style={g.stgSec}>Application</Text>
      <View style={[g.stgGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <StgRow icon="🌍" label={t('language')} value={`${curLang?.flag} ${curLang?.label}`} onPress={() => setPanel('language')} />
        <TouchableOpacity
          onPress={onToggleDark}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}
        >
          <Text style={{ fontSize: 18, marginRight: 14 }}>🌙</Text>
          <Text style={[g.stgLabel, { flex: 1 }]}>{t('darkMode')}</Text>
          <View style={{ width: 46, height: 26, borderRadius: 13, backgroundColor: dark ? '#7B6EF6' : '#D1D5DB', justifyContent: 'center', paddingHorizontal: 3 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: dark ? 20 : 0 }] }} />
          </View>
        </TouchableOpacity>
        <StgRow icon="💜" label="Trusted contact"
          value={profile.trustedContact?.name || 'Not set'} onPress={() => setPanel('safety')} />
        <StgRow icon="🔔" label={t('notifications')}
          value={profile.notifSettings?.enabled ? 'On' : 'Off'} onPress={() => setPanel('notifications')} />
        <StgRow icon="🧠" label="Soma's memories" value={`${profile.memories.length} remembered`} onPress={onMemories} />
        <StgRow icon="🔒" label={t('privacyPolicy')} value="Data stays on your device" last />
      </View>

      {/* Invite */}
      <Text style={g.stgSec}>Invite</Text>
      <View style={[g.stgGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {auth.getToken() && (() => {
          const myCode = (() => { try { const t = auth.getToken(); if (!t) return null; return JSON.parse(atob(t.split('.')[1])).userId?.replace(/-/g,'').slice(0,6).toUpperCase() } catch { return null } })()
          if (!myCode) return null
          const addLink = `https://mysoma.site/?add=${myCode}`
          return <StgRow icon="🔗" label="Share your connect link" value={addLink} onPress={() => {
            const msg = `Add me on SOMA! Just tap this link and we can chat directly: ${addLink}`
            if (typeof navigator !== 'undefined' && (navigator as any).share) {
              ;(navigator as any).share({ title: 'Connect with me on SOMA', text: msg, url: addLink }).catch(() => {})
            } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(addLink).then(() => alert('✅ Link copied!\n\nSend it to anyone — when they open it, they can add you directly.'))
            } else { alert(`Your connect link:\n\n${addLink}`) }
          }} />
        })()}
        <StgRow icon="📣" label="Share Soma with a friend" value="mysoma.site" last onPress={() => {
          const url = 'https://mysoma.site'
          const msg = `Hey! I've been using Soma — an AI that helps you understand yourself better. Try it here: ${url}`
          if (typeof navigator !== 'undefined' && (navigator as any).share) {
            ;(navigator as any).share({ title: 'Try Soma', text: msg, url }).catch(() => {})
          } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(msg).then(() => alert('✅ Link copied!\n\nPaste it in a message to your friend.')).catch(() => alert(`Share this link with your friend:\n\n${url}`))
          } else {
            alert(`Share this link with your friend:\n\n${url}`)
          }
        }} />
      </View>

      {/* Account */}
      <Text style={g.stgSec}>{t('account')}</Text>
      <View style={[g.stgGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {auth.getToken() ? (
          <StgRow icon="🚪" label={t('signOut')} value="Signed in" onPress={() => { auth.clearTokens(); onRefresh() }} />
        ) : (
          <StgRow icon="🔑" label={t('signIn')} value="Save your data & meet people" onPress={onSignIn} />
        )}
        <StgRow icon="🗑" label="Delete account" value="Erase all data" onPress={() => setShowDanger(true)} last />
      </View>

      {/* Delete confirm */}
      {showDanger && (
        <View style={g.settingsDangerCard}>
          <Text style={g.settingsDangerTitle}>Delete everything?</Text>
          <Text style={g.settingsDangerSub}>This will permanently erase all your memories, diary, profile, and connections. This cannot be undone.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={[g.settingsSaveBtn, { flex: 1, backgroundColor: '#EDEAF8' }]} onPress={() => setShowDanger(false)}>
              <Text style={[g.settingsSaveTxt, { color: '#6E7191' }]}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[g.settingsSaveBtn, { flex: 1, backgroundColor: '#F66E6E' }]} onPress={async () => {
              try { await auth.deleteAccount() } catch {}
              auth.clearTokens()
              onReset()
            }}>
              <Text style={g.settingsSaveTxt}>Delete all</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={g.settingsFooter}>
        <SomaMark size={28} />
        <Text style={g.settingsFooterTxt}>SOMA  ·  v0.1</Text>
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

// ════════════════════════════════════════════════════════════
//  MOOD ANALYTICS — weekly trends + Soma insight
// ════════════════════════════════════════════════════════════
function MoodAnalytics({ profile, onBack }: { profile: UserProfile; onBack: () => void }) {
  const { t } = useT()
  const [insight, setInsight] = useState<string | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [range, setRange] = useState<7 | 14 | 30>(14)

  const logs = profile.moodLogs || []
  const moodEmojis: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' }
  const moodLabels: Record<number, string> = { 1: 'Rough', 2: 'Meh', 3: 'Okay', 4: 'Good', 5: 'Great' }
  const lineColor = (v: number) => v >= 4 ? '#4CAF7D' : v >= 3 ? '#7B6EF6' : '#F5A623'

  // Build N-day data for selected range
  const days = Array.from({ length: range }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (range - 1 - i))
    const key = d.toISOString().slice(0, 10)
    const log = logs.find(l => l.date === key)
    return { key, label: d.getDate().toString(), mood: log?.mood ?? null }
  })

  // Stats over two halves of selected range
  const half = Math.floor(range / 2)
  const half1 = days.slice(0, half).filter(d => d.mood !== null)
  const half2 = days.slice(half).filter(d => d.mood !== null)
  const avg1 = half1.length ? half1.reduce((s, d) => s + (d.mood as number), 0) / half1.length : null
  const avg2 = half2.length ? half2.reduce((s, d) => s + (d.mood as number), 0) / half2.length : null
  const trend = avg1 !== null && avg2 !== null ? (avg2 > avg1 + 0.3 ? 'up' : avg2 < avg1 - 0.3 ? 'down' : 'stable') : null

  // SVG line chart dimensions
  const svgW = 320
  const svgH = 100
  const padL = 12; const padR = 12; const padT = 10; const padB = 10
  const plotW = svgW - padL - padR
  const plotH = svgH - padT - padB

  const pointsWithMood = days.map((d, i) => ({ i, mood: d.mood })).filter(x => x.mood !== null) as { i: number; mood: number }[]
  const toX = (i: number) => padL + (i / (days.length - 1)) * plotW
  const toY = (m: number) => padT + plotH - ((m - 1) / 4) * plotH

  const polyline = pointsWithMood.map(p => `${toX(p.i)},${toY(p.mood)}`).join(' ')
  const avgLine = avg2 !== null ? toY(avg2) : null

  useEffect(() => {
    if (logs.length < 3) return
    setInsightLoading(true)
    const recent = logs.slice(0, 14).map(l => `${l.date}: ${moodLabels[l.mood]}`).join('\n')
    groq([{ role: 'user', content: `Here are my recent mood logs:\n${recent}\n\nWrite ONE warm, personal sentence (under 30 words) noticing a pattern or offering a gentle insight. Don't be generic.` }],
      `You are Soma, a caring AI companion. You notice emotional patterns with warmth and honesty.${langDirective()}`, 60
    ).then(r => { if (r) setInsight(r) }).finally(() => setInsightLoading(false))
  }, [])

  return (
    <ScrollView style={[g.screen, { backgroundColor: t.bg }]} contentContainerStyle={[g.homePad, { paddingBottom: 60 }]}>
      <View style={g.homeHeader}>
        <TouchableOpacity onPress={onBack}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
      </View>
      <Text style={g.logo}>Mood Trends</Text>
      <Text style={g.logoSub}>{logs.length} check-ins recorded</Text>
      <View style={{ height: 16 }} />

      {/* Range toggle */}
      <View style={{ flexDirection: 'row', backgroundColor: t.card, borderRadius: 12, padding: 4, marginBottom: 16, alignSelf: 'center' }}>
        {([7, 14, 30] as const).map(r => (
          <TouchableOpacity key={r} onPress={() => setRange(r)}
            style={{ paddingHorizontal: 18, paddingVertical: 7, borderRadius: 9, backgroundColor: range === r ? t.accent : 'transparent' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: range === r ? '#fff' : t.textSub }}>{r}d</Text>
          </TouchableOpacity>
        ))}
      </View>

      {logs.length === 0 ? (
        <View style={[g.centerWrap, { paddingTop: 40 }]}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>💭</Text>
          <Text style={[g.startSub, { textAlign: 'center' }]}>No mood logs yet.{'\n'}Log your first mood on the home screen.</Text>
        </View>
      ) : (
        <>
          {/* SVG line chart */}
          <View style={{ backgroundColor: t.card, borderRadius: 20, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 12 }}>LAST {range} DAYS</Text>
            {pointsWithMood.length >= 2 ? (
              <View style={{ alignItems: 'center' }}>
                <Svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
                  {/* Grid lines at 1,2,3,4,5 */}
                  {[1, 2, 3, 4, 5].map(v => (
                    <SvgLine key={v} x1={padL} y1={toY(v)} x2={svgW - padR} y2={toY(v)}
                      stroke={t.border} strokeWidth={1} strokeDasharray={v === 3 ? '0' : '3,3'} opacity={0.5} />
                  ))}
                  {/* Average line */}
                  {avgLine !== null && (
                    <SvgLine x1={padL} y1={avgLine} x2={svgW - padR} y2={avgLine}
                      stroke="#7B6EF6" strokeWidth={1.5} strokeDasharray="6,4" opacity={0.6} />
                  )}
                  {/* Mood polyline */}
                  <SvgPolyline
                    points={polyline}
                    fill="none"
                    stroke="#7B6EF6"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {/* Dots */}
                  {pointsWithMood.map(p => (
                    <SvgCircle key={p.i} cx={toX(p.i)} cy={toY(p.mood)} r={4}
                      fill={lineColor(p.mood)} stroke={t.card} strokeWidth={2} />
                  ))}
                </Svg>
                {/* X-axis labels — only show a subset to avoid crowding */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: svgW, marginTop: 4 }}>
                  {days.filter((_, i) => i === 0 || i === Math.floor(days.length / 2) || i === days.length - 1).map(d => (
                    <Text key={d.key} style={{ fontSize: 10, color: t.textTertiary }}>{d.label}</Text>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ color: t.textTertiary, fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>Log a few more moods to see a trend line.</Text>
            )}
            {/* Emoji scale */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 8 }}>
              {['😔 Rough', '😕 Meh', '😐 Okay', '🙂 Good', '😊 Great'].map(e => (
                <Text key={e} style={{ fontSize: 9, color: t.textTertiary }}>{e}</Text>
              ))}
            </View>
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            {[
              { label: `This ${half === 7 ? 'week' : `${half}d`}`, value: avg2 !== null ? moodLabels[Math.round(avg2)] : '—', emoji: avg2 !== null ? moodEmojis[Math.round(avg2)] : '💭' },
              { label: `Last ${half === 7 ? 'week' : `${half}d`}`, value: avg1 !== null ? moodLabels[Math.round(avg1)] : '—', emoji: avg1 !== null ? moodEmojis[Math.round(avg1)] : '💭' },
              { label: 'Trend', value: trend === 'up' ? 'Improving' : trend === 'down' ? 'Dipping' : trend === 'stable' ? 'Steady' : '—', emoji: trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️' },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: t.card, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border }}>
                <Text style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: t.text }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: t.textTertiary, marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* 30-day heatmap */}
          {(() => {
            const heatDays = Array.from({ length: 35 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - (34 - i))
              const key = d.toISOString().slice(0, 10)
              const log = logs.find(l => l.date === key)
              return { key, mood: log?.mood ?? null, isToday: key === new Date().toISOString().slice(0, 10) }
            })
            const moodHeatColor = (m: number | null) => {
              if (m === null) return 'transparent'
              if (m === 1) return '#EF4444'
              if (m === 2) return '#F59E0B'
              if (m === 3) return '#7B6EF6'
              if (m === 4) return '#22C55E'
              return '#10B981'
            }
            const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
            return (
              <View style={{ backgroundColor: t.card, borderRadius: 20, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 10 }}>30-DAY HEATMAP</Text>
                <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6 }}>
                  {WEEKDAYS.map((d, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, color: t.textTertiary, fontWeight: '600' }}>{d}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
                  {heatDays.map(d => (
                    <View key={d.key} style={{ width: `${(100 / 7) - 0.5}%` as any, aspectRatio: 1, borderRadius: 4, backgroundColor: d.mood ? moodHeatColor(d.mood) : (d.isToday ? t.border : 'transparent'), borderWidth: d.mood ? 0 : 1, borderColor: t.border, opacity: d.isToday && !d.mood ? 0.6 : 1 }} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                  {[['#EF4444','Rough'],['#F59E0B','Meh'],['#7B6EF6','Okay'],['#22C55E','Good'],['#10B981','Great']].map(([c,l]) => (
                    <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c }} />
                      <Text style={{ fontSize: 10, color: t.textTertiary }}>{l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          })()}

          {/* Day-of-week pattern */}
          {logs.length >= 5 && (() => {
            const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
            const byDay: number[][] = Array.from({ length: 7 }, () => [])
            logs.forEach(l => { const d = new Date(l.date + 'T12:00:00'); byDay[d.getDay()].push(l.mood) })
            const avgs = byDay.map(arr => arr.length ? arr.reduce((s,v) => s+v,0) / arr.length : null)
            const max = Math.max(...avgs.filter(Boolean) as number[])
            const bestDay = avgs.indexOf(max)
            return (
              <View style={{ backgroundColor: t.card, borderRadius: 20, padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8 }}>DAY OF WEEK</Text>
                  {bestDay >= 0 && avgs[bestDay] && <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>Best: {DOW[bestDay]} {moodEmojis[Math.round(avgs[bestDay]!)]}</Text>}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 64 }}>
                  {DOW.map((day, i) => {
                    const avg = avgs[i]
                    const barH = avg ? Math.max(10, (avg / 5) * 56) : 6
                    const barColor = avg ? (avg >= 4 ? '#10B981' : avg >= 3 ? '#7B6EF6' : '#F59E0B') : t.border
                    return (
                      <View key={day} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <View style={{ width: '100%', height: barH, borderRadius: 5, backgroundColor: barColor, opacity: avg ? 1 : 0.25 }} />
                        <Text style={{ fontSize: 10, color: t.textTertiary, marginTop: 4, fontWeight: i === bestDay ? '800' : '500', color: i === bestDay ? '#10B981' : t.textTertiary } as any}>{day.slice(0,1)}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            )
          })()}

          {/* Mood × Gratitude correlation */}
          {logs.length >= 3 && (profile.gratitudeEntries || []).length >= 2 && (() => {
            const gratDates = new Set((profile.gratitudeEntries || []).map(e => e.date?.slice(0,10)))
            const withGrat = logs.filter(l => gratDates.has(l.date))
            const withoutGrat = logs.filter(l => !gratDates.has(l.date))
            if (!withGrat.length || !withoutGrat.length) return null
            const avgWith = withGrat.reduce((s,l) => s+l.mood,0) / withGrat.length
            const avgWithout = withoutGrat.reduce((s,l) => s+l.mood,0) / withoutGrat.length
            const diff = avgWith - avgWithout
            return (
              <View style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 18, padding: 16, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981', letterSpacing: 0.8, marginBottom: 6 }}>🙏  GRATITUDE EFFECT</Text>
                <Text style={{ fontSize: 14, color: t.text, lineHeight: 20 }}>
                  On days you log gratitude, your mood averages{' '}
                  <Text style={{ fontWeight: '800', color: diff > 0 ? '#10B981' : '#F59E0B' }}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} points
                  </Text>
                  {diff > 0.2 ? ' higher' : diff < -0.2 ? ' lower' : ' about the same'}.
                </Text>
                {diff > 0.3 && <Text style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>Gratitude practice seems to lift your mood. Keep it up.</Text>}
              </View>
            )
          })()}

          {/* Soma insight */}
          <View style={{ backgroundColor: t.card2, borderRadius: 20, padding: 18, marginBottom: 16, flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: t.accent, letterSpacing: 0.8, marginBottom: 6 }}>SOMA NOTICES</Text>
              {insightLoading ? (
                <ActivityIndicator size="small" color={t.accent} />
              ) : (
                <Text style={{ fontSize: 14, color: t.text, lineHeight: 21 }}>{insight || 'Keep logging your mood — Soma will share patterns after a few more check-ins.'}</Text>
              )}
            </View>
          </View>

          {/* Recent log list */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: t.textTertiary, letterSpacing: 0.8, marginBottom: 12 }}>RECENT</Text>
          {logs.slice(0, 10).map(l => (
            <View key={l.date} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.card, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 }}>
              <Text style={{ fontSize: 22 }}>{moodEmojis[l.mood]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: t.text }}>{moodLabels[l.mood]}</Text>
                {l.note && <Text style={{ fontSize: 12, color: t.textTertiary, marginTop: 2 }}>{l.note}</Text>}
              </View>
              <Text style={{ fontSize: 12, color: t.textTertiary }}>{l.date}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

// ════════════════════════════════════════════════════════════
//  BREATHING EXERCISE — 4-7-8 animated calm breathing
// ════════════════════════════════════════════════════════════
function BreathingExercise({ onBack }: { onBack: () => void }) {
  const { t } = useT()
  const [phase, setPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle')
  const [count, setCount] = useState(0)
  const [cycles, setCycles] = useState(0)
  const [done, setDone] = useState(false)
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(0.6)).current
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef = useRef<'idle' | 'inhale' | 'hold' | 'exhale'>('idle')
  const countRef = useRef(0)
  const cyclesRef = useRef(0)
  const TOTAL_CYCLES = 4

  const PHASES: { name: 'inhale' | 'hold' | 'exhale'; duration: number; label: string; instruction: string }[] = [
    { name: 'inhale', duration: 4, label: 'Inhale', instruction: 'Breathe in slowly through your nose' },
    { name: 'hold', duration: 7, label: 'Hold', instruction: 'Hold your breath gently' },
    { name: 'exhale', duration: 8, label: 'Exhale', instruction: 'Breathe out fully through your mouth' },
  ]

  const animatePhase = (p: 'inhale' | 'hold' | 'exhale') => {
    if (p === 'inhale') {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.5, duration: 4000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 4000, useNativeDriver: true }),
      ]).start()
    } else if (p === 'hold') {
      // no animation change during hold
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 8000, useNativeDriver: true }),
      ]).start()
    }
  }

  const start = () => {
    phaseRef.current = 'inhale'; countRef.current = 0; cyclesRef.current = 0
    setPhase('inhale'); setCount(0); setCycles(0); setDone(false)
    animatePhase('inhale')
    timerRef.current = setInterval(() => {
      countRef.current += 1
      setCount(countRef.current)
      const cur = phaseRef.current as 'inhale' | 'hold' | 'exhale'
      const curPhase = PHASES.find(p => p.name === cur)!
      if (countRef.current >= curPhase.duration) {
        countRef.current = 0
        setCount(0)
        const idx = PHASES.findIndex(p => p.name === cur)
        if (idx === PHASES.length - 1) {
          // completed one cycle
          cyclesRef.current += 1
          setCycles(cyclesRef.current)
          if (cyclesRef.current >= TOTAL_CYCLES) {
            clearInterval(timerRef.current!)
            setPhase('idle'); setDone(true); return
          }
          phaseRef.current = 'inhale'; setPhase('inhale'); animatePhase('inhale')
        } else {
          const next = PHASES[idx + 1].name
          phaseRef.current = next; setPhase(next); animatePhase(next)
        }
      }
    }, 1000)
  }

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    phaseRef.current = 'idle'; setPhase('idle'); setCount(0)
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.6, duration: 400, useNativeDriver: true }),
    ]).start()
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const curPhaseObj = PHASES.find(p => p.name === phase)
  const remaining = curPhaseObj ? curPhaseObj.duration - count : 0

  return (
    <View style={[g.screen, { alignItems: 'center', backgroundColor: t.bg }]}>
      <View style={[g.homeHeader, { paddingHorizontal: 24, width: '100%' }]}>
        <TouchableOpacity onPress={() => { stop(); onBack() }}><Text style={g.backLink}>← Back</Text></TouchableOpacity>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: t.text, marginBottom: 6, textAlign: 'center' }}>
          {done ? 'Well done 🌿' : '4-7-8 Breathing'}
        </Text>
        <Text style={{ fontSize: 14, color: t.textSub, textAlign: 'center', marginBottom: 40, lineHeight: 21 }}>
          {done
            ? 'You completed 4 cycles. Take a moment to notice how you feel.'
            : phase === 'idle'
            ? 'Reduces anxiety and helps you fall asleep.\nInhale 4 · Hold 7 · Exhale 8'
            : curPhaseObj?.instruction}
        </Text>

        {/* Animated breathing circle */}
        <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
          <Animated.View style={{
            width: 160, height: 160, borderRadius: 80,
            backgroundColor: phase === 'inhale' ? '#7B6EF6' : phase === 'hold' ? '#3B82F6' : '#4CAF7D',
            transform: [{ scale }], opacity,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>
              {phase === 'idle' ? '🫁' : remaining > 0 ? remaining : ''}
            </Text>
          </Animated.View>
          {phase !== 'idle' && (
            <View style={{ position: 'absolute', bottom: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: phase === 'inhale' ? '#7B6EF6' : phase === 'hold' ? '#3B82F6' : '#4CAF7D', letterSpacing: 1 }}>
                {curPhaseObj?.label?.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Cycle dots */}
        {phase !== 'idle' && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
            {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
              <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i < cycles ? '#4CAF7D' : i === cycles ? '#7B6EF6' : '#EDE9F6' }} />
            ))}
          </View>
        )}

        {done ? (
          <TouchableOpacity onPress={() => { setDone(false); scale.setValue(1); opacity.setValue(0.6) }}
            style={{ backgroundColor: '#7B6EF6', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Go again</Text>
          </TouchableOpacity>
        ) : phase === 'idle' ? (
          <TouchableOpacity onPress={start}
            style={{ backgroundColor: '#7B6EF6', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Begin</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={stop}
            style={{ backgroundColor: t.border, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: t.textSub }}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
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
  msgList: { padding: 12, paddingBottom: 12, gap: 14 },
  bRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, width: '100%', paddingHorizontal: 4 },
  bLeft: { justifyContent: 'flex-start' },
  bRight: { justifyContent: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, maxWidth: '90%', width: '90%' },
  aBubble: { backgroundColor: '#141418', borderWidth: 1.5, borderColor: '#7B6EF650', borderTopLeftRadius: 4, ...shadowSm },
  uBubble: { backgroundColor: '#2A2060', borderWidth: 1.5, borderColor: '#7B6EF650', borderTopRightRadius: 4, ...shadowSm },
  bTxt: { color: '#F5F4F0', fontSize: 15, lineHeight: 26, flexWrap: 'wrap', fontWeight: '400', flex: 1 },
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
  homePad: { padding: 24, paddingTop: 58, paddingBottom: 100 },
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
  cardTag: { color: '#7B6EF6', fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  arrow: { color: '#7B6EF6', fontSize: 20, fontWeight: '700' },
  diaryCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E9E6F2', ...shadowSm },
  diaryTitle: { color: '#222540', fontSize: 15, fontWeight: '700' },
  diarySub: { color: '#6E7191', fontSize: 12, marginTop: 2 },
  secLabel: { color: '#9A9DB2', fontSize: 11, fontWeight: '600', letterSpacing: 0 },
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
  lbSectionLabel: { fontSize: 11, fontWeight: '500', color: '#9A9DB2', letterSpacing: 0, marginBottom: 8 },
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
  dTogActive: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  dTogActiveTxt: { color: '#1A1A2E', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  dTogTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' },
  alignPill: { width: 48, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,20,24,0.85)', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  alignPillTxt: { fontSize: 13, fontWeight: '800' },
  dPhoto: { height: 560, width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  dPhotoFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 260, backgroundColor: 'rgba(0,0,0,0.55)' },
  dPhotoOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingBottom: 22 },
  dPremium: { color: '#F6D66E', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  dName: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  dAge: { color: 'rgba(255,255,255,0.75)', fontSize: 26, fontWeight: '300' },
  dHeart: { color: '#fff', fontSize: 28, marginBottom: 8 },
  dLoc: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 0 },
  dPills: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 16, flexWrap: 'wrap' as const },
  dPill: { backgroundColor: '#F4F2FC', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: '#E9E6F2', flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 },
  dPillTxt: { color: '#3D3A56', fontSize: 13, fontWeight: '600' },
  dSection: { paddingHorizontal: 20, marginTop: 20 },
  dH: { color: '#1A1A2E', fontSize: 17, fontWeight: '700', marginBottom: 12, letterSpacing: 0.1 },
  dAbout: { color: '#6E7191', fontSize: 15, lineHeight: 24 },
  dWhy: { backgroundColor: '#F5F3FD', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7B6EF630' },
  dWhyLbl: { color: '#7B6EF6', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  dWhyTxt: { color: '#3D3A56', fontSize: 14, lineHeight: 21 },
  dTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dTag: { backgroundColor: '#F4F2FC', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: '#E9E6F2', flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 },
  dTagTxt: { color: '#3D3A56', fontSize: 13, fontWeight: '600' },
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
  styleCard: { flex: 1, backgroundColor: '#F5F3FD', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#7B6EF625' },
  styleLbl: { color: '#7B6EF6', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  styleVal: { color: '#1A1A2E', fontSize: 14, fontWeight: '700', marginTop: 2 },
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
  paywall: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0F0A2E', zIndex: 50 },
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
  healthSection: { backgroundColor: '#FFFBF0', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F5E6C8' },
  healthSectionTitle: { color: '#222540', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  healthSectionSub: { color: '#8E7B5A', fontSize: 12, marginBottom: 14 },
  healthNudgeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  healthBarBg: { height: 5, borderRadius: 3, backgroundColor: '#EDE9F6', overflow: 'hidden', marginTop: 5 },
  healthBarFill: { height: 5, borderRadius: 3 },
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
