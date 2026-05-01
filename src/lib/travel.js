// Données statiques du voyage — ville active selon la date

export const STATION_MAP = {
  'Bruxelles-Midi':       'https://www.belgiantrain.be/fr/stations/bruxelles-midi',
  'Berlin Südkreuz':      'https://www.bahnhof.de/berlin-suedkreuz',
  'Praha Hlavní nádraží': 'https://www.cd.cz/cs/stanice/Praha_hl.n./',
  'Wien Hbf':             'https://www.oebb.at/de/reisen-services/an-und-abreise/bahnhof/wien-hauptbahnhof',
  'Zürich HB':            'https://www.sbb.ch/de/bahnhof-services/am-bahnhof/bahnhoefe/zuerich-hb.html',
}

export function getStationMapUrl(stationName) {
  if (!stationName) return null
  return STATION_MAP[stationName] ?? null
}

export const CITY_SCHEDULE = [
  { city: 'bruxelles', label: 'Bruxelles', flag: '🇧🇪', currency: 'EUR', from: '2026-08-01', to: '2026-08-03' },
  { city: 'amsterdam', label: 'Amsterdam', flag: '🇳🇱', currency: 'EUR', from: '2026-08-04', to: '2026-08-07' },
  { city: 'berlin',    label: 'Berlin',    flag: '🇩🇪', currency: 'EUR', from: '2026-08-08', to: '2026-08-10' },
  { city: 'prague',    label: 'Prague',    flag: '🇨🇿', currency: 'CZK', from: '2026-08-11', to: '2026-08-13' },
  { city: 'budapest',  label: 'Budapest',  flag: '🇭🇺', currency: 'HUF', from: '2026-08-14', to: '2026-08-17' },
  { city: 'vienne',    label: 'Vienne',    flag: '🇦🇹', currency: 'EUR', from: '2026-08-18', to: '2026-08-20' },
  { city: 'geneve',    label: 'Genève',    flag: '🇨🇭', currency: 'CHF', from: '2026-08-21', to: '2026-08-31' },
]

// Jours de transit (pas de ville d'arrivée fixe toute la journée)
export const TRAVEL_DAYS = ['2026-08-01', '2026-08-04', '2026-08-08', '2026-08-11', '2026-08-14', '2026-08-18', '2026-08-21']

function localDateStr(date = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export function getCurrentCity(date = new Date()) {
  const d = localDateStr(date)
  return CITY_SCHEDULE.find(c => d >= c.from && d <= c.to) ?? null
}

export function isTravelDay(date = new Date()) {
  return TRAVEL_DAYS.includes(localDateStr(date))
}

// Numéros d'urgence par pays
export const EMERGENCY = {
  bruxelles: {
    country: 'Belgique',
    general: '112',
    police: '101',
    samu: '100',
    pompiers: '100',
    embassy: '+32 2 549 87 11',
    embassyAddress: 'Rue Ducale 65, 1000 Bruxelles',
  },
  amsterdam: {
    country: 'Pays-Bas',
    general: '112',
    police: '0900-8844',
    samu: '112',
    pompiers: '112',
    embassy: '+31 70 312 58 00',
    embassyAddress: 'Smidsplein 1, La Haye',
  },
  berlin: {
    country: 'Allemagne',
    general: '112',
    police: '110',
    samu: '112',
    pompiers: '112',
    embassy: '+49 30 590039000',
    embassyAddress: 'Pariser Platz 5, 10117 Berlin',
  },
  prague: {
    country: 'Tchéquie',
    general: '112',
    police: '158',
    samu: '155',
    pompiers: '150',
    embassy: '+420 251 171 711',
    embassyAddress: 'Velkopřevorské náměstí 2, 118 00 Prague',
  },
  budapest: {
    country: 'Hongrie',
    general: '112',
    police: '107',
    samu: '104',
    pompiers: '105',
    embassy: '+36 1 374 11 00',
    embassyAddress: 'Lendvay utca 27, 1062 Budapest',
  },
  vienne: {
    country: 'Autriche',
    general: '112',
    police: '133',
    samu: '144',
    pompiers: '122',
    embassy: '+43 1 502 75 0',
    embassyAddress: 'Technikerstraße 2, 1040 Vienne',
  },
  geneve: {
    country: 'Suisse',
    general: '112',
    police: '117',
    samu: '144',
    pompiers: '118',
    embassy: '+41 22 009 39 00',
    embassyAddress: 'Chemin Louis-Dunant 2, 1202 Genève',
  },
}
