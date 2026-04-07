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
    case "Perfect Fit": return "#0D7377"
    case "Strong Match": return "#7B1D3A"
    case "Good Match": return "#0284C7"
    case "Worth a Coffee": return "#E65100"
    default: return "#757575"
  }
}
