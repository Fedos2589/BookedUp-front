// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { hasUnsavedInput } from '@/pwa/unsavedInput'
import { account, deferredAnswer, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const businessId = account.businesses[0].id
const api = (path: string) => `/api/businesses/${businessId}${path}`

const withRole = (role: string) => ({
  ...account,
  businesses: [{ ...account.businesses[0], role }],
})

const owner = {
  userId: account.user.id,
  name: 'Anna',
  email: 'anna@example.com',
  role: 'OWNER',
  staffId: null,
}
const admin = {
  userId: '00000000-0000-4000-8000-000000000011',
  name: 'Boris',
  email: 'boris@example.com',
  role: 'ADMIN',
  staffId: null,
}
const master = {
  userId: '00000000-0000-4000-8000-000000000012',
  name: 'Vera',
  email: 'vera@example.com',
  role: 'MASTER',
  staffId: '00000000-0000-4000-8000-000000000021',
}

// An admin signed in as Boris, the admin in the members list.
const asAdmin = () => ({
  ...withRole('ADMIN'),
  user: { id: admin.userId, email: admin.email, name: admin.name },
})

const staffOfVera = {
  id: master.staffId,
  name: 'Vera',
  userId: master.userId,
  archived: false,
}
const petr = {
  id: '00000000-0000-4000-8000-000000000022',
  name: 'Petr',
  userId: null,
  archived: false,
}
const gone = {
  id: '00000000-0000-4000-8000-000000000023',
  name: 'Gone',
  userId: null,
  archived: true,
}

const team = (me: typeof account = account) => ({
  'GET /api/me': [200, me] as [number, unknown],
  [`GET ${api('/members')}`]: [200, [owner, admin, master]] as [
    number,
    unknown,
  ],
  [`GET ${api('/invitations')}`]: [200, []] as [number, unknown],
  [`GET ${api('/staff')}`]: [200, [staffOfVera, petr, gone]] as [
    number,
    unknown,
  ],
})

test('the owner opens the team from the navigation and sees its members', async () => {
  fakeApi(team())
  const { router } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })

  fireEvent.click(screen.getByRole('link', { name: 'Team' }))
  expect(await screen.findByRole('heading', { name: 'Team' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/team')

  const members = await screen.findByRole('list', { name: 'Members' })
  const rows = members.querySelectorAll(':scope > li')
  expect([...rows].map((row) => row.textContent)).toEqual([
    expect.stringMatching(/Anna.*anna@example\.com.*Owner/),
    expect.stringMatching(/Boris.*boris@example\.com.*Admin/),
    expect.stringMatching(/Vera.*vera@example\.com.*Master/),
  ])
})

test('an admin sees the team too', async () => {
  fakeApi(team(asAdmin()))
  renderApp('/team')

  expect(await screen.findByRole('list', { name: 'Members' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Team' })).toBeTruthy()
})

test('a master has no team: no link, and the address lands on the dashboard', async () => {
  const calls = fakeApi(team(withRole('MASTER'))).calls
  const { router } = renderApp('/team')

  await screen.findByRole('heading', { name: 'Judo Kids' })
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(screen.queryByRole('link', { name: 'Team' })).toBeNull()
  // The back would refuse it with 403: it is not even asked.
  expect(calls.map((call) => call.route)).not.toContain(
    `GET ${api('/members')}`,
  )
})

test('when the members fail to load, the team offers to try again', async () => {
  const fake = fakeApi({ ...team(), [`GET ${api('/members')}`]: [502] })
  renderApp('/team')

  const retry = await screen.findByRole('button', { name: 'Try again' })
  fake.set(`GET ${api('/members')}`, [200, [owner, admin, master]])
  fireEvent.click(retry)

  expect(await screen.findByRole('list', { name: 'Members' })).toBeTruthy()
})

const rowOf = (name: string) => {
  const members = screen.getByRole('list', { name: 'Members' })
  const row = [...members.querySelectorAll(':scope > li')].find((li) =>
    li.textContent?.includes(name),
  )
  if (!(row instanceof HTMLElement)) throw new Error(`no row for ${name}`)
  return row
}

// Fields keep an empty live region of their own: find the alert by its text.
const alertSaying = async (text: string) =>
  expect((await screen.findByText(text)).getAttribute('role')).toBe('alert')

const buttonsIn = (row: HTMLElement) =>
  [...row.querySelectorAll('button')].map((button) => button.textContent)

test('the owner moves a member to the other role', async () => {
  const fake = fakeApi({
    ...team(),
    [`PATCH ${api(`/members/${admin.userId}`)}`]: [
      200,
      { ...admin, role: 'MASTER' },
    ],
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  // Nobody moves or removes the owner; her own schedule she may add.
  expect(buttonsIn(rowOf('Anna'))).toEqual(['Add a schedule'])
  expect(buttonsIn(rowOf('Vera'))).toEqual(['Make admin', 'Remove'])

  fake.set(`GET ${api('/members')}`, [
    200,
    [owner, { ...admin, role: 'MASTER' }, master],
  ])
  fireEvent.click(
    within(rowOf('Boris')).getByRole('button', { name: 'Make master' }),
  )

  await waitFor(() => expect(rowOf('Boris').textContent).toMatch(/Master/))
  expect(fake.calls).toContainEqual({
    route: `PATCH ${api(`/members/${admin.userId}`)}`,
    body: { role: 'MASTER' },
  })
})

test('an admin can remove a master, and touch nobody else', async () => {
  fakeApi(team(asAdmin()))
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  expect(buttonsIn(rowOf('Anna'))).toEqual([])
  // Their own schedule, yes; their own role, no.
  expect(buttonsIn(rowOf('Boris'))).toEqual(['Add a schedule'])
  // Admin → master only: there is no other role to move a master to.
  expect(buttonsIn(rowOf('Vera'))).toEqual(['Remove'])
})

test('removing asks first; cancelling sends nothing', async () => {
  const fake = fakeApi(team())
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  fireEvent.click(within(rowOf('Vera')).getByRole('button', { name: 'Remove' }))
  const dialog = await screen.findByRole('dialog', {
    name: 'Remove Vera from the team?',
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(fake.calls.map((call) => call.route)).not.toContain(
    `DELETE ${api(`/members/${master.userId}`)}`,
  )
})

test('a removed member leaves the list', async () => {
  const fake = fakeApi({
    ...team(),
    [`DELETE ${api(`/members/${master.userId}`)}`]: [204],
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  fireEvent.click(within(rowOf('Vera')).getByRole('button', { name: 'Remove' }))
  const dialog = await screen.findByRole('dialog')
  fake.set(`GET ${api('/members')}`, [200, [owner, admin]])
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))

  await waitFor(() => expect(screen.queryByText('Vera')).toBeNull())
  // The list reloads first, then the modal closes and plays its exit: on a
  // slow machine it is still mounted the moment Vera is gone.
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

test('a member changed meanwhile: the list reloads and says so', async () => {
  const fake = fakeApi({
    ...team(),
    [`PATCH ${api(`/members/${admin.userId}`)}`]: [409],
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  fake.set(`GET ${api('/members')}`, [200, [owner, master]])
  fireEvent.click(
    within(rowOf('Boris')).getByRole('button', { name: 'Make master' }),
  )

  await alertSaying(
    'Someone changed the team meanwhile. Here it is as it is now.',
  )
  await waitFor(() => expect(screen.queryByText('Boris')).toBeNull())
})

const invitation = {
  id: '00000000-0000-4000-8000-000000000031',
  role: 'MASTER',
  note: 'Maria, Saturday groups',
  staffId: null,
  invitedBy: 'Anna',
  expiresAt: '2026-11-18T20:30:00.000Z',
  createdAt: '2026-11-11T20:30:00.000Z',
}

// «Invite» of the invitations section, not of a master without an account.
const inviteButton = async () =>
  within(await screen.findByRole('region', { name: 'Invitations' })).getByRole(
    'button',
    { name: 'Invite' },
  )

const withInvitations = (me = account, invitations = [invitation]) => ({
  ...team(me),
  [`GET ${api('/invitations')}`]: [200, invitations] as [number, unknown],
})

test('pending invitations show their role, note, inviter and deadline', async () => {
  fakeApi(withInvitations())
  renderApp('/team')

  const list = await screen.findByRole('list', { name: 'Invitations' })
  // The deadline in the business's zone (Asia/Bangkok), not the browser's.
  expect(list.textContent).toMatch(
    /Master.*Maria, Saturday groups.*Invited by Anna.*Valid until Nov 19, 03:30/,
  )
})

test('no pending invitations says so', async () => {
  fakeApi(withInvitations(account, []))
  renderApp('/team')

  expect(await screen.findByText('No pending invitations')).toBeTruthy()
})

test('the owner invites an admin and copies the link', async () => {
  const link = 'http://localhost:5173/invite/tok3n'
  const created = { ...invitation, role: 'ADMIN', note: 'Gleb' }
  const fake = fakeApi({
    ...withInvitations(account, []),
    [`POST ${api('/invitations')}`]: [201, { invitation: created, link }],
  })
  const writeText = vi.fn(async () => {})
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  renderApp('/team')

  fireEvent.click(await inviteButton())
  const dialog = await screen.findByRole('dialog', {
    name: 'Invite to the team',
  })
  fireEvent.click(within(dialog).getByRole('radio', { name: 'Admin' }))
  fireEvent.change(within(dialog).getByLabelText('Who is it for (optional)'), {
    target: { value: '  Gleb ' },
  })
  fake.set(`GET ${api('/invitations')}`, [200, [created]])
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create link' }))

  const linkField = await within(dialog).findByLabelText('Invitation link')
  expect((linkField as HTMLInputElement).value).toBe(link)
  // The copy button sits in the field itself.
  expect(
    linkField.parentElement
      ?.querySelector('button')
      ?.getAttribute('aria-label'),
  ).toBe('Copy link')
  expect(fake.calls).toContainEqual({
    route: `POST ${api('/invitations')}`,
    body: { role: 'ADMIN', note: 'Gleb' },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Copy link' }))
  expect(await within(dialog).findByText('Copied')).toBeTruthy()
  expect(writeText).toHaveBeenCalledWith(link)

  fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  const list = screen.getByRole('list', { name: 'Invitations' })
  expect(list.textContent).toMatch(/Admin.*Gleb/)

  // The next invitation starts from a clean form, not the last link.
  fireEvent.click(await inviteButton())
  const next = await screen.findByRole('dialog')
  expect(within(next).queryByLabelText('Invitation link')).toBeNull()
  expect(
    (
      within(next).getByLabelText(
        'Who is it for (optional)',
      ) as HTMLInputElement
    ).value,
  ).toBe('')
})

test('without a clipboard, the link is there to copy by hand', async () => {
  const link = 'http://192.168.1.5:5173/invite/tok3n'
  fakeApi({
    ...withInvitations(account, []),
    [`POST ${api('/invitations')}`]: [201, { invitation, link }],
  })
  // Plain HTTP over the LAN: no navigator.clipboard at all.
  vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
  renderApp('/team')

  fireEvent.click(await inviteButton())
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create link' }))
  fireEvent.click(
    await within(dialog).findByRole('button', { name: 'Copy link' }),
  )

  const failed = await within(dialog).findByText(
    'Couldn’t copy. Select the link and copy it.',
  )
  expect(failed.getAttribute('role')).toBe('alert')
  expect(within(dialog).getByLabelText('Invitation link')).toBeTruthy()
})

test('an admin invites masters only: no role to choose', async () => {
  const fake = fakeApi({
    ...withInvitations(asAdmin(), []),
    [`POST ${api('/invitations')}`]: [
      201,
      { invitation, link: 'http://localhost:5173/invite/x' },
    ],
  })
  renderApp('/team')

  fireEvent.click(await inviteButton())
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).queryByRole('radio')).toBeNull()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create link' }))

  await within(dialog).findByLabelText('Invitation link')
  expect(fake.calls).toContainEqual({
    route: `POST ${api('/invitations')}`,
    body: { role: 'MASTER' },
  })
})

test('a revoked invitation leaves the list', async () => {
  const fake = fakeApi({
    ...withInvitations(),
    [`DELETE ${api(`/invitations/${invitation.id}`)}`]: [204],
  })
  renderApp('/team')
  const list = await screen.findByRole('list', { name: 'Invitations' })

  fake.set(`GET ${api('/invitations')}`, [200, []])
  fireEvent.click(within(list).getByRole('button', { name: 'Revoke' }))

  expect(await screen.findByText('No pending invitations')).toBeTruthy()
})

test('an invitation accepted meanwhile: both lists reload and say so', async () => {
  const fake = fakeApi({
    ...withInvitations(),
    [`DELETE ${api(`/invitations/${invitation.id}`)}`]: [409],
  })
  renderApp('/team')
  const list = await screen.findByRole('list', { name: 'Invitations' })

  const maria = { ...master, userId: invitation.id, name: 'Maria' }
  fake.set(`GET ${api('/invitations')}`, [200, []])
  fake.set(`GET ${api('/members')}`, [200, [owner, admin, master, maria]])
  fireEvent.click(within(list).getByRole('button', { name: 'Revoke' }))

  await alertSaying(
    'Someone changed the team meanwhile. Here it is as it is now.',
  )
  expect(await screen.findByText('Maria')).toBeTruthy()
})

test('masters without an account: neither the linked nor the archived ones', async () => {
  fakeApi(team())
  renderApp('/team')

  const list = await screen.findByRole('list', {
    name: 'Masters without an account',
  })
  const rows = [...list.querySelectorAll(':scope > li')]
  expect(rows.map((row) => row.textContent)).toEqual([
    expect.stringMatching(/^Petr/),
  ])
  // The members list says who takes clients.
  expect(rowOf('Vera').textContent).toMatch(/Takes clients/)
  expect(rowOf('Boris').textContent).not.toMatch(/Takes clients/)
})

test('a master without an account is added by name', async () => {
  const ivan = {
    ...petr,
    id: '00000000-0000-4000-8000-000000000024',
    name: 'Ivan',
  }
  const fake = fakeApi({
    ...team(),
    [`POST ${api('/staff')}`]: [201, ivan],
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Masters without an account' })

  const name = screen.getByLabelText('Name')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(await screen.findByText('Required')).toBeTruthy()

  fireEvent.change(name, { target: { value: ' Ivan ' } })
  fake.set(`GET ${api('/staff')}`, [200, [staffOfVera, petr, gone, ivan]])
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))

  expect(await screen.findByText('Ivan')).toBeTruthy()
  expect((name as HTMLInputElement).value).toBe('')
  expect(fake.calls.filter((call) => call.route.startsWith('POST'))).toEqual([
    { route: `POST ${api('/staff')}`, body: { name: 'Ivan' } },
  ])
})

test('inviting a master without an account links the invitation to their schedule', async () => {
  const fake = fakeApi({
    ...team(),
    [`POST ${api('/invitations')}`]: [
      201,
      {
        invitation: { ...invitation, staffId: petr.id },
        link: 'http://x/invite/t',
      },
    ],
  })
  renderApp('/team')
  const list = await screen.findByRole('list', {
    name: 'Masters without an account',
  })

  fireEvent.click(within(list).getByRole('button', { name: 'Invite' }))
  const dialog = await screen.findByRole('dialog', {
    name: 'Invite to the team',
  })
  expect(within(dialog).getByText('For Petr’s schedule')).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create link' }))

  await within(dialog).findByLabelText('Invitation link')
  expect(fake.calls).toContainEqual({
    route: `POST ${api('/invitations')}`,
    body: { role: 'MASTER', staffId: petr.id },
  })

  // The plain «Invite» afterwards is for no schedule.
  fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  fireEvent.click(await inviteButton())
  expect(
    within(await screen.findByRole('dialog')).queryByText(/schedule/),
  ).toBeNull()
})

test('a member without a schedule gets one under their name', async () => {
  const fake = fakeApi({
    ...team(),
    [`POST ${api('/staff')}`]: [
      201,
      {
        id: '00000000-0000-4000-8000-000000000025',
        name: 'Boris',
        userId: admin.userId,
        archived: false,
      },
    ],
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  fake.set(`GET ${api('/members')}`, [
    200,
    [
      owner,
      { ...admin, staffId: '00000000-0000-4000-8000-000000000025' },
      master,
    ],
  ])
  fireEvent.click(
    within(rowOf('Boris')).getByRole('button', { name: 'Add a schedule' }),
  )

  await waitFor(() =>
    expect(rowOf('Boris').textContent).toMatch(/Takes clients/),
  )
  expect(fake.calls).toContainEqual({
    route: `POST ${api('/staff')}`,
    body: { name: 'Boris', userId: admin.userId },
  })
})

// Review of #7, finding 1.
test('a link that arrives after the dialog closed is not shown next time', async () => {
  const later = deferredAnswer()
  const fake = fakeApi({
    ...team(),
    [`POST ${api('/invitations')}`]: later.answer,
  })
  renderApp('/team')

  fireEvent.click(await inviteButton())
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create link' }))
  await waitFor(() =>
    expect(fake.calls.map((call) => call.route)).toContain(
      `POST ${api('/invitations')}`,
    ),
  )
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

  later.send([201, { invitation, link: 'http://x/invite/stale' }])
  // The team reloads after it, as after any change.
  await waitFor(() =>
    expect(
      fake.calls.filter((call) => call.route === `GET ${api('/invitations')}`),
    ).toHaveLength(2),
  )
  const staffList = screen.getByRole('list', {
    name: 'Masters without an account',
  })
  fireEvent.click(within(staffList).getByRole('button', { name: 'Invite' }))
  const next = await screen.findByRole('dialog')
  expect(within(next).queryByLabelText('Invitation link')).toBeNull()
  expect(within(next).getByRole('button', { name: 'Create link' })).toBeTruthy()
})

// Review of #7, finding 2.
test('a removal that fails closes the dialog and says why', async () => {
  const fake = fakeApi({
    ...team(),
    [`DELETE ${api(`/members/${master.userId}`)}`]: [404],
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  fireEvent.click(within(rowOf('Vera')).getByRole('button', { name: 'Remove' }))
  const dialog = await screen.findByRole('dialog')
  fake.set(`GET ${api('/members')}`, [200, [owner, admin]])
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))

  await alertSaying(
    'Someone changed the team meanwhile. Here it is as it is now.',
  )
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

// Review of #7, finding 3: the link exists nowhere else.
test('a link on screen holds back an app update, like typed input', async () => {
  fakeApi({
    ...team(),
    [`POST ${api('/invitations')}`]: [
      201,
      { invitation, link: 'http://x/invite/t' },
    ],
  })
  renderApp('/team')

  fireEvent.click(await inviteButton())
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create link' }))
  await within(dialog).findByLabelText('Invitation link')
  expect(hasUnsavedInput()).toBe(true)

  fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
  await waitFor(() => expect(hasUnsavedInput()).toBe(false))
})

// Review of #7, finding 4: one request at a time keeps its spinner and error.
test('while a member is being changed, the other changes wait', async () => {
  const later = deferredAnswer()
  fakeApi({
    ...team(),
    [`PATCH ${api(`/members/${admin.userId}`)}`]: later.answer,
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  fireEvent.click(
    within(rowOf('Boris')).getByRole('button', { name: 'Make master' }),
  )
  const others = [
    within(rowOf('Vera')).getByRole('button', { name: 'Make admin' }),
    within(rowOf('Vera')).getByRole('button', { name: 'Remove' }),
    within(rowOf('Anna')).getByRole('button', { name: 'Add a schedule' }),
  ]
  await waitFor(() =>
    others.forEach((button) =>
      expect(button.hasAttribute('disabled')).toBe(true),
    ),
  )

  later.send([200, { ...admin, role: 'MASTER' }])
  await waitFor(() =>
    others.forEach((button) =>
      expect(button.hasAttribute('disabled')).toBe(false),
    ),
  )
})

// Review of #7, finding 10: the schedule comes from the staff list on the page.
test('an invitation to a schedule names it', async () => {
  fakeApi({
    ...team(),
    [`GET ${api('/invitations')}`]: [
      200,
      [{ ...invitation, note: null, staffId: petr.id }],
    ],
  })
  renderApp('/team')

  const list = await screen.findByRole('list', { name: 'Invitations' })
  await waitFor(() => expect(list.textContent).toMatch(/For Petr’s schedule/))
})
