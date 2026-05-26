import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Phone, Lock } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/lib/utils';

const loginSchema = z.object({
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      setErrorMsg('');
      const user = await login(data);
      navigate(user.role === 'SuperAdmin' ? '/admin' : from, { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMsg(axiosErr?.response?.data?.message || getErrorMessage(err));
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Top accent */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-blue-400 to-indigo-500" />

        <div className="px-8 py-8">
          <div className="mb-7 text-center">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your clinic dashboard</p>
          </div>

          {errorMsg && (
            <Alert variant="error" className="mb-5" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Mobile */}
            <div>
              <Label htmlFor="mobile" required>Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                leftElement={<Phone className="h-4 w-4" />}
                error={errors.mobile?.message}
                {...register('mobile')}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="password" required>Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                leftElement={<Lock className="h-4 w-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button type="submit" isLoading={isSubmitting} className="w-full mt-2" size="lg">
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-sm text-muted-foreground">
            New clinic?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>

      {/* Tagline */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Trusted by clinics across India · GST compliant · Secure
      </p>
    </div>
  );
}
