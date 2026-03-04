/**
 * Role-based permissions for dashboard.
 * Single dashboard for all roles; visibility of nav items and sections is controlled by allowedRoles.
 */

export type Role = "ADMIN" | "TEACHER" | "USER"

export const ROLES: Role[] = ["ADMIN", "TEACHER", "USER"]

/** Check if a role is allowed for a given list of allowed roles. */
export function canAccess(role: Role | undefined, allowedRoles: Role[]): boolean {
  if (!role) return false
  return allowedRoles.includes(role)
}

/** Nav item with permission: only shown if user's role is in allowedRoles. */
export type NavItemWithPermission<T> = T & { allowedRoles: Role[] }

export function filterByRole<T extends { allowedRoles: Role[] }>(
  items: T[],
  role: Role | undefined
): Omit<T, "allowedRoles">[] {
  if (!role) return []
  return items
    .filter((item) => item.allowedRoles.includes(role))
    .map(({ allowedRoles: _, ...rest }) => rest as Omit<T, "allowedRoles">)
}
