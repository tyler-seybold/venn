import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const intentTagsByName: Record<string, string[]> = {
  'Anika Sharma':    ['co-founder', 'feedback-partner', 'peer-network'],
  'Daniel Park':     ['co-founder', 'technical-collaborator', 'feedback-partner'],
  'Lauren Mitchell': ['co-founder', 'business-collaborator', 'mentor'],
  'James Okafor':    ['co-founder', 'feedback-partner', 'domain-expert'],
  'Marcus Webb':     ['business-collaborator', 'co-founder', 'peer-network'],
  'Sofia Reyes':     ['feedback-partner', 'peer-network', 'mentor'],
  'Tyler Nguyen':    ['co-founder', 'technical-collaborator', 'peer-network'],
  'Nina Johansson':  ['mentor', 'feedback-partner', 'peer-network'],
  'Ethan Goldberg':  ['co-founder', 'business-collaborator', 'feedback-partner'],
  'Priya Nair':      ['feedback-partner', 'peer-network', 'industry-advisor'],
  'Raj Patel':       ['co-founder', 'feedback-partner', 'peer-network'],
  'Keisha Brown':    ['domain-expert', 'feedback-partner', 'peer-network'],
  'Omar Hassan':     ['business-collaborator', 'feedback-partner', 'peer-network'],
  'Mia Chen':        ['technical-collaborator', 'co-founder', 'feedback-partner'],
  'Alexis Torres':   ['peer-network', 'mentor', 'feedback-partner'],
}

const TYLER_SEYBOLD_USER_ID = '8321ee7c-4973-4901-938b-6b148fc45684'
const TYLER_SEYBOLD_TAGS    = ['peer-network', 'industry-advisor', 'mentor', 'feedback-partner']

async function main() {
  const names = Object.keys(intentTagsByName)
  console.log(`Fetching ${names.length} test profiles by name...`)

  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('full_name', names)

  if (fetchError) {
    console.error('Failed to fetch profiles:', fetchError.message)
    process.exit(1)
  }

  if (!profiles || profiles.length === 0) {
    console.error('No profiles found. Run seed-test-profiles.ts first.')
    process.exit(1)
  }

  console.log(`Found ${profiles.length} profiles. Updating intent_tags...\n`)

  const succeeded: string[] = []
  const failed: { name: string; error: string }[] = []

  for (const profile of profiles) {
    const tags = intentTagsByName[profile.full_name]
    if (!tags) {
      console.log(`  SKIP  ${profile.full_name} — no tags defined`)
      continue
    }

    const { error } = await supabase
      .from('profiles')
      .update({ intent_tags: tags })
      .eq('user_id', profile.user_id)

    if (error) {
      failed.push({ name: profile.full_name, error: error.message })
      console.log(`  ✗  ${profile.full_name} — ${error.message}`)
    } else {
      succeeded.push(profile.full_name)
      console.log(`  ✓  ${profile.full_name} — [${tags.join(', ')}]`)
    }
  }

  // Update Tyler Seybold (Test 1) by user_id
  console.log('\nUpdating Tyler Seybold (Test 1) by user_id...')
  const { error: tylerError } = await supabase
    .from('profiles')
    .update({ intent_tags: TYLER_SEYBOLD_TAGS })
    .eq('user_id', TYLER_SEYBOLD_USER_ID)

  if (tylerError) {
    failed.push({ name: 'Tyler Seybold (Test 1)', error: tylerError.message })
    console.log(`  ✗  Tyler Seybold (Test 1) — ${tylerError.message}`)
  } else {
    succeeded.push('Tyler Seybold (Test 1)')
    console.log(`  ✓  Tyler Seybold (Test 1) — [${TYLER_SEYBOLD_TAGS.join(', ')}]`)
  }

  console.log(`\nUpdated ${succeeded.length} / ${profiles.length + 1} profiles.`)

  if (failed.length > 0) {
    console.log('\nFailed:')
    for (const f of failed) console.log(`  ✗ ${f.name}: ${f.error}`)
    process.exit(1)
  }

  console.log('Done.')
}

main()

// ── How to run ────────────────────────────────────────────────────────────────
//
//   npx dotenv -e .env.local -- npx tsx scripts/seed-intent-tags.ts
//
// Requires profiles to already exist (run seed-test-profiles.ts first).
// Updates intent_tags for all 15 test profiles (matched by full_name) plus
// Tyler Seybold (Test 1) matched by user_id.
