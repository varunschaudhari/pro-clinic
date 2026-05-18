import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_OPTIONS,
} from '../utils/jwt.utils';

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_COOKIE_NAME);
  res.clearCookie(REFRESH_COOKIE_NAME);
};

export const registerClinic = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.registerClinic(req.body);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.created(
    res,
    { user: result.user, clinic: result.clinic },
    'Clinic registered successfully'
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.success(res, { user: result.user }, 'Login successful');
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  const result = await AuthService.refreshTokens(token);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.success(res, null, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await AuthService.logout(req.user.userId.toString());
  }
  clearAuthCookies(res);
  return ApiResponse.success(res, null, 'Logged out successfully');
});

export const inviteUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.inviteUser(req.clinicId!, req.body, req.user!.userId);
  return ApiResponse.created(res, result, 'Invitation sent successfully');
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.acceptInvite(req.body);
  setAuthCookies(res, result.accessToken, result.refreshToken);
  return ApiResponse.success(res, { user: result.user }, 'Account activated successfully');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await AuthService.getMe(req.user!.userId.toString());
  return ApiResponse.success(res, user, 'Current user info');
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.changePassword(req.user!.userId.toString(), req.body);
  // Clear cookies so user must re-login with new password
  clearAuthCookies(res);
  return ApiResponse.success(res, null, 'Password changed successfully. Please login again.');
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await AuthService.updateProfile(req.user!.userId.toString(), req.body);
  return ApiResponse.success(res, user, 'Profile updated successfully');
});
