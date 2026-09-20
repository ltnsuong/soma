#!/usr/bin/env node
/**
 * PreToolUse hook: refuse `git commit` while the quality gate is red.
 *
 * An agent that reports "gate is green" has only told you what it believes.
 * This makes passing the gate a precondition of committing rather than a claim
 * in a summary — the one place the difference actually matters.
 *
 * Reads Claude Code's hook JSON on stdin. Exit 0 allows the command, exit 2
 * blocks it and shows stderr to the agent.
 *
 * Escape hatch: `git commit --no-verify`. Deliberately the same flag git uses,
 * so it reads as an explicit override rather than something to stumble into.
 */
import { execFileSync, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const allow = () => process.exit(0)

const block = (msg) => {
  process.stderr.write(msg)
  process.exit(2)
}

let payload = ''
try {
  payload = await new Promise((ok, fail) => {
    let s = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (d) => (s += d))
    process.stdin.on('end', () => ok(s))
    process.stdin.on('error', fail)
  })
} catch { allow() }

let cmd = ''
try { cmd = JSON.parse(payload)?.tool_input?.command ?? '' } catch { allow() }

// Only care about commands that actually create a commit.
if (!/\bgit\b[^|;&]*\bcommit\b/.test(cmd)) allow()
if (/--no-verify|\s-n\b/.test(cmd)) allow()

const run = (c) => {
  try { return execSync(c, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }) }
  catch (e) { return (e.stdout || '') + (e.stderr || '') }
}

// Docs-only commits skip the gate. Nothing it measures can change, and a 20s
// wait to commit a README edit is how hooks get switched off.
const staged = run('git diff --cached --name-only').trim().split('\n').filter(Boolean)
if (staged.length && staged.every((f) => /\.(md|txt)$/i.test(f))) allow()

let out = ''
try {
  out = execFileSync('node', ['scripts/quality-gate.mjs'], {
    cwd: ROOT, encoding: 'utf8', stdio: 'pipe', timeout: 300_000,
  })
} catch (e) {
  const detail = ((e.stdout || '') + (e.stderr || '')).trim()
  block(
    'BLOCKED: the quality gate is red, so this commit was not created.\n\n' +
    detail +
    '\n\nFix what regressed and commit again. If the rise is genuinely justified, ' +
    'say why in your report and ask the user to run `npm run verify:accept` — ' +
    'do not edit .quality-baseline.json yourself, and do not reach for --no-verify ' +
    'to get past this.\n'
  )
}

// The gate rewrites the baseline when a number improves, so a passing run can
// still leave a modified file. Fold it into this commit instead of stranding it.
if (run('git status --porcelain .quality-baseline.json').trim()) {
  run('git add .quality-baseline.json')
  process.stderr.write('Gate improved — tightened .quality-baseline.json added to this commit.\n')
}

if (/✓ better/.test(out)) process.stderr.write(out.trim() + '\n')
allow()
