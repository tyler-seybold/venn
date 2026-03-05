'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Consumer Products',
  'Education Services',
  'Business Services',
  'Food & Beverage',
  'Other',
]

const STAGES = ['Ideation', 'MVP', 'Beta Client/Pilot', 'Revenue-generating'] as const
type Stage = (typeof STAGES)[number]

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
  const [authChecked, setAuthChecked] = useState(false)

  // Form fields
  const [startupName, setStartupName] = useState('')
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const [foundersDisplay, setFoundersDisplay] = useState('')
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [stage, setStage] = useState<Stage | null>(null)
  const [description, setDescription] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [currentAsk, setCurrentAsk] = useState('')

  // UI state
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
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

      if (startup.founder_id !== uid) {
        router.replace('/dashboard')
        return
      }

      // Pre-populate fields
      setStartupName(startup.startup_name)
      setExistingLogoUrl(startup.logo_url ?? null)
      setLogoPreview(startup.logo_url ?? null)
      setFoundersDisplay(startup.founders_display ?? '')
      setSelectedIndustries(startup.industry ?? [])
      setStage((startup.stage as Stage) ?? null)
      setDescription(startup.description ?? '')
      setWebsiteUrl(startup.website_url ?? '')
      setCurrentAsk(startup.current_ask ?? '')

      setAuthChecked(true)
      setDataLoaded(true)
    })
  }, [id, router])

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
        founders_display: foundersDisplay,
        industry: selectedIndustries.length > 0 ? selectedIndustries : null,
        stage: stage ?? null,
        description: description || null,
        website_url: normalizedUrl,
        current_ask: currentAsk || null,
      })
      .eq('id', id)

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      router.push('/dashboard')
    }
  }

  if (!authChecked || !dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
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
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
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
                      className="text-sm text-purple-600 hover:text-purple-800 transition"
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
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition w-full justify-center"
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

            {/* Founders display names */}
            <div>
              <label htmlFor="founders" className="block text-sm font-medium text-gray-700 mb-1.5">
                Founders <span className="text-red-500">*</span>
              </label>
              <input
                id="founders"
                type="text"
                required
                value={foundersDisplay}
                onChange={(e) => setFoundersDisplay(e.target.value)}
                placeholder="Jane Smith, John Doe"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
              <p className="mt-1 text-xs text-gray-400">Separate multiple founders with commas</p>
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
                          ? 'bg-purple-700 border-purple-700 text-white'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-purple-400 hover:text-purple-700'
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
                        ? 'bg-purple-700 border-purple-700 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-purple-400 hover:text-purple-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-xs ${
                    description.length > DESC_MAX ? 'text-red-500' : 'text-gray-400'
                  }`}
                >
                  {description.length}/{DESC_MAX}
                </span>
              </div>
              <textarea
                id="description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your startup do? Who is it for?"
                maxLength={DESC_MAX}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
              />
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
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Current ask */}
            <div>
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
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || description.length > DESC_MAX || currentAsk.length > ASK_MAX}
              className="w-full rounded-lg bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
