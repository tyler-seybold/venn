'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calculateCompleteness } from '@/lib/completeness'
import { getFriendlyError } from '@/lib/errors'

const SKILLS = [
  'Engineering', 'Finance', 'Marketing', 'Operations', 'Design',
  'Legal', 'Sales', 'Product', 'Data/Analytics', 'Social Media',
]

const INDUSTRIES = [
  'Advertising', 'AI', 'Apparel', 'B2B', 'Biotech', 'Climate', 'CPG',
  'Education', 'Energy', 'Financial Services', 'Fintech', 'Fitness & Wellness',
  'Food & Beverage', 'Gaming', 'Healthcare', 'Hospitality',
  'Leisure/Travel & Tourism', 'Logistics & Supply Chain', 'Manufacturing',
  'Media', 'Medical Devices', 'Pharma', 'Real Estate', 'Social Impact',
  'Sports', 'Sustainability', 'Tech', 'Transportation',
]

const INDUSTRY_OPENNESS_OPTIONS = [
  { value: 'strong_preferences', label: 'I have strong industry preferences' },
  { value: 'some_preferences',   label: "I have some preferences but I'm open" },
  { value: 'open_to_anything',   label: "I'm open to anything" },
]

const ROLE_ORIENTATIONS = [
  'Operator', 'Builder', 'Business Development', 'Generalist', 'Researcher', 'Creative',
]

const DEGREE_PROGRAMS = ['2Y', '1Y', 'MMM', 'MBAi', 'JD-MBA', 'MD-MBA', 'EMBA', 'E&W', 'Exchange']

export default function ProfileEditPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [degreeProgram, setDegreeProgram] = useState('')
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [industryOpenness, setIndustryOpenness] = useState('')
  const [roleOrientation, setRoleOrientation] = useState<string[]>([])
  const [lookingFor, setLookingFor] = useState('')
  const [slackHandle, setSlackHandle] = useState('')
  const [cofounderInterest, setCofounderInterest] = useState(false)
  const [matchingOptIn, setMatchingOptIn] = useState(true)

  // Avatar state
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [matchingPausedUntil, setMatchingPausedUntil] = useState<string | null>(null)
  const [pauseLoading, setPauseLoading] = useState(false)

  const [deactivateStep, setDeactivateStep] = useState<'idle' | 'confirm'>('idle')
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [industryCapMessage, setIndustryCapMessage] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // Auth check + load profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }
      const uid = data.user.id
      setUserId(uid)
      setUserEmail(data.user.email ?? null)

      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', uid).single()
      if (profile) {
        setFullName(profile.full_name ?? '')
        setGraduationYear(profile.graduation_year ? String(profile.graduation_year) : '')
        setDegreeProgram(profile.degree_program ?? '')
        setBio(profile.bio ?? '')
        setSkills(profile.skills ?? [])
        setIndustries(profile.industries ?? [])
        setIndustryOpenness(profile.industry_openness ?? '')
        setRoleOrientation(profile.role_orientation ?? [])
        setLookingFor(profile.looking_for ?? '')
        setSlackHandle(profile.slack_handle ?? '')
        setCofounderInterest(profile.cofounder_interest ?? false)
        setMatchingOptIn(profile.matching_opt_in ?? true)
        setMatchingPausedUntil(profile.matching_paused_until ?? null)
        setExistingAvatarUrl(profile.avatar_url ?? null)
        setAvatarPreview(profile.avatar_url ?? null)
      }

      setDataLoaded(true)
    })
  }, [router])

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item])
  }

  function toggleIndustry(industry: string) {
    if (industries.includes(industry)) {
      setIndustries(industries.filter((i) => i !== industry))
      setIndustryCapMessage(false)
    } else if (industries.length >= 6) {
      setIndustryCapMessage(true)
    } else {
      setIndustries([...industries, industry])
      setIndustryCapMessage(false)
    }
  }

  async function handlePauseToggle() {
    if (!userId) return
    setPauseLoading(true)
    const isPaused = matchingPausedUntil && new Date(matchingPausedUntil) > new Date()
    if (isPaused) {
      const { error } = await supabase.from('profiles').update({ matching_paused_until: null }).eq('user_id', userId)
      if (!error) setMatchingPausedUntil(null)
    } else {
      const until = new Date()
      until.setDate(until.getDate() + 30)
      const isoUntil = until.toISOString()
      const { error } = await supabase.from('profiles').update({ matching_paused_until: isoUntil }).eq('user_id', userId)
      if (!error) setMatchingPausedUntil(isoUntil)
    }
    setPauseLoading(false)
  }

  async function handleDeactivate() {
    if (!userId) return
    setDeactivateLoading(true)
    await supabase
      .from('profiles')
      .update({ is_deactivated: true, matching_opt_in: false })
      .eq('user_id', userId)
    await supabase.auth.signOut()
    setDeactivateLoading(false)
    router.push('/login')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')

    const errors: Record<string, string> = {}
    if (!fullName.trim()) errors.fullName = 'Full name is required.'
    if (!graduationYear || graduationYear.length !== 4) errors.graduationYear = 'Enter a 4-digit graduation year.'
    if (!degreeProgram) errors.degreeProgram = 'Select a degree program.'
    if (!bio.trim()) errors.bio = 'Bio is required.'
    if (skills.length === 0) errors.skills = 'Select at least one skill.'
    if (industries.length === 0) errors.industries = 'Select at least one industry.'
    if (!industryOpenness) errors.industryOpenness = 'Select an option.'
    if (!lookingFor.trim()) errors.lookingFor = 'This field is required.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setFieldErrors({})
    setLoading(true)

    let avatarUrl: string | null = existingAvatarUrl
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (uploadError) {
        setError(getFriendlyError(uploadError, 'upload'))
        setLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }

    const profileData = {
      full_name:         fullName,
      avatar_url:        avatarUrl,
      graduation_year:   graduationYear ? parseInt(graduationYear, 10) : null,
      degree_program:    degreeProgram || null,
      bio:               bio || null,
      skills:            skills.length > 0 ? skills : null,
      industries:        industries.length > 0 ? industries : null,
      industry_openness: industryOpenness || null,
      role_orientation:  roleOrientation.length > 0 ? roleOrientation : null,
      looking_for:       lookingFor || null,
    }
    const { score } = calculateCompleteness(profileData)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        slack_handle:       slackHandle.trim() || null,
        cofounder_interest: cofounderInterest,
        completeness_score: score,
      })
      .eq('user_id', userId)

    setLoading(false)

    if (updateError) {
      setError(getFriendlyError(updateError, 'save'))
    } else {
      if (lookingFor.trim()) {
        fetch('/api/inference/intent-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ looking_for: lookingFor.trim(), user_id: userId }),
        }).catch(() => {})
      }
      supabase.auth.getSession().then(({ data: { session } }) => {
        fetch('/api/moderation/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ type: 'profile', id: userId }),
        }).catch(() => {})
      }).catch(() => {})
      router.push('/dashboard')
    }
  }

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Edit Profile</h1>
            <p className="mt-1 text-sm text-gray-500">{userEmail}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">

            {/* 1. Full name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
              {fieldErrors.fullName && <p className="text-sm text-red-600 mt-1">{fieldErrors.fullName}</p>}
            </div>

            {/* 2. Profile photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Profile photo <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <>
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-16 h-16 rounded-full object-cover border border-gray-200 flex-shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="text-sm text-brand hover:text-brand transition"
                    >
                      Change
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-brand hover:text-brand transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                    </svg>
                    Upload photo
                  </button>
                )}
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>
            </div>

            {/* 3. Anticipated graduation year */}
            <div>
              <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 mb-1.5">
                Anticipated graduation year <span className="text-red-500">*</span>
              </label>
              <input
                id="graduationYear"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value.replace(/\D/g, ''))}
                placeholder="2026"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition ${fieldErrors.graduationYear ? 'border-red-400' : 'border-gray-300'}`}
              />
              {fieldErrors.graduationYear && <p className="mt-1 text-xs text-red-600">{fieldErrors.graduationYear}</p>}
            </div>

            {/* 4. Degree program */}
            <div>
              <label htmlFor="degreeProgram" className="block text-sm font-medium text-gray-700 mb-1.5">
                Degree program <span className="text-red-500">*</span>
              </label>
              <select
                id="degreeProgram"
                value={degreeProgram}
                onChange={(e) => setDegreeProgram(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition bg-white ${fieldErrors.degreeProgram ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">Select a program…</option>
                {DEGREE_PROGRAMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {fieldErrors.degreeProgram && <p className="mt-1 text-xs text-red-600">{fieldErrors.degreeProgram}</p>}
            </div>

            {/* 5. Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
                Bio <span className="text-red-500">*</span>
              </label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                placeholder="Give us a quick snapshot of your background, experience, or any personal interests — we'll cover what you're looking for in connections later!"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition resize-none ${fieldErrors.bio ? 'border-red-400' : 'border-gray-300'}`}
              />
              <div className="flex justify-between mt-1">
                {fieldErrors.bio ? <p className="text-xs text-red-600">{fieldErrors.bio}</p> : <span />}
                <p className={`text-xs ${500 - bio.length < 20 ? 'text-red-500' : 500 - bio.length < 100 ? 'text-orange-400' : 'text-gray-400'}`}>{500 - bio.length} characters remaining</p>
              </div>
            </div>

            {/* 6. Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map((skill) => {
                  const selected = skills.includes(skill)
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleItem(skills, setSkills, skill)}
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
              {fieldErrors.skills && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.skills}</p>}
            </div>

            {/* 7. Industry interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry interests (choose up to 6) <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((industry) => {
                  const selected = industries.includes(industry)
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
              {industryCapMessage && <p className="mt-1.5 text-xs text-gray-500">Maximum 6 industries selected</p>}
              {fieldErrors.industries && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.industries}</p>}
            </div>

            {/* 8. Industry openness */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry openness <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-2">
                {INDUSTRY_OPENNESS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIndustryOpenness(opt.value === industryOpenness ? '' : opt.value)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
                      industryOpenness === opt.value
                        ? 'bg-brand border-brand text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-brand hover:text-brand'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {fieldErrors.industryOpenness && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.industryOpenness}</p>}
            </div>

            {/* 9. Role orientation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role orientation <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLE_ORIENTATIONS.map((role) => {
                  const selected = roleOrientation.includes(role)
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleItem(roleOrientation, setRoleOrientation, role)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                        selected
                          ? 'bg-brand border-brand text-white'
                          : 'bg-white border-gray-300 text-gray-600 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {role}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 10. Looking for */}
            <div>
              <label htmlFor="lookingFor" className="block text-sm font-medium text-gray-700 mb-1.5">
                What are you looking for? <span className="text-red-500">*</span>
              </label>
              <textarea
                id="lookingFor"
                rows={3}
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                maxLength={500}
                placeholder="Describe specifically what you're hoping to get out of Venn — a co-founder, a collaborator, industry intros, feedback on your idea, etc."
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition resize-none ${fieldErrors.lookingFor ? 'border-red-400' : 'border-gray-300'}`}
              />
              <div className="flex justify-between mt-1">
                {fieldErrors.lookingFor ? <p className="text-xs text-red-600">{fieldErrors.lookingFor}</p> : <span />}
                <p className={`text-xs ${500 - lookingFor.length < 20 ? 'text-red-500' : 500 - lookingFor.length < 100 ? 'text-orange-400' : 'text-gray-400'}`}>{500 - lookingFor.length} characters remaining</p>
              </div>
            </div>

            {/* 11. Slack Member ID */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label htmlFor="slackHandle" className="text-sm font-medium text-gray-700">
                  Slack Member ID <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative group">
                  <button
                    type="button"
                    tabIndex={-1}
                    className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs font-medium flex items-center justify-center hover:bg-gray-300 transition flex-shrink-0"
                  >
                    ?
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg px-3 py-2.5 leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition z-10">
                    Go to Slack → open your profile → click the three-dot menu (•••) → click &ldquo;Copy member ID&rdquo;. Your ID starts with &ldquo;U&rdquo; and is different from your display name or handle.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              </div>
              <input
                id="slackHandle"
                type="text"
                value={slackHandle}
                onChange={(e) => setSlackHandle(e.target.value)}
                placeholder="e.g. UUA000B10"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>

            {/* 12. Co-founder interest */}
            <div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-sm font-medium text-gray-700">Interested in finding a co-founder?</p>
                <button
                  type="button"
                  onClick={() => setCofounderInterest(!cofounderInterest)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                    cofounderInterest ? 'bg-brand' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      cofounderInterest ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 12. Matching opt-in — hidden for now, restore when needed */}
            {/* <div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-sm font-medium text-gray-700">Receive weekly match suggestions</p>
                <button
                  type="button"
                  onClick={() => setMatchingOptIn(!matchingOptIn)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                    matchingOptIn ? 'bg-brand' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      matchingOptIn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div> */}

            {/* Pause matching */}
            <div>
              {(() => {
                const isPaused = !!matchingPausedUntil && new Date(matchingPausedUntil) > new Date()
                return (
                  <div>
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                      <p className="text-sm font-medium text-gray-700">Pause matching</p>
                      <button
                        type="button"
                        onClick={handlePauseToggle}
                        disabled={pauseLoading}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 ${
                          isPaused ? 'bg-brand' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                            isPaused ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <p className="mt-1.5 px-1 text-xs text-gray-500">
                      {isPaused
                        ? `Your matches are paused until ${new Date(matchingPausedUntil!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Toggle off to resume early.`
                        : 'Turn on to pause your matches for 30 days.'}
                    </p>
                    <p className="mt-1 px-1 text-xs text-gray-400">Changes take effect immediately.</p>
                  </div>
                )
              })()}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>

            {/* Deactivate account */}
            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm font-medium text-gray-700 mb-1">Deactivate account</p>
              <p className="text-sm text-gray-500 mb-4">
                Deactivating your account will remove you from Venn matching and hide your profile from other students. Your data will be preserved and you can reactivate at any time.
              </p>

              {deactivateStep === 'idle' ? (
                <button
                  type="button"
                  onClick={() => setDeactivateStep('confirm')}
                  className="px-3.5 py-1.5 rounded-lg border border-red-300 text-sm text-red-600 hover:border-red-400 hover:bg-red-50 transition"
                >
                  Deactivate account
                </button>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-3">
                  <p className="text-sm text-red-700 font-medium">
                    Are you sure? This will pause all your matches and hide your profile.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDeactivate}
                      disabled={deactivateLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition"
                    >
                      {deactivateLoading ? 'Deactivating…' : 'Yes, deactivate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeactivateStep('idle')}
                      className="text-sm text-gray-600 hover:text-gray-800 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
