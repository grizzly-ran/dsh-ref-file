export interface WorkspaceEntry {
    /** Workspace-relative path with forward slashes (picker value). */
    readonly relative: string;
    /** Directory basename (display name). */
    readonly name: string;
    readonly kind: 'file' | 'dir';
}
export interface WalkOptions {
    readonly maxEntries: number;
    readonly ignoreDirs: readonly string[];
    readonly ignoreExtensions: readonly string[];
    readonly maxDepth: number;
}
/** Recursively list workspace entries, bounded and ignore-aware. */
export declare function walkWorkspace(root: string, options: WalkOptions): Promise<readonly WorkspaceEntry[]>;
