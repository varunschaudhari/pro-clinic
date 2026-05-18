import { useEffect } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials, logout } from './authSlice';
import { fetchClinic } from '@/features/clinic/clinicSlice';
import { authApi } from '@/services/auth.service';

/**
 * Runs once on app mount. Calls /me to verify the httpOnly cookie session
 * and restore auth state. Sets isLoading=false either way.
 */
export const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;

    authApi
      .getMe()
      .then((res) => {
        if (!cancelled) {
          dispatch(
            setCredentials({
              id: res.data.data.id,
              name: res.data.data.name,
              role: res.data.data.role,
              clinicId: res.data.data.clinicId,
              mobile: res.data.data.mobile,
              email: res.data.data.email,
              avatarUrl: res.data.data.avatarUrl,
              clinicName: res.data.data.clinicName,
            })
          );
          // Fetch full clinic data for print views and settings
          if (res.data.data.clinicId) {
            dispatch(fetchClinic());
          }
        }
      })
      .catch(() => {
        if (!cancelled) dispatch(logout());
      });

    return () => { cancelled = true; };
  }, [dispatch]);

  return <>{children}</>;
};
