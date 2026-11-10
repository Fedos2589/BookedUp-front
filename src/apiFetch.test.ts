import { afterEach, expect, test, vi } from 'vitest'

import { ApiError, apiFetch } from './apiFetch'

function respond(status: number, body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(body === undefined ? null : JSON.stringify(body), {
          status,
          headers:
            body === undefined ? {} : { 'Content-Type': 'application/json' },
        }),
    ),
  )
}

afterEach(() => vi.unstubAllGlobals())

test('returns the parsed body of a 2xx answer', async () => {
  respond(200, { user: { name: 'Anna' } })

  await expect(apiFetch('/api/me', { method: 'GET' })).resolves.toEqual({
    user: { name: 'Anna' },
  })
})

test('returns undefined for an empty answer', async () => {
  respond(204)

  await expect(
    apiFetch('/api/auth/sign-out', { method: 'POST' }),
  ).resolves.toBeUndefined()
})

test('throws an ApiError with the status and the body of a non-2xx answer', async () => {
  const body = {
    statusCode: 409,
    error: 'Conflict',
    message: 'Email is taken',
    field: 'email',
  }
  respond(409, body)

  const error = await apiFetch('/api/auth/sign-up', { method: 'POST' }).catch(
    (e: unknown) => e,
  )

  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status: 409, body })
})

test('throws an ApiError without a body when the answer is not JSON', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('Bad Gateway', { status: 502 })),
  )

  await expect(apiFetch('/api/me', { method: 'GET' })).rejects.toMatchObject({
    status: 502,
    body: undefined,
  })
})
