import { useState, useEffect } from 'react'

export default function MoodTrackerScreen() {
  const [mood, setMood] = useState(null)
  const [moods, setMoods] = useState([])
  const [submitted, setSubmitted] = useState(false)

  const moodOptions = [
    { value: 1, emoji: '😢', label: 'Very Bad' },
    { value: 2, emoji: '😞', label: 'Bad' },
    { value: 3, emoji: '😕', label: 'Okay' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '😄', label: 'Great' },
  ]

  useEffect(() => {
    const savedMoods = localStorage.getItem('moods')
    if (savedMoods) {
      setMoods(JSON.parse(savedMoods))
    }
  }, [])

  const handleSubmit = () => {
    if (mood === null) return

    const today = new Date().toISOString().split('T')[0]
    const newEntry = { date: today, mood, timestamp: new Date() }
    const updated = [...moods, newEntry]
    setMoods(updated)
    localStorage.setItem('moods', JSON.stringify(updated))
    setSubmitted(true)
    setTimeout(() => {
      setMood(null)
      setSubmitted(false)
    }, 2000)
  }

  const getWeeklyTrend = () => {
    const last7Days = moods.slice(-7)
    if (last7Days.length === 0) return 'No data yet'
    const avg = (last7Days.reduce((sum, m) => sum + m.mood, 0) / last7Days.length).toFixed(1)
    return `Average: ${avg}/5`
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-purple-50 to-white px-6 py-6 safe-area">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">How are you feeling?</h1>
        <p className="text-gray-600">Track your mood daily</p>
      </div>

      {/* Mood Selector */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {moodOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setMood(option.value)}
            className={`flex flex-col items-center p-3 rounded-lg transition-all transform ${
              mood === option.value
                ? 'bg-purple-600 text-white scale-110 shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200'
            }`}
          >
            <div className="text-4xl mb-1">{option.emoji}</div>
            <div className="text-xs font-semibold">{option.label}</div>
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={mood === null || submitted}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-lg mb-8 transition-all"
      >
        {submitted ? '✅ Saved!' : 'Save Mood'}
      </button>

      {/* Stats */}
      <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
        <div className="text-sm text-gray-600 mb-2">Weekly Trend</div>
        <div className="text-2xl font-bold text-purple-600">{getWeeklyTrend()}</div>
      </div>

      {/* Recent History */}
      {moods.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Moods</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {moods.slice().reverse().slice(0, 7).map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()}</span>
                <span className="text-2xl">{moodOptions.find(m => m.value === entry.mood)?.emoji}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-auto pt-6 text-center text-xs text-gray-500 border-t border-gray-200">
        <p>Your mood data is private and secure 🔒</p>
      </div>
    </div>
  )
}
