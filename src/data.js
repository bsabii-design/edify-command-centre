// ---- Scenario scripts -------------------------------------------------
// Each scenario: userText, steps, and resolutions keyed by the action taken
// on a card. A resolution may be a function (payload, entry) => steps.

// The deadline is written once. Home, the card and the interrupt all read it
// from here, so they can never drift apart.
export const PROMISE = 'Edify proposes — you confirm before anything changes.'

// The day strip — the shift's vitals in one quiet line, macOS-bar style.
// Only what neither the OS corner nor the task list already shows.
// Status-bar admission rule: only what may affect today's operations.
// A delivery coming → yes. A weather anomaly moving demand → yes. GP
// materially off → yes. A normal staff count, normal weather, normal GP —
// the manager already knows, so the bar stays quiet about them.
export const DAY = { deliveriesCount: 1, nextDelivery: '14:30', supplier: 'Estate Dairy', orderNo: '#5117', items: 5, value: '£212.40', weather: 'Warmer than usual', weatherDelta: '+4°', gpDrift: 3.3 }

// The deadline is a moment, not a string: everything that shows it derives
// the remaining time from this timestamp, so it ticks and never drifts.
export const DEADLINE_TS = Date.now() + 135 * 60000
export const cutoffLabel = () => {
  const m = Math.max(0, Math.round((DEADLINE_TS - Date.now()) / 60000))
  return m >= 60 ? `in ${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `in ${m}m`
}

// "How was this worked out?" is a question, not a card section. Ask it in the
// thread and Edify answers in its own words — one entry per scenario.
export const WORKING_TEXT = {
  cutoff: "Four things: your **par level** (60 L for a standard Saturday, set 12 May) — **POS demand**, oat drinks on the last four warm weekends ran 74–81 L (synced 13:58) — the **Met Office forecast**, Saturday 22° and sunny — and **Bidfood's cut-off**, 16:00 today with the next slot Tuesday.",
  oatmilk: "Four things: your **par level** (60 L for a standard Saturday, set 12 May) — **POS demand**, oat drinks on the last four warm weekends ran 74–81 L (synced 13:58) — the **Met Office forecast**, Saturday 22° and sunny — and **Bidfood's cut-off**, 16:00 today with the next slot Tuesday.",
  gp: "From three live sources: **POS sales** 29 Jun – 5 Jul, 4,182 transactions (synced 13:58) — **supplier invoices**, 3 posted this week, all matched — and **recipe costs**, version 214, recosted after the flour change at 12:30. The one input I don't have is Thursday's **stocktake**, still open at Hub kitchen — that's the unverified slice.",
  invoice: "I took invoice **#4821** as Bidfood sent it overnight, laid it against the **delivery note Marco signed at 08:05**, and compared quantity and expected price line by line. Six lines matched exactly. Two didn't — the cream count and the butter price.",
  delivery: "From the **PO you confirmed Thursday** (including your +20 L oat milk), the **driver's manifest** scanned at the door, and the expectation that Monday's **invoice** will be matched against whatever you check in here.",
  count: "From **yesterday's closing count** posted by Aisha at 07:20, **POS usage** — 418 white-based drinks sold since the last count — and the **crate pattern test**: a 12 L crate counted as single litres produces exactly this shape of difference.",
  muffins: "From **Monday's production plan** (12, unchanged for six weeks) and **POS sell-through** on the last four Mondays: 7, 6, 6, 7. The £3 is four muffins at cost.",
  default: "From the live data this card touches — POS, orders, invoices and counts. Ask about any number on it and I'll trace that one."
}

export const SCENARIOS = {
  cutoff: {
    id: 'cutoff',
    title: 'Saturday order — Bidfood',
    sub: 'One case: order → delivery → invoice',
    userText: null,
    steps: [
      { type: 'assistant', text: "Saturday's **oat milk** looks short. You ordered **60 L**, but I expect **~78 L** — Saturday is warmer than usual. The order locks at **16:00** today." },
      { type: 'assistant', text: "I prepared a change to **80 L**. Nothing is sent until you confirm." },
      { type: 'card', card: 'orderDiff' }
    ],
    resolutions: {
      confirm: [{ type: 'assistant', text: "Done — Bidfood accepted the update at {time}. Delivery expected **Saturday 07:30**, and I'll remind you when it arrives." }],
      decline: [{ type: 'assistant', text: "No changes made — oat milk stays at **60 L**, nothing was sent. Until the order locks at **16:00** I keep watching everything that could change this call — prices, stock, the forecast, the supplier. If anything shifts, it comes straight back to you the moment it does. Otherwise you won't hear about this again." }]
    }
  },

  oatmilk: {
    id: 'oatmilk',
    title: 'Saturday order — Bidfood',
    sub: 'One case: order → delivery → invoice',
    userText: "Add 20 litres of oat milk to Saturday's order",
    steps: [
      { type: 'assistant', text: "Saturday's basket goes to Bidfood — cut-off is today at **16:00**, so there's time. You currently have 60 L of Oatly Barista on it. For what it's worth, that matches what I'd suggest: warm Saturday forecast puts expected demand near 78 L." },
      { type: 'card', card: 'orderDiff' }
    ],
    resolutions: {
      confirm: [{ type: 'assistant', text: "Sent — Bidfood accepted the updated basket at {time}. Delivery lands **Saturday 07:30**. This case now sits in In progress on your Home — I'm watching it, and I'll ping you when the van arrives so you can check it in. Nothing else needed from you until then." }],
      decline: [{ type: 'assistant', text: "Left as is — the basket stays at **60 L**, nothing was sent. Until the order locks at **16:00** I keep watching everything that could change this call — prices, stock, the forecast, the supplier. If anything shifts, it comes straight back to you the moment it does. Otherwise you won't hear about this again." }]
    }
  },

  // Continuation of the same case — steps injected into the order thread when the
  // delivery event fires.
  delivery: {
    id: 'delivery',
    title: 'Saturday order — Bidfood',
    sub: 'Receiving',
    userText: null,
    steps: [
      { type: 'assistant', text: "**Saturday, 07:28.** Bidfood delivery is ready to check in — I pre-filled it from order **#2231**. Only change the quantities that don't match:" },
      { type: 'card', card: 'receiving' }
    ],
    resolutions: {
      receipt: (p) => {
        // Receiving records facts. The money conversation happens when the
        // invoice lands — Edify brings a drafted claim there.
        if (!p || p.diffs <= 0) {
          return [{ type: 'assistant', text: "Delivery confirmed — **8** items received, stock updated. I'll match the invoice when it arrives." }]
        }
        const n = p.diffs
        return [{ type: 'assistant', text: `Delivery confirmed — **8** items received, **${n} difference${n === 1 ? '' : 's'}** recorded. Stock is updated with what actually arrived, and I'll check the difference${n === 1 ? '' : 's'} against Bidfood's invoice when it lands. If they billed for the full order, I'll bring you a drafted credit claim.` }]
      },
      invoiceResolutions: (p) => [{ type: 'assistant', text: `Confirmed — **${(p?.lines || []).length} resolution${(p?.lines || []).length === 1 ? '' : 's'}** sent to Bidfood. Invoice #4902 waits for their response — stock stays based on received quantities and no expected prices were changed. I'll close the case when they reply.` }],
      invoiceAcceptAll: () => [{ type: 'assistant', text: `Accepted as billed — invoice #4902 posts at **£1,269.00**, no corrections requested. Case closed — the whole story is one thread in Journal.` }]
    }
  },

  gp: {
    id: 'gp',
    title: 'GP% this week — Fitzroy Espresso',
    sub: 'Computed from POS, invoices & counts',
    userText: 'Why is GP% down at this site this week?',
    steps: [
      { type: 'assistant', text: "Fitzroy Espresso is running **68.1% GP** this week against your four-week average of 71.4%. Three drivers explain most of the 3.3-point gap — and one part I can't verify yet, which I've marked rather than guessed:" },
      { type: 'card', card: 'gpBreakdown' },
      // The answer doesn't dead-end: the waste driver is a handle Priya can
      // pull. Tapping it starts a real case — proposed, confirmed, recorded.
      { type: 'followups', label: 'The muffin waste is the one I can fix today:', options: ["Trim Monday's muffin bake"] }
    ],
    resolutions: {}
  },

  // Born from the GP% answer — a question turning into a case.
  muffins: {
    id: 'muffins',
    title: "Monday's muffin bake — Hub kitchen",
    sub: 'Production planning',
    userText: null,
    steps: [
      { type: 'assistant', text: "Monday's plan bakes **12 blueberry muffins**, but the last four Mondays sold 6–7. Here's the change I'd send — nothing reaches the Hub kitchen until you confirm:" },
      { type: 'card', card: 'muffinPlan' }
    ],
    resolutions: {
      muffinConfirm: [{ type: 'assistant', text: "Sent — Monday's bake is now **8**, and the Hub kitchen has the updated plan. I'll watch Monday's sell-through: if they're gone before 15:00, I'll suggest putting two back. Next week's GP% answer will show whether this recovers the **−0.9 pts**." }],
      muffinKeep: [{ type: 'assistant', text: "Kept at **12** — nothing sent. The waste keeps showing in the weekly GP% answer, so you can change your mind any Monday." }]
    }
  },

  invoice: {
    id: 'invoice',
    title: 'Invoice #4821 — Bidfood',
    sub: "Thursday's delivery — needs review",
    userText: 'Review Bidfood invoice #4821',
    steps: [
      { type: 'assistant', text: "Bidfood invoice **#4821** is **£13.40** higher than Thursday's delivery record. I compared the invoice with the delivery note signed by Marco at 08:05. Two items need review — I've prepared a resolution for each, you just confirm:" },
      { type: 'card', card: 'invoiceMatch' }
    ],
    resolutions: {
      invoiceConfirm: (p) => {
        const c = p?.choices || {}
        const cream = c['Double cream 2 L'] || 'Request credit note'
        const butter = c['Butter 250 g'] || 'Ask supplier to confirm'
        const bothAccepted = /Accept/.test(cream) && /Accept/.test(butter)
        if (bothAccepted) {
          return [{ type: 'assistant', text: "Done — invoice **#4821** approved and passed for payment as charged. I've noted the butter is now £5.15 — nothing else changed." }]
        }
        const creamBit = /later/.test(cream) ? 'marked the 2 Double cream as coming in a later delivery'
          : /Accept/.test(cream) ? 'accepted the Double cream as charged'
          : 'asked Bidfood for a credit note on the 2 missing Double cream'
        const butterBit = /Accept/.test(butter) ? 'updated the butter to £5.15 for future orders'
          : 'sent the butter price difference to Bidfood to confirm'
        return [{ type: 'assistant', text: `Done — I've ${creamBit}, and ${butterBit}. Invoice **#4821** is now waiting for supplier — I'll chase it if nothing comes back by **Friday**, and I haven't changed any prices in the meantime.` }]
      }
    }
  },

  count: {
    id: 'count',
    title: "Yesterday's count — whole milk",
    sub: 'Difference +14 L vs POS usage',
    userText: "Check yesterday's whole milk count",
    steps: [
      { type: 'assistant', text: "Yesterday's count logged **22 L** of whole milk at close. POS usage says you should have had about **8 L** left — recipes sold on the day imply 31 L used from the 39 L you started with. A +14 L swing in one day almost never happens with milk. The pattern matches a crate counted as litres (one **12 L** crate + loose units)." },
      { type: 'card', card: 'countFix' }
    ],
    resolutions: {
      countCorrect: (p) => [{ type: 'assistant', text: `Corrected — yesterday's closing count is now **${p?.corrected ?? 8} L**. GP% and the weekly difference recalculate from the corrected figure, and the counting-unit slip is noted for tonight's checklist so it doesn't repeat.` }],
      recount: [{ type: 'assistant', text: "Recount requested — Marco will get it as the first item on tonight's closing checklist. Until then I've marked yesterday's milk figure *provisional*, so it won't feed into stock differences or GP% calculations as fact." }],
      acceptCount: [{ type: 'assistant', text: "Understood — count accepted as entered. I'll treat the 22 L as correct, which means the difference will show **+14 L unexplained gain** this week. If that reverses at the next count, I'll flag it as a likely counting slip." }]
    }
  },

  supplier: {
    id: 'supplier',
    title: 'Suppliers',
    sub: 'Fitzroy Espresso',
    userText: 'Add supplier',
    steps: [],           // driven by startSupplierFlow (add / update / delete)
    resolutions: {}
  },

  fallback: {
    id: 'fallback',
    title: 'New chat',
    sub: '',
    userText: null,
    steps: [
      { type: 'assistant', text: "In the full product I'd take that request. In this prototype, one case runs end-to-end (order → delivery → invoice) and a few more flows are wired — each shows a different part of the model:" },
      { type: 'chips' }
    ],
    resolutions: {}
  }
}

// ---- Basket (reference) -------------------------------------------------
// cat drives the swatch colour, so a line's category reads at a glance.
export const BASKET = [
  { name: 'Oatly Barista oat milk', sub: '1 L carton', qty: 60, unit: 'L', price: 1.42, isOat: true, cat: 'dairy' },
  { name: 'Whole milk', sub: '2 L bottle', qty: 48, unit: 'L', price: 0.96, cat: 'dairy' },
  { name: 'Double cream', sub: '2 L', qty: 8, unit: 'L', price: 3.10, cat: 'dairy' },
  { name: 'Butter, unsalted', sub: '250 g block', qty: 24, unit: 'pc', price: 5.15, cat: 'dairy' },
  { name: 'Free-range eggs', sub: 'tray of 30', qty: 6, unit: 'trays', price: 7.80, cat: 'egg' },
  { name: 'Sourdough loaf, sliced', sub: 'Fitzroy Bakehouse', qty: 18, unit: 'pc', price: 3.40, cat: 'bakery' },
  { name: 'Hass avocado', sub: 'Spanish, in season', qty: 40, unit: 'pc', price: 0.68, cat: 'green' },
  { name: 'Espresso blend', sub: '1 kg bag', qty: 12, unit: 'kg', price: 18.20, cat: 'coffee' }
]

// Charged − received reconciles to the £13.40 difference:
//   cream short 2 × £3.10 = £6.20  +  butter 24 × £0.30 (the +6.2%) = £7.20
export const INVOICE_TOTALS = { charged: '£1,249.60', received: '£1,236.20', difference: '£13.40', items: 2 }

export const INVOICE_LINES = [
  { name: 'Double cream 2 L', charged: '6 × £3.10', received: '4 × £3.10', diff: 'Short by 2', bad: true,
    kind: 'short', issue: '2 units were charged but not received.',
    resolution: 'Request credit note from Bidfood',
    options: ['Request credit note', 'It’s coming later', 'Accept as charged'] },
  { name: 'Butter 250 g', charged: '24 × £5.15', received: '24 × £4.85', diff: 'Price +6.2%', bad: true,
    kind: 'price', issue: 'Invoice price is 6.2% above the expected price.',
    resolution: 'Ask Bidfood to confirm the price difference',
    options: ['Ask supplier to confirm', 'Accept new price', 'Hold for supplier review'] },
  { name: 'Whole milk 2 L', charged: '48 × £0.96', received: '48 × £0.96', diff: null },
  { name: 'Oatly Barista 1 L', charged: '60 × £1.42', received: '60 × £1.42', diff: null }
]

// Lines to check in on Saturday morning (the interactive slice of 8).
export const RECEIVE_LINES = [
  { name: 'Oatly Barista oat milk', sub: '1 L cartons', expected: 80, unit: 'L', price: 1.42 },
  { name: 'Whole milk', sub: '2 L bottles', expected: 48, unit: 'L', price: 0.96 },
  { name: 'Double cream', sub: '2 L', expected: 8, unit: 'L', price: 3.10 }
]
// The collapsed rest of the order — shown on "Show 5 more items".
export const RECEIVE_MORE = [
  { name: 'Butter, unsalted', sub: '250 g', expected: 24, unit: 'pc', price: 5.15 },
  { name: 'Free-range eggs', sub: '30 per tray', expected: 6, unit: 'trays', price: 6.80 },
  { name: 'Sourdough loaf, sliced', sub: '800 g', expected: 18, unit: 'pc', price: 2.40 },
  { name: 'Hass avocado', sub: 'ready to eat', expected: 40, unit: 'pc', price: 0.85 },
  { name: 'Espresso blend', sub: '1 kg bags', expected: 12, unit: 'kg', price: 18.20 }
]

// ---- Home brief (static part) ------------------------------------------
// tier drives the safe secondary action:
//   urgent   — deadline-bound; a snooze only if it still leaves a buffer
//   important — no hard deadline; can be pushed to 'later today', returns to Needs
//   insight  — low-risk; can be dismissed for the day, logged to History
export const BRIEF = {
  // GP% drift lives in the status bar as a pill, not as a note under the
  // list — it's context, not a job. The popover names the clearest checks
  // without over-claiming they explain the whole drop.
  // Sorted by cost of waiting, never by when Edify noticed. The stake leads the
  // row — how much money or stock is on the line. A time appears only when it's
  // a deadline the operator can actually miss.
  needsCall: [
    { id: 'cutoff', tier: 'urgent', deadlineMins: 135, stake: '18 L', stakeUnit: 'short', deadlineTs: DEADLINE_TS,
      title: "Saturday's oat milk order needs review", why: '60 L ordered, ~78 L expected.', cta: 'Review basket', scenario: 'cutoff', urgent: true },
    { id: 'invoice', tier: 'important', stake: '£13.40', stakeUnit: 'over',
      title: "Bidfood invoice doesn't match delivery", why: 'Invoice #4821 — cream short by 2, butter price +6.2%.', cta: 'Review invoice', scenario: 'invoice' },
    { id: 'count', tier: 'important', stake: '14 L', stakeUnit: 'difference',
      title: 'Whole milk count looks wrong', why: 'Counted 22 L — tills imply 8 L left.', cta: 'Check count', scenario: 'count' }
    // The muffin trim (~£3/wk) stays off this list — too small to compete for
    // a decision today. It surfaces inside the GP% breakdown, where it belongs.
  ]
}

// ---- History seed --------------------------------------------------------
export const JOURNAL_SEED = [
  { id: 'js1', time: '14:00', by: 'edify', kind: 'auto', title: 'Production plan sent to Hub kitchen', detail: 'Saturday plan · 240 units across 14 lines', source: 'Production' },
  { id: 'js2', time: '12:30', by: 'edify', kind: 'auto', title: 'Recipes recosted after flour price change', detail: 'Shipton Mill +3.1% · 4 recipes updated', source: 'Costing' },
  { id: 'js3', time: '11:42', by: 'edify', kind: 'flag', title: 'Invoice #4821 flagged for review', detail: '£13.40 higher than delivery · 2 differences found', source: 'Invoices' },
  { id: 'js4', time: '10:15', by: 'edify', kind: 'auto', title: 'Invoice #4790 matched and posted', detail: 'Fitzroy Bakehouse · 18 lines · no differences', source: 'Invoices' },
  { id: 'js5', time: '07:05', by: 'you', kind: 'action', title: 'Opening checks completed', detail: '5 of 5 checks done · fridge temps in range', source: 'Opening' }
]
