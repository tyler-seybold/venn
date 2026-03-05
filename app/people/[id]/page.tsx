'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

type Profile = {
  user_id: string
  full_name: string | null
  email: string | null
  bio: string | null
  skills: string[] | null
  industries_of_interest: string[] | null
  is_looking_for_startup: boolean
}

type Startup = {
  id: string
  startup_name: string
  logo_url: string | null
  founders_display: string | null
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

      const [{ data: profileData, error }, { data: startupData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', id).single(),
        supabase
          .from('startups')
          .select('id, startup_name, logo_url, founders_display, industry, stage, description')
          .eq('founder_id', id)
          .order('created_at', { ascending: false }),
      ])

      if (error || !profileData) {
        router.replace('/dashboard')
        return
      }

      setProfile(profileData)
      setStartups(startupData ?? [])
      setLoading(false)
    })
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
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
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-tight">
              {profile.full_name ?? '—'}
            </h1>
            {profile.is_looking_for_startup && (
              <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                Open to joining
              </span>
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
                    className="text-xs font-medium bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md"
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
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4 cursor-pointer hover:border-purple-200 hover:shadow-md transition"
                >
                  {/* Logo */}
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={`${s.startup_name} logo`}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-purple-600">
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

                    {s.founders_display && (
                      <p className="text-xs text-gray-500 mb-2">{s.founders_display}</p>
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
