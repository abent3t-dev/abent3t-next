'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user?.role !== 'super_admin') {
        router.replace('/home');
      } else {
        router.replace('/admin/users');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="p-6">
      <div className="text-center text-gray-500">Redirigiendo...</div>
    </div>
  );
}
