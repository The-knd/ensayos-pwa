import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { httpClient } from '../../shared/api/httpClient';

interface ModulePlacement {
  id: string;
  key: string;
  module: string;
  label: string;
  placement: 'grid' | 'fab';
  position: number;
  path: string;
  perm: string;
  flag: string | null;
  logoUrl: string | null;
  enabled: boolean;
}

interface BootstrapData {
  user: { id: string; name: string; email: string };
  company: { id: string; name: string; theme: { primaryColor: string; logoUrl: string } };
  featureFlags: Record<string, boolean>;
  modulePlacements: ModulePlacement[];
}

interface ModuleContext {
  permissions: string[];
  featureFlags: Record<string, boolean>;
}

interface AuthContextValue {
  bootstrap: BootstrapData | null;
  moduleContexts: Record<string, ModuleContext>;
  loadModuleContext: (moduleName: string) => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  resetModuleContexts: () => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hexToRgb(hex: string): string | null {
  const m = hex.replace('#', '');
  if (m.length !== 6) return null;
  const int = parseInt(m, 16);
  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}

function shade(color: string, factor: number): string {
  const m = color.replace('#', '');
  if (m.length !== 6) return color;
  const int = parseInt(m, 16);
  let r = (int >> 16) & 255;
  let g = (int >> 8) & 255;
  let b = int & 255;
  if (factor >= 0) {
    r = Math.round(r + (255 - r) * factor);
    g = Math.round(g + (255 - g) * factor);
    b = Math.round(b + (255 - b) * factor);
  } else {
    r = Math.round(r * (1 + factor));
    g = Math.round(g * (1 + factor));
    b = Math.round(b * (1 + factor));
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [moduleContexts, setModuleContexts] = useState<Record<string, ModuleContext>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    httpClient
      .get('/me/bootstrap')
      .then((res) => setBootstrap(res.data))
      .catch(() => setBootstrap(null))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const primaryColor = bootstrap?.company.theme.primaryColor || '#0057B8';
    const root = document.documentElement;
    root.style.setProperty('--accent', primaryColor);
    const rgb = hexToRgb(primaryColor) || '0, 87, 184';
    root.style.setProperty('--accent-rgb', rgb);
    root.style.setProperty('--accent-deep', shade(primaryColor, -0.35));
    root.style.setProperty('--accent-soft', shade(primaryColor, 0.9));
  }, [bootstrap]);

  const loadModuleContext = async (moduleName: string) => {
    if (moduleContexts[moduleName]) return;
    const res = await httpClient.get(`/${moduleName}/context`);
    setModuleContexts((prev) => ({ ...prev, [moduleName]: res.data }));
  };

  const refreshBootstrap = async () => {
    const res = await httpClient.get('/me/bootstrap');
    setBootstrap(res.data);
  };

  const resetModuleContexts = () => setModuleContexts({});

  const logout = async () => {
    try {
      await httpClient.post('/auth/logout');
    } catch {
      // el cierre local de sesión no debe fallar aunque el servidor no responda
    }
    setBootstrap(null);
    setModuleContexts({});
  };

  return (
    <AuthContext.Provider
      value={{ bootstrap, moduleContexts, loadModuleContext, refreshBootstrap, resetModuleContexts, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
