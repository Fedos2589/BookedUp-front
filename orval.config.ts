import { defineConfig } from 'orval'

// Generates types and TanStack Query hooks from the back's Swagger.
// Run with the back up: `npm run api:generate`.
export default defineConfig({
  bookedup: {
    input: process.env.OPENAPI_URL ?? 'http://localhost:3000/api/docs-json',
    output: {
      target: 'src/api/generated.ts',
      client: 'react-query',
      mode: 'tags-split',
      // The browser calls the API on the app's own origin, under /api: the Vite
      // proxy (vite.config.ts) and, later, the production reverse proxy strip it.
      baseUrl: '/api',
      override: {
        // Throws on a non-2xx answer, so a 409 is a query error, not data.
        mutator: { path: 'src/apiFetch.ts', name: 'apiFetch' },
        // Hooks return the body itself; the status lives on ApiError.
        fetch: { includeHttpResponseReturnType: false },
        // useXSuspense hooks: data a route's beforeLoad has already loaded.
        query: { useSuspenseQuery: true },
      },
    },
  },
})
