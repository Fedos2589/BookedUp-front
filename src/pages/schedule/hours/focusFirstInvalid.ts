// A failed submit moves focus to the first field with an error (kit a11y
// rule), so the keyboard and screen reader land on it, not on the button. The
// errors render after the submit's state update, hence the frame.
export function focusFirstInvalid(form: HTMLElement | null) {
  requestAnimationFrame(() =>
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
  )
}
