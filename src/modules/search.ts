import type { MemorialEntry } from './types'

type OnResults = (entries: MemorialEntry[]) => void

export function setupSearch(all: MemorialEntry[], onResults: OnResults) {
  const searchInput = document.getElementById('search-input') as HTMLInputElement
  console.log(`Search setup with ${all.length} entries`)

  // Remove existing listener to avoid duplicates if re-setup
  const newApply = () => {
    const q = (searchInput?.value ?? '').trim().toLowerCase()
    
    // Debug log - remove in production
    // console.log(`Searching for "${q}" in ${all.length} entries`)

    const res = all.filter((e) => {
      // Allow searching for unverified memorials in search if they are in the list
      const matchesQ =
        !q ||
        (e.name || '').toLowerCase().includes(q) ||
        (e.name_fa || '').toLowerCase().includes(q) ||
        (e.city || '').toLowerCase().includes(q) ||
        (e.city_fa || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.location_fa || '').toLowerCase().includes(q) ||
        (e.bio || '').toLowerCase().includes(q) ||
        (e.bio_fa || '').toLowerCase().includes(q)
      
      return matchesQ
    })
    
    onResults(res)
  }

  // Use a named function to allow cleanup if needed, but for now we replace the listener by cloning or just adding
  searchInput?.removeEventListener('input', (searchInput as any)._currentListener)
  searchInput?.addEventListener('input', newApply)
  ;(searchInput as any)._currentListener = newApply
  
  newApply()
}

