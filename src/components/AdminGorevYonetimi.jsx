import React, { useState, useEffect } from 'react';
import './AdminGorevYonetimi.css';

const AdminGorevYonetimi = ({ 
  onClose, 
  onGorevEklendi, 
  onGorevGuncellendi, 
  duzenlenecekGorev = null, 
  gorevler: propGorevler = [] 
}) => {
  const [gorevler, setGorevler] = useState(propGorevler);
  const [showEkleModal, setShowEkleModal] = useState(false);
  const [showDuzenleModal, setShowDuzenleModal] = useState(false);
  const [selectedGorev, setSelectedGorev] = useState(duzenlenecekGorev);
  const [yeniGorev, setYeniGorev] = useState({
    baslik: duzenlenecekGorev?.baslik || '',
    aciklama: duzenlenecekGorev?.aciklama || '',
    altGorevler: duzenlenecekGorev?.altGorevler || []
  });
  const [yeniAltGorev, setYeniAltGorev] = useState('');

  useEffect(() => {
    setGorevler(propGorevler);
  }, [propGorevler]);

  useEffect(() => {
    if (duzenlenecekGorev) {
      setSelectedGorev(duzenlenecekGorev);
      setYeniGorev({
        baslik: duzenlenecekGorev.baslik || '',
        aciklama: duzenlenecekGorev.aciklama || '',
        altGorevler: duzenlenecekGorev.altGorevler || []
      });
      setShowDuzenleModal(true);
    } else {
      setShowEkleModal(true);
    }
  }, [duzenlenecekGorev]);

  const handleGorevEkle = () => {
    if (yeniGorev.baslik && yeniGorev.aciklama && yeniGorev.altGorevler.length > 0) {
      const gorev = {
        id: Date.now(),
        ...yeniGorev,
        durum: "aktif",
        onayDurumu: null
      };
      
      // Parent component'e bildir
      onGorevEklendi(gorev);
      
      // Modal'ı temizle ve kapat
      setYeniGorev({
        baslik: '',
        aciklama: '',
        altGorevler: []
      });
      setShowEkleModal(false);
    }
  };

  const handleGorevSil = (gorevId) => {
    if (window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
      const guncelGorevler = gorevler.filter(g => g.id !== gorevId);
      setGorevler(guncelGorevler);
      localStorage.setItem('glowchocolate_gorevler', JSON.stringify(guncelGorevler));
    }
  };

  const handleGorevDuzenle = (gorev) => {
    setSelectedGorev(gorev);
    setYeniGorev({
      baslik: gorev.baslik,
      aciklama: gorev.aciklama,
      altGorevler: [...gorev.altGorevler]
    });
    setShowDuzenleModal(true);
  };

  const handleGorevGuncelle = () => {
    if (selectedGorev && yeniGorev.baslik && yeniGorev.aciklama && yeniGorev.altGorevler.length > 0) {
      const guncelGorev = { ...selectedGorev, ...yeniGorev };
      
      // Parent component'e bildir
      onGorevGuncellendi(guncelGorev);
      
      // Modal'ı temizle ve kapat
      setSelectedGorev(null);
      setYeniGorev({ baslik: '', aciklama: '', altGorevler: [] });
      setShowDuzenleModal(false);
    }
  };

  const handleAltGorevEkle = () => {
    if (yeniAltGorev.trim()) {
      const altGorev = {
        id: Date.now(),
        baslik: yeniAltGorev.trim(),
        tamamlandi: false
      };
      
      setYeniGorev(prev => ({
        ...prev,
        altGorevler: [...prev.altGorevler, altGorev]
      }));
      
      setYeniAltGorev('');
    }
  };

  const handleAltGorevSil = (altGorevId) => {
    setYeniGorev(prev => ({
      ...prev,
      altGorevler: prev.altGorevler.filter(ag => ag.id !== altGorevId)
    }));
  };

  return (
    <div className="admin-gorev-yonetimi">
      {/* Header */}
      <header className="admin-header">
        <div className="header-left">
          <button className="geri-btn" onClick={onClose}>
            ✕ Kapat
          </button>
          <div className="header-title">
            <h1>⚙️ Admin - Görev Yönetimi</h1>
            <p>Görev ve alt görev yönetimi</p>
          </div>
        </div>
        
        {/* Eğer yeni görev ekleme modunda değilsek butonu göster */}
        {!duzenlenecekGorev && (
          <button 
            className="yeni-gorev-btn"
            onClick={() => setShowEkleModal(true)}
          >
            ➕ Yeni Görev Ekle
          </button>
        )}
      </header>

      {/* Görev Listesi */}
      <main className="admin-main">
        <div className="gorev-listesi">
          {gorevler.length === 0 ? (
            <div className="bos-durum">
              <div className="bos-ikon">📋</div>
              <h3>Henüz Görev Yok</h3>
              <p>Yeni görev ekleyerek başlayın</p>
            </div>
          ) : (
            gorevler.map(gorev => (
              <div key={gorev.id} className="admin-gorev-karti">
                <div className="gorev-header">
                  <h3>{gorev.baslik}</h3>
                  <div className="gorev-actions">
                    <button 
                      className="duzenle-btn"
                      onClick={() => handleGorevDuzenle(gorev)}
                      title="Düzenle"
                    >
                      ✏️
                    </button>
                    <button 
                      className="sil-btn"
                      onClick={() => handleGorevSil(gorev.id)}
                      title="Sil"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <p className="gorev-aciklama">{gorev.aciklama}</p>
                
                <div className="alt-gorevler">
                  <h4>Alt Görevler ({gorev.altGorevler.length}):</h4>
                  <div className="alt-gorev-listesi">
                    {gorev.altGorevler.map(altGorev => (
                      <div key={altGorev.id} className="alt-gorev-item">
                        <span className="alt-gorev-baslik">{altGorev.baslik}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Görev Ekleme Modalı */}
      {showEkleModal && (
        <div className="modal-overlay">
          <div className="gorev-modal">
            <div className="modal-header">
              <h3>➕ Yeni Görev Ekle</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowEkleModal(false);
                  setYeniGorev({ baslik: '', aciklama: '', altGorevler: [] });
                  setYeniAltGorev('');
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Görev Başlığı:</label>
                <input
                  type="text"
                  value={yeniGorev.baslik}
                  onChange={(e) => setYeniGorev(prev => ({ ...prev, baslik: e.target.value }))}
                  placeholder="Görev başlığını girin..."
                />
              </div>
              
              <div className="form-group">
                <label>Görev Açıklaması:</label>
                <textarea
                  value={yeniGorev.aciklama}
                  onChange={(e) => setYeniGorev(prev => ({ ...prev, aciklama: e.target.value }))}
                  placeholder="Görev açıklamasını girin..."
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Alt Görevler:</label>
                <div className="alt-gorev-ekle">
                  <input
                    type="text"
                    value={yeniAltGorev}
                    onChange={(e) => setYeniAltGorev(e.target.value)}
                    placeholder="Alt görev başlığı..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAltGorevEkle()}
                  />
                  <button onClick={handleAltGorevEkle}>Ekle</button>
                </div>
                
                <div className="alt-gorev-listesi">
                  {yeniGorev.altGorevler.map(altGorev => (
                    <div key={altGorev.id} className="alt-gorev-item">
                      <span>{altGorev.baslik}</span>
                      <button 
                        className="sil-btn"
                        onClick={() => handleAltGorevSil(altGorev.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="iptal-btn"
                onClick={() => {
                  setShowEkleModal(false);
                  setYeniGorev({ baslik: '', aciklama: '', altGorevler: [] });
                  setYeniAltGorev('');
                }}
              >
                İptal
              </button>
              <button 
                className="kaydet-btn"
                onClick={handleGorevEkle}
                disabled={!yeniGorev.baslik || !yeniGorev.aciklama || yeniGorev.altGorevler.length === 0}
              >
                Görevi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Görev Düzenleme Modalı */}
      {showDuzenleModal && (
        <div className="modal-overlay">
          <div className="gorev-modal">
            <div className="modal-header">
              <h3>✏️ Görev Düzenle</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowDuzenleModal(false);
                  setSelectedGorev(null);
                  setYeniGorev({ baslik: '', aciklama: '', altGorevler: [] });
                  setYeniAltGorev('');
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Görev Başlığı:</label>
                <input
                  type="text"
                  value={yeniGorev.baslik}
                  onChange={(e) => setYeniGorev(prev => ({ ...prev, baslik: e.target.value }))}
                  placeholder="Görev başlığını girin..."
                />
              </div>
              
              <div className="form-group">
                <label>Görev Açıklaması:</label>
                <textarea
                  value={yeniGorev.aciklama}
                  onChange={(e) => setYeniGorev(prev => ({ ...prev, aciklama: e.target.value }))}
                  placeholder="Görev açıklamasını girin..."
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Alt Görevler:</label>
                <div className="alt-gorev-ekle">
                  <input
                    type="text"
                    value={yeniAltGorev}
                    onChange={(e) => setYeniAltGorev(e.target.value)}
                    placeholder="Alt görev başlığı..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAltGorevEkle()}
                  />
                  <button onClick={handleAltGorevEkle}>Ekle</button>
                </div>
                
                <div className="alt-gorev-listesi">
                  {yeniGorev.altGorevler.map(altGorev => (
                    <div key={altGorev.id} className="alt-gorev-item">
                      <span>{altGorev.baslik}</span>
                      <button 
                        className="sil-btn"
                        onClick={() => handleAltGorevSil(altGorev.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="iptal-btn"
                onClick={() => {
                  setShowDuzenleModal(false);
                  setSelectedGorev(null);
                  setYeniGorev({ baslik: '', aciklama: '', altGorevler: [] });
                  setYeniAltGorev('');
                }}
              >
                İptal
              </button>
              <button 
                className="kaydet-btn"
                onClick={handleGorevGuncelle}
                disabled={!yeniGorev.baslik || !yeniGorev.aciklama || yeniGorev.altGorevler.length === 0}
              >
                Değişiklikleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGorevYonetimi;
