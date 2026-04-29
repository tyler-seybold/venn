'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getFriendlyError } from '@/lib/errors'

type Step = 'email' | 'method' | 'code' | 'password' | 'reactivate'

export default function LoginPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reactivateUserId, setReactivateUserId] = useState<string | null>(null)

  // ── Step 1: validate email ──────────────────────────────────
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.endsWith('@kellogg.northwestern.edu')) {
      setError('Please use your Kellogg email address.')
      return
    }

    setStep('method')
  }

  async function sendOtp() {
    setError('')
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

  // ── Post-login profile check ────────────────────────────────
  async function handlePostLogin(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, is_deactivated')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) {
      router.push('/profile/setup')
    } else if (profile.is_deactivated) {
      setReactivateUserId(userId)
      setStep('reactivate')
    } else {
      router.push('/dashboard')
    }
  }

  // ── Password sign-in ────────────────────────────────────────
  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !data.session) {
      setLoading(false)
      if (signInError?.code === 'invalid_credentials') {
        setError('Incorrect password. Try signing in with an email code instead.')
      } else {
        setError(getFriendlyError(signInError))
      }
      return
    }

    await handlePostLogin(data.session.user.id)
    setLoading(false)
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

    await handlePostLogin(data.session.user.id)
    setLoading(false)
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
              Sign in with your Kellogg email
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
                className="w-full rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                Continue
              </button>
            </form>
          ) : step === 'method' ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center mb-1">
                How would you like to sign in as <span className="font-medium">{email}</span>?
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="button"
                onClick={sendOtp}
                disabled={loading}
                className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                {loading ? 'Sending…' : 'Email me a code'}
              </button>
              <button
                type="button"
                onClick={() => { setError(''); setStep('password') }}
                className="w-full rounded-lg border border-brand text-brand hover:bg-brand/5 text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                Sign in with password
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setError('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Use a different email
              </button>
            </div>
          ) : step === 'password' ? (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || password.length === 0}
                className="w-full rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-sm font-medium py-2.5 transition focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('method'); setPassword(''); setError('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Use email code instead
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
