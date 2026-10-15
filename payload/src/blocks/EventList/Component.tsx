import { getPayload } from 'payload'
import config from '@payload-config'
import type { EventListBlock, Event } from '@/payload-types'
import { Section } from '@/components/Section'
import { CONTAINER } from '@/lib/theme'
import { formatEventDate, eventYear } from '@/lib/events'

export const EventListComponent = async ({ block }: { block: EventListBlock }) => {
  const payload = await getPayload({ config })
  const now = new Date().toISOString()
  const limit = block.limit && block.limit > 0 ? block.limit : 100

  // archiveAfter wordt door een hook gezet op endDate ?? startDate, zodat
  // een meerdaagse rit pas verdwijnt als de laatste dag voorbij is.
  const fetchEvents = async (upcoming: boolean) =>
    (
      await payload.find({
        collection: 'events',
        where: { archiveAfter: upcoming ? { greater_than_equal: now } : { less_than: now } },
        sort: upcoming ? 'startDate' : '-startDate',
        limit,
        depth: 0,
      })
    ).docs

  let upcoming: Event[] = []
  let past: Event[] = []

  if (block.filter === 'upcoming' || block.filter === 'all') upcoming = await fetchEvents(true)
  if (block.filter === 'past' || block.filter === 'all') past = await fetchEvents(false)

  return (
    <Section appearance={block.appearance}>
      <div className={CONTAINER}>
        <div className="bg-mellow-dark rounded-lg p-6 md:p-12">
          {block.title && (
            <h2 className="text-lg md:text-xl text-mellow-groen font-bold mb-4">{block.title}</h2>
          )}
          {block.intro && <p className="text-base text-mellow-white mb-8">{block.intro}</p>}

          {upcoming.length > 0 && <EventRows events={upcoming} />}

          {past.length > 0 && (
            <>
              {upcoming.length > 0 && (
                <h3 className="text-lg text-mellow-white/60 font-bold mt-12 mb-4">Geweest</h3>
              )}
              <EventRows events={past} muted />
            </>
          )}

          {upcoming.length === 0 && past.length === 0 && (
            <p className="text-mellow-white">Er staan nu geen ritten gepland. Hou de socials in de gaten.</p>
          )}
        </div>
      </div>
    </Section>
  )
}

/**
 * Ritten per jaar, in de volgorde waarin ze binnenkomen. Een Map houdt
 * die volgorde vast, en de query sorteert al op datum.
 */
function perJaar(events: Event[]): Array<[string, Event[]]> {
  const groepen = new Map<string, Event[]>()
  for (const event of events) {
    const jaar = eventYear(event.startDate)
    const bestaande = groepen.get(jaar)
    if (bestaande) bestaande.push(event)
    else groepen.set(jaar, [event])
  }
  return [...groepen.entries()]
}

/**
 * Het jaarkopje verschijnt alleen als de lijst meer dan één jaar beslaat.
 *
 * De club plant door over de jaargrens heen, en dan stond er een rit in
 * januari tussen de ritten van december zonder dat je zag dat het om het
 * jaar erna ging — de volgorde klopte wel, maar lezen kon je het niet.
 * Staat alles in hetzelfde jaar, dan is een kopje ruis en blijft het weg.
 *
 * Binnen een groep staat het jaartal niet in de datum zelf; het kopje
 * zegt het al. Daarom `formatEventDate(event, 'nooit')`.
 */
const EventRows = ({ events, muted = false }: { events: Event[]; muted?: boolean }) => {
  const groepen = perJaar(events)
  const toonJaarkopjes = groepen.length > 1

  return (
    <>
      {groepen.map(([jaar, ritten], groepIndex) => (
        <section key={jaar}>
          {toonJaarkopjes && (
            <div className={`flex items-center gap-3 mb-4 ${groepIndex === 0 ? '' : 'mt-10'}`}>
              <span className="text-xs font-bold tracking-[0.14em] text-mellow-white/45">{jaar}</span>
              <span aria-hidden className="flex-1 h-px bg-mellow-white/15" />
            </div>
          )}

          <ul className="list-none space-y-6">
            {ritten.map((event) => (
              <li
                key={event.id}
                className={`border-b border-mellow-white/20 pb-6 ${muted ? 'opacity-50' : ''}`}
              >
                <div className="grid md:grid-cols-[200px_1fr] gap-2 md:gap-6">
                  <time dateTime={event.startDate} className="text-mellow-groen font-bold text-lg">
                    {formatEventDate(event, 'nooit')}
                  </time>
                  <div>
                    <h3 className="text-xl font-bold text-mellow-white">{event.title}</h3>
                    {event.location && (
                      <p className="text-sm text-mellow-white/70 mb-2">{event.location}</p>
                    )}
                    {event.summary && <p className="text-base text-mellow-white">{event.summary}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
