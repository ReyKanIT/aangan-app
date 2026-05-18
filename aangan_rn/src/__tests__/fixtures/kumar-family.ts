/**
 * Sanitised fixture mirroring Kumar's family graph in prod (2026-05-17).
 * Used by component tests for KulvrikshTreeView + getGenerationOffset.
 *
 * Sourced from the May 17 baseline screenshot of the कुलवृक्ष tab on v0.16.0:
 *   - 4 online family_members rows: brother, sister, wife, daughter
 *   - 4 offline_family_members rows: father (Ram Abhilash), mother (Parvati),
 *     and two ancestors with relationship='अन्य' (unknown — exercises the
 *     fallback path of getGenerationOffset).
 *
 * IDs are deterministic stubs so test failures point to the same row each run.
 * NO real PII — display names are role-appropriate but not Kumar's actual ones.
 */
import type { FamilyMember, User } from '../../types/database';

const mkUser = (overrides: Partial<User>): User => ({
  id: 'stub',
  phone_number: '',
  display_name: '',
  display_name_hindi: null,
  profile_photo_url: null,
  village: null,
  state: null,
  family_level: 1,
  last_seen_at: null,
  ...overrides,
} as User);

const mkMember = (overrides: Partial<FamilyMember>): FamilyMember => ({
  id: 'stub-rel',
  user_id: 'kumar',
  family_member_id: 'stub-user',
  relationship_type: 'brother',
  relationship_label_hindi: 'भाई',
  connection_level: 1,
  is_verified: false,
  created_at: '2026-04-15T00:00:00Z',
  updated_at: '2026-04-15T00:00:00Z',
  ...overrides,
} as FamilyMember);

export const KUMAR_SELF = {
  id: 'kumar',
  displayName: 'Amit Kumar Rai',
  displayNameHindi: 'अमित कुमार राय',
  avatarUrl: null,
};

export const KUMAR_FAMILY: FamilyMember[] = [
  // Gen 0 — siblings + spouse
  mkMember({
    id: 'rel-brother',
    family_member_id: 'user-brother',
    relationship_type: 'brother',
    relationship_label_hindi: 'भाई',
    connection_level: 1,
    member: mkUser({ id: 'user-brother', display_name: 'Krishna Kumar', display_name_hindi: 'कृष्ण कुमार' }),
  }),
  mkMember({
    id: 'rel-sister',
    family_member_id: 'user-sister',
    relationship_type: 'sister',
    relationship_label_hindi: 'बहन',
    connection_level: 1,
    member: mkUser({ id: 'user-sister', display_name: 'Janaki', display_name_hindi: 'जानकी' }),
  }),
  mkMember({
    id: 'rel-wife',
    family_member_id: 'user-wife',
    relationship_type: 'wife',
    relationship_label_hindi: 'पत्नी',
    connection_level: 1,
    member: mkUser({ id: 'user-wife', display_name: 'Jyotsna', display_name_hindi: 'ज्योत्सना' }),
  }),
  // Gen +1 — daughter
  mkMember({
    id: 'rel-daughter',
    family_member_id: 'user-daughter',
    relationship_type: 'daughter',
    relationship_label_hindi: 'बेटी',
    connection_level: 1,
    member: mkUser({ id: 'user-daughter', display_name: 'Kanak', display_name_hindi: 'कनक' }),
  }),
  // Gen -1 — offline-adapted ancestors (father + mother)
  mkMember({
    id: 'offline-father',
    family_member_id: 'offline-user-father',
    relationship_type: 'father',
    relationship_label_hindi: 'पिता',
    connection_level: 1,
    member: mkUser({ id: 'offline-user-father', display_name: 'Ram Abhilash', display_name_hindi: 'राम अभिलाष' }),
  }),
  mkMember({
    id: 'offline-mother',
    family_member_id: 'offline-user-mother',
    relationship_type: 'mother',
    relationship_label_hindi: 'माता',
    connection_level: 1,
    member: mkUser({ id: 'offline-user-mother', display_name: 'Parvati', display_name_hindi: 'पार्वती' }),
  }),
  // Unknown relationship — exercises the fallback (defaults to gen 0)
  mkMember({
    id: 'offline-unknown1',
    family_member_id: 'offline-user-unknown1',
    relationship_type: 'other',
    relationship_label_hindi: 'अन्य',
    connection_level: 2,
    member: mkUser({ id: 'offline-user-unknown1', display_name: 'Amaina Lal', display_name_hindi: null }),
  }),
  mkMember({
    id: 'offline-unknown2',
    family_member_id: 'offline-user-unknown2',
    relationship_type: 'other',
    relationship_label_hindi: 'अन्य',
    connection_level: 2,
    member: mkUser({ id: 'offline-user-unknown2', display_name: 'Lalji Ramdas', display_name_hindi: null }),
  }),
];

// Single-member fixture for the "minimum viable" tree test.
export const SINGLE_MEMBER: FamilyMember[] = [
  mkMember({
    id: 'rel-wife-only',
    family_member_id: 'user-wife-only',
    relationship_type: 'wife',
    relationship_label_hindi: 'पत्नी',
    connection_level: 1,
    member: mkUser({ id: 'user-wife-only', display_name: 'Jyotsna' }),
  }),
];
