import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import type { GroupsControllerList200Item } from '@/api/generated.schemas'
import styles from '@/pages/schedule/Schedule.module.scss'
import { collapsed, whenText } from './groupText'

export function GroupCard({
  group,
  onDelete,
}: {
  group: GroupsControllerList200Item
  onDelete: () => void
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const description = group.description ? collapsed(group.description) : null

  return (
    <li className={styles.groupCard}>
      <Typography variant="t3" component="span">
        {group.title}
      </Typography>
      <Typography variant="t4" component="span">
        {whenText(group, i18n.language)} ·{' '}
        {t('schedule.groups.seats', { count: group.capacity })}
      </Typography>
      {description && (
        <>
          <Typography variant="t4" component="p" className={styles.pre}>
            {open ? group.description : description.text}
          </Typography>
          {description.hasMore && (
            <Button
              type="button"
              variant="ghost"
              colorScheme="black"
              size="small"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {t(open ? 'schedule.groups.less' : 'schedule.groups.more')}
            </Button>
          )}
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        colorScheme="black"
        size="small"
        aria-label={t('schedule.groups.delete', { title: group.title })}
        onClick={onDelete}
      >
        {t('schedule.groups.deleteShort')}
      </Button>
    </li>
  )
}
