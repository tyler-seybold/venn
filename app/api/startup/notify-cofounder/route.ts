import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url || url.includes('localhost')) return 'https://venn-eight.vercel.app'
  return url
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { startupId, startupName, cofounderEmail, cofounderName, addedByName } = body as {
    startupId: string
    startupName: string
    cofounderUserId: string
    cofounderEmail: string | null
    cofounderName: string | null
    addedByName: string | null
  }

  if (!cofounderEmail) {
    return NextResponse.json({ success: false, error: 'No email address for co-founder' }, { status: 400 })
  }

  const baseUrl = getBaseUrl()
  const startupUrl = `${baseUrl}/startup/${startupId}`
  const displayName = cofounderName ?? 'there'
  const senderName = addedByName ?? 'Someone'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been added as a co-founder on Venn</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f0ed;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f0f0ed;border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
    <tr>
      <td align="center"
          style="border:none;padding-top:32px;padding-right:16px;padding-bottom:32px;padding-left:16px;">

        <!-- Inner card: 560px, white, bordered -->
        <table width="560" cellpadding="0" cellspacing="0" border="1" bgcolor="#ffffff"
               align="center"
               style="width:560px;background-color:#ffffff;border-color:#e0ddd8;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">

          <!-- Header -->
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

          <!-- Body -->
          <tr>
            <td bgcolor="#ffffff"
                style="border:none;background-color:#ffffff;
                       padding-top:32px;padding-right:32px;
                       padding-bottom:8px;padding-left:32px;">
              <p style="margin-top:0;margin-right:0;margin-bottom:16px;margin-left:0;
                        font-size:22px;font-weight:700;color:#1a1a1a;
                        font-family:Helvetica,Arial,sans-serif;">
                You&#8217;re now a co-founder on Venn
              </p>
              <p style="margin-top:0;margin-right:0;margin-bottom:24px;margin-left:0;
                        font-size:15px;color:#555;line-height:1.6;
                        font-family:Helvetica,Arial,sans-serif;">
                Hi ${displayName} &#8212; <strong style="color:#1a1a1a;">${senderName}</strong> has added you as a co-founder of <strong style="color:#1a1a1a;">${startupName}</strong> on Venn.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" border="0"
                     style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td bgcolor="#1E3A5F"
                      style="border:none;background-color:#1E3A5F;border-radius:8px;
                             padding-top:12px;padding-right:28px;
                             padding-bottom:12px;padding-left:28px;">
                    <a href="${startupUrl}"
                       style="color:#ffffff;text-decoration:none;font-weight:700;
                              font-family:Helvetica,Arial,sans-serif;font-size:15px;
                              white-space:nowrap;display:block;">
                      View Startup
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Leave startup note -->
          <tr>
            <td bgcolor="#ffffff"
                style="border:none;background-color:#ffffff;
                       padding-top:24px;padding-right:32px;
                       padding-bottom:32px;padding-left:32px;">
              <p style="margin:0;font-size:13px;color:#888;line-height:1.6;
                        font-family:Helvetica,Arial,sans-serif;">
                If this was done by mistake, you can remove yourself from the startup by clicking the button above and selecting &#8220;Leave Startup.&#8221;
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#f7f5f2"
                style="border:none;background-color:#f7f5f2;
                       padding-top:20px;padding-right:32px;
                       padding-bottom:20px;padding-left:32px;
                       border-top:1px solid #e8e5e0;">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6;
                        font-family:Helvetica,Arial,sans-serif;">
                You&#8217;re receiving this because you were added to a startup on Venn.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    await resend.emails.send({
      from: 'Venn <onboarding@resend.dev>',
      to: cofounderEmail,
      subject: `You've been added as a co-founder of ${startupName} on Venn`,
      html,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
