import { useState, useEffect } from 'react'
import { discoverAgents, matchWithAgent } from '../lib/api'
import { haptic } from '../lib/telegram'

export default function DiscoverScreen() {
  const [agents, setAgents] = useState([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      const response = await discoverAgents()
      setAgents(response.agents || [])
    } catch (err) {
      console.error('Load agents error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMatch = async (agentId) => {
    try {
      haptic('medium')
      await matchWithAgent(agentId)
      haptic('success')
      setCurrent(current + 1)
    } catch (err) {
      console.error('Match error:', err)
      haptic('light')
    }
  }

  const handlePass = () => {
    haptic('light')
    setCurrent(current + 1)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-4xl mb-4">🎲</div>
        <div className="text-gray-500">No more agents to discover</div>
      </div>
    )
  }

  if (current >= agents.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-4xl mb-4">✨</div>
        <div className="text-gray-500">Come back later for more!</div>
      </div>
    )
  }

  const agent = agents[current]
  const user = agent.users

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-50 to-white">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
        <h2 className="text-xl font-bold">🎲 Discover Agents</h2>
        <p className="text-sm opacity-90">{current + 1} / {agents.length}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {agent.users?.photo_url && (
          <img
            src={agent.users.photo_url}
            alt={user?.name}
            className="w-64 h-64 rounded-2xl object-cover mb-6 shadow-lg"
          />
        )}

        <h3 className="text-2xl font-bold mb-2">{user?.name}</h3>
        <p className="text-gray-600 text-center mb-4">{agent.summary}</p>

        <div className="flex gap-2 flex-wrap justify-center mb-6">
          {agent.personality_traits?.slice(0, 3).map((trait, i) => (
            <span key={i} className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm">
              {trait}
            </span>
          ))}
        </div>

        <div className="w-full max-w-sm">
          <div className="text-center mb-4">
            <div className="text-3xl">💫 {Math.round(agent.compatibility || 0)}% Compatible</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePass}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-600"
            >
              ⭕ Pass
            </button>
            <button
              onClick={() => handleMatch(agent.id)}
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold"
            >
              ❤️ Like
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
