import path from 'path';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Clinic } from '../models/Clinic.model';
import { AuditService } from '../services/audit.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { UPLOAD_ROOT } from '../middleware/upload';

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const clinic = await Clinic.findById(new Types.ObjectId(req.clinicId!))
    .select('-subscription -isDeleted -deletedAt -__v')
    .lean();

  if (!clinic) throw new ApiError(404, 'Clinic not found');
  return ApiResponse.success(res, clinic);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const { settings, address, bankAccount, ...topLevel } = req.body;

  const updateDoc: Record<string, any> = {};

  // Top-level scalar fields
  for (const [key, val] of Object.entries(topLevel)) {
    if (val !== undefined && val !== '') {
      updateDoc[key] = val;
    }
  }

  // Address — set each subfield
  if (address) {
    for (const [key, val] of Object.entries(address)) {
      updateDoc[`address.${key}`] = val;
    }
  }

  // Settings — set each subfield (never overwrite the whole object)
  if (settings) {
    for (const [key, val] of Object.entries(settings)) {
      if (val !== undefined) {
        updateDoc[`settings.${key}`] = val;
      }
    }
  }

  // Bank account — set each subfield
  if (bankAccount) {
    for (const [key, val] of Object.entries(bankAccount)) {
      updateDoc[`bankAccount.${key}`] = val ?? '';
    }
  }

  const clinic = await Clinic.findByIdAndUpdate(
    new Types.ObjectId(req.clinicId!),
    { $set: updateDoc },
    { new: true, runValidators: true, select: '-subscription -isDeleted -deletedAt -__v' }
  ).lean();

  if (!clinic) throw new ApiError(404, 'Clinic not found');

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Settings',
    entityId: req.clinicId!.toString(), entityLabel: (clinic as any).name ?? 'Clinic',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Updated clinic settings`,
  });

  return ApiResponse.success(res, clinic, 'Settings saved');
});

export const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const relativePath = path.relative(UPLOAD_ROOT, req.file.path).replace(/\\/g, '/');
  const logoUrl = `/uploads/${relativePath}`;

  const clinic = await Clinic.findByIdAndUpdate(
    new Types.ObjectId(req.clinicId!),
    { $set: { logoUrl } },
    { new: true, select: '-subscription -isDeleted -deletedAt -__v' }
  ).lean();

  if (!clinic) throw ApiError.notFound('Clinic');
  return ApiResponse.success(res, { logoUrl, clinic }, 'Logo uploaded');
});
