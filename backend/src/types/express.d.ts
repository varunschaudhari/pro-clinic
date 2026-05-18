import { Types } from 'mongoose';
import { Role } from '../constants';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: Types.ObjectId;
        clinicId: Types.ObjectId | null;
        role: Role;
        email: string;
        mobile: string;
      };
      clinicId?: Types.ObjectId;
    }
  }
}
