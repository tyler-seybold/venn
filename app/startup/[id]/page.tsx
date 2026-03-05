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
}

type FounderProfile = {
  user_id: string
  full_name: string | null
  email: string | null
  bio: string | null
  skills: string[] | null
  industries_of_interest: string[] | null
  is_looking_for_startup: boolean
}

export default function StartupDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [userId, setUserId] = useState<string | null>(null)
  const [startup, setStartup] = useState<Startup | null>(null)
  const [founderProfile, setFounderProfile] = useState<FounderProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }

      setUserId(data.user.id)

      const { data: startupData, error } = await supabase
        .from('startups')
        .select('*, profiles(*)')
        .eq('id', id)
        .single()

      if (error || !startupData) {
        router.replace('/dashboard')
        return
      }

      const { profiles, ...rest } = startupData as Startup & { profiles: FounderProfile | null }
      setStartup(rest)
      setFounderProfile(profiles ?? null)
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

  if (!startup) return null

  const isOwner = userId !== null && startup.founder_id === userId

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

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Header: logo + name + edit */}
          <div className="flex items-start gap-5 mb-6">
            {startup.logo_url ? (
              <img
                src={startup.logo_url}
                alt={`${startup.startup_name} logo`}
                className="w-20 h-20 rounded-2xl object-cover border border-gray-100 flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-purple-600">
                  {startup.startup_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-tight">
                  {startup.startup_name}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => router.push(`/startup/${startup.id}/edit`)}
                    className="flex-shrink-0 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
                )}
              </div>
              {startup.founders_display && (
                <p className="mt-1 text-sm text-gray-500">{startup.founders_display}</p>
              )}
            </div>
          </div>

          {/* Stage + industry tags */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {startup.stage && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  STAGE_COLORS[startup.stage] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {startup.stage}
              </span>
            )}
            {startup.industry?.map((ind) => (
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

          {/* Divider */}
          <hr className="border-gray-100 mb-6" />

          {/* Description */}
          {startup.description && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                About
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">{startup.description}</p>
            </div>
          )}

          {/* Website */}
          {startup.website_url && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Website
              </h2>
              <a
                href={startup.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
              >
                {startup.website_url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {/* Current ask */}
          {startup.current_ask && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Current Ask
              </h2>
              <p className="text-sm text-gray-700">{startup.current_ask}</p>
            </div>
          )}

          {/* Send Email */}
          <div className="mt-8">
            <a
              href={`mailto:${founderProfile?.email ?? ''}?subject=Re: ${encodeURIComponent(startup.startup_name)}`}
              className="inline-block rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-medium px-5 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Send Email
            </a>
          </div>
        </div>

        {/* Meet the Founder */}
        {founderProfile && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Meet the Founder</h2>
            <div
              onClick={() => router.push(`/people/${founderProfile.user_id}`)}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 cursor-pointer hover:border-purple-200 hover:shadow-md transition"
            >
              {/* Name + badge */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 text-base leading-tight">
                  {founderProfile.full_name ?? '—'}
                </h3>
                {founderProfile.is_looking_for_startup && (
                  <span className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    Open to joining
                  </span>
                )}
              </div>

              {/* Bio */}
              {founderProfile.bio && (
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                  {founderProfile.bio}
                </p>
              )}

              {/* Skills */}
              {founderProfile.skills && founderProfile.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {founderProfile.skills.map((skill) => (
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
              {founderProfile.industries_of_interest && founderProfile.industries_of_interest.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {founderProfile.industries_of_interest.map((ind) => (
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
