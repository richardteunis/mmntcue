import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import Dashboard from '@/components/runway/Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, profile, loading } = useAuthContext();
  const navigate = useNavigate();

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
