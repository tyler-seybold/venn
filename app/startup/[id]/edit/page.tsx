'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

// Extract the storage object path from a Supabase public URL
function storagePathFromUrl(url: string): string | null {
  const marker = '/startup-logos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

export default function EditStartupPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  // Auth + ownership state
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Form fields
  const [startupName, setStartupName] = useState('')
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [stage, setStage] = useState<Stage | null>(null)
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [currentAsk, setCurrentAsk] = useState('')
  const [originalCurrentAsk, setOriginalCurrentAsk] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [openToCofounders, setOpenToCofounders] = useState(false)
  const [openToInterns, setOpenToInterns] = useState(false)

  // Co-founders state
  const [coFounders, setCoFounders] = useState<Array<{ id: string; user_id: string; full_name: string | null; email: string | null }>>([])
  const [pendingPrimaryFounderId, setPendingPrimaryFounderId] = useState<string | null>(null)
  const [pendingNewCoFounders, setPendingNewCoFounders] = useState<{ user_id: string; full_name: string | null; email: string | null }[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ user_id: string; full_name: string | null; email: string | null; graduation_year: number | null; degree_program: string | null }>>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [addingMember, setAddingMember] = useState(false)

  // UI state
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth check then load startup
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }

      const uid = data.user.id
      setUserId(uid)

      const { data: startup, error: fetchError } = await supabase
        .from('startups')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !startup) {
        router.replace('/dashboard')
        return
      }

      const { data: session } = await supabase.auth.getSession()
      setAccessToken(session.session?.access_token ?? null)

      // Allow primary founder, co-founder, or admin
      if (startup.founder_id !== uid) {
        const [{ data: memberData }, { data: callerProfile }] = await Promise.all([
          supabase
            .from('startup_members')
            .select('role')
            .eq('startup_id', id)
            .eq('user_id', uid)
            .single(),
          supabase
            .from('profiles')
            .select('is_admin, full_name')
            .eq('user_id', uid)
            .single(),
        ])
        if (memberData?.role !== 'co-founder' && !callerProfile?.is_admin) {
          router.replace('/dashboard')
          return
        }
        setIsAdmin(callerProfile?.is_admin ?? false)
        setUserName(callerProfile?.full_name ?? null)
      } else {
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('is_admin, full_name')
          .eq('user_id', uid)
          .single()
        setIsAdmin(callerProfile?.is_admin ?? false)
        setUserName(callerProfile?.full_name ?? null)
      }

      // Pre-populate fields
      setStartupName(startup.startup_name)
      setExistingLogoUrl(startup.logo_url ?? null)
      setLogoPreview(startup.logo_url ?? null)
      setSelectedIndustries(startup.industry ?? [])
      setStage((startup.stage as Stage) ?? null)
      setDescription(startup.description ?? '')
      setWebsiteUrl(startup.website_url ?? '')
      setCurrentAsk(startup.current_ask ?? '')
      setOriginalCurrentAsk(startup.current_ask ?? '')
      setSelectedSkills(startup.skills_needed ?? [])
      setOpenToCofounders(startup.open_to_cofounders ?? false)
      setOpenToInterns(startup.open_to_interns ?? false)

      // Load co-founders (exclude primary)
      const { data: membersData } = await supabase
        .from('startup_members')
        .select('id, user_id, role, profiles(full_name, email)')
        .eq('startup_id', id)
        .neq('role', 'primary')

      setCoFounders(
        (membersData ?? []).map((m) => ({
          id: m.id,
          user_id: m.user_id,
          full_name: (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.full_name ?? 'Unknown',
          email:     (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)?.email     ?? null,
        }))
      )

      setAuthChecked(true)
      setDataLoaded(true)
    })
  }, [id, router])

  // Co-founder search
  async function handleMemberSearch(query: string) {
    setMemberSearch(query)
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
    const existingIds = new Set([...coFounders.map((m) => m.user_id), userId ?? ''])
    setSearchResults((data ?? []).filter((p) => !existingIds.has(p.user_id)))
    setSearchLoading(false)
  }

  function addCoFounder(profile: { user_id: string; full_name: string | null; email: string | null; graduation_year: number | null; degree_program: string | null }) {
    // Stage locally — insert happens on save
    setCoFounders((prev) => [...prev, { id: `pending-${profile.user_id}`, user_id: profile.user_id, full_name: profile.full_name, email: profile.email }])
    setPendingNewCoFounders((prev) => [...prev, { user_id: profile.user_id, full_name: profile.full_name, email: profile.email }])
    setSearchResults((prev) => prev.filter((p) => p.user_id !== profile.user_id))
    setMemberSearch('')
  }

  async function removeCoFounder(memberId: string) {
    if (!memberId.startsWith('pending-')) {
      await supabase.from('startup_members').delete().eq('id', memberId)
    }
    const removed = coFounders.find((m) => m.id === memberId)
    if (removed) setPendingNewCoFounders((prev) => prev.filter((p) => p.user_id !== removed.user_id))
    setCoFounders((prev) => prev.filter((m) => m.id !== memberId))
  }

  async function promoteFounder(newFounderUserId: string) {
    await fetch('/api/admin/promote-founder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ startup_id: id, new_founder_id: newFounderUserId }),
    })
    router.refresh()
  }

  // Logo handlers
  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setLogoRemoved(false)
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    setLogoRemoved(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Industry toggle
  function toggleIndustry(industry: string) {
    setSelectedIndustries((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    )
  }

  // Skills toggle
  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')
    setLoading(true)

    let logoUrl: string | null = existingLogoUrl

    // Upload new logo and delete old one
    if (logoFile) {
      const ext = logoFile.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('startup-logos')
        .upload(path, logoFile, { upsert: true })

      if (uploadError) {
        setError(`Logo upload failed: ${uploadError.message}`)
        setLoading(false)
        return
      }

      // Delete old logo from storage (best-effort, don't block on failure)
      if (existingLogoUrl) {
        const oldPath = storagePathFromUrl(existingLogoUrl)
        if (oldPath) {
          await supabase.storage.from('startup-logos').remove([oldPath])
        }
      }

      const { data: urlData } = supabase.storage.from('startup-logos').getPublicUrl(path)
      logoUrl = urlData.publicUrl
    } else if (logoRemoved) {
      // User explicitly removed the logo
      if (existingLogoUrl) {
        const oldPath = storagePathFromUrl(existingLogoUrl)
        if (oldPath) {
          await supabase.storage.from('startup-logos').remove([oldPath])
        }
      }
      logoUrl = null
    }

    const normalizedUrl = websiteUrl
      ? /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`
      : null

    const { error: updateError } = await supabase
      .from('startups')
      .update({
        startup_name: startupName,
        logo_url: logoUrl,
        industry: selectedIndustries.length > 0 ? selectedIndustries : null,
        stage: stage ?? null,
        description: description || null,
        website_url: normalizedUrl,
        skills_needed: selectedSkills.length > 0 ? selectedSkills : null,
        open_to_cofounders: openToCofounders,
        open_to_interns: openToInterns,
        // current_ask and current_ask_updated_at omitted — hidden from UI
      })
      .eq('id', id)

    if (updateError) {
      setLoading(false)
      setError(updateError.message)
      return
    }

    if (pendingPrimaryFounderId) {
      await promoteFounder(pendingPrimaryFounderId)
      setPendingPrimaryFounderId(null)
    }

    for (const p of pendingNewCoFounders) {
      const { data } = await supabase
        .from('startup_members')
        .insert({ startup_id: id, user_id: p.user_id, role: 'co-founder' })
        .select('id')
        .single()
      if (data) {
        fetch('/api/startup/notify-cofounder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startupId: id,
            startupName,
            cofounderUserId: p.user_id,
            cofounderEmail: p.email,
            cofounderName: p.full_name,
            addedByName: userName,
          }),
        }).catch(() => {})
      }
    }
    setPendingNewCoFounders([])

    setLoading(false)
    router.push('/dashboard')
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this startup? This cannot be undone.')) return
    setDeleting(true)

    // Delete logo from storage if one exists
    if (existingLogoUrl) {
      const oldPath = storagePathFromUrl(existingLogoUrl)
      if (oldPath) {
        await supabase.storage.from('startup-logos').remove([oldPath])
      }
    }

    const { error: deleteError } = await supabase.from('startups').delete().eq('id', id)

    setDeleting(false)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      router.push('/dashboard')
    }
  }

  if (!authChecked || !dataLoaded) {
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
              Edit Startup
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Update your startup's information.
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
                required
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
                placeholder="Acme Inc."
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>

            {/* Logo */}
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
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-brand hover:text-brand transition"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="text-sm text-red-500 hover:text-red-700 transition"
                    >
                      Remove
                    </button>
                  </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry <span className="text-gray-400 font-normal">(optional)</span>
              </label>
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
            </div>

            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage <span className="text-gray-400 font-normal">(optional)</span>
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
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your startup do? Who is it for?"
                maxLength={DESC_MAX}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition resize-none"
              />
              <p className={`text-xs mt-1 ${DESC_MAX - description.length < 20 ? 'text-red-500' : DESC_MAX - description.length < 100 ? 'text-orange-400' : 'text-gray-400'}`}>{DESC_MAX - description.length} characters remaining</p>
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

            {/* Co-Founders */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Co-Founders <span className="text-gray-400 font-normal">(optional)</span>
              </label>

              {/* Current co-founders */}
              {coFounders.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {coFounders.map((m) => {
                    const isPendingPromotion = pendingPrimaryFounderId === m.user_id
                    const isPendingNew = pendingNewCoFounders.some((p) => p.user_id === m.user_id)
                    return (
                      <div
                        key={m.id}
                        className="flex items-start justify-between bg-white border border-gray-200 rounded-2xl shadow-sm p-4"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900">
                              {m.full_name ?? m.email ?? 'Unknown'}
                            </span>
                            {isPendingNew && (
                              <span className="text-xs text-gray-400">(pending)</span>
                            )}
                          </div>
                          <span className={`self-start text-xs font-medium px-2.5 py-1 rounded-full ${isPendingPromotion ? 'bg-[#e8edf5] text-[#1E3A5F]' : 'bg-gray-100 text-gray-600'}`}>
                            {isPendingPromotion ? 'Primary Founder (pending)' : 'Co-Founder'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {isAdmin && !isPendingNew && (
                            isPendingPromotion ? (
                              <button
                                type="button"
                                onClick={() => setPendingPrimaryFounderId(null)}
                                className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-2.5 py-1 transition"
                              >
                                Undo
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPendingPrimaryFounderId(m.user_id)}
                                className="text-xs font-medium text-[#1E3A5F] hover:text-[#1E3A5F]/80 border border-[#1E3A5F]/30 hover:border-[#1E3A5F] rounded-lg px-2.5 py-1 transition"
                              >
                                Promote to Primary Founder
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => removeCoFounder(m.id)}
                            disabled={isPendingPromotion}
                            className="text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 rounded-lg px-2.5 py-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Search input */}
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => handleMemberSearch(e.target.value)}
                placeholder="Search by name to add a co-founder…"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />

              {/* Search results */}
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || description.length > DESC_MAX /* || currentAsk.length > ASK_MAX */}
              className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="mt-6 bg-white rounded-2xl border border-red-200 px-8 py-6">
          <h2 className="text-sm font-semibold text-red-700 mb-1">Danger zone</h2>
          <p className="text-xs text-gray-500 mb-4">
            Permanently delete this startup. This action cannot be undone.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium px-4 py-2 transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {deleting ? 'Deleting…' : 'Delete Startup'}
          </button>
        </div>
      </div>
    </div>
  )
}
