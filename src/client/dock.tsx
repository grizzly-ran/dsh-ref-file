/**
 * The @file reference cards, rendered INSIDE the composer card via the
 * `conversation.input.overlay` anchor (the card's top region, above the
 * textarea — the same place image thumbnails sit). One card per `@path` token
 * in the draft that is CONFIRMED to exist in the workspace; unconfirmed
 * tokens render nothing. The rail is a single horizontally-scrollable row
 * (fixed height, like the image AttachmentRail); when cards are present the
 * textarea is pushed down by CSS (`:has`) so text never hides under cards.
 * @module dsh-ref-file/client/dock
 */
import { useEffect, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

/** Full overlay-entry props: the session-standard kit (structural) plus the locale seat. */
export type RefFileDockProps = PropsLocale<'dsh-ref-file'> & {
  readonly useInput: (selector: (state: unknown) => unknown) => unknown
  readonly inputActions: { readonly setDraft: (draft: string) => void }
  readonly useSession: (selector: (state: { sessionId: string }) => unknown) => unknown
}

/** The same token grammar the Host's reference scanner uses. */
const MENTION_PATTERN = /@([^\s@]+)/g

/** One parsed mention token in the draft, with its span for precise removal. */
interface DraftMention {
  readonly raw: string
  readonly start: number
  readonly end: number
}

/** Parse the draft's @path tokens in order, deduplicating by raw token. */
export function draftMentions(draft: string): readonly DraftMention[] {
  const seen = new Set<string>()
  const out: DraftMention[] = []
  for (const match of draft.matchAll(MENTION_PATTERN)) {
    const raw = match[1] as string
    if (raw === '' || seen.has(raw)) continue
    seen.add(raw)
    out.push({ raw, start: match.index, end: match.index + match[0].length })
  }
  return out
}

/** Draft text with one token span removed. */
export function withoutToken(draft: string, start: number, end: number): string {
  return draft.slice(0, start) + draft.slice(end)
}

/** Host single-path existence check URL. */
export function exactUrl(sessionId: string, raw: string): string {
  const params = new URLSearchParams({ session: sessionId, exact: raw })
  return `/plugins/dsh-ref-file/files?${params.toString()}`
}

/** Whether the workspace currently contains the exact @ token path. */
export async function isExactFile(sessionId: string, raw: string): Promise<boolean> {
  try {
    const response = await fetch(exactUrl(sessionId, raw), { cache: 'no-store' })
    if (!response.ok) return false
    const data = (await response.json()) as { files?: readonly unknown[] }
    return (data.files?.length ?? 0) > 0
  } catch {
    return false
  }
}

/** Render the reference cards inside the composer; null while nothing confirmed. */
export function RefFileDock({ useInput, inputActions, useSession, t }: RefFileDockProps): JSX.Element | null {
  const draft = useInput((state) => (state as { draft?: string }).draft) as string | undefined ?? ''
  const sessionId = useSession((state) => state.sessionId) as string | undefined
  const tokens = draftMentions(draft)
  const [confirmed, setConfirmed] = useState<ReadonlySet<string>>(new Set())
  const tokenKey = tokens.map((mention) => mention.raw).join('|')
  useEffect(() => {
    if (sessionId === undefined) return
    let alive = true
    void (async () => {
      const next = new Set<string>()
      await Promise.all(tokens.map(async (mention) => {
        if (await isExactFile(sessionId, mention.raw)) next.add(mention.raw)
      }))
      if (alive) setConfirmed(next)
    })()
    return () => { alive = false }
  }, [tokenKey, sessionId])
  const mentions = tokens.filter((mention) => confirmed.has(mention.raw))
  if (mentions.length === 0) return null
  return (
    <div className="dsh_rf_rail" role="group" aria-label={t('dock.aria')} data-ref-file-overlay>
      {mentions.map((mention) => (
        <span key={`${mention.start}:${mention.raw}`} className="dsh_rf_row" data-ref-file-row>
          <span className="dsh_rf_icon" aria-hidden>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 2.5A1.5 1.5 0 0 1 4.5 1h3l3 3v9.5A1.5 1.5 0 0 1 9 15H4.5A1.5 1.5 0 0 1 3 13.5v-11Z" stroke="currentColor" strokeWidth="1.2" />
              <path d="M7.5 1v3h3" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
          <span className="dsh_rf_path" title={mention.raw}>{mention.raw}</span>
          <button
            type="button"
            className="dsh_rf_remove"
            aria-label={t('dock.remove', { name: mention.raw })}
            onClick={() => { inputActions.setDraft(withoutToken(draft, mention.start, mention.end)) }}
          >
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  )
}
