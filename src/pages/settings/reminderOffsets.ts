import {
  BusinessControllerSetRemindersBodyOffsetsItem as Offset,
  type BusinessControllerSetRemindersBodyOffsetsItem,
} from '@/api/generated.schemas'

export type ReminderOffset = BusinessControllerSetRemindersBodyOffsetsItem

// Minutes before a booking, in the order they are shown. The back accepts
// only these, at most MAX_OFFSETS of them.
export const REMINDER_OFFSETS: ReminderOffset[] = [
  Offset.NUMBER_60,
  Offset.NUMBER_120,
  Offset.NUMBER_180,
  Offset.NUMBER_1440,
  Offset.NUMBER_2880,
]
export const MAX_OFFSETS = 3

// What the business has saved, as the form's starting point: only offsets the
// back still accepts.
export const knownOffsets = (saved: number[]) =>
  REMINDER_OFFSETS.filter((offset) => saved.includes(offset))

// The choice with one offset on or off, kept in the order they are shown.
export const withOffset = (
  chosen: ReminderOffset[],
  offset: ReminderOffset,
  on: boolean,
) => REMINDER_OFFSETS.filter((o) => (o === offset ? on : chosen.includes(o)))
