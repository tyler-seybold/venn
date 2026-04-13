import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { moderateText } from '@/lib/moderation'

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!callerProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────────
  const { type, id } = await req.json()
  if (!id || (type !== 'profile' && type !== 'startup')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // ── 3. Fetch row ─────────────────────────────────────────────────────────────
  let fields: { field: string; text: string }[]
  let currentModerationStatus: string | null = null

  if (type === 'profile') {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('bio, looking_for, moderation_status')
      .eq('user_id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    currentModerationStatus = data.moderation_status ?? null
    fields = [
      { field: 'bio', text: data.bio ?? '' },
      { field: 'looking_for', text: data.looking_for ?? '' },
    ]
  } else {
    const { data, error } = await supabaseAdmin
      .from('startups')
      .select('description, problem_statement, moderation_status')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
    }

    currentModerationStatus = data.moderation_status ?? null
    fields = [
      { field: 'description', text: data.description ?? '' },
      { field: 'problem_statement', text: data.problem_statement ?? '' },
    ]
  }

  // ── 4. Run moderation ────────────────────────────────────────────────────────
  const { flagged, flags } = await moderateText(fields)

  // ── 5. Persist result and act ────────────────────────────────────────────────
  if (flagged) {
    if (type === 'profile') {
      const tenYearsOut = new Date()
      tenYearsOut.setFullYear(tenYearsOut.getFullYear() + 10)

      await supabaseAdmin
        .from('profiles')
        .update({
          moderation_status: 'flagged',
          moderation_flags: flags,
          matching_paused_until: tenYearsOut.toISOString(),
        })
        .eq('user_id', id)
    } else {
      await supabaseAdmin
        .from('startups')
        .update({
          moderation_status: 'flagged',
          moderation_flags: flags,
        })
        .eq('id', id)
    }

    // Fire-and-forget moderation notice email
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    fetch(`${baseUrl}/api/email/send-moderation-notice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MODERATION_SECRET}`,
      },
      body: JSON.stringify({ type, id }),
    }).catch(() => {})
  } else if (currentModerationStatus === 'flagged') {
    if (type === 'profile') {
      await supabaseAdmin
        .from('profiles')
        .update({
          moderation_status: 'clean',
          moderation_flags: null,
          matching_paused_until: null,
        })
        .eq('user_id', id)
    } else {
      await supabaseAdmin
        .from('startups')
        .update({
          moderation_status: 'clean',
          moderation_flags: null,
        })
        .eq('id', id)
    }
  }

  return NextResponse.json({ flagged })
}
