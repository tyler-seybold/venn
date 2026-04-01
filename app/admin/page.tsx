'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getMatchLabel } from '@/config/matching'

type Student = {
  user_id: string
  full_name: string | null
  email: string | null
  degree_program: string | null
  graduation_year: number | null
  is_admin: boolean
}

type AdminStartup = {
  id: string
  startup_name: string
  founder_id: string
  founder_name: string | null
  industry: string[] | null
  stage: string | null
}

type FeedbackMatch = {
  id: string
  user_id_1: string
  user_id_2: string
  match_score: number | null
  week_of: string | null
  feedback_1: 'up' | 'down' | null
  feedback_1_reason: string | null
  feedback_2: 'up' | 'down' | null
  feedback_2_reason: string | null
  name_1: string | null
  name_2: string | null
}

const STAGE_COLORS: Record<string, string> = {
  Ideation: 'bg-slate-100 text-slate-600',
  MVP: 'bg-blue-100 text-blue-700',
  'Beta Client/Pilot': 'bg-amber-100 text-amber-700',
  'Revenue-generating': 'bg-green-100 text-green-700',
}

function feedbackIcon(val: 'up' | 'down' | null) {
  if (val === 'up') return '👍'
  if (val === 'down') return '👎'
  return <span className="text-gray-300">—</span>
}

function formatWeekOf(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function AdminPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'students' | 'startups' | 'feedback'>('students')
  const [students, setStudents] = useState<Student[]>([])
  const [startups, setStartups] = useState<AdminStartup[]>([])
  const [feedbackMatches, setFeedbackMatches] = useState<FeedbackMatch[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }

      const uid = data.user.id

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', uid)
        .single()

      if (!profile?.is_admin) {
        router.replace('/dashboard')
        return
      }

      const { data: session } = await supabase.auth.getSession()
      setAccessToken(session.session?.access_token ?? null)

      const [{ data: studentsData }, { data: startupsData }, { data: matchesData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, email, degree_program, graduation_year, is_admin')
          .order('full_name', { ascending: true }),
        supabase
          .from('startups')
          .select('id, startup_name, founder_id, industry, stage, profiles(full_name)')
          .order('startup_name', { ascending: true }),
        supabase
          .from('matches')
          .select('id, user_id_1, user_id_2, match_score, week_of, feedback_1, feedback_1_reason, feedback_2, feedback_2_reason')
          .or('feedback_1.not.is.null,feedback_2.not.is.null')
          .order('week_of', { ascending: false }),
      ])

      setStudents(studentsData ?? [])
      setStartups(
        (startupsData ?? []).map(({ profiles, ...s }) => ({
          ...s,
          founder_name: ((profiles as unknown as { full_name: string | null }[])[0])?.full_name ?? null,
        }))
      )

      // Resolve profile names for feedback matches
      if (matchesData && matchesData.length > 0) {
        const userIds = [...new Set(matchesData.flatMap((m) => [m.user_id_1, m.user_id_2]))]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds)

        const nameMap = new Map<string, string | null>(
          (profilesData ?? []).map((p) => [p.user_id, p.full_name])
        )

        setFeedbackMatches(
          matchesData.map((m) => ({
            ...m,
            name_1: nameMap.get(m.user_id_1) ?? null,
            name_2: nameMap.get(m.user_id_2) ?? null,
          }))
        )
      }

      setLoading(false)
    })
  }, [router])

  async function handleDeleteStudent(userId: string, name: string | null) {
    if (!window.confirm(`Delete ${name ?? 'this student'}? This permanently removes their account and profile.`)) return
    setDeletingId(userId)
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      setStudents((prev) => prev.filter((s) => s.user_id !== userId))
    } else {
      const json = await res.json()
      alert(`Delete failed: ${json.error}`)
    }
    setDeletingId(null)
  }

  async function handleDeleteStartup(startupId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(startupId)
    const res = await fetch('/api/admin/delete-startup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ startupId }),
    })
    if (res.ok) {
      setStartups((prev) => prev.filter((s) => s.id !== startupId))
    } else {
      const json = await res.json()
      alert(`Delete failed: ${json.error}`)
    }
    setDeletingId(null)
  }

  // Feedback summary stats
  const totalResponses = feedbackMatches.reduce((n, m) => {
    return n + (m.feedback_1 != null ? 1 : 0) + (m.feedback_2 != null ? 1 : 0)
  }, 0)
  const totalUp = feedbackMatches.reduce((n, m) => {
    return n + (m.feedback_1 === 'up' ? 1 : 0) + (m.feedback_2 === 'up' ? 1 : 0)
  }, 0)
  const totalDown = totalResponses - totalUp
  const pctUp   = totalResponses > 0 ? Math.round((totalUp / totalResponses) * 100) : 0
  const pctDown = totalResponses > 0 ? Math.round((totalDown / totalResponses) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
            <span className="text-gray-300 select-none">·</span>
            <span className="text-base font-semibold text-gray-900 tracking-tight">Admin</span>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            Admin Mode
          </span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage students and startups</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['students', 'startups', 'feedback'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'students'
                ? `Students (${students.length})`
                : t === 'startups'
                ? `Startups (${startups.length})`
                : `Feedback (${feedbackMatches.length})`}
            </button>
          ))}
        </div>

        {/* Students tab */}
        {tab === 'students' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Program</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Grad Year</th>
                  <th className="px-5 py-3 w-px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s) => (
                  <tr key={s.user_id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{s.full_name ?? <span className="text-gray-400 font-normal">—</span>}</span>
                        {s.is_admin && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-600">admin</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{s.email ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{s.degree_program ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{s.graduation_year ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/admin/profile/${s.user_id}/edit`)}
                          className="text-xs font-medium text-brand hover:text-brand-hover border border-brand-light hover:border-brand rounded-lg px-2.5 py-1 transition"
                        >
                          Edit Profile
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.user_id, s.full_name)}
                          disabled={deletingId === s.user_id}
                          className="text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-2.5 py-1 transition disabled:opacity-50"
                        >
                          {deletingId === s.user_id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">No students found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Startups tab */}
        {tab === 'startups' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Startup</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Founder</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Industry</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Stage</th>
                  <th className="px-5 py-3 w-px" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {startups.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{s.startup_name}</td>
                    <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{s.founder_name ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">
                      {s.industry && s.industry.length > 0 ? s.industry.join(', ') : '—'}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {s.stage ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[s.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                          {s.stage}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/startup/${s.id}/edit`)}
                          className="text-xs font-medium text-brand hover:text-brand-hover border border-brand-light hover:border-brand rounded-lg px-2.5 py-1 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStartup(s.id, s.startup_name)}
                          disabled={deletingId === s.id}
                          className="text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-2.5 py-1 transition disabled:opacity-50"
                        >
                          {deletingId === s.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {startups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">No startups found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Feedback tab */}
        {tab === 'feedback' && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Matches with feedback</p>
                <p className="text-2xl font-bold text-gray-900">{feedbackMatches.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">{totalResponses} total responses</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Thumbs up</p>
                <p className="text-2xl font-bold text-green-600">{pctUp}%</p>
                <p className="text-xs text-gray-400 mt-0.5">{totalUp} responses</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Thumbs down</p>
                <p className="text-2xl font-bold text-red-500">{pctDown}%</p>
                <p className="text-xs text-gray-400 mt-0.5">{totalDown} responses</p>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Person 1</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Person 2</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Label</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">P1 feedback</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">P1 reason</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">P2 feedback</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">P2 reason</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Week of</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {feedbackMatches.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">{m.name_1 ?? <span className="text-gray-400 font-normal">Unknown</span>}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">{m.name_2 ?? <span className="text-gray-400 font-normal">Unknown</span>}</td>
                      <td className="px-5 py-3.5 text-gray-600 tabular-nums">{m.match_score ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell whitespace-nowrap">
                        {m.match_score != null ? getMatchLabel(m.match_score) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-base">{feedbackIcon(m.feedback_1)}</td>
                      <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell max-w-xs">
                        {m.feedback_1_reason
                          ? <span className="line-clamp-2">{m.feedback_1_reason}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-base">{feedbackIcon(m.feedback_2)}</td>
                      <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell max-w-xs">
                        {m.feedback_2_reason
                          ? <span className="line-clamp-2">{m.feedback_2_reason}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell whitespace-nowrap">{formatWeekOf(m.week_of)}</td>
                    </tr>
                  ))}
                  {feedbackMatches.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-400">No feedback submitted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
