import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Dashboard from '@/components/runway/Dashboard';
import { Loader2 } from 'lucide-react';
import { useInviteAcceptance } from '@/hooks/useInviteAcceptance';

const Index = () => {
  const { user, profile, loading } = useAuthContext();
  const navigate = useNavigate();
  
  // Check for and accept any pending guest invitations
  useInviteAcceptance(user?.id || null, user?.email || null, profile?.full_name || null);

  useEffect(() => {
    if (!loading) {
      // Redirect to auth if not logged in
      if (!user) {
        navigate('/auth');
        return;
      }

      // Redirect to onboarding if profile name not set
      if (profile && (!profile.full_name || profile.full_name === profile.email?.split('@')[0])) {
        navigate('/onboarding');
        return;
      }

      // Check for pending show join from show code
      const pendingShowId = sessionStorage.getItem('pending_show_join');
      if (pendingShowId && user) {
        sessionStorage.removeItem('pending_show_join');
        
        // Join the show as guest viewer
        supabase.rpc('join_show_as_guest', {
          _show_id: pendingShowId,
          _user_id: user.id
        }).then(() => {
          navigate(`/show/${pendingShowId}`);
        });
        return;
      }
    }
  }, [user, profile, loading, navigate]);

  // Show loading while checking auth
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading while waiting for profile
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Dashboard />;
};

export default Index;
