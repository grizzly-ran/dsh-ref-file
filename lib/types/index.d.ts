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
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "dsh-ref-file";
export declare const inject: string[];
export interface Config {
    /** Inject referenced file CONTENT into the model input (true = Claude-Code style). */
    includeContent: boolean;
    /** Hard cap on injected content bytes per referenced file (truncated beyond). */
    maxBytes: number;
    /** Hard cap on indexed entries per workspace for the picker route. */
    maxIndexedFiles: number;
    /** Directory basenames the picker walk skips entirely. */
    ignoreDirs: string[];
    /** File extensions (no dot, lowercased) the picker hides — media/binaries. */
    ignoreExtensions: string[];
    /** Maximum directory depth the picker walk descends to. */
    maxDepth: number;
}
export declare const Config: z<Schemastery.ObjectS<{
    includeContent: z<boolean, boolean>;
    maxBytes: z<number, number>;
    maxIndexedFiles: z<number, number>;
    ignoreDirs: z<string[], string[]>;
    ignoreExtensions: z<string[], string[]>;
    maxDepth: z<number, number>;
}>, Schemastery.ObjectT<{
    includeContent: z<boolean, boolean>;
    maxBytes: z<number, number>;
    maxIndexedFiles: z<number, number>;
    ignoreDirs: z<string[], string[]>;
    ignoreExtensions: z<string[], string[]>;
    maxDepth: z<number, number>;
}>>;
export declare function apply(ctx: Context, rawConfig?: Config): void;
export { expandMentions } from './mention.ts';
export { DEFAULT_IGNORE_DIRS } from './defaults.ts';
