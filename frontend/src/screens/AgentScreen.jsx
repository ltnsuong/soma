import { useState, useEffect } from 'react'
import { getAgentProfile, getAgentMatches, getAgentChat, continueAgentChat } from '../lib/api'

export default function AgentScreen() {
  const [profile, setProfile] = useState(null)
  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [chat, setChat] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAgent()
  }, [])

  useEffect(() => {
    if (selectedMatch) {
      loadAgentChat(selectedMatch.id)
    }
  }, [selectedMatch])

  const loadAgent = async () => {
    try {
      const [profileRes, matchesRes] = await Promise.all([
        getAgentProfile(),
        getAgentMatches(),
      ])
      setProfile(profileRes.profile)
      setMatches(matchesRes.matches || [])
    } catch (err) {
      console.error('Load agent error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAgentChat = async (matchId) => {
    try {
      const response = await getAgentChat(matchId)
      setChat(response.messages || [])
    } catch (err) {
      console.error('Load chat error:', err)
    }
  }

  const handleContinueChat = async (message) => {
    try {
      const response = await continueAgentChat(selectedMatch.id, message)
      setChat(prev => [...prev, { content: response.message }])
    } catch (err) {
      console.error('Continue chat error:', err)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>
  }

  if (selectedMatch) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <button
            onClick={() => setSelectedMatch(null)}
            className="mb-2 text-sm opacity-90"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold">Agent Chemistry ✨</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chat.map((msg, i) => (
            <div key={i} className="bg-blue-100 p-3 rounded-lg text-sm">
              {msg.content}
            </div>
          ))}
        </div>

        <div className="border-t p-4">
          <button
            onClick={() => handleContinueChat("Tell me more!")}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold"
          >
            Continue Conversation
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <h2 className="text-xl font-bold">🤖 Your Agent</h2>
        <p className="text-sm opacity-90">Your AI companion's profile</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {profile ? (
          <>
            <div>
              <h3 className="text-2xl font-bold mb-2">{profile.agent_name || 'Soma'}</h3>
              <p className="text-gray-600">{profile.summary}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${profile.learning_score}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold">{Math.round(profile.learning_score)}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Learning progress</p>
            </div>

            {profile.personality_traits && (
              <div>
                <h4 className="font-semibold mb-2">Personality</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.personality_traits.map((trait, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.values && (
              <div>
                <h4 className="font-semibold mb-2">Core Values</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.values.map((value, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🌱</div>
            <p className="text-gray-500">Chat with Soma to build your agent profile!</p>
          </div>
        )}

        {matches && matches.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Agent Connections ({matches.length})</h4>
            <div className="space-y-2">
              {matches.map(match => (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className="w-full p-3 border rounded-lg text-left hover:bg-gray-50"
                >
                  <div className="font-semibold">Agent #{Math.random().toString().slice(2, 5)}</div>
                  <div className="text-sm text-gray-500">Compatibility: {Math.round(match.compatibility_score)}%</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
