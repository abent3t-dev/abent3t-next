'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import RoleGate from '@/components/auth/RoleGate';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <RoleGate>{children}</RoleGate>
    </MainLayout>
  );
}
