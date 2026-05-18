import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationApi, type NotificationItem } from '@/services/notification.service';
import { useAppSelector } from '@/app/hooks';

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useNotifications() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);

  // Full refresh: runs aggregations + returns annotated list
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await notificationApi.list();
      const items = res.data.data;
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.isRead).length);
    } catch {
      // silent — bell just shows stale count
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Lightweight count poll (doesn't re-run aggregations)
  const pollCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationApi.count();
      setUnreadCount(res.data.data.count);
    } catch {
      // silent
    }
  }, [isAuthenticated]);

  // Initial full load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Polling: count every minute, full refresh every 5 minutes
  const tickRef = useRef(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      tickRef.current += 1;
      if (tickRef.current % 5 === 0) {
        refresh();   // full refresh every 5 ticks (5 min)
      } else {
        pollCount(); // count-only otherwise
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, refresh, pollCount]);

  const markRead = useCallback(async (id: string) => {
    await notificationApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => n._id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, refresh, markRead, markAllRead };
}
