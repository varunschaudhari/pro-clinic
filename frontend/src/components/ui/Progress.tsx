import { cn } from '@/lib/utils';

export interface ProgressProps {
  value: number; // 0-100
  className?: string;
  label?: string;
}

export const Progress = ({ value, className, label }: ProgressProps) => (
  <div className={cn('space-y-1', className)}>
    {label && <p className="text-xs text-muted-foreground">{label}</p>}
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  </div>
);
