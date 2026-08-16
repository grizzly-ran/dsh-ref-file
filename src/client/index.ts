/**
 * dsh-ref-file browser half: registers the `@` file-picker source and the
 * in-card reference rail (conversation.input.overlay anchor — INSIDE the
 * composer card, above the textarea, the image-thumbnail position). Picks
 * land plain-text `@path` tokens (caret exact, multiple references work by
 * typing `@` again); the rail renders each CONFIRMED reference as an
 * attachment-style card; the Host pre-step boundary injects the content.
 * @module dsh-ref-file/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { createAtFileSource } from './source.ts'
import { RefFileDock } from './dock.tsx'
import { NS, zh, en } from './locales.ts'
import { STYLES } from './styles.ts'

export const inject = ['inputTriggers', 'slots', 'locale']

/** Inject the dock stylesheet once (idempotent tag). */
function adoptStyles(): void {
  const tagId = 'dsh-ref-file/styles'
  if (typeof document !== 'undefined' && document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-ref-file'
    tag.dataset.pluginCss = tagId
    tag.textContent = STYLES
    document.head.appendChild(tag)
  }
}

export function apply(ctx: ClientContext): void {
  adoptStyles()
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ref-file: dictionaries')
  ctx.effect(() => {
    const source = createAtFileSource(async (url, signal) => fetch(url, { cache: 'no-store', signal }))
    const unregister = ctx.get('inputTriggers')!.registerSource(source)
    return () => { unregister() }
  }, 'dsh-ref-file: source')
  ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register(
    {
      name: 'conversation.input.overlay',
      id: 'dsh-ref-file',
      order: 10,
      locale: NS,
    },
    RefFileDock,
  ))
}
