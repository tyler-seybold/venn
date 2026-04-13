import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url || url.includes('localhost')) return 'https://venn-eight.vercel.app'
  return url
}

function buildModerationEmail(
  firstName: string,
  ctaUrl: string,
  isStartup: boolean,
): string {
  const thing = isStartup ? 'startup listing' : 'profile'
  const ctaLabel = isStartup ? 'Update your startup listing' : 'Update your profile'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border: none; border-collapse: collapse; }
  </style>
</head>
<body bgcolor="#f0f0ed" style="margin:0;padding:0;background-color:#f0f0ed;">

<!-- Outer wrapper: full-width background table -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0ed"
       style="background-color:#f0f0ed;border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <tr>
    <td align="center"
        style="border:none;padding-top:32px;padding-right:16px;padding-bottom:32px;padding-left:16px;">

      <!-- Inner card: 560px, white, bordered -->
      <table width="560" cellpadding="0" cellspacing="0" border="1" bgcolor="#ffffff"
             align="center"
             style="width:560px;background-color:#ffffff;border-color:#e0ddd8;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">

        <!-- ── Header ── -->
        <tr>
          <td bgcolor="#ffffff"
              style="border:none;background-color:#ffffff;
                     padding-top:24px;padding-right:32px;
                     padding-bottom:20px;padding-left:32px;
                     border-bottom:1px solid #e8e5e0;">
            <img src="https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/venn_logo_primary.png"
                 alt="Venn" height="30"
                 style="display:block;border:0;height:30px;">
          </td>
        </tr>

        <!-- ── Body ── -->
        <tr>
          <td bgcolor="#ffffff"
              style="border:none;background-color:#ffffff;
                     padding-top:32px;padding-right:32px;
                     padding-bottom:32px;padding-left:32px;">

            <p style="margin-top:0;margin-right:0;margin-bottom:16px;margin-left:0;
                      font-size:22px;font-weight:700;color:#1a1a1a;
                      font-family:Helvetica,Arial,sans-serif;">
              Hi ${firstName},
            </p>

            <p style="margin-top:0;margin-right:0;margin-bottom:16px;margin-left:0;
                      font-size:15px;color:#555;line-height:1.6;
                      font-family:Helvetica,Arial,sans-serif;">
              Your Venn ${thing} has been temporarily hidden from matching. Our automated review flagged some content, so we&#8217;ve paused your visibility while we sort it out.
            </p>

            <p style="margin-top:0;margin-right:0;margin-bottom:16px;margin-left:0;
                      font-size:15px;color:#555;line-height:1.6;
                      font-family:Helvetica,Arial,sans-serif;">
              We know that&#8217;s frustrating, and we want to get you back as quickly as possible. Here&#8217;s all you need to do:
            </p>

            <!-- Steps callout box -->
            <table cellpadding="0" cellspacing="0" border="0" width="100%"
                   style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;margin-bottom:24px;">
              <tr>
                <td bgcolor="#f7f5f2"
                    style="border:none;background-color:#f7f5f2;border-left:3px solid #1E3A5F;
                           padding-top:16px;padding-right:20px;
                           padding-bottom:16px;padding-left:20px;">
                  <p style="margin-top:0;margin-right:0;margin-bottom:8px;margin-left:0;
                             font-size:14px;font-weight:700;color:#1a1a1a;
                             font-family:Helvetica,Arial,sans-serif;">
                    To restore your ${thing}:
                  </p>
                  <p style="margin-top:0;margin-right:0;margin-bottom:6px;margin-left:0;
                             font-size:14px;color:#555;line-height:1.6;
                             font-family:Helvetica,Arial,sans-serif;">
                    1.&#160; Open your ${thing} and review the content.
                  </p>
                  <p style="margin-top:0;margin-right:0;margin-bottom:6px;margin-left:0;
                             font-size:14px;color:#555;line-height:1.6;
                             font-family:Helvetica,Arial,sans-serif;">
                    2.&#160; Make any needed updates and save.
                  </p>
                  <p style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;
                             font-size:14px;color:#555;line-height:1.6;
                             font-family:Helvetica,Arial,sans-serif;">
                    3.&#160; Your ${thing} will be reviewed automatically and restored if it passes &#8212; no need to contact anyone.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" border="0"
                   style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
              <tr>
                <td bgcolor="#1E3A5F"
                    style="border:none;background-color:#1E3A5F;border-radius:999px;
                           padding-top:12px;padding-right:28px;
                           padding-bottom:12px;padding-left:28px;">
                  <a href="${ctaUrl}"
                     style="color:#ffffff;text-decoration:none;font-weight:700;
                            font-family:Helvetica,Arial,sans-serif;font-size:15px;
                            white-space:nowrap;display:block;">
                    ${ctaLabel}
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td bgcolor="#f7f5f2"
              style="border:none;background-color:#f7f5f2;
                     padding-top:20px;padding-right:32px;
                     padding-bottom:20px;padding-left:32px;
                     border-top:1px solid #e8e5e0;">
            <p style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;
                      font-size:12px;color:#999;line-height:1.6;
                      font-family:Helvetica,Arial,sans-serif;">
              You&#8217;re receiving this because your Venn ${thing} was flagged during an automated review.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
}

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const secret = process.env.MODERATION_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────────
  const { type, id } = await req.json()
  if (!id || (type !== 'profile' && type !== 'startup')) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }

  const baseUrl = getBaseUrl()

  // ── 3. Fetch owner email ─────────────────────────────────────────────────────
  let toEmail: string
  let firstName: string
  let ctaUrl: string
  let isStartup: boolean

  if (type === 'profile') {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', id)
      .single()

    if (error || !profile?.email) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })
    }

    toEmail = profile.email
    firstName = (profile.full_name ?? profile.email).split(' ')[0]
    ctaUrl = `${baseUrl}/profile/edit`
    isStartup = false
  } else {
    const { data: startup, error: startupError } = await supabase
      .from('startups')
      .select('startup_name, founder_id')
      .eq('id', id)
      .single()

    if (startupError || !startup) {
      return NextResponse.json({ success: false, error: 'Startup not found' }, { status: 404 })
    }

    const { data: founder, error: founderError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', startup.founder_id)
      .single()

    if (founderError || !founder?.email) {
      return NextResponse.json({ success: false, error: 'Founder not found' }, { status: 404 })
    }

    toEmail = founder.email
    firstName = (founder.full_name ?? founder.email).split(' ')[0]
    ctaUrl = `${baseUrl}/startup/${id}/edit`
    isStartup = true
  }

  // ── 4. Send email ────────────────────────────────────────────────────────────
  const subject = isStartup
    ? 'Your Venn startup listing has been temporarily hidden'
    : 'Your Venn profile has been temporarily hidden'

  const html = buildModerationEmail(firstName, ctaUrl, isStartup)

  const { error: sendError } = await resend.emails.send({
    from: 'Venn <onboarding@resend.dev>',
    to: toEmail,
    subject,
    html,
  })

  if (sendError) {
    return NextResponse.json({ success: false, error: sendError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
