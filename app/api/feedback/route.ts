import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url || url.includes('localhost')) return 'https://venn-eight.vercel.app'
  return url
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const matchId = searchParams.get('match_id')
  const vote    = searchParams.get('vote')
  const side    = searchParams.get('side')

  if (!matchId || !vote || !side) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }
  if (vote !== 'up' && vote !== 'down') {
    return NextResponse.json({ error: 'Invalid vote' }, { status: 400 })
  }
  if (side !== '1' && side !== '2') {
    return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
  }

  const col = side === '1' ? 'feedback_1' : 'feedback_2'

  const { error } = await supabase
    .from('matches')
    .update({ [col]: vote })
    .eq('id', matchId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = getBaseUrl()
  return NextResponse.redirect(
    `${baseUrl}/feedback/thanks?vote=${vote}&match_id=${matchId}&side=${side}`
  )
}
