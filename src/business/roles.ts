import type { MeControllerMe200BusinessesItemRole } from '@/api/generated.schemas'

export type Role = MeControllerMe200BusinessesItemRole

// What each role sees in the cabinet. The back decides what each role may do
// (BookedUp-back src/business/roles.ts) and refuses the rest with 403; this
// only keeps a role from being shown what it may not use.
const abilities = {
  // Business settings: the owner's and the admins' (E3: a master doesn't see them).
  viewSettings: (role: Role) => role !== 'MASTER',
} as const satisfies Record<string, (role: Role) => boolean>

export type Ability = keyof typeof abilities

export const roleCan = (role: Role, ability: Ability): boolean =>
  abilities[ability](role)
