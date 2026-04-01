'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

const DEGREE_PROGRAMS = [
  '1Y', '2Y', 'EMBA', 'Evening & Weekend (E&W)', 'Exchange Student',
  'JD/MBA', 'MBAi', 'MD/MBA', 'MMM',
]

export default function AdminProfileEditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [dataLoaded, setDataLoaded] = useState(false)
  const [targetEmail, setTargetEmail] = useState<string | null>(null)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)

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
  const [matchingOptIn, setMatchingOptIn] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Avatar state
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

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

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }

      // Verify admin
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', data.user.id)
        .single()

      if (!callerProfile?.is_admin) {
        router.replace('/dashboard')
        return
      }

      // Load target profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single()

      if (fetchError || !profile) {
        router.replace('/admin')
        return
      }

      setTargetUserId(profile.user_id)
      setTargetEmail(profile.email)
      setFullName(profile.full_name ?? '')
      setGraduationYear(profile.graduation_year ? String(profile.graduation_year) : '')
      setDegreeProgram(profile.degree_program ?? '')
      setBio(profile.bio ?? '')
      setSkills(profile.skills ?? [])
      setIndustries(profile.industries ?? [])
      setIndustryOpenness(profile.industry_openness ?? '')
      setRoleOrientation(profile.role_orientation ?? [])
      setLookingFor(profile.looking_for ?? '')
      setCofounderInterest(profile.cofounder_interest ?? false)
      setMatchingOptIn(profile.matching_opt_in ?? true)
      setIsAdmin(profile.is_admin ?? false)
      setExistingAvatarUrl(profile.avatar_url ?? null)
      setAvatarPreview(profile.avatar_url ?? null)
      setDataLoaded(true)
    })
  }, [id, router])

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
    if (!targetUserId) return
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

    let avatarUrl: string | null = existingAvatarUrl
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${targetUserId}/${Date.now()}.${ext}`
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
    const { score } = calculateCompleteness(profileData)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        cofounder_interest:  cofounderInterest,
        matching_opt_in:     matchingOptIn,
        is_admin:            isAdmin,
        completeness_score:  score,
      })
      .eq('user_id', targetUserId)

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      router.push('/admin')
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
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Admin
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Edit Profile</h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Admin</span>
            </div>
            <p className="text-sm text-gray-500">{targetEmail}</p>
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

            {/* 3. Graduation year */}
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
                placeholder="A short intro about yourself…"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition resize-none ${fieldErrors.bio ? 'border-red-400' : 'border-gray-300'}`}
              />
              {fieldErrors.bio && <p className="mt-1 text-xs text-red-600">{fieldErrors.bio}</p>}
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
                placeholder="Describe specifically what you're hoping to get out of Venn — a co-founder, a collaborator, industry intros, feedback on your idea, etc."
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition resize-none ${fieldErrors.lookingFor ? 'border-red-400' : 'border-gray-300'}`}
              />
              {fieldErrors.lookingFor && <p className="mt-1 text-xs text-red-600">{fieldErrors.lookingFor}</p>}
            </div>

            {/* 11. Co-founder interest */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-sm font-medium text-gray-700">Interested in finding a co-founder?</p>
              <button
                type="button"
                onClick={() => setCofounderInterest(!cofounderInterest)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                  cofounderInterest ? 'bg-brand' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${cofounderInterest ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* 12. Matching opt-in */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-sm font-medium text-gray-700">Receive weekly match suggestions</p>
              <button
                type="button"
                onClick={() => setMatchingOptIn(!matchingOptIn)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${
                  matchingOptIn ? 'bg-brand' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${matchingOptIn ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* 13. Admin toggle (admin-only) */}
            <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Admin access</p>
                <p className="text-xs text-gray-400 mt-0.5">Grants access to the admin panel</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdmin(!isAdmin)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                  isAdmin ? 'bg-red-500' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${isAdmin ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
