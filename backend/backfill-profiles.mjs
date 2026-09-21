#!/usr/bin/env node
/**
 * Re-derive every stored profile.
 *
 * deriveDatingProfile only runs on /profile/sync, so an improvement to it
 * reaches someone the next time they open the app — and never at all for
 * someone who doesn't come back. That left all 21 dating profiles on the old
 * derivation: one bio, reused for Dating, Friends, Professional and Support,
 * which is why those four screens showed the same person four times.
 *
 * This runs the same derivation, from the same module the server uses, over
 * every profile that has enough memories to say anything true.
 *
 *   node backend/backfill-profiles.mjs --dry     list who would change
 *   node backend/backfill-profiles.mjs           do it
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { deriveDatingProfile } from './derive.js'

for (const line of readFileSync(new URL('./.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const dry = process.argv.includes('--dry')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b'

// Same call the server makes, same model, same key.
const callGroq = async (systemPrompt, userPrompt, maxTokens = 600) => {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL, max_tokens: maxTokens, temperature: 0.7,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(`groq ${r.status}`)
  return d.choices?.[0]?.message?.content ?? ''
}

const { data: profiles, error } = await supabase
  .from('profiles').select('user_id, name, data')
if (error) { console.error('fetch failed:', error.message); process.exit(1) }

console.log(`${profiles.length} stored profiles\n`)
let done = 0, skipped = 0, failed = 0

for (const row of profiles) {
  const p = row.data || {}
  const memories = (p.memories || []).filter(m => m?.content)
  const who = row.name || p.name || row.user_id.slice(0, 8)

  if (memories.length < 3) {
    console.log(`  skip  ${who} — ${memories.length} memories, nothing true to say yet`)
    skipped++
    continue
  }
  if (dry) { console.log(`  would derive  ${who} (${memories.length} memories)`); done++; continue }

  try {
    await deriveDatingProfile(supabase, callGroq, row.user_id, p)
    const { data: after } = await supabase
      .from('dating_profiles').select('sector_bios').eq('user_id', row.user_id).maybeSingle()
    const kinds = Object.keys(after?.sector_bios || {})
    console.log(`  ok    ${who} — ${kinds.length ? kinds.join(', ') : 'no sector bios returned'}`)
    done++
  } catch (e) {
    console.log(`  FAIL  ${who} — ${e.message}`)
    failed++
  }
}

console.log(`\n${dry ? 'would derive' : 'derived'} ${done}, skipped ${skipped}, failed ${failed}`)
