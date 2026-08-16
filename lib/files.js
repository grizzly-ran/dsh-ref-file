/**
 * Bounded workspace path walk for the @file picker: dirs-first, ignore-aware,
 * depth/entry capped, no symlink following.
 * @module dsh-ref-file/files
 */
import { readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
const IGNORE_NAMES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);
/** Whether a file name ends in one of the excluded extensions (lowercased). */
function isIgnoredExtension(name, ignoreExtensions) {
    const dot = name.lastIndexOf('.');
    if (dot === -1 || dot === name.length - 1)
        return false;
    const ext = name.slice(dot + 1).toLowerCase();
    return ext !== '' && ignoreExtensions.includes(ext);
}
/** Recursively list workspace entries, bounded and ignore-aware. */
export async function walkWorkspace(root, options) {
    const out = [];
    let budget = options.maxEntries;
    const walk = async (dir, depth) => {
        if (depth > options.maxDepth || budget <= 0)
            return;
        let entries;
        try {
            entries = await readdir(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        const dirs = [];
        const files = [];
        for (const entry of entries) {
            // Dot-prefixed entries (files AND directories) never surface in the
            // picker: `.gitignore`, `.env`, `.agent-teams/…` stay out of the @ menu.
            if (entry.name.startsWith('.') || IGNORE_NAMES.has(entry.name))
                continue;
            if (entry.isDirectory()) {
                if (options.ignoreDirs.includes(entry.name))
                    continue;
                dirs.push(entry.name);
            }
            else if (entry.isFile()) {
                if (isIgnoredExtension(entry.name, options.ignoreExtensions))
                    continue;
                files.push(entry.name);
            }
        }
        for (const name of dirs) {
            if (budget <= 0)
                return;
            out.push({ relative: relOf(root, join(dir, name)), name, kind: 'dir' });
            budget -= 1;
            await walk(join(dir, name), depth + 1);
        }
        for (const name of files) {
            if (budget <= 0)
                return;
            out.push({ relative: relOf(root, join(dir, name)), name, kind: 'file' });
            budget -= 1;
        }
    };
    await walk(root, 0);
    return out;
}
function relOf(root, absolute) {
    const rel = absolute.slice(root.length).replace(/^[/\\]/, '');
    return rel.split(sep).join('/');
}
