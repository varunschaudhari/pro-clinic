import { Schema, model, Document, Types } from 'mongoose';
import { ROLES, Role } from '../constants';

export type NotificationType =
  | 'low_stock'
  | 'out_of_stock'
  | 'pending_lab'
  | 'pending_bill'
  | 'missed_appointment';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface INotification extends Document {
  clinicId:   Types.ObjectId;
  type:       NotificationType;
  title:      string;
  message:    string;
  count:      number;
  entityIds:  Types.ObjectId[];
  targetRoles: Role[];
  severity:   NotificationSeverity;
  readBy:     Types.ObjectId[];     // userIds who have read this alert
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt:  Date;
  updatedAt:  Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    clinicId:    { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    type:        {
      type: String,
      required: true,
      enum: ['low_stock', 'out_of_stock', 'pending_lab', 'pending_bill', 'missed_appointment'],
    },
    title:       { type: String, required: true },
    message:     { type: String, required: true },
    count:       { type: Number, default: 0 },
    entityIds:   [{ type: Schema.Types.ObjectId }],
    targetRoles: [{ type: String, enum: Object.values(ROLES) }],
    severity:    { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    readBy:      [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isResolved:  { type: Boolean, default: false, index: true },
    resolvedAt:  { type: Date },
  },
  { timestamps: true }
);

// One record per clinic per alert type
NotificationSchema.index({ clinicId: 1, type: 1 }, { unique: true });

export const Notification = model<INotification>('Notification', NotificationSchema);
