import { useEffect } from 'react'

// Forms holding typed input right now: a new app version waits for them
// (updatePolicy.ts), since switching versions reloads the page.
const dirtyForms = new Set<symbol>()

export const hasUnsavedInput = () => dirtyForms.size > 0

// In a form: `useUnsavedInput(form.formState.isDirty)`.
export function useUnsavedInput(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    const form = Symbol('dirty form')
    dirtyForms.add(form)
    return () => {
      dirtyForms.delete(form)
    }
  }, [isDirty])
}
