// ============================================================
// Database row types — matches Supabase schema exactly
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ScrapType = 'text' | 'image' | 'voice' | 'video' | 'gif'
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked'
export type TestimonialStatus = 'pending' | 'approved' | 'declined'
export type VibeType = 'funny' | 'wholesome' | 'unhinged' | 'iconic'
export type CommunityRole = 'member' | 'moderator' | 'owner'

// ---- Palette shape stored in themes.palette ----
export type ThemePalette = {
  background: string
  primary: string
  secondary: string
  accent: string
  text: string
  font: string
}

// ============================================================
// Table row shapes
// ============================================================

export type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  theme_id: string | null
  theme?: ThemePalette | Theme | string | null
  visitor_log_opt_in: boolean
  created_at: string
}

export type Theme = {
  id: string
  owner_id: string | null
  name: string
  palette: ThemePalette
  banner_url: string | null
  is_public: boolean
  created_at: string
}

export type Friendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
}

export type Scrap = {
  id: string
  author_id: string
  recipient_id: string
  type: ScrapType
  content?: string | null
  media_url?: string | null
  transcript?: string | null
  mood?: string | null
  decorations?: Json
  created_at: string
}

export type Testimonial = {
  id: string
  author_id: string
  recipient_id: string
  content: string
  status?: TestimonialStatus
  ai_assisted?: boolean
  traits?: string[]
  created_at: string
  approved_at?: string | null
}

export type Reaction = {
  id: string
  scrap_id?: string | null
  testimonial_id?: string | null
  user_id: string
  vibe: VibeType
}

export type Community = {
  id: string
  name: string
  description?: string | null
  banner_url?: string | null
  creator_id: string
  created_at: string
}

export type CommunityMember = {
  community_id: string
  user_id: string
  role?: CommunityRole
  joined_at?: string
}

export type CommunityPost = {
  id: string
  community_id: string
  author_id: string
  content: string
  media_url?: string | null
  created_at: string
}

export type ProfileVisit = {
  id: string
  visitor_id: string
  visited_id: string
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  payload: NotificationPayload
  read: boolean
  created_at: string
}

// ============================================================
// Notification type union
// ============================================================

export type NotificationType =
  | 'new_scrap'
  | 'testimonial_request'
  | 'testimonial_submitted'
  | 'testimonial_approved'
  | 'friend_request'

export type NotificationPayload =
  | { scrap_id: string; author_id: string; author_display_name: string }
  | { requester_id: string; requester_display_name: string }
  | { testimonial_id: string; author_id: string; author_display_name: string }
  | { testimonial_id: string; recipient_id: string }

// ============================================================
// RPC return types
// ============================================================

export type OnThisDayScrap = {
  id: string
  author_id: string
  author_display_name: string
  type: ScrapType
  content: string | null
  media_url: string | null
  created_at: string
  years_ago: number
}

export type MutualVisitor = {
  visitor_id: string
  visitor_display_name: string
  visitor_avatar_url: string | null
  visited_at: string
}

// ============================================================
// Database generic type (for createClient<Database>)
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Profile>; Relationships: any[] }
      themes: { Row: Theme; Insert: Omit<Theme, 'created_at'>; Update: Partial<Theme>; Relationships: any[] }
      friendships: { Row: Friendship; Insert: Omit<Friendship, 'id' | 'created_at'>; Update: Partial<Friendship>; Relationships: any[] }
      scraps: { Row: Scrap; Insert: Omit<Scrap, 'id' | 'created_at'>; Update: Partial<Scrap>; Relationships: any[] }
      testimonials: { Row: Testimonial; Insert: Omit<Testimonial, 'id' | 'created_at' | 'approved_at'>; Update: Partial<Testimonial>; Relationships: any[] }
      reactions: { Row: Reaction; Insert: Omit<Reaction, 'id'>; Update: Partial<Reaction>; Relationships: any[] }
      communities: { Row: Community; Insert: Omit<Community, 'id' | 'created_at'>; Update: Partial<Community>; Relationships: any[] }
      community_members: { Row: CommunityMember; Insert: Omit<CommunityMember, 'joined_at'> & { joined_at?: string }; Update: Partial<CommunityMember>; Relationships: any[] }
      community_posts: { Row: CommunityPost; Insert: Omit<CommunityPost, 'id' | 'created_at'>; Update: Partial<CommunityPost>; Relationships: any[] }
      profile_visits: { Row: ProfileVisit; Insert: Omit<ProfileVisit, 'id' | 'created_at'>; Update: never; Relationships: any[] }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Notification>; Relationships: any[] }
    }
    Functions: {
      log_profile_visit: { Args: { visited_id: string }; Returns: void }
      request_testimonial: { Args: { recipient_id: string }; Returns: { notification_id: string; success: boolean } }
      approve_testimonial: { Args: { testimonial_id: string }; Returns: { success: boolean; approved_at: string } }
      decline_testimonial: { Args: { testimonial_id: string }; Returns: { success: boolean } }
      get_on_this_day: { Args: { user_id: string }; Returns: OnThisDayScrap[] }
      get_mutual_visitors: { Args: { user_id: string }; Returns: MutualVisitor[] }
    }
    Views: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
