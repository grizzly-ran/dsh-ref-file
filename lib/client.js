window.__ModuleLoader__.load({
	id: "dsh-ref-file",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/client/source.js
		/** Owner source name (menu group label). */
		const SOURCE_NAME = "文件引用";
		/** The host listing endpoint, addressed per session. */
		function filesUrl(sessionId, query) {
			return `/plugins/dsh-ref-file/files?${new URLSearchParams({
				session: sessionId,
				q: query
			}).toString()}`;
		}
		/** Build the `@` trigger source over the injected fetch face. */
		function createAtFileSource(fetchImpl) {
			return {
				trigger: "@",
				name: SOURCE_NAME,
				order: 1,
				async candidates(session, { query, signal }) {
					try {
						const response = await fetchImpl(filesUrl(session.sessionId, query), signal);
						if (!response.ok) return [];
						const data = await response.json();
						if (signal.aborted) return [];
						return data.files.map((file) => ({
							name: file.name,
							description: dirnameOf(file.path),
							value: file.path
						}));
					} catch {
						return [];
					}
				},
				warm() {},
				onPick({ candidate }) {
					return { text: `@${candidate.value ?? candidate.name} ` };
				}
			};
		}
		function dirnameOf(relative) {
			const index = relative.lastIndexOf("/");
			return index === -1 ? "" : relative.slice(0, index);
		}
		//#endregion
		//#region lib/client/dock.js
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
		/** The same token grammar the Host's reference scanner uses. */
		const MENTION_PATTERN = /@([^\s@]+)/g;
		/** Parse the draft's @path tokens in order, deduplicating by raw token. */
		function draftMentions(draft) {
			const seen = /* @__PURE__ */ new Set();
			const out = [];
			for (const match of draft.matchAll(MENTION_PATTERN)) {
				const raw = match[1];
				if (raw === "" || seen.has(raw)) continue;
				seen.add(raw);
				out.push({
					raw,
					start: match.index,
					end: match.index + match[0].length
				});
			}
			return out;
		}
		/** Draft text with one token span removed. */
		function withoutToken(draft, start, end) {
			return draft.slice(0, start) + draft.slice(end);
		}
		/** Host single-path existence check URL. */
		function exactUrl(sessionId, raw) {
			return `/plugins/dsh-ref-file/files?${new URLSearchParams({
				session: sessionId,
				exact: raw
			}).toString()}`;
		}
		/** Whether the workspace currently contains the exact @ token path. */
		async function isExactFile(sessionId, raw) {
			try {
				const response = await fetch(exactUrl(sessionId, raw), { cache: "no-store" });
				if (!response.ok) return false;
				return ((await response.json()).files?.length ?? 0) > 0;
			} catch {
				return false;
			}
		}
		/** Render the reference cards inside the composer; null while nothing confirmed. */
		function RefFileDock({ useInput, inputActions, useSession, t }) {
			const draft = useInput((state) => state.draft) ?? "";
			const sessionId = useSession((state) => state.sessionId);
			const tokens = draftMentions(draft);
			const [confirmed, setConfirmed] = (0, react.useState)(/* @__PURE__ */ new Set());
			(0, react.useEffect)(() => {
				if (sessionId === void 0) return;
				let alive = true;
				(async () => {
					const next = /* @__PURE__ */ new Set();
					await Promise.all(tokens.map(async (mention) => {
						if (await isExactFile(sessionId, mention.raw)) next.add(mention.raw);
					}));
					if (alive) setConfirmed(next);
				})();
				return () => {
					alive = false;
				};
			}, [tokens.map((mention) => mention.raw).join("|"), sessionId]);
			const mentions = tokens.filter((mention) => confirmed.has(mention.raw));
			if (mentions.length === 0) return null;
			return (0, react_jsx_runtime.jsx)("div", {
				className: "dsh_rf_rail",
				role: "group",
				"aria-label": t("dock.aria"),
				"data-ref-file-overlay": true,
				children: mentions.map((mention) => (0, react_jsx_runtime.jsxs)("span", {
					className: "dsh_rf_row",
					"data-ref-file-row": true,
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: "dsh_rf_icon",
							"aria-hidden": true,
							children: (0, react_jsx_runtime.jsxs)("svg", {
								viewBox: "0 0 16 16",
								fill: "none",
								children: [(0, react_jsx_runtime.jsx)("path", {
									d: "M3 2.5A1.5 1.5 0 0 1 4.5 1h3l3 3v9.5A1.5 1.5 0 0 1 9 15H4.5A1.5 1.5 0 0 1 3 13.5v-11Z",
									stroke: "currentColor",
									strokeWidth: "1.2"
								}), (0, react_jsx_runtime.jsx)("path", {
									d: "M7.5 1v3h3",
									stroke: "currentColor",
									strokeWidth: "1.2"
								})]
							})
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: "dsh_rf_path",
							title: mention.raw,
							children: mention.raw
						}),
						(0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsh_rf_remove",
							"aria-label": t("dock.remove", { name: mention.raw }),
							onClick: () => {
								inputActions.setDraft(withoutToken(draft, mention.start, mention.end));
							},
							children: (0, react_jsx_runtime.jsx)("svg", {
								viewBox: "0 0 16 16",
								"aria-hidden": true,
								children: (0, react_jsx_runtime.jsx)("path", {
									d: "M4 4l8 8M12 4l-8 8",
									stroke: "currentColor",
									strokeWidth: "1.4",
									strokeLinecap: "round"
								})
							})
						})
					]
				}, `${mention.start}:${mention.raw}`))
			});
		}
		//#endregion
		//#region lib/client/locales.js
		/** Locale dictionaries for the @file dock (aria/remove labels). */
		const NS = "dsh-ref-file";
		const zh = {
			"dock.aria": "文件引用",
			"dock.remove": "移除引用 {name}"
		};
		const en = {
			"dock.aria": "File references",
			"dock.remove": "Remove reference {name}"
		};
		//#endregion
		//#region lib/client/styles.js
		/**
		* In-card reference rail: rendered inside the composer card's overlay anchor
		* (the card's top, above the textarea — the image-thumbnail position). A
		* single horizontally-scrollable row (fixed height), matching the composer
		* card's background so it reads as part of the input box. When cards are
		* present, `:has()` pushes the textarea down so text never hides underneath.
		*/
		const STYLES = `
.dsh_rf_rail {
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 14px;
  right: 14px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 2px;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--dsw-alias-border-l2-darkmode-thin);
  background: var(--dsw-specific-input-major);
}
.dsh_rf_row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  height: 28px;
  padding: 0 4px 0 10px;
  border: 1px solid rgba(59, 130, 246, 0.45);
  border-radius: 9px;
  background: rgba(59, 130, 246, 0.08);
}
.dsh_rf_icon {
  flex: none;
  width: 14px;
  height: 14px;
  color: #3b82f6;
}
.dsh_rf_path {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #3b82f6;
  font-size: 13px;
  line-height: 18px;
}
.dsh_rf_remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--dsw-alias-label-dimmed);
  cursor: pointer;
  padding: 0;
}
.dsh_rf_remove svg {
  width: 12px;
  height: 12px;
}
.dsh_rf_remove:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
/* Push the textarea down while reference cards are present, so text is never
   hidden under the rail (the rail itself sits in the freed top area). */
.uV2eYG_card:has([data-ref-file-overlay]) .uV2eYG_scroll {
  padding-top: 42px;
}
`;
		//#endregion
		//#region lib/client/index.js
		const inject = [
			"inputTriggers",
			"slots",
			"locale"
		];
		/** Inject the dock stylesheet once (idempotent tag). */
		function adoptStyles() {
			const tagId = "dsh-ref-file/styles";
			if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-ref-file";
				tag.dataset.pluginCss = tagId;
				tag.textContent = STYLES;
				document.head.appendChild(tag);
			}
		}
		function apply(ctx) {
			adoptStyles();
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-ref-file: dictionaries");
			ctx.effect(() => {
				const source = createAtFileSource(async (url, signal) => fetch(url, {
					cache: "no-store",
					signal
				}));
				const unregister = ctx.get("inputTriggers").registerSource(source);
				return () => {
					unregister();
				};
			}, "dsh-ref-file: source");
			ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
				name: "conversation.input.overlay",
				id: "dsh-ref-file",
				order: 10,
				locale: NS
			}, RefFileDock));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map