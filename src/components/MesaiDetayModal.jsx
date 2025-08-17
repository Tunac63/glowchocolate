import React, { useEffect } from 'react'
import './MesaiDetayModal.css'

const statusMap = {
  in: { label: 'İçerde', color: 'green' },
  in_overtime: { label: 'İçerde (Fazla Mesai)', color: 'green' },
  out: { label: 'Dışarda', color: 'red' },
  absent: { label: 'Bugün Gelmedi', color: 'gray' },
  no_record: { label: 'Kayıt Yok', color: 'gray' }
}

const fmt = (t) => t || '—'
const fromMillis = (ms) => {
  try {
    if (!ms) return null
    return new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return null }
}

export default function MesaiDetayModal({ open, onClose, record }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !record) return null
  const st = statusMap[record.status] || statusMap.no_record
  const addrIn = record.arrivedAtLocation?.address
  const mapUrlIn = record.arrivedAtLocation?.lat && record.arrivedAtLocation?.lon
    ? `https://www.google.com/maps?q=${record.arrivedAtLocation.lat},${record.arrivedAtLocation.lon}`
    : null
  const addrOut = record.leftAtLocation?.address
  const mapUrlOut = record.leftAtLocation?.lat && record.leftAtLocation?.lon
    ? `https://www.google.com/maps?q=${record.leftAtLocation.lat},${record.leftAtLocation.lon}`
    : null

  const history = Array.isArray(record.history) ? record.history : []

  return (
    <div className="mesai-modal-overlay" onClick={onClose}>
      <div className="mesai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mesai-modal-header">
          <div>
            <div className="name">{record.fullName}</div>
            <div className="sub">{String(record.department || '').toLocaleUpperCase('tr-TR')}{record.position ? ` / ${String(record.position).toLocaleUpperCase('tr-TR')}` : ''}</div>
          </div>
          <div className={`status-chip ${st.color}`}>{st.label}</div>
        </div>

        <div className="mesai-modal-section grid2">
          <div className="kv"><span>Geliş</span><strong>{fmt(record?.arrivedAt?.clientTime || fromMillis(record?.arrivedAt?.millis))}</strong></div>
          <div className="kv"><span>Çıkış</span><strong>{fmt(record?.leftAt?.clientTime || fromMillis(record?.leftAt?.millis))}</strong></div>
          <div className="kv"><span>Fazla Mesai</span><strong>{fmt(record?.overtimeAt?.clientTime || fromMillis(record?.overtimeAt?.millis))}</strong></div>
          <div className="kv"><span>Durum</span><strong>{st.label}</strong></div>
        </div>

        <div className="mesai-modal-section">
          <div className="section-title">Konum</div>
          {addrIn || addrOut ? (
            <div>
              {addrIn && (
                <div className="addr" style={{marginBottom: addrOut ? 10 : 0}}>
                  <div><strong>Giriş:</strong> {addrIn}</div>
                  {mapUrlIn && <a className="map" href={mapUrlIn} target="_blank" rel="noreferrer">Haritada Aç</a>}
                </div>
              )}
              {addrOut && (
                <div className="addr">
                  <div><strong>Çıkış:</strong> {addrOut}</div>
                  {mapUrlOut && <a className="map" href={mapUrlOut} target="_blank" rel="noreferrer">Haritada Aç</a>}
                </div>
              )}
            </div>
          ) : (
            <div className="muted">Konum bilgisi yok</div>
          )}
        </div>

        <div className="mesai-modal-section">
          <div className="section-title">Geçmiş</div>
          {history.length === 0 ? (
            <div className="muted">Kayıt yok</div>
          ) : (
            <ul className="history">
              {history.map((h, i) => {
                const t = h.atClientTime || fromMillis(h.atMillis) || h.clientTime || '—'
                const label = (
                  h.type === 'in' ? 'Giriş' :
                  h.type === 'out' ? 'Çıkış' :
                  h.type === 'absent' ? 'Bugün Gelmedi' :
                  h.type === 'in_overtime' ? 'Fazla Mesai' : h.type
                )
                return <li key={i}><span className="pill">{label}</span> <span className="time">{t}</span></li>
              })}
            </ul>
          )}
        </div>

        <div className="mesai-modal-actions">
          <button className="btn" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  )
}
