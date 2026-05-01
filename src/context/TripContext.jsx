import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CITY_SCHEDULE } from '../lib/travel'
import { readCache, writeCache } from '../lib/dbCache'

function buildSchedule(overrides) {
  if (!overrides?.length) return CITY_SCHEDULE
  const map = Object.fromEntries(overrides.map(o => [o.city, o]))
  return CITY_SCHEDULE.map(c => ({
    ...c,
    from: map[c.city]?.date_from ?? c.from,
    to:   map[c.city]?.date_to   ?? c.to,
  }))
}

const TripContext = createContext(CITY_SCHEDULE)

export function TripProvider({ children }) {
  const [schedule, setSchedule] = useState(() => buildSchedule(readCache('trip_config_v1')))

  useEffect(() => {
    supabase.from('trip_config').select('*').then(({ data }) => {
      if (!data?.length) return
      writeCache('trip_config_v1', data)
      setSchedule(buildSchedule(data))
    })
  }, [])

  return <TripContext.Provider value={schedule}>{children}</TripContext.Provider>
}

export const useTripSchedule = () => useContext(TripContext)
