import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';

import { usersApi } from '@/services/auth.service';
import type { StaffMember } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/utils';
import { DOCTOR_SPECIALIZATIONS } from '@/constants/india';
import { useState } from 'react';

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  specialization:  z.string().optional(),
  licenseNumber:   z.string().trim().max(50).optional(),
  consultationFee: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(0).max(100_000).optional()
  ),
});

type FormValues = z.infer<typeof schema>;

const SPEC_OPTIONS = DOCTOR_SPECIALIZATIONS.map((s) => ({ value: s, label: s }));

// ── Props ─────────────────────────────────────────────────────────────────────

interface EditStaffModalProps {
  open:      boolean;
  onClose:   () => void;
  member:    StaffMember;
  onSuccess: (updated: StaffMember) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EditStaffModal({ open, onClose, member, onSuccess }: EditStaffModalProps) {
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register, control, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset({
        specialization:  member.specialization ?? '',
        licenseNumber:   member.licenseNumber  ?? '',
        consultationFee: member.consultationFee,
      });
      setErrorMsg('');
    }
  }, [open, member, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      setErrorMsg('');
      const res = await usersApi.updateStaff(member._id, {
        specialization:  data.specialization  || undefined,
        licenseNumber:   data.licenseNumber   || undefined,
        consultationFee: data.consultationFee,
      });
      onSuccess(res.data.data);
      onClose();
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const isDoctor = member.role === 'Doctor';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Edit — ${member.name}`}
      description={isDoctor ? 'Update doctor profile details.' : 'Update staff member details.'}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errorMsg && <Alert variant="error" onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}

        {isDoctor && (
          <>
            <div className="space-y-1.5">
              <Label>Specialization</Label>
              <Controller
                name="specialization"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={SPEC_OPTIONS}
                    placeholder="Select specialization"
                    error={errors.specialization?.message}
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>MCI / State License Number</Label>
              <Input
                {...register('licenseNumber')}
                placeholder="MH-12345"
                error={errors.licenseNumber?.message}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Consultation Fee (₹)</Label>
              <Input
                {...register('consultationFee')}
                type="number"
                min={0}
                placeholder="500"
                error={errors.consultationFee?.message}
              />
            </div>
          </>
        )}

        {!isDoctor && (
          <p className="text-sm text-muted-foreground py-2">
            No editable fields for this role. Use Activate / Deactivate from the staff list.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {isDoctor && (
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
