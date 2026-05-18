import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, Role } from '../constants';

export interface IUser extends Document {
  clinicId: Types.ObjectId | null; // null for SuperAdmin
  name: string;
  mobile: string;
  email?: string;
  password: string;
  role: Role;

  specialization?: string; // For doctors
  licenseNumber?: string;  // MCI registration number
  qualifications?: string[];
  experience?: number; // in years
  consultationFee?: number;

  avatarUrl?: string;
  bio?: string;

  refreshToken?: string;
  refreshTokenExpiresAt?: Date;

  inviteToken?: string;
  inviteTokenExpiresAt?: Date;
  isInviteAccepted: boolean;

  lastLoginAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;

  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

const UserSchema = new Schema<IUser>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
      sparse: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      required: true,
      enum: Object.values(ROLES),
    },

    specialization: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    qualifications: [{ type: String, trim: true }],
    experience: { type: Number, min: 0 },
    consultationFee: { type: Number, min: 0 },

    avatarUrl: { type: String },
    bio: { type: String, maxlength: 500 },

    refreshToken: { type: String, select: false },
    refreshTokenExpiresAt: { type: Date, select: false },

    inviteToken: { type: String, select: false },
    inviteTokenExpiresAt: { type: Date, select: false },
    isInviteAccepted: { type: Boolean, default: false },

    lastLoginAt: { type: Date },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        delete ret.inviteToken;
        return ret;
      },
    },
  }
);

UserSchema.index({ mobile: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ clinicId: 1, role: 1, isActive: 1 });
UserSchema.index({ clinicId: 1, isDeleted: 1 });
UserSchema.index({ inviteToken: 1 }, { sparse: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours

UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

UserSchema.methods.incLoginAttempts = async function (): Promise<void> {
  if (this.lockUntil && this.lockUntil < new Date()) {
    await this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: '' } });
    return;
  }
  const updates: Record<string, any> = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_TIME_MS) };
  }
  await this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = async function (): Promise<void> {
  await this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: '' } });
};

export const User = model<IUser>('User', UserSchema);
