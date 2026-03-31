import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_INDUSTRIES_LIST = [
  'Advertising', 'AI', 'Apparel', 'B2B', 'Biotech', 'Climate', 'CPG',
  'Education', 'Energy', 'Financial Services', 'Fintech', 'Fitness & Wellness',
  'Food & Beverage', 'Gaming', 'Healthcare', 'Hospitality',
  'Leisure/Travel & Tourism', 'Logistics & Supply Chain', 'Manufacturing',
  'Media', 'Medical Devices', 'Pharma', 'Real Estate', 'Social Impact',
  'Sports', 'Sustainability', 'Tech', 'Transportation',
]

const VALID_INDUSTRIES = new Set([
  'Advertising', 'AI', 'Apparel', 'B2B', 'Biotech', 'Climate', 'CPG',
  'Education', 'Energy', 'Financial Services', 'Fintech', 'Fitness & Wellness',
  'Food & Beverage', 'Gaming', 'Healthcare', 'Hospitality',
  'Leisure/Travel & Tourism', 'Logistics & Supply Chain', 'Manufacturing',
  'Media', 'Medical Devices', 'Pharma', 'Real Estate', 'Social Impact',
  'Sports', 'Sustainability', 'Tech', 'Transportation',
])

async function main() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, industries')

  if (error) {
    console.error('Failed to fetch profiles:', error.message)
    process.exit(1)
  }

  console.log(`Fetched ${profiles.length} profiles\n`)

  let updatedCount = 0

  for (const profile of profiles) {
    const original: string[] = Array.isArray(profile.industries) ? profile.industries : []
    const cleaned = original.filter((ind) => VALID_INDUSTRIES.has(ind))

    const removed = original.filter((ind) => !VALID_INDUSTRIES.has(ind))
    if (removed.length === 0) continue

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ industries: cleaned })
      .eq('user_id', profile.user_id)

    if (updateError) {
      console.error(`  ✗ Failed to update ${profile.full_name ?? profile.user_id}: ${updateError.message}`)
      continue
    }

    console.log(`Updated: ${profile.full_name ?? profile.user_id} (${profile.user_id})`)
    console.log(`  Removed: ${removed.join(', ')}`)
    console.log(`  Kept:    ${cleaned.length > 0 ? cleaned.join(', ') : '(none)'}`)
    updatedCount++
  }

  console.log(`\nPass 1 done. ${updatedCount} profile(s) updated.`)

  // ── Pass 2: assign random industries to profiles left with empty arrays ──────
  const emptyProfiles = profiles.filter((p) => {
    const original: string[] = Array.isArray(p.industries) ? p.industries : []
    const cleaned = original.filter((ind) => VALID_INDUSTRIES.has(ind))
    return cleaned.length === 0
  })

  console.log(`\nPass 2: ${emptyProfiles.length} profile(s) with empty industries — assigning randoms\n`)

  let assignedCount = 0

  for (const profile of emptyProfiles) {
    const count = 2 + Math.floor(Math.random() * 2) // 2 or 3
    const shuffled = [...VALID_INDUSTRIES_LIST].sort(() => Math.random() - 0.5)
    const assigned = shuffled.slice(0, count)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ industries: assigned })
      .eq('user_id', profile.user_id)

    if (updateError) {
      console.error(`  ✗ Failed to assign industries to ${profile.full_name ?? profile.user_id}: ${updateError.message}`)
      continue
    }

    console.log(`Assigned: ${profile.full_name ?? profile.user_id} (${profile.user_id})`)
    console.log(`  New industries: ${assigned.join(', ')}`)
    assignedCount++
  }

  console.log(`\nPass 2 done. ${assignedCount} profile(s) assigned new industries.`)
}

main()
