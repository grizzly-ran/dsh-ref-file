import { createAtFileSource } from "./source.js";
import { RefFileDock } from "./dock.js";
import { NS, zh, en } from "./locales.js";
import { STYLES } from "./styles.js";
export const inject = ['inputTriggers', 'slots', 'locale'];
/** Inject the dock stylesheet once (idempotent tag). */
function adoptStyles() {
    const tagId = 'dsh-ref-file/styles';
    if (typeof document !== 'undefined' && document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
        const tag = document.createElement('style');
        tag.dataset.plugin = 'dsh-ref-file';
        tag.dataset.pluginCss = tagId;
        tag.textContent = STYLES;
        document.head.appendChild(tag);
    }
}
export function apply(ctx) {
    adoptStyles();
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ref-file: dictionaries');
    ctx.effect(() => {
        const source = createAtFileSource(async (url, signal) => fetch(url, { cache: 'no-store', signal }));
        const unregister = ctx.get('inputTriggers').registerSource(source);
        return () => { unregister(); };
    }, 'dsh-ref-file: source');
    ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
        name: 'conversation.input.overlay',
        id: 'dsh-ref-file',
        order: 10,
        locale: NS,
    }, RefFileDock));
}
