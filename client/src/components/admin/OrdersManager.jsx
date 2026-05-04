import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import api from '../../services/api';
import { addNotification } from '../../store/slices/uiSlice';
import { formatCurrency, formatDate, statusBadgeClass, paymentLabel } from '../../utils/format';
import { useSocketEvent } from '../../hooks/useSocketEvent';

export default function OrdersManager() {
  const dispatch = useDispatch();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const LIMIT = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (status !== 'all') params.set('status', status);
      if (search)           params.set('search', search);
      const { data } = await api.get(`/orders?${params}`);
      setOrders(data.orders);
      setTotal(data.total);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to load orders' }));
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Real-time updates
  const handleOrderUpdate = useCallback((order) => {
    setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
  }, []);
  useSocketEvent('order_updated', handleOrderUpdate);
  useSocketEvent('new_order', useCallback(() => { if (page === 1) fetchOrders(); }, [page, fetchOrders]));

  const handleCancel = async (orderId) => {
    if (!confirm('Cancel this order? Stock will be restored.')) return;
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      dispatch(addNotification({ type: 'success', message: 'Order cancelled' }));
      fetchOrders();
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to cancel' }));
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      const response = await api.get(`/admin/export/orders?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Export failed' }));
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <input
            className="input max-w-56 flex-1 text-sm"
            placeholder="🔍 Bill ID / customer…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="input w-36 text-sm" value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button onClick={handleExport} className="btn-secondary text-xs">
          📥 Export CSV
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} orders found</p>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-7 w-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>No orders found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Token', 'Bill ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <>
                    <tr
                      key={order._id}
                      className="border-b last:border-0 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => setExpanded(expanded === order._id ? null : order._id)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-black text-sky-600 dark:text-sky-400 font-mono text-base">
                          #{order.tokenNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{order.billId.slice(-12)}</td>
                      <td className="px-4 py-3 text-xs">{order.customerName || <span className="opacity-40">—</span>}</td>
                      <td className="px-4 py-3 text-xs">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3 text-xs">{paymentLabel(order.paymentMethod)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusBadgeClass(order.status)}`}>{order.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(order.createdAt, { year: undefined })}
                      </td>
                      <td className="px-4 py-3">
                        {order.status === 'pending' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancel(order._id); }}
                            className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expanded === order._id && (
                      <tr key={`${order._id}-expanded`} style={{ borderColor: 'var(--border)' }}>
                        <td colSpan={9} className="px-4 py-3" style={{ background: 'var(--bg)' }}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-semibold mb-2">Items</p>
                              <table className="w-full">
                                <tbody>
                                  {order.items.map((item, i) => (
                                    <tr key={i}>
                                      <td className="pr-3 py-0.5">{item.productName}</td>
                                      <td className="text-center px-2 py-0.5" style={{ color: 'var(--text-muted)' }}>×{item.quantity}</td>
                                      <td className="text-right py-0.5 font-medium">{formatCurrency(item.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                                <span>{formatCurrency(order.subtotal)}</span>
                              </div>
                              {order.discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Discount</span>
                                  <span>-{formatCurrency(order.discount)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold border-t pt-1" style={{ borderColor: 'var(--border)' }}>
                                <span>Total</span><span>{formatCurrency(order.total)}</span>
                              </div>
                              <div className="flex justify-between pt-2" style={{ color: 'var(--text-muted)' }}>
                                <span>Billed by</span><span>{order.billedBy?.name}</span>
                              </div>
                              {order.deliveredBy && (
                                <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                                  <span>Delivered by</span><span>{order.deliveredBy?.name}</span>
                                </div>
                              )}
                              {order.notes && (
                                <div className="mt-2 p-2 rounded" style={{ background: 'var(--surface)' }}>
                                  <span className="font-medium">Note: </span>{order.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-secondary !text-xs !px-3 !py-1.5" disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="text-sm px-2" style={{ color: 'var(--text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button className="btn-secondary !text-xs !px-3 !py-1.5" disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
