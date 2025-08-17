import { useState, useEffect } from 'react'
import { getUserProfile } from '../firebase/database'
import './Dashboard.css'

const Dashboard = ({ user, onLogout }) => {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const result = await getUserProfile(user.uid)
      if (result.success) {
        setUserProfile(result.user)
      }
    } catch (err) {
      console.error('Profil yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }

  const dashboardCards = [
    {
      id: 'imalat-stok',
      title: 'İmalat & Stok',
      icon: '🏭',
      description: 'Üretim ve stok yönetimi',
      color: '#d4af37'
    },
    {
      id: 'kasa-defteri',
      title: 'Kasa Defteri',
      icon: '💰',
      description: 'Kasa giriş çıkış takibi',
      color: '#b8860b'
    },
    {
      id: 'satis-recete',
      title: 'Satış & Reçete',
      icon: '📋',
      description: 'Satış kayıtları ve reçeteler',
      color: '#d4af37'
    },
    {
      id: 'gelir-gider',
      title: 'Gelir & Gider',
      icon: '📊',
      description: 'Mali durumu izleme',
      color: '#b8860b'
    },
    {
      id: 'personel-takibi',
      title: 'Personel Takibi',
      icon: '👥',
      description: 'Personel yönetimi',
      color: '#d4af37',
      adminOnly: false
    },
    {
      id: 'maas-bilgisi',
      title: 'Maaş Bilgisi',
      icon: '💵',
      description: 'Maaş hesaplama ve ödeme',
      color: '#b8860b',
      adminOnly: true
    },
    {
      id: 'dis-tedarik',
      title: 'Dış Tedarik',
      icon: '📦',
      description: 'Tedarikçi yönetimi',
      color: '#d4af37'
    },
    {
      id: 'vardiya-yonetimi',
      title: 'Vardiya Yönetimi',
      icon: '⏰',
      description: 'Vardiya planlaması',
      color: '#b8860b',
      adminOnly: true
    }
  ]

  const handleCardClick = (cardId) => {
    console.log(`${cardId} kartına tıklandı`)
    // Buraya kart tıklama işlemleri eklenecek
  }

  const getDepartmentName = (department) => {
    const names = {
      'yonetim': 'Yönetim',
      'mudur': 'Müdür',
      'koordinatorler': 'Koordinatörler',
      'servis-personeli': 'Servis Personeli',
      'bar-personeli': 'Bar Personeli',
      'mutfak-personeli': 'Mutfak Personeli',
      'tedarik-sorumlusu': 'Tedarik Sorumlusu',
      'imalat-personeli': 'İmalat Personeli'
    }
    return names[department] || department
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-wrapper">
          <div className="loading-spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="brand-section">
            <div className="brand-logo">
              <div className="logo-crown">
                <div className="crown-center"></div>
                <div className="crown-left"></div>
                <div className="crown-right"></div>
                <div className="crown-base"></div>
              </div>
            </div>
            <div className="brand-text">
              <h1>GlowChocolate</h1>
              <p>İşletme ve Personel Takip Sistemi</p>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">
              {(userProfile?.fullName || user.name)?.charAt(0)?.toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">
                Hoş geldin, {userProfile?.fullName || user.name}
                {userProfile?.role === 'admin' && <span className="admin-badge">👑</span>}
              </span>
              <span className="user-department">
                {userProfile?.department && getDepartmentName(userProfile.department)}
              </span>
            </div>
          </div>
          <button onClick={onLogout} className="logout-btn">
            🚪 Çıkış
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>🎉 GlowChocolate'a Hoş Geldiniz!</h2>
          <p>İşletme ve personel takip sisteminiz hazır. Aşağıdaki kartlardan işlemlerinizi gerçekleştirebilir ve sistemdeki tüm verilerinizi kolayca yönetebilirsiniz.</p>
        </div>

        <div className="cards-grid">
          {dashboardCards
            .filter(card => !card.adminOnly || userProfile?.role === 'admin')
            .map(card => (
              <div 
                key={card.id}
                className="dashboard-card"
                onClick={() => handleCardClick(card.id)}
                style={{ '--card-color': card.color }}
              >
                <div className="card-icon">
                  {card.icon}
                </div>
                <div className="card-content">
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
                <div className="card-arrow">
                  →
                </div>
              </div>
            ))
          }
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-item">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <span className="stat-number">0</span>
              <span className="stat-label">Bugünkü Satış</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">🏭</div>
            <div className="stat-content">
              <span className="stat-number">0</span>
              <span className="stat-label">Üretim</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <span className="stat-number">0</span>
              <span className="stat-label">Aktif Personel</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <span className="stat-number">0₺</span>
              <span className="stat-label">Kasa Durumu</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
