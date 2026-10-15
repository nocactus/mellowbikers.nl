import { getPayload } from 'payload'
import config from '@payload-config'
import type { NextEventBlock } from '@/payload-types'
import { Section } from '@/components/Section'
import { CfImage } from '@/components/CfImage'
import { LinkButton } from '@/components/LinkButton'
import { CONTAINER } from '@/lib/theme'
import { formatEventDate, eventJsonLd } from '@/lib/events'

export const NextEventComponent = async ({ block }: { block: NextEventBlock }) => {
  const payload = await getPayload({ config })

  // Dezelfde regel als de agenda: archiveAfter staat op endDate ?? start,
  // dus een meerdaags weekend blijft "de komende rit" zolang het loopt in
  // plaats van op dag twee te verdwijnen.
  const { docs } = await payload.find({
    collection: 'events',
    where: { archiveAfter: { greater_than_equal: new Date().toISOString() } },
    sort: 'startDate',
    limit: 1,
    depth: 1,
  })

  const event = docs[0]
  const mediaFirst = block.mediaPosition === 'left'
  const beeld = (event && typeof event.image === 'object' ? event.image : null) ?? block.image
  const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? ''

  return (
    <Section appearance={block.appearance}>
      <div className={CONTAINER}>
        {/* Structured data kon met de vrije-tekst datums van de oude site
            niet. Nu staat de eerstvolgende rit als SportsEvent op de
            homepage en kan hij als rich result verschijnen. */}
        {event && siteUrl && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(event, siteUrl)) }}
          />
        )}

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className={mediaFirst ? 'md:order-2' : 'md:order-1'}>
            {block.eyebrow && (
              <h2 className="text-2xl md:text-3xl font-bold text-mellow-groen mb-4 leading-tight">
                {block.eyebrow}
              </h2>
            )}

            {event ? (
              <>
                <time
                  dateTime={event.startDate}
                  className="block text-mellow-groen font-bold text-lg mb-2"
                >
                  {formatEventDate(event, 'bijAnderJaar')}
                </time>
                <p className="text-3xl md:text-4xl font-black text-mellow-white leading-tight">
                  {event.title}
                </p>
                {event.location && (
                  <p className="text-base text-mellow-white/70 mt-2">{event.location}</p>
                )}
                {event.summary && (
                  <p className="text-xl md:text-2xl leading-relaxed text-mellow-white mt-4">
                    {event.summary}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xl md:text-2xl leading-relaxed text-mellow-white">
                {block.emptyText}
              </p>
            )}

            {block.button?.link?.label && (
              <div className="mt-6">
                <LinkButton link={block.button.link} />
              </div>
            )}
          </div>

          <div
            className={`flex items-center justify-center ${mediaFirst ? 'md:order-1' : 'md:order-2'}`}
          >
            <CfImage
              media={beeld}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="rounded-lg w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </Section>
  )
}
