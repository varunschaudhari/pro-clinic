import { Types, Document } from 'mongoose';
import { Role } from '../constants';

export interface ITimestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface ISoftDelete {
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
}

export interface ITenantDocument extends Document, ITimestamps {
  clinicId: Types.ObjectId;
}

export interface IAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IJwtPayload {
  userId: string;
  clinicId: string | null;
  role: Role;
  email: string;
  mobile: string;
  type: 'access' | 'refresh';
}

export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
