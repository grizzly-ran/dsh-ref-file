/**
 * The `@` input-trigger source: fetches the workspace index from the host
 * files route and serves Codex/Claude-style file candidates. Picks land the
 * plain-text `@path ` token — no inline chip — so the caret stays exact and
 * MULTIPLE references work by typing `@` again. The dock above the input
 * renders confirmed references as attachment-style cards merged into the
 * composer card's top, and the Host pre-step boundary injects file content.
 * @module dsh-ref-file/client/source
 */
import type { ClientSessionContext, InputTriggerSource, InputTriggerCandidate } from '@deepseek-ai/dsh-client-ui-input-trigger/client'

declare module '@deepseek-ai/dsh-client-ui-input-trigger/client' {
  interface InputTriggerCandidate {
    /** Source-owned stable value when the visible name is only a display label. */
    readonly value?: string
  }
}

/** One indexed workspace entry from the host route. */
export interface FileEntry {
  readonly path: string
  readonly name: string
  readonly kind: 'file' | 'dir'
}

export interface FilesResponse {
  readonly files: readonly FileEntry[]
}

/** Owner source name (menu group label). */
export const SOURCE_NAME = '文件引用'

/** The host listing endpoint, addressed per session. */
export function filesUrl(sessionId: string, query: string): string {
  const params = new URLSearchParams({ session: sessionId, q: query })
  return `/plugins/dsh-ref-file/files?${params.toString()}`
}

/** Build the `@` trigger source over the injected fetch face. */
export function createAtFileSource(fetchImpl: (url: string, signal: AbortSignal) => Promise<Response>): InputTriggerSource {
  return {
    trigger: '@',
    name: SOURCE_NAME,
    order: 1,
    async candidates(session: ClientSessionContext, { query, signal }) {
      try {
        const response = await fetchImpl(filesUrl(session.sessionId, query), signal)
        if (!response.ok) return []
        const data = (await response.json()) as FilesResponse
        if (signal.aborted) return []
        return data.files.map((file): InputTriggerCandidate => ({
          name: file.name,
          description: dirnameOf(file.path),
          value: file.path,
        }))
      } catch {
        return []
      }
    },
    warm() {
      // The index is fetched lazily on the first menu open.
    },
    onPick({ candidate }) {
      const value = (candidate as { value?: string }).value ?? candidate.name
      return { text: `@${value} ` }
    },
  }
}

function dirnameOf(relative: string): string {
  const index = relative.lastIndexOf('/')
  return index === -1 ? '' : relative.slice(0, index)
}
