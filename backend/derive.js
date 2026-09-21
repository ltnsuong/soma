// Turning what someone told Soma into a connection profile.
//
// Lives apart from server.js so backfill-profiles.mjs can run exactly
// the same derivation the /profile/sync path runs. supabase and callGroq are
// passed in rather than imported: importing server.js would start a server.

export async function deriveDatingProfile(supabase, callGroq, userId, p) {
  const memories = (p.memories || []).filter(m => m?.content)
  if (memories.length < 3) return   // too little to say anything true about them

  const { data: existing } = await supabase
    .from('dating_profiles').select('*').eq('user_id', userId).maybeSingle()

  // Skip if nothing new to learn from.
  // Facts are part of the fingerprint: without them, telling Soma your job after
  // the profile was already derived would never reach matching.
  // Bump when the derivation changes what it produces. Without this the
  // fingerprint only tracks the USER's data, so a fix to the derivation never
  // reaches anyone who doesn't happen to say something new — Alex told Soma he
  // was 30, the age column stayed null, and no amount of fixing the code would
  // have backfilled it. Raising this re-derives everyone once.
  //   v2: reads age and city from what they said; writes the four sector bios.
  const DERIVE_VERSION = 'v2'

  const fingerprint = DERIVE_VERSION + ':' + String(memories.length) + ':' + (memories[0]?.id || '')
    + ':' + JSON.stringify(p.facts || {})
  if (existing?.derived_from === fingerprint) return

  const byDomain = {}
  for (const m of memories) (byDomain[m.domain] ||= []).push(m.content)
  const summary = Object.entries(byDomain)
    .map(([d, items]) => `${d}: ${items.slice(0, 6).join('; ')}`).join('\n')

  const raw = await callGroq(
    'You turn what someone told an AI companion into a connection profile. Use ONLY what is stated — never invent hobbies, jobs or traits. '
    + 'Each sector bio is written from that sector\'s material only: never mention attachment style or love language outside the dating bio, '
    + 'and never mention relationships in the professional one. Keep the four bios genuinely different. Return only valid JSON.',
    `Someone shared this about their life:\n${summary}\n\nReturn ONLY JSON:
{
 "bio": "<2 warm sentences in their own register, first person, no clichés, only facts above>",
 "interests": ["<up to 6, concrete things they actually do>"],
 "values": ["<up to 4 things that clearly matter to them>"],
 "work": "<their job if stated, else empty string>",
 "age": <their age in years as a number if they stated it anywhere, else null>,
 "city": "<the city they live in if stated, else empty string>",
 "lookingFor": "<one short line on what connection would suit them>",
 "sectorBios": {
   "dating": "<2 sentences: what they want from a relationship and how they are with people closest to them>",
   "friends": "<2 sentences: what they actually DO — activities and rhythms. A reader should think of something to invite them to>",
   "professional": "<2 sentences: what they work on and what they could use help with. No feelings, no home life>",
   "support": "<2 sentences: what they are working through and what support helps. Plain, never pitying, never a diagnosis>"
 }
}`, 900)

  let d
  try { d = JSON.parse(raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/)?.[0] || '') } catch { return }
  if (!d) return

  const { data: user } = await supabase.from('users').select('name').eq('id', userId).maybeSingle()

  // Facts the user stated outright beat anything the model inferred from prose.
  // They were asked directly ("how old are you", "what do you actually do"), so a
  // derived guess must never overwrite them. See docs/onboarding-interview.md.
  const facts = p.facts || {}
  const hobbies = Array.isArray(facts.hobbies) ? facts.hobbies : []
  const interests = existing?.interests?.length
    ? existing.interests
    : [...new Set([...hobbies, ...(d.interests || [])])].slice(0, 6)

  // Anything the user set by hand wins; derivation only fills the blanks.
  await supabase.from('dating_profiles').upsert({
    user_id: userId,
    name: existing?.name || user?.name || p.name || 'Someone',
    bio: existing?.bio || d.bio || '',
    interests,
    values: existing?.values?.length ? existing.values : (d.values || []).slice(0, 4),
    work: existing?.work || facts.job || d.work || '',
    looking_for: existing?.looking_for || d.lookingFor || '',
    photo: existing?.photo || p.dating?.photo || '',
    // Age and city were only ever read from a form the user never filled in, so
    // every derived profile showed "Alex 0" with no city. Facts they stated
    // outright win; otherwise take what the model found in their own words.
    age: existing?.age ?? (Number(p.dating?.age) || facts.age || Number(d.age) || null),
    city: existing?.city || p.dating?.location || facts.city || d.city || '',
    love_language: existing?.love_language || p.dating?.loveLanguage || '',
    attachment: existing?.attachment || p.dating?.attachment || '',
    // Four bios, one per connection type. Anything the user wrote themselves wins.
    sector_bios: (existing?.sector_bios && Object.keys(existing.sector_bios).length)
      ? existing.sector_bios
      : (d.sectorBios || {}),
    derived_from: fingerprint,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}
