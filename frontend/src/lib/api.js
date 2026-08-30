const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://mysoma.site'

let authToken = localStorage.getItem('accessToken')

export const setAuthToken = (token) => {
  authToken = token
  localStorage.setItem('accessToken', token)
}

export const getAuthToken = () => authToken

const request = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (authToken && !endpoint.includes('/auth/')) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Auth
export const signup = (email, name, password) =>
  request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, name, password }) })

export const telegramLogin = (telegramUser) =>
  request('/auth/social', {
    method: 'POST',
    body: JSON.stringify({ provider: 'telegram', token: telegramUser.id.toString() }),
  })

export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })

// Agent
export const learnFromChat = (userMessage, aiResponse) =>
  request('/agent/learn', { method: 'POST', body: JSON.stringify({ userMessage, aiResponse }) })

export const buildAgentProfile = () =>
  request('/agent/build-profile', { method: 'POST' })

export const getAgentProfile = () =>
  request('/agent/profile', { method: 'GET' })

export const discoverAgents = () =>
  request('/agent/discover', { method: 'GET' })

export const matchWithAgent = (targetAgentId) =>
  request('/agent/match', { method: 'POST', body: JSON.stringify({ targetAgentId }) })

export const getAgentMatches = () =>
  request('/agent/matches', { method: 'GET' })

export const getAgentChat = (matchId) =>
  request(`/agent/chat/${matchId}`, { method: 'GET' })

export const continueAgentChat = (matchId, lastMessage) =>
  request(`/agent/chat/${matchId}/continue`, { method: 'POST', body: JSON.stringify({ lastMessage }) })

// AI Chat
export const chatWithAI = (messages, system) =>
  request('/ai/chat', { method: 'POST', body: JSON.stringify({ messages, system, maxTokens: 300 }) })

// Premium
export const createStripeCheckout = () =>
  request('/stripe/checkout', { method: 'POST' })

export const getPremiumStatus = () =>
  request('/premium/status', { method: 'GET' })
