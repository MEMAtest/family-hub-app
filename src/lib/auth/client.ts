'use client';

import { createAuthClient } from '@neondatabase/neon-js/auth/next';

// Create the Neon Auth client for Next.js
// The auth URL is configured in the Neon console
export const authClient = createAuthClient();
