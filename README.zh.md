# dsh-ref-file

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-339933.svg)
![dsh](https://img.shields.io/badge/dsh-DeepSeek%20Harness%20compatible-4B32C3.svg)
![version](https://img.shields.io/badge/version-0.1.0-blue.svg)

中文 | [English](README.md)

Codex / Claude 对齐的 `@` 文件引用插件：输入框里打 `@` 搜索工作区文件并引用；发送消息时把**文件真实内容注入模型输入**——agent 读到的不是路径符号，而是文件本身。

## 特性

- **`@` 工作区文件选择器** — 打 `@` 搜索文件（文件名/前缀排序、按会话定位、有界遍历）。只显示文件：目录、点开头文件/目录（`.env`、`.gitignore`、`.agent-teams/…`）、媒体/二进制（png/mp4/mp3/pdf/zip/…）默认全部排除。
- **真实内容注入** — 每个 agent 的 pre-step 边界校验 `@path` 在工作区内并注入文件内容：
  ```xml
  <file-reference path="src/a.ts" kind="file" lines="2-4">
  <content>
  ……真实的行内容……
  </content>
  </file-reference>
  ```
- **行号区间** — `@path:12` 或 `@path:3-7` 只注入指定行。
- **多文件引用** — 一条消息可引用任意多个文件；相同引用只注入一次。
- **输入框内引用卡片** — 确认存在的引用以附件式卡片（文件图标 + 蓝色文件名 + ×移除）渲染在输入框卡片内部（图片缩略图的位置）；未确认的 `@文本` 不显示任何东西。
- **二进制安全 + 截断** — 二进制文件只给存在标记；文本按 `maxBytes`（默认 20KB）截断并带提示。
- **防穿越** — 只扫描 `user` 来源文本；绝对路径和 `../` 逃逸一律拒绝。

## 安装

```sh
dsh plugin --profile web add <本包路径或 tarball>
```

安装后**重启 `dsh web`**（host 代码与 client bundle 启动时加载、bundle 内容进程内缓存）并硬刷新浏览器。

## 使用

1. 输入框打 `@` → 文件选择器弹出
2. 选一个文件（可多次 `@` 选多个）→ 输入框内出现蓝色引用卡片
3. 发送 → 模型输入里出现 `<file-reference>` + 文件内容

手写 `@路径` 同样生效，支持行号区间（`@src/a.ts:3-7`）。

## 配置

在 profile 的 `cordis.patch.yml` 覆盖（行 id 为 `ref-file`）：

```yaml
- id: ref-file
  config:
    includeContent: true        # 注入文件内容（false = 仅路径标记）
    maxBytes: 20000             # 单文件内容上限
    maxIndexedFiles: 5000       # 选择器索引上限
    maxDepth: 8                 # 选择器遍历深度
    ignoreDirs: [node_modules]  # 额外跳过的目录名
    ignoreExtensions: []        # 额外隐藏的扩展名（空 = 内置默认列表）
```

内置 `ignoreExtensions` 覆盖图片、视频、音频、压缩包、可执行与二进制资产。

## 工作原理

- **client**（`src/client/`）：`@` 触发源（`InputTriggerSource`）从 host 路由拉取工作区索引、pick 落纯文本 `@path`；`conversation.input.overlay` 条目把确认的引用渲染成输入框内卡片。
- **host**（`src/mention.ts`）：`agent/pre-step` 瀑布扫描用户消息中的 `@path[:start[-end]]`，在工作区内解析（防穿越）、读取内容（二进制嗅探、上限、行切片），向下游 decision 追加 `<file-reference>` user 消息。
- **选择器路由**（`src/index.ts`）：`/plugins/dsh-ref-file/files` 列出工作区（忽略感知、有界）或校验单个路径（`exact=`）。

只扫描 `source.kind === 'user'` 文本，外部文本无法伪造引用。

## 开发

```sh
pnpm install            # 依赖（pnpm-workspace.yaml 已禁用 autoInstallPeers）
pnpm check              # typecheck + tests + build
```

`lib/` 已提交，profile 安装无需构建步骤。

## License

MIT
