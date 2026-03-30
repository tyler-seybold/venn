import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getMatchLabel, getMatchLabelColor } from '@/config/matching'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://venn.kellogg.northwestern.edu'

function currentMondayISO(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - diff)
  return monday.toISOString().slice(0, 10)
}

function formatWeekOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function buildEmail(
  recipientName: string,
  weekLabel: string,
  matchItems: { name: string; label: string; labelColor: string; blurb: string | null; profileUrl: string }[]
): string {
  const matchRows = matchItems.map(({ name, label, labelColor, blurb, profileUrl }) => `
    <tr>
      <td style="padding:20px 0;border-bottom:1px solid #f0eff4;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <span style="font-size:16px;font-weight:600;color:#1a1a1a;">${name}</span>
              &nbsp;
              <span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;color:#fff;background:${labelColor};">${label}</span>
            </td>
          </tr>
          <tr>
            <td style="padding-top:8px;font-size:14px;color:#555;line-height:1.6;">
              ${blurb ?? 'Your personalized match note is on its way.'}
            </td>
          </tr>
          <tr>
            <td style="padding-top:14px;">
              <a href="${profileUrl}"
                 style="display:inline-block;padding:8px 18px;background:#4E2A84;color:#fff;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
                View Profile
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ede9f6;">

          <!-- Header -->
          <tr>
            <td style="background:#4E2A84;padding:28px 36px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.3px;">Your matches this week</p>
              <p style="margin:6px 0 0;font-size:14px;color:#d4c9ee;">Week of ${weekLabel}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 36px 0;">
              <p style="margin:0;font-size:15px;color:#333;">Hi ${recipientName},</p>
              <p style="margin:10px 0 0;font-size:14px;color:#555;line-height:1.6;">
                Here are your Venn matches for this week. Reach out, start a conversation, and see where it goes.
              </p>
            </td>
          </tr>

          <!-- Match rows -->
          <tr>
            <td style="padding:8px 36px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${matchRows}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 36px;border-top:1px solid #f0eff4;">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
                You're receiving this because you opted into Venn matching.
                To stop receiving match emails, update your preferences at
                <a href="${BASE_URL}/profile/edit" style="color:#4E2A84;text-decoration:underline;">${BASE_URL}/profile/edit</a>.
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
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? ''
  const secret = process.env.MATCHING_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Resolve week_of ────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url)
  const weekOf = searchParams.get('week_of') ?? currentMondayISO()
  const weekLabel = formatWeekOf(weekOf)

  // ── 3. Fetch match rows for this week ─────────────────────────────────────
  const { data: matchRows, error: matchesError } = await supabase
    .from('matches')
    .select('id, user_id_1, user_id_2, match_type, match_score, blurb')
    .eq('week_of', weekOf)
    .in('match_type', ['people_people', 'people_startup'])

  if (matchesError) {
    return NextResponse.json({ success: false, error: matchesError.message }, { status: 500 })
  }
  if (!matchRows || matchRows.length === 0) {
    return NextResponse.json({ success: true, emailsSent: 0, usersEmailed: 0, note: 'No matches found for this week' })
  }

  // ── 4. Group matches by user ──────────────────────────────────────────────
  type MatchRow = typeof matchRows[number]
  const userMatches = new Map<string, MatchRow[]>()

  for (const row of matchRows) {
    if (!userMatches.has(row.user_id_1)) userMatches.set(row.user_id_1, [])
    userMatches.get(row.user_id_1)!.push(row)

    // For people_people, both sides get the match
    if (row.match_type === 'people_people') {
      if (!userMatches.has(row.user_id_2)) userMatches.set(row.user_id_2, [])
      userMatches.get(row.user_id_2)!.push(row)
    }
  }

  // ── 5. Fetch all relevant profiles ───────────────────────────────────────
  const allUserIds = [...new Set(matchRows.flatMap((m) => [m.user_id_1, m.user_id_2]))]

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, full_name, email')
    .in('user_id', allUserIds)

  if (profilesError) {
    return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 })
  }

  const profileByUserId = new Map(
    (profileRows ?? []).map((p) => [p.user_id, p])
  )

  // ── 6. Send one email per user ────────────────────────────────────────────
  let emailsSent = 0

  for (const [userId, userMatchList] of userMatches) {
    const recipient = profileByUserId.get(userId)
    if (!recipient?.email) continue

    const recipientName = recipient.full_name ?? 'there'

    const matchItems = userMatchList
      .map((m) => {
        const isUser1 = m.user_id_1 === userId
        const matchedId = isUser1 ? m.user_id_2 : m.user_id_1
        const matchedProfile = profileByUserId.get(matchedId)
        if (!matchedProfile) return null

        const label = getMatchLabel(m.match_score ?? 0)
        const labelColor = getMatchLabelColor(label)
        return {
          name: matchedProfile.full_name ?? 'A Venn member',
          label,
          labelColor,
          blurb: m.blurb,
          profileUrl: `${BASE_URL}/people/${matchedId}`,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (matchItems.length === 0) continue

    const html = buildEmail(recipientName, weekLabel, matchItems)

    await resend.emails.send({
      from: 'Venn <onboarding@resend.dev>',
      to: recipient.email,
      subject: `Your Venn matches for the week of ${weekLabel}`,
      html,
    })

    emailsSent++
  }

  // ── 7. Summary ────────────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    emailsSent,
    usersEmailed: emailsSent,
  })
}
