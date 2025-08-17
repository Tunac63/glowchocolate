import React, { useEffect, useMemo, useState } from 'react'
import './AdminUsers.css'
import { getAllUsers, setUserActiveStatus, setUserRole } from '../firebase/database'

export default function AdminUsers({ userProfile, onBack }) {
  const isAdmin = userProfile?.role === 'admin'
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('all') // all | active | passive | admins | employees
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(null) // uid
  const canManage = isAdmin

  const load = async () => {
    setLoading(true)
    try {
      const res = await getAllUsers()
      if (res.success) setUsers(res.users)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const txt = q.toLowerCase()
    return users.filter(u => {
      if (filter === 'active' && !u.isActive) return false
      if (filter === 'passive' && u.isActive) return false
      if (filter === 'admins' && u.role !== 'admin') return false
      if (filter === 'employees' && u.role !== 'employee') return false
      if (txt && !String(u.fullName || '').toLowerCase().includes(txt) && !String(u.email || '').toLowerCase().includes(txt)) return false
      return true
    })
  }, [users, filter, q])

  const handleRole = async (u, role) => {
    if (!canManage) return
    setSaving(u.uid)
    try {
      const res = await setUserRole(u.uid, role)
      if (res.success) await load()
    } finally { setSaving(null) }
  }

  const handleActive = async (u, active) => {
    if (!canManage) return
    setSaving(u.uid)
    try {
      const res = await setUserActiveStatus(u.uid, active)
      if (res.success) await load()
    } finally { setSaving(null) }
  }

  return (
    <div className="admin-users-wrap">
      <header className="admin-users-header">
        <button className="back-btn" onClick={onBack}>← Geri</button>
        <h1>Kullanıcı Yönetimi</h1>
        <div className="spacer" />
      </header>

      {!isAdmin && <div className="warn">Bu alan için yetkiniz yok.</div>}

      <div className="toolbar">
        <input className="search" placeholder="Ara: isim veya e-posta" value={q} onChange={e => setQ(e.target.value)} />
        <div className="filters">
          <button className={`chip ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>Tümü</button>
          <button className={`chip ${filter==='active'?'active':''}`} onClick={()=>setFilter('active')}>Aktif</button>
          <button className={`chip ${filter==='passive'?'active':''}`} onClick={()=>setFilter('passive')}>Pasif</button>
          <button className={`chip ${filter==='admins'?'active':''}`} onClick={()=>setFilter('admins')}>Admin</button>
          <button className={`chip ${filter==='employees'?'active':''}`} onClick={()=>setFilter('employees')}>Personel</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Yükleniyor…</div>
      ) : (
        <div className="list">
          {filtered.map(u => (
            <div key={u.uid || u.id} className={`row ${u.isActive? '':'passive'}`}>
              <div className="id">
                <div className="avatar">{String(u.fullName||'?').charAt(0).toUpperCase()}</div>
              </div>
              <div className="info">
                <div className="name">{u.fullName || '—'}</div>
                <div className="meta">{String(u.department||'').toLocaleUpperCase('tr-TR')} • {String(u.position||'').toLocaleUpperCase('tr-TR')}</div>
                <div className="email">{u.email}</div>
              </div>
              <div className="actions">
                <div className="role">
                  <span className={`role-badge ${u.role==='admin'?'admin':'employee'}`}>{u.role==='admin'?'Admin':'Personel'}</span>
                  {canManage && (
                    <div className="role-buttons">
                      <button disabled={saving===u.uid || u.role==='admin'} onClick={()=>handleRole(u,'admin')}>Yap: Admin</button>
                      <button disabled={saving===u.uid || u.role==='employee'} onClick={()=>handleRole(u,'employee')}>Yap: Personel</button>
                    </div>
                  )}
                </div>
                <div className="active">
                  <label className="switch">
                    <input type="checkbox" checked={!!u.isActive} disabled={!canManage || saving===u.uid} onChange={e=>handleActive(u, e.target.checked)} />
                    <span className="slider" />
                  </label>
                  <div className="active-text">{u.isActive? 'Aktif':'Pasif'}</div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length===0 && (
            <div className="empty">Kriterlere uygun kullanıcı bulunamadı.</div>
          )}
        </div>
      )}
    </div>
  )
}
