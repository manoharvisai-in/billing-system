import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeNotification } from '../../store/slices/uiSlice';

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const colors = {
  success: 'border-green-500 bg-green-50 dark:bg-green-900/20',
  error: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  warning: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
  info: 'border-sky-500 bg-sky-50 dark:bg-sky-900/20',
};

function Toast({ notification }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(removeNotification(notification.id));
    }, notification.duration || 4000);
    return () => clearTimeout(timer);
  }, [notification.id]);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border-l-4 p-4 shadow-lg animate-slide-in max-w-sm ${colors[notification.type]}`}
      style={{ background: 'var(--surface)' }}
    >
      <span className="text-lg font-bold">{icons[notification.type]}</span>
      <div className="flex-1 min-w-0">
        {notification.title && (
          <p className="font-semibold text-sm">{notification.title}</p>
        )}
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{notification.message}</p>
      </div>
      <button
        onClick={() => dispatch(removeNotification(notification.id))}
        className="text-lg leading-none opacity-50 hover:opacity-100 transition-opacity ml-1"
      >
        ×
      </button>
    </div>
  );
}

export default function NotificationToast() {
  const notifications = useSelector((s) => s.ui.notifications);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((n) => (
        <div key={n.id} className="pointer-events-auto">
          <Toast notification={n} />
        </div>
      ))}
    </div>
  );
}
