-- Enable REPLICA IDENTITY FULL for proper realtime DELETE events
ALTER TABLE public.cues REPLICA IDENTITY FULL;