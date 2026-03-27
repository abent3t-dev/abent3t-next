import { useEffect } from 'react';
import { useSocket, type NotificationPayload } from '@/contexts/SocketContext';

/**
 * Hook to listen to a specific socket event
 * Automatically cleans up on unmount
 */
export function useSocketListener<T = unknown>(
  event: string,
  callback: (data: T) => void,
  deps: unknown[] = [],
) {
  const { on, off } = useSocket();

  useEffect(() => {
    on(event, callback);

    return () => {
      off(event, callback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, on, off, ...deps]);
}

/**
 * Hook to listen to notification events
 */
export function useNotificationListener(
  callback: (payload: NotificationPayload) => void,
  deps: unknown[] = [],
) {
  useSocketListener('notification', callback, deps);
}

/**
 * Hook to subscribe to dashboard updates
 */
export function useDashboardSubscription() {
  const { subscribeToDashboard, unsubscribeFromDashboard, isConnected } = useSocket();

  useEffect(() => {
    if (isConnected) {
      subscribeToDashboard();
    }

    return () => {
      if (isConnected) {
        unsubscribeFromDashboard();
      }
    };
  }, [isConnected, subscribeToDashboard, unsubscribeFromDashboard]);
}

/**
 * Hook to subscribe to edition updates
 */
export function useEditionSubscription(editionId: string | null) {
  const { subscribeToEdition, unsubscribeFromEdition, isConnected } = useSocket();

  useEffect(() => {
    if (isConnected && editionId) {
      subscribeToEdition(editionId);
    }

    return () => {
      if (isConnected && editionId) {
        unsubscribeFromEdition(editionId);
      }
    };
  }, [isConnected, editionId, subscribeToEdition, unsubscribeFromEdition]);
}
