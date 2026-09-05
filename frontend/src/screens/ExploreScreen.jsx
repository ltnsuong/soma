import { useState } from 'react'

export default function ExploreScreen() {
  const [people] = useState([
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
        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        color: 'white',
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px 0' }}>Explore</h2>
        <p style={{ fontSize: '12px', opacity: 0.9, margin: '0' }}>Discover amazing people</p>
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
        {people.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '20px',
            padding: '32px 24px',
            border: '2px dashed #cffafe',
            maxWidth: '300px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1e1b4b',
              margin: '0 0 12px 0',
            }}>Discover people</h3>
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              margin: '0 0 20px 0',
              lineHeight: '1.5',
            }}>
              Find meaningful connections. Browse profiles and make new friends with Soma's help.
            </p>
            <button
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: 'white',
                border: 'none',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(6, 182, 212, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              👥 Start Exploring
            </button>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            {/* People cards will go here */}
          </div>
        )}

        {/* Info Section */}
        <div style={{
          width: '100%',
          maxWidth: '340px',
          marginTop: '32px',
          padding: '16px',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          textAlign: 'left',
        }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#1e1b4b',
            margin: '0 0 8px 0',
          }}>How it works</h4>
          <ul style={{
            fontSize: '12px',
            color: '#6b7280',
            margin: '0',
            paddingLeft: '20px',
            lineHeight: '1.6',
          }}>
            <li>Browse profiles & interests</li>
            <li>Connect with people</li>
            <li>Start meaningful conversations</li>
            <li>Build your circle</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
