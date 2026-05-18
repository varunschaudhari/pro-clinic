import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  info: { wrapper: 'bg-blue-50 border-blue-200 text-blue-800', icon: Info },
  success: { wrapper: 'bg-green-50 border-green-200 text-green-800', icon: CheckCircle2 },
  warning: { wrapper: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: AlertCircle },
  error: { wrapper: 'bg-red-50 border-red-200 text-red-800', icon: XCircle },
} as const;

export interface AlertProps {
  variant?: keyof typeof variants;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export const Alert = ({ variant = 'info', title, children, className, onClose }: AlertProps) => {
  const { wrapper, icon: Icon } = variants[variant];
  return (
    <div className={cn('flex gap-3 rounded-md border p-4', wrapper, className)} role="alert">
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-sm mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
