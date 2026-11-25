import { parsePhoneNumberFromString } from 'libphonenumber-js'

// +66812345678 → +66 81 234 5678; what isn't a whole number is shown as it is.
export const formatPhone = (phone: string) =>
  parsePhoneNumberFromString(phone)?.formatInternational() ?? phone
