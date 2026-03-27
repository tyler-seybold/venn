import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_TAGS = [
  'co-founder',
  'technical-collaborator',
  'business-collaborator',
  'industry-advisor',
  'feedback-partner',
  'intern',
  'investor-intro',
  'domain-expert',
  'mentor',
  'peer-network',
]

export async function POST(req: NextRequest) {
  try {
    const { looking_for, user_id } = await req.json()

    if (!looking_for || !user_id) {
      return NextResponse.json({ success: false, error: 'Missing looking_for or user_id' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system:
        "You are a matching assistant for a startup ecosystem platform. Extract structured intent tags from the user's 'looking for' description. Return only a JSON array of strings — no explanation, no markdown, no preamble. Choose from these tags only: co-founder, technical-collaborator, business-collaborator, industry-advisor, feedback-partner, intern, investor-intro, domain-expert, mentor, peer-network. Pick all that apply, maximum 4 tags.",
      messages: [
        {
          role: 'user',
          content: `Extract intent tags from this description: ${looking_for}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    let tags: string[] = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        tags = parsed
          .filter((t): t is string => typeof t === 'string' && VALID_TAGS.includes(t))
          .slice(0, 4)
      }
    } catch {
      return NextResponse.json({ success: false, error: `Failed to parse model response: ${raw}` }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ intent_tags: tags })
      .eq('user_id', user_id)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, intent_tags: tags })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
