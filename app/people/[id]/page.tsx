'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Mail, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 270 270" className={className} aria-hidden="true">
      <path d="M99.4 151.2c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9h12.9v12.9z" fill="#E01E5A"/>
      <path d="M105.9 151.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9v-32.3z" fill="#E01E5A"/>
      <path d="M118.8 99.4c-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9v12.9h-12.9z" fill="#36C5F0"/>
      <path d="M118.8 105.9c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H86.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0"/>
      <path d="M170.6 118.8c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9h-12.9v-12.9z" fill="#2EB67D"/>
      <path d="M164.1 118.8c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9V86.5c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9v32.3z" fill="#2EB67D"/>
      <path d="M151.2 170.6c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9v-12.9h12.9z" fill="#ECB22E"/>
      <path d="M151.2 164.1c-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9h-32.3z" fill="#ECB22E"/>
    </svg>
  )
}

const INDUSTRY_COLORS: Record<string, string> = {
  Advertising: 'bg-orange-100 text-orange-700',
  AI: 'bg-slate-100 text-slate-600',
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
  Gaming: 'bg-slate-100 text-slate-600',
  Healthcare: 'bg-green-100 text-green-700',
  Hospitality: 'bg-amber-100 text-amber-700',
  'Leisure/Travel & Tourism': 'bg-gray-100 text-gray-700',
  'Logistics & Supply Chain': 'bg-stone-100 text-stone-700',
  Manufacturing: 'bg-zinc-100 text-zinc-700',
  Media: 'bg-rose-100 text-rose-700',
  'Medical Devices': 'bg-sky-100 text-sky-700',
  Pharma: 'bg-slate-100 text-slate-600',
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

const INDUSTRY_OPENNESS_LABELS: Record<string, string> = {
  strong_preferences: 'Has strong industry preferences',
  some_preferences:   'Has some preferences but is open',
  open_to_anything:   'Open to anything',
}

type Profile = {
  user_id: string
  full_name: string | null
  email: string | null
  slack_handle: string | null
  bio: string | null
  skills: string[] | null
  industries: string[] | null
  industry_openness: string | null
  role_orientation: string[] | null
  looking_for: string | null
  cofounder_interest: boolean | null
  graduation_year: number | null
  degree_program: string | null
  avatar_url: string | null
}

type Startup = {
  id: string
  startup_name: string
  logo_url: string | null
  member_names: string[]
  industry: string[] | null
  stage: string | null
  description: string | null
}

export default function PersonDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [startups, setStartups] = useState<Startup[]>([])
  const [myStartupIds, setMyStartupIds] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [matchedOn, setMatchedOn] = useState<string | null>(null)
  const [matchBlurb, setMatchBlurb] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }

      const currentUserId = data.user.id
      setCurrentUserId(currentUserId)

      const [{ data: profileData, error }, { data: memberData }, { data: myMemberships }, { data: matchRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', id).single(),
        supabase
          .from('startup_members')
          .select('startup_id, role, startups(id, startup_name, logo_url, industry, stage, description, startup_members(user_id, profiles(full_name)))')
          .eq('user_id', id)
          .order('created_at', { ascending: false }),
        supabase.from('startup_members').select('startup_id').eq('user_id', currentUserId),
        supabase
          .from('matches')
          .select('created_at, blurb')
          .neq('match_type', 'startup_startup')
          .or(`and(user_id_1.eq.${currentUserId},user_id_2.eq.${id}),and(user_id_1.eq.${id},user_id_2.eq.${currentUserId})`)
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      if (error || !profileData) {
        router.replace('/dashboard')
        return
      }

      setMyStartupIds(new Set((myMemberships ?? []).map((m) => m.startup_id)))

      if (matchRows && matchRows.length > 0) {
        const d = new Date(matchRows[0].created_at)
        setMatchedOn(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
        setMatchBlurb(matchRows[0].blurb ?? null)
      }

      setProfile(profileData)
      setStartups(
        (memberData ?? [])
          .map((m) => {
            const raw = (Array.isArray(m.startups) ? m.startups[0] : m.startups) as unknown as {
              id: string
              startup_name: string
              logo_url: string | null
              industry: string[] | null
              stage: string | null
              description: string | null
              startup_members: Array<{ user_id: string; profiles: Array<{ full_name: string | null }> | null }>
            } | null
            if (!raw) return null
            const { startup_members, ...rest } = raw
            return {
              ...rest,
              member_names: (startup_members ?? [])
                .map((sm) => (sm.profiles as Array<{ full_name: string | null }>)?.[0]?.full_name ?? null)
                .filter((n): n is string => typeof n === 'string' && n.length > 0),
            } as Startup
          })
          .filter((s): s is Startup => s !== null)
      )
      setLoading(false)
    })
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  const opennessLabel = profile.industry_openness
    ? INDUSTRY_OPENNESS_LABELS[profile.industry_openness] ?? null
    : null

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">

        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6">

          {/* Avatar + name + meta */}
          <div className="flex items-start gap-5 mb-6">
            {/* Circular avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden bg-brand-light flex items-center justify-center flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-brand/50">
                  {(profile.full_name ?? '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-tight">
                  {profile.full_name ?? '—'}
                </h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentUserId === profile.user_id ? (
                    <button
                      onClick={() => router.push('/profile/edit')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium px-3 py-1.5 transition"
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      {profile.email && (
                        <a
                          href={`mailto:${profile.email}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-medium px-3 py-1.5 transition"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </a>
                      )}
                      {profile.slack_handle && (
                        <a
                          href={`https://kellogg-mba.slack.com/team/${profile.slack_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium px-3 py-1.5 transition"
                        >
                          <SlackIcon className="w-3.5 h-3.5" />
                          Message on Slack
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Grad year + degree */}
              {(profile.graduation_year || profile.degree_program) && (
                <p className="mt-1 text-sm text-gray-500">
                  {[profile.degree_program, profile.graduation_year].filter(Boolean).join(' · ')}
                </p>
              )}

              {/* Founder badge + matched badge */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {startups.length > 0 && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    Founder
                  </span>
                )}
                {matchedOn && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#e8edf5] text-[#1E3A5F]">
                    Matched on {matchedOn}
                  </span>
                )}
              </div>

              {/* Venn blurb callout */}
              {matchBlurb && (
                <div className="flex items-start gap-2 mt-3 bg-[#e8edf5] rounded-xl px-4 py-3">
                  <Sparkles className="w-3.5 h-3.5 text-[#1E3A5F] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#1E3A5F] leading-relaxed italic">
                    <span className="font-semibold not-italic">Venn says: </span>{matchBlurb}
                  </p>
                </div>
              )}
            </div>
          </div>

          <hr className="border-gray-100 mb-6" />

          <div className="flex flex-col gap-6">

            {/* Bio */}
            {profile.bio && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bio</h2>
                <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills</h2>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs font-medium bg-brand-light text-brand px-2.5 py-1 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Industry interests */}
            {profile.industries && profile.industries.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Industry Interests</h2>
                <div className="flex flex-wrap gap-1.5">
                  {profile.industries.map((ind) => (
                    <span
                      key={ind}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        INDUSTRY_COLORS[ind] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Industry openness */}
            {opennessLabel && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Industry Openness</h2>
                <p className="text-sm text-gray-700">{opennessLabel}</p>
              </div>
            )}

            {/* Role orientation */}
            {profile.role_orientation && profile.role_orientation.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Role Orientation</h2>
                <div className="flex flex-wrap gap-1.5">
                  {profile.role_orientation.map((role) => (
                    <span
                      key={role}
                      className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Looking for */}
            {profile.looking_for && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Looking For</h2>
                <p className="text-sm text-gray-700 leading-relaxed">{profile.looking_for}</p>
              </div>
            )}

            {/* Co-founder interest */}
            {profile.cofounder_interest != null && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Co-founder Interest</h2>
                <p className="text-sm text-gray-700">
                  {profile.cofounder_interest ? 'Yes, interested in finding a co-founder' : 'Not currently looking for a co-founder'}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Their Startups */}
        {startups.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Their Startups</h2>
            <div className="flex flex-col gap-4">
              {startups.map((s) => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/startup/${s.id}`)}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 cursor-pointer hover:border-brand-light hover:shadow-md transition"
                >
                  {/* Logo */}
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={`${s.startup_name} logo`}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-brand">
                        {s.startup_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-base leading-tight">
                          {s.startup_name}
                        </h3>
                        {s.stage && (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              STAGE_COLORS[s.stage] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {s.stage}
                          </span>
                        )}
                      </div>
                      {myStartupIds.has(s.id) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/startup/${s.id}/edit`) }}
                          className="flex-shrink-0 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {s.member_names.length > 0 && (
                      <p className="text-xs text-gray-500 mb-2">{s.member_names.join(', ')}</p>
                    )}

                    {s.industry && s.industry.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {s.industry.map((ind) => (
                          <span
                            key={ind}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              INDUSTRY_COLORS[ind] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}

                    {s.description && (
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                        {s.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
