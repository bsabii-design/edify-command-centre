#!/usr/bin/env node
/**
 * Token linter — the design system enforced by a machine, not by memory.
 *
 * Every colour, space and radius in this product has a name. This script fails
 * the build when a raw value sneaks in, because a raw value is how two greys
 * that should be one grey get past a review.
 *
 * Run: npm run lint:tokens
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const CSS = 'src/styles.css'
const SRC = 'src'

// Everything the tokens block is allowed to define. Below it, nothing raw.
const ALLOWED_RAW = new Set([
  '0', '0px', '1px', '2px',        // hairlines, optical nudges
  '50%', '100%', '999px', 'auto'
])
const ALLOWED_FONT_SIZES = new Set(['20px', '13px', '11px'])
const ALLOWED_WEIGHTS = new Set(['400', '500', '600', 'inherit'])

const errors = []
const err = (file, line, msg) => errors.push(`${file}:${line}  ${msg}`)

// ---- 1. styles.css: no raw values below the :root block ----------------------
const css = readFileSync(CSS, 'utf8')
const rootEnd = css.indexOf('}', css.indexOf(':root'))
const body = css.slice(rootEnd)
const offset = css.slice(0, rootEnd).split('\n').length

body.split('\n').forEach((raw, i) => {
  const line = raw.split('/*')[0]           // ignore comments
  const n = offset + i
  if (/^\s*(\/\*|\*)/.test(raw)) return

  // Hex colours and rgb() outside the token block
  const hex = line.match(/#[0-9a-fA-F]{3,8}\b/g)
  if (hex) err(CSS, n, `raw colour ${hex.join(', ')} — use a --token`)

  // Font sizes off the 20/13/11 scale
  const fs = line.match(/font-size:\s*([^;]+);/)
  if (fs && !ALLOWED_FONT_SIZES.has(fs[1].trim()) && !fs[1].includes('var(')) {
    err(CSS, n, `font-size ${fs[1].trim()} — scale is 20 / 13 / 11`)
  }

  // Weights off 400/500/600
  const fw = line.match(/font-weight:\s*([^;]+);/)
  if (fw && !ALLOWED_WEIGHTS.has(fw[1].trim()) && !fw[1].includes('var(')) {
    err(CSS, n, `font-weight ${fw[1].trim()} — weights are 400 / 500 / 600`)
  }

  // Spacing and radius must come from the scale
  for (const [prop, hint] of [
    [/(?:^|\s)(?:padding|margin|gap|column-gap|row-gap)(?:-(?:top|right|bottom|left))?:\s*([^;]+);/, '--sp-*'],
    [/border-radius:\s*([^;]+);/, '--r-*']
  ]) {
    const m = line.match(prop)
    if (!m) continue
    for (const v of m[1].trim().split(/\s+/)) {
      if (v.includes('var(') || v.includes('calc(') || ALLOWED_RAW.has(v)) continue
      if (/^-?\d+(px|%)$/.test(v)) err(CSS, n, `${v} — use ${hint}`)
    }
  }
})

// ---- 2. JSX: no inline style objects carrying design values ------------------
const walk = (dir) => readdirSync(dir).flatMap(f => {
  const p = join(dir, f)
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.jsx') ? [p] : []
})

for (const file of walk(SRC)) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (/style=\{\{[^}]*(fontSize|fontWeight|color:|padding|margin|borderRadius)/.test(line)) {
      err(file, i + 1, 'inline style carries a design value — move it to a class')
    }
  })
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} token violation${errors.length === 1 ? '' : 's'}:\n`)
  errors.forEach(e => console.error('  ' + e))
  console.error('')
  process.exit(1)
}
console.log('✓ tokens clean — no raw colours, sizes, spaces or radii')
