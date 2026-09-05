import { useState } from 'react'

export default function CircleScreen() {
  const [showAddModal, setShowAddModal] = useState(false)

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
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        color: 'white',
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px 0' }}>My Circle</h2>
        <p style={{ fontSize: '12px', opacity: 0.9, margin: '0' }}>Your 20 most important people</p>
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
        {/* Empty State */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '20px',
          padding: '32px 24px',
          border: '2px dashed #e0e7ff',
          maxWidth: '300px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1e1b4b',
            margin: '0 0 12px 0',
          }}>Add your first person</h3>
          <p style={{
            fontSize: '13px',
            color: '#6b7280',
            margin: '0 0 20px 0',
            lineHeight: '1.5',
          }}>
            Your circle holds your most important people. Soma helps you stay connected.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 16px rgba(99, 102, 241, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            + Add Person
          </button>
        </div>

        {/* Info Cards */}
        <div style={{
          width: '100%',
          maxWidth: '340px',
          marginTop: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '24px' }}>💬</div>
            <div style={{ textAlign: 'left' }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#1e1b4b',
                margin: '0 0 2px 0',
              }}>Connections</h4>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: '0',
              }}>Your matches will appear here</p>
            </div>
            <span style={{ marginLeft: 'auto', color: '#6366f1', fontSize: '18px' }}>›</span>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            padding: '16px',
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '24px' }}>📈</div>
            <div style={{ textAlign: 'left' }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#1e1b4b',
                margin: '0 0 2px 0',
              }}>Relationship Insights</h4>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                margin: '0',
              }}>Soma's view of your connections</p>
            </div>
            <span style={{ marginLeft: 'auto', color: '#6366f1', fontSize: '18px' }}>›</span>
          </div>
        </div>
      </div>
    </div>
  )
}
