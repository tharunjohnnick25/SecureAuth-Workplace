import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  biometric_enabled?: boolean;
  organization_id?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  requiresBiometric: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  setUser: (user: User | null) => void;
  setRequiresBiometric: (val: boolean, riskLevel?: AuthState['riskLevel']) => void;
  clearBiometricRequirement: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      requiresBiometric: false,
      riskLevel: null,
      setUser: (user) => set({ user, isAuthenticated: !!user, requiresBiometric: false }),
      setRequiresBiometric: (requiresBiometric, riskLevel) => set({ requiresBiometric, riskLevel: riskLevel || null }),
      clearBiometricRequirement: () => set({ requiresBiometric: false, riskLevel: null }),
      logout: () => set({ user: null, isAuthenticated: false, requiresBiometric: false, riskLevel: null }),
    }),
    {
      name: 'cyber-auth-storage',
    }
  )
);
