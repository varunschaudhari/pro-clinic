import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { scheduleApi, type SlotInfo } from '@/services/schedule.service';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  doctorId: string;
  date: string;       // YYYY-MM-DD
  value: string;      // selected slotStart (HH:MM)
  onChange: (slotStart: string, slotEnd: string) => void;
}

export const SlotPicker = ({ doctorId, date, value, onChange }: Props) => {
  const [slots, setSlots]     = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId || !date) return;
    setLoading(true);
    setMessage(null);
    setSlots([]);

    scheduleApi.getAvailability(doctorId, date)
      .then((res) => {
        const result = res.data.data;
        if (!result.available) {
          setMessage(
            result.reason === 'on_leave'
              ? 'Doctor is on leave for this date'
              : 'Doctor has no schedule for this day'
          );
        } else {
          setSlots(result.slots);
          if (result.slots.length === 0) setMessage('No slots generated for this schedule');
        }
      })
      .catch(() => setMessage('Could not load slots'))
      .finally(() => setLoading(false));
  }, [doctorId, date]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Spinner size="sm" /> Loading slots…
      </div>
    );
  }

  if (message) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        {message}
      </p>
    );
  }

  if (slots.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => {
        const isSelected = slot.slotStart === value;
        return (
          <button
            key={slot.slotStart}
            type="button"
            disabled={!slot.available}
            onClick={() => onChange(slot.slotStart, slot.slotEnd)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground'
                : slot.available
                  ? 'border-gray-200 bg-white hover:border-primary hover:bg-primary/5 text-foreground'
                  : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through'
            )}
            title={slot.reason ? { past: 'Past slot', leave: 'Doctor on leave', full: 'Fully booked' }[slot.reason] : undefined}
          >
            {slot.slotStart}
            {slot.bookedCount > 0 && slot.available && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({slot.maxPatientsPerSlot - slot.bookedCount} left)
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
