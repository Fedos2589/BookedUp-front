import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import type { GroupsControllerList200Item } from '@/api/generated.schemas'
import styles from '@/pages/schedule/Schedule.module.scss'
import { whenText } from './groupText'

export function GroupCard({
  group,
  onDelete,
}: {
  group: GroupsControllerList200Item
  onDelete: () => void
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const text = useRef<HTMLElement>(null)
  // Whether the description is cut by the 3-line clamp, measured on screen: a
  // long paragraph without line breaks wraps too.
  const [cut, setCut] = useState(false)
  useLayoutEffect(() => {
    const el = text.current
    if (!el || open) return
    const measure = () => setCut(el.scrollHeight > el.clientHeight)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [group.description, open])

  return (
    <li className={styles.groupCard}>
      <Typography variant="t3" component="span">
        {group.title}
      </Typography>
      <Typography variant="t4" component="span">
        {whenText(group, i18n.language)} ·{' '}
        {t('schedule.groups.seats', { count: group.capacity })}
      </Typography>
      {group.description && (
        <>
          <Typography
            ref={text}
            variant="t4"
            component="p"
            className={open ? styles.pre : `${styles.pre} ${styles.clamped}`}
          >
            {group.description}
          </Typography>
          {(cut || open) && (
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
