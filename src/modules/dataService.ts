import { supabase } from './supabase'
import type { MemorialEntry } from './types'
import type { Database } from './database.types'

type MemorialRow = Database['public']['Tables']['memorials']['Row']

export async function fetchMemorials(includeUnverified = false): Promise<MemorialEntry[]> {
  try {
    let query = supabase
      .from('memorials')
      .select('*')
      .order('date', { ascending: false })

    if (!includeUnverified) {
      query = query.eq('verified', true)
    }

    const { data, error } = await query

    if (error) {
      if (import.meta.env.DEV) {
        console.info('Supabase fetch failed, falling back to local JSON')
      }
      return fetchStaticMemorials()
    }

    // Only fallback if data is null/undefined (unexpected error)
    if (data === null) {
      if (import.meta.env.DEV) {
        console.info('No data returned from Supabase, falling back to local JSON')
      }
      return fetchStaticMemorials()
    }

    // If we are in Supabase mode and have data (even empty array), return it
    if (import.meta.env.DEV) {
      console.info(`Fetched ${data.length} entries from Supabase`)
    }
    return data.map(mapRowToEntry)
  } catch (e) {
    if (import.meta.env.DEV) {
      console.info('Supabase connection error, falling back to local JSON')
    }
    return fetchStaticMemorials()
  }
}

export async function verifyMemorial(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await (supabase as any)
      .from('memorials')
      .update({ verified: true })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function deleteMemorial(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await (supabase as any)
      .from('memorials')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function submitMemorial(entry: Partial<MemorialEntry>): Promise<{ success: boolean; error?: string }> {
  try {
    const isEditing = !!entry.id
    
    // Check for duplicates if this is a new entry
    if (!isEditing) {
      const { data: existing } = await (supabase as any)
        .from('memorials')
        .select('id, name, media, source_links')
        .or(`name.eq."${entry.name}", media->>xPost.eq."${entry.media?.xPost}"`)

      if (existing && existing.length > 0) {
        return { success: false, error: `A memorial with this name or URL already exists.` }
      }
    }

    const id = entry.id || entry.name?.toLowerCase().trim().replace(/\s+/g, '-') || `submission-${Date.now()}`
    
    const dataToSave = {
      id,
      name: entry.name || 'Unknown',
      name_fa: entry.name_fa || null,
      city: entry.city || 'Unknown',
      city_fa: entry.city_fa || null,
      location: entry.location || '',
      location_fa: entry.location_fa || null,
      date: entry.date || new Date().toISOString().split('T')[0],
      bio: entry.bio || '',
      bio_fa: entry.bio_fa || null,
      coords: (entry.coords || { lat: 35.6892, lon: 51.3890 }) as any,
      media: (entry.media || {}) as any,
      source_links: (entry.references || []) as any,
      testimonials: (entry.testimonials || []) as any,
      // If editing, preserve verified status if not explicitly provided
      verified: entry.verified ?? false
    }

    const { error } = await (supabase as any)
      .from('memorials')
      .upsert(dataToSave)

    if (error) {
      console.error('Supabase save error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e) {
    console.error('Save failed:', e)
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

async function fetchStaticMemorials(): Promise<MemorialEntry[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/memorials.json`)
  return response.json()
}

function mapRowToEntry(row: MemorialRow): MemorialEntry {
  return {
    id: row.id,
    name: row.name,
    name_fa: row.name_fa || undefined,
    city: row.city,
    city_fa: row.city_fa || undefined,
    location: row.location || '',
    location_fa: row.location_fa || undefined,
    date: row.date,
    coords: row.coords as { lat: number; lon: number },
    bio: row.bio,
    bio_fa: row.bio_fa || undefined,
    testimonials: Array.isArray(row.testimonials) ? (row.testimonials as string[]) : undefined,
    media: row.media as MemorialEntry['media'],
    references: (row.source_links as MemorialEntry['references']) || [],
    verified: row.verified
  }
}
