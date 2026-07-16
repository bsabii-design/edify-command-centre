export const COMPANY = 'Ferra Coffee'
export const CURRENT_SITE = 'Fitzroy Espresso'

// The 14 London sites Ferra Coffee runs — every one of them on Edify.
// Hub kitchen is the shared prep site; the other thirteen are cafés.
export const SITES = [
  'Fitzroy Espresso', 'Holborn', 'Clapham', 'Richmond', 'Shoreditch',
  'Islington', 'Soho', 'Borough', 'Canary Wharf', 'Hackney',
  'Notting Hill', 'Greenwich', 'Peckham', 'Hub kitchen'
]

// A site list is only worth spelling out while it's short — past that the
// count is what the operator actually reads.
export function formatSites(sites) {
  if (!sites || !sites.length) return '—'
  if (sites.length === SITES.length) return `All ${SITES.length} sites`
  if (sites.length <= 3) return sites.join(', ')
  return `${sites.length} sites`
}

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Suppliers already set up on other Ferra Coffee sites — full records, so they
// can be copied (add), edited (update) or removed (delete).
const FERRA_SUPPLIERS = {
  // Bidfood is deliberately absent here — Fitzroy already orders from them
  // (the order / invoice / GP case), so they're not a "reuse from another
  // site" candidate. Harvest Provisions is set up elsewhere but not here.
  'harvest provisions': {
    name: 'Harvest Provisions', usedBy: ['Holborn', 'Clapham', 'Hub kitchen'],
    orderEmail: 'orders@harvestprovisions.co.uk', phone: '+44 20 7946 0148',
    cutoff: '16:00', leadTime: 'Next business day', minimumOrder: '£200',
    deliveryDays: ['Mon', 'Wed', 'Fri']
  },
  'bean brothers': {
    name: 'Bean Brothers', usedBy: ['Holborn', 'Clapham'],
    orderEmail: 'orders@beanbrothers.co.uk', phone: '+44 113 322 5588',
    cutoff: '15:00', leadTime: '2 days', minimumOrder: '£150',
    deliveryDays: ['Thu']
  },
  'estate dairy': {
    name: 'Estate Dairy', usedBy: ['Richmond'],
    orderEmail: 'trade@estatedairy.co.uk', phone: '+44 117 456 7788',
    cutoff: '14:00', leadTime: 'Next business day', minimumOrder: '£80',
    deliveryDays: ['Tue', 'Fri']
  }
}

const EXISTING_NAMES = Object.values(FERRA_SUPPLIERS).map(s => s.name)
export function existingSupplierNames() { return EXISTING_NAMES }

export function formatSupplierName(name) {
  return name.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getSupplier(name) {
  const key = name.trim().toLowerCase()
  return FERRA_SUPPLIERS[key] ? { ...FERRA_SUPPLIERS[key] } : null
}
export function searchSupplier(name) { return getSupplier(name) }

// A brand-new supplier isn't on file anywhere — Edify can't invent their ordering
// details, so the operator provides them. This turns whatever they type or paste
// into a structured draft (only the fields it can confidently read).
export function parseSupplierInput(text, name) {
  const draft = { name: formatSupplierName(name), site: CURRENT_SITE, deliveryDays: [] }
  const email = text.match(/[\w.+-]+@[\w.-]+\.\w+/)
  if (email) draft.orderEmail = email[0].toLowerCase()
  const cut = text.match(/cut[- ]?off[^\d]*(\d{1,2}[:.]\d{2})/i) || text.match(/\b(\d{1,2}:\d{2})\b/)
  if (cut) draft.cutoff = cut[1].replace('.', ':')
  const min = text.match(/(?:min(?:imum)?[^£€$\d]*)?([£€$])\s*([\d,]+)/i)
  if (min) { draft.currency = min[1]; draft.minAmount = min[2]; draft.minimumOrder = `${min[1]}${min[2]}` }
  const days = parseDeliveryDays(text)
  if (days.length) draft.deliveryDays = days
  return draft
}
export function emptyDraft(name) {
  return { name: formatSupplierName(name), site: CURRENT_SITE, deliveryDays: [] }
}

// Required to create: order email, at least one delivery day, a cut-off.
// Minimum order is optional. Used for the live "N required details missing".
export function requiredMissing(draft) {
  let n = 0
  if (!draft?.orderEmail) n++
  if (!draft?.deliveryDays || draft.deliveryDays.length === 0) n++
  if (!draft?.cutoff) n++
  return n
}
export function draftReady(draft) { return requiredMissing(draft) === 0 }

const DAYS_RE = 'mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?'
export function parseDeliveryDays(text) {
  const map = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
  if (/every ?day|all week|daily/i.test(text)) return [...WEEK_DAYS]
  const found = []
  for (const m of text.toLowerCase().matchAll(new RegExp(DAYS_RE, 'gi'))) {
    const key = m[0].slice(0, 3)
    if (map[key] && !found.includes(map[key])) found.push(map[key])
  }
  return WEEK_DAYS.filter(d => found.includes(d))
}
export function formatDays(days) {
  if (!days || !days.length) return '—'
  if (days.length === 7) return 'Every day'
  return days.join(', ')
}

// Intent: add / update / delete + optional supplier name.
export function detectSupplierIntent(text) {
  const t = text.trim()
  let m = t.match(/^(?:delete|remove)\s+(?:supplier\s+)?(.+?)\.?$/i)
  if (m && !/^supplier$/i.test(m[1])) return { action: 'delete', name: formatSupplierName(m[1]) }
  if (/^(?:delete|remove)\s+supplier$/i.test(t)) return { action: 'delete', name: null }

  m = t.match(/^(?:update|change|edit)\s+(?:supplier\s+)?(.+?)\.?$/i)
  if (m && !/^suppliers?$/i.test(m[1])) return { action: 'update', name: formatSupplierName(m[1]) }
  if (/^(?:update|change|edit)\s+suppliers?$/i.test(t)) return { action: 'update', name: null }

  m = t.match(/^(?:add|new|set ?up)\s+(?:a\s+)?(?:new\s+)?supplier(?:\s+(.+?))?\.?$/i)
  if (m) return { action: 'add', name: m[1] ? formatSupplierName(m[1]) : null }
  // Free-text phrasings: "I want to add Harvest Provisions as a supplier",
  // "set up Caravan Coffee as a new supplier", "add the supplier Harvest Provisions".
  m = t.match(/\b(?:add|set ?up|create|onboard)\s+(.+?)\s+as\s+(?:a\s+)?(?:new\s+)?supplier\b/i)
  if (m) return { action: 'add', name: formatSupplierName(m[1]) }
  m = t.match(/\badd\s+(?:the\s+)?(?:new\s+)?supplier\s+(.+?)\.?$/i)
  if (m && !/^suppliers?$/i.test(m[1])) return { action: 'add', name: formatSupplierName(m[1]) }
  return { action: 'add', name: null }
}

export function detectSupplierSwitch(text) {
  const t = text.trim()
  let m = t.match(/actually,?\s+add\s+(.+?)(?:\s+instead)?\.?$/i)
  if (m) return formatSupplierName(m[1])
  m = t.match(/^add\s+(.+?)\s+instead\.?$/i)
  if (m) return formatSupplierName(m[1])
  return null
}

export function mergeSupplierDraft(draft, updates) {
  const next = { ...draft }
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) next[key] = value
  })
  return next
}

export function confirmationText(supplier, created = false) {
  const verb = created ? 'created for' : 'added to'
  return `**${supplier.name}** ${verb} Fitzroy Espresso.\n\nOrders will be sent to ${supplier.orderEmail}.\nCut-off ${supplier.cutoff}.\nDelivery: ${formatDays(supplier.deliveryDays)}.\n\nWhen their first order window comes up, it'll appear on Home — the same way Saturday's basket did.`
}
