import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Lock, User } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { ChangePasswordModal } from '@/features/auth/components/ChangePasswordModal';
import { getInitials, getErrorMessage } from '@/lib/utils';
import { DOCTOR_SPECIALIZATIONS } from '@/constants/india';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Minimum 2 characters').max(100),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional(),
  specialization: z.string().optional(),
  licenseNumber: z.string().trim().optional(),
  consultationFee: z.coerce.number().min(0).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const SPECIALIZATION_OPTIONS = DOCTOR_SPECIALIZATIONS.map((s) => ({ value: s, label: s }));

const ROLE_BADGE_MAP: Record<string, 'default' | 'success' | 'warning' | 'ghost'> = {
  ClinicAdmin: 'default',
  Doctor: 'success',
  Receptionist: 'warning',
  Pharmacist: 'ghost',
};

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      bio: (user as any)?.bio ?? '',
      specialization: (user as any)?.specialization ?? '',
      licenseNumber: (user as any)?.licenseNumber ?? '',
      consultationFee: (user as any)?.consultationFee ?? undefined,
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      await updateProfile({
        name: data.name,
        email: data.email || undefined,
        bio: data.bio,
        specialization: data.specialization,
        licenseNumber: data.licenseNumber,
        consultationFee: data.consultationFee,
      });
      setSuccessMsg('Profile updated successfully');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMsg(axiosErr?.response?.data?.message || getErrorMessage(err));
    }
  };

  if (!user) return null;

  const roleBadgeVariant = ROLE_BADGE_MAP[user.role] ?? 'ghost';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
              {getInitials(user.name)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                <Badge variant={roleBadgeVariant}>{user.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{user.mobile}</p>
              {user.clinicName && (
                <p className="text-xs text-muted-foreground">{user.clinicName}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {successMsg && (
            <Alert variant="success" className="mb-5" onClose={() => setSuccessMsg('')}>
              {successMsg}
            </Alert>
          )}
          {errorMsg && (
            <Alert variant="error" className="mb-5" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profile-name" required>Full Name</Label>
                <Input
                  id="profile-name"
                  error={errors.name?.message}
                  {...register('name')}
                />
              </div>
              <div>
                <Label htmlFor="profile-email">Email Address</Label>
                <Input
                  id="profile-email"
                  type="email"
                  placeholder="your@email.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="profile-bio">Short Bio</Label>
              <textarea
                id="profile-bio"
                rows={3}
                placeholder="Brief professional description (max 500 chars)"
                maxLength={500}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-50"
                {...register('bio')}
              />
            </div>

            {/* Doctor-specific fields */}
            {(user.role === 'Doctor' || user.role === 'ClinicAdmin') && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Doctor Information
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="profile-spec">Specialization</Label>
                    <Select
                      id="profile-spec"
                      options={SPECIALIZATION_OPTIONS}
                      placeholder="Select specialization"
                      {...register('specialization')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profile-fee">Consultation Fee (₹)</Label>
                    <Input
                      id="profile-fee"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="500"
                      {...register('consultationFee')}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="profile-license">MCI / State License Number</Label>
                  <Input
                    id="profile-license"
                    placeholder="MH-12345"
                    {...register('licenseNumber')}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={!isDirty}
                leftIcon={<Save className="h-4 w-4" />}
              >
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use a strong password with uppercase, lowercase, and numbers.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangePasswordOpen(true)}
              leftIcon={<Lock className="h-3.5 w-3.5" />}
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
}
