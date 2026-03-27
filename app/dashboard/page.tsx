'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ChevronDown, ChevronRight, ExternalLink, Sparkles, Rocket, Users, ThumbsUp, ThumbsDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getMatchLabel, getMatchLabelColor } from '@/config/matching'

// ── Types ────────────────────────────────────────────────────────────────────

type Startup = {
  id: string
  founder_id: string
  startup_name: string
  logo_url: string | null
  member_names: string[]
  industry: string[] | null
  stage: string | null
  description: string | null
  website_url: string | null
  current_ask: string | null
  current_ask_updated_at: string | null
  founder_email: string | null
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

type Profile = {
  user_id: string
  full_name: string | null
  email: string | null
  bio: string | null
  slack_handle: string | null
  skills: string[] | null
  industries: string[] | null
  is_looking_for_startup: boolean
  graduation_year: number | null
  degree_program: string | null
  avatar_url: string | null
  is_founder: boolean
  startup_name: string | null
}

type MatchWithProfile = {
  id: string
  user_id_1: string
  user_id_2: string
  match_type: string
  match_score: number | null
  blurb: string | null
  week_of: string | null
  feedback_1: 'up' | 'down' | null
  feedback_1_reason: string | null
  feedback_2: 'up' | 'down' | null
  feedback_2_reason: string | null
  created_at: string
  matched_name: string | null
  matched_avatar: string | null
  matched_bio: string | null
}

function getWeekOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day // shift back to Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function formatWeekOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_INDUSTRIES = [
  'Advertising',
  'AI',
  'Apparel',
  'B2B',
  'Biotech',
  'Climate',
  'CPG',
  'Education',
  'Energy',
  'Financial Services',
  'Fintech',
  'Fitness & Wellness',
  'Food & Beverage',
  'Gaming',
  'Healthcare',
  'Hospitality',
  'Leisure/Travel & Tourism',
  'Logistics & Supply Chain',
  'Manufacturing',
  'Media',
  'Medical Devices',
  'Pharma',
  'Real Estate',
  'Social Impact',
  'Sports',
  'Sustainability',
  'Tech',
  'Transportation',
]

const ALL_STAGES = ['Ideation', 'MVP', 'Beta Client/Pilot', 'Revenue-generating']

const INDUSTRY_COLORS: Record<string, string> = {
  Advertising: 'bg-orange-100 text-orange-700',
  AI: 'bg-indigo-100 text-indigo-700',
  Apparel: 'bg-pink-100 text-pink-700',
  B2B: 'bg-amber-100 text-amber-700',
  Biotech: 'bg-lime-100 text-lime-700',
  Climate: 'bg-teal-100 text-teal-700',
  CPG: 'bg-orange-100 text-orange-700',
  Education: 'bg-brand-light text-brand',
  Energy: 'bg-yellow-100 text-yellow-700',
  'Financial Services': 'bg-emerald-100 text-emerald-700',
  Fintech: 'bg-cyan-100 text-cyan-700',
  'Fitness & Wellness': 'bg-lime-100 text-lime-700',
  'Food & Beverage': 'bg-red-100 text-red-700',
  Gaming: 'bg-violet-100 text-violet-700',
  Healthcare: 'bg-green-100 text-green-700',
  Hospitality: 'bg-amber-100 text-amber-700',
  'Leisure/Travel & Tourism': 'bg-gray-100 text-gray-700',
  'Logistics & Supply Chain': 'bg-stone-100 text-stone-700',
  Manufacturing: 'bg-zinc-100 text-zinc-700',
  Media: 'bg-rose-100 text-rose-700',
  'Medical Devices': 'bg-sky-100 text-sky-700',
  Pharma: 'bg-purple-100 text-purple-700',
  'Real Estate': 'bg-fuchsia-100 text-fuchsia-700',
  'Social Impact': 'bg-blue-100 text-blue-700',
  Sports: 'bg-green-100 text-green-700',
  Sustainability: 'bg-teal-100 text-teal-700',
  Tech: 'bg-slate-100 text-slate-700',
  Transportation: 'bg-orange-100 text-orange-700',
}

const STAGE_COLORS: Record<string, string> = {
  Ideation: 'bg-slate-100 text-slate-600',
  MVP: 'bg-blue-100 text-blue-700',
  'Beta Client/Pilot': 'bg-amber-100 text-amber-700',
  'Revenue-generating': 'bg-green-100 text-green-700',
}

function industryColor(industry: string) {
  return INDUSTRY_COLORS[industry] ?? 'bg-gray-100 text-gray-600'
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  const [authChecked, setAuthChecked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasStartup, setHasStartup] = useState(false)
  const [myFullName, setMyFullName] = useState<string | null>(null)
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'matches' | 'startups' | 'people'>('matches')

  const [matches, setMatches] = useState<MatchWithProfile[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [showPastMatches, setShowPastMatches] = useState(false)

  const [startups, setStartups] = useState<Startup[]>([])
  const [people, setPeople] = useState<Profile[]>([])
  const [loadingStartups, setLoadingStartups] = useState(true)
  const [loadingPeople, setLoadingPeople] = useState(true)

  // Startup filters
  const [startupIndustries, setStartupIndustries] = useState<string[]>([])
  const [startupStages, setStartupStages] = useState<string[]>([])
  // People filter
  const [peopleIndustries, setPeopleIndustries] = useState<string[]>([])

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
      } else {
        setUserId(data.user.id)
        setUserEmail(data.user.email ?? null)
        const [{ data: profile }, { data: membership }] = await Promise.all([
          supabase.from('profiles').select('is_admin, full_name, avatar_url').eq('user_id', data.user.id).single(),
          supabase.from('startup_members').select('startup_id').eq('user_id', data.user.id).eq('role', 'primary'),
        ])
        setIsAdmin(profile?.is_admin ?? false)
        setMyFullName(profile?.full_name ?? null)
        setMyAvatarUrl(profile?.avatar_url ?? null)
        setHasStartup((membership ?? []).length > 0)
        setAuthChecked(true)
      }
    })
  }, [router])

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Fetch startups
  useEffect(() => {
    if (!authChecked) return
    supabase
      .from('startups')
      .select('*, profiles(email), startup_members(user_id, profiles(full_name))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setStartups(
          (data ?? []).map(({ profiles, startup_members, ...s }) => {
            const members = (startup_members as Array<{ user_id: string; profiles: unknown }>) ?? []
            const member_names = members
              .map((m) => {
                const p = m.profiles
                // profiles may be a single object or an array depending on Supabase join type
                const name = Array.isArray(p)
                  ? (p as Array<{ full_name: string | null }>)[0]?.full_name
                  : (p as { full_name: string | null } | null)?.full_name
                return name ?? null
              })
              .filter((n): n is string => typeof n === 'string' && n.length > 0)
            return {
              ...s,
              founder_email: (profiles as { email: string } | null)?.email ?? null,
              member_names,
            }
          })
        )
        setLoadingStartups(false)
      })
  }, [authChecked])

  // Fetch people
  useEffect(() => {
    if (!authChecked) return
    supabase
      .from('profiles')
      .select('*, startup_members(id, startups(startup_name))')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        setPeople(
          (data ?? []).map(({ startup_members, ...p }) => {
            const members = (startup_members as Array<{ id: string; startups: unknown }>) ?? []
            const firstStartup = members[0]?.startups
            const startup_name = firstStartup
              ? Array.isArray(firstStartup)
                ? (firstStartup as Array<{ startup_name: string | null }>)[0]?.startup_name ?? null
                : (firstStartup as { startup_name: string | null }).startup_name ?? null
              : null
            return {
              ...p,
              is_founder: members.length > 0,
              startup_name,
            }
          })
        )
        setLoadingPeople(false)
      })
  }, [authChecked])

  // Fetch matches
  useEffect(() => {
    if (!authChecked || !userId) return
    ;(async () => {
      const { data: matchRows } = await supabase
        .from('matches')
        .select('*')
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (!matchRows || matchRows.length === 0) {
        setMatches([])
        setLoadingMatches(false)
        return
      }

      const otherIds = [...new Set(
        matchRows.map((m) => m.user_id_1 === userId ? m.user_id_2 : m.user_id_1)
      )]

      const { data: profileRows } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, bio')
        .in('user_id', otherIds)

      const profileMap = Object.fromEntries(
        (profileRows ?? []).map((p) => [p.user_id, p])
      )

      setMatches(matchRows.map((m) => {
        const otherId = m.user_id_1 === userId ? m.user_id_2 : m.user_id_1
        const prof = profileMap[otherId] ?? null
        return {
          ...m,
          matched_name: prof?.full_name ?? null,
          matched_avatar: prof?.avatar_url ?? null,
          matched_bio: prof?.bio ?? null,
        }
      }))
      setLoadingMatches(false)
    })()
  }, [authChecked, userId])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Filtered data
  const filteredStartups = startups.filter((s) => {
    if (startupIndustries.length > 0 && !startupIndustries.some((ind) => s.industry?.includes(ind))) return false
    if (startupStages.length > 0 && !startupStages.includes(s.stage ?? '')) return false
    return true
  })

  const filteredPeople = people.filter((p) => {
    if (peopleIndustries.length > 0 && !peopleIndustries.some((ind) => p.industries?.includes(ind))) return false
    return true
  })

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900 tracking-tight">
            Venn
          </span>
          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full overflow-hidden bg-brand-light flex items-center justify-center flex-shrink-0">
                {myAvatarUrl ? (
                  <img src={myAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-brand">
                    {(myFullName ?? userEmail ?? '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[160px] truncate">
                {myFullName ?? userEmail ?? ''}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                <button
                  onClick={() => { setMenuOpen(false); router.push('/profile/edit') }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Edit Profile
                </button>
                {hasStartup && userId && (
                  <button
                    onClick={() => { setMenuOpen(false); router.push(`/people/${userId}`) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    My Startups
                  </button>
                )}
                <div className="border-t border-gray-100 my-1" />
                {isAdmin && (
                  <>
                    <button
                      onClick={() => { setMenuOpen(false); router.push('/admin') }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      Admin
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                  </>
                )}
                <button
                  onClick={() => { setMenuOpen(false); handleSignOut() }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Body: sidebar + content ──────────────────────────── */}
      <div className="flex">

        {/* Left sidebar — desktop only */}
        <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-white border-r border-gray-200 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="flex flex-col gap-1 p-3 pt-4">
            {([
              { key: 'matches',  label: 'Your Matches', Icon: Sparkles },
              { key: 'startups', label: 'Startups',     Icon: Rocket   },
              { key: 'people',   label: 'People',       Icon: Users    },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left w-full ${
                  tab === key
                    ? 'bg-brand-light text-brand'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab === key && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-brand" />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">

          {/* ── Your Matches Tab ────────────────────────────────── */}
          {tab === 'matches' && (
            <div>
              {loadingMatches ? (
                <LoadingSpinner />
              ) : matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                  <Sparkles className="w-10 h-10 text-brand/30" />
                  <p className="text-sm text-gray-400 max-w-sm">
                    No matches yet — your first matches will appear once the digest runs. Make sure your profile is complete to enter the match pool.
                  </p>
                  <button
                    onClick={() => router.push('/profile/edit')}
                    className="rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium px-4 py-2 transition"
                  >
                    Complete Your Profile
                  </button>
                </div>
              ) : (() => {
                const currentWeekOf = getWeekOf(new Date())
                const thisWeek = matches.filter((m) => m.week_of === currentWeekOf)
                const past = matches.filter((m) => m.week_of !== currentWeekOf)
                return (
                  <div className="flex flex-col gap-8">
                    {/* This Week */}
                    <div>
                      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        This Week
                      </h2>
                      {thisWeek.length === 0 ? (
                        <p className="text-sm text-gray-400">No new matches this week yet.</p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {thisWeek.map((m) => (
                            <MatchCard key={m.id} match={m} currentUserId={userId!} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Past Matches */}
                    {past.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowPastMatches((v) => !v)}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition mb-4"
                        >
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPastMatches ? 'rotate-90' : ''}`} />
                          Past Matches ({past.length})
                        </button>
                        {showPastMatches && (
                          <div className="flex flex-col gap-4">
                            {past.map((m) => (
                              <MatchCard key={m.id} match={m} currentUserId={userId!} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── Startups Tab ────────────────────────────────────── */}
          {tab === 'startups' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <FilterDropdown
                  label="Filter by Industry"
                  options={ALL_INDUSTRIES}
                  selected={startupIndustries}
                  onChange={setStartupIndustries}
                />
                <FilterDropdown
                  label="Filter by Stage"
                  options={ALL_STAGES}
                  selected={startupStages}
                  onChange={setStartupStages}
                />
                <div className="flex-1" />
                <button
                  onClick={() => router.push('/startup/new')}
                  className="flex-shrink-0 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium px-4 py-2 transition"
                >
                  + Add Your Startup
                </button>
              </div>

              {loadingStartups ? (
                <LoadingSpinner />
              ) : filteredStartups.length === 0 ? (
                <EmptyState message="No startups match the selected filters." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredStartups.map((s) => (
                    <StartupCard key={s.id} startup={s} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── People Tab ──────────────────────────────────────── */}
          {tab === 'people' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <FilterDropdown
                  label="Filter by Industry"
                  options={ALL_INDUSTRIES}
                  selected={peopleIndustries}
                  onChange={setPeopleIndustries}
                />
              </div>

              {loadingPeople ? (
                <LoadingSpinner />
              ) : filteredPeople.length === 0 ? (
                <EmptyState message="No people match the selected filters." />
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredPeople.map((p) => (
                    <PersonCard key={p.user_id} person={p} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10 flex">
        {([
          { key: 'matches',  label: 'Your Matches', Icon: Sparkles },
          { key: 'startups', label: 'Startups',     Icon: Rocket   },
          { key: 'people',   label: 'People',       Icon: Users    },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition ${
              tab === key ? 'text-brand' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MatchCard({
  match: m,
  currentUserId,
}: {
  match: MatchWithProfile
  currentUserId: string
}) {
  const isUser1 = m.user_id_1 === currentUserId
  const [thumb, setThumb] = useState<'up' | 'down' | null>(
    (isUser1 ? m.feedback_1 : m.feedback_2) ?? null
  )
  const [reason, setReason] = useState(
    (isUser1 ? m.feedback_1_reason : m.feedback_2_reason) ?? ''
  )
  const [saving, setSaving] = useState(false)

  async function handleThumb(value: 'up' | 'down') {
    const next = thumb === value ? null : value
    setThumb(next)
    setSaving(true)
    const col = isUser1 ? 'feedback_1' : 'feedback_2'
    await supabase.from('matches').update({ [col]: next }).eq('id', m.id)
    setSaving(false)
  }

  async function handleReasonBlur() {
    const col = isUser1 ? 'feedback_1_reason' : 'feedback_2_reason'
    await supabase.from('matches').update({ [col]: reason || null }).eq('id', m.id)
  }

  const label = m.match_score != null ? getMatchLabel(m.match_score) : null
  const labelColor = label ? getMatchLabelColor(label) : '#757575'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4 max-w-2xl">
      {/* Header: avatar + name + bio snippet + label */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-light flex items-center justify-center flex-shrink-0">
          {m.matched_avatar ? (
            <img src={m.matched_avatar} alt={m.matched_name ?? ''} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-brand/50">
              {(m.matched_name ?? '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm">{m.matched_name ?? 'Unknown'}</h3>
            {label && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: labelColor + '20', color: labelColor }}
              >
                {label}
              </span>
            )}
          </div>
          {m.matched_bio && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {m.matched_bio.length > 100 ? m.matched_bio.slice(0, 100) + '…' : m.matched_bio}
            </p>
          )}
        </div>
      </div>

      {/* Blurb */}
      {m.blurb && (
        <p className="text-sm text-gray-700 leading-relaxed">{m.blurb}</p>
      )}

      {/* Footer: date + thumbs */}
      <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
        {m.week_of && (
          <span className="text-xs text-gray-400">{formatWeekOf(m.week_of)}</span>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => handleThumb('up')}
            disabled={saving}
            className={`p-1.5 rounded-lg transition ${
              thumb === 'up'
                ? 'bg-green-100 text-green-600'
                : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleThumb('down')}
            disabled={saving}
            className={`p-1.5 rounded-lg transition ${
              thumb === 'down'
                ? 'bg-red-100 text-red-600'
                : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reason input — visible after thumbing */}
      {thumb !== null && (
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={handleReasonBlur}
          placeholder={
            thumb === 'up'
              ? 'What made this a good match? (optional)'
              : 'What missed the mark? (optional)'
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
        />
      )}
    </div>
  )
}

function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (val: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function toggle(option: string) {
    onChange(
      selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]
    )
  }

  const isActive = selected.length > 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition ${
          isActive
            ? 'border-brand bg-brand-light text-brand'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        }`}
      >
        <span>{label}</span>
        {isActive && (
          <span className="bg-brand text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center leading-none">
            {selected.length}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function StartupCard({
  startup: s,
}: {
  startup: Startup
}) {
  const router = useRouter()

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col cursor-pointer hover:border-brand-light hover:shadow-md transition overflow-hidden"
      onClick={() => router.push(`/startup/${s.id}`)}
    >
      {/* Logo banner */}
      <div className="px-4 pt-4">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-brand-light flex items-center justify-center">
          {s.logo_url ? (
            <img
              src={s.logo_url}
              alt={`${s.startup_name} logo`}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-5xl font-bold text-brand/30">
              {s.startup_name.charAt(0).toUpperCase()}
            </span>
          )}
          {/* Stage badge overlay */}
          {s.stage && (
            <span
              className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                STAGE_COLORS[s.stage] ?? 'bg-gray-100/80 text-gray-600'
              }`}
            >
              {s.stage}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Name + website button */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
              {s.startup_name}
            </h3>
            {s.member_names.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{s.member_names.join(', ')}</p>
            )}
          </div>
          {s.website_url && (
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <a
                href={s.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-light text-brand hover:bg-brand-light text-xs font-medium px-3 py-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                Startup Website
              </a>
            </div>
          )}
        </div>

        {/* Industry tags */}
        {s.industry && s.industry.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {s.industry.map((ind) => (
              <span
                key={ind}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${industryColor(ind)}`}
              >
                {ind}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {s.description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{s.description}</p>
        )}

        {/* Current Ask — hidden from UI (field preserved in DB/types) */}
        {/* {s.current_ask && (
          <div className="text-xs text-gray-500">
            <p className="font-semibold text-gray-700">
              Current Ask{s.current_ask_updated_at ? ` (last updated ${formatDate(s.current_ask_updated_at)})` : ''}:
            </p>
            <p>{s.current_ask}</p>
          </div>
        )} */}

        {/* Actions */}
        <div className="mt-auto pt-1" onClick={(e) => e.stopPropagation()}>
          <a
            href={`mailto:${s.founder_email ?? ''}?subject=Re: ${encodeURIComponent(s.startup_name)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-medium px-3 py-1.5 transition"
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </a>
        </div>
      </div>

      {/* View Startup button */}
      <div className="w-full border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => router.push(`/startup/${s.id}`)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-brand bg-brand-light hover:bg-brand-light/70 transition"
        >
          View Startup
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function PersonCard({ person: p }: { person: Profile }) {
  const router = useRouter()

  const badge = p.is_founder
    ? { label: 'Founder', className: 'bg-indigo-500/80 text-white' }
    : p.is_looking_for_startup
    ? { label: 'Open to joining', className: 'bg-emerald-500/80 text-white' }
    : null

  return (
    <div
      className="bg-white rounded-[5rem] border border-gray-200 shadow-sm flex flex-col items-center overflow-hidden cursor-pointer hover:border-brand-light hover:shadow-md hover:-translate-y-0.5 transition-all"
      onClick={() => router.push(`/people/${p.user_id}`)}
    >
      {/* Photo / placeholder — full-width, bleeds to edges */}
      <div className="relative w-full aspect-square rounded-t-[5rem] overflow-hidden bg-brand-light flex-shrink-0">
        {p.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={p.full_name ?? 'Avatar'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-bold text-brand/50">
              {(p.full_name ?? '?').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {/* Status badge overlay */}
        {badge && (
          <span className={`absolute top-6 left-6 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="w-full flex flex-col items-center gap-2.5 px-4 pt-4 pb-0">
        {/* Name */}
        <h3 className="text-base font-semibold text-gray-900 text-center leading-tight">
          {p.full_name ?? '—'}
        </h3>

        {/* Startup name */}
        {p.startup_name && (
          <p className="text-sm text-gray-500 text-center leading-tight -mt-1">{p.startup_name}</p>
        )}

        {/* Email / Slack buttons */}
        {(p.email || p.slack_handle) && (
          <div className="flex justify-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            {p.email && (
              <a
                href={`mailto:${p.email}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-medium px-3 py-1.5 transition"
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </a>
            )}
            {p.slack_handle && (
              <a
                href={`slack://user?team=T0AUF6SQ7&id=${p.slack_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-xs font-medium px-3 py-1.5 transition"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
                Slack
              </a>
            )}
          </div>
        )}
      </div>

      {/* View Profile button */}
      <div className="w-full mt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => router.push(`/people/${p.user_id}`)}
          className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-brand bg-brand-light hover:bg-brand-light transition"
        >
          View Profile
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-sm text-gray-400">{message}</div>
  )
}
