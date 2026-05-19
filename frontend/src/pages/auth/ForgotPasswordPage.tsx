import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { authApi } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/utils';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground mb-6">
            If an account with that email exists, we've sent a password reset link. It expires in 1 hour.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Forgot password?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email address and we'll send you a reset link.
          </p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="doctor@example.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Send Reset Link
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
