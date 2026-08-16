/**
 * dsh-ref-file browser half: registers the `@` file-picker source and the
 * in-card reference rail (conversation.input.overlay anchor — INSIDE the
 * composer card, above the textarea, the image-thumbnail position). Picks
 * land plain-text `@path` tokens (caret exact, multiple references work by
 * typing `@` again); the rail renders each CONFIRMED reference as an
 * attachment-style card; the Host pre-step boundary injects the content.
 * @module dsh-ref-file/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
