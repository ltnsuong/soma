import { useState, useEffect } from 'react'
import { initTelegram, getTelegramUser } from './lib/telegram'
import { telegramLogin, getAuthToken, setAuthToken } from './lib/api'
import CircleScreen from './screens/CircleScreen'
import ConnectionsScreen from './screens/ConnectionsScreen'
import ExploreScreen from './screens/ExploreScreen'
import WelcomeScreen from './screens/WelcomeScreen'
import LanguageScreen from './screens/LanguageScreen'
import IntroductionScreen from './screens/IntroductionScreen'

const BottomNav = ({ current, setCurrent }) => {
  const tabs = [
    { id: 'circle', icon: '👥', label: 'Circle' },
    { id: 'inner', icon: '✨', label: 'Inner' },
    { id: 'explore', icon: '🔍', label: 'Explore' },
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
  const [language, setLanguage] = useState(null)
  const [showIntro, setShowIntro] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initApp = async () => {
      initTelegram()

      // Restore language preference
      const savedLang = localStorage.getItem('language')
      if (savedLang) {
        setLanguage(savedLang)
      }

      // Check if intro has been shown
      const introShown = localStorage.getItem('introShown')
      setShowIntro(!introShown)

      // Check if already authenticated
      const token = getAuthToken()
      if (token) {
        setUser({ authenticated: true })
        setScreen('circle')
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
            setScreen('circle')
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

  if (!language) {
    return <LanguageScreen onSelectLanguage={(lang) => setLanguage(lang)} />
  }

  if (showIntro) {
    return (
      <IntroductionScreen
        onContinue={() => {
          localStorage.setItem('introShown', 'true')
          setShowIntro(false)
        }}
      />
    )
  }

  if (!user?.authenticated) {
    return <WelcomeScreen onAuth={(u) => { setUser(u); setScreen('circle') }} />
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-24 safe-area-bottom">
        {screen === 'circle' && <CircleScreen />}
        {screen === 'inner' && <ConnectionsScreen />}
        {screen === 'explore' && <ExploreScreen />}
      </div>
      <BottomNav current={screen} setCurrent={setScreen} />
    </div>
  )
}

export default App
