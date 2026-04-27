import { Role } from "@prisma/client";

type PermissionCheck = (role: Role) => boolean;

const permissions: Record<string, PermissionCheck> = {
  "import:excel": (role) => role === "CABU_ADMIN",
  "intervention:create": (role) => role === "CABU_ADMIN" || role === "TECHNICIAN",
  "intervention:edit": (role) => role === "CABU_ADMIN" || role === "TECHNICIAN",
  "intervention:delete": (role) => role === "CABU_ADMIN",
  "user:manage": (role) => role === "CABU_ADMIN",
  "pos:edit": (role) => role === "CABU_ADMIN",
  "fridge:edit": (role) => role === "CABU_ADMIN",
  "dashboard:admin": (role) => role === "CABU_ADMIN",
  "dashboard:technician": (role) => role === "TECHNICIAN",
  "dashboard:brarudi": (role) => role === "BRARUDI_DELEGUE",
  "dashboard:brarudi_mgmt": (role) => role === "BRARUDI_ADMIN",
  "report:view": (role) => role === "CABU_ADMIN" || role === "BRARUDI_ADMIN",
  "city:view": (role) => role === "CABU_ADMIN" || role === "BRARUDI_ADMIN",
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
  return role === "CABU_ADMIN" || role === "TECHNICIAN";
}

export function canEditIntervention(role: Role): boolean {
  return role === "CABU_ADMIN" || role === "TECHNICIAN";
}

export function isAdmin(role: Role): boolean {
  return role === "CABU_ADMIN";
}
