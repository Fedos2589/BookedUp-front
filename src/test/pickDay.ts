import { fireEvent, screen } from '@testing-library/react'

// Clicks a calendar cell by its full name ("1 December 2026"): a bare day
// number also matches the same number in the neighbouring months' cells that
// fill the grid, and fails on some days of the month.
export async function pickDay(date: string) {
  const name = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`))
  fireEvent.click(await screen.findByRole('button', { name }))
}
