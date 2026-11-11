import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Input } from 'ted-ui/Input'
import { Typography } from 'ted-ui/Typography'
import { z } from 'zod'

import type { StaffControllerList200Item } from '@/api/generated.schemas'
import {
  useStaffControllerCreate,
  useStaffControllerList,
} from '@/api/staff/staff'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { fieldErrorText } from '@/forms/fieldError'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { Loaded } from './Loaded'
import { changeErrorText, useReloadTeam } from './teamChanges'
import styles from './Team.module.scss'

export type Staff = StaffControllerList200Item

// The back's rules for a name (staff.schema.ts): trimmed, 1 to 100.
const addSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(100, 'validation.tooLong'),
})

type AddForm = z.infer<typeof addSchema>

// Schedules nobody signs in to: masters the business books clients to
// before (or without) they have an account. An invitation for one links the
// schedule to whoever accepts it. Archived ones are not shown.
export function StaffWithoutAccount({
  onInvite,
}: {
  onInvite: (staff: Staff) => void
}) {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const staff = useStaffControllerList(business.id)
  const form = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { name: '' },
  })
  const add = useStaffControllerCreate({
    mutation: {
      onSettled: useReloadTeam(),
      onSuccess: () => form.reset(),
    },
  })
  // Typed input holds back a new app version's reload (src/pwa).
  useUnsavedInput(form.formState.isDirty)

  return (
    <section className={styles.section} aria-labelledby="team-staff">
      <Typography variant="h5" component="h2" id="team-staff">
        {t('team.staff.title')}
      </Typography>
      <Typography variant="t4" component="p" color="grey-400">
        {t('team.staff.text')}
      </Typography>
      <Loaded query={staff}>
        {(list) => {
          const unlinked = list.filter(
            (schedule) => schedule.userId === null && !schedule.archived,
          )
          return unlinked.length === 0 ? null : (
            <ul className={styles.list} aria-labelledby="team-staff">
              {unlinked.map((schedule) => (
                <li key={schedule.id} className={styles.row}>
                  <Typography variant="t3">{schedule.name}</Typography>
                  <Button
                    variant="ghost"
                    colorScheme="black"
                    size="small"
                    onClick={() => onInvite(schedule)}
                  >
                    {t('team.invitations.invite')}
                  </Button>
                </li>
              ))}
            </ul>
          )
        }}
      </Loaded>
      <form
        className={styles.addForm}
        noValidate
        onSubmit={form.handleSubmit((data) =>
          add.mutate({ businessId: business.id, data }),
        )}
      >
        <Input
          label={t('team.staff.name')}
          className={styles.addName}
          error={!!form.formState.errors.name}
          errorText={fieldErrorText(t, form.formState.errors.name)}
          {...form.register('name')}
        />
        <Button
          type="submit"
          variant="solid"
          colorScheme="black"
          loading={add.isPending}
        >
          {t('team.staff.add')}
        </Button>
      </form>
      {add.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {changeErrorText(t, add.error)}
        </Typography>
      )}
    </section>
  )
}
