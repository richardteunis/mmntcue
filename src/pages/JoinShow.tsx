import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ArrowRight } from "lucide-react";
import mmntIcon from "@/assets/mmnt_pink_icon.svg";

interface ShowInfo {
  id: string;
  name: string;
  event_name: string | null;
  venue: string | null;
}

const JoinShow = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const showId = searchParams.get('show');
  const inviterName = searchParams.get('inviter');
  
  const [showInfo, setShowInfo] = useState<ShowInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && showId) {
        // Already logged in, redirect to show
        navigate(`/show/${showId}`);
      }
    };
    checkAuth();
  }, [showId, navigate]);

  // Fetch show info
  useEffect(() => {
    const fetchShowInfo = async () => {
      if (!showId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('shows')
        .select('id, name, event_name, venue')
        .eq('id', showId)
        .single();

      if (error) {
        console.error('Error fetching show:', error);
      } else {
        setShowInfo(data);
      }
      setLoading(false);
    };

    fetchShowInfo();
  }, [showId]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Store redirect for after auth
    if (showId) {
      sessionStorage.setItem('auth_redirect', `/show/${showId}`);
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/show/${showId}`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      toast({
        title: "Account created!",
        description: "Welcome to mmnt. Cue. Taking you to your show...",
      });
      // Auth state change will handle the redirect
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else {
      toast({
        title: "Welcome back!",
        description: "Taking you to your show...",
      });
      navigate(`/show/${showId}`);
    }
  };

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && showId) {
        navigate(`/show/${showId}`);
      }
    });

    return () => subscription.unsubscribe();
  }, [showId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!showId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link appears to be invalid or expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <img src={mmntIcon} alt="mmnt. Cue" className="h-8 w-8" />
          <span className="text-sm tracking-widest text-muted-foreground uppercase">
            mmnt. Cue
          </span>
        </div>

        {/* Show Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm text-muted-foreground">
                  {inviterName ? `${inviterName} invited you to join` : "You've been invited to join"}
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  {showInfo?.name || "a show"}
                </h2>
                {showInfo?.event_name && (
                  <p className="text-sm text-muted-foreground">
                    {showInfo.event_name}
                    {showInfo.venue && ` • ${showInfo.venue}`}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auth Form */}
        <Card>
          <CardHeader>
            <CardTitle>{isLogin ? "Sign in to join" : "Create your account"}</CardTitle>
            <CardDescription>
              {isLogin 
                ? "Sign in with your existing account to access this show"
                : "Set up your account to start collaborating"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isLogin ? "Your password" : "Create a password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign in & Join Show" : "Create Account & Join"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              {isLogin ? (
                <p className="text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinShow;
