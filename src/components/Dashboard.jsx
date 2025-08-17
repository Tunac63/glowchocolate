import { useState, useEffect } from 'react'
import { getUserProfile, updateUserProfile } from '../firebase/database'
import ProfileModal from './ProfileModal'
import PersonelTakipModal from './PersonelTakipModal'
import GunlukGorevlerModal from './GunlukGorevlerModal'
import GunlukGorevler from './GunlukGorevler'
import MesaiTakip from './MesaiTakip'
import Reports from './Reports'
import AdminMenu from './AdminMenu'
import MolaSayfasi from './MolaSayfasi'
import AdminUsers from './AdminUsers'
import AdminNotifications from './AdminNotifications'
import './Dashboard.css'

const Dashboard = ({ user, onLogout, refreshKey, setRefreshKey }) => {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showPersonelModal, setShowPersonelModal] = useState(false)
  const [showGorevlerModal, setShowGorevlerModal] = useState(false)
  const [currentView, setCurrentView] = useState(() => {
    // Sayfa yenilendiğinde localStorage'dan view'i geri yükle
    return localStorage.getItem('glowchocolate_currentView') || 'dashboard';
  }); // 'dashboard', 'gorevler', 'personel-takip', 'mesai-takip'

  useEffect(() => {
    loadUserProfile()
  }, [])

  // currentView değiştiğinde localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('glowchocolate_currentView', currentView);
    console.log('🔄 Mevcut görünüm localStorage\'a kaydedildi:', currentView);
  }, [currentView]);

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
      title: 'Dış Tedarik & Stok Sayım',
      icon: '📦',
      description: 'Tedarik yönetimi & Stok Sayımı',
      color: '#d4af37'
    },
    {
      id: 'vardiya-yonetimi',
      title: 'Personel Listesi & Vardiya Yönetimi',
      icon: '⏰',
      description: 'Vardiya planlaması',
      color: '#b8860b',
      adminOnly: true
    },
    {
      id: 'ayarlar-raporlar',
      title: 'Ayarlar & Raporlar',
      icon: '⚙️',
      description: 'Sistem ayarları ve raporlar',
      color: '#d4af37',
      adminOnly: true,
      action: () => setCurrentView('admin')
    }
  ]

  const handleCardClick = (cardId) => {
    console.log(`${cardId} kartına tıklandı`)
    
    // Önce kart objesi içindeki action fonksiyonunu kontrol et
    const card = dashboardCards.find(c => c.id === cardId);
    // Admin kısıtlı kartlara yetkisiz erişimi engelle
    if (card?.adminOnly && userProfile?.role !== 'admin') {
      alert('Bu alana sadece adminler erişebilir.');
      return;
    }
    if (card?.action) {
      card.action();
      return;
    }
    
    if (cardId === 'personel-takibi') {
      setCurrentView('personel-takip')
    }
    // Buraya diğer kart tıklama işlemleri eklenecek
  }

  // Admin olmayan kullanıcıların admin ekranlarına düşmesini engelle
  useEffect(() => {
    const isAdmin = userProfile?.role === 'admin'
    const adminViews = ['admin', 'admin-users', 'admin-notifications', 'reports']
    if (!isAdmin && adminViews.includes(currentView)) {
      console.warn('Yetkisiz admin görünümü algılandı, ana panele yönlendiriliyor:', currentView)
      setCurrentView('dashboard')
    }
  }, [userProfile?.role, currentView])

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

  // Görünüm kontrolü  
  if (currentView === 'gorevler') {
    return (
      <>
        <GunlukGorevler 
          userProfile={userProfile}
          onBack={() => setCurrentView('personel-takip')}
        />
        
        <ProfileModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userProfile={userProfile}
          onUpdateProfile={async (updatedData) => {
            try {
              console.log('Profil güncelleniyor:', updatedData);
              const result = await updateUserProfile(user.uid, updatedData);
              
              if (result.success) {
                console.log('✅ Profil başarıyla güncellendi');
                
                // Profil güncellemesinden sonra veriyi yeniden yükle
                const updated = await getUserProfile(user.uid);
                if (updated.success) {
                  setUserProfile(updated.user);
                  
                  // Personel kartlarını yenilemek için refreshKey'i artır
                  setRefreshKey(prev => prev + 1);
                  
                  console.log('✅ Kullanıcı profili yenilendi');
                  console.log('✅ Personel kartları yenilenecek');
                }
              } else {
                console.error('❌ Güncelleme başarısız:', result.message);
                throw new Error(result.message || 'Güncelleme başarısız');
              }
            } catch (error) {
              console.error('❌ Profile update error:', error);
              throw error;
            }
          }}
        />
      </>
    );
  }

  if (currentView === 'mesai-takip') {
    return (
      <>
        <MesaiTakip 
          userProfile={userProfile}
          onBack={() => setCurrentView('personel-takip')}
        />
        
        <ProfileModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userProfile={userProfile}
          onUpdateProfile={async (updatedData) => {
            try {
              console.log('Profil güncelleniyor:', updatedData);
              const result = await updateUserProfile(user.uid, updatedData);
              
              if (result.success) {
                console.log('✅ Profil başarıyla güncellendi');
                
                // Profil güncellemesinden sonra veriyi yeniden yükle
                const updated = await getUserProfile(user.uid);
                if (updated.success) {
                  setUserProfile(updated.user);
                  
                  // Personel kartlarını yenilemek için refreshKey'i artır
                  setRefreshKey(prev => prev + 1);
                  
                  console.log('✅ Kullanıcı profili yenilendi');
                  console.log('✅ Personel kartları yenilenecek');
                }
              } else {
                console.error('❌ Güncelleme başarısız:', result.message);
                throw new Error(result.message || 'Güncelleme başarısız');
              }
            } catch (error) {
              console.error('❌ Profile update error:', error);
              throw error;
            }
          }}
        />
      </>
    );
  }

  if (currentView === 'reports') {
    return (
      <>
        <Reports 
          userProfile={userProfile}
          onBack={() => setCurrentView('dashboard')}
        />
      </>
    );
  }

  if (currentView === 'admin') {
    return (
      <>
        <AdminMenu 
          userProfile={userProfile}
          onBack={() => setCurrentView('dashboard')}
          onOpenReports={() => setCurrentView('reports')}
          onOpenMola={() => setCurrentView('mola')}
          onOpenPersonel={() => setCurrentView('personel-takip')}
          onOpenUsers={() => setCurrentView('admin-users')}
          onOpenNotifications={() => setCurrentView('admin-notifications')}
        />
      </>
    );
  }

  if (currentView === 'mola') {
    return (
      <>
        <MolaSayfasi 
          userProfile={userProfile}
          onBack={() => setCurrentView('personel-takip')}
        />
      </>
    );
  }

  if (currentView === 'admin-users') {
    return (
      <>
        <AdminUsers 
          userProfile={userProfile}
          onBack={() => setCurrentView('admin')}
        />
      </>
    );
  }

  if (currentView === 'admin-notifications') {
    return (
      <>
        <AdminNotifications 
          userProfile={userProfile}
          onBack={() => setCurrentView('admin')}
        />
      </>
    );
  }

  if (currentView === 'personel-takip') {
    return (
      <>
        <PersonelTakipModal 
          isOpen={true}
          onClose={() => setCurrentView('dashboard')}
          userProfile={userProfile}
          onOpenGorevler={() => setCurrentView('gorevler')}
          onOpenMesaiTakip={() => setCurrentView('mesai-takip')}
          onOpenMola={() => setCurrentView('mola')}
        />
        
        <ProfileModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userProfile={userProfile}
          onUpdate={async (updatedData) => {
            try {
              console.log('Profil güncelleniyor:', updatedData);
              const result = await updateUserProfile(user.uid, updatedData);
              
              if (result.success) {
                console.log('✅ Profil başarıyla güncellendi');
                
                // Profil güncellemesinden sonra veriyi yeniden yükle
                const updated = await getUserProfile(user.uid);
                if (updated.success) {
                  setUserProfile(updated.user);
                  
                  // Personel kartlarını yenilemek için refreshKey'i artır
                  setRefreshKey(prev => prev + 1);
                  
                  console.log('✅ Kullanıcı profili yenilendi');
                  console.log('✅ Personel kartları yenilenecek');
                }
              } else {
                console.error('❌ Güncelleme başarısız:', result.message);
                throw new Error(result.message || 'Güncelleme başarısız');
              }
            } catch (error) {
              console.error('❌ Profile update error:', error);
              throw error;
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="brand-section">
            <div className="brand-text">
              <h1>Glow Chocolate</h1>
              <p>İşletme Yönetim Sistemi</p>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <div 
              className="user-avatar"
              onClick={() => setShowProfileModal(true)}
              style={{ cursor: 'pointer' }}
            >
              {(userProfile?.fullName || user.name)?.charAt(0)?.toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">
                Hoş geldin, {userProfile?.fullName || user.name}
                {userProfile?.role === 'admin' && 
                  <span 
                    className="admin-badge"
                    onClick={() => setShowProfileModal(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    ⬇️
                  </span>
                }
              </span>
              <span className="user-department">
                {userProfile?.department && getDepartmentName(userProfile.department)}
              </span>
            </div>
          </div>
          <button onClick={onLogout} className="logout-btn">
            Çıkış Yap
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h2> İşletme Kontrol Merkezi</h2>
          <p>Üst düzey yönetim paneline hoş geldiniz. Tüm işletme süreçlerinizi buradan izleyebilir ve yönetebilirsiniz.</p>
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


      </main>
      
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userProfile={userProfile}
        onUpdateProfile={async (updatedData) => {
          try {
            console.log('Profil güncelleniyor:', updatedData);
            const result = await updateUserProfile(user.uid, updatedData);
            
            if (result.success) {
              console.log('✅ Profil başarıyla güncellendi');
              
              // Profil güncellemesinden sonra veriyi yeniden yükle
              const updated = await getUserProfile(user.uid);
              if (updated.success) {
                setUserProfile(updated.user);
                
                // Personel kartlarını yenilemek için refreshKey'i artır
                setRefreshKey(prev => prev + 1);
                
                console.log('✅ Kullanıcı profili yenilendi');
                console.log('✅ Personel kartları yenilenecek');
              }
            } else {
              console.error('❌ Güncelleme başarısız:', result.message);
              throw new Error(result.message || 'Güncelleme başarısız');
            }
          } catch (error) {
            console.error('❌ Profile update error:', error);
            throw error;
          }
        }}
      />
      
      <GunlukGorevlerModal 
        isOpen={showGorevlerModal}
        onClose={() => setShowGorevlerModal(false)}
        userProfile={userProfile}
      />
    </div>
  )
}

export default Dashboard
