import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The @file reference cards, rendered INSIDE the composer card via the
 * `conversation.input.overlay` anchor (the card's top region, above the
 * textarea — the same place image thumbnails sit). One card per `@path` token
 * in the draft that is CONFIRMED to exist in the workspace; unconfirmed
 * tokens render nothing. The rail is a single horizontally-scrollable row
 * (fixed height, like the image AttachmentRail); when cards are present the
 * textarea is pushed down by CSS (`:has`) so text never hides under cards.
 * @module dsh-ref-file/client/dock
 */
import { useEffect, useState } from 'react';
/** The same token grammar the Host's reference scanner uses. */
const MENTION_PATTERN = /@([^\s@]+)/g;
/** Parse the draft's @path tokens in order, deduplicating by raw token. */
export function draftMentions(draft) {
    const seen = new Set();
    const out = [];
    for (const match of draft.matchAll(MENTION_PATTERN)) {
        const raw = match[1];
        if (raw === '' || seen.has(raw))
            continue;
        seen.add(raw);
        out.push({ raw, start: match.index, end: match.index + match[0].length });
    }
    return out;
}
/** Draft text with one token span removed. */
export function withoutToken(draft, start, end) {
    return draft.slice(0, start) + draft.slice(end);
}
/** Host single-path existence check URL. */
export function exactUrl(sessionId, raw) {
    const params = new URLSearchParams({ session: sessionId, exact: raw });
    return `/plugins/dsh-ref-file/files?${params.toString()}`;
}
/** Whether the workspace currently contains the exact @ token path. */
export async function isExactFile(sessionId, raw) {
    try {
        const response = await fetch(exactUrl(sessionId, raw), { cache: 'no-store' });
        if (!response.ok)
            return false;
        const data = (await response.json());
        return (data.files?.length ?? 0) > 0;
    }
    catch {
        return false;
    }
}
/** Render the reference cards inside the composer; null while nothing confirmed. */
export function RefFileDock({ useInput, inputActions, useSession, t }) {
    const draft = useInput((state) => state.draft) ?? '';
    const sessionId = useSession((state) => state.sessionId);
    const tokens = draftMentions(draft);
    const [confirmed, setConfirmed] = useState(new Set());
    const tokenKey = tokens.map((mention) => mention.raw).join('|');
    useEffect(() => {
        if (sessionId === undefined)
            return;
        let alive = true;
        void (async () => {
            const next = new Set();
            await Promise.all(tokens.map(async (mention) => {
                if (await isExactFile(sessionId, mention.raw))
                    next.add(mention.raw);
            }));
            if (alive)
                setConfirmed(next);
        })();
        return () => { alive = false; };
    }, [tokenKey, sessionId]);
    const mentions = tokens.filter((mention) => confirmed.has(mention.raw));
    if (mentions.length === 0)
        return null;
    return (_jsx("div", { className: "dsh_rf_rail", role: "group", "aria-label": t('dock.aria'), "data-ref-file-overlay": true, children: mentions.map((mention) => (_jsxs("span", { className: "dsh_rf_row", "data-ref-file-row": true, children: [_jsx("span", { className: "dsh_rf_icon", "aria-hidden": true, children: _jsxs("svg", { viewBox: "0 0 16 16", fill: "none", children: [_jsx("path", { d: "M3 2.5A1.5 1.5 0 0 1 4.5 1h3l3 3v9.5A1.5 1.5 0 0 1 9 15H4.5A1.5 1.5 0 0 1 3 13.5v-11Z", stroke: "currentColor", strokeWidth: "1.2" }), _jsx("path", { d: "M7.5 1v3h3", stroke: "currentColor", strokeWidth: "1.2" })] }) }), _jsx("span", { className: "dsh_rf_path", title: mention.raw, children: mention.raw }), _jsx("button", { type: "button", className: "dsh_rf_remove", "aria-label": t('dock.remove', { name: mention.raw }), onClick: () => { inputActions.setDraft(withoutToken(draft, mention.start, mention.end)); }, children: _jsx("svg", { viewBox: "0 0 16 16", "aria-hidden": true, children: _jsx("path", { d: "M4 4l8 8M12 4l-8 8", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round" }) }) })] }, `${mention.start}:${mention.raw}`))) }));
}
