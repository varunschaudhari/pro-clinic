import { Types } from 'mongoose';
import { PrescriptionTemplate } from '../models/PrescriptionTemplate.model';
import { ApiError } from '../utils/ApiError';
import type { z } from 'zod';
import type {
  createTemplateSchema,
  updateTemplateSchema,
  listTemplatesSchema,
} from '../utils/validators/prescriptionTemplate.validator';

type CreateInput  = z.infer<typeof createTemplateSchema>;
type UpdateInput  = z.infer<typeof updateTemplateSchema>;
type ListParams   = z.infer<typeof listTemplatesSchema>;

export const PrescriptionTemplateService = {

  async list(clinicId: string, userId: string, role: string, params: ListParams) {
    const cid = new Types.ObjectId(clinicId);
    const uid = new Types.ObjectId(userId);

    // ClinicAdmin sees all templates; Doctor sees own + clinic-scoped
    let filter: object;
    if (role === 'ClinicAdmin') {
      filter = { clinicId: cid };
    } else {
      filter = {
        clinicId: cid,
        $or: [
          { scope: 'clinic' },
          { scope: 'doctor', createdBy: uid },
        ],
      };
    }

    // Optional scope filter from query param
    if (params.scope && params.scope !== 'all') {
      filter = { ...filter, scope: params.scope };
    }

    // Optional text search on name
    if (params.q) {
      filter = { ...filter, name: { $regex: params.q, $options: 'i' } };
    }

    const templates = await PrescriptionTemplate
      .find(filter)
      .populate('createdBy', 'name')
      .sort({ scope: -1, name: 1 }) // clinic-scoped first, then alphabetical
      .lean();

    return templates;
  },

  async create(clinicId: string, userId: string, role: string, input: CreateInput) {
    // Only ClinicAdmin can create clinic-scoped templates
    if (input.scope === 'clinic' && role !== 'ClinicAdmin') {
      throw ApiError.forbidden('Only ClinicAdmin can create clinic-wide templates');
    }

    const template = await PrescriptionTemplate.create({
      clinicId:  new Types.ObjectId(clinicId),
      createdBy: new Types.ObjectId(userId),
      ...input,
    });

    return template;
  },

  async update(clinicId: string, id: string, userId: string, role: string, input: UpdateInput) {
    const template = await PrescriptionTemplate.findOne({
      _id:      new Types.ObjectId(id),
      clinicId: new Types.ObjectId(clinicId),
    });
    if (!template) throw ApiError.notFound('Template');

    const isOwner = template.createdBy.toString() === userId;
    if (!isOwner && role !== 'ClinicAdmin') {
      throw ApiError.forbidden('Cannot edit this template');
    }

    // If promoting to clinic-scope, must be ClinicAdmin
    if (input.scope === 'clinic' && role !== 'ClinicAdmin') {
      throw ApiError.forbidden('Only ClinicAdmin can create clinic-wide templates');
    }

    Object.assign(template, input);
    await template.save();
    return template;
  },

  async delete(clinicId: string, id: string, userId: string, role: string) {
    const template = await PrescriptionTemplate.findOne({
      _id:      new Types.ObjectId(id),
      clinicId: new Types.ObjectId(clinicId),
    });
    if (!template) throw ApiError.notFound('Template');

    const isOwner = template.createdBy.toString() === userId;
    if (!isOwner && role !== 'ClinicAdmin') {
      throw ApiError.forbidden('Cannot delete this template');
    }

    template.isDeleted = true;
    template.deletedAt = new Date();
    template.deletedBy = new Types.ObjectId(userId);
    await template.save();
  },
};
