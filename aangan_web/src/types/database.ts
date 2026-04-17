export type AudienceType = 'all' | 'level' | 'custom';
export type RsvpStatus = 'going' | 'maybe' | 'not_going';
export type EventType = 'wedding' | 'birthday' | 'puja' | 'festival' | 'reunion' | 'other';
export type NotificationType = 'new_post' | 'event_invite' | 'rsvp_update' | 'new_family_member' | 'post_like' | 'post_comment' | 'general' | 'support_reply' | 'report_reply' | 'issue_resolved';

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
  kuldevi_name: string | null;
  kuldevi_temple_location: string | null;
  kuldevta_name: string | null;
  kuldevta_temple_location: string | null;
  puja_paddhati: string | null;
  puja_niyam: string | null;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  family_member_id: string;
  relationship_type: string;
  relationship_label_hindi: string;
  connection_level: number;
  is_verified: boolean;
  created_at: string;
  member?: User;
}

export interface OfflineFamilyMember {
  id: string;
  added_by: string;
  display_name: string;
  display_name_hindi: string | null;
  relationship_type: string;
  relationship_label_hindi: string | null;
  connection_level: number;
  is_deceased: boolean;
  village_city: string | null;
  avatar_url: string | null;
  birth_year: number | null;
  death_year: number | null;
  notes: string | null;
  linked_user_id: string | null;
  is_confirmed: boolean;
  created_at: string;
  updated_at: string;
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
  banner_url: string | null;
  latitude: number | null;
  longitude: number | null;
  hosted_by: string | null;
  voice_invite_url: string | null;
  voice_invite_duration_sec: number | null;
  parent_event_id: string | null;
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
  dietary_preferences: string[] | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface RsvpCounts {
  going: number;
  maybe: number;
  not_going: number;
}

export type GiftType = 'cash' | 'gold' | 'silver' | 'gift' | 'blessing' | 'other';

export interface EventGift {
  id: string;
  event_id: string;
  giver_user_id: string | null;
  giver_name: string;
  giver_name_hindi: string | null;
  gift_type: GiftType;
  amount: number | null;
  description: string | null;
  description_hindi: string | null;
  received_at: string;
  logged_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventGiftManager {
  event_id: string;
  user_id: string;
  granted_by: string | null;
  granted_at: string;
  user?: User;
}

export interface ReportMessage {
  id: string;
  report_id: string;
  sender_id: string | null;
  message: string;
  message_hindi: string | null;
  is_from_admin: boolean;
  is_internal_note: boolean;
  created_at: string;
  sender?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'avatar_url'>;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  message: string;
  is_from_support: boolean;
  is_internal_note: boolean;
  attachment_url: string | null;
  created_at: string;
  sender?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'avatar_url'>;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  category: 'billing' | 'account' | 'bug_report' | 'feature_request' | 'complaint' | 'general';
  subject: string;
  status: 'open' | 'assigned' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  first_response_at: string | null;
  created_at: string;
  updated_at: string;
  user?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'avatar_url' | 'phone_number'>;
}

export interface EventCoHost {
  event_id: string;
  user_id: string;
  granted_by: string | null;
  granted_at: string;
  user?: User;
}

export interface EventPotluckItem {
  id: string;
  event_id: string;
  item_name: string;
  item_name_hindi: string | null;
  quantity_needed: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  signups?: EventPotluckSignup[];
}

export interface EventPotluckSignup {
  id: string;
  item_id: string;
  user_id: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  user?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'avatar_url'>;
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
  // JSONB column — cron jobs insert rich payloads (digest_type, nudge_type,
  // event_id, nested arrays/counts). Kept as `unknown` so consumers read
  // keys defensively rather than trusting a stale narrow type.
  data: Record<string, unknown> | null;
  created_at: string;
}

// ─── v0.2 Security Types ────────────────────────────────────

export type ReportReason = 'inappropriate' | 'spam' | 'harassment' | 'fake_account' | 'privacy_violation' | 'other';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ContentReportType = 'post' | 'photo' | 'event' | 'user' | 'comment';

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: ContentReportType;
  content_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  reporter?: User;
}

export type AuditAction =
  | 'user_login' | 'user_logout' | 'profile_update'
  | 'post_create' | 'post_delete'
  | 'event_create' | 'event_delete'
  | 'family_add' | 'family_remove'
  | 'photo_moderate' | 'report_resolve'
  | 'admin_action' | 'account_deactivate' | 'content_report';

export interface AuditLog {
  id: string;
  actor_id: string;
  action: AuditAction;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: User;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
  blocked_user?: User;
}

export interface AppSetting {
  key: string;
  value: any;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

// ─── Comments ──────────────────────────────────────────────

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: { display_name: string; display_name_hindi: string | null; avatar_url: string | null };
}

// ─── Direct Messages ───────────────────────────────────────

export type MessageType = 'text' | 'voice';

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: MessageType;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: { display_name: string; display_name_hindi: string | null; avatar_url: string | null };
}

export interface ConversationSummary {
  userId: string;
  displayName: string;
  displayNameHindi: string | null;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
