// Database types matching Supabase schema

export interface User {
  id: string;
  phone_number: string;
  display_name: string;
  display_name_hindi: string | null;
  email: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  village: string | null;
  state: string | null;
  country: string;
  family_level: number;
  family_id: string | null;
  is_family_admin: boolean;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  date_of_birth?: string | null;
  gotra?: string | null;
  family_role?: string | null;
  theme_preference?: 'light' | 'dark' | 'system' | null;
  wedding_anniversary?: string | null; // ISO date YYYY-MM-DD
  // Kuldevi / Kuldevta
  kuldevi_name?: string | null;
  kuldevi_temple_location?: string | null;
  kuldevta_name?: string | null;
  kuldevta_temple_location?: string | null;
  puja_paddhati?: string | null;
  puja_niyam?: string | null;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  family_member_id: string;
  relationship_type: string;
  relationship_label_hindi: string | null;
  connection_level: number; // 1-99
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  member?: User;
}

export interface AudienceGroup {
  id: string;
  creator_id: string;
  name: string;
  name_hindi: string | null;
  group_type: 'level_based' | 'custom';
  family_level: number | null;
  member_ids: string[];
  created_at: string;
  updated_at: string;
}

export type PostType = 'text' | 'photo' | 'video' | 'document';
export type AudienceType = 'all' | 'level' | 'custom';

export interface Post {
  id: string;
  author_id: string;
  content: string | null;
  media_urls: string[];
  post_type: PostType;
  audience_type: AudienceType;
  audience_level: number | null;
  audience_level_max: number | null;
  audience_group_id: string | null;
  delivery_status: string;
  like_count: number;
  comment_count: number;
  namaste_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  author?: User;
  audience_count?: number;
  viewed_count?: number;
  is_liked?: boolean;
}

export interface PostAudience {
  id: string;
  post_id: string;
  user_id: string;
  can_view: boolean;
  can_respond: boolean;
  viewed_at: string | null;
  delivered_at: string | null;
}

export type EventType = 'wedding' | 'engagement' | 'puja' | 'birthday' | 'gathering' | 'mundan' | 'housewarming' | 'other';

export interface Ceremony {
  time: string;
  name: string;
  nameEn?: string;
}

export interface AanganEvent {
  id: string;
  creator_id: string;
  title: string;
  title_hindi: string | null;
  event_type: EventType;
  event_date: string;
  end_date: string | null;
  location: string;
  location_hindi: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  audience_type: AudienceType;
  audience_level: number | null;
  audience_level_max: number | null;
  audience_group_id: string | null;
  rsvp_deadline: string | null;
  max_attendees: number | null;
  ceremonies: Ceremony[];
  description: string | null;
  description_hindi: string | null;
  banner_url: string | null;
  bundle_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  creator?: User;
  my_rsvp?: EventRsvp;
  rsvp_stats?: RsvpStats;
}

export type RsvpStatus = 'pending' | 'accepted' | 'declined' | 'maybe';

export interface EventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  response_note: string | null;
  guests_count: number;
  dietary_preferences: string[];
  created_at: string;
  updated_at: string;
  // Joined
  user?: User;
}

export interface RsvpStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
  maybe: number;
  total_guests: number;
}

export type PhotoStatus = 'pending' | 'approved' | 'rejected';
export type PrivacyType = 'all' | 'level' | 'individual';

export interface EventPhoto {
  id: string;
  event_id: string;
  uploader_id: string | null;      // null for guest (QR) uploads
  guest_name: string | null;       // set for QR guest uploads
  is_video: boolean;
  photo_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  status: PhotoStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  privacy_type: PrivacyType;
  privacy_level_min: number;
  privacy_level_max: number;
  privacy_user_ids: string[];
  created_at: string;
  updated_at: string;
  // Joined
  uploader?: User;
}

export type CheckinType = 'gps' | 'manual' | 'qr';

export interface EventCheckin {
  id: string;
  event_id: string;
  user_id: string;
  checkin_type: CheckinType;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  checked_in_at: string;
}

export type ConfirmationMethod = 'app' | 'call' | 'meeting';

export interface EventConfirmation {
  id: string;
  event_id: string;
  user_id: string;
  confirmation_method: ConfirmationMethod;
  confirmed_by: string | null;
  notes: string | null;
  confirmed_at: string;
}

export interface PhysicalCard {
  id: string;
  event_id: string;
  user_id: string;
  card_sent: boolean;
  sent_at: string | null;
  sent_via: 'hand' | 'post' | 'courier' | null;
  tracking_number: string | null;
}

export type NotificationType =
  | 'new_post'
  | 'new_comment'
  | 'comment_reply'
  | 'new_message'
  | 'event_invite'
  | 'rsvp_update'
  | 'new_family_member'
  | 'photo_approved'
  | 'storage_upgrade'
  | 'referral_verified';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  title_hindi: string | null;
  body: string;
  body_hindi: string | null;
  data: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export type StorageTier = 'base' | 'bronze' | 'silver' | 'gold';
export type ReferralProgramStatus = 'active' | 'waitlisted' | 'activated';

export interface UserStorage {
  id: string;
  user_id: string;
  base_storage_gb: number;
  referral_bonus_gb: number;
  purchased_gb: number;
  pool_id: string | null;
  used_storage_bytes: number;
  referral_code: string;
  verified_referral_count: number;
  storage_tier: StorageTier;
  referral_program_status: ReferralProgramStatus;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'verified' | 'rejected';
  referred_at: string;
  verified_at: string | null;
}

export interface StoragePurchase {
  id: string;
  user_id: string;
  purchase_type: 'individual' | 'pool';
  storage_gb: number;
  amount_inr: number;
  billing_cycle: 'monthly' | 'annual';
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface FamilyStoragePool {
  id: string;
  admin_id: string;
  pool_name: string;
  total_storage_gb: number;
  used_storage_bytes: number;
  member_ids: string[];
  purchase_id: string | null;
  status: 'active' | 'cancelled' | 'expired';
  created_at: string;
  updated_at: string;
}

export type BundleType = 'shagun' | 'mangal' | 'maharaja' | 'puja' | 'gathering' | 'engagement';

export interface EventBundle {
  id: string;
  event_id: string;
  purchaser_id: string;
  bundle_type: BundleType;
  storage_gb: number;
  max_photos: number | null;
  video_allowed: boolean;
  gallery_expires_at: string;
  amount_inr: number;
  razorpay_payment_id: string | null;
  status: 'active' | 'expired' | 'extended' | 'archived';
  used_storage_bytes: number;
  photo_count: number;
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
  // Joined
  reporter?: User;
}

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'profile_update'
  | 'post_create'
  | 'post_delete'
  | 'event_create'
  | 'event_delete'
  | 'family_add'
  | 'family_remove'
  | 'photo_moderate'
  | 'report_resolve'
  | 'admin_action'
  | 'account_deactivate'
  | 'content_report';

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
  // Joined
  actor?: User;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
  // Joined
  blocked_user?: User;
}

export interface AppSetting {
  key: string;
  value: any;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

// ─── v0.3 Types ─────────────────────────────────────────────────────────────

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'profile_photo_url'>;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type?: 'text' | 'voice';
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'profile_photo_url'>;
}

export interface ConversationSummary {
  userId: string;
  displayName: string;
  displayNameHindi: string | null;
  profilePhotoUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface OnboardingProgress {
  user_id: string;
  added_parent: boolean;
  added_sibling: boolean;
  made_first_post: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ReactionType = 'like' | 'namaste';

// ─── v0.4 Types ─────────────────────────────────────────────────────────────

export interface Story {
  id: string;
  author_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  expires_at: string;
  view_count: number;
  created_at: string;
  author?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'profile_photo_url'>;
  is_viewed?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  text_hindi?: string;
  vote_count: number;
}

export interface PostPoll {
  id: string;
  post_id: string;
  question: string;
  options: PollOption[];
  expires_at: string | null;
  created_at: string;
  my_vote?: string | null;
}

// ─── v0.5 Support Tickets ───────────────────────────────────────────────────

export type SupportTicketCategory =
  | 'billing' | 'account' | 'bug_report' | 'feature_request' | 'complaint' | 'general';

export type SupportTicketStatus =
  | 'open' | 'assigned' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';

export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type AdminRole = 'super_admin' | 'admin' | 'manager';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  category: SupportTicketCategory;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  first_response_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'phone_number' | 'profile_photo_url'>;
  assigned_agent?: Pick<User, 'id' | 'display_name'> | null;
  message_count?: number;
  last_message?: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_from_support: boolean;
  is_internal_note: boolean;
  attachment_url: string | null;
  created_at: string;
  // Joined
  sender?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'profile_photo_url'>;
}

// ─── v0.4.3 Life Events & Sutak ─────────────────────────────────────────────

export type LifeEventType = 'birth' | 'death';
export type BabyGender = 'boy' | 'girl' | 'not_disclosed';

export interface SutakRules {
  noTempleVisit: boolean;          // मंदिर न जाएं
  noReligiousCeremonies: boolean;  // हवन / यज्ञ आदि न करें
  noPujaAtHome: boolean;           // घर में पूजा न करें
  noAuspiciousWork: boolean;       // मांगलिक कार्य न करें
  noFoodSharing: boolean;          // दूसरों को भोजन न परोसें
  noNewVentures: boolean;          // नया कार्य शुरू न करें
  customNotes: string;             // परिवार की विशेष बातें
}

export interface LifeEvent {
  id: string;
  created_by: string;
  event_type: LifeEventType;
  person_name: string;
  person_name_hindi: string | null;
  event_date: string;              // ISO date string
  relationship: string | null;

  // Birth-specific
  baby_gender: BabyGender | null;
  birth_place: string | null;

  // Death-specific
  age_at_death: number | null;

  // Sutak
  sutak_enabled: boolean;
  sutak_days: number;
  sutak_start_date: string | null;
  sutak_end_date: string | null;
  sutak_rules: SutakRules;

  notes: string | null;
  is_visible_to_family: boolean;
  created_at: string;
  updated_at: string;

  // Joined
  creator?: Pick<User, 'id' | 'display_name' | 'display_name_hindi' | 'profile_photo_url'>;
}
