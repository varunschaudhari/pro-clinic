import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.model';
import type { AuditAction } from '../models/AuditLog.model';

export interface AuditLogInput {
  clinicId:        Types.ObjectId;
  action:          AuditAction;
  entity:          string;
  entityId:        Types.ObjectId | string;
  entityLabel:     string;
  performedBy:     Types.ObjectId;
  performedByRole: string;
  ipAddress:       string;
  summary:         string;
}

interface ListParams {
  page?:      number;
  limit?:     number;
  entity?:    string;
  action?:    AuditAction;
  startDate?: string;
  endDate?:   string;
}

export class AuditService {
  static log(input: AuditLogInput): void {
    AuditLog.create({
      clinicId:        input.clinicId,
      action:          input.action,
      entity:          input.entity,
      entityId:        new Types.ObjectId(input.entityId.toString()),
      entityLabel:     input.entityLabel,
      performedBy:     input.performedBy,
      performedByRole: input.performedByRole,
      ipAddress:       input.ipAddress,
      summary:         input.summary,
    }).catch((err) => {
      console.error('[AuditLog] Failed to save:', err?.message ?? err);
    });
  }

  static async list(clinicId: Types.ObjectId, params: ListParams) {
    const page  = Math.max(1, params.page  ?? 1);
    const limit = Math.min(100, params.limit ?? 30);
    const skip  = (page - 1) * limit;

    const filter: Record<string, any> = { clinicId };
    if (params.entity) filter.entity = params.entity;
    if (params.action) filter.action = params.action;
    if (params.startDate || params.endDate) {
      filter.createdAt = {};
      if (params.startDate) filter.createdAt.$gte = new Date(params.startDate);
      if (params.endDate)   filter.createdAt.$lte = new Date(params.endDate + 'T23:59:59.999Z');
    }

    const [docs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return {
      data: docs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  static async getEntityHistory(
    clinicId: Types.ObjectId,
    entity:   string,
    entityId: string,
  ) {
    return AuditLog.find({
      clinicId,
      entity,
      entityId: new Types.ObjectId(entityId),
    })
      .populate('performedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }
}
