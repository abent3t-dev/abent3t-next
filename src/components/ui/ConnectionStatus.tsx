'use client';

import { useSocket } from '@/contexts/SocketContext';

/**
 * Small indicator showing WebSocket connection status
 * Can be placed in the sidebar or header
 */
export function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={isConnected ? 'Conectado' : 'Desconectado'}
      />
      <span className="text-gray-500">
        {isConnected ? 'En línea' : 'Sin conexión'}
      </span>
    </div>
  );
}

/**
 * Compact version - just the dot
 */
export function ConnectionDot() {
  const { isConnected } = useSocket();

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500' : 'bg-red-500'
      }`}
      title={isConnected ? 'Conectado en tiempo real' : 'Sin conexión en tiempo real'}
    />
  );
}
