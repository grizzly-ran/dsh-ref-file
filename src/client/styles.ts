/**
 * In-card reference rail: rendered inside the composer card's overlay anchor
 * (the card's top, above the textarea — the image-thumbnail position). A
 * single horizontally-scrollable row (fixed height), matching the composer
 * card's background so it reads as part of the input box. When cards are
 * present, `:has()` pushes the textarea down so text never hides underneath.
 */
export const STYLES = `
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
`
