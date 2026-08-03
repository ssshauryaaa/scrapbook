// ============================================================
// App-level enriched types (DB rows + joined relations)
// ============================================================

import type {
  Profile,
  Scrap,
  ScrapType,
  Testimonial,
  TestimonialStatus,
  Reaction,
  VibeType,
  Friendship,
  FriendshipStatus,
  Community,
  CommunityPost,
  CommunityRole,
  Notification,
  NotificationType,
  Theme,
  ThemePalette,
} from './database'

export type {
  Profile,
  Scrap,
  ScrapType,
  Testimonial,
  TestimonialStatus,
  Reaction,
  VibeType,
  Friendship,
  FriendshipStatus,
  Community,
  CommunityPost,
  CommunityRole,
  Notification,
  NotificationType,
  Theme,
  ThemePalette,
}

// ---- Enriched profile with loaded theme ----
export interface ProfileWithTheme extends Profile {
  theme: Theme | null
}

// ---- Scrap with author profile embedded ----
export interface ScrapWithAuthor extends Scrap {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
  reactions: ReactionGroup[]
}

// ---- Grouped reactions per vibe ----
export interface ReactionGroup {
  vibe: VibeType
  count: number
  userReacted: boolean
}

// ---- Testimonial with both parties ----
export interface TestimonialWithParties extends Testimonial {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
  recipient: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
  reactions: ReactionGroup[]
}

// ---- Community with membership info ----
export interface CommunityWithMembership extends Community {
  member_count: number
  is_member: boolean
  user_role: CommunityRole | null
}

// ---- Community post with author ----
export interface CommunityPostWithAuthor extends CommunityPost {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

// ---- Notification with typed payload ----
export interface NotificationWithPayload extends Notification {
  // payload is already typed via the union in database.ts
}

// ---- Friendship with other party's profile ----
export interface FriendshipWithProfile extends Friendship {
  other_user: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

// ---- AI: Testimonial draft ----
export interface TestimonialDraft {
  id: string
  text: string
}

export type TestimonialTone = 'funny' | 'heartfelt' | 'roast' | 'formal'

// ---- AI: Generated theme ----
export interface GeneratedTheme {
  name: string
  palette: ThemePalette
  font: string
  bannerPrompt: string
  bannerUrl: string | null
}

// ---- Yearbook export ----
export type YearbookFormat = 'pdf' | 'png'

export interface YearbookExportResult {
  fileUrl: string
  expiresAt: string
}

// ---- Pagination cursor ----
export interface PageCursor {
  page: number
  pageSize: number
  hasMore: boolean
}
