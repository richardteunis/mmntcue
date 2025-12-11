-- Drop the restrictive policy and create a permissive one
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a permissive INSERT policy that allows authenticated users to create notifications
CREATE POLICY "Authenticated users can create notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (true);