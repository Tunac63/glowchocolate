import { useState } from 'react'
import { registerUser, loginUser } from '../firebase/auth'
import { createUserProfile, getUserProfile } from '../firebase/database'
import './LoginRegister.css'

const LoginRegister = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    department: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateEmail = (email) => {
    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return false
    }
    // @glow.com domain kontrolü
    return email.toLowerCase().endsWith('@glow.com')
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email) {
      newErrors.email = 'E-posta gereklidir'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'E-posta @glow.com ile bitmelidir'
    }

    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır'
    }

    if (!isLogin) {
      if (!formData.firstName) {
        newErrors.firstName = 'Ad gereklidir'
      }
      if (!formData.lastName) {
        newErrors.lastName = 'Soyad gereklidir'
      }
      if (!formData.department) {
        newErrors.department = 'Departman seçimi gereklidir'
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Şifre tekrarı gereklidir'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Şifreler eşleşmiyor'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    
    try {
      let result
      if (isLogin) {
        result = await loginUser(formData.email, formData.password)
        if (result.success) {
          // Giriş yapan kullanıcının profil bilgilerini al
          const profileResult = await getUserProfile(result.user.uid)
          
          onLogin({
            uid: result.user.uid,
            email: result.user.email,
            name: profileResult.success 
              ? profileResult.user.fullName || result.user.email.split('@')[0]
              : result.user.email.split('@')[0],
            department: profileResult.success ? profileResult.user.department : undefined,
            role: profileResult.success ? profileResult.user.role : 'employee'
          })
        }
      } else {
        // Kayıt işlemi
        result = await registerUser(formData.email, formData.password)
        if (result.success) {
          // Kullanıcı profilini veritabanına kaydet
          const profileData = {
            uid: result.user.uid,
            email: result.user.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            department: formData.department
          }
          
          const profileResult = await createUserProfile(profileData)
          
          if (profileResult.success) {
            onLogin({
              uid: result.user.uid,
              email: result.user.email,
              name: `${formData.firstName} ${formData.lastName}`,
              department: formData.department
            })
          } else {
            setErrors({ general: 'Profil oluşturulamadı: ' + profileResult.message })
          }
        }
      }

      if (!result.success) {
        setErrors({ general: result.message })
      }
    } catch (error) {
      console.error('Auth error:', error)
      setErrors({ general: 'Bir hata oluştu. Lütfen tekrar deneyin.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-register-container">
      {/* Floating background shapes */}
      <div className="floating-shapes">
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
      </div>

      <div className="auth-card glass-card">
        <div className="auth-header">
          <h1 className="brand-title">
            GlowChocolate
            <div className="brand-logo">
              <div className="logo-crown">
                <div className="crown-center"></div>
                <div className="crown-left"></div>
                <div className="crown-right"></div>
                <div className="crown-base"></div>
              </div>
            </div>
          </h1>
          <p className="brand-subtitle">İşletme ve Personel Takip Sistemi</p>
        </div>

        {false && (
          <div className="auth-tabs">
            <button 
              className={`tab-btn ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Giriş Yap
            </button>
            {false && (
              <button 
                className={`tab-btn ${!isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(false)}
              >
                Kayıt Ol
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && (
            <div className="error-banner">
              {errors.general}
            </div>
          )}

          {!isLogin && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder=" "
                    className={`form-input ${errors.firstName ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <label className="form-label">Ad</label>
                  {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder=" "
                    className={`form-input ${errors.lastName ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <label className="form-label">Soyad</label>
                  {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                </div>
              </div>

              <div className="form-group">
                <div className={`select-wrapper ${errors.department ? 'error' : ''}`}>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    onFocus={(e) => e.target.parentElement.classList.add('focus')}
                    onBlur={(e) => e.target.parentElement.classList.remove('focus')}
                    className={`form-select ${errors.department ? 'error' : ''}`}
                    disabled={loading}
                  >
                    <option value="">Departman Seçin</option>
                    <option value="yonetim">👔 Yönetim</option>
                    <option value="mudur">🏢 Müdür</option>
                    <option value="koordinatorler">⚡ Koordinatörler</option>
                    <option value="servis-personeli">🍽️ Servis Personeli</option>
                    <option value="bar-personeli">🍹 Bar Personeli</option>
                    <option value="mutfak-personeli">👨‍🍳 Mutfak Personeli</option>
                    <option value="tedarik-sorumlusu">📦 Tedarik Sorumlusu</option>
                    <option value="imalat-personeli">🍫 İmalat Personeli</option>
                  </select>
                  <label className="select-label">Departman</label>
                </div>
                {errors.department && <span className="error-message">{errors.department}</span>}
              </div>
            </>
          )}
          
          <div className="form-group">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder=" "
              className={`form-input ${errors.email ? 'error' : ''}`}
              disabled={loading}
            />
            <label className="form-label">E-posta (@glow.com)</label>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder=" "
                className={`form-input ${errors.password ? 'error' : ''}`}
                disabled={loading}
              />
              <label className="form-label">Şifre</label>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {!isLogin && (
            <div className="form-group">
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder=" "
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  disabled={loading}
                />
                <label className="form-label">Şifre Tekrar</label>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          )}

          {isLogin && (
            <div className="form-options">
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span className="checkmark"></span>
                Beni Hatırla
              </label>
              <button type="button" className="forgot-password">
                Şifremi Unuttum
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? (
              <div className="loading-btn">
                <div className="spinner"></div>
                {isLogin ? 'Giriş yapılıyor...' : 'Kayıt oluşturuluyor...'}
              </div>
            ) : (
              isLogin ? 'Giriş Yap' : 'Kayıt Ol'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
            <button 
              type="button"
              className="link-btn"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginRegister
