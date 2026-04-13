const FLAGGED_CATEGORIES = ['hate', 'harassment', 'sexual', 'violence'] as const

type ModerationResult = {
  flagged: boolean
  flags: Record<string, string[]>
}

export async function moderateText(
  fields: { field: string; text: string }[]
): Promise<ModerationResult> {
  const active = fields.filter((f) => f.text.trim() !== '')
  if (active.length === 0) return { flagged: false, flags: {} }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: active.map((f) => f.text) }),
    })

    if (!response.ok) return { flagged: false, flags: {} }

    const data = await response.json()
    const flags: Record<string, string[]> = {}

    for (let i = 0; i < active.length; i++) {
      const result = data.results?.[i]
      if (!result?.flagged) continue

      const triggered = FLAGGED_CATEGORIES.filter(
        (category) => result.categories?.[category] === true
      )
      if (triggered.length > 0) {
        flags[active[i].field] = triggered
      }
    }

    const flagged = Object.keys(flags).length > 0
    return { flagged, flags }
  } catch {
    return { flagged: false, flags: {} }
  }
}
