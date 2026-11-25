// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(cleanup)

const REMINDERS = `PUT /api/businesses/${account.businesses[0].id}/reminders`
const box = (name: string) => screen.getByRole('checkbox', { name })
// happy-dom runs a click on the box inside its label twice; the label's text once.
const tick = (name: string) => fireEvent.click(screen.getByText(name))

test('the settings show the business reminder times, a 4th is not allowed', async () => {
  fakeApi({ 'GET /api/me': [200, account] })
  renderApp('/settings')
  await screen.findByRole('heading', { name: 'Reminders to clients' })

  expect(box('24 hours before').getAttribute('aria-checked')).toBe('true')
  tick('1 hour before')
  tick('2 hours before')
  await waitFor(() =>
    expect(box('3 hours before').getAttribute('aria-disabled')).toBe('true'),
  )
  expect(box('48 hours before').getAttribute('aria-disabled')).toBe('true')
  // A checked one can still be unchecked.
  expect(box('24 hours before').getAttribute('aria-disabled')).not.toBe('true')
  expect(screen.getByText('Up to 3')).toBeTruthy()
})

test('save sends the offsets sorted and says so', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    [REMINDERS]: [200, {}],
  })
  renderApp('/settings')
  await screen.findByRole('heading', { name: 'Reminders to clients' })

  tick('48 hours before')
  tick('1 hour before')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() =>
    expect(api.calls.find((c) => c.route === REMINDERS)?.body).toEqual({
      offsets: [60, 1440, 2880],
    }),
  )
  await screen.findAllByText('Saved')
})

test('no times at all is allowed and says clients get no reminders', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    [REMINDERS]: [200, {}],
  })
  renderApp('/settings')
  await screen.findByRole('heading', { name: 'Reminders to clients' })

  tick('24 hours before')
  expect(await screen.findByText('Clients get no reminders')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() =>
    expect(api.calls.find((c) => c.route === REMINDERS)?.body).toEqual({
      offsets: [],
    }),
  )
})

test('a master does not get to the settings, so not to the times either', async () => {
  fakeApi({
    'GET /api/me': [
      200,
      {
        ...account,
        businesses: [{ ...account.businesses[0], role: 'MASTER' }],
      },
    ],
  })
  const { router } = renderApp('/settings')

  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(
    screen.queryByRole('heading', { name: 'Reminders to clients' }),
  ).toBeNull()
})

test('a newer saved choice from /me replaces the untouched form', async () => {
  const api = fakeApi({ 'GET /api/me': [200, account] })
  const { queryClient } = renderApp('/settings')
  await screen.findByRole('heading', { name: 'Reminders to clients' })

  api.set('GET /api/me', [
    200,
    {
      ...account,
      businesses: [{ ...account.businesses[0], reminderOffsets: [60, 1440] }],
    },
  ])
  await queryClient.invalidateQueries()

  await waitFor(() =>
    expect(box('1 hour before').getAttribute('aria-checked')).toBe('true'),
  )
  // Nothing was typed, so there is nothing to save.
  expect(
    screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled'),
  ).toBe(true)
})

test('a failed save shows its error until the choice changes', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [REMINDERS]: [500],
  })
  renderApp('/settings')
  await screen.findByRole('heading', { name: 'Reminders to clients' })

  tick('1 hour before')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await screen.findAllByText(/^Couldn.t/)

  tick('2 hours before')
  await waitFor(() => expect(screen.queryByText(/^Couldn.t/)).toBeNull())
})
