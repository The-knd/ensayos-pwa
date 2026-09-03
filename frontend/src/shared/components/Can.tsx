import { ReactNode } from 'react';

interface CanProps {
  permission: string;
  permissions: string[];
  children: ReactNode;
}

export function Can({ permission, permissions, children }: CanProps) {
  if (!permissions.includes(permission)) return null;
  return <>{children}</>;
}
