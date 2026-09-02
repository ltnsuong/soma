import { useState } from 'react'
import { getTelegramUser } from '../lib/telegram'
import { telegramLogin } from '../lib/api'
import AuthScreen from './AuthScreen'

export default function WelcomeScreen({ onAuth }) {
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleTelegramSignup = async () => {
    setLoading(true)
    setError(null)
    try {
      const tgUser = getTelegramUser()
      if (!tgUser?.id) {
        setError('Please open SOMA from Telegram')
        setLoading(false)
        return
      }

      const response = await telegramLogin(tgUser)
      if (response.accessToken) {
        onAuth({ ...response.user, authenticated: true })
      } else {
        setError('Login failed. Please try again.')
        setLoading(false)
      }
    } catch (err) {
      console.error('Telegram login failed:', err)
      setError('Connection error. Check your internet.')
      setLoading(false)
    }
  }

  if (showAuth) {
    return <AuthScreen onAuth={onAuth} showBack={() => setShowAuth(false)} />
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #f8f4ff 50%, #fff0ff 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Decorative Background */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
      }}></div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          paddingTop: '32px',
          animation: 'slideDown 0.6s ease-out',
        }}>
          <div style={{
            fontSize: '72px',
            marginBottom: '24px',
            animation: 'pulse 2s ease-in-out infinite',
          }}>🧠</div>
          <h1 style={{
            fontSize: '44px',
            fontWeight: '900',
            color: '#1e1b4b',
            margin: '0 0 8px 0',
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          }}>SOMA</h1>
          <p style={{
            fontSize: '18px',
            color: '#6366f1',
            fontWeight: '600',
            margin: '0 0 8px 0',
          }}>Mental Health Support</p>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            maxWidth: '280px',
            margin: '0 auto',
            lineHeight: '1.5',
          }}>
            Chat with Soma, track your mood, connect with your doctor. Available anytime, anywhere.
          </p>
        </div>

        {/* Features */}
        <div style={{
          width: '100%',
          maxWidth: '340px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'slideUp 0.6s ease-out 0.2s both',
        }}>
          {/* Feature 1 */}
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.3s ease',
            cursor: 'default',
          }}>
            <div style={{ fontSize: '32px' }}>💬</div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '15px',
                fontWeight: '700',
                color: '#1e1b4b',
                margin: '0 0 4px 0',
              }}>Chat with Soma</h3>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: '0',
              }}>Express yourself safely with AI support</p>
            </div>
          </div>

          {/* Feature 2 */}
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.3s ease',
            cursor: 'default',
          }}>
            <div style={{ fontSize: '32px' }}>📊</div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '15px',
                fontWeight: '700',
                color: '#1e1b4b',
                margin: '0 0 4px 0',
              }}>Track Your Mood</h3>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: '0',
              }}>Monitor patterns and progress daily</p>
            </div>
          </div>

          {/* Feature 3 */}
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.3s ease',
            cursor: 'default',
          }}>
            <div style={{ fontSize: '32px' }}>👨‍⚕️</div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontSize: '15px',
                fontWeight: '700',
                color: '#1e1b4b',
                margin: '0 0 4px 0',
              }}>Connect with Doctor</h3>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: '0',
              }}>Share your data securely with healthcare</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div style={{
          width: '100%',
          maxWidth: '340px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'slideUp 0.6s ease-out 0.4s both',
        }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px',
              fontWeight: '600',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Primary Button - Telegram */}
          <button
            onClick={handleTelegramSignup}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px',
              borderRadius: '16px',
              fontWeight: '700',
              fontSize: '16px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading
                ? 'linear-gradient(135deg, #d1d5db 0%, #e5e7eb 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              boxShadow: loading
                ? '0 2px 4px rgba(0, 0, 0, 0.1)'
                : '0 8px 16px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.3s ease',
              transform: loading ? 'translateY(0)' : 'translateY(0)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.3)';
              }
            }}
          >
            {loading ? (
              <>
                <span>⏳</span> Signing in...
              </>
            ) : (
              <>
                <span>📱</span> Sign in with Telegram
              </>
            )}
          </button>

          {/* Secondary Button - Guest */}
          <button
            onClick={() => onAuth({ authenticated: true, guest: true })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px',
              borderRadius: '16px',
              fontWeight: '600',
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: 'white',
              boxShadow: '0 6px 12px rgba(99, 102, 241, 0.25)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 10px 20px rgba(99, 102, 241, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 6px 12px rgba(99, 102, 241, 0.25)';
            }}
          >
            🚀 Try Without Account
          </button>

          {/* Tertiary Button - Email */}
          <button
            onClick={() => setShowAuth(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px',
              borderRadius: '16px',
              fontWeight: '600',
              fontSize: '16px',
              border: '2px solid #e0e7ff',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.5)',
              color: '#6366f1',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f0f4ff';
              e.target.style.borderColor = '#6366f1';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.5)';
              e.target.style.borderColor = '#e0e7ff';
            }}
          >
            📧 Sign In with Email
          </button>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: '24px',
          paddingBottom: '16px',
        }}>
          <p style={{
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '600',
            margin: '0 0 8px 0',
          }}>
            🔒 Your data is encrypted and private • Free forever
          </p>
          <p style={{
            fontSize: '12px',
            color: '#9ca3af',
            margin: '0',
          }}>
            Built by someone who survived depression
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  )
}
