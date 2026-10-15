import type { Event } from '@/payload-types'

const DAY = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', timeZone: 'Europe/Amsterdam' })
const FULL = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Amsterdam',
})
const DAY_ONLY = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', timeZone: 'Europe/Amsterdam' })
const MONTH = new Intl.DateTimeFormat('nl-NL', { month: 'long', timeZone: 'Europe/Amsterdam' })
const YEAR = new Intl.DateTimeFormat('nl-NL', { year: 'numeric', timeZone: 'Europe/Amsterdam' })

/** Het jaar waarin een datum valt, gerekend in Amsterdam en niet in UTC. */
export function eventYear(date: string): string {
  return YEAR.format(new Date(date))
}

/**
 * Wanneer hoort het jaartal in de datum te staan?
 *
 * - `nooit`  — de agenda zet een jaarkopje boven elke groep, dus in de
 *              regel eronder zou het jaartal zich eindeloos herhalen.
 * - `bijAnderJaar` — losse datums zonder kopje erboven, zoals het blok
 *              "Komende rit" op de homepage. Daar moet je wél kunnen zien
 *              dat een rit in januari niet over deze maand gaat maar over
 *              volgend jaar.
 *
 * De standaard is de veilige: een nieuwe aanroeper die er niet over
 * nadenkt krijgt het jaartal te zien in plaats van het stilzwijgend te
 * missen.
 */
type JaarKeuze = 'nooit' | 'bijAnderJaar'

/**
 * Levert dezelfde leesbare notatie op als de handgetypte datums in de
 * oude agenda ("Zo 11 januari", "12-14 juni 2026"), maar afgeleid uit
 * echte datumvelden — dus altijd kloppend en sorteerbaar.
 */
export function formatEventDate(
  event: Pick<Event, 'startDate' | 'endDate'>,
  jaar: JaarKeuze = 'bijAnderJaar',
): string {
  const start = new Date(event.startDate)
  const end = event.endDate ? new Date(event.endDate) : null

  const jaarVanRit = YEAR.format(end ?? start)
  const toonJaar = jaar === 'bijAnderJaar' && jaarVanRit !== YEAR.format(new Date())
  const achtervoegsel = toonJaar ? ` ${jaarVanRit}` : ''

  if (end && end.toDateString() !== start.toDateString()) {
    const zelfdeMaand =
      start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    return zelfdeMaand
      ? `${DAY_ONLY.format(start)}-${DAY_ONLY.format(end)} ${MONTH.format(end)}${achtervoegsel}`
      : `${FULL.format(start)} - ${FULL.format(end)}${achtervoegsel}`
  }

  const weekdag = DAY.format(start).replace('.', '')
  return `${weekdag.charAt(0).toUpperCase()}${weekdag.slice(1)} ${FULL.format(start)}${achtervoegsel}`
}

/** JSON-LD voor rich results in Google. Dit kon met de oude vrije-tekst
 *  datums helemaal niet. */
export function eventJsonLd(event: Event, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.title,
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    ...(event.location
      ? { location: { '@type': 'Place', name: event.location } }
      : {}),
    ...(event.summary ? { description: event.summary } : {}),
    organizer: { '@type': 'SportsClub', name: 'Mellowbikers', url: siteUrl },
  }
}
