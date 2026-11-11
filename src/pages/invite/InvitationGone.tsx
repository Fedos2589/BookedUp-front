import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { AuthLayout } from '@/pages/auth/AuthLayout'

// A link that no longer works: used, revoked, expired, or no token at all.
export function InvitationGone() {
  const { t } = useTranslation()
  return (
    <AuthLayout title={t('invite.goneTitle')}>
      <Typography variant="t3">{t('invite.goneText')}</Typography>
    </AuthLayout>
  )
}
