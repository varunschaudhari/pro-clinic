import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { authApi } from '@/services/auth.service';
import { useAppDispatch } from '@/app/hooks';
import { logout } from '@/features/auth/authSlice';
import { getErrorMessage } from '@/lib/utils';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/\d/, 'Must include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export const ChangePasswordModal = ({ open, onClose }: ChangePasswordModalProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const handleClose = () => {
    reset();
    setErrorMsg('');
    setSuccess(false);
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    try {
      setErrorMsg('');
      await authApi.changePassword(data);
      setSuccess(true);
      // After 2s, log out so user re-authenticates with new password
      setTimeout(() => {
        dispatch(logout());
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMsg(axiosErr?.response?.data?.message || getErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Change Password"
      description="For security, you'll be logged out after changing your password."
      size="sm"
    >
      {success ? (
        <div className="text-center space-y-4 py-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Password Changed!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Logging you out in a moment. Please sign in with your new password.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {errorMsg && (
            <Alert variant="error" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          <div>
            <Label htmlFor="cp-current" required>Current Password</Label>
            <Input
              id="cp-current"
              type={showCurrent ? 'text' : 'password'}
              placeholder="Your current password"
              rightElement={
                <button type="button" onClick={() => setShowCurrent((s) => !s)} tabIndex={-1}>
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
          </div>

          <div>
            <Label htmlFor="cp-new" required>New Password</Label>
            <Input
              id="cp-new"
              type={showNew ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              rightElement={
                <button type="button" onClick={() => setShowNew((s) => !s)} tabIndex={-1}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
          </div>

          <div>
            <Label htmlFor="cp-confirm" required>Confirm New Password</Label>
            <Input
              id="cp-confirm"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter new password"
              rightElement={
                <button type="button" onClick={() => setShowConfirm((s) => !s)} tabIndex={-1}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1"
              leftIcon={<ShieldCheck className="h-4 w-4" />}
            >
              {isSubmitting ? 'Changing…' : 'Change Password'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
};
