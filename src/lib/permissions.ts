import { Role } from "@prisma/client";

type PermissionCheck = (role: Role) => boolean;

const permissions: Record<string, PermissionCheck> = {
  "import:excel": (role) => role === "ADMIN",
  "intervention:create": (role) => role === "ADMIN" || role === "TECHNICIAN",
  "intervention:edit": (role) => role === "ADMIN" || role === "TECHNICIAN",
  "intervention:delete": (role) => role === "ADMIN",
  "user:manage": (role) => role === "ADMIN",
  "pos:edit": (role) => role === "ADMIN",
  "fridge:edit": (role) => role === "ADMIN",
  "dashboard:admin": (role) => role === "ADMIN",
  "dashboard:technician": (role) => role === "TECHNICIAN",
  "dashboard:brarudi": (role) => role === "BRARUDI",
  "dashboard:brarudi_mgmt": (role) => role === "BRARUDI_MGMT",
  "report:view": (role) => role === "ADMIN" || role === "BRARUDI_MGMT",
  "city:view": (role) => role === "ADMIN" || role === "BRARUDI_MGMT",
};

export function hasPermission(role: Role, permission: string): boolean {
  const check = permissions[permission];
  if (!check) return false;
  return check(role);
}

export function canViewInterventions(role: Role): boolean {
  return true; // All roles can view
}

export function canCreateIntervention(role: Role): boolean {
  return role === "ADMIN" || role === "TECHNICIAN";
}

export function canEditIntervention(role: Role): boolean {
  return role === "ADMIN" || role === "TECHNICIAN";
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN";
}
