import { expect, test } from 'vitest'

import { ApiError } from '@/apiFetch'
import {
  clientFormDefaults,
  clientSchema,
  createBody,
  phoneTakenBy,
  updateBody,
  type ClientForm,
} from './clientForm'

const holder = {
  name: 'Anna',
  phone: '+79990001122',
  guardian: null,
  note: null,
}
const dependent = {
  name: 'Masha',
  phone: null,
  guardian: { id: 'g1', name: 'Anna', phone: '+79990001122' },
  note: 'Allergy',
}

const form = (over: Partial<ClientForm> = {}): ClientForm => ({
  name: 'Anna',
  kind: 'own',
  country: 'RU',
  phone: '999 000-11-22',
  guardian: null,
  note: '',
  ...over,
})

test('create: a holder is sent with a +E.164 phone, a trimmed note only when typed', () => {
  expect(createBody(form())).toEqual({ name: 'Anna', phone: '+79990001122' })
  expect(createBody(form({ note: 'Mornings' }))).toEqual({
    name: 'Anna',
    phone: '+79990001122',
    note: 'Mornings',
  })
})

test('create: a dependent is sent with the guardian id and no phone', () => {
  const values = form({
    kind: 'dependent',
    phone: '',
    guardian: { id: 'g1', name: 'Anna' },
  })
  expect(createBody(values)).toEqual({ name: 'Anna', guardianId: 'g1' })
})

test('the schema wants a whole phone from a holder and a guardian from a dependent', () => {
  expect(clientSchema.safeParse(form()).success).toBe(true)
  const badPhone = clientSchema.safeParse(form({ phone: '12' }))
  expect(badPhone.error?.issues[0]).toMatchObject({
    path: ['phone'],
    message: 'validation.phone',
  })
  const noGuardian = clientSchema.safeParse(form({ kind: 'dependent' }))
  expect(noGuardian.error?.issues[0]).toMatchObject({
    path: ['guardian'],
    message: 'validation.required',
  })
  expect(clientSchema.safeParse(form({ name: '  ' })).success).toBe(false)
})

test('edit defaults: a holder gets country and national number, a dependent their guardian', () => {
  expect(clientFormDefaults(holder, 'en')).toMatchObject({
    name: 'Anna',
    kind: 'own',
    country: 'RU',
    phone: '9990001122',
    note: '',
  })
  expect(clientFormDefaults(dependent, 'en')).toMatchObject({
    kind: 'dependent',
    guardian: { id: 'g1', name: 'Anna' },
    note: 'Allergy',
  })
  expect(clientFormDefaults(undefined, 'ru')).toMatchObject({
    kind: 'own',
    country: 'RU',
    phone: '',
  })
})

test('edit: only changed fields go out; an emptied note is null', () => {
  const same = clientFormDefaults(holder, 'en')
  expect(updateBody(same, holder)).toEqual({})
  expect(updateBody({ ...same, name: 'Anna P.' }, holder)).toEqual({
    name: 'Anna P.',
  })
  expect(updateBody({ ...same, phone: '999 000-33-44' }, holder)).toEqual({
    phone: '+79990003344',
  })
  expect(updateBody({ ...same, note: ' Hi ' }, holder)).toEqual({ note: 'Hi' })
  const noted = { ...holder, note: 'Hi' }
  expect(updateBody({ ...same, note: ' ' }, noted)).toEqual({ note: null })
})

test('edit: a dependent never sends a phone', () => {
  const same = clientFormDefaults(dependent, 'en')
  expect(updateBody({ ...same, name: 'Maria' }, dependent)).toEqual({
    name: 'Maria',
  })
})

test('phoneTakenBy gives the holder from a 409 phoneTaken, nothing otherwise', () => {
  const conflict = (body: unknown) => new ApiError(409, body)
  expect(phoneTakenBy(conflict({ code: 'phoneTaken', clientId: 'c1' }))).toBe(
    'c1',
  )
  expect(phoneTakenBy(conflict({ code: 'notHolder' }))).toBeUndefined()
  expect(phoneTakenBy(new Error('x'))).toBeUndefined()
})
