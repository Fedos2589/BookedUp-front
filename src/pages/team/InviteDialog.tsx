import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from 'ted-ui/Input'
import { Modal } from 'ted-ui/Modal'
import { Radio } from 'ted-ui/Radio/Radio'
import { RadioGroup } from 'ted-ui/RadioGroup/RadioGroup'
import { Typography } from 'ted-ui/Typography'
import { z } from 'zod'

import { useInvitationsControllerCreate } from '@/api/invitations/invitations'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { rolesManagedBy } from '@/business/roles'
import { dateTimeIn } from '@/dates'
import { fieldErrorText } from '@/forms/fieldError'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { CopyLink } from './CopyLink'
import type { Staff } from './StaffWithoutAccount'
import { changeErrorText, useReloadTeam } from './teamChanges'
import styles from './Team.module.scss'

// The back's rules for the note (invitations.schema.ts): trimmed, up to 100.
const inviteSchema = z.object({
  role: z.enum(['ADMIN', 'MASTER']),
  note: z.string().trim().max(100, 'validation.tooLong'),
})

type InviteForm = z.infer<typeof inviteSchema>

// Creates an invitation and shows its link, once: the back keeps only the
// token's hash, so a link closed unseen is revoked and made again.
// `staff`: a schedule without an account, linked to whoever accepts.
export function InviteDialog({
  open,
  staff,
  onClose,
}: {
  open: boolean
  staff?: Staff
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const business = useCurrentBusiness()
  const roles = rolesManagedBy(business.role)
  const formId = useId()
  const roleLabelId = useId()
  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    // A master is who gets invited most; an admin may invite no one else.
    defaultValues: { role: 'MASTER', note: '' },
  })
  const [link, setLink] = useState<{ url: string; expiresAt: string }>()
  const create = useInvitationsControllerCreate({
    mutation: {
      onSettled: useReloadTeam(),
      onSuccess: ({ link: url, invitation }) =>
        setLink({ url, expiresAt: invitation.expiresAt }),
    },
  })
  // Typed input holds back a new app version's reload (src/pwa).
  useUnsavedInput(form.formState.isDirty && !link)

  const close = () => {
    onClose()
    form.reset()
    create.reset()
    setLink(undefined)
  }
  const until =
    link &&
    dateTimeIn(new Date(link.expiresAt), business.timeZone, i18n.language)

  return (
    <Modal
      isVisible={open}
      title={t('team.invite.title')}
      subtitle={staff && t('team.invite.forSchedule', { name: staff.name })}
      onClose={close}
      buttons={
        link
          ? [
              {
                variant: 'solid',
                colorScheme: 'black',
                children: t('team.invite.done'),
                onClick: close,
              },
            ]
          : [
              {
                variant: 'ghost',
                colorScheme: 'grey',
                children: t('team.cancel'),
                onClick: close,
              },
              {
                variant: 'solid',
                colorScheme: 'black',
                type: 'submit',
                form: formId,
                loading: create.isPending,
                children: t('team.invite.create'),
              },
            ]
      }
    >
      {link ? (
        <div className={styles.form}>
          <Typography variant="t3" component="p">
            {until
              ? t('team.invite.sendUntil', { date: until })
              : t('team.invite.send')}
          </Typography>
          <CopyLink url={link.url} />
        </div>
      ) : (
        <form
          id={formId}
          className={styles.form}
          noValidate
          onSubmit={form.handleSubmit(({ role, note }) =>
            create.mutate({
              businessId: business.id,
              data: {
                role,
                ...(note && { note }),
                ...(staff && { staffId: staff.id }),
              },
            }),
          )}
        >
          {roles.length > 1 && (
            <fieldset className={styles.fieldset}>
              <Typography variant="t4" component="legend" id={roleLabelId}>
                {t('team.invite.role')}
              </Typography>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <RadioGroup
                    aria-labelledby={roleLabelId}
                    value={field.value}
                    onValueChange={(value) => field.onChange(value)}
                  >
                    {roles.map((role) => (
                      <Radio
                        key={role}
                        value={role}
                        label={t(`team.role.${role}`)}
                      />
                    ))}
                  </RadioGroup>
                )}
              />
            </fieldset>
          )}
          <Input
            label={t('team.invite.note')}
            fullWidth
            error={!!form.formState.errors.note}
            errorText={fieldErrorText(t, form.formState.errors.note)}
            {...form.register('note')}
          />
          {create.isError && (
            <Typography variant="t4" color="red-300" role="alert">
              {changeErrorText(t, create.error)}
            </Typography>
          )}
        </form>
      )}
    </Modal>
  )
}
