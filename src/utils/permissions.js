export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OFFICER: 'OFFICER',
  STAFF: 'STAFF'
};

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  OFFICER: 'Officer',
  STAFF: 'Staff'
};

const ALL_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.OFFICER, ROLES.STAFF];
const ADMIN_MANAGER = [ROLES.ADMIN, ROLES.MANAGER];
const ADMIN_OFFICER = [ROLES.ADMIN, ROLES.OFFICER];
const OPS_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.OFFICER];

// Mirrors api-gateway RolePermissionService. Keep this in sync with backend
// gateway method/path rules so frontend route and button gates match 403s.
export const GATEWAY_PERMISSION_RULES = [
  { method: '*', pathPrefix: '/auth/users', roles: [ROLES.ADMIN] },
  { method: '*', pathPrefix: '/auth/deactivate', roles: [ROLES.ADMIN] },
  { method: '*', pathPrefix: '/auth/role', roles: [ROLES.ADMIN] },
  { method: '*', pathPrefix: '/auth/me', roles: ALL_ROLES },
  { method: '*', pathPrefix: '/auth/profile', roles: ALL_ROLES },
  { method: '*', pathPrefix: '/auth/password', roles: ALL_ROLES },

  { method: 'GET', pathPrefix: '/products', roles: ALL_ROLES },
  { method: '*', pathPrefix: '/products', roles: ADMIN_MANAGER },

  { method: 'GET', pathPrefix: '/warehouse', roles: ALL_ROLES },
  { method: 'POST', pathPrefix: '/warehouse/stock', roles: OPS_ROLES },
  { method: '*', pathPrefix: '/warehouse', roles: ADMIN_MANAGER },

  { method: 'GET', pathPrefix: '/purchase-orders', roles: OPS_ROLES },
  { method: 'POST', pathPrefix: '/purchase-orders', roles: ADMIN_OFFICER },
  { method: 'PUT', pathPrefix: '/purchase-orders', roles: ADMIN_MANAGER },
  { method: 'POST', pathPrefix: '/purchase-orders/', roles: ADMIN_OFFICER },

  { method: 'GET', pathPrefix: '/payments', roles: ALL_ROLES },
  { method: '*', pathPrefix: '/payments', roles: [ROLES.ADMIN] },

  { method: 'GET', pathPrefix: '/suppliers', roles: ADMIN_OFFICER },
  { method: 'POST', pathPrefix: '/suppliers', roles: ADMIN_OFFICER },
  { method: 'PUT', pathPrefix: '/suppliers', roles: ADMIN_OFFICER },
  { method: 'DELETE', pathPrefix: '/suppliers', roles: [ROLES.ADMIN] },

  { method: 'GET', pathPrefix: '/movements', roles: ALL_ROLES },
  { method: 'POST', pathPrefix: '/movements', roles: OPS_ROLES },

  { method: 'GET', pathPrefix: '/alerts/recipient', roles: ALL_ROLES },
  { method: 'PUT', pathPrefix: '/alerts/recipient', roles: ALL_ROLES },
  { method: 'PUT', pathPrefix: '/alerts/', roles: ALL_ROLES },

  { method: '*', pathPrefix: '/reports', roles: ADMIN_MANAGER },
  { method: '*', pathPrefix: '/alerts', roles: ADMIN_MANAGER }
];

const ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  MANAGER: [
    'dashboard:view',
    'products:read',
    'products:write',
    'warehouses:read',
    'warehouses:write',
    'warehouses:stock',
    'purchases:read',
    'purchases:approve',
    'purchases:update',
    'payments:read',
    'reports:read',
    'reports:write',
    'alerts:read',
    'alerts:write',
    'alerts:own',
    'movements:read',
    'movements:write'
  ],
  OFFICER: [
    'dashboard:view',
    'products:read',
    'warehouses:read',
    'warehouses:stock',
    'purchases:read',
    'purchases:create',
    'purchases:receive',
    'suppliers:read',
    'suppliers:write',
    'alerts:own',
    'movements:read',
    'movements:write'
  ],
  STAFF: [
    'dashboard:view',
    'products:read',
    'warehouses:read',
    'payments:read',
    'alerts:own',
    'movements:read'
  ]
};

export const normalizeRole = (role) => (role || '').replace(/^ROLE_/, '').trim().toUpperCase();

export const hasPermission = (role, permission) => {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  return permissions.includes('*') || permissions.includes(permission);
};

export const hasAnyPermission = (role, permissions) => {
  return permissions.some((permission) => hasPermission(role, permission));
};

export const hasRole = (role, allowedRoles = []) => {
  if (!allowedRoles.length) return true;
  const normalizedRole = normalizeRole(role);
  return allowedRoles.map(normalizeRole).includes(normalizedRole);
};

export const canCallEndpoint = (role, method, path) => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === ROLES.ADMIN) return true;
  if (!normalizedRole || !method || !path) return false;

  const normalizedMethod = method.toUpperCase();
  const matchingRule = GATEWAY_PERMISSION_RULES.find((rule) => (
    (rule.method === '*' || rule.method === normalizedMethod)
    && path.startsWith(rule.pathPrefix)
  ));

  return matchingRule ? matchingRule.roles.includes(normalizedRole) : false;
};

export const canAccess = (role, { allowedRoles, permission, anyPermissions } = {}) => {
  if (allowedRoles && !hasRole(role, allowedRoles)) return false;
  if (permission && !hasPermission(role, permission)) return false;
  if (anyPermissions && !hasAnyPermission(role, anyPermissions)) return false;
  return true;
};

export const getDefaultRouteForRole = () => '/dashboard';

export const rolePermissions = ROLE_PERMISSIONS;
