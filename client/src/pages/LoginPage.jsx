import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, clearError } from '../store/slices/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    dispatch(clearError());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      const role = result.payload.user.role;
      const routes = { admin: '/admin', billing: '/billing', delivery: '/delivery' };
      navigate(routes[role] || '/');
    }
  };

  const quickLogin = (role) => {
    const creds = {
      admin: { email: 'admin@billing.com', password: 'admin123' },
      billing: { email: 'billing@billing.com', password: 'billing123' },
      delivery: { email: 'delivery@billing.com', password: 'delivery123' },
    };
    setForm(creds[role]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, var(--brand), transparent)' }} />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl text-white mb-4"
            style={{ background: 'linear-gradient(135deg, var(--brand), #0369a1)' }}>
            ⚡
          </div>
          <h1 className="text-2xl font-bold">SwiftBill</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Fast & Smart Billing System
          </p>
        </div>

        {/* Login form */}
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Sign in to continue</h2>

          {error && (
            <div className="mb-4 rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-50 hover:opacity-100"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in →'}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 card p-4">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
            DEMO QUICK LOGIN
          </p>
          <div className="grid grid-cols-3 gap-2">
            {['admin', 'billing', 'delivery'].map((role) => (
              <button
                key={role}
                onClick={() => quickLogin(role)}
                className="btn-secondary !text-xs !px-2 !py-2 capitalize text-center"
              >
                {role === 'billing' ? '🧾' : role === 'delivery' ? '🛵' : '👑'} {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
