import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { LabReport } from '../models/LabReport.model';
import { LabReportService } from '../services/labReport.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { listLabReportsSchema } from '../utils/validators/labReport.validator';
import { UPLOAD_ROOT } from '../middleware/upload';

export const listLabReports = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listLabReportsSchema.safeParse(req.query);
  const params = parsed.success ? parsed.data : { page: 1, limit: 20 };

  const result = await LabReportService.listLabReports(
    req.clinicId!,
    params as Parameters<typeof LabReportService.listLabReports>[1],
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.paginated(res, result);
});

export const createLabReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await LabReportService.createLabReport(
    req.clinicId!,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.created(res, report, 'Lab report created successfully');
});

export const getLabReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await LabReportService.getLabReportById(
    req.clinicId!,
    req.params.id,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, report);
});

export const updateLabReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await LabReportService.updateLabReport(
    req.clinicId!,
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, report, 'Lab report updated successfully');
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const report = await LabReportService.updateStatus(
    req.clinicId!,
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, report, 'Status updated');
});

export const deleteLabReport = asyncHandler(async (req: Request, res: Response) => {
  await LabReportService.deleteLabReport(
    req.clinicId!,
    req.params.id,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.noContent(res);
});

// ── File upload ────────────────────────────────────────────────────────────────

/** POST /lab/:id/files  — multer runs before this, file is at req.file */
export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');

  const report = await LabReport.findOne({
    _id:      new Types.ObjectId(req.params.id),
    clinicId: req.clinicId!,
    isDeleted: false,
  });
  if (!report) throw ApiError.notFound('Lab report');

  // Build the URL path that will be served by Express static
  const relativePath = path.relative(UPLOAD_ROOT, req.file.path).replace(/\\/g, '/');
  const fileUrl = `/uploads/${relativePath}`;

  report.fileUrls.push(fileUrl);
  await report.save();

  return ApiResponse.success(res, { url: fileUrl, fileUrls: report.fileUrls }, 'File uploaded');
});

/** DELETE /lab/:id/files  — body: { url: "/uploads/..." } */
export const deleteFile = asyncHandler(async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url || !url.startsWith('/uploads/')) {
    throw ApiError.badRequest('Invalid file URL');
  }

  const report = await LabReport.findOne({
    _id:      new Types.ObjectId(req.params.id),
    clinicId: req.clinicId!,
    isDeleted: false,
  });
  if (!report) throw ApiError.notFound('Lab report');

  // Security: URL must contain the clinic's own folder segment
  const clinicSegment = `/${req.clinicId!.toString()}/`;
  if (!url.includes(clinicSegment)) {
    throw ApiError.forbidden('Cannot delete this file');
  }

  if (!report.fileUrls.includes(url)) {
    throw ApiError.notFound('File not attached to this report');
  }

  // Remove from DB
  report.fileUrls = report.fileUrls.filter((u) => u !== url);
  await report.save();

  // Delete from disk (best-effort — don't fail the request if file is already gone)
  const diskPath = path.join(UPLOAD_ROOT, url.replace('/uploads/', ''));
  try {
    fs.unlinkSync(diskPath);
  } catch {
    // File already gone — that's fine
  }

  return ApiResponse.success(res, { fileUrls: report.fileUrls }, 'File deleted');
});
