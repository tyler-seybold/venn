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

// ── scoreMatch: person ↔ person ───────────────────────────────────────────────
// Max raw score: 40 + 35 + 25 + 12 = 112 (before penalty)

export function scoreMatch(
  profile1: ScoredProfile,
  profile2: ScoredProfile,
): { total: number; breakdown: MatchBreakdown } {
  const intentAlignment   = Math.round(jaccard(profile1.intent_tags, profile2.intent_tags) * 40)
  const skillsFit         = Math.round(avgSkillsCompatibility(profile1.skills, profile2.skills) * 35)
  const industryAlignment = Math.round(jaccard(profile1.industries, profile2.industries) * 25)
  const personalityBonus  = profile1.personality_quiz != null && profile2.personality_quiz != null ? 12 : 0
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

  const personalityBonus = 0 // not applicable for person–startup matches

  const total = Math.max(0, intentAlignment + skillsFit + industryAlignment + industryPenalty)

  return {
    total,
    breakdown: { intentAlignment, skillsFit, industryAlignment, personalityBonus, industryPenalty, total },
  }
}

// ── scoreStartupMatch: startup ↔ startup ─────────────────────────────────────
// Simple industry overlap, scaled to 100 pts.

export function scoreStartupMatch(startup1: ScoredStartup, startup2: ScoredStartup): number {
  return Math.round(jaccard(startup1.industry, startup2.industry) * 100)
}
