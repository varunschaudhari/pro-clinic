import { useState, useEffect, useCallback } from 'react';
import { patientApi, PatientListItem, ListPatientsParams } from '@/services/patient.service';
import { getErrorMessage } from '@/lib/utils';

interface UsePatientsReturn {
  patients: PatientListItem[];
  total: number;
  totalPages: number;
  page: number;
  isLoading: boolean;
  error: string;
  refetch: () => void;
  setPage: (p: number) => void;
}

export const usePatients = (params: ListPatientsParams = {}): UsePatientsReturn => {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(params.page ?? 1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    patientApi
      .list({ ...params, page })
      .then((res) => {
        if (!cancelled) {
          setPatients(res.data.data);
          setTotal(res.data.pagination.total);
          setTotalPages(res.data.pagination.totalPages);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, params.search, params.gender, params.bloodGroup, params.sortBy, params.sortOrder, tick]);

  return { patients, total, totalPages, page, isLoading, error, refetch, setPage };
};
