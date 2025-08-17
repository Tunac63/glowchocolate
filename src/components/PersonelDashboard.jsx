import { useState, useEffect } from 'react'
import { getAllDepartments, getDepartmentEmployees, getUserProfile } from '../firebase/database'
import './PersonelDashboard.css'

const PersonelDashboard = ({ user, refreshKey }) => {
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)

  const departmentNames = {
    'yonetim': '👔 Yönetim',
    'mudur': '🏢 Müdür',
    'koordinatorler': '⚡ Koordinatörler',
    'servis-personeli': '🍽️ Servis Personeli',
    'bar-personeli': '🍹 Bar Personeli',
    'mutfak-personeli': '👨‍🍳 Mutfak Personeli',
    'tedarik-sorumlusu': '📦 Tedarik Sorumlusu',
    'imalat-personeli': '🍫 İmalat Personeli'
  }

  useEffect(() => {
    loadUserProfile()
  }, [refreshKey]) // refreshKey değiştiğinde profili yeniden yükle

  useEffect(() => {
    if (hasAdminAccess) {
      loadDepartments()
    }
  }, [hasAdminAccess, refreshKey]) // refreshKey değiştiğinde departmanları yeniden yükle

  const loadUserProfile = async () => {
    try {
      const result = await getUserProfile(user.uid)
      if (result.success) {
        setUserProfile(result.user)
        const isAdmin = result.user.role === 'admin'
        setHasAdminAccess(isAdmin)
        
        if (!isAdmin) {
          setError('Bu sayfaya erişim yetkiniz bulunmamaktadır. Sadece Yönetim ve Müdür personeli bu sayfayı görüntüleyebilir.')
          setLoading(false)
        }
      } else {
        setError('Kullanıcı profili yüklenemedi')
        setLoading(false)
      }
    } catch (err) {
      setError('Profil yüklenirken hata oluştu: ' + err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedDepartment) {
      loadDepartmentEmployees(selectedDepartment)
    }
  }, [selectedDepartment])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const result = await getAllDepartments()
      if (result.success) {
        setDepartments(result.departments)
        // İlk departmanı varsayılan olarak seç
        if (result.departments.length > 0 && result.departments[0].employeeCount > 0) {
          setSelectedDepartment(result.departments[0].id)
        }
      } else {
        setError('Departmanlar yüklenemedi')
      }
    } catch (err) {
      setError('Bir hata oluştu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadDepartmentEmployees = async (department) => {
    try {
      const result = await getDepartmentEmployees(department)
      if (result.success) {
        setEmployees(result.employees)
      } else {
        setError('Personeller yüklenemedi')
      }
    } catch (err) {
      setError('Personel listesi yüklenemedi: ' + err.message)
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Bilinmiyor'
    return new Date(date.seconds * 1000).toLocaleDateString('tr-TR')
  }

  if (!hasAdminAccess && !loading) {
    return (
      <div className="personel-dashboard">
        <div className="access-denied-container">
          <div className="access-denied-icon">🚫</div>
          <h3>Erişim Engellendi</h3>
          <p>{error}</p>
          <div className="access-info">
            <h4>📋 Yetki Bilgileri:</h4>
            <ul>
              <li>✅ Bu sayfa sadece <strong>Yönetim</strong> ve <strong>Müdür</strong> departmanları için erişilebilir</li>
              <li>👤 Mevcut departmanınız: <strong>{userProfile?.department || 'Bilinmiyor'}</strong></li>
              <li>🏷️ Mevcut rolünüz: <strong>{userProfile?.role === 'admin' ? 'Yönetici' : 'Personel'}</strong></li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="personel-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Personel verileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="personel-dashboard">
        <div className="error-container">
          <h3>❌ Hata</h3>
          <p>{error}</p>
          <button onClick={loadDepartments} className="retry-btn">
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="personel-dashboard">
      <div className="dashboard-header">
        <h2>📊 Personel Yönetimi</h2>
        <div className="user-info">
          Hoş geldin, <strong>{user.name}</strong>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Departman Özeti */}
        <div className="department-summary">
          <h3>🏢 Departman Özeti</h3>
          <div className="summary-grid">
            {departments.map(dept => (
              <div 
                key={dept.id}
                className={`summary-card ${dept.employeeCount === 0 ? 'empty' : ''}`}
                onClick={() => dept.employeeCount > 0 && setSelectedDepartment(dept.id)}
              >
                <div className="card-icon">
                  {departmentNames[dept.id]?.split(' ')[0] || '📋'}
                </div>
                <div className="card-content">
                  <h4>{dept.name}</h4>
                  <p className="employee-count">
                    {dept.employeeCount} personel
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Departman Seçici */}
        <div className="department-selector">
          <h3>👥 Departman Personelleri</h3>
          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="department-select"
          >
            <option value="">Departman Seçin</option>
            {departments
              .filter(dept => dept.employeeCount > 0)
              .map(dept => (
                <option key={dept.id} value={dept.id}>
                  {departmentNames[dept.id]} ({dept.employeeCount} personel)
                </option>
              ))}
          </select>
        </div>

        {/* Personel Listesi */}
        {selectedDepartment && (
          <div className="employee-list">
            <h4>
              {departmentNames[selectedDepartment]} Personelleri
            </h4>
            
            {employees.length === 0 ? (
              <div className="empty-state">
                <p>Bu departmanda henüz personel bulunmuyor.</p>
              </div>
            ) : (
              <div className="employee-grid">
                {employees.map(employee => (
                  <div key={employee.id} className="employee-card">
                    <div className="employee-avatar">
                      {employee.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="employee-info">
                      <h5>{employee.fullName}</h5>
                      <p className="employee-email">{employee.email}</p>
                      <p className="employee-position">{employee.position}</p>
                      <div className="employee-meta">
                        <span className="join-date">
                          📅 {formatDate(employee.joinDate)}
                        </span>
                        <span className={`status ${employee.isActive ? 'active' : 'inactive'}`}>
                          {employee.isActive ? '✅ Aktif' : '❌ Pasif'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* İstatistikler */}
        <div className="statistics">
          <h3>📈 İstatistikler</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">
                {departments.reduce((total, dept) => total + dept.employeeCount, 0)}
              </div>
              <div className="stat-label">Toplam Personel</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {departments.filter(dept => dept.employeeCount > 0).length}
              </div>
              <div className="stat-label">Aktif Departman</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {departments.length}
              </div>
              <div className="stat-label">Toplam Departman</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PersonelDashboard
