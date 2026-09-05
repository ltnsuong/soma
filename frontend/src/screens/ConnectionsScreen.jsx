import { useState } from 'react'

export default function ConnectionsScreen() {
  const [connections] = useState([
    // Placeholder data
  ])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#f8f7ff',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
        color: 'white',
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px 0' }}>Inner</h2>
        <p style={{ fontSize: '12px', opacity: 0.9, margin: '0' }}>Your matches & connections</p>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}>
        {connections.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '20px',
            padding: '32px 24px',
            border: '2px dashed #f3e8ff',
            maxWidth: '300px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1e1b4b',
              margin: '0 0 12px 0',
            }}>No connections yet</h3>
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              margin: '0 0 20px 0',
              lineHeight: '1.5',
            }}>
              Explore people and make meaningful connections. Start by visiting the Explore tab!
            </p>
            <button
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
                color: 'white',
                border: 'none',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(168, 85, 247, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              🔍 Explore Now
            </button>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            {/* Connections list will go here */}
          </div>
        )}
      </div>
    </div>
  )
}
