import { Request, Response } from 'express';
import { PrescriptionTemplateService } from '../services/prescriptionTemplate.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { listTemplatesSchema } from '../utils/validators/prescriptionTemplate.validator';

export const listTemplates = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listTemplatesSchema.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const templates = await PrescriptionTemplateService.list(
    req.clinicId!.toString(),
    req.user!.userId,
    req.user!.role,
    params,
  );

  return ApiResponse.success(res, templates);
});

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await PrescriptionTemplateService.create(
    req.clinicId!.toString(),
    req.user!.userId,
    req.user!.role,
    req.body,
  );
  return ApiResponse.created(res, template, 'Template created');
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const template = await PrescriptionTemplateService.update(
    req.clinicId!.toString(),
    req.params.id,
    req.user!.userId,
    req.user!.role,
    req.body,
  );
  return ApiResponse.success(res, template, 'Template updated');
});

export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  await PrescriptionTemplateService.delete(
    req.clinicId!.toString(),
    req.params.id,
    req.user!.userId,
    req.user!.role,
  );
  return ApiResponse.noContent(res);
});
