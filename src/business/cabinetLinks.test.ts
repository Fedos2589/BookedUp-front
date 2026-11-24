import { expect, test } from 'vitest'

import { cabinetLinksFor } from './cabinetLinks'

const targets = (role: Parameters<typeof cabinetLinksFor>[0]) =>
  cabinetLinksFor(role).map((link) => link.to)

test('the owner sees every link, in the navigation order', () => {
  expect(targets('OWNER')).toEqual([
    '/',
    '/calendar',
    '/clients',
    '/schedule',
    '/notifications',
    '/settings',
    '/team',
  ])
})

test('an admin sees settings and the team', () => {
  expect(targets('ADMIN')).toEqual([
    '/',
    '/calendar',
    '/clients',
    '/schedule',
    '/notifications',
    '/settings',
    '/team',
  ])
})

test('a master sees their notifications, but neither settings nor the team', () => {
  expect(targets('MASTER')).toEqual([
    '/',
    '/calendar',
    '/clients',
    '/schedule',
    '/notifications',
  ])
})
