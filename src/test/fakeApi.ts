import { vi } from 'vitest'

type Answer = [status: number, body?: unknown]
// 'POST /api/auth/sign-in' → an answer, or a function of the request body
// (which may answer later: a promise holds the request in flight).
type Routes = Record<
  string,
  Answer | ((body: unknown) => Answer | Promise<Answer>)
>

export type ApiCall = { route: string; body: unknown }

// Stubs fetch with fixed answers per route and records every call. An unknown
// route fails the test loudly instead of hanging on a real network.
export function fakeApi(routes: Routes) {
  const calls: ApiCall[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const route = `${init.method ?? 'GET'} ${url}`
      const body = init.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ route, body })

      const handler = routes[route]
      if (!handler) throw new Error(`fakeApi: no answer for ${route}`)
      const [status, answer] =
        typeof handler === 'function' ? await handler(body) : handler
      return new Response(
        answer === undefined ? null : JSON.stringify(answer),
        { status, headers: { 'Content-Type': 'application/json' } },
      )
    }),
  )

  return {
    calls,
    // Changes an answer mid-test (e.g. GET /me after signing out).
    set(route: string, answer: Answer) {
      routes[route] = answer
    },
  }
}

// An answer the test sends when it chooses: `route: later.answer`, then
// `later.send([201, body])` while the request is in flight.
export function deferredAnswer() {
  let send: (answer: Answer) => void = () => {}
  const answer = () =>
    new Promise<Answer>((resolve) => {
      send = resolve
    })
  return { answer, send: (answer: Answer) => send(answer) }
}

export const account = {
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'anna@example.com',
    name: 'Anna',
  },
  businesses: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Judo Kids',
      slug: 'judo-kids',
      timeZone: 'Asia/Bangkok',
      role: 'OWNER',
    },
  ],
}
