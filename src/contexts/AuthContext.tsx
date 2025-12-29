'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
  useCallback,
} from 'react';
import { authClient } from '@/lib/auth/client';

interface DbUser {
  id: string;
  neonAuthId: string | null;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Family {
  id: string;
  familyName: string;
  familyCode: string;
  createdAt: string;
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  ageGroup: string;
  color: string;
  icon: string;
}

interface AuthState {
  user: DbUser | null;
  family: Family | null;
  familyMember: FamilyMember | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  // Use Neon Auth session hook
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [user, setUser] = useState<DbUser | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMember, setFamilyMember] = useState<FamilyMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const refreshAuth = useCallback(async () => {
    if (!session?.user) {
      setUser(null);
      setFamily(null);
      setFamilyMember(null);
      setNeedsOnboarding(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFamily(data.family);
        setFamilyMember(data.familyMember);
        setNeedsOnboarding(data.needsOnboarding || false);
      } else {
        // Failed to fetch user data - likely needs onboarding
        setUser(null);
        setFamily(null);
        setFamilyMember(null);
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error('Failed to fetch auth state:', error);
      setUser(null);
      setFamily(null);
      setFamilyMember(null);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!sessionLoading) {
      refreshAuth();
    }
  }, [refreshAuth, sessionLoading]);

  const signOut = async () => {
    try {
      await authClient.signOut();
      setUser(null);
      setFamily(null);
      setFamilyMember(null);
      setNeedsOnboarding(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        family,
        familyMember,
        isAuthenticated: !!session?.user && !!user,
        isLoading: sessionLoading || isLoading,
        needsOnboarding,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export types for use in other files
export type { DbUser, Family, FamilyMember, AuthState };
