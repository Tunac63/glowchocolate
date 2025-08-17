import React, { useEffect, useState } from 'react'
import './AdminNotifications.css'
import { enqueueBroadcast } from '../firebase/database'
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions'
import app from '../firebase/config'
import { collection, getDocs, orderBy, limit, query, where } from 'firebase/firestore'
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
      // Önce HTTPS callable deneyelim (Functions)
  // Bölgeyi açıkça belirt (Functions varsayılan: us-central1)
  const fns = getFunctions(app, 'us-central1')
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    try { connectFunctionsEmulator(fns, 'localhost', 5001) } catch {}
  }
  const fn = httpsCallable(fns, 'enqueueBroadcast')
  const res = await fn({ payload: { notification: { title: title || 'Duyuru', body: body.trim() } } })
  if (!res?.data?.success) throw new Error('callable_failed')
  if (res?.data?.success) {
        setBody('')
        await load()
      }
    } catch (err) {
      // Ücretsiz üretim yolu: Cloudflare Pages Worker /api/notify
      try {
        const isProd = typeof window !== 'undefined' && window.location.hostname.endsWith('.pages.dev')
        if (isProd) {
          // Aktif kullanıcıların fcmToken'larını topla
          const usersSnap = await getDocs(query(collection(db, 'users'), where('isActive', '==', true)))
          const tokens = []
          usersSnap.forEach(d => { const t = d.get('fcmToken'); if (t) tokens.push(String(t)) })
          if (tokens.length === 0) throw new Error('no_tokens')
          const res = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokens,
              notification: { title: title || 'Duyuru', body: body.trim() },
              data: {}
            })
          })
          if (!res.ok) throw new Error('worker_failed')
          setBody('')
          await load()
          return
        }
      } catch (e) {
        // Lokal veya başarısızsa: Firestore kuyruğuna yaz (eski fallback)
        const res2 = await enqueueBroadcast({ notification: { title: title || 'Duyuru', body: body.trim() } }, { uid: userProfile?.uid, email: userProfile?.email })
        if (res2.success) {
          setBody('')
          await load()
        }
      }
    } finally { setSending(false) }
  }

  const processPending = async () => {
    if (!isAdmin) return
    setSending(true)
    try {
      const fns = getFunctions(app, 'us-central1')
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        try { connectFunctionsEmulator(fns, 'localhost', 5001) } catch {}
      }
      const fn = httpsCallable(fns, 'processPending')
      await fn({ limit: 25 })
      await load()
    } catch (e) {
      console.error('processPending error', e)
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
            <button className="send" onClick={processPending} disabled={sending}>Bekleyenleri İşle</button>
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
