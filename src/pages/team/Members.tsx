import { useQueryClient } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import type { MembersControllerList200Item } from '@/api/generated.schemas'
import {
  getMembersControllerListQueryKey,
  useMembersControllerChangeRole,
  useMembersControllerList,
  useMembersControllerRemove,
} from '@/api/members/members'
import { getStaffControllerListQueryKey } from '@/api/staff/staff'
import { ApiError } from '@/apiFetch'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { roleManages, rolesManagedBy } from '@/business/roles'
import { Loaded } from './Loaded'
import styles from './Team.module.scss'

type Member = MembersControllerList200Item

// 404 and 409: the member was removed or changed by someone else since the
// list was loaded. The list is reloaded either way; this says why it moved.
function changeErrorText(t: TFunction, error: unknown) {
  if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 409)
  )
    return t('team.changedMeanwhile')
  return t('team.saveFailed')
}

// Who signs in to the business, oldest first, with their role; the members
// this account manages (roles.ts) can be moved to another role or removed.
export function Members() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const queryClient = useQueryClient()
  const members = useMembersControllerList(business.id)
  const [removing, setRemoving] = useState<Member>()

  // The back is the truth after any change, failed ones included. A removed
  // member's schedule stays, without an account: the staff list moves too.
  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: getMembersControllerListQueryKey(business.id),
      }),
      queryClient.invalidateQueries({
        queryKey: getStaffControllerListQueryKey(business.id),
      }),
    ])
  const changeRole = useMembersControllerChangeRole({
    mutation: { onSettled: reload },
  })
  const remove = useMembersControllerRemove({
    mutation: { onSettled: reload, onSuccess: () => setRemoving(undefined) },
  })
  const failed = changeRole.error ?? remove.error

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
                </div>
                <div className={styles.actions}>
                  <Typography variant="t4">
                    {t(`team.role.${member.role}`)}
                  </Typography>
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
                            loading={
                              changeRole.isPending &&
                              changeRole.variables.userId === member.userId
                            }
                            onClick={() => {
                              remove.reset()
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
                        onClick={() => {
                          changeRole.reset()
                          remove.reset()
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
              remove.mutate({
                businessId: business.id,
                userId: removing.userId,
              }),
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
