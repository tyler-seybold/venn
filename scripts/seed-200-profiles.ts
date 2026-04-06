import { createClient } from '@supabase/supabase-js'
import { calculateCompleteness } from '../lib/completeness'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Name pools ─────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aisha', 'Alejandro', 'Amara', 'Anjali', 'Arjun', 'Ava', 'Benjamin', 'Bianca',
  'Brianna', 'Caleb', 'Carlos', 'Carmen', 'Chloe', 'Christine', 'Connor',
  'Crystal', 'Darius', 'David', 'Diana', 'Diego', 'Dominic', 'Ebony', 'Elena',
  'Elijah', 'Emily', 'Eric', 'Fatima', 'Gabriel', 'Grace', 'Hannah', 'Hassan',
  'Isabella', 'Isaiah', 'Jada', 'James', 'Jasmine', 'Jason', 'Jennifer',
  'Jordan', 'José', 'Julia', 'Kayla', 'Kevin', 'Kimani', 'Lakshmi', 'Laura',
  'Lena', 'Leo', 'Liam', 'Lin', 'Lucas', 'Madison', 'Marcus', 'Maria',
  'Matthew', 'Maya', 'Mia', 'Michael', 'Miguel', 'Natasha', 'Nathan', 'Neha',
  'Nicole', 'Noah', 'Nour', 'Olivia', 'Omar', 'Patrick', 'Paul', 'Priya',
  'Rachel', 'Rafael', 'Rania', 'Rebecca', 'Ryan', 'Samir', 'Sarah', 'Sean',
  'Sofia', 'Sophia', 'Tariq', 'Taylor', 'Thomas', 'Tiffany', 'Tyler', 'Uma',
  'Valentina', 'Victor', 'Wei', 'Yara', 'Zara', 'Zoe', 'Andre', 'Angela',
  'Antonio', 'Brandon', 'Claudia', 'Daniel', 'Danielle', 'Patrick',
]

const LAST_NAMES = [
  'Adams', 'Agarwal', 'Ahmed', 'Ali', 'Anderson', 'Bakr', 'Banerjee', 'Barnes',
  'Bennett', 'Brown', 'Campbell', 'Carter', 'Chen', 'Chowdhury', 'Clark',
  'Coleman', 'Cooper', 'Davis', 'Diallo', 'Dixon', 'Evans', 'Foster', 'Gao',
  'Garcia', 'Goldberg', 'Gonzalez', 'Grant', 'Green', 'Gupta', 'Hall',
  'Harris', 'Hassan', 'Hernandez', 'Hill', 'Howard', 'Huang', 'Jackson',
  'James', 'Johansson', 'Johnson', 'Jones', 'Kapoor', 'Kim', 'Kumar', 'Lam',
  'Lee', 'Lewis', 'Li', 'Liu', 'Lopez', 'Martin', 'Martinez', 'Miller',
  'Mitchell', 'Moore', 'Morgan', 'Murphy', 'Nair', 'Nelson', 'Nguyen',
  'Okafor', 'Okonkwo', 'Patel', 'Perez', 'Phillips', 'Porter', 'Ramirez',
  'Reyes', 'Richardson', 'Rivera', 'Roberts', 'Robinson', 'Rodriguez', 'Ross',
  'Russell', 'Sharma', 'Singh', 'Smith', 'Stewart', 'Sullivan', 'Taylor',
  'Thomas', 'Thompson', 'Torres', 'Turner', 'Walker', 'Washington', 'Webb',
  'White', 'Williams', 'Wilson', 'Wright', 'Wu', 'Yang', 'Young', 'Zhang',
  'Zhao', 'Zhou', 'Kowalski', 'Nakamura', 'Sato', 'Tanaka',
]

// ── Founder archetypes → skills ────────────────────────────────────────────────

const ARCHETYPES = [
  { name: 'Builder',   weight: 30, skills: ['Engineering', 'Product', 'Data/Analytics'] },
  { name: 'Business',  weight: 30, skills: ['Finance', 'Sales', 'Marketing'] },
  { name: 'Operator',  weight: 25, skills: ['Operations', 'Finance', 'Legal'] },
  { name: 'Creative',  weight: 15, skills: ['Design', 'Marketing', 'Social Media'] },
] as const

// Expanded weighted pool (sum of weights = 100)
const ARCHETYPE_POOL = ARCHETYPES.flatMap((a) => Array(a.weight).fill(a))

// ── Weighted industry pool ─────────────────────────────────────────────────────
// "Hot" industries appear many more times; remaining 18 share the rest.

const INDUSTRY_WEIGHTED: string[] = [
  ...Array(25).fill('Fintech'),
  ...Array(22).fill('Healthcare'),
  ...Array(20).fill('AI'),
  ...Array(18).fill('Climate'),
  ...Array(18).fill('B2B'),
  ...Array(15).fill('Social Impact'),
  ...Array(15).fill('Tech'),
  ...Array(12).fill('Education'),
  // Remaining 18 industries at ~3 each (≈54 slots)
  'Advertising', 'Advertising', 'Advertising',
  'Apparel', 'Apparel',
  'Biotech', 'Biotech', 'Biotech',
  'CPG', 'CPG',
  'Energy', 'Energy', 'Energy',
  'Financial Services', 'Financial Services', 'Financial Services',
  'Fitness & Wellness', 'Fitness & Wellness',
  'Food & Beverage', 'Food & Beverage', 'Food & Beverage',
  'Gaming', 'Gaming',
  'Hospitality', 'Hospitality',
  'Leisure/Travel & Tourism', 'Leisure/Travel & Tourism',
  'Logistics & Supply Chain', 'Logistics & Supply Chain', 'Logistics & Supply Chain',
  'Manufacturing', 'Manufacturing',
  'Media', 'Media', 'Media',
  'Medical Devices', 'Medical Devices',
  'Pharma', 'Pharma',
  'Real Estate', 'Real Estate',
  'Sports', 'Sports',
  'Sustainability', 'Sustainability', 'Sustainability',
  'Transportation', 'Transportation',
]

// ── Weighted intent tag pool ───────────────────────────────────────────────────

const INTENT_TAG_WEIGHTED: string[] = [
  ...Array(55).fill('co-founder'),
  ...Array(50).fill('feedback-partner'),
  ...Array(45).fill('peer-network'),
  ...Array(30).fill('technical-collaborator'),
  ...Array(30).fill('business-collaborator'),
  ...Array(20).fill('mentor'),
  ...Array(20).fill('industry-advisor'),
  ...Array(15).fill('domain-expert'),
  ...Array(10).fill('intern'),
  ...Array(10).fill('investor-intro'),
]

// Unique values, used to deduplicate picks
const ALL_INTENT_TAGS = [...new Set(INTENT_TAG_WEIGHTED)]

// ── Degree programs & industry openness ───────────────────────────────────────

const DEGREE_PROGRAMS_WEIGHTED = [
  ...Array(60).fill('2Y'),
  ...Array(15).fill('MMM'),
  ...Array(15).fill('MBAi'),
  ...Array(4).fill('1Y'),
  ...Array(2).fill('JD-MBA'),
  ...Array(2).fill('MD-MBA'),
  ...Array(1).fill('EMBA'),
  ...Array(1).fill('E&W'),
]

const INDUSTRY_OPENNESS_WEIGHTED = [
  ...Array(40).fill('strong_preferences'),
  ...Array(40).fill('some_preferences'),
  ...Array(20).fill('open_to_anything'),
]

const ROLE_ORIENTATIONS = [
  'Operator', 'Builder', 'Business Development', 'Generalist', 'Researcher', 'Creative',
]

// ── Personality clusters ───────────────────────────────────────────────────────

type QuizAnswers = Record<string, string>

const PERSONALITY_CLUSTERS: { weight: number; base: QuizAnswers }[] = [
  {
    weight: 35,
    base: { q1:'A', q2:'A', q3:'A', q4:'B', q5:'A', q6:'B', q7:'A', q8:'A', q9:'A', q10:'A' }, // Visionary
  },
  {
    weight: 35,
    base: { q1:'B', q2:'B', q3:'B', q4:'A', q5:'B', q6:'A', q7:'B', q8:'B', q9:'B', q10:'B' }, // Executor
  },
  {
    weight: 30,
    base: { q1:'B', q2:'B', q3:'A', q4:'B', q5:'A', q6:'B', q7:'B', q8:'A', q9:'A', q10:'B' }, // Collaborator
  },
]

const CLUSTER_POOL = PERSONALITY_CLUSTERS.flatMap((c) => Array(c.weight).fill(c))

// ── Looking-for templates ──────────────────────────────────────────────────────
// [industry] is replaced at generation time with a real industry from the profile.

const LOOKING_FOR_TEMPLATES = [
  (ind: string) =>
    `Looking for a technical co-founder to build alongside me as I validate my idea in ${ind}. I bring the business and go-to-market side — customer discovery, fundraising strategy, and commercial relationships. Ideally someone who has shipped real products and is ready to move fast on a problem that genuinely matters.`,
  (ind: string) =>
    `Seeking a co-founder with a strong operational or finance background. I'm a builder by nature and need someone who can own the business side — revenue model, investor relations, and go-to-market. My focus is ${ind} and I have a clear thesis on the problem worth solving.`,
  (ind: string) =>
    `Looking to connect with other founders in ${ind} for peer support, honest feedback on my idea, and potential collaboration. Early-stage is lonely and I want to build a small network of people who are serious about building, not just exploring. Co-founder conversations welcome.`,
  (ind: string) =>
    `Want to meet other MBAs thinking seriously about entrepreneurship in ${ind} — looking for thought partners, potential co-founders, or people who want to jam on ideas and push each other's thinking. The best filter is curiosity and urgency, not a polished deck.`,
  (ind: string) =>
    `Exploring opportunities in ${ind} and looking for technical collaborators or domain experts who can help me understand the landscape from the inside. I come with business depth and am genuinely trying to learn what problems are worth attacking before committing to a direction.`,
  (ind: string) =>
    `Building in ${ind} and looking for a business co-founder who can own sales and marketing while I focus on product and engineering. I want someone who has closed deals, understands channel dynamics, and is excited to work on a problem with real market pull.`,
  (_ind: string) =>
    `Open to conversations with anyone working on interesting problems. Especially interested in finding a co-founder or joining an early-stage team where I can add immediate value. I'm stage-agnostic right now — what matters most is the quality of the person and the urgency of the problem.`,
  (ind: string) =>
    `Looking for advisors and peers in ${ind} who can help me pressure-test my thesis before I commit fully. I've done early customer discovery and have a working hypothesis, but I want to stress-test it with people who know the space. Not looking for validation — looking for sharp pushback.`,
]

// ── Bio templates ──────────────────────────────────────────────────────────────

const BIO_TEMPLATES = [
  () => `Former software engineer with ${3 + randi(5)} years building products at a tech company. At Kellogg to develop business fundamentals and find a co-founder to build something impactful in a space I care about.`,
  () => `Management consultant turned entrepreneur. Spent ${3 + randi(5)} years advising large companies on strategy and operations before deciding it was time to build my own company instead of fixing other people's.`,
  () => `Investment banker with deep experience in M&A and capital markets. Transitioning to the startup world to apply financial rigor and deal-making skills to early-stage company building.`,
  () => `Product manager who shipped multiple 0-to-1 products at growth-stage startups. Excited to apply customer obsession, rapid iteration, and cross-functional execution to founding my first company.`,
  () => `Marketing leader who scaled user acquisition and brand strategy at consumer and B2B companies. Exploring how to apply growth expertise and channel knowledge to building a company from the ground up.`,
  () => `Data scientist with ${2 + randi(6)} years of experience in machine learning and analytics. Passionate about applying AI to solve real-world problems in healthcare, finance, or enterprise software.`,
  () => `Operations executive with experience running complex logistics and supply chain programs. Looking to apply systems thinking and execution discipline to an early-stage venture.`,
  () => `Designer and researcher with a background in human-centered design and UX. Believes the best products start with deep user understanding and a strong, defensible point of view on the experience.`,
  () => `Sales leader with a track record of closing enterprise deals and building high-performing go-to-market teams. Ready to bring commercial instincts and customer relationships to an early founding team.`,
  () => `Healthcare professional who spent years in clinical or administrative roles and is now motivated to fix the broken parts of the system through technology, better incentives, and product-led growth.`,
  () => `VC associate turned MBA student, having evaluated hundreds of early-stage deals across multiple sectors. Now looking to be on the other side of the table and build something worth investing in.`,
  () => `Former military officer with ${4 + randi(8)} years of leadership experience. Brings operational rigor, team-building, and the ability to execute under uncertainty to any early-stage environment.`,
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function randi(max: number): number {
  return Math.floor(Math.random() * max)
}

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[randi(arr.length)]
}

/** Pick n unique items from arr using weighted sampling (with replacement draws, deduped). */
function pickWeightedUnique(pool: string[], n: number): string[] {
  const result = new Set<string>()
  let attempts = 0
  while (result.size < n && attempts < pool.length * 3) {
    result.add(pool[randi(pool.length)])
    attempts++
  }
  return [...result]
}

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

// ── Profile factory ────────────────────────────────────────────────────────────

function buildProfile(index: number) {
  const firstName = pick(FIRST_NAMES)
  const lastName  = pick(LAST_NAMES)
  const fullName  = `${firstName} ${lastName}`

  const slug  = `${firstName.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}`
  const email = `${slug}.${index + 1}@kelog.northwestern.edu`

  const graduationYear   = Math.random() < 0.5 ? 2026 : 2027
  const degreeProgram    = pick(DEGREE_PROGRAMS_WEIGHTED)
  const industryOpenness = pick(INDUSTRY_OPENNESS_WEIGHTED)
  const roleOrientation  = pickN(ROLE_ORIENTATIONS, 1 + randi(2))
  const cofounderInterest = Math.random() < 0.4

  // Skills — from archetype
  const archetype = pick(ARCHETYPE_POOL)
  const skillCount = 2 + randi(2) // 2–3
  const skills = pickN([...archetype.skills], Math.min(skillCount, archetype.skills.length))

  // Industries — weighted toward hot sectors, 2–4 unique picks
  const industryCount = 2 + randi(3) // 2–4
  const industries = pickWeightedUnique(INDUSTRY_WEIGHTED, industryCount)

  // Intent tags — weighted, 2–3 unique picks
  const tagCount  = 2 + randi(2) // 2–3
  const intentTags = pickWeightedUnique(INTENT_TAG_WEIGHTED, tagCount)

  // Personality quiz — cluster base + 20% per-answer flip noise
  const cluster = pick(CLUSTER_POOL)
  const personalityQuiz: Record<string, string | null> = {}
  for (const [key, val] of Object.entries(cluster.base)) {
    personalityQuiz[key] = Math.random() < 0.2
      ? (val === 'A' ? 'B' : 'A')  // flip with 20% chance
      : val
  }
  personalityQuiz.q11 = null
  personalityQuiz.q12 = null

  // Looking for — template filled with one of the profile's actual industries
  const featuredIndustry = pick(industries)
  const lookingFor = pick(LOOKING_FOR_TEMPLATES)(featuredIndustry)

  const bio = pick(BIO_TEMPLATES)()

  const base = {
    full_name:          fullName,
    email,
    bio,
    skills,
    industries,
    industry_openness:  industryOpenness,
    role_orientation:   roleOrientation,
    cofounder_interest: cofounderInterest,
    looking_for:        lookingFor,
    intent_tags:        intentTags,
    personality_quiz:   personalityQuiz,
    graduation_year:    graduationYear,
    degree_program:     degreeProgram,
    matching_opt_in:    true,
    is_admin:           false,
  }

  const { score } = calculateCompleteness(base as Record<string, unknown>)
  return { ...base, completeness_score: score }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  // ── Cleanup: delete existing simulation profiles and auth users ───────────────
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('user_id, email')
    .like('email', '%@kelog.northwestern.edu')

  if (fetchError) throw fetchError

  if (existing && existing.length > 0) {
    const simIds = existing.map((r) => r.user_id)

    // Null out user_feedback references (FK is set null, but may not cascade in deployed schema)
    await supabase.from('user_feedback').update({ user_id: null }).in('user_id', simIds)

    // Delete profiles (matches cascade via profiles FK; startups cascade via founder_id)
    const { error: delProfilesError } = await supabase
      .from('profiles')
      .delete()
      .like('email', '%@kelog.northwestern.edu')
    if (delProfilesError) throw delProfilesError

    // Delete auth users one by one (admin API has no bulk delete)
    for (const row of existing) {
      await supabase.auth.admin.deleteUser(row.user_id)
    }

    console.log(`Cleaned up ${existing.length} existing simulation profiles.`)
  } else {
    console.log('No existing simulation profiles to clean up.')
  }

  // ── Generate & insert 200 profiles ───────────────────────────────────────────
  const profiles = Array.from({ length: 200 }, (_, i) => buildProfile(i))
  console.log(`\nInserting ${profiles.length} simulation profiles…`)

  const inserted: Array<{ full_name: string; user_id: string }> = []
  const failed:   Array<{ full_name: string; error: string }>   = []

  for (const p of profiles) {
    const userId = crypto.randomUUID()

    const { error: authError } = await supabase.auth.admin.createUser({
      id:            userId,
      email:         p.email,
      password:      crypto.randomUUID(),
      email_confirm: true,
    })

    if (authError) {
      failed.push({ full_name: p.full_name, error: `auth: ${authError.message}` })
      continue
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ ...p, user_id: userId })

    if (profileError) {
      failed.push({ full_name: p.full_name, error: `profile: ${profileError.message}` })
    } else {
      inserted.push({ full_name: p.full_name, user_id: userId })
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n── Summary ───────────────────────────────────`)
  console.log(`Total inserted: ${inserted.length} / ${profiles.length}`)

  if (failed.length > 0) {
    console.log(`\nFailed (${failed.length}):`)
    for (const r of failed) console.log(`  ✗ ${r.full_name}: ${r.error}`)
  }

  // Graduation year
  const byYear: Record<number, number> = {}
  for (const p of profiles) byYear[p.graduation_year] = (byYear[p.graduation_year] ?? 0) + 1
  console.log('\nBy graduation year:')
  for (const [year, count] of Object.entries(byYear).sort())
    console.log(`  ${year}: ${count}`)

  // Degree program
  const byDegree: Record<string, number> = {}
  for (const p of profiles) byDegree[p.degree_program] = (byDegree[p.degree_program] ?? 0) + 1
  console.log('\nBy degree program:')
  for (const [prog, count] of Object.entries(byDegree).sort((a, b) => b[1] - a[1]))
    console.log(`  ${prog}: ${count}`)

  // Industry openness
  const byOpenness: Record<string, number> = {}
  for (const p of profiles) byOpenness[p.industry_openness] = (byOpenness[p.industry_openness] ?? 0) + 1
  console.log('\nBy industry openness:')
  for (const [opt, count] of Object.entries(byOpenness))
    console.log(`  ${opt}: ${count}`)

  // Archetype distribution (inferred from skills)
  const archetypeNames = ['Builder', 'Business', 'Operator', 'Creative'] as const
  const byArchetype: Record<string, number> = {}
  for (const p of profiles) {
    const isBuilder  = p.skills.includes('Engineering') || p.skills.includes('Product')
    const isCreative = p.skills.includes('Design') || p.skills.includes('Social Media')
    const isOperator = p.skills.includes('Operations') || p.skills.includes('Legal')
    const label = isBuilder ? 'Builder' : isCreative ? 'Creative' : isOperator ? 'Operator' : 'Business'
    byArchetype[label] = (byArchetype[label] ?? 0) + 1
  }
  console.log('\nBy founder archetype (inferred):')
  for (const name of archetypeNames)
    console.log(`  ${name}: ${byArchetype[name] ?? 0}`)

  console.log('\nDone.')
  if (failed.length > 0) process.exit(1)
}

main().catch((err) => { console.error(err); process.exit(1) })

// ── How to run ────────────────────────────────────────────────────────────────
//
//   npx dotenv -e .env.local -- npx tsx scripts/seed-200-profiles.ts
//
// The script deletes all existing @kelog.northwestern.edu profiles and auth users,
// then inserts 200 fresh ones. Passwords are random UUIDs — simulation only.
// No real emails are sent because the domain is intentionally misspelled.
