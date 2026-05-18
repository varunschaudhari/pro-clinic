import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Alert } from '@/components/ui/Alert';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { cn, formatDate, calculateAge } from '@/lib/utils';
import { usePatients } from '@/features/patients/hooks/usePatients';
import { BLOOD_GROUP_OPTIONS, GENDER_OPTIONS } from '@/constants/medical';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Registration Date' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'patientId', label: 'Patient ID' },
  { value: 'lastVisitDate', label: 'Last Visit' },
] as const;

type SortField = (typeof SORT_OPTIONS)[number]['value'];

const GENDER_FILTER_OPTIONS = [
  { value: '', label: 'All Genders' },
  ...GENDER_OPTIONS.map((g) => ({ value: g.value, label: g.label })),
];

const BLOOD_FILTER_OPTIONS = [
  { value: '', label: 'All Blood Groups' },
  ...BLOOD_GROUP_OPTIONS,
];

function SortIcon({ field, current, order }: { field: string; current: string; order: 'asc' | 'desc' }) {
  if (field !== current) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return order === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
    : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const navigate = useNavigate();

  const [search, setSearch]       = useState('');
  const [gender, setGender]       = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [sortBy, setSortBy]       = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounce = useCallback(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  void debounce;

  // Run debounce on search change
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer);
    setSearchTimer(setTimeout(() => setDebouncedSearch(val), 400));
  };

  const { patients, total, totalPages, page, isLoading, error, setPage } = usePatients({
    search: debouncedSearch || undefined,
    gender: gender || undefined,
    bloodGroup: bloodGroup || undefined,
    sortBy,
    sortOrder,
    limit: 20,
  });

  const handleSort = (field: SortField) => {
    if (field === sortBy) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const getAge = (p: (typeof patients)[number]) => {
    if (p.dob) return `${calculateAge(p.dob)} yrs`;
    if (p.age != null) return `${p.age}${p.ageUnit === 'years' ? ' yrs' : ' ' + p.ageUnit}`;
    return '—';
  };

  const GENDER_BADGE: Record<string, string> = {
    male: 'bg-blue-50 text-blue-700',
    female: 'bg-pink-50 text-pink-700',
    other: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} patient${total !== 1 ? 's' : ''} registered` : 'No patients yet'}
          </p>
        </div>
        <Button
          onClick={() => navigate('/patients/new')}
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          New Patient
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[220px]">
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search name or mobile..."
              leftElement={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="w-40">
            <Select
              value={gender}
              onChange={(e) => { setGender(e.target.value); setPage(1); }}
              options={GENDER_FILTER_OPTIONS}
            />
          </div>
          <div className="w-44">
            <Select
              value={bloodGroup}
              onChange={(e) => { setBloodGroup(e.target.value); setPage(1); }}
              options={BLOOD_FILTER_OPTIONS}
            />
          </div>
          <div className="w-48">
            <Select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortField); setPage(1); }}
              options={[...SORT_OPTIONS]}
            />
          </div>
          {(search || gender || bloodGroup) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setDebouncedSearch(''); setGender(''); setBloodGroup(''); setPage(1); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableSkeleton rows={8} cols={8} />
            </table>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-14 w-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No patients found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {debouncedSearch || gender || bloodGroup
                ? 'Try adjusting your search or filters'
                : 'Register your first patient to get started'}
            </p>
            {!(debouncedSearch || gender || bloodGroup) && (
              <Button size="sm" className="mt-4" onClick={() => navigate('/patients/new')}
                leftIcon={<UserPlus className="h-4 w-4" />}>
                Register Patient
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {[
                    { label: 'Patient ID', field: 'patientId' as SortField },
                    { label: 'Name', field: 'name' as SortField },
                    { label: 'Age / Gender', field: null },
                    { label: 'Mobile', field: null },
                    { label: 'Blood Group', field: null },
                    { label: 'Last Visit', field: 'lastVisitDate' as SortField },
                    { label: 'Status', field: null },
                    { label: '', field: null },
                  ].map(({ label, field }) => (
                    <th
                      key={label}
                      onClick={field ? () => handleSort(field) : undefined}
                      className={cn(
                        'text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap',
                        field && 'cursor-pointer hover:text-foreground select-none'
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {field && <SortIcon field={field} current={sortBy} order={sortOrder} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p) => (
                  <tr
                    key={p._id}
                    onClick={() => navigate(`/patients/${p._id}`)}
                    className="hover:bg-gray-50/70 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{p.patientId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{p.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{getAge(p)}</span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize',
                            GENDER_BADGE[p.gender] ?? 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {p.gender}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.mobile}</td>
                    <td className="px-4 py-3">
                      {p.bloodGroup && p.bloodGroup !== 'Unknown' ? (
                        <span className="font-semibold text-red-600 text-xs">{p.bloodGroup}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.lastVisitDate ? formatDate(p.lastVisitDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.isActive ? 'success' : 'secondary'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/patients/${p._id}`); }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={20}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
