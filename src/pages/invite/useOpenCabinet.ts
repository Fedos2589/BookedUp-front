import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { meQueryKey } from '@/auth/session'

// After joining, the cabinet asks GET /me again and finds the new business.
export function useOpenCabinet() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: meQueryKey() })
    await navigate({ to: '/' })
  }
}
