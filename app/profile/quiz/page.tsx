'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { calculateCompleteness } from '@/lib/completeness'

type ChoiceQuestion = {
  type: 'choice'
  id: string
  text: string
  a: string
  b: string
}

type TextQuestion = {
  type: 'text'
  id: string
  text: string
  placeholder: string
}

type Question = ChoiceQuestion | TextQuestion

const QUESTIONS: Question[] = [
  {
    type: 'choice', id: 'q1',
    text: 'You do your best thinking...',
    a: 'Alone, before talking to anyone',
    b: 'By talking it through out loud with someone',
  },
  {
    type: 'choice', id: 'q2',
    text: 'When an urgent problem comes up mid-week, you...',
    a: "Drop what you're doing and attack it",
    b: 'Finish what you\'re working on first, then address it',
  },
  {
    type: 'choice', id: 'q3',
    text: 'Your default response to ambiguity is to...',
    a: 'Start doing something and figure it out',
    b: 'Gather more information before moving',
  },
  {
    type: 'choice', id: 'q4',
    text: "You'd rather spend a week...",
    a: "Building a product no one has seen yet",
    b: 'Talking to 50 potential customers',
  },
  {
    type: 'choice', id: 'q5',
    text: 'The part of building a company that excites you most...',
    a: 'Creating something from nothing',
    b: "Scaling something that's working",
  },
  {
    type: 'choice', id: 'q6',
    text: 'What drives you more...',
    a: 'Building something that makes a lot of money',
    b: 'Building something that changes how people live or work',
  },
  {
    type: 'choice', id: 'q7',
    text: 'Your ideal co-founder dynamic...',
    a: 'We own completely separate domains',
    b: 'We overlap constantly and make decisions together',
  },
  {
    type: 'choice', id: 'q8',
    text: "You'd rather work with someone who...",
    a: 'Challenges you and pushes back often',
    b: 'Is aligned with you and executes reliably',
  },
  {
    type: 'choice', id: 'q9',
    text: 'When you get negative feedback on your idea...',
    a: "You're energized — now you know what to fix",
    b: "You step back and reassess whether you're on the right track",
  },
  {
    type: 'choice', id: 'q10',
    text: 'Under pressure, you...',
    a: 'Get more focused and push harder',
    b: 'Step back, regroup, then re-engage',
  },
  {
    type: 'text', id: 'q11',
    text: "What do you bring to a founding team that isn't on your resume?",
    placeholder: '1–2 sentences',
  },
  {
    type: 'text', id: 'q12',
    text: 'What does your ideal working relationship look like?',
    placeholder: '1–2 sentences',
  },
]

const TOTAL = QUESTIONS.length

export default function QuizPage() {
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [textInput, setTextInput] = useState('')
  const [visible, setVisible] = useState(true)
  const [selected, setSelected] = useState<'A' | 'B' | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login')
      else { setUserId(data.user.id); setAuthChecked(true) }
    })
  }, [router])

  function advance(newAnswers: Record<string, string>) {
    const nextStep = step + 1
    setVisible(false)
    setTimeout(() => {
      if (nextStep === TOTAL) saveQuiz(newAnswers)
      setStep(nextStep)
      setTextInput('')
      setSelected(null)
      setVisible(true)
    }, 200)
  }

  function handleChoice(value: 'A' | 'B') {
    if (selected) return
    const q = QUESTIONS[step] as ChoiceQuestion
    const newAnswers = { ...answers, [q.id]: value }
    setAnswers(newAnswers)
    setSelected(value)
    setTimeout(() => advance(newAnswers), 160)
  }

  function handleText() {
    if (!textInput.trim()) return
    const q = QUESTIONS[step] as TextQuestion
    const newAnswers = { ...answers, [q.id]: textInput.trim() }
    setAnswers(newAnswers)
    advance(newAnswers)
  }

  async function saveQuiz(finalAnswers: Record<string, string>) {
    if (!userId) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, bio, skills, industries, industry_openness, looking_for, graduation_year, degree_program, avatar_url, role_orientation')
      .eq('user_id', userId)
      .single()

    const { score } = calculateCompleteness({
      ...(profile ?? {}),
      personality_quiz: finalAnswers,
    } as Record<string, unknown>)

    await supabase
      .from('profiles')
      .update({ personality_quiz: finalAnswers, completeness_score: score })
      .eq('user_id', userId)
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#4E2A84] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Completion screen
  if (step === TOTAL) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#4E2A84] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">You&apos;re all set!</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Your answers help us find better matches for you.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-[#4E2A84] hover:bg-[#3d2169] text-white font-medium px-6 py-2.5 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const question = QUESTIONS[step]
  const progressPct = (step / TOTAL) * 100

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">

        {/* Back link */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-10 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Question {step + 1} of {TOTAL}
            </span>
            <span className="text-xs text-gray-400">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4E2A84] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question content */}
        <div
          className="transition-opacity duration-200"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-8 leading-snug">
            {question.text}
          </h2>

          {question.type === 'choice' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['A', 'B'] as const).map((opt) => {
                const label = opt === 'A' ? (question as ChoiceQuestion).a : (question as ChoiceQuestion).b
                const isSelected = selected === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleChoice(opt)}
                    disabled={!!selected}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#4E2A84] border-[#4E2A84] text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#4E2A84] hover:bg-[#faf8ff] hover:shadow-sm'
                    }`}
                  >
                    <span className="text-sm font-medium leading-relaxed">{label}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div>
              <textarea
                rows={4}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={(question as TextQuestion).placeholder}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4E2A84] focus:border-transparent resize-none transition"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleText()
                }}
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleText}
                  disabled={!textInput.trim()}
                  className="rounded-lg bg-[#4E2A84] hover:bg-[#3d2169] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium px-6 py-2.5 transition"
                >
                  {step === TOTAL - 1 ? 'Finish' : 'Next'}
                </button>
                <span className="text-xs text-gray-400">⌘↵ to continue</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
