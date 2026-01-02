'use client'

import { useMemo } from 'react';
import { Wrench, Plus, Clock, MapPin, Calendar, CheckCircle, XCircle, Phone } from 'lucide-react';
import { useContractorContext } from '@/contexts/familyHub/ContractorContext';

const formatNiceDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

export const UpcomingContractorVisits = () => {
  const {
    upcomingAppointments,
    openQuickAppointment,
    markAppointmentComplete,
    deleteAppointment,
    getSpecialtyLabel,
  } = useContractorContext();

  const displayAppointments = useMemo(() => {
    return upcomingAppointments.slice(0, 3);
  }, [upcomingAppointments]);

  const hasAppointments = displayAppointments.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-slate-100">
          <Wrench className="h-5 w-5 text-amber-500" />
          Contractor Visits
        </h3>
        <button
          onClick={openQuickAppointment}
          className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {!hasAppointments ? (
        <div className="mt-4 rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-slate-700">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
            <Wrench className="h-6 w-6 text-gray-400 dark:text-slate-500" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-slate-100">
            No upcoming visits
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Schedule a contractor appointment
          </p>
          <button
            onClick={openQuickAppointment}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {displayAppointments.map((apt) => (
            <div
              key={apt.id}
              className="group rounded-lg border border-gray-100 bg-gray-50 p-3 transition-all hover:border-gray-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {apt.contractor?.name || 'Contractor'}
                    </span>
                    {apt.contractor?.company && (
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {apt.contractor.company}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                    {apt.purpose}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatNiceDate(apt.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(apt.time)}
                    </span>
                    {apt.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {apt.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {apt.contractor?.phone && (
                    <a
                      href={`tel:${apt.contractor.phone}`}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                      title="Call"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => markAppointmentComplete(apt.id)}
                    className="rounded p-1 text-gray-400 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30"
                    title="Mark complete"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteAppointment(apt.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    title="Cancel"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {apt.cost && (
                <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-slate-600">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Est. cost</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    £{apt.cost.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ))}

          {upcomingAppointments.length > 3 && (
            <p className="text-center text-xs text-gray-500 dark:text-slate-400">
              +{upcomingAppointments.length - 3} more upcoming
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default UpcomingContractorVisits;
