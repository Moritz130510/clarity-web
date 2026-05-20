import { supabase } from '@/lib/supabase'
import CommunityDetailClient from './CommunityDetailClient'
import { notFound } from 'next/navigation'
export const dynamic = 'force-dynamic'

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: community, error } = await supabase
    .from('communities')
    .select('id, name, description, category, emoji, cover_image_url, logo_image_url, member_count, price_type, created_by, is_private')
    .eq('id', id)
    .single()

  if (error || !community) return notFound()

  return <CommunityDetailClient community={community} />
}
