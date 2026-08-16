# dsh-ref-file

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933.svg)
![dsh](https://img.shields.io/badge/dsh-DeepSeek%20Harness%20compatible-4B32C3.svg)
![version](https://img.shields.io/badge/version-0.1.0-blue.svg)

English | [中文](README.zh.md)

Codex/Claude-style `@file` mentions for DeepSeek Harness: type `@` in the
composer to search the workspace and reference a file; when you send the
message, the **actual file content is injected into the model input** — the
agent reads the referenced file for real, not just a path.

## Features

- **`@` workspace file picker** — type `@` to search files (filename/prefix
  ranking, session-addressed, bounded walk). Files only: directories, dotfiles
  (`.env`, `.gitignore`, `.agent-teams/…`) and media/binaries
  (png/mp4/mp3/pdf/zip/…) are excluded by default.
- **Real content injection** — at each agent's pre-step boundary, `@path`
  tokens are validated inside the workspace and the file bytes are injected:
  ```xml
  <file-reference path="src/a.ts" kind="file" lines="2-4">
  <content>
  …the actual lines…
  </content>
  </file-reference>
  ```
- **Line ranges** — `@path:12` or `@path:3-7` slices the file before injection.
- **Multi-file references** — reference any number of files in one message;
  identical references are injected once.
- **In-input reference cards** — confirmed references render as attachment-style
  cards (file icon + blue filename + remove) inside the composer card, in the
  same spot image thumbnails sit; unconfirmed `@text` renders nothing.
- **Binary-safe, capped** — binary files get an existence-only marker; text is
  capped (`maxBytes`, default 20 KB) with a truncation notice.
- **Traversal-safe** — only user-message text is scanned; absolute paths and
  `../` escapes are refused.

## Install

```sh
dsh plugin --profile web add <path-to-this-package-or-tarball>
```

Restart `dsh web` after installing (host code and the client bundle load at
boot; client bundle content is process-cached) and hard-refresh the browser.

## Usage

1. In the composer, type `@` — the file picker opens.
2. Pick a file (or several, one `@` at a time). A blue reference card appears
   inside the input box.
3. Send. The model input now contains `<file-reference>` with the file content.

Hand-typed `@path` tokens work the same way, including line ranges
(`@src/a.ts:3-7`).

## Configuration

Override via the profile's `cordis.patch.yml` (the row id is `ref-file`):

```yaml
- id: ref-file
  config:
    includeContent: true        # inject file content (false = path marker only)
    maxBytes: 20000             # per-file content cap
    maxIndexedFiles: 5000       # picker index cap
    maxDepth: 8                 # picker walk depth
    ignoreDirs: [node_modules]  # extra directory basenames to skip
    ignoreExtensions: []        # extra extensions to hide (empty = built-in list)
```

The built-in `ignoreExtensions` covers images, video, audio, archives,
executables, and binary assets.

## How it works

- **Client** (`src/client/`): an `@` `InputTriggerSource` fetches the
  workspace index from the host route and lands plain-text `@path` picks; a
  `conversation.input.overlay` entry renders confirmed references as in-input
  cards.
- **Host** (`src/mention.ts`): an `agent/pre-step` waterfall scans user
  messages for `@path[:start[-end]]`, resolves each inside the session cwd
  (confinement-checked), reads the content (binary-sniffed, capped, line-sliced)
  and appends a `<file-reference>` user message to the downstream decision.
- **Picker route** (`src/index.ts`): `/plugins/dsh-ref-file/files` lists the
  workspace (ignore-aware, bounded) or checks a single path (`exact=`).

Only `source.kind === 'user'` text is scanned, so external text cannot forge a
reference.

## Development

```sh
pnpm install            # deps (autoInstallPeers disabled in pnpm-workspace.yaml)
pnpm check              # typecheck + tests + build
```

`lib/` is committed so profile installs work without a build step.

## License

MIT
