import { useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { Checkbox } from 'ted-ui/Checkbox'
import { LiveRegion } from 'ted-ui/LiveRegion/LiveRegion'
import { Typography } from 'ted-ui/Typography'

import { getMeControllerMeQueryKey } from '@/api/account/account'
import { useBusinessControllerSetReminders } from '@/api/businesses/businesses'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import {
  knownOffsets,
  MAX_OFFSETS,
  REMINDER_OFFSETS,
  withOffset,
} from './reminderOffsets'
import styles from './SettingsPage.module.scss'

// When the clients' reminders go out: up to three of the back's fixed times.
// Only on the settings page, which a master never reaches.
export function ReminderTimes() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const queryClient = useQueryClient()
  const saved = knownOffsets(business.reminderOffsets)
  const hintId = useId()
  const [chosen, setChosen] = useState(saved)
  // The saved times can change under an open form (another window, a
  // refetch): an untouched form follows them, a touched one keeps its input.
  const [seen, setSeen] = useState(saved.join())
  if (seen !== saved.join()) {
    setSeen(saved.join())
    if (chosen.join() === seen) setChosen(saved)
  }
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
  const justSaved =
    save.isSuccess && save.variables.data.offsets.join() === chosen.join()
  const failed = save.isError ? t('notify.failed') : ''
  const savedNote = justSaved ? t('settings.reminders.saved') : ''

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
          aria-describedby={hintId}
          onCheckedChange={(on) => {
            save.reset()
            setChosen(withOffset(chosen, offset, on))
          }}
        />
      ))}
      <Typography variant="t4" color="grey-400" id={hintId}>
        {chosen.length
          ? t('settings.reminders.limit', { max: MAX_OFFSETS })
          : t('settings.reminders.none')}
      </Typography>
      {save.isError && (
        <Typography variant="t4" color="red-300">
          {failed}
        </Typography>
      )}
      {justSaved && <Typography variant="t4">{savedNote}</Typography>}
      <LiveRegion
        message={failed || savedNote}
        politeness={failed ? 'assertive' : 'polite'}
      />
      <ActionBar>
        <Button
          type="submit"
          variant="solid"
          colorScheme="black"
          loading={save.isPending}
          disabled={!changed}
        >
          {t('common.save')}
        </Button>
      </ActionBar>
    </form>
  )
}
