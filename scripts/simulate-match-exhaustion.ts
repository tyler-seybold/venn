import { createClient } from '@supabase/supabase-js'
import { scoreMatch, ScoredProfile } from '../lib/matching'
import { MATCH_THRESHOLDS } from '../config/matching'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const MAX_WEEKS              = 29
const MATCHES_PER_USER_WEEK  = 2

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScoredPair {
  a:     string
  b:     string
  score: number
}

interface WeekStats {
  week:            number
  newPairs:        number
  usersWithMatch:  number
  usersExhausted:  number
  cumulativePairs: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1)
  return sorted[idx]
}

function col(s: string | number, width: number, right = false): string {
  const str = String(s)
  return right ? str.padStart(width) : str.padEnd(width)
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Fetch eligible profiles ─────────────────────────────────────────────
  process.stdout.write('Fetching simulation profiles… ')

  const { data: rows, error } = await supabase
    .from('profiles')
    .select('user_id, intent_tags, skills, industries, industry_openness, personality_quiz')
    .like('email', '%@kelog.northwestern.edu')
    .eq('matching_opt_in', true)
    .gte('completeness_score', 60)

  if (error) throw error
  if (!rows?.length) { console.error('\nNo eligible profiles found.'); process.exit(1) }

  const profiles = rows as ScoredProfile[]
  console.log(`${profiles.length} profiles loaded.`)

  // ── 2. Pre-compute all pairwise scores ─────────────────────────────────────
  process.stdout.write('Scoring all pairs… ')
  const n = profiles.length

  const allPairs: ScoredPair[] = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const { total } = scoreMatch(profiles[i], profiles[j])
      if (total >= MATCH_THRESHOLDS.minimum) {
        allPairs.push({ a: profiles[i].user_id, b: profiles[j].user_id, score: total })
      }
    }
  }

  // Descending by score — greedy assignment always takes best available pair first
  allPairs.sort((x, y) => y.score - x.score)

  const totalEligiblePairs = allPairs.length
  console.log(
    `${totalEligiblePairs.toLocaleString()} eligible pairs above threshold (≥${MATCH_THRESHOLDS.minimum}).`
  )
  console.log()

  // ── 3. Weekly simulation ───────────────────────────────────────────────────
  const matchedSet       = new Set<string>()           // pairs already matched (ever)
  const userTotalMatches = new Map<string, number>()   // cumulative per user
  const userLastWeek     = new Map<string, number>()   // last week user got ≥1 match
  const weekStats:       WeekStats[] = []

  for (const p of profiles) userTotalMatches.set(p.user_id, 0)

  for (let week = 1; week <= MAX_WEEKS; week++) {
    // Per-user capacity this week
    const weekCap = new Map<string, number>()
    for (const p of profiles) weekCap.set(p.user_id, 0)

    const newPairsThisWeek: ScoredPair[] = []

    // Greedy assignment: walk sorted pairs, assign if unmatched and both have capacity
    for (const pair of allPairs) {
      const key = pairKey(pair.a, pair.b)
      if (matchedSet.has(key)) continue
      if ((weekCap.get(pair.a) ?? 0) >= MATCHES_PER_USER_WEEK) continue
      if ((weekCap.get(pair.b) ?? 0) >= MATCHES_PER_USER_WEEK) continue

      matchedSet.add(key)
      weekCap.set(pair.a, (weekCap.get(pair.a) ?? 0) + 1)
      weekCap.set(pair.b, (weekCap.get(pair.b) ?? 0) + 1)
      newPairsThisWeek.push(pair)
    }

    // Stop early if nothing was matched
    if (newPairsThisWeek.length === 0) break

    // Update per-user totals and last-match-week
    const usersWithMatchThisWeek = new Set<string>()
    for (const pair of newPairsThisWeek) {
      userTotalMatches.set(pair.a, (userTotalMatches.get(pair.a) ?? 0) + 1)
      userTotalMatches.set(pair.b, (userTotalMatches.get(pair.b) ?? 0) + 1)
      userLastWeek.set(pair.a, week)
      userLastWeek.set(pair.b, week)
      usersWithMatchThisWeek.add(pair.a)
      usersWithMatchThisWeek.add(pair.b)
    }

    weekStats.push({
      week,
      newPairs:        newPairsThisWeek.length,
      usersWithMatch:  usersWithMatchThisWeek.size,
      usersExhausted:  n - usersWithMatchThisWeek.size,
      cumulativePairs: matchedSet.size,
    })
  }

  // ── 4. Weekly summary table ────────────────────────────────────────────────
  const HDR = ['Week', 'New pairs', 'Users matched', 'Users w/ 0 matches', 'Cumulative pairs']
  const W   = [5, 10, 14, 19, 16]

  const divider = W.map((w) => '─'.repeat(w)).join('  ')
  console.log(
    [col(HDR[0], W[0]), col(HDR[1], W[1], true), col(HDR[2], W[2], true),
     col(HDR[3], W[3], true), col(HDR[4], W[4], true)].join('  ')
  )
  console.log(divider)

  for (const s of weekStats) {
    console.log([
      col(s.week,            W[0]),
      col(s.newPairs,        W[1], true),
      col(s.usersWithMatch,  W[2], true),
      col(s.usersExhausted,  W[3], true),
      col(s.cumulativePairs, W[4], true),
    ].join('  '))
  }

  // ── 5. Final report ────────────────────────────────────────────────────────
  const totalWeeks       = weekStats.length
  const totalUniquePairs = matchedSet.size
  const allMatchCounts   = [...userTotalMatches.values()]
  const avgMatchesPerUser = (allMatchCounts.reduce((a, b) => a + b, 0) / n).toFixed(1)

  // Sort last-match-week ascending (users who never matched get 0)
  const lastMatchWeeks = profiles
    .map((p) => userLastWeek.get(p.user_id) ?? 0)
    .sort((a, b) => a - b)

  const week50pct = percentile(lastMatchWeeks, 0.50)
  const week90pct = percentile(lastMatchWeeks, 0.90)
  const neverMatched = lastMatchWeeks.filter((w) => w === 0).length

  // Score distribution of all matched pairs
  const matchedKeys = new Set(matchedSet)
  const buckets = { '85+': 0, '70–84': 0, '55–69': 0, '40–54': 0 }
  for (const pair of allPairs) {
    if (!matchedKeys.has(pairKey(pair.a, pair.b))) continue
    if      (pair.score >= 85) buckets['85+']++
    else if (pair.score >= 70) buckets['70–84']++
    else if (pair.score >= 55) buckets['55–69']++
    else                       buckets['40–54']++
  }

  console.log()
  console.log('── Final Report ──────────────────────────────────────────────────')
  console.log(`Eligible profiles in pool:         ${n}`)
  console.log(`Eligible pairs above threshold:    ${totalEligiblePairs.toLocaleString()}`)
  console.log(`Total weeks before exhaustion:     ${totalWeeks}`)
  console.log(`Total unique pairs matched:        ${totalUniquePairs.toLocaleString()}`)
  console.log(`Average matches per user:          ${avgMatchesPerUser}`)
  console.log(`Users who received 0 matches:      ${neverMatched}`)
  console.log(`Week 50% of users last matched:    week ${week50pct === 0 ? 'N/A (never)' : week50pct}`)
  console.log(`Week 90% of users last matched:    week ${week90pct === 0 ? 'N/A (never)' : week90pct}`)
  console.log()
  console.log('Score distribution of matched pairs:')
  for (const [label, count] of Object.entries(buckets)) {
    const pct = totalUniquePairs > 0 ? ((count / totalUniquePairs) * 100).toFixed(1) : '0.0'
    console.log(`  ${label.padEnd(8)}  ${String(count).padStart(5)}  (${pct}%)`)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })

// ── How to run ────────────────────────────────────────────────────────────────
//
//   npx dotenv -e .env.local -- npx tsx scripts/simulate-match-exhaustion.ts
//
// Read-only — writes nothing to Supabase.
