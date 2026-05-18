import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Spinner = ({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return <Loader2 className={cn('animate-spin text-primary', sizes[size], className)} />;
};

export const FullPageSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
    <Spinner size="lg" />
  </div>
);

export const PageLoader = () => (
  <div className="flex h-full min-h-[400px] items-center justify-center">
    <Spinner size="lg" />
  </div>
);
