import { supabase } from './supabase'

const CACHE_NAME = 'pdf-cache-v1'

export async function getCachedPdf(storagePath) {
  if (!('caches' in window)) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const res = await cache.match(storagePath)
    if (!res) return null
    return await res.blob()
  } catch { return null }
}

export async function setPdfCache(storagePath, blob) {
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(storagePath, new Response(blob, { headers: { 'Content-Type': 'application/pdf' } }))
  } catch {}
}

export async function prefetchAllPdfs() {
  if (!('caches' in window) || !navigator.onLine) return
  try {
    const { data: pdfs } = await supabase.from('ticket_pdfs').select('storage_path')
    if (!pdfs?.length) return
    const cache = await caches.open(CACHE_NAME)
    for (const { storage_path } of pdfs) {
      try {
        if (await cache.match(storage_path)) continue
        const { data, error } = await supabase.storage.from('tickets').download(storage_path)
        if (error || !data) continue
        await cache.put(storage_path, new Response(data, { headers: { 'Content-Type': 'application/pdf' } }))
      } catch {}
    }
  } catch {}
}
