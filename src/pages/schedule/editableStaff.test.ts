import { expect, test } from 'vitest'

import { editableStaff } from './editableStaff'

const staff = (id: string, userId: string | null, archived = false) => ({
  id,
  name: id,
  userId,
  archived,
  scheduleMode: 'HOURS' as const,
})
const roles = { owner: 'OWNER', admin: 'ADMIN', master: 'MASTER' } as const
const members = [
  { userId: 'owner', role: roles.owner },
  { userId: 'admin', role: roles.admin },
  { userId: 'master', role: roles.master },
]
const all = [
  staff('o', 'owner'),
  staff('a', 'admin'),
  staff('m', 'master'),
  staff('nobody', null),
  staff('old', null, true),
]
const idsFor = (userId: string, role: 'OWNER' | 'ADMIN' | 'MASTER') =>
  editableStaff({ userId, role }, all, members).map((s) => s.id)

test('the owner edits everyone but the archived', () => {
  expect(idsFor('owner', 'OWNER')).toEqual(['o', 'a', 'm', 'nobody'])
})

test('an admin edits their own, masters and staff without an account', () => {
  expect(idsFor('admin', 'ADMIN')).toEqual(['a', 'm', 'nobody'])
})

test('a master edits only their own, with no members list needed', () => {
  expect(
    editableStaff({ userId: 'master', role: 'MASTER' }, all, []).map(
      (s) => s.id,
    ),
  ).toEqual(['m'])
})

test('a staff of an unknown member is not offered', () => {
  expect(
    editableStaff(
      { userId: 'owner', role: 'OWNER' },
      [staff('x', 'gone')],
      members,
    ),
  ).toEqual([])
})
