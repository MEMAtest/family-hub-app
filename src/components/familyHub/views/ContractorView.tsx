'use client'

import { useMemo, useState } from 'react';
import { Plus, Search, Wrench } from 'lucide-react';
import { useContractorContext } from '@/contexts/familyHub/ContractorContext';
import { CONTRACTOR_SPECIALTIES } from '@/types/contractor.types';
import { UpcomingContractorVisits } from '@/components/contractors';

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(amount);

export const ContractorView = () => {
  const {
    contractors,
    appointments,
    openQuickAppointment,
    getSpecialtyLabel,
  } = useContractorContext();

  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState<string>('all');

  const filteredContractors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contractors
      .filter((c) => (specialty === 'all' ? true : c.specialty === specialty))
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contractors, query, specialty]);

  const { history, totalSpend } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const history = appointments
      .filter((apt) => apt.status !== 'scheduled' || apt.date < today)
      .slice()
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
      })
      .map((apt) => ({
        ...apt,
        contractor: contractors.find((c) => c.id === apt.contractorId),
      }));

    const totalSpend = appointments.reduce((sum, apt) => sum + (apt.cost || 0), 0);

    return { history, totalSpend };
  }, [appointments, contractors]);

  return (
    <div className="p-3 sm:p-4 lg:p-8 space-y-6 bg-gray-50 dark:bg-slate-950 min-h-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Contractors</h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Keep your trades and appointments in one place.
          </p>
        </div>
        <button
          onClick={openQuickAppointment}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          Book appointment
        </button>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingContractorVisits />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
            <Wrench className="h-5 w-5 text-amber-500" />
            Cost Summary
          </h3>
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">Total spend (all time)</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">{formatMoney(totalSpend)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Directory</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contractors..."
                className="w-full sm:w-64 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full sm:w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All specialties</option>
              {CONTRACTOR_SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredContractors.length === 0 ? (
          <div className="mt-6 rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-slate-700">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">No contractors yet</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Book an appointment to add your first contractor.
            </p>
            <button
              onClick={openQuickAppointment}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              <Plus className="h-4 w-4" />
              Book appointment
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredContractors.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{c.name}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {getSpecialtyLabel(c.specialty)}
                  {c.company ? ` • ${c.company}` : ''}
                </p>
                {(c.phone || c.email) && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-slate-300">
                    {c.phone || c.email}
                  </p>
                )}
                {c.notes && (
                  <p className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-slate-400">{c.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Appointment History</h3>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">No past appointments yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {history.slice(0, 20).map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {apt.contractor?.name || 'Contractor'}: {apt.purpose}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {apt.date} {apt.time} • {apt.status}
                  </p>
                </div>
                {apt.cost ? (
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{formatMoney(apt.cost)}</p>
                ) : (
                  <span className="text-xs text-gray-400">No cost recorded</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ContractorView;

