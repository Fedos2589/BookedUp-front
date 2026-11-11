import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// The back stores and sends UTC; the app shows it in the business's time zone,
// never the browser's (AGENTS.md). Every date shown goes through here.
dayjs.extend(utc)
dayjs.extend(timezone)

// The wall-clock time (24h) in an IANA time zone at a given moment.
export const timeIn = (moment: Date, timeZone: string) =>
  dayjs(moment).tz(timeZone).format('HH:mm')
