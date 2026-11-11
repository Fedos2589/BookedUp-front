import { Navigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { useCurrentBusiness } from '@/business/currentBusiness'
import { roleCan } from '@/business/roles'
import { InviteDialog } from './InviteDialog'
import { Invitations } from './Invitations'
import { Members } from './Members'
import styles from './Team.module.scss'

// Who works in the business and who is invited to: the owner's and the
// admins' page (roles.ts). Each section loads its own list.
export function TeamPage() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const [inviting, setInviting] = useState(false)

  // The navigation has no link here for this role; an address typed by hand
  // lands on the dashboard, without asking the back for what it would refuse.
  if (!roleCan(business.role, 'viewTeam')) return <Navigate to="/" replace />

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('team.title')}
      </Typography>
      <Members />
      <Invitations onInvite={() => setInviting(true)} />
      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
    </main>
  )
}
