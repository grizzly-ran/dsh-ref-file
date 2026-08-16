/** Locale dictionaries for the @file dock (aria/remove labels). */
export declare const NS = "dsh-ref-file";
export declare const zh: {
    'dock.aria': string;
    'dock.remove': string;
};
export declare const en: {
    'dock.aria': string;
    'dock.remove': string;
};
/** Key union for the locale namespace augmentation. */
export type RefFileKey = keyof typeof zh | keyof typeof en;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The @file reference copy. */
        [NS]: RefFileKey;
    }
}
