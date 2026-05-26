import { useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { AppointmentItem } from '@/services/appointment.service';

// ── Grid constants ────────────────────────────────────────────────────────────

const GRID_START  = 7 * 60;   // 7:00 AM in minutes
const GRID_END    = 21 * 60;  // 9:00 PM in minutes
const CELL_H      = 56;       // px per 30-min slot
const SLOT_MIN    = 30;

// ── Doctor colour palette ─────────────────────────────────────────────────────

const DOCTOR_COLORS = [
  { bg: 'bg-indigo-100',  border: 'border-indigo-300', text: 'text-indigo-800',  dot: 'bg-indigo-500'  },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-100',   border: 'border-amber-300',  text: 'text-amber-800',   dot: 'bg-amber-500'   },
  { bg: 'bg-rose-100',    border: 'border-rose-300',   text: 'text-rose-800',    dot: 'bg-rose-500'    },
  { bg: 'bg-cyan-100',    border: 'border-cyan-300',   text: 'text-cyan-800',    dot: 'bg-cyan-500'    },
  { bg: 'bg-violet-100',  border: 'border-violet-300', text: 'text-violet-800',  dot: 'bg-violet-500'  },
  { bg: 'bg-pink-100',    border: 'border-pink-300',   text: 'text-pink-800',    dot: 'bg-pink-500'    },
  { bg: 'bg-teal-100',    border: 'border-teal-300',   text: 'text-teal-800',    dot: 'bg-teal-500'    },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
  if (!hhmm || !hhmm.includes(':')) return GRID_START;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHHMM(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

export function weekMonday(dateStr: string): string {
  const d   = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysStr(monday, i));
}

// ── Lane layout for overlapping appointments ──────────────────────────────────

function assignLanes(appts: AppointmentItem[]): Map<string, { lane: number; totalLanes: number }> {
  const sorted = [...appts].sort((a, b) => toMinutes(a.slotStart) - toMinutes(b.slotStart));
  const laneEnds: number[] = [];
  const interim: { id: string; lane: number; startMins: number; endMins: number }[] = [];

  for (const appt of sorted) {
    const start = toMinutes(appt.slotStart);
    const end   = Math.max(toMinutes(appt.slotEnd), start + SLOT_MIN);

    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); }
    else             { laneEnds[lane] = end; }

    interim.push({ id: appt._id, lane, startMins: start, endMins: end });
  }

  // Compute totalLanes = max overlapping count at any point within each appt's range
  const result = new Map<string, { lane: number; totalLanes: number }>();
  for (const item of interim) {
    let maxLane = item.lane;
    for (const other of interim) {
      if (other.startMins < item.endMins && other.endMins > item.startMins) {
        maxLane = Math.max(maxLane, other.lane);
      }
    }
    result.set(item.id, { lane: item.lane, totalLanes: maxLane + 1 });
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AppointmentCalendarProps {
  appointments: AppointmentItem[];
  weekStart:    string;   // YYYY-MM-DD (Monday)
  doctors:      { _id: string; name: string }[];
  canCreate:    boolean;
}

export function AppointmentCalendar({
  appointments,
  weekStart,
  doctors,
  canCreate,
}: AppointmentCalendarProps) {
  const navigate  = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const today     = new Date().toISOString().slice(0, 10);
  const days      = weekDays(weekStart);

  // Doctor → colour index
  const doctorColorMap = useMemo(() => {
    const map = new Map<string, number>();
    doctors.forEach((d, i) => map.set(d._id, i % DOCTOR_COLORS.length));
    return map;
  }, [doctors]);

  // Day → appointments
  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>(days.map((d) => [d, []]));
    for (const appt of appointments) {
      const dayStr = appt.appointmentDate.slice(0, 10);
      map.get(dayStr)?.push(appt);
    }
    return map;
  }, [appointments, days]);

  // Time label slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let m = GRID_START; m < GRID_END; m += SLOT_MIN) slots.push(minutesToHHMM(m));
    return slots;
  }, []);

  const gridH = ((GRID_END - GRID_START) / SLOT_MIN) * CELL_H;

  // Current-time indicator
  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowTop  = nowMins >= GRID_START && nowMins <= GRID_END
    ? ((nowMins - GRID_START) / SLOT_MIN) * CELL_H
    : null;

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollRef.current || nowTop === null) return;
    scrollRef.current.scrollTop = Math.max(0, nowTop - 80);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden select-none">

      {/* ── Day header (sticky) ─────────────────────────────────────────── */}
      <div className="flex border-b border-gray-100 sticky top-0 z-20 bg-white">
        <div className="w-14 shrink-0 border-r border-gray-100" />
        {days.map((day) => {
          const d       = new Date(day + 'T00:00:00');
          const isToday = day === today;
          const count   = byDay.get(day)?.length ?? 0;
          return (
            <div
              key={day}
              className={cn(
                'flex-1 min-w-0 text-center py-2.5 border-l border-gray-100',
                isToday && 'bg-primary/5'
              )}
            >
              <p className={cn('text-[10px] font-semibold uppercase tracking-wide', isToday ? 'text-primary' : 'text-muted-foreground')}>
                {d.toLocaleString('en-IN', { weekday: 'short' })}
              </p>
              <div className={cn(
                'mx-auto mt-0.5 h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold',
                isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
              )}>
                {d.getDate()}
              </div>
              {count > 0 && (
                <span className="inline-block rounded-full bg-primary/10 text-primary text-[9px] font-semibold px-1.5 mt-0.5">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Scrollable grid ─────────────────────────────────────────────── */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '580px' }}>
        <div className="flex">

          {/* Time axis */}
          <div className="w-14 shrink-0 border-r border-gray-100 relative" style={{ height: gridH }}>
            {timeSlots.map((t, i) => (
              <div
                key={t}
                className="absolute w-full flex items-start justify-end pr-2 pointer-events-none"
                style={{ top: i * CELL_H - 7 }}
              >
                {i % 2 === 0 ? (
                  <span className="text-[10px] text-muted-foreground font-medium">{t}</span>
                ) : (
                  <span className="text-[8px] text-muted-foreground/40">·</span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const isToday  = day === today;
            const dayAppts = byDay.get(day) ?? [];
            const lanes    = assignLanes(dayAppts);

            return (
              <div
                key={day}
                className={cn(
                  'flex-1 min-w-0 relative border-l border-gray-100',
                  isToday && 'bg-primary/[0.03]'
                )}
                style={{ height: gridH }}
              >
                {/* Grid lines */}
                {timeSlots.map((_, i) => (
                  <div
                    key={i}
                    className={cn('absolute inset-x-0 border-t pointer-events-none', i % 2 === 0 ? 'border-gray-100' : 'border-gray-50')}
                    style={{ top: i * CELL_H }}
                  />
                ))}

                {/* Click-to-book hotspots */}
                {canCreate && timeSlots.map((slot, i) => (
                  <div
                    key={slot}
                    className="absolute inset-x-0 cursor-pointer hover:bg-primary/5 transition-colors group"
                    style={{ top: i * CELL_H, height: CELL_H }}
                    onClick={() => navigate(`/appointments/new?date=${day}&slotStart=${slot}`)}
                  >
                    <span className="absolute right-1.5 top-0.5 text-[9px] text-primary/60 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      + {slot}
                    </span>
                  </div>
                ))}

                {/* Current time line */}
                {isToday && nowTop !== null && (
                  <div className="absolute inset-x-0 z-10 pointer-events-none flex items-center" style={{ top: nowTop }}>
                    <div className="h-2 w-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                )}

                {/* Appointment blocks */}
                {dayAppts.map((appt) => {
                  const startMins = Math.max(toMinutes(appt.slotStart), GRID_START);
                  const rawEnd    = toMinutes(appt.slotEnd);
                  const endMins   = Math.max(rawEnd > startMins ? rawEnd : startMins + SLOT_MIN, startMins + SLOT_MIN);
                  const clampedEnd = Math.min(endMins, GRID_END);

                  const top    = ((startMins - GRID_START) / SLOT_MIN) * CELL_H;
                  const height = Math.max(((clampedEnd - startMins) / SLOT_MIN) * CELL_H - 2, CELL_H - 2);

                  const { lane, totalLanes } = lanes.get(appt._id) ?? { lane: 0, totalLanes: 1 };
                  const pct   = 100 / totalLanes;
                  const colorIdx = doctorColorMap.get(appt.doctor._id) ?? 0;
                  const color    = DOCTOR_COLORS[colorIdx];
                  const isDone   = ['completed', 'cancelled', 'no_show'].includes(appt.status);

                  return (
                    <button
                      key={appt._id}
                      type="button"
                      title={`${appt.patient.name} · Dr. ${appt.doctor.name} · ${appt.slotStart}–${appt.slotEnd}`}
                      className={cn(
                        'absolute rounded border px-1.5 py-1 overflow-hidden text-left',
                        'hover:shadow-md hover:z-30 transition-shadow focus:outline-none focus:ring-1 focus:ring-primary z-20',
                        color.bg, color.border, color.text,
                        isDone && 'opacity-40'
                      )}
                      style={{
                        top:    top + 1,
                        height: height,
                        left:   `calc(${lane * pct}% + 2px)`,
                        width:  `calc(${pct}% - 4px)`,
                      }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/patients/${appt.patient._id}`); }}
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">{appt.patient.name}</p>
                      {height > CELL_H * 0.8 && (
                        <p className="text-[10px] leading-tight truncate opacity-70 mt-0.5">
                          Dr. {appt.doctor.name}
                        </p>
                      )}
                      {height > CELL_H * 1.4 && (
                        <p className="text-[9px] leading-tight opacity-50 mt-0.5">{appt.slotStart}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      {doctors.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 border-t border-gray-100 bg-gray-50/50">
          {doctors.slice(0, 8).map((doc, i) => {
            const color = DOCTOR_COLORS[i % DOCTOR_COLORS.length];
            return (
              <span key={doc._id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('h-2 w-2 rounded-full shrink-0', color.dot)} />
                {doc.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
