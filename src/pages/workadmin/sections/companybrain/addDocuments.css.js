// Styles for "Add documents" (company console, Company Brain section), on the
// console's own --wka-* tokens so light and dark follow the console. Verified
// at 1280, 640 and 380 px: every pill, badge and button is nowrap and never
// shrinks; the only flexible element in a row is the file name (it
// ellipsizes); the drop zone text wraps inside its box; nothing scrolls
// sideways.
export const ADD_DOCUMENTS_CSS = `
.wka-brain-add { margin-bottom: 20px; }
.wka-brain-add h2 { display: flex; align-items: center; gap: 8px; min-width: 0; }
.wka-brain-add h2 svg { color: var(--wka-accent); flex-shrink: 0; }

/* The promise: what happens to a document, before any is added. */
.wka-brain-promise { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 10px; background: var(--wka-tint-green); color: var(--wka-tint-green-ink); margin: 0 0 14px; }
.wka-brain-promise svg { flex: 0 0 16px; margin-top: 2px; }
.wka-brain-promise > div { min-width: 0; flex: 1 1 auto; }
.wka-brain-promise-t { display: block; font-weight: 700; font-size: calc(13px * var(--wc-fs, 1)); line-height: 1.35; }
.wka-brain-promise-b { display: block; margin-top: 2px; font-size: calc(12.5px * var(--wc-fs, 1)); line-height: 1.45; }

/* Drop zone */
.wka-brain-drop { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; text-align: center; padding: 26px 18px 22px; border-radius: 12px; border: 2px dashed var(--wka-line-2); background: var(--wka-bg-2); cursor: pointer; transition: border-color .15s, background .15s, box-shadow .15s; min-width: 0; }
.wka-brain-drop:hover { border-color: var(--wka-accent); background: var(--wka-accent-soft); }
.wka-brain-drop.over { border-color: var(--wka-accent); border-style: solid; background: var(--wka-accent-soft); box-shadow: 0 0 0 4px var(--wka-accent-soft); }
.wka-brain-drop.off { cursor: not-allowed; opacity: 0.6; }
.wka-brain-drop.off:hover { border-color: var(--wka-line-2); background: var(--wka-bg-2); }
.wka-brain-drop-ic { width: 42px; height: 42px; border-radius: 12px; display: inline-grid; place-items: center; background: var(--wka-tint-green); color: var(--wka-tint-green-ink); }
.wka-brain-drop-t { font-weight: 700; font-size: calc(14px * var(--wc-fs, 1)); color: var(--wka-text); line-height: 1.3; max-width: 100%; overflow-wrap: anywhere; }
.wka-brain-drop-s { font-size: calc(12px * var(--wc-fs, 1)); color: var(--wka-muted); line-height: 1.45; max-width: 60ch; overflow-wrap: anywhere; }
.wka-brain-drop .wka-btn { margin-top: 4px; max-width: 100%; white-space: nowrap; }
.wka-brain-drop input[type=file] { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }

/* Locked brain: the pointer to the unlock control, in place of the zone. */
.wka-brain-locked { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--wka-tint-amber-ink); background: var(--wka-tint-amber); color: var(--wka-tint-amber-ink); }
.wka-brain-locked svg { flex: 0 0 16px; margin-top: 2px; }
.wka-brain-locked > div { min-width: 0; flex: 1 1 auto; }
.wka-brain-locked-t { display: block; font-weight: 700; font-size: calc(13.5px * var(--wc-fs, 1)); }
.wka-brain-locked-b { display: block; margin-top: 2px; font-size: calc(12.5px * var(--wc-fs, 1)); line-height: 1.45; }
.wka-brain-locked-acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.wka-brain-locked-acts .wka-btn { white-space: nowrap; flex-shrink: 0; }

/* Queue rows: name (the only flexible part) + size + state pill; sentences under. */
.wka-brain-qhead-bar { display: flex; align-items: center; gap: 10px; margin: 16px 0 8px; min-width: 0; }
.wka-brain-qhead-bar h3 { margin: 0; font-size: calc(12.5px * var(--wc-fs, 1)); color: var(--wka-muted); font-weight: 600; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wka-brain-qhead-bar .wka-btn { flex-shrink: 0; white-space: nowrap; }
.wka-brain-queue { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.wka-brain-qrow { display: flex; align-items: flex-start; gap: 10px; min-width: 0; padding: 9px 10px 9px 12px; border: 1px solid var(--wka-line); border-radius: 10px; background: var(--wka-panel); }
.wka-brain-qrow.done { border-color: color-mix(in srgb, var(--wka-tint-green-ink) 35%, var(--wka-line)); }
.wka-brain-qrow.failed { border-color: color-mix(in srgb, var(--wka-red) 35%, var(--wka-line)); }
.wka-brain-qic { width: 26px; height: 26px; border-radius: 8px; display: inline-grid; place-items: center; flex-shrink: 0; background: var(--wka-bg-2); color: var(--wka-muted); margin-top: 1px; }
.wka-brain-qrow.done .wka-brain-qic { background: var(--wka-tint-green); color: var(--wka-tint-green-ink); }
.wka-brain-qrow.failed .wka-brain-qic { background: var(--wka-danger-fill); color: var(--wka-red); }
.wka-brain-qrow.reading .wka-brain-qic, .wka-brain-qrow.storing .wka-brain-qic { background: var(--wka-tint-amber); color: var(--wka-tint-amber-ink); }
.wka-brain-qbody { flex: 1 1 auto; min-width: 0; }
.wka-brain-qhead { display: flex; align-items: center; gap: 8px; min-width: 0; }
.wka-brain-qname { flex: 1 1 60px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: calc(13.5px * var(--wc-fs, 1)); color: var(--wka-text); }
.wka-brain-qsize { flex-shrink: 0; white-space: nowrap; font-size: calc(11.5px * var(--wc-fs, 1)); color: var(--wka-faint); }
.wka-brain-qstate { flex-shrink: 0; white-space: nowrap; }
.wka-brain-qphases { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 5px; font-size: calc(12px * var(--wc-fs, 1)); color: var(--wka-faint); }
.wka-brain-qphases span { white-space: nowrap; }
.wka-brain-qphases span.on { color: var(--wka-text); font-weight: 600; }
.wka-brain-qphases span.past { color: var(--wka-muted); text-decoration: line-through; }
.wka-brain-qlines { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; font-size: calc(12.5px * var(--wc-fs, 1)); color: var(--wka-muted); line-height: 1.45; }
.wka-brain-qlines span { overflow-wrap: anywhere; }
.wka-brain-qlines span.first { color: var(--wka-text); font-weight: 600; }
.wka-brain-qrow.failed .wka-brain-qlines span.first { color: var(--wka-red); }
.wka-brain-qacts { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.wka-brain-qacts .wka-btn { white-space: nowrap; flex-shrink: 0; }
.wka-brain-qx { flex-shrink: 0; padding: 0 7px; }
.wka-brain-spin { animation: wka-spin 0.8s linear infinite; }

/* The keyword-only note (stated once, from the server flag). */
.wka-brain-kw { margin-top: 12px; margin-bottom: 0; }

/* The live region: read by assistive tech, never seen. */
.wka-brain-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }

@media (max-width: 640px) {
  .wka-brain-drop { padding: 20px 14px 18px; }
  /* The size drops out of the head at phone width; the state pill stays. */
  .wka-brain-qsize { display: none; }
}
@media (max-width: 480px) {
  /* Phone width: the file name takes its own line above the state pill, and
     the queue heading wraps above its button, so neither is cut to a stub. */
  .wka-brain-qhead { flex-wrap: wrap; row-gap: 4px; }
  .wka-brain-qname { flex-basis: 100%; }
  .wka-brain-qhead-bar { flex-wrap: wrap; row-gap: 6px; }
  .wka-brain-qhead-bar h3 { flex-basis: 100%; white-space: normal; }
}
`
