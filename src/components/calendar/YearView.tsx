'use client'

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  Star
} from 'lucide-react';
import { CalendarEvent, Person } from '@/types/calendar.types';

interface YearViewProps {
  events: CalendarEvent[];
  people: Person[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

interface MonthData {
  month: number;
  year: number;
  name: string;
  days: DayData[];
  eventCount: number;
  totalCost: number;
}

interface DayData {
  date: number;
  fullDate: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isOtherMonth: boolean;
  eventCount: number;
  totalCost: number;
  intensity: 'none' | 'low' | 'medium' | 'high' | 'extreme';
}

const YearView: React.FC<YearViewProps> = ({
  events,
  people,
  currentDate,
  onDateChange,
  onEventClick,
  onDateClick
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'heatmap' | 'events'>('overview');

  const currentYear = currentDate.getFullYear();
  const today = new Date();

  // Calculate intensity based on event count and cost
  const getIntensity = (eventCount: number, totalCost: number): DayData['intensity'] => {
    if (eventCount === 0) return 'none';
    if (eventCount === 1 && totalCost < 50) return 'low';
    if (eventCount <= 2 && totalCost < 100) return 'medium';
    if (eventCount <= 3 || totalCost < 200) return 'high';
    return 'extreme';
  };

  // Get intensity color
  const getIntensityColor = (intensity: DayData['intensity']) => {
    switch (intensity) {
      case 'none': return 'bg-gray-100';
      case 'low': return 'bg-blue-200';
      case 'medium': return 'bg-blue-400';
      case 'high': return 'bg-blue-600';
      case 'extreme': return 'bg-blue-800';
      default: return 'bg-gray-100';
    }
  };

  // Generate year data
  const yearData = useMemo((): MonthData[] => {
    const months: MonthData[] = [];

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(currentYear, month, 1);
      const monthEnd = new Date(currentYear, month + 1, 0);
      const firstDay = monthStart.getDay();

      const days: DayData[] = [];
      let monthEventCount = 0;
      let monthTotalCost = 0;

      // Add days from previous month to fill the first week
      for (let i = firstDay - 1; i >= 0; i--) {
        const date = new Date(currentYear, month, -i);
        days.push({
          date: date.getDate(),
          fullDate: date,
          events: [],
          isToday: false,
          isOtherMonth: true,
          eventCount: 0,
          totalCost: 0,
          intensity: 'none'
        });
      }

      // Add days of current month
      for (let day = 1; day <= monthEnd.getDate(); day++) {
        const date = new Date(currentYear, month, day);
        const dateString = date.toISOString().split('T')[0];

        const dayEvents = events.filter(event => event.date === dateString);
        const dayTotalCost = dayEvents.reduce((sum, event) => sum + (event.cost || 0), 0);

        monthEventCount += dayEvents.length;
        monthTotalCost += dayTotalCost;

        days.push({
          date: day,
          fullDate: date,
          events: dayEvents,
          isToday: date.toDateString() === today.toDateString(),
          isOtherMonth: false,
          eventCount: dayEvents.length,
          totalCost: dayTotalCost,
          intensity: getIntensity(dayEvents.length, dayTotalCost)
        });
      }

      // Add days from next month to fill the last week
      const remainingDays = 42 - days.length; // 6 weeks * 7 days
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(currentYear, month + 1, i);
        days.push({
          date: date.getDate(),
          fullDate: date,
          events: [],
          isToday: false,
          isOtherMonth: true,
          eventCount: 0,
          totalCost: 0,
          intensity: 'none'
        });
      }

      months.push({
        month,
        year: currentYear,
        name: monthStart.toLocaleDateString('en-US', { month: 'long' }),
        days,
        eventCount: monthEventCount,
        totalCost: monthTotalCost
      });
    }

    return months;
  }, [events, currentYear, today]);

  // Calculate year statistics
  const yearStats = useMemo(() => {
    const totalEvents = yearData.reduce((sum, month) => sum + month.eventCount, 0);
    const totalCost = yearData.reduce((sum, month) => sum + month.totalCost, 0);
    const busiestMonth = yearData.reduce((max, month) =>
      month.eventCount > max.eventCount ? month : max, yearData[0]
    );
    const costliestMonth = yearData.reduce((max, month) =>
      month.totalCost > max.totalCost ? month : max, yearData[0]
    );

    // Get major events (high cost or priority)
    const majorEvents = events.filter(event =>
      event.cost > 100 || event.priority === 'high'
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalEvents,
      totalCost,
      busiestMonth,
      costliestMonth,
      majorEvents,
      averageEventsPerMonth: Math.round(totalEvents / 12),
      averageCostPerMonth: Math.round(totalCost / 12)
    };
  }, [yearData, events]);

  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(currentYear + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  const handleDayClick = (day: DayData) => {
    if (day.isOtherMonth) return;

    if (day.events.length === 1) {
      onEventClick?.(day.events[0]);
    } else if (day.events.length > 1) {
      // Could open a day detail modal or expand inline
      onDateClick?.(day.fullDate);
    } else {
      onDateClick?.(day.fullDate);
    }
  };

  const renderMonthGrid = (monthData: MonthData, isSelected: boolean = false) => (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
      onClick={() => setSelectedMonth(selectedMonth === monthData.month ? null : monthData.month)}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">{monthData.name}</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>{monthData.eventCount} events</span>
          {monthData.totalCost > 0 && (
            <span>£{monthData.totalCost}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div key={`day-${idx}`} className="text-xs text-gray-500 text-center font-medium py-1">
            {day}
          </div>
        ))}

        {monthData.days.map((day, index) => (
          <div
            key={index}
            className={`aspect-square text-xs flex items-center justify-center rounded cursor-pointer transition-colors ${
              day.isOtherMonth
                ? 'text-gray-300'
                : day.isToday
                  ? 'bg-blue-600 text-white font-bold'
                  : viewMode === 'heatmap'
                    ? `${getIntensityColor(day.intensity)} ${day.intensity !== 'none' ? 'text-white' : 'text-gray-700'}`
                    : day.eventCount > 0
                      ? 'bg-blue-100 text-blue-800 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleDayClick(day);
            }}
            title={day.eventCount > 0 ? `${day.eventCount} events${day.totalCost > 0 ? `, £${day.totalCost}` : ''}` : ''}
          >
            {day.date}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-semibold text-gray-900">Year Overview</h1>
            </div>

            {/* Year Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateYear('prev')}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-4 py-2 bg-gray-50 rounded-md min-w-[120px] text-center">
                <span className="text-lg font-medium text-gray-900">{currentYear}</span>
              </div>

              <button
                onClick={() => navigateYear('next')}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { mode: 'overview', label: 'Overview' },
              { mode: 'heatmap', label: 'Heat Map' },
              { mode: 'events', label: 'Events' }
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Year Statistics */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Events</p>
                <p className="text-2xl font-bold text-blue-900">{yearStats.totalEvents}</p>
                <p className="text-sm text-blue-700">~{yearStats.averageEventsPerMonth}/month</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Cost</p>
                <p className="text-2xl font-bold text-green-900">£{yearStats.totalCost}</p>
                <p className="text-sm text-green-700">~£{yearStats.averageCostPerMonth}/month</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Busiest Month</p>
                <p className="text-lg font-bold text-purple-900">{yearStats.busiestMonth.name}</p>
                <p className="text-sm text-purple-700">{yearStats.busiestMonth.eventCount} events</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Major Events</p>
                <p className="text-2xl font-bold text-orange-900">{yearStats.majorEvents.length}</p>
                <p className="text-sm text-orange-700">High priority/cost</p>
              </div>
              <Star className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {viewMode === 'events' ? (
          /* Major Events List */
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Major Events {currentYear}</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {yearStats.majorEvents.map((event) => {
                const person = people.find(p => p.id === event.person);
                return (
                  <div
                    key={event.id}
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: person?.color }}
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(event.date).toLocaleDateString('en-GB', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })} at {event.time}
                          </p>
                          {event.location && (
                            <p className="text-sm text-gray-500">{event.location}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          {event.priority === 'high' && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                          {event.cost > 0 && (
                            <span className="font-medium text-gray-900">£{event.cost}</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 capitalize">{event.type}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {yearStats.majorEvents.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No major events found for {currentYear}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Month Grid */
          <div className="grid grid-cols-4 gap-6">
            {yearData.map((month) => renderMonthGrid(month, selectedMonth === month.month))}
          </div>
        )}

        {/* Heat Map Legend */}
        {viewMode === 'heatmap' && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Activity Level</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Less</span>
                <div className="flex space-x-1">
                  {['none', 'low', 'medium', 'high', 'extreme'].map((intensity) => (
                    <div
                      key={intensity}
                      className={`w-3 h-3 rounded-sm ${getIntensityColor(intensity as any)}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">More</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YearView;