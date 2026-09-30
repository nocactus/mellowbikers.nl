/**
 * Welke versie draait er? De waarden zijn tijdens de build ingebakken
 * door `env` in next.config.ts; hier worden ze op één plek leesbaar.
 *
 * Te zien op drie plekken:
 * - op het dashboard van de admin (components/admin/DeployInfo.tsx);
 * - in de paginabron van elke pagina, als `<meta name="version">`;
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
