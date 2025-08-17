// Firebase konfigürasyonu
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

// Firebase config - Firebase Console'dan alındı
const firebaseConfig = {
  apiKey: "AIzaSyAQVXo0DxYf44hU__zS4XMlrDz5uu6bAQc",
  authDomain: "glowchocolate-534b7.firebaseapp.com",
  projectId: "glowchocolate-534b7",
  storageBucket: "glowchocolate-534b7.firebasestorage.app",
  messagingSenderId: "494243389831",
  appId: "1:494243389831:web:b76f71af742baba3f87322",
  measurementId: "G-3K1K88W6JX"
}

// Firebase'i başlat
const app = initializeApp(firebaseConfig)

// Analytics'i güvenli şekilde başlat (isteğe bağlı)
// Bazı ortamlarda/ayarlarla desteklenmeyebilir; bu durumda uygulama çalışmaya devam etsin.
try {
  if (typeof window !== 'undefined') {
    isSupported()
      .then((ok) => {
        if (ok) {
          getAnalytics(app)
        } else {
          console.info('[Analytics] Desteklenmiyor, atlanıyor')
        }
      })
      .catch(() => {
        console.info('[Analytics] Başlatılamadı, atlanıyor')
      })
  }
} catch (e) {
  // Analytics opsiyoneldir; hata uygulamayı durdurmamalı
  console.info('[Analytics] Hata, atlanıyor')
}

// Authentication ve Firestore servislerini export et
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
