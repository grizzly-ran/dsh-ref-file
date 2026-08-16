import z from '@deepseek-ai/schemastery';
import { mentionPreStep, resolveMention } from "./mention.js";
import { walkWorkspace } from "./files.js";
import { DEFAULT_IGNORE_DIRS, DEFAULT_IGNORE_EXTENSIONS } from "./defaults.js";
export const name = 'dsh-ref-file';
export const inject = ['agents'];
export const Config = z.object({
    includeContent: z.boolean().default(true),
    maxBytes: z.natural().min(1).default(20000),
    maxIndexedFiles: z.natural().min(1).default(5000),
    ignoreDirs: z.array(z.string()).default([...DEFAULT_IGNORE_DIRS]),
    ignoreExtensions: z.array(z.string()).default([...DEFAULT_IGNORE_EXTENSIONS]),
    maxDepth: z.natural().min(1).default(8),
});
const WEB_SERVER_KEYS = ['webServer', 'httpServer'];
const WORKSPACE_KEYS = ['workspaceRegistry', 'workspace'];
export function apply(ctx, rawConfig) {
    const config = Config(rawConfig ?? {});
    // ── @file picker listing route (lazy: web profiles only) ─────────────────
    let webRegistered = false;
    const registerWebSurface = () => {
        if (webRegistered)
            return;
        const webServer = (ctx.get(WEB_SERVER_KEYS[0]) ?? ctx.get(WEB_SERVER_KEYS[1]));
        const workspaceRegistry = (ctx.get(WORKSPACE_KEYS[0]) ?? ctx.get(WORKSPACE_KEYS[1]));
        if (webServer === undefined)
            return;
        webRegistered = true;
        ctx.effect(() => webServer.register({
            kind: 'exact',
            path: '/plugins/dsh-ref-file/files',
            handler: async (req, res) => {
                try {
                    const url = new URL(String(req.url ?? '/'), 'http://localhost');
                    const sessionId = url.searchParams.get('session');
                    const query = url.searchParams.get('q') ?? '';
                    let cwd;
                    if (sessionId !== null && sessionId !== '') {
                        const agent = ctx.agents.get(sessionId);
                        cwd = agent?.session.header.cwd;
                    }
                    if (cwd === undefined && workspaceRegistry !== undefined) {
                        cwd = workspaceRegistry.list()[0]?.path;
                    }
                    if (cwd === undefined) {
                        res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: 'no workspace' }));
                        return;
                    }
                    // Single-path existence check (the dock verifies @ tokens before
                    // rendering a chip): exact= returns at most one entry.
                    const exact = url.searchParams.get('exact');
                    if (exact !== null && exact !== '') {
                        const mention = await resolveMention(exact, cwd, new AbortController().signal);
                        const files = mention === undefined
                            ? []
                            : [{ path: mention.relative, name: mention.relative.split('/').pop(), kind: mention.kind }];
                        res.writeHead(200, {
                            'content-type': 'application/json; charset=utf-8',
                            'cache-control': 'no-store',
                        });
                        res.end(JSON.stringify({ files }));
                        return;
                    }
                    const entries = await walkWorkspace(cwd, {
                        maxEntries: config.maxIndexedFiles,
                        ignoreDirs: config.ignoreDirs,
                        ignoreExtensions: config.ignoreExtensions,
                        maxDepth: config.maxDepth,
                    });
                    const q = query.trim().toLowerCase();
                    // Files only (no directories) in the @ picker.
                    const files = (q === ''
                        ? entries
                        : entries.filter((entry) => entry.relative.toLowerCase().includes(q)))
                        .filter((entry) => entry.kind === 'file')
                        .map((entry) => ({ path: entry.relative, name: entry.name, kind: entry.kind }));
                    res.writeHead(200, {
                        'content-type': 'application/json; charset=utf-8',
                        'cache-control': 'no-store',
                    });
                    res.end(JSON.stringify({ files }));
                }
                catch (error) {
                    ctx.logger.warn('[dsh-ref-file] files route failed: %s', error instanceof Error ? error.message : String(error));
                    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'internal' }));
                }
            },
        }), 'dsh-ref-file: files route');
    };
    registerWebSurface();
    ctx.on('internal/service', (serviceName) => {
        if (serviceName === WEB_SERVER_KEYS[0] || serviceName === WEB_SERVER_KEYS[1])
            registerWebSurface();
    });
    // ── pre-step: resolve @path mentions, injecting file content ─────────────
    ctx.on('agent/pre-step', async ({ agent, messages, signal }, next) => {
        return mentionPreStep(agent, () => true, messages, signal, next, { includeContent: config.includeContent, maxBytes: config.maxBytes });
    });
}
export { expandMentions } from "./mention.js";
export { DEFAULT_IGNORE_DIRS } from "./defaults.js";
