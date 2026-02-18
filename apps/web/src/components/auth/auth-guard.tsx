'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StoredUser {
  id: string;
  role: 'ambassador' | 'buyer' | 'admin';
}

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<'ambassador' | 'buyer' | 'admin'>;
}

// useLayoutEffect on client, no-op on server (avoids SSR warning)
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  // Start false to match server render (no localStorage on server)
  const [authorized, setAuthorized] = useState(false);

  // useLayoutEffect fires synchronously before paint — avoids spinner flash
  useIsomorphicLayoutEffect(() => {
    const token = localStorage.getItem('buyla_token');
    const userRaw = localStorage.getItem('buyla_user');

    if (!token || !userRaw) {
      router.replace('/connexion');
      return;
    }

    try {
      const user: StoredUser = JSON.parse(userRaw);

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === 'admin') {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
        return;
      }

      setAuthorized(true);
    } catch {
      localStorage.removeItem('buyla_token');
      localStorage.removeItem('buyla_user');
      router.replace('/connexion');
    }
  }, [router, allowedRoles]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return <>{children}</>;
}
