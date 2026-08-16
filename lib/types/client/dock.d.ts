import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/** Full overlay-entry props: the session-standard kit (structural) plus the locale seat. */
export type RefFileDockProps = PropsLocale<'dsh-ref-file'> & {
    readonly useInput: (selector: (state: unknown) => unknown) => unknown;
    readonly inputActions: {
        readonly setDraft: (draft: string) => void;
    };
    readonly useSession: (selector: (state: {
        sessionId: string;
    }) => unknown) => unknown;
};
/** One parsed mention token in the draft, with its span for precise removal. */
interface DraftMention {
    readonly raw: string;
    readonly start: number;
    readonly end: number;
}
/** Parse the draft's @path tokens in order, deduplicating by raw token. */
export declare function draftMentions(draft: string): readonly DraftMention[];
/** Draft text with one token span removed. */
export declare function withoutToken(draft: string, start: number, end: number): string;
/** Host single-path existence check URL. */
export declare function exactUrl(sessionId: string, raw: string): string;
/** Whether the workspace currently contains the exact @ token path. */
export declare function isExactFile(sessionId: string, raw: string): Promise<boolean>;
/** Render the reference cards inside the composer; null while nothing confirmed. */
export declare function RefFileDock({ useInput, inputActions, useSession, t }: RefFileDockProps): JSX.Element | null;
export {};
