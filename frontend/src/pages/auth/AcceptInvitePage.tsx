import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '@/features/auth/authSlice';
import { authApi } from '@/services/auth.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { cn, getErrorMessage } from '@/lib/utils';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(100).optional(),
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/\d/, 'Must include a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function AcceptInvitePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const watchedPassword = watch('password', '');

  const passwordStrength = (() => {
    let score = 0;
    if (watchedPassword.length >= 8) score++;
    if (/[A-Z]/.test(watchedPassword)) score++;
    if (/[a-z]/.test(watchedPassword)) score++;
    if (/\d/.test(watchedPassword)) score++;
    if (/[^A-Za-z0-9]/.test(watchedPassword)) score++;
    return score;
  })();

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <Alert variant="error" title="Invalid Link">
            This invite link is missing a token. Please use the link sent to your mobile number.
          </Alert>
          <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Account Activated!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your account has been set up successfully. Redirecting to your dashboard...
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    try {
      setErrorMsg('');
      const res = await authApi.acceptInvite({
        token,
        password: data.password,
        name: data.name,
      });
      dispatch(setCredentials({ ...res.data.data.user, clinicName: undefined }));
      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMsg(axiosErr?.response?.data?.message || getErrorMessage(err));
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-blue-400 to-indigo-500" />

        <div className="px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Activate your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You've been invited to join a clinic on ClinixIndia. Set your password to continue.
            </p>
          </div>

          {errorMsg && (
            <Alert variant="error" className="mb-5" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Full name (optional — updates your profile)"
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <div>
              <Label htmlFor="password" required>Create Password</Label>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                rightElement={
                  <button type="button" onClick={() => setShowPassword((s) => !s)} tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
              {watchedPassword && (
                <div className="mt-2">
                  <Progress value={(passwordStrength / 5) * 100} />
                  <p className={cn(
                    'text-xs font-medium mt-1',
                    passwordStrength <= 1 ? 'text-red-500' :
                    passwordStrength <= 2 ? 'text-orange-500' :
                    passwordStrength <= 3 ? 'text-yellow-600' : 'text-green-500'
                  )}>
                    {['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][passwordStrength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" required>Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                rightElement={
                  <button type="button" onClick={() => setShowConfirm((s) => !s)} tabIndex={-1}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? 'Activating account…' : 'Activate Account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
