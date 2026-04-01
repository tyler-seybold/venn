import { createClient } from '@supabase/supabase-js'
import { calculateCompleteness } from '../lib/completeness'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Quiz answers for each profile (q1–q10 = "A" | "B", q11–q12 = null)
// Keyed by full_name — the emails in the DB have various typos from the seed run.
//
// Question categories (from lib/matching.ts):
//   Similarity   (same = 1 pt):   q3, q6, q7, q9, q10
//   Complementarity (diff = 1 pt): q4, q8
//   Neutral      (same = 0.5 pt): q1, q2, q5
//
// Personality interpretation used for each question:
//   q1: work style        — A = async / independent,  B = in-person / collaborative
//   q2: decisions         — A = data-driven,           B = gut / intuition
//   q3: risk tolerance    — A = high risk taker,       B = calculated / conservative
//   q4: leadership        — A = prefers to lead,       B = happy to support
//   q5: communication     — A = direct / blunt,        B = diplomatic / thoughtful
//   q6: motivation        — A = mission / impact,      B = financial / achievement
//   q7: pace              — A = fast / iterate often,  B = slow / deliberate
//   q8: work mode         — A = big-picture / vision,  B = execution / detail
//   q9: conflict          — A = confront directly,     B = smooth over / avoid
//  q10: planning          — A = detailed planner,      B = improvisational

const quizAnswers: Record<string, Record<string, string | null>> = {
  // Anika Sharma — tech builder, ML/engineering background, mission-driven
  'Anika Sharma': {
    q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A',
    q6: 'A', q7: 'A', q8: 'A', q9: 'A', q10: 'B',
    q11: null, q12: null,
  },
  // Marcus Webb — McKinsey operator, structured, financially motivated
  'Marcus Webb': {
    q1: 'B', q2: 'A', q3: 'B', q4: 'A', q5: 'B',
    q6: 'B', q7: 'B', q8: 'B', q9: 'A', q10: 'A',
    q11: null, q12: null,
  },
  // Priya Nair — VC/finance, analytical, strategic
  'Priya Nair': {
    q1: 'A', q2: 'A', q3: 'B', q4: 'B', q5: 'B',
    q6: 'B', q7: 'B', q8: 'A', q9: 'B', q10: 'A',
    q11: null, q12: null,
  },
  // James Okafor — product/engineering, fast mover, builder
  'James Okafor': {
    q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A',
    q6: 'A', q7: 'A', q8: 'B', q9: 'A', q10: 'B',
    q11: null, q12: null,
  },
  // Sofia Reyes — creative designer, collaborative, mission-driven
  'Sofia Reyes': {
    q1: 'B', q2: 'B', q3: 'B', q4: 'B', q5: 'B',
    q6: 'A', q7: 'A', q8: 'A', q9: 'B', q10: 'B',
    q11: null, q12: null,
  },
  // Daniel Park — data scientist, deliberate, researcher
  'Daniel Park': {
    q1: 'A', q2: 'A', q3: 'B', q4: 'B', q5: 'A',
    q6: 'A', q7: 'B', q8: 'A', q9: 'B', q10: 'A',
    q11: null, q12: null,
  },
  // Lauren Mitchell — military ops, structured, execution-focused
  'Lauren Mitchell': {
    q1: 'B', q2: 'A', q3: 'B', q4: 'A', q5: 'A',
    q6: 'A', q7: 'A', q8: 'B', q9: 'A', q10: 'A',
    q11: null, q12: null,
  },
  // Ethan Goldberg — healthcare COO, mission-driven, fast-moving leader
  'Ethan Goldberg': {
    q1: 'B', q2: 'B', q3: 'A', q4: 'A', q5: 'B',
    q6: 'A', q7: 'A', q8: 'B', q9: 'A', q10: 'B',
    q11: null, q12: null,
  },
  // Mia Chen — growth marketer, intuition-driven, fast, social
  'Mia Chen': {
    q1: 'B', q2: 'B', q3: 'A', q4: 'A', q5: 'B',
    q6: 'B', q7: 'A', q8: 'A', q9: 'B', q10: 'B',
    q11: null, q12: null,
  },
  // Raj Patel — serial entrepreneur, experienced, candid, gut-driven
  'Raj Patel': {
    q1: 'A', q2: 'B', q3: 'A', q4: 'A', q5: 'A',
    q6: 'B', q7: 'A', q8: 'A', q9: 'A', q10: 'B',
    q11: null, q12: null,
  },
  // Keisha Brown — lawyer/researcher, evidence-based, deliberate, diplomatic
  'Keisha Brown': {
    q1: 'A', q2: 'A', q3: 'B', q4: 'B', q5: 'B',
    q6: 'A', q7: 'B', q8: 'A', q9: 'B', q10: 'A',
    q11: null, q12: null,
  },
  // Tyler Nguyen — climate founder, mission-driven, direct, built & sold
  'Tyler Nguyen': {
    q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A',
    q6: 'A', q7: 'A', q8: 'B', q9: 'A', q10: 'B',
    q11: null, q12: null,
  },
  // Alexis Torres — sales leader, relationship-driven, fast, execution
  'Alexis Torres': {
    q1: 'B', q2: 'B', q3: 'A', q4: 'A', q5: 'A',
    q6: 'B', q7: 'A', q8: 'B', q9: 'A', q10: 'B',
    q11: null, q12: null,
  },
  // Nina Johansson — hardware designer, collaborative, deliberate, creative
  'Nina Johansson': {
    q1: 'B', q2: 'B', q3: 'B', q4: 'B', q5: 'B',
    q6: 'A', q7: 'A', q8: 'A', q9: 'B', q10: 'B',
    q11: null, q12: null,
  },
  // Omar Hassan — PE/finance, analytical, conservative, deliberate
  'Omar Hassan': {
    q1: 'A', q2: 'A', q3: 'B', q4: 'B', q5: 'B',
    q6: 'B', q7: 'B', q8: 'A', q9: 'B', q10: 'A',
    q11: null, q12: null,
  },
}

async function main() {
  const names = Object.keys(quizAnswers)
  console.log(`Fetching ${names.length} test profiles...`)

  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .in('full_name', names)

  if (fetchError) {
    console.error('Failed to fetch profiles:', fetchError.message)
    process.exit(1)
  }

  if (!profiles || profiles.length === 0) {
    console.error('No profiles found. Run seed-test-profiles.ts first.')
    process.exit(1)
  }

  console.log(`Found ${profiles.length} profiles. Updating quiz answers and completeness scores...\n`)

  const succeeded: string[] = []
  const failed: { email: string; error: string }[] = []

  for (const profile of profiles) {
    const quiz = quizAnswers[profile.full_name]
    if (!quiz) {
      console.log(`  SKIP  ${profile.full_name} — no quiz answers defined`)
      continue
    }

    // Merge the quiz into the profile data and recalculate completeness
    const updated = { ...profile, personality_quiz: quiz }
    const { score } = calculateCompleteness(updated as Record<string, unknown>)

    const { error } = await supabase
      .from('profiles')
      .update({ personality_quiz: quiz, completeness_score: score })
      .eq('user_id', profile.user_id)

    if (error) {
      failed.push({ email: profile.email, error: error.message })
      console.log(`  ✗  ${profile.full_name} — ${error.message}`)
    } else {
      succeeded.push(profile.full_name)
      console.log(`  ✓  ${profile.full_name} — completeness_score: ${score}`)
    }
  }

  console.log(`\nUpdated ${succeeded.length} / ${profiles.length} profiles.`)

  if (failed.length > 0) {
    console.log(`\nFailed:`)
    for (const f of failed) console.log(`  ✗ ${f.email}: ${f.error}`)
    process.exit(1)
  }

  console.log('Done.')
}

main()

// ── How to run ────────────────────────────────────────────────────────────────
//
//   npx dotenv -e .env.local -- npx tsx scripts/seed-quiz-answers.ts
//
// Requires profiles to already exist (run seed-test-profiles.ts first).
// Updates personality_quiz (q1–q10 answered, q11–q12 null) and recalculates
// completeness_score for each profile using lib/completeness.ts.
