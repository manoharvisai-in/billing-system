/**
 * useOfflineSync — watches for network reconnection and flushes
 * any bills that were queued while the user was offline.
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../services/api';
import { removeFromOfflineQueue } from '../store/slices/cartSlice';
import { addNotification, setOnlineStatus } from '../store/slices/uiSlice';

export function useOfflineSync() {
  const dispatch = useDispatch();
  const offlineQueue = useSelector((s) => s.cart.offlineQueue);
  const isOnline = useSelector((s) => s.ui.isOnline);

  useEffect(() => {
    const goOnline  = () => dispatch(setOnlineStatus(true));
    const goOffline = () => dispatch(setOnlineStatus(false));
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [dispatch]);

  // Flush queue when we come back online
  useEffect(() => {
    if (!isOnline || offlineQueue.length === 0) return;

    const syncQueue = async () => {
      dispatch(addNotification({
        type: 'info',
        title: 'Syncing offline bills…',
        message: `${offlineQueue.length} bill(s) queued`,
      }));

      for (let i = 0; i < offlineQueue.length; i++) {
        try {
          const { queuedAt, ...orderData } = offlineQueue[i]; // strip local-only field
          await api.post('/orders', orderData);
          dispatch(removeFromOfflineQueue(0)); // always remove index 0 (queue shrinks)
        } catch (err) {
          console.error('Failed to sync offline bill:', err.message);
          break; // stop on first error; user can retry
        }
      }

      dispatch(addNotification({
        type: 'success',
        message: 'Offline bills synced successfully!',
      }));
    };

    syncQueue();
  }, [isOnline]); // eslint-disable-line
}
