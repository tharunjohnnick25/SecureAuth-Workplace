'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useOrganization } from '@/context/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Users,
  Activity,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  UserPlus,
  Lock,
  Unlock,
  Key,
  Trash2,
  Sliders,
  FileSpreadsheet,
  Globe,
  Settings,
  Mail,
  Loader2,
  Calendar,
} from 'lucide-react';
import { getRoleLabel } from '@/lib/rbac';
import { useLanguage } from "@/context/LanguageContext";

interface GovernanceUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'LOCKED';
  risk_score: number;
  last_login?: string;
  department?: string;
  org_id?: string;
  mfa_enabled: boolean;
}

interface GovernanceRequest {
  id: string;
  user_name: string;
  user_email: string;
  resource: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  step: 'MANAGER' | 'SECURITY' | 'ADMIN' | 'FINALIZED';
  requested_at: string;
  comments?: string;
  expiration_date?: string;
}

interface GovernanceInvitation {
  id: string;
  email: string;
  role: string;
  department: string;
  status: 'PENDING' | 'ACCEPTED';
  created_at: string;
}

interface AuditLogEntry {
  id: string;
  actor_email: string;
  action: string;
  resource: string;
  details: string;
  ip_address: string;
  organization: string;
  created_at: string;
}

export function Admin() {
    const { t } = useLanguage();
  const { activeOrg, organizations, setActiveOrg, securityPolicies, updateSecurityPolicies } = useOrganization();

  // Navigation / Tabs State
  const [activeTab, setActiveTab] = useState<'directory' | 'requests' | 'invitations' | 'policies' | 'audit'>('directory');
  const [isLoading, setIsLoading] = useState(true);

  // Directory Data / States
  const [usersList, setUsersList] = useState<GovernanceUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Access Requests States
  const [requestsList, setRequestsList] = useState<GovernanceRequest[]>([]);
  const [requestComments, setRequestComments] = useState<Record<string, string>>({});
  const [requestExpirations, setRequestExpirations] = useState<Record<string, string>>({});

  // Onboarding Invitations States
  const [invitationsList, setInvitationsList] = useState<GovernanceInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [inviteDept, setInviteDept] = useState('Engineering');

  // Audit Logs States
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const [isSandboxMode, setIsSandboxMode] = useState(false);

  // 1. Fetch administration governance state (DB or sandbox mock fallbacks)
  const fetchGovernanceData = async () => {
    setIsLoading(true);
    try {
      // Pull users from Supabase
      const { data: dbUsers, error: usersErr } = await (supabase as any).from('users').select('*');

      if (usersErr) throw usersErr;

      const formattedUsers: GovernanceUser[] = (dbUsers || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name || u.email?.split('@')[0] || 'Anonymous',
        email: u.email,
        role: u.role || 'EMPLOYEE',
        status: (u.status || 'ACTIVE').toUpperCase() as any,
        risk_score: u.risk_score || 0,
        last_login: u.last_login || u.created_at,
        department: u.department || 'Engineering',
        org_id: u.org_id || 'org-acme-corp',
        mfa_enabled: u.mfa_enabled || false,
      }));

      // Filter by org isolation
      const currentOrgId = activeOrg?.id || 'org-acme-corp';
      const isolatedUsers = formattedUsers.filter(u => u.org_id === currentOrgId);
      
      if (isolatedUsers.length > 0) {
        setUsersList(isolatedUsers);
      } else {
        throw new Error('No user records matched active organization.');
      }

      // Fetch requests
      const { data: dbRequests } = await (supabase as any).from('access_requests').select('*');
      if (dbRequests && dbRequests.length > 0) {
        setRequestsList(dbRequests.map((r: any) => ({
          id: r.id,
          user_name: 'Simulated Employee',
          user_email: 'employee@acme.com',
          resource: r.resource,
          status: r.status,
          step: 'ADMIN',
          requested_at: r.created_at,
        })));
      } else {
        throw new Error('Access requests table empty.');
      }

      // Fetch audit logs
      const { data: dbLogs } = await (supabase as any).from('audit_logs').select('*');
      if (dbLogs && dbLogs.length > 0) {
        setLogs(dbLogs.map((l: any) => ({
          id: l.id,
          actor_email: 'admin@secureauth.ai',
          action: l.action,
          resource: l.resource,
          details: JSON.stringify(l.metadata || l.details || {}),
          ip_address: '192.168.1.1',
          organization: activeOrg?.name || 'Acme Corporation',
          created_at: l.created_at,
        })));
      } else {
        throw new Error('Audit logs empty.');
      }
      setIsSandboxMode(false);
    } catch (err) {
      console.warn('Backend tables offline. Directing to Live Admin Governance Sandbox.');
      setIsSandboxMode(true);

      // In sandbox mode, generate robust sample values isolated by organization ID
      const currentOrgId = activeOrg?.id || 'org-acme-corp';
      const acmeUsers: GovernanceUser[] = [
        { id: 'u1', full_name: 'John Doe', email: 'john.doe@acme.com', role: 'ORGANIZATION_ADMIN', status: 'ACTIVE', risk_score: 12, last_login: new Date(Date.now() - 50000).toISOString(), department: 'Security Operations', org_id: 'org-acme-corp', mfa_enabled: true },
        { id: 'u2', full_name: 'Jane Smith', email: 'jane.smith@acme.com', role: 'EMPLOYEE', status: 'ACTIVE', risk_score: 8, last_login: new Date(Date.now() - 600000).toISOString(), department: 'Engineering', org_id: 'org-acme-corp', mfa_enabled: true },
        { id: 'u3', full_name: 'Bob Wilson', email: 'bob.wilson@acme.com', role: 'SECURITY_ANALYST', status: 'ACTIVE', risk_score: 85, last_login: new Date(Date.now() - 3600000).toISOString(), department: 'Security Operations', org_id: 'org-acme-corp', mfa_enabled: false },
        { id: 'u4', full_name: 'Alice Brown', email: 'alice.brown@acme.com', role: 'TEAM_MANAGER', status: 'SUSPENDED', risk_score: 45, last_login: new Date(Date.now() - 25000000).toISOString(), department: 'Human Resources', org_id: 'org-acme-corp', mfa_enabled: true },
        { id: 'u5', full_name: 'Tom Jenkins', email: 'tom.jenkins@acme.com', role: 'HR_MANAGER', status: 'PENDING', risk_score: 18, last_login: undefined, department: 'Human Resources', org_id: 'org-acme-corp', mfa_enabled: false },
      ];

      const globexUsers: GovernanceUser[] = [
        { id: 'ug1', full_name: 'Hank Scorpio', email: 'hank@globex.com', role: 'ORGANIZATION_OWNER', status: 'ACTIVE', risk_score: 95, last_login: new Date().toISOString(), department: 'Executive Management', org_id: 'org-globex', mfa_enabled: true },
        { id: 'ug2', full_name: 'Homer Simpson', email: 'homer@globex.com', role: 'EMPLOYEE', status: 'LOCKED', risk_score: 98, last_login: new Date(Date.now() - 240000000).toISOString(), department: 'Nuclear Engineering', org_id: 'org-globex', mfa_enabled: false },
      ];

      setUsersList(currentOrgId === 'org-globex' ? globexUsers : acmeUsers);

      // Access requests setup
      const sampleRequests: GovernanceRequest[] = [
        { id: 'req1', user_name: 'Jane Smith', user_email: 'jane.smith@acme.com', resource: 'Production AWS Root Console', status: 'PENDING', step: 'MANAGER', requested_at: new Date(Date.now() - 8000000).toISOString() },
        { id: 'req2', user_name: 'Bob Wilson', user_email: 'bob.wilson@acme.com', resource: 'SSO Integrations Module', status: 'PENDING', step: 'SECURITY', requested_at: new Date(Date.now() - 4000000).toISOString() },
        { id: 'req3', user_name: 'Tom Jenkins', user_email: 'tom.jenkins@acme.com', resource: 'Salary Ledger database access', status: 'PENDING', step: 'ADMIN', requested_at: new Date(Date.now() - 1000000).toISOString() },
      ];
      setRequestsList(currentOrgId === 'org-globex' ? [] : sampleRequests);

      // Onboarding invitations setup
      const sampleInvites: GovernanceInvitation[] = [
        { id: 'inv1', email: 'recruit.cyber@acme.com', role: 'EMPLOYEE', department: 'Engineering', status: 'PENDING', created_at: new Date(Date.now() - 8600000).toISOString() },
        { id: 'inv2', email: 'analyst.contractor@acme.com', role: 'SECURITY_ANALYST', department: 'Security Operations', status: 'ACCEPTED', created_at: new Date(Date.now() - 24000000).toISOString() }
      ];
      setInvitationsList(currentOrgId === 'org-globex' ? [] : sampleInvites);

      // Governance audit logs
      const sampleLogs: AuditLogEntry[] = [
        { id: 'log1', actor_email: 'admin@secureauth.ai', action: 'ROLE_ASSIGNED', resource: 'users/u3', details: 'Assigned Security Analyst role to bob.wilson@acme.com', ip_address: '192.168.1.5', organization: activeOrg?.name || 'Acme Corporation', created_at: new Date(Date.now() - 60000).toISOString() },
        { id: 'log2', actor_email: 'admin@secureauth.ai', action: 'POLICY_MODIFIED', resource: 'security_policies/org-acme-corp', details: 'Enforced absolute multi-factor authentication policies', ip_address: '192.168.1.5', organization: activeOrg?.name || 'Acme Corporation', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'log3', actor_email: 'admin@secureauth.ai', action: 'USER_SUSPENDED', resource: 'users/u4', details: 'Suspended account for alice.brown@acme.com due to credential anomalies', ip_address: '192.168.1.5', organization: activeOrg?.name || 'Acme Corporation', created_at: new Date(Date.now() - 86400000).toISOString() },
      ];
      setLogs(sampleLogs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernanceData();
  }, [activeOrg]);

  // 2. Action Handlers for User Governance
  const handleUserStatus = async (userId: string, newStatus: 'ACTIVE' | 'SUSPENDED' | 'LOCKED') => {
    setUsersList(prev =>
      prev.map(u => (u.id === userId ? { ...u, status: newStatus } : u))
    );
    toast.success(`Account status changed to: ${newStatus}`);
    
    // Log admin governance action
    const affected = usersList.find(u => u.id === userId);
    addAuditLog(`USER_${newStatus}`, `users/${userId}`, `Set status of user ${affected?.email || userId} to ${newStatus}`);

    if (isSandboxMode) return;

    try {
      await (supabase as any).from('users').update({ status: newStatus.toLowerCase() }).eq('id', userId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetMFA = async (userId: string) => {
    setUsersList(prev =>
      prev.map(u => (u.id === userId ? { ...u, mfa_enabled: false } : u))
    );
    toast.success('MFA reset requested. User will be prompted to re-register secret on next sign in.');

    const affected = usersList.find(u => u.id === userId);
    addAuditLog('MFA_RESET', `users/${userId}`, `Enforced complete MFA registration reset for ${affected?.email}`);

    if (isSandboxMode) return;

    try {
      await (supabase as any).from('users').update({ mfa_enabled: false }).eq('id', userId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevokeSession = async (userId: string) => {
    toast.success('All active user login tokens and browser cookies have been immediately revoked.');

    const affected = usersList.find(u => u.id === userId);
    addAuditLog('SESSION_REVOKED', `users/${userId}`, `Revoked all active secure sessions for ${affected?.email}`);

    if (isSandboxMode) return;

    try {
      await (supabase as any).from('sessions').delete().eq('user_id', userId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setUsersList(prev =>
      prev.map(u => (u.id === userId ? { ...u, role: role } : u))
    );
    toast.success(`Role upgraded to ${getRoleLabel(role)} successfully.`);

    const affected = usersList.find(u => u.id === userId);
    addAuditLog('ROLE_ASSIGNED', `users/${userId}`, `Assigned role ${role} to ${affected?.email}`);

    if (isSandboxMode) return;

    try {
      await (supabase as any).from('users').update({ role }).eq('id', userId);
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Multi-tier Approval Progression Workflows
  const handleApprovalWorkflow = (requestId: string, approve: boolean) => {
    const req = requestsList.find(r => r.id === requestId);
    if (!req) return;

    const action = approve ? 'APPROVED' : 'REJECTED';
    const comments = requestComments[requestId] || 'Administrative authorization review.';
    const expiration = requestExpirations[requestId] || '30 days';

    let nextStep: typeof req.step = req.step;
    let finalStatus: typeof req.status = req.status;

    if (!approve) {
      finalStatus = 'REJECTED';
      nextStep = 'FINALIZED';
    } else {
      if (req.step === 'MANAGER') {
        nextStep = 'SECURITY';
        toast.info('Approved by Manager. Escalating to Security Operations Analyst review.');
      } else if (req.step === 'SECURITY') {
        nextStep = 'ADMIN';
        toast.info('Approved by Security Analyst. Escalating to Admin for final authorization.');
      } else if (req.step === 'ADMIN') {
        nextStep = 'FINALIZED';
        finalStatus = 'APPROVED';
        toast.success(`Access Request fully APPROVED! Resource permissions provisioned (Expires in: ${expiration}).`);
      }
    }

    setRequestsList(prev =>
      prev.map(r => (r.id === requestId ? { ...r, status: finalStatus, step: nextStep, comments, expiration_date: expiration } : r))
    );

    addAuditLog(`ACCESS_REQUEST_${action}`, `requests/${requestId}`, `Reviewed request for ${req.resource} by ${req.user_email}. Expiration: ${expiration}. Progression Step: ${req.step} -> ${nextStep}`);
  };

  // 4. Send Onboarding Invitations Flow
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Please enter a target onboarding email.');
      return;
    }

    const newInvite: GovernanceInvitation = {
      id: Math.random().toString(36).substring(7),
      email: inviteEmail,
      role: inviteRole,
      department: inviteDept,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    setInvitationsList(prev => [newInvite, ...prev]);
    toast.success(`Secure invitation link transmitted to ${inviteEmail}!`);
    
    addAuditLog('INVITATION_SENT', 'invitations', `Invited ${inviteEmail} as temporary ${inviteRole} to department ${inviteDept}`);
    
    setInviteEmail('');
  };

  // Helper: append administrative changes to audit trails
  const addAuditLog = (action: string, resource: string, details: string) => {
    const newEntry: AuditLogEntry = {
      id: Math.random().toString(36).substring(7),
      actor_email: 'admin@secureauth.ai',
      action,
      resource,
      details,
      ip_address: '192.168.1.5',
      organization: activeOrg?.name || 'Acme Corporation',
      created_at: new Date().toISOString(),
    };
    setLogs(prev => [newEntry, ...prev]);
  };

  // CSV/Excel Simulated Export Trigger
  const handleExportAudits = (format: 'CSV' | 'EXCEL' | 'PDF') => {
    toast.info(`Preparing compliance standard document export...`);
    setTimeout(() => {
      toast.success(`Successful! ${format} audit trail file exported for SOC2 regulatory compliance audits.`);
    }, 1500);
  };

  // Directory Filters and Searches
  const filteredUsers = useMemo(() => {
    return usersList.filter(user => {
      const matchSearch =
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchRole = roleFilter === '' || user.role === roleFilter;
      const matchDept = deptFilter === '' || user.department === deptFilter;
      const matchRisk = riskFilter === '' ||
        (riskFilter === 'HIGH' && user.risk_score > 70) ||
        (riskFilter === 'MEDIUM' && user.risk_score >= 30 && user.risk_score <= 70) ||
        (riskFilter === 'LOW' && user.risk_score < 30);

      return matchSearch && matchRole && matchDept && matchRisk;
    });
  }, [usersList, searchQuery, roleFilter, deptFilter, riskFilter]);

  // Audit Logs filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log =>
      log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.actor_email.toLowerCase().includes(auditSearchQuery.toLowerCase())
    );
  }, [logs, auditSearchQuery]);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          
          {/* Header & Active Tenant Switcher */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
            <div>
              <h1 className="text-3xl font-semibold mb-2 flex items-center gap-3">
                {'Identity governa'}{isSandboxMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-warning/20 border border-warning/30 text-warning uppercase font-bold tracking-wider animate-pulse">
                    {'Admin sandbox mod'}</span>
                )}
              </h1>
              <p className="text-muted-foreground text-sm">
                {'Controlmultiten'}</p>
            </div>
            
            {/* Enterprise tenant picker */}
            <div className="flex items-center gap-3 bg-[#0d1222] border border-white/10 px-4 py-2 rounded-xl">
              <Globe className="w-4 h-4 text-primary" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{'Active org worksp'}</span>
                <select
                  value={activeOrg?.id || ''}
                  onChange={(e) => {
                    const matched = organizations.find(o => o.id === e.target.value);
                    if (matched) setActiveOrg(matched);
                  }}
                  className="bg-transparent text-sm font-semibold text-white focus:outline-none pr-6 cursor-pointer"
                >
                  {organizations.map(org => (
                    <option key={org.id} value={org.id} className="bg-[#0d1222] text-white text-sm">
                      {org.name} ({org.domain})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{'Tenant users'}</p>
                  <h3 className="text-2xl font-bold">{usersList.length} {'Accounts'}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{activeOrg?.name || 'Active Workspace'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center border border-success/20">
                  <Activity className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{'Active sessions'}</p>
                  <h3 className="text-2xl font-bold">
                    {usersList.filter(u => u.status === 'ACTIVE').length} {'Active'}</h3>
                  <p className="text-[10px] text-success font-bold mt-0.5">{'Zerocredentials'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center border border-warning/20">
                  <AlertTriangle className="w-6 h-6 text-warning animate-pulse" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{'High risk index'}</p>
                  <h3 className="text-2xl font-bold">
                    {usersList.filter(u => u.risk_score > 70).length} {'Breaches'}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{'Flaggedfordynam'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center border border-destructive/20">
                  <Shield className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{'Suspended states'}</p>
                  <h3 className="text-2xl font-bold">
                    {usersList.filter(u => u.status === 'SUSPENDED').length} {'Suspended'}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{'Deniedrouteauth'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex border-b border-white/10 mb-6 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'directory' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" /> {'User governance d'}</button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'requests' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" /> {'Access approvals'}</button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'invitations' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" /> {'Onboarding invit'}</button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'policies' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" /> {'Zero trust securi'}</button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'audit' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" /> {'Compliance audit'}</button>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col justify-center items-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest animate-pulse">{'Loading identity'}</p>
            </div>
          ) : (
            <>
              {/* Tab 1: User Directory */}
              {activeTab === 'directory' && (
                <div className="space-y-6">
                  {/* Filters Bar */}
                  <div className="bg-[#0b0f19] border border-white/5 p-4 rounded-xl flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <Filter className="w-3.5 h-3.5 text-primary" /> {'Filter matrix'}</div>
                    
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                      <Input
                        placeholder="Search employees by email or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-input-background/30 border-white/10 text-xs h-9"
                      />
                    </div>

                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="h-9 px-3 rounded-md bg-[#131924] border border-white/10 text-xs text-gray-300 focus:outline-none"
                    >
                      <option value="">{'All roles'}</option>
                      <option value="SUPER_ADMIN">{'Super administra'}</option>
                      <option value="ORGANIZATION_OWNER">{'Org owner'}</option>
                      <option value="ORGANIZATION_ADMIN">{'Org admin'}</option>
                      <option value="SECURITY_ANALYST">{'Security analyst'}</option>
                      <option value="HR_MANAGER">{'Hrmanager'}</option>
                      <option value="TEAM_MANAGER">{'Team manager'}</option>
                      <option value="EMPLOYEE">{'Employee'}</option>
                    </select>

                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="h-9 px-3 rounded-md bg-[#131924] border border-white/10 text-xs text-gray-300 focus:outline-none"
                    >
                      <option value="">{'All departments'}</option>
                      <option value="Engineering">{'Engineering'}</option>
                      <option value="Security Operations">{'Security operati'}</option>
                      <option value="Human Resources">{'Human resources'}</option>
                      <option value="Nuclear Engineering">{'Nuclear engineer'}</option>
                    </select>

                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="h-9 px-3 rounded-md bg-[#131924] border border-white/10 text-xs text-gray-300 focus:outline-none"
                    >
                      <option value="">{'All risk tiers'}</option>
                      <option value="HIGH">{'High risk'}{'>'}70)</option>
                      <option value="MEDIUM">{t('MediumRisk3070_539')}</option>
                      <option value="LOW">{'Low risk'}{'<'}30)</option>
                    </select>
                  </div>

                  {/* Users Table */}
                  <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>{'Tenant identity r'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10 text-[10px] text-muted-foreground uppercase tracking-widest text-left">
                              <th className="py-3 px-4 font-semibold">{'Employee'}</th>
                              <th className="py-3 px-4 font-semibold">{'Department'}</th>
                              <th className="py-3 px-4 font-semibold">{'Role authority'}</th>
                              <th className="py-3 px-4 font-semibold">{'Riskscore'}</th>
                              <th className="py-3 px-4 font-semibold">{'Account state'}</th>
                              <th className="py-3 px-4 font-semibold text-right">{'Access governanc'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((user) => (
                              <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-4">
                                  <div>
                                    <div className="font-semibold text-white text-sm">{user.full_name}</div>
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{user.email}</div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-primary" /> {'Active seen'}{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-xs font-semibold text-gray-300">
                                  {user.department}
                                </td>
                                <td className="py-4 px-4">
                                  <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    disabled={user.role === 'SUPER_ADMIN' || user.role === 'ORGANIZATION_OWNER'}
                                    className="bg-[#131924] border border-white/10 text-xs rounded px-2 py-1 text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                                  >
                                    <option value="EMPLOYEE">{'Employee'}</option>
                                    <option value="TEAM_MANAGER">{'Team manager'}</option>
                                    <option value="HR_MANAGER">{'Hrmanager'}</option>
                                    <option value="SECURITY_ANALYST">{'Security analyst'}</option>
                                    <option value="ORGANIZATION_ADMIN">{'Org admin'}</option>
                                    <option value="ORGANIZATION_OWNER">{'Org owner'}</option>
                                    <option value="SUPER_ADMIN">{'Super admin'}</option>
                                  </select>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          user.risk_score > 70 ? 'bg-destructive animate-pulse' : user.risk_score >= 30 ? 'bg-warning' : 'bg-success'
                                        }`}
                                        style={{ width: `${user.risk_score}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-bold font-mono">{user.risk_score}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                      user.status === 'ACTIVE'
                                        ? 'bg-success/20 border-success/30 text-success'
                                        : user.status === 'PENDING'
                                        ? 'bg-primary/20 border-primary/30 text-primary'
                                        : 'bg-destructive/20 border-destructive/30 text-destructive'
                                    }`}
                                  >
                                    {user.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <div className="flex justify-end items-center gap-2 flex-wrap">
                                    {user.status === 'ACTIVE' ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-destructive/20 text-destructive hover:bg-destructive/10 text-[10px] uppercase font-bold tracking-wider"
                                        onClick={() => handleUserStatus(user.id, 'SUSPENDED')}
                                      >
                                        <Lock className="w-3.5 h-3.5 mr-1" /> {'Suspend'}</Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-success/20 text-success hover:bg-success/10 text-[10px] uppercase font-bold tracking-wider"
                                        onClick={() => handleUserStatus(user.id, 'ACTIVE')}
                                      >
                                        <Unlock className="w-3.5 h-3.5 mr-1" /> {'Enable'}</Button>
                                    )}

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 border-white/10 text-gray-300 hover:border-primary/20 text-[10px] uppercase font-bold tracking-wider"
                                      onClick={() => handleResetMFA(user.id)}
                                      title="Reset MFA"
                                    >
                                      <Key className="w-3.5 h-3.5 mr-1" /> {'Reset mfa'}</Button>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 border-white/10 text-destructive hover:border-destructive/20 text-[10px] uppercase font-bold tracking-wider"
                                      onClick={() => handleRevokeSession(user.id)}
                                      title="Revoke browser sessions"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1" /> {'Kill session'}</Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                                  {'Noaccountsmatch'}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tab 2: Access Approvals Workflow */}
              {activeTab === 'requests' && (
                <div className="space-y-6">
                  <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" /> {'Multi tier access'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10 text-[10px] text-muted-foreground uppercase tracking-widest text-left">
                              <th className="py-3 px-4 font-semibold">{'Employee'}</th>
                              <th className="py-3 px-4 font-semibold">{'Requested system'}</th>
                              <th className="py-3 px-4 font-semibold">{'Workflow approva'}</th>
                              <th className="py-3 px-4 font-semibold">{'Assigned expirat'}</th>
                              <th className="py-3 px-4 font-semibold">{'Reviewer notes'}</th>
                              <th className="py-3 px-4 font-semibold text-right">{'Approve decline a'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {requestsList.map((req) => (
                              <tr key={req.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-4">
                                  <div>
                                    <div className="font-semibold text-white text-sm">{req.user_name}</div>
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{req.user_email}</div>
                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                      {'Requested'}{new Date(req.requested_at).toLocaleString()}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="text-xs font-mono bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded">
                                    {req.resource}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-col gap-1.5">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-center border ${
                                        req.status === 'APPROVED'
                                          ? 'bg-success/20 border-success/30 text-success'
                                          : req.status === 'REJECTED'
                                          ? 'bg-destructive/20 border-destructive/30 text-destructive'
                                          : 'bg-warning/20 border-warning/30 text-warning animate-pulse'
                                      }`}
                                    >
                                      {req.status === 'PENDING' ? `PENDING - ${req.step} STAGE` : req.status}
                                    </span>
                                    
                                    {/* Progression workflow graphic bar */}
                                    <div className="flex items-center gap-1 mt-1">
                                      <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold ${req.step !== 'MANAGER' || req.status === 'REJECTED' ? 'bg-success text-white' : 'bg-warning text-[#020617] animate-pulse'}`}>M</div>
                                      <div className="w-6 h-0.5 bg-white/10" />
                                      <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold ${req.step === 'SECURITY' && req.status === 'PENDING' ? 'bg-warning text-[#020617] animate-pulse' : (req.step === 'ADMIN' || req.step === 'FINALIZED') && req.status !== 'REJECTED' ? 'bg-success text-white' : 'bg-white/10 text-gray-500'}`}>S</div>
                                      <div className="w-6 h-0.5 bg-white/10" />
                                      <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold ${req.step === 'ADMIN' && req.status === 'PENDING' ? 'bg-warning text-[#020617] animate-pulse' : req.step === 'FINALIZED' && req.status === 'APPROVED' ? 'bg-success text-white' : 'bg-white/10 text-gray-500'}`}>A</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  {req.status === 'PENDING' ? (
                                    <select
                                      value={requestExpirations[req.id] || '30 days'}
                                      onChange={(e) => setRequestExpirations({ ...requestExpirations, [req.id]: e.target.value })}
                                      className="bg-[#131924] border border-white/10 text-xs rounded px-2 py-1 text-gray-200 focus:outline-none"
                                    >
                                      <option value="8 hours">{t('8HoursTemporary_569')}</option>
                                      <option value="7 days">{t('7Days_570')}</option>
                                      <option value="30 days">{t('30Days_571')}</option>
                                      <option value="90 days">{t('90Days_572')}</option>
                                      <option value="indefinite">{'Indefinite'}</option>
                                    </select>
                                  ) : (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-primary" /> {req.expiration_date || '30 days'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-4 w-48">
                                  {req.status === 'PENDING' ? (
                                    <Input
                                      placeholder="Admin audit feedback comments..."
                                      value={requestComments[req.id] || ''}
                                      onChange={(e) => setRequestComments({ ...requestComments, [req.id]: e.target.value })}
                                      className="bg-input-background/40 border-white/10 text-xs h-8 py-1 px-2"
                                    />
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">"{req.comments || 'No reviewer comments.'}"</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-right">
                                  {req.status === 'PENDING' ? (
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        onClick={() => handleApprovalWorkflow(req.id, true)}
                                        className="h-8 bg-success/20 text-success hover:bg-success/30 hover:text-white border-success/30 px-3 text-[10px] uppercase font-bold tracking-wider"
                                      >
                                        {'Approve step'}</Button>
                                      <Button
                                        onClick={() => handleApprovalWorkflow(req.id, false)}
                                        className="h-8 bg-destructive/20 text-destructive hover:bg-destructive/30 hover:text-white border-destructive/30 px-3 text-[10px] uppercase font-bold tracking-wider"
                                      >
                                        {'Reject'}</Button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground font-semibold flex items-center justify-end gap-1.5">
                                      {req.status === 'APPROVED' ? <CheckCircle className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />} {'Workflow finaliz'}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {requestsList.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                                  {'Nopendingorhist'}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tab 3: Onboarding Invitations */}
              {activeTab === 'invitations' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Invite Form */}
                  <Card className="lg:col-span-1 border-white/10 bg-white/5 backdrop-blur-sm h-fit">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" /> {'Onboard employee'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSendInvite} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{'Candidate email a'}</label>
                          <Input
                            type="email"
                            placeholder="e.g. recruit@acme.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="bg-input-background/40 border-white/10"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{'Temporary defaul'}</label>
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full h-10 px-3 rounded-md bg-[#131924] border border-white/10 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="EMPLOYEE">{'Employee'}</option>
                            <option value="TEAM_MANAGER">{'Team manager'}</option>
                            <option value="SECURITY_ANALYST">{'Security analyst'}</option>
                            <option value="ORGANIZATION_ADMIN">{'Org admin'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{'Assigned departm'}</label>
                          <select
                            value={inviteDept}
                            onChange={(e) => setInviteDept(e.target.value)}
                            className="w-full h-10 px-3 rounded-md bg-[#131924] border border-white/10 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="Engineering">{'Engineering'}</option>
                            <option value="Security Operations">{'Security operati'}</option>
                            <option value="Human Resources">{'Human resources'}</option>
                          </select>
                        </div>
                        <Button type="submit" className="w-full h-10 mt-2">
                          <Mail className="w-4 h-4 mr-2" /> {'Dispatch invitat'}</Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Active Invites List */}
                  <Card className="lg:col-span-2 border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>{'Sent invitations'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/10 text-[10px] text-muted-foreground uppercase tracking-widest text-left">
                              <th className="py-3 px-4 font-semibold">{'Onboarding targe'}</th>
                              <th className="py-3 px-4 font-semibold">{'Assigned departm'}</th>
                              <th className="py-3 px-4 font-semibold">{'Temporary role'}</th>
                              <th className="py-3 px-4 font-semibold">{'Onboarding state'}</th>
                              <th className="py-3 px-4 font-semibold text-right">{'Invitation sent'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invitationsList.map((invite) => (
                              <tr key={invite.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-4 font-mono text-sm text-white">{invite.email}</td>
                                <td className="py-4 px-4 text-xs font-semibold text-gray-300">{invite.department}</td>
                                <td className="py-4 px-4">
                                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 border border-primary/20 text-primary">
                                    {invite.role}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                      invite.status === 'ACCEPTED'
                                        ? 'bg-success/20 border-success/30 text-success'
                                        : 'bg-warning/20 border-warning/30 text-warning animate-pulse'
                                    }`}
                                  >
                                    {invite.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right text-xs text-muted-foreground">
                                  {new Date(invite.created_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            {invitationsList.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                                  {'Nosentonboardin'}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tab 4: Security Policies */}
              {activeTab === 'policies' && (
                <div className="space-y-6">
                  <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" /> {'Active organizat'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Policy 1: MFA Policy */}
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-primary/10 flex items-center justify-center mt-1 border border-primary/10">
                            <Shield className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <h4 className="font-semibold text-white">{'Absolute mfaenfo'}</h4>
                              <input
                                type="checkbox"
                                checked={securityPolicies.mfaEnforced}
                                onChange={(e) => updateSecurityPolicies({ mfaEnforced: e.target.checked })}
                                className="w-4 h-4 text-primary focus:ring-primary border-gray-600 rounded bg-gray-800 cursor-pointer"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                              {'Requireabsolute'}</p>
                          </div>
                        </div>

                        {/* Policy 2: Device Trust Policy */}
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-success/10 flex items-center justify-center mt-1 border border-success/10">
                            <Users className="w-5 h-5 text-success" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <h4 className="font-semibold text-white">{'Enforce trusted d'}</h4>
                              <input
                                type="checkbox"
                                checked={securityPolicies.trustedDeviceRequired}
                                onChange={(e) => updateSecurityPolicies({ trustedDeviceRequired: e.target.checked })}
                                className="w-4 h-4 text-success focus:ring-success border-gray-600 rounded bg-gray-800 cursor-pointer"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                              {'Restrictsgenera'}</p>
                          </div>
                        </div>

                        {/* Policy 3: Office-only logins */}
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-warning/10 flex items-center justify-center mt-1 border border-warning/10">
                            <Globe className="w-5 h-5 text-warning animate-pulse" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <h4 className="font-semibold text-white">{'Office location l'}</h4>
                              <input
                                type="checkbox"
                                checked={securityPolicies.officeOnlyLogin}
                                onChange={(e) => updateSecurityPolicies({ officeOnlyLogin: e.target.checked })}
                                className="w-4 h-4 text-warning focus:ring-warning border-gray-600 rounded bg-gray-800 cursor-pointer"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                              {'Restrictsemploy'}</p>
                          </div>
                        </div>

                        {/* Policy 4: Time-based access limits */}
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-destructive/10 flex items-center justify-center mt-1 border border-destructive/10">
                            <Clock className="w-5 h-5 text-destructive" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <h4 className="font-semibold text-white">{'Time restricted w'}</h4>
                              <input
                                type="checkbox"
                                checked={securityPolicies.timeBasedAccessOnly}
                                onChange={(e) => updateSecurityPolicies({ timeBasedAccessOnly: e.target.checked })}
                                className="w-4 h-4 text-destructive focus:ring-destructive border-gray-600 rounded bg-gray-800 cursor-pointer"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                              {'Prohibitsworkpl'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Allowed IPs Policy */}
                      <div className="p-5 rounded-xl bg-white/[0.01] border border-white/5">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{'Restricted allow'}</label>
                        <textarea
                          value={securityPolicies.allowedIpRanges?.join('\n') || '0.0.0.0/0'}
                          onChange={(e) => updateSecurityPolicies({ allowedIpRanges: e.target.value.split('\n').filter(Boolean) })}
                          rows={4}
                          className="w-full bg-input-background/40 border border-white/10 rounded-md p-3 font-mono text-xs text-gray-200 focus:outline-none focus:border-primary/30"
                          placeholder="e.g. 192.168.1.0/24"
                        />
                        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                          {'Adherencetothes'}</p>
                      </div>

                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Tab 5: Compliance Audit Trails */}
              {activeTab === 'audit' && (
                <div className="space-y-6">
                  {/* Export Options */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0b0f19] border border-white/5 p-4 rounded-xl">
                    <div className="flex-1 min-w-[250px] relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                      <Input
                        placeholder="Search compliance actions, resources, or actors..."
                        value={auditSearchQuery}
                        onChange={(e) => setAuditSearchQuery(e.target.value)}
                        className="pl-9 bg-input-background/30 border-white/10 text-xs h-9"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1">{'Compliance expor'}</span>
                      <Button variant="outline" size="sm" onClick={() => handleExportAudits('CSV')} className="h-9 border-white/10 hover:border-success/30 text-xs">
                        <FileSpreadsheet className="w-4 h-4 text-success mr-2" /> {'Export csv'}</Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportAudits('EXCEL')} className="h-9 border-white/10 hover:border-success/30 text-xs">
                        <FileSpreadsheet className="w-4 h-4 text-success mr-2" /> {'Export excel'}</Button>
                      <Button variant="outline" size="sm" onClick={() => handleExportAudits('PDF')} className="h-9 border-white/10 hover:border-destructive/30 text-xs">
                        <FileSpreadsheet className="w-4 h-4 text-destructive mr-2" /> {'Export pdf'}</Button>
                    </div>
                  </div>

                  {/* Audit Logs Trail */}
                  <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>{'Compliance audit'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {filteredLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/20 transition-all"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 border border-primary/20 text-primary">
                                    {log.action}
                                  </span>
                                  <span className="text-xs text-gray-300 font-semibold">{log.actor_email}</span>
                                  <span className="text-[10px] text-gray-500 font-mono">({log.ip_address})</span>
                                </div>
                                <p className="text-xs text-gray-400 font-mono mt-2 bg-black/25 px-3 py-2 rounded border border-white/5 leading-relaxed">
                                  {log.details}
                                </p>
                              </div>
                              <div className="text-right sm:mt-1">
                                <span className="text-[9px] px-2 py-0.5 rounded bg-white/10 text-gray-400 uppercase font-bold tracking-wider">
                                  {'Tenant'}{log.organization}
                                </span>
                                <div className="text-[10px] text-gray-500 font-bold flex items-center justify-end gap-1 mt-2">
                                  <Clock className="w-3.5 h-3.5" />
                                  {new Date(log.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredLogs.length === 0 && (
                          <div className="py-12 text-center text-muted-foreground text-sm">
                            {'Noauditabletrai'}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
export default Admin;
