'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Script from 'next/script'
import type { Form } from '@/payload-types'

type Status = { state: 'idle' | 'sending' | 'ok' | 'error'; message?: string }

type Turnstile = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
    },
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

const turnstile = () => (window as unknown as { turnstile?: Turnstile }).turnstile

/** Hoe lang een verzending op een token wacht voordat hij opgeeft. De
 *  widget laadt pas bij de eerste aanraking van het formulier, dus wie
 *  snel is, klikt op verzenden terwijl hij nog bezig is. */
const TOKEN_WACHTTIJD_MS = 8000

const INPUT =
  'w-full px-4 py-2 rounded bg-mellow-dark text-mellow-white border border-mellow-groen focus:outline-none focus:border-mellow-groen/70'

/** De Form Builder geeft een breedte in procenten mee. Als complete
 *  class-strings, want Tailwind leest geen samengestelde namen. */
const widthClass = (width?: number | null) => (width && width <= 50 ? 'sm:col-span-1' : 'sm:col-span-2')

export const FormRenderer = ({ form }: { form: Form }) => {
  const [status, setStatus] = useState<Status>({ state: 'idle' })

  /**
   * Turnstile kost 535 KiB, en dat werd op de homepage geladen bij ieder
   * bezoek — ook bij de overgrote meerderheid die het formulier nooit
   * aanraakt. Nu laadt het script pas zodra iemand het formulier ingaat.
   * Tussen die eerste focus en een verzending zitten seconden, ruim
   * genoeg voor een widget die zich daarna zelf rendert.
   */
  const [turnstileNodig, setTurnstileNodig] = useState(false)

  /**
   * Expliciet renderen in plaats van de `cf-turnstile`-class. Bij die
   * impliciete variant zoekt het script één keer naar widgets, op het
   * moment dat het laadt. Navigeer je daarna via een link naar een andere
   * pagina met een formulier, dan is het script al geladen, voert Next het
   * niet opnieuw uit, en wordt die widget nooit getekend: geen token, en
   * elke verzending strandt tot je de pagina ververst. `onReady` draait
   * wél bij elke mount.
   */
  const widgetContainer = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const token = useRef<string | null>(null)

  const renderWidget = () => {
    const ts = turnstile()
    if (!ts || !widgetContainer.current || widgetId.current) return
    widgetId.current = ts.render(widgetContainer.current, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
      callback: (value) => {
        token.current = value
      },
      'expired-callback': () => {
        token.current = null
      },
      'error-callback': () => {
        token.current = null
      },
    })
  }

  // Staat het script al klaar (van een eerdere pagina), dan meteen
  // tekenen; anders doet `onReady` het zodra het geladen is.
  useEffect(() => {
    renderWidget()
    return () => {
      if (widgetId.current) turnstile()?.remove(widgetId.current)
      widgetId.current = null
      token.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const wachtOpToken = async (): Promise<string | null> => {
    const start = Date.now()
    while (!token.current && Date.now() - start < TOKEN_WACHTTIJD_MS) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    return token.current
  }

  // Een token is eenmalig. Na een geweigerde verzending moet er een nieuw
  // komen, anders weigert de server de volgende poging ook.
  const resetWidget = () => {
    token.current = null
    if (widgetId.current) turnstile()?.reset(widgetId.current)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus({ state: 'sending' })

    // Vastpakken voor de await: React geeft currentTarget na afloop van
    // de handler vrij, dus daarna is het null.
    const formElement = event.currentTarget
    const formData = new FormData(formElement)
    // De widget zet zijn token ook als verborgen veld in het formulier;
    // dat hoort niet tussen de ingevulde velden.
    formData.delete('cf-turnstile-response')

    // Bij een verzending direct na de eerste aanraking is de widget vaak
    // nog bezig. Even wachten, en pas daarna opgeven.
    const turnstileToken = await wachtOpToken()

    // Nog steeds geen token: de widget is niet klaar of niet afgerond. Dat
    // hoeft de server niet te beslissen — zeg het meteen.
    if (!turnstileToken) {
      setStatus({
        state: 'error',
        message: 'De beveiligingscheck is nog niet klaar. Wacht een tel en probeer opnieuw.',
      })
      return
    }

    const submissionData = Array.from(formData.entries()).map(([field, value]) => ({
      field,
      value: String(value),
    }))

    try {
      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: form.id, submissionData, turnstileToken }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { errors?: { message: string }[] } | null
        throw new Error(body?.errors?.[0]?.message ?? 'Er ging iets mis.')
      }

      setStatus({ state: 'ok' })
      formElement.reset()
    } catch (error) {
      resetWidget()
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Er ging iets mis. Probeer het later opnieuw.',
      })
    }
  }

  if (status.state === 'ok') {
    return (
      <p className="text-mellow-groen text-lg" role="status">
        Bedankt! We nemen zo snel mogelijk contact met je op.
      </p>
    )
  }

  return (
    <>
      {turnstileNodig && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={renderWidget}
        />
      )}

      <form
        onSubmit={onSubmit}
        // Capture, zodat focus op een veld het ook op het formulier
        // triggert. Beide gebeurtenissen, want tikken op mobiel geeft
        // niet altijd eerst focus.
        onFocusCapture={() => setTurnstileNodig(true)}
        onPointerDownCapture={() => setTurnstileNodig(true)}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {(form.fields ?? []).map((field, i) => {
          if (field.blockType === 'message') {
            return (
              <div key={i} className="sm:col-span-2 text-mellow-white">
                {/* message-velden bevatten rich text uit de Form Builder */}
              </div>
            )
          }

          const id = `${form.id}-${field.name}`
          const label = (
            <label htmlFor={id} className="block text-mellow-white text-sm mb-1">
              {field.label}
              {field.required ? ' *' : ''}
            </label>
          )

          if (field.blockType === 'textarea') {
            return (
              <div key={i} className={widthClass(field.width)}>
                {label}
                <textarea id={id} name={field.name} rows={4} required={!!field.required} className={`${INPUT} resize-none`} />
              </div>
            )
          }

          if (field.blockType === 'select') {
            return (
              <div key={i} className={widthClass(field.width)}>
                {label}
                <select id={id} name={field.name} required={!!field.required} className={INPUT}>
                  <option value="">Maak een keuze</option>
                  {(field.options ?? []).map((option, j) => (
                    <option key={j} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )
          }

          if (field.blockType === 'checkbox') {
            return (
              <div key={i} className={`${widthClass(field.width)} flex items-start gap-2`}>
                <input
                  type="checkbox"
                  id={id}
                  name={field.name}
                  required={!!field.required}
                  className="mt-1"
                />
                <label htmlFor={id} className="text-mellow-white text-sm">
                  {field.label}
                  {field.required ? ' *' : ''}
                </label>
              </div>
            )
          }

          const type =
            field.blockType === 'email' ? 'email' : field.blockType === 'number' ? 'number' : 'text'

          return (
            <div key={i} className={widthClass(field.width)}>
              {label}
              <input id={id} name={field.name} type={type} required={!!field.required} className={INPUT} />
            </div>
          )
        })}

        <div ref={widgetContainer} className="sm:col-span-2" />

        {status.state === 'error' && (
          <p className="sm:col-span-2 text-sm bg-white/10 p-2 rounded text-mellow-white" role="alert">
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={status.state === 'sending'}
          className="sm:col-span-2 text-2xl w-full px-6 py-3 rounded-lg bg-mellow-blue hover:bg-mellow-red text-mellow-white font-medium transition-colors border-2 border-mellow-blue disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status.state === 'sending' ? 'Versturen…' : (form.submitButtonLabel ?? 'Versturen')}
        </button>
      </form>
    </>
  )
}
