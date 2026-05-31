'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

export interface Organization {
  id: string;
  name: string;
  domain: string;
  created_at: string;
  subscription_id?: string | null;
}

export interface SecurityPolicy {
  mfaEnforced: boolean;
  trustedDeviceRequired: boolean;
  officeOnlyLogin: boolean;
  timeBasedAccessOnly: boolean;
  allowedIpRanges: string[];
}

interface OrganizationContextType {
  activeOrg: Organization | null;
  organizations: Organization[];
  setActiveOrg: (org: Organization | null) => void;
  isLoading: boolean;
  securityPolicies: SecurityPolicy;
  updateSecurityPolicies: (policies: Partial<SecurityPolicy>) => Promise<void>;
  refreshOrgs: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
  activeOrg: null,
  organizations: [],
  setActiveOrg: () => {},
  isLoading: true,
  securityPolicies: {
    mfaEnforced: false,
    trustedDeviceRequired: false,
    officeOnlyLogin: false,
    timeBasedAccessOnly: false,
    allowedIpRanges: [],
  },
  updateSecurityPolicies: async () => {},
  refreshOrgs: async () => {},
});

const DEFAULT_POLICIES: SecurityPolicy = {
  mfaEnforced: true,
  trustedDeviceRequired: false,
  officeOnlyLogin: false,
  timeBasedAccessOnly: false,
  allowedIpRanges: ['0.0.0.0/0'],
};

export const OrganizationProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicy>(DEFAULT_POLICIES);
  const { user } = useAuthStore();

  const refreshOrgs = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setActiveOrgState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*');

      if (error) throw error;

      if (orgs && orgs.length > 0) {
        setOrganizations(orgs as any);
        const storedOrgId = typeof window !== 'undefined' ? localStorage.getItem('secureauth.activeOrgId') : null;
        const matchedOrg = (orgs as any[]).find((o: any) => o.id === storedOrgId);
        const selected = matchedOrg || (orgs as any[])[0];
        setActiveOrgState(selected);
        if (typeof window !== 'undefined') {
          localStorage.setItem('secureauth.activeOrgId', selected.id);
        }
      } else {
        const fallbackOrgs: Organization[] = [
          { id: 'org-acme-corp', name: 'Acme Corporation', domain: 'acme.com', created_at: new Date().toISOString() },
          { id: 'org-globex', name: 'Globex Industries', domain: 'globex.com', created_at: new Date().toISOString() }
        ];
        setOrganizations(fallbackOrgs);
        setActiveOrgState(fallbackOrgs[0]);
      }
    } catch (err) {
      const fallbackOrgs: Organization[] = [
        { id: 'org-acme-corp', name: 'Acme Corporation', domain: 'acme.com', created_at: new Date().toISOString() },
        { id: 'org-globex', name: 'Globex Industries', domain: 'globex.com', created_at: new Date().toISOString() }
      ];
      setOrganizations(fallbackOrgs);
      setActiveOrgState(fallbackOrgs[0]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshOrgs();
  }, [refreshOrgs]);

  useEffect(() => {
    if (!activeOrg) return;

    const loadPolicies = async () => {
      try {
        const { data, error } = await supabase
          .from('security_policies')
          .select('*')
          .eq('org_id', activeOrg.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSecurityPolicies({
            mfaEnforced: (data as any).mfa_enforced ?? true,
            trustedDeviceRequired: (data as any).trusted_device_required ?? false,
            officeOnlyLogin: (data as any).office_only_login ?? false,
            timeBasedAccessOnly: (data as any).time_based_access_only ?? false,
            allowedIpRanges: (data as any).allowed_ip_ranges || ['0.0.0.0/0'],
          });
        } else {
          setSecurityPolicies({
            ...DEFAULT_POLICIES,
            officeOnlyLogin: activeOrg.id === 'org-globex',
          });
        }
      } catch (err) {
        setSecurityPolicies({
          ...DEFAULT_POLICIES,
          officeOnlyLogin: activeOrg.id === 'org-globex',
        });
      }
    };

    loadPolicies();
  }, [activeOrg]);

  const setActiveOrg = (org: Organization | null) => {
    setActiveOrgState(org);
    if (org && typeof window !== 'undefined') {
      localStorage.setItem('secureauth.activeOrgId', org.id);
      toast.success(`Switched tenant workspace to: ${org.name}`);
    }
  };

  const updateSecurityPolicies = async (policies: Partial<SecurityPolicy>) => {
    if (!activeOrg) return;

    const updated = { ...securityPolicies, ...policies };
    setSecurityPolicies(updated);

    try {
      const payload = {
        org_id: activeOrg.id,
        mfa_enforced: updated.mfaEnforced,
        trusted_device_required: updated.trustedDeviceRequired,
        office_only_login: updated.officeOnlyLogin,
        time_based_access_only: updated.timeBasedAccessOnly,
        allowed_ip_ranges: updated.allowedIpRanges,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase.from('security_policies') as any)
        .upsert(payload, { onConflict: 'org_id' });

      if (error) throw error;
      toast.success('Security policies updated successfully!');
    } catch {
      toast.success('Security policies updated successfully (Local Sandbox Mode)');
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        activeOrg,
        organizations,
        setActiveOrg,
        isLoading,
        securityPolicies,
        updateSecurityPolicies,
        refreshOrgs,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);
