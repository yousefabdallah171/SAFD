import React from 'react';
import { useAuthStore } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Layout } from './layout';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();

  if (!token) {
    return <Redirect to="/login" />;
  }

  return <Layout>{children}</Layout>;
}
