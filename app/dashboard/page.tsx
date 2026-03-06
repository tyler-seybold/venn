'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  skills: string[] | null
  industries_of_interest: string[] | null
  is_looking_for_startup: boolean
  graduation_year: number | null
  degree_program: string | null
  avatar_url: string | null
  is_founder: boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_INDUSTRIES = [
  'Apparel',
  'Business Services',
  'Climate',
  'Consumer Products',
  'Consumer Services',
  'Education',
  'Energy',
  'Financial Services',
  'Fintech',
  'Food & Beverage',
  'Gaming',
  'Health & Wellness',
  'Healthcare',
  'Logistics',
  'Media',
  'Medical Devices',
  'Real Estate / PropTech',
  'Social Impact',
  'Technology',
  'Travel & Hospitality',
]

const ALL_STAGES = ['Ideation', 'MVP', 'Beta Client/Pilot', 'Revenue-generating']

const INDUSTRY_COLORS: Record<string, string> = {
  Apparel: 'bg-pink-100 text-pink-700',
  'Business Services': 'bg-indigo-100 text-indigo-700',
  Climate: 'bg-teal-100 text-teal-700',
  'Consumer Products': 'bg-orange-100 text-orange-700',
  'Consumer Services': 'bg-amber-100 text-amber-700',
  Education: 'bg-purple-100 text-purple-700',
  Energy: 'bg-yellow-100 text-yellow-700',
  'Financial Services': 'bg-emerald-100 text-emerald-700',
  Fintech: 'bg-cyan-100 text-cyan-700',
  'Food & Beverage': 'bg-red-100 text-red-700',
  Gaming: 'bg-violet-100 text-violet-700',
  'Health & Wellness': 'bg-lime-100 text-lime-700',
  Healthcare: 'bg-green-100 text-green-700',
  Logistics: 'bg-stone-100 text-stone-700',
  Media: 'bg-rose-100 text-rose-700',
  'Medical Devices': 'bg-sky-100 text-sky-700',
  'Real Estate / PropTech': 'bg-fuchsia-100 text-fuchsia-700',
  'Social Impact': 'bg-blue-100 text-blue-700',
  Technology: 'bg-slate-100 text-slate-700',
  'Travel & Hospitality': 'bg-gray-100 text-gray-700',
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
  const [tab, setTab] = useState<'startups' | 'people'>('startups')

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
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', data.user.id)
          .single()
        setIsAdmin(profile?.is_admin ?? false)
        setAuthChecked(true)
      }
    })
  }, [router])

  // Fetch startups
  useEffect(() => {
    if (!authChecked) return
    supabase
      .from('startups')
      .select('*, profiles(email), startup_members(user_id, profiles(full_name))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data?.[0]) {
          console.log('[dashboard] sample startup_members:', JSON.stringify(data[0].startup_members, null, 2))
        }
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
      .select('*, startup_members(id)')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        setPeople(
          (data ?? []).map(({ startup_members, ...p }) => ({
            ...p,
            is_founder: Array.isArray(startup_members) && startup_members.length > 0,
          }))
        )
        setLoadingPeople(false)
      })
  }, [authChecked])

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
    if (peopleIndustries.length > 0 && !peopleIndustries.some((ind) => p.industries_of_interest?.includes(ind))) return false
    return true
  })

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900 tracking-tight">
            Kellogg Student Ventures
          </span>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden sm:block text-sm text-gray-500">{userEmail}</span>
            )}
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="text-sm font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => router.push('/profile/edit')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
            >
              Edit Profile
            </button>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {(['startups', 'people'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'startups' ? 'Startups' : 'People'}
            </button>
          ))}
        </div>

        {/* ── Startups Tab ──────────────────────────────────────── */}
        {tab === 'startups' && (
          <div>
            {/* Filter row */}
            <div className="flex items-center gap-2 mb-6">
              <FilterDropdown
                label="Industry"
                options={ALL_INDUSTRIES}
                selected={startupIndustries}
                onChange={setStartupIndustries}
              />
              <FilterDropdown
                label="Stage"
                options={ALL_STAGES}
                selected={startupStages}
                onChange={setStartupStages}
              />
              <div className="flex-1" />
              <button
                onClick={() => router.push('/startup/new')}
                className="flex-shrink-0 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium px-4 py-2 transition"
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
                  <StartupCard key={s.id} startup={s} currentUserId={userId} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── People Tab ────────────────────────────────────────── */}
        {tab === 'people' && (
          <div>
            {/* Industry filter */}
            <div className="flex items-center gap-2 mb-6">
              <FilterDropdown
                label="Industry"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPeople.map((p) => (
                  <PersonCard key={p.user_id} person={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

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
            ? 'border-purple-500 bg-purple-50 text-purple-700'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        }`}
      >
        <span>{label}</span>
        {isActive && (
          <span className="bg-purple-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center leading-none">
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
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
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
  currentUserId,
}: {
  startup: Startup
  currentUserId: string | null
}) {
  const router = useRouter()
  const isOwner = currentUserId !== null && s.founder_id === currentUserId

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 cursor-pointer hover:border-purple-200 hover:shadow-md transition"
      onClick={() => router.push(`/startup/${s.id}`)}
    >
      {/* Header: logo + name + stage */}
      <div className="flex items-start gap-3">
        {s.logo_url ? (
          <img
            src={s.logo_url}
            alt={`${s.startup_name} logo`}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-purple-600">
              {s.startup_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
            {s.startup_name}
          </h3>
          {s.member_names.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{s.member_names.join(', ')}</p>
          )}
        </div>
        {s.stage && (
          <span
            className={`flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
              STAGE_COLORS[s.stage] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {s.stage}
          </span>
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

      {/* Website + Ask */}
      <div className="flex flex-col gap-1 text-xs text-gray-500">
        {s.website_url && (
          <a
            href={s.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-purple-600 hover:text-purple-800 hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="truncate">{s.website_url.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        {s.current_ask && (
          <p>
            <span className="font-medium text-gray-700">
              Current Ask{s.current_ask_updated_at ? ` (last updated ${formatDate(s.current_ask_updated_at)})` : ''}:
            </span>{' '}
            {s.current_ask}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto pt-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <a
          href={`mailto:${s.founder_email ?? ''}?subject=Re: ${encodeURIComponent(s.startup_name)}`}
          className="flex-1 text-center rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 text-sm font-medium py-2 transition"
        >
          Send Email
        </a>
        {isOwner && (
          <button
            onClick={() => router.push(`/startup/${s.id}/edit`)}
            className="px-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2 transition"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

function PersonCard({ person: p }: { person: Profile }) {
  const router = useRouter()

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 cursor-pointer hover:border-purple-200 hover:shadow-md transition"
      onClick={() => router.push(`/people/${p.user_id}`)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {p.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={p.full_name ?? 'Avatar'}
            className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-purple-600">
              {(p.full_name ?? '?').charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-base leading-tight truncate">
              {p.full_name ?? '—'}
            </h3>
            <div className="flex flex-shrink-0 gap-1">
              {p.is_founder && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  Founder
                </span>
              )}
              {!p.is_founder && p.is_looking_for_startup && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  Open to joining
                </span>
              )}
            </div>
          </div>
          {p.degree_program && (
            <p className="text-xs text-gray-500 mt-0.5">{p.degree_program}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {p.bio && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{p.bio}</p>
      )}

      {/* Skills */}
      {p.skills && p.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.skills.map((skill) => (
            <span
              key={skill}
              className="text-xs font-medium bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Industries of interest */}
      {p.industries_of_interest && p.industries_of_interest.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.industries_of_interest.map((ind) => (
            <span
              key={ind}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${industryColor(ind)}`}
            >
              {ind}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-sm text-gray-400">{message}</div>
  )
}
