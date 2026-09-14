/**
 * Puerto que PermissionsGuard consume para resolver los permisos efectivos
 * de un usuario. Evita que un guard de infraestructura (commons/guards)
 * dependa directamente de un servicio de un módulo de negocio (RbacService).
 */
export interface PermissionProviderPort {
  getPermissions(userId: string, companyId: string | null): Promise<string[]>;
}

export const PERMISSION_PROVIDER = Symbol('PERMISSION_PROVIDER');
