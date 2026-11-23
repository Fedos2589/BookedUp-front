import { expect, test } from 'vitest'

import { ApiError } from '@/apiFetch'
import { refusalOf } from './bookRefusal'

const badRequest = (...message: string[]) =>
  new ApiError(400, { statusCode: 400, error: 'Bad Request', message })

test('a 400 line naming a field by its path marks that field', () => {
  expect(refusalOf(badRequest('phone: Not a phone number'))).toEqual({
    kind: 'fields',
    fields: ['phone'],
  })
})

test('a field name inside the text of another line is not a path', () => {
  expect(
    refusalOf(badRequest('staffId: name of the master is unknown')),
  ).toEqual({ kind: 'text', key: 'booking.failed' })
})
