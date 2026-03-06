'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const INDUSTRIES = [
  'Apparel',
  'Business Services',
  'Climate',
  'Consumer Products',
  'Consumer Services',
  'Education',
  'Energy',
  'Financial Services',
  'Fintech',
  'Food & Beverage',
  'Gaming',
  'Health & Wellness',
  'Healthcare',
  'Logistics',
  'Media',
  'Medical Devices',
  'Real Estate / PropTech',
  'Social Impact',
  'Technology',
  'Travel & Hospitality',
]

const DEGREE_PROGRAMS = [
  '1Y',
  '2Y',
  'EMBA',
  'Evening & Weekend (E&W)',
  'Exchange Student',
  'JD/MBA',
  'MBAi',
  'MD/MBA',
  'MMM',
]

export default function ProfileEditPage() {
  const router = useRouter()

  // Auth state
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [degreeProgram, setDegreeProgram] = useState('')
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [slackHandle, setSlackHandle] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [industries, setIndustries] = useState<string[]>([])
  const [isLooking, setIsLooking] = useState(false)
  const [isFounder, setIsFounder] = useState(false)
  const [myStartup, setMyStartup] = useState<{ id: string; startup_name: string; stage: string | null; logo_url: string | null } | null>(null)

  // Submission state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      const [{ data: profile }, { data: startupData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', uid).single(),
        supabase
          .from('startups')
          .select('id, startup_name, stage, logo_url')
          .eq('founder_id', uid)
          .limit(1)
          .maybeSingle(),
      ])

      if (startupData) {
        setMyStartup(startupData)
        setIsFounder(true)
      }

      if (profile) {
        setFullName(profile.full_name ?? '')
        setGraduationYear(profile.graduation_year ? String(profile.graduation_year) : '')
        setDegreeProgram(profile.degree_program ?? '')
        setExistingAvatarUrl(profile.avatar_url ?? null)
        setAvatarPreview(profile.avatar_url ?? null)
        setBio(profile.bio ?? '')
        setSlackHandle(profile.slack_handle ?? '')
        setSkills(profile.skills ?? [])
        setIndustries(profile.industries_of_interest ?? [])
        setIsLooking(profile.is_looking_for_startup ?? false)
      }

      setDataLoaded(true)
    })
  }, [router])

  // ── Skills tag input ──────────────────────────────────────────

  function addSkill() {
    const trimmed = skillInput.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed])
    }
    setSkillInput('')
  }

  function handleSkillKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill()
    }
    if (e.key === 'Backspace' && skillInput === '' && skills.length > 0) {
      setSkills(skills.slice(0, -1))
    }
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill))
  }

  // ── Industry toggle ───────────────────────────────────────────

  function toggleIndustry(industry: string) {
    setIndustries((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    )
  }

  // ── Submit ────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError('')
    setLoading(true)

    let avatarUrl: string | null = existingAvatarUrl
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

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        graduation_year: graduationYear ? parseInt(graduationYear, 10) : null,
        degree_program: degreeProgram || null,
        avatar_url: avatarUrl,
        bio: bio || null,
        slack_handle: slackHandle || null,
        skills: skills.length > 0 ? skills : null,
        industries_of_interest: industries.length > 0 ? industries : null,
        is_looking_for_startup: isLooking,
      })
      .eq('user_id', userId)

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      router.push('/dashboard')
    }
  }

  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
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
              Edit Profile
            </h1>
            <p className="mt-1 text-sm text-gray-500">{userEmail}</p>
          </div>

          {/* Your Startup */}
          {myStartup && (
            <div
              onClick={() => router.push(`/startup/${myStartup.id}`)}
              className="mb-8 rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-purple-200 hover:bg-gray-50 transition"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Your Startup</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 truncate">{myStartup.startup_name}</span>
                  {myStartup.stage && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {myStartup.stage}
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full name */}
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
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Photo <span className="text-gray-400 font-normal">(optional)</span>
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
                      className="text-sm text-purple-600 hover:text-purple-800 transition"
                    >
                      Change
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition"
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

            {/* Graduation year */}
            <div>
              <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 mb-1.5">
                Graduation year <span className="text-red-500">*</span>
              </label>
              <input
                id="graduationYear"
                type="number"
                required
                min={2000}
                max={2100}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="2026"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Degree program */}
            <div>
              <label htmlFor="degreeProgram" className="block text-sm font-medium text-gray-700 mb-1.5">
                Degree program <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="degreeProgram"
                value={degreeProgram}
                onChange={(e) => setDegreeProgram(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition bg-white"
              >
                <option value="">Select a program…</option>
                {DEGREE_PROGRAMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1.5">
                Bio <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short intro about yourself…"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
              />
            </div>

            {/* Slack handle */}
            <div>
              <label htmlFor="slackHandle" className="block text-sm font-medium text-gray-700 mb-1.5">
                Slack handle <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="slackHandle"
                type="text"
                value={slackHandle}
                onChange={(e) => setSlackHandle(e.target.value)}
                placeholder="Your Slack User ID (e.g. U0000000000)"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Skills <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="w-full min-h-[42px] rounded-lg border border-gray-300 px-3 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-md"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-purple-600 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  onBlur={addSkill}
                  placeholder={skills.length === 0 ? 'Type a skill and press Enter…' : ''}
                  className="flex-1 min-w-[140px] text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Press Enter or comma to add a skill</p>
            </div>

            {/* Industries */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industries of interest <span className="text-gray-400 font-normal">(optional)</span>
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

            {/* Looking for startup toggle */}
            <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${isFounder ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}>
              <div>
                <p className={`text-sm font-medium ${isFounder ? 'text-gray-400' : 'text-gray-700'}`}>Looking to join a startup?</p>
                {isFounder ? (
                  <p className="text-xs text-gray-400 mt-0.5">Disabled — automatically off for founders</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Founders can find and reach out to you</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => !isFounder && setIsLooking(!isLooking)}
                disabled={isFounder}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  isFounder ? 'bg-gray-200 cursor-not-allowed' : isLooking ? 'bg-purple-700' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    !isFounder && isLooking ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
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
