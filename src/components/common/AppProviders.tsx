'use client';

import type { ReactNode } from 'react';
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui';
import '@neondatabase/neon-js/ui/css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';
import { authClient } from '@/lib/auth/client';
import { AuthProvider } from '@/contexts/AuthContext';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <NeonAuthUIProvider authClient={authClient} redirectTo="/" emailOTP>
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <ErrorBoundary>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1e293b',
                  color: '#f1f5f9',
                  borderRadius: '0.75rem',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#f1f5f9',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#f1f5f9',
                  },
                },
              }}
            />
          </ErrorBoundary>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  </NeonAuthUIProvider>
);
