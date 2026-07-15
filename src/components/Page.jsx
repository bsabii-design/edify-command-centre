import { useState } from 'react'
import { Search } from './Icons.jsx'

// One page system for every directory and history view. Pages supply labels,
// column widths and row content — never their own padding, borders or type.
// The page itself is the surface: no outer card, no per-row rectangles, one
// header divider, subtle full-row hover.

export function PageShell({ children }) {
  return <div className="page">{children}</div>
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="page-head">
      <div className="page-head-l">
        <h1 className="page-h1">{title}</h1>
        {description && <div className="page-desc">{description}</div>}
      </div>
      {action && <button className="btn btn-primary page-action" onClick={action.fn}>{action.label}</button>}
    </div>
  )
}

export function PageToolbar({ tabs, tab, onTab, searchable, query, onQuery }) {
  if (!tabs?.length && !searchable) return null
  return (
    <div className="page-toolbar">
      <div className="page-tabs">
        {(tabs || []).map(t => (
          <button key={t.key} className={`ptab ${tab === t.key ? 'active' : ''}`} onClick={() => onTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {searchable && (
        <label className="search-inline">
          <Search size={16} />
          <input value={query} placeholder="Search" onChange={e => onQuery(e.target.value)} />
        </label>
      )}
    </div>
  )
}

// A borderless list. The grid template is shared by the header and every row
// so columns line up on the same anchors regardless of content.
export function DirectoryTable({ template, cols, children }) {
  return (
    <div className="dtable" style={{ '--cols': template }}>
      <div className="drow dhead">
        {cols.map((c, i) => <span key={i} className={`dc ${c.align === 'right' ? 'num' : ''}`}>{c.label}</span>)}
      </div>
      {children}
    </div>
  )
}

export function DirectoryRow({ cells, cols, onClick }) {
  return (
    <div className={`drow ${onClick ? 'clickable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      {cells.map((node, i) => <span key={i} className={`dc ${cols[i]?.align === 'right' ? 'num' : ''}`}>{node}</span>)}
    </div>
  )
}

// The primary object cell: optional compact initial, Medium name, muted sub.
export function PrimaryObjectCell({ initial, name, sub }) {
  return (
    <span className="pcell">
      {initial && <span className="pcell-ini">{initial}</span>}
      <span className="pcell-txt">
        <span className="pcell-name">{name}</span>
        {sub && <span className="pcell-sub">{sub}</span>}
      </span>
    </span>
  )
}

// Status: quiet plain text — used for numeric variance, not workflow states.
export function StatusCell({ label, tone = 'default' }) {
  return <span className={`scell ${tone}`}>{label}</span>
}

// One reusable status chip across every directory table. Compact pill, soft
// tint + matching text, Medium label, sentence case. Semantic tones only:
//   active (blue) · success (green) · waiting (amber) · attention (red) ·
//   neutral (grey). Informational — never a button.
export function StatusChip({ label, tone = 'neutral' }) {
  return <span className={`chip chip-${tone}`}>{label}</span>
}

// Convenience directory page: header + tabs/search at the page gutter, then a
// full-width table (full-bleed strokes/hover) whose row content keeps the
// gutter. Pages stay declarative — labels, widths, row content only.
export function DirectoryPage({ title, description, action, tabs, cols, template, rows, searchable = true }) {
  const [tab, setTab] = useState(tabs?.[0]?.key || 'all')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = rows.filter(r =>
    (!tabs?.length || tab === 'all' || (r.tags || []).includes(tab)) &&
    (!q || (r.search || '').toLowerCase().includes(q)))
  return (
    <div className="dir-view">
      <div className="page-hdr">
        <PageHeader title={title} description={description} action={action} />
        <PageToolbar tabs={tabs} tab={tab} onTab={setTab} searchable={searchable} query={query} onQuery={setQuery} />
      </div>
      <DirectoryTable template={template} cols={cols}>
        {shown.map(r => <DirectoryRow key={r.key} cells={r.cells} cols={cols} onClick={r.onClick} />)}
      </DirectoryTable>
      {shown.length === 0 && <div className="page-hdr page-empty">{q ? `No results for “${query}”.` : 'Nothing here yet.'}</div>}
    </div>
  )
}
