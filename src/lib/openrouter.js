import { CITY_SCHEDULE } from './travel'

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
      },
    },
  },
}

export function buildSystemPrompt({ today, currentCity, activitiesByCity }) {
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

  return `Tu es Oracle, l'assistant de voyage exclusif du groupe Travel Hub (5 amis).
Ton domaine est UNIQUEMENT ce voyage en Europe : villes visitées, activités, restaurants, transports, histoire, culture, anecdotes, conseils pratiques liés au voyage.
Decline poliment et brièvement toute demande sans rapport avec ce voyage.

══ ITINÉRAIRE ══════════════════════════════
${schedule}

══ AUJOURD'HUI ═════════════════════════════
Date : ${today}
Étape : ${stepLine}

══ ACTIVITÉS DÉJÀ DANS LE DECK ════════════
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
