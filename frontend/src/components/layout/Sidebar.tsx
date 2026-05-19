import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, FileText, Activity,
  CreditCard, Pill, UserCog, Settings, X, LogOut, BarChart2, CalendarClock, BookTemplate,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Role } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[] | 'all';
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/',                        icon: LayoutDashboard, roles: 'all' },
  { label: 'Patients',     href: '/patients',                icon: Users,           roles: ['ClinicAdmin', 'Doctor', 'Receptionist'] },
  { label: 'Appointments', href: '/appointments',            icon: Calendar,        roles: ['ClinicAdmin', 'Doctor', 'Receptionist'] },
  { label: 'Prescriptions',href: '/prescriptions',           icon: FileText,        roles: ['ClinicAdmin', 'Doctor'], end: true },
  { label: 'Rx Templates', href: '/prescriptions/templates', icon: BookTemplate,    roles: ['ClinicAdmin', 'Doctor'] },
  { label: 'Lab Reports',  href: '/lab',                     icon: Activity,        roles: ['ClinicAdmin', 'Doctor', 'Receptionist'] },
  { label: 'Billing',      href: '/billing',                 icon: CreditCard,      roles: ['ClinicAdmin', 'Receptionist'] },
  { label: 'Pharmacy',     href: '/pharmacy',                icon: Pill,            roles: ['ClinicAdmin', 'Pharmacist'] },
  { label: 'Reports',      href: '/reports',                 icon: BarChart2,       roles: ['ClinicAdmin', 'Doctor', 'Receptionist', 'Pharmacist'] },
  { label: 'Schedule',     href: '/schedule',                icon: CalendarClock,   roles: ['ClinicAdmin'] },
  { label: 'Staff',        href: '/staff',                   icon: UserCog,         roles: ['ClinicAdmin'] },
  { label: 'Settings',     href: '/settings',                icon: Settings,        roles: ['ClinicAdmin'] },
];

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar = ({ onClose }: SidebarProps) => {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.roles === 'all') return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <div className="flex h-full flex-col bg-slate-900 border-r border-slate-800">
      {/* Logo + close (mobile) */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">
              {user?.clinicName ?? 'ClinixIndia'}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.role}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-slate-800 text-slate-400"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end ?? item.href === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-800 p-3">
        <NavLink
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-800 transition-colors mb-1"
        >
          <div className="h-8 w-8 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center text-xs font-semibold shrink-0">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.mobile}</p>
          </div>
        </NavLink>
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
};
