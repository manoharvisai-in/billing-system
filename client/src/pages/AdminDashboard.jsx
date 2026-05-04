import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../services/api';
import Navbar from '../components/common/Navbar';
import OrdersManager from '../components/admin/OrdersManager';
import { addNotification } from '../store/slices/uiSlice';
import { getSocket } from '../services/socket';

// ─── Dashboard Overview ────────────────────────────────────────────────────────
function DashboardOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const { data: res } = await api.get('/admin/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const socket = getSocket();
    if (socket) {
      socket.on('new_order', fetchDashboard);
      socket.on('order_updated', fetchDashboard);
    }
    return () => {
      if (socket) {
        socket.off('new_order', fetchDashboard);
        socket.off('order_updated', fetchDashboard);
      }
    };
  }, [fetchDashboard]);

  if (loading) return <div className="flex justify-center py-16"><span className="h-8 w-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return null;

  const { stats, recentOrders, salesByDay } = data;

  const statCards = [
    { label: 'Today\'s Sales', value: `₹${stats.dailySales.toLocaleString()}`, sub: `${stats.dailyOrders} orders`, color: '#0ea5e9', icon: '💰' },
    { label: 'Weekly Sales', value: `₹${stats.weeklySales.toLocaleString()}`, sub: `${stats.weeklyOrders} orders`, color: '#8b5cf6', icon: '📈' },
    { label: 'Monthly Sales', value: `₹${stats.monthlySales.toLocaleString()}`, sub: `${stats.monthlyOrders} orders`, color: '#f59e0b', icon: '📊' },
    { label: 'Pending', value: stats.pendingOrders, sub: 'awaiting delivery', color: '#ef4444', icon: '⏳' },
    { label: 'Delivered', value: stats.deliveredOrders, sub: 'completed', color: '#22c55e', icon: '✅' },
    { label: 'Total Orders', value: stats.totalOrders, sub: 'all time', color: '#06b6d4', icon: '🧾' },
  ];

  const chartData = salesByDay.map(d => ({
    date: new Date(d._id).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
    sales: d.total,
    orders: d.count,
  }));

  const statusBadge = (status) => {
    const map = { pending: 'badge-warning', delivered: 'badge-success', cancelled: 'badge-danger' };
    return <span className={`badge ${map[status]}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                <p className="text-xl font-bold leading-none">{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>
              </div>
              <span className="text-2xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Sales chart */}
      <div className="card p-4">
        <h3 className="font-bold text-sm mb-4">7-Day Sales Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
              formatter={(v) => [`₹${v.toLocaleString()}`, 'Sales']}
            />
            <Area type="monotone" dataKey="sales" stroke="#0ea5e9" fill="url(#salesGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold text-sm">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Bill ID', 'Token', 'Amount', 'Status', 'Billed By', 'Time'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order._id} className="border-b last:border-0 hover:opacity-80 transition-opacity" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3 font-mono text-xs">{order.billId}</td>
                  <td className="px-4 py-3 font-bold text-sky-600">#{order.tokenNumber}</td>
                  <td className="px-4 py-3 font-semibold">₹{order.total.toLocaleString()}</td>
                  <td className="px-4 py-3">{statusBadge(order.status)}</td>
                  <td className="px-4 py-3 text-xs">{order.billedBy?.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Products Manager ─────────────────────────────────────────────────────────
function ProductsManager() {
  const dispatch = useDispatch();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', price: '', category: '', stock: '', barcode: '', description: '' });

  const fetchProducts = async () => {
    const { data } = await api.get('/products?isActive=all');
    setProducts(data.products);
    setCategories(data.categories);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/products/${editing._id}`, form);
        dispatch(addNotification({ type: 'success', message: 'Product updated!' }));
      } else {
        await api.post('/products', form);
        dispatch(addNotification({ type: 'success', message: 'Product created!' }));
      }
      fetchProducts();
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', price: '', category: '', stock: '', barcode: '', description: '' });
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to save product' }));
    }
  };

  const handleEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, price: p.price, category: p.category, stock: p.stock, barcode: p.barcode || '', description: p.description || '' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this product?')) return;
    await api.delete(`/products/${id}`);
    dispatch(addNotification({ type: 'success', message: 'Product deactivated' }));
    fetchProducts();
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <input className="input max-w-64 flex-1" placeholder="🔍 Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', price: '', category: '', stock: '', barcode: '', description: '' }); }} className="btn-primary">
          + Add Product
        </button>
      </div>

      {showForm && (
        <div className="card p-4">
          <h3 className="font-bold mb-4">{editing ? 'Edit Product' : 'New Product'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>NAME *</label>
              <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>PRICE (₹) *</label>
              <input className="input" type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>CATEGORY *</label>
              <input className="input" list="cats" required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>STOCK *</label>
              <input className="input" type="number" min="0" required value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>BARCODE</label>
              <input className="input" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>DESCRIPTION</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">Save Product</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['Name', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3"><span className="badge badge-info">{p.category}</span></td>
                  <td className="px-4 py-3 font-semibold">₹{p.price}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock < 10 ? 'text-red-500 font-bold' : ''}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => handleEdit(p)} className="btn-secondary !px-2 !py-1 !text-xs">Edit</button>
                    {p.isActive && <button onClick={() => handleDelete(p._id)} className="btn-danger !px-2 !py-1 !text-xs">Delete</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No products found</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Users Manager ────────────────────────────────────────────────────────────
function UsersManager() {
  const dispatch = useDispatch();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'billing' });

  const fetchUsers = async () => {
    const { data } = await api.get('/admin/users');
    setUsers(data.users);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', form);
      dispatch(addNotification({ type: 'success', message: 'User created!' }));
      fetchUsers();
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'billing' });
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: err.response?.data?.error || 'Failed to create user' }));
    }
  };

  const toggleStatus = async (user) => {
    await api.put(`/admin/users/${user._id}`, { isActive: !user.isActive });
    dispatch(addNotification({ type: 'success', message: `User ${user.isActive ? 'deactivated' : 'activated'}` }));
    fetchUsers();
  };

  const roleIcons = { admin: '👑', billing: '🧾', delivery: '🛵' };
  const roleColors = { admin: 'badge-danger', billing: 'badge-info', delivery: 'badge-success' };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Add User</button>
      </div>

      {showForm && (
        <div className="card p-4">
          <h3 className="font-bold mb-4">Create New User</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>FULL NAME *</label>
              <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>EMAIL *</label>
              <input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>PASSWORD *</label>
              <input className="input" type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div><label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>ROLE *</label>
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="billing">Billing Staff</option>
                <option value="delivery">Delivery Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">Create User</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['User', 'Role', 'Last Login', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${roleColors[u.role]}`}>{roleIcons[u.role]} {u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3"><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(u)} className={`text-xs px-2 py-1 rounded-md border transition-colors ${u.isActive ? 'border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-green-200 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await api.get(`/admin/logs?page=${page}&limit=30`);
      setLogs(data.logs);
      setTotal(data.total);
    };
    fetchLogs();
  }, [page]);

  const handleExport = async () => {
    const response = await api.get('/admin/export/orders', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${Date.now()}.csv`;
    a.click();
  };

  const actionColors = {
    LOGIN: 'badge-info', LOGOUT: 'badge-warning',
    CREATE_ORDER: 'badge-success', CREATE_PRODUCT: 'badge-success',
    DELETE_PRODUCT: 'badge-danger', MARK_DELIVERED: 'badge-success',
    EXPORT_REPORT: 'badge-warning',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="font-bold">Audit Logs</h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} total entries</p>
        </div>
        <button onClick={handleExport} className="btn-secondary text-xs">
          📥 Export CSV
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              {['Time', 'User', 'Action', 'Resource', 'IP'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{log.userName || '—'}</td>
                  <td className="px-4 py-2.5"><span className={`badge ${actionColors[log.action] || 'badge-info'} text-xs`}>{log.action}</span></td>
                  <td className="px-4 py-2.5 text-xs">{log.resource} {log.resourceId ? `(${log.resourceId.slice(-6)})` : ''}</td>
                  <td className="px-4 py-2.5 text-xs font-mono">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 30 && (
        <div className="flex justify-center gap-2">
          <button className="btn-secondary !text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="text-sm px-4 py-2" style={{ color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / 30)}</span>
          <button className="btn-secondary !text-xs" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
const tabs = [
  { path: '/admin', label: '📊 Dashboard', exact: true },
  { path: '/admin/orders', label: '🧾 Orders' },
  { path: '/admin/products', label: '📦 Products' },
  { path: '/admin/users', label: '👥 Users' },
  { path: '/admin/logs', label: '📋 Logs' },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar title="Admin Panel" />

      {/* Tab navigation */}
      <div className="sticky top-14 z-30 border-b overflow-x-auto" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex min-w-max px-4">
          {tabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.exact}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent hover:border-sky-300'
                }`
              }
              style={({ isActive }) => isActive ? {} : { color: 'var(--text-muted)' }}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 page-enter">
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="orders"   element={<OrdersManager />} />
          <Route path="products" element={<ProductsManager />} />
          <Route path="users"    element={<UsersManager />} />
          <Route path="logs"     element={<AuditLogs />} />
        </Routes>
      </div>
    </div>
  );
}
