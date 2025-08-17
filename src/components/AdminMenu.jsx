import React from 'react'
import './AdminMenu.css'

export default function AdminMenu({ userProfile, onBack, onOpenReports, onOpenMola, onOpenPersonel, onOpenUsers, onOpenNotifications }) {
  const isAdmin = userProfile?.role === 'admin'
  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <button className="back-btn" onClick={onBack}>← Geri</button>
        <h1>Yönetim Menüsü</h1>
        <div className="spacer" />
      </header>
      {!isAdmin ? (
        <div className="warn">Bu alanı görüntülemek için yetkiniz yok.</div>
      ) : (
      <main className="admin-main">
        <div className="admin-grid">
          <button className="admin-card" onClick={onOpenReports}>
            <div className="icon">📈</div>
            <div className="txt">
              <h3>Raporlar</h3>
              <p>Mesai ve mola raporları</p>
            </div>
            <div className="arrow">→</div>
          </button>
          <button className="admin-card" onClick={onOpenMola}>
            <div className="icon">☕</div>
            <div className="txt">
              <h3>Mola Yönetimi</h3>
              <p>Aktif molalar ve geçmiş</p>
            </div>
            <div className="arrow">→</div>
          </button>
          <button className="admin-card" onClick={onOpenPersonel}>
            <div className="icon">👥</div>
            <div className="txt">
              <h3>Personel</h3>
              <p>Kadro ve vardiyalar</p>
            </div>
            <div className="arrow">→</div>
          </button>
          <button className="admin-card" onClick={onOpenUsers}>
            <div className="icon">🛂</div>
            <div className="txt">
              <h3>Kullanıcılar</h3>
              <p>Rol ve aktiflik yönetimi</p>
            </div>
            <div className="arrow">→</div>
          </button>
          <button className="admin-card" onClick={onOpenNotifications}>
            <div className="icon">🔔</div>
            <div className="txt">
              <h3>Bildirimler</h3>
              <p>Tekil ve toplu gönderimler</p>
            </div>
            <div className="arrow">→</div>
          </button>
        </div>
      </main>
      )}
    </div>
  )
}
