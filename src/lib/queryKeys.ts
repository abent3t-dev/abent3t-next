export const queryKeys = {
  departments: {
    all: ['departments'] as const,
    list: (params?: Record<string, unknown>) => ['departments', 'list', params] as const,
  },
  institutions: {
    all: ['institutions'] as const,
    list: (params?: Record<string, unknown>) => ['institutions', 'list', params] as const,
  },
  courseTypes: {
    all: ['courseTypes'] as const,
    list: (params?: Record<string, unknown>) => ['courseTypes', 'list', params] as const,
  },
  modalities: {
    all: ['modalities'] as const,
    list: (params?: Record<string, unknown>) => ['modalities', 'list', params] as const,
  },
  periods: {
    all: ['periods'] as const,
    list: (params?: Record<string, unknown>) => ['periods', 'list', params] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: (params?: Record<string, unknown>) => ['courses', 'list', params] as const,
    editions: (courseId: string) => ['courses', courseId, 'editions'] as const,
  },
  budgets: {
    all: ['budgets'] as const,
    list: (params?: Record<string, unknown>) => ['budgets', 'list', params] as const,
  },
  enrollments: {
    byEdition: (editionId: string) => ['enrollments', 'edition', editionId] as const,
    byProfile: (profileId: string) => ['enrollments', 'profile', profileId] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    byDepartment: ['dashboard', 'byDepartment'] as const,
    byInstitution: ['dashboard', 'byInstitution'] as const,
    completionTime: ['dashboard', 'completionTime'] as const,
  },
  users: {
    all: ['users'] as const,
  },
};

interface CatalogQueryKeys {
  all: readonly string[];
  list: (params?: Record<string, unknown>) => readonly unknown[];
}

const ENDPOINT_TO_KEY: Record<string, keyof typeof queryKeys> = {
  '/departments': 'departments',
  '/institutions': 'institutions',
  '/course-types': 'courseTypes',
  '/modalities': 'modalities',
  '/periods': 'periods',
  '/courses': 'courses',
  '/budgets': 'budgets',
};

export function getQueryKeyForEndpoint(endpoint: string): CatalogQueryKeys {
  const key = ENDPOINT_TO_KEY[endpoint];
  if (key) {
    const ns = queryKeys[key] as CatalogQueryKeys;
    return ns;
  }
  return {
    all: [endpoint],
    list: (p?: Record<string, unknown>) => [endpoint, 'list', p],
  };
}
