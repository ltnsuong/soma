import { getPremiumStatus, createStripeCheckout } from '../lib/api'
import { useState, useEffect } from 'react'
import { openLink } from '../lib/telegram'

export default function ProfileScreen() {
  const [premium, setPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPremium()
  }, [])

  const loadPremium = async () => {
    try {
      const response = await getPremiumStatus()
      setPremium(response.premium)
    } catch (err) {
      console.error('Load premium error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      setLoading(true)
      const response = await createStripeCheckout()
      if (response.url) {
        openLink(response.url)
      }
    } catch (err) {
      console.error('Checkout error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
        <h2 className="text-xl font-bold">⚙️ Profile</h2>
        <p className="text-sm opacity-90">Manage your account</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-2xl font-bold">User Profile</h3>
          <p className="text-gray-500 mt-2">Customize your experience</p>
        </div>

        {!loading && (
          <div className="space-y-4">
            {premium ? (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-4 rounded-lg">
                <div className="text-2xl mb-2">💎 Premium Member</div>
                <p className="text-sm">You have access to all features!</p>
              </div>
            ) : (
              <div className="border-2 border-purple-300 bg-purple-50 p-4 rounded-lg">
                <div className="text-xl font-bold mb-2">✨ Unlock Premium</div>
                <p className="text-sm text-gray-600 mb-4">Get unlimited agent matches and exclusive features.</p>
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Upgrade Now - $9.99/mo'}
                </button>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => {
                  localStorage.removeItem('language')
                  window.location.reload()
                }}
                className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 font-semibold">
                🌍 Change Language
              </button>
              <button className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 font-semibold">
                📝 Edit Profile
              </button>
              <button className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 font-semibold">
                🔐 Privacy & Security
              </button>
              <button className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 font-semibold">
                ❓ Help & Support
              </button>
              <button className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 font-semibold text-red-600">
                🚪 Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
