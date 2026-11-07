// Safe user-facing errors; never expose provider payloads or credentials.
export function chatServiceError(err) {
  if (err?.status === 401 || err?.status === 403) return {error: 'Chat is unavailable because the server’s AI credentials were rejected. The site owner needs to update them.', code: 'AI_AUTH_FAILED'};
  if (err?.status === 429) return {error: 'The AI service is at its usage limit. Please try again later.', code: 'AI_RATE_LIMITED'};
  return {error: 'Claude could not answer right now. Please try again.', code: 'AI_UNAVAILABLE'};
}
