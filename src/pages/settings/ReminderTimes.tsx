import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Checkbox } from 'ted-ui/Checkbox'
import { Typography } from 'ted-ui/Typography'

import { getMeControllerMeQueryKey } from '@/api/account/account'
import { useBusinessControllerSetReminders } from '@/api/businesses/businesses'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import {
  knownOffsets,
  MAX_OFFSETS,
  REMINDER_OFFSETS,
  toggled,
} from './reminderOffsets'
import styles from './SettingsPage.module.scss'

// When the clients' reminders go out: up to three of the back's fixed times.
// Only on the settings page, which a master never reaches.
export function ReminderTimes() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const queryClient = useQueryClient()
  const saved = knownOffsets(business.reminderOffsets)
  const [chosen, setChosen] = useState(saved)
  const save = useBusinessControllerSetReminders({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getMeControllerMeQueryKey(),
        }),
    },
  })
  const changed = chosen.join() !== saved.join()
  useUnsavedInput(changed)

  const full = chosen.length >= MAX_OFFSETS

  return (
    <form
      className={styles.reminders}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate({ businessId: business.id, data: { offsets: chosen } })
      }}
    >
      <Typography variant="h5" component="h2">
        {t('settings.reminders.title')}
      </Typography>
      {REMINDER_OFFSETS.map((offset) => (
        <Checkbox
          key={offset}
          label={t('settings.reminders.before', { count: offset / 60 })}
          checked={chosen.includes(offset)}
          disabled={full && !chosen.includes(offset)}
          onCheckedChange={() => setChosen(toggled(chosen, offset))}
        />
      ))}
      <Typography variant="t4" color="grey-400">
        {t(
          chosen.length
            ? 'settings.reminders.limit'
            : 'settings.reminders.none',
        )}
      </Typography>
      {save.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('notify.failed')}
        </Typography>
      )}
      {save.isSuccess &&
        save.variables.data.offsets.join() === chosen.join() && (
          <Typography variant="t4" role="status">
            {t('settings.reminders.saved')}
          </Typography>
        )}
      <Button type="submit" loading={save.isPending} disabled={!changed}>
        {t('notify.save')}
      </Button>
    </form>
  )
}
