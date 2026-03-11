'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const INDUSTRY_COLORS: Record<string, string> = {
  Apparel: 'bg-pink-100 text-pink-700',
  'Business Services': 'bg-indigo-100 text-indigo-700',
  Climate: 'bg-teal-100 text-teal-700',
  'Consumer Products': 'bg-orange-100 text-orange-700',
  'Consumer Services': 'bg-amber-100 text-amber-700',
  Education: 'bg-brand-light text-brand',
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

type Profile = {
  user_id: string
  full_name: string | null
  email: string | null
  bio: string | null
  slack_handle: string | null
  skills: string[] | null
  industries_of_interest: string[] | null
  is_looking_for_startup: boolean
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }

      const [{ data: profileData, error }, { data: memberData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', id).single(),
        supabase
          .from('startup_members')
          .select('startup_id, role, startups(id, startup_name, logo_url, industry, stage, description, startup_members(user_id, profiles(full_name)))')
          .eq('user_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (error || !profileData) {
        router.replace('/dashboard')
        return
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

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6">
          {/* Header — centered with large avatar */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? 'Avatar'}
                className="w-40 h-40 rounded-full object-cover border border-gray-200 mb-4"
              />
            ) : (
              <div className="w-40 h-40 rounded-full bg-brand-light flex items-center justify-center mb-4">
                <span className="text-6xl font-bold text-brand">
                  {(profile.full_name ?? '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Name */}
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-tight mb-2">
              {profile.full_name ?? '—'}
            </h1>

            {/* Status badges */}
            <div className="flex gap-1.5 mb-2">
              {startups.length > 0 && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  Founder
                </span>
              )}
              {startups.length === 0 && profile.is_looking_for_startup && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  Open to joining
                </span>
              )}
            </div>

            {/* Degree + year */}
            {(profile.degree_program || profile.graduation_year) && (
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5">
                {profile.degree_program && (
                  <span className="text-sm text-gray-500">{profile.degree_program}</span>
                )}
                {profile.graduation_year && (
                  <span className="text-sm text-gray-500">{profile.graduation_year}</span>
                )}
              </div>
            )}

            {/* Contact buttons */}
            {(profile.email || profile.slack_handle) && (
              <div className="flex gap-2 mt-4">
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-light text-brand hover:bg-brand-light text-xs font-medium px-3 py-1.5 transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email
                  </a>
                )}
                {profile.slack_handle && (
                  <a
                    href={`slack://user?team=T0AUF6SQ7&id=${profile.slack_handle}`}
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

          <hr className="border-gray-100 mb-6" />

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Bio
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Skills
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs font-medium bg-brand-light text-brand px-2.5 py-1 rounded-md"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Industries of interest */}
          {profile.industries_of_interest && profile.industries_of_interest.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Industries of Interest
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.industries_of_interest.map((ind) => (
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
                    <div className="flex items-center gap-2 flex-wrap mb-1">
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
