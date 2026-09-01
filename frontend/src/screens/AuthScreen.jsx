import { useState } from 'react'
import { signup, login, setAuthToken } from '../lib/api'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('options') // Start with auth options
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let response
      if (mode === 'login') {
        response = await login(email, password)
      } else {
        response = await signup(email, name, password)
      }

      if (response.accessToken) {
        setAuthToken(response.accessToken)
        onAuth(response.user || { authenticated: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'options') {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 bg-gradient-to-b from-purple-50 to-white">
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-3xl font-bold mb-2">SOMA</h1>
        <p className="text-gray-500 text-center mb-12">AI Agent Dating</p>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => setMode('signup')}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold"
          >
            📝 Sign Up
          </button>
          <button
            onClick={() => setMode('login')}
            className="w-full border-2 border-purple-600 text-purple-600 py-3 rounded-lg font-semibold"
          >
            🔗 Log In
          </button>
          <button
            onClick={() => onAuth({ authenticated: true, guest: true })}
            className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold"
          >
            💬 Try Free (No Login)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4 bg-gradient-to-b from-purple-50 to-white">
      <button
        onClick={() => setMode('options')}
        className="absolute top-6 left-6 text-2xl"
      >
        ← Back
      </button>

      <div className="text-6xl mb-4">🤖</div>
      <h1 className="text-3xl font-bold mb-2">SOMA</h1>
      <p className="text-gray-500 text-center mb-8">AI Agent Dating</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          required
        />

        {error && <div className="text-red-500 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>
      </form>
    </div>
  )
}
