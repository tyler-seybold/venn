'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingStartupPage() {
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
          <div className="w-2 h-2 rounded-full bg-brand" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10 text-center">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-7 h-7 text-brand"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>

          {/* Header */}
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
            Do you have a startup to add?
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            You can always add one later from the dashboard.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/startup/new')}
              className="w-full rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium py-3 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              Add Your Startup
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-lg border border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm font-medium py-3 transition focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
