'use client';

import { useState } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  Shield,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const users = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@enterprise.com",
    role: "Admin",
    department: "IT Security",
    status: "active",
    mfaEnabled: true,
    lastLogin: "2 hours ago",
    createdAt: "Jan 15, 2025",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@enterprise.com",
    role: "Manager",
    department: "Operations",
    status: "active",
    mfaEnabled: true,
    lastLogin: "5 minutes ago",
    createdAt: "Feb 3, 2025",
  },
  {
    id: 3,
    name: "Bob Wilson",
    email: "bob.wilson@enterprise.com",
    role: "Developer",
    department: "Engineering",
    status: "active",
    mfaEnabled: false,
    lastLogin: "1 day ago",
    createdAt: "Dec 10, 2024",
  },
  {
    id: 4,
    name: "Alice Johnson",
    email: "alice.johnson@enterprise.com",
    role: "Developer",
    department: "Engineering",
    status: "active",
    mfaEnabled: true,
    lastLogin: "3 hours ago",
    createdAt: "Jan 22, 2025",
  },
  {
    id: 5,
    name: "Charlie Brown",
    email: "charlie.brown@enterprise.com",
    role: "User",
    department: "Sales",
    status: "inactive",
    mfaEnabled: false,
    lastLogin: "2 weeks ago",
    createdAt: "Nov 5, 2024",
  },
  {
    id: 6,
    name: "Diana Prince",
    email: "diana.prince@enterprise.com",
    role: "Manager",
    department: "Marketing",
    status: "active",
    mfaEnabled: true,
    lastLogin: "1 hour ago",
    createdAt: "Jan 8, 2025",
  },
];

export function Users() {
    const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{'User management'}</h2>
          <p className="text-gray-600 mt-1">
            {'Manageuseraccou'}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <UserPlus className="w-5 h-5" />
          {'Add user'}</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">{'Total users'}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">500</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">{'Active users'}</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">476</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">{'Inactive users'}</p>
          <p className="text-2xl font-semibold text-amber-600 mt-1">24</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">{'Mfaenabled'}</p>
          <p className="text-2xl font-semibold text-purple-600 mt-1">94%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{'All roles'}</option>
            <option value="Admin">{'Admin'}</option>
            <option value="Manager">{'Manager'}</option>
            <option value="Developer">{'Developer'}</option>
            <option value="User">{'User'}</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">
                  {'User'}</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">
                  {'Role'}</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">
                  {'Department'}</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">
                  {'Status'}</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">
                  {'Mfa'}</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">
                  {'Last login'}</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">
                  {'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === "Admin"
                          ? "bg-purple-100 text-purple-700"
                          : user.role === "Manager"
                          ? "bg-blue-100 text-blue-700"
                          : user.role === "Developer"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {user.department}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.status === "active" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span
                        className={`text-sm ${
                          user.status === "active"
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.mfaEnabled ? (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">{'Enabled'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">{'Disabled'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
