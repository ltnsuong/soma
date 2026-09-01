import { useState } from 'react'

export default function LanguageScreen({ onSelectLanguage }) {
  const [selectedLang, setSelectedLang] = useState('en')

  const languages = [
    { code: 'en', name: '🇺🇸 English', nativeName: 'English' },
    { code: 'es', name: '🇪🇸 Español', nativeName: 'Español' },
    { code: 'fr', name: '🇫🇷 Français', nativeName: 'Français' },
    { code: 'de', name: '🇩🇪 Deutsch', nativeName: 'Deutsch' },
    { code: 'it', name: '🇮🇹 Italiano', nativeName: 'Italiano' },
    { code: 'pt', name: '🇵🇹 Português', nativeName: 'Português' },
    { code: 'ru', name: '🇷🇺 Русский', nativeName: 'Русский' },
    { code: 'ja', name: '🇯🇵 日本語', nativeName: '日本語' },
    { code: 'zh', name: '🇨🇳 中文', nativeName: '中文' },
    { code: 'ko', name: '🇰🇷 한국어', nativeName: '한국어' },
    { code: 'vi', name: '🇻🇳 Tiếng Việt', nativeName: 'Tiếng Việt' },
    { code: 'th', name: '🇹🇭 ไทย', nativeName: 'ไทย' },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-screen px-6 py-8 bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Language</h1>
        <p className="text-gray-600">Choose your preferred language</p>
      </div>

      {/* Language Grid */}
      <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-12">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            className={`p-4 rounded-lg font-semibold transition-all transform hover:scale-105 ${
              selectedLang === lang.code
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            <div className="text-2xl mb-1">{lang.name.split(' ')[0]}</div>
            <div className="text-xs opacity-80">{lang.nativeName}</div>
          </button>
        ))}
      </div>

      {/* Continue Button */}
      <button
        onClick={() => onSelectLanguage(selectedLang)}
        className="w-full max-w-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all"
      >
        Continue →
      </button>
    </div>
  )
}
