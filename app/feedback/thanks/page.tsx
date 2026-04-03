'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function FeedbackThanksPage() {
  const searchParams = useSearchParams()
  const vote    = searchParams.get('vote') as 'up' | 'down' | null
  const matchId = searchParams.get('match_id')
  const side    = searchParams.get('side')

  const [reason, setReason]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving]     = useState(false)

  const message = vote === 'up'
    ? "Glad that was helpful! We'll keep finding you great connections."
    : "Thanks for letting us know. We'll use your feedback to improve your matches."

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim() || !matchId || !side) return
    setSaving(true)
    await fetch('/api/feedback/reason', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: matchId, side, reason: reason.trim() }),
    })
    setSaving(false)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-[#f0f0ed] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e0ddd8] shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#e8e5e0]">
          <div className="flex items-center gap-2">
            <svg width="38" height="22" viewBox="-2 -2 42 26" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="10" stroke="#1E3A5F" strokeWidth="1.8" fill="none" />
              <circle cx="27" cy="11" r="10" stroke="#1E3A5F" strokeWidth="1.8" fill="none" />
            </svg>
            <span
              style={{ fontFamily: "'Trebuchet MS', Arial, sans-serif" }}
              className="text-xl font-bold text-[#1E3A5F]"
            >
              Venn
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          {/* Vote icon */}
          <div className="text-4xl mb-4">{vote === 'up' ? '👍' : '👎'}</div>

          {/* Thank you message */}
          <p className="text-xl font-semibold text-[#1a1a1a] mb-6 leading-snug">
            {message}
          </p>

          {/* Reason form */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="mb-6">
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-[#555] mb-2"
              >
                Want to add anything? <span className="text-[#999] font-normal">(optional)</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Any additional thoughts..."
                className="w-full rounded-lg border border-[#e0ddd8] px-3 py-2 text-sm text-[#1a1a1a]
                           placeholder:text-[#bbb] focus:outline-none focus:ring-2
                           focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] resize-none"
              />
              <button
                type="submit"
                disabled={!reason.trim() || saving}
                className="mt-3 px-5 py-2 rounded-full bg-[#1E3A5F] text-white text-sm font-bold
                           disabled:opacity-40 hover:bg-[#16304f] transition-colors"
              >
                {saving ? 'Saving…' : 'Submit'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-[#888] mb-6">Thanks — your note was saved.</p>
          )}

          {/* Dashboard link */}
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2.5 rounded-full border border-[#1E3A5F] text-[#1E3A5F]
                       text-sm font-bold hover:bg-[#1E3A5F] hover:text-white transition-colors"
          >
            Go to your matches
          </Link>
        </div>

      </div>
    </div>
  )
}
