'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getFriendlyError } from '@/lib/errors'

const INDUSTRIES = [
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

const STAGES = ['Ideation', 'MVP', 'Beta Client/Pilot', 'Revenue-generating'] as const
type Stage = (typeof STAGES)[number]

const SKILLS_NEEDED = [
  'Engineering', 'Finance', 'Marketing', 'Operations', 'Design',
  'Legal', 'Sales', 'Product', 'Data/Analytics', 'Social Media',
]

const DESC_MAX = 200
const ASK_MAX = 150

export default function NewStartupPage() {
  const router = useRouter()

  // Auth state
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Form fields
  const [startupName, setStartupName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [stage, setStage] = useState<Stage | null>(null)
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [currentAsk, setCurrentAsk] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [openToCofounders, setOpenToCofounders] = useState(false)
  const [openToInterns, setOpenToInterns] = useState(false)
  const [problemStatement, setProblemStatement] = useState('')

  // Co-founders state
  const [coFounders, setCoFounders] = useState<Array<{ id: string; user_id: string; full_name: string | null; email: string | null }>>([])
  const [pendingNewCoFounders, setPendingNewCoFounders] = useState<{ user_id: string; full_name: string | null; email: string | null }[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; full_name: string | null; email: string | null; graduation_year: number | null; degree_program: string | null }>>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Submission state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [userName, setUserName] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchQueryRef = useRef('')
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
      } else {
        setUserId(data.user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', data.user.id)
          .single()
        setUserName(profile?.full_name ?? null)
        setAuthChecked(true)
      }
    })
  }, [router])

  // Logo file selection
  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Industry toggle
  function toggleIndustry(industry: string) {
    setSelectedIndustries((prev) => {
      if (prev.includes(industry)) return prev.filter((i) => i !== industry)
      if (prev.length >= 3) return prev
      return [...prev, industry]
    })
  }

  // Skills toggle
  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  // Co-founder search
  async function handleMemberSearch(query: string) {
    searchQueryRef.current = query
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, graduation_year, degree_program')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(8)
    if (searchQueryRef.current !== query) return
    const existingIds = new Set([...coFounders.map((m) => m.user_id), userId ?? ''])
    setSearchResults((data ?? []).filter((p) => !existingIds.has(p.user_id)))
    setSearchLoading(false)
  }

  function addCoFounder(profile: { user_id: string; full_name: string | null; email: string | null; graduation_year: number | null; degree_program: string | null }) {
    setCoFounders((prev) => [...prev, { id: `pending-${profile.user_id}`, user_id: profile.user_id, full_name: profile.full_name, email: profile.email }])
    setPendingNewCoFounders((prev) => [...prev, { user_id: profile.user_id, full_name: profile.full_name, email: profile.email }])
    setSearchResults((prev) => prev.filter((p) => p.user_id !== profile.user_id))
    setMemberSearch('')
  }

  function removeCoFounder(memberId: string) {
    const removed = coFounders.find((m) => m.id === memberId)
    if (removed) setPendingNewCoFounders((prev) => prev.filter((p) => p.user_id !== removed.user_id))
    setCoFounders((prev) => prev.filter((m) => m.id !== memberId))
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')

    const errors: Record<string, string> = {}
    if (!startupName.trim()) errors.startupName = 'Startup name is required.'
    if (!description.trim()) errors.description = 'Description is required.'
    if (!problemStatement.trim()) errors.problemStatement = 'Problem statement is required.'
    if (!stage) errors.stage = 'Stage is required.'
    if (selectedIndustries.length === 0) errors.industries = 'Select at least one industry.'
    if (selectedIndustries.length > 3) errors.industries = 'Select up to 3 industries.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setFieldErrors({})
    setLoading(true)

    let logoUrl: string | null = null

    // Upload logo if provided
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('startup-logos')
        .upload(path, logoFile, { upsert: true })

      if (uploadError) {
        setError(getFriendlyError(uploadError, 'upload'))
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('startup-logos').getPublicUrl(path)
      logoUrl = urlData.publicUrl
    }

    const { data: newStartup, error: insertError } = await supabase.from('startups').insert({
      founder_id: userId,
      startup_name: startupName,
      logo_url: logoUrl,
      founders_display: null,
      industry: selectedIndustries.length > 0 ? selectedIndustries : null,
      stage: stage ?? null,
      description: description || null,
      website_url: websiteUrl
        ? /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`
        : null,
      skills_needed: selectedSkills.length > 0 ? selectedSkills : null,
      open_to_cofounders: openToCofounders,
      open_to_interns: openToInterns,
      problem_statement: problemStatement.trim() || null,
      // current_ask and current_ask_updated_at omitted — hidden from UI
    }).select('id').single()

    if (insertError || !newStartup) {
      setLoading(false)
      setError(getFriendlyError(insertError, 'save'))
      return
    }

    await supabase.from('startup_members').insert({
      startup_id: newStartup.id,
      user_id: userId,
      role: 'primary',
    })

    for (const p of pendingNewCoFounders) {
      const { data } = await supabase
        .from('startup_members')
        .insert({ startup_id: newStartup.id, user_id: p.user_id, role: 'co-founder' })
        .select('id')
        .single()
      if (data) {
        fetch('/api/startup/notify-cofounder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startupId: newStartup.id,
            startupName,
            cofounderUserId: p.user_id,
            cofounderEmail: p.email,
            cofounderName: p.full_name,
            addedByName: userName,
          }),
        }).catch(() => {})
      }
    }

    setLoading(false)
    router.push('/dashboard')
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="w-full max-w-lg mx-auto">
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Add Your Startup
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Share your venture with the Kellogg community.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Startup name */}
            <div>
              <label htmlFor="startupName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Startup name <span className="text-red-500">*</span>
              </label>
              <input
                id="startupName"
                type="text"
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
                placeholder="Acme Inc."
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
              {fieldErrors.startupName && <p className="text-sm text-red-600 mt-1">{fieldErrors.startupName}</p>}
            </div>

            {/* Logo upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Logo <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-16 h-16 rounded-xl object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-sm text-red-500 hover:text-red-700 transition"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-brand hover:text-brand transition w-full justify-center"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4"
                    />
                  </svg>
                  Upload logo
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <p className="text-xs text-gray-400 mb-2">Select up to 3</p>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((industry) => {
                  const selected = selectedIndustries.includes(industry)
                  return (
                    <button
                      key={industry}
                      type="button"
                      onClick={() => toggleIndustry(industry)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                        selected
                          ? 'bg-brand border-brand text-white'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {industry}
                    </button>
                  )
                })}
              </div>
              {fieldErrors.industries && <p className="text-sm text-red-600 mt-1">{fieldErrors.industries}</p>}
            </div>

            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage
              </label>
              <div className="flex flex-wrap gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(stage === s ? null : s)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                      stage === s
                        ? 'bg-brand border-brand text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-brand hover:text-brand'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {fieldErrors.stage && <p className="text-sm text-red-600 mt-1">{fieldErrors.stage}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your startup do? Who is it for?"
                maxLength={DESC_MAX}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition resize-none"
              />
              <p className={`text-xs mt-1 ${DESC_MAX - description.length < 20 ? 'text-red-500' : DESC_MAX - description.length < 100 ? 'text-orange-400' : 'text-gray-400'}`}>{DESC_MAX - description.length} characters remaining</p>
              {fieldErrors.description && <p className="text-sm text-red-600 mt-1">{fieldErrors.description}</p>}
            </div>

            {/* Problem statement */}
            <div>
              <label htmlFor="problemStatement" className="block text-sm font-medium text-gray-700 mb-1.5">
                Problem statement <span className="text-red-500">*</span>
              </label>
              <textarea
                id="problemStatement"
                rows={4}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="What problem are you solving?"
                maxLength={DESC_MAX}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition resize-none"
              />
              <p className={`text-xs mt-1 ${DESC_MAX - problemStatement.length < 20 ? 'text-red-500' : DESC_MAX - problemStatement.length < 100 ? 'text-orange-400' : 'text-gray-400'}`}>{DESC_MAX - problemStatement.length} characters remaining</p>
              {fieldErrors.problemStatement && <p className="text-sm text-red-600 mt-1">{fieldErrors.problemStatement}</p>}
            </div>

            {/* Co-Founders */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Co-Founders <span className="text-gray-400 font-normal">(optional)</span>
              </label>

              {coFounders.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {coFounders.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start justify-between bg-white border border-gray-200 rounded-2xl shadow-sm p-4"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">
                            {m.full_name ?? m.email ?? 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-400">(pending)</span>
                        </div>
                        <span className="self-start text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                          Co-Founder
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCoFounder(m.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-2.5 py-1 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  const val = e.target.value
                  setMemberSearch(val)
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
                  searchDebounceRef.current = setTimeout(() => handleMemberSearch(val), 200)
                }}
                placeholder="Search by name to add a co-founder…"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />

              {searchLoading && (
                <p className="mt-2 text-xs text-gray-400">Searching…</p>
              )}
              {!searchLoading && memberSearch && searchResults.length === 0 && (
                <p className="mt-2 text-xs text-gray-400">No matching profiles found.</p>
              )}
              {searchResults.length > 0 && (
                <ul className="mt-1 rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                  {searchResults.map((p) => (
                    <li key={p.user_id}>
                      <button
                        type="button"
                        onClick={() => addCoFounder(p)}
                        className="w-full text-left px-3.5 py-2.5 text-sm text-gray-800 hover:bg-brand-light transition"
                      >
                        <span className="font-medium">{p.full_name ?? '—'}</span>
                        {(p.degree_program || p.graduation_year) && (
                          <span className="ml-2 text-xs text-gray-400">
                            {[p.degree_program, p.graduation_year ? `Class of ${p.graduation_year}` : null].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Website URL */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1.5">
                Website URL <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="website"
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>

            {/* Current ask — hidden from UI (field preserved in DB/types) */}
            {/* <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="currentAsk" className="block text-sm font-medium text-gray-700">
                  Current ask <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <span
                  className={`text-xs ${
                    currentAsk.length > ASK_MAX ? 'text-red-500' : 'text-gray-400'
                  }`}
                >
                  {currentAsk.length}/{ASK_MAX}
                </span>
              </div>
              <input
                id="currentAsk"
                type="text"
                value={currentAsk}
                onChange={(e) => setCurrentAsk(e.target.value)}
                placeholder="e.g. Looking for a technical co-founder"
                maxLength={ASK_MAX}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div> */}

            {/* Skills needed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills we're looking for <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILLS_NEEDED.map((skill) => {
                  const selected = selectedSkills.includes(skill)
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                        selected
                          ? 'bg-brand border-brand text-white'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {skill}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Open to co-founders */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Open to finding a co-founder
              </label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setOpenToCofounders(val)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                      openToCofounders === val
                        ? 'bg-brand border-brand text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-brand hover:text-brand'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {/* Open to interns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Open to hosting an intern
              </label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setOpenToInterns(val)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                      openToInterns === val
                        ? 'bg-brand border-brand text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-brand hover:text-brand'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || description.length > DESC_MAX /* || currentAsk.length > ASK_MAX */}
              className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              {loading ? 'Saving…' : 'Add Startup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
