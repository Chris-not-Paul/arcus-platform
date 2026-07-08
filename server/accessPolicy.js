export const validRoles = Object.freeze([
  "api",
  "admin",
  "free",
  "professional",
]);

const rolePermissions = Object.freeze({
  admin: [
    "*",
    "admin:access",
    "professional:read",
    "professional:export",
    "professional:report",
  ],
  free: [],
  api: [],
  professional: [
    "professional:read",
    "professional:export",
    "professional:report",
  ],
});

const planPermissions = Object.freeze({
  academic: ["professional:read"],
  free: [],
  professional: [
    "professional:read",
    "professional:export",
    "professional:report",
  ],
});

const planEntitlements = Object.freeze({
  academic: {
    exportLimitPerDay: 5,
    exportLimit: 10,
    modules: ["atlas", "analytics-read"],
    reportLimitPerDay: 2,
    workspaceLimit: 3,
  },
  free: {
    exportLimitPerDay: 0,
    exportLimit: 0,
    modules: ["atlas-open"],
    reportLimitPerDay: 0,
    workspaceLimit: 0,
  },
  professional: {
    exportLimitPerDay: 20,
    exportLimit: 25,
    modules: [
      "atlas-professional",
      "analytics",
      "exports",
      "reports",
      "workspaces",
    ],
    reportLimitPerDay: 10,
    workspaceLimit: 20,
  },
});

export function permissionsForRole(role) {
  return rolePermissions[role] || [];
}

export function roleHasPermission(role, permission) {
  const permissions = permissionsForRole(role);

  return permissions.includes("*") || permissions.includes(permission);
}

export function planHasPermission(plan, permission) {
  const permissions = planPermissions[plan] || [];

  return permissions.includes(permission);
}

export function entitlementsForSession(session) {
  const role = session?.role || "open";
  const plan = session?.organizationPlan || (role === "free" ? "free" : "professional");
  const baseEntitlements =
    planEntitlements[plan] || planEntitlements.free;
  const permissions = permissionsForSession(session);

  return {
    ...baseEntitlements,
    exportLimit: Number(session?.exportLimit) || baseEntitlements.exportLimit,
    organizationStatus: session?.organizationStatus || "active",
    permissions,
    plan,
    role,
  };
}

export function permissionsForSession(session) {
  if (session?.role === "api") {
    return Array.isArray(session.permissions)
      ? session.permissions
      : [];
  }

  return permissionsForRole(session?.role).filter((permission) =>
    session?.role === "admin" || planHasPermission(
      session?.organizationPlan || "professional",
      permission
    )
  );
}

export function sessionHasPermission(session, permission) {
  if (session?.role === "api") {
    return permissionsForSession(session).includes(permission);
  }

  if (!session || !roleHasPermission(session.role, permission)) {
    return false;
  }

  return session.role === "admin" || planHasPermission(
    session.organizationPlan || "professional",
    permission
  );
}
