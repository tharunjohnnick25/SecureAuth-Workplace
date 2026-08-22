'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { startRegistration } from '@simplewebauthn/browser';
import { Fingerprint, Key, Loader2, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

type Passkey = {
  id: string;
  device_type: string;
  created_at: string;
  last_used_at: string;
};

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const fetchPasskeys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('passkeys')
        .select('id, device_type, created_at, last_used_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setPasskeys(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setIsRegistering(true);
    try {
      // 1. Get options from server
      const optionsRes = await fetch('/api/auth/webauthn/register/generate-options');
      if (!optionsRes.ok) throw new Error('Failed to generate passkey options.');
      
      const options = await optionsRes.json();

      // 2. Pass options to browser to prompt user
      let attestationRes;
      try {
        attestationRes = await startRegistration({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          toast.error('Passkey registration cancelled by user.');
          return;
        }
        throw err;
      }

      // 3. Send response back to server to verify and save
      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestationRes),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.verified) {
        toast.success('Passkey registered successfully!');
        fetchPasskeys();
      } else {
        toast.error(verifyData.error || 'Failed to verify passkey.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during passkey registration');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to remove this passkey?')) return;
    
    try {
      const { error } = await supabase.from('passkeys').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Passkey removed');
      fetchPasskeys();
    } catch (error) {
      toast.error('Failed to remove passkey.');
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Fingerprint className="text-blue-500 w-5 h-5" /> 
          Passkeys & Hardware Keys
        </CardTitle>
        <CardDescription className="text-slate-400">
          Sign in instantly and securely using your device biometrics (Touch ID, Face ID, Windows Hello) or a security key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-500 w-6 h-6" /></div>
        ) : passkeys.length === 0 ? (
          <div className="text-center p-6 border border-dashed border-slate-800 rounded-lg bg-slate-950/50">
            <Key className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">No passkeys registered yet.</p>
            <Button onClick={handleRegisterPasskey} disabled={isRegistering} className="bg-blue-600 hover:bg-blue-700">
              {isRegistering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Register a Passkey
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Registered Devices</span>
              <Button onClick={handleRegisterPasskey} disabled={isRegistering} size="sm" variant="outline" className="border-slate-700 text-slate-300">
                {isRegistering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Passkey
              </Button>
            </div>
            
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
              {passkeys.map((pk) => (
                <div key={pk.id} className="p-4 flex items-center justify-between hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <Key className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200 capitalize">{pk.device_type} Device</p>
                      <p className="text-xs text-slate-500">
                        Added {format(new Date(pk.created_at), 'MMM d, yyyy')} • Last used {format(new Date(pk.last_used_at), 'MMM d')}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRevoke(pk.id)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
