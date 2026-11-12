import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker } from 'ted-ui/DatePicker'
import { Input } from 'ted-ui/Input'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import {
  getStaffScheduleControllerTimeOffQueryKey,
  useStaffScheduleControllerAddTimeOff,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dateIn } from '@/dates'
import styles from '@/pages/schedule/Schedule.module.scss'
import { focusFirstInvalid } from '@/pages/schedule/hours/focusFirstInvalid'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { instantsOfRange } from './timeOffRange'

const NOTE_MAX = 200

// Adds a range of whole days, both ends included, with an optional note.
export function TimeOffDialog({
  staffId,
  onClose,
}: {
  staffId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { id: businessId, timeZone } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  // A zone this browser doesn't know: no lower bound.
  const [today] = useState(() => dateIn(new Date(), timeZone))
  const [range, setRange] = useState({ from: '', to: '' })
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [zoneUnknown, setZoneUnknown] = useState(false)
  // Refreshing the list lives on the hook: it must run even if the dialog was
  // closed while the request was in flight.
  const add = useStaffScheduleControllerAddTimeOff({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getStaffScheduleControllerTimeOffQueryKey(
            businessId,
            staffId,
          ),
        }),
    },
  })

  useUnsavedInput(range.from !== '' || note !== '')
  const missingRange = tried && (range.from === '' || range.to === '')

  const submit = () => {
    setTried(true)
    if (range.from === '' || range.to === '')
      return focusFirstInvalid(formRef.current)
    const instants = instantsOfRange(range.from, range.to, timeZone)
    setZoneUnknown(!instants)
    if (!instants) return
    add.mutate(
      {
        businessId,
        staffId,
        data: { ...instants, note: note.trim() || null },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal
      isVisible
      title={t('schedule.timeOff.addTitle')}
      onClose={onClose}
      buttons={[
        {
          variant: 'ghost',
          colorScheme: 'grey',
          type: 'button',
          children: t('common.cancel'),
          onClick: onClose,
        },
        {
          variant: 'solid',
          colorScheme: 'black',
          type: 'submit',
          form: formId,
          loading: add.isPending,
          children: t('common.save'),
        },
      ]}
    >
      <form
        id={formId}
        ref={formRef}
        className={styles.hours}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <DatePicker
          mode="range"
          label={t('schedule.timeOff.range')}
          value={range}
          minDate={today}
          error={missingRange}
          errorText={
            missingRange ? t('schedule.timeOff.rangeRequired') : undefined
          }
          onChange={setRange}
        />
        <Input
          label={t('schedule.timeOff.note')}
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
        />
        {zoneUnknown ? (
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.timeOff.zoneUnknown')}
          </Typography>
        ) : (
          add.isError && (
            <Typography variant="t4" color="red-300" role="alert">
              {t('schedule.timeOff.saveFailed')}
            </Typography>
          )
        )}
      </form>
    </Modal>
  )
}
