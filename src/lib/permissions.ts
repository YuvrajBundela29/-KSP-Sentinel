// KSP Sentinel AI — Role-Based Permission Enforcement System

// ─── Default Permission Matrix ──────────────────────────────────

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  super_admin: {
    create_fir: true,
    edit_fir: true,
    delete_fir: true,
    view_fir: true,
    manage_evidence: true,
    import_data: true,
    export_data: true,
    view_analytics: true,
    manage_users: true,
    run_ai: true,
    view_audit: true,
    manage_settings: true,
  },
  state_admin: {
    create_fir: true,
    edit_fir: true,
    delete_fir: false,
    view_fir: true,
    manage_evidence: true,
    import_data: true,
    export_data: true,
    view_analytics: true,
    manage_users: false,
    run_ai: true,
    view_audit: true,
    manage_settings: false,
  },
  district_admin: {
    create_fir: true,
    edit_fir: true,
    delete_fir: false,
    view_fir: true,
    manage_evidence: true,
    import_data: true,
    export_data: true,
    view_analytics: true,
    manage_users: false,
    run_ai: true,
    view_audit: true,
    manage_settings: false,
  },
  station_officer: {
    create_fir: true,
    edit_fir: true,
    delete_fir: false,
    view_fir: true,
    manage_evidence: true,
    import_data: false,
    export_data: true,
    view_analytics: true,
    manage_users: false,
    run_ai: true,
    view_audit: false,
    manage_settings: false,
  },
  investigator: {
    create_fir: true,
    edit_fir: true,
    delete_fir: false,
    view_fir: true,
    manage_evidence: true,
    import_data: false,
    export_data: true,
    view_analytics: true,
    manage_users: false,
    run_ai: true,
    view_audit: false,
    manage_settings: false,
  },
  analyst: {
    create_fir: false,
    edit_fir: false,
    delete_fir: false,
    view_fir: true,
    manage_evidence: false,
    import_data: true,
    export_data: true,
    view_analytics: true,
    manage_users: false,
    run_ai: true,
    view_audit: true,
    manage_settings: false,
  },
  auditor: {
    create_fir: false,
    edit_fir: false,
    delete_fir: false,
    view_fir: true,
    manage_evidence: false,
    import_data: false,
    export_data: true,
    view_analytics: true,
    manage_users: false,
    run_ai: false,
    view_audit: true,
    manage_settings: false,
  },
  demo_user: {
    create_fir: false,
    edit_fir: false,
    delete_fir: false,
    view_fir: true,
    manage_evidence: false,
    import_data: false,
    export_data: false,
    view_analytics: true,
    manage_users: false,
    run_ai: true,
    view_audit: false,
    manage_settings: false,
  },
};

// ─── Role Display Labels ────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  state_admin: "State Admin",
  district_admin: "District Admin",
  station_officer: "Station Officer",
  investigator: "Investigator",
  analyst: "Analyst",
  auditor: "Auditor",
  demo_user: "Demo User",
};

// ─── View → Permission Mapping ──────────────────────────────────

export const VIEW_PERMISSIONS: Record<string, string> = {
  "dashboard": "view_analytics",
  "chat": "run_ai",
  "network": "view_analytics",
  "map": "view_analytics",
  "accused": "view_fir",
  "timeline": "view_fir",
  "report": "export_data",
  "dm-dashboard": "view_analytics",
  "dm-fir": "view_fir",
  "dm-evidence": "manage_evidence",
  "dm-criminals": "view_fir",
  "dm-victims": "view_fir",
  "dm-vehicles": "view_fir",
  "dm-financial": "view_fir",
  "dm-import": "import_data",
  "dm-audit": "view_audit",
  "dm-ai-queue": "run_ai",
  "dm-settings": "manage_settings",
  "dm-sociological": "view_analytics",
  "dm-forecasting": "view_analytics",
  "dm-financial-network": "view_analytics",
};

// ─── Permission Functions ───────────────────────────────────────

/**
 * Check if a given role has a specific permission.
 * Falls back to `false` for unknown roles/permissions.
 */
export function hasPermission(role: string, permission: string): boolean {
  const rolePerms = DEFAULT_PERMISSIONS[role];
  if (!rolePerms) return false;
  return rolePerms[permission] === true;
}

/**
 * Get the full permission map for a role.
 * Returns an empty object for unknown roles.
 */
export function getPermissions(role: string): Record<string, boolean> {
  return DEFAULT_PERMISSIONS[role] ?? {};
}

/**
 * Check if a role can access a specific view.
 * Maps the view name to its required permission and checks it.
 */
export function canAccessView(role: string, view: string): boolean {
  const requiredPermission = VIEW_PERMISSIONS[view];
  if (!requiredPermission) return true; // Unknown views are accessible by default
  return hasPermission(role, requiredPermission);
}