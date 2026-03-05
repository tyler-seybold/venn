'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

type Startup = {
  id: string
  founder_id: string
  startup_name: string
  logo_url: string | null
  founders_display: string | null
  industry: string[] | null
  stage: string | null
  description: string | null
  website_url: string | null
  current_ask: string | null
  founder_email: string | null
}

type Profile = {
  user_id: string
  full_name: string | null
  email: string | null
  bio: string | null
  skills: string[] | null
  industries_of_interest: string[] | null
  is_looking_for_startup: boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Consumer Products',
  'Education Services',
  'Business Services',
  'Food & Beverage',
  'Other',
]

const ALL_STAGES = ['Ideation', 'MVP', 'Beta Client/Pilot', 'Revenue-generating']

const INDUSTRY_COLORS: Record<string, string> = {
  Technology: 'bg-blue-100 text-blue-700',
  Healthcare: 'bg-green-100 text-green-700',
  Finance: 'bg-yellow-100 text-yellow-700',
  'Consumer Products': 'bg-orange-100 text-orange-700',
  'Education Services': 'bg-purple-100 text-purple-700',
  'Business Services': 'bg-indigo-100 text-indigo-700',
  'Food & Beverage': 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-600',
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
  const [tab, setTab] = useState<'startups' | 'people'>('startups')

  const [startups, setStartups] = useState<Startup[]>([])
  const [people, setPeople] = useState<Profile[]>([])
  const [loadingStartups, setLoadingStartups] = useState(true)
  const [loadingPeople, setLoadingPeople] = useState(true)

  // Startup filters
  const [startupIndustry, setStartupIndustry] = useState<string | null>(null)
  const [startupStage, setStartupStage] = useState<string | null>(null)
  // People filter
  const [peopleIndustry, setPeopleIndustry] = useState<string | null>(null)

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login')
      } else {
        setUserId(data.user.id)
        setUserEmail(data.user.email ?? null)
        setAuthChecked(true)
      }
    })
  }, [router])

  // Fetch startups
  useEffect(() => {
    if (!authChecked) return
    supabase
      .from('startups')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setStartups(
          (data ?? []).map(({ profiles, ...s }) => ({
            ...s,
            founder_email: (profiles as { email: string } | null)?.email ?? null,
          }))
        )
        setLoadingStartups(false)
      })
  }, [authChecked])

  // Fetch people
  useEffect(() => {
    if (!authChecked) return
    supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        setPeople(data ?? [])
        setLoadingPeople(false)
      })
  }, [authChecked])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Filtered data
  const filteredStartups = startups.filter((s) => {
    if (startupIndustry && !s.industry?.includes(startupIndustry)) return false
    if (startupStage && s.stage !== startupStage) return false
    return true
  })

  const filteredPeople = people.filter((p) => {
    if (peopleIndustry && !p.industries_of_interest?.includes(peopleIndustry)) return false
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
            {/* Top action row: industry filter + Add Your Startup */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex flex-wrap gap-2">
                <FilterPill
                  label="All Industries"
                  active={startupIndustry === null}
                  onClick={() => setStartupIndustry(null)}
                />
                {ALL_INDUSTRIES.map((ind) => (
                  <FilterPill
                    key={ind}
                    label={ind}
                    active={startupIndustry === ind}
                    onClick={() =>
                      setStartupIndustry(startupIndustry === ind ? null : ind)
                    }
                  />
                ))}
              </div>
              <button
                onClick={() => router.push('/startup/new')}
                className="flex-shrink-0 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium px-4 py-2 transition"
              >
                + Add Your Startup
              </button>
            </div>

            {/* Stage filter row */}
            <div className="flex flex-wrap gap-2 mb-6">
              <FilterPill
                label="All Stages"
                active={startupStage === null}
                onClick={() => setStartupStage(null)}
              />
              {ALL_STAGES.map((stage) => (
                <FilterPill
                  key={stage}
                  label={stage}
                  active={startupStage === stage}
                  onClick={() =>
                    setStartupStage(startupStage === stage ? null : stage)
                  }
                />
              ))}
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
            <div className="flex flex-wrap gap-2 mb-6">
              <FilterPill
                label="All Industries"
                active={peopleIndustry === null}
                onClick={() => setPeopleIndustry(null)}
              />
              {ALL_INDUSTRIES.map((ind) => (
                <FilterPill
                  key={ind}
                  label={ind}
                  active={peopleIndustry === ind}
                  onClick={() =>
                    setPeopleIndustry(peopleIndustry === ind ? null : ind)
                  }
                />
              ))}
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

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
        active
          ? 'bg-purple-700 border-purple-700 text-white'
          : 'bg-white border-gray-300 text-gray-600 hover:border-purple-400 hover:text-purple-700'
      }`}
    >
      {label}
    </button>
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
          {s.founders_display && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{s.founders_display}</p>
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
            className="text-purple-600 hover:text-purple-800 hover:underline truncate"
          >
            {s.website_url.replace(/^https?:\/\//, '')}
          </a>
        )}
        {s.current_ask && (
          <p>
            <span className="font-medium text-gray-700">Ask:</span> {s.current_ask}
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
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-base leading-tight">
          {p.full_name ?? '—'}
        </h3>
        {p.is_looking_for_startup && (
          <span className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
            Open to joining
          </span>
        )}
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
