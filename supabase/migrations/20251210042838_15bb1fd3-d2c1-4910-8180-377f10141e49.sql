-- Create a system user ID for demo content (using a fixed UUID)
-- This demo show will be owned by NULL user_id to indicate it's a system show

-- Create the demo show
INSERT INTO public.shows (
  id,
  name, 
  description,
  user_id,
  show_code,
  event_name,
  venue,
  room_name,
  brand_color,
  secondary_color,
  timecode_format,
  custom_tracks,
  locked
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sample Show - Live Event Demo',
  'A demonstration show showcasing the features of Runway. This is a read-only demo that all users can view to learn the platform.',
  NULL, -- NULL user_id indicates system/demo content
  'DEMO01',
  'Annual Company Keynote 2025',
  'Grand Convention Center',
  'Main Hall A',
  '#8B5CF6',
  '#06B6D4',
  '30fps',
  '[
    {"id": "audio", "color": "#14B8A6", "label": "Audio"},
    {"id": "video", "color": "#22C55E", "label": "Video"},
    {"id": "lighting", "color": "#EAB308", "label": "Lights"},
    {"id": "stage", "color": "#F97316", "label": "Stage"}
  ]'::jsonb,
  true -- Lock the show so it can't be edited
) ON CONFLICT (id) DO NOTHING;

-- Create sample cues for the demo show
INSERT INTO public.cues (id, show_id, name, type, track, start_time, duration, color, notes, order_index, position, width) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Pre-Show Music', 'audio', 'Audio Main', '00:00:00', '00:05:00', '#14B8A6', 'Ambient music playing as audience enters', 0, 0, 100),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Welcome Video', 'video', 'Video Main', '00:05:00', '00:02:00', '#22C55E', 'Company intro video with logo animation', 1, 0, 100),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'House Lights Down', 'lighting', 'Lights Main', '00:05:00', '00:00:10', '#EAB308', 'Fade house lights to 20%', 2, 0, 100),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'Stage Reveal', 'stage', 'Stage Main', '00:07:00', '00:00:30', '#F97316', 'Open main curtain, reveal set', 3, 0, 100),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000001', 'CEO Walk-On Music', 'audio', 'Audio Main', '00:07:30', '00:01:00', '#14B8A6', 'Upbeat entrance music', 4, 0, 100),
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000001', 'Keynote Presentation', 'video', 'Video Main', '00:08:30', '00:30:00', '#22C55E', 'Main keynote slides - advance on cue', 5, 0, 100),
  ('00000000-0000-0000-0001-000000000007', '00000000-0000-0000-0000-000000000001', 'Product Demo Video', 'video', 'Video Main', '00:40:00', '00:05:00', '#22C55E', 'Pre-recorded product demonstration', 6, 0, 100),
  ('00000000-0000-0000-0001-000000000008', '00000000-0000-0000-0000-000000000001', 'Q&A Lighting', 'lighting', 'Lights Main', '00:45:00', '00:15:00', '#EAB308', 'Audience lights up 50% for Q&A session', 7, 0, 100),
  ('00000000-0000-0000-0001-000000000009', '00000000-0000-0000-0000-000000000001', 'Closing Remarks', 'stage', 'Stage Main', '01:00:00', '00:05:00', '#F97316', 'Thank you graphics on screen', 8, 0, 100),
  ('00000000-0000-0000-0001-000000000010', '00000000-0000-0000-0000-000000000001', 'Exit Music', 'audio', 'Audio Main', '01:05:00', '00:10:00', '#14B8A6', 'Upbeat outro music as audience exits', 9, 0, 100)
ON CONFLICT (id) DO NOTHING;