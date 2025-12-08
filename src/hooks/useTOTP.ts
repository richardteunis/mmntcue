import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TOTPFactor {
  id: string;
  friendly_name?: string;
  factor_type: 'totp';
  status: 'verified' | 'unverified';
  created_at: string;
}

export function useTOTP() {
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState<TOTPFactor[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<{
    id: string;
    qr: string;
    secret: string;
    uri: string;
  } | null>(null);
  const { toast } = useToast();

  const fetchFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    
    if (error) {
      console.error('Error fetching MFA factors:', error);
      return;
    }

    setFactors(data.totp || []);
  }, []);

  const startEnrollment = useCallback(async (friendlyName?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName || 'Authenticator App',
      });

      if (error) throw error;

      setEnrollmentData({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });

      return { success: true, data };
    } catch (error: any) {
      toast({
        title: 'Failed to start enrollment',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const verifyEnrollment = useCallback(async (code: string) => {
    if (!enrollmentData) {
      return { success: false, error: new Error('No enrollment in progress') };
    }

    setLoading(true);
    try {
      // First challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.id,
      });

      if (challengeError) throw challengeError;

      // Then verify
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      toast({
        title: 'Two-factor authentication enabled',
        description: 'Your account is now more secure',
      });

      setEnrollmentData(null);
      await fetchFactors();

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Invalid code, please try again',
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [enrollmentData, toast, fetchFactors]);

  const cancelEnrollment = useCallback(() => {
    setEnrollmentData(null);
  }, []);

  const unenroll = useCallback(async (factorId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) throw error;

      toast({
        title: 'Two-factor authentication disabled',
        description: 'You can re-enable it at any time',
      });

      await fetchFactors();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Failed to disable 2FA',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [toast, fetchFactors]);

  return {
    loading,
    factors,
    enrollmentData,
    fetchFactors,
    startEnrollment,
    verifyEnrollment,
    cancelEnrollment,
    unenroll,
  };
}
