import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore'
import { db } from './config'

// Kullanıcı kaydı (departman bilgisi ile)
export const createUserProfile = async (userData) => {
  try {
    const userRole = getUserRole(userData.department)
    const userProfile = {
      uid: userData.uid,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      department: userData.department,
      fullName: `${userData.firstName} ${userData.lastName}`,
      createdAt: new Date(),
      isActive: true,
      role: userRole,
      permissions: getRolePermissions(userRole)
    }

    const docRef = await addDoc(collection(db, 'users'), userProfile)
    
    // Departman listesine de ekle
    await addUserToDepartment(userData.department, {
      id: docRef.id,
      ...userProfile
    })

    return {
      success: true,
      id: docRef.id,
      message: 'Kullanıcı profili oluşturuldu'
    }
  } catch (error) {
    console.error('Kullanıcı profili oluşturma hatası:', error)
    return {
      success: false,
      error: error.code,
      message: 'Profil oluşturulamadı'
    }
  }
}

// Departmana kullanıcı ekleme
export const addUserToDepartment = async (department, userData) => {
  try {
    const departmentData = {
      userId: userData.id,
      uid: userData.uid,
      fullName: userData.fullName,
      email: userData.email,
      department: department,
      position: getDepartmentPosition(department),
      joinDate: new Date(),
      isActive: true
    }

    await addDoc(collection(db, 'departments', department, 'employees'), departmentData)
    
    return { success: true }
  } catch (error) {
    console.error('Departmana kullanıcı ekleme hatası:', error)
    return { success: false, error }
  }
}

// Departman pozisyonunu belirle
const getDepartmentPosition = (department) => {
  const positions = {
    'yonetim': 'Yönetici',
    'mudur': 'Müdür',
    'koordinatorler': 'Koordinatör',
    'servis-personeli': 'Servis Personeli',
    'bar-personeli': 'Bar Personeli',
    'mutfak-personeli': 'Mutfak Personeli',
    'tedarik-sorumlusu': 'Tedarik Sorumlusu',
    'imalat-personeli': 'İmalat Personeli'
  }
  return positions[department] || 'Personel'
}

// Kullanıcı rolünü belirle
const getUserRole = (department) => {
  const adminDepartments = ['yonetim', 'mudur']
  return adminDepartments.includes(department) ? 'admin' : 'employee'
}

// Rol yetkilerini belirle
const getRolePermissions = (role) => {
  if (role === 'admin') {
    return {
      canViewAllPersonnel: true,
      canManagePersonnel: true,
      canManageDepartments: true,
      canViewReports: true,
      canManageSystem: true,
      canDeleteRecords: true,
      canModifyRoles: true
    }
  } else {
    return {
      canViewAllPersonnel: false,
      canManagePersonnel: false,
      canManageDepartments: false,
      canViewReports: false,
      canManageSystem: false,
      canDeleteRecords: false,
      canModifyRoles: false
    }
  }
}

// ===============================
// BILDIRIM KUYRUGU (NOTIFICATIONS)
// ===============================

// Idempotent bildirim kuyruğu yazıcı
export const enqueueNotification = async (docId, payload) => {
  try {
    // Çift gönderimi önlemek için aynı id'li kayıt varsa atla
    const ref = doc(db, 'notification_queue', docId)
    const exists = await getDoc(ref)
    if (exists.exists()) return { success: true, skipped: true }
    await setDoc(ref, {
      ...payload,
      status: 'pending', // pending | sent | failed
      createdAt: serverTimestamp(),
      retries: 0
    })
    return { success: true }
  } catch (error) {
    console.error('Bildirim kuyruğa eklenemedi:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// Manuel toplu bildirim (benzersiz id)
export const enqueueBroadcast = async (payload) => {
  const docId = `broadcast_${Date.now()}`
  return enqueueNotification(docId, { audience: { type: 'all' }, ...payload })
}

// Departman personellerini getir
export const getDepartmentEmployees = async (department) => {
  try {
    const q = query(
      collection(db, 'departments', department, 'employees'),
      where('isActive', '==', true),
      orderBy('joinDate', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const employees = []
    
    querySnapshot.forEach((doc) => {
      employees.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    return {
      success: true,
      employees
    }
  } catch (error) {
    console.error('Departman personelleri getirme hatası:', error)
    return {
      success: false,
      error: error.code,
      employees: []
    }
  }
}

// Tüm departmanları ve personel sayılarını getir
export const getAllDepartments = async () => {
  try {
    const departments = [
      'yonetim', 'mudur', 'koordinatorler', 'servis-personeli',
      'bar-personeli', 'mutfak-personeli', 'tedarik-sorumlusu', 'imalat-personeli'
    ]
    
    const departmentData = []
    
    for (const dept of departments) {
      const result = await getDepartmentEmployees(dept)
      departmentData.push({
        id: dept,
        name: getDepartmentPosition(dept),
        employeeCount: result.employees.length,
        employees: result.employees
      })
    }
    
    return {
      success: true,
      departments: departmentData
    }
  } catch (error) {
    console.error('Departmanları getirme hatası:', error)
    return {
      success: false,
      error: error.code,
      departments: []
    }
  }
}

// Kullanıcı profili getir
export const getUserProfile = async (uid) => {
  try {
    const q = query(collection(db, 'users'), where('uid', '==', uid))
    const querySnapshot = await getDocs(q)
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0]
      return {
        success: true,
        user: {
          id: userDoc.id,
          ...userDoc.data()
        }
      }
    } else {
      return {
        success: false,
        message: 'Kullanıcı profili bulunamadı'
      }
    }
  } catch (error) {
    console.error('Kullanıcı profili getirme hatası:', error)
    return {
      success: false,
      error: error.code
    }
  }
}

// Kullanıcı profili güncelle
export const updateUserProfile = async (uid, updateData) => {
  try {
    // Önce kullanıcının dökümanını bul
    const q = query(collection(db, 'users'), where('uid', '==', uid))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      throw new Error('Kullanıcı profili bulunamadı')
    }
    
    const userDoc = querySnapshot.docs[0]
    const userDocRef = doc(db, 'users', userDoc.id)
    
    // Güncelleme verilerini hazırla
    const updatedData = {
      ...updateData,
      updatedAt: new Date()
    }
    
    // fullName güncellendiyse firstName ve lastName'i de güncelle
    if (updateData.fullName) {
      const names = updateData.fullName.trim().split(' ')
      updatedData.firstName = names[0] || ''
      updatedData.lastName = names.slice(1).join(' ') || ''
    }
    
    // Kullanıcı dökümanını güncelle
    await updateDoc(userDocRef, updatedData)
    
    // Eğer departman bilgisi varsa, departman koleksiyonunu da güncelle
    const currentUser = userDoc.data()
    if (currentUser.department) {
      try {
        const deptQ = query(
          collection(db, 'departments', currentUser.department, 'employees'),
          where('uid', '==', uid)
        )
        const deptSnapshot = await getDocs(deptQ)
        
        if (!deptSnapshot.empty) {
          const deptDoc = deptSnapshot.docs[0]
          const deptDocRef = doc(db, 'departments', currentUser.department, 'employees', deptDoc.id)
          
          await updateDoc(deptDocRef, {
            fullName: updatedData.fullName || currentUser.fullName,
            email: updatedData.email || currentUser.email,
            phone: updatedData.phone || currentUser.phone,
            updatedAt: new Date()
          })
        }
      } catch (deptError) {
        console.warn('Departman bilgisi güncellenirken hata:', deptError)
        // Departman güncelleme hatası ana güncellemeyi etkilemez
      }
    }
    
    return {
      success: true,
      message: 'Profil başarıyla güncellendi'
    }
  } catch (error) {
    console.error('Profil güncelleme hatası:', error)
    return {
      success: false,
      error: error.code || error.message,
      message: 'Profil güncellenirken hata oluştu'
    }
  }
}

// ===============================
// GÖREV YÖNETİMİ FONKSİYONLARI
// ===============================

// Görev oluştur
export const createGorev = async (gorevData) => {
  try {
    const gorev = {
      ...gorevData,
      createdAt: new Date(),
      isActive: true,
      altGorevler: gorevData.altGorevler || []
    }

    const docRef = await addDoc(collection(db, 'gorevler'), gorev)
    
    return {
      success: true,
      id: docRef.id,
      message: 'Görev başarıyla oluşturuldu'
    }
  } catch (error) {
    console.error('Görev oluşturma hatası:', error)
    return {
      success: false,
      error: error.code,
      message: 'Görev oluşturulamadı'
    }
  }
}

// Tüm görevleri getir
export const getAllGorevler = async () => {
  try {
    const q = query(
      collection(db, 'gorevler'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const gorevler = []
    
    querySnapshot.forEach((doc) => {
      gorevler.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    return {
      success: true,
      gorevler
    }
  } catch (error) {
    console.error('Görevleri getirme hatası:', error)
    return {
      success: false,
      error: error.code,
      gorevler: []
    }
  }
}

// Görev onay kaydı oluştur
export const createGorevOnayKaydi = async (onayKaydiData) => {
  try {
    const onayKaydi = {
      ...onayKaydiData,
      createdAt: new Date(),
      onayDurumu: "bekliyor" // bekliyor, onaylandi, reddedildi
    }

    const docRef = await addDoc(collection(db, 'gorev_onaylari'), onayKaydi)
    
    return {
      success: true,
      id: docRef.id,
      message: 'Görev onaya gönderildi'
    }
  } catch (error) {
    console.error('Görev onay kaydı oluşturma hatası:', error)
    return {
      success: false,
      error: error.code,
      message: 'Görev onaya gönderilemedi'
    }
  }
}

// Onay bekleyen görevleri getir
export const getOnayBekleyenGorevler = async () => {
  // Desteklenen: onayDurumu = 'bekliyor' filtreli; index yoksa orderBy kaldırılıp client-side sıralanır
  const toMillis = (val) => {
    try {
      if (!val) return 0
      if (typeof val.toDate === 'function') return val.toDate().getTime()
      return new Date(val).getTime() || 0
    } catch {
      return 0
    }
  }
  try {
    const q = query(
      collection(db, 'gorev_onaylari'),
      where('onayDurumu', '==', 'bekliyor'),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    const onayBekleyenler = []
    querySnapshot.forEach((docSnap) => {
      onayBekleyenler.push({ id: docSnap.id, ...docSnap.data() })
    })
    return { success: true, onayBekleyenler }
  } catch (error) {
    // Index yoksa fallback uygula
    if (error?.code === 'failed-precondition') {
      try {
        const qNoOrder = query(
          collection(db, 'gorev_onaylari'),
          where('onayDurumu', '==', 'bekliyor')
        )
        const snap = await getDocs(qNoOrder)
        const items = []
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
        // createdAt değerine göre client-side sırala (desc)
        items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        return { success: true, onayBekleyenler: items }
      } catch (innerErr) {
        console.error('Onay bekleyen görevleri getirme (fallback) hatası:', innerErr)
        return { success: false, error: innerErr.code, onayBekleyenler: [] }
      }
    }
    console.error('Onay bekleyen görevleri getirme hatası:', error)
    return { success: false, error: error.code, onayBekleyenler: [] }
  }
}

// Görev onaylama/reddetme
export const updateGorevOnayDurumu = async (onayKaydiId, yeniDurum, adminNotu = '') => {
  try {
    const onayKaydiRef = doc(db, 'gorev_onaylari', onayKaydiId)
    
    const updateData = {
      onayDurumu: yeniDurum,
      adminNotu: adminNotu,
      onayTarihi: new Date(),
      updatedAt: new Date()
    }
    
    await updateDoc(onayKaydiRef, updateData)
    
    return {
      success: true,
      message: `Görev ${yeniDurum === 'onaylandi' ? 'onaylandı' : 'reddedildi'}`
    }
  } catch (error) {
    console.error('Görev onay durumu güncelleme hatası:', error)
    return {
      success: false,
      error: error.code,
      message: 'Onay durumu güncellenemedi'
    }
  }
}

// Onaylanan görevleri getir
export const getOnaylananGorevler = async () => {
  const toMillis = (val) => {
    try {
      if (!val) return 0
      if (typeof val.toDate === 'function') return val.toDate().getTime()
      return new Date(val).getTime() || 0
    } catch {
      return 0
    }
  }
  try {
    const q = query(
      collection(db, 'gorev_onaylari'),
      where('onayDurumu', '==', 'onaylandi'),
      orderBy('onayTarihi', 'desc')
    )
    const querySnapshot = await getDocs(q)
    const onaylananlar = []
    querySnapshot.forEach((docSnap) => {
      onaylananlar.push({ id: docSnap.id, ...docSnap.data() })
    })
    return { success: true, onaylananlar }
  } catch (error) {
    if (error?.code === 'failed-precondition') {
      try {
        const qNoOrder = query(
          collection(db, 'gorev_onaylari'),
          where('onayDurumu', '==', 'onaylandi')
        )
        const snap = await getDocs(qNoOrder)
        const items = []
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
        items.sort((a, b) => toMillis(b.onayTarihi) - toMillis(a.onayTarihi))
        return { success: true, onaylananlar: items }
      } catch (innerErr) {
        console.error('Onaylanan görevleri getirme (fallback) hatası:', innerErr)
        return { success: false, error: innerErr.code, onaylananlar: [] }
      }
    }
    console.error('Onaylanan görevleri getirme hatası:', error)
    return { success: false, error: error.code, onaylananlar: [] }
  }
}

// Reddedilen görevleri getir
export const getReddedilenGorevler = async () => {
  const toMillis = (val) => {
    try {
      if (!val) return 0
      if (typeof val.toDate === 'function') return val.toDate().getTime()
      return new Date(val).getTime() || 0
    } catch {
      return 0
    }
  }
  try {
    const q = query(
      collection(db, 'gorev_onaylari'),
      where('onayDurumu', '==', 'reddedildi'),
      orderBy('onayTarihi', 'desc')
    )
    const querySnapshot = await getDocs(q)
    const reddedilenler = []
    querySnapshot.forEach((docSnap) => {
      reddedilenler.push({ id: docSnap.id, ...docSnap.data() })
    })
    return { success: true, reddedilenler }
  } catch (error) {
    if (error?.code === 'failed-precondition') {
      try {
        const qNoOrder = query(
          collection(db, 'gorev_onaylari'),
          where('onayDurumu', '==', 'reddedildi')
        )
        const snap = await getDocs(qNoOrder)
        const items = []
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
        items.sort((a, b) => toMillis(b.onayTarihi) - toMillis(a.onayTarihi))
        return { success: true, reddedilenler: items }
      } catch (innerErr) {
        console.error('Reddedilen görevleri getirme (fallback) hatası:', innerErr)
        return { success: false, error: innerErr.code, reddedilenler: [] }
      }
    }
    console.error('Reddedilen görevleri getirme hatası:', error)
    return { success: false, error: error.code, reddedilenler: [] }
  }
}

// ===============================
// MESAI (ATTENDANCE) FONKSIYONLARI
// ===============================

// Aktif kullanıcıları getir (işletme panosu için)
export const getAllActiveUsers = async () => {
  try {
    const q = query(collection(db, 'users'), where('isActive', '==', true))
    const snap = await getDocs(q)
    const users = []
    snap.forEach((d) => users.push({ id: d.id, ...d.data() }))
    return { success: true, users }
  } catch (error) {
    console.error('Aktif kullanıcıları getirme hatası:', error)
    return { success: false, users: [], error: error.code || String(error) }
  }
}

// Tüm kullanıcıları getir (aktif/pasif)
export const getAllUsers = async () => {
  const safeSort = (arr) => arr.sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || ''), 'tr'))
  try {
    const qRef = query(collection(db, 'users'), orderBy('fullName', 'asc'))
    const snap = await getDocs(qRef)
    const users = []
    snap.forEach((d) => users.push({ id: d.id, ...d.data() }))
    return { success: true, users }
  } catch (error) {
    // Index/orderBy olmayabilir: fallback
    try {
      const snap = await getDocs(collection(db, 'users'))
      const users = []
      snap.forEach((d) => users.push({ id: d.id, ...d.data() }))
      return { success: true, users: safeSort(users) }
    } catch (err2) {
      console.error('Kullanıcıları getirme hatası:', err2)
      return { success: false, users: [], error: err2.code || String(err2) }
    }
  }
}

// Kullanıcının rolünü ayarla (admin | employee)
export const setUserRole = async (uid, newRole) => {
  try {
    const qRef = query(collection(db, 'users'), where('uid', '==', uid))
    const snap = await getDocs(qRef)
    if (snap.empty) return { success: false, error: 'not_found' }
    const d = snap.docs[0]
    const ref = doc(db, 'users', d.id)
    await updateDoc(ref, {
      role: newRole,
      permissions: getRolePermissions(newRole),
      updatedAt: new Date()
    })
    return { success: true }
  } catch (error) {
    console.error('Rol güncelleme hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// Kullanıcı aktiflik durumunu ayarla
export const setUserActiveStatus = async (uid, isActive) => {
  try {
    const qRef = query(collection(db, 'users'), where('uid', '==', uid))
    const snap = await getDocs(qRef)
    if (snap.empty) return { success: false, error: 'not_found' }
    const d = snap.docs[0]
    const ref = doc(db, 'users', d.id)
    await updateDoc(ref, { isActive, updatedAt: new Date() })
    return { success: true }
  } catch (error) {
    console.error('Aktiflik güncelleme hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

const buildMesaiDocId = (uid, date) => `${uid}_${date}`

// Belirli kullanıcı ve tarihe ait mesai kaydını getir
export const getAttendanceByUserAndDate = async (uid, date) => {
  try {
    const ref = doc(db, 'mesai', buildMesaiDocId(uid, date))
    const d = await getDoc(ref)
    if (!d.exists()) return { success: true, data: null }
    return { success: true, data: { id: d.id, ...d.data() } }
  } catch (error) {
    console.error('Mesai kaydı getirme hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// Realtime: seçili tarihe ait tüm mesai kayıtlarını dinle
export const listenAttendanceForDate = (date, onChange) => {
  const qRef = query(collection(db, 'mesai'), where('date', '==', date))
  return onSnapshot(qRef, (snap) => {
    const items = []
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
    onChange(items)
  }, (error) => {
    console.error('Mesai dinleme hatası:', error)
  })
}

// Tarih aralığına göre mesai kayıtlarını getir (raporlar için)
export const getAttendanceBetweenDates = async (startDate, endDate) => {
  try {
    const qRef = query(
      collection(db, 'mesai'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    )
    const snap = await getDocs(qRef)
    const items = []
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
    return { success: true, items }
  } catch (error) {
    console.error('Rapor kayıtlarını getirme hatası:', error)
    return { success: false, items: [], error: error.code || String(error) }
  }
}

// İç zaman formatları (string + millis)
const nowTimeParts = () => {
  const now = new Date()
  return {
    clientTime: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    millis: now.getTime()
  }
}

// Punch In (Mesaiye Geldim)
export const mesaiPunchIn = async (user, date, location = null) => {
  try {
    const ref = doc(db, 'mesai', buildMesaiDocId(user.uid, date))
    const existing = await getDoc(ref)
    const { clientTime, millis } = nowTimeParts()
    const base = {
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      department: user.department,
      position: user.position,
      date, // explicit per-day bucket decided by caller (keeps record on started day)
      status: 'in',
      updatedAt: serverTimestamp()
    }
  if (existing.exists()) {
      const cur = existing.data() || {}
      // Aynı gün içinde ikinci kez giriş engeli: kapatılmış kayıtta tekrar giriş yok
      if (cur?.leftAt || cur?.status === 'out') {
        return { success: false, error: 'already_closed' }
      }
      if (cur?.status === 'absent') {
        return { success: false, error: 'marked_absent' }
      }
      await updateDoc(ref, {
        ...base,
        arrivedAt: cur.arrivedAt || { clientTime, millis },
  arrivedAtLocation: cur.arrivedAtLocation || location || null,
  leftAt: null,
  overtimeAt: null,
        history: [...(cur.history || []), { type: 'in', clientTime, millis, atMillis: millis, atClientTime: clientTime, location: location || null }]
      })
    } else {
      await setDoc(ref, {
        ...base,
        createdAt: serverTimestamp(),
        arrivedAt: { clientTime, millis },
    arrivedAtLocation: location || null,
        leftAt: null,
        history: [{ type: 'in', clientTime, millis, atMillis: millis, atClientTime: clientTime, location: location || null }]
      })
    }
    return { success: true }
  } catch (error) {
    console.error('Mesai giriş (in) hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// Punch Out (Mesaiye Kaldım / Çıkış)
export const mesaiPunchOut = async (user, date, location = null) => {
  try {
    const ref = doc(db, 'mesai', buildMesaiDocId(user.uid, date))
    const existing = await getDoc(ref)
    const { clientTime, millis } = nowTimeParts()
    const base = {
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      department: user.department,
      position: user.position,
      date, // keep date same as started day
      status: 'out',
      updatedAt: serverTimestamp()
    }
    if (existing.exists()) {
      const cur = existing.data() || {}
      await updateDoc(ref, {
        ...base,
        arrivedAt: cur.arrivedAt || null,
        leftAt: { clientTime, millis },
  leftAtLocation: location || null,
  history: [...(cur.history || []), { type: 'out', clientTime, millis, atMillis: millis, atClientTime: clientTime, location: location || null }]
      })
    } else {
      await setDoc(ref, {
        ...base,
        createdAt: serverTimestamp(),
        arrivedAt: null,
        leftAt: { clientTime, millis },
  leftAtLocation: location || null,
  history: [{ type: 'out', clientTime, millis, atMillis: millis, atClientTime: clientTime, location: location || null }]
      })
    }
    return { success: true }
  } catch (error) {
    console.error('Mesai çıkış (out) hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// Mark Absent (Bugün Gelmedim)
export const mesaiMarkAbsent = async (user, date) => {
  try {
    const ref = doc(db, 'mesai', buildMesaiDocId(user.uid, date))
    const { clientTime, millis } = nowTimeParts()
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      department: user.department,
      position: user.position,
      date,
      status: 'absent',
      arrivedAt: null,
      leftAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      history: [{ type: 'absent', clientTime, millis, atMillis: millis, atClientTime: clientTime }]
    }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Mesai (absent) hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// Set Overtime (Mesaiye Kaldım - 9.5 saat sonrası için uzatma)
export const mesaiSetOvertime = async (user, date) => {
  try {
    const ref = doc(db, 'mesai', buildMesaiDocId(user.uid, date))
    const existing = await getDoc(ref)
    if (!existing.exists()) {
      // Eğer giriş yoksa, önce giriş yaratmak yerine hata döndür
      return { success: false, error: 'no_entry' }
    }
    const { clientTime, millis } = nowTimeParts()
    await updateDoc(ref, {
      status: 'in_overtime',
      overtimeAt: { clientTime, millis },
      updatedAt: serverTimestamp(),
      history: arrayUnion({ type: 'in_overtime', clientTime, millis, atMillis: millis, atClientTime: clientTime })
    })
    return { success: true }
  } catch (error) {
    console.error('Mesai overtime hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// Kaydı sıfırla (ilgili günün mesai dokümanını sil)
export const mesaiReset = async (user, date) => {
  try {
    const ref = doc(db, 'mesai', buildMesaiDocId(user.uid, date))
    await deleteDoc(ref)
    return { success: true }
  } catch (error) {
    console.error('Mesai reset hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// ===============================
// MOLA (BREAKS) FONKSIYONLARI
// ===============================

const buildMolaDocId = (uid, date) => `${uid}_${date}`

const nowParts = () => {
  const now = new Date()
  return {
    clientTime: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    millis: now.getTime()
  }
}

export const startBreak = async (user, date, breakType, durationMinutes) => {
  try {
    const ref = doc(db, 'molalar', buildMolaDocId(user.uid, date))
    const snap = await getDoc(ref)
    const { clientTime, millis } = nowParts()
    const expected = new Date(millis + durationMinutes * 60 * 1000)
    const expectedParts = {
      clientTime: expected.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      millis: expected.getTime()
    }
    const activeBreak = {
      type: breakType,
      duration: durationMinutes,
      startedAt: { clientTime, millis },
      expectedEndAt: expectedParts
    }
    if (snap.exists()) {
      const cur = snap.data() || {}
      if (cur.activeBreak) return { success: false, error: 'already_on_break' }
      await updateDoc(ref, {
        uid: user.uid,
        fullName: user.fullName,
        department: user.department,
        position: user.position,
        date,
        active: true,
        activeBreak,
        updatedAt: serverTimestamp(),
        history: [...(cur.history || []), { type: 'start', breakType, duration: durationMinutes, atMillis: millis, atClientTime: clientTime }]
      })
    } else {
      await setDoc(ref, {
        uid: user.uid,
        fullName: user.fullName,
        department: user.department,
        position: user.position,
        date,
        active: true,
        activeBreak,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        history: [{ type: 'start', breakType, duration: durationMinutes, atMillis: millis, atClientTime: clientTime }]
      })
    }
    return { success: true }
  } catch (error) {
    console.error('Mola başlatma hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

export const endBreak = async (user, date) => {
  try {
    const ref = doc(db, 'molalar', buildMolaDocId(user.uid, date))
    const snap = await getDoc(ref)
    if (!snap.exists()) return { success: false, error: 'not_found' }
    const cur = snap.data() || {}
    if (!cur.activeBreak) return { success: false, error: 'no_active_break' }
    const { clientTime, millis } = nowParts()
    await updateDoc(ref, {
      active: false,
      activeBreak: null,
      updatedAt: serverTimestamp(),
      history: [...(cur.history || []), { type: 'end', breakType: cur.activeBreak.type, duration: cur.activeBreak.duration, atMillis: millis, atClientTime: clientTime }]
    })
    return { success: true }
  } catch (error) {
    console.error('Mola bitirme hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

export const listenBreaksForDate = (date, onChange) => {
  const qRef = query(collection(db, 'molalar'), where('date', '==', date))
  return onSnapshot(qRef, (snap) => {
    const items = []
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
    onChange(items)
  }, (error) => console.error('Mola dinleme hatası:', error))
}

export const getUserBreakForDate = async (uid, date) => {
  try {
    const ref = doc(db, 'molalar', buildMolaDocId(uid, date))
    const d = await getDoc(ref)
    if (!d.exists()) return { success: true, data: null }
    return { success: true, data: { id: d.id, ...d.data() } }
  } catch (error) {
    console.error('Kullanıcı mola kaydı hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// Aşım uyarısı: %50 üzeri olursa admin'e kayıt düş ve tekrar göndermeyi engelle
export const flagBreakOverrunAlert = async (user, date, details) => {
  try {
    const ref = doc(db, 'molalar', buildMolaDocId(user.uid, date))
    const snap = await getDoc(ref)
    if (!snap.exists()) return { success: false, error: 'not_found' }
    const cur = snap.data() || {}
    if (cur.alertSentAt) return { success: true, skipped: true }
    await updateDoc(ref, {
      alertSentAt: serverTimestamp(),
      lastAlert: {
        overMillis: details.overMillis,
        overPct: details.overPct,
        at: serverTimestamp()
      }
    })
    await addDoc(collection(db, 'mola_uyarilari'), {
      uid: user.uid,
      fullName: user.fullName,
      department: user.department,
      position: user.position,
      date,
      breakType: details.breakType,
      duration: details.duration,
      startedAtMillis: details.startedAtMillis,
      expectedEndMillis: details.expectedEndMillis,
      overMillis: details.overMillis,
      overPct: details.overPct,
      createdAt: serverTimestamp()
    })
    return { success: true }
  } catch (error) {
    console.error('Aşım uyarısı gönderme hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}

// ===============================
// GÖREV RİCA (DEVRİ) FONKSİYONLARI
// ===============================

// Görev için başka bir kullanıcıdan rica kaydı oluştur
export const createGorevRica = async (ricaData) => {
  try {
    const payload = {
      ...ricaData,
      status: ricaData.status || 'bekliyor', // bekliyor, kabul, reddedildi, tamamlandi
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const docRef = await addDoc(collection(db, 'gorev_ricalari'), payload)
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Görev rica kaydı oluşturma hatası:', error)
    return { success: false, error: error.code || String(error) }
  }
}
