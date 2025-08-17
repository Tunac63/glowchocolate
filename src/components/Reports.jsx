import React, { useState } from 'react'
import { getAttendanceBetweenDates } from '../firebase/database'

export default function Reports({ userProfile, onBack }) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [error, setError] = useState(null)

  const runQuery = async () => {
    setError(null)
    if (!start || !end) { setError('Başlangıç ve bitiş tarihlerini seçin.'); return }
    setLoading(true)
    const res = await getAttendanceBetweenDates(start, end)
    if (res.success) setData(res.items)
    else setError('Kayıtlar alınamadı')
    setLoading(false)
  }

  const toCSV = () => {
    const headers = ['Ad Soyad','Tarih','Durum','Geliş','Çıkış','Fazla Mesai']
    const rows = data.map(r => [
      r.fullName,
      r.date,
      r.status,
      r.arrivedAt?.clientTime || '',
      r.leftAt?.clientTime || '',
      r.overtimeAt?.clientTime || ''
    ])
    const csv = [headers, ...rows].map(cols => cols.map(x => `"${(x||'').toString().replaceAll('"','""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mesai-rapor_${start||'baslangic'}_${end||'bitis'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{padding:20}}>
      <button onClick={onBack}>← Geri</button>
      <h2>Raporlar</h2>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <label>Başlangıç</label>
        <input type="date" value={start} onChange={e=>setStart(e.target.value)} />
        <label>Bitiş</label>
        <input type="date" value={end} onChange={e=>setEnd(e.target.value)} />
  <button onClick={runQuery} disabled={loading}>{loading ? 'Yükleniyor...' : 'Getir'}</button>
  <button onClick={toCSV} disabled={!data.length}>CSV İndir</button>
      </div>
      {error && <div style={{color:'#b94a48',marginTop:10}}>{error}</div>}
      <div style={{marginTop:20}}>
        <div style={{fontWeight:'bold',marginBottom:8}}>Kayıt Sayısı: {data.length}</div>
        <div style={{maxHeight:420,overflow:'auto',border:'1px solid #eee',borderRadius:8}}>
          {data.map((r)=> (
            <div key={r.id} style={{padding:10,borderBottom:'1px solid #f2f2f2'}}>
              <div style={{fontWeight:'600'}}>{r.fullName} — {r.date} ({r.status})</div>
              <div style={{fontSize:13,opacity:.8}}>Geliş: {r.arrivedAt?.clientTime || '—'} · Çıkış: {r.leftAt?.clientTime || '—'} · Fazla Mesai: {r.overtimeAt?.clientTime || '—'}</div>
            </div>
          ))}
          {data.length === 0 && <div style={{padding:14,opacity:.7}}>Kayıt yok</div>}
        </div>
      </div>
    </div>
  )
}
