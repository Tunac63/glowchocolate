import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import app, { db } from './config'
import { collection, getDocs, query, updateDoc, where, doc } from 'firebase/firestore'

// Public VAPID key (Firebase Cloud Messaging > Web push certificates)
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || ''

export const registerFcm = async (uid) => {
  try {
    if (typeof window === 'undefined') return { success: false, error: 'no_window' }
    const supported = await isSupported()
    if (!supported) return { success: false, error: 'not_supported' }

    // Service worker yolu: public/firebase-messaging-sw.js
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const messaging = getMessaging(app)

    // İzin iste
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { success: false, error: 'denied' }

    // Token al
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
    if (!token) return { success: false, error: 'no_token' }

    // Firestore'da users koleksiyonunda uid eşleşen belgeyi güncelle
    const qRef = query(collection(db, 'users'), where('uid', '==', uid))
    const snap = await getDocs(qRef)
    if (!snap.empty) {
      const d = snap.docs[0]
      await updateDoc(doc(db, 'users', d.id), { fcmToken: token, fcmUpdatedAt: new Date() })
    }

    return { success: true, token }
  } catch (error) {
    console.error('FCM register error:', error)
    return { success: false, error: error.code || String(error) }
  }
}

export const listenForegroundMessages = async (callback) => {
  const supported = await isSupported()
  if (!supported) return () => {}
  const messaging = getMessaging(app)
  return onMessage(messaging, (payload) => callback(payload))
}
