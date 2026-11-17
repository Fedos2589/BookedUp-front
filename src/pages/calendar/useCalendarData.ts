import { useAppointmentsControllerList } from '@/api/appointments/appointments'
import { useSlotsControllerSlots } from '@/api/schedule/schedule'

// What the grid draws for the days from..to: the bookings and the meetings
// (slots), past ones included — a meeting that has started keeps its place
// and its bookings. `staffId` narrows it to one master (the week view).
export function useCalendarData(
  businessId: string,
  range: { from: string; to: string; staffId?: string },
) {
  const params = { ...range, includePast: 'true' } as const
  const appointments = useAppointmentsControllerList(businessId, params)
  const slots = useSlotsControllerSlots(businessId, params)
  return {
    appointments: appointments.data,
    slots: slots.data,
    isError:
      (appointments.isError && !appointments.data) ||
      (slots.isError && !slots.data),
    refetch: () => {
      void appointments.refetch()
      void slots.refetch()
    },
  }
}
