import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { ConfirmDialog } from 'ted-ui/ConfirmDialog'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import {
  getGroupsControllerListQueryKey,
  useGroupsControllerList,
  useGroupsControllerRemove,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import styles from '@/pages/schedule/Schedule.module.scss'
import { GroupCard } from './GroupCard'
import { GroupDialog } from './GroupDialog'
import type { GroupsControllerList200Item } from '@/api/generated.schemas'

// «Groups»: a group is a recurring session with a seat limit.
export function Groups({ staffId }: { staffId: string }) {
  const { t } = useTranslation()
  const { id: businessId } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const list = useGroupsControllerList(businessId, staffId)
  // The group being changed, or `true` for a new one.
  const [editing, setEditing] = useState<GroupsControllerList200Item | true>()
  const [removing, setRemoving] = useState<{ id: string; title: string }>()
  const remove = useGroupsControllerRemove({
    mutation: {
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: getGroupsControllerListQueryKey(businessId, staffId),
        }),
    },
  })

  return (
    <section className={styles.hours}>
      <Typography variant="h5" component="h2">
        {t('schedule.groups.title')}
      </Typography>
      {list.isPending && (
        <Spinner size="medium" aria-label={t('common.loading')} />
      )}
      {list.isError && !list.data && (
        <div className={styles.failed}>
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.groups.loadFailed')}
          </Typography>
          <Button
            variant="ghost"
            colorScheme="black"
            onClick={() => void list.refetch()}
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      )}
      {list.data?.length === 0 && (
        <Typography variant="t4" component="p">
          {t('schedule.groups.empty')}
        </Typography>
      )}
      <ul className={styles.overrides}>
        {list.data?.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onEdit={() => {
              remove.reset()
              setEditing(group)
            }}
            onDelete={() => {
              remove.reset()
              setRemoving({ id: group.id, title: group.title })
            }}
          />
        ))}
      </ul>
      <Button
        type="button"
        variant="ghost"
        colorScheme="black"
        size="small"
        onClick={() => {
          remove.reset()
          setEditing(true)
        }}
      >
        {t('schedule.groups.add')}
      </Button>
      {remove.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('schedule.groups.deleteFailed')}
        </Typography>
      )}
      {editing && (
        <GroupDialog
          staffId={staffId}
          group={editing === true ? undefined : editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      {removing && (
        <ConfirmDialog
          isVisible
          colorScheme="red"
          confirmLabel={t('common.delete')}
          title={t('schedule.groups.confirmDelete')}
          loading={remove.isPending}
          onClose={() => setRemoving(undefined)}
          onConfirm={() =>
            remove.mutate(
              { businessId, staffId, groupId: removing.id },
              { onSettled: () => setRemoving(undefined) },
            )
          }
        >
          {removing.title}
        </ConfirmDialog>
      )}
    </section>
  )
}
