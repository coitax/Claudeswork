import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth-context';

const navItems = [
  { to: '/app', label: 'Home', end: true },
  { to: '/app/activity', label: 'Activity Monitoring' },
  { to: '/app/thought-records', label: 'Thought Records' },
  { to: '/app/daily-mood', label: 'Daily Mood' },
  { to: '/app/settings', label: 'Settings' },
];

/** App shell with calm sidebar/nav. Hidden in print via .no-print. */
export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen md:flex">
      <header className="no-print border-b border-accent-soft bg-card md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:block">
          <div>
            <p className="text-lg font-semibold text-ink">CBT Tracker</p>
            <p className="text-xs text-ink-faint">Private journal</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:gap-0.5 md:px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent text-white' : 'text-ink-soft hover:bg-accent-soft'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden p-3 md:mt-auto md:block">
          <p className="px-3 text-xs text-ink-faint">Signed in as {user?.username}</p>
          <button onClick={handleLogout} className="btn-ghost mt-1 w-full justify-start">
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-4xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
