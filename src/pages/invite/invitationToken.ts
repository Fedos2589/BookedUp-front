// The back issues tokens as base64url (32 random bytes) and accepts up to 64
// characters. Sign in carries only a token, never an address, back to the
// invitation: whatever sits in the URL, it can only lead to /invite/<token>.
const INVITATION_TOKEN = /^[A-Za-z0-9_-]{1,64}$/

export const invitationTokenOf = (value: unknown): string | undefined =>
  typeof value === 'string' && INVITATION_TOKEN.test(value) ? value : undefined
