export interface CompletenessBreakdown {
  full_name: number
  bio: number
  skills: number
  industries: number
  industry_openness: number
  looking_for: number
  graduation_year: number
  degree_program: number
  avatar_url: number
  role_orientation: number
  personality_quiz: number
  looking_for_extended: number
  industries_breadth: number
}

export interface CompletenessResult {
  score: number
  breakdown: CompletenessBreakdown
  isEligible: boolean
}

export function calculateCompleteness(profile: Record<string, unknown>): CompletenessResult {
  const breakdown: CompletenessBreakdown = {
    full_name:            0,
    bio:                  0,
    skills:               0,
    industries:           0,
    industry_openness:    0,
    looking_for:          0,
    graduation_year:      0,
    degree_program:       0,
    avatar_url:           0,
    role_orientation:     0,
    personality_quiz:     0,
    looking_for_extended: 0,
    industries_breadth:   0,
  }

  // Required fields (60 points)
  if (typeof profile.full_name === 'string' && profile.full_name.trim().length > 0) {
    breakdown.full_name = 5
  }

  if (typeof profile.bio === 'string' && profile.bio.length >= 50) {
    breakdown.bio = 10
  }

  if (Array.isArray(profile.skills) && profile.skills.length >= 1) {
    breakdown.skills = 8
  }

  if (Array.isArray(profile.industries) && profile.industries.length >= 1) {
    breakdown.industries = 8
  }

  if (profile.industry_openness != null && profile.industry_openness !== '') {
    breakdown.industry_openness = 7
  }

  if (typeof profile.looking_for === 'string' && profile.looking_for.length >= 100) {
    breakdown.looking_for = 12
  }

  if (profile.graduation_year != null && profile.graduation_year !== '') {
    breakdown.graduation_year = 5
  }

  if (profile.degree_program != null && profile.degree_program !== '') {
    breakdown.degree_program = 5
  }

  // Optional enhancements (40 points)
  if (typeof profile.avatar_url === 'string' && profile.avatar_url.length > 0) {
    breakdown.avatar_url = 5
  }

  if (Array.isArray(profile.role_orientation) && profile.role_orientation.length >= 1) {
    breakdown.role_orientation = 8
  }

  if (
    profile.personality_quiz != null &&
    typeof profile.personality_quiz === 'object' &&
    !Array.isArray(profile.personality_quiz)
  ) {
    const vals = Object.values(profile.personality_quiz as Record<string, unknown>)
    if (vals.length > 0 && vals.every((v) => v !== null && v !== undefined && v !== '')) {
      breakdown.personality_quiz = 15
    }
  }

  if (typeof profile.looking_for === 'string' && profile.looking_for.length >= 200) {
    breakdown.looking_for_extended = 7
  }

  if (Array.isArray(profile.industries) && profile.industries.length >= 3) {
    breakdown.industries_breadth = 5
  }

  const score = Object.values(breakdown).reduce((sum, pts) => sum + pts, 0)

  return {
    score,
    breakdown,
    isEligible: score >= 60,
  }
}
