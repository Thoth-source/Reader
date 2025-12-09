## Error Resolution
- Use a resilient chapter position pipeline:
  - Prefer live `book1.locations` when the book is already open.
  - Fallback to persisted `overviewCache` (chapter CFIs/percents); rehydrate UI instantly.
  - If neither is available, compute positions in background via a temporary EPUB instance, render UI as soon as partial data is ready.
- Always keep fallback actions usable:
  - "Read" resumes last page immediately (modal closes).
  - "Open TOC" opens the reader and expands the sidebar TOC or shows an in‑modal TOC pane when sidebar isn’t available.

## Chapter Visualization (Progress Bar)
- Remove highlight dots and filter UI entirely from the Overview.
- Persist a Title Page marker at 0%.
- Generate chapter tick marks from CFIs→percent; alternate rows to avoid collisions.
- Hover over a tick shows a tooltip with full chapter name; click navigates and closes modal.
- Enhanced TOC presentation:
  - In the modal: scrollable chapter list with search, labels and percent; click navigates.
  - In the reader: ensure sidebar TOC opens reliably when requested.

## Modal Enhancements
- Increase modal size to feature a larger cover (card shape), title, and author.
- Add tagging with edit capabilities directly in the modal:
  - Reuse existing tag color palette and add/remove flow.
  - Persist to library store on save.
- Consolidate card menu functions into the modal footer/body:
  - Open in Viewer 1/2, Edit Details, Manage Tags, Remove (confirm).
- Remove redundant options from book cards (keep simple click → Overview).

## User Engagement Tracking
- Track and display:
  - Last session date/time (on Reader open/close).
  - Last page read (current CFI and resolved chapter label).
  - Session count and cumulative reading time.
- Show metrics in the modal header/stats row; update on each reading session.

## Performance & Caching
- Pre-compute and store:
  - Chapter CFIs and percent positions per book.
  - Highlight percents (for internal use only; not visualized in Overview).
- Lazy compute strategy:
  - First open: show cached instantly, compute missing values in background, write-through to cache.
- Reuse live context:
  - If the book is open, reuse `book1.locations` and `navigation.toc` to avoid a second parse.
- Profile with `performance.now()` around parse/locations; log timings.

## Responsive & Accessibility
- Modal and layout scale across widths (mobile → desktop), maintaining readable chapter labels and usable click targets.
- Tooltips readable in light/dark themes; ensure contrast with `--text-primary`/`--bg-primary`.
- Chapter markers keyboard-focusable; Enter triggers navigation.

## QA & Metrics
- Cross-browser/device checks (Windows high-DPI, macOS, typical resolutions).
- Verify chapter hover tooltips, click navigation, and modal close actions.
- Measure overview open times before/after caching; target sub‑300ms with cache.
- Ensure no regressions in Reader/Library flows; confirm duplicate highlights do not render.

## Rollout Steps
1. Remove highlight dot/filter UI and related codepaths from Overview.
2. Implement robust chapter tick generation, hover tooltips, and click nav (with modal close).
3. Expand modal size; add cover, title, author; integrate tagging and card actions.
4. Add engagement metrics tracking and display in modal.
5. Implement caching and reuse of live locations; instrument performance.
6. Test responsiveness, accessibility, and error fallbacks.

## Deliverables
- Updated Overview modal UI focused on chapters and book info.
- Tagging edit workflow within modal; consolidated actions.
- Engagement metrics tracking and display.
- Performance/caching improvements and error-safe fallbacks.