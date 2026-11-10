// The IANA zones a browser knows, for picking the business's time zone.
export function supportedTimeZones(): string[] {
  return Intl.supportedValuesOf('timeZone')
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// Intl's list holds canonical names only, so a browser set to `UTC` would not
// find its own zone there; the back accepts both.
export function timeZoneOptions(
  zones: readonly string[],
  browserZone: string,
): string[] {
  return [...new Set([...zones, browserZone])].sort()
}
