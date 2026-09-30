import { version } from '@/lib/version'

/**
 * Blok op het admin-dashboard: welke build draait er nu? Zelfde gegevens
 * als /version.json, zodat je na een deploy in één oogopslag ziet of je
 * wijziging live staat.
 */

const tijd = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('nl-NL', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/Amsterdam',
      }).format(new Date(iso))
    : 'onbekend'

const Rij = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <dt style={{ color: 'var(--theme-elevation-500)' }}>{label}</dt>
    <dd style={{ margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>{children}</dd>
  </>
)

export const DeployInfo = () => (
  <section
    style={{
      marginTop: 'calc(var(--base) * 2)',
      padding: 'calc(var(--base) * 1.25)',
      border: '1px solid var(--theme-elevation-150)',
      borderRadius: 'var(--style-radius-m, 4px)',
      background: 'var(--theme-elevation-50)',
      maxWidth: '40rem',
    }}
  >
    <h4 style={{ margin: '0 0 calc(var(--base) * 0.75)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Deploy-info
    </h4>
    <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '0.4rem 1.5rem', margin: 0 }}>
      <Rij label="Server">
        Cloudflare Workers — build {version.buildId === 'lokaal' ? 'lokaal' : version.buildId.slice(0, 8)}
      </Rij>
      <Rij label="Commit">
        {version.commitShort}
        {version.branch ? ` (${version.branch})` : ''}
        {version.commitMessage ? ` — ${version.commitMessage}` : ''}
      </Rij>
      <Rij label="Payload">
        {version.payload ?? '?'} — build {tijd(version.builtAt)}
      </Rij>
      <Rij label="Next.js">{version.next ?? '?'}</Rij>
    </dl>
  </section>
)
