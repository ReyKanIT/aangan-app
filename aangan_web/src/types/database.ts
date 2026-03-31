export type AudienceType = 'all' | 'level' | 'custom';
export type RsvpStatus = 'going' | 'maybe' | 'not_going';
export type EventType = 'wedding' | 'birthday' | 'puja' | 'festival' | 'reunion' | 'other';
export type NotificationType = 'new_post' | 'event_invite' | 'rsvp_update' | 'new_family_member' | 'post_like' | 'post_comment' | 'general';

export interface User {
  id: string;
  phone_number: string | null;
  email: string | null;
  display_name: string;
  display_name_hindi: string | null;
  avatar_url: string | null;
  bio: string | null;
  bio_hindi: string | null;
  village_city: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  is_verified: boolean;
  push_token: string | null;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  family_member_id: string;
  relationship_type: string;
  relationship_hindi: string;
  connection_level: number;
  is_confirmed: boolean;
  created_at: string;
  member?: User;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  content_hindi: string | null;
  audience_type: AudienceType;
  audience_level: number | null;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: User;
  is_liked?: boolean;
}

export interface PostAudience {
  id: string;
  post_id: string;
  user_id: string;
}

export interface AanganEvent {
  id: string;
  creator_id: string;
  title: string;
  title_hindi: string | null;
  description: string | null;
  description_hindi: string | null;
  event_type: EventType;
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  location_hindi: string | null;
  is_public: boolean;
  max_attendees: number | null;
  rsvp_deadline: string | null;
  ceremonies: Ceremony[];
  created_at: string;
  updated_at: string;
  creator?: User;
  my_rsvp?: RsvpStatus | null;
  rsvp_counts?: RsvpCounts;
}

export interface Ceremony {
  name: string;
  name_hindi: string;
  datetime: string;
  location?: string;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  guests_count: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface RsvpCounts {
  going: number;
  maybe: number;
  not_going: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  title_hindi: string | null;
  body: string;
  body_hindi: string | null;
  is_read: boolean;
  data: Record<string, string> | null;
  created_at: string;
}
