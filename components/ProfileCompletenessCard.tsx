'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { calculateCompleteness, CompletenessBreakdown } from '@/lib/completeness'

const MISSING_LABELS: Partial<Record<keyof CompletenessBreakdown, string>> = {
  full_name:            'Add your full name (+5 pts)',
  bio:                  'Write a bio (50+ characters) (+10 pts)',
  skills:               'Add at least one skill (+8 pts)',
  industries:           'Add at least one industry interest (+8 pts)',
  industry_openness:    'Set your industry openness (+7 pts)',
  looking_for:          "Add what you're looking for (100+ chars) (+12 pts)",
  graduation_year:      'Set your graduation year (+5 pts)',
  degree_program:       'Set your degree program (+5 pts)',
  avatar_url:           'Add a photo (+5 pts)',
  role_orientation:     'Add your role orientation (+8 pts)',
  personality_quiz:     'Complete the personality quiz (+15 pts)',
  looking_for_extended: "Expand 'Looking for' to 200+ characters (+7 pts)",
  industries_breadth:   'Add 3+ industry interests (+5 pts)',
}

// SVG circle progress (r=26, so circumference ≈ 163.4)
const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ProfileCompletenessCard({ userId }: { userId: string | null }) {
  const [score, setScore] = useState<number | null>(null)
  const [missing, setMissing] = useState<string[]>([])

  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('full_name, bio, skills, industries, industry_openness, looking_for, graduation_year, degree_program, avatar_url, role_orientation, personality_quiz')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const result = calculateCompleteness(data as Record<string, unknown>)
        setScore(result.score)
        const missingItems = (Object.keys(result.breakdown) as (keyof CompletenessBreakdown)[])
          .filter((key) => result.breakdown[key] === 0 && key in MISSING_LABELS)
          .map((key) => MISSING_LABELS[key]!)
        setMissing(missingItems)
      })
  }, [userId])

  if (score === null) return null

  const offset = CIRCUMFERENCE * (1 - score / 100)

  let statusMessage: string
  let showButton: boolean
  let buttonLabel: string

  if (score < 60) {
    statusMessage = 'Complete your profile to unlock matching'
    showButton = true
    buttonLabel = 'Complete Profile'
  } else if (score < 75) {
    statusMessage = "You're in the match pool! Add more to improve your matches"
    showButton = true
    buttonLabel = 'Improve Profile'
  } else if (score < 90) {
    statusMessage = 'Great profile! A few more details could help'
    showButton = true
    buttonLabel = 'Improve Profile'
  } else {
    statusMessage = "Your profile is complete — you're getting the best matches possible"
    showButton = false
    buttonLabel = ''
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-4">
        {/* Circular progress */}
        <div className="flex-shrink-0 relative w-16 h-16">
          <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
            {/* Track */}
            <circle
              cx="32" cy="32" r={RADIUS}
              fill="none"
              stroke="#f3f0f8"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="32" cy="32" r={RADIUS}
              fill="none"
              stroke="#4E2A84"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-800">
            {score}
          </span>
        </div>

        {/* Status + button */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 leading-snug">{statusMessage}</p>
          {showButton && (
            <Link
              href="/profile/edit"
              className="mt-2 inline-block rounded-lg bg-[#4E2A84] hover:bg-[#3d2169] text-white text-xs font-medium px-3 py-1.5 transition"
            >
              {buttonLabel}
            </Link>
          )}
        </div>
      </div>

      {/* Missing items checklist */}
      {missing.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-gray-100 pt-4">
          {missing.map((label) => (
            <li key={label} className="flex items-start gap-2 text-xs text-gray-500">
              <span className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border border-gray-300 bg-white" />
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
