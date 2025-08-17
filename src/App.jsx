import { useState, useEffect } from 'react'
import './App.css'
import LoginRegister from './components/LoginRegister'
import LoadingScreen from './components/LoadingScreen'
import Dashboard from './components/Dashboard'
import PersonelDashboard from './components/PersonelDashboard'
import { onAuthStateChange, logoutUser } from './firebase/auth'
import { registerFcm, listenForegroundMessages } from './firebase/messaging'

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' veya 'personel'
  const [refreshKey, setRefreshKey] = useState(0) // Personel kartlarını yenilemek için

  useEffect(() => {
    // Firebase auth state değişikliklerini dinle
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.email.split('@')[0]
        })
        setIsAuthenticated(true)
        // FCM token kaydı (sessiz hata toleranslı)
        registerFcm(firebaseUser.uid).catch(() => {})
        // Ön plan mesajlarını dinle (opsiyonel log)
        listenForegroundMessages((p) => {
          console.info('[FCM] Foreground', p)
        }).catch(() => {})
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
      setAuthChecking(false)
    })

    // Cleanup subscription
    return () => unsubscribe()
  }, [])

  const handleLogin = (userData) => {
    setIsLoading(true)
    // 3 saniye loading ekranı göster
    setTimeout(() => {
      setUser(userData)
      setIsAuthenticated(true)
      setIsLoading(false)
      // Giriş sonrası FCM kaydı
      if (userData?.uid) {
        registerFcm(userData.uid).catch(() => {})
      }
    }, 3000)
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
      setUser(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Auth durumu kontrol edilene kadar loading göster
  if (authChecking) {
    return <LoadingScreen />
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <LoginRegister onLogin={handleLogin} />
  }

  // Aktif görünüm
  const renderCurrentView = () => {
    switch (currentView) {
      case 'personel':
        return <PersonelDashboard user={user} refreshKey={refreshKey} />
      case 'dashboard':
      default:
        return <Dashboard user={user} onLogout={handleLogout} refreshKey={refreshKey} setRefreshKey={setRefreshKey} />
    }
  }

  return (
    <div className="app-container">      
      {/* Ana İçerik */}
      <main className="app-main">
        <Dashboard user={user} onLogout={handleLogout} refreshKey={refreshKey} setRefreshKey={setRefreshKey} />
      </main>
    </div>
  )
}

export default App
