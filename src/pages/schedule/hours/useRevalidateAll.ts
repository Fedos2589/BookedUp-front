import { useEffect } from 'react'
import { useWatch, type FieldValues, type UseFormReturn } from 'react-hook-form'

// After the first submit, check the whole form on every change. react-hook-form
// re-checks only the field that changed, and the week's rules sit on the
// interval or the day and look at other fields too (an overlap with a
// neighbour, the booking step, a day ticked off), so a fixed interval would
// stay red until the next submit.
export function useRevalidateAll<T extends FieldValues>(
  form: UseFormReturn<T>,
) {
  const values = useWatch({ control: form.control })
  const { isSubmitted } = form.formState
  const { trigger } = form
  useEffect(() => {
    if (isSubmitted) void trigger()
  }, [values, isSubmitted, trigger])
}
