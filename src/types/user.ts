export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  theme: string | null;
  keyboard_shortcuts_enabled: boolean | null;
  email_notifications: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ShowMember {
  id: string;
  show_id: string;
  user_id: string | null;
  guest_email: string | null;
  role: 'owner' | 'editor' | 'viewer' | 'guest';
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'invite' | 'update' | 'comment' | 'mention' | 'system';
  title: string;
  message: string | null;
  show_id: string | null;
  read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  show_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any> | null;
  created_at: string;
  profile?: Profile;
}
