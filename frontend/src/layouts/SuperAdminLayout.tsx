import { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Menu, X, LogOut } from 'lucide-react';
import { Toaster } from 'sonner';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAppSelector } from '@/app/hooks';
import { Spinner } from '@/components/ui/Spinner';

const NAV = [
  { label: 'Dashboard', href: '/admin',         icon: LayoutDashboard, end: true },
  { label: 'Clinics',   href: '/admin/clinics',  icon: Building2 },
];

function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-slate-900 border-r border-slate-800">
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm">SA</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">ClinixIndia</p>
            <p className="text-xs text-violet-300 truncate">Super Admin</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 rounded hover:bg-slate-800 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 mb-1">
          <div className="h-8 w-8 rounded-full bg-violet-700 text-violet-100 flex items-center justify-center text-xs font-semibold shrink-0">
            {user ? getInitials(user.name) : 'SA'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.mobile}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export const SuperAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAppSelector((s) => s.auth);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'SuperAdmin') return <Navigate to="/unauthorized" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-56 transform transition-transform duration-200 ease-in-out',
          'md:relative md:translate-x-0 md:flex md:shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <AdminSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded hover:bg-gray-100 text-gray-500"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-700">Platform Administration</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
};
