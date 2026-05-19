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
          const d = res.data.data;
          dispatch(
            setCredentials({
              id: d.id,
              name: d.name,
              role: d.role,
              clinicId: d.clinicId,
              mobile: d.mobile,
              email: d.email,
              avatarUrl: d.avatarUrl,
              clinicName: d.clinicName,
              bio: d.bio,
              specialization: d.specialization,
              licenseNumber: d.licenseNumber,
              consultationFee: d.consultationFee,
              qualifications: d.qualifications,
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
