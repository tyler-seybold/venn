import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
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

  const { startup_id, new_founder_id } = await req.json()
  if (!startup_id || !new_founder_id) {
    return NextResponse.json({ error: 'Missing startup_id or new_founder_id' }, { status: 400 })
  }

  // a. Fetch current founder_id
  const { data: startup, error: fetchErr } = await supabaseAdmin
    .from('startups')
    .select('founder_id')
    .eq('id', startup_id)
    .single()

  if (fetchErr || !startup) {
    return NextResponse.json({ error: 'Startup not found' }, { status: 404 })
  }

  const old_founder_id = startup.founder_id

  // b. Update startups.founder_id
  const { error: updateStartupErr } = await supabaseAdmin
    .from('startups')
    .update({ founder_id: new_founder_id })
    .eq('id', startup_id)

  if (updateStartupErr) {
    return NextResponse.json({ error: updateStartupErr.message }, { status: 500 })
  }

  // c. Promote new founder's member row to 'primary'
  const { error: promoteErr } = await supabaseAdmin
    .from('startup_members')
    .update({ role: 'primary' })
    .eq('startup_id', startup_id)
    .eq('user_id', new_founder_id)

  if (promoteErr) {
    return NextResponse.json({ error: promoteErr.message }, { status: 500 })
  }

  // d. Demote old founder to 'co-founder' if their member row exists
  if (old_founder_id !== new_founder_id) {
    await supabaseAdmin
      .from('startup_members')
      .update({ role: 'co-founder' })
      .eq('startup_id', startup_id)
      .eq('user_id', old_founder_id)
  }

  return NextResponse.json({ success: true })
}
