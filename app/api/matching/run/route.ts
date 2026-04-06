import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scoreMatch, scorePersonStartupMatch, scoreStartupSimilarity, STARTUP_SIMILARITY_THRESHOLD, ScoredProfile, ScoredStartup } from '@/lib/matching'
import { MATCH_THRESHOLDS } from '@/config/matching'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Returns the ISO date string of the most recent Monday (or today if Monday)
function currentWeekOf(): string {
  const now = new Date()
  const day = now.getUTCDay() // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - diff)
  return monday.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const matchingSecret = process.env.MATCHING_SECRET
  const cronSecret = process.env.CRON_SECRET
  const authorized =
    (matchingSecret && authHeader === `Bearer ${matchingSecret}`) ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`)
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // ── 1b. Check global matching settings ──────────────────────────────────────
  const force = req.nextUrl.searchParams.get('force') === 'true'

  const { data: settings } = await supabase
    .from('matching_settings')
    .select('matching_enabled, match_frequency, next_match_date')
    .eq('id', 1)
    .single()

  if (settings && !settings.matching_enabled && !force) {
    return NextResponse.json({ success: false, reason: 'matching_disabled' })
  }

  if (settings && settings.next_match_date && !force) {
    const today = new Date().toISOString().slice(0, 10)
    if (today < settings.next_match_date) {
      return NextResponse.json({ success: false, reason: 'not_scheduled', next_match_date: settings.next_match_date })
    }
  }

  // ── 2. Fetch eligible profiles ───────────────────────────────────────────────
  const now = new Date().toISOString()
  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, skills, industries, industry_openness, intent_tags, personality_quiz, cofounder_interest')
    .eq('matching_opt_in', true)
    .eq('is_admin', false)
    .eq('is_deactivated', false)
    .gte('completeness_score', 60)
    .or(`matching_paused_until.is.null,matching_paused_until.lte.${now}`)

  if (profilesError) {
    return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 })
  }

  const profiles: ScoredProfile[] = (profileRows ?? []).map((r) => ({
    user_id:           r.user_id,
    intent_tags:       r.intent_tags      ?? null,
    skills:            r.skills           ?? null,
    industries:        r.industries       ?? null,
    industry_openness: r.industry_openness ?? null,
    personality_quiz:  r.personality_quiz ?? null,
  }))

  // ── 3. Fetch all startups ────────────────────────────────────────────────────
  const { data: startupRows, error: startupsError } = await supabase
    .from('startups')
    .select('id, industry, skills_needed, open_to_cofounders, open_to_interns, founder_id, description')

  if (startupsError) {
    return NextResponse.json({ success: false, error: startupsError.message }, { status: 500 })
  }

  const startups: (ScoredStartup & { founder_id: string })[] = (startupRows ?? []).map((s) => ({
    id:                 s.id,
    industry:           s.industry          ?? null,
    skills_needed:      s.skills_needed     ?? null,
    open_to_cofounders: s.open_to_cofounders,
    open_to_interns:    s.open_to_interns,
    founder_id:         s.founder_id,
    description:        s.description       ?? null,
  }))

  // ── 4. Fetch existing matches ────────────────────────────────────────────────
  const { data: existingMatches, error: matchesError } = await supabase
    .from('matches')
    .select('user_id_1, user_id_2')

  if (matchesError) {
    return NextResponse.json({ success: false, error: matchesError.message }, { status: 500 })
  }

  // Build a set of canonical pair keys "smallerId:largerId" for O(1) lookup
  const existingPairs = new Set<string>()
  for (const m of existingMatches ?? []) {
    const [a, b] = [m.user_id_1, m.user_id_2].sort()
    existingPairs.add(`${a}:${b}`)
  }

  function pairExists(id1: string, id2: string): boolean {
    const [a, b] = [id1, id2].sort()
    return existingPairs.has(`${a}:${b}`)
  }

  const weekOf = currentWeekOf()
  const toInsert: {
    user_id_1: string
    user_id_2: string
    match_type: 'people_people' | 'people_startup' | 'startup_startup'
    match_score: number
    week_of: string
    blurb: null
  }[] = []

  // Track matches committed this run per user (cap: 2 total across both match types)
  const userMatchCount = new Map<string, number>()
  for (const p of profiles) userMatchCount.set(p.user_id, 0)

  const insertedPairs = new Set<string>()
  const peopleMatchCount = { value: 0 }
  const startupMatchCount = { value: 0 }

  // ── 5. People ↔ people matching ──────────────────────────────────────────────
  // Score all unique pairs globally, then build a per-user sorted candidate list.
  // Users are processed in random order each run (Fisher-Yates shuffle) so no
  // user is systematically advantaged by position. Two passes ensure users
  // skipped in pass 1 (because their top picks were taken) get a second chance.
  type PeoplePair = { id1: string; id2: string; score: number }
  const allPeoplePairs: PeoplePair[] = []

  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const p1 = profiles[i]
      const p2 = profiles[j]
      if (pairExists(p1.user_id, p2.user_id)) continue
      const { total } = scoreMatch(p1, p2)
      if (total < MATCH_THRESHOLDS.minimum) continue
      allPeoplePairs.push({ id1: p1.user_id, id2: p2.user_id, score: total })
    }
  }

  // Build per-user candidate lists sorted descending by score
  const peopleCandidates = new Map<string, PeoplePair[]>()
  for (const p of profiles) peopleCandidates.set(p.user_id, [])
  for (const pair of allPeoplePairs) {
    peopleCandidates.get(pair.id1)!.push(pair)
    peopleCandidates.get(pair.id2)!.push(pair)
  }
  for (const list of peopleCandidates.values()) list.sort((a, b) => b.score - a.score)

  // Fisher-Yates shuffle — new random order each run prevents systematic bias
  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // One pass: iterate users in random order, assign each user their personal best
  // available pair (partner has capacity, pair is new, score above threshold).
  function runPeoplePass() {
    const order = shuffle(profiles.map((p) => p.user_id))
    for (const uid of order) {
      if ((userMatchCount.get(uid) ?? 0) >= 2) continue
      const candidates = peopleCandidates.get(uid) ?? []
      for (const pair of candidates) {
        const partnerId = pair.id1 === uid ? pair.id2 : pair.id1
        if ((userMatchCount.get(partnerId) ?? 0) >= 2) continue
        const [a, b] = [uid, partnerId].sort()
        const key = `${a}:${b}`
        if (insertedPairs.has(key)) continue
        insertedPairs.add(key)
        userMatchCount.set(uid,       (userMatchCount.get(uid)       ?? 0) + 1)
        userMatchCount.set(partnerId, (userMatchCount.get(partnerId) ?? 0) + 1)
        toInsert.push({ user_id_1: a, user_id_2: b, match_type: 'people_people', match_score: pair.score, week_of: weekOf, blurb: null })
        peopleMatchCount.value++
        break // one match assigned this pass; move to next user
      }
    }
  }

  runPeoplePass() // pass 1
  runPeoplePass() // pass 2: fills users who had capacity but were skipped in pass 1

  // ── 6. People ↔ startup matching ─────────────────────────────────────────────
  // Same per-user best-match approach: score all startup candidates per user,
  // sort by score, process users in random order, assign best available.
  // Two passes to fill remaining capacity after people↔people matching.
  function runStartupPass() {
    const order = shuffle(profiles.map((p) => p.user_id))
    for (const uid of order) {
      if ((userMatchCount.get(uid) ?? 0) >= 2) continue

      const profile = profiles.find((p) => p.user_id === uid)!
      const candidates: { startupId: string; score: number }[] = []

      for (const startup of startups) {
        if (startup.founder_id === uid) continue
        if (pairExists(uid, startup.id)) continue
        const { total } = scorePersonStartupMatch(profile, startup)
        if (total < MATCH_THRESHOLDS.minimum) continue
        candidates.push({ startupId: startup.id, score: total })
      }

      candidates.sort((a, b) => b.score - a.score)

      for (const { startupId, score } of candidates) {
        if ((userMatchCount.get(uid) ?? 0) >= 2) break
        const [a, b] = [uid, startupId].sort()
        const key = `${a}:${b}`
        if (insertedPairs.has(key)) continue
        insertedPairs.add(key)
        userMatchCount.set(uid, (userMatchCount.get(uid) ?? 0) + 1)
        toInsert.push({ user_id_1: uid, user_id_2: startupId, match_type: 'people_startup', match_score: score, week_of: weekOf, blurb: null })
        startupMatchCount.value++
        break
      }
    }
  }

  runStartupPass() // pass 1
  runStartupPass() // pass 2

  // ── 7. Startup ↔ startup similarity matching ─────────────────────────────────
  // Score every unique startup pair, skip below threshold and existing pairs,
  // cap at 3 similar startups per startup per run.
  const startupSimilarityCount = new Map<string, number>()
  for (const s of startups) startupSimilarityCount.set(s.id, 0)

  type StartupPair = { id1: string; id2: string; score: number }
  const allStartupPairs: StartupPair[] = []

  for (let i = 0; i < startups.length; i++) {
    for (let j = i + 1; j < startups.length; j++) {
      const s1 = startups[i]
      const s2 = startups[j]
      if (pairExists(s1.id, s2.id)) continue
      const score = scoreStartupSimilarity(s1, s2)
      if (score < STARTUP_SIMILARITY_THRESHOLD) continue
      allStartupPairs.push({ id1: s1.id, id2: s2.id, score })
    }
  }

  allStartupPairs.sort((a, b) => b.score - a.score)

  let startupSimilarityMatchCount = 0
  for (const { id1, id2, score } of allStartupPairs) {
    if ((startupSimilarityCount.get(id1) ?? 0) >= 3) continue
    if ((startupSimilarityCount.get(id2) ?? 0) >= 3) continue
    const [a, b] = [id1, id2].sort()
    const key = `${a}:${b}`
    if (insertedPairs.has(key)) continue
    insertedPairs.add(key)
    startupSimilarityCount.set(id1, (startupSimilarityCount.get(id1) ?? 0) + 1)
    startupSimilarityCount.set(id2, (startupSimilarityCount.get(id2) ?? 0) + 1)
    toInsert.push({ user_id_1: a, user_id_2: b, match_type: 'startup_startup', match_score: score, week_of: weekOf, blurb: null })
    startupSimilarityMatchCount++
  }

  // ── 8. Insert all new matches ────────────────────────────────────────────────
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('matches').insert(toInsert)
    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }
  }

  // ── 9. Advance next_match_date in settings ───────────────────────────────────
  if (settings) {
    const base = new Date()
    const daysToAdd = settings.match_frequency === 'biweekly' ? 14 : settings.match_frequency === 'monthly' ? 30 : 7
    base.setUTCDate(base.getUTCDate() + daysToAdd)
    const nextDate = base.toISOString().slice(0, 10)
    await supabase
      .from('matching_settings')
      .update({ next_match_date: nextDate, updated_at: new Date().toISOString() })
      .eq('id', 1)
  }

  // ── 11. Trigger email job (non-blocking) ────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  fetch(`${baseUrl}/api/email/send-matches?week_of=${weekOf}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.MATCHING_SECRET}` },
  }).catch(() => {})

  // ── 12. Summary ──────────────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    peopleMatches:           peopleMatchCount.value,
    startupMatches:          startupMatchCount.value,
    startupSimilarityMatches: startupSimilarityMatchCount,
    totalInserted:           toInsert.length,
  })
}
