import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Profile data without user_id — IDs are assigned after auth users are created
const profileData = [
  {
    full_name: 'Anika Sharma',
    email: 'anika.sharma@kellogg.northwestern.edu',
    bio: 'Former software engineer at Google with 5 years building ML infrastructure. Pivoting to entrepreneurship after leading a product team through a 0-to-1 launch. Looking to apply technical depth to healthcare or climate tech.',
    skills: ['Engineering', 'Product', 'Data/Analytics'],
    industries: ['HealthTech', 'CleanTech / Sustainability', 'AI / Machine Learning'],
    industry_openness: 'strong_preferences',
    role_orientation: ['Builder', 'Operator'],
    cofounder_interest: true,
    looking_for: 'A business-minded co-founder who can own GTM and fundraising while I lead product and engineering. Ideally someone with healthcare or climate domain expertise.',
    intent_tags: ['co-founder', 'business-collaborator'],
    graduation_year: 2026,
    degree_program: 'MBAi',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Marcus Webb',
    email: 'marcus.webb@kellogg.northwestern.edu',
    bio: 'Three years at McKinsey focused on consumer and retail strategy, then two years at a Series B DTC brand in operations. Passionate about building the next generation of consumer brands with strong unit economics.',
    skills: ['Operations', 'Marketing', 'Finance'],
    industries: ['Consumer Goods', 'Retail / E-commerce', 'Food & Beverage'],
    industry_openness: 'some_preferences',
    role_orientation: ['Operator', 'Business Development'],
    cofounder_interest: true,
    looking_for: 'A technical co-founder who can build the product side. I bring the business fundamentals, ops playbook, and investor relationships.',
    intent_tags: ['co-founder', 'technical-collaborator'],
    graduation_year: 2025,
    degree_program: '2Y',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Priya Nair',
    email: 'priya.nair@kellogg.northwestern.edu',
    bio: 'Investment banker turned venture capital associate at Lightspeed. Deep experience evaluating early-stage startups across fintech and enterprise SaaS. At Kellogg to build operational muscle before founding.',
    skills: ['Finance', 'Sales', 'Product'],
    industries: ['FinTech', 'Enterprise Software / SaaS', 'Venture Capital / Private Equity'],
    industry_openness: 'strong_preferences',
    role_orientation: ['Business Development', 'Generalist'],
    cofounder_interest: true,
    looking_for: 'A technical co-founder with fintech or B2B SaaS experience. I can handle fundraising, partnerships, and commercial strategy.',
    intent_tags: ['co-founder', 'investor-intro'],
    graduation_year: 2026,
    degree_program: '2Y',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'James Okafor',
    email: 'james.okafor@kellogg.northwestern.edu',
    bio: 'Former product manager at Stripe and Plaid, specializing in developer experience and payments infrastructure. Built and shipped products used by millions. Looking to found in the fintech or developer tools space.',
    skills: ['Product', 'Engineering', 'Data/Analytics'],
    industries: ['FinTech', 'Developer Tools', 'Enterprise Software / SaaS'],
    industry_openness: 'strong_preferences',
    role_orientation: ['Builder', 'Operator'],
    cofounder_interest: true,
    looking_for: 'A co-founder with strong sales and GTM experience in developer-facing products. Prior experience selling to engineering teams is a big plus.',
    intent_tags: ['co-founder', 'business-collaborator', 'feedback-partner'],
    graduation_year: 2026,
    degree_program: 'MBAi',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Sofia Reyes',
    email: 'sofia.reyes@kellogg.northwestern.edu',
    bio: 'Brand strategist and designer with 6 years at IDEO and a boutique CPG consultancy. Expert in translating consumer insights into product positioning and visual identity. Excited about the future of food and wellness brands.',
    skills: ['Design', 'Marketing', 'Product'],
    industries: ['Food & Beverage', 'Consumer Goods', 'Health & Wellness'],
    industry_openness: 'some_preferences',
    role_orientation: ['Creative', 'Business Development'],
    cofounder_interest: false,
    looking_for: 'Founders building in food, wellness, or consumer goods who need a design and brand strategy partner. Happy to advise or collaborate on early-stage positioning.',
    intent_tags: ['feedback-partner', 'domain-expert', 'business-collaborator'],
    graduation_year: 2025,
    degree_program: 'MMM',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Daniel Park',
    email: 'daniel.park@kellogg.northwestern.edu',
    bio: 'Data scientist at Meta for four years, building recommendation systems at scale. Also led ML platform work that reduced model training costs 40%. Now exploring applications of AI in education and productivity.',
    skills: ['Data/Analytics', 'Engineering', 'Product'],
    industries: ['AI / Machine Learning', 'EdTech', 'Productivity / Future of Work'],
    industry_openness: 'some_preferences',
    role_orientation: ['Builder', 'Researcher'],
    cofounder_interest: true,
    looking_for: 'A co-founder or early collaborator who understands education markets or enterprise sales. I can own the technical roadmap — need someone who can own customers.',
    intent_tags: ['co-founder', 'business-collaborator', 'domain-expert'],
    graduation_year: 2026,
    degree_program: 'MBAi',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Lauren Mitchell',
    email: 'lauren.mitchell@kellogg.northwestern.edu',
    bio: 'Former Army officer and management consultant with deep experience in logistics, supply chain, and complex operations. Ran a $200M program at Booz Allen. Passionate about defense tech and dual-use hardware.',
    skills: ['Operations', 'Finance', 'Sales'],
    industries: ['Defense & Government Tech', 'Logistics & Supply Chain', 'Hardware & IoT'],
    industry_openness: 'strong_preferences',
    role_orientation: ['Operator', 'Generalist'],
    cofounder_interest: true,
    looking_for: 'A technical co-founder with hardware, robotics, or defense-adjacent experience. I bring government relationships, ops rigor, and fundraising from the defense VC ecosystem.',
    intent_tags: ['co-founder', 'technical-collaborator'],
    graduation_year: 2025,
    degree_program: '2Y',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Ethan Goldberg',
    email: 'ethan.goldberg@kellogg.northwestern.edu',
    bio: 'Healthcare consultant at BCG for three years, then COO at a digital health startup that raised a $15M Series A. Obsessed with fixing how Americans navigate the healthcare system. Now back at school to think bigger.',
    skills: ['Operations', 'Product', 'Sales'],
    industries: ['HealthTech', 'Health & Wellness', 'Insurance & InsurTech'],
    industry_openness: 'strong_preferences',
    role_orientation: ['Operator', 'Business Development'],
    cofounder_interest: true,
    looking_for: 'A technical co-founder or senior engineer who wants to build in digital health. I have the domain expertise, operator track record, and a clear thesis for what we would build.',
    intent_tags: ['co-founder', 'technical-collaborator', 'feedback-partner'],
    graduation_year: 2026,
    degree_program: '2Y',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Mia Chen',
    email: 'mia.chen@kellogg.northwestern.edu',
    bio: 'Growth marketer who scaled user acquisition at two consumer apps from 0 to 1M+ users. Deep expertise in paid social, content strategy, and creator economy dynamics. Exploring early-stage founding opportunities.',
    skills: ['Marketing', 'Social Media', 'Sales'],
    industries: ['Creator Economy', 'Consumer Apps', 'Social / Community'],
    industry_openness: 'some_preferences',
    role_orientation: ['Business Development', 'Creative'],
    cofounder_interest: true,
    looking_for: 'A product or engineering co-founder building in social, creator tools, or consumer apps. I bring distribution know-how and a strong network in the creator space.',
    intent_tags: ['co-founder', 'technical-collaborator'],
    graduation_year: 2025,
    degree_program: '2Y',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Raj Patel',
    email: 'raj.patel@kellogg.northwestern.edu',
    bio: 'Serial entrepreneur with two exits in SaaS (one acquihire, one strategic acquisition). Currently an EIR at a Chicago VC. Mentoring first-time founders is one of the things I find most rewarding.',
    skills: ['Product', 'Sales', 'Finance'],
    industries: ['Enterprise Software / SaaS', 'FinTech', 'Marketplace'],
    industry_openness: 'open_to_anything',
    role_orientation: ['Generalist', 'Business Development'],
    cofounder_interest: false,
    looking_for: 'First-time founders who want a candid thought partner on product strategy, fundraising, and go-to-market. Happy to grab coffee and give real feedback.',
    intent_tags: ['mentor', 'feedback-partner', 'investor-intro'],
    graduation_year: 2025,
    degree_program: '2Y',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Keisha Brown',
    email: 'keisha.brown@kellogg.northwestern.edu',
    bio: 'IP attorney turned business student after five years at a top patent litigation firm. Specialized in software patents and tech licensing. Now focused on the intersection of law, AI, and venture creation.',
    skills: ['Legal', 'Finance', 'Operations'],
    industries: ['AI / Machine Learning', 'Legal Tech', 'Enterprise Software / SaaS'],
    industry_openness: 'some_preferences',
    role_orientation: ['Researcher', 'Generalist'],
    cofounder_interest: false,
    looking_for: 'Founders who need legal strategy advice on IP, fundraising docs, or regulatory risk — especially in AI or enterprise software. I want to be a useful sounding board.',
    intent_tags: ['domain-expert', 'feedback-partner'],
    graduation_year: 2026,
    degree_program: '2Y',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Tyler Nguyen',
    email: 'tyler.nguyen@kellogg.northwestern.edu',
    bio: 'Climate tech founder who built and sold a carbon accounting SaaS to a Fortune 500. Previously an energy analyst at RMI. Deep expertise in corporate decarbonization, renewable energy markets, and climate policy.',
    skills: ['Product', 'Marketing', 'Finance'],
    industries: ['CleanTech / Sustainability', 'Energy', 'Real Estate & PropTech'],
    industry_openness: 'strong_preferences',
    role_orientation: ['Builder', 'Researcher'],
    cofounder_interest: true,
    looking_for: 'A technical co-founder passionate about climate. I have the domain knowledge, customer relationships, and a clear problem to solve — looking for someone who can build the product.',
    intent_tags: ['co-founder', 'technical-collaborator', 'peer-network'],
    graduation_year: 2025,
    degree_program: 'MMM',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Alexis Torres',
    email: 'alexis.torres@kellogg.northwestern.edu',
    bio: 'Former D1 athlete turned sales leader. Spent 6 years at Salesforce and HubSpot in enterprise sales, consistently ranked top 5% globally. Wants to apply the competitive mindset and relationship skills to building a company.',
    skills: ['Sales', 'Marketing', 'Operations'],
    industries: ['Enterprise Software / SaaS', 'Productivity / Future of Work', 'Marketplace'],
    industry_openness: 'open_to_anything',
    role_orientation: ['Business Development', 'Operator'],
    cofounder_interest: true,
    looking_for: 'A technical or product co-founder who has a strong B2B idea. I will own revenue from day one — pipeline, demos, closes, and partnerships.',
    intent_tags: ['co-founder', 'business-collaborator'],
    graduation_year: 2026,
    degree_program: '2Y',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Nina Johansson',
    email: 'nina.johansson@kellogg.northwestern.edu',
    bio: 'Industrial designer and UX researcher who spent 4 years at Apple designing hardware and 2 years at a med-device startup. Deeply interested in how physical and digital products intersect, especially in health and wellness.',
    skills: ['Design', 'Engineering', 'Product'],
    industries: ['Health & Wellness', 'Hardware & IoT', 'Consumer Apps'],
    industry_openness: 'some_preferences',
    role_orientation: ['Creative', 'Builder'],
    cofounder_interest: false,
    looking_for: 'Early-stage founders building hardware or consumer health products who need a design and user research partner. Looking for projects where design is a real competitive advantage.',
    intent_tags: ['feedback-partner', 'domain-expert', 'technical-collaborator'],
    graduation_year: 2025,
    degree_program: 'MMM',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
  {
    full_name: 'Omar Hassan',
    email: 'omar.hassan@kellogg.northwestern.edu',
    bio: 'Former private equity associate at KKR focused on healthcare and education deals. Strong financial modeling, due diligence, and board dynamics experience. Looking to transition from investing in companies to building one.',
    skills: ['Finance', 'Operations', 'Sales'],
    industries: ['EdTech', 'HealthTech', 'Venture Capital / Private Equity'],
    industry_openness: 'some_preferences',
    role_orientation: ['Generalist', 'Business Development'],
    cofounder_interest: true,
    looking_for: 'A co-founder with product or technical depth in edtech or healthtech. I bring financial rigor, a strong investor network, and experience structuring deals.',
    intent_tags: ['co-founder', 'investor-intro', 'peer-network'],
    graduation_year: 2026,
    degree_program: '2Y',
    matching_opt_in: true,
    completeness_score: 80,
    personality_quiz: null,
  },
]

async function main() {
  console.log(`Creating ${profileData.length} auth users and profiles...`)

  const inserted: { full_name: string; user_id: string }[] = []
  const failed: { full_name: string; error: string }[] = []

  for (const p of profileData) {
    // Create the auth user first (email + random password, email_confirm bypassed)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: p.email,
      password: crypto.randomUUID(), // random — test accounts only
      email_confirm: true,
    })

    if (authError || !authData.user) {
      // User may already exist — look them up
      if (authError?.message?.includes('already been registered')) {
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existing = listData?.users?.find((u) => u.email === p.email)
        if (existing) {
          console.log(`  ${p.full_name} — auth user already exists, reusing ${existing.id}`)
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({ ...p, user_id: existing.id }, { onConflict: 'user_id' })
          if (upsertError) {
            failed.push({ full_name: p.full_name, error: upsertError.message })
          } else {
            inserted.push({ full_name: p.full_name, user_id: existing.id })
          }
          continue
        }
      }
      failed.push({ full_name: p.full_name, error: authError?.message ?? 'unknown auth error' })
      continue
    }

    const userId = authData.user.id

    // Insert the profile row
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ ...p, user_id: userId })

    if (profileError) {
      failed.push({ full_name: p.full_name, error: profileError.message })
    } else {
      inserted.push({ full_name: p.full_name, user_id: userId })
    }
  }

  console.log(`\nInserted ${inserted.length} profiles:`)
  for (const r of inserted) console.log(`  ✓ ${r.full_name} — ${r.user_id}`)

  if (failed.length > 0) {
    console.log(`\nFailed ${failed.length}:`)
    for (const r of failed) console.log(`  ✗ ${r.full_name}: ${r.error}`)
    process.exit(1)
  }

  console.log('\nDone.')
}

main()

// ── How to run ────────────────────────────────────────────────────────────────
//
// From the project root:
//
//   npx dotenv -e .env.local -- npx tsx scripts/seed-test-profiles.ts
//
// The script creates a real Supabase auth user for each profile (required by the
// FK constraint on profiles.user_id), then inserts the profile row. Passwords are
// random UUIDs — these are test accounts only.
//
// To delete the seeded data later, run in the Supabase SQL editor:
//
//   delete from profiles
//   where email like '%@kellogg.northwestern.edu'
//   and full_name in (
//     'Anika Sharma','Marcus Webb','Priya Nair','James Okafor','Sofia Reyes',
//     'Daniel Park','Lauren Mitchell','Ethan Goldberg','Mia Chen','Raj Patel',
//     'Keisha Brown','Tyler Nguyen','Alexis Torres','Nina Johansson','Omar Hassan'
//   );
//
//   -- Then delete the auth users via the Supabase dashboard:
//   -- Authentication → Users → filter by @kellogg.northwestern.edu → delete
