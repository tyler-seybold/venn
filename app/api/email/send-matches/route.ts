import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getMatchLabel } from '@/config/matching'

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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchItem = {
  id: string
  name: string
  label: string
  blurb: string | null
  profileUrl: string
  subtitle: string | null
}

type StartupMatchItem = {
  id: string
  name: string
  founderName: string
  industry: string[] | null
  description: string | null
}

const BADGE_URLS: Record<string, string> = {
  'Perfect Fit': 'https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/perfect-fit.png',
  'Strong Match': 'https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/strong-match.png',
  'Good Match': 'https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/good-match.png',
  'Worth a Coffee': 'https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/worth-a-coffee.png',
}

// ── HTML builders ─────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  'Perfect Fit':   '#1E3A5F',
  'Strong Match':  '#1E3A5F',
  'Good Match':    '#2E7D32',
  'Worth a Coffee':'#E65100',
}

function buildMatchCards(matchItems: MatchItem[], baseUrl: string): string {
  return matchItems.map(({ id, name, label, blurb, profileUrl, subtitle }, idx) => {
    const initials = getInitials(name)
    const badgeUrl = BADGE_URLS[label] ?? BADGE_URLS['Worth a Coffee']
    const accentColor = LABEL_COLORS[label] ?? '#1E3A5F'
    const isLast = idx === matchItems.length - 1

    const blurbHtml = blurb
      ? `<b style="font-style:normal;color:#444;">Venn says:</b> ${blurb}`
      : 'Your personalized match note is on its way.'

    const divider = isLast ? '' : `<tr><td style="height:1px;background:#f0ede8;font-size:0;line-height:0;">&nbsp;</td></tr>`

    return `
    <tr>
      <td style="padding:24px 32px;">
        <!-- Card body: avatar col + content col -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <!-- Initials box -->
            <td width="48" valign="top" style="padding-right:16px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="48" height="48"
                      style="width:48px;height:48px;border-radius:8px;background:#e8e4f4;
                             text-align:center;vertical-align:middle;
                             font-size:16px;font-weight:700;color:#1E3A5F;
                             font-family:Helvetica,Arial,sans-serif;">
                    ${initials}
                  </td>
                </tr>
              </table>
            </td>
            <!-- Right content -->
            <td valign="top">
              <!-- Name + badge -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4px;">
                <tr>
                  <td style="vertical-align:middle;
                             font-size:16px;font-weight:700;color:#1a1a1a;
                             font-family:Helvetica,Arial,sans-serif;">
                    ${name}
                  </td>
                  <td style="vertical-align:middle;padding-left:8px;">
                    <img src="${badgeUrl}" alt="${label}" height="22"
                         style="display:block;border:0;height:22px;">
                  </td>
                </tr>
              </table>
              <!-- Subtitle -->
              ${subtitle ? `<p style="margin:0 0 10px;font-size:13px;color:#888;font-family:Helvetica,Arial,sans-serif;">${subtitle}</p>` : `<p style="margin:0 0 10px;font-size:0;line-height:0;">&nbsp;</p>`}
              <!-- Blurb callout -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:14px;">
                <tr>
                  <td style="background:#f7f5f2;border-left:3px solid ${accentColor};
                             border-radius:0 6px 6px 0;padding:12px 14px;
                             font-size:14px;color:#444;line-height:1.6;font-style:italic;
                             font-family:Helvetica,Arial,sans-serif;">
                    ${blurbHtml}
                  </td>
                </tr>
              </table>
              <!-- Footer row: CTA + feedback -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <!-- View Profile button -->
                  <td valign="middle">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background:#1E3A5F;border-radius:999px;padding:9px 22px;">
                          <a href="${profileUrl}"
                             style="color:#ffffff;text-decoration:none;font-weight:700;
                                    font-family:Helvetica,Arial,sans-serif;font-size:14px;
                                    white-space:nowrap;">
                            View Profile
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Feedback -->
                  <td valign="middle" align="right">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size:12px;color:#999;font-family:Helvetica,Arial,sans-serif;
                                   padding-right:8px;white-space:nowrap;">
                          Helpful match?
                        </td>
                        <td style="border:1px solid #d0ccc8;border-right:none;
                                   border-radius:6px 0 0 6px;padding:6px 10px;font-size:14px;">
                          <a href="${baseUrl}/api/feedback?match_id=${id}&vote=up"
                             style="text-decoration:none;color:#444;font-family:Helvetica,Arial,sans-serif;">
                            👍
                          </a>
                        </td>
                        <td style="border:1px solid #d0ccc8;border-radius:0 6px 6px 0;
                                   padding:6px 10px;font-size:14px;">
                          <a href="${baseUrl}/api/feedback?match_id=${id}&vote=down"
                             style="text-decoration:none;color:#444;font-family:Helvetica,Arial,sans-serif;">
                            👎
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
      </td>
    </tr>
    ${divider}`
  }).join('')
}

function buildEmail(
  recipientName: string,
  weekLabel: string,
  matchItems: MatchItem[],
  baseUrl: string,
): string {
  const firstName = recipientName.split(' ')[0] ?? recipientName
  const matchCards = buildMatchCards(matchItems, baseUrl)

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0ed;font-family:Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#f0f0ed;padding:32px 16px;">
  <tr>
    <td align="center">

      <!-- Card -->
      <table width="560" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;width:100%;background:#ffffff;
                    border-radius:12px;border:1px solid #e0ddd8;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:24px 32px 20px;border-bottom:1px solid #e8e5e0;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <!-- SVG logo -->
                <td valign="middle" style="padding-right:10px;">
                  <svg width="38" height="22" viewBox="-2 -2 42 26"
                       xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="10"
                            stroke="#1E3A5F" stroke-width="1.8" fill="none"/>
                    <circle cx="27" cy="11" r="10"
                            stroke="#1E3A5F" stroke-width="1.8" fill="none"/>
                  </svg>
                </td>
                <!-- Wordmark -->
                <td valign="middle"
                    style="font-family:'Trebuchet MS',Arial,sans-serif;
                           font-size:20px;font-weight:700;color:#1E3A5F;">
                  Venn
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:28px 32px 8px;">
            <p style="margin:0 0 6px;font-size:12px;color:#999;text-transform:uppercase;
                      letter-spacing:0.8px;font-weight:600;
                      font-family:Helvetica,Arial,sans-serif;">
              Week of ${weekLabel}
            </p>
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1a1a1a;
                       font-family:Helvetica,Arial,sans-serif;">
              Your matches this week
            </h1>
            <p style="margin:0;font-size:15px;color:#555;line-height:1.6;
                      font-family:Helvetica,Arial,sans-serif;">
              Hi ${firstName} — we think these connections are worth making. Take a look and reach out.
            </p>
          </td>
        </tr>

        <!-- Thin divider -->
        <tr>
          <td style="padding:24px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="height:1px;background:#f0ede8;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Match cards -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${matchCards}
        </table>

        <!-- Footer -->
        <tr>
          <td style="background:#f7f5f2;padding:20px 32px;border-top:1px solid #e8e5e0;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;
                      font-family:Helvetica,Arial,sans-serif;">
              You're receiving this because you opted into Venn matching.
              <a href="${baseUrl}/profile/edit"
                 style="color:#999;text-decoration:underline;">Update your preferences</a>
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

  // ── 2. Resolve base URL and week_of ──────────────────────────────────────
  const baseUrl = getBaseUrl()
  console.log('[send-matches] BASE_URL =', baseUrl)

  const { searchParams } = new URL(req.url)
  const weekOf = searchParams.get('week_of') ?? currentMondayISO()
  const weekLabel = formatWeekOf(weekOf)

  // ── 3. Fetch people match rows for this week ───────────────────────────────
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

  // ── 4. Group people matches by user, capped at top 2 by score ─────────────
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

  // Sort each user's list by match_score descending and cap at 2
  for (const [userId, list] of userMatches) {
    list.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    userMatches.set(userId, list.slice(0, 2))
  }

  // ── 5. Fetch all relevant profiles ────────────────────────────────────────
  const allUserIds = [...new Set(matchRows.flatMap((m) => [m.user_id_1, m.user_id_2]))]

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, full_name, email, avatar_url, degree_program, graduation_year')
    .in('user_id', allUserIds)

  if (profilesError) {
    return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 })
  }

  const profileByUserId = new Map(
    (profileRows ?? []).map((p) => [p.user_id, p])
  )

  // ── 6. Fetch startup↔startup matches for founders being emailed ───────────
  const emailedUserIds = [...userMatches.keys()]

  const { data: founderStartupRows } = await supabase
    .from('startups')
    .select('id, founder_id, name, description, industry')
    .in('founder_id', emailedUserIds)

  // Map: user_id → their startup
  const startupByFounderId = new Map(
    (founderStartupRows ?? []).map((s) => [s.founder_id, s])
  )

  // Fetch startup_startup matches for this week involving any founder startup
  const founderStartupIds = (founderStartupRows ?? []).map((s) => s.id)
  let startupMatchesByStartupId = new Map<string, { otherStartupId: string; score: number }[]>()

  if (founderStartupIds.length > 0) {
    const { data: ssMatchRows } = await supabase
      .from('matches')
      .select('user_id_1, user_id_2, match_score')
      .eq('week_of', weekOf)
      .eq('match_type', 'startup_startup')
      .or(`user_id_1.in.(${founderStartupIds.join(',')}),user_id_2.in.(${founderStartupIds.join(',')})`)

    const founderStartupIdSet = new Set(founderStartupIds)
    for (const row of ssMatchRows ?? []) {
      const ourId    = founderStartupIdSet.has(row.user_id_1) ? row.user_id_1 : row.user_id_2
      const otherId  = ourId === row.user_id_1 ? row.user_id_2 : row.user_id_1
      if (!startupMatchesByStartupId.has(ourId)) startupMatchesByStartupId.set(ourId, [])
      startupMatchesByStartupId.get(ourId)!.push({ otherStartupId: otherId, score: row.match_score ?? 0 })
    }
  }

  // Fetch details for all "other" matched startups
  const otherStartupIds = new Set<string>()
  for (const matches of startupMatchesByStartupId.values()) {
    for (const { otherStartupId } of matches) otherStartupIds.add(otherStartupId)
  }

  const otherStartupByIdMap = new Map<string, { id: string; name: string; founder_id: string; description: string | null; industry: string[] | null }>()
  if (otherStartupIds.size > 0) {
    const { data: otherStartupRows } = await supabase
      .from('startups')
      .select('id, name, founder_id, description, industry')
      .in('id', [...otherStartupIds])

    for (const s of otherStartupRows ?? []) otherStartupByIdMap.set(s.id, s)
  }

  // Fetch founder profiles for the other startups
  const otherFounderIds = [...new Set([...otherStartupByIdMap.values()].map((s) => s.founder_id))]
  const otherFounderByIdMap = new Map<string, string>() // user_id → full_name
  if (otherFounderIds.length > 0) {
    const { data: otherFounderRows } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', otherFounderIds)

    for (const p of otherFounderRows ?? []) {
      otherFounderByIdMap.set(p.user_id, p.full_name ?? 'Unknown founder')
    }
  }

  // ── 7. Send one email per user ────────────────────────────────────────────
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
        const dp = (matchedProfile as { degree_program?: string | null }).degree_program ?? null
        const gy = (matchedProfile as { graduation_year?: number | null }).graduation_year ?? null
        const subtitle = dp || gy
          ? [dp, gy ? `'${String(gy).slice(-2)}` : null].filter(Boolean).join(' • ')
          : null
        return {
          id: m.id,
          name: matchedProfile.full_name ?? 'A Venn member',
          label,
          blurb: m.blurb,
          profileUrl: `${baseUrl}/people/${matchedId}`,
          subtitle,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (matchItems.length === 0) continue

    // Build startup section if this user is a founder with similar-startup matches
    let startupItems: StartupMatchItem[] | undefined
    const founderStartup = startupByFounderId.get(userId)
    if (founderStartup) {
      const similarMatches = startupMatchesByStartupId.get(founderStartup.id) ?? []
      if (similarMatches.length > 0) {
        startupItems = similarMatches
          .sort((a, b) => b.score - a.score)
          .map(({ otherStartupId }) => {
            const s = otherStartupByIdMap.get(otherStartupId)
            if (!s) return null
            return {
              id: s.id,
              name: s.name ?? 'Unnamed startup',
              founderName: otherFounderByIdMap.get(s.founder_id) ?? 'Unknown founder',
              industry: s.industry ?? null,
              description: s.description ?? null,
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      }
    }

    const html = buildEmail(recipientName, weekLabel, matchItems, baseUrl)

    await resend.emails.send({
      from: 'Venn <onboarding@resend.dev>',
      to: recipient.email,
      subject: `Your Venn matches for the week of ${weekLabel}`,
      html,
    })

    emailsSent++
  }

  // ── 8. Summary ────────────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    emailsSent,
    usersEmailed: emailsSent,
  })
}
