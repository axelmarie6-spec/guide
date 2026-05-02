import { CITY_SCHEDULE, EMERGENCY } from './travel'

const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL    = 'google/gemini-2.0-flash-001'

const CITY_LABELS = {
  bruxelles: 'Bruxelles 🇧🇪',
  amsterdam: 'Amsterdam 🇳🇱',
  berlin:    'Berlin 🇩🇪',
  prague:    'Prague 🇨🇿',
  budapest:  'Budapest 🇭🇺',
  vienne:    'Vienne 🇦🇹',
  geneve:    'Genève 🇨🇭',
}

function fmtTime(t) {
  if (!t) return '—'
  return t.slice(0, 5)
}

function fmtDate(d) {
  if (!d) return '—'
  const months = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc']
  const [, m, day] = d.split('-')
  return `${parseInt(day)} ${months[parseInt(m) - 1]}`
}

export const SUGGEST_ACTIVITY_TOOL = {
  type: 'function',
  function: {
    name: 'suggest_activity',
    description: "Propose une activité concrète à ajouter au deck de votes du groupe. N'appelle cet outil que pour une suggestion précise et réaliste — pas pour des généralités.",
    parameters: {
      type: 'object',
      required: ['name', 'description', 'category', 'city'],
      properties: {
        name:        { type: 'string', description: 'Nom court et clair de l\'activité (max 60 chars)' },
        description: { type: 'string', description: 'Description en 1-2 phrases, concrète et utile' },
        category:    { type: 'string', enum: ['culture', 'nature', 'food', 'nightlife', 'shopping', 'sport', 'other'] },
        price_eur:   { type: 'number', description: 'Prix estimé en euros par personne. 0 si gratuit.' },
        city:        { type: 'string', enum: ['bruxelles', 'amsterdam', 'berlin', 'prague', 'budapest', 'vienne', 'geneve'] },
        latitude:    { type: 'number', description: 'Latitude GPS exacte (ex: 52.3702). À inclure UNIQUEMENT si tu es certain à 100% de la localisation précise. Omets si le moindre doute.' },
        longitude:   { type: 'number', description: 'Longitude GPS exacte (ex: 4.8952). À inclure UNIQUEMENT si tu es certain à 100% de la localisation précise. Omets si le moindre doute.' },
      },
    },
  },
}

export function buildSystemPrompt({ today, currentCity, activitiesByCity, trains, airbnbs, weather }) {
  const schedule = CITY_SCHEDULE
    .map(c => `${CITY_LABELS[c.city]} : ${c.from} → ${c.to}`)
    .join('\n')

  const deckLines = CITY_SCHEDULE.map(c => {
    const acts = (activitiesByCity[c.city] || []).map(a => a.name)
    return `${CITY_LABELS[c.city]} : ${acts.length ? acts.join(', ') : 'aucune'}`
  }).join('\n')

  const stepLine = currentCity
    ? `${CITY_LABELS[currentCity.city]} (du ${currentCity.from} au ${currentCity.to})`
    : 'Hors itinéraire'

  // ── Trains ──────────────────────────────────────────────────
  const trainsSection = trains.length > 0
    ? trains
        .sort((a, b) => a.leg_order - b.leg_order)
        .map(t => {
          const parts = [
            `${fmtDate(t.date)} · ${t.from_station} → ${t.to_station}`,
            t.departure_time ? `  Départ : ${fmtTime(t.departure_time)}` : null,
            t.arrival_time   ? `  Arrivée : ${fmtTime(t.arrival_time)}` : null,
            t.train_number   ? `  Train : ${t.train_number}` : null,
            t.platform_dep   ? `  Voie départ : ${t.platform_dep}` : null,
            t.platform_arr   ? `  Voie arrivée : ${t.platform_arr}` : null,
            t.is_connection  ? '  ⚠️ Correspondance' : null,
            t.notes          ? `  Note : ${t.notes}` : null,
          ].filter(Boolean)
          return parts.join('\n')
        })
        .join('\n\n')
    : 'Données non encore saisies'

  // ── Hébergements ────────────────────────────────────────────
  const airbnbsSection = airbnbs.length > 0
    ? CITY_SCHEDULE.map(c => {
        const a = airbnbs.find(x => x.city === c.city)
        if (!a) return `${CITY_LABELS[c.city]} : non renseigné`
        const parts = [`${CITY_LABELS[c.city]} (${c.from} → ${c.to})`]
        if (a.address)       parts.push(`  Adresse : ${a.address}`)
        if (a.checkin_time)  parts.push(`  Check-in : ${a.checkin_time}`)
        if (a.checkout_time) parts.push(`  Check-out : ${a.checkout_time}`)
        if (a.wifi_name)     parts.push(`  Wifi : ${a.wifi_name}`)
        if (a.instructions)  parts.push(`  Instructions : ${a.instructions}`)
        return parts.join('\n')
      }).join('\n\n')
    : 'Données non encore saisies'

  // ── Météo ────────────────────────────────────────────────────
  let weatherSection = 'Données non disponibles (ouvre le dashboard pour charger la météo)'
  if (weather) {
    const parts = [`${weather.temp}°C · ${weather.desc}`]
    if (weather.min != null && weather.max != null) parts.push(`min ${weather.min}° / max ${weather.max}°`)
    if (weather.forecast?.length) {
      parts.push(`Prévisions : ${weather.forecast.map(f => `${f.time} ${f.emoji} ${f.temp}°`).join(' · ')}`)
    }
    weatherSection = parts.join(' · ')
  }

  // ── Urgences ────────────────────────────────────────────────
  const emergencySection = CITY_SCHEDULE.map(c => {
    const e = EMERGENCY[c.city]
    if (!e) return null
    return `${CITY_LABELS[c.city]} (${e.country}) : urgences ${e.general}, police ${e.police}, SAMU ${e.samu}`
  }).filter(Boolean).join('\n')

  return `Tu es Oracle, l'assistant de voyage exclusif du groupe Travel Hub (5 amis).
Ton domaine est UNIQUEMENT ce voyage en Europe : villes visitées, activités, restaurants, transports, histoire, culture, anecdotes, conseils pratiques liés au voyage.
Décline poliment et brièvement toute demande sans rapport avec ce voyage.

══ ITINÉRAIRE ══════════════════════════════════
${schedule}

══ AUJOURD'HUI ═════════════════════════════════
Date : ${today}
Étape : ${stepLine}

══ TRAJETS FERROVIAIRES ════════════════════════
${trainsSection}

══ HÉBERGEMENTS ════════════════════════════════
${airbnbsSection}

══ NUMÉROS D'URGENCE ═══════════════════════════
${emergencySection}

══ MÉTÉO AUJOURD'HUI ═══════════════════════════
${weatherSection}

══ ACTIVITÉS DÉJÀ DANS LE DECK ════════════════
(Ne propose pas ce qui existe déjà)
${deckLines}

Réponds toujours en français, de façon concise — l'app est sur mobile.
Quand tu veux proposer une activité concrète à ajouter au deck de votes, appelle suggest_activity. Une seule suggestion à la fois.`
}

export async function* streamChat({ messages, systemPrompt }) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!apiKey) throw new Error('VITE_OPENROUTER_API_KEY manquant')

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Travel Hub Oracle',
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      tools: [SUGGEST_ACTIVITY_TOOL],
      tool_choice: 'auto',
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`OpenRouter ${res.status}: ${err}`)
  }

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let tcName = ''
  let tcArgs = ''
  let buffer  = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += dec.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') continue
      try {
        const { choices } = JSON.parse(raw)
        const choice = choices?.[0]
        if (!choice) continue
        const delta = choice.delta ?? {}

        if (delta.content) yield { type: 'text', content: delta.content }

        if (delta.tool_calls?.[0]) {
          const tc = delta.tool_calls[0]
          if (tc.function?.name)      tcName += tc.function.name
          if (tc.function?.arguments) tcArgs += tc.function.arguments
        }

        if (choice.finish_reason === 'tool_calls' && tcName) {
          try {
            yield { type: 'tool_call', name: tcName, args: JSON.parse(tcArgs) }
          } catch {
            // malformed args — ignore
          }
        }
      } catch {
        // skip malformed SSE chunk
      }
    }
  }
}
