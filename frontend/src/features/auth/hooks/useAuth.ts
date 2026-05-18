import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setCredentials, logout as logoutAction, updateUser } from '../authSlice';
import { authApi, LoginPayload, RegisterPayload, UpdateProfilePayload } from '@/services/auth.service';
import type { Role } from '@/types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  const login = async (data: LoginPayload) => {
    const res = await authApi.login(data);
    const authUser = res.data.data.user;
    dispatch(setCredentials(authUser));
    return authUser;
  };

  const register = async (data: RegisterPayload) => {
    const res = await authApi.register(data);
    dispatch(setCredentials({ ...res.data.data.user, clinicName: res.data.data.clinic?.name }));
    return res.data.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors — cookie will expire anyway
    }
    dispatch(logoutAction());
    navigate('/login', { replace: true });
  };

  const refreshProfile = async () => {
    const res = await authApi.getMe();
    dispatch(setCredentials(res.data.data));
    return res.data.data;
  };

  const updateProfile = async (data: UpdateProfilePayload) => {
    const res = await authApi.updateProfile(data);
    dispatch(updateUser(res.data.data));
    return res.data.data;
  };

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);

  const isClinicAdmin = () => hasRole('ClinicAdmin');
  const isDoctor = () => hasRole('Doctor');
  const isReceptionist = () => hasRole('Receptionist');
  const isPharmacist = () => hasRole('Pharmacist');
  const isSuperAdmin = () => hasRole('SuperAdmin');

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshProfile,
    updateProfile,
    hasRole,
    isClinicAdmin,
    isDoctor,
    isReceptionist,
    isPharmacist,
    isSuperAdmin,
  };
};
