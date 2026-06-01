'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notify } from '@/lib/notifications';
import { useQueryClient } from '@tanstack/react-query';

export interface NotificationPayload {
  type: 'enrollment' | 'evidence' | 'request' | 'proposal' | 'budget' | 'course' | 'user';
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'upload' | 'verify';
  entityId: string;
  entityName?: string;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  targetUserId?: string;
  departmentId?: string;
  timestamp?: string;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: unknown) => void;
  on: <T = unknown>(event: string, callback: (data: T) => void) => void;
  off: <T = unknown>(event: string, callback: (data: T) => void) => void;
  subscribeToDashboard: () => void;
  unsubscribeFromDashboard: () => void;
  subscribeToEdition: (editionId: string) => void;
  unsubscribeFromEdition: (editionId: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
  'http://localhost:3001';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  /**
   * Fase 2: el JWT está en cookie HttpOnly. El cliente NO lo lee. Le pasamos
   * `withCredentials: true` a socket.io-client para que el navegador envíe
   * la cookie en el handshake; el `SocketGateway` la lee del header
   * `Cookie` y valida el `access_token`.
   */
  useEffect(() => {
    let mounted = true;

    const initSocket = () => {
      if (!user) return;

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const newSocket = io(API_URL, {
        withCredentials: true, // <-- envía cookies HttpOnly en el handshake
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        if (mounted) {
          setIsConnected(true);
          console.log('Socket connected:', newSocket.id);
        }
      });

      newSocket.on('disconnect', (reason) => {
        if (mounted) {
          setIsConnected(false);
          console.log('Socket disconnected:', reason);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      newSocket.on('error', (error: { message: string }) => {
        console.error('Socket error:', error.message);
      });

      newSocket.on('notification', (payload: NotificationPayload) => {
        if (payload.userId === user.id) return;
        const isPositive = ['create', 'approve', 'verify'].includes(payload.action);
        const isNegative = ['reject', 'delete'].includes(payload.action);
        if (isPositive) notify.success(payload.message);
        else if (isNegative) notify.error(payload.message);
        else notify.info(payload.message);
      });

      newSocket.on('enrollment:update', () => {
        queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['my-courses'] });
      });
      newSocket.on('evidence:update', () => {
        queryClient.invalidateQueries({ queryKey: ['evidences'] });
      });
      newSocket.on('evidence:pending', () => {
        queryClient.invalidateQueries({ queryKey: ['evidences', 'pending'] });
      });
      newSocket.on('request:update', () => {
        queryClient.invalidateQueries({ queryKey: ['requests'] });
      });
      newSocket.on('request:pending', () => {
        queryClient.invalidateQueries({ queryKey: ['requests', 'pending'] });
      });
      newSocket.on('proposal:update', () => {
        queryClient.invalidateQueries({ queryKey: ['proposals'] });
      });
      newSocket.on('proposal:pending', () => {
        queryClient.invalidateQueries({ queryKey: ['proposals', 'pending'] });
      });
      newSocket.on('budget:update', () => {
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
      });
      newSocket.on('budget:alert', (payload: NotificationPayload) => {
        notify.warning(payload.message);
      });
      newSocket.on('dashboard:refresh', () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      });

      socketRef.current = newSocket;
      if (mounted) setSocket(newSocket);
    };

    initSocket();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, queryClient]);

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback(
    <T = unknown>(event: string, callback: (data: T) => void) => {
      if (socketRef.current) {
        socketRef.current.on(event, callback as (...args: unknown[]) => void);
      }
    },
    [],
  );

  const off = useCallback(
    <T = unknown>(event: string, callback: (data: T) => void) => {
      if (socketRef.current) {
        socketRef.current.off(event, callback as (...args: unknown[]) => void);
      }
    },
    [],
  );

  const subscribeToDashboard = useCallback(() => {
    emit('subscribe:dashboard');
  }, [emit]);

  const unsubscribeFromDashboard = useCallback(() => {
    emit('unsubscribe:dashboard');
  }, [emit]);

  const subscribeToEdition = useCallback(
    (editionId: string) => emit('subscribe:edition', { editionId }),
    [emit],
  );

  const unsubscribeFromEdition = useCallback(
    (editionId: string) => emit('unsubscribe:edition', { editionId }),
    [emit],
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        emit,
        on,
        off,
        subscribeToDashboard,
        unsubscribeFromDashboard,
        subscribeToEdition,
        unsubscribeFromEdition,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
