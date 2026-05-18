import { Types } from 'mongoose';
import { User } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { ROLES } from '../constants';
import type { ListStaffInput, UpdateStaffInput } from '../utils/validators/user.validator';
import type { IPaginatedResponse } from '../types';

export class UserService {
  static async listStaff(clinicId: Types.ObjectId, input: ListStaffInput) {
    const { page, limit, role, search, isActive } = input;

    const filter: Record<string, unknown> = {
      clinicId,
      role: { $ne: ROLES.SUPER_ADMIN },
      isDeleted: false,
    };

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshToken -loginAttempts -lockUntil -inviteToken')
        .sort({ role: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    } as IPaginatedResponse<(typeof data)[0]>;
  }

  static async getStaffMember(clinicId: Types.ObjectId, userId: string) {
    const user = await User.findOne({
      _id: userId,
      clinicId,
      isDeleted: false,
    }).select('-password -refreshToken -loginAttempts -lockUntil -inviteToken');

    if (!user) throw ApiError.notFound('Staff member');
    return user;
  }

  static async updateStaffMember(
    clinicId: Types.ObjectId,
    userId: string,
    input: UpdateStaffInput,
    requestingUserId: Types.ObjectId
  ) {
    // Prevent self-deactivation
    if (input.isActive === false && userId === requestingUserId.toString()) {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, clinicId, isDeleted: false },
      { $set: input },
      { new: true, runValidators: true }
    ).select('-password -refreshToken -loginAttempts');

    if (!user) throw ApiError.notFound('Staff member');
    return user;
  }

  static async removeStaffMember(
    clinicId: Types.ObjectId,
    userId: string,
    requestingUserId: Types.ObjectId
  ) {
    if (userId === requestingUserId.toString()) {
      throw ApiError.badRequest('You cannot remove yourself');
    }

    const user = await User.findOneAndUpdate(
      { _id: userId, clinicId, isDeleted: false, role: { $ne: ROLES.CLINIC_ADMIN } },
      {
        $set: {
          isDeleted: true,
          isActive: false,
          deletedAt: new Date(),
          deletedBy: requestingUserId,
        },
      },
      { new: true }
    );

    if (!user) throw ApiError.notFound('Staff member (or cannot remove ClinicAdmin)');
    return { success: true };
  }

  static async resendInvite(clinicId: Types.ObjectId, userId: string) {
    const crypto = await import('crypto');

    const user = await User.findOne({
      _id: userId,
      clinicId,
      isInviteAccepted: false,
      isDeleted: false,
    });

    if (!user) throw ApiError.notFound('Pending invite');

    user.inviteToken = crypto.randomBytes(32).toString('hex');
    user.inviteTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await user.save();

    // TODO: Send SMS/WhatsApp with new invite token
    return { inviteToken: user.inviteToken };
  }
}
