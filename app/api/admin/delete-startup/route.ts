import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function storagePathFromUrl(url: string): string | null {
  const marker = '/startup-logos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

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

  const { startupId } = await req.json()
  if (!startupId) {
    return NextResponse.json({ error: 'Missing startupId' }, { status: 400 })
  }

  // Fetch logo URL before deleting so we can clean up storage
  const { data: startup } = await supabaseAdmin
    .from('startups')
    .select('logo_url')
    .eq('id', startupId)
    .single()

  if (startup?.logo_url) {
    const path = storagePathFromUrl(startup.logo_url)
    if (path) {
      await supabaseAdmin.storage.from('startup-logos').remove([path])
    }
  }

  const { error } = await supabaseAdmin.from('startups').delete().eq('id', startupId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
