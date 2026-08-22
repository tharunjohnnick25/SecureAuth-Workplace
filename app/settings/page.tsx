'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  Loader2, Settings, User, Shield, Briefcase, Bell, Lock, Globe, Camera,
  Palette, Eye, Clock, Calendar, CheckSquare, HardDrive, Smartphone, LifeBuoy,
  LogOut, ShieldAlert, BarChart3, AlertTriangle, Fingerprint
} from 'lucide-react';
import { toast } from 'sonner';
import { ProfilePictureModal } from '@/components/ProfilePictureModal';
import { supabase } from '@/lib/supabase/client';


export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isPicModalOpen, setIsPicModalOpen] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Form states for editable fields
  const [formData, setFormData] = useState({
    personal_email: '',
    phone: '',
    dob: '',
    gender: '',
    blood_group: '',
    marital_status: '',
    nationality: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    appearance: {
      theme: 'System',
      accent_color: 'Blue',
      font_size: 'Medium',
      sidebar: 'Expanded',
      language: 'English'
    },
    notifications: {
      leave_approval: true,
      new_tasks: true,
      meetings: true,
      chat_messages: true,
      file_access: true,
      security_alerts: true,
      weekly_reports: false,
      notification_type: 'In-App Notification'
    },
    privacy: {
      profile_visibility: 'Team Only',
      contact_visibility: 'Team',
      status_visibility: 'Online'
    }
  });

  useEffect(() => {
    if (user) {
      loadProfile();
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('sessions').select('*').eq('user_id', user.id).order('last_active', { ascending: false });
      if (data) setActiveSessions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile?user_id=${user?.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        let p = data.data;
        setProfile(p);
        setFormData({
          personal_email: p.personal_email || '',
          phone: p.phone || '',
          dob: p.date_of_birth || p.dob || '',
          gender: p.gender || '',
          blood_group: p.blood_group || '',
          marital_status: p.marital_status || '',
          nationality: p.nationality || '',
          address: p.address || '',
          city: p.city || '',
          state: p.state || '',
          country: p.country || '',
          postal_code: p.postal_code || '',
          appearance: p.appearance_preferences || formData.appearance,
          notifications: p.notification_preferences || formData.notifications,
          privacy: p.privacy_preferences || formData.privacy
        });
        
        if (p.profile_picture !== user?.profile_picture) {
          setUser({ ...user, profile_picture: p.profile_picture });
        }
      }
    } catch (e) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (fieldUpdate?: any, showToast = true) => {
    setSaving(true);
    try {
      const payload = fieldUpdate || {
        personal_email: formData.personal_email,
        phone: formData.phone,
        dob: formData.dob,
        gender: formData.gender,
        blood_group: formData.blood_group,
        marital_status: formData.marital_status,
        nationality: formData.nationality,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postal_code: formData.postal_code,
        appearance_preferences: formData.appearance,
        notification_preferences: formData.notifications,
        privacy_preferences: formData.privacy
      };
      
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, ...payload })
      });
      const data = await res.json();
      if (data.success) {
        if (showToast) toast.success('Profile settings updated successfully');
        
        if (!fieldUpdate) {
          localStorage.setItem(`cyber_auth_settings_${user?.id}`, JSON.stringify({
            personal_email: payload.personal_email,
            marital_status: payload.marital_status,
            nationality: payload.nationality,
            city: payload.city,
            state: payload.state,
            country: payload.country,
            postal_code: payload.postal_code,
            appearance_preferences: payload.appearance_preferences,
            notification_preferences: payload.notification_preferences,
            privacy_preferences: payload.privacy_preferences
          }));
        }
        
        const localData = localStorage.getItem(`cyber_auth_settings_${user?.id}`);
        const parsedLocal = localData ? JSON.parse(localData) : {};
        setProfile({ ...data.data, ...parsedLocal });
        
        if (payload.profile_picture) {
          setUser({ ...user, profile_picture: payload.profile_picture, avatar_url: payload.profile_picture });
        }
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      if (showToast) toast.error(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePicture = (base64: string) => {
    handleUpdate({ profile_picture: base64 });
  };

  const handleRemovePicture = () => {
    handleUpdate({ profile_picture: '' });
  };

  const handleTerminateAllSessions = async () => {
    try {
      await supabase.from('sessions').delete().eq('user_id', user?.id).neq('id', activeSessions[0]?.id);
      toast.success('Logged out from all other devices');
      fetchSessions();
    } catch (e) {
      toast.error('Failed to logout from other devices');
    }
  };

  const handleManageBiometrics = () => {
    toast.info('Initiating face verification scan...', { duration: 2000 });
    setTimeout(() => {
      handleUpdate({ security_info: { ...profile.security_info, face_verified: true } }, false);
      toast.success('Face Verification updated successfully!');
    }, 2500);
  };

  const handleConnectDrive = () => {
    toast.info('Connecting to Google Workspace...', { duration: 1500 });
    setTimeout(() => {
      handleUpdate({ 
        drive_integration: { 
          connected: true, 
          account: formData.personal_email || user?.email || 'user@gmail.com', 
          storage_used: '0 GB', 
          total_storage: '15 GB', 
          last_sync: new Date().toISOString() 
        } 
      }, false);
      toast.success('Google Drive Connected Successfully!');
    }, 1500);
  };

  useEffect(() => {
    if (formData.appearance.theme === 'Light Mode') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [formData.appearance.theme]);

  const TABS = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'devices', label: 'Devices', icon: Smartphone },
    { id: 'help', label: 'Help & Support', icon: LifeBuoy }
  ];

  // ==========================
  // RENDER FUNCTIONS
  // ==========================

  const renderProfileInformation = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><User className="text-primary"/> Profile Information</h3>
      
      {/* Profile Picture Card */}
      <div className="flex flex-col sm:flex-row items-center gap-8 mb-8 p-6 bg-white/5 rounded-2xl border border-white/5">
        <div className="relative w-32 h-32 rounded-full border-4 border-primary/30 overflow-hidden bg-[#0a0f1c] flex items-center justify-center">
          {profile.profile_picture ? (
            <img src={profile.profile_picture} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-gray-500" />
          )}
        </div>
        <div className="flex-1 text-center sm:text-left space-y-3">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="w-3 h-3 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
            <span className="text-sm font-semibold text-gray-300">Online</span>
            <span className="ml-3 px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded uppercase">Employee Badge</span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
            <button onClick={() => setIsPicModalOpen(true)} className="px-4 py-2 btn-cyber text-sm">Upload Image</button>
            <button onClick={() => setIsPicModalOpen(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition-colors">Capture Webcam</button>
            <button onClick={handleRemovePicture} className="px-4 py-2 border border-destructive/30 hover:bg-destructive/10 text-destructive font-bold rounded-xl text-sm transition-colors">Remove</button>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div><label className="text-xs text-gray-400 block mb-1">Full Name (Read Only)</label><input type="text" readOnly value={profile.full_name || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-gray-400 cursor-not-allowed" /></div>
          <div><label className="text-xs text-gray-400 block mb-1">Employee ID (Read Only)</label><input type="text" readOnly value={profile.id?.toUpperCase() || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-gray-400 cursor-not-allowed" /></div>
          <div><label className="text-xs text-gray-400 block mb-1">Company Name (Read Only)</label><input type="text" readOnly value={profile.company_name || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-gray-400 cursor-not-allowed" /></div>
          <div><label className="text-xs text-gray-400 block mb-1">Department (Read Only)</label><input type="text" readOnly value={profile.department || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-gray-400 cursor-not-allowed" /></div>
          <div><label className="text-xs text-gray-400 block mb-1">Designation (Read Only)</label><input type="text" readOnly value={profile.designation || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-gray-400 cursor-not-allowed" /></div>
          <div><label className="text-xs text-gray-400 block mb-1">Official Email (Read Only)</label><input type="text" readOnly value={profile.email || ''} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-gray-400 cursor-not-allowed" /></div>
          
          <div><label className="text-xs text-gray-400 block mb-1">Personal Email</label><input type="email" value={formData.personal_email || ''} onChange={e => setFormData({...formData, personal_email: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md" /></div>
          <div><label className="text-xs text-gray-400 block mb-1">Phone Number</label><input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md" /></div>
          <div><label className="text-xs text-gray-400 block mb-1">Date of Birth</label><input type="date" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md" /></div>
          
          <div>
            <label className="text-xs text-gray-400 block mb-1">Gender</label>
            <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md">
              <option value="" disabled className="bg-[#0f172a] text-gray-500">Select Gender...</option>
              <option className="bg-[#0f172a] text-white">Male</option><option className="bg-[#0f172a] text-white">Female</option><option className="bg-[#0f172a] text-white">Other</option><option className="bg-[#0f172a] text-white">Prefer Not to Say</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Blood Group</label>
            <select value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md">
              <option value="" disabled className="bg-[#0f172a] text-gray-500">Select Blood Group...</option>
              <option className="bg-[#0f172a] text-white">A+</option><option className="bg-[#0f172a] text-white">A-</option><option className="bg-[#0f172a] text-white">B+</option><option className="bg-[#0f172a] text-white">B-</option><option className="bg-[#0f172a] text-white">O+</option><option className="bg-[#0f172a] text-white">O-</option><option className="bg-[#0f172a] text-white">AB+</option><option className="bg-[#0f172a] text-white">AB-</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Marital Status</label>
            <select value={formData.marital_status} onChange={e => setFormData({...formData, marital_status: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md">
              <option value="" disabled className="bg-[#0f172a] text-gray-500">Select Marital Status...</option>
              <option className="bg-[#0f172a] text-white">Single</option><option className="bg-[#0f172a] text-white">Married</option><option className="bg-[#0f172a] text-white">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Nationality</label>
            <select value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md">
              <option value="" disabled className="bg-[#0f172a] text-gray-500">Select Nationality...</option>
              <option className="bg-[#0f172a] text-white">American</option><option className="bg-[#0f172a] text-white">British</option><option className="bg-[#0f172a] text-white">Canadian</option><option className="bg-[#0f172a] text-white">Indian</option><option className="bg-[#0f172a] text-white">Australian</option><option className="bg-[#0f172a] text-white">Other</option>
            </select>
          </div>
          <div className="md:col-span-2"><label className="text-xs text-gray-400 block mb-1">Address</label><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md" /></div>
          
          <div><label className="text-xs text-gray-400 block mb-1">City</label><input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md" /></div>
          <div><label className="text-xs text-gray-400 block mb-1">State</label><input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md" /></div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Country</label>
            <select value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md">
              <option value="" disabled className="bg-[#0f172a] text-gray-500">Select Country...</option>
              <option className="bg-[#0f172a] text-white">United States</option><option className="bg-[#0f172a] text-white">United Kingdom</option><option className="bg-[#0f172a] text-white">Canada</option><option className="bg-[#0f172a] text-white">India</option>
            </select>
          </div>
          <div><label className="text-xs text-gray-400 block mb-1">Postal Code</label><input type="text" value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:bg-black/40 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 outline-none backdrop-blur-md" /></div>
        </div>
        <div className="flex justify-end pt-4 border-t border-white/10 gap-3">
          <button type="button" onClick={() => loadProfile()} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl">Reset</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 btn-cyber flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin"/>} Save Changes
          </button>
        </div>
      </form>
    </div>
  );

  const renderEmploymentInformation = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Briefcase className="text-primary"/> Employment Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Employee ID</p><p className="font-bold">{profile.id.toUpperCase()}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Joining Date</p><p className="font-bold">{profile.date_of_joining}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Employee Type</p><p className="font-bold">{profile.employee_type}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Employment Status</p><p className="font-bold text-success">{profile.employment_status}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Office Branch</p><p className="font-bold">{profile.office_branch}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Work Location</p><p className="font-bold">{profile.work_location}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Reporting Manager</p><p className="font-bold">{profile.reporting_manager || 'CEO'}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Team / Department</p><p className="font-bold">{profile.department}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Shift Timing</p><p className="font-bold">{profile.shift_timing || '09:00 AM - 05:00 PM'}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/5"><p className="text-xs text-gray-400 uppercase">Office Working Hours</p><p className="font-bold">{profile.working_hours || '8 Hours'}</p></div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <h3 className="text-xl font-bold flex items-center gap-2"><Shield className="text-primary"/> Security Settings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center space-y-2">
          <Fingerprint className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-sm text-gray-400">Face Verification</p>
          <p className="font-bold">{profile.security_info?.face_verified ? 'Verified Active' : 'Not Configured'}</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center space-y-2">
          <BarChart3 className="w-8 h-8 text-success mx-auto mb-2" />
          <p className="text-sm text-gray-400">AI Risk Score</p>
          <p className="font-bold text-success">{profile.security_info?.risk_score} / 100</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center space-y-2">
          <Smartphone className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Active Sessions</p>
          <p className="font-bold">{activeSessions.length} Device(s)</p>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h4 className="text-lg font-semibold border-b border-white/10 pb-2">Authentication Methods</h4>
        
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
          <div><p className="font-bold text-white">Change Password</p><p className="text-sm text-gray-400">Last changed: {profile.security_info?.password_last_changed || 'Unknown'}</p></div>
          <button onClick={() => toast.success('Password reset link sent to registered email')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold">Update</button>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
          <div><p className="font-bold text-white">Two-Factor Authentication (2FA)</p><p className="text-sm text-gray-400">Protect account with OTP Verification</p></div>
          <button 
            onClick={() => {
              const state = !profile.two_factor_enabled;
              handleUpdate({ two_factor_enabled: state });
              toast.success(state ? '2FA Enabled' : '2FA Disabled');
            }} 
            className={`px-4 py-2 rounded-lg text-sm font-bold ${profile.two_factor_enabled ? 'bg-success/20 text-success' : 'bg-white/10'}`}
          >
            {profile.two_factor_enabled ? 'Enabled' : 'Enable'}
          </button>
        </div>
        
      </div>

      <div className="space-y-4 pt-4">
        <h4 className="text-lg font-semibold border-b border-white/10 pb-2">Session Management</h4>
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
          <div><p className="font-bold text-white">Logout from All Devices</p><p className="text-sm text-gray-400">Terminate all remote sessions immediately</p></div>
          <button onClick={handleTerminateAllSessions} className="px-4 py-2 bg-destructive/20 text-destructive hover:bg-destructive/40 rounded-lg text-sm font-bold flex items-center gap-2">
            <LogOut className="w-4 h-4"/> Terminate
          </button>
        </div>
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
          <div><p className="font-bold text-white">Security Activity Log</p><p className="text-sm text-gray-400">View recent logins and threats</p></div>
          <button onClick={() => window.location.href='/dashboard'} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold">View Logs</button>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <h3 className="text-xl font-bold flex items-center gap-2"><Palette className="text-primary"/> Appearance Settings</h3>
      <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-6">
        
        <div className="space-y-3">
          <label className="font-semibold block">Theme</label>
          <div className="flex gap-4">
            {['Dark Mode', 'Light Mode', 'System Default'].map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer p-3 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10">
                <input type="radio" name="theme" checked={formData.appearance.theme === t} onChange={() => setFormData({...formData, appearance: {...formData.appearance, theme: t}})} className="text-primary" />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="font-semibold block">Accent Color</label>
          <div className="flex gap-4">
            {['Blue', 'Green', 'Purple', 'Orange'].map(c => (
              <label key={c} className="flex items-center gap-2 cursor-pointer p-3 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10">
                <input type="radio" name="accent" checked={formData.appearance.accent_color === c} onChange={() => setFormData({...formData, appearance: {...formData.appearance, accent_color: c}})} />
                {c}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Font Size</label>
            <select value={formData.appearance.font_size} onChange={e => setFormData({...formData, appearance: {...formData.appearance, font_size: e.target.value}})} className="w-full bg-[#1a2133] border border-white/10 rounded-xl p-3 focus:border-primary">
              <option className="bg-[#0f172a] text-white">Small</option><option className="bg-[#0f172a] text-white">Medium</option><option className="bg-[#0f172a] text-white">Large</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Sidebar Style</label>
            <select value={formData.appearance.sidebar} onChange={e => setFormData({...formData, appearance: {...formData.appearance, sidebar: e.target.value}})} className="w-full bg-[#1a2133] border border-white/10 rounded-xl p-3 focus:border-primary">
              <option className="bg-[#0f172a] text-white">Expanded</option><option className="bg-[#0f172a] text-white">Collapsed</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Language</label>
            <select value={formData.appearance.language} onChange={e => setFormData({...formData, appearance: {...formData.appearance, language: e.target.value}})} className="w-full bg-[#1a2133] border border-white/10 rounded-xl p-3 focus:border-primary">
              <option className="bg-[#0f172a] text-white">English</option><option className="bg-[#0f172a] text-white">Tamil</option><option className="bg-[#0f172a] text-white">Hindi</option><option className="bg-[#0f172a] text-white">Spanish</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end"><button type="submit" className="px-6 py-2.5 btn-cyber">Save Changes</button></div>
      </form>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <h3 className="text-xl font-bold flex items-center gap-2"><Bell className="text-primary"/> Notification Settings</h3>
      <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-6">
        
        <div className="space-y-4">
          <p className="font-semibold text-white mb-2">Receive Notifications For:</p>
          {[
            { key: 'leave_approval', label: 'Leave Approval' },
            { key: 'new_tasks', label: 'New Tasks' },
            { key: 'meetings', label: 'Meetings' },
            { key: 'chat_messages', label: 'Chat Messages' },
            { key: 'file_access', label: 'File Access Requests' },
            { key: 'security_alerts', label: 'Security Alerts' },
            { key: 'weekly_reports', label: 'Weekly Reports' }
          ].map(item => (
            <label key={item.key} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10">
              <input 
                type="checkbox" 
                checked={formData.notifications[item.key as keyof typeof formData.notifications] as boolean} 
                onChange={(e) => setFormData({...formData, notifications: {...formData.notifications, [item.key]: e.target.checked}})} 
                className="w-5 h-5 rounded border-white/20 text-primary focus:ring-primary bg-[#1a2133]"
              />
              <span className="font-medium text-gray-200">{item.label}</span>
            </label>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10">
          <label className="text-xs text-gray-400 block mb-1 uppercase tracking-wider">Notification Delivery Type</label>
          <select value={formData.notifications.notification_type} onChange={e => setFormData({...formData, notifications: {...formData.notifications, notification_type: e.target.value}})} className="w-full md:w-1/2 bg-[#1a2133] border border-white/10 rounded-xl p-3 focus:border-primary">
            <option className="bg-[#0f172a] text-white">Push Notification</option><option className="bg-[#0f172a] text-white">Email</option><option className="bg-[#0f172a] text-white">SMS</option><option className="bg-[#0f172a] text-white">In-App Notification</option>
          </select>
        </div>

        <div className="flex justify-end"><button type="submit" className="px-6 py-2.5 btn-cyber">Save Changes</button></div>
      </form>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <h3 className="text-xl font-bold flex items-center gap-2"><Eye className="text-primary"/> Privacy Settings</h3>
      <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-6">
        
        <div>
          <label className="font-semibold block mb-2">Profile Visibility</label>
          <div className="flex gap-4">
            {['Everyone', 'Team Only', 'Admin Only'].map(v => (
              <label key={v} className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10">
                <input type="radio" checked={formData.privacy.profile_visibility === v} onChange={() => setFormData({...formData, privacy: {...formData.privacy, profile_visibility: v}})} name="prof_vis"/> {v}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="font-semibold block mb-2">Contact Visibility</label>
          <div className="flex gap-4">
            {['Everyone', 'Team', 'Admin'].map(v => (
              <label key={v} className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10">
                <input type="radio" checked={formData.privacy.contact_visibility === v} onChange={() => setFormData({...formData, privacy: {...formData.privacy, contact_visibility: v}})} name="cont_vis"/> {v}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="font-semibold block mb-2">Online Status Visibility</label>
          <div className="flex gap-4 flex-wrap">
            {['Online', 'Away', 'Busy', 'Invisible'].map(v => (
              <label key={v} className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10">
                <input type="radio" checked={formData.privacy.status_visibility === v} onChange={() => setFormData({...formData, privacy: {...formData.privacy, status_visibility: v}})} name="stat_vis"/> {v}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end"><button type="submit" className="px-6 py-2.5 btn-cyber">Save Changes</button></div>
      </form>
    </div>
  );

  const renderAttendance = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Clock className="text-primary"/> Attendance Dashboard</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-xs text-gray-400">Today's Login</p><p className="font-bold text-lg">{profile.attendance_stats?.today_login || '09:00 AM'}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-xs text-gray-400">Today's Logout</p><p className="font-bold text-lg">{profile.attendance_stats?.today_logout || 'N/A'}</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-xs text-gray-400">Total Working Hours</p><p className="font-bold text-lg text-primary">{profile.attendance_stats?.total_working_hours || '160 Hrs'}</p></div>
        <div className="p-4 bg-success/10 rounded-xl border border-success/20"><p className="text-xs text-success">Attendance %</p><p className="font-bold text-lg text-success">{profile.attendance_stats?.attendance_percentage || '98%'}</p></div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center"><p className="text-2xl font-bold text-white">{profile.attendance_stats?.present_days || 20}</p><p className="text-xs text-gray-400">Present Days</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center"><p className="text-2xl font-bold text-white">{profile.attendance_stats?.absent_days || 0}</p><p className="text-xs text-gray-400">Absent Days</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center"><p className="text-2xl font-bold text-white">{profile.attendance_stats?.leave_days || 0}</p><p className="text-xs text-gray-400">Leave Days</p></div>
      </div>

      <div className="flex gap-4">
        <button onClick={() => window.location.href='/dashboard'} className="px-4 py-2 bg-primary text-black font-bold rounded-xl text-sm">View Attendance History</button>
        <button onClick={() => toast.success('Attendance Report generated and downloaded successfully.')} className="px-4 py-2 bg-white/10 text-white font-bold rounded-xl text-sm border border-white/20">Download Report</button>
      </div>
    </div>
  );

  const renderLeaveManagement = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Calendar className="text-primary"/> Leave Management</h3>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-center"><p className="text-4xl font-bold text-blue-400">{profile.leave_balance?.casual || 5}</p><p className="text-sm font-semibold mt-2 text-blue-200">Casual Leaves</p></div>
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center"><p className="text-4xl font-bold text-red-400">{profile.leave_balance?.sick || 5}</p><p className="text-sm font-semibold mt-2 text-red-200">Sick Leaves</p></div>
        <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-2xl text-center"><p className="text-4xl font-bold text-green-400">{profile.leave_balance?.paid || 15}</p><p className="text-sm font-semibold mt-2 text-green-200">Paid Leaves (Annual)</p></div>
      </div>
      <div className="flex gap-4 mb-6">
        <button className="px-6 py-2.5 btn-cyber">Apply Leave</button>
        <button className="px-6 py-2.5 bg-white/10 text-white font-bold rounded-xl">View Requests</button>
      </div>
      <div className="bg-white/5 rounded-xl p-4 border border-white/10"><p className="text-sm text-gray-400 mb-2">Recent Leave History</p><p className="text-xs text-gray-500">No recent leaves taken in the last 30 days.</p></div>
    </div>
  );

  const renderAssignedTasks = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><CheckSquare className="text-primary"/> Assigned Tasks</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 text-center">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-2xl font-bold text-white">2</p><p className="text-xs text-gray-400 mt-1">Today</p></div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-2xl font-bold text-white">5</p><p className="text-xs text-gray-400 mt-1">Weekly</p></div>
        <div className="p-4 bg-success/10 rounded-xl border border-success/20"><p className="text-2xl font-bold text-success">12</p><p className="text-xs text-success mt-1">Completed</p></div>
        <div className="p-4 bg-warning/10 rounded-xl border border-warning/20"><p className="text-2xl font-bold text-warning">4</p><p className="text-xs text-warning mt-1">Pending</p></div>
        <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20"><p className="text-2xl font-bold text-destructive">0</p><p className="text-xs text-destructive mt-1">Overdue</p></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
          <div><p className="font-bold text-white">Complete Security Training</p><p className="text-xs text-gray-400">Due Today</p></div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white/10 rounded text-xs font-bold">View</button>
            <button className="px-3 py-1 bg-success/20 text-success rounded text-xs font-bold">Mark Completed</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCalendar = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2"><Calendar className="text-primary"/> Calendar</h3>
        <div className="flex gap-2">
          {['Day', 'Week', 'Month'].map(v => (
            <button key={v} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs font-bold">{v}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/20"><p className="font-bold text-blue-400 mb-2">Upcoming Meetings</p><div className="text-sm text-gray-300">10:00 AM - Team Sync<br/>02:00 PM - Client Review</div></div>
        <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/20"><p className="font-bold text-red-400 mb-2">Deadlines</p><div className="text-sm text-gray-300">Tomorrow - Security Audit</div></div>
        <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20"><p className="font-bold text-green-400 mb-2">Holidays / Leave</p><div className="text-sm text-gray-300">Aug 15 - Public Holiday</div></div>
      </div>
    </div>
  );

  const renderConnectedDevices = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Smartphone className="text-primary"/> Connected Devices</h3>
      <div className="space-y-4">
        {activeSessions.map((session, idx) => (
          <div key={session.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center"><Smartphone className="text-primary"/></div>
              <div>
                <p className="font-bold text-white flex items-center gap-2">{session.device_type} - {session.browser} {idx === 0 && <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] rounded uppercase">Current</span>}</p>
                <p className="text-xs text-gray-400">{session.os} • IP: {session.ip_address} • {session.location?.city}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toast.success('Device added to trusted list.')} className="px-3 py-1.5 bg-white/10 text-white text-xs font-bold rounded-lg border border-white/20 hover:bg-white/20">Trust Device</button>
              {idx !== 0 && <button onClick={() => {
                supabase.from('sessions').delete().eq('id', session.id).then(() => {
                  toast.success('Session terminated');
                  fetchSessions();
                });
              }} className="px-3 py-1.5 bg-destructive/20 text-destructive text-xs font-bold rounded-lg border border-destructive/30 hover:bg-destructive/40">Remove</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGoogleDrive = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><HardDrive className="text-primary"/> Google Drive Integration</h3>
      
      {profile.drive_integration?.connected ? (
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-2"><img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive"/></div>
              <div><p className="font-bold">{profile.drive_integration.account}</p><p className="text-xs text-success font-semibold">Connected</p></div>
            </div>
            <button onClick={() => {
              handleUpdate({ drive_integration: { connected: false, account: '', storage_used: '0 GB', total_storage: '15 GB', last_sync: null } }, false);
              toast.info('Google Drive disconnected');
            }} className="px-4 py-2 bg-destructive/10 text-destructive font-bold text-sm rounded-xl">Disconnect</button>
          </div>
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm font-semibold"><span className="text-gray-400">Storage Used</span><span>{profile.drive_integration.storage_used} / {profile.drive_integration.total_storage}</span></div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[80%]"></div></div>
          </div>
          <button className="w-full py-3 bg-primary text-black font-bold rounded-xl shadow-lg">Sync Now</button>
        </div>
      ) : (
        <div className="text-center p-12 bg-white/5 rounded-2xl border border-white/10">
          <HardDrive className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-lg font-bold mb-2">Google Drive Not Connected</p>
          <p className="text-sm text-gray-400 mb-6">Connect your drive to seamlessly save reports and files.</p>
          <button onClick={handleConnectDrive} className="px-6 py-3 bg-white text-black font-bold rounded-xl shadow-lg">Connect Drive</button>
        </div>
      )}
    </div>
  );

  const renderAIRiskDashboard = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><BarChart3 className="text-primary"/> AI Risk Dashboard</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-success/10 border border-success/30 rounded-2xl text-center">
          <p className="text-5xl font-black text-success tracking-tighter mb-2">{profile.security_info?.risk_score}</p>
          <p className="font-bold text-success uppercase text-xs tracking-widest">Current Risk Score (0-100)</p>
          <p className="text-xs text-success/70 mt-2 font-semibold bg-success/20 py-1 rounded">LOW RISK LEVEL</p>
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-xs text-gray-400 uppercase">Typing Speed Analysis</p><p className="font-bold text-white mt-1">Normal (Match: 94%)</p></div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-xs text-gray-400 uppercase">Face Match %</p><p className="font-bold text-success mt-1">99.8% (Verified)</p></div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-xs text-gray-400 uppercase">Trusted Device</p><p className="font-bold text-white mt-1">Yes</p></div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-xs text-gray-400 uppercase">Login Time Analysis</p><p className="font-bold text-white mt-1">Expected Pattern</p></div>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
        <p className="font-bold mb-4">Historical Risk Graph</p>
        <div className="h-40 flex items-end justify-between gap-2 border-b border-white/20 pb-2">
          {profile.ai_risk_history?.map((h: any, i: number) => (
            <div key={i} className="flex flex-col items-center flex-1 group">
              <div className="w-full bg-success/50 hover:bg-success rounded-t transition-all relative" style={{ height: `${h.score * 2}px` }}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{h.score}</div>
              </div>
              <span className="text-[10px] text-gray-400 mt-2">{h.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex gap-3">
        <ShieldAlert className="text-primary w-6 h-6 shrink-0"/>
        <div><p className="font-bold text-primary text-sm">AI Recommendation</p><p className="text-xs text-gray-300 mt-1">Your authentication patterns are highly consistent. No immediate action required. Continue using your current trusted devices.</p></div>
      </div>
    </div>
  );

  const renderHelpSupport = () => (
    <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><LifeBuoy className="text-primary"/> Help & Support</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="mailto:admin@test.com" className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-left transition-colors block">
          <p className="font-bold text-lg mb-1">Contact Admin</p>
          <p className="text-sm text-gray-400">Reach out to your system administrator (admin@test.com).</p>
        </a>
        <button className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-left transition-colors">
          <p className="font-bold text-lg mb-1">Report Issue</p>
          <p className="text-sm text-gray-400">Found a bug or security concern? Report it here.</p>
        </button>
        <button className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-left transition-colors">
          <p className="font-bold text-lg mb-1">FAQs</p>
          <p className="text-sm text-gray-400">Browse frequently asked questions and guides.</p>
        </button>
        <button className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-left transition-colors">
          <p className="font-bold text-lg mb-1">User Guide</p>
          <p className="text-sm text-gray-400">Read the comprehensive manual for SecureAuth Workspace.</p>
        </button>
      </div>
      <div className="mt-8 text-center"><p className="text-xs text-gray-500">About SecureAuth Workspace v2.0.1</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-20 p-4 sm:p-6 lg:p-8 min-h-screen max-w-7xl mx-auto">
          
          <div className="mb-8 pt-4">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Settings className="w-5 h-5" />
              </div>
              Settings & Profile
            </h1>
            <p className="text-gray-400 text-sm">Manage your comprehensive workspace settings, security, and preferences.</p>
          </div>

          {loading || !profile ? (
            <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              
              {/* Sidebar Tabs */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col shadow-xl sticky top-28 h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                        activeTab === tab.id 
                          ? 'bg-primary/20 text-primary border border-primary/30' 
                          : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                      }`}
                    >
                      <tab.icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0 pb-20">
                {activeTab === 'profile' && renderProfileInformation()}
                {activeTab === 'employment' && renderEmploymentInformation()}
                {activeTab === 'security' && renderSecuritySettings()}
                {activeTab === 'appearance' && renderAppearanceSettings()}
                {activeTab === 'notifications' && renderNotificationSettings()}
                {activeTab === 'privacy' && renderPrivacySettings()}
                {activeTab === 'attendance' && renderAttendance()}
                {activeTab === 'leave' && renderLeaveManagement()}
                {activeTab === 'tasks' && renderAssignedTasks()}
                {activeTab === 'calendar' && renderCalendar()}
                {activeTab === 'devices' && renderConnectedDevices()}
                {activeTab === 'drive' && renderGoogleDrive()}
                {activeTab === 'ai_risk' && renderAIRiskDashboard()}
                {activeTab === 'help' && renderHelpSupport()}
              </div>
            </div>
          )}
        </main>
      </div>

      <ProfilePictureModal 
        isOpen={isPicModalOpen} 
        onClose={() => setIsPicModalOpen(false)} 
        onSave={handleSavePicture}
        currentImage={profile?.profile_picture}
      />
    </div>
  );
}
