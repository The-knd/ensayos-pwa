/**
 * Módulos de sistema ("ocultos"): existen solo en backend, sin módulo frontend
 * propio (p. ej. `clients.sync`, o utilidades como el adaptador SAP). Sus
 * permisos se registran en el catálogo RBAC al arrancar (RbacService) para que
 * el portal pueda asignarlos a perfiles globales de sistema.
 *
 * Para dar de alta un módulo oculto nuevo: sumarlo aquí y proteger sus
 * endpoints con `@Permissions('<recurso>.<acción>')`. Queda sin asignar a ningún
 * perfil por defecto (el superadmin accede por bypass; el resto, a mano).
 */
export const HIDDEN_SYSTEM_MODULES: { resource: string; actions: string[] }[] = [
  { resource: 'clients.sync', actions: ['read', 'update'] },
];
