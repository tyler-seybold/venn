'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calculateCompleteness } from '@/lib/completeness'

// ── Question data ────────────────────────────────────────────────────────────

type ChoiceQuestion = { type: 'choice'; id: string; text: string; a: string; b: string }
type TextQuestion   = { type: 'text';   id: string; text: string; placeholder: string }
type Question = ChoiceQuestion | TextQuestion

const QUESTIONS: Question[] = [
  { type: 'choice', id: 'q1',  text: 'You do your best thinking...',
    a: 'Alone, before talking to anyone',
    b: 'By talking it through out loud with someone' },
  { type: 'choice', id: 'q2',  text: 'When an urgent problem comes up mid-week, you...',
    a: "Drop what you're doing and attack it",
    b: "Finish what you're working on first, then address it" },
  { type: 'choice', id: 'q3',  text: 'Your default response to ambiguity is to...',
    a: 'Start doing something and figure it out',
    b: 'Gather more information before moving' },
  { type: 'choice', id: 'q4',  text: "You'd rather spend a week...",
    a: 'Building a product no one has seen yet',
    b: 'Talking to 50 potential customers' },
  { type: 'choice', id: 'q5',  text: 'The part of building a company that excites you most...',
    a: 'Creating something from nothing',
    b: "Scaling something that's working" },
  { type: 'choice', id: 'q6',  text: 'What drives you more...',
    a: 'Building something that makes a lot of money',
    b: 'Building something that changes how people live or work' },
  { type: 'choice', id: 'q7',  text: 'Your ideal co-founder dynamic...',
    a: 'We own completely separate domains',
    b: 'We overlap constantly and make decisions together' },
  { type: 'choice', id: 'q8',  text: "You'd rather work with someone who...",
    a: 'Challenges you and pushes back often',
    b: 'Is aligned with you and executes reliably' },
  { type: 'choice', id: 'q9',  text: 'When you get negative feedback on your idea...',
    a: "You're energized — now you know what to fix",
    b: "You step back and reassess whether you're on the right track" },
  { type: 'choice', id: 'q10', text: 'Under pressure, you...',
    a: 'Get more focused and push harder',
    b: 'Step back, regroup, then re-engage' },
  { type: 'text', id: 'q11',
    text: "What do you bring to a founding team that isn't on your resume?",
    placeholder: '1–2 sentences' },
  { type: 'text', id: 'q12',
    text: 'What does your ideal working relationship look like?',
    placeholder: '1–2 sentences' },
]

const TOTAL = QUESTIONS.length
// Steps: 0–11 = questions, 12 = review

// Returns the index of the first unanswered question at or after startIndex,
// or 12 (review) if all remaining questions are answered.
function firstUnansweredFrom(startIndex: number, ans: Record<string, string | null>): number {
  for (let i = startIndex; i < TOTAL; i++) {
    const v = ans[QUESTIONS[i].id]
    if (v === null || v === undefined || v === '') return i
  }
  return 12
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  isOpen: boolean
  onClose: () => void
  userId: string
  onComplete: () => void
}

export default function PersonalityQuizModal({ isOpen, onClose, userId, onComplete }: Props) {
  const [step, setStep]               = useState(0)
  const [answers, setAnswers]         = useState<Record<string, string | null>>({})
  const [textInput, setTextInput]     = useState('')
  const [visible, setVisible]         = useState(true)
  const [selected, setSelected]       = useState<'A' | 'B' | null>(null)
  const [reviewMode, setReviewMode]   = useState(false)
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const savedRef = useRef(false)

  // On open: fetch existing answers to pre-populate, reset nav state.
  // loadingAnswers blocks the question UI from rendering until the fetch
  // settles so answers are never overwritten by a stale empty-state render.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    savedRef.current = false
    setLoadingAnswers(true)
    setStep(0); setTextInput(''); setSelected(null); setReviewMode(false); setVisible(true)
    supabase
      .from('profiles')
      .select('personality_quiz')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        const pq = data?.personality_quiz
        const loaded: Record<string, string | null> =
          pq && typeof pq === 'object' && !Array.isArray(pq)
            ? (pq as Record<string, string | null>)
            : {}
        const startStep = firstUnansweredFrom(0, loaded)
        setAnswers(loaded)
        setStep(startStep)
        setTextInput(
          startStep < TOTAL && QUESTIONS[startStep].type === 'text'
            ? (typeof loaded[QUESTIONS[startStep].id] === 'string' ? (loaded[QUESTIONS[startStep].id] as string) : '')
            : ''
        )
        setLoadingAnswers(false)
      })
    return () => { cancelled = true }
  }, [isOpen, userId])

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  // ── Close wrapper — refreshes completeness card if anything was saved ───────

  function handleClose() {
    if (savedRef.current) onComplete()
    onClose()
  }

  // ── Auto-save after each answer ────────────────────────────────────────────

  async function persistAnswers(newAnswers: Record<string, string | null>) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, bio, skills, industries, industry_openness, looking_for, graduation_year, degree_program, avatar_url, role_orientation')
      .eq('user_id', userId)
      .single()

    const { score } = calculateCompleteness({
      ...(profile ?? {}),
      personality_quiz: newAnswers,
    } as Record<string, unknown>)

    await supabase
      .from('profiles')
      .update({ personality_quiz: newAnswers, completeness_score: score })
      .eq('user_id', userId)

    savedRef.current = true
  }

  // ── Transitions ────────────────────────────────────────────────────────────

  function fade(callback: () => void) {
    setVisible(false)
    setTimeout(() => { callback(); setSelected(null); setVisible(true) }, 200)
  }

  function textInputForStep(stepIndex: number, nextAnswers: Record<string, string | null>): string {
    if (stepIndex < TOTAL && QUESTIONS[stepIndex].type === 'text') {
      const existing = nextAnswers[QUESTIONS[stepIndex].id]
      return typeof existing === 'string' ? existing : ''
    }
    return ''
  }

  function advance(newAnswers: Record<string, string | null>) {
    const nextStep = reviewMode ? 12 : firstUnansweredFrom(step + 1, newAnswers)
    persistAnswers(newAnswers).catch(() => {})
    fade(() => {
      setAnswers(newAnswers)
      setStep(nextStep)
      setReviewMode(false)
      setTextInput(textInputForStep(nextStep, newAnswers))
    })
  }

  function handleChoice(value: 'A' | 'B') {
    if (selected) return
    const q = QUESTIONS[step] as ChoiceQuestion
    setSelected(value)
    setTimeout(() => advance({ ...answers, [q.id]: value }), 160)
  }

  function handleText() {
    if (!textInput.trim()) return
    advance({ ...answers, [QUESTIONS[step].id]: textInput.trim() })
  }

  function handleSkip() {
    const newAnswers = { ...answers, [QUESTIONS[step].id]: null }
    persistAnswers(newAnswers).catch(() => {})
    fade(() => {
      setAnswers(newAnswers)
      const nextStep = reviewMode ? 12 : firstUnansweredFrom(step + 1, newAnswers)
      setStep(nextStep)
      setReviewMode(false)
      setTextInput(textInputForStep(nextStep, newAnswers))
    })
  }

  function jumpToQuestion(index: number) {
    setReviewMode(true)
    fade(() => {
      setStep(index)
      setTextInput(textInputForStep(index, answers))
    })
  }

  // ── Shared chrome ──────────────────────────────────────────────────────────

  function Header({ title }: { title: string }) {
    return (
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-600">{title}</span>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  // ── Review screen ──────────────────────────────────────────────────────────

  if (step === 12) {
    return (
      <Overlay>
        <Card>
          <Header title="Review Your Answers" />
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
            {QUESTIONS.map((q, i) => {
              const answer = answers[q.id]
              const isAnswered = answer !== null && answer !== undefined

              let answerText = ''
              if (isAnswered) {
                if (q.type === 'choice') {
                  answerText = answer === 'A' ? q.a : q.b
                } else {
                  answerText = answer.length > 80 ? answer.slice(0, 80) + '…' : answer
                }
              }

              return (
                <div key={q.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-shrink-0 mt-0.5">
                    {isAnswered ? (
                      <div className="w-5 h-5 rounded-full bg-[#1E3A5F] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-snug">{q.text}</p>
                    {isAnswered ? (
                      <>
                        <p className="text-xs text-gray-500 mt-0.5">{answerText}</p>
                        <button
                          onClick={() => jumpToQuestion(i)}
                          className="text-xs text-[#1E3A5F] hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          Edit <ChevronRight className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="mt-0.5">
                        <p className="text-xs text-gray-400">Not answered yet</p>
                        <button
                          onClick={() => jumpToQuestion(i)}
                          className="text-xs text-[#1E3A5F] hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          Answer this <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-[#1E3A5F] hover:bg-[#16304f] text-white text-sm font-medium py-2.5 transition"
            >
              Done
            </button>
          </div>
        </Card>
      </Overlay>
    )
  }

  // ── Question screen ────────────────────────────────────────────────────────

  if (loadingAnswers) {
    return (
      <Overlay>
        <Card>
          <Header title="Founder Personality Quiz" />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-[#1E3A5F] border-t-transparent animate-spin" />
          </div>
        </Card>
      </Overlay>
    )
  }

  const question = QUESTIONS[step]
  const progressPct = (step / TOTAL) * 100
  const isLastQuestion = step === TOTAL - 1

  return (
    <Overlay>
      <Card>
        <Header title={`Founder Personality Quiz${reviewMode ? ' — Edit Answer' : ''}`} />

        {/* Progress bar */}
        <div className="px-5 pt-4 pb-1 flex-shrink-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">Question {step + 1} of {TOTAL}</span>
            <span className="text-xs text-gray-400">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1E3A5F] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question content */}
        <div
          className="flex-1 overflow-y-auto px-5 py-6 transition-opacity duration-200"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <h2 className="text-lg font-semibold text-gray-900 leading-snug mb-6">
            {question.text}
          </h2>

          {question.type === 'choice' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['A', 'B'] as const).map((opt) => {
                  const label = opt === 'A' ? (question as ChoiceQuestion).a : (question as ChoiceQuestion).b
                  const isSelected = selected === opt
                  const isPrevAnswer = !selected && answers[question.id] === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleChoice(opt)}
                      disabled={!!selected}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                        isSelected || isPrevAnswer
                          ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-[#1E3A5F] hover:bg-[#f0f4f9]'
                      }`}
                    >
                      <span className="text-sm font-medium leading-relaxed">{label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-5 text-center">
                <button onClick={handleSkip} className="text-xs text-gray-400 hover:text-gray-600 transition">
                  Skip for now
                </button>
              </div>
            </>
          ) : (
            <>
              <textarea
                rows={4}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={(question as TextQuestion).placeholder}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent resize-none transition"
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleText() }}
              />
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={handleText}
                  disabled={!textInput.trim()}
                  className="rounded-lg bg-[#1E3A5F] hover:bg-[#16304f] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium px-5 py-2 transition"
                >
                  {reviewMode ? 'Update' : isLastQuestion ? 'Review answers' : 'Next'}
                </button>
                <button onClick={handleSkip} className="text-xs text-gray-400 hover:text-gray-600 transition">
                  Skip for now
                </button>
              </div>
            </>
          )}
        </div>
      </Card>
    </Overlay>
  )
}

// ── Layout primitives ────────────────────────────────────────────────────────

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/50" />
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-[600px] sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
      {children}
    </div>
  )
}
