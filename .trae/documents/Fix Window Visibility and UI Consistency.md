## Window Visibility: Diagnose and Fix
- Add a global `mainWindow` and create it with `show: false`, then call `win.once('ready-to-show', () => { win.center(); win.show(); win.focus(); })` to guarantee it appears and is focused.
- Implement single-instance behavior: `const gotLock = app.requestSingleInstanceLock()` and, on `second-instance`, focus/restore the existing window (`if (mainWindow) { mainWindow.restore(); mainWindow.show(); mainWindow.focus(); }`).
- Guard against off‑screen/minimized windows: on app ready and on second‑instance, call `mainWindow.isMinimized() && mainWindow.restore()` and `mainWindow.center()`.
- Add diagnostics for renderer failures: listen to `did-fail-load`, `render-process-gone`, and `unresponsive` on `webContents` to show a `dialog.showErrorBox` and optionally open DevTools for quick debugging.
- Keep existing `app.on('activate')` for macOS; on Windows, ensure we recreate a window if none exists when the app is triggered by a second instance.

## Button Styling Consistency
- Use the existing modal button patterns: apply the same styles used by `.modal-footer button` and `.btn-secondary` to any new actions (e.g., the “Export PDF” action) instead of custom classes.
- Move any ad‑hoc action areas (e.g., a custom `.modal-actions` block) into the standard `.modal-footer` and use consistent spacing, icons, and hover/focus effects.
- Align inline selection buttons (`.highlight-action`, `.highlight-color`) with theme tokens (color, border radius, hover) so they match other controls without changing their footprint.

## Modernize Tag Input
- Update the tag creation row to match existing input styles:
  - Style `input#newTagName` using the same rules as `.input-group input` (padding, border, radius, focus ring) or wrap it in `.input-group` markup for consistency.
  - Keep “Enter to add” behavior; prevent empty/duplicate tags and show a subtle inline validation message.
  - Ensure `.tag-color` buttons mirror `.note-color` visuals for a unified look.

## General UI Polish Pass
- Audit stock-looking elements flagged by the search:
  - Confirm `.search-input-wrapper`, `.page-input`, PDF zoom controls, and small sidebar buttons use the same design tokens.
  - Normalize hover/focus states across buttons and inputs for accessibility and consistency.
- Verify icons sizing/spacing (`<i class="fas ...">`) are consistent across actions.

## Verification
- Launch the app and confirm the window reliably appears, centers, and focuses; alt‑tab shows it.
- Test second instance handling (double‑launch) focuses the existing window.
- Open Highlights & Notes: confirm buttons look consistent; run “Export PDF”.
- Open Tag modal: check input styling and add/remove tags; validate UX.
- Quick sweep of other controls to confirm unified appearance.

If approved, I’ll implement these code and CSS updates, then run the app to verify each scenario end‑to‑end.