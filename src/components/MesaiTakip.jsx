import React, { useState, useEffect } from 'react';
import './MesaiTakip.css';
import MesaiDetayModal from './MesaiDetayModal';
import GroupListModal from './GroupListModal';
import CenterNotice from './CenterNotice';
import {
  mesaiPunchIn,
  mesaiPunchOut,
  mesaiMarkAbsent,
  mesaiSetOvertime,
  mesaiReset,
  getAttendanceByUserAndDate,
  listenAttendanceForDate,
  getAllActiveUsers
} from '../firebase/database';

const MesaiTakip = ({ userProfile, onBack }) => {
  const [mesaiDurumu, setMesaiDurumu] = useState(null);
  const [mesaiSaatleri, setMesaiSaatleri] = useState({
    gelisSaati: null,
    cikisSaati: null
  });
  const [bugununDurumu, setBugununDurumu] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [otomatikKapatmaSaati, setOtomatikKapatmaSaati] = useState(null);
  const [gunIciKayitlar, setGunIciKayitlar] = useState([]);
  const [tumAktifKullanicilar, setTumAktifKullanicilar] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [detayAcil, setDetayAcil] = useState(false);
  const [detayKayit, setDetayKayit] = useState(null);
  const [grupModal, setGrupModal] = useState({ open: false, type: null, items: [] })
  const [notice, setNotice] = useState({ open: false, icon: '🎉', title: '', subtitle: '' })
  const [aktifKayitTarihi, setAktifKayitTarihi] = useState(null)
  const [gunKilitli, setGunKilitli] = useState(false)
  const [lastAction, setLastAction] = useState(null) // 'in' | 'out' | 'absent' | 'overtime'
  const autoCloseTimerRef = React.useRef(null)

  // Seçili tarihe göre işletme panosu verilerini topla
  useEffect(() => {
    let unsubscribe = null
    // 1) Aktif kullanıcıları getir (tüm kullanıcılar listesi)
    ;(async () => {
      const res = await getAllActiveUsers()
      if (res?.success) setTumAktifKullanicilar(res.users || [])
    })()
    // 2) Seçili tarih için realtime dinle
    unsubscribe = listenAttendanceForDate(selectedDate, (items) => {
      setGunIciKayitlar(items || [])
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [selectedDate])

  const getTodayLocalISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  useEffect(() => {
    loadMesaiDurumu(selectedDate);
  }, [selectedDate, userProfile]);

  const loadMesaiDurumu = async (tarih, opts = {}) => {
    const { keepIfMissing = false } = opts
    if (!userProfile?.uid) return;
    const res = await getAttendanceByUserAndDate(userProfile.uid, tarih)
    if (res.success && res.data) {
      const d = res.data
      setAktifKayitTarihi(d.date || tarih)
  // Gün kilidi: eğer çıkış yapılmışsa aynı gün yeniden giriş kapalı
  setGunKilitli(Boolean(d?.leftAt) || d?.status === 'out')
      const gelis = d.arrivedAt?.clientTime || null
      const cikis = d.leftAt?.clientTime || null
      const mapStatus = (
        d.status === 'in' || d.status === 'in_overtime'
      ) ? 'geldim' : d.status === 'out' ? 'kaldim' : d.status === 'absent' ? 'gelmedim' : null
      setBugununDurumu({ durum: mapStatus, gelisSaati: gelis, cikisSaati: cikis })
      setMesaiSaatleri({ gelisSaati: gelis, cikisSaati: cikis })
      if (gelis && !cikis) {
        const gDate = new Date(`${tarih}T${gelis}`)
        const auto = new Date(gDate.getTime() + 9.5 * 3600 * 1000)
        setOtomatikKapatmaSaati(auto.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      } else {
        setOtomatikKapatmaSaati(null)
      }
    } else {
      if (!keepIfMissing) {
        setBugununDurumu(null)
        setMesaiSaatleri({ gelisSaati: null, cikisSaati: null })
        setOtomatikKapatmaSaati(null)
        setAktifKayitTarihi(null)
  setGunKilitli(false)
      }
    }
  };

  const handleMesaiGeldim = async () => {
    setActionError(null)
  setLastAction('in')
    if (!userProfile?.uid) {
      setActionError('Profil eksik (UID). Lütfen çıkış yapıp tekrar giriş yapın.');
      return;
    }
    setActionLoading(true)
  // Optimistic UI: hemen "geldim" olarak ayarla; başarısız olursa geri alacağız.
  const prevDurum = bugununDurumu
  const prevSaat = mesaiSaatleri
  const now0 = new Date()
  const tStr0 = now0.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  setBugununDurumu({ durum: 'geldim', gelisSaati: tStr0, cikisSaati: null })
  setMesaiSaatleri({ gelisSaati: tStr0, cikisSaati: null })
  const auto0 = new Date(now0.getTime() + 9.5 * 3600 * 1000)
  setOtomatikKapatmaSaati(auto0.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  setNotice({ open: true, icon: '👋', title: `Hoş geldin ${userProfile?.firstName || userProfile?.fullName?.split(' ')[0] || ''}!`, subtitle: 'Güzel bir mesai olsun.' })
    // Konum alma (isteğe bağlı): kullanıcı izin verirse GPS + ters geocode
    let location = null
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        })
      })
      const { latitude, longitude } = pos.coords
      // Basit reverse geocode (opsiyonel; internet gerekir)
      let addressText = null
      try {
        const ctrl = new AbortController()
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        const to = setTimeout(() => ctrl.abort(), 2500)
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctrl.signal })
        clearTimeout(to)
        if (resp.ok) {
          const data = await resp.json()
          addressText = data?.display_name || null
        }
      } catch {}
      location = { lat: latitude, lon: longitude, address: addressText }
    } catch (e) {
      setNotice({ open: true, icon: 'ℹ️', title: 'Konum alınamadı', subtitle: 'İzin verilmedi veya zaman aşımı. Kayıt yine de alındı.' })
    }

    try {
      const res = await mesaiPunchIn({
        uid: userProfile?.uid,
        email: userProfile?.email,
        fullName: userProfile?.fullName,
        department: userProfile?.department,
        position: userProfile?.position
      }, selectedDate, location)
      if (!res?.success) {
        throw new Error(res?.error || 'Kayıt başarısız')
      }
      setAktifKayitTarihi(selectedDate)
      // İlk kısa gecikmeyle senkronize etmeyi dene (optimistic bozulmasın)
      setTimeout(() => loadMesaiDurumu(selectedDate, { keepIfMissing: true }), 600)
      // Biraz daha sonra kesin senkron
      setTimeout(() => loadMesaiDurumu(selectedDate), 1600)
    } catch (e) {
      setActionError(`Kayıt alınamadı: ${e?.message || e}`)
  // Geri al
  setBugununDurumu(prevDurum || null)
  setMesaiSaatleri(prevSaat || { gelisSaati: null, cikisSaati: null })
    } finally {
      setActionLoading(false)
    }
  };

  const handleMesaiKaldim = async () => {
    setActionError(null)
  setLastAction('out')
    setActionLoading(true)
    const cikisTarihi = aktifKayitTarihi || selectedDate
    // Çıkış için konum alma (isteğe bağlı)
    let outLocation = null
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        })
      })
      const { latitude, longitude } = pos.coords
      let addressText = null
      try {
        const ctrl = new AbortController()
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        const to = setTimeout(() => ctrl.abort(), 2500)
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: ctrl.signal })
        clearTimeout(to)
        if (resp.ok) {
          const data = await resp.json()
          addressText = data?.display_name || null
        }
      } catch {}
      outLocation = { lat: latitude, lon: longitude, address: addressText }
    } catch (e) {
      setNotice({ open: true, icon: 'ℹ️', title: 'Konum alınamadı', subtitle: 'İzin verilmedi veya zaman aşımı. Kayıt yine de alındı.' })
    }
    try {
      const res = await mesaiPunchOut({
        uid: userProfile?.uid,
        email: userProfile?.email,
        fullName: userProfile?.fullName,
        department: userProfile?.department,
        position: userProfile?.position
      }, cikisTarihi, outLocation)
      if (!res?.success) throw new Error(res?.error || 'Çıkış kaydı başarısız')
      await loadMesaiDurumu(cikisTarihi)
      setNotice({ open: true, icon: '🙏', title: 'Güle güle', subtitle: 'Emeğin için teşekkürler.' })
    } catch (e) {
      setActionError(`Çıkış alınamadı: ${e?.message || e}`)
    } finally {
      setActionLoading(false)
    }
  };

  // Otomatik kapanış (9.5 saat sonra)
  useEffect(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
    const durum = bugununDurumu?.durum
    const gelis = bugununDurumu?.gelisSaati
    const cikis = bugununDurumu?.cikisSaati
    const baseDate = aktifKayitTarihi || selectedDate
    if (durum === 'geldim' && gelis && !cikis && baseDate) {
      const start = new Date(`${baseDate}T${gelis}`)
      const deadline = new Date(start.getTime() + 9.5 * 3600 * 1000)
      const wait = deadline.getTime() - Date.now()
      if (wait <= 0) {
        // Süre dolmuş, hemen kapatmayı dene
        autoCloseNow()
      } else {
        autoCloseTimerRef.current = setTimeout(() => {
          autoCloseNow()
        }, wait)
      }
    }
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
    }
  }, [bugununDurumu?.durum, bugununDurumu?.gelisSaati, bugununDurumu?.cikisSaati, aktifKayitTarihi, selectedDate])

  const autoCloseNow = async () => {
    try {
      const cikisTarihi = aktifKayitTarihi || selectedDate
      await mesaiPunchOut({
        uid: userProfile?.uid,
        email: userProfile?.email,
        fullName: userProfile?.fullName,
        department: userProfile?.department,
        position: userProfile?.position
      }, cikisTarihi, null)
      await loadMesaiDurumu(cikisTarihi)
      setNotice({ open: true, icon: '⏰', title: 'Otomatik Kapatıldı', subtitle: '9,5 saat dolduğu için mesai kapatıldı.' })
    } catch (e) {
      // Sessiz; bir sonraki kullanıcı etkileşiminde kapanabilir
    }
  }

  const retryLastAction = () => {
    if (lastAction === 'in') return handleMesaiGeldim()
    if (lastAction === 'out') return handleMesaiKaldim()
    if (lastAction === 'absent') return handleBugunGelmedim()
    if (lastAction === 'overtime') {
      const otTarih = aktifKayitTarihi || selectedDate
      return mesaiSetOvertime({
        uid: userProfile?.uid,
        email: userProfile?.email,
        fullName: userProfile?.fullName,
        department: userProfile?.department,
        position: userProfile?.position
      }, otTarih).then(() => loadMesaiDurumu(otTarih))
    }
  }

  const handleBugunGelmedim = async () => {
    setActionError(null)
    setActionLoading(true)
    await mesaiMarkAbsent({
      uid: userProfile?.uid,
      email: userProfile?.email,
      fullName: userProfile?.fullName,
      department: userProfile?.department,
      position: userProfile?.position
    }, selectedDate)
    await loadMesaiDurumu(selectedDate)
    setActionLoading(false)
  };

  const getMesaiDurumText = (durum) => {
    switch (durum?.durum) {
      case 'geldim': return '🟢 Mesaide';
      case 'kaldim': return '🔴 Mesai Bitti';
      case 'gelmedim': return '❌ Bugün Gelmedi';
      default: return '⚪ Kayıt Yok';
    }
  };

  const getMesaiSuresi = () => {
    if (bugununDurumu?.gelisSaati && bugununDurumu?.cikisSaati) {
      const gelis = new Date(`2000-01-01 ${bugununDurumu.gelisSaati}`);
      const cikis = new Date(`2000-01-01 ${bugununDurumu.cikisSaati}`);
      const fark = cikis - gelis;
      const saat = Math.floor(fark / (1000 * 60 * 60));
      const dakika = Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60));
      return `${saat}s ${dakika}dk`;
    }
    return null;
  };

  const formatTarih = (tarih) => {
    const date = new Date(tarih);
    return date.toLocaleDateString('tr-TR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="mesai-takip-container">
      {/* Header */}
      <header className="mesai-header">
        <div className="header-left">
          <button className="geri-btn" onClick={onBack}>
            ← Geri
          </button>
          <div className="header-title">
            <h1>Mesai Takip</h1>
            <p>{userProfile?.name || userProfile?.fullName || 'Kullanıcı'} - {String(userProfile?.department || 'Departman').toLocaleUpperCase('tr-TR')}</p>
          </div>
        </div>
        
        <div className="date-picker-container">
          <label>Tarih:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getTodayLocalISO()}
            className="date-picker-input"
          />
          <button 
            className="bugun-btn"
            onClick={() => setSelectedDate(getTodayLocalISO())}
          >
            Bugün
          </button>
        </div>
        
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-number">08:30</div>
            <div className="stat-label">İşletme Açılış</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">23:45</div>
            <div className="stat-label">İşletme Kapanış</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mesai-main">
        <div className="user-info-bar">
          <div className="user-avatar">
            {userProfile?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <h3>{userProfile?.fullName || 'Kullanıcı'}</h3>
            <p>{String(userProfile?.department || 'Departman').toLocaleUpperCase('tr-TR')} - {String(userProfile?.position || 'Pozisyon').toLocaleUpperCase('tr-TR')}</p>
          </div>
          <div className="tarih-info">
            <div className="tarih">{formatTarih(selectedDate)}</div>
          </div>
        </div>

        {/* Mesai Durum Kartı */}
        <div className="mesai-durum-karti">
          <h3>📊 Mesai Durumu</h3>

          {/* Mesai Butonları - Durum detayının üstünde */}
          <div className="mesai-butonlari">
            {bugununDurumu?.durum === 'geldim' ? (
              <button 
                className="mesai-btn kaldim-btn"
                onClick={handleMesaiKaldim}
              >
                <div className="btn-icon">🛑</div>
                <div className="btn-content">
                  <h4>Mesaiyi Bitirdim</h4>
                  <p>Çıkış saatini kaydet ve mesaiyi kapat.</p>
                </div>
              </button>
            ) : (
              <button 
                className="mesai-btn geldim-btn"
                onClick={handleMesaiGeldim}
                disabled={gunKilitli || bugununDurumu?.durum === 'gelmedim' || actionLoading}
                title={gunKilitli ? 'Bugün çıkış alınmış, yeniden giriş kilitli.' : 'Geliş saatini kaydeder. 9,5 saat sonra otomatik kapanış uyarısı.'}
              >
                <div className="btn-icon">🟢</div>
                <div className="btn-content">
                  <h4>Mesaiye Geldim</h4>
                  <p>{actionLoading ? 'Kaydediliyor...' : gunKilitli ? 'Bugün için giriş kapalı (çıkış alınmış).' : 'Başlangıcı kaydet. 9.5 saat sonra otomatik kapanır.'}</p>
                </div>
              </button>
            )}
      {actionError && (
              <div style={{gridColumn:'1 / -1', color:'#b94a48'}}>
        {actionError}
        <button className="bugun-btn" style={{marginLeft:10}} onClick={retryLastAction}>Tekrar Dene</button>
              </div>
            )}
            {bugununDurumu?.durum === 'gelmedim' && (
              <div style={{gridColumn:'1 / -1', color:'#856404'}}>
                Bu günde 'Bugün Gelmedim' kaydı var. Gerekirse kaydı sıfırlayabilirsin.
                <button 
                  className="bugun-btn" 
                  style={{marginLeft:10}}
                  onClick={async () => {
                    await mesaiReset({ uid: userProfile?.uid }, selectedDate)
                    await loadMesaiDurumu(selectedDate)
                  }}
                >Kaydı Sıfırla</button>
              </div>
            )}

            <button 
              className="mesai-btn kaldim-btn"
              onClick={async () => {
                const otTarih = aktifKayitTarihi || selectedDate
                await mesaiSetOvertime({
                  uid: userProfile?.uid,
                  email: userProfile?.email,
                  fullName: userProfile?.fullName,
                  department: userProfile?.department,
                  position: userProfile?.position
                }, otTarih)
                await loadMesaiDurumu(otTarih)
              }}
              disabled={bugununDurumu?.durum !== 'geldim'}
            >
              <div className="btn-icon">⏱️</div>
              <div className="btn-content">
                <h4>Mesaiye Kaldım</h4>
                <p>9.5 saat sonrası için uzat. Kapanışı ayrı alttan yap.</p>
              </div>
            </button>

            <button 
              className="mesai-btn gelmedim-btn"
              onClick={handleBugunGelmedim}
              disabled={bugununDurumu?.durum === 'gelmedim' || bugununDurumu?.gelisSaati}
            >
              <div className="btn-icon">❌</div>
              <div className="btn-content">
                <h4>Bugün Gelmedim</h4>
                <p>Bugün mesaiye gelmediğimi kaydet. Diğer seçenekler pasif olur.</p>
              </div>
            </button>
          </div>

          <div className="durum-detay">
            <div className="durum-badge">
              {getMesaiDurumText(bugununDurumu)}
            </div>
            
            {bugununDurumu && (
              <div className="saat-bilgileri">
                {bugununDurumu.gelisSaati && (
                  <div className="saat-item">
                    <span className="saat-label">🟢 Geliş:</span>
                    <span className="saat-value">{bugununDurumu.gelisSaati}</span>
                  </div>
                )}
                {bugununDurumu.cikisSaati && (
                  <div className="saat-item">
                    <span className="saat-label">🔴 Çıkış:</span>
                    <span className="saat-value">{bugununDurumu.cikisSaati}</span>
                  </div>
                )}
                {otomatikKapatmaSaati && !bugununDurumu.cikisSaati && (
                  <div className="saat-item otomatik">
                    <span className="saat-label">⏰ Otomatik Çıkış:</span>
                    <span className="saat-value">{otomatikKapatmaSaati}</span>
                  </div>
                )}
                {getMesaiSuresi() && (
                  <div className="saat-item">
                    <span className="saat-label">⏱️ Toplam:</span>
                    <span className="saat-value">{getMesaiSuresi()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bilgi Mesajı */}
        <div className="bilgi-mesaji">
          <h4>ℹ️ Önemli Bilgiler:</h4>
          <ul>
            <li>Mesai kayıtları günlük olarak tutulur</li>
            <li>Mesaiye geldikten 9.5 saat sonra otomatik kapatma uyarısı</li>
            <li>Bir kez kaydedilen durum değiştirilemez</li>
            <li>Mesaiye geldikten sonra çıkış yapabilirsiniz</li>
            <li>Bugün gelmediğinizi işaretlerseniz diğer seçenekler pasif olur</li>
            <li>Giriş/çıkış sırasında konum izni istenir; doğru kayıt için izin vermeniz önerilir</li>
          </ul>
        </div>
      </main>
      {/* İşletme Durum Panosu */}
      <main className="mesai-main">
        <div className="mesai-durum-karti">
          <h3>🏪 İşletme Durum Panosu</h3>
          {/* Gruplama hesaplamaları */}
          {(() => {
            const byUid = new Map(gunIciKayitlar.map(r => [r.uid, r]))
            const inside = [] // status: in | in_overtime
            const absent = [] // status: absent
            const outside = [] // aktif kullanıcı olup inside/absent olmayanlar (out ya da hiç kaydı yok)

            // İçerde ve Gelmeyenleri, kayıtlarından belirle
            for (const rec of gunIciKayitlar) {
              if (rec.status === 'in' || rec.status === 'in_overtime') inside.push(rec)
              else if (rec.status === 'absent') absent.push(rec)
            }
            // Dışarda olanlar = tüm aktif kullanıcılar - (içerde ∪ gelmeyen)
            for (const u of tumAktifKullanicilar) {
              const rec = byUid.get(u.uid)
              if (rec) {
                if (rec.status === 'in' || rec.status === 'in_overtime' || rec.status === 'absent') continue
                // Kayıt var ve 'out' vb.: tüm kaydı kullan (arrivedAt dahil)
                outside.push(rec)
              } else {
                // hiç kaydı yoksa bugün dışarda say
                outside.push({
                  uid: u.uid,
                  fullName: u.fullName || (u.firstName + ' ' + (u.lastName || '')),
                  department: u.department,
                  position: u.position,
                  leftAt: null,
                  arrivedAtLocation: null,
                  status: 'no_record'
                })
              }
            }

            // Basit metin filtresi (ad, departman, pozisyon)
            const [filterText, setFilterText] = [null, null]
            // Not: Basit olması için local scope'ta input bağlamıyoruz; istenirse state'e alınabilir.

      const userRow = (item, dot = 'gray', type = 'outside') => {
              const dep = String(item.department || '').toLocaleUpperCase('tr-TR')
              const pos = String(item.position || '').toLocaleUpperCase('tr-TR')
              const loc = type === 'outside' ? (item.leftAtLocation || item.arrivedAtLocation) : item.arrivedAtLocation
              const addr = loc?.address
              const shortAddr = addr ? addr.split(',').slice(0,3).join(', ') : null
              const mapUrl = loc?.lat && loc?.lon
                ? `https://www.google.com/maps?q=${loc.lat},${loc.lon}`
                : null
              const chips = []
              if (type === 'inside') {
                if (item.status === 'in_overtime') chips.push(<span className="chip overtime" key="ot">fazla mesai</span>)
                if (item.arrivedAt?.clientTime) chips.push(<span className="chip" key="in">Geliş: {item.arrivedAt.clientTime}</span>)
              }
              if (type === 'outside') {
                chips.push(<span className="chip" key="out">Çıkış: {item.leftAt?.clientTime || '—'}</span>)
                if (item.status === 'no_record') chips.push(<span className="chip warn" key="nr">kayıt yok</span>)
                if (loc) {
                  const locLabel = item.leftAtLocation ? 'Çıkış konumu' : 'Giriş konumu'
                  chips.push(<span className="chip" key="loc">{locLabel}</span>)
                }
              }
              return (
        <div className="user-row" key={item.uid || item.id} onClick={() => { setDetayKayit(item); setDetayAcil(true); }} style={{cursor:'pointer'}}>
                  <div className={`user-dot ${dot}`} />
                  <div className="user-info">
                    <div className="user-name">{item.fullName}</div>
                    <div className="user-meta">{dep}{pos ? ` / ${pos}` : ''}{shortAddr ? ` · ${shortAddr}` : ''} {mapUrl && <a className="map-link" href={mapUrl} target="_blank" rel="noreferrer">harita</a>}</div>
                    {chips.length > 0 && <div className="chips">{chips}</div>}
                  </div>
                </div>
              )
            }

            return (
              <div>
                {/* Detaylı sütunlar */}
                <div className="panel-columns">
                  <div className="panel-card">
                    <div className="panel-card-header">
                      <span className="btn-icon">🟢</span>
                      <button className="title" style={{background:'transparent',border:0,cursor:'pointer',padding:0}}
                        onClick={() => setGrupModal({ open: true, type: 'inside', items: inside, title: 'İçerde Olanlar' })}
                      >İçerde Olanlar</button>
                      <span className="count">{inside.length}</span>
                    </div>
                    <div className="list-scroll">
                      {inside.length === 0 ? (
                        <div className="empty-state">Yok</div>
                      ) : (
                        inside.map(r => userRow(r, 'green', 'inside'))
                      )}
                    </div>
                  </div>

                  <div className="panel-card">
                    <div className="panel-card-header">
                      <span className="btn-icon">🔴</span>
                      <button className="title" style={{background:'transparent',border:0,cursor:'pointer',padding:0}}
                        onClick={() => setGrupModal({ open: true, type: 'outside', items: outside, title: 'Dışarda Olanlar' })}
                      >Dışarda Olanlar</button>
                      <span className="count">{outside.length}</span>
                    </div>
                    <div className="list-scroll">
                      {outside.length === 0 ? (
                        <div className="empty-state">Yok</div>
                      ) : (
                        outside.map(r => userRow(r, 'red', 'outside'))
                      )}
                    </div>
                  </div>

                  <div className="panel-card">
                    <div className="panel-card-header">
                      <span className="btn-icon">❌</span>
                      <button className="title" style={{background:'transparent',border:0,cursor:'pointer',padding:0}}
                        onClick={() => setGrupModal({ open: true, type: 'absent', items: absent, title: 'Bugün Gelmeyenler' })}
                      >Bugün Gelmeyenler</button>
                      <span className="count">{absent.length}</span>
                    </div>
                    <div className="list-scroll">
                      {absent.length === 0 ? (
                        <div className="empty-state">Yok</div>
                      ) : (
                        absent.map(r => userRow(r, 'gray', 'absent'))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </main>
  <MesaiDetayModal open={detayAcil} onClose={() => setDetayAcil(false)} record={detayKayit} />
      <GroupListModal
        open={grupModal.open}
        title={grupModal.title}
        type={grupModal.type}
        items={grupModal.items}
        onClose={() => setGrupModal({ open: false, type: null, items: [] })}
        onSelect={(item) => { setDetayKayit(item); setDetayAcil(true); }}
      />
  <CenterNotice open={notice.open} icon={notice.icon} title={notice.title} subtitle={notice.subtitle} duration={2200} onClose={() => setNotice({ ...notice, open: false })} />
    </div>
  );
};

export default MesaiTakip;


