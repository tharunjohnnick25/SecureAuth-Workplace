'use client';

import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { AnalyticsTab } from '@/components/system-management/AnalyticsTab';
import { AuditLogsTab } from '@/components/system-management/AuditLogsTab';
import { AttendanceReportsTab } from '@/components/system-management/AttendanceReportsTab';
import { GlobalSearch } from '@/components/SearchCommand';

export default function SystemManagementDashboard() {
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        {/* Main Dashboard Content */}
        <main className="pt-24 p-4 sm:p-6 lg:p-8 space-y-16 pb-32 overflow-x-hidden">
          
          <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">System Management</h1>
              <p className="text-gray-400">Comprehensive overview of attendance reports, audit logs, and core system analytics.</p>
            </div>
            <div className="w-full md:w-auto md:min-w-[300px]">
              <GlobalSearch />
            </div>
          </div>

          <section id="analytics">
             <AnalyticsTab hideLayout={true} />
          </section>

          <section id="attendance-reports">
             <AttendanceReportsTab hideLayout={true} />
          </section>
          
          <section id="audit-logs">
             <AuditLogsTab hideLayout={true} />
          </section>

        </main>
      </div>
    </div>
  );
}
