export const MATCH_THRESHOLDS = {
  perfectFit: 85,
  strongMatch: 70,
  goodMatch: 55,
  worthACoffee: 40,
  minimum: 40,
}

export function getMatchLabel(score: number): string {
  if (score >= MATCH_THRESHOLDS.perfectFit) return "Perfect Fit"
  if (score >= MATCH_THRESHOLDS.strongMatch) return "Strong Match"
  if (score >= MATCH_THRESHOLDS.goodMatch) return "Good Match"
  if (score >= MATCH_THRESHOLDS.worthACoffee) return "Worth a Coffee"
  return "Worth a Coffee"
}

export function getMatchLabelColor(label: string): string {
  switch (label) {
    case "Perfect Fit": return "#1E3A5F"
    case "Strong Match": return "#1E3A5F"
    case "Good Match": return "#2E7D32"
    case "Worth a Coffee": return "#E65100"
    default: return "#757575"
  }
}
