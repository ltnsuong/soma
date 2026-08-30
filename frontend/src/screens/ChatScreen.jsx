import { useState, useRef, useEffect } from 'react'
import { chatWithAI, learnFromChat, buildAgentProfile } from '../lib/api'

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Soma, your AI companion. Tell me about yourself - what's on your mind today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      // Get AI response
      const response = await chatWithAI(
        [...messages, { role: 'user', content: userMessage }],
        'You are Soma, an empathetic AI companion. Help the user explore their feelings and growth.'
      )

      const aiMessage = response.content

      // Add AI response to UI
      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }])

      // Learn from this conversation (extract memories)
      await learnFromChat(userMessage, aiMessage)

      // Build/update agent profile periodically
      if (messages.length % 10 === 0) {
        await buildAgentProfile()
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error: Could not process message' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
        <h2 className="text-xl font-bold">💬 Chat with Soma</h2>
        <p className="text-sm opacity-90">Share your thoughts & grow together</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Share your thoughts..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
