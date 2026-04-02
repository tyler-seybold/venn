'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Step = 'email' | 'code' | 'reactivate'

export default function LoginPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reactivateUserId, setReactivateUserId] = useState<string | null>(null)

  // ── Step 1: send OTP ────────────────────────────────────────
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.endsWith('@kellogg.northwestern.edu')) {
      setError('Please use your @kellogg.northwestern.edu email address.')
      return
    }

    setLoading(true)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setLoading(false)

    if (otpError) {
      setError(otpError.message)
    } else {
      setStep('code')
    }
  }

  // ── Step 2: verify OTP ──────────────────────────────────────
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    if (verifyError || !data.session) {
      setLoading(false)
      setError(verifyError?.message ?? 'Verification failed. Please try again.')
      return
    }

    const userId = data.session.user.id
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, is_deactivated')
      .eq('user_id', userId)
      .maybeSingle()

    setLoading(false)

    if (!profile) {
      router.push('/profile/setup')
    } else if (profile.is_deactivated) {
      setReactivateUserId(userId)
      setStep('reactivate')
    } else {
      router.push('/dashboard')
    }
  }

  async function handleReactivate() {
    if (!reactivateUserId) return
    setLoading(true)
    await supabase
      .from('profiles')
      .update({ is_deactivated: false, matching_opt_in: true })
      .eq('user_id', reactivateUserId)
    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Venn
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in with your Kellogg .edu email
            </p>
          </div>

          {step === 'reactivate' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Your account is deactivated. Would you like to reactivate?
              </p>
              <p className="text-xs text-gray-500">
                Reactivating will restore your profile and re-enable weekly match suggestions.
              </p>
              <button
                type="button"
                onClick={handleReactivate}
                disabled={loading}
                className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                {loading ? 'Reactivating…' : 'Reactivate account'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Continue without reactivating
              </button>
            </div>
          ) : step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="you@kellogg.northwestern.edu"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                {loading ? 'Sending…' : 'Send Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <p className="text-sm text-green-800">
                  We sent an 8-digit code to <span className="font-medium">{email}</span>
                </p>
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Verification code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={8}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
                  placeholder="00000000"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 tracking-widest focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || code.length !== 8}
                className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setError('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
