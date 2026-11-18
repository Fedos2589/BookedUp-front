import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { type RefObject, useId } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from 'ted-ui/Input'
import { Modal } from 'ted-ui/Modal'
import { PhoneNumberField } from 'ted-ui/PhoneNumberField/PhoneNumberField'
import { Radio } from 'ted-ui/Radio/Radio'
import { RadioGroup } from 'ted-ui/RadioGroup/RadioGroup'
import { Typography } from 'ted-ui/Typography'

import {
  useClientsControllerCreate,
  useClientsControllerUpdate,
} from '@/api/clients/clients'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { fieldErrorText } from '@/forms/fieldError'
import { conflictCode } from '@/pages/calendar/newBooking'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import {
  type ClientForm,
  clientFormDefaults,
  clientSchema,
  createBody,
  phoneTakenBy,
  updateBody,
} from './clientForm'
import styles from './Clients.module.scss'
import { GuardianCombobox } from './GuardianCombobox'
import { PhoneTakenLink } from './PhoneTakenLink'
import { reloadClients } from './reloadClients'

type Person = Parameters<typeof clientFormDefaults>[0] & { id: string }

// Create (no `client`) or edit one client. The dialog exists only while open,
// so every opening starts from the client's current values.
export function ClientDialog({
  client,
  opener,
  onClose,
}: {
  client?: NonNullable<Person>
  // The button that opened the dialog: focus returns to it on close.
  opener: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const business = useCurrentBusiness()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const formId = useId()
  const kindLabelId = useId()
  const form = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: clientFormDefaults(client, i18n.language),
  })
  const kind = useWatch({ control: form.control, name: 'kind' })
  const country = useWatch({ control: form.control, name: 'country' })
  const phone = useWatch({ control: form.control, name: 'phone' })
  const errors = form.formState.errors
  useUnsavedInput(form.formState.isDirty)

  const create = useClientsControllerCreate()
  const update = useClientsControllerUpdate()
  const save = client ? update : create
  const takenBy = phoneTakenBy(save.error)

  const reload = () => reloadClients(queryClient, business.id)
  const failed = (error: unknown) => {
    if (conflictCode(error) === 'phoneTaken')
      form.setError('phone', { message: 'validation.phoneTaken' })
  }

  const submit = (values: ClientForm) => {
    if (!client)
      return create.mutate(
        { businessId: business.id, data: createBody(values) },
        {
          onSuccess: (created) => {
            void reload()
            onClose()
            void navigate({
              to: '/clients/$clientId',
              params: { clientId: created.id },
            })
          },
          onError: failed,
        },
      )
    const data = updateBody(values, client)
    if (Object.keys(data).length === 0) return onClose()
    update.mutate(
      { businessId: business.id, clientId: client.id, data },
      {
        onSuccess: () => {
          void reload()
          onClose()
        },
        onError: failed,
      },
    )
  }

  const otherError = save.isError && conflictCode(save.error) !== 'phoneTaken'

  return (
    <Modal
      isVisible
      title={t(client ? 'clients.form.editTitle' : 'clients.form.createTitle')}
      onClose={onClose}
      finalFocus={opener}
      buttons={[
        {
          variant: 'ghost',
          colorScheme: 'grey',
          children: t('common.cancel'),
          onClick: onClose,
        },
        {
          variant: 'solid',
          colorScheme: 'black',
          type: 'submit',
          form: formId,
          loading: save.isPending,
          children: t('common.save'),
        },
      ]}
    >
      <form
        id={formId}
        className={styles.form}
        noValidate
        onSubmit={form.handleSubmit(submit)}
      >
        <Input
          label={t('clients.form.name')}
          fullWidth
          error={!!errors.name}
          errorText={fieldErrorText(t, errors.name)}
          {...form.register('name')}
        />
        {!client && (
          <fieldset className={styles.fieldset}>
            <Typography variant="t4" component="legend" id={kindLabelId}>
              {t('clients.form.kind')}
            </Typography>
            <Controller
              control={form.control}
              name="kind"
              render={({ field }) => (
                <RadioGroup
                  aria-labelledby={kindLabelId}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <Radio value="own" label={t('clients.form.own')} />
                  <Radio value="dependent" label={t('clients.form.with')} />
                </RadioGroup>
              )}
            />
          </fieldset>
        )}
        {kind === 'own' && (
          <PhoneNumberField
            label={t('clients.form.phone')}
            country={country}
            nationalNumber={phone}
            onCountryChange={(c) =>
              form.setValue('country', c, { shouldDirty: true })
            }
            onNationalNumberChange={(n) =>
              form.setValue('phone', n, { shouldDirty: true })
            }
            error={!!errors.phone}
            errorText={fieldErrorText(t, errors.phone)}
          />
        )}
        {takenBy && <PhoneTakenLink clientId={takenBy} onOpen={onClose} />}
        {kind === 'dependent' && !client && (
          <Controller
            control={form.control}
            name="guardian"
            render={({ field }) => (
              <GuardianCombobox
                value={field.value}
                onChange={field.onChange}
                error={!!errors.guardian}
                errorText={fieldErrorText(t, errors.guardian)}
              />
            )}
          />
        )}
        <Input
          label={t('clients.form.note')}
          fullWidth
          error={!!errors.note}
          errorText={fieldErrorText(t, errors.note)}
          {...form.register('note')}
        />
        {otherError && (
          <Typography variant="t4" color="red-300" role="alert">
            {t(
              conflictCode(save.error) === 'notHolder'
                ? 'clients.form.notHolder'
                : 'clients.form.failed',
            )}
          </Typography>
        )}
      </form>
    </Modal>
  )
}
