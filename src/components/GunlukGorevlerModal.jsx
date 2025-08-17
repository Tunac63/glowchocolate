import React, { useState, useEffect } from 'react';
import './GunlukGorevlerModal.css';

const GunlukGorevlerModal = ({ 
  isOpen, 
  onClose,
  userProfile 
}) => {
  const [gorevler, setGorevler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGorev, setSelectedGorev] = useState(null);

  // Örnek görev verileri (Firebase'den gelecek)
  const ornekGorevler = [
    {
      id: 1,
      baslik: "Günlük Temizlik",
      aciklama: "Çalışma alanının günlük temizlik görevleri",
      durum: "aktif",
      altGorevler: [
        { id: 11, baslik: "Masaları temizle", tamamlandi: false },
        { id: 12, baslik: "Zemini sil", tamamlandi: false },
        { id: 13, baslik: "Çöpleri boşalt", tamamlandi: true },
        { id: 14, baslik: "Ekipmanları düzenle", tamamlandi: false }
      ],
      onayDurumu: null // null, "bekliyor", "onaylandi", "reddedildi"
    },
    {
      id: 2,
      baslik: "Stok Kontrol",
      aciklama: "Günlük stok sayım ve kontrol işlemleri",
      durum: "aktif",
      altGorevler: [
        { id: 21, baslik: "Hammadde sayımı", tamamlandi: true },
        { id: 22, baslik: "Bitmiş ürün kontrolü", tamamlandi: true },
        { id: 23, baslik: "Eksik malzeme listesi", tamamlandi: true }
      ],
      onayDurumu: "bekliyor"
    },
    {
      id: 3,
      baslik: "Müşteri Hizmetleri",
      aciklama: "Günlük müşteri takip ve hizmet görevleri",
      durum: "aktif",
      altGorevler: [
        { id: 31, baslik: "Sabah müşteri karşılama", tamamlandi: true },
        { id: 32, baslik: "Sipariş alma", tamamlandi: false },
        { id: 33, baslik: "Müşteri memnuniyet anketi", tamamlandi: false }
      ],
      onayDurumu: null
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setGorevler(ornekGorevler);
    }
  }, [isOpen]);

  const handleAltGorevToggle = (gorevId, altGorevId) => {
    setGorevler(prev => prev.map(gorev => {
      if (gorev.id === gorevId) {
        const yeniAltGorevler = gorev.altGorevler.map(altGorev => {
          if (altGorev.id === altGorevId) {
            return { ...altGorev, tamamlandi: !altGorev.tamamlandi };
          }
          return altGorev;
        });
        return { ...gorev, altGorevler: yeniAltGorevler };
      }
      return gorev;
    }));
  };

  const isGorevTamamlanabilir = (gorev) => {
    return gorev.altGorevler.every(altGorev => altGorev.tamamlandi);
  };

  const handleGorevTamamla = (gorevId) => {
    setGorevler(prev => prev.map(gorev => {
      if (gorev.id === gorevId) {
        return { ...gorev, onayDurumu: "bekliyor" };
      }
      return gorev;
    }));
    
    // Burada Firebase'e kayıt işlemi yapılacak
    console.log(`Görev ${gorevId} tamamlandı ve admin onayına gönderildi`);
  };

  const getOnayDurumuRenk = (durum) => {
    switch (durum) {
      case "bekliyor": return "#ffc107";
      case "onaylandi": return "#28a745";
      case "reddedildi": return "#dc3545";
      default: return "#6c757d";
    }
  };

  const getOnayDurumuText = (durum) => {
    switch (durum) {
      case "bekliyor": return "⏳ Onay Bekliyor";
      case "onaylandi": return "✅ Onaylandı";
      case "reddedildi": return "❌ Reddedildi";
      default: return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="gorevler-modal-overlay" onClick={onClose}>
      <div className="gorevler-modal" onClick={e => e.stopPropagation()}>
        <div className="gorevler-modal-header">
          <div className="modal-icon">📋</div>
          <h2>Günlük Görevler</h2>
          <p>Günlük görev atamaları ve takibi</p>
          <button className="modal-close" onClick={onClose}>←</button>
        </div>
        
        <div className="gorevler-modal-content">
          {loading ? (
            <div className="loading-message">Görevler yükleniyor...</div>
          ) : (
            <div className="gorevler-listesi">
              {gorevler.map(gorev => (
                <div key={gorev.id} className="gorev-karti">
                  <div className="gorev-header">
                    <h3>{gorev.baslik}</h3>
                    <div className="gorev-durum">
                      {gorev.onayDurumu && (
                        <span 
                          className="onay-durumu"
                          style={{ backgroundColor: getOnayDurumuRenk(gorev.onayDurumu) }}
                        >
                          {getOnayDurumuText(gorev.onayDurumu)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="gorev-aciklama">{gorev.aciklama}</p>
                  
                  <div className="alt-gorevler">
                    <h4>Alt Görevler:</h4>
                    <div className="alt-gorev-listesi">
                      {gorev.altGorevler.map(altGorev => (
                        <div 
                          key={altGorev.id} 
                          className={`alt-gorev-item ${altGorev.tamamlandi ? 'tamamlandi' : ''}`}
                          onClick={() => {
                            if (gorev.onayDurumu !== "bekliyor" && gorev.onayDurumu !== "onaylandi") {
                              handleAltGorevToggle(gorev.id, altGorev.id);
                            }
                          }}
                        >
                          <div className="checkbox">
                            {altGorev.tamamlandi ? '✓' : '○'}
                          </div>
                          <span className="alt-gorev-baslik">{altGorev.baslik}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="gorev-actions">
                    <div className="ilerleme-bar">
                      <div className="ilerleme-text">
                        İlerleme: {gorev.altGorevler.filter(ag => ag.tamamlandi).length}/{gorev.altGorevler.length}
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${(gorev.altGorevler.filter(ag => ag.tamamlandi).length / gorev.altGorevler.length) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    <button 
                      className={`gorev-tamamla-btn ${
                        isGorevTamamlanabilir(gorev) && !gorev.onayDurumu ? 'aktif' : 'pasif'
                      }`}
                      disabled={!isGorevTamamlanabilir(gorev) || gorev.onayDurumu}
                      onClick={() => handleGorevTamamla(gorev.id)}
                    >
                      {gorev.onayDurumu === "bekliyor" ? "⏳ Onay Bekliyor" :
                       gorev.onayDurumu === "onaylandi" ? "✅ Tamamlandı" :
                       gorev.onayDurumu === "reddedildi" ? "❌ Reddedildi" :
                       isGorevTamamlanabilir(gorev) ? "🎯 Görevi Tamamla" : "⚠️ Alt Görevleri Tamamla"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GunlukGorevlerModal;
