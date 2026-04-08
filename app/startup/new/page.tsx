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

  // Submission state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login')
      } else {
        setUserId(data.user.id)
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
                required
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
                placeholder="Acme Inc."
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
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
