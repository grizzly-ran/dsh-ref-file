# AGENTS.md

Out-of-tree DeepSeek Harness plugin (host + Web client bundle).

## Layout

```
src/index.ts        host entry: function plugin (name/inject/Config/apply)
src/mention.ts      Host pre-step @file resolver: token grammar, content injection
src/files.ts        bounded workspace path walk (ignore-aware)
src/defaults.ts     built-in ignored dirs + media/binary extensions
src/client/         browser half, served as /plugins/dsh-ref-file/client.js
  index.ts          apply: register @ source + overlay card rail + styles
  source.ts         InputTriggerSource (@ picker over the host files route)
  dock.tsx          in-input reference cards (conversation.input.overlay)
  styles.ts         injected CSS (card rail + :has text push)
tests/              node-env specs for mention/files logic
```

## Contracts with the harness (do not drift)

- The picker route `/plugins/dsh-ref-file/files` is session-addressed
  (`?session=<id>&q=`); `exact=` returns a single-path existence check.
- The `@path` token grammar `@[^\s@]+(:[start](-[end]))?` is shared verbatim
  between the client dock, the source pick, and the Host `scanMentions`.
- `agent/pre-step` waterfall: scan only `source.kind === 'user'` text, resolve
  inside `agent.session.header.cwd` (confinement-checked), inject a
  `<file-reference>` user message via `createUserMessage` with source
  `{kind: 'plugin', plugin: 'dsh-ref-file'}`.
- The client composes only through standing seams (`inputTriggers.registerSource`,
  `slots.inject('conversation.input.overlay')`, injected `<style>` tag). No
  `@deepseek-ai` value imports in the client bundle.
- In-input cards: `conversation.input.overlay` anchor + `:has()` padding push;
  keep the rail single-row and width-bounded so text is never hidden.

## Check ladder

`pnpm check` (typecheck + tests + build) must be green before every commit;
`lib/` is committed (profile installs run without a build).
