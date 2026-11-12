import type {
  MembersControllerList200Item,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { type Role, roleManages } from '@/business/roles'

// Whose schedule an account may change: the back's StaffService.authorizeFor.
// One's own always; a member's if the role manages theirs; one without an
// account counts as a master. Archived schedules are history, not offered.
export function editableStaff(
  actor: { userId: string; role: Role },
  staff: readonly StaffControllerList200Item[],
  members: readonly Pick<MembersControllerList200Item, 'userId' | 'role'>[],
): StaffControllerList200Item[] {
  const roleOf = new Map(members.map((m) => [m.userId, m.role]))
  return staff.filter((s) => {
    if (s.archived) return false
    if (s.userId === actor.userId) return true
    const role = s.userId === null ? 'MASTER' : roleOf.get(s.userId)
    return role !== undefined && roleManages(actor.role, role)
  })
}
