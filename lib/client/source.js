/** Owner source name (menu group label). */
export const SOURCE_NAME = '文件引用';
/** The host listing endpoint, addressed per session. */
export function filesUrl(sessionId, query) {
    const params = new URLSearchParams({ session: sessionId, q: query });
    return `/plugins/dsh-ref-file/files?${params.toString()}`;
}
/** Build the `@` trigger source over the injected fetch face. */
export function createAtFileSource(fetchImpl) {
    return {
        trigger: '@',
        name: SOURCE_NAME,
        order: 1,
        async candidates(session, { query, signal }) {
            try {
                const response = await fetchImpl(filesUrl(session.sessionId, query), signal);
                if (!response.ok)
                    return [];
                const data = (await response.json());
                if (signal.aborted)
                    return [];
                return data.files.map((file) => ({
                    name: file.name,
                    description: dirnameOf(file.path),
                    value: file.path,
                }));
            }
            catch {
                return [];
            }
        },
        warm() {
            // The index is fetched lazily on the first menu open.
        },
        onPick({ candidate }) {
            const value = candidate.value ?? candidate.name;
            return { text: `@${value} ` };
        },
    };
}
function dirnameOf(relative) {
    const index = relative.lastIndexOf('/');
    return index === -1 ? '' : relative.slice(0, index);
}
