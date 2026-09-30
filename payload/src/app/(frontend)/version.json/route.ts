import { version } from '@/lib/version'

/**
 * De draaiende versie als JSON. Geen cache, zodat je na een deploy nooit
 * de vorige versie terugleest. Raakt de database niet, dus kost vrijwel
 * niets.
 */
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json(version, { headers: { 'Cache-Control': 'no-store' } })
}
