import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';
import { toggleDarkMode } from '../../store/slices/uiSlice';
import api from '../../services/api';

export default function Navbar({ title }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { darkMode, isOnline } = useSelector((s) => s.ui);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    dispatch(logout());
    navigate('/login');
  };

  const roleLabels = { admin: 'Admin', billing: 'Billing Staff', delivery: 'Delivery Staff' };
  const roleColors = { admin: 'badge-danger', billing: 'badge-info', delivery: 'badge-success' };

  return (
    <nav className="sticky top-0 z-40 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex h-14 items-center justify-between px-4 max-w-7xl mx-auto gap-3">
        {/* Logo + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--brand)' }}>
            ⚡
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm leading-tight truncate">SwiftBill</h1>
            {title && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{title}</p>}
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Online status indicator */}
          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}
            title={isOnline ? 'Online' : 'Offline'} />

          {/* Dark mode */}
          <button onClick={() => dispatch(toggleDarkMode())}
            className="btn-secondary !px-2 !py-2 text-base">
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* User info + logout */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold leading-tight">{user?.name}</span>
              <span className={`badge text-xs ${roleColors[user?.role]}`}>{roleLabels[user?.role]}</span>
            </div>
            <button onClick={handleLogout} className="btn-secondary !px-2.5 !py-2 text-xs">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
