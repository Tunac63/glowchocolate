import React, { useState, useEffect, useRef } from 'react';
import './GunlukGorevler.css';
import './GunlukGorevler_admin.css';
import { 
  getAllGorevler,
  createGorevOnayKaydi,
  getOnayBekleyenGorevler as dbGetOnayBekleyenGorevler,
  getOnaylananGorevler as dbGetOnaylananGorevler,
  getReddedilenGorevler as dbGetReddedilenGorevler,
  updateGorevOnayDurumu,
  createGorev,
  createGorevRica
} from '../firebase/database';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

const GunlukGorevler = ({ 
  userProfile,
  onBack
}) => {
  const [gorevler, setGorevler] = useState(() => {
    // Sayfa yenilendiğinde localStorage'dan görevleri geri yükle
    const savedGorevler = localStorage.getItem('glowchocolate_gorevler');
    if (savedGorevler) {
      try {
        return JSON.parse(savedGorevler);
      } catch (error) {
        console.error('Görevler yüklenirken hata:', error);
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [firebaseSync, setFirebaseSync] = useState(false); // Firebase senkronizasyon durumu
  const [activeTab, setActiveTab] = useState("gorevler"); // Varsayılan olarak aktif görevler
  // Yerel güne göre yyyy-mm-dd üret (UTC sapmasını önler)
  const getTodayLocalISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(getTodayLocalISO()); // YYYY-MM-DD format // "gorevler", "onay-bekleyen", "onaylanan", "reddedilenler"
  const [showTamamlaModal, setShowTamamlaModal] = useState(false);
  const [selectedGorev, setSelectedGorev] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showRedModal, setShowRedModal] = useState(false);
  const [redNedeni, setRedNedeni] = useState("");
  const [showGorevEkleModal, setShowGorevEkleModal] = useState(false);
  const [showGorevDuzenleModal, setShowGorevDuzenleModal] = useState(false);
  const [duzenlenecekGorev, setDuzenlenecekGorev] = useState(null);
  const [yeniGorev, setYeniGorev] = useState({
    baslik: '',
    aciklama: '',
    altGorevler: []
  });
  const [yeniAltGorev, setYeniAltGorev] = useState('');
  const isSendingRef = useRef(false); // Onaya gönder tek tık koruması
  const [toast, setToast] = useState(null); // Basit bildirim
  // Rica et akışı
  const [showRicaModal, setShowRicaModal] = useState(false);
  const [ricaEdilecekGorev, setRicaEdilecekGorev] = useState(null);
  const [kimeRicaList, setKimeRicaList] = useState([]);
  const [kimeRicaQuery, setKimeRicaQuery] = useState('');
  const [seciliKisiUid, setSeciliKisiUid] = useState('');
  const [ricaNotu, setRicaNotu] = useState('');
  
  // Admin kontrolü
  const isAdmin = userProfile?.role === 'admin';
  const [selectedGorevForRed, setSelectedGorevForRed] = useState(null);

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
      onayDurumu: "bekliyor" // null, "bekliyor", "onaylandi", "reddedildi"
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
      onayDurumu: "bekliyor",
      gonderenKullanici: {
        isim: "Ahmet Yılmaz",
        pozisyon: "Depo Sorumlusu",
        departman: "Lojistik"
      },
      gonderilmeTarihi: "2024-01-15T14:30:00",
      tamamlanmaFotografi: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
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
    },
    {
      id: 4,
      baslik: "Makine Bakım",
      aciklama: "Üretim makinelerinin günlük bakım kontrolleri",
      durum: "aktif",
      altGorevler: [
        { id: 41, baslik: "Yağ seviyesi kontrolü", tamamlandi: false },
        { id: 42, baslik: "Sıcaklık ölçümü", tamamlandi: false },
        { id: 43, baslik: "Temizlik işlemi", tamamlandi: false },
        { id: 44, baslik: "Parça kontrolü", tamamlandi: false }
      ],
      onayDurumu: null
    }
  ];

  useEffect(() => {
    // Sadece localStorage'da veri yoksa örnek verileri yükle
    const savedGorevler = localStorage.getItem('glowchocolate_gorevler');
    if (!savedGorevler) {
      setGorevler(ornekGorevler);
    }
  }, []);

  // Rica için kullanıcı listesi yükle
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const qRef = query(collection(db, 'users'), where('isActive', '==', true), orderBy('fullName'))
        const snap = await getDocs(qRef)
        const list = []
        snap.forEach(d => {
          const data = d.data()
          // Kendi uid'sini hariç tut
          if (data.uid && data.uid !== userProfile?.uid) {
            list.push({ uid: data.uid, fullName: data.fullName, department: data.department, position: data.position, email: data.email })
          }
        })
        setKimeRicaList(list)
      } catch (e) {
        console.warn('Kullanıcı listesi yüklenemedi, offline olabilir:', e)
        // Offline fallback: localStorage'da varsa kullan
        const offline = JSON.parse(localStorage.getItem('glowchocolate_users_cache') || '[]')
        setKimeRicaList(offline)
      }
    }
    loadUsers()
  }, [userProfile?.uid])

  // Görevler değiştiğinde localStorage'a kaydet
  useEffect(() => {
    if (gorevler.length > 0) {
      localStorage.setItem('glowchocolate_gorevler', JSON.stringify(gorevler));
      console.log('🔄 Görevler localStorage\'a kaydedildi:', gorevler.length, 'görev');
    }
  }, [gorevler]);

  // Firebase'den görevleri yükle
  const loadGorevlerFromFirebase = async () => {
    if (firebaseSync) return; // Zaten senkronize edilmişse tekrar yapma
    
    setLoading(true);
    try {
      const result = await getAllGorevler();
      if (result.success && result.gorevler.length > 0) {
        setGorevler(result.gorevler);
        localStorage.setItem('glowchocolate_gorevler', JSON.stringify(result.gorevler));
        setFirebaseSync(true);
        console.log('✅ Firebase\'den görevler yüklendi:', result.gorevler.length, 'görev');
      } else {
        // Firebase'de görev yoksa localStorage'daki örnek görevleri Firebase'e kaydet
        if (gorevler.length > 0) {
          console.log('📤 Örnek görevler Firebase\'e kaydediliyor...');
          // Her görevi Firebase'e kaydet
          for (const gorev of gorevler) {
            await createGorev(gorev);
          }
          setFirebaseSync(true);
        }
      }
    } catch (error) {
      console.error('Firebase görev yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Firebase'den onay verilerini yükle
  const loadOnayVeilerFromFirebase = async () => {
    try {
      // Onay bekleyenler
      const bekleyenResult = await dbGetOnayBekleyenGorevler();
      if (bekleyenResult.success) {
        localStorage.setItem('glowchocolate_onay_bekleyenler', JSON.stringify(bekleyenResult.onayBekleyenler));
      }

      // Onaylananlar
      const onaylananResult = await dbGetOnaylananGorevler();
      if (onaylananResult.success) {
        localStorage.setItem('glowchocolate_onaylananlar', JSON.stringify(onaylananResult.onaylananlar));
      }

      // Reddedilenler
      const reddedilenResult = await dbGetReddedilenGorevler();
      if (reddedilenResult.success) {
        const normalized = (reddedilenResult.reddedilenler || []).map(item => ({
          ...item,
          redNedeni: item.redNedeni ?? item.adminNotu ?? '',
          redTarihi: item.redTarihi ?? item.onayTarihi ?? item.gonderilmeTarihi ?? item.createdAt
        }));
        localStorage.setItem('glowchocolate_reddedilenler', JSON.stringify(normalized));
      }
      
      console.log('✅ Firebase onay verileri yüklendi');
    } catch (error) {
      console.error('Firebase onay verileri yükleme hatası:', error);
    }
  };

  // Component mount olduğunda Firebase'den verileri yükle
  useEffect(() => {
    loadGorevlerFromFirebase();
    loadOnayVeilerFromFirebase();
  }, []);

  // Debugging için
  useEffect(() => {
    console.log('📋 Mevcut görevler durumu:', {
      toplamGorev: gorevler.length,
      aktifGorevlerTabinda: gorevler.length, // Artık tüm görevler gösteriliyor
      onayBekleyenler: getBekliyenOnayGorevleri().length,
      onaylananlar: getOnaylananGorevler().length,
      reddedilenler: getReddedilenGorevSayisi()
    });
  }, [gorevler]);

  // Her kullanıcı için ayrı alt görev seçimleri (localStorage'da sakla)
  const getUserAltGorevSelections = (gorevId) => {
    const currentUser = JSON.parse(localStorage.getItem('glowchocolate_currentUser') || '{}');
    const userKey = currentUser.email || 'anonymous';
    const userSelections = JSON.parse(localStorage.getItem(`glowchocolate_user_selections_${userKey}`) || '{}');
    return userSelections[gorevId] || [];
  };

  const setUserAltGorevSelections = (gorevId, selections) => {
    const currentUser = JSON.parse(localStorage.getItem('glowchocolate_currentUser') || '{}');
    const userKey = currentUser.email || 'anonymous';
    const userSelections = JSON.parse(localStorage.getItem(`glowchocolate_user_selections_${userKey}`) || '{}');
    userSelections[gorevId] = selections;
    localStorage.setItem(`glowchocolate_user_selections_${userKey}`, JSON.stringify(userSelections));
  };

  const handleAltGorevToggle = (gorevId, altGorevId) => {
    const currentSelections = getUserAltGorevSelections(gorevId);
    const newSelections = currentSelections.includes(altGorevId)
      ? currentSelections.filter(id => id !== altGorevId)
      : [...currentSelections, altGorevId];
    
    setUserAltGorevSelections(gorevId, newSelections);
    
    // State'i güncelle (re-render için)
    setGorevler(prev => [...prev]);
  };

  // Alt görevin kullanıcı için tamamlanıp tamamlanmadığını kontrol et
  const isAltGorevTamamlandi = (gorevId, altGorevId) => {
    const userSelections = getUserAltGorevSelections(gorevId);
    return userSelections.includes(altGorevId);
  };

  const isGorevTamamlanabilir = (gorev) => {
    // En az 1 alt görev tamamlanmış olması yeterli (kullanıcı bazlı)
    const userSelections = getUserAltGorevSelections(gorev.id);
    return userSelections.length > 0;
  };

  const handleGorevTamamla = (gorevId) => {
    const gorev = gorevler.find(g => g.id === gorevId);
    setSelectedGorev(gorev);
    setShowTamamlaModal(true);
  };

  const handleRicaEtClick = (gorevId) => {
    const gorev = gorevler.find(g => g.id === gorevId);
    setRicaEdilecekGorev(gorev);
    setRicaNotu('Temizliği bugün aksilikten dolayı tamamlayamıyorum. Mümkünse benim yerime yardımcı olur musun?');
    setSeciliKisiUid('');
    setShowRicaModal(true);
  };

  const submitRica = async () => {
    if (!ricaEdilecekGorev || !seciliKisiUid) {
      setToast({ type: 'warning', message: 'Lütfen bir kullanıcı seçin.' });
      setTimeout(() => setToast(null), 2000);
      return;
    }
    setLoading(true)
    try {
      const hedef = kimeRicaList.find(u => u.uid === seciliKisiUid)
      const nowIso = new Date().toISOString()
      const payload = {
        gorevId: ricaEdilecekGorev.id,
        gorevBaslik: ricaEdilecekGorev.baslik,
        gorevAciklama: ricaEdilecekGorev.aciklama,
        gonderen: {
          uid: userProfile?.uid,
          fullName: userProfile?.fullName,
          email: userProfile?.email,
          department: userProfile?.department,
          position: userProfile?.position
        },
        hedef: {
          uid: hedef?.uid,
          fullName: hedef?.fullName,
          email: hedef?.email,
          department: hedef?.department,
          position: hedef?.position
        },
        not: ricaNotu,
        tarih: nowIso,
        status: 'bekliyor'
      }
      const res = await createGorevRica(payload)
      if (res.success) {
        // Cache list
        const cache = JSON.parse(localStorage.getItem('glowchocolate_gorev_ricalari') || '[]')
        cache.push({ ...payload, id: res.id })
        localStorage.setItem('glowchocolate_gorev_ricalari', JSON.stringify(cache))
        setToast({ type: 'success', message: `${hedef?.fullName} kişisine rica gönderildi.` })
      } else {
        // Offline fallback
        const offlineId = `local_${Date.now()}`
        const cache = JSON.parse(localStorage.getItem('glowchocolate_gorev_ricalari') || '[]')
        cache.push({ ...payload, id: offlineId, offline: true })
        localStorage.setItem('glowchocolate_gorev_ricalari', JSON.stringify(cache))
        setToast({ type: 'warning', message: 'Çevrimdışı: Rica yerel olarak kaydedildi.' })
      }
      setTimeout(() => setToast(null), 2500)
      setShowRicaModal(false)
      setRicaEdilecekGorev(null)
      setSeciliKisiUid('')
      setRicaNotu('')
    } catch (e) {
      console.error('Rica gönderilemedi:', e)
      setToast({ type: 'error', message: 'Rica gönderilemedi.' })
      setTimeout(() => setToast(null), 2500)
    } finally {
      setLoading(false)
    }
  }

  const confirmGorevTamamla = async () => {
    if (isSendingRef.current) return; // Çift tık koruması
    if (selectedGorev) {
      isSendingRef.current = true;
      setLoading(true);
      try {
        const now = new Date().toISOString();
        const userSelections = getUserAltGorevSelections(selectedGorev.id);
        
        // Kullanıcının seçtiği alt görevleri al
        const tamamlananAltGorevler = selectedGorev.altGorevler.filter(ag => 
          userSelections.includes(ag.id)
        );
        
        const onayKaydi = {
          gorevId: selectedGorev.id,
          gorevBaslik: selectedGorev.baslik,
          gorevAciklama: selectedGorev.aciklama,
          gonderenKullanici: {
            isim: userProfile?.fullName || 'Kullanıcı',
            pozisyon: userProfile?.position || 'Pozisyon',
            departman: userProfile?.department || 'Departman',
            email: userProfile?.email || 'email@example.com'
          },
          gonderilmeTarihi: now,
          tamamlanmaFotografi: capturedPhoto,
          tamamlananAltGorevler: tamamlananAltGorevler,
          onayDurumu: "bekliyor" // bekliyor, onaylandi, reddedildi
        };
        
        // Firebase'e kaydet
        const firebaseResult = await createGorevOnayKaydi(onayKaydi);
        
        if (firebaseResult.success) {
          // Firebase'den yeni verileri yükle
          await loadOnayVeilerFromFirebase();
          console.log('✅ Görev Firebase\'e kaydedildi ve onaya gönderildi');
          // Bildirim göster
          setToast({ type: 'success', message: 'Görev admin onayına gönderildi.' });
          setTimeout(() => setToast(null), 2500);
        } else {
          console.error('Firebase kaydetme hatası:', firebaseResult.message);
          // Hata durumunda localStorage'a da kaydet
          const localOnayKaydi = { ...onayKaydi, id: Date.now() };
          const mevcutOnaylar = JSON.parse(localStorage.getItem('glowchocolate_onay_bekleyenler') || '[]');
          mevcutOnaylar.push(localOnayKaydi);
          localStorage.setItem('glowchocolate_onay_bekleyenler', JSON.stringify(mevcutOnaylar));
          setToast({ type: 'warning', message: 'İnternet sorunu: Yerel olarak kaydedildi.' });
          setTimeout(() => setToast(null), 2500);
        }
        
        // Kullanıcının alt görev seçimlerini temizle (tekrar seçebilsin)
        setUserAltGorevSelections(selectedGorev.id, []);
        
        setShowTamamlaModal(false);
        setSelectedGorev(null);
        setCapturedPhoto(null);
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
      } catch (error) {
        console.error('Görev tamamlama hatası:', error);
        setToast({ type: 'error', message: 'Görev onaya gönderilemedi.' });
        setTimeout(() => setToast(null), 2500);
      } finally {
        setLoading(false);
        isSendingRef.current = false;
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Arka kamera tercih et
      });
      setCameraStream(stream);
    } catch (error) {
      console.error('Kamera erişim hatası:', error);
      alert('Kameraya erişim izni gerekli!');
    }
  };

  const capturePhoto = () => {
    if (cameraStream) {
      const video = document.getElementById('camera-video');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(photoDataUrl);
      
      // Kamerayı kapat
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const openPhotoModal = (photoUrl) => {
    setSelectedPhoto(photoUrl);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
    setShowPhotoModal(false);
  };

  // Debug: localStorage'ı temizle (geliştirme amaçlı)
  const clearLocalStorage = () => {
    localStorage.removeItem('glowchocolate_gorevler');
    localStorage.removeItem('glowchocolate_currentView');
    setGorevler(ornekGorevler);
    console.log('🗑️ localStorage temizlendi ve örnek veriler yüklendi');
  };

  const handleAdminOnayla = async (onayKaydiId) => {
    setLoading(true);
    try {
      // Firebase'de onay durumunu güncelle
      const firebaseResult = await updateGorevOnayDurumu(onayKaydiId, 'onaylandi', '');
      
      if (firebaseResult.success) {
        // Firebase'den güncel verileri yükle
        await loadOnayVeilerFromFirebase();
        console.log('✅ Görev Firebase\'de onaylandı');
      } else {
        console.error('Firebase onaylama hatası:', firebaseResult.message);
        // Hata durumunda localStorage'dan güncelle
        const mevcutOnaylar = JSON.parse(localStorage.getItem('glowchocolate_onay_bekleyenler') || '[]');
        const guncelOnaylar = mevcutOnaylar.map(kayit => {
          if (kayit.id === onayKaydiId) {
            return { 
              ...kayit, 
              onayDurumu: "onaylandi",
              onayTarihi: new Date().toISOString()
            };
          }
          return kayit;
        });
        localStorage.setItem('glowchocolate_onay_bekleyenler', JSON.stringify(guncelOnaylar));
        
        // Onaylananlar listesine ekle
        const onaylanan = guncelOnaylar.find(k => k.id === onayKaydiId);
        if (onaylanan) {
          const mevcutOnaylananlar = JSON.parse(localStorage.getItem('glowchocolate_onaylananlar') || '[]');
          mevcutOnaylananlar.push(onaylanan);
          localStorage.setItem('glowchocolate_onaylananlar', JSON.stringify(mevcutOnaylananlar));
        }
      }
    } catch (error) {
      console.error('Onaylama hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminReddet = (onayKaydiId) => {
    const mevcutOnaylar = JSON.parse(localStorage.getItem('glowchocolate_onay_bekleyenler') || '[]');
    const onayKaydi = mevcutOnaylar.find(k => k.id === onayKaydiId);
    
    if (onayKaydi) {
      setSelectedGorevForRed(onayKaydi);
      setShowRedModal(true);
    }
  };

  const confirmRed = async () => {
    if (selectedGorevForRed && redNedeni.trim()) {
      setLoading(true);
      try {
        // Firebase'de reddet
        const firebaseResult = await updateGorevOnayDurumu(selectedGorevForRed.id, 'reddedildi', redNedeni);
        
        if (firebaseResult.success) {
          // Firebase'den güncel verileri yükle
          await loadOnayVeilerFromFirebase();
          console.log('✅ Görev Firebase\'de reddedildi');
        } else {
          console.error('Firebase reddetme hatası:', firebaseResult.message);
          // Hata durumunda localStorage'dan güncelle
          const redKaydi = {
            ...selectedGorevForRed,
            onayDurumu: "reddedildi",
            redNedeni: redNedeni,
            redTarihi: new Date().toISOString()
          };
          
          // Onay bekleyenlerden çıkar
          const mevcutOnaylar = JSON.parse(localStorage.getItem('glowchocolate_onay_bekleyenler') || '[]');
          const guncelOnaylar = mevcutOnaylar.filter(k => k.id !== selectedGorevForRed.id);
          localStorage.setItem('glowchocolate_onay_bekleyenler', JSON.stringify(guncelOnaylar));
          
          // Reddedilenlere ekle
          const mevcutReddedilenler = JSON.parse(localStorage.getItem('glowchocolate_reddedilenler') || '[]');
          mevcutReddedilenler.push(redKaydi);
          localStorage.setItem('glowchocolate_reddedilenler', JSON.stringify(mevcutReddedilenler));
        }
        
        setShowRedModal(false);
        setSelectedGorevForRed(null);
        setRedNedeni('');
      } catch (error) {
        console.error('Reddetme hatası:', error);
      } finally {
        setLoading(false);
      }
    }
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

  // Güvenli Date dönüştürücü (JS Date, ISO string veya Firestore Timestamp destekli)
  const toDateSafe = (val) => {
    try {
      if (!val) return new Date(0);
      if (typeof val?.toDate === 'function') return val.toDate();
      if (val && typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date(0) : d;
    } catch {
      return new Date(0);
    }
  };

  const getOnaylananGorevler = (tarih = null) => {
    const onaylananlar = JSON.parse(localStorage.getItem('glowchocolate_onaylananlar') || '[]');
    if (!tarih) return onaylananlar;
    
    const arananTarih = new Date(tarih).toDateString();
    return onaylananlar.filter(gorev => {
      // Öncelikle onayTarihi, yoksa gonderilmeTarihi/createdAt
      const ham = gorev.onayTarihi || gorev.gonderilmeTarihi || gorev.createdAt;
      const d = toDateSafe(ham);
      return d.toDateString() === arananTarih;
    });
  };

  const getBekliyenOnayGorevleri = (tarih = null) => {
    const bekleyenler = JSON.parse(localStorage.getItem('glowchocolate_onay_bekleyenler') || '[]')
      .filter(k => k.onayDurumu === "bekliyor");
    if (!tarih) return bekleyenler;

    const arananTarih = new Date(tarih).toDateString();
    return bekleyenler.filter(gorev => {
      // Gönderim tarihi varsa onu kullan; yoksa createdAt; en sonda tamamlanmaTarihi
      const hamTarih = gorev.gonderilmeTarihi || gorev.createdAt || gorev.tamamlanmaTarihi;
      let d;
      try {
        if (hamTarih && typeof hamTarih.toDate === 'function') {
          d = hamTarih.toDate();
        } else if (hamTarih && hamTarih.seconds) {
          d = new Date(hamTarih.seconds * 1000);
        } else {
          d = new Date(hamTarih);
        }
      } catch {
        d = new Date(0);
      }
      return d.toDateString() === arananTarih;
    });
  };

  const getAktifGorevler = () => {
    // Tüm görevleri göster (tamamen sabit)
    return gorevler;
  };

  const getReddedilenGorevler = (tarih = null) => {
    const raw = JSON.parse(localStorage.getItem('glowchocolate_reddedilenler') || '[]');
    const reddedilenler = raw.map(item => ({
      ...item,
      redNedeni: item.redNedeni ?? item.adminNotu ?? '',
      redTarihi: item.redTarihi ?? item.onayTarihi ?? item.gonderilmeTarihi ?? item.createdAt
    }));
    if (!tarih) return reddedilenler;
    
    const arananTarih = new Date(tarih).toDateString();
    return reddedilenler.filter(gorev => {
  // Firebase yolunda redTarihi olmayabilir; onayTarihi veya createdAt kullan
  const ham = gorev.redTarihi || gorev.onayTarihi || gorev.createdAt;
  const d = toDateSafe(ham);
  return d.toDateString() === arananTarih;
    });
  };

  const getReddedilenGorevSayisi = () => {
    return getReddedilenGorevler(selectedDate).length;
  };

  const getTamamlananGorevSayisi = () => {
    return getOnaylananGorevler(selectedDate).length;
  };

  const getBekliyenGorevSayisi = () => {
    return getBekliyenOnayGorevleri(selectedDate).length;
  };

  // Günlük sıfırlama sistemi
  const checkDailyReset = () => {
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('glowchocolate_last_reset_date');
    
    if (lastResetDate !== today) {
      // Yeni gün başladı, görevleri sıfırla
      console.log('🌅 Yeni gün başladı, görevler sıfırlanıyor...');
      
      // Kullanıcı seçimlerini temizle
      const currentUser = JSON.parse(localStorage.getItem('glowchocolate_currentUser') || '{}');
      const userKey = currentUser.email || 'anonymous';
      localStorage.removeItem(`glowchocolate_user_selections_${userKey}`);
      
      // Son sıfırlama tarihini güncelle
      localStorage.setItem('glowchocolate_last_reset_date', today);
      
      console.log('✅ Günlük sıfırlama tamamlandı');
    }
  };

  // Admin fonksiyonları
  const handleGorevDuzenle = (gorev) => {
    setDuzenlenecekGorev(gorev);
    setYeniGorev({
      baslik: gorev.baslik,
      aciklama: gorev.aciklama,
      altGorevler: [...gorev.altGorevler]
    });
    setShowGorevDuzenleModal(true);
  };

  const handleGorevSil = async (gorevId) => {
    if (window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
      try {
        const yeniGorevler = gorevler.filter(g => g.id !== gorevId);
        setGorevler(yeniGorevler);
        localStorage.setItem('glowchocolate_gorevler', JSON.stringify(yeniGorevler));
        console.log('✅ Görev başarıyla silindi');
      } catch (error) {
        console.error('Görev silme hatası:', error);
      }
    }
  };

  const handleYeniGorevEkle = () => {
    if (yeniGorev.baslik && yeniGorev.aciklama && yeniGorev.altGorevler.length > 0) {
      const gorev = {
        id: Date.now(),
        ...yeniGorev,
        durum: "aktif",
        onayDurumu: null
      };
      
      const yeniGorevler = [...gorevler, gorev];
      setGorevler(yeniGorevler);
      localStorage.setItem('glowchocolate_gorevler', JSON.stringify(yeniGorevler));
      
      // Formu temizle
      setYeniGorev({ baslik: '', aciklama: '', altGorevler: [] });
      setYeniAltGorev('');
      setShowGorevEkleModal(false);
      console.log('✅ Yeni görev eklendi');
    }
  };

  const handleGorevGuncelle = () => {
    if (duzenlenecekGorev && yeniGorev.baslik && yeniGorev.aciklama && yeniGorev.altGorevler.length > 0) {
      const yeniGorevler = gorevler.map(g => 
        g.id === duzenlenecekGorev.id ? { ...g, ...yeniGorev } : g
      );
      setGorevler(yeniGorevler);
      localStorage.setItem('glowchocolate_gorevler', JSON.stringify(yeniGorevler));
      
      // Formu temizle
      setDuzenlenecekGorev(null);
      setYeniGorev({ baslik: '', aciklama: '', altGorevler: [] });
      setYeniAltGorev('');
      setShowGorevDuzenleModal(false);
      console.log('✅ Görev güncellendi');
    }
  };

  const handleAltGorevEkle = () => {
    if (yeniAltGorev.trim()) {
      const yeniAlt = {
        id: Date.now(),
        baslik: yeniAltGorev.trim(),
        durum: "aktif"
      };
      setYeniGorev(prev => ({
        ...prev,
        altGorevler: [...prev.altGorevler, yeniAlt]
      }));
      setYeniAltGorev('');
    }
  };

  const handleAltGorevSil = (altGorevId) => {
    setYeniGorev(prev => ({
      ...prev,
      altGorevler: prev.altGorevler.filter(alt => alt.id !== altGorevId)
    }));
  };

  // Component mount olduğunda günlük sıfırlamayı kontrol et
  useEffect(() => {
    checkDailyReset();
  }, []);

  // Kullanıcının günlük tamamladığı görev sayısını hesapla
  const getKullaniciGunlukGorevSayisi = (kullaniciEmail, tarih) => {
    if (!kullaniciEmail || !tarih) return 0;
    
    const gunTarihi = new Date(tarih).toDateString();
    const onaylananlar = getOnaylananGorevler();
    
    return onaylananlar.filter(gorev => {
      const gorevTarihi = toDateSafe(gorev.gonderilmeTarihi).toDateString();
      return gorev.gonderenKullanici?.email === kullaniciEmail && gorevTarihi === gunTarihi;
    }).length;
  };

  const formatTarihSaat = (tarihDegeri) => {
    if (!tarihDegeri) return 'Bilinmiyor';

    let tarih;
    try {
      if (typeof tarihDegeri.toDate === 'function') {
        tarih = tarihDegeri.toDate();
      } else if (tarihDegeri && tarihDegeri.seconds) {
        tarih = new Date(tarihDegeri.seconds * 1000);
      } else {
        tarih = new Date(tarihDegeri);
      }
    } catch {
      tarih = new Date(tarihDegeri);
    }
    const bugun = new Date();
    const dun = new Date();
    dun.setDate(bugun.getDate() - 1);
    
    const tarihFormatli = tarih.toLocaleDateString('tr-TR');
    const saatFormatli = tarih.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    if (tarih.toDateString() === bugun.toDateString()) {
      return `Bugün ${saatFormatli}`;
    } else if (tarih.toDateString() === dun.toDateString()) {
      return `Dün ${saatFormatli}`;
    } else {
      return `${tarihFormatli} ${saatFormatli}`;
    }
  };

  return (
    <div className="gunluk-gorevler-container">
      {/* Header */}
      <header className="gorevler-header">
        <div className="header-left">
          <button className="geri-btn" onClick={onBack}>
            ← Geri
          </button>
          <div className="header-title">
            <h1>📋 Günlük Görevler</h1>
            <p>Günlük görev atamaları ve takibi</p>
          </div>
        </div>
        
        {/* Date Picker */}
        <div className="date-picker-container">
          <label htmlFor="date-picker">📅 Tarih Seç:</label>
          <input
            id="date-picker"
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
            <div className="stat-number">{gorevler.length}</div>
            <div className="stat-label">Toplam Görev</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{getTamamlananGorevSayisi()}</div>
            <div className="stat-label">Tamamlanan</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{getBekliyenGorevSayisi()}</div>
            <div className="stat-label">Onay Bekliyor</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{getReddedilenGorevSayisi()}</div>
            <div className="stat-label">Reddedilen</div>
          </div>
          
          {/* Admin Görev Ekle Butonu */}
          {isAdmin && (
            <button 
              className="admin-gorev-ekle-btn"
              onClick={() => setShowGorevEkleModal(true)}
              title="Yeni Görev Ekle"
            >
              ➕ Görev Ekle
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="gorevler-main">
        <div className="user-info-bar">
          <div className="user-avatar">
            {userProfile?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-details">
            <h3>{userProfile?.fullName || 'Kullanıcı'}</h3>
            <p>{String(userProfile?.department || 'Departman').toLocaleUpperCase('tr-TR')} - {String(userProfile?.position || 'Pozisyon').toLocaleUpperCase('tr-TR')}</p>
          </div>
          <div className="tarih-info">
            <div className="tarih">{new Date().toLocaleDateString('tr-TR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === "gorevler" ? "active" : ""}`}
            onClick={() => setActiveTab("gorevler")}
          >
            📋 Aktif Görevler ({gorevler.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === "onay-bekleyen" ? "active" : ""}`}
            onClick={() => setActiveTab("onay-bekleyen")}
          >
            ⏳ Onay Bekleyenler ({getBekliyenOnayGorevleri(selectedDate).length})
          </button>
          <button 
            className={`tab-btn ${activeTab === "onaylanan" ? "active" : ""}`}
            onClick={() => setActiveTab("onaylanan")}
          >
            ✅ Onaylananlar ({getOnaylananGorevler(selectedDate).length})
          </button>
          <button 
            className={`tab-btn ${activeTab === "reddedilenler" ? "active" : ""}`}
            onClick={() => setActiveTab("reddedilenler")}
          >
            ❌ Reddedilenler ({getReddedilenGorevSayisi()})
          </button>
        </div>

        {loading ? (
          <div className="loading-message">Görevler yükleniyor...</div>
        ) : (
          <div className="gorevler-grid">
            {activeTab === "gorevler" && getAktifGorevler().map(gorev => (
              <div key={gorev.id} className="gorev-karti">
                <div className="gorev-header">
                  <h3>{gorev.baslik}</h3>
                </div>
                
                <p className="gorev-aciklama">{gorev.aciklama}</p>
                
                <div className="alt-gorevler">
                  <h4>Alt Görevler:</h4>
                  <div className="alt-gorev-listesi">
                    {gorev.altGorevler.map(altGorev => (
                      <div 
                        key={altGorev.id} 
                        className={`alt-gorev-item ${isAltGorevTamamlandi(gorev.id, altGorev.id) ? 'tamamlandi' : ''}`}
                        onClick={() => handleAltGorevToggle(gorev.id, altGorev.id)}
                      >
                        <div className="checkbox">
                          {isAltGorevTamamlandi(gorev.id, altGorev.id) ? '✓' : '○'}
                        </div>
                        <span className="alt-gorev-baslik">{altGorev.baslik}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="gorev-actions">
                  <div className="ilerleme-bar">
                    <div className="ilerleme-text">
                      İlerleme: {getUserAltGorevSelections(gorev.id).length}/{gorev.altGorevler.length}
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${(getUserAltGorevSelections(gorev.id).length / gorev.altGorevler.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Admin butonları */}
                  {isAdmin && (
                    <div className="admin-actions">
                      <button 
                        className="admin-btn edit-btn"
                        onClick={() => handleGorevDuzenle(gorev)}
                        title="Görevi Düzenle"
                      >
                        ✏️
                      </button>
                      <button 
                        className="admin-btn delete-btn"
                        onClick={() => handleGorevSil(gorev.id)}
                        title="Görevi Sil"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                  
                  <button 
                    className={`gorev-tamamla-btn ${
                      isGorevTamamlanabilir(gorev) ? 'aktif' : 'pasif'
                    }`}
                    disabled={!isGorevTamamlanabilir(gorev)}
                    onClick={() => handleGorevTamamla(gorev.id)}
                  >
                    {isGorevTamamlanabilir(gorev) ? "🎯 Görevi Tamamla" : "⚠️ En Az 1 Alt Görev Tamamla"}
                  </button>
                  {/* Rica et butonu */}
                  <button 
                    className="rica-et-btn"
                    onClick={() => handleRicaEtClick(gorev.id)}
                    title="Bu görevi başka birinden rica et"
                  >
                    <span className="ico">🙏</span>
                    <span className="label">Rica Et</span>
                  </button>
                </div>
              </div>
            ))}

            {activeTab === "onay-bekleyen" && (
              getBekliyenOnayGorevleri(selectedDate).length === 0 ? (
                <div className="bos-durum-mesaji">
                  <div className="bos-ikon">⏳</div>
                  <h3>Onay Bekleyen Görev Yok</h3>
                  <p>Kullanıcılar tarafından tamamlanan görevler burada görünecektir.</p>
                </div>
              ) : (
                getBekliyenOnayGorevleri(selectedDate).map(gorev => (
              <div key={gorev.id} className="gorev-karti onay-bekleyen-kart">
                <div className="gorev-header">
                  <h3>{gorev.gorevBaslik || gorev.baslik}</h3>
                  <div className="gorev-durum">
                    <span 
                      className="onay-durumu"
                      style={{ backgroundColor: getOnayDurumuRenk(gorev.onayDurumu) }}
                    >
                      {getOnayDurumuText(gorev.onayDurumu)}
                    </span>
                  </div>
                </div>
                
                <p className="gorev-aciklama">{gorev.gorevAciklama || gorev.aciklama}</p>

                {/* Gönderen Kullanıcı Bilgileri */}
                <div className="gonderen-bilgi">
                  <div className="kullanici-info">
                    <div className="kullanici-avatar">
                      {gorev.gonderenKullanici?.isim?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="kullanici-detay">
                      <h4>{gorev.gonderenKullanici?.isim || 'Bilinmeyen Kullanıcı'}</h4>
                      <p>{String(gorev.gonderenKullanici?.departman || 'Departman').toLocaleUpperCase('tr-TR')} - {String(gorev.gonderenKullanici?.pozisyon || 'Pozisyon').toLocaleUpperCase('tr-TR')}</p>
                    </div>
                  </div>
                  <div className="gonderilme-tarihi">
                    <span className="tarih-ikon">📅</span>
                    <span className="tarih-text">{formatTarihSaat(gorev.gonderilmeTarihi || gorev.createdAt)}</span>
                  </div>
                </div>

                {/* Tamamlanan Alt Görevler */}
                <div className="alt-gorevler">
                  <h4>Tamamlanan Alt Görevler:</h4>
                  <div className="alt-gorev-listesi">
                    {(gorev.tamamlananAltGorevler || []).map(altGorev => (
                      <div 
                        key={altGorev.id} 
                        className={`alt-gorev-item tamamlandi`}
                      >
                        <div className="checkbox">
                          ✓
                        </div>
                        <span className="alt-gorev-baslik">{altGorev.baslik}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kanıt Fotoğrafı */}
                {gorev.tamamlanmaFotografi && (
                  <div className="kanit-fotografi">
                    <h4>📸 Kanıt Fotoğrafı:</h4>
                    <div className="foto-container">
                      <img 
                        src={gorev.tamamlanmaFotografi} 
                        alt="Görev kanıt fotoğrafı"
                        className="kanit-foto"
                        onClick={() => openPhotoModal(gorev.tamamlanmaFotografi)}
                      />
                      <div className="foto-overlay">
                        <span>🔍 Büyütmek için tıkla</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="admin-onay-actions">
                  <button 
                    className="onayla-btn"
                    onClick={() => handleAdminOnayla(gorev.id)}
                  >
                    ✅ Onayla
                  </button>
                  <button 
                    className="reddet-btn"
                    onClick={() => handleAdminReddet(gorev.id)}
                  >
                    ❌ Reddet
                  </button>
                </div>
              </div>
                ))
              )
            )}

            {activeTab === "onaylanan" && (
              getOnaylananGorevler(selectedDate).length === 0 ? (
                <div className="bos-durum-mesaji">
                  <div className="bos-ikon">✅</div>
                  <h3>Henüz Onaylanan Görev Yok</h3>
                  <p>Admin tarafından onaylanan görevler burada görünecektir.</p>
                </div>
              ) : (
                getOnaylananGorevler(selectedDate).map(gorev => (
                  <div key={gorev.id} className="gorev-karti onaylanan-kart">
                    <div className="gorev-header">
                      <h3>{gorev.gorevBaslik}</h3>
                      <div className="gorev-durum">
                        <span 
                          className="onay-durumu"
                          style={{ backgroundColor: getOnayDurumuRenk(gorev.onayDurumu) }}
                        >
                          {getOnayDurumuText(gorev.onayDurumu)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="gorev-aciklama">{gorev.gorevAciklama}</p>

                    {/* Gönderen Kullanıcı Bilgileri */}
                    <div className="gonderen-bilgi">
                      <div className="kullanici-info">
                        <div className="kullanici-avatar">
                          {gorev.gonderenKullanici?.isim?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="kullanici-detay">
                          <h4>{gorev.gonderenKullanici?.isim || 'Bilinmeyen Kullanıcı'}</h4>
                          <p>{String(gorev.gonderenKullanici?.departman || 'Departman').toLocaleUpperCase('tr-TR')} - {String(gorev.gonderenKullanici?.pozisyon || 'Pozisyon').toLocaleUpperCase('tr-TR')}</p>
                        </div>
                      </div>
                      <div className="tarih-bilgileri">
                        <div className="gonderilme-tarihi">
                          <span className="tarih-ikon">📤</span>
                          <span className="tarih-text">Gönderilme: {formatTarihSaat(gorev.gonderilmeTarihi)}</span>
                        </div>
                        <div className="onay-tarihi">
                          <span className="tarih-ikon">✅</span>
                          <span className="tarih-text">Onaylanma: {formatTarihSaat(gorev.onayTarihi)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Günlük Tamamlanan Görev Sayısı */}
                    <div className="gunluk-istatistik">
                      <div className="istatistik-box">
                        <span className="istatistik-ikon">📊</span>
                        <div className="istatistik-detay">
                          <span className="istatistik-sayi">{getKullaniciGunlukGorevSayisi(gorev.gonderenKullanici?.email, gorev.gonderilmeTarihi)}</span>
                          <span className="istatistik-text">Günlük Tamamlanan</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="alt-gorevler">
                      <h4>Tamamlanan Alt Görevler:</h4>
                      <div className="alt-gorev-listesi">
                        {(gorev.tamamlananAltGorevler || []).map(altGorev => (
                          <div 
                            key={altGorev.id} 
                            className={`alt-gorev-item tamamlandi`}
                          >
                            <div className="checkbox">✓</div>
                            <span className="alt-gorev-baslik">{altGorev.baslik}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Kanıt Fotoğrafı */}
                    {gorev.tamamlanmaFotografi && (
                      <div className="kanit-fotografi">
                        <h4>📸 Kanıt Fotoğrafı:</h4>
                        <div className="foto-container">
                          <img 
                            src={gorev.tamamlanmaFotografi} 
                            alt="Görev kanıt fotoğrafı"
                            className="kanit-foto"
                            onClick={() => openPhotoModal(gorev.tamamlanmaFotografi)}
                          />
                          <div className="foto-overlay">
                            <span>🔍 Büyütmek için tıkla</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="tamamlandi-badge">
                      <span>🏆 Başarıyla Tamamlandı</span>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === "reddedilenler" && (
              getReddedilenGorevler(selectedDate).length === 0 ? (
                <div className="bos-durum-mesaji">
                  <div className="bos-ikon">❌</div>
                  <h3>Reddedilen Görev Yok</h3>
                  <p>Admin tarafından reddedilen görevler burada görünecektir.</p>
                </div>
              ) : (
                getReddedilenGorevler(selectedDate).map(redKaydi => (
              <div key={redKaydi.id} className="gorev-karti reddedilen-kart">
                <div className="gorev-header">
                  <h3>{redKaydi.gorevBaslik}</h3>
                  <div className="gorev-durum">
                    <span className="onay-durumu reddedildi-durumu">
                      ❌ Reddedildi
                    </span>
                  </div>
                </div>
                
                <p className="gorev-aciklama">{redKaydi.gorevAciklama}</p>

                {/* Gönderen Kullanıcı Bilgileri */}
                <div className="gonderen-bilgi">
                  <div className="kullanici-info">
                    <div className="kullanici-avatar">
                      {redKaydi.gonderenKullanici?.isim?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="kullanici-detay">
                      <h4>{redKaydi.gonderenKullanici?.isim || 'Bilinmeyen Kullanıcı'}</h4>
                      <p>{String(redKaydi.gonderenKullanici?.departman || 'Departman').toLocaleUpperCase('tr-TR')} - {String(redKaydi.gonderenKullanici?.pozisyon || 'Pozisyon').toLocaleUpperCase('tr-TR')}</p>
                    </div>
                  </div>
                  <div className="gonderilme-tarihi">
                    <span className="tarih-ikon">📅</span>
                    <span className="tarih-text">{formatTarihSaat(redKaydi.gonderilmeTarihi)}</span>
                  </div>
                </div>

                {/* Red Nedeni */}
                <div className="red-nedeni">
                  <h4>⚠️ Red Nedeni:</h4>
                  <div className="red-aciklama">
                    {redKaydi.redNedeni}
                  </div>
                  <div className="red-tarihi">
                    <span>🕐 Red Tarihi: {formatTarihSaat(redKaydi.redTarihi)}</span>
                  </div>
                </div>

                {/* Tamamlanan Alt Görevler */}
                <div className="alt-gorevler">
                  <h4>Tamamlanmış Alt Görevler:</h4>
                  <div className="alt-gorev-listesi">
                    {(redKaydi.tamamlananAltGorevler || []).map(altGorev => (
                      <div 
                        key={altGorev.id} 
                        className="alt-gorev-item tamamlandi"
                      >
                        <div className="checkbox">✓</div>
                        <span className="alt-gorev-baslik">{altGorev.baslik}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kanıt Fotoğrafı */}
                {redKaydi.tamamlanmaFotografi && (
                  <div className="kanit-fotografi">
                    <h4>📸 Gönderilen Fotoğraf:</h4>
                    <div className="foto-container">
                      <img 
                        src={redKaydi.tamamlanmaFotografi} 
                        alt="Reddedilen görev fotoğrafı"
                        className="kanit-foto"
                        onClick={() => openPhotoModal(redKaydi.tamamlanmaFotografi)}
                      />
                      <div className="foto-overlay">
                        <span>🔍 Büyütmek için tıkla</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
                ))
              )
            )}
          </div>
        )}
      </main>

      {/* Görev Tamamlama Modalı */}
      {showTamamlaModal && (
        <div className="modal-overlay">
          <div className="tamamla-modal">
            {loading && (
              <div style={{height:'3px',background:'rgba(212,175,55,0.25)'}}>
                <div style={{height:'100%',width:'100%',background:'#d4af37',animation:'loadingBar 1s linear infinite'}} />
              </div>
            )}
            <div className="modal-header">
              <h3>📋 Görev Tamamlama</h3>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setShowTamamlaModal(false);
                  setSelectedGorev(null);
                  setCapturedPhoto(null);
                  if (cameraStream) {
                    cameraStream.getTracks().forEach(track => track.stop());
                    setCameraStream(null);
                  }
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="gorev-bilgi">
                <h4>{selectedGorev?.baslik}</h4>
                <p>{selectedGorev?.aciklama}</p>
                
                <div className="tamamlanan-alt-gorevler">
                  <h5>✅ Tamamlanan Alt Görevler:</h5>
                  <ul>
                    {selectedGorev?.altGorevler
                      .filter(ag => getUserAltGorevSelections(selectedGorev.id).includes(ag.id))
                      .map(ag => (
                        <li key={ag.id}>{ag.baslik}</li>
                      ))
                    }
                  </ul>
                </div>
              </div>

              <div className="fotograf-bolumu">
                <h4>📸 Fotoğraf Çek</h4>
                <p>Görevin tamamlandığını kanıtlamak için bir fotoğraf çekin.</p>
                
                {!cameraStream && !capturedPhoto && (
                  <button className="kamera-baslat-btn" onClick={startCamera}>
                    📷 Kamerayı Başlat
                  </button>
                )}

                {cameraStream && !capturedPhoto && (
                  <div className="kamera-container">
                    <video 
                      id="camera-video" 
                      autoPlay 
                      playsInline
                      ref={(video) => {
                        if (video && cameraStream) {
                          video.srcObject = cameraStream;
                        }
                      }}
                    />
                    <button className="foto-cek-btn" onClick={capturePhoto}>
                      📸 Fotoğraf Çek
                    </button>
                  </div>
                )}

                {capturedPhoto && (
                  <div className="cekilen-foto">
                    <img src={capturedPhoto} alt="Çekilen fotoğraf" />
                    <div className="foto-actions">
                      <button className="tekrar-cek-btn" onClick={retakePhoto}>
                        🔄 Tekrar Çek
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button 
                  className="iptal-btn"
                  onClick={() => {
                    setShowTamamlaModal(false);
                    setSelectedGorev(null);
                    setCapturedPhoto(null);
                    if (cameraStream) {
                      cameraStream.getTracks().forEach(track => track.stop());
                      setCameraStream(null);
                    }
                  }}
                >
                  ❌ İptal
                </button>
                <button 
                  className="onayla-gonder-btn"
                  onClick={confirmGorevTamamla}
                  disabled={!capturedPhoto || loading}
                >
                  {loading ? 'Gönderiliyor…' : '✅ Admin Onayına Gönder'}
                </button>
              </div>

              <div className="uyari-mesaj">
                ⚠️ Bu görev admin onayına gönderilecektir. Fotoğraf kanıt olarak kullanılacaktır.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Görev Rica Modalı */}
      {showRicaModal && (
        <div className="modal-overlay" onClick={() => setShowRicaModal(false)}>
          <div className="rica-modal" onClick={(e) => e.stopPropagation()}>
            {loading && (
              <div style={{height:'3px',background:'rgba(212,175,55,0.25)'}}>
                <div style={{height:'100%',width:'100%',background:'#d4af37',animation:'loadingBar 1s linear infinite'}} />
              </div>
            )}
            <div className="modal-header">
              <h3>🙏 Rica Et</h3>
              <button className="modal-close-btn" onClick={() => setShowRicaModal(false)}>✕</button>
            </div>
            <div className="modal-content">
              <div className="gorev-bilgi">
                <h4>{ricaEdilecekGorev?.baslik}</h4>
                <p>{ricaEdilecekGorev?.aciklama}</p>
              </div>
              <div className="form-group">
                <label>Kimden rica edeceksin?</label>
                <input 
                  type="text" 
                  placeholder="İsimle ara..."
                  value={kimeRicaQuery}
                  onChange={(e) => setKimeRicaQuery(e.target.value)}
                />
                <div className="kisi-listesi">
                  {kimeRicaList
                    .filter(u => (u.fullName || '').toLowerCase().includes(kimeRicaQuery.toLowerCase()))
                    .slice(0, 20)
                    .map(u => (
                      <label key={u.uid} className={`kisi-item ${seciliKisiUid === u.uid ? 'secili' : ''}`}>
                        <input 
                          type="radio" 
                          name="rica-kisi" 
                          value={u.uid}
                          checked={seciliKisiUid === u.uid}
                          onChange={() => setSeciliKisiUid(u.uid)}
                        />
                        <span className="avatar">{u.fullName?.charAt(0)?.toUpperCase() || '?'}</span>
                        <span className="isim">{u.fullName}</span>
                        <span className="etiket">{String(u.department || '').toLocaleUpperCase('tr-TR')} • {String(u.position || '').toLocaleUpperCase('tr-TR')}</span>
                      </label>
                    ))}
                </div>
              </div>
              <div className="form-group">
                <label>Not (isteğe bağlı)</label>
                <textarea 
                  rows={3}
                  placeholder="Kısaca durumu açıklayın..."
                  value={ricaNotu}
                  onChange={(e) => setRicaNotu(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="iptal-btn" onClick={() => setShowRicaModal(false)}>İptal</button>
              <button className="gonder-btn" onClick={submitRica} disabled={!seciliKisiUid || loading}>Gönder</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',padding:'10px 16px',borderRadius:12,background: toast.type==='success' ? '#28a745' : toast.type==='warning' ? '#ffc107' : '#dc3545', color:'#fff', boxShadow:'0 6px 18px rgba(0,0,0,0.2)', zIndex:1100}}>
          {toast.message}
        </div>
      )}

      {/* Red Nedeni Modalı */}
      {showRedModal && (
        <div className="modal-overlay">
          <div className="red-modal">
            <div className="modal-header">
              <h3>❌ Görev Reddetme</h3>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setShowRedModal(false);
                  setRedNedeni("");
                  setSelectedGorevForRed(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="red-uyari">
                <p>Bu görevi reddetmek istediğinizden emin misiniz?</p>
                <p><strong>Not:</strong> Görev kullanıcıya normal şekilde görünecek ve tekrar yapabilecektir.</p>
              </div>

              <div className="red-nedeni-input">
                <label htmlFor="redNedeni">Red Nedeni (Zorunlu):</label>
                <textarea
                  id="redNedeni"
                  value={redNedeni}
                  onChange={(e) => setRedNedeni(e.target.value)}
                  placeholder="Görevi neden reddettiğinizi açıklayın..."
                  rows={4}
                  maxLength={500}
                />
                <div className="karakter-sayisi">
                  {redNedeni.length}/500 karakter
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="iptal-btn"
                  onClick={() => {
                    setShowRedModal(false);
                    setRedNedeni("");
                    setSelectedGorevForRed(null);
                  }}
                >
                  🔙 İptal
                </button>
                <button 
                  className="red-onayla-btn"
                  onClick={confirmRed}
                  disabled={!redNedeni.trim()}
                >
                  ❌ Reddet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fotoğraf Büyütme Modalı */}
      {showPhotoModal && (
        <div className="modal-overlay photo-modal-overlay" onClick={closePhotoModal}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <h3>📸 Kanıt Fotoğrafı</h3>
              <button className="modal-close-btn" onClick={closePhotoModal}>
                ✕
              </button>
            </div>
            <div className="photo-modal-content">
              <img 
                src={selectedPhoto} 
                alt="Büyütülmüş kanıt fotoğrafı" 
                className="buyutulmus-foto"
              />
            </div>
            <div className="photo-modal-footer">
              <p>Fotoğrafı kapatmak için dış alana tıklayın veya ✕ butonunu kullanın</p>
            </div>
          </div>
        </div>
      )}

      {/* Görev Ekleme Modal'ı */}
      {showGorevEkleModal && (
        <div className="modal-overlay admin-modal-overlay" onClick={() => setShowGorevEkleModal(false)}>
          <div className="admin-gorev-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Yeni Görev Ekle</h3>
              <button className="modal-close" onClick={() => setShowGorevEkleModal(false)}>✕</button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Görev Başlığı:</label>
                <input
                  type="text"
                  value={yeniGorev.baslik}
                  onChange={(e) => setYeniGorev({...yeniGorev, baslik: e.target.value})}
                  placeholder="Görev başlığını girin..."
                />
              </div>
              
              <div className="form-group">
                <label>Görev Açıklaması:</label>
                <textarea
                  value={yeniGorev.aciklama}
                  onChange={(e) => setYeniGorev({...yeniGorev, aciklama: e.target.value})}
                  placeholder="Görev açıklamasını girin..."
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Alt Görevler:</label>
                <div className="alt-gorev-input">
                  <input
                    type="text"
                    value={yeniAltGorev}
                    onChange={(e) => setYeniAltGorev(e.target.value)}
                    placeholder="Alt görev girin..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAltGorevEkle()}
                  />
                  <button type="button" onClick={handleAltGorevEkle}>Ekle</button>
                </div>
                
                <div className="alt-gorev-listesi">
                  {yeniGorev.altGorevler.map(altGorev => (
                    <div key={altGorev.id} className="alt-gorev-item">
                      <span>{altGorev.baslik}</span>
                      <button onClick={() => handleAltGorevSil(altGorev.id)}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-iptal" onClick={() => setShowGorevEkleModal(false)}>İptal</button>
              <button 
                className="btn-kaydet" 
                onClick={handleYeniGorevEkle}
                disabled={!yeniGorev.baslik || !yeniGorev.aciklama || yeniGorev.altGorevler.length === 0}
              >
                Görev Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Görev Düzenleme Modal'ı */}
      {showGorevDuzenleModal && (
        <div className="modal-overlay admin-modal-overlay" onClick={() => setShowGorevDuzenleModal(false)}>
          <div className="admin-gorev-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Görev Düzenle</h3>
              <button className="modal-close" onClick={() => setShowGorevDuzenleModal(false)}>✕</button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Görev Başlığı:</label>
                <input
                  type="text"
                  value={yeniGorev.baslik}
                  onChange={(e) => setYeniGorev({...yeniGorev, baslik: e.target.value})}
                  placeholder="Görev başlığını girin..."
                />
              </div>
              
              <div className="form-group">
                <label>Görev Açıklaması:</label>
                <textarea
                  value={yeniGorev.aciklama}
                  onChange={(e) => setYeniGorev({...yeniGorev, aciklama: e.target.value})}
                  placeholder="Görev açıklamasını girin..."
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Alt Görevler:</label>
                <div className="alt-gorev-input">
                  <input
                    type="text"
                    value={yeniAltGorev}
                    onChange={(e) => setYeniAltGorev(e.target.value)}
                    placeholder="Alt görev girin..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAltGorevEkle()}
                  />
                  <button type="button" onClick={handleAltGorevEkle}>Ekle</button>
                </div>
                
                <div className="alt-gorev-listesi">
                  {yeniGorev.altGorevler.map(altGorev => (
                    <div key={altGorev.id} className="alt-gorev-item">
                      <span>{altGorev.baslik}</span>
                      <button onClick={() => handleAltGorevSil(altGorev.id)}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-iptal" onClick={() => setShowGorevDuzenleModal(false)}>İptal</button>
              <button 
                className="btn-kaydet" 
                onClick={handleGorevGuncelle}
                disabled={!yeniGorev.baslik || !yeniGorev.aciklama || yeniGorev.altGorevler.length === 0}
              >
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GunlukGorevler;
