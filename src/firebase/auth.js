import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth'
import { auth } from './config'

// Email domain validasyonu
const validateEmailDomain = (email) => {
  return email.toLowerCase().endsWith('@glow.com')
}

// Kullanıcı kaydı
export const registerUser = async (email, password) => {
  try {
    // Email domain kontrolü
    if (!validateEmailDomain(email)) {
      return {
        success: false,
        error: 'invalid-domain',
        message: 'Sadece @glow.com uzantılı e-postalar kabul edilir'
      }
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    return {
      success: true,
      user: userCredential.user,
      message: 'Kayıt başarılı!'
    }
  } catch (error) {
    return {
      success: false,
      error: error.code,
      message: getErrorMessage(error.code)
    }
  }
}

// Kullanıcı girişi
export const loginUser = async (email, password) => {
  try {
    // Email domain kontrolü
    if (!validateEmailDomain(email)) {
      return {
        success: false,
        error: 'invalid-domain',
        message: 'Sadece @glow.com uzantılı e-postalar kabul edilir'
      }
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return {
      success: true,
      user: userCredential.user,
      message: 'Giriş başarılı!'
    }
  } catch (error) {
    return {
      success: false,
      error: error.code,
      message: getErrorMessage(error.code)
    }
  }
}

// Kullanıcı çıkışı
export const logoutUser = async () => {
  try {
    await signOut(auth)
    return {
      success: true,
      message: 'Çıkış başarılı!'
    }
  } catch (error) {
    return {
      success: false,
      error: error.code,
      message: 'Çıkış yapılırken hata oluştu'
    }
  }
}

// Auth state değişikliklerini dinle
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback)
}

// Hata mesajlarını Türkçe'ye çevir
const getErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Kullanıcı bulunamadı'
    case 'auth/wrong-password':
      return 'Hatalı şifre'
    case 'auth/email-already-in-use':
      return 'Bu e-posta zaten kullanımda'
    case 'auth/weak-password':
      return 'Şifre çok zayıf (en az 6 karakter)'
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi'
    case 'auth/too-many-requests':
      return 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin'
    case 'auth/invalid-credential':
      return 'Geçersiz giriş bilgileri'
    case 'invalid-domain':
      return 'Sadece @glow.com uzantılı e-postalar kabul edilir'
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.'
  }
}
