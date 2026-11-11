import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { useMembersControllerList } from '@/api/members/members'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { Loaded } from './Loaded'
import styles from './Team.module.scss'

// Who signs in to the business, oldest first, with their role.
export function Members() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const members = useMembersControllerList(business.id)

  return (
    <section className={styles.section} aria-labelledby="team-members">
      <Typography variant="h5" component="h2" id="team-members">
        {t('team.members.title')}
      </Typography>
      <Loaded query={members}>
        {(list) => (
          <ul className={styles.list} aria-labelledby="team-members">
            {list.map((member) => (
              <li key={member.userId} className={styles.row}>
                <div className={styles.who}>
                  <Typography variant="t3">{member.name}</Typography>
                  <Typography variant="t4" color="grey-400">
                    {member.email}
                  </Typography>
                </div>
                <Typography variant="t4">
                  {t(`team.role.${member.role}`)}
                </Typography>
              </li>
            ))}
          </ul>
        )}
      </Loaded>
    </section>
  )
}
