import { supabase } from './supabase'

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString()
}

export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export interface LevelInfo {
  emoji: string
  label: string
  level: number
  minPoints: number
  nextMin: number
  progress: number
}

const LEVELS = [
  { level: 1, label: 'Newcomer',  emoji: '🌱', minPoints: 0 },
  { level: 2, label: 'Explorer',  emoji: '🗺️', minPoints: 100 },
  { level: 3, label: 'Scholar',   emoji: '📖', minPoints: 500 },
  { level: 4, label: 'Expert',    emoji: '🏆', minPoints: 1500 },
  { level: 5, label: 'Legend',    emoji: '⭐', minPoints: 5000 },
]

export function levelFromPoints(pts: number): LevelInfo {
  let current = LEVELS[0]
  let next: typeof LEVELS[0] | null = null
  for (let i = 0; i < LEVELS.length; i++) {
    if (pts >= LEVELS[i].minPoints) {
      current = LEVELS[i]
      next = LEVELS[i + 1] ?? null
    }
  }
  const nextMin = next?.minPoints ?? current.minPoints
  const progress = next
    ? (pts - current.minPoints) / (nextMin - current.minPoints)
    : 1
  return { ...current, nextMin, progress: Math.max(0, Math.min(1, progress)) }
}

/** Star calc per spec: 0-19%=0, 20-39%=1, 40-59%=2, 60-74%=3 (pass), 75-89%=4, 90-100%=5 */
export function starsFromScore(score: number): { stars: number; passed: boolean } {
  const pct = score * 100
  let stars = 0
  if (pct >= 90) stars = 5
  else if (pct >= 75) stars = 4
  else if (pct >= 60) stars = 3
  else if (pct >= 40) stars = 2
  else if (pct >= 20) stars = 1
  return { stars, passed: stars >= 3 }
}

/** Upload to Supabase Storage; returns public URL or null on failure. */
export async function uploadToStorage(
  file: File,
  folder: 'avatars' | 'banners' | 'logos' | 'posts'
): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now()
    const path = `${folder}/${id}.${ext}`

    const { error } = await supabase.storage
      .from('community-images')
      .upload(path, file, { contentType: file.type, upsert: true })
    if (error) {
      console.error('Storage upload error:', error)
      return null
    }
    const { data } = supabase.storage.from('community-images').getPublicUrl(path)
    return data.publicUrl
  } catch (e) {
    console.error('Storage upload exception:', e)
    return null
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
    // fallback
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif'
export const BG_COLOR = '#F2F2F7'
export const PRIMARY = '#7C3AED'
export const PRIMARY_DARK = '#5B21B6'
export const BLUE_BADGE = '#1D9BF0'
