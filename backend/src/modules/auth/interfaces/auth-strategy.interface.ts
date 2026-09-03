export interface AuthResult {
  userId: string;
  companyId: string;
  permissionsVersion: number;
}

export interface AuthStrategy {
  authenticate(credentials: unknown, companyId: string): Promise<AuthResult>;
}
