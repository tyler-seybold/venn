import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  let body: { match_id?: string; side?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { match_id, side, reason } = body

  if (!match_id || !side || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (side !== '1' && side !== '2') {
    return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
  }

  const col = side === '1' ? 'feedback_1_reason' : 'feedback_2_reason'

  const { error } = await supabase
    .from('matches')
    .update({ [col]: reason })
    .eq('id', match_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
