// Start-a-task wizard styles (Wave 2, PART B). NAMESPACED wd-wz-* only, injected
// once by StartTask.jsx via a <style> tag. These add ONLY what the unified on-page
// stepper needs on top of the existing design system: the page h1, the single
// cross-step progress indicator, the reflection/review summary rows, and the large
// "Begin guiding" button. Everything else (the glowing panel, the interview kinds,
// the depth cards, the question renderer, the terminal loader, the docs chips) is
// reused read-only from workApp.css.js (wd-coach-* / wd-wiz-* / wd-term-* / wd-docs-*).
// Tokens (--em, --em-2, --em-deep, --em-fill, --em-fill-2, --em-line, --tx, --tx-2,
// --mut, --mut-2, --faint, --line, --line-2, --line-soft, --card-a, --track, --warm*,
// --info*, --card-shadow, --card-shadow-hover, --wd-display) come from .wd in
// workApp.css.js and carry light/dark automatically.
export const WIZ_CSS = `
/* The page heading. Matches .wd-sec h2 so the single <h1> reads like the app's
   other section titles, never clipping or wrapping its words. */
.wd-wz-h1{font-family:var(--wd-display);font-weight:700;font-size:17px;letter-spacing:-.01em;line-height:1.3;color:var(--tx);margin:0;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}

/* The stepper shell reuses the glowing .wd-coach panel for the "active, guided"
   feel; .wd-wz only positions and spaces its own extras. .wd-coach already lays
   the children out as a flex column with a gap, so this stays minimal. */
.wd-wz{position:relative}

/* Header: eyebrow on the left, the quiet "I know my task" skip on the right. Both
   stay on one line; the flexible gap is the only thing that gives. */
.wd-wz-head{display:flex;align-items:center;justify-content:space-between;gap:12px 16px;flex-wrap:wrap}
.wd-wz-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--em-2);white-space:nowrap;flex-shrink:0}
.wd-wz-eyebrow svg{flex-shrink:0}
.wd-wz-skip{background:none;border:none;color:var(--mut);font:inherit;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:5px 3px;border-radius:8px;white-space:nowrap;flex-shrink:0;transition:color .15s}
.wd-wz-skip:hover{color:var(--tx)}
.wd-wz-skip svg{flex-shrink:0}

/* Single progress indicator across every step: a thin segmented bar plus a
   "Step N of 8 : Label" line. Segments are flex:1 so eight of them never overflow,
   even at 640. The label truncates with an ellipsis rather than wrapping. */
.wd-wz-progwrap{display:flex;flex-direction:column;gap:8px}
.wd-wz-prog{display:flex;gap:5px}
.wd-wz-prog span{height:5px;flex:1 1 0;min-width:0;border-radius:999px;background:var(--track);transition:background .3s,box-shadow .3s}
.wd-wz-prog span.done{background:var(--em-line)}
.wd-wz-prog span.on{background:linear-gradient(90deg,var(--em),var(--em-2));box-shadow:0 0 10px -3px var(--em)}
.wd-wz-progmeta{display:flex;align-items:baseline;gap:9px;min-width:0}
.wd-wz-stepn{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--em-2);white-space:nowrap;flex-shrink:0}
.wd-wz-stepl{font-size:13px;font-weight:600;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}

/* The per-step body. A floor height keeps the panel from jumping as steps with
   different content heights swap in (no layout shift). */
.wd-wz-panel{display:flex;flex-direction:column;gap:12px;min-height:300px}
.wd-wz-panel.tight{min-height:0}

/* Not-ready gate: a calm warm notice, with a clear reason and no dead end. */
.wd-wz-gate{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:12px;background:var(--warm-fill);border:1px solid var(--warm-line);color:var(--tx);font-size:13px;line-height:1.5}
.wd-wz-gate svg{flex-shrink:0;margin-top:2px;color:var(--warm)}
.wd-wz-gate b{color:var(--warm)}

/* Reflection + review summary rows: label, value, and (reflection only) an Edit
   button that jumps straight back to the step that set it. */
.wd-wz-sum{display:flex;flex-direction:column;gap:10px;margin-top:2px}
.wd-wz-row{display:flex;align-items:flex-start;gap:13px;padding:13px 15px;border-radius:13px;background:var(--card-a);border:1px solid var(--line)}
.wd-wz-row-ic{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:var(--em-fill-2);color:var(--em);flex-shrink:0}
.wd-wz-row-ic svg{display:block}
.wd-wz-row-main{flex:1 1 auto;min-width:0}
.wd-wz-row-k{font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--mut);margin-bottom:3px}
.wd-wz-row-v{font-size:14.5px;line-height:1.5;color:var(--tx);overflow-wrap:anywhere}
.wd-wz-row-v.mut{color:var(--mut)}
.wd-wz-row-edit{flex-shrink:0;align-self:center;background:none;border:1px solid var(--line-2);border-radius:9px;color:var(--mut);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;padding:6px 11px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;transition:border-color .15s,color .15s,background .15s}
.wd-wz-row-edit:hover{border-color:var(--em-2);color:var(--em-2);background:var(--em-fill)}
.wd-wz-row-edit svg{flex-shrink:0}
/* A compact answer list for the review step ("what you told me"). */
.wd-wz-ans{display:flex;flex-direction:column;gap:7px;margin:2px 0 0;padding:0;list-style:none}
.wd-wz-ans li{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;line-height:1.5;color:var(--tx)}
.wd-wz-ans li svg{flex-shrink:0;margin-top:3px;color:var(--em)}
.wd-wz-ans .q{color:var(--mut)}
.wd-wz-ans .a{font-weight:600}

/* The research terminal sits flush in the panel (ScopeLoader renders the term +
   foot directly, no modal padding wrapper). */
.wd-wz-research{display:flex;flex-direction:column;gap:2px}

/* Footer shared by every step: Back on the left, the primary move on the right. */
.wd-wz-foot{display:flex;align-items:center;flex-wrap:wrap;gap:10px 16px;margin-top:4px;padding-top:14px;border-top:1px solid var(--line)}
.wd-wz-spacer{flex:1 1 auto}
.wd-wz-link{background:none;border:none;color:var(--mut);font:inherit;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:4px 2px;white-space:nowrap;transition:color .15s}
.wd-wz-link:hover{color:var(--tx)}
.wd-wz-link.strong{color:var(--em-2);font-weight:600}
.wd-wz-hint{font-size:12.5px;color:var(--mut);line-height:1.4;min-width:0}

/* The large, confident final action. Full width, never wraps its label. */
.wd-wz-begin{display:inline-flex;align-items:center;justify-content:center;gap:10px;width:100%;white-space:nowrap;background:linear-gradient(135deg,var(--em),var(--em-deep));color:#fff;border:none;border-radius:14px;min-height:56px;padding:0 24px;font:inherit;font-weight:700;font-size:17px;letter-spacing:-.01em;cursor:pointer;box-shadow:0 10px 30px -12px var(--em);transition:filter .15s,transform .12s,box-shadow .15s}
.wd-wz-begin:hover:not(:disabled){filter:brightness(1.05);transform:translateY(-1px);box-shadow:0 16px 38px -14px var(--em)}
.wd-wz-begin:active:not(:disabled){transform:translateY(0)}
.wd-wz-begin:disabled{opacity:.55;cursor:default;transform:none;box-shadow:none}
.wd-wz-begin svg{flex-shrink:0}
.wd-wz-beginwrap{display:flex;flex-direction:column;gap:9px;margin-top:2px}
.wd-wz-beginsub{font-size:12.5px;color:var(--mut);line-height:1.45;text-align:center}

@media(max-width:640px){
 .wd-wz-row-edit span{display:none}
 .wd-wz-row-edit{padding:7px 9px}
}
@media(prefers-reduced-motion:reduce){
 .wd-wz-prog span{transition:none}
}
`
