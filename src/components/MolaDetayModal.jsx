import React, { useMemo } from 'react'
import './MolaDetayModal.css'

const fmtClock = (ms) => {
  if (!ms && ms !== 0) return '—'
  try {
    return new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

const msToHuman = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2,'0')
  return `${mm} dk ${ss} sn`
}

export default function MolaDetayModal({ open, onClose, record }) {
  const sessions = useMemo(() => {
    if (!record) return []
    const hist = Array.isArray(record.history) ? [...record.history] : []
    hist.sort((a,b) => (a.atMillis||0)-(b.atMillis||0))
    const result = []
    let current = null
    for (const h of hist) {
      if (h.type === 'start') {
        // yeni bir mola aç
        current = {
          type: h.breakType,
          duration: h.duration,
          start: h.atMillis,
          startClient: h.atClientTime
        }
      } else if (h.type === 'end') {
        // mevcut açığı kapat
        if (current) {
          const expectedEnd = current.start + (current.duration||0) * 60 * 1000
          const end = h.atMillis
          const over = Math.max(0, end - expectedEnd)
          result.push({
            ...current,
            end,
            endClient: h.atClientTime,
            expectedEnd,
            over
          })
          current = null
        }
      }
    }
    // açıkta kalan varsa aktif seans olarak ekle
    if (record.active && record.activeBreak) {
      const ab = record.activeBreak
      result.push({
        type: ab.type,
        duration: ab.duration,
        start: ab.startedAt?.millis,
        startClient: ab.startedAt?.clientTime,
        expectedEnd: ab.expectedEndAt?.millis,
        end: null,
        over: Math.max(0, Date.now() - (ab.expectedEndAt?.millis||0))
      })
    }
    return result
  }, [record])

  const totalMs = sessions
    .filter(s => s.end)
    .reduce((acc, s) => acc + Math.max(0, (s.end - (s.start||0))), 0)

  if (!open || !record) return null

  return (
    <div className="mola-modal-overlay" onClick={onClose}>
      <div className="mola-modal" onClick={(e)=>e.stopPropagation()}>
        <div className="mola-modal-header">
          <div>
            <div className="name">{record.fullName}</div>
            <div className="sub">{record.date}</div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="mola-modal-section">
          <div className="section-title">Özet</div>
          <div className="summary">
            <div className="pill">Seans: {sessions.length}</div>
            <div className="pill">Toplam Süre: {msToHuman(totalMs)}</div>
          </div>
        </div>

        <div className="mola-modal-section">
          <div className="section-title">Günün Molaları</div>
          {sessions.length === 0 ? (
            <div className="muted">Kayıt yok</div>
          ) : (
            <ul className="sess-list">
              {sessions.map((s, i) => {
                const planned = (s.duration||0)*60*1000
                const overPct = s.end && planned ? Math.round(Math.max(0, (s.end - s.expectedEnd)) / planned * 100) : (s.over>0 && planned ? Math.round(s.over / planned * 100) : 0)
                return (
                  <li key={i} className="sess-item">
                    <div className="row-top">
                      <span className="pill kind">{s.type}</span>
                      {s.end ? (
                        <span className={overPct>0? 'pill danger':'pill soft'}>
                          {fmtClock(s.start)} → {fmtClock(s.end)} {overPct>0?` · Aşım %${overPct}`:''}
                        </span>
                      ) : (
                        <span className={s.over>0? 'pill danger':'pill soft'}>
                          {fmtClock(s.start)} → {fmtClock(s.expectedEnd)}{s.over>0?` · Aşım +${msToHuman(s.over)}`:''}
                        </span>
                      )}
                    </div>
                    <div className={`progress ${ (s.end ? (s.end > s.expectedEnd) : (Date.now()> (s.expectedEnd||0))) ? 'over':'' }`}>
                      <div className="progress-bar" style={{width: `${Math.min(100, Math.round(((s.end || Date.now()) - (s.start||0)) / (planned||1) * 100))}%`}} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="mola-modal-actions">
          <button className="btn" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  )
}
