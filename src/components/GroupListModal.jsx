import React, { useMemo, useState, useEffect } from 'react'
import './GroupListModal.css'

export default function GroupListModal({ open, onClose, title, items = [], type = 'inside', onSelect }) {
  const [q, setQ] = useState('')
  useEffect(() => { if (open) setQ('') }, [open])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    return items.filter(it => {
      const name = (it.fullName || '').toLowerCase()
      const dep = (it.department || '').toLowerCase()
      const pos = (it.position || '').toLowerCase()
      return name.includes(t) || dep.includes(t) || pos.includes(t)
    })
  }, [q, items])

  if (!open) return null

  const dotClass = type === 'inside' ? 'green' : type === 'absent' ? 'gray' : 'red'

  const renderRow = (item, idx) => {
    const dep = String(item.department || '').toLocaleUpperCase('tr-TR')
    const pos = String(item.position || '').toLocaleUpperCase('tr-TR')
    const addr = item.arrivedAtLocation?.address
    const shortAddr = addr ? addr.split(',').slice(0,3).join(', ') : null
    const mapUrl = item.arrivedAtLocation?.lat && item.arrivedAtLocation?.lon
      ? `https://www.google.com/maps?q=${item.arrivedAtLocation.lat},${item.arrivedAtLocation.lon}`
      : null
    return (
      <div className="gl-row" key={item.uid || idx} onClick={() => onSelect?.(item)}>
        <div className={`gl-dot ${dotClass}`} />
        <div className="gl-info">
          <div className="gl-name">{item.fullName}</div>
          <div className="gl-meta">{dep}{pos ? ` / ${pos}` : ''}{shortAddr ? ` · ${shortAddr}` : ''} {mapUrl && <a className="gl-map" href={mapUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>harita</a>}</div>
        </div>
        <div className="gl-right">
          {type === 'inside' && item.arrivedAt?.clientTime && <span className="gl-pill">Geliş {item.arrivedAt.clientTime}</span>}
          {type === 'outside' && <span className="gl-pill">Çıkış {item.leftAt?.clientTime || '—'}</span>}
          {type === 'absent' && <span className="gl-pill">—</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="gl-overlay" onClick={onClose}>
      <div className="gl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gl-header">
          <div className="gl-title">{title} <span className="count">{items.length}</span></div>
          <button className="gl-close" onClick={onClose}>×</button>
        </div>
        <div className="gl-toolbar">
          <input className="gl-search" placeholder="İsim / departman / pozisyon" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="gl-list">
          {filtered.length === 0 ? (
            <div className="gl-empty">Sonuç yok</div>
          ) : (
            filtered.map(renderRow)
          )}
        </div>
      </div>
    </div>
  )
}
