import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  cols: number;
  className?: string;
}

export const TableSkeleton = ({ rows = 8, cols, className }: TableSkeletonProps) => (
  <tbody className={cn('divide-y divide-gray-50', className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i}>
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-4 py-3">
            <div className={cn(
              'h-4 rounded bg-gray-100 animate-pulse',
              j === 0 ? 'w-20' : j === cols - 1 ? 'w-12' : 'w-full max-w-[160px]'
            )} />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);
