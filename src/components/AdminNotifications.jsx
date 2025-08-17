import React, { useEffect, useState } from 'react'
import './AdminNotifications.css'
import { enqueueBroadcast } from '../firebase/database'
import { collection, getDocs, orderBy, limit, query } from 'firebase/firestore'
import { db } from '../firebase/config'

export default function AdminNotifications({ userProfile, onBack }) {
  const isAdmin = userProfile?.role === 'admin'
  const [title, setTitle] = useState('Duyuru')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [rows, setRows] = useState([])

  const load = async () => {
    try {
      const qRef = query(collection(db, 'notification_queue'), orderBy('createdAt', 'desc'), limit(20))
      const snap = await getDocs(qRef)
      const list = []
      snap.forEach(d => list.push({ id: d.id, ...d.data() }))
      setRows(list)
    } catch {}
  }
  useEffect(()=>{ load() }, [])

  const send = async () => {
    if (!isAdmin) return
    if (!body.trim()) return
    setSending(true)
    try {
      const res = await enqueueBroadcast({ notification: { title: title || 'Duyuru', body: body.trim() } })
      if (res.success) {
        setBody('')
        await load()
      }
    } finally { setSending(false) }
  }

  return (
    <div className="admin-notif-wrap">
      <header className="admin-notif-header">
        <button className="back-btn" onClick={onBack}>← Geri</button>
        <h1>Bildirimler</h1>
        <div className="spacer" />
      </header>
      {!isAdmin && <div className="warn">Bu alan için yetkiniz yok.</div>}
      <div className="pane">
        <div className="form">
          <div className="group">
            <label>Başlık</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} />
          </div>
          <div className="group">
            <label>Mesaj</label>
            <textarea rows={3} placeholder="Tüm kullanıcılara gidecek mesaj..." value={body} onChange={e=>setBody(e.target.value)} />
          </div>
          <div className="actions">
            <button className="send" onClick={send} disabled={sending || !body.trim()}>Gönder</button>
          </div>
        </div>
        <div className="recent">
          <h3>Son Kuyruk Kayıtları</h3>
          <div className="list">
            {rows.map(r => (
              <div key={r.id} className={`row ${r.status || 'pending'}`}>
                <div className="id">{r.id}</div>
                <div className="msg">{r.notification?.title} — {r.notification?.body}</div>
                <div className="status">{r.status || 'pending'}</div>
              </div>
            ))}
            {rows.length===0 && <div className="empty">Kayıt yok</div>}
          </div>
        </div>
      </div>
      <footer className="hint">Not: Gönderimler, Firestore'daki notification_queue üzerinden bir (gelecek) Cloud Function ile tekil olarak FCM'e iletilir.</footer>
    </div>
  )
}
