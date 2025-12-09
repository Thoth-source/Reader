## Objectives
- Precisely center numbers in highlight clusters
- Make chapter indicators readable, clickable, and well-separated on the progress bar
- Adjust filter selection rings to overlap (remove white gap), darker shade, thicker ring
- Speed up overview modal loading via pre-compute + caching + lazy compute
- Add more book info (cover card, title, author, quick stats) and verify UX quality

## Highlight Dots Alignment
- Switch cluster element layout to CSS grid with `place-items: center` and ensure `line-height: 1` for count text
- Enforce fixed size for cluster dot (e.g., 18–20px), ensure count font uses `font-size` that visually centers without ascenders/descenders issues
- Verify center across DPI/scales: use devtools device emulation to check at 100%, 125%, 150% scale; adjust with `font-weight` and `letter-spacing` if needed

## Chapter Indicators Visibility
- Position chapter markers along the bar using chapter CFIs → percent map (reuse cache)
- Style: increase label font to 12–13px, stronger contrast (use `var(--text-primary)`), add subtle pill background with border + tick down to bar
- Separation: when markers collide, stack intelligently (offset Y alternation) and add hover tooltip with full chapter name
- Interaction: click marker → open reader and navigate to chapter CFI; close modal immediately on click

## Color Overlap Implementation (Filter Rings)
- Replace blue selection ring with darker shade of the selected color (computed programmatically)
- Implement thicker ring using CSS `outline` and `outline-offset: -2px` to overlap by 1–2px into the circle; fallback: `box-shadow: 0 0 0 <thickness> <ring>` if needed
- Remove visible white gap between ring and fill by calibrating negative offset; verify against light/dark themes for readability
- Accessibility: ensure 4.5:1 contrast ratio for ring vs background; provide `aria-pressed` for selected state

## Performance Optimization
- Pre-computation: when importing EPUBs (or on first overview open), compute and store chapter CFIs and chapter percent positions
- Caching: persist `overviewCache` per book in library store (chapters: `{href, cfi, percent}`, highlights: `{id, percent}`); incremental update on new/edited highlights only
- Lazy loading: show modal instantly with cached positions; if cache missing, compute in background and update UI
- Reuse live book context: if the book is already open in the reader, reuse `book1.locations` to avoid a second EPUB parse
- Profiling: instrument timing with `performance.now()` around parse and locations generation; surface metrics in dev logs

## Book Overview Content
- Header card: cover (same card style as library), title, author
- Stats: progress %, total highlights, notes count, bookmarks
- Filters: tag chips (spacing), color dots (thicker, darker ring overlap)
- Navigation: large progress bar, chapter markers, highlight dots/clusters; clicking a cluster navigates to the first highlight and closes the modal

## QA & Metrics
- Alignment checks: verify cluster count centering at common scales (100/125/150%), test on Windows high-DPI
- Visibility checks: ensure marker labels readable in light/dark; hover tooltip shows full name
- Performance baselines: record average time before/after caching; target sub-300ms for cached overview open on mid-size EPUB
- Regression: confirm existing Reader/Library flows unaffected; verify duplicate highlights do not appear by removing/reapplying annotations once per render

## Rollout & Fallback
- Implement cache write-through on compute; read on modal open
- Add dev-only debug toggle to display timing stats
- If cache fails or is stale, fall back to live computation and preserve responsiveness

## Deliverables
- Updated CSS and JS for alignment, markers, filter rings (with overlap)
- Caching layer for overview positions (store in existing library persistence)
- QA checklist outcomes and perf metrics summary
