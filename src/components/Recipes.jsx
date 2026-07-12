import { useId, useState } from 'react'

import { Search, ChevDown, Alert, Book, Box } from './Icons.jsx'

/**
 * Grainy gradient covers.
 * Tints of the product palette only — blue, red, and the warm grey. Each palette
 * is [paper, light, shade, deep]: a near-white base, a lift, a shade, and one
 * saturated note used sparingly. Lights are blurred far past their own radius,
 * so they read as light through paper rather than as shapes. The grain is what
 * makes it look printed instead of plastic.
 */
export const COVER_COLORS = {
  blue: ['#c2d2f4', '#e9eefb', '#8aa8e8', '#2f5fe0'],
  steel: ['#c3ccdc', '#e6eaf2', '#8b9bb8', '#3a4a68'],
  red: ['#f2c9b6', '#fbe6dc', '#e29a7c', '#ce4023'],
  clay: ['#e8c3b3', '#f7e2d8', '#c98a70', '#a8503a'],
  sand: ['#ded3b4', '#f0e9d6', '#bfae83', '#8a7a55'],
  stone: ['#d5d2c8', '#eceae4', '#b0ada2', '#64625b'],
  ink: ['#c9c7c1', '#e6e4df', '#96948d', '#1e1d1a'],
  slate: ['#c3d0d6', '#e5ecef', '#8ba2ac', '#3f5560']
}
const PALETTES = Object.keys(COVER_COLORS)
const LAYOUTS = ['corner', 'sweep', 'knot', 'fog']

function hash(t = '') {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
// deterministic: the same recipe always gets the same cover
export function paletteFromText(t) { return PALETTES[hash(t) % PALETTES.length] }
export function variantFromText(t) { return paletteFromText(t) }

export function RecipeCover({ color = 'blue', label = '' }) {
  const uid = useId().replace(/:/g, '')
  const [paper, light, shade, deep] = COVER_COLORS[color] || COVER_COLORS.blue
  const h = hash(label || color)
  const r = i => ((h >> (i * 5)) & 31) / 31
  const layout = LAYOUTS[(h >>> 27) % LAYOUTS.length]

  return (
    <svg className="recipe-cover" viewBox="0 0 340 195" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id={`b-${uid}`} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
        <filter id={`b2-${uid}`} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="24" />
        </filter>
        <filter id={`g-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          {/* stretch the noise around mid-grey, otherwise the blend barely bites */}
          <feComponentTransfer>
            <feFuncR type="linear" slope="1.7" intercept="-0.35" />
            <feFuncG type="linear" slope="1.7" intercept="-0.35" />
            <feFuncB type="linear" slope="1.7" intercept="-0.35" />
          </feComponentTransfer>
        </filter>
        <clipPath id={`c-${uid}`}><rect width="340" height="195" /></clipPath>
      </defs>

      <g clipPath={`url(#c-${uid})`}>
        <rect width="340" height="195" fill={paper} />

        {/* Four compositions, not one. Which one a recipe gets is fixed by its name. */}
        <g filter={`url(#b-${uid})`}>
          {layout === 'corner' && (
            <>
              <ellipse cx={30 + r(0) * 40} cy={20} rx="150" ry="105" fill={light} />
              <ellipse cx={300} cy={180 + r(1) * 20} rx="120" ry="90" fill={shade} />
              <ellipse cx={250 + r(2) * 60} cy={150} rx="70" ry="55" fill={deep} opacity="0.34" />
            </>
          )}
          {layout === 'sweep' && (
            <>
              <g transform={`rotate(${-28 + r(3) * 16} 170 98)`}>
                <ellipse cx="170" cy="60" rx="240" ry="60" fill={light} />
                <ellipse cx="170" cy="150" rx="240" ry="55" fill={shade} />
              </g>
              <ellipse cx={40 + r(4) * 40} cy={170} rx="90" ry="60" fill={deep} opacity="0.26" />
            </>
          )}
          {layout === 'knot' && (
            <>
              <ellipse cx="170" cy="98" rx="200" ry="130" fill={light} />
              <ellipse cx={120 + r(0) * 120} cy={90 + r(1) * 40} rx="80" ry="70" fill={shade} />
              <ellipse cx={110 + r(2) * 130} cy={80 + r(3) * 50} rx="42" ry="38" fill={deep} opacity="0.4" />
            </>
          )}
          {layout === 'fog' && (
            <>
              <ellipse cx="170" cy={-10} rx="260" ry="70" fill={shade} />
              <ellipse cx="170" cy="100" rx="260" ry="60" fill={light} />
              <ellipse cx={60 + r(5) * 220} cy={200} rx="150" ry="60" fill={deep} opacity="0.28" />
            </>
          )}
        </g>

        {/* one soft knot keeps it from reading as a flat wash */}
        <g filter={`url(#b2-${uid})`}>
          <ellipse cx={180 + r(1) * 130} cy={40 + r(4) * 110} rx={22 + r(2) * 18} ry={26 + r(5) * 20}
            fill={deep} opacity="0.2" />
        </g>

        {/* grain — the whole point */}
        <rect width="340" height="195" filter={`url(#g-${uid})`} opacity="0.5" style={{ mixBlendMode: 'multiply' }} />
        <rect width="340" height="195" filter={`url(#g-${uid})`} opacity="0.35" style={{ mixBlendMode: 'overlay' }} />
      </g>
    </svg>
  )
}

/**
 * SWATCH_PALETTES — pastel, but with real hue distance: a category should be
 * legible by colour alone. Dairy blue, greens green, bakery brown, coffee
 * mauve, fruit pink. Each is [wash, light, tint]; the tint carries the hue,
 * so it's the saturated one, and the grain keeps it from looking flat.
 */
export const SWATCH_PALETTES = {
  dairy:  ['#dde9fb', '#eef4ff', '#a9c8f2'],   // soft blue — milk
  green:  ['#dcefd4', '#ecf7e6', '#a3d492'],   // fresh green — produce
  bakery: ['#ecd9be', '#f6ebd8', '#d3ac7c'],   // warm brown — bread
  coffee: ['#e6dae6', '#f2eaf2', '#c3a4c6'],   // mauve — roast
  egg:    ['#fdeec8', '#fff8e4', '#f5d47e'],   // yellow — yolk
  fruit:  ['#f8dee8', '#fdeef3', '#f0aec6'],   // pink — fruit
  violet: ['#e4ddf6', '#f0ebfb', '#bfaeea'],   // lilac
  neutral:['#e7e4dc', '#f5f3ee', '#cfc9bb']    // stone — fallback
}
export function GrainSwatch({ palette = 'neutral', seed = '' }) {
  const uid = useId().replace(/:/g, '')
  const [wash, light, tint] = SWATCH_PALETTES[palette] || SWATCH_PALETTES.neutral
  const h = hash(seed || palette)
  const cx = 8 + (h & 15), cy = 8 + ((h >> 4) & 15)
  return (
    <svg className="recipe-cover" viewBox="0 0 32 32" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id={`sb-${uid}`} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id={`sg-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      {/* the tint (hue) leads; wash and light only soften the edges */}
      <rect width="32" height="32" fill={tint} />
      <g filter={`url(#sb-${uid})`}>
        <circle cx={cx} cy={cy} r="13" fill={light} opacity="0.7" />
        <circle cx={32 - cx} cy={32 - cy} r="11" fill={wash} opacity="0.55" />
      </g>
      {/* grain, back and legible — soft-light keeps it gentle on pale tones */}
      <rect width="32" height="32" filter={`url(#sg-${uid})`} opacity="0.35" style={{ mixBlendMode: 'soft-light' }} />
      <rect width="32" height="32" filter={`url(#sg-${uid})`} opacity="0.12" style={{ mixBlendMode: 'multiply' }} />
    </svg>
  )
}

// ---- Small category icons, 14px, same weight as the rest of the set -------
const ic = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
const CupIcon = p => <svg {...ic} {...p}><path d="M3 5h8v4a4 4 0 0 1-8 0V5Z" /><path d="M11 6h1.5a1.5 1.5 0 0 1 0 3H11" /><path d="M3 14h8" /></svg>
const LeafIcon = p => <svg {...ic} {...p}><path d="M3 13c0-5 3.5-8.5 9.5-9C13 10 10 13.5 4.5 13.5" /><path d="M3 13.5 7.5 9" /></svg>
const ColdIcon = p => <svg {...ic} {...p}><path d="M4 4h8l-1 9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L4 4Z" /><path d="M3.5 7h9" /><path d="M8 2v2" /></svg>
const PastryIcon = p => <svg {...ic} {...p}><path d="M2 11c2-4 3.5-5.5 6-5.5S12 7 14 11" /><path d="M2 11h12" /><path d="M6 11c0-3 .8-4.5 2-4.5S10 8 10 11" /></svg>
const BreadIcon = p => <svg {...ic} {...p}><rect x="2.5" y="5" width="11" height="8" rx="2.5" /><path d="M5.5 5V3.5M8 5V3.5M10.5 5V3.5" /></svg>
const PlateIcon = p => <svg {...ic} {...p}><circle cx="8" cy="8" r="6" /><circle cx="8" cy="8" r="2.5" /></svg>
const SandwichIcon = p => <svg {...ic} {...p}><path d="M2.5 5.5 8 3l5.5 2.5-5.5 2.5L2.5 5.5Z" /><path d="M2.5 9 8 11.5 13.5 9" /><path d="M2.5 12 8 14.5 13.5 12" /></svg>
const GridIcon = p => <svg {...ic} {...p}><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" /><rect x="9" y="9" width="4.5" height="4.5" rx="1" /></svg>
const AllIcon = p => <svg {...ic} {...p}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></svg>

// ---- Menu data ------------------------------------------------------------
// Flags are the things that make the number on the card untrustworthy.
const RECIPES = [
  { name: 'Flat white', cat: 'Coffee', ing: 2, cost: '£0.84', margin: '79%', color: 'clay' },
  { name: 'Cappuccino', cat: 'Coffee', ing: 3, cost: '£0.81', margin: '73%', color: 'sand', flag: 'Cost drift' },
  { name: 'Latte', cat: 'Coffee', ing: 2, cost: '£0.82', margin: '72%', color: 'clay' },
  { name: 'Americano', cat: 'Coffee', ing: 2, cost: '£0.45', margin: '86%', color: 'slate' },
  { name: 'Mocha', cat: 'Coffee', ing: 4, cost: '£0.95', margin: '66%', color: 'clay', flag: 'Below margin floor' },
  { name: 'Cortado', cat: 'Coffee', ing: 2, cost: '£0.68', margin: '81%', color: 'sand' },
  { name: 'Macchiato', cat: 'Coffee', ing: 2, cost: '£0.54', margin: '83%', color: 'red' },
  { name: 'Iced latte', cat: 'Cold drinks', ing: 3, cost: '£0.94', margin: '79%', color: 'slate' },
  { name: 'Cold brew', cat: 'Cold drinks', ing: 2, cost: '£0.71', margin: '82%', color: 'blue', flag: 'No supplier price' },
  { name: 'English breakfast', cat: 'Tea', ing: 2, cost: '£0.32', margin: '89%', color: 'blue' },
  { name: 'Earl Grey', cat: 'Tea', ing: 2, cost: '£0.34', margin: '88%', color: 'ink' },
  { name: 'Almond croissant', cat: 'Pastry', ing: 5, cost: '£1.08', margin: '70%', color: 'red', flag: 'Allergens missing' },
  { name: 'Blueberry muffin', cat: 'Pastry', ing: 6, cost: '£0.75', margin: '74%', color: 'steel' },
  { name: 'Lemon drizzle slice', cat: 'Bakery', ing: 9, cost: '£0.93', margin: '71%', color: 'sand' },
  { name: 'Avocado toast', cat: 'Food', ing: 7, cost: '£2.14', margin: '75%', color: 'sand' },
  { name: 'Ham & cheese baguette', cat: 'Sandwiches', ing: 6, cost: '£2.04', margin: '66%', color: 'ink' },
  { name: 'Chicken & mayo sandwich', cat: 'Sandwiches', ing: 8, cost: '£1.86', margin: '68%', color: 'slate' }
]

// Sub-recipes: made in-house, never sold on their own, costed into the ones above.
const COMPONENTS = [
  { name: 'Vanilla syrup', cat: 'Used in 6 recipes', ing: 3, cost: '£0.04', margin: 'per 25 ml', color: 'sand' },
  { name: 'Oat milk foam', cat: 'Used in 4 recipes', ing: 2, cost: '£0.11', margin: 'per serve', color: 'blue' },
  { name: 'Chicken filling', cat: 'Used in 2 recipes', ing: 5, cost: '£0.94', margin: 'per 120 g', color: 'slate', flag: 'Unit mismatch' },
  { name: 'House granola', cat: 'Used in 3 recipes', ing: 8, cost: '£0.38', margin: 'per 60 g', color: 'clay' }
]

const CATS = [
  { id: 'All', icon: AllIcon }, { id: 'Coffee', icon: CupIcon }, { id: 'Tea', icon: LeafIcon },
  { id: 'Cold drinks', icon: ColdIcon }, { id: 'Pastry', icon: PastryIcon }, { id: 'Bakery', icon: BreadIcon },
  { id: 'Food', icon: PlateIcon }, { id: 'Sandwiches', icon: SandwichIcon }
]

function RecipeCard({ r, prep }) {
  return (
    <div className="rec-card">
      <div className="rec-cover-wrap">
        <RecipeCover color={r.color} label={r.name} />
        {r.flag &&<span className="rec-flag"><Alert size={16} /> {r.flag}</span>}
      </div>
      <div className="rec-meta">
        <div className="rec-name">{r.name}</div>
        <div className="rec-sub">{prep ? r.cat : `${r.cat}, ${r.ing} ingredients`}</div>
        <div className="rec-foot">
          <span className="rec-cost">{r.cost}</span>
          <span className="rec-dot">—</span>
          <span className="rec-margin">{prep ? r.margin : `GP ${r.margin}`}</span>
        </div>
      </div>
    </div>
  )
}

export default function RecipesPage() {
  const [tab, setTab] = useState('all')
  const [cat, setCat] = useState('All')

  const attention = RECIPES.filter(r => r.flag)
  const prep = tab === 'prep'
  const base = tab === 'attention' ? attention : prep ? COMPONENTS : RECIPES
  const list = prep || tab === 'attention' ? base : base.filter(r => cat === 'All' || r.cat === cat)

  const TABS = [
    { id: 'all', label: 'All recipes', icon: Book },
    { id: 'attention', label: `Needs attention (${attention.length})`, icon: Alert },
    { id: 'prep', label: `Components & prep (${COMPONENTS.length})`, icon: Box }
  ]

  return (
    <div className="lib-page">
      <div className="lib-head">
        <div>
          <h1>Recipes</h1>
          <div className="lib-sub">Everything on the menu at Fitzroy Espresso, with what it costs to make.</div>
        </div>
        <button className="btn btn-primary">Add recipe</button>
      </div>

      <div className="lib-toolbar">
        <div className="scope-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`scope-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
        <div className="lib-tools">
          <span className="lib-search"><Search size={16} /> Search...</span>
          <button className="lib-icon-btn" aria-label="Grid view"><GridIcon /></button>
          {/* Filter is a field-like control, not a tab — it matches the search beside it */}
          <button className="lib-filter">Filter <ChevDown size={16} /></button>
        </div>
      </div>

      {tab === 'all' && (
        <div className="cat-pills">
          {CATS.map(c => (
            <button key={c.id} className={`cat-pill ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>
              <c.icon /> {c.id}
            </button>
          ))}
        </div>
      )}

      {tab === 'attention' && (
        <div className="lib-note">Two recipes are costing more than they should, and two have numbers Edify can't stand behind yet.</div>
      )}
      {prep && (
        <div className="lib-note">Made in-house and costed into the recipes that use them. Change one and every recipe above it is recosted.</div>
      )}

      <div className="rec-grid">
        {list.map(r => <RecipeCard key={r.name} r={r} prep={prep} />)}
      </div>

      <div className="space-hint">Browsing lives here. Creating and recosting happen through Edify — it builds the recipe, prices it to your target and asks you to confirm.</div>
    </div>
  )
}
