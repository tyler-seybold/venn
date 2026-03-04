'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.endsWith('@kellogg.northwestern.edu')) {
      setError('Please use your @kellogg.northwestern.edu email address.')
      return
    }

    setLoading(true)
    const { error: otpError } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)

    if (otpError) {
      setError(otpError.message)
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Kellogg Student Ventures
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in with your Kellogg .edu email
            </p>
          </div>

          {success ? (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-center">
              <p className="text-sm font-medium text-green-800">
                Check your email for a sign-in link
              </p>
              <p className="mt-1 text-xs text-green-600">
                Sent to {email}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  placeholder="you@kellogg.northwestern.edu"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
