// The fetch every generated API hook goes through (orval.config.ts `mutator`).
// A non-2xx answer throws, so TanStack Query reports it as an error instead of
// handing a 409 to `onSuccess`.

export class ApiError<Body = unknown> extends Error {
  readonly status: number
  // The answer's JSON (NestJS error shape), or undefined when it had none.
  readonly body: Body | undefined

  constructor(status: number, body: Body | undefined) {
    super(`API answered ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

// Orval types each hook's error with this: ApiError<the endpoint's error bodies>.
export type ErrorType<Body> = ApiError<Body>

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export async function apiFetch<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = await readJson(response)
  if (!response.ok) throw new ApiError(response.status, body)
  return body as T
}
