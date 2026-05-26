import { Schema, model, Document, Types } from 'mongoose';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface IAuditLog extends Document {
  clinicId:        Types.ObjectId;
  action:          AuditAction;
  entity:          string;
  entityId:        Types.ObjectId;
  entityLabel:     string;
  performedBy:     Types.ObjectId;
  performedByRole: string;
  ipAddress:       string;
  summary:         string;
  createdAt:       Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    clinicId:        { type: Schema.Types.ObjectId, ref: 'Clinic',  required: true, index: true },
    action:          { type: String, enum: ['CREATE', 'UPDATE', 'DELETE'], required: true },
    entity:          { type: String, required: true, index: true },
    entityId:        { type: Schema.Types.ObjectId, required: true, index: true },
    entityLabel:     { type: String, default: '' },
    performedBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedByRole: { type: String, required: true },
    ipAddress:       { type: String, default: '' },
    summary:         { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ clinicId: 1, createdAt: -1 });
AuditLogSchema.index({ clinicId: 1, entity: 1, entityId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
