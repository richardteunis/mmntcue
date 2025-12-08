-- Create a separate table for temporary WebAuthn challenges (no FK to auth.users)
CREATE TABLE public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL UNIQUE,
  type text NOT NULL, -- 'login' or 'register'
  user_id uuid, -- Optional, only set for registration
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_webauthn_challenges_challenge ON public.webauthn_challenges(challenge);
CREATE INDEX idx_webauthn_challenges_expires ON public.webauthn_challenges(expires_at);

-- Enable RLS but allow service role full access
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role can manage challenges"
ON public.webauthn_challenges
FOR ALL
USING (true)
WITH CHECK (true);

-- Clean up expired challenges automatically (run this periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_challenges()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.webauthn_challenges WHERE expires_at < now();
$$;