/**
 * Welke versie draait er? De waarden zijn tijdens de build ingebakken
 * door `env` in next.config.ts; hier worden ze op één plek leesbaar.
 *
 * Te zien op vier plekken:
 * - op het dashboard van de admin (components/admin/DeployInfo.tsx);
 * - als HTML-comment bovenaan de body van elke pagina;
 * - als `<meta name="version">` in de paginabron;
 * - op /version.json, voor alle velden.
 *
 * Het build-ID is dat van Workers Builds, dus terug te vinden in het
 * dashboard onder Deployments → Builds. Lokaal staat er "lokaal".
 */
const commit = process.env.BUILD_COMMIT ?? 'onbekend'

export const version = {
  commit,
  commitShort: commit.slice(0, 7),
  commitMessage: process.env.BUILD_COMMIT_MESSAGE || null,
  branch: process.env.BUILD_BRANCH || null,
  buildId: process.env.BUILD_ID ?? 'lokaal',
  builtAt: process.env.BUILD_TIME ?? null,
  payload: process.env.BUILD_PAYLOAD_VERSION || null,
  next: process.env.BUILD_NEXT_VERSION || null,
}

/** Eén regel, voor de meta-tag. */
export const versionLabel = [
  version.commitShort,
  version.branch,
  version.builtAt,
  `build ${version.buildId.slice(0, 8)}`,
]
  .filter(Boolean)
  .join(' · ')

/**
 * Het blok dat als HTML-comment in elke pagina staat. De meta-tag alleen
 * is niet genoeg: Next streamt metadata bij dynamische pagina's, en voor
 * een gewone browser belandt die tag dan niet in `<head>` maar ergens
 * verderop in de bron.
 *
 * `--` mag niet in een comment voorkomen; een commit-bericht met `-->`
 * zou hem anders voortijdig sluiten.
 */
export const versionComment = (() => {
  const regels: [string, string | null][] = [
    ['Commit', version.commitShort],
    ['Bericht', version.commitMessage],
    ['Branch', version.branch],
    ['Build', version.buildId],
    ['Gebouwd', version.builtAt],
    ['Payload', version.payload],
    ['Next.js', version.next],
  ]
  const body = regels
    .filter(([, waarde]) => waarde)
    .map(([label, waarde]) => `  ${`${label}:`.padEnd(9)} ${String(waarde).replace(/-{2,}/g, '–')}`)
    .join('\n')
  return `<!--\n  Mellowbikers\n${body}\n-->`
})()
