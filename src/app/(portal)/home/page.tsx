'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { HOME_ROUTES, type UserModule, type UserRole } from '@/types/auth';

interface ModuleCard {
  module: UserModule | 'admin';
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  accentClass: string;
  iconBgClass: string;
}

function buildModuleCards(
  roles: UserRole[],
  assignments: { module: UserModule; role: UserRole }[],
): ModuleCard[] {
  const isSuperAdmin = roles.includes('super_admin');
  const cards: ModuleCard[] = [];

  // Administración (solo super_admin)
  if (isSuperAdmin) {
    cards.push({
      module: 'admin',
      title: 'Administración',
      description: 'Gestión de usuarios, roles y configuración del sistema',
      href: '/admin',
      accentClass: 'border-[#222D59]/30 hover:border-[#222D59]',
      iconBgClass: 'bg-[#222D59]',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    });
  }

  const hasModule = (module: UserModule) =>
    isSuperAdmin || assignments.some((a) => a.module === module);

  const homeForModule = (module: UserModule, fallback: string): string => {
    const roleInModule = assignments.find((a) => a.module === module)?.role;
    if (roleInModule && HOME_ROUTES[roleInModule]) return HOME_ROUTES[roleInModule];
    if (isSuperAdmin && HOME_ROUTES['super_admin']) return HOME_ROUTES['super_admin'];
    return fallback;
  };

  if (hasModule('capacitacion')) {
    cards.push({
      module: 'capacitacion',
      title: 'Capacitación',
      description: 'Cursos, inscripciones, evidencias y desarrollo de colaboradores',
      href: homeForModule('capacitacion', '/capacitacion/mis-cursos'),
      accentClass: 'border-[#52AF32]/30 hover:border-[#52AF32]',
      iconBgClass: 'bg-[#52AF32]',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      ),
    });
  }

  if (hasModule('compras')) {
    cards.push({
      module: 'compras',
      title: 'Compras',
      description: 'Requisiciones, órdenes de compra, proveedores y aprobaciones',
      href: homeForModule('compras', '/compras/dashboard'),
      accentClass: 'border-[#DFA922]/30 hover:border-[#DFA922]',
      iconBgClass: 'bg-[#DFA922]',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    });
  }

  if (hasModule('contabilidad')) {
    cards.push({
      module: 'contabilidad',
      title: 'Contabilidad',
      description: 'EBITDA, utilidad, compliance fiscal y reportes financieros',
      href: homeForModule('contabilidad', '/contabilidad/dashboard'),
      accentClass: 'border-[#67B52E]/30 hover:border-[#67B52E]',
      iconBgClass: 'bg-[#67B52E]',
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-6 4h4m-4 4h6a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    });
  }

  return cards;
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const cards = useMemo(() => {
    if (!user) return [];
    const roles = user.roles ?? [user.role];
    const assignments = user.role_assignments ?? [];
    return buildModuleCards(roles, assignments);
  }, [user]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Si solo tiene acceso a un módulo, lo enviamos directo a su home.
    if (cards.length === 1) {
      router.replace(cards[0].href);
    }
  }, [user, loading, cards, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // Mientras hace redirect al único módulo accesible.
  if (cards.length === 1) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#52AF32] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin módulos asignados</h1>
          <p className="text-gray-600">
            Tu usuario no tiene acceso a ningún módulo del sistema. Contacta al administrador para
            que te asigne los permisos necesarios.
          </p>
        </div>
      </div>
    );
  }

  const firstName = user.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Usuario';

  return (
    <div className="px-6 py-10 lg:px-10 lg:py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-[#424846] mb-2">
            Bienvenido, {firstName}
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            Selecciona el módulo al que deseas acceder.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => (
            <Link
              key={card.module}
              href={card.href}
              className={`group bg-white rounded-2xl p-6 border-2 ${card.accentClass} shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col`}
            >
              <div
                className={`w-14 h-14 ${card.iconBgClass} rounded-xl flex items-center justify-center mb-4 shadow-md`}
              >
                {card.icon}
              </div>
              <h2 className="text-xl font-bold text-[#424846] mb-2">{card.title}</h2>
              <p className="text-sm text-gray-600 flex-1 leading-relaxed">{card.description}</p>
              <div className="mt-4 flex items-center text-sm font-semibold text-[#52AF32] group-hover:translate-x-1 transition-transform">
                Entrar
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
