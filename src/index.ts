/**
 * dsh-ref-file host plugin: the Codex/Claude-style `@file` reference engine.
 *
 *  - serves `/plugins/dsh-ref-file/files` (workspace file listing for the
 *    browser `@` picker; session-addressed, bounded, ignore-aware)
 *  - at each agent's pre-step boundary, scans the user message for `@path`
 *    tokens, validates them inside the workspace, and for FILES injects the
 *    actual file content into the model input (binary-safe, capped, optional
 *    `:start[-end]` line slice). Directories inject an existence marker only.
 *
 * The reference token stays in the user message as literal text (the model
 * sees `@src/x.ts` plus the injected content block), exactly like Claude Code.
 * @module dsh-ref-file
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { expandMentions, mentionPreStep, resolveMention } from './mention.ts'
import { walkWorkspace } from './files.ts'
import { DEFAULT_IGNORE_DIRS, DEFAULT_IGNORE_EXTENSIONS } from './defaults.ts'

export const name = 'dsh-ref-file'
export const inject = ['agents']

export interface Config {
  /** Inject referenced file CONTENT into the model input (true = Claude-Code style). */
  includeContent: boolean
  /** Hard cap on injected content bytes per referenced file (truncated beyond). */
  maxBytes: number
  /** Hard cap on indexed entries per workspace for the picker route. */
  maxIndexedFiles: number
  /** Directory basenames the picker walk skips entirely. */
  ignoreDirs: string[]
  /** File extensions (no dot, lowercased) the picker hides — media/binaries. */
  ignoreExtensions: string[]
  /** Maximum directory depth the picker walk descends to. */
  maxDepth: number
}

export const Config = z.object({
  includeContent: z.boolean().default(true),
  maxBytes: z.natural().min(1).default(20000),
  maxIndexedFiles: z.natural().min(1).default(5000),
  ignoreDirs: z.array(z.string()).default([...DEFAULT_IGNORE_DIRS]),
  ignoreExtensions: z.array(z.string()).default([...DEFAULT_IGNORE_EXTENSIONS]),
  maxDepth: z.natural().min(1).default(8),
})

const WEB_SERVER_KEYS = ['webServer', 'httpServer'] as const
const WORKSPACE_KEYS = ['workspaceRegistry', 'workspace'] as const

/** Minimal server-response face the route handlers write through. */
interface ResFace {
  writeHead(status: number, headers?: Record<string, string>): void
  end(body?: string): void
}

/** Minimal server-request face: the raw URL string. */
interface ReqFace {
  url?: string
}

export function apply(ctx: Context, rawConfig?: Config): void {
  const config = Config(rawConfig ?? {})

  // ── @file picker listing route (lazy: web profiles only) ─────────────────
  let webRegistered = false
  const registerWebSurface = (): void => {
    if (webRegistered) return
    const webServer = (ctx.get(WEB_SERVER_KEYS[0]) ?? ctx.get(WEB_SERVER_KEYS[1])) as
      | { register(route: { kind: 'exact' | 'prefix'; path: string; handler: (req: ReqFace, res: ResFace) => void | Promise<void> }): () => void }
      | undefined
    const workspaceRegistry = (ctx.get(WORKSPACE_KEYS[0]) ?? ctx.get(WORKSPACE_KEYS[1])) as
      | { list(): readonly { path: string }[] }
      | undefined
    if (webServer === undefined) return
    webRegistered = true

    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/plugins/dsh-ref-file/files',
      handler: async (req, res) => {
        try {
          const url = new URL(String(req.url ?? '/'), 'http://localhost')
          const sessionId = url.searchParams.get('session')
          const query = url.searchParams.get('q') ?? ''
          let cwd: string | undefined
          if (sessionId !== null && sessionId !== '') {
            const agent = ctx.agents.get(sessionId as SessionId)
            cwd = agent?.session.header.cwd
          }
          if (cwd === undefined && workspaceRegistry !== undefined) {
            cwd = workspaceRegistry.list()[0]?.path
          }
          if (cwd === undefined) {
            res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ error: 'no workspace' }))
            return
          }
          // Single-path existence check (the dock verifies @ tokens before
          // rendering a chip): exact= returns at most one entry.
          const exact = url.searchParams.get('exact')
          if (exact !== null && exact !== '') {
            const mention = await resolveMention(exact, cwd, new AbortController().signal)
            const files = mention === undefined
              ? []
              : [{ path: mention.relative, name: mention.relative.split('/').pop(), kind: mention.kind }]
            res.writeHead(200, {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store',
            })
            res.end(JSON.stringify({ files }))
            return
          }
          const entries = await walkWorkspace(cwd, {
            maxEntries: config.maxIndexedFiles,
            ignoreDirs: config.ignoreDirs,
            ignoreExtensions: config.ignoreExtensions,
            maxDepth: config.maxDepth,
          })
          const q = query.trim().toLowerCase()
          // Files only (no directories) in the @ picker.
          const files = (q === ''
            ? entries
            : entries.filter((entry) => entry.relative.toLowerCase().includes(q)))
            .filter((entry) => entry.kind === 'file')
            .map((entry) => ({ path: entry.relative, name: entry.name, kind: entry.kind }))
          res.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          })
          res.end(JSON.stringify({ files }))
        } catch (error) {
          ctx.logger.warn('[dsh-ref-file] files route failed: %s', error instanceof Error ? error.message : String(error))
          res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'internal' }))
        }
      },
    }), 'dsh-ref-file: files route')
  }

  registerWebSurface()
  ctx.on('internal/service', (serviceName: string) => {
    if (serviceName === WEB_SERVER_KEYS[0] || serviceName === WEB_SERVER_KEYS[1]) registerWebSurface()
  })

  // ── pre-step: resolve @path mentions, injecting file content ─────────────
  ctx.on('agent/pre-step', async ({ agent, messages, signal }, next) => {
    return mentionPreStep(
      agent,
      () => true,
      messages,
      signal,
      next,
      { includeContent: config.includeContent, maxBytes: config.maxBytes },
    )
  })
}

export { expandMentions } from './mention.ts'
export { DEFAULT_IGNORE_DIRS } from './defaults.ts'
