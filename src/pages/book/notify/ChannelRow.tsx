import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import styles from './NotifyMe.module.scss'

type Props = {
  label: string
  note?: string
  on: boolean
  loading: boolean
  onTurnOn: () => void
  // Absent where the back has no way to turn the channel off.
  onTurnOff?: () => void
}

// One channel: a button while it is off, «On» and «Turn off» once it is on.
export function ChannelRow({
  label,
  note,
  on,
  loading,
  onTurnOn,
  onTurnOff,
}: Props) {
  const { t } = useTranslation()
  return (
    <li className={styles.row}>
      {on ? (
        <>
          <Typography variant="t2">{label}</Typography>
          <Typography variant="t2" color="grey-500">
            {t('notify.on')}
          </Typography>
          {onTurnOff && (
            <Button
              variant="ghost"
              colorScheme="blue"
              loading={loading}
              onClick={onTurnOff}
            >
              {t('notify.turnOff')}
            </Button>
          )}
        </>
      ) : (
        <Button
          variant="solid"
          colorScheme="grey"
          loading={loading}
          onClick={onTurnOn}
        >
          {label}
        </Button>
      )}
      {note && (
        <Typography variant="t4" color="grey-500">
          {note}
        </Typography>
      )}
    </li>
  )
}
