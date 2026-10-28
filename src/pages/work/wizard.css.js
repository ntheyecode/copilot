// Start-a-task wizard styles. NAMESPACED wd-wz-* only, injected once by
// StartTask.jsx via a <style> tag. These add ONLY what the unified on-page
// stepper needs on top of the design system: the page h1, the single cross-step
// progress indicator, the reflection / review summary rows, the intermediate
// "Continue" button and the one orange "Begin guiding" call-to-action.
// Everything else (the raised coach panel, the kind cards, the depth cards, the
// question renderer, the terminal loader, the docs chips) is reused read-only
// from workApp.css.js (wd-coach-* / wd-wiz-* / wd-term-* / wd-docs-*).
// Tokens only (colors, radii, spacing, type, shadow come from .wd and carry
// Light / Dark / Heavy automatically); every font-size is on the --wc-fs scale.
export const WIZ_CSS = `
/* The page heading. Matches .wd-sec h2 so the single <h1> reads like the app's
   other section titles, never clipping or wrapping its words. */
.wd-wz-h1{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-lg);letter-spacing:-.01em;line-height:1.3;color:var(--tx);margin:0;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}

/* The stepper shell reuses the raised .wd-coach panel; .wd-wz only positions
   and spaces its own extras. */
.wd-wz{position:relative}
.wd-wz-gatenote{margin-bottom:var(--sp-4)}

/* Header: a quiet sentence-case eyebrow on the left, the "I know my task" skip
   on the right. Both stay on one line; the flexible gap is the only thing that
   gives. */
.wd-wz-head{display:flex;align-items:center;justify-content:space-between;gap:12px 16px;flex-wrap:wrap}
.wd-wz-eyebrow{display:inline-flex;align-items:center;gap:7px;font-size:var(--fs-sm);font-weight:600;color:var(--em-2-deep);white-space:nowrap;flex-shrink:0}
.wd-wz-eyebrow svg{flex-shrink:0;color:var(--em-2)}
.wd-wz-skip{background:none;border:none;color:var(--mut);font:inherit;font-size:var(--fs-md);font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:5px 3px;border-radius:var(--r-xs);white-space:nowrap;flex-shrink:0;transition:color .15s}
.wd-wz-skip:hover{color:var(--tx)}
.wd-wz-skip svg{flex-shrink:0}

/* Single progress indicator across every step: a thin segmented bar plus a
   "Step N of 8 : Label" line. Segments are flex:1 so eight of them never
   overflow, even at 640. The label truncates with an ellipsis rather than
   wrapping. One brand color, no gradient, no glow. */
.wd-wz-progwrap{display:flex;flex-direction:column;gap:8px}
.wd-wz-prog{display:flex;gap:5px}
.wd-wz-prog span{height:5px;flex:1 1 0;min-width:0;border-radius:var(--r-pill);background:var(--track);transition:background .3s}
.wd-wz-prog span.done{background:var(--em-line)}
.wd-wz-prog span.on{background:var(--em)}
.wd-wz-progmeta{display:flex;align-items:baseline;gap:9px;min-width:0}
.wd-wz-stepn{font-size:var(--fs-sm);font-weight:700;color:var(--em-deep);white-space:nowrap;flex-shrink:0}
.wd-wz-stepl{font-size:var(--fs-md);font-weight:600;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}

/* The per-step body. A floor height keeps the panel from jumping as steps with
   different content heights swap in (no layout shift). */
.wd-wz-panel{display:flex;flex-direction:column;gap:12px;min-height:300px}
.wd-wz-panel.tight{min-height:0}
.wd-wz-err{color:var(--danger);margin-bottom:6px;line-height:1.5;font-size:var(--fs-base)}

/* Not-ready gate: a calm amber notice, with a clear reason and no dead end. */
.wd-wz-gate{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:var(--r);background:var(--tint-amber);border:1px solid transparent;color:var(--tx);font-size:var(--fs-md);line-height:1.5}
.wd-wz-gate svg{flex-shrink:0;margin-top:2px;color:var(--warm)}
.wd-wz-gate b{color:var(--tint-amber-ink)}
/* The way out of the gate: an inline link (admin console / dashboard), never a
   title-only tooltip. Wraps with the sentence; never clips. */
.wd-wz-gate-link{display:inline-flex;align-items:center;gap:3px;color:var(--em-2-deep);font-weight:700;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}
.wd-wz-gate-link svg{margin:0;color:inherit;flex-shrink:0}
.wd-wz-gate-link:hover{color:var(--em-2)}
.wd-wz-begingate{margin-top:2px;text-align:left}

/* Reflection + review summary rows: label, value, and (reflection only) an Edit
   button that jumps straight back to the step that set it. White hairline rows
   with a tinted icon tile, the dashboard row recipe. */
.wd-wz-sum{display:flex;flex-direction:column;gap:var(--sp-2);margin-top:2px}
.wd-wz-row{display:flex;align-items:flex-start;gap:13px;padding:13px 15px;border-radius:var(--r);background:var(--panel);border:1px solid var(--line-soft)}
.wd-wz-row-ic{width:32px;height:32px;border-radius:var(--r-xs);display:grid;place-items:center;background:var(--tint-green);color:var(--tint-green-ink);flex-shrink:0}
.wd-wz-row-ic svg{display:block}
.wd-wz-row-main{flex:1 1 auto;min-width:0}
.wd-wz-row-k{font-size:var(--fs-sm);font-weight:600;color:var(--mut);margin-bottom:3px}
.wd-wz-row-v{font-size:var(--fs-base);line-height:1.5;color:var(--tx);overflow-wrap:anywhere}
.wd-wz-row-v.mut{color:var(--mut)}
.wd-wz-row-edit{flex-shrink:0;align-self:center;background:transparent;border:1px solid var(--line);border-radius:var(--r-pill);color:var(--tx-2);font:inherit;font-size:var(--fs-sm);font-weight:600;cursor:pointer;padding:6px 11px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;transition:border-color .15s,color .15s,background .15s}
.wd-wz-row-edit:hover{border-color:var(--line-2);background:var(--line-soft);color:var(--tx)}
.wd-wz-row-edit svg{flex-shrink:0}
/* A compact answer list for the review step ("what you told me"). */
.wd-wz-ans{display:flex;flex-direction:column;gap:7px;margin:2px 0 0;padding:0;list-style:none}
.wd-wz-ans li{display:flex;gap:9px;align-items:flex-start;font-size:var(--fs-md);line-height:1.5;color:var(--tx)}
.wd-wz-ans li svg{flex-shrink:0;margin-top:3px;color:var(--em)}
.wd-wz-ans .q{color:var(--mut)}
.wd-wz-ans .a{font-weight:600}

/* Knowledge-space picker (KbSpacePicker.jsx) under the documents block: a
   lead like the docs row, then pill options that wrap as WHOLE pills (never a
   pill's text; a long space name ellipsizes inside its pill). The chosen pill
   wears the brand tint; no outline, no glow. */
.wd-wz-space{margin-top:12px;padding-top:12px;border-top:1px solid var(--line-soft);display:flex;flex-direction:column;gap:9px;min-width:0}
.wd-wz-space-lead{display:inline-flex;align-items:center;gap:7px;font-size:calc(13.5px*var(--wc-fs,1));font-weight:600;color:var(--tx-2);min-width:0;flex-wrap:wrap}
.wd-wz-space-lead svg{color:var(--em-2);flex-shrink:0}
.wd-wz-space-sub{color:var(--mut);font-weight:500;font-size:calc(12px*var(--wc-fs,1))}
.wd-wz-space-opts{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.wd-wz-space-opt{display:inline-flex;align-items:center;gap:6px;height:30px;max-width:100%;padding:0 11px;border-radius:var(--r-pill);border:1px solid var(--line);background:var(--panel);color:var(--tx-2);font:inherit;font-size:var(--fs-sm);font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;min-width:0;transition:background .15s,border-color .15s,color .15s}
.wd-wz-space-opt:hover{border-color:var(--line-2);background:var(--line-soft)}
.wd-wz-space-opt.on{background:var(--em-fill);border-color:var(--em-line);color:var(--em-deep)}
.wd-wz-space-opt svg{flex-shrink:0}
.wd-wz-space-opt .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:220px}
.wd-wz-space-opt b{font-weight:700;font-variant-numeric:tabular-nums;color:var(--mut);font-size:var(--fs-xs)}
.wd-wz-space-opt.on b{color:var(--em-deep)}

/* The research terminal sits flush in the panel (ScopeLoader renders the term +
   foot directly, no modal padding wrapper). */
.wd-wz-research{display:flex;flex-direction:column;gap:2px}

/* Footer shared by every step: Back on the left, the primary move on the right. */
.wd-wz-foot{display:flex;align-items:center;flex-wrap:wrap;gap:10px 16px;margin-top:4px;padding-top:14px;border-top:1px solid var(--line-soft)}
.wd-wz-spacer{flex:1 1 auto}
.wd-wz-link{background:none;border:none;color:var(--mut);font:inherit;font-size:var(--fs-md);cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:4px 2px;white-space:nowrap;flex-shrink:0;transition:color .15s}
.wd-wz-link:hover{color:var(--tx)}
.wd-wz-link.strong{color:var(--em-2-deep);font-weight:600}
.wd-wz-hint{font-size:var(--fs-sm);color:var(--mut);line-height:1.4;min-width:0}

/* The intermediate "Continue" move: a solid brand button (the primary's
   white-text-safe shade), NOT orange. Orange is reserved for the one final
   call-to-action on this screen (Begin guiding). */
.wd-wz-next{display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;flex-shrink:0;background:var(--em-solid);color:var(--on-solid);border:none;border-radius:var(--r-sm);height:40px;padding:0 20px;font:inherit;font-weight:600;font-size:var(--fs-base);cursor:pointer;transition:filter .15s,transform .15s}
.wd-wz-next:hover:not(:disabled){filter:brightness(1.06)}
.wd-wz-next:active:not(:disabled){transform:translateY(0)}
.wd-wz-next:disabled{opacity:.5;cursor:default;transform:none}
.wd-wz-next svg{flex-shrink:0}

/* The large, confident final action: the ONE orange call-to-action on the
   page. Full width, never wraps its label. */
.wd-wz-begin{display:inline-flex;align-items:center;justify-content:center;gap:10px;width:100%;white-space:nowrap;background:var(--cta);color:var(--cta-ink);border:none;border-radius:var(--r);min-height:56px;padding:0 24px;font-family:var(--wd-display);font-weight:700;font-size:var(--fs-xl);letter-spacing:-.01em;cursor:pointer;transition:background .15s,transform .12s}
.wd-wz-begin:hover:not(:disabled){background:var(--cta-hover);transform:translateY(-1px)}
.wd-wz-begin:active:not(:disabled){transform:translateY(0)}
.wd-wz-begin:disabled{opacity:.5;cursor:default;transform:none}
.wd-wz-begin svg{flex-shrink:0}
.wd-wz-beginwrap{display:flex;flex-direction:column;gap:9px;margin-top:2px}
.wd-wz-beginsub{font-size:var(--fs-sm);color:var(--mut);line-height:1.45;text-align:center}

@media(max-width:640px){
 .wd-wz-row-edit span{display:none}
 .wd-wz-row-edit{padding:7px 9px}
}
@media(prefers-reduced-motion:reduce){
 .wd-wz-prog span,.wd-wz-next,.wd-wz-begin{transition:none}
}
`
