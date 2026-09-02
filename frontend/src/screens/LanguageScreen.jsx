import { useState } from 'react'

export default function LanguageScreen({ onSelectLanguage }) {
  const [selectedLang, setSelectedLang] = useState('en')

  const languages = [
    { code: 'en', flag: '🇬🇧', name: 'English', native: 'English' },
    { code: 'es', flag: '🇪🇸', name: 'Español', native: 'Spanish' },
    { code: 'fr', flag: '🇫🇷', name: 'Français', native: 'French' },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch', native: 'German' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano', native: 'Italian' },
    { code: 'pt', flag: '🇵🇹', name: 'Português', native: 'Portuguese' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский', native: 'Russian' },
    { code: 'ja', flag: '🇯🇵', name: '日本語', native: 'Japanese' },
    { code: 'zh', flag: '🇨🇳', name: '中文', native: 'Chinese' },
    { code: 'ko', flag: '🇰🇷', name: '한국어', native: 'Korean' },
    { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt', native: 'Vietnamese' },
    { code: 'th', flag: '🇹🇭', name: 'ไทย', native: 'Thai' },
  ]

  const handleSelectLanguage = (langCode) => {
    setSelectedLang(langCode)
    localStorage.setItem('language', langCode)
    // Auto-navigate after selection
    setTimeout(() => onSelectLanguage(langCode), 200)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Decorative Glowing Orbs */}
      <div style={{
        position: 'absolute',
        top: '-40%',
        right: '-20%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
      }}></div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginTop: '30px',
          marginBottom: '30px',
        }}>
          {/* Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            border: '2px solid rgba(139, 92, 246, 0.4)',
          }}>
            🧠
          </div>

          <h1 style={{
            fontSize: '48px',
            fontWeight: '900',
            color: 'white',
            margin: '0 0 12px 0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>SOMA</h1>

          <p style={{
            fontSize: '16px',
            color: 'rgba(147, 112, 219, 0.9)',
            margin: '0 0 24px 0',
            fontWeight: '500',
          }}>Know yourself before knowing each other</p>

          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'white',
            margin: '24px 0 8px 0',
          }}>Choose your language</h2>

          <p style={{
            fontSize: '14px',
            color: 'rgba(226, 232, 240, 0.7)',
            margin: '0',
          }}>Select the language you prefer</p>
        </div>

        {/* Languages List */}
        <div style={{
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          paddingBottom: '20px',
        }}>
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 18px',
                borderRadius: '14px',
                border: selectedLang === lang.code
                  ? '2px solid rgba(139, 92, 246, 0.8)'
                  : '1px solid rgba(139, 92, 246, 0.2)',
                background: selectedLang === lang.code
                  ? 'rgba(139, 92, 246, 0.15)'
                  : 'rgba(139, 92, 246, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: selectedLang === lang.code ? 'scale(1.02)' : 'scale(1)',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={(e) => {
                if (selectedLang !== lang.code) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedLang !== lang.code) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)';
                }
              }}
            >
              {/* Flag */}
              <div style={{ fontSize: '28px', minWidth: '40px', textAlign: 'center' }}>
                {lang.flag}
              </div>

              {/* Language Name */}
              <div style={{ flex: 1, textAlign: 'left' }}>
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
                  color: 'rgba(226, 232, 240, 0.6)',
                  margin: '4px 0 0 0',
                }}>
                  {lang.native}
                </div>
              </div>

              {/* Checkmark */}
              {selectedLang === lang.code && (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}>
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: 'auto',
          paddingBottom: '20px',
        }}>
          <p style={{
            fontSize: '12px',
            color: 'rgba(226, 232, 240, 0.5)',
            margin: '0',
          }}>
            You can change this anytime in settings
          </p>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 3px;
        }
      `}</style>
    </div>
  )
}
