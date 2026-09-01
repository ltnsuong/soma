import { useState } from 'react'

export default function IntroductionScreen({ onContinue }) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      emoji: '🧠',
      title: 'Welcome to SOMA',
      description: 'Mental health support in your pocket',
      color: 'from-purple-600 to-pink-600'
    },
    {
      emoji: '💬',
      title: 'Chat with Soma',
      description: 'Express yourself safely. Our AI listens and supports you without judgment.',
      color: 'from-blue-600 to-purple-600'
    },
    {
      emoji: '📊',
      title: 'Track Your Mood',
      description: 'Understand your patterns. Watch your progress over time.',
      color: 'from-green-600 to-blue-600'
    },
    {
      emoji: '👨‍⚕️',
      title: 'Connect with Doctors',
      description: 'Share your journey with healthcare providers securely.',
      color: 'from-orange-600 to-red-600'
    },
    {
      emoji: '❤️',
      title: 'You\'re Not Alone',
      description: 'Built by someone who survived. Here to help you reach out.',
      color: 'from-red-600 to-pink-600'
    }
  ]

  const currentStep = steps[step]

  return (
    <div className={`flex flex-col items-center justify-center h-screen bg-gradient-to-b ${currentStep.color} text-white px-6 py-8 overflow-hidden`}>
      {/* Close Button */}
      <button
        onClick={onContinue}
        className="absolute top-6 right-6 text-white text-2xl opacity-70 hover:opacity-100"
      >
        ✕
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-8xl mb-8 animate-bounce">{currentStep.emoji}</div>
        <h1 className="text-4xl font-black text-center mb-6">{currentStep.title}</h1>
        <p className="text-xl text-center text-white/90 max-w-sm leading-relaxed">{currentStep.description}</p>
      </div>

      {/* Progress Dots */}
      <div className="flex gap-2 mb-8">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={`h-3 rounded-full transition-all ${
              idx === step ? 'bg-white w-8' : 'bg-white/50 w-3'
            }`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="w-full space-y-3">
        {step < steps.length - 1 ? (
          <>
            <button
              onClick={() => setStep(step + 1)}
              className="w-full bg-white text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-100 transition-all"
            >
              Next →
            </button>
            <button
              onClick={onContinue}
              className="w-full border-2 border-white text-white font-semibold py-3 rounded-xl hover:bg-white/10 transition-all"
            >
              Skip
            </button>
          </>
        ) : (
          <button
            onClick={onContinue}
            className="w-full bg-white text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-100 transition-all"
          >
            Get Started 🚀
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-white/70">
        <p>Built by someone who survived depression</p>
        <p>Here to help you reach out</p>
      </div>
    </div>
  )
}
