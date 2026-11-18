import { expect, test } from 'vitest'

import { type PickerInput, pickerValue } from './pickerValue'

const anna = { id: 'anna', name: 'Anna', phone: '+79990001122' }
const masha = { id: 'masha', name: 'Masha', phone: null }

const input = (over: Partial<PickerInput> = {}): PickerInput => ({
  mode: 'new',
  picked: null,
  name: 'Olga',
  country: 'RU',
  phone: '999 000-11-22',
  account: [],
  choice: undefined,
  ...over,
})

test('search mode: nothing until a person is picked, then their id', () => {
  expect(pickerValue(input({ mode: 'search' }))).toBeUndefined()
  expect(
    pickerValue(input({ mode: 'search', picked: { id: 'c1', name: 'Vera' } })),
  ).toEqual({ clientId: 'c1' })
})

test('a phone that is not whole, or not looked up yet, gives nothing', () => {
  expect(pickerValue(input({ phone: '99' }))).toBeUndefined()
  expect(pickerValue(input({ account: undefined }))).toBeUndefined()
})

test('an unknown phone makes a new client with it; the name is required', () => {
  expect(pickerValue(input({ name: ' Olga ' }))).toEqual({
    newClient: { name: 'Olga', phone: '+79990001122' },
  })
  expect(pickerValue(input({ name: ' ' }))).toBeUndefined()
  expect(pickerValue(input({ name: 'x'.repeat(101) }))).toBeUndefined()
})

test('a known phone waits for a choice among the account', () => {
  const known = input({ account: [anna, masha] })
  expect(pickerValue(known)).toBeUndefined()
  expect(pickerValue({ ...known, choice: 'masha' })).toEqual({
    clientId: 'masha',
  })
})

test('«a new person on this number» comes with the holder', () => {
  const known = input({ account: [anna, masha], choice: 'new' })
  expect(pickerValue(known)).toEqual({
    newClient: { name: 'Olga', guardianId: 'anna' },
  })
  expect(pickerValue({ ...known, name: '' })).toBeUndefined()
})

test('a choice that is no longer in the account counts as none', () => {
  expect(
    pickerValue(input({ account: [anna], choice: 'gone' })),
  ).toBeUndefined()
})
