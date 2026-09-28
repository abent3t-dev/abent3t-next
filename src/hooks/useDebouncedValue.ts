'use client';

import { useEffect, useState } from 'react';

/**
 * Devuelve `value` con retraso: solo se actualiza cuando `value` lleva
 * `delayMs` sin cambiar. Para buscadores: el input responde al instante y la
 * consulta al servidor sale una sola vez cuando el usuario deja de teclear.
 *
 *   const term = useDebouncedValue(search.trim(), 300);
 *   useQuery({ queryKey: ['x', term], ... });
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
