'use client';

import React, { useState } from 'react';
import { FamilyRole, FamilyPermission, FamilyMember } from '@/types/family.types';
import { Shield, Users, Lock, Unlock, Check, X, Settings, Crown, User, Heart, Baby } from 'lucide-react';

interface FamilyRoleManagerProps {
  familyMembers: FamilyMember[];
  onUpdateMemberRole: (memberId: string, role: FamilyRole) => void;
  onUpdateRolePermissions: (role: FamilyRole, permissions: FamilyPermission[]) => void;
}

export const FamilyRoleManager: React.FC<FamilyRoleManagerProps> = ({
  familyMembers,
  onUpdateMemberRole,
  onUpdateRolePermissions
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'permissions'>('members');
  const [selectedRole, setSelectedRole] = useState<FamilyRole>('parent');

  const roleConfig = {
    parent: {
      label: 'Parent',
      icon: Crown,
      color: 'blue',
      defaultPermissions: [
        'view_family_overview',
        'manage_family_members',
        'view_financial_data',
        'manage_financial_data',
        'view_schedules',
        'manage_schedules',
        'view_goals',
        'manage_goals',
        'view_shopping_lists',
        'manage_shopping_lists',
        'view_meal_plans',
        'manage_meal_plans',
        'manage_family_settings',
        'view_analytics',
        'manage_emergency_contacts'
      ] as FamilyPermission[]
    },
    guardian: {
      label: 'Guardian',
      icon: Shield,
      color: 'green',
      defaultPermissions: [
        'view_family_overview',
        'manage_family_members',
        'view_financial_data',
        'view_schedules',
        'manage_schedules',
        'view_goals',
        'manage_goals',
        'view_shopping_lists',
        'manage_shopping_lists',
        'view_meal_plans',
        'manage_meal_plans',
        'view_analytics',
        'manage_emergency_contacts'
      ] as FamilyPermission[]
    },
    grandparent: {
      label: 'Grandparent',
      icon: Heart,
      color: 'purple',
      defaultPermissions: [
        'view_family_overview',
        'view_schedules',
        'view_goals',
        'view_shopping_lists',
        'view_meal_plans',
        'manage_emergency_contacts'
      ] as FamilyPermission[]
    },
    child: {
      label: 'Child',
      icon: Baby,
      color: 'orange',
      defaultPermissions: [
        'view_family_overview',
        'view_schedules',
        'view_goals',
        'view_shopping_lists',
        'view_meal_plans'
      ] as FamilyPermission[]
    },
    sibling: {
      label: 'Sibling',
      icon: Users,
      color: 'teal',
      defaultPermissions: [
        'view_family_overview',
        'view_schedules',
        'view_goals',
        'manage_goals',
        'view_shopping_lists',
        'manage_shopping_lists',
        'view_meal_plans'
      ] as FamilyPermission[]
    },
    other: {
      label: 'Other',
      icon: User,
      color: 'gray',
      defaultPermissions: [
        'view_family_overview',
        'view_schedules'
      ] as FamilyPermission[]
    }
  };

  const allPermissions: { [key in FamilyPermission]: { label: string; description: string; category: string } } = {
    view_family_overview: {
      label: 'View Family Overview',
      description: 'See general family information and dashboard',
      category: 'General'
    },
    manage_family_members: {
      label: 'Manage Family Members',
      description: 'Add, edit, or remove family members',
      category: 'Family Management'
    },
    view_financial_data: {
      label: 'View Financial Data',
      description: 'See budgets, expenses, and financial reports',
      category: 'Financial'
    },
    manage_financial_data: {
      label: 'Manage Financial Data',
      description: 'Edit budgets, add expenses, manage financial settings',
      category: 'Financial'
    },
    view_schedules: {
      label: 'View Schedules',
      description: 'See family calendar and scheduled events',
      category: 'Scheduling'
    },
    manage_schedules: {
      label: 'Manage Schedules',
      description: 'Create, edit, and delete calendar events',
      category: 'Scheduling'
    },
    view_goals: {
      label: 'View Goals',
      description: 'See family and personal goals',
      category: 'Goals & Tasks'
    },
    manage_goals: {
      label: 'Manage Goals',
      description: 'Create, edit, and track goals',
      category: 'Goals & Tasks'
    },
    view_shopping_lists: {
      label: 'View Shopping Lists',
      description: 'See shopping lists and items',
      category: 'Shopping'
    },
    manage_shopping_lists: {
      label: 'Manage Shopping Lists',
      description: 'Create and edit shopping lists',
      category: 'Shopping'
    },
    view_meal_plans: {
      label: 'View Meal Plans',
      description: 'See planned meals and recipes',
      category: 'Meals'
    },
    manage_meal_plans: {
      label: 'Manage Meal Plans',
      description: 'Plan meals and manage recipes',
      category: 'Meals'
    },
    manage_family_settings: {
      label: 'Manage Family Settings',
      description: 'Change family preferences and configurations',
      category: 'Settings'
    },
    view_analytics: {
      label: 'View Analytics',
      description: 'See family insights and analytics',
      category: 'Analytics'
    },
    manage_emergency_contacts: {
      label: 'Manage Emergency Contacts',
      description: 'Add and edit emergency contact information',
      category: 'Safety'
    }
  };

  const [rolePermissions, setRolePermissions] = useState<Record<FamilyRole, FamilyPermission[]>>(() => {
    const initial: Record<FamilyRole, FamilyPermission[]> = {} as any;
    Object.entries(roleConfig).forEach(([role, config]) => {
      initial[role as FamilyRole] = [...config.defaultPermissions];
    });
    return initial;
  });

  const handlePermissionToggle = (permission: FamilyPermission) => {
    const currentPermissions = rolePermissions[selectedRole];
    const hasPermission = currentPermissions.includes(permission);

    const updatedPermissions = hasPermission
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];

    setRolePermissions(prev => ({
      ...prev,
      [selectedRole]: updatedPermissions
    }));

    onUpdateRolePermissions(selectedRole, updatedPermissions);
  };

  const getMembersByRole = (role: FamilyRole) => {
    return familyMembers.filter(member => member.role === role);
  };

  const getPermissionsByCategory = () => {
    const categories: Record<string, FamilyPermission[]> = {};
    Object.entries(allPermissions).forEach(([permission, config]) => {
      if (!categories[config.category]) {
        categories[config.category] = [];
      }
      categories[config.category].push(permission as FamilyPermission);
    });
    return categories;
  };

  const tabs = [
    { id: 'members', label: 'Member Roles', icon: Users },
    { id: 'permissions', label: 'Role Permissions', icon: Shield }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Family Roles & Permissions</h2>
            <p className="text-sm text-gray-600">
              Manage family member roles and access permissions
            </p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600 bg-blue-50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {activeTab === 'members' && (
          <div className="space-y-6">
            {Object.entries(roleConfig).map(([role, config]) => {
              const IconComponent = config.icon;
              const members = getMembersByRole(role as FamilyRole);

              return (
                <div key={role} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${config.color}-100 rounded-lg`}>
                        <IconComponent className={`w-5 h-5 text-${config.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{config.label}</h3>
                        <p className="text-sm text-gray-600">
                          {members.length} member{members.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 bg-${config.color}-100 text-${config.color}-800 text-sm font-medium rounded-full`}>
                      {config.defaultPermissions.length} permissions
                    </span>
                  </div>

                  {members.length > 0 ? (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {member.profilePicture ? (
                              <img
                                src={member.profilePicture}
                                alt={`${member.firstName} ${member.lastName}`}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-sm text-gray-600">{member.email}</p>
                            </div>
                          </div>
                          <select
                            value={member.role}
                            onChange={(e) => onUpdateMemberRole(member.id, e.target.value as FamilyRole)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {Object.entries(roleConfig).map(([roleKey, roleData]) => (
                              <option key={roleKey} value={roleKey}>
                                {roleData.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No members with this role</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm font-medium text-gray-700">Select Role:</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as FamilyRole)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(roleConfig).map(([roleKey, roleData]) => (
                  <option key={roleKey} value={roleKey}>
                    {roleData.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                {React.createElement(roleConfig[selectedRole].icon, {
                  className: `w-5 h-5 text-${roleConfig[selectedRole].color}-600`
                })}
                <h3 className="font-semibold text-gray-900">
                  {roleConfig[selectedRole].label} Permissions
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Configure what actions members with the {roleConfig[selectedRole].label.toLowerCase()} role can perform.
              </p>
            </div>

            {Object.entries(getPermissionsByCategory()).map(([category, permissions]) => (
              <div key={category} className="border border-gray-200 rounded-lg">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">{category}</h4>
                </div>
                <div className="p-4 space-y-3">
                  {permissions.map((permission) => {
                    const hasPermission = rolePermissions[selectedRole]?.includes(permission);
                    const config = allPermissions[permission];

                    return (
                      <div key={permission} className="flex items-start gap-3">
                        <button
                          onClick={() => handlePermissionToggle(permission)}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            hasPermission
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {hasPermission && <Check className="w-3 h-3" />}
                        </button>
                        <div className="flex-1">
                          <label
                            className="block text-sm font-medium text-gray-900 cursor-pointer"
                            onClick={() => handlePermissionToggle(permission)}
                          >
                            {config.label}
                          </label>
                          <p className="text-sm text-gray-600">{config.description}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {hasPermission ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <Unlock className="w-3 h-3" />
                              Allowed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <Lock className="w-3 h-3" />
                              Denied
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Permission Guidelines</h4>
                  <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                    <li>• Parents have full access to all family data and settings</li>
                    <li>• Guardians can manage most family activities but not financial settings</li>
                    <li>• Children have view-only access to most features with limited editing</li>
                    <li>• Permissions are cumulative - users need both view and manage permissions for full access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};