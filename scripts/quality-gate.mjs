#!/usr/bin/env node
/**
 * Quality ratchet.
 *
 * App.tsx is one 18k-line file, so a gate that demands zero findings would fail
 * on day one and get switched off within a week. This records the current counts
 * as a baseline and fails only when a number goes UP. Every improvement lowers
 * the bar permanently — the debt can only shrink.
 *
 *   node scripts/quality-gate.mjs           check against the baseline
 *   node scripts/quality-gate.mjs --accept  record current counts as the baseline
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const BASELINE = fileURLToPath(new URL('../.quality-baseline.json', import.meta.url))
const accept = process.argv.includes('--accept')

// eslint and tsc both exit non-zero when they find something, so the output we
// want arrives on the error path. Treat a throw as data, not a failure.
const run = (cmd) => {
  try { return execSync(cmd, { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, stdio: 'pipe' }) }
  catch (e) { return (e.stdout || '') + (e.stderr || '') }
}

// Pull the JSON array out by its own brackets — eslint and knip both print node
// warnings around it, so we can't assume the output starts or ends with it.
const slice = (raw) => {
  const a = raw.indexOf('['), b = raw.lastIndexOf(']')
  if (a < 0 || b <= a) return null
  try { return JSON.parse(raw.slice(a, b + 1)) } catch { return null }
}

function measure() {
  let errors = 0, warnings = 0
  for (const f of slice(run('npx eslint . -f json')) ?? []) {
    errors += f.errorCount
    warnings += f.warningCount
  }

  const types = (run('npx tsc --noEmit').match(/error TS/g) || []).length

  // Circular imports. This is the one metric that must stay at zero: App.tsx is
  // being pulled apart into modules, and a cycle introduced mid-extraction is
  // what turns a refactor into a rewrite.
  const depOut = run('npx depcruise --validate .dependency-cruiser.json App.tsx index.ts src backend bot')
  const cycles = (depOut.match(/no-circular:/g) || []).length

  // Files nothing imports. Counted, not listed — deleting is a human decision,
  // but the number must never go up.
  // knip's JSON is { issues: [ { file, files: [...], exports: [...], ... } ] } —
  // slice() lands on the issues array. An entry is a dead FILE only when its own
  // `files` list is non-empty; entries with only `exports` are live files that
  // merely export something unused, which is a different (lesser) problem.
  const dead = (slice(run('npx knip --reporter json')) ?? [])
    .filter((f) => (f.files || []).length > 0).length

  return { errors, warnings, types, cycles, dead }
}

const now = measure()

if (accept || !existsSync(BASELINE)) {
  writeFileSync(BASELINE, JSON.stringify({ ...now, recorded: new Date().toISOString().slice(0, 10) }, null, 2) + '\n')
  console.log('Baseline recorded:', now)
  process.exit(0)
}

const base = JSON.parse(readFileSync(BASELINE, 'utf8'))
const metrics = [
  ['lint errors', now.errors, base.errors ?? 0],
  ['lint warnings', now.warnings, base.warnings ?? 0],
  ['type errors', now.types, base.types ?? 0],
  ['circular deps', now.cycles, base.cycles ?? 0],
  ['dead files', now.dead, base.dead ?? 0],
]

let worse = false, better = false
console.log('metric           now   baseline   delta')
for (const [name, cur, was] of metrics) {
  const d = cur - was
  if (d > 0) worse = true
  if (d < 0) better = true
  const mark = d > 0 ? '  ✗ WORSE' : d < 0 ? '  ✓ better' : ''
  console.log(
    `${name.padEnd(15)} ${String(cur).padStart(4)} ${String(was).padStart(10)} ${String(d > 0 ? '+' + d : d).padStart(7)}${mark}`
  )
}

if (worse) {
  console.error('\nQuality gate failed — something got worse. Fix it, or justify and run --accept.')
  process.exit(1)
}

if (better) {
  writeFileSync(BASELINE, JSON.stringify({ ...now, recorded: new Date().toISOString().slice(0, 10) }, null, 2) + '\n')
  console.log('\nImproved — baseline tightened. The gate can never loosen on its own.')
} else {
  console.log('\nHolding steady.')
}
