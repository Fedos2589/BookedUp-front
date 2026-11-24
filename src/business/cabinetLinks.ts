import { type Ability, type Role, roleCan } from './roles'

// The cabinet's navigation: where each link goes, its text and what a role
// needs to see it. The one list the header and the burger menu both read.
const links = [
  { to: '/', label: 'cabinet.dashboard' },
  { to: '/calendar', label: 'cabinet.calendar' },
  { to: '/clients', label: 'cabinet.clients' },
  { to: '/schedule', label: 'cabinet.schedule' },
  { to: '/notifications', label: 'cabinet.notifications' },
  { to: '/settings', label: 'cabinet.settings', needs: 'viewSettings' },
  { to: '/team', label: 'cabinet.team', needs: 'viewTeam' },
] as const satisfies readonly {
  to: string
  label: string
  needs?: Ability
}[]

export type CabinetLink = (typeof links)[number]

export const cabinetLinksFor = (role: Role): CabinetLink[] =>
  links.filter((link) => !('needs' in link) || roleCan(role, link.needs))
