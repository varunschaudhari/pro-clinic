import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Copy, Check, UserPlus } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { authApi } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/utils';
import { STAFF_ROLES, DOCTOR_SPECIALIZATIONS } from '@/constants/india';

const inviteSchema = z.object({
  name: z.string().trim().min(2, 'Enter full name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  role: z.enum(['Doctor', 'Receptionist', 'Pharmacist']),
  specialization: z.string().optional(),
  licenseNumber: z.string().trim().optional(),
  consultationFee: z.coerce.number().min(0).optional(),
});

type InviteForm = z.infer<typeof inviteSchema>;

const SPECIALIZATION_OPTIONS = DOCTOR_SPECIALIZATIONS.map((s) => ({ value: s, label: s }));

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (data?: { name: string; token: string }) => void;
}

export const InviteUserModal = ({ open, onClose, onSuccess }: InviteUserModalProps) => {
  const [errorMsg, setErrorMsg] = useState('');
  const [invitedUser, setInvitedUser] = useState<{ name: string; role: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'Receptionist' },
  });

  const selectedRole = watch('role');

  const handleClose = () => {
    reset();
    setErrorMsg('');
    setInvitedUser(null);
    setCopied(false);
    onClose();
  };

  const inviteLink = invitedUser
    ? `${window.location.origin}/invite/accept?token=${invitedUser.token}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onSubmit = async (data: InviteForm) => {
    try {
      setErrorMsg('');
      const res = await authApi.inviteUser({
        name: data.name,
        mobile: data.mobile,
        email: data.email || undefined,
        role: data.role,
        specialization: data.specialization || undefined,
        licenseNumber: data.licenseNumber || undefined,
        consultationFee: data.consultationFee,
      });
      const { name, role } = res.data.data.user;
      const token = res.data.data.inviteToken;
      setInvitedUser({ name, role, token });
      onSuccess?.({ name, token });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMsg(axiosErr?.response?.data?.message || getErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Invite Staff Member"
      description="Send an invitation to a new team member. They'll receive a link to set their password."
      size="md"
    >
      {invitedUser ? (
        // Success state
        <div className="space-y-5 py-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {invitedUser.name} invited as {invitedUser.role}
              </p>
              <p className="text-sm text-muted-foreground">
                Share this link with them to activate their account.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Invite Link</Label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 min-w-0 rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground font-mono truncate focus:outline-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1.5">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">This link expires after the user accepts the invite.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Done
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                reset();
                setInvitedUser(null);
                setErrorMsg('');
                setCopied(false);
              }}
            >
              Invite Another
            </Button>
          </div>
        </div>
      ) : (
        // Form state
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errorMsg && (
            <Alert variant="error" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inv-name" required>Full Name</Label>
              <Input
                id="inv-name"
                placeholder="Dr. Priya Sharma"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>
            <div>
              <Label htmlFor="inv-mobile" required>Mobile Number</Label>
              <Input
                id="inv-mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                error={errors.mobile?.message}
                {...register('mobile')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inv-role" required>Role</Label>
              <Select
                id="inv-role"
                options={STAFF_ROLES as unknown as { value: string; label: string }[]}
                error={errors.role?.message}
                {...register('role')}
              />
            </div>
            <div>
              <Label htmlFor="inv-email">Email (optional)</Label>
              <Input
                id="inv-email"
                type="email"
                placeholder="priya@clinic.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </div>

          {/* Doctor-specific fields */}
          {selectedRole === 'Doctor' && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Doctor Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inv-spec">Specialization</Label>
                  <Select
                    id="inv-spec"
                    options={SPECIALIZATION_OPTIONS}
                    placeholder="Select specialization"
                    {...register('specialization')}
                  />
                </div>
                <div>
                  <Label htmlFor="inv-fee">Consultation Fee (₹)</Label>
                  <Input
                    id="inv-fee"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="500"
                    {...register('consultationFee')}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="inv-license">MCI / State License Number</Label>
                <Input
                  id="inv-license"
                  placeholder="MH-12345"
                  {...register('licenseNumber')}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1" leftIcon={<UserPlus className="h-4 w-4" />}>
              {isSubmitting ? 'Sending invite…' : 'Send Invite'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
};
