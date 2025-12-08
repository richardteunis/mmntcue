-- Add custom_tracks column to store track configurations
ALTER TABLE public.shows 
ADD COLUMN custom_tracks JSONB DEFAULT '[
  {"id": "audio", "label": "Audio", "color": "#14B8A6"},
  {"id": "video", "label": "Video", "color": "#22C55E"},
  {"id": "lighting", "label": "Lights", "color": "#EAB308"},
  {"id": "stage", "label": "Stage", "color": "#F97316"}
]'::jsonb;