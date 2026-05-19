import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Package, PackageX, TrendingDown, Plus, Search, ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { pharmacyApi } from '@/services/pharmacy.service';
import type { DrugDoc, PharmacyStats } from '@/services/pharmacy.service';
import { DRUG_CATEGORY_CONFIG } from '@/constants/pharmacy';
import type { DrugCategory } from '@/constants/pharmacy';
import { getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

const CATEGORY_FILTERS: { value: DrugCategory | ''; label: string }[] = [
  { value: '',           label: 'All' },
  { value: 'medicine',   label: 'Medicines' },
  { value: 'consumable', label: 'Consumables' },
  { value: 'equipment',  label: 'Equipment' },
  { value: 'supplement', label: 'Supplements' },
  { value: 'other',      label: 'Other' },
];

export default function PharmacyPage() {
  const navigate      = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user          = useAppSelector((s) => s.auth.user);

  const [drugs, setDrugs]   = useState<DrugDoc[]>([]);
  const [stats, setStats]   = useState<PharmacyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const LIMIT = 20;

  const categoryFilter = (searchParams.get('category') ?? '') as DrugCategory | '';
  const lowStockFilter = searchParams.get('lowStock') === '1';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        pharmacyApi.list({
          search:   searchParams.get('search') || undefined,
          category: categoryFilter || undefined,
          lowStock: lowStockFilter || undefined,
          page,
          limit: LIMIT,
        }),
        pharmacyApi.stats(),
      ]);
      setDrugs(listRes.data.data);
      setTotal(listRes.data.pagination.total);
      setStats(statsRes.data.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [searchParams.toString(), page]);

  const applySearch = () => {
    setPage(1);
    const p = new URLSearchParams(searchParams);
    if (searchInput.trim()) p.set('search', searchInput.trim());
    else p.delete('search');
    setSearchParams(p);
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;
  const canManage  = ['ClinicAdmin', 'Pharmacist'].includes(user?.role ?? '');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pharmacy / Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} item{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/pharmacy/transactions')}>
            <ClipboardList className="h-4 w-4 mr-1" />
            Stock Ledger
          </Button>
          {canManage && (
            <Button onClick={() => navigate('/pharmacy/new')} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Drug
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              <span className="text-xs font-medium">Total Items</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stats.totalDrugs}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium">Low Stock</span>
            </div>
            <p className="text-xl font-bold text-orange-600">{stats.lowStockCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <PackageX className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium">Out of Stock</span>
            </div>
            <p className="text-xl font-bold text-red-600">{stats.outOfStockCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">Near Expiry</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{stats.nearExpiryCount}</p>
            <p className="text-xs text-muted-foreground">within 30 days</p>
          </div>
        </div>
      )}

      {/* Low stock alert banner */}
      {stats && stats.lowStockCount > 0 && !lowStockFilter && (
        <div
          className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors"
          onClick={() => {
            setPage(1);
            const p = new URLSearchParams(searchParams);
            p.set('lowStock', '1');
            setSearchParams(p);
          }}
        >
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {stats.lowStockCount} item{stats.lowStockCount !== 1 ? 's are' : ' is'} below reorder level
            </span>
          </div>
          <span className="text-xs text-orange-600 font-medium">View →</span>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, generic, brand..."
            onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
          />
          <Button variant="outline" size="sm" onClick={applySearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {lowStockFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPage(1);
              const p = new URLSearchParams(searchParams);
              p.delete('lowStock');
              setSearchParams(p);
            }}
            className="text-orange-600 border-orange-300"
          >
            Clear Low Stock Filter ×
          </Button>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto scrollbar-hide">
        {CATEGORY_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setPage(1);
              const p = new URLSearchParams(searchParams);
              if (value) p.set('category', value);
              else p.delete('category');
              setSearchParams(p);
            }}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              categoryFilter === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : drugs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No drugs found</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Drug</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Category</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Unit</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Stock</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Reorder</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">MRP</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Selling</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">HSN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drugs.map((drug) => {
                  const isLow  = drug.currentStock <= drug.reorderLevel;
                  const isOut  = drug.currentStock === 0;
                  const cfg    = DRUG_CATEGORY_CONFIG[drug.category];
                  return (
                    <tr
                      key={drug._id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/pharmacy/${drug._id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{drug.name}</p>
                        {drug.genericName && (
                          <p className="text-xs text-muted-foreground">{drug.genericName}</p>
                        )}
                        {drug.requiresPrescription && (
                          <span className="text-xs text-purple-600 font-medium">Rx</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{drug.unit}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold text-sm ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-foreground'}`}>
                          {drug.currentStock}
                        </span>
                        {isLow && !isOut && (
                          <AlertTriangle className="h-3 w-3 text-orange-500 inline ml-1" />
                        )}
                        {isOut && (
                          <PackageX className="h-3 w-3 text-red-500 inline ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{drug.reorderLevel}</td>
                      <td className="px-4 py-3 text-right text-sm">₹{drug.mrp.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">₹{drug.sellingPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{drug.hsnCode ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground self-center">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
