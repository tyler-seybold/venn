'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

const STAGE_COLORS: Record<string, string> = {
  Ideation: 'bg-slate-100 text-slate-600',
  MVP: 'bg-blue-100 text-blue-700',
  'Beta Client/Pilot': 'bg-amber-100 text-amber-700',
  'Revenue-generating': 'bg-green-100 text-green-700',
}

export default function AdminPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'students' | 'startups'>('students')
  const [students, setStudents] = useState<Student[]>([])
  const [startups, setStartups] = useState<AdminStartup[]>([])
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

      const [{ data: studentsData }, { data: startupsData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, email, degree_program, graduation_year, is_admin')
          .order('full_name', { ascending: true }),
        supabase
          .from('startups')
          .select('id, startup_name, founder_id, industry, stage, profiles(full_name)')
          .order('startup_name', { ascending: true }),
      ])

      setStudents(studentsData ?? [])
      setStartups(
        (startupsData ?? []).map(({ profiles, ...s }) => ({
          ...s,
          founder_name: ((profiles as unknown as { full_name: string | null }[])[0])?.full_name ?? null,
        }))
      )
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
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
          {(['students', 'startups'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'students' ? `Students (${students.length})` : `Startups (${startups.length})`}
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
                          className="text-xs font-medium text-purple-700 hover:text-purple-900 border border-purple-200 hover:border-purple-400 rounded-lg px-2.5 py-1 transition"
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
                          className="text-xs font-medium text-purple-700 hover:text-purple-900 border border-purple-200 hover:border-purple-400 rounded-lg px-2.5 py-1 transition"
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
      </main>
    </div>
  )
}
