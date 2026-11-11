import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import {
  useInvitationsControllerList,
  useInvitationsControllerRevoke,
} from '@/api/invitations/invitations'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dateTimeIn } from '@/dates'
import { Loaded } from './Loaded'
import { changeErrorText, useReloadTeam } from './teamChanges'
import styles from './Team.module.scss'

// Links handed out and not yet accepted, revoked or expired, oldest first.
// The link itself is shown once, when it is created (InviteDialog): here an
// invitation can only be revoked.
export function Invitations({ onInvite }: { onInvite: () => void }) {
  const { t, i18n } = useTranslation()
  const business = useCurrentBusiness()
  const invitations = useInvitationsControllerList(business.id)
  const revoke = useInvitationsControllerRevoke({
    mutation: { onSettled: useReloadTeam() },
  })

  return (
    <section className={styles.section} aria-labelledby="team-invitations">
      <div className={styles.sectionHeader}>
        <Typography variant="h5" component="h2" id="team-invitations">
          {t('team.invitations.title')}
        </Typography>
        <Button
          variant="solid"
          colorScheme="black"
          size="small"
          onClick={onInvite}
        >
          {t('team.invitations.invite')}
        </Button>
      </div>
      {revoke.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {changeErrorText(t, revoke.error)}
        </Typography>
      )}
      <Loaded query={invitations}>
        {(list) =>
          list.length === 0 ? (
            <Typography variant="t4" color="grey-400">
              {t('team.invitations.none')}
            </Typography>
          ) : (
            <ul className={styles.list} aria-labelledby="team-invitations">
              {list.map((invitation) => {
                const until = dateTimeIn(
                  new Date(invitation.expiresAt),
                  business.timeZone,
                  i18n.language,
                )
                return (
                  <li key={invitation.id} className={styles.row}>
                    <div className={styles.who}>
                      <Typography variant="t3">
                        {t(`team.role.${invitation.role}`)}
                        {invitation.note && ` · ${invitation.note}`}
                      </Typography>
                      <Typography variant="t4" color="grey-400">
                        {[
                          invitation.invitedBy &&
                            t('team.invitations.invitedBy', {
                              name: invitation.invitedBy,
                            }),
                          until && t('team.invitations.until', { date: until }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                    </div>
                    <Button
                      variant="ghost"
                      colorScheme="red"
                      size="small"
                      loading={
                        revoke.isPending &&
                        revoke.variables.invitationId === invitation.id
                      }
                      onClick={() =>
                        revoke.mutate({
                          businessId: business.id,
                          invitationId: invitation.id,
                        })
                      }
                    >
                      {t('team.invitations.revoke')}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )
        }
      </Loaded>
    </section>
  )
}
