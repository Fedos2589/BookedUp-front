// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import '@/i18n'
import { fakeApi } from '@/test/fakeApi'
import { ConfirmPhone } from './ConfirmPhone'

const START = 'POST /api/public/client-login'
const STATUS = 'GET /api/public/client-login'

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function show(onConfirmed = vi.fn(async () => true)) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ConfirmPhone onConfirmed={onConfirmed} />
    </QueryClientProvider>,
  )
  return onConfirmed
}

const count = (api: { calls: { route: string }[] }, route: string) =>
  api.calls.filter((call) => call.route === route).length

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  })
  document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
}

test('gives a link to the bot, polls while pending, and stops once confirmed', async () => {
  let answers = ['pending', 'pending', 'confirmed']
  const api = fakeApi({
    [START]: [201, { url: 'https://t.me/bot?start=abc' }],
    [STATUS]: () => [200, { status: answers.shift() ?? 'confirmed' }],
  })
  const onConfirmed = show()

  const link = await screen.findByRole('link', { name: 'Open Telegram' })
  expect(link.getAttribute('href')).toBe('https://t.me/bot?start=abc')
  expect(await screen.findByText('Waiting for confirmation…')).toBeTruthy()
  expect(api.calls[0].body).toEqual({ locale: 'en' })

  await tick(2000)
  await tick(2000)
  expect(onConfirmed).toHaveBeenCalledTimes(1)

  const polled = count(api, STATUS)
  await tick(10000)
  expect(count(api, STATUS)).toBe(polled)
})

test('does not poll while the page is hidden', async () => {
  const api = fakeApi({
    [START]: [201, { url: 'https://t.me/bot?start=abc' }],
    [STATUS]: [200, { status: 'pending' }],
  })
  show()
  await screen.findByRole('link', { name: 'Open Telegram' })
  await tick(0)

  setVisibility('hidden')
  const polled = count(api, STATUS)
  await tick(10000)
  expect(count(api, STATUS)).toBe(polled)

  setVisibility('visible')
  await tick(0)
  expect(count(api, STATUS)).toBeGreaterThan(polled)
})

test('an expired login offers to try again with a new one', async () => {
  const api = fakeApi({
    [START]: [201, { url: 'https://t.me/bot?start=abc' }],
    [STATUS]: [200, { status: 'expired' }],
  })
  show()
  await screen.findByText('The link expired')

  api.set(STATUS, [200, { status: 'pending' }])
  await act(async () =>
    screen.getByRole('button', { name: 'Try again' }).click(),
  )

  expect(await screen.findByText('Waiting for confirmation…')).toBeTruthy()
  expect(count(api, START)).toBe(2)
})

test("shows the sign-in's code, a new one after Try again", async () => {
  const codes = ['4821', '7305']
  const api = fakeApi({
    [START]: () => [
      201,
      { url: 'https://t.me/bot?start=abc', code: codes.shift() },
    ],
    [STATUS]: [200, { status: 'pending' }],
  })
  show()
  expect(await screen.findByText(/4821/)).toBeTruthy()

  api.set(STATUS, [200, { status: 'expired' }])
  await tick(2000)
  await screen.findByText('The link expired')

  api.set(STATUS, [200, { status: 'pending' }])
  await act(async () =>
    screen.getByRole('button', { name: 'Try again' }).click(),
  )
  expect(await screen.findByText(/7305/)).toBeTruthy()
  expect(screen.queryByText(/4821/)).toBeNull()
})

test('shows the code while waiting', async () => {
  fakeApi({
    [START]: [201, { url: 'https://t.me/bot?start=abc', code: '4821' }],
    [STATUS]: [200, { status: 'pending' }],
  })
  show()
  expect(
    await screen.findByText('Code: 4821 — the bot will ask you to compare it'),
  ).toBeTruthy()
})

test('shows no code line when the start answer has no code', async () => {
  fakeApi({
    [START]: [201, { url: 'https://t.me/bot?start=abc' }],
    [STATUS]: [200, { status: 'pending' }],
  })
  show()
  await screen.findByRole('link', { name: 'Open Telegram' })
  expect(screen.queryByText(/^Code:/)).toBeNull()
})

test('says so when Telegram is off or there were too many tries', async () => {
  fakeApi({ [START]: [404, { code: 'channelOff' }] })
  show()
  await screen.findByText(/call the business/)
  cleanup()

  fakeApi({ [START]: [429] })
  show()
  await screen.findByText('Too many attempts, try later')
})

test('a 429 on starting offers to try again', async () => {
  const api = fakeApi({ [START]: [429] })
  show()
  await screen.findByText('Too many attempts, try later')

  api.set(START, [201, { url: 'https://t.me/bot?start=abc' }])
  api.set(STATUS, [200, { status: 'pending' }])
  await act(async () =>
    screen.getByRole('button', { name: 'Try again' }).click(),
  )
  expect(
    await screen.findByRole('link', { name: 'Open Telegram' }),
  ).toBeTruthy()
})

test('confirmed but no session behind it says so and offers a new try', async () => {
  fakeApi({
    [START]: [201, { url: 'https://t.me/bot?start=abc' }],
    [STATUS]: [200, { status: 'confirmed' }],
  })
  show(vi.fn(async () => false))

  expect(
    await screen.findByText("Couldn't confirm the phone. Try again."),
  ).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
})

test('a login confirmed before is not this login’s answer', async () => {
  fakeApi({
    [START]: [201, { url: 'https://t.me/bot?start=abc' }],
    [STATUS]: [200, { status: 'pending' }],
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(['/api/public/client-login'], {
    status: 'confirmed',
  })
  const onConfirmed = vi.fn(async () => true)
  render(
    <QueryClientProvider client={queryClient}>
      <ConfirmPhone onConfirmed={onConfirmed} />
    </QueryClientProvider>,
  )

  await screen.findByRole('link', { name: 'Open Telegram' })
  expect(onConfirmed).not.toHaveBeenCalled()
})
