'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function QuizNudgePage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login')
      } else {
        setAuthChecked(true)
      }
    })
  }, [router])

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-2 h-2 rounded-full bg-brand-light" />
          <div className="w-2 h-2 rounded-full bg-brand-light" />
          <div className="w-2 h-2 rounded-full bg-brand" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10 text-center">
          {/* Logo mark */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <svg width="38" height="22" viewBox="-2 -2 40 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="10" stroke="#1E3A5F" strokeWidth="1.8" fill="none" />
              <circle cx="27" cy="11" r="10" stroke="#1E3A5F" strokeWidth="1.8" fill="none" />
            </svg>
            <span style={{ fontFamily: "'Trebuchet MS', Arial, sans-serif", fontSize: '18px', fontWeight: 700, color: '#1E3A5F' }}>
              Venn
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-3">
            One more thing — the Founder Personality Quiz
          </h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            Answering a few quick questions helps us find better matches for you. It takes about 2 minutes and you can always finish it later.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium py-3 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              Take the Quiz
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-lg border border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm font-medium py-3 transition focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
