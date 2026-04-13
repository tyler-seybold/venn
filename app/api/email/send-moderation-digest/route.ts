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

type FlaggedProfile = {
  user_id: string
  full_name: string | null
  email: string | null
  moderation_flags: Record<string, string[]> | null
}

type FlaggedStartup = {
  id: string
  startup_name: string | null
  founder_name: string | null
  moderation_flags: Record<string, string[]> | null
}

function formatFlags(flags: Record<string, string[]> | null): string {
  if (!flags || Object.keys(flags).length === 0) return 'unknown'
  return Object.entries(flags)
    .map(([field, cats]) => `${field} (${cats.join(', ')})`)
    .join('; ')
}

function buildRow(label: string, value: string, isLast: boolean): string {
  const border = isLast ? '' : 'border-bottom:1px solid #e8e5e0;'
  return `
        <tr>
          <td style="border:none;${border}
                     padding-top:14px;padding-right:24px;
                     padding-bottom:14px;padding-left:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
              <tr>
                <td style="border:none;font-size:13px;font-weight:700;color:#1E3A5F;
                           font-family:Helvetica,Arial,sans-serif;padding-bottom:2px;">
                  ${label}
                </td>
              </tr>
              <tr>
                <td style="border:none;font-size:13px;color:#444;line-height:1.5;
                           font-family:Helvetica,Arial,sans-serif;">
                  ${value}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
}

function buildSection(
  heading: string,
  items: { label: string; detail: string; link: string; linkLabel: string }[],
): string {
  const rows = items.map((item, i) => {
    const isLast = i === items.length - 1
    const border = isLast ? '' : 'border-bottom:1px solid #eee;'
    return `
        <tr>
          <td style="border:none;${border}
                     padding-top:14px;padding-right:24px;
                     padding-bottom:14px;padding-left:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
              <tr>
                <td style="border:none;font-size:14px;font-weight:700;color:#1a1a1a;
                           font-family:Helvetica,Arial,sans-serif;padding-bottom:3px;">
                  ${item.label}
                </td>
              </tr>
              <tr>
                <td style="border:none;font-size:13px;color:#666;line-height:1.5;
                           font-family:Helvetica,Arial,sans-serif;padding-bottom:8px;">
                  ${item.detail}
                </td>
              </tr>
              <tr>
                <td style="border:none;">
                  <a href="${item.link}"
                     style="font-size:12px;font-weight:700;color:#1E3A5F;
                            text-decoration:none;font-family:Helvetica,Arial,sans-serif;
                            border-bottom:1px solid #1E3A5F;">
                    ${item.linkLabel} &#8250;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
  }).join('')

  return `
      <!-- Section heading -->
      <tr>
        <td style="border:none;
                   padding-top:24px;padding-right:24px;
                   padding-bottom:0;padding-left:24px;">
          <p style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;
                    font-size:11px;font-weight:700;color:#1E3A5F;
                    text-transform:uppercase;letter-spacing:0.8px;
                    font-family:Helvetica,Arial,sans-serif;">
            ${heading}
          </p>
        </td>
      </tr>
      <!-- Section divider -->
      <tr>
        <td style="border:none;
                   padding-top:8px;padding-right:24px;
                   padding-bottom:0;padding-left:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
            <tr>
              <td height="1" bgcolor="#1E3A5F"
                  style="border:none;height:1px;line-height:1px;font-size:1px;background-color:#1E3A5F;">&#8203;</td>
            </tr>
          </table>
        </td>
      </tr>
      <!-- Items -->
      ${rows}`
}

function buildDigestEmail(
  profiles: FlaggedProfile[],
  startups: FlaggedStartup[],
  baseUrl: string,
): string {
  const total = profiles.length + startups.length
  const plural = total === 1 ? 'item' : 'items'
  const now = new Date().toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  })

  const profileItems = profiles.map((p) => ({
    label: p.full_name ?? p.email ?? p.user_id,
    detail: `${p.email ?? '—'} &nbsp;&#183;&nbsp; Flagged fields: ${formatFlags(p.moderation_flags)}`,
    link: `${baseUrl}/admin/profile/${p.user_id}/edit`,
    linkLabel: 'Review in admin',
  }))

  const startupItems = startups.map((s) => ({
    label: s.startup_name ?? s.id,
    detail: `Founder: ${s.founder_name ?? '—'} &nbsp;&#183;&nbsp; Flagged fields: ${formatFlags(s.moderation_flags)}`,
    link: `${baseUrl}/admin`,
    linkLabel: 'Go to admin panel',
  }))

  const profileSection = profiles.length > 0
    ? buildSection(`Flagged profiles (${profiles.length})`, profileItems)
    : ''

  const startupSection = startups.length > 0
    ? buildSection(`Flagged startups (${startups.length})`, startupItems)
    : ''

  const spacer = profiles.length > 0 && startups.length > 0
    ? `<tr><td height="16" style="border:none;height:16px;line-height:16px;font-size:16px;">&#8203;</td></tr>`
    : ''

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

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f0ed"
       style="background-color:#f0f0ed;border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <tr>
    <td align="center"
        style="border:none;padding-top:32px;padding-right:16px;padding-bottom:32px;padding-left:16px;">

      <!-- Inner card: 560px -->
      <table width="560" cellpadding="0" cellspacing="0" border="1" bgcolor="#ffffff"
             align="center"
             style="width:560px;background-color:#ffffff;border-color:#e0ddd8;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">

        <!-- ── Header ── -->
        <tr>
          <td bgcolor="#1E3A5F"
              style="border:none;background-color:#1E3A5F;
                     padding-top:20px;padding-right:24px;
                     padding-bottom:20px;padding-left:24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
              <tr>
                <td style="border:none;">
                  <p style="margin-top:0;margin-right:0;margin-bottom:2px;margin-left:0;
                            font-size:11px;font-weight:700;color:#a8bfd4;
                            text-transform:uppercase;letter-spacing:0.8px;
                            font-family:Helvetica,Arial,sans-serif;">
                    Venn Admin &#183; Moderation Digest
                  </p>
                  <p style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;
                            font-size:20px;font-weight:700;color:#ffffff;
                            font-family:Helvetica,Arial,sans-serif;">
                    ${total} flagged ${plural} need${total === 1 ? 's' : ''} review
                  </p>
                </td>
                <td valign="middle" align="right" style="border:none;white-space:nowrap;">
                  <p style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;
                            font-size:11px;color:#a8bfd4;
                            font-family:Helvetica,Arial,sans-serif;">
                    ${now}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Profile section ── -->
        ${profileSection}

        <!-- ── Spacer between sections ── -->
        ${spacer}

        <!-- ── Startup section ── -->
        ${startupSection}

        <!-- ── Footer ── -->
        <tr>
          <td bgcolor="#f7f5f2"
              style="border:none;background-color:#f7f5f2;
                     padding-top:16px;padding-right:24px;
                     padding-bottom:16px;padding-left:24px;
                     border-top:1px solid #e8e5e0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
              <tr>
                <td style="border:none;font-size:12px;color:#999;
                           font-family:Helvetica,Arial,sans-serif;">
                  Internal digest &#183; Venn moderation system
                </td>
                <td align="right" style="border:none;">
                  <a href="${baseUrl}/admin"
                     style="font-size:12px;color:#1E3A5F;text-decoration:none;
                            font-family:Helvetica,Arial,sans-serif;font-weight:700;">
                    Open admin panel &#8250;
                  </a>
                </td>
              </tr>
            </table>
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

  const baseUrl = getBaseUrl()

  // ── 2. Fetch flagged profiles ────────────────────────────────────────────────
  const { data: flaggedProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, full_name, email, moderation_flags')
    .eq('moderation_status', 'flagged')

  if (profilesError) {
    return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 })
  }

  // ── 3. Fetch flagged startups (join founder name via separate query) ──────────
  const { data: flaggedStartupRows, error: startupsError } = await supabase
    .from('startups')
    .select('id, startup_name, founder_id, moderation_flags')
    .eq('moderation_status', 'flagged')

  if (startupsError) {
    return NextResponse.json({ success: false, error: startupsError.message }, { status: 500 })
  }

  // ── 4. Short-circuit if nothing flagged ──────────────────────────────────────
  const totalFlagged = (flaggedProfiles?.length ?? 0) + (flaggedStartupRows?.length ?? 0)
  if (totalFlagged === 0) {
    return NextResponse.json({ sent: false })
  }

  // ── 5. Resolve founder names for flagged startups ────────────────────────────
  const founderIds = [...new Set((flaggedStartupRows ?? []).map((s) => s.founder_id).filter(Boolean))]
  const founderMap = new Map<string, string>()

  if (founderIds.length > 0) {
    const { data: founders } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', founderIds)

    for (const f of founders ?? []) {
      if (f.user_id) founderMap.set(f.user_id, f.full_name ?? f.user_id)
    }
  }

  const flaggedStartups: FlaggedStartup[] = (flaggedStartupRows ?? []).map((s) => ({
    id: s.id,
    startup_name: s.startup_name,
    founder_name: s.founder_id ? (founderMap.get(s.founder_id) ?? null) : null,
    moderation_flags: s.moderation_flags,
  }))

  // ── 6. Fetch admin emails ─────────────────────────────────────────────────────
  const { data: admins, error: adminsError } = await supabase
    .from('profiles')
    .select('email')
    .eq('is_admin', true)

  if (adminsError) {
    return NextResponse.json({ success: false, error: adminsError.message }, { status: 500 })
  }

  const adminEmails = (admins ?? []).map((a) => a.email).filter(Boolean) as string[]
  if (adminEmails.length === 0) {
    return NextResponse.json({ sent: false, note: 'No admin emails found' })
  }

  // ── 7. Build and send digest to each admin ───────────────────────────────────
  const html = buildDigestEmail(flaggedProfiles ?? [], flaggedStartups, baseUrl)
  const count = totalFlagged
  const subject = `Venn — Flagged content needs review (${count} ${count === 1 ? 'item' : 'items'})`

  for (const email of adminEmails) {
    await resend.emails.send({
      from: 'Venn <onboarding@resend.dev>',
      to: email,
      subject,
      html,
    })
  }

  return NextResponse.json({ sent: true, count })
}
