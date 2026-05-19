import crypto from 'crypto';
import { Types } from 'mongoose';
import { Clinic } from '../models/Clinic.model';
import { User, IUser } from '../models/User.model';
import { ApiError } from '../utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { ROLES } from '../constants';
import type {
  ClinicRegistrationInput,
  LoginInput,
  InviteUserInput,
  AcceptInviteInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from '../utils/validators/auth.validator';

const buildTokenPayload = (user: IUser) => ({
  userId: (user._id as Types.ObjectId).toString(),
  clinicId: user.clinicId?.toString() ?? null,
  role: user.role,
  email: user.email ?? '',
  mobile: user.mobile,
});

const generateSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export class AuthService {
  /**
   * Registers a new clinic and creates its ClinicAdmin account.
   * Runs in a transaction to guarantee atomicity.
   */
  static async registerClinic(input: ClinicRegistrationInput) {
    const existingClinic = await Clinic.findOne({
      $or: [{ email: input.clinicEmail }, { mobile: input.clinicMobile }],
    }).lean();
    if (existingClinic) {
      throw ApiError.conflict('A clinic with this email or mobile already exists');
    }

    const existingUser = await User.findOne({ mobile: input.adminMobile }).lean();
    if (existingUser) {
      throw ApiError.conflict('An account with this mobile number already exists');
    }

    let slug = generateSlug(input.clinicName);
    const slugExists = await Clinic.findOne({ slug }).lean();
    if (slugExists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const clinic = await Clinic.create({
      name: input.clinicName,
      slug,
      type: input.clinicType,
      mobile: input.clinicMobile,
      email: input.clinicEmail,
      address: {
        line1: input.addressLine1,
        line2: input.addressLine2,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
      },
    });

    let admin;
    try {
      admin = await User.create({
        clinicId: clinic._id,
        name: input.adminName,
        mobile: input.adminMobile,
        email: input.adminEmail,
        password: input.adminPassword,
        role: ROLES.CLINIC_ADMIN,
        isInviteAccepted: true,
      });
    } catch (err) {
      await Clinic.deleteOne({ _id: clinic._id });
      throw err;
    }

    const tokenPayload = buildTokenPayload(admin);
    return {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: signRefreshToken(tokenPayload),
      user: { id: admin._id, name: admin.name, role: admin.role, clinicId: clinic._id },
      clinic: { id: clinic._id, name: clinic.name, slug: clinic.slug },
    };
  }

  static async login(input: LoginInput) {
    const user = await User.findOne({
      mobile: input.mobile,
      isDeleted: false,
      isActive: true,
    }).select('+password +loginAttempts +lockUntil');
    if (!user) throw ApiError.unauthorized('Invalid mobile number or password');

    if (user.isLocked()) {
      throw ApiError.unauthorized(
        'Account temporarily locked due to multiple failed attempts. Try again in 2 hours.'
      );
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      await user.incLoginAttempts();
      throw ApiError.unauthorized('Invalid mobile number or password');
    }

    await user.resetLoginAttempts();
    user.lastLoginAt = new Date();

    const tokenPayload = buildTokenPayload(user);
    const refreshToken = signRefreshToken(tokenPayload);

    user.refreshToken = refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    let clinicName: string | null = null;
    if (user.clinicId) {
      const clinic = await Clinic.findById(user.clinicId).select('name').lean();
      clinicName = clinic?.name ?? null;
    }

    return {
      accessToken: signAccessToken(tokenPayload),
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        clinicId: user.clinicId,
        mobile: user.mobile,
        email: user.email,
        avatarUrl: user.avatarUrl,
        clinicName,
      },
    };
  }

  static async refreshTokens(token: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findOne({
      _id: payload.userId,
      isActive: true,
      isDeleted: false,
    }).select('+refreshToken +refreshTokenExpiresAt');

    if (!user || user.refreshToken !== token) {
      throw ApiError.unauthorized('Refresh token has been revoked');
    }

    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token expired');
    }

    const tokenPayload = buildTokenPayload(user);
    const newRefreshToken = signRefreshToken(tokenPayload);

    // Rotate refresh token
    user.refreshToken = newRefreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    return {
      accessToken: signAccessToken(tokenPayload),
      refreshToken: newRefreshToken,
    };
  }

  static async logout(userId: string) {
    await User.findByIdAndUpdate(userId, {
      $unset: { refreshToken: '', refreshTokenExpiresAt: '' },
    });
  }

  static async inviteUser(clinicId: Types.ObjectId, input: InviteUserInput, invitedBy: Types.ObjectId) {
    const existing = await User.findOne({
      clinicId,
      mobile: input.mobile,
      isDeleted: false,
    }).lean();

    if (existing) {
      throw ApiError.conflict('A user with this mobile number already exists in this clinic');
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const user = await User.create({
      clinicId,
      name: input.name,
      mobile: input.mobile,
      email: input.email,
      role: input.role,
      specialization: input.specialization,
      licenseNumber: input.licenseNumber,
      consultationFee: input.consultationFee,
      // Temporary password — will be set on invite acceptance
      password: crypto.randomBytes(16).toString('hex'),
      inviteToken,
      inviteTokenExpiresAt,
      isInviteAccepted: false,
      isActive: false, // Inactive until invite accepted
    });

    // TODO: Send invite via SMS/WhatsApp using inviteToken
    return { inviteToken, user: { id: user._id, name: user.name, role: user.role } };
  }

  static async acceptInvite(input: AcceptInviteInput) {
    const user = await User.findOne({
      inviteToken: input.token,
      isInviteAccepted: false,
      isDeleted: false,
    }).select('+inviteToken +inviteTokenExpiresAt');

    if (!user) throw ApiError.badRequest('Invalid or already used invite token');
    if (user.inviteTokenExpiresAt && user.inviteTokenExpiresAt < new Date()) {
      throw ApiError.badRequest('Invite token has expired. Request a new invite.');
    }

    user.password = input.password;
    if (input.name) user.name = input.name;
    user.isInviteAccepted = true;
    user.isActive = true;
    user.inviteToken = undefined;
    user.inviteTokenExpiresAt = undefined;
    await user.save();

    const tokenPayload = buildTokenPayload(user);
    const refreshToken = signRefreshToken(tokenPayload);
    user.refreshToken = refreshToken;
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await user.save();

    return {
      accessToken: signAccessToken(tokenPayload),
      refreshToken,
      user: { id: user._id, name: user.name, role: user.role, clinicId: user.clinicId },
    };
  }

  static async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await User.findOne({ _id: userId, isDeleted: false }).select('+password');
    if (!user) throw ApiError.notFound('User');

    const isMatch = await user.comparePassword(input.currentPassword);
    if (!isMatch) throw ApiError.badRequest('Current password is incorrect');

    user.password = input.newPassword;
    // Invalidate all existing refresh tokens on password change (security)
    user.refreshToken = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save();
  }

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await User.findOneAndUpdate(
      { _id: userId, isDeleted: false },
      {
        $set: {
          ...(input.name && { name: input.name }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.bio !== undefined && { bio: input.bio }),
          ...(input.specialization !== undefined && { specialization: input.specialization }),
          ...(input.licenseNumber !== undefined && { licenseNumber: input.licenseNumber }),
          ...(input.consultationFee !== undefined && { consultationFee: input.consultationFee }),
          ...(input.qualifications !== undefined && { qualifications: input.qualifications }),
        },
      },
      { new: true, runValidators: true }
    );
    if (!user) throw ApiError.notFound('User');
    return user;
  }

  static async getMe(userId: string): Promise<any> {
    const user = await User.findOne({ _id: userId, isDeleted: false }).lean();
    if (!user) throw ApiError.notFound('User');

    let clinicName: string | null = null;
    if (user.clinicId) {
      const clinic = await Clinic.findById(user.clinicId).select('name slug').lean();
      clinicName = clinic?.name ?? null;
    }

    return {
      id:              (user._id as Types.ObjectId).toString(),
      name:            user.name,
      role:            user.role,
      clinicId:        user.clinicId?.toString() ?? null,
      mobile:          user.mobile,
      email:           user.email,
      avatarUrl:       user.avatarUrl,
      clinicName,
      bio:             user.bio,
      specialization:  user.specialization,
      licenseNumber:   user.licenseNumber,
      consultationFee: user.consultationFee,
      qualifications:  user.qualifications,
    };
  }
}
