// Shared DB types — match Supabase schema exactly.

export interface Profile {
  id: string                // community_profiles.id (NOT auth.uid)
  clarity_id: string        // = auth.uid()
  display_name: string | null
  avatar_emoji: string | null
  avatar_url: string | null
  bio: string | null
  total_points: number | null
  level: number | null
  country: string | null
  interests: string | null  // comma-separated category slugs
  created_at: string
  is_verified: boolean
  is_ceo: boolean
  is_banned: boolean
  system_warning: string | null
}

export interface Community {
  id: string
  name: string
  description: string | null
  category: string | null
  emoji: string | null
  cover_color: string | null
  cover_image_url: string | null
  logo_image_url: string | null
  member_count: number | null
  post_count: number | null
  is_private: boolean | null
  created_by: string | null
  created_at: string
  price_type: string | null
  price_amount: number | null
  post_permission: string | null
  is_banned: boolean | null
  community_type: string | null
  invite_code: string | null
}

export interface CommunityMember {
  id: string
  community_id: string
  profile_id: string
  role: 'admin' | 'moderator' | 'member'
  points: number
  level: number
  joined_at: string
}

export interface Post {
  id: string
  community_id: string
  author_id: string
  author_name: string
  author_avatar: string | null
  author_photo_url: string | null
  author_is_verified: boolean
  title: string | null
  content: string
  post_type: PostType
  image_url: string | null
  event_date: string | null
  like_count: number
  comment_count: number
  is_pinned: boolean
  is_announcement: boolean
  meeting_url: string | null
  subgroup_id: string | null
  subgroup_name: string | null
  created_at: string
}

export type PostType = 'text' | 'image' | 'poll' | 'event' | 'announcement' | 'question' | 'win' | 'live'

export interface Comment {
  id: string
  post_id: string
  author_id: string
  author_name: string
  author_avatar: string | null
  author_photo_url: string | null
  author_is_verified: boolean
  content: string
  like_count: number
  parent_comment_id: string | null
  created_at: string
}

export interface Course {
  id: string
  community_id: string
  title: string
  description: string | null
  cover_emoji: string | null
  cover_color: string | null
  cover_image_url: string | null
  created_by: string | null
  order_index: number
  lesson_count: number
  created_at: string
  avg_rating: number
  review_count: number
}

export interface Lesson {
  id: string
  course_id: string
  title: string
  content: string | null  // JSON-encoded LessonBlock[]
  video_url: string | null
  image_url: string | null
  meeting_url: string | null
  is_free_preview: boolean
  duration_minutes: number | null
  order_index: number
  created_at: string
}

export type LessonBlockType = 'text' | 'formula' | 'code' | 'graph' | 'image' | 'cellDiagram' | 'supplyDemand'

export interface LessonBlock {
  id: string
  type: LessonBlockType
  content: string
  imageURLOrBase64?: string | null
  accentColor?: string
  isHighlighted?: boolean
}

export interface Subgroup {
  id: string
  community_id: string
  name: string
  emoji: string | null
  created_by: string | null
  created_at: string
  post_count: number
}

export interface CourseTest {
  id: string
  course_id: string
  community_id: string
  created_by: string | null
  title: string
  created_at: string
}

export type QuestionType = 'multipleChoice' | 'trueFalse' | 'fillInBlank' | 'freeResponse'

export interface TestQuestion {
  id: string
  test_id: string
  question_type: QuestionType
  question_text: string
  options_json: string | null   // JSON array of strings for MC
  correct_answer: string | null
  order_index: number
}

export interface TestResult {
  id: string
  test_id: string
  course_id: string
  community_id: string
  profile_id: string
  score: number
  stars: number
  passed: boolean
  completed_at: string
}

export const AVATAR_EMOJIS = ['😊','😎','🤓','🦊','🐱','🦁','🐻','🦄','🐺','🐸','🐧','🦉','🌟','🔥','💎','🎯']

export const CATEGORIES = [
  { id: 'study', label: 'Study', emoji: '📚' },
  { id: 'programming', label: 'Programming', emoji: '💻' },
  { id: 'languages', label: 'Languages', emoji: '🌍' },
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'arts', label: 'Arts', emoji: '🎨' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'general', label: 'General', emoji: '💬' },
] as const

export const CEO_EMAIL = 'clarity.support@icloud.com'
