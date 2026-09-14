export interface AuthResult {
  userId: string;
  /** companyId null = sesión de superadmin (selector global / otra empresa). */
  companyId: string | null;
  permissionsVersion: number;
}

export interface AuthStrategy {
  authenticate(credentials: unknown, companyId?: string): Promise<AuthResult>;
}