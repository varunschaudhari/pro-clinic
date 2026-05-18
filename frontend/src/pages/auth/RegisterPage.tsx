import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { cn, getErrorMessage } from '@/lib/utils';
import { CLINIC_TYPES, INDIAN_STATES } from '@/constants/india';

// ── Schema ────────────────────────────────────────────────
const mobileRegex = /^[6-9]\d{9}$/;

const registerSchema = z
  .object({
    // Step 1 – Clinic Details
    clinicName: z.string().trim().min(2, 'Minimum 2 characters').max(100),
    clinicType: z.string().min(1, 'Select a clinic type'),
    clinicMobile: z.string().regex(mobileRegex, 'Invalid Indian mobile number'),
    clinicEmail: z.string().trim().email('Invalid email address').toLowerCase(),

    // Step 2 – Location
    addressLine1: z.string().trim().min(5, 'Minimum 5 characters'),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(2, 'Enter a city'),
    state: z.string().min(1, 'Select a state'),
    pincode: z.string().regex(/^\d{6}$/, 'Must be a 6-digit PIN code'),

    // Step 3 – Admin Account
    adminName: z.string().trim().min(2, 'Minimum 2 characters').max(100),
    adminMobile: z.string().regex(mobileRegex, 'Invalid Indian mobile number'),
    adminPassword: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/\d/, 'Must include a number'),
    adminConfirmPassword: z.string(),
  })
  .refine((d) => d.adminPassword === d.adminConfirmPassword, {
    message: 'Passwords do not match',
    path: ['adminConfirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

// ── Steps config ──────────────────────────────────────────
const STEPS = [
  {
    id: 1,
    title: 'Clinic Details',
    description: 'Tell us about your clinic',
    fields: ['clinicName', 'clinicType', 'clinicMobile', 'clinicEmail'] as const,
  },
  {
    id: 2,
    title: 'Location',
    description: 'Where is your clinic located?',
    fields: ['addressLine1', 'addressLine2', 'city', 'state', 'pincode'] as const,
  },
  {
    id: 3,
    title: 'Admin Account',
    description: 'Create your administrator account',
    fields: ['adminName', 'adminMobile', 'adminPassword', 'adminConfirmPassword'] as const,
  },
];

const CLINIC_TYPE_OPTIONS = CLINIC_TYPES.map((t) => ({ value: t, label: t }));
const STATE_OPTIONS = INDIAN_STATES.map((s) => ({ value: s, label: s }));

// ── Component ─────────────────────────────────────────────
export default function RegisterPage() {
  const { register: registerClinic } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  });

  const watchedPassword = watch('adminPassword', '');

  const handleNext = async () => {
    const fields = STEPS[step - 1].fields as unknown as (keyof RegisterForm)[];
    const valid = await trigger(fields);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      setErrorMsg('');
      await registerClinic({
        clinicName: data.clinicName,
        clinicType: data.clinicType,
        clinicMobile: data.clinicMobile,
        clinicEmail: data.clinicEmail,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        adminName: data.adminName,
        adminMobile: data.adminMobile,
        adminPassword: data.adminPassword,
      });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMsg(axiosErr?.response?.data?.message || getErrorMessage(err));
      // Go back to step 1 on server error
      setStep(1);
    }
  };

  const passwordStrength = (() => {
    let score = 0;
    if (watchedPassword.length >= 8) score++;
    if (/[A-Z]/.test(watchedPassword)) score++;
    if (/[a-z]/.test(watchedPassword)) score++;
    if (/\d/.test(watchedPassword)) score++;
    if (/[^A-Za-z0-9]/.test(watchedPassword)) score++;
    return score;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][passwordStrength];
  const strengthColor = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-500', 'text-emerald-600'][passwordStrength];

  return (
    <div className="w-full max-w-xl">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-blue-400 to-indigo-500" />

        <div className="px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">Register your clinic</h2>
            <p className="text-sm text-muted-foreground mt-1">Start your 30-day free trial. No credit card needed.</p>
          </div>

          {/* Step indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((s) => (
                <div key={s.id} className="flex items-center gap-1">
                  <div
                    className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all',
                      step > s.id
                        ? 'bg-primary border-primary text-white'
                        : step === s.id
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-gray-200 text-gray-400 bg-gray-50'
                    )}
                  >
                    {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
                  </div>
                  {s.id < STEPS.length && (
                    <div className={cn('h-0.5 w-16 md:w-24 transition-all', step > s.id ? 'bg-primary' : 'bg-gray-200')} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              {STEPS.map((s) => (
                <span
                  key={s.id}
                  className={cn('transition-colors', step === s.id ? 'text-primary font-medium' : '')}
                >
                  {s.title}
                </span>
              ))}
            </div>
          </div>

          {/* Step description */}
          <p className="text-sm font-medium text-foreground mb-4">{STEPS[step - 1].description}</p>

          {errorMsg && (
            <Alert variant="error" className="mb-5" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* ── Step 1: Clinic Details ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="clinicName" required>Clinic / Hospital Name</Label>
                  <Input
                    id="clinicName"
                    placeholder="e.g. Apollo Dental Clinic"
                    error={errors.clinicName?.message}
                    {...register('clinicName')}
                  />
                </div>
                <div>
                  <Label htmlFor="clinicType" required>Specialty / Type</Label>
                  <Select
                    id="clinicType"
                    options={CLINIC_TYPE_OPTIONS}
                    placeholder="Select clinic type"
                    error={errors.clinicType?.message}
                    {...register('clinicType')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clinicMobile" required>Mobile Number</Label>
                    <Input
                      id="clinicMobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="98765 43210"
                      error={errors.clinicMobile?.message}
                      {...register('clinicMobile')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clinicEmail" required>Email Address</Label>
                    <Input
                      id="clinicEmail"
                      type="email"
                      placeholder="clinic@example.com"
                      error={errors.clinicEmail?.message}
                      {...register('clinicEmail')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Location ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="addressLine1" required>Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    placeholder="Building / Street / Area"
                    error={errors.addressLine1?.message}
                    {...register('addressLine1')}
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    placeholder="Landmark (optional)"
                    {...register('addressLine2')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" required>City</Label>
                    <Input
                      id="city"
                      placeholder="Mumbai"
                      error={errors.city?.message}
                      {...register('city')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode" required>PIN Code</Label>
                    <Input
                      id="pincode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="400001"
                      error={errors.pincode?.message}
                      {...register('pincode')}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="state" required>State</Label>
                  <Select
                    id="state"
                    options={STATE_OPTIONS}
                    placeholder="Select state"
                    error={errors.state?.message}
                    {...register('state')}
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Admin Account ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="adminName" required>Your Full Name</Label>
                    <Input
                      id="adminName"
                      placeholder="Dr. Rohan Mehta"
                      error={errors.adminName?.message}
                      {...register('adminName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminMobile" required>Your Mobile</Label>
                    <Input
                      id="adminMobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="98765 43210"
                      error={errors.adminMobile?.message}
                      {...register('adminMobile')}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="adminPassword" required>Password</Label>
                  <Input
                    id="adminPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    rightElement={
                      <button type="button" onClick={() => setShowPassword((s) => !s)} tabIndex={-1}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    error={errors.adminPassword?.message}
                    {...register('adminPassword')}
                  />
                  {watchedPassword && (
                    <div className="mt-2 space-y-1">
                      <Progress value={(passwordStrength / 5) * 100} />
                      <p className={cn('text-xs font-medium', strengthColor)}>{strengthLabel}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="adminConfirmPassword" required>Confirm Password</Label>
                  <Input
                    id="adminConfirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    rightElement={
                      <button type="button" onClick={() => setShowConfirm((s) => !s)} tabIndex={-1}>
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    error={errors.adminConfirmPassword?.message}
                    {...register('adminConfirmPassword')}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  By registering, you agree to our{' '}
                  <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>{' '}
                  and{' '}
                  <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-7 pt-5 border-t border-gray-100">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  ← Back
                </Button>
              ) : (
                <div />
              )}
              {step < STEPS.length ? (
                <Button type="button" onClick={handleNext}>
                  Continue →
                </Button>
              ) : (
                <Button type="submit" isLoading={isSubmitting} size="lg">
                  {isSubmitting ? 'Creating your clinic…' : 'Create Clinic Account'}
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
