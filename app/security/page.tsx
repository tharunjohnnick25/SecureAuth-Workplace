'use client';

import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { OfficeLoginsTab } from '@/components/security/OfficeLoginsTab';
import { RiskDashboard } from '@/components/pages/RiskDashboard';
import { DeviceFingerprintingTab } from '@/components/security/DeviceFingerprintingTab';
import { ThreatIntelTab } from '@/components/security/ThreatIntelTab';
import { SecurityCenterTab } from '@/components/security/SecurityCenterTab';
import { GlobalSearch } from '@/components/SearchCommand';

export default function UnifiedSecurityDashboard() {
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        
        {/* Main Dashboard Content */}
        <main className="pt-24 p-4 sm:p-6 lg:p-8 space-y-16 pb-32 overflow-x-hidden">
          
          <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Security Hub</h1>
              <p className="text-gray-400">Comprehensive real-time view of your enterprise's physical and digital security posture.</p>
            </div>
            <div className="w-full md:w-auto md:min-w-[300px]">
              <GlobalSearch />
            </div>
          </div>

          <section id="security-center">
             <SecurityCenterTab />
          </section>
          
          <section id="office-logins">
             <OfficeLoginsTab />
          </section>

          <section id="ai-risk">
             <RiskDashboard hideLayout={true} />
          </section>

          <section id="devices">
             <DeviceFingerprintingTab />
          </section>

          <section id="threat-intel">
             <ThreatIntelTab />
          </section>

        </main>
      </div>
    </div>
  );
}
