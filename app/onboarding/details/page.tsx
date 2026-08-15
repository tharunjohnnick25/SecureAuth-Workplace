'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, UserRound, Phone, Building2, Briefcase, CalendarDays, Cake, UserCog, UsersRound, ShieldCheck, Lock } from 'lucide-react';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'ADMIN']);

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function CompleteDetailsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user, setUser } = useAuthStore();

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    department: '',
    designation: '',
    employment_type: '',
    date_of_joining: '',
    date_of_birth: '',
    gender: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    const role = (user.role || '').toUpperCase();
    if (ADMIN_ROLES.has(role)) {
      router.replace('/dashboard');
      return;
    }
    if (user.profile_completed === true) {
      router.replace('/dashboard');
      return;
    }
    // Sync the form from the persisted session (runs once on mount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((prev) => ({
      ...prev,
      full_name: user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || '',
      phone: user.phone || '',
      department: user.department || '',
      designation: user.designation || '',
      employment_type: user.employment_type || '',
      date_of_joining: user.date_of_joining || '',
      date_of_birth: user.date_of_birth || '',
      gender: user.gender || '',
      emergency_contact_name: user.emergency_contact_name || '',
      emergency_contact_phone: user.emergency_contact_phone || '',
    }));
  }, [user, router]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields: Record<string, string> = {
      full_name: 'Full name',
      phone: 'Phone number',
      department: 'Department',
      designation: 'Job title',
      employment_type: 'Employment type',
      date_of_joining: 'Date of joining',
      date_of_birth: 'Date of birth',
      gender: 'Gender',
      emergency_contact_name: 'Emergency contact name',
      emergency_contact_phone: 'Emergency contact phone',
    };

    for (const [key, label] of Object.entries(requiredFields)) {
      if (!form[key as keyof typeof form]?.trim()) {
        toast.error(`${label} is required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, details: form }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to save your details');
      }

      setUser(result.user);
      toast.success('Details saved successfully!');
      if (result.user?.role === 'MANAGER') {
        router.push('/manager/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save your details';
      toast.error(message);
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a16]">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors';
  const selectClass =
    'w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-8 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer';

  const field = (icon: React.ReactNode, label: string, children: React.ReactNode, span2 = false) => (
    <div className={span2 ? 'md:col-span-2' : ''}>
      <label className="block mb-2 text-sm text-gray-300">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10 bg-[#0a0a16]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-2xl relative z-10 p-8 border border-white/10 bg-[#0a0a16]/80 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center mb-4 border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
            <UserRound className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-white">{t('CompleteYourDetails')}</h1>
          <p className="text-gray-400 text-center text-sm max-w-sm">
            {t('CompleteYourDetailsDesc')}
          </p>
          <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Lock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-300 font-semibold">{t('MandatoryStep')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-cyan-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserCog className="w-4 h-4" /> {t('PersonalInfo')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {field(<UserRound className="w-4 h-4" />, `${t('fullName')} *`, (
                <input type="text" value={form.full_name} onChange={update('full_name')} placeholder="e.g. John Smith" className={inputClass} />
              ), true)}
              {field(<Phone className="w-4 h-4" />, `${t('phoneNumber')} *`, (
                <input type="tel" value={form.phone} onChange={update('phone')} placeholder="+1 555 000 1234" className={inputClass} />
              ))}
              {field(<Cake className="w-4 h-4" />, `${t('dateOfBirth')} *`, (
                <input type="date" value={form.date_of_birth} onChange={update('date_of_birth')} className={inputClass} />
              ))}
              {field(<UsersRound className="w-4 h-4" />, `${t('gender')} *`, (
                <select value={form.gender} onChange={update('gender')} className={selectClass}>
                  <option value="" className="bg-[#0f0f23]">{t('selectGender')}</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g} className="bg-[#0f0f23]">{g}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h2 className="text-sm font-semibold text-purple-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {t('WorkInfo')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {field(<Building2 className="w-4 h-4" />, `${t('department')} *`, (
                <input type="text" value={form.department} onChange={update('department')} placeholder="e.g. Engineering" className={inputClass} />
              ))}
              {field(<Briefcase className="w-4 h-4" />, `${t('jobTitle')} *`, (
                <input type="text" value={form.designation} onChange={update('designation')} placeholder="e.g. Software Engineer" className={inputClass} />
              ))}
              {field(<Briefcase className="w-4 h-4" />, `${t('employmentType')} *`, (
                <select value={form.employment_type} onChange={update('employment_type')} className={selectClass}>
                  <option value="" className="bg-[#0f0f23]">{t('selectEmploymentType')}</option>
                  {EMPLOYMENT_TYPES.map((et) => (
                    <option key={et} value={et} className="bg-[#0f0f23]">{et}</option>
                  ))}
                </select>
              ))}
              {field(<CalendarDays className="w-4 h-4" />, `${t('dateOfJoining')} *`, (
                <input type="date" value={form.date_of_joining} onChange={update('date_of_joining')} className={inputClass} />
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> {t('EmergencyContact')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {field(<UsersRound className="w-4 h-4" />, `${t('emergencyContactName')} *`, (
                <input type="text" value={form.emergency_contact_name} onChange={update('emergency_contact_name')} placeholder="e.g. Jane Doe" className={inputClass} />
              ))}
              {field(<Phone className="w-4 h-4" />, `${t('emergencyContactPhone')} *`, (
                <input type="tel" value={form.emergency_contact_phone} onChange={update('emergency_contact_phone')} placeholder="+1 555 000 5678" className={inputClass} />
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold shadow-lg shadow-cyan-500/20 h-12"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('saving')}
                </span>
              ) : (
                t('saveAndContinue')
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-gray-500">{t('saveDetailsNote')}</p>
          </div>
        </form>
      </Card>
    </div>
  );
}
