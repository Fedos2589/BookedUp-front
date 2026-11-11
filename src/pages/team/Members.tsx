import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import type { MembersControllerList200Item } from '@/api/generated.schemas'
import { useMeControllerMeSuspense } from '@/api/account/account'
import {
  useMembersControllerChangeRole,
  useMembersControllerList,
  useMembersControllerRemove,
} from '@/api/members/members'
import { useStaffControllerCreate } from '@/api/staff/staff'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { roleManages, rolesManagedBy } from '@/business/roles'
import { Loaded } from './Loaded'
import { changeErrorText, useReloadTeam } from './teamChanges'
import styles from './Team.module.scss'

type Member = MembersControllerList200Item

// Who signs in to the business, oldest first, with their role; the members
// this account manages (roles.ts) can be moved to another role or removed.
export function Members() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const { data: account } = useMeControllerMeSuspense()
  const members = useMembersControllerList(business.id)
  const [removing, setRemoving] = useState<Member>()

  const reload = useReloadTeam()
  const changeRole = useMembersControllerChangeRole({
    mutation: { onSettled: reload },
  })
  const remove = useMembersControllerRemove({
    mutation: { onSettled: reload },
  })
  const addSchedule = useStaffControllerCreate({
    mutation: { onSettled: reload },
  })
  const failed = changeRole.error ?? remove.error ?? addSchedule.error
  // One change at a time: each mutation shows the spinner and the error of its
  // last call only, so a second click would hide the first (review of #7).
  const busy = changeRole.isPending || addSchedule.isPending
  const resetErrors = () => {
    changeRole.reset()
    remove.reset()
    addSchedule.reset()
  }
  // The back's rule for a schedule (staff.service.ts): your own, or one of a
  // member you manage.
  const mayAddSchedule = (member: Member) =>
    member.staffId === null &&
    (member.userId === account.user.id ||
      roleManages(business.role, member.role))

  return (
    <section className={styles.section} aria-labelledby="team-members">
      <Typography variant="h5" component="h2" id="team-members">
        {t('team.members.title')}
      </Typography>
      {failed && (
        <Typography variant="t4" color="red-300" role="alert">
          {changeErrorText(t, failed)}
        </Typography>
      )}
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
                  {member.staffId && (
                    <Typography variant="t4" color="grey-400">
                      {t('team.members.takesClients')}
                    </Typography>
                  )}
                </div>
                <div className={styles.actions}>
                  <Typography variant="t4">
                    {t(`team.role.${member.role}`)}
                  </Typography>
                  {mayAddSchedule(member) && (
                    <Button
                      variant="ghost"
                      colorScheme="grey"
                      size="small"
                      disabled={busy}
                      loading={
                        addSchedule.isPending &&
                        addSchedule.variables.data.userId === member.userId
                      }
                      onClick={() => {
                        resetErrors()
                        addSchedule.mutate({
                          businessId: business.id,
                          data: { name: member.name, userId: member.userId },
                        })
                      }}
                    >
                      {t('team.members.addSchedule')}
                    </Button>
                  )}
                  {roleManages(business.role, member.role) && (
                    <>
                      {rolesManagedBy(business.role)
                        .filter((role) => role !== member.role)
                        .map((role) => (
                          <Button
                            key={role}
                            variant="ghost"
                            colorScheme="grey"
                            size="small"
                            disabled={busy}
                            loading={
                              changeRole.isPending &&
                              changeRole.variables.userId === member.userId
                            }
                            onClick={() => {
                              resetErrors()
                              changeRole.mutate({
                                businessId: business.id,
                                userId: member.userId,
                                data: { role },
                              })
                            }}
                          >
                            {t(`team.members.makeRole.${role}`)}
                          </Button>
                        ))}
                      <Button
                        variant="ghost"
                        colorScheme="red"
                        size="small"
                        disabled={busy}
                        onClick={() => {
                          resetErrors()
                          setRemoving(member)
                        }}
                      >
                        {t('team.members.remove')}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Loaded>
      <Modal
        isVisible={!!removing}
        title={t('team.members.removeTitle', { name: removing?.name })}
        onClose={() => setRemoving(undefined)}
        buttons={[
          {
            variant: 'ghost',
            colorScheme: 'grey',
            children: t('team.cancel'),
            onClick: () => setRemoving(undefined),
          },
          {
            variant: 'solid',
            colorScheme: 'red',
            children: t('team.members.remove'),
            loading: remove.isPending,
            onClick: () =>
              removing &&
              // Closed on any answer: the error shows above the list, and a
              // member gone meanwhile can't be removed again (review of #7).
              remove.mutate(
                { businessId: business.id, userId: removing.userId },
                { onSettled: () => setRemoving(undefined) },
              ),
          },
        ]}
      >
        <Typography variant="t3" component="p">
          {t('team.members.removeText', { business: business.name })}
        </Typography>
      </Modal>
    </section>
  )
}
