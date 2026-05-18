import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, AlertTriangle, AlertCircle, Info,
  CheckCheck, RefreshCw, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from './useNotifications';
import type { NotificationItem, NotificationSeverity } from '@/services/notification.service';

// ── Severity helpers ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<NotificationSeverity, {
  icon: React.ElementType;
  iconClass: string;
  badgeClass: string;
}> = {
  critical: { icon: AlertCircle,   iconClass: 'text-red-500',    badgeClass: 'bg-red-500' },
  warning:  { icon: AlertTriangle, iconClass: 'text-amber-500',  badgeClass: 'bg-amber-500' },
  info:     { icon: Info,          iconClass: 'text-blue-500',   badgeClass: 'bg-blue-500' },
};

const TYPE_ROUTE: Record<string, string> = {
  low_stock:          '/pharmacy',
  out_of_stock:       '/pharmacy',
  pending_lab:        '/lab',
  pending_bill:       '/billing',
  missed_appointment: '/appointments',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Notification row ──────────────────────────────────────────────────────────

interface RowProps {
  item: NotificationItem;
  onRead: (id: string) => void;
  onNavigate: (path: string) => void;
}

const NotificationRow = ({ item, onRead, onNavigate }: RowProps) => {
  const { icon: Icon, iconClass } = SEVERITY_CONFIG[item.severity];

  const handleClick = () => {
    if (!item.isRead) onRead(item._id);
    onNavigate(TYPE_ROUTE[item.type] ?? '/');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50',
        !item.isRead && 'bg-primary/5'
      )}
    >
      <div className={cn('mt-0.5 shrink-0', iconClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !item.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.message}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(item.updatedAt)}</p>
      </div>
      {!item.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const NotificationDropdown = () => {
  const { notifications, unreadCount, loading, refresh, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate    = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) refresh(); // refresh on open
  };

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const badgeCount = Math.min(unreadCount, 99);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 text-red-600 text-xs font-semibold px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  All read
                </button>
              )}
              <button
                type="button"
                onClick={refresh}
                className={cn(
                  'p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors',
                  loading && 'animate-spin'
                )}
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" /> Checking alerts…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="h-8 w-8 text-gray-200" />
                <p className="text-sm text-muted-foreground">All clear — no active alerts</p>
              </div>
            ) : (
              notifications.map((item) => (
                <NotificationRow
                  key={item._id}
                  item={item}
                  onRead={markRead}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-muted-foreground text-center">
                Alerts refresh automatically every minute
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
