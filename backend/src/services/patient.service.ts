import { Types } from 'mongoose';
import { Patient } from '../models/Patient.model';
import { Clinic } from '../models/Clinic.model';
import { nextSeq } from '../models/Counter.model';
import { ApiError } from '../utils/ApiError';
import type { CreatePatientInput, UpdatePatientInput, ListPatientsInput } from '../utils/validators/patient.validator';
import type { IPaginatedResponse } from '../types';

export class PatientService {
  // ── Create ───────────────────────────────────────────────────────────────────
  static async createPatient(
    clinicId: Types.ObjectId,
    input: CreatePatientInput,
    createdBy: Types.ObjectId
  ) {
    // Duplicate mobile check within clinic
    const existing = await Patient.findOne({ clinicId, mobile: input.mobile }).lean();
    if (existing) {
      throw ApiError.conflict(
        `A patient with mobile ${input.mobile} already exists (${existing.patientId} – ${existing.name})`
      );
    }

    // Get clinic prefix + generate sequential ID
    const clinic = await Clinic.findById(clinicId).select('settings').lean();
    const prefix = clinic?.settings?.patientIdPrefix ?? 'CX';
    const seq = await nextSeq(clinicId, 'patient');
    const patientId = `${prefix}-${String(seq).padStart(4, '0')}`;

    // Build address object if at least line1 is provided
    const address =
      input.addressLine1
        ? {
            line1: input.addressLine1,
            line2: input.addressLine2,
            city: input.city,
            state: input.state,
            pincode: input.pincode || undefined,
            country: 'India',
          }
        : undefined;

    const emergencyContact =
      input.emergencyName || input.emergencyMobile
        ? {
            name: input.emergencyName ?? '',
            mobile: input.emergencyMobile ?? '',
            relation: input.emergencyRelation ?? '',
          }
        : undefined;

    const insurance =
      input.insuranceProvider
        ? {
            provider: input.insuranceProvider,
            policyNumber: input.insurancePolicyNumber ?? '',
            validTill: input.insuranceValidTill ? new Date(input.insuranceValidTill) : undefined,
          }
        : undefined;

    const patient = await Patient.create({
      clinicId,
      patientId,
      name: input.name,
      mobile: input.mobile,
      alternateMobile: input.alternateMobile || undefined,
      email: input.email || undefined,
      gender: input.gender,
      dob: input.dob ? new Date(input.dob) : undefined,
      age: input.age,
      ageUnit: input.ageUnit,
      bloodGroup: input.bloodGroup,
      height: input.height,
      weight: input.weight,
      address,
      emergencyContact,
      allergies: input.allergies ?? [],
      chronicConditions: input.chronicConditions ?? [],
      currentMedications: input.currentMedications ?? [],
      insurance,
      aadharLast4: input.aadharLast4 || undefined,
      abhaId: input.abhaId || undefined,
      source: input.source,
      notes: input.notes,
    });

    return patient;
  }

  // ── List ─────────────────────────────────────────────────────────────────────
  static async listPatients(
    clinicId: Types.ObjectId,
    input: ListPatientsInput
  ): Promise<IPaginatedResponse<any>> {
    const { page, limit, search, gender, bloodGroup, sortBy, sortOrder } = input;

    const filter: Record<string, unknown> = { clinicId, isDeleted: false };

    if (gender) filter.gender = gender;
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    if (search) {
      // Try mobile exact-prefix first, fallback to name regex
      const isMobile = /^\d+$/.test(search);
      if (isMobile) {
        filter.mobile = { $regex: `^${search}` };
      } else {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { patientId: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search } },
          { abhaId: { $regex: search, $options: 'i' } },
        ];
      }
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      Patient.find(filter)
        .select('patientId name mobile gender dob age ageUnit bloodGroup visitCount lastVisitDate totalOutstanding isActive createdAt')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Patient.countDocuments(filter),
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
    };
  }

  // ── Get by ID ────────────────────────────────────────────────────────────────
  static async getPatientById(clinicId: Types.ObjectId, patientId: string) {
    const patient = await Patient.findOne({ _id: patientId, clinicId, isDeleted: false })
      .populate('referredBy', 'name role specialization')
      .lean();

    if (!patient) throw ApiError.notFound('Patient');
    return patient;
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  static async updatePatient(
    clinicId: Types.ObjectId,
    patientId: string,
    input: UpdatePatientInput
  ) {
    // If mobile is changing, check for duplicates
    if (input.mobile) {
      const conflict = await Patient.findOne({
        clinicId,
        mobile: input.mobile,
        _id: { $ne: patientId },
      }).lean();
      if (conflict) {
        throw ApiError.conflict(
          `Mobile ${input.mobile} is already registered under ${conflict.patientId} – ${conflict.name}`
        );
      }
    }

    // Rebuild nested objects from flat input
    const updateData: Record<string, unknown> = {};

    const scalarFields = [
      'name', 'mobile', 'alternateMobile', 'email', 'gender',
      'bloodGroup', 'height', 'weight', 'source', 'notes',
      'aadharLast4', 'abhaId', 'allergies', 'chronicConditions', 'currentMedications',
      'age', 'ageUnit',
    ] as const;

    for (const field of scalarFields) {
      if (input[field] !== undefined) {
        updateData[field] = input[field] === '' ? undefined : input[field];
      }
    }

    if (input.dob !== undefined) {
      updateData.dob = input.dob ? new Date(input.dob) : undefined;
    }

    if (input.addressLine1 !== undefined || input.city !== undefined) {
      updateData.address = {
        line1: input.addressLine1,
        line2: input.addressLine2,
        city: input.city,
        state: input.state,
        pincode: input.pincode || undefined,
        country: 'India',
      };
    }

    if (input.emergencyName !== undefined || input.emergencyMobile !== undefined) {
      updateData.emergencyContact = {
        name: input.emergencyName ?? '',
        mobile: input.emergencyMobile ?? '',
        relation: input.emergencyRelation ?? '',
      };
    }

    if (input.insuranceProvider !== undefined) {
      updateData.insurance = input.insuranceProvider
        ? {
            provider: input.insuranceProvider,
            policyNumber: input.insurancePolicyNumber ?? '',
            validTill: input.insuranceValidTill ? new Date(input.insuranceValidTill) : undefined,
          }
        : undefined;
    }

    const patient = await Patient.findOneAndUpdate(
      { _id: patientId, clinicId, isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!patient) throw ApiError.notFound('Patient');
    return patient;
  }

  // ── Soft Delete ──────────────────────────────────────────────────────────────
  static async deletePatient(
    clinicId: Types.ObjectId,
    patientId: string,
    deletedBy: Types.ObjectId
  ) {
    const patient = await Patient.findOneAndUpdate(
      { _id: patientId, clinicId, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          isActive: false,
          deletedAt: new Date(),
          deletedBy,
        },
      },
      { new: true }
    );
    if (!patient) throw ApiError.notFound('Patient');
    return { success: true };
  }

  // ── Quick Search (for appointment booking etc.) ───────────────────────────────
  static async searchPatients(clinicId: Types.ObjectId, query: string, limit = 10) {
    if (!query || query.trim().length < 2) return [];

    const search = query.trim();
    const isMobile = /^\d+$/.test(search);

    const filter: Record<string, unknown> = { clinicId, isDeleted: false };
    if (isMobile) {
      filter.mobile = { $regex: `^${search}` };
    } else {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
      ];
    }

    return Patient.find(filter)
      .select('patientId name mobile gender dob age bloodGroup lastVisitDate')
      .limit(limit)
      .lean();
  }

  // ── Summary stats for a single patient ───────────────────────────────────────
  static async getPatientStats(clinicId: Types.ObjectId, patientId: string) {
    const [patient] = await Patient.aggregate([
      { $match: { _id: new Types.ObjectId(patientId), clinicId, isDeleted: false } },
      {
        $project: {
          visitCount: 1,
          lastVisitDate: 1,
          totalOutstanding: 1,
          allergies: 1,
          chronicConditions: 1,
        },
      },
    ]);
    if (!patient) throw ApiError.notFound('Patient');
    return patient;
  }
}
