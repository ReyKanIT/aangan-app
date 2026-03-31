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
  plus_count: number;
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
  uploader_id: string;
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
