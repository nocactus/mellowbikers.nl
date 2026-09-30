import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'

import { SiteHeader } from '@/components/SiteHeader'
import { versionLabel } from '@/lib/version'
import '@/styles/globals.css'

/**
 * De hele frontend rendert per request. Zonder dit probeert Next de
 * layout en de homepage tijdens de build te prerenderen, en dan moet de
 * database al gevuld zijn op het moment van bouwen — precies de
 * koppeling tussen build en data die we niet willen.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'),
  // Geen template: buildMetadata levert al een complete titel. Zie
  // lib/pages.ts voor waarom.
  title: 'Mellowbikers',
  description: 'Dé mountainbike vereniging van de Brabantse Wal',
  icons: { icon: '/favicon.png', apple: '/favicon.png' },
  // Welke build draait er? Zie lib/version.ts.
  other: { version: versionLabel },
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const payload = await getPayload({ config })
  const [header, settings] = await Promise.all([
    payload.findGlobal({ slug: 'header', depth: 2 }),
    payload.findGlobal({ slug: 'site-settings', depth: 1 }),
  ])

  const logo = settings.logo
  const logoUrl = logo && typeof logo === 'object' ? (logo.url ?? undefined) : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsClub',
    name: settings.siteName ?? 'Mellowbikers',
    url: process.env.NEXT_PUBLIC_SERVER_URL,
    ...(logoUrl ? { logo: `${process.env.NEXT_PUBLIC_SERVER_URL}${logoUrl}` } : {}),
    ...(settings.areaServed ? { areaServed: settings.areaServed } : {}),
    sport: 'Mountain Biking',
    sameAs: (settings.socials ?? []).map((social) => social.url),
  }

  return (
    <html lang="nl">
      <head>
        <link rel="preload" href="/fonts/InterVariable.woff2" as="font" type="font/woff2" crossOrigin="" />
        {/* De italic-variant werd in de Astro-versie op elke pagina
            gepreload terwijl hij zelden gebruikt wordt. Nu laadt hij pas
            als er daadwerkelijk cursieve tekst op de pagina staat. */}
        <script
          defer
          data-domain="mellowbikers.nl"
          src="https://stats.nocactus.nl/js/script.file-downloads.js"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-mellow-dark text-mellow-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-mellow-groen focus:text-mellow-dark focus:px-4 focus:py-2 focus:rounded"
        >
          Ga naar inhoud
        </a>

        <SiteHeader header={header} logoUrl={logoUrl} />

        {/* Precies één main-element. In de Astro-versie zat er op vijf
            van de zeven pagina's een tweede main genest in deze. */}
        <main id="main-content">{children}</main>
      </body>
    </html>
  )
}
