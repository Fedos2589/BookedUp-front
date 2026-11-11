import type {
  MeControllerMe200BusinessesItemRole,
  MembersControllerChangeRoleBodyRole,
} from '@/api/generated.schemas'

export type Role = MeControllerMe200BusinessesItemRole
// The roles a member can be given or invited as: not the owner, whose
// business is handed over, not assigned.
export type AssignableRole = MembersControllerChangeRoleBodyRole

// What each role sees in the cabinet. The back decides what each role may do
// (BookedUp-back src/business/roles.ts) and refuses the rest with 403; this
// only keeps a role from being shown what it may not use. Each entry names
// the roles it allows: a role added on the back sees nothing new until it is
// listed here.

// Whose place in the team a role may give, change or take away: the back's
// `manages` table. Nobody manages the owner.
const manages: Partial<Record<Role, readonly AssignableRole[]>> = {
  OWNER: ['ADMIN', 'MASTER'],
  ADMIN: ['MASTER'],
}

export const rolesManagedBy = (role: Role): readonly AssignableRole[] =>
  manages[role] ?? []

export const roleManages = (role: Role, target: Role): boolean =>
  rolesManagedBy(role).some((managed) => managed === target)

const abilities = {
  // Business settings: the owner's and the admins' (E3: a master doesn't see them).
  viewSettings: (role: Role) => role === 'OWNER' || role === 'ADMIN',
  // The team page: whoever manages someone in it (the back's manageTeam).
  viewTeam: (role: Role) => rolesManagedBy(role).length > 0,
} as const satisfies Record<string, (role: Role) => boolean>

export type Ability = keyof typeof abilities

export const roleCan = (role: Role, ability: Ability): boolean =>
  abilities[ability](role)
