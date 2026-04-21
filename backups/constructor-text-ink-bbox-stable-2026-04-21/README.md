# Constructor stable backup — 2026-04-21

Snapshot taken before refactoring text bbox to use real ink-pixels (instead of `actualBoundingBox` glyph metrics).

## What's stable here
- Mockup print-area geometry: `width: 54.9, height: 73.6` (oversize) — physical AR ≈ 0.788 (matches XS).
- PDF export uses real `physH` (no Y-stretch); `effectivePhysH = physH`.
- Debug logging in `exportPrintPdf.js` is present (per-layer cm bbox + composition bbox).
- Cyrillic text rendering via canvas in PDF is working.
- Shape effect offset matches between constructor and PDF.

## Known issue at backup time
- For text layers, UI bbox (`actualBoundingBoxAscent + Descent`) underestimates real ink size by ~0.9 cm for script fonts (e.g. Marck Script, Great Vibes, Caveat). Photoshop trim shows a larger Y than UI summary.

## Files included
- `src-components-constructor/` — full snapshot of `src/components/constructor/`
- `src-hooks/useConstructorState.js`
- `src-utils/exportPrintPdf.js`
- `src-utils/exportPreview.js`

## How to restore
```sh
cp -R backups/constructor-text-ink-bbox-stable-2026-04-21/src-components-constructor/. src/components/constructor/
cp backups/constructor-text-ink-bbox-stable-2026-04-21/src-hooks/useConstructorState.js src/hooks/
cp backups/constructor-text-ink-bbox-stable-2026-04-21/src-utils/exportPrintPdf.js src/utils/
cp backups/constructor-text-ink-bbox-stable-2026-04-21/src-utils/exportPreview.js src/utils/
```
