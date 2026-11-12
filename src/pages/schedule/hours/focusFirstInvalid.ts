// A failed submit moves focus to the first field with an error (kit a11y
// rule), so the keyboard and screen reader land on it, not on the button. The
// errors render after the submit's state update, which can take a frame or two
// (react-hook-form publishes them a tick after the handler runs).
const FRAMES = 3

export function focusFirstInvalid(form: HTMLElement | null, frames = FRAMES) {
  requestAnimationFrame(() => {
    const field = form?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (field) field.focus()
    else if (frames > 1) focusFirstInvalid(form, frames - 1)
  })
}
