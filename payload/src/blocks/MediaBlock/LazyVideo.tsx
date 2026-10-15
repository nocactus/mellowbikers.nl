'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { MuxPlayerRefAttributes } from '@mux/mux-player-react'

/**
 * Laadt de video pas wanneer het blok in beeld komt, en speelt hem dan
 * gedempt in een lus.
 *
 * Met een gewone iframe — ook met loading="lazy" — haalde de homepage
 * 1,4 MB aan Mux binnen bij elk bezoek: een thumbnail van 1,1 MB en een
 * player van 280 KiB, of je de video keek of niet. De lazy-drempel van
 * browsers is zo ruim dat een blok halverwege de pagina er alsnog onder
 * valt. Een IntersectionObserver met een kleine marge doet wat je
 * bedoelde.
 *
 * Mux-video's draaien op de web component en niet meer op de iframe van
 * player.mux.com. Dat is nodig om de controls te kunnen verbergen: de
 * iframe-wrapper kopieert elke query-parameter als attribuut, en een leeg
 * attribuut betekent in HTML "aan" — `controls=0` en `controls=none`
 * zetten de controls dus juist áán, en in een cross-origin iframe kunnen
 * we er geen CSS in zetten. Gemeten, niet gegokt.
 *
 * Bijvangst: op de web component bepalen wij de poster. De iframe haalde
 * er zelf een van 1,1 MB bij.
 *
 * Andere embeds (YouTube bijvoorbeeld; het veld laat elke URL toe) gaan
 * nog gewoon via de iframe.
 */

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false })

/** `https://player.mux.com/<id>?…` → `<id>`, of null als het geen Mux is. */
function muxPlaybackId(src: string): string | null {
  try {
    const url = new URL(src)
    if (url.hostname !== 'player.mux.com') return null
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id || null
  } catch {
    return null
  }
}

type Props = {
  src: string
  title: string
  /** Eigen poster. Zonder poster blijft het beeld zwart tot de video speelt. */
  posterUrl?: string
}

export const LazyVideo = ({ src, title, posterUrl }: Props) => {
  const houder = useRef<HTMLDivElement>(null)
  const speler = useRef<MuxPlayerRefAttributes>(null)

  const [laden, setLaden] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const [gepauzeerd, setGepauzeerd] = useState(false)
  const [aandacht, setAandacht] = useState(false)
  const [grofAanwijzer, setGrofAanwijzer] = useState(false)

  useEffect(() => {
    setAutoplay(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    // Op een touchscreen bestaat hover niet, dus daar staat de knop vast
    // in beeld. Anders zou hij voor die bezoekers onbereikbaar zijn.
    setGrofAanwijzer(Boolean(window.matchMedia?.('(pointer: coarse)').matches))

    const element = houder.current
    if (!element) return

    // Zonder IntersectionObserver (oude browser, of een testomgeving)
    // meteen laden: liever te veel data dan geen video.
    if (typeof IntersectionObserver === 'undefined') {
      setLaden(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLaden(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const playbackId = muxPlaybackId(src)

  const wisselAfspelen = () => {
    const element = speler.current
    if (!element) return
    if (element.paused) void element.play()
    else element.pause()
  }

  // Zichtbaar bij hover, bij toetsenbordfocus, zolang de video stilstaat,
  // en altijd op touch.
  const knopZichtbaar = grofAanwijzer || aandacht || gepauzeerd

  return (
    <div
      ref={houder}
      className="group relative w-full overflow-hidden rounded-lg bg-mellow-dark"
      style={{ aspectRatio: '128 / 61' }}
      onMouseEnter={() => setAandacht(true)}
      onMouseLeave={() => setAandacht(false)}
    >
      {!laden && <div aria-hidden className="absolute inset-0 bg-white/5" />}

      {laden && playbackId && (
        <>
          <MuxPlayer
            ref={speler}
            playbackId={playbackId}
            streamType="on-demand"
            title={title}
            poster={posterUrl ?? ''}
            autoPlay={autoplay ? 'muted' : false}
            loop={autoplay}
            muted={autoplay}
            onPlay={() => setGepauzeerd(false)}
            onPause={() => setGepauzeerd(true)}
            className="absolute inset-0 w-full h-full"
            // Alleen tijdens autoplay gaan de controls weg. Krijgt iemand
            // de video níet vanzelf te zien — prefers-reduced-motion — dan
            // heeft hij de gewone controls nodig om hem te kunnen starten.
            style={
              autoplay
                ? {
                    '--controls': 'none',
                    '--media-object-fit': 'cover',
                    width: '100%',
                    height: '100%',
                  }
                : { '--media-object-fit': 'cover', width: '100%', height: '100%' }
            }
          />

          {autoplay && (
            // WCAG 2.2.2: bewegend beeld dat vanzelf start en langer dan
            // vijf seconden duurt moet te stoppen zijn. De controls zijn
            // weg, dus dit is die mogelijkheid.
            <button
              type="button"
              onClick={wisselAfspelen}
              onFocus={() => setAandacht(true)}
              onBlur={() => setAandacht(false)}
              aria-label={gepauzeerd ? 'Video afspelen' : 'Video pauzeren'}
              className={`absolute bottom-3 right-3 rounded-full bg-mellow-dark/70 p-3 text-mellow-white backdrop-blur transition-opacity hover:bg-mellow-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mellow-groen ${
                knopZichtbaar ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
                {gepauzeerd ? <path d="M4 2l12 7-12 7z" /> : <path d="M3 2h4v14H3zM11 2h4v14h-4z" />}
              </svg>
            </button>
          )}
        </>
      )}

      {laden && !playbackId && (
        <iframe
          src={src}
          title={title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      )}
    </div>
  )
}
