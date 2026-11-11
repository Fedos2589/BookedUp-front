import { useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'

import { getInvitationsControllerListQueryKey } from '@/api/invitations/invitations'
import { getMembersControllerListQueryKey } from '@/api/members/members'
import { getStaffControllerListQueryKey } from '@/api/staff/staff'
import { ApiError } from '@/apiFetch'
import { useCurrentBusiness } from '@/business/currentBusiness'

// Every list of the page, after any change to the team, failed ones too: the
// back is the truth, and one change moves several lists (an accepted
// invitation becomes a member; a removed member leaves a schedule behind).
export function useReloadTeam() {
  const queryClient = useQueryClient()
  const { id } = useCurrentBusiness()

  return () =>
    Promise.all(
      [
        getMembersControllerListQueryKey(id),
        getInvitationsControllerListQueryKey(id),
        getStaffControllerListQueryKey(id),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )
}

// 404 and 409: what was changed is gone or changed by someone else since the
// list was loaded. The lists reload either way; this says why they moved.
export function changeErrorText(t: TFunction, error: unknown) {
  if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 409)
  )
    return t('team.changedMeanwhile')
  return t('team.saveFailed')
}
