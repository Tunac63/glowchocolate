import React, { useMemo, useState } from 'react';
import './ProfileModal.css';

const ProfileModal = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  onUpdateProfile 
}) => {
  const POSITION_OPTIONS = [
    'Müdür',
    'Müdür Yardımcısı',
    'Bar Şefi',
    'Salon Şefi',
    'Mutfak Şefi',
    'Bar Koordinatörü',
    'Mutfak Koordinatörü',
    'Salon Koordinatörü',
    'Bulaşıkçı',
    'Barista',
    'Garson',
    'Tatlı Ustası'
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: userProfile?.fullName || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || '',
    department: userProfile?.department || '',
    position: userProfile?.position || ''
  });

  const positionOptions = useMemo(() => {
    const base = [...POSITION_OPTIONS]
    const current = (userProfile?.position || '').trim()
    if (current && !base.includes(current)) base.push(current)
    return base.sort((a,b)=>a.localeCompare(b, 'tr', { sensitivity: 'base' }))
  }, [userProfile?.position])

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await onUpdateProfile(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  const handleCancel = () => {
    setEditData({
      fullName: userProfile?.fullName || '',
      phone: userProfile?.phone || '',
      email: userProfile?.email || '',
      department: userProfile?.department || '',
      position: userProfile?.position || ''
    });
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>👤 Profil Bilgileri</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="profile-modal-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {(userProfile?.fullName || 'U')?.charAt(0)?.toUpperCase()}
            </div>
            <button className="avatar-upload-btn">📷 Fotoğraf Yükle</button>
          </div>

          <div className="profile-info-section">
            <div className="profile-field">
              <label>Ad Soyad</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="profile-input"
                />
              ) : (
                <span className="profile-value">{userProfile?.fullName || 'Belirtilmemiş'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>📞 Telefon</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="profile-input"
                  placeholder="0555 000 00 00"
                />
              ) : (
                <span className="profile-value">{userProfile?.phone || 'Belirtilmemiş'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>📧 Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="profile-input"
                  placeholder="ornek@email.com"
                />
              ) : (
                <span className="profile-value">{userProfile?.email || 'Belirtilmemiş'}</span>
              )}
            </div>

            <div className="profile-field">
              <label>🏢 Departman</label>
              <span className="profile-value">{userProfile?.department ? userProfile.department.toLocaleUpperCase('tr-TR') : 'Belirtilmemiş'}</span>
            </div>

            <div className="profile-field">
              <label>💼 Pozisyon</label>
              {isEditing ? (
                <select
                  className="profile-input profile-select"
                  value={editData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                >
                  <option value="">Pozisyon Seçin</option>
                  {positionOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <span className="profile-value">{userProfile?.position || 'Belirtilmemiş'}</span>
              )}
            </div>
          </div>

          <div className="profile-modal-actions">
            {isEditing ? (
              <>
                <button className="save-button" onClick={handleSave}>
                  💾 Kaydet
                </button>
                <button className="cancel-button" onClick={handleCancel}>
                  ❌ İptal
                </button>
              </>
            ) : (
              <button className="edit-button" onClick={handleEdit}>
                ✏️ Düzenle
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
