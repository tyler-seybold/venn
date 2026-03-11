'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Mail, ExternalLink } from 'lucide-react'
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

type Startup = {
  id: string
  founder_id: string
  startup_name: string
  logo_url: string | null
  industry: string[] | null
  stage: string | null
  description: string | null
  website_url: string | null
  current_ask: string | null
  current_ask_updated_at: string | null
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

type Member = {
  id: string
  role: string
  user_id: string
  full_name: string | null
  email: string | null
  bio: string | null
  skills: string[] | null
  industries_of_interest: string[] | null
  is_looking_for_startup: boolean
  avatar_url: string | null
}

export default function StartupDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [userId, setUserId] = useState<string | null>(null)
  const [startup, setStartup] = useState<Startup | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [leavingStartup, setLeavingStartup] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }

      setUserId(data.user.id)

      const [{ data: startupData, error }, { data: membersData }] = await Promise.all([
        supabase.from('startups').select('*').eq('id', id).single(),
        supabase
          .from('startup_members')
          .select('id, role, user_id, profiles(*)')
          .eq('startup_id', id)
          .order('created_at', { ascending: true }),
      ])

      if (error || !startupData) {
        router.replace('/dashboard')
        return
      }

      setStartup(startupData)
      setMembers(
        (membersData ?? []).map((m) => {
          type ProfileData = {
            full_name: string | null
            email: string | null
            bio: string | null
            skills: string[] | null
            industries_of_interest: string[] | null
            is_looking_for_startup: boolean
            avatar_url: string | null
          }
          const raw = m.profiles as unknown
          const profile: ProfileData | null = Array.isArray(raw)
            ? (raw as ProfileData[])[0] ?? null
            : (raw as ProfileData | null) ?? null
          return {
            id: m.id,
            role: m.role,
            user_id: m.user_id,
            full_name: profile?.full_name ?? null,
            email: profile?.email ?? null,
            bio: profile?.bio ?? null,
            skills: profile?.skills ?? null,
            industries_of_interest: profile?.industries_of_interest ?? null,
            is_looking_for_startup: profile?.is_looking_for_startup ?? false,
            avatar_url: profile?.avatar_url ?? null,
          }
        })
      )
      setLoading(false)
    })
  }, [id, router])

  async function handleLeaveStartup(member: Member) {
    if (!startup) return
    if (!window.confirm(`Are you sure you want to leave ${startup.startup_name}?`)) return

    setLeavingStartup(true)
    await supabase.from('startup_members').delete().eq('id', member.id)
    setLeavingStartup(false)
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!startup) return null

  const currentUserMember = members.find((m) => m.user_id === userId) ?? null
  const isPrimaryFounder = currentUserMember?.role === 'primary'
  const isCoFounder = currentUserMember?.role === 'co-founder'
  const primaryMember = members.find((m) => m.role === 'primary') ?? null

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

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Logo / placeholder — full-width top banner */}
          <div className="w-full aspect-video bg-brand-light flex items-center justify-center overflow-hidden">
            {startup.logo_url ? (
              <img
                src={startup.logo_url}
                alt={`${startup.startup_name} logo`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-8xl font-bold text-brand/20">
                {startup.startup_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="p-8">
            {/* Header: name + website button + edit button */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-tight">
                {startup.startup_name}
              </h1>
              <div className="flex items-center gap-2 flex-shrink-0">
                {startup.website_url && (
                  <a
                    href={startup.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand border border-brand-light hover:bg-brand-light rounded-lg px-3 py-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Startup Website
                  </a>
                )}
                {isPrimaryFounder && (
                  <button
                    onClick={() => router.push(`/startup/${startup.id}/edit`)}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
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
                  Description
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed">{startup.description}</p>
              </div>
            )}

            {/* Current ask */}
            {startup.current_ask && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Current Ask{startup.current_ask_updated_at ? ` (last updated ${formatDate(startup.current_ask_updated_at)})` : ''}
                </h2>
                <p className="text-sm text-gray-700">{startup.current_ask}</p>
              </div>
            )}

            {/* Email button */}
            {primaryMember?.email && (
              <div className="mt-6">
                <a
                  href={`mailto:${primaryMember.email}?subject=Re: ${encodeURIComponent(startup.startup_name)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-light text-brand hover:bg-brand-light text-xs font-medium px-3 py-1.5 transition"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </a>
              </div>
            )}
          </div>
        </div>

        {/* The Team */}
        {members.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">The Team</h2>
            <div className="flex flex-col gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  onClick={() => router.push(`/people/${member.user_id}`)}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3 cursor-pointer hover:border-brand-light hover:shadow-md transition"
                >
                  {/* Name + role badge + leave button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-base leading-tight">
                        {member.full_name ?? '—'}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          member.role === 'primary'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {member.role === 'primary' ? 'Founder' : 'Co-Founder'}
                      </span>
                    </div>
                    {isCoFounder && member.user_id === userId && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleLeaveStartup(member) }}
                        disabled={leavingStartup}
                        className="flex-shrink-0 text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-2.5 py-1 transition disabled:opacity-50"
                      >
                        {leavingStartup ? 'Leaving…' : 'Leave Startup'}
                      </button>
                    )}
                  </div>

                  {/* Bio */}
                  {member.bio && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                      {member.bio}
                    </p>
                  )}

                  {/* Skills */}
                  {member.skills && member.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {member.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-xs font-medium bg-brand-light text-brand px-2 py-0.5 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Industries of interest */}
                  {member.industries_of_interest && member.industries_of_interest.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {member.industries_of_interest.map((ind) => (
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
