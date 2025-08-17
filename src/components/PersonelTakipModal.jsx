import React from 'react';
import './PersonelTakipModal.css';

const PersonelTakipModal = ({ 
  isOpen, 
  onClose,
  userProfile,
  onOpenGorevler,
  onOpenMesaiTakip,
  onOpenMola
}) => {
  if (!isOpen) return null;

  const handleOptionClick = (option) => {
    console.log(`${option} seçeneği seçildi`);
    
    if (option === 'gunluk-gorevler') {
      onOpenGorevler(); // Dashboard'daki fonksiyonu çağır
    } else if (option === 'mesaiye-geldim') {
      onOpenMesaiTakip(); // Mesai takip sayfasını aç
    } else if (option === 'mola-ver') {
      onOpenMola?.()
    } else {
      // Diğer seçenekler için işlemler
      onClose();
    }
  };

  return (
    <div className="personel-modal-overlay" onClick={onClose}>
      <div className="personel-modal" onClick={e => e.stopPropagation()}>
        <div className="personel-modal-header">
          <div className="modal-icon">👥</div>
          <h2>Personel Takibi</h2>
          <p>Personel yönetimi</p>
          <button className="modal-close" aria-label="Geri" title="Geri" onClick={onClose}>←</button>
        </div>
        
        <div className="personel-modal-content">
          <div className="personel-options">
            <div 
              className="personel-option"
              onClick={() => handleOptionClick('mesaiye-geldim')}
            >
              <div className="option-icon">🟢</div>
              <div className="option-content">
                <h3>Mesaiye Geldim</h3>
                <p>Mesai başlangıç saatini kaydet</p>
              </div>
              <div className="option-arrow">→</div>
            </div>
            
            <div 
              className="personel-option"
              onClick={() => handleOptionClick('gunluk-gorevler')}
            >
              <div className="option-icon">📋</div>
              <div className="option-content">
                <h3>Günlük Görevler</h3>
                <p>Günlük görev atamaları ve takibi</p>
              </div>
              <div className="option-arrow">→</div>
            </div>
            
            <div 
              className="personel-option"
              onClick={() => handleOptionClick('mola-ver')}
            >
              <div className="option-icon">☕</div>
              <div className="option-content">
                <h3>Mola Ver</h3>
                <p>Mola saatlerini kaydet ve takip et</p>
              </div>
              <div className="option-arrow">→</div>
            </div>
            
            <div 
              className="personel-option"
              onClick={() => handleOptionClick('performans')}
            >
              <div className="option-icon">📊</div>
              <div className="option-content">
                <h3>Performans</h3>
                <p>Personel performans değerlendirmesi</p>
              </div>
              <div className="option-arrow">→</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonelTakipModal;
