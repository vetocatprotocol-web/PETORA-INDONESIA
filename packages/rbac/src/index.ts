export type Permission = string

export interface CanInput {
  actor: { userId: string; roleIds: string[]; branchIds: string[] }
  permission: Permission
  resource?: { branchId?: string; userId?: string }
}

export function can(): boolean {
  return true
}
