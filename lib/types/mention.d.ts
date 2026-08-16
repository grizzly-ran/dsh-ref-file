import type { UserMessage } from '@deepseek-ai/dsh-llm';
import type { PreStepDecision } from '@deepseek-ai/dsh-agent';
/** One recognized mention: workspace-relative path plus optional line slice. */
export interface Mention {
    readonly relative: string;
    readonly kind: 'file' | 'dir';
    /** 1-based inclusive line range (`@path:12` or `@path:12-34`); absent = whole file. */
    readonly lines?: {
        readonly start: number;
        readonly end: number;
    };
}
/** Options controlling content injection. */
export interface MentionOptions {
    readonly includeContent: boolean;
    readonly maxBytes: number;
}
/** Parse an optional trailing `:start[-end]` line suffix off a raw token. */
export declare function parseLineSuffix(raw: string): {
    path: string;
    lines?: Mention['lines'];
};
/**
 * Scan one text block for `@path` mentions, deduplicated in first-seen order.
 * A trailing slash (the directory chip form) is stripped from the path.
 * @param text - the message text block.
 * @returns unique parsed mentions.
 */
export declare function scanMentions(text: string): readonly Mention[];
/**
 * Resolve one token to an absolute path and its kind, confined to the cwd.
 * @param token - workspace-relative token.
 * @param cwd - the session's workspace directory.
 * @param signal - caller lifetime.
 * @returns the resolved mention, or undefined when it is not inside the workspace.
 */
export declare function resolveMention(token: string, cwd: string, signal: AbortSignal): Promise<Mention | undefined>;
/**
 * Expand every `@path` mention into a validated reference; files inject their
 * content when enabled. Unknown paths stay plain prose.
 * @param messages - the assembled step messages.
 * @param cwd - the session's workspace directory.
 * @param signal - caller lifetime.
 * @param options - content injection control.
 * @returns the injected user messages (empty when nothing matched).
 */
export declare function expandMentions(messages: readonly UserMessage[], cwd: string | undefined, signal: AbortSignal, options?: MentionOptions): Promise<UserMessage[]>;
/** The minimal agent face the pre-step handler reads. */
export interface MentionAgent {
    session: {
        header: {
            cwd?: string;
        };
    };
}
/**
 * The `agent/pre-step` listener body: expand mentions in the claimed user
 * messages and append the injections to the downstream decision.
 */
export declare function mentionPreStep(agent: MentionAgent, isEnabled: () => boolean, messages: readonly UserMessage[], signal: AbortSignal, next: () => Promise<PreStepDecision>, options?: MentionOptions): Promise<PreStepDecision>;
