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
  side: 1 | 2
}

type StartupMatchItem = {
  id: string
  name: string
  founderName: string
  industry: string[] | null
  description: string | null
}

type PersonStartupMatchItem = {
  id: string        // match row ID (for feedback links)
  startupId: string // startup ID (for View Startup link)
  name: string      // startup name
  founderName: string
  industry: string[] | null
  description: string | null
  label: string
  blurb: string | null
  side: 1 | 2
}

const BADGE_URLS: Record<string, string> = {
  'Perfect Fit': 'https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/match_tags/perfect-fit.png',
  'Strong Match': 'https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/match_tags/strong-match.png',
  'Good Match': 'https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/match_tags/good-match.png',
  'Worth a Coffee': 'https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/match_tags/worth-a-coffee.png',
}

// ── HTML builders ─────────────────────────────────────────────────────────────

function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text
  const cut = text.lastIndexOf(' ', limit)
  return (cut > 0 ? text.slice(0, cut) : text.slice(0, limit)) + '&#8230;'
}

const LABEL_COLORS: Record<string, string> = {
  'Perfect Fit':   '#0D7377',
  'Strong Match':  '#7B1D3A',
  'Good Match':    '#0284C7',
  'Worth a Coffee':'#E65100',
}


// Each card returns <tr> rows injected directly into the outer 560px card table.
// The outer <td> has padding-left:32px + padding-right:32px → inner content width = 496px.
// Initials cell is width:64px (48px box + 16px right gap) → content column = 432px.
function buildMatchCards(matchItems: MatchItem[], baseUrl: string): string {
  return matchItems.map(({ id, name, label, blurb, profileUrl, subtitle, side }, idx) => {
    const initials = getInitials(name)
    const badgeUrl = BADGE_URLS[label] ?? BADGE_URLS['Worth a Coffee']
    const accentColor = LABEL_COLORS[label] ?? '#1E3A5F'
    const isLast = idx === matchItems.length - 1

    const blurbHtml = blurb
      ? `<b style="font-style:normal;color:#444;font-family:Helvetica,Arial,sans-serif;">Venn says:</b> ${blurb}`
      : 'Your personalized match note is on its way.'

    const divider = isLast ? '' : `
    <tr>
      <td height="1" bgcolor="#f0ede8"
          style="border:none;height:1px;line-height:1px;font-size:1px;background-color:#f0ede8;">&#8203;</td>
    </tr>`

    return `
    <tr>
      <td bgcolor="#ffffff"
          style="border:none;background-color:#ffffff;
                 padding-top:24px;padding-right:32px;padding-bottom:24px;padding-left:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr>
            <!-- Initials box: 64px col (48px box + 16px gap) -->
            <td width="64" valign="top"
                style="border:none;padding-right:16px;">
              <table cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td width="48" height="48" bgcolor="#e2e8f2" border="0"
                      align="center" valign="middle"
                      style="width:48px;height:48px;background-color:#e2e8f2;border:none;outline:0;border-collapse:collapse;border-radius:8px;
                             text-align:center;vertical-align:middle;
                             font-size:16px;font-weight:700;color:#1E3A5F;
                             font-family:Helvetica,Arial,sans-serif;">
                    ${initials}
                  </td>
                </tr>
              </table>
            </td>
            <!-- Content column: remaining 432px -->
            <td valign="top" style="border:none;">
              <!-- Name + badge row -->
              <table cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td valign="middle"
                      style="border:none;font-size:16px;font-weight:700;color:#1a1a1a;
                             font-family:Helvetica,Arial,sans-serif;">
                    ${name}
                  </td>
                  <td width="8" style="border:none;padding-left:8px;">&#8203;</td>
                  <td valign="middle" style="border:none;">
                    <img src="${badgeUrl}" alt="${label}" height="28"
                         style="display:inline;vertical-align:middle;border:0;">
                  </td>
                </tr>
              </table>
              <!-- Subtitle -->
              ${subtitle
                ? `<p style="margin-top:4px;margin-right:0;margin-bottom:10px;margin-left:0;
                             font-size:13px;color:#888;font-family:Helvetica,Arial,sans-serif;">${subtitle}</p>`
                : `<div style="height:10px;line-height:10px;font-size:10px;">&#8203;</div>`
              }
              <!-- Blurb callout box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td bgcolor="#f7f5f2"
                      style="border:none;background-color:#f7f5f2;border-left:3px solid ${accentColor};
                             padding-top:12px;padding-right:14px;
                             padding-bottom:12px;padding-left:14px;
                             font-size:14px;color:#444;line-height:1.6;
                             font-style:italic;font-family:Helvetica,Arial,sans-serif;">
                    ${blurbHtml}
                  </td>
                </tr>
              </table>
              <!-- Spacer -->
              <div style="height:14px;line-height:14px;font-size:14px;">&#8203;</div>
              <!-- Footer row: View Profile button (left) + feedback (right) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <!-- View Profile pill button -->
                  <td valign="middle" style="border:none;">
                    <table cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td bgcolor="#1E3A5F"
                            style="border:none;background-color:#1E3A5F;border-radius:999px;
                                   padding-top:9px;padding-right:22px;
                                   padding-bottom:9px;padding-left:22px;">
                          <a href="${profileUrl}"
                             style="color:#ffffff;text-decoration:none;font-weight:700;
                                    font-family:Helvetica,Arial,sans-serif;font-size:14px;
                                    white-space:nowrap;display:block;">
                            View Profile
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Feedback label + thumbs: pushed right -->
                  <td valign="middle" align="right" width="100%" style="border:none;">
                    <table cellpadding="0" cellspacing="0" border="0" align="right" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td valign="middle"
                            style="border:none;font-size:12px;color:#999;font-family:Helvetica,Arial,sans-serif;
                                   padding-right:8px;white-space:nowrap;">
                          Helpful match?
                        </td>
                        <!-- Thumbs up: left of split button -->
                        <td valign="middle"
                            style="border-top:1px solid #d0ccc8;border-left:1px solid #d0ccc8;
                                   border-bottom:1px solid #d0ccc8;border-right:0;
                                   padding-top:6px;padding-right:10px;
                                   padding-bottom:6px;padding-left:10px;font-size:14px;">
                          <a href="${baseUrl}/api/feedback?match_id=${id}&vote=up&side=${side}"
                             style="text-decoration:none;color:#444;font-family:Helvetica,Arial,sans-serif;
                                    display:block;line-height:1;">
                            &#128077;
                          </a>
                        </td>
                        <!-- Thumbs down: right of split button -->
                        <td valign="middle"
                            style="border:1px solid #d0ccc8;
                                   padding-top:6px;padding-right:10px;
                                   padding-bottom:6px;padding-left:10px;font-size:14px;">
                          <a href="${baseUrl}/api/feedback?match_id=${id}&vote=down&side=${side}"
                             style="text-decoration:none;color:#444;font-family:Helvetica,Arial,sans-serif;
                                    display:block;line-height:1;">
                            &#128078;
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

function buildStartupCards(startupItems: StartupMatchItem[], baseUrl: string): string {
  return startupItems.map(({ id, name, founderName, industry, description }, idx) => {
    const initials = getInitials(name)
    const isLast = idx === startupItems.length - 1

    const tagPills = (industry ?? []).join(' &middot; ')

    const divider = isLast ? '' : `
    <tr>
      <td height="1" bgcolor="#f0ede8"
          style="border:none;height:1px;line-height:1px;font-size:1px;background-color:#f0ede8;">&#8203;</td>
    </tr>`

    return `
    <tr>
      <td bgcolor="#ffffff"
          style="border:none;background-color:#ffffff;
                 padding-top:24px;padding-right:32px;padding-bottom:24px;padding-left:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr>
            <!-- Initials box: 64px col (48px box + 16px gap) -->
            <td width="64" valign="top"
                style="border:none;padding-right:16px;">
              <table cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td width="48" height="48" bgcolor="#e8f0f7" border="0"
                      align="center" valign="middle"
                      style="width:48px;height:48px;background-color:#e8f0f7;border:none;outline:0;border-collapse:collapse;border-radius:8px;
                             text-align:center;vertical-align:middle;
                             font-size:16px;font-weight:700;color:#1E3A5F;
                             font-family:Helvetica,Arial,sans-serif;">
                    ${initials}
                  </td>
                </tr>
              </table>
            </td>
            <!-- Content column -->
            <td valign="top" style="border:none;">
              <!-- Startup name -->
              <p style="margin-top:0;margin-right:0;margin-bottom:2px;margin-left:0;
                        font-size:16px;font-weight:700;color:#1a1a1a;
                        font-family:Helvetica,Arial,sans-serif;">
                ${name}
              </p>
              <!-- Founded by -->
              <p style="margin-top:0;margin-right:0;margin-bottom:8px;margin-left:0;
                        font-size:13px;color:#888;font-family:Helvetica,Arial,sans-serif;">
                Founded by ${founderName}
              </p>
              <!-- Industry -->
              ${tagPills ? `<p style="margin-top:0;margin-right:0;margin-bottom:8px;margin-left:0;font-size:13px;color:#888;font-family:Helvetica,Arial,sans-serif;">${tagPills}</p>` : ''}
              <!-- Description -->
              ${description ? `<p style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;font-size:14px;color:#555;line-height:1.6;font-family:Helvetica,Arial,sans-serif;">${description}</p>` : ''}
              <!-- View Startup pill button -->
              <table cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td bgcolor="#1E3A5F"
                      style="border:none;background-color:#1E3A5F;border-radius:999px;
                             padding-top:9px;padding-right:22px;
                             padding-bottom:9px;padding-left:22px;">
                    <a href="${baseUrl}/startup/${id}"
                       style="color:#ffffff;text-decoration:none;font-weight:700;
                              font-family:Helvetica,Arial,sans-serif;font-size:14px;
                              white-space:nowrap;display:block;">
                      View Startup
                    </a>
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

function buildPersonStartupCards(items: PersonStartupMatchItem[], baseUrl: string): string {
  return items.map(({ id, startupId, name, founderName, industry, description, label, blurb, side }, idx) => {
    const initials = getInitials(name)
    const accentColor = LABEL_COLORS[label] ?? '#1E3A5F'
    const badgeUrl = BADGE_URLS[label] ?? BADGE_URLS['Worth a Coffee']
    const isLast = idx === items.length - 1

    const blurbHtml = blurb
      ? `<b style="font-style:normal;color:#444;font-family:Helvetica,Arial,sans-serif;">Venn says:</b> ${blurb}`
      : 'Your personalized match note is on its way.'

    const industryText = (industry ?? []).join(' &middot; ')

    const divider = isLast ? '' : `
    <tr>
      <td height="1" bgcolor="#f0ede8"
          style="border:none;height:1px;line-height:1px;font-size:1px;background-color:#f0ede8;">&#8203;</td>
    </tr>`

    return `
    <tr>
      <td bgcolor="#ffffff"
          style="border:none;background-color:#ffffff;
                 padding-top:24px;padding-right:32px;padding-bottom:24px;padding-left:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr>
            <!-- Initials box -->
            <td width="64" valign="top" style="border:none;padding-right:16px;">
              <table cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td width="48" height="48" bgcolor="#e8f0f7" border="0"
                      align="center" valign="middle"
                      style="width:48px;height:48px;background-color:#e8f0f7;border:none;outline:0;border-collapse:collapse;border-radius:8px;
                             text-align:center;vertical-align:middle;
                             font-size:16px;font-weight:700;color:#1E3A5F;
                             font-family:Helvetica,Arial,sans-serif;">
                    ${initials}
                  </td>
                </tr>
              </table>
            </td>
            <!-- Content column -->
            <td valign="top" style="border:none;">
              <!-- Startup name + badge -->
              <table cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td valign="middle"
                      style="border:none;font-size:16px;font-weight:700;color:#1a1a1a;
                             font-family:Helvetica,Arial,sans-serif;">
                    ${name}
                  </td>
                  <td width="8" style="border:none;padding-left:8px;">&#8203;</td>
                  <td valign="middle" style="border:none;">
                    <img src="${badgeUrl}" alt="${label}" height="28"
                         style="display:inline;vertical-align:middle;border:0;">
                  </td>
                </tr>
              </table>
              <!-- Founded by -->
              <p style="margin-top:4px;margin-right:0;margin-bottom:2px;margin-left:0;
                        font-size:13px;color:#888;font-family:Helvetica,Arial,sans-serif;">
                Founded by ${founderName}
              </p>
              <!-- Industry (inline text) -->
              ${industryText ? `<p style="margin-top:0;margin-right:0;margin-bottom:10px;margin-left:0;font-size:13px;color:#888;font-family:Helvetica,Arial,sans-serif;">${industryText}</p>` : `<div style="height:10px;line-height:10px;font-size:10px;">&#8203;</div>`}
              <!-- Blurb callout box -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td bgcolor="#f7f5f2"
                      style="border:none;background-color:#f7f5f2;border-left:3px solid ${accentColor};
                             padding-top:12px;padding-right:14px;
                             padding-bottom:12px;padding-left:14px;
                             font-size:14px;color:#444;line-height:1.6;
                             font-style:italic;font-family:Helvetica,Arial,sans-serif;">
                    ${blurbHtml}
                  </td>
                </tr>
              </table>
              <!-- Description -->
              ${description ? `
              <p style="margin-top:10px;margin-right:0;margin-bottom:0;margin-left:0;
                        font-size:14px;color:#555;line-height:1.6;
                        font-family:Helvetica,Arial,sans-serif;">
                ${description}
              </p>` : ''}
              <!-- Spacer -->
              <div style="height:14px;line-height:14px;font-size:14px;">&#8203;</div>
              <!-- Footer row: View Startup button (left) + feedback (right) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td valign="middle" style="border:none;">
                    <table cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td bgcolor="#1E3A5F"
                            style="border:none;background-color:#1E3A5F;border-radius:999px;
                                   padding-top:9px;padding-right:22px;
                                   padding-bottom:9px;padding-left:22px;">
                          <a href="${baseUrl}/startup/${startupId}"
                             style="color:#ffffff;text-decoration:none;font-weight:700;
                                    font-family:Helvetica,Arial,sans-serif;font-size:14px;
                                    white-space:nowrap;display:block;">
                            View Startup
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle" align="right" width="100%" style="border:none;">
                    <table cellpadding="0" cellspacing="0" border="0" align="right" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td valign="middle"
                            style="border:none;font-size:12px;color:#999;font-family:Helvetica,Arial,sans-serif;
                                   padding-right:8px;white-space:nowrap;">
                          Helpful match?
                        </td>
                        <td valign="middle"
                            style="border-top:1px solid #d0ccc8;border-left:1px solid #d0ccc8;
                                   border-bottom:1px solid #d0ccc8;border-right:0;
                                   padding-top:6px;padding-right:10px;
                                   padding-bottom:6px;padding-left:10px;font-size:14px;">
                          <a href="${baseUrl}/api/feedback?match_id=${id}&vote=up&side=${side}"
                             style="text-decoration:none;color:#444;font-family:Helvetica,Arial,sans-serif;
                                    display:block;line-height:1;">
                            &#128077;
                          </a>
                        </td>
                        <td valign="middle"
                            style="border:1px solid #d0ccc8;
                                   padding-top:6px;padding-right:10px;
                                   padding-bottom:6px;padding-left:10px;font-size:14px;">
                          <a href="${baseUrl}/api/feedback?match_id=${id}&vote=down&side=${side}"
                             style="text-decoration:none;color:#444;font-family:Helvetica,Arial,sans-serif;
                                    display:block;line-height:1;">
                            &#128078;
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
  personStartupItems?: PersonStartupMatchItem[],
  startupItems?: StartupMatchItem[],
): string {
  const firstName = recipientName.split(' ')[0] ?? recipientName
  const matchCards = buildMatchCards(matchItems, baseUrl)

  // People↔startup section
  const personStartupSection = personStartupItems && personStartupItems.length > 0 ? `
    <!-- Section: Startups looking for someone like you — divider -->
    <tr>
      <td style="border:none;padding-top:16px;padding-right:32px;padding-bottom:0;padding-left:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr>
            <td height="1" bgcolor="#f0ede8"
                style="border:none;height:1px;line-height:1px;font-size:1px;background-color:#f0ede8;">&#8203;</td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Section: Startups looking for someone like you — header -->
    <tr>
      <td bgcolor="#ffffff"
          style="border:none;background-color:#ffffff;
                 padding-top:24px;padding-right:32px;padding-bottom:4px;padding-left:32px;">
        <p style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;
                  font-size:16px;font-weight:700;color:#1a1a1a;
                  font-family:Helvetica,Arial,sans-serif;">
          Startups looking for someone like you
        </p>
      </td>
    </tr>
    <!-- People↔startup cards -->
    ${buildPersonStartupCards(personStartupItems, baseUrl)}` : ''

  // Startup section: <tr> rows injected directly into the outer card table
  const startupSection = startupItems && startupItems.length > 0 ? `
    <!-- Startup section: divider -->
    <tr>
      <td style="border:none;padding-top:16px;padding-right:32px;padding-bottom:0;padding-left:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr>
            <td height="1" bgcolor="#f0ede8"
                style="border:none;height:1px;line-height:1px;font-size:1px;background-color:#f0ede8;">&#8203;</td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Startup section: header -->
    <tr>
      <td bgcolor="#ffffff"
          style="border:none;background-color:#ffffff;
                 padding-top:24px;padding-right:32px;padding-bottom:4px;padding-left:32px;">
        <p style="margin-top:0;margin-right:0;margin-bottom:4px;margin-left:0;
                  font-size:16px;font-weight:700;color:#1a1a1a;
                  font-family:Helvetica,Arial,sans-serif;">
          Startups in your space
        </p>
        <p style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;
                  font-size:13px;color:#888;font-family:Helvetica,Arial,sans-serif;">
          Other founders at Kellogg working in adjacent areas.
        </p>
      </td>
    </tr>
    <!-- Startup cards -->
    ${buildStartupCards(startupItems, baseUrl)}` : ''

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
            <img src="https://jfwqnupckntpgesfkbtt.supabase.co/storage/v1/object/public/assets/venn_logos/venn_logo_primary.png"
                 alt="Venn" height="30"
                 style="display:block;border:0;height:30px;">
          </td>
        </tr>

        <!-- ── Intro ── -->
        <tr>
          <td bgcolor="#ffffff"
              style="border:none;background-color:#ffffff;
                     padding-top:28px;padding-right:32px;
                     padding-bottom:8px;padding-left:32px;">
            <p style="margin-top:0;margin-right:0;margin-bottom:6px;margin-left:0;
                      font-size:12px;color:#999;text-transform:uppercase;
                      letter-spacing:0.8px;font-weight:600;
                      font-family:Helvetica,Arial,sans-serif;">
              Week of ${weekLabel}
            </p>
            <p style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;
                      font-size:22px;font-weight:700;color:#1a1a1a;
                      font-family:Helvetica,Arial,sans-serif;">
              Your matches this week
            </p>
            <p style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;
                      font-size:15px;color:#555;line-height:1.6;
                      font-family:Helvetica,Arial,sans-serif;">
              Hi ${firstName} &#8212; we think these connections are worth making. Take a look and reach out.
            </p>
          </td>
        </tr>

        <!-- ── Divider ── -->
        <tr>
          <td style="border:none;padding-top:16px;padding-right:32px;padding-bottom:0;padding-left:32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:none;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
              <tr>
                <td height="1" bgcolor="#f0ede8"
                    style="border:none;height:1px;line-height:1px;font-size:1px;background-color:#f0ede8;">&#8203;</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Match cards (each card = <tr> row) ── -->
        ${matchCards}

        <!-- ── People↔startup section (optional) ── -->
        ${personStartupSection}

        <!-- ── Startup section (optional, also <tr> rows) ── -->
        ${startupSection}

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
              You&#8217;re receiving this because you opted into Venn matching.&#32;
              <a href="${baseUrl}/profile/edit"
                 style="color:#999;text-decoration:underline;font-family:Helvetica,Arial,sans-serif;">
                Update your preferences
              </a>
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

  // ── 5.5. Fetch startup details for people↔startup matches ────────────────
  const psMatchRows = matchRows.filter((m) => m.match_type === 'people_startup')
  const matchedStartupIds = [...new Set(psMatchRows.map((m) => m.user_id_2))]

  const matchedStartupByIdMap = new Map<string, {
    id: string; startup_name: string; founder_id: string
    description: string | null; industry: string[] | null
  }>()

  if (matchedStartupIds.length > 0) {
    const { data: matchedStartupData } = await supabase
      .from('startups')
      .select('id, startup_name, description, industry, founder_id')
      .in('id', matchedStartupIds)
    for (const s of matchedStartupData ?? []) matchedStartupByIdMap.set(s.id, s)
  }

  const psFounderIds = [...new Set([...matchedStartupByIdMap.values()].map((s) => s.founder_id))]
  const psFounderByIdMap = new Map<string, string>()
  if (psFounderIds.length > 0) {
    const { data: psFounderRows } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', psFounderIds)
    for (const p of psFounderRows ?? []) {
      psFounderByIdMap.set(p.user_id, p.full_name ?? 'Unknown founder')
    }
  }

  // ── 6. Fetch startup↔startup matches for founders being emailed ───────────
  const emailedUserIds = [...userMatches.keys()]

  const { data: founderStartupRows, error: founderStartupError } = await supabase
    .from('startups')
    .select('id, founder_id, startup_name, description, industry')
    .in('founder_id', emailedUserIds)
  // Map: user_id → their startup
  const startupByFounderId = new Map(
    (founderStartupRows ?? []).map((s) => [s.founder_id, s])
  )

  // Build a Set of startup IDs (s.id) — NOT founder user IDs — for the startup_startup query
  const founderStartupIdSet = new Set((founderStartupRows ?? []).map((s) => s.id))
  const founderStartupIdList = [...founderStartupIdSet]

  const startupMatchesByStartupId = new Map<string, { otherStartupId: string; score: number }[]>()

  if (founderStartupIdList.length > 0) {
    const { data: ssMatchRows } = await supabase
      .from('matches')
      .select('user_id_1, user_id_2, match_score')
      .eq('week_of', weekOf)
      .eq('match_type', 'startup_startup')
      .or(`user_id_1.in.(${founderStartupIdList.join(',')}),user_id_2.in.(${founderStartupIdList.join(',')})`)

    for (const row of ssMatchRows ?? []) {
      // user_id_1 and user_id_2 in startup_startup rows are startup IDs, not user IDs
      const ourId   = founderStartupIdSet.has(row.user_id_1) ? row.user_id_1 : row.user_id_2
      const otherId = ourId === row.user_id_1 ? row.user_id_2 : row.user_id_1
      if (!startupMatchesByStartupId.has(ourId)) startupMatchesByStartupId.set(ourId, [])
      startupMatchesByStartupId.get(ourId)!.push({ otherStartupId: otherId, score: row.match_score ?? 0 })
    }
  }

  // Fetch details for all "other" matched startups
  const otherStartupIds = new Set<string>()
  for (const matches of startupMatchesByStartupId.values()) {
    for (const { otherStartupId } of matches) otherStartupIds.add(otherStartupId)
  }

  const otherStartupByIdMap = new Map<string, { id: string; startup_name: string; founder_id: string; description: string | null; industry: string[] | null }>()
  if (otherStartupIds.size > 0) {
    const { data: otherStartupRows } = await supabase
      .from('startups')
      .select('id, startup_name, founder_id, description, industry')
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

    // people↔people cards
    const matchItems = userMatchList
      .filter((m) => m.match_type === 'people_people')
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
          side: (isUser1 ? 1 : 2) as 1 | 2,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    // people↔startup cards (user_id_1 is always the person, side is always 1)
    const personStartupItems = userMatchList
      .filter((m) => m.match_type === 'people_startup')
      .map((m) => {
        const startup = matchedStartupByIdMap.get(m.user_id_2)
        if (!startup) return null
        const label = getMatchLabel(m.match_score ?? 0)
        return {
          id: m.id,
          startupId: m.user_id_2,
          name: startup.startup_name ?? 'Unnamed startup',
          founderName: psFounderByIdMap.get(startup.founder_id) ?? 'Unknown founder',
          industry: startup.industry ?? null,
          description: startup.description ?? null,
          label,
          blurb: m.blurb,
          side: 1 as 1 | 2,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (matchItems.length === 0 && personStartupItems.length === 0) continue

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
              name: s.startup_name ?? 'Unnamed startup',
              founderName: otherFounderByIdMap.get(s.founder_id) ?? 'Unknown founder',
              industry: s.industry ?? null,
              description: s.description ?? null,
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      }
    }

    const html = buildEmail(
      recipientName, weekLabel, matchItems, baseUrl,
      personStartupItems.length > 0 ? personStartupItems : undefined,
      startupItems,
    )

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
