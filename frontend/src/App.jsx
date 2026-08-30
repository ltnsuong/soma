import { useState, useEffect } from 'react'
import { initTelegram, getTelegramUser } from './lib/telegram'
import { telegramLogin, getAuthToken, setAuthToken } from './lib/api'
import ChatScreen from './screens/ChatScreen'
import DiscoverScreen from './screens/DiscoverScreen'
import AgentScreen from './screens/AgentScreen'
import ProfileScreen from './screens/ProfileScreen'
import AuthScreen from './screens/AuthScreen'

const BottomNav = ({ current, setCurrent }) => {
  const tabs = [
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'discover', icon: '🎲', label: 'Discover' },
    { id: 'agent', icon: '🤖', label: 'Agent' },
    { id: 'profile', icon: '⚙️', label: 'Profile' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white flex justify-around">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setCurrent(tab.id)}
          className={`flex-1 py-3 text-center ${
            current === tab.id ? 'text-primary border-t-2 border-primary' : 'text-gray-500'
          }`}
        >
          <div className="text-xl">{tab.icon}</div>
          <div className="text-xs mt-1">{tab.label}</div>
        </button>
      ))}
    </div>
  )
}

function App() {
  const [screen, setScreen] = useState('auth')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initApp = async () => {
      initTelegram()

      // Check if already authenticated
      const token = getAuthToken()
      if (token) {
        setUser({ authenticated: true })
        setScreen('chat')
        setLoading(false)
        return
      }

      // Try Telegram auto-login
      const tgUser = getTelegramUser()
      if (tgUser?.id) {
        try {
          const response = await telegramLogin(tgUser)
          if (response.accessToken) {
            setAuthToken(response.accessToken)
            setUser({ ...response.user, authenticated: true })
            setScreen('chat')
          }
        } catch (err) {
          console.error('Telegram login failed:', err)
        }
      }

      setLoading(false)
    }

    initApp()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🤖</div>
          <div className="text-gray-500">Loading SOMA...</div>
        </div>
      </div>
    )
  }

  if (!user?.authenticated) {
    return <AuthScreen onAuth={(u) => { setUser(u); setScreen('chat') }} />
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex-1 overflow-y-auto pb-20">
        {screen === 'chat' && <ChatScreen />}
        {screen === 'discover' && <DiscoverScreen />}
        {screen === 'agent' && <AgentScreen />}
        {screen === 'profile' && <ProfileScreen />}
      </div>
      <BottomNav current={screen} setCurrent={setScreen} />
    </div>
  )
}

export default App
