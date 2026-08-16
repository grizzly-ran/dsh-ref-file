/**
 * Host @file resolution: token grammar (line suffixes), workspace confinement,
 * content injection, binary/oversize handling.
 */
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { UserMessage } from '@deepseek-ai/dsh-llm'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { scanMentions, parseLineSuffix, expandMentions, mentionPreStep } from '../src/mention.ts'

function user(text: string): UserMessage {
  return createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })
}

describe('scanMentions', () => {
  it('parses plain paths, directory slashes, and line suffixes', () => {
    expect(scanMentions('fix @src/index.ts and @docs/')).toEqual([
      { relative: 'src/index.ts', kind: 'file' },
      { relative: 'docs', kind: 'file' },
    ])
    expect(scanMentions('see @a.ts:12')).toEqual([
      { relative: 'a.ts', kind: 'file', lines: { start: 12, end: 12 } },
    ])
    expect(scanMentions('see @a.ts:3-7')).toEqual([
      { relative: 'a.ts', kind: 'file', lines: { start: 3, end: 7 } },
    ])
  })

  it('deduplicates identical mentions', () => {
    expect(scanMentions('@a.ts @a.ts')).toHaveLength(1)
  })
})

describe('parseLineSuffix', () => {
  it('accepts :L and :L1-L2, rejects malformed suffixes', () => {
    expect(parseLineSuffix('a.ts:5')).toEqual({ path: 'a.ts', lines: { start: 5, end: 5 } })
    expect(parseLineSuffix('a.ts:5-9')).toEqual({ path: 'a.ts', lines: { start: 5, end: 9 } })
    expect(parseLineSuffix('a.ts:0')).toEqual({ path: 'a.ts:0' })
    expect(parseLineSuffix('a.ts:9-3')).toEqual({ path: 'a.ts:9-3' })
    expect(parseLineSuffix('a.ts')).toEqual({ path: 'a.ts' })
  })
})

describe('expandMentions', () => {
  it('injects file content for a text file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ref-file-'))
    await writeFile(join(root, 'a.ts'), 'line one\nline two\nline three\n')
    try {
      const injections = await expandMentions([user('read @a.ts')], root, new AbortController().signal)
      expect(injections).toHaveLength(1)
      const text = (injections[0]!.content[0] as { type: 'text'; text: string }).text
      expect(text).toContain('<file-reference path="a.ts" kind="file">')
      expect(text).toContain('line one\nline two\nline three')
      expect(text).toContain('</content>\n</file-reference>')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('slices the requested line range', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ref-file-'))
    await writeFile(join(root, 'a.ts'), 'l1\nl2\nl3\nl4\nl5\n')
    try {
      const injections = await expandMentions([user('read @a.ts:2-4')], root, new AbortController().signal)
      const text = (injections[0]!.content[0] as { type: 'text'; text: string }).text
      expect(text).toContain('lines="2-4"')
      expect(text).toContain('l2\nl3\nl4')
      expect(text).not.toContain('l1')
      expect(text).not.toContain('l5')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps binary files as existence-only references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ref-file-'))
    await writeFile(join(root, 'img.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a, 0x0a]))
    try {
      const injections = await expandMentions([user('review @img.png')], root, new AbortController().signal)
      const text = (injections[0]!.content[0] as { type: 'text'; text: string }).text
      expect(text).toBe('<file-reference path="img.png" kind="file" />')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('caps oversized content with a truncation notice', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ref-file-'))
    await writeFile(join(root, 'big.ts'), 'x'.repeat(5000))
    try {
      const injections = await expandMentions([user('read @big.ts')], root, new AbortController().signal, {
        includeContent: true,
        maxBytes: 100,
      })
      const text = (injections[0]!.content[0] as { type: 'text'; text: string }).text
      expect(text).toContain('…[truncated')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('treats directories as existence-only references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ref-file-'))
    await mkdir(join(root, 'src'), { recursive: true })
    try {
      const injections = await expandMentions([user('inspect @src/')], root, new AbortController().signal)
      const text = (injections[0]!.content[0] as { type: 'text'; text: string }).text
      expect(text).toBe('<file-reference path="src" kind="directory" />')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('refuses traversal and unknown paths; scans user text only', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ref-file-'))
    await writeFile(join(root, 'a.ts'), 'x\n')
    try {
      expect(await expandMentions([user('read @../secret.ts')], root, new AbortController().signal)).toEqual([])
      expect(await expandMentions([user('read @missing.ts')], root, new AbortController().signal)).toEqual([])
      const plugin = createUserMessage({ content: [{ type: 'text', text: '@a.ts' }], source: { kind: 'plugin', plugin: 'x' } })
      expect(await expandMentions([plugin], root, new AbortController().signal)).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('mentionPreStep', () => {
  it('appends injections to the downstream enter decision', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-ref-file-'))
    await writeFile(join(root, 'a.ts'), 'content\n')
    try {
      const decision = await mentionPreStep(
        { session: { header: { cwd: root } } },
        () => true,
        [user('read @a.ts')],
        new AbortController().signal,
        async () => ({ kind: 'enter', messages: [] }),
      )
      expect(decision.kind).toBe('enter')
      expect(decision.messages).toHaveLength(1)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('returns the downstream decision when disabled', async () => {
    const decision = async () => ({ kind: 'enter', messages: [] })
    const out = await mentionPreStep(
      { session: { header: { cwd: '/ws' } } },
      () => false,
      [user('@a.ts')],
      new AbortController().signal,
      decision,
    )
    expect(out.messages).toEqual([])
  })
})
