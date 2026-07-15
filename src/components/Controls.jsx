import { Back, X, Clock } from './Icons.jsx'
import { cutoffLabel, DEADLINE_TS } from '../data.js'

// One 28×28 container for every compact icon-only control. Variants set the
// visual hierarchy; size, radius, icon and focus ring are shared.
//   secondary → subtle standing background (Back — persistent navigation)
//   tertiary  → transparent, background on hover (Close — quiet dismiss)
export function CompactIconButton({ variant = 'secondary', label, onClick, children }) {
  return (
    <button type="button" className={`cbtn ${variant}`} aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}

export function BackIconButton({ onClick, label = 'Back' }) {
  return <CompactIconButton variant="secondary" label={label} onClick={onClick}><Back size={16} /></CompactIconButton>
}

export function CloseIconButton({ onClick, label = 'Close' }) {
  return <CompactIconButton variant="tertiary" label={label} onClick={onClick}><X size={16} /></CompactIconButton>
}

// One deadline chip everywhere — Home, notifications, task-chat headers. All
// instances read the same DEADLINE_TS, so the time stays in sync; red only
// when the deadline is genuinely close.
export function DeadlineChip({ label }) {
  const mins = Math.max(0, Math.round((DEADLINE_TS - Date.now()) / 60000))
  const urgent = mins <= 30
  return (
    <span className={`deadline-chip2 ${urgent ? 'urgent' : ''}`}>
      <Clock size={16} /> {label || cutoffLabel()}
    </span>
  )
}
