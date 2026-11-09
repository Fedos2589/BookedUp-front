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
    },
  },
})
