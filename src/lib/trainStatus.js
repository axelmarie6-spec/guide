import { useState, useEffect } from 'react'

// Real-time train delay queries
// Coverage: DB/ICE (v6.db.transport.rest), SNCB/Eurostar (iRail), SBB (opendata.ch), NS (requires VITE_NS_API_KEY)
// No coverage: SNCF leg 1, RJ 275 (Praha→Budapest), RJX 64 (Budapest→Wien), RJX 13470 (Wien→Zürich), leg 5 (no train number)

const CACHE = new Map()
const TTL = 5 * 60 * 1000

// Which API covers each train number — others return null (silent)
const SOURCES = {
  'EUR 9341': 'irail',  // Paris Nord → Bruxelles-Midi
  'ECD 9527': 'irail',  // Bruxelles-Midi → Amsterdam Zuid
  'IC 1833':  'ns',     // Amsterdam Zuid → Hilversum (needs VITE_NS_API_KEY)
  'RJ 173':   'db',     // Berlin Südkreuz → Praha-Holešovice
  'IC 734':   'sbb',    // Zürich HB → Genève
}

const DB_EVA = {
  'Berlin Südkreuz': '8011113',
  'Berlin Hbf': '8098160',
}

const NS_CODES = {
  'Amsterdam Zuid': 'ASDZ',
  'Amsterdam Centraal': 'AMS',
  'Hilversum': 'HVS',
}

const norm = s => s?.replace(/\s+/g, '').toUpperCase()

function isActiveDay(trainDate) {
  const pad = n => String(n).padStart(2, '0')
  const now = new Date()
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const diff = Math.round((new Date(trainDate + 'T12:00:00') - new Date(today + 'T12:00:00')) / 86400000)
  return diff >= -1 && diff <= 1
}

async function queryDB(train) {
  const evaId = DB_EVA[train.from_station]
  if (!evaId || !train.departure_time) return null
  const when = `${train.date}T${train.departure_time}:00`
  const url = `https://v6.db.transport.rest/stops/${evaId}/departures?when=${encodeURIComponent(when)}&duration=10&results=40`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const { departures } = await res.json()
  const dep = departures?.find(d => norm(d.line?.name) === norm(train.train_number))
  if (!dep) return { unavailable: true, source: 'DB' }
  return {
    delayMin: dep.delay != null ? Math.round(dep.delay / 60) : null,
    cancelled: dep.cancelled ?? false,
    platform: dep.platform ?? dep.plannedPlatform ?? null,
    unavailable: false,
    source: 'DB',
  }
}

async function queryIRail(train) {
  const id = train.train_number.replace(/\s+/g, '')
  const res = await fetch(`https://api.irail.be/vehicle/?id=${id}&format=json&lang=fr`, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const data = await res.json()
  const raw = data.stops?.stop ?? []
  const stops = Array.isArray(raw) ? raw : [raw]
  if (!stops.length) return { unavailable: true, source: 'iRail' }
  const keyword = train.from_station.toLowerCase().split(/[\s-]/)[0]
  const stop = stops.find(s => s.stationinfo?.name?.toLowerCase().includes(keyword)) ?? stops[0]
  return {
    delayMin: Math.round(parseInt(stop.departureDelay ?? '0') / 60),
    cancelled: stop.departureCanceled === '1' || stop.canceled === '1',
    platform: stop.platform ?? null,
    unavailable: false,
    source: 'iRail',
  }
}

async function queryNS(train) {
  const key = import.meta.env.VITE_NS_API_KEY
  if (!key) return { unavailable: true, source: 'NS', needsKey: true }
  const station = NS_CODES[train.from_station]
  if (!station) return null
  const res = await fetch(
    `https://gateway.apiportal.ns.nl/reisinformatie-api/api/v2/departures?station=${station}`,
    { headers: { 'Ocp-Apim-Subscription-Key': key }, signal: AbortSignal.timeout(8000) },
  )
  if (!res.ok) return null
  const data = await res.json()
  const dep = data.payload?.departures?.find(d => norm(d.name) === norm(train.train_number))
  if (!dep) return { unavailable: true, source: 'NS' }
  const delayMin = dep.actualDateTime && dep.plannedDateTime
    ? Math.round((new Date(dep.actualDateTime) - new Date(dep.plannedDateTime)) / 60000)
    : null
  return {
    delayMin,
    cancelled: dep.cancelled ?? false,
    platform: dep.actualTrack ?? dep.plannedTrack ?? null,
    unavailable: false,
    source: 'NS',
  }
}

async function querySBB(train) {
  if (!train.departure_time) return null
  const when = `${train.date}T${train.departure_time}:00`
  const url = `https://transport.opendata.ch/v1/stationboard?station=${encodeURIComponent(train.from_station)}&datetime=${encodeURIComponent(when)}&limit=50`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const data = await res.json()
  const entry = data.stationboard?.find(e => norm(`${e.category} ${e.number}`) === norm(train.train_number))
  if (!entry?.stop) return { unavailable: true, source: 'SBB' }
  const { stop } = entry
  const prognDep = stop.prognosis?.departure
  const delayMin = prognDep && stop.departure
    ? Math.round((new Date(prognDep) - new Date(stop.departure)) / 60000)
    : null
  return {
    delayMin,
    cancelled: stop.prognosis !== null && !prognDep,
    platform: stop.prognosis?.platform ?? stop.platform ?? null,
    unavailable: delayMin === null && !stop.prognosis,
    source: 'SBB',
  }
}

export async function fetchTrainStatus(train) {
  if (!train?.train_number) return null
  if (!isActiveDay(train.date)) return null
  const key = `${train.date}_${train.train_number}`
  const hit = CACHE.get(key)
  if (hit && Date.now() < hit.exp) return hit.data
  const src = SOURCES[train.train_number]
  if (!src) return null
  try {
    let r = null
    if (src === 'db')    r = await queryDB(train)
    if (src === 'irail') r = await queryIRail(train)
    if (src === 'ns')    r = await queryNS(train)
    if (src === 'sbb')   r = await querySBB(train)
    if (r) CACHE.set(key, { data: r, exp: Date.now() + TTL })
    return r
  } catch {
    return null
  }
}

export function useTrainStatus(train) {
  const [status, setStatus] = useState(null)
  useEffect(() => {
    if (!train) return
    let alive = true
    const run = () => fetchTrainStatus(train).then(s => { if (alive) setStatus(s) })
    run()
    const id = setInterval(run, TTL)
    return () => { alive = false; clearInterval(id) }
  }, [train?.train_number, train?.date])
  return status
}
