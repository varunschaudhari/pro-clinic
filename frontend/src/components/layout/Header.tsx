import { Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationDropdown } from '@/features/notifications/NotificationDropdown';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/prescriptions': 'Prescriptions',
  '/prescriptions/templates': 'Rx Templates',
  '/lab': 'Lab Reports',
  '/billing': 'Billing',
  '/pharmacy': 'Pharmacy',
  '/staff': 'Staff Management',
  '/schedule': 'Doctor Schedules',
  '/settings': 'Settings',
  '/profile': 'My Profile',
};

interface HeaderProps {
  onMenuClick: () => void;
  className?: string;
}

export const Header = ({ onMenuClick, className }: HeaderProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const pageTitle = ROUTE_LABELS[location.pathname] ?? 'ClinixIndia';

  return (
    <header className={cn('sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-gray-100 bg-white/95 backdrop-blur px-4 md:px-6 shadow-sm', className)}>
      {/* Hamburger (mobile only) */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg hover:bg-accent text-muted-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <h1 className="text-base font-semibold text-foreground flex-1">{pageTitle}</h1>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <NotificationDropdown />

        {/* Avatar → profile */}
        <Link
          to="/profile"
          className={cn(
            'flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors'
          )}
        >
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
            {user ? getInitials(user.name) : '?'}
          </div>
          <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
            {user?.name}
          </span>
        </Link>
      </div>
    </header>
  );
};
