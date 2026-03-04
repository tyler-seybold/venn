import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  console.log('[auth/callback] incoming URL:', request.url)
  console.log('[auth/callback] search params:', Object.fromEntries(searchParams.entries()))

  const code = searchParams.get('code')
  const token = searchParams.get('token')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let userId: string | null = null

  if (code) {
    console.log('[auth/callback] exchanging code for session')
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code)

    if (sessionError || !sessionData.session) {
      console.error('[auth/callback] code exchange failed:', sessionError?.message)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    userId = sessionData.session.user.id
  } else if (token) {
    console.log('[auth/callback] verifying token OTP')
    const email = searchParams.get('email') ?? ''

    const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
      token,
      type: 'email',
      email,
    })

    if (otpError || !otpData.session) {
      console.error('[auth/callback] token verification failed:', otpError?.message)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    userId = otpData.session.user.id
  } else {
    console.warn('[auth/callback] no code or token found in request')
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  const destination = profile ? '/dashboard' : '/profile/setup'
  console.log('[auth/callback] redirecting to', destination)
  return NextResponse.redirect(`${origin}${destination}`)
}
