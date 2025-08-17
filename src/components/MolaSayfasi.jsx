import React, { useEffect, useMemo, useRef, useState } from 'react'
import './MolaSayfasi.css'
import { startBreak, endBreak, listenBreaksForDate, flagBreakOverrunAlert } from '../firebase/database'
import MolaDetayModal from './MolaDetayModal'

const getTodayLocalISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]

export default function MolaSayfasi({ userProfile, onBack }) {
  const [selectedDate, setSelectedDate] = useState(getTodayLocalISO())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [detailRecord, setDetailRecord] = useState(null)

  useEffect(() => {
    const unsub = listenBreaksForDate(selectedDate, (arr) => setItems(arr || []))
    return () => { if (typeof unsub === 'function') unsub() }
  }, [selectedDate])

  const myRecord = useMemo(() => items.find(x => x.uid === userProfile?.uid), [items, userProfile])
  const activeNow = myRecord?.active && myRecord?.activeBreak
  const [nowMs, setNowMs] = useState(Date.now())
  const vibratedRef = useRef(false)

  // 1sn'de bir tik; geri sayım ve aşımı canlı göstermek için
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Yeni molada titreşimi sıfırla
  useEffect(() => {
    vibratedRef.current = false
  }, [activeNow?.startedAt?.millis])

  // Beklenen bitişe 1 dk kala telefon titre (1-2 kez); sadece bir kez tetikle
  useEffect(() => {
    if (!activeNow?.expectedEndAt?.millis) return
    const remaining = activeNow.expectedEndAt.millis - nowMs
    if (!vibratedRef.current && remaining <= 60_000 && remaining > 0) {
      if (navigator?.vibrate) navigator.vibrate([200, 120, 200])
      vibratedRef.current = true
    }
  }, [nowMs, activeNow?.expectedEndAt?.millis])

  const msToClock = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000))
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${mm}:${ss}`
  }

  const msToHMS = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000))
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  const start = async (type, mins) => {
    setError(null); setLoading(true)
    const res = await startBreak({
      uid: userProfile?.uid,
      fullName: userProfile?.fullName,
      department: userProfile?.department,
      position: userProfile?.position
    }, selectedDate, type, mins)
    if (!res.success) setError('Mola başlatılamadı')
    setLoading(false)
  }

  const finish = async () => {
    setError(null); setLoading(true)
    const res = await endBreak({ uid: userProfile?.uid }, selectedDate)
    if (!res.success) setError('Mola bitirilemedi')
    setLoading(false)
  }

  const aktifMoladakiler = items.filter(x => x.active && x.activeBreak)
  const bugunMolaYapanlar = items
    .map(x => ({
      ...x,
      last: [...(x.history||[])].reverse().find(h => h.type === 'end' || h.type === 'start')
    }))
    .filter(Boolean)

  return (
    <div className="mola-container">
      <header className="mola-header">
        <div className="header-left">
          <button className="geri-btn" onClick={onBack}>← Geri</button>
          <div className="header-title">
            <h1>Mola Yönetimi</h1>
            <p>{userProfile?.fullName || 'Kullanıcı'}</p>
          </div>
        </div>
        <div className="date-picker-container">
          <label>Tarih:</label>
          <input type="date" value={selectedDate} max={getTodayLocalISO()} onChange={(e)=>setSelectedDate(e.target.value)} className="date-picker-input" />
          <button className="bugun-btn" onClick={()=>setSelectedDate(getTodayLocalISO())}>Bugün</button>
        </div>
      </header>

      {error && <div className="err">{error}</div>}

      <main className="mola-main">
        <div className="mola-kart">
          <h3>☕ Mola Seçenekleri</h3>
          <div className="mola-btn-grid">
            <button className="mola-btn" disabled={loading || !!activeNow} onClick={()=>start('yemek_45',45)} title="45 dakikalık yemek molası başlat">
              <div className="btn-icon">🍽️</div>
              <div className="btn-content">
                <h4>Yemek Molası</h4>
                <p>45 dakika</p>
              </div>
            </button>
            <button className="mola-btn" disabled={loading || !!activeNow} onClick={()=>start('yemek_30',30)} title="30 dakikalık yemek molası başlat">
              <div className="btn-icon">🍽️</div>
              <div className="btn-content">
                <h4>Yemek Molası</h4>
                <p>30 dakika</p>
              </div>
            </button>
            <button className="mola-btn" disabled={loading || !!activeNow} onClick={()=>start('normal_15',15)} title="15 dakikalık mola başlat">
              <div className="btn-icon">☕</div>
              <div className="btn-content">
                <h4>Normal Mola</h4>
                <p>15 dakika</p>
              </div>
            </button>
          </div>

          {activeNow && (
            <div className="aktif-mola">
              <div className="aktif-bilgi">
                <span className="pill">Aktif</span>
                <span className="tip">{activeNow.type}</span>
                <span className="saat">{activeNow.startedAt?.clientTime} → {activeNow.expectedEndAt?.clientTime}</span>
                {(() => {
                  const exp = activeNow.expectedEndAt?.millis || 0
                  const rem = exp - nowMs
                  if (rem > 0) return <span className="pill soft">Kalan {msToClock(rem)}</span>
                  const over = nowMs - exp
                  const planned = (activeNow.duration || 0) * 60 * 1000
                  const warnPct = planned ? Math.round((over / planned) * 100) : 0
                  // %50 ve üzeri aşımda bir kez uyarı kaydı oluştur
                  if (!myRecord?.alertSentAt && warnPct >= 50) {
                    flagBreakOverrunAlert({
                      uid: userProfile?.uid,
                      fullName: userProfile?.fullName,
                      department: userProfile?.department,
                      position: userProfile?.position
                    }, selectedDate, {
                      breakType: activeNow.type,
                      duration: activeNow.duration,
                      startedAtMillis: activeNow.startedAt?.millis,
                      expectedEndMillis: activeNow.expectedEndAt?.millis,
                      overMillis: over,
                      overPct: warnPct
                    })
                  }
                  return <span className="pill danger">AŞIM +{msToClock(over)} {warnPct > 0 ? `(%${warnPct})` : ''}</span>
                })()}
                {myRecord?.alertSentAt && <span className="pill soft">Yönetime bildirildi</span>}
              </div>
              <button className="bitir-btn" disabled={loading} onClick={finish}>Molayı Bitir</button>
            </div>
          )}
        </div>

        <div className="panel-columns">
          <div className="panel-card">
            <div className="panel-card-header">
              <span className="btn-icon">📋</span>
              <span className="title">Bugün Mola Yapanlar</span>
              <span className="count">{bugunMolaYapanlar.length}</span>
            </div>
            <div className="list-scroll">
              {bugunMolaYapanlar.length === 0 ? (
                <div className="empty-state">Kayıt yok</div>
              ) : (
                bugunMolaYapanlar.map((x)=> {
                  const isActive = x.active && x.activeBreak
                  let extra = null
                  let pct = 0
                  // Seansları çıkart ve toplam süre/adet hesapla
                  const hist = Array.isArray(x.history) ? [...x.history].sort((a,b)=>(a.atMillis||0)-(b.atMillis||0)) : []
                  const sessions = []
                  let cur = null
                  for (const h of hist) {
                    if (h.type === 'start') cur = { start: h.atMillis, duration: h.duration, type: h.breakType }
                    else if (h.type === 'end' && cur) { sessions.push({ ...cur, end: h.atMillis }); cur = null }
                  }
                  if (isActive) sessions.push({ start: x.activeBreak?.startedAt?.millis, end: null, duration: x.activeBreak?.duration, type: x.activeBreak?.type })
                  const completed = sessions.filter(s => s.start && s.end)
                  const totalMs = completed.reduce((acc, s) => acc + Math.max(0, (s.end - s.start)), 0) + (isActive ? Math.max(0, nowMs - (x.activeBreak?.startedAt?.millis||nowMs)) : 0)
                  const totalCount = completed.length + (isActive ? 1 : 0)
                  if (isActive) {
                    const started = x.activeBreak?.startedAt?.millis || 0
                    const expected = x.activeBreak?.expectedEndAt?.millis || 0
                    const planned = (x.activeBreak?.duration || 0) * 60 * 1000
                    const elapsed = Math.max(0, nowMs - started)
                    pct = planned ? Math.min(100, Math.round((elapsed / planned) * 100)) : 0
                    if (nowMs < expected) {
                      extra = <span className="chip">Kalan {msToClock(expected - nowMs)}</span>
                    } else {
                      const over = nowMs - expected
                      const warnPct = planned ? Math.round((over / planned) * 100) : 0
                      extra = <span className="chip warn">Aşım +{msToClock(over)} {warnPct>0?`(%${warnPct})`:''}</span>
                    }
                  }
                  return (
                    <div
                      key={x.id}
                      className="user-row clickable"
                      onClick={() => setDetailRecord({ ...x, date: selectedDate })}
                      title="Günün mola detaylarını gör"
                    >
                      <div className="user-info">
                        <div className="user-name">{x.fullName}</div>
                        <div className="chips">
                          <span className="chip">Molalar: {totalCount}</span>
                          <span className="chip">Toplam: {msToHMS(totalMs)}</span>
                          {extra}
                        </div>
                        {isActive && (
                          <div className={`progress ${nowMs > (x.activeBreak?.expectedEndAt?.millis||0) ? 'over' : ''}`}>
                            <div className="progress-bar" style={{width: `${pct}%`}} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-card-header">
              <span className="btn-icon">⏱️</span>
              <span className="title">Şu An Aktif Moladakiler</span>
              <span className="count">{aktifMoladakiler.length}</span>
            </div>
            <div className="list-scroll">
              {aktifMoladakiler.length === 0 ? (
                <div className="empty-state">Kimse yok</div>
              ) : (
                aktifMoladakiler.map((x)=> (
                  <div key={x.id} className="user-row">
                    <div className="user-info">
                      <div className="user-name">{x.fullName}</div>
                      <div className="chips">
                        <span className="chip">{x.activeBreak?.type}</span>
                        <span className="chip">{x.activeBreak?.startedAt?.clientTime} → {x.activeBreak?.expectedEndAt?.clientTime}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <MolaDetayModal
        open={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        record={detailRecord}
      />
    </div>
  )
}
