/**
 * Host-side @file reference resolution: recognize `@path[:start[-end]]` tokens
 * in the outgoing user message, validate each path inside the workspace, and
 * inject the referenced FILE's actual content into the model input (capped,
 * binary-safe, optional line slice). Directories inject an existence marker
 * only. Only `source.kind === 'user'` text is scanned, so external text cannot
 * forge a reference.
 * @module dsh-ref-file/mention
 */
import { isAbsolute, relative as pathRelative, resolve, sep } from 'node:path';
import { stat, open } from 'node:fs/promises';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
/** The literal mention token: `@` then a path with no whitespace or `@`. */
const MENTION_PATTERN = /@([^\s@]+)/g;
/** Upper bound on bytes read for line-slicing (line ranges need the region). */
const LINE_SLICE_READ_CAP = 1_000_000;
/** Parse an optional trailing `:start[-end]` line suffix off a raw token. */
export function parseLineSuffix(raw) {
    const match = /^(.*):(\d+)(?:-(\d+))?$/.exec(raw);
    if (match === null)
        return { path: raw };
    const start = Number(match[2]);
    if (!Number.isSafeInteger(start) || start < 1)
        return { path: raw };
    const endRaw = match[3];
    if (endRaw === undefined)
        return { path: match[1], lines: { start, end: start } };
    const end = Number(endRaw);
    if (!Number.isSafeInteger(end) || end < start)
        return { path: raw };
    return { path: match[1], lines: { start, end } };
}
/**
 * Scan one text block for `@path` mentions, deduplicated in first-seen order.
 * A trailing slash (the directory chip form) is stripped from the path.
 * @param text - the message text block.
 * @returns unique parsed mentions.
 */
export function scanMentions(text) {
    const seen = new Set();
    const out = [];
    for (const match of text.matchAll(MENTION_PATTERN)) {
        const raw = match[1];
        const { path, lines } = parseLineSuffix(raw);
        const relative = path.endsWith('/') ? path.slice(0, -1) : path;
        if (relative === '' || relative === '.')
            continue;
        const key = lines === undefined ? relative : `${relative}:${lines.start}-${lines.end}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push({ relative, kind: 'file', ...(lines === undefined ? {} : { lines }) });
    }
    return out;
}
/**
 * Resolve one token to an absolute path and its kind, confined to the cwd.
 * @param token - workspace-relative token.
 * @param cwd - the session's workspace directory.
 * @param signal - caller lifetime.
 * @returns the resolved mention, or undefined when it is not inside the workspace.
 */
export async function resolveMention(token, cwd, signal) {
    if (isAbsolute(token))
        return undefined;
    const absolute = resolve(cwd, token);
    const confined = pathRelative(cwd, absolute);
    if (confined === '..' || confined.startsWith(`..${sep}`) || isAbsolute(confined)) {
        return undefined;
    }
    signal.throwIfAborted();
    const info = await stat(absolute).catch(() => undefined);
    signal.throwIfAborted();
    if (info === undefined)
        return undefined;
    const relative = confined.split(sep).join('/') || '.';
    return { relative, kind: info.isDirectory() ? 'dir' : 'file' };
}
/**
 * Read a referenced file's content for injection. Binary files and read
 * failures return undefined (the existence marker is still injected). Content
 * is capped at `maxBytes`; a line range slices first (read region bounded).
 * @param absolute - resolved absolute path (already validated inside cwd).
 * @param lines - optional 1-based inclusive line range.
 * @param maxBytes - content cap.
 * @returns the utf-8 text, or undefined when unreadable/binary/oversized.
 */
async function readContent(absolute, lines, maxBytes) {
    let handle;
    try {
        handle = await open(absolute, 'r');
        const info = await handle.stat();
        if (!info.isFile() || info.size === 0)
            return undefined;
        // Binary sniff on the head.
        const head = Buffer.alloc(8192);
        const { bytesRead: headRead } = await handle.read(head, 0, head.length, 0);
        if (head.subarray(0, headRead).includes(0))
            return undefined;
        const readSize = lines !== undefined
            ? Math.min(info.size, LINE_SLICE_READ_CAP)
            : Math.min(info.size, maxBytes + 1);
        const buf = Buffer.alloc(readSize);
        const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
        let text = buf.subarray(0, bytesRead).toString('utf8');
        if (lines !== undefined) {
            const slice = text.split('\n').slice(lines.start - 1, lines.end);
            text = slice.join('\n');
        }
        const truncated = info.size > maxBytes || text.length > maxBytes;
        if (truncated)
            text = `${text.slice(0, maxBytes)}\n…[truncated ${info.size} bytes]`;
        return text;
    }
    catch {
        return undefined;
    }
    finally {
        await handle?.close();
    }
}
/** Escape one XML-like attribute without modifying the referenced path. */
function escapeAttribute(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}
/** The model-facing reference form for one mention. */
function referenceForm(mention, content) {
    const kind = mention.kind === 'dir' ? 'directory' : 'file';
    const attrs = [`path="${escapeAttribute(mention.relative)}"`, `kind="${kind}"`];
    if (mention.kind === 'file' && mention.lines !== undefined) {
        attrs.push(`lines="${mention.lines.start}-${mention.lines.end}"`);
    }
    const attrsText = attrs.join(' ');
    if (content === undefined)
        return `<file-reference ${attrsText} />`;
    return `<file-reference ${attrsText}>\n<content>\n${content}\n</content>\n</file-reference>`;
}
/**
 * Expand every `@path` mention into a validated reference; files inject their
 * content when enabled. Unknown paths stay plain prose.
 * @param messages - the assembled step messages.
 * @param cwd - the session's workspace directory.
 * @param signal - caller lifetime.
 * @param options - content injection control.
 * @returns the injected user messages (empty when nothing matched).
 */
export async function expandMentions(messages, cwd, signal, options = { includeContent: true, maxBytes: 20000 }) {
    if (cwd === undefined || !isAbsolute(cwd))
        return [];
    const tokens = [];
    // Whole-message dedup: the same @path referenced twice in one message gets
    // injected ONCE (each token below is already deduped per text block).
    const seen = new Set();
    for (const message of messages) {
        if (message.source.kind !== 'user')
            continue;
        for (const block of message.content) {
            if (block.type !== 'text')
                continue;
            for (const mention of scanMentions(block.text)) {
                const key = mention.lines === undefined ? mention.relative : `${mention.relative}:${mention.lines.start}-${mention.lines.end}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                tokens.push(mention);
            }
        }
    }
    const injections = [];
    for (const token of tokens) {
        signal.throwIfAborted();
        const mention = await resolveMention(token.relative, cwd, signal);
        if (mention === undefined)
            continue;
        const resolved = token.lines !== undefined
            ? { ...mention, lines: token.lines }
            : mention;
        let content;
        if (resolved.kind === 'file' && options.includeContent) {
            signal.throwIfAborted();
            content = await readContent(resolve(cwd, resolved.relative), resolved.lines, options.maxBytes);
        }
        injections.push(createUserMessage({
            content: [{ type: 'text', text: referenceForm(resolved, content) }],
            source: { kind: 'plugin', plugin: 'dsh-ref-file' },
        }));
    }
    return injections;
}
/**
 * The `agent/pre-step` listener body: expand mentions in the claimed user
 * messages and append the injections to the downstream decision.
 */
export async function mentionPreStep(agent, isEnabled, messages, signal, next, options = { includeContent: true, maxBytes: 20000 }) {
    const decision = await next();
    if (decision.kind === 'reject')
        return decision;
    if (!isEnabled())
        return decision;
    const injections = await expandMentions(messages, agent.session.header.cwd, signal, options);
    if (injections.length === 0)
        return decision;
    return { kind: 'enter', messages: [...decision.messages, ...injections] };
}
