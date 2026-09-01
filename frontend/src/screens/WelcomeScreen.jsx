import { useState } from 'react'
import { getTelegramUser } from '../lib/telegram'
import { telegramLogin } from '../lib/api'
import AuthScreen from './AuthScreen'

export default function WelcomeScreen({ onAuth }) {
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleTelegramSignup = async () => {
    setLoading(true)
    try {
      const tgUser = getTelegramUser()
      if (!tgUser?.id) {
        alert('Telegram user not found. Make sure you opened this from Telegram.')
        return
      }
      const response = await telegramLogin(tgUser)
      if (response.accessToken) {
        onAuth({ ...response.user, authenticated: true })
      }
    } catch (err) {
      console.error('Telegram login failed:', err)
      alert('Failed to login with Telegram')
    } finally {
      setLoading(false)
    }
  }

  if (showAuth) {
    return <AuthScreen onAuth={onAuth} showBack={() => setShowAuth(false)} />
  }

  return (
    <div className="flex flex-col items-center justify-between h-screen px-6 py-8 bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900">
      {/* Header */}
      <div className="text-center pt-12">
        <div className="text-7xl mb-6 animate-bounce">🧠</div>
        <h1 className="text-5xl font-black text-white mb-3">SOMA</h1>
        <p className="text-purple-200 text-lg">Mental Health Support</p>
      </div>

      {/* Features */}
      <div className="w-full max-w-sm space-y-6 my-8">
        {/* Feature 1 */}
        <div className="flex items-start gap-4 bg-white/10 p-4 rounded-lg backdrop-blur-sm">
          <div className="text-3xl mt-1">💬</div>
          <div>
            <h3 className="text-white font-bold">Chat with Soma</h3>
            <p className="text-purple-200 text-sm">Express yourself safely with AI support</p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex items-start gap-4 bg-white/10 p-4 rounded-lg backdrop-blur-sm">
          <div className="text-3xl mt-1">📊</div>
          <div>
            <h3 className="text-white font-bold">Track Your Mood</h3>
            <p className="text-purple-200 text-sm">Monitor patterns and progress daily</p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="flex items-start gap-4 bg-white/10 p-4 rounded-lg backdrop-blur-sm">
          <div className="text-3xl mt-1">👨‍⚕️</div>
          <div>
            <h3 className="text-white font-bold">Connect with Doctor</h3>
            <p className="text-purple-200 text-sm">Share your data securely with healthcare</p>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="w-full max-w-sm space-y-3 pb-12">
        <button
          onClick={handleTelegramSignup}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-lg transition-all"
        >
          {loading ? 'Signing up...' : '📱 Sign up with Telegram'}
        </button>
        <button
          onClick={() => onAuth({ authenticated: true, guest: true })}
          className="w-full bg-gradient-to-r from-purple-400 to-pink-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          🚀 Try Without Account
        </button>
        <button
          onClick={() => setShowAuth(true)}
          className="w-full border-2 border-purple-300 text-purple-200 py-3 rounded-xl font-semibold hover:bg-white/5 transition-all"
        >
          📧 Sign In with Email
        </button>
      </div>

      {/* Footer text */}
      <p className="text-purple-300 text-xs text-center pb-4">
        🔒 Your data is private and secure • Free forever
      </p>
    </div>
  )
}
