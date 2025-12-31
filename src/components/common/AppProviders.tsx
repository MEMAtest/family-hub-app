'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';

// Auth is currently disabled - can be re-enabled by uncommenting the providers below
// import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui';
// import { authClient } from '@/lib/auth/client';
// import { AuthProvider } from '@/contexts/AuthContext';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  // To enable auth, wrap with:
  // <NeonAuthUIProvider authClient={authClient} redirectTo="/" emailOTP>
  //   <AuthProvider>
  //     ...
  //   </AuthProvider>
  // </NeonAuthUIProvider>
  <ThemeProvider>
    <NotificationProvider>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </NotificationProvider>
  </ThemeProvider>
);
