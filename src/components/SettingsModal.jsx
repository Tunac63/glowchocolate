import React, { useState } from 'react';
import './SettingsModal.css';

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  userProfile
}) => {
  const [activeTab, setActiveTab] = useState('general');

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', title: '⚙️ Genel Ayarlar', icon: '⚙️' },
    { id: 'reports', title: '📊 Raporlar', icon: '📊' },
    { id: 'backup', title: '💾 Yedekleme', icon: '💾' },
    { id: 'users', title: '👥 Kullanıcılar', icon: '👥' }
  ];

  const renderGeneralSettings = () => (
    <div className="settings-content">
      <h3>⚙️ Genel Ayarlar</h3>
      <div className="settings-grid">
        <div className="setting-item">
          <label>🌍 Dil Seçimi</label>
          <select className="setting-select">
            <option value="tr">Türkçe</option>
            <option value="en">English</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>🎨 Tema</label>
          <select className="setting-select">
            <option value="gold">Altın Tema</option>
            <option value="dark">Koyu Tema</option>
            <option value="light">Açık Tema</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>💰 Para Birimi</label>
          <select className="setting-select">
            <option value="try">₺ Türk Lirası</option>
            <option value="usd">$ Dolar</option>
            <option value="eur">€ Euro</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>📧 Bildirimler</label>
          <div className="toggle-switch">
            <input type="checkbox" id="notifications" defaultChecked />
            <label htmlFor="notifications" className="toggle-label"></label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="settings-content">
      <h3>📊 Raporlar</h3>
      <div className="reports-grid">
        <div className="report-card">
          <div className="report-icon">📈</div>
          <h4>Günlük Satış Raporu</h4>
          <p>Günlük satış verilerini görüntüle</p>
          <button className="report-btn">Raporu Görüntüle</button>
        </div>
        
        <div className="report-card">
          <div className="report-icon">📋</div>
          <h4>Stok Durumu</h4>
          <p>Mevcut stok durumunu incele</p>
          <button className="report-btn">Raporu Görüntüle</button>
        </div>
        
        <div className="report-card">
          <div className="report-icon">👥</div>
          <h4>Personel Raporu</h4>
          <p>Personel performans raporu</p>
          <button className="report-btn">Raporu Görüntüle</button>
        </div>
        
        <div className="report-card">
          <div className="report-icon">💰</div>
          <h4>Mali Durum</h4>
          <p>Gelir-gider analizi</p>
          <button className="report-btn">Raporu Görüntüle</button>
        </div>
      </div>
    </div>
  );

  const renderBackup = () => (
    <div className="settings-content">
      <h3>💾 Yedekleme & Geri Yükleme</h3>
      <div className="backup-section">
        <div className="backup-card">
          <div className="backup-icon">⬇️</div>
          <h4>Verileri Yedekle</h4>
          <p>Tüm sistem verilerini güvenli bir şekilde yedekle</p>
          <button className="backup-btn primary">Yedekleme Başlat</button>
        </div>
        
        <div className="backup-card">
          <div className="backup-icon">⬆️</div>
          <h4>Verileri Geri Yükle</h4>
          <p>Önceki yedeklemelerden verileri geri yükle</p>
          <button className="backup-btn secondary">Geri Yükleme</button>
        </div>
        
        <div className="backup-card">
          <div className="backup-icon">📅</div>
          <h4>Otomatik Yedekleme</h4>
          <p>Günlük otomatik yedekleme ayarları</p>
          <div className="toggle-switch">
            <input type="checkbox" id="autoBackup" defaultChecked />
            <label htmlFor="autoBackup" className="toggle-label"></label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="settings-content">
      <h3>👥 Kullanıcı Yönetimi</h3>
      <div className="users-section">
        <div className="user-actions">
          <button className="action-btn add">➕ Yeni Kullanıcı Ekle</button>
          <button className="action-btn manage">⚙️ Yetkileri Düzenle</button>
          <button className="action-btn departments">🏢 Departmanları Yönet</button>
        </div>
        
        <div className="user-stats">
          <div className="stat-card">
            <div className="stat-number">12</div>
            <div className="stat-label">Toplam Kullanıcı</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">3</div>
            <div className="stat-label">Admin</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">9</div>
            <div className="stat-label">Personel</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'reports': return renderReports();
      case 'backup': return renderBackup();
      case 'users': return renderUsers();
      default: return renderGeneralSettings();
    }
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>⚙️ Sistem Ayarları & Raporlar</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="settings-modal-body">
          <div className="settings-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-title">{tab.title}</span>
              </button>
            ))}
          </div>
          
          <div className="settings-content-area">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
