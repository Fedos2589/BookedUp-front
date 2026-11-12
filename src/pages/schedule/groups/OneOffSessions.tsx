import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { ConfirmDialog } from 'ted-ui/ConfirmDialog'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import {
  getGroupsControllerSessionsQueryKey,
  useGroupsControllerRemoveSession,
  useGroupsControllerSessions,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import styles from '@/pages/schedule/Schedule.module.scss'
import { useNow } from '@/useNow'
import { sessionWhenText } from './groupText'
import { OneOffSessionDialog } from './OneOffSessionDialog'

// Sessions that happen once; the ones already over are not shown.
export function OneOffSessions({ staffId }: { staffId: string }) {
  const { t, i18n } = useTranslation()
  const { id: businessId, timeZone } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const now = useNow()
  const list = useGroupsControllerSessions(businessId, staffId)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<{ id: string; title: string }>()
  const remove = useGroupsControllerRemoveSession({
    mutation: {
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: getGroupsControllerSessionsQueryKey(businessId, staffId),
        }),
    },
  })
  const coming = list.data?.filter((s) => Date.parse(s.endsAt) > now.getTime())

  return (
    <section className={styles.hours}>
      <Typography variant="h5" component="h2">
        {t('schedule.sessions.title')}
      </Typography>
      {list.isPending && (
        <Spinner size="medium" aria-label={t('common.loading')} />
      )}
      {list.isError && !list.data && (
        <div className={styles.failed}>
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.sessions.loadFailed')}
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
      {coming?.length === 0 && (
        <Typography variant="t4" component="p">
          {t('schedule.sessions.empty')}
        </Typography>
      )}
      <ul className={styles.overrides}>
        {coming?.map((session) => (
          <li key={session.id} className={styles.groupCard}>
            <Typography variant="t3" component="span">
              {session.title}
            </Typography>
            <Typography variant="t4" component="span">
              {sessionWhenText(session, timeZone, i18n.language)} ·{' '}
              {t('schedule.groups.seats', { count: session.capacity })}
            </Typography>
            <Button
              type="button"
              variant="ghost"
              colorScheme="black"
              size="small"
              aria-label={t('schedule.sessions.delete', {
                title: session.title,
              })}
              onClick={() => {
                remove.reset()
                setRemoving({ id: session.id, title: session.title })
              }}
            >
              {t('schedule.groups.deleteShort')}
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="ghost"
        colorScheme="black"
        size="small"
        onClick={() => setAdding(true)}
      >
        {t('schedule.sessions.add')}
      </Button>
      {remove.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('schedule.sessions.deleteFailed')}
        </Typography>
      )}
      {adding && (
        <OneOffSessionDialog
          staffId={staffId}
          onClose={() => setAdding(false)}
        />
      )}
      {removing && (
        <ConfirmDialog
          isVisible
          colorScheme="red"
          confirmLabel={t('common.delete')}
          title={t('schedule.sessions.confirmDelete')}
          loading={remove.isPending}
          onClose={() => setRemoving(undefined)}
          onConfirm={() =>
            remove.mutate(
              { businessId, staffId, id: removing.id },
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
