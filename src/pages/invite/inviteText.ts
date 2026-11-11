import type { TFunction } from 'i18next'

import type { InvitationLinkControllerPreview200 } from '@/api/generated.schemas'

// «Anna invites you as a master», or without an inviter «You're invited as …».
export function inviteText(
  t: TFunction,
  { invitedBy, role }: InvitationLinkControllerPreview200,
) {
  const asRole = t(`invite.asRole.${role}`)
  return invitedBy
    ? t('invite.byInviter', { inviter: invitedBy, role: asRole })
    : t('invite.anonymous', { role: asRole })
}
