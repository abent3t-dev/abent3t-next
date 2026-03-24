'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ParticipantesRedirectPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'colaborador') {
      router.replace('/capacitacion/mis-cursos');
    } else {
      // Redirect to courses to select a course first
      router.replace('/capacitacion/cursos');
    }
  }, [user, router]);

  return (
    <div className="p-6">
      <div className="text-center text-gray-500">Redirigiendo...</div>
    </div>
  );
}
