import React, { useEffect } from 'react'
import './CenterNotice.css'

export default function CenterNotice({ open, icon = '🎉', title, subtitle, duration = 2200, onClose }) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => onClose?.(), duration)
    return () => clearTimeout(t)
  }, [open, duration, onClose])

  if (!open) return null
  return (
    <div className="cn-overlay" onClick={onClose}>
      <div className="cn-card" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-live="assertive">
        <div className="cn-icon">{icon}</div>
        {title && <div className="cn-title">{title}</div>}
        {subtitle && <div className="cn-sub">{subtitle}</div>}
        <button className="cn-close" onClick={onClose}>×</button>
      </div>
    </div>
  )
}
