import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useUnsavedInput } from '@/pwa/unsavedInput'
import {
  type BookingForm,
  bookingSchema,
  clientPhone,
  conflictCode,
} from './newBooking'

// The client's name, phone and note: the form, its defaults by language, the
// report of unsaved input, and the form's values as the back takes them
// (undefined while the phone is not a whole number).
export function useClientForm() {
  const { i18n } = useTranslation()
  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientName: '',
      country: i18n.language === 'ru' ? 'RU' : 'US',
      phone: '',
      note: '',
    },
  })
  useUnsavedInput(form.formState.isDirty)

  const clientOf = (values: BookingForm) => {
    const phone = clientPhone(values.country, values.phone)
    if (!phone) return undefined
    return {
      newClient: { name: values.clientName, phone },
      ...(values.note && { note: values.note }),
    }
  }

  // The back's 409 `phoneTaken` goes to the phone field; false for any other
  // refusal, which the dialog words itself.
  const showPhoneTaken = (error: unknown) => {
    if (conflictCode(error) !== 'phoneTaken') return false
    form.setError('phone', { message: 'validation.phoneTaken' })
    return true
  }

  return { form, clientOf, showPhoneTaken }
}
