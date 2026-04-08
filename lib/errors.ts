export function getFriendlyError(error: { message?: string; code?: string } | null | undefined, context?: 'upload' | 'save' | 'load'): string {
  if (!error) return 'Something went wrong. Please try again.'

  const code = error.code ?? ''
  const message = (error.message ?? '').toLowerCase()

  if (context === 'upload') return 'Photo upload failed. Please try a different image.'
  if (code === '42501' || message.includes('row-level security') || message.includes('permission')) return "You don't have permission to make this change."
  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) return 'This entry already exists.'
  if (code === '23502' || message.includes('not-null') || message.includes('null value')) return 'Please complete all required fields.'
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout') || message.includes('failed to fetch')) return 'Something went wrong. Please check your connection and try again.'
  if (context === 'load') return "This page couldn't be loaded. Please try again."
  return 'Something went wrong. Please try again.'
}
