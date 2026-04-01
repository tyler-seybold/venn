// ── Types ─────────────────────────────────────────────────────────────────────

export type ScoredProfile = {
  user_id: string
  intent_tags: string[] | null
  skills: string[] | null
  industries: string[] | null
  industry_openness: string | null
  personality_quiz: unknown | null
}

export type ScoredStartup = {
  id: string
  industry: string[] | null
  skills_needed: string[] | null
  open_to_cofounders: boolean
  open_to_interns: boolean
  description: string | null
}

export type MatchBreakdown = {
  intentAlignment: number
  skillsFit: number
  industryAlignment: number
  personalityBonus: number
  industryPenalty: number
  total: number
}

// ── Skills compatibility matrix ───────────────────────────────────────────────
// Scores how well two different skills complement each other (0–1).
// Identical pairings = 0.3 (low complementarity). Unlisted pairings = 0.5.

const SKILLS_COMPATIBILITY: Record<string, Record<string, number>> = {
  Engineering: {
    Product:          0.9,
    Marketing:        0.8,
    Sales:            0.7,
    Finance:          0.7,
    Design:           0.85,
    Operations:       0.8,
    Legal:            0.6,
    'Data/Analytics': 0.85,
  },
  Product: {
    Engineering:      0.9,
    Marketing:        0.85,
    Design:           0.9,
    Operations:       0.8,
    'Data/Analytics': 0.9,
  },
  Marketing: {
    Engineering:      0.8,
    Finance:          0.85,
    Sales:            0.75,
    Design:           0.9,
    Product:          0.85,
    'Social Media':   0.75,
  },
  Sales: {
    Engineering:      0.7,
    Finance:          0.85,
    Marketing:        0.75,
    Operations:       0.8,
    'Social Media':   0.7,
  },
  Finance: {
    Marketing:        0.85,
    Sales:            0.85,
    Operations:       0.9,
    Legal:            0.8,
    'Data/Analytics': 0.85,
  },
  Design: {
    Engineering:      0.85,
    Marketing:        0.9,
    Product:          0.9,
  },
  Operations: {
    Engineering:      0.8,
    Finance:          0.9,
    Sales:            0.8,
    Product:          0.8,
  },
  Legal: {
    Finance:          0.8,
    Engineering:      0.6,
  },
  'Data/Analytics': {
    Engineering:      0.85,
    Finance:          0.85,
    Product:          0.9,
  },
  'Social Media': {
    Marketing:        0.75,
    Sales:            0.7,
  },
}

function skillsCompatibility(a: string, b: string): number {
  if (a === b) return 0.3
  return SKILLS_COMPATIBILITY[a]?.[b] ?? SKILLS_COMPATIBILITY[b]?.[a] ?? 0.5
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'that', 'this', 'it', 'its',
  'we', 'our', 'us', 'they', 'their', 'you', 'your', 'i', 'my', 'me',
])

function wordSet(text: string | null): Set<string> {
  if (!text) return new Set()
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  )
}

function wordOverlap(a: string | null, b: string | null): number {
  const setA = wordSet(a)
  const setB = wordSet(b)
  if (setA.size === 0 && setB.size === 0) return 0
  let intersection = 0
  for (const w of setA) if (setB.has(w)) intersection++
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

function jaccard(a: string[] | null, b: string[] | null): number {
  const setA = new Set(a ?? [])
  const setB = new Set(b ?? [])
  if (setA.size === 0 && setB.size === 0) return 0
  let intersection = 0
  for (const item of setA) if (setB.has(item)) intersection++
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

function avgSkillsCompatibility(skills1: string[] | null, skills2: string[] | null): number {
  const a = skills1 ?? []
  const b = skills2 ?? []
  if (a.length === 0 || b.length === 0) return 0
  let total = 0
  let count = 0
  for (const sa of a) {
    for (const sb of b) {
      total += skillsCompatibility(sa, sb)
      count++
    }
  }
  return count === 0 ? 0 : total / count
}

function industryMismatchPenalty(
  openness1: string | null,
  industries1: string[] | null,
  openness2: string | null,
  industries2: string[] | null,
): number {
  if (openness1 !== 'strong_preferences' || openness2 !== 'strong_preferences') return 0
  const set1 = new Set(industries1 ?? [])
  const set2 = new Set(industries2 ?? [])
  if (set1.size === 0 || set2.size === 0) return 0
  for (const ind of set1) if (set2.has(ind)) return 0
  return -10
}

// ── Personality quiz compatibility ────────────────────────────────────────────

const SIMILARITY_QUESTIONS    = new Set(['q3', 'q6', 'q7', 'q9', 'q10']) // same = 1 pt
const COMPLEMENTARITY_QUESTIONS = new Set(['q4', 'q8'])                    // different = 1 pt
const NEUTRAL_QUESTIONS        = new Set(['q1', 'q2', 'q5'])               // same = 0.5 pt
const MAX_QUIZ_SCORE = 8.5

export function scorePersonalityCompatibility(
  quiz1: unknown | null,
  quiz2: unknown | null,
): number {
  if (quiz1 == null || quiz2 == null) return 0
  if (typeof quiz1 !== 'object' || typeof quiz2 !== 'object') return 0

  const q1 = quiz1 as Record<string, unknown>
  const q2 = quiz2 as Record<string, unknown>

  let raw = 0
  for (const qid of [...SIMILARITY_QUESTIONS, ...COMPLEMENTARITY_QUESTIONS, ...NEUTRAL_QUESTIONS]) {
    const a = q1[qid]
    const b = q2[qid]
    if (a == null || b == null) continue

    if (SIMILARITY_QUESTIONS.has(qid)) {
      if (a === b) raw += 1
    } else if (COMPLEMENTARITY_QUESTIONS.has(qid)) {
      if (a !== b) raw += 1
    } else {
      // neutral
      if (a === b) raw += 0.5
    }
  }

  return Math.round((raw / MAX_QUIZ_SCORE) * 12 * 10) / 10
}

// ── scoreMatch: person ↔ person ───────────────────────────────────────────────
// Max raw score: 40 + 35 + 25 + 12 = 112 (before penalty)

export function scoreMatch(
  profile1: ScoredProfile,
  profile2: ScoredProfile,
): { total: number; breakdown: MatchBreakdown } {
  const intentAlignment   = Math.round(jaccard(profile1.intent_tags, profile2.intent_tags) * 40)
  const skillsFit         = Math.round(avgSkillsCompatibility(profile1.skills, profile2.skills) * 35)
  const industryAlignment = Math.round(jaccard(profile1.industries, profile2.industries) * 25)
  const personalityBonus  = scorePersonalityCompatibility(profile1.personality_quiz, profile2.personality_quiz)
  const industryPenalty   = industryMismatchPenalty(
    profile1.industry_openness, profile1.industries,
    profile2.industry_openness, profile2.industries,
  )

  const total = Math.max(0, intentAlignment + skillsFit + industryAlignment + personalityBonus + industryPenalty)

  return {
    total,
    breakdown: { intentAlignment, skillsFit, industryAlignment, personalityBonus, industryPenalty, total },
  }
}

// ── scorePersonStartupMatch: person ↔ startup ────────────────────────────────
// Max raw score: 40 + 35 + 25 = 100 (before penalty)

export function scorePersonStartupMatch(
  profile: ScoredProfile,
  startup: ScoredStartup,
): { total: number; breakdown: MatchBreakdown } {
  // Intent alignment (40 pts)
  const tags = new Set(profile.intent_tags ?? [])
  const wantsCofounder = tags.has('co-founder')
  const wantsIntern    = tags.has('intern')
  let intentAlignment = 0
  if (wantsCofounder && startup.open_to_cofounders) {
    intentAlignment = 40
  } else if (wantsIntern && startup.open_to_interns) {
    intentAlignment = 40
  } else if (wantsCofounder || wantsIntern) {
    // One-sided: profile wants it but startup doesn't offer it (or vice versa)
    intentAlignment = 20
  } else if (startup.open_to_cofounders || startup.open_to_interns) {
    // Startup is open but profile didn't signal that intent
    intentAlignment = 15
  }

  // Skills fit (35 pts): overlap between profile.skills and startup.skills_needed
  const skillsFit = Math.round(avgSkillsCompatibility(profile.skills, startup.skills_needed) * 35)

  // Industry alignment (25 pts)
  const industryAlignment = Math.round(jaccard(profile.industries, startup.industry) * 25)

  // Industry mismatch penalty
  // For startups we treat industry_openness as always null (startups don't have openness)
  const industryPenalty = industryMismatchPenalty(
    profile.industry_openness, profile.industries,
    null, startup.industry,
  )

  const personalityBonus = scorePersonalityCompatibility(profile.personality_quiz, null)

  const total = Math.max(0, intentAlignment + skillsFit + industryAlignment + industryPenalty)

  return {
    total,
    breakdown: { intentAlignment, skillsFit, industryAlignment, personalityBonus, industryPenalty, total },
  }
}

// ── scoreStartupSimilarity: startup ↔ startup ────────────────────────────────
// Industry tag Jaccard (60%) + description word overlap (40%), scaled to 100 pts.
// Minimum threshold to be considered similar: 25.

export const STARTUP_SIMILARITY_THRESHOLD = 25

export function scoreStartupSimilarity(startup1: ScoredStartup, startup2: ScoredStartup): number {
  const industryScore    = jaccard(startup1.industry, startup2.industry) * 60
  const descriptionScore = wordOverlap(startup1.description, startup2.description) * 40
  return Math.round(industryScore + descriptionScore)
}
