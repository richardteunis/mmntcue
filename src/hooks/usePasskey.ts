import { useState, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PasskeyCredential {
  id: string;
  device_type: string | null;
  created_at: string;
  last_used_at: string | null;
}

export function usePasskey() {
  const [loading, setLoading] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const { toast } = useToast();

  const fetchPasskeys = useCallback(async () => {
    const { data, error } = await supabase
      .from('passkey_credentials')
      .select('id, device_type, created_at, last_used_at')
      .not('credential_id', 'like', 'challenge_%')
      .not('credential_id', 'like', 'login_challenge_%');

    if (error) {
      console.error('Error fetching passkeys:', error);
      return;
    }

    setPasskeys(data || []);
  }, []);

  const registerPasskey = useCallback(async (deviceName?: string) => {
    setLoading(true);
    try {
      // Check WebAuthn support
      if (!window.PublicKeyCredential) {
        throw new Error('Passkeys are not supported in this browser');
      }

      // Check platform authenticator availability
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('No platform authenticator available. Please use a device with biometric authentication.');
      }

      // Get registration options from edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('You must be signed in to register a passkey');
      }

      const optionsRes = await supabase.functions.invoke('passkey-register-options', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (optionsRes.error) {
        throw new Error(optionsRes.error.message || 'Failed to get registration options');
      }

      const options = optionsRes.data;

      // Start registration with the browser
      const credential = await startRegistration({ optionsJSON: options });

      // Verify registration with edge function
      const verifyRes = await supabase.functions.invoke('passkey-register-verify', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: {
          credential,
          deviceName: deviceName || getDeviceName(),
        },
      });

      if (verifyRes.error || !verifyRes.data?.success) {
        throw new Error(verifyRes.error?.message || verifyRes.data?.error || 'Failed to register passkey');
      }

      toast({
        title: 'Passkey registered',
        description: 'You can now sign in with your passkey',
      });

      await fetchPasskeys();
      return { success: true };
    } catch (error: any) {
      console.error('Passkey registration error:', error);
      
      // Handle specific WebAuthn errors
      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Registration cancelled',
          description: 'Passkey registration was cancelled or timed out',
          variant: 'destructive',
        });
      } else if (error.name === 'InvalidStateError') {
        toast({
          title: 'Passkey already exists',
          description: 'This device already has a passkey registered',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Registration failed',
          description: error.message || 'Failed to register passkey',
          variant: 'destructive',
        });
      }
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast, fetchPasskeys]);

  const authenticateWithPasskey = useCallback(async () => {
    setLoading(true);
    try {
      // Check WebAuthn support
      if (!window.PublicKeyCredential) {
        throw new Error('Passkeys are not supported in this browser');
      }

      // Get authentication options
      const optionsRes = await supabase.functions.invoke('passkey-login-options');

      if (optionsRes.error) {
        throw new Error(optionsRes.error.message || 'Failed to get login options');
      }

      const options = optionsRes.data;

      // Start authentication with the browser
      const credential = await startAuthentication({ optionsJSON: options });

      // Verify authentication with edge function
      const verifyRes = await supabase.functions.invoke('passkey-login-verify', {
        body: {
          credential,
          challenge: options.challenge,
        },
      });

      if (verifyRes.error || !verifyRes.data?.success) {
        throw new Error(verifyRes.error?.message || verifyRes.data?.error || 'Failed to authenticate');
      }

      // Complete the sign-in using the token
      const { token, type, email } = verifyRes.data;
      
      if (token && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
        });

        if (verifyError) {
          throw verifyError;
        }
      }

      toast({
        title: 'Welcome back!',
        description: 'Signed in with passkey',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: 'Authentication cancelled',
          description: 'Passkey authentication was cancelled or timed out',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Authentication failed',
          description: error.message || 'Failed to sign in with passkey',
          variant: 'destructive',
        });
      }
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deletePasskey = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('passkey_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Passkey removed',
        description: 'The passkey has been deleted',
      });

      await fetchPasskeys();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Failed to remove passkey',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  }, [toast, fetchPasskeys]);

  return {
    loading,
    passkeys,
    fetchPasskeys,
    registerPasskey,
    authenticateWithPasskey,
    deletePasskey,
  };
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Mac')) return 'Mac';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Android')) return 'Android Device';
  if (ua.includes('Linux')) return 'Linux PC';
  return 'Unknown Device';
}
