import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// The back stores and sends UTC; the app shows it in the business's time zone,
// never the browser's (AGENTS.md). Every date shown goes through here.
dayjs.extend(utc)
dayjs.extend(timezone)

// The wall-clock time (24h) in an IANA time zone at a given moment; undefined
// when this browser's Intl does not know the zone (an older ICU than the
// back's, which named it) — show the zone's name without a time then.
export function timeIn(moment: Date, timeZone: string): string | undefined {
  try {
    return dayjs(moment).tz(timeZone).format('HH:mm')
  } catch (error) {
    if (error instanceof RangeError) return undefined
    throw error
  }
}
