'use client'

import React, { useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';
import { useFamilyStore } from '@/store/familyStore';
import useFamilyData from '@/hooks/useFamilyData';

const roleOptions: Array<{ value: 'all' | 'Parent' | 'Student' | 'Family Member'; label: string }> = [
  { value: 'all', label: 'All roles' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Student', label: 'Student' },
  { value: 'Family Member', label: 'Family Member' },
];

const FamilyDashboard: React.FC = () => {
  const { members, openForm, deleteMember } = useFamilyContext();
  const databaseStatus = useFamilyStore((state) => state.databaseStatus);
  const { loading, error, refetch } = useFamilyData(databaseStatus.familyId ?? undefined);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'Parent' | 'Student' | 'Family Member'>('all');

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'all' || member.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [filterRole, members, searchTerm]);

  const getAgeFromDob = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    const parsed = new Date(dateOfBirth);
    if (Number.isNaN(parsed.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - parsed.getFullYear();
    const monthDiff = today.getMonth() - parsed.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
      age -= 1;
    }
    return age;
  };

  const stats = useMemo(() => {
    const total = members.length;
    const parents = members.filter((member) => member.role === 'Parent').length;
    const students = members.filter((member) => member.role === 'Student').length;
    const other = total - parents - students;
    const ageGroups = members.reduce<Record<string, number>>((acc, member) => {
      const key = member.ageGroup || 'Adult';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return { total, parents, students, other, ageGroups };
  }, [members]);

  const handleDelete = (memberId: string, memberName: string) => {
    if (!window.confirm(`Remove ${memberName} from the family?`)) return;
    deleteMember(memberId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Family</h2>
            <p className="text-sm text-gray-600">
              Manage family members and keep roles and age groups up to date.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="rounded-full border border-gray-200 px-3 py-1">
              {databaseStatus.connected ? 'Connected' : 'Offline'} • {databaseStatus.mode}
            </span>
            {databaseStatus.familyId && (
              <span className="rounded-full border border-gray-200 px-3 py-1">
                Family ID: {databaseStatus.familyId.slice(0, 8)}…
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Total Members</p>
            <p className="text-2xl font-semibold text-blue-900">{stats.total}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-700">Parents</p>
            <p className="text-2xl font-semibold text-green-900">{stats.parents}</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <p className="text-sm text-purple-700">Students</p>
            <p className="text-2xl font-semibold text-purple-900">{stats.students}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Other</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.other}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search members"
              className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <select
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value as typeof filterRole)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openForm()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Loading family members…
        </div>
      )}

      {!loading && members.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">No family members yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Add your first member to start managing roles, age groups, and family details.
          </p>
          <button
            onClick={() => openForm()}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      )}

      {!loading && members.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredMembers.map((member) => (
            <div key={member.id} className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="h-12 w-12 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-lg text-white"
                  style={{ backgroundColor: member.color }}
                >
                  {member.icon || member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-500">
                      {member.role}
                      {(() => {
                        const age = member.age ?? getAgeFromDob(member.dateOfBirth);
                        if (age === null) return ` • ${member.ageGroup}`;
                        return ` • Age ${age} • ${member.ageGroup}`;
                      })()}
                    </p>
                  </div>
                  <span className="rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-500">
                    {databaseStatus.connected && member.familyId !== 'local-family' ? 'Synced' : 'Local'}
                  </span>
                </div>
                {member.fitnessGoals && Object.keys(member.fitnessGoals).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    Fitness goals set
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => openForm(member)}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(member.id, member.name)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && members.length > 0 && filteredMembers.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          No members match your search.
        </div>
      )}

      {Object.keys(stats.ageGroups).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900">Age Groups</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(stats.ageGroups).map(([group, count]) => (
              <span key={group} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                {group}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyDashboard;
