'use client';

import { useState } from "react";
import {
  Shield,
  Plus,
  Users,
  Lock,
  Unlock,
  Settings,
  CheckCircle,
  XCircle,
  Edit,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const roles = [
  {
    id: 1,
    name: "Super Admin",
    description: "Full system access with all permissions",
    users: 5,
    permissions: ["all"],
    color: "purple",
  },
  {
    id: 2,
    name: "Admin",
    description: "Administrative access to manage users and settings",
    users: 15,
    permissions: [
      "user.create",
      "user.edit",
      "user.delete",
      "role.view",
      "settings.edit",
    ],
    color: "blue",
  },
  {
    id: 3,
    name: "Manager",
    description: "Team management and reporting access",
    users: 45,
    permissions: ["user.view", "user.edit", "reports.view", "team.manage"],
    color: "green",
  },
  {
    id: 4,
    name: "Developer",
    description: "Access to development resources and APIs",
    users: 120,
    permissions: ["api.read", "api.write", "resources.view", "logs.view"],
    color: "indigo",
  },
  {
    id: 5,
    name: "User",
    description: "Basic access to core features",
    users: 315,
    permissions: ["profile.view", "profile.edit", "dashboard.view"],
    color: "gray",
  },
];

const permissions = [
  { category: "User Management", perms: ["user.view", "user.create", "user.edit", "user.delete"] },
  { category: "Role Management", perms: ["role.view", "role.create", "role.edit", "role.delete"] },
  { category: "System Settings", perms: ["settings.view", "settings.edit", "audit.view"] },
  { category: "API Access", perms: ["api.read", "api.write", "api.admin"] },
  { category: "Resources", perms: ["resources.view", "resources.create", "resources.edit", "resources.delete"] },
];

export function AccessControl() {
    const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState(roles[0]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {'Access control'}</h2>
          <p className="text-gray-600 mt-1">
            {'Manage roles and permissions'}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          {'Create role'}</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{'Total roles'}</p>
              <p className="text-2xl font-semibold text-gray-900">8</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{'Assigned users'}</p>
              <p className="text-2xl font-semibold text-gray-900">500</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{'Permissions'}</p>
              <p className="text-2xl font-semibold text-gray-900">24</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{'Active policies'}</p>
              <p className="text-2xl font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{'Roles'}</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedRole.id === role.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{role.name}</span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full bg-${role.color}-100 text-${role.color}-700`}
                    >
                      {role.users} {'Users'}</span>
                  </div>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Role Details & Permissions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Role Header */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedRole.name}
                </h3>
                <p className="text-gray-600 mt-1">{selectedRole.description}</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Edit className="w-4 h-4" />
                {'Edit role'}</button>
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {selectedRole.users} {'Assigned users'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {selectedRole.permissions.length} {'Permissions'}</span>
              </div>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{'Permissions'}</h3>
            </div>
            <div className="p-6 space-y-6">
              {permissions.map((group, index) => (
                <div key={index}>
                  <h4 className="font-medium text-gray-900 mb-3">
                    {group.category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.perms.map((perm) => {
                      const hasPermission =
                        selectedRole.permissions.includes("all") ||
                        selectedRole.permissions.includes(perm);
                      return (
                        <div
                          key={perm}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            hasPermission
                              ? "bg-green-50 border-green-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <span className="text-sm text-gray-700">{perm}</span>
                          {hasPermission ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Access Policies */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{'Access policies'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{'Session timeout'}</p>
                  <p className="text-sm text-gray-600">{'Automaticlogout'}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">{t('30minutes_31')}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{'Iprestrictions'}</p>
                  <p className="text-sm text-gray-600">{'Allowed ipranges'}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">10.0.0.0/8</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{'Timebased access'}</p>
                  <p className="text-sm text-gray-600">{'Permittedaccess'}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">24/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
