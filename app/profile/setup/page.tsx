'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calculateCompleteness } from '@/lib/completeness'

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

const COMPLETENESS_LABELS: Record<string, string> = {
  full_name:            'Full name',
  bio:                  'Bio (at least 50 characters)',
  skills:               'Skills',
  industries:           'Industry interests',
  industry_openness:    'Industry openness',
  looking_for:          'What you\'re looking for (at least 100 characters)',
  graduation_year:      'Graduation year',
  degree_program:       'Degree program',
  avatar_url:           'Profile photo',
  role_orientation:     'Role orientation',
  looking_for_extended: 'Expand "what you\'re looking for" to 200+ characters',
  industries_breadth:   'Select at least 3 industry interests',
}

export default function ProfileSetupPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

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
  const [cofounderInterest, setCofounderInterest] = useState(false)

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [nudgeScore, setNudgeScore] = useState(0)
  const [nudgeMissingItems, setNudgeMissingItems] = useState<string[]>([])

  const avatarInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login')
      } else {
        setUserId(data.user.id)
        setUserEmail(data.user.email ?? null)
        setAuthChecked(true)
      }
    })
  }, [router])

  const [industryCapMessage, setIndustryCapMessage] = useState(false)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')

    const errors: Record<string, string> = {}
    if (!graduationYear || graduationYear.length !== 4) errors.graduationYear = 'Enter a 4-digit graduation year.'
    if (!degreeProgram) errors.degreeProgram = 'Select a degree program.'
    if (!bio.trim()) errors.bio = 'Bio is required.'
    if (skills.length === 0) errors.skills = 'Select at least one skill.'
    if (industries.length === 0) errors.industries = 'Select at least one industry.'
    if (!industryOpenness) errors.industryOpenness = 'Select an option.'
    if (!lookingFor.trim()) errors.lookingFor = 'This field is required.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setLoading(true)

    let avatarUrl: string | null = null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`)
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
    const { score, breakdown } = calculateCompleteness(profileData)

    const { error: insertError } = await supabase.from('profiles').insert({
      user_id:            userId,
      email:              userEmail,
      ...profileData,
      cofounder_interest: cofounderInterest,
      matching_opt_in:    true,
      completeness_score: score,
    })

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
    } else {
      if (lookingFor.trim()) {
        fetch('/api/inference/intent-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ looking_for: lookingFor.trim(), user_id: userId }),
        }).catch(() => {})
      }

      const missingItems = (Object.keys(breakdown) as (keyof typeof breakdown)[])
        .filter((key) => key !== 'personality_quiz' && breakdown[key] === 0)
        .map((key) => COMPLETENESS_LABELS[key])
        .filter(Boolean) as string[]

      if (missingItems.length > 0) {
        setNudgeScore(score)
        setNudgeMissingItems(missingItems)
        setNudgeOpen(true)
      } else {
        router.push('/onboarding/startup')
      }
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">

      {/* Completeness nudge modal */}
      {nudgeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setNudgeOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 px-8 py-8 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Your profile is looking good!</h2>
            <p className="text-sm text-gray-500 mb-5">
              Your profile is{' '}
              <span className="font-semibold text-brand">{nudgeScore}% complete</span>.
              {' '}Adding a few more details will improve your matches.
            </p>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Missing items</p>
            <ul className="space-y-1.5 mb-7">
              {nudgeMissingItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setNudgeOpen(false)}
                className="w-full rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium py-2.5 transition"
              >
                Improve My Profile
              </button>
              <button
                onClick={() => router.push('/onboarding/startup')}
                className="w-full rounded-lg border border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm font-medium py-2.5 transition"
              >
                Keep Going
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Set Up Your Profile</h1>
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
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
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

            {/* 2. Anticipated graduation year */}
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

            {/* 3. Degree program */}
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

            {/* 4. Bio */}
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

            {/* 5. Skills */}
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

            {/* 6. Industry interests */}
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

            {/* 7. Industry openness */}
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

            {/* 8. Role orientation */}
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

            {/* 9. Looking for */}
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

            {/* 10. Co-founder interest */}
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
              <p className="mt-2 text-xs text-gray-400">Already have a startup? You'll add it on the next page!</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              {loading ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
