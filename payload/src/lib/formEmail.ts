import type { BeforeEmail } from '@payloadcms/plugin-form-builder/types'

/**
 * Vult de mail van een formulierinzending als de template leeg is.
 *
 * De form-builder plugin bouwt de body uit het veld "Bericht" bij de
 * e-mailinstellingen van een formulier. Is dat veld leeg, dan geeft
 * `serializeSlate(undefined)` `undefined` terug en wordt de body letterlijk
 * `<div>undefined</div>` — de inzending staat dan wel in het CMS, maar de
 * mail bevat niets. Beide formulieren zijn zo aangemaakt
 * (`scripts/lib/forms.ts`).
 *
 * In dat geval zetten we alle ingevulde velden onder elkaar, met de labels
 * uit het formulier. Heeft een redacteur wél een bericht ingesteld, dan
 * blijft dat staan.
 */

type SubmissionValue = { field: string; value: unknown }
type FormField = { name?: string; label?: string | null }

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const isEmptyBody = (html: unknown): boolean => {
  if (typeof html !== 'string') return true
  const inner = html.replace(/<[^>]+>/g, '').trim()
  return inner === '' || inner === 'undefined'
}

const formatValue = (value: unknown): string => {
  if (value === true || value === 'true') return 'Ja'
  if (value === false || value === 'false') return 'Nee'
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export const fillEmptyEmailBody: BeforeEmail = async (emails, { data, req }) => {
  if (!emails.some((email) => isEmptyBody(email.html))) return emails

  const submission = ((data as { submissionData?: SubmissionValue[] })?.submissionData ?? []).filter(
    (entry) => entry.field !== 'turnstileToken' && entry.field !== 'formSubmissionID',
  )

  // Labels uit het formulier; lukt dat niet, dan de veldnaam. Een mail
  // zonder mooie labels is beter dan geen mail.
  const labels = new Map<string, string>()
  const formID = (data as { form?: number | string | { id: number | string } })?.form
  const id = typeof formID === 'object' && formID ? formID.id : formID
  if (id !== undefined) {
    try {
      const form = await req.payload.findByID({ collection: 'forms', id, depth: 0, req })
      for (const field of (form.fields ?? []) as FormField[]) {
        if (field.name && field.label) labels.set(field.name, field.label)
      }
    } catch (err) {
      req.payload.logger.warn({ err, msg: 'Formulierlabels niet geladen; veldnamen gebruikt.' })
    }
  }

  const rows = submission.map(({ field, value }) => ({
    label: labels.get(field) ?? field,
    value: formatValue(value),
  }))

  const html = rows
    .map(
      ({ label, value }) =>
        `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replace(/\r?\n/g, '<br>')}</p>`,
    )
    .join('')

  // Geen aparte tekstversie: de Postmark-adapter leidt die zelf af uit de HTML.
  return emails.map((email) => (isEmptyBody(email.html) ? { ...email, html } : email))
}
