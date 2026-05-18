import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, ArrowLeft, Phone, Calendar, Droplets } from 'lucide-react';
import type { PatientDetail } from '@/services/patient.service';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn, formatDate, calculateAge, getInitials } from '@/lib/utils';

const GENDER_COLOR = {
  male: 'bg-blue-50 text-blue-700',
  female: 'bg-pink-50 text-pink-700',
  other: 'bg-purple-50 text-purple-700',
};

interface PatientHeaderProps {
  patient: PatientDetail;
  onEdit: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export const PatientHeader = ({ patient, onEdit, onDelete, canDelete }: PatientHeaderProps) => {
  const navigate = useNavigate();

  const age = patient.dob
    ? calculateAge(patient.dob)
    : patient.age != null
    ? `${patient.age}${patient.ageUnit === 'years' ? '' : ' ' + patient.ageUnit}`
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top accent stripe */}
      <div className="h-1 bg-gradient-to-r from-primary to-indigo-400" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: avatar + basic info */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0',
                GENDER_COLOR[patient.gender] ?? 'bg-gray-100 text-gray-600'
              )}
            >
              {getInitials(patient.name)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground">{patient.name}</h2>
                <Badge variant="ghost" className="font-mono text-xs">
                  {patient.patientId}
                </Badge>
                {!patient.isActive && <Badge variant="destructive">Inactive</Badge>}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 capitalize">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      patient.gender === 'male' ? 'bg-blue-400' : patient.gender === 'female' ? 'bg-pink-400' : 'bg-purple-400'
                    )}
                  />
                  {patient.gender}
                </span>

                {age != null && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {typeof age === 'number' ? `${age} yrs` : age}
                    {patient.dob && (
                      <span className="text-xs">({formatDate(patient.dob)})</span>
                    )}
                  </span>
                )}

                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {patient.mobile}
                </span>

                {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                  <span className="flex items-center gap-1 font-semibold text-red-600">
                    <Droplets className="h-3.5 w-3.5" />
                    {patient.bloodGroup}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/patients')}
              leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
            >
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            >
              Edit
            </Button>
            {canDelete && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-gray-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{patient.visitCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Visits</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-sm font-semibold text-foreground">
              {patient.lastVisitDate ? formatDate(patient.lastVisitDate) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Last Visit</p>
          </div>
          <div className="text-center">
            <p className={cn('text-sm font-bold', patient.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600')}>
              {patient.totalOutstanding > 0 ? `₹${patient.totalOutstanding}` : 'Nil'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Outstanding</p>
          </div>
        </div>
      </div>
    </div>
  );
};
