import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, FileText, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Role } from '@/types';

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: Role[] | 'all';
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { label: 'Home',     href: '/',              icon: LayoutDashboard, roles: 'all' },
  { label: 'Patients', href: '/patients',      icon: Users,           roles: ['ClinicAdmin', 'Doctor', 'Receptionist'] },
  { label: 'Appts',    href: '/appointments',  icon: Calendar,        roles: ['ClinicAdmin', 'Doctor', 'Receptionist'] },
  { label: 'Rx',       href: '/prescriptions', icon: FileText,        roles: ['ClinicAdmin', 'Doctor'] },
];

interface BottomNavProps {
  onMoreClick: () => void;
}

export const BottomNav = ({ onMoreClick }: BottomNavProps) => {
  const { user } = useAuth();

  const visible = BOTTOM_NAV_ITEMS.filter((item) =>
    item.roles === 'all' || (user && item.roles.includes(user.role))
  );

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 flex h-16 border-t border-gray-100 bg-white md:hidden print:hidden"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {visible.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}

      {/* More → opens sidebar */}
      <button
        onClick={onMoreClick}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground"
      >
        <MoreHorizontal className="h-5 w-5" />
        More
      </button>
    </nav>
  );
};
