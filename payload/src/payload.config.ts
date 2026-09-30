import path from 'path'
import { fileURLToPath } from 'url'

import { buildConfig } from 'payload'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { r2Storage } from '@payloadcms/storage-r2'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { getCloudflareContext, type CloudflareContext } from '@opennextjs/cloudflare'
import type { GetPlatformProxyOptions } from 'wrangler'

import { Pages } from './collections/Pages'
import { Events } from './collections/Events'
import { Members } from './collections/Members'
import { Faq } from './collections/Faq'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'
import { SiteSettings } from './globals/SiteSettings'
import { verifyTurnstile } from './lib/turnstile'
import { postmarkAdapter } from './lib/postmarkEmail'
import { fillEmptyEmailBody } from './lib/formEmail'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Alleen binnen de Worker zelf bestaat er een echte Cloudflare-context.
 * Overal anders — next dev, next build, de payload CLI — draaien we op
 * Node en leveren we de bindings via wrangler's platform proxy.
 */
const inWorkerRuntime =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

const cloudflare = inWorkerRuntime
  ? await getCloudflareContext({ async: true })
  : await getCloudflareContextFromWrangler()

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — Mellowbikers' },
    components: {
      afterDashboard: ['@/components/admin/DeployInfo#DeployInfo'],
    },
  },

  collections: [Pages, Events, Members, Faq, Media, Users],
  globals: [Header, Footer, SiteSettings],

  editor: lexicalEditor(),

  email: postmarkAdapter({
    defaultFromAddress: process.env.EMAIL_FROM ?? 'info@mellowbikers.nl',
    defaultFromName: 'Mellowbikers',
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },

  db: sqliteD1Adapter({
    binding: cloudflare.env.D1,
    // NIET WEGHALEN.
    //
    // Zonder deze vlag slaat D1 elk blokveld op als losse kolom in een
    // relationele structuur. Bij een blokkenbibliotheek van deze omvang
    // overschrijdt een UPDATE dan de SQLite-limiet op bound parameters
    // en faalt elke save met "too many SQL variables"
    // (payloadcms/payload#14766, open sinds november 2025).
    //
    // Achteraf omzetten vereist een datamigratie, dus dit staat vanaf de
    // allereerste migratie aan.
    blocksAsJSON: true,
  }),

  plugins: [
    // r2Storage geeft een Plugin terug. De officiele Cloudflare-template
    // zet dit onder een top-level "storage"-sleutel, maar die bestaat
    // niet in de Config van Payload 3.90 — daar werd R2 dus stilzwijgend
    // niet gebruikt en belandden uploads op de lokale schijf.
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),

    seoPlugin({
      collections: ['pages'],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) => `${doc?.title} | Mellowbikers`,
      generateURL: ({ doc }) =>
        `${process.env.NEXT_PUBLIC_SERVER_URL}${doc?.slug === 'home' ? '' : `/${doc?.slug}`}`,
    }),

    redirectsPlugin({
      collections: ['pages'],
      overrides: {
        admin: {
          description:
            'Oude URL naar nieuwe URL. Vul hier de WordPress-paden in zodat bestaande links blijven werken.',
        },
      },
    }),

    formBuilderPlugin({
      fields: { payment: false },
      beforeEmail: fillEmptyEmailBody,
      formOverrides: {
        admin: { group: 'Formulieren' },
      },
      formSubmissionOverrides: {
        admin: { group: 'Formulieren' },
        hooks: {
          beforeValidate: [
            async ({ data, operation, req }) => {
              if (operation !== 'create') return data

              // Fail-closed: ontbreekt de secret, dan wordt er niets
              // opgeslagen en niets gemaild. De logger gaat mee zodat de
              // foutcodes van Cloudflare in het Worker-log belanden; zonder
              // die codes is een geweigerd token niet te onderscheiden van
              // een verkeerde secret.
              await verifyTurnstile(
                (data as { turnstileToken?: unknown })?.turnstileToken,
                process.env.TURNSTILE_SECRET_KEY,
                req?.payload?.logger,
              )

              // Het token hoort niet in de database.
              if (data && 'turnstileToken' in data) delete (data as Record<string, unknown>).turnstileToken

              return data
            },
          ],
        },
      },
    }),
  ],

  // Op Workers werkt pino-pretty niet; console-based logger zoals in de
  // officiele Cloudflare-template.
  logger: isProduction ? cloudflareLogger() : undefined,
})

/**
 * Een Error heeft geen enumerable eigen properties, dus `{...err}` levert
 * `{}` op. Daardoor logde deze app elke serverfout als
 * `{"level":"error","err":{}}` — precies niets. Deze replacer zet Errors om
 * in iets leesbaars, op elk niveau van het object.
 */
function serialiseErrors(_key: string, value: unknown) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

function cloudflareLogger() {
  const write = (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') fn(JSON.stringify({ level, msg: objOrMsg }, serialiseErrors))
    else
      fn(
        JSON.stringify(
          { level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg },
          serialiseErrors,
        ),
      )
  }

  return {
    level: process.env.PAYLOAD_LOG_LEVEL || 'info',
    trace: write('trace', console.debug),
    debug: write('debug', console.debug),
    info: write('info', console.log),
    warn: write('warn', console.warn),
    error: write('error', console.error),
    fatal: write('fatal', console.error),
    silent: () => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        // Remote bindings vereisen een CLOUDFLARE_API_TOKEN. Zonder token
        // vallen we terug op lokale bindings, zodat een build of
        // typecheck ook draait op een machine zonder Cloudflare-toegang
        // (CI, een nieuwe laptop, een collega die alleen content doet).
        remoteBindings: Boolean(process.env.CLOUDFLARE_API_TOKEN),
      } satisfies GetPlatformProxyOptions),
  )
}
