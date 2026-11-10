import { expect, test } from 'vitest'

import { fieldsFromBadRequest } from './badRequest'

test('maps the back’s field paths to the form fields', () => {
  expect(
    fieldsFromBadRequest([
      'email: Invalid email address',
      'business.timeZone: Unknown IANA time zone',
      'business.name: Too small',
    ]),
  ).toEqual(['email', 'timeZone', 'businessName'])
})

test('ignores messages that name no form field', () => {
  expect(fieldsFromBadRequest(['Something odd', 'business: Required'])).toEqual(
    [],
  )
})
