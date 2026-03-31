'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { calculateCompleteness, CompletenessBreakdown } from '@/lib/completeness'

// looking_for and looking_for_extended are handled separately (mutually exclusive display)
const MISSING_LABELS: Partial<Record<keyof CompletenessBreakdown, string>> = {
  full_name:          'Add your full name',
  bio:                'Write a longer bio',
  skills:             'Add at least one skill',
  industries:         'Add at least one industry interest',
  industry_openness:  'Set your industry openness',
  graduation_year:    'Set your graduation year',
  degree_program:     'Set your degree program',
  avatar_url:         'Add a photo',
  role_orientation:   'Add your role orientation',
  personality_quiz:   'Complete the Founder Personality Quiz',
  industries_breadth: 'Add 3+ industry interests',
}

const MISSING_HREFS: Partial<Record<keyof CompletenessBreakdown, string>> = {}

type MissingItem = { label: string; href?: string; onClick?: () => void }

// SVG circle progress (r=26, so circumference ≈ 163.4)
const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ProfileCompletenessCard({
  userId,
  onQuizOpen,
  refreshTrigger = 0,
}: {
  userId: string | null
  onQuizOpen?: () => void
  refreshTrigger?: number
}) {
  const [score, setScore] = useState<number | null>(null)
  const [missing, setMissing] = useState<MissingItem[]>([])

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
        const missingItems: MissingItem[] = (Object.keys(result.breakdown) as (keyof CompletenessBreakdown)[])
          .filter((key) => result.breakdown[key] === 0 && key in MISSING_LABELS)
          .map((key) => {
            if (key === 'personality_quiz') {
              const pq = data.personality_quiz
              let progressLabel: string
              if (pq == null || typeof pq !== 'object' || Array.isArray(pq)) {
                progressLabel = 'Not started'
              } else {
                const answered = Object.values(pq as Record<string, unknown>)
                  .filter((v) => v !== null && v !== undefined && v !== '').length
                progressLabel = `${answered}/12 answered`
              }
              const label = `Complete the Founder Personality Quiz — ${progressLabel}`
              return onQuizOpen ? { label, onClick: onQuizOpen } : { label }
            }
            return { label: MISSING_LABELS[key]!, href: MISSING_HREFS[key] }
          })

        // Partial quiz completion (6–10 answers = 7pts): prompt to answer more
        if (result.breakdown.personality_quiz === 7) {
          const partialLabel = 'Answer more Founder Personality Quiz questions to improve your score'
          missingItems.push(onQuizOpen ? { label: partialLabel, onClick: onQuizOpen } : { label: partialLabel })
        }

        // looking_for / looking_for_extended are mutually exclusive: only show one
        const lf = typeof data.looking_for === 'string' ? data.looking_for : ''
        if (lf.length < 100) {
          missingItems.push({ label: "Tell us what you're looking for in connections" })
        } else if (lf.length < 200) {
          missingItems.push({ label: "Expand your 'Looking for' response with more detail" })
        }

        setMissing(missingItems)
      })
  }, [userId, refreshTrigger, onQuizOpen])

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
  } else if (score < 100) {
    statusMessage = "Your profile is looking great — you're getting strong matches"
    showButton = false
    buttonLabel = ''
  } else {
    statusMessage = "Your profile is complete — you're getting the best matches possible"
    showButton = false
    buttonLabel = ''
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 h-full">
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
            {score}%
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
          {missing.map(({ label, href, onClick }) => (
            <li key={label} className="flex items-start gap-2 text-xs text-gray-500">
              <span className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border border-gray-300 bg-white" />
              {onClick ? (
                <button onClick={onClick} className="text-left hover:text-[#4E2A84] hover:underline transition-colors">
                  {label}
                </button>
              ) : href ? (
                <Link href={href} className="hover:text-[#4E2A84] hover:underline transition-colors">
                  {label}
                </Link>
              ) : (
                label
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
