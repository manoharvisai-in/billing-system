import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import Navbar from '../components/common/Navbar';
import { addNotification } from '../store/slices/uiSlice';
import { getSocket } from '../services/socket';

function OrderCard({ order, onDeliver }) {
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const isUrgent = order.status === 'pending' && (Date.now() - new Date(order.createdAt).getTime()) > 30 * 60 * 1000;

  return (
    <div className={`card p-4 transition-all ${isUrgent ? 'border-amber-400 dark:border-amber-600' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl font-black text-sky-600 dark:text-sky-400 leading-none font-mono">
              #{order.tokenNumber}
            </span>
            {isUrgent && <span className="badge badge-warning animate-pulse-soft">Urgent</span>}
          </div>
          {order.customerName && (
            <p className="text-sm font-medium">{order.customerName}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">₹{order.total.toLocaleString()}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-lg p-3 mb-3 space-y-1" style={{ background: 'var(--bg)' }}>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>{item.productName}</span>
            <span className="font-medium">× {item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{timeAgo(order.createdAt)}</span>
          <span>•</span>
          <span className="capitalize">{order.paymentMethod}</span>
          <span>•</span>
          <span className="font-mono text-xs">{order.billId.slice(-8)}</span>
        </div>

        {order.status === 'pending' && (
          <button
            onClick={() => onDeliver(order._id)}
            className="btn-primary !px-4 !py-2 text-sm"
            style={{ background: '#22c55e' }}
          >
            ✓ Delivered
          </button>
        )}

        {order.status === 'delivered' && (
          <div className="text-right">
            <span className="badge badge-success">✓ Delivered</span>
            {order.deliveredAt && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                at {new Date(order.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DeliveryPage() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newOrderPulse, setNewOrderPulse] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders?status=${activeTab === 'pending' ? 'pending' : 'delivered'}&limit=100`);
      setOrders(data.orders);
      setTotal(data.total);
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: 'Failed to load orders' }));
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time updates via WebSocket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewOrder = (order) => {
      dispatch(addNotification({
        type: 'info',
        title: `New Order! Token #${order.tokenNumber}`,
        message: `₹${order.total} — ${order.items.length} items`,
        duration: 6000,
      }));
      setNewOrderPulse(true);
      setTimeout(() => setNewOrderPulse(false), 3000);
      if (activeTab === 'pending') {
        setOrders(prev => [order, ...prev]);
      }
      // Haptic for new order notification
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    };

    const handleOrderUpdate = (order) => {
      setOrders(prev => {
        if (activeTab === 'pending' && order.status !== 'pending') {
          return prev.filter(o => o._id !== order._id);
        }
        return prev.map(o => o._id === order._id ? order : o);
      });
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_updated', handleOrderUpdate);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_updated', handleOrderUpdate);
    };
  }, [activeTab]);

  const handleDeliver = async (orderId) => {
    try {
      const { data } = await api.patch(`/orders/${orderId}/deliver`);
      setOrders(prev => prev.filter(o => o._id !== orderId));
      dispatch(addNotification({
        type: 'success',
        title: `Token #${data.order.tokenNumber} Delivered!`,
        message: 'Moved to delivered orders',
      }));
      if (navigator.vibrate) navigator.vibrate(100);
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: 'Failed to mark as delivered' }));
    }
  };

  const pendingCount = activeTab === 'pending' ? orders.length : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar title="Delivery Dashboard" />

      {/* Stats bar */}
      <div className="border-b py-3 px-4 flex gap-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-500">{activeTab === 'pending' ? orders.length : '—'}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pending</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-500">{activeTab === 'delivered' ? orders.length : '—'}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Delivered</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {['pending', 'delivered'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setLoading(true); }}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors capitalize flex items-center justify-center gap-2 ${
              activeTab === tab
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent'
            }`}
            style={activeTab !== tab ? { color: 'var(--text-muted)' } : {}}
          >
            {tab === 'pending' ? '⏳' : '✅'} {tab}
            {tab === 'pending' && pendingCount !== null && pendingCount > 0 && (
              <span className={`h-5 px-1.5 rounded-full text-xs flex items-center justify-center text-white font-bold ${newOrderPulse ? 'animate-pulse' : ''}`}
                style={{ background: 'var(--danger)' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
            <p className="text-5xl mb-3">{activeTab === 'pending' ? '🎉' : '📋'}</p>
            <p className="font-medium">
              {activeTab === 'pending' ? 'All caught up!' : 'No delivered orders today'}
            </p>
            <p className="text-sm mt-1">
              {activeTab === 'pending' ? 'No pending deliveries' : 'Delivered orders appear here'}
            </p>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard key={order._id} order={order} onDeliver={handleDeliver} />
          ))
        )}
      </div>
    </div>
  );
}
