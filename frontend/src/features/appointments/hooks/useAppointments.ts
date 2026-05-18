import { useState, useEffect, useCallback } from 'react';
import {
  appointmentApi,
  AppointmentItem,
  AppointmentStats,
  ListAppointmentsParams,
  UpdateStatusPayload,
} from '@/services/appointment.service';
import { getErrorMessage } from '@/lib/utils';

interface UseAppointmentsReturn {
  appointments: AppointmentItem[];
  stats: AppointmentStats | null;
  total: number;
  isLoading: boolean;
  error: string;
  refetch: () => void;
  updateStatus: (id: string, payload: UpdateStatusPayload) => Promise<void>;
}

const DEFAULT_STATS: AppointmentStats = {
  scheduled: 0, confirmed: 0, in_progress: 0,
  completed: 0, cancelled: 0, no_show: 0,
};

export const useAppointments = (params: ListAppointmentsParams = {}): UseAppointmentsReturn => {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [stats, setStats]               = useState<AppointmentStats | null>(null);
  const [total, setTotal]               = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState('');
  const [tick, setTick]                 = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    const listPromise  = appointmentApi.list({ ...params, limit: params.limit ?? 200 });
    const statsPromise = params.date
      ? appointmentApi.stats(params.date, params.doctorId)
      : Promise.resolve(null);

    Promise.all([listPromise, statsPromise])
      .then(([listRes, statsRes]) => {
        if (cancelled) return;
        setAppointments(listRes.data.data);
        setTotal(listRes.data.pagination.total);
        setStats(statsRes ? statsRes.data.data : DEFAULT_STATS);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.date, params.doctorId, params.patientId, params.status, tick]);

  const updateStatus = useCallback(async (id: string, payload: UpdateStatusPayload) => {
    const res = await appointmentApi.updateStatus(id, payload);
    setAppointments((prev) =>
      prev.map((a) => (a._id === id ? res.data.data : a))
    );
    // Refresh stats after status change
    if (params.date) {
      appointmentApi.stats(params.date, params.doctorId)
        .then((r) => setStats(r.data.data))
        .catch(() => { /* silent */ });
    }
  }, [params.date, params.doctorId]);

  return { appointments, stats, total, isLoading, error, refetch, updateStatus };
};
