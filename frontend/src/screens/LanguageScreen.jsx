import { useState } from 'react'

export default function LanguageScreen({ onSelectLanguage }) {
  const [selectedLang, setSelectedLang] = useState('en')

  const languages = [
    { code: 'en', flag: '🇺🇸', name: 'English', nativeName: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español', nativeName: 'Spanish' },
    { code: 'fr', flag: '🇫🇷', name: 'Français', nativeName: 'French' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch', nativeName: 'German' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano', nativeName: 'Italian' },
    { code: 'pt', flag: '🇵🇹', name: 'Português', nativeName: 'Portuguese' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский', nativeName: 'Russian' },
    { code: 'ja', flag: '🇯🇵', name: '日本語', nativeName: 'Japanese' },
    { code: 'zh', flag: '🇨🇳', name: '中文', nativeName: 'Chinese' },
    { code: 'ko', flag: '🇰🇷', name: '한국어', nativeName: 'Korean' },
    { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt', nativeName: 'Vietnamese' },
    { code: 'th', flag: '🇹🇭', name: 'ไทย', nativeName: 'Thai' },
  ]

  const handleContinue = () => {
    localStorage.setItem('language', selectedLang)
    onSelectLanguage(selectedLang)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #2d1b69 100%)',
      overflow: 'hidden',
      padding: '24px',
      paddingTop: '48px',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
      }}>
        {/* Brain Icon in Box */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px',
          height: '120px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
          border: '2px solid rgba(168, 85, 247, 0.4)',
          marginBottom: '24px',
          fontSize: '64px',
          margin: '0 auto 24px',
        }}>
          🧠
        </div>

        <h1 style={{
          fontSize: '42px',
          fontWeight: '900',
          color: 'white',
          margin: '0 0 12px 0',
          fontFamily: 'system-ui, sans-serif',
        }}>SOMA</h1>

        <p style={{
          fontSize: '16px',
          color: '#a78bfa',
          margin: '0 0 32px 0',
          fontWeight: '400',
          maxWidth: '280px',
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: '1.5',
        }}>
          Know yourself before knowing each other
        </p>
      </div>

      {/* Language Selection Title */}
      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        color: 'white',
        margin: '0 0 8px 0',
        textAlign: 'center',
      }}>Choose your language</h2>
      <p style={{
        fontSize: '14px',
        color: '#9ca3af',
        margin: '0 0 24px 0',
        textAlign: 'center',
      }}>Select the language you prefer</p>

      {/* Language List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 20px',
              borderRadius: '16px',
              background: selectedLang === lang.code
                ? 'rgba(168, 85, 247, 0.2)'
                : 'rgba(168, 85, 247, 0.05)',
              border: selectedLang === lang.code
                ? '2px solid rgba(168, 85, 247, 0.6)'
                : '2px solid rgba(168, 85, 247, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              flex: '0 0 auto',
            }}
            onMouseEnter={(e) => {
              if (selectedLang !== lang.code) {
                e.target.style.background = 'rgba(168, 85, 247, 0.1)';
                e.target.style.borderColor = 'rgba(168, 85, 247, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedLang !== lang.code) {
                e.target.style.background = 'rgba(168, 85, 247, 0.05)';
                e.target.style.borderColor = 'rgba(168, 85, 247, 0.2)';
              }
            }}
          >
            {/* Flag */}
            <div style={{ fontSize: '28px', flexShrink: 0 }}>{lang.flag}</div>

            {/* Language Info */}
            <div style={{
              flex: 1,
              textAlign: 'left',
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                margin: '0',
              }}>
                {lang.name}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9ca3af',
                margin: '4px 0 0 0',
              }}>
                {lang.nativeName}
              </div>
            </div>

            {/* Checkmark */}
            {selectedLang === lang.code && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                flexShrink: 0,
              }}>
                ✓
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        style={{
          marginTop: '24px',
          padding: '16px 24px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
          color: 'white',
          fontWeight: '700',
          fontSize: '16px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 8px 16px rgba(168, 85, 247, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 12px 24px rgba(168, 85, 247, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 8px 16px rgba(168, 85, 247, 0.3)';
        }}
      >
        Continue →
      </button>
    </div>
  )
}
