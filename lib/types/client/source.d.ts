/**
 * The `@` input-trigger source: fetches the workspace index from the host
 * files route and serves Codex/Claude-style file candidates. Picks land the
 * plain-text `@path ` token — no inline chip — so the caret stays exact and
 * MULTIPLE references work by typing `@` again. The dock above the input
 * renders confirmed references as attachment-style cards merged into the
 * composer card's top, and the Host pre-step boundary injects file content.
 * @module dsh-ref-file/client/source
 */
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
declare module '@deepseek-ai/dsh-client-ui-input-trigger/client' {
    interface InputTriggerCandidate {
        /** Source-owned stable value when the visible name is only a display label. */
        readonly value?: string;
    }
}
/** One indexed workspace entry from the host route. */
export interface FileEntry {
    readonly path: string;
    readonly name: string;
    readonly kind: 'file' | 'dir';
}
export interface FilesResponse {
    readonly files: readonly FileEntry[];
}
/** Owner source name (menu group label). */
export declare const SOURCE_NAME = "\u6587\u4EF6\u5F15\u7528";
/** The host listing endpoint, addressed per session. */
export declare function filesUrl(sessionId: string, query: string): string;
/** Build the `@` trigger source over the injected fetch face. */
export declare function createAtFileSource(fetchImpl: (url: string, signal: AbortSignal) => Promise<Response>): InputTriggerSource;
