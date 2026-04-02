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
  name: string
  label: string
  blurb: string | null
  profileUrl: string
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

function buildMatchCards(matchItems: MatchItem[]): string {
  return matchItems.map(({ name, label, blurb, profileUrl }) => {
    const avatarHtml = `<table cellpadding="0" cellspacing="0" border="0">
           <tr>
             <td width="48" height="48"
                 style="width:48px;height:48px;border-radius:8px;background-color:#ede9f6;
                        text-align:center;vertical-align:middle;
                        font-size:16px;font-weight:700;color:#4E2A84;font-family:Arial,sans-serif;">
               ${getInitials(name)}
             </td>
           </tr>
         </table>`

    const badgeUrl = BADGE_URLS[label] ?? BADGE_URLS['Worth a Coffee']

    return `
    <tr>
      <td style="padding:0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#F5F5F5;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px;">

              <!-- Avatar -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                <tr><td>${avatarHtml}</td></tr>
              </table>

              <!-- Name + badge -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="font-size:16px;font-weight:600;color:#1a1a1a;">${name}</span>
                  </td>
                  <td style="vertical-align:middle;padding-left:10px;">
                    <img src="${badgeUrl}" alt="${label}" width="auto" height="28" style="display:inline-block;vertical-align:middle;border:0;">
                  </td>
                </tr>
              </table>

              <!-- Blurb -->
              <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">
                ${blurb ?? 'Your personalized match note is on its way.'}
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#4E2A84;border-radius:999px;padding:10px 24px;">
                    <a href="${profileUrl}"
                       style="color:#ffffff;text-decoration:none;font-weight:bold;
                              font-family:Arial,sans-serif;font-size:14px;">
                      View Profile
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>`
  }).join('')
}

function buildStartupCards(startupItems: StartupMatchItem[], baseUrl: string): string {
  return startupItems.map(({ id, name, founderName, industry, description }) => {
    const tagPills = (industry ?? []).map((tag) =>
      `<span style="display:inline-block;padding:3px 10px;border-radius:10px;background:#ede9f6;
                    color:#4E2A84;font-size:11px;font-weight:600;margin:0 4px 4px 0;">${tag}</span>`
    ).join('')

    const snippet = description
      ? (description.length > 100 ? description.slice(0, 100) + '…' : description)
      : ''

    return `
    <tr>
      <td style="padding:0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#EEF2FF;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 2px;font-size:16px;font-weight:600;color:#1a1a1a;">${name}</p>
              <p style="margin:0 0 10px;font-size:13px;color:#666;">Founded by ${founderName}</p>
              ${tagPills ? `<div style="margin-bottom:10px;">${tagPills}</div>` : ''}
              ${snippet ? `<p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">${snippet}</p>` : ''}
              <a href="${baseUrl}/startup/${id}"
                 style="display:inline-block;padding:10px 20px;background:#4E2A84;color:#fff;
                        font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                View Startup
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
  }).join('')
}

function buildEmail(
  recipientName: string,
  weekLabel: string,
  matchItems: MatchItem[],
  baseUrl: string,
  startupItems?: StartupMatchItem[]
): string {
  const matchCards = buildMatchCards(matchItems)

  const startupSection = startupItems && startupItems.length > 0 ? `
          <!-- Section 2: Startups in your space -->
          <tr>
            <td style="padding:24px 36px 8px;border-top:1px solid #ede9f6;">
              <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#1a1a1a;">Startups in your space</p>
              <p style="margin:0 0 16px;font-size:13px;color:#888;">Other founders building in similar areas</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${buildStartupCards(startupItems, baseUrl)}
              </table>
            </td>
          </tr>` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ede9f6;">

          <!-- Thin top bar -->
          <tr>
            <td style="background:#4E2A84;padding:10px 36px;">
              <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Venn</span>
            </td>
          </tr>

          <!-- Main header -->
          <tr>
            <td style="background:#f7f6fb;padding:24px 36px 20px;border-bottom:1px solid #ede9f6;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#1a1a1a;letter-spacing:-0.3px;">Your matches this week</p>
              <p style="margin:4px 0 0;font-size:13px;color:#888;">Week of ${weekLabel}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:24px 36px 8px;">
              <p style="margin:0;font-size:15px;color:#333;">Hi ${recipientName},</p>
              <p style="margin:10px 0 0;font-size:14px;color:#555;line-height:1.6;">
                Here are your Venn matches for this week. We think these connections are worth making. Take a look and reach out — even a short intro can go a long way.
              </p>
            </td>
          </tr>

          <!-- Match cards -->
          <tr>
            <td style="padding:16px 36px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${matchCards}
              </table>
            </td>
          </tr>

          ${startupSection}

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;border-top:1px solid #f0eff4;">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
                You're receiving this because you opted into Venn matching.
                To stop receiving match emails, update your preferences at
                <a href="${baseUrl}/profile/edit" style="color:#4E2A84;text-decoration:underline;">${baseUrl}/profile/edit</a>.
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
    .select('user_id, full_name, email, avatar_url')
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
        return {
          name: matchedProfile.full_name ?? 'A Venn member',
          label,
          blurb: m.blurb,
          profileUrl: `${baseUrl}/people/${matchedId}`,
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

    const html = buildEmail(recipientName, weekLabel, matchItems, baseUrl, startupItems)

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
