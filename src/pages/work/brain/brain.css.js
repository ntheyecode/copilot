// Styles for the "Your brain" page (src/pages/work/brain/), layered on the
// in-app design system (workApp.css.js tokens: --panel, --line, --em, --cta,
// --danger ...) so Light / Dark / Heavy and the accessibility modes follow the
// shell. Verified clean (no overflow / wrap / clip / sideways scroll) at
// 1280, 640 and 380 px in light and dark per the design-time quality gate:
// every pill and button is nowrap + flex-shrink:0, the only flexible element
// in a row is its text, and long names ellipsize.
export const BRAIN_CSS = `
.wd-brain{max-width:960px;display:flex;flex-direction:column;gap:var(--sp-4)}
.wd-brain .wd-sec{margin-bottom:0}
/* The live region: read by assistive tech, never seen. */
.wd-brain-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.wd-brain-working:focus{outline:none}
.wd-brain-working:focus-visible{outline:2px solid var(--focus);outline-offset:3px}
.wd-brain .wd-sec p{max-width:66ch}

/* ---- the promise (what happens to a document) ---- */
.wd-brain-promise{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-radius:var(--r);background:var(--tint-green);border:1px solid transparent}
.wd-brain-promise .wd-ic{margin-top:1px}
.wd-brain-promise-t{display:block;font-weight:700;font-size:var(--fs-base);color:var(--tx);line-height:1.3}
.wd-brain-promise-b{display:block;margin-top:2px;font-size:var(--fs-md);color:var(--tx-2);line-height:1.45}
.wd-brain-points{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.wd-brain-points li{display:flex;gap:8px;align-items:flex-start;font-size:var(--fs-sm);color:var(--tx-2);line-height:1.45}
.wd-brain-points svg{flex:0 0 14px;margin-top:3px;color:var(--em)}
.wd-brain-promise > div{min-width:0;flex:1 1 auto}

/* ---- document meter (the plan's limit) ---- */
.wd-brain-meter{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.wd-brain-meter-n{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;font-size:var(--fs-sm);font-weight:600;color:var(--mut);border:1px solid var(--chip-line);background:var(--chip);border-radius:var(--r-pill);padding:4px 11px;line-height:1.4}
.wd-brain-meter-n.full{color:var(--warm);background:var(--warm-fill);border-color:var(--warm-line)}
.wd-brain-meter-n svg{flex:0 0 13px}
.wd-brain-meter-up{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0;font-size:var(--fs-sm);font-weight:600;color:var(--em-deep);text-decoration:underline;text-underline-offset:3px}
.wd-brain-head-right{display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:auto}
@media(max-width:640px){
 /* The meter drops under the title; the title block keeps a real basis so
    it stays beside its icon instead of wrapping under it at 380px. */
 .wd-brain .wd-sec{flex-wrap:wrap}
 .wd-brain .wd-sec > div{flex:1 1 180px}
 .wd-brain-head-right{margin-left:48px;flex-basis:100%}
}

/* ---- drop zone ---- */
.wd-brain-drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:30px 20px 26px;border-radius:var(--r-lg);border:2px dashed var(--line-2);background:var(--panel);cursor:pointer;transition:border-color .15s,background .15s,box-shadow .15s;min-width:0}
.wd-brain-drop:hover{border-color:var(--em);background:var(--em-fill)}
.wd-brain-drop:focus-visible{outline:2px solid var(--focus);outline-offset:3px}
.wd-brain-drop.over{border-color:var(--em);border-style:solid;background:var(--em-fill);box-shadow:0 0 0 4px var(--em-fill)}
.wd-brain-drop.full{border-style:solid;border-color:var(--warm-line);background:var(--warm-fill)}
.wd-brain-drop.full:hover{border-color:var(--warm);background:var(--warm-fill)}
.wd-brain-drop .wd-ic{width:44px;height:44px;border-radius:12px}
.wd-brain-drop-t{font-weight:700;font-size:var(--fs-base);color:var(--tx);line-height:1.3;max-width:100%;overflow-wrap:anywhere}
.wd-brain-drop-s{font-size:var(--fs-sm);color:var(--mut);line-height:1.45;max-width:100%;overflow-wrap:anywhere}
.wd-brain-drop .wd-cta{margin-top:6px;max-width:100%}
.wd-brain-drop input[type=file]{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}

/* ---- working (honest: three things it does, no percentage) ---- */
.wd-brain-working{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-radius:var(--r);background:var(--panel);border:1px solid var(--line-soft);box-shadow:var(--sh-1)}
.wd-brain-working > div{min-width:0;flex:1 1 auto}
.wd-brain-working-t{display:block;font-weight:700;font-size:var(--fs-base);color:var(--tx);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-brain-phases{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px}
.wd-brain-phases li{display:inline-flex;align-items:center;gap:7px;font-size:var(--fs-sm);color:var(--tx-2);white-space:nowrap}
.wd-brain-phases li::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--em);animation:wd-brain-pulse 1.4s ease-in-out infinite}
.wd-brain-phases li:nth-child(2)::before{animation-delay:.45s}
.wd-brain-phases li:nth-child(3)::before{animation-delay:.9s}
@keyframes wd-brain-pulse{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
.wd-brain-working-n{display:block;margin-top:8px;font-size:var(--fs-sm);color:var(--mut)}
.wd-brain-spin{animation:wd-brain-spin .9s linear infinite}
@keyframes wd-brain-spin{to{transform:rotate(360deg)}}

/* ---- result moment + errors ---- */
.wd-brain-result,.wd-brain-err{display:flex;gap:12px;align-items:flex-start;padding:13px 16px;border-radius:var(--r);border:1px solid transparent;font-size:var(--fs-md);line-height:1.5;color:var(--tx)}
.wd-brain-result{background:var(--em-fill);border-color:var(--em-line)}
.wd-brain-result > svg{flex:0 0 18px;margin-top:2px;color:var(--em)}
.wd-brain-err{background:var(--danger-fill);border-color:var(--danger-line)}
.wd-brain-err > svg{flex:0 0 18px;margin-top:2px;color:var(--danger)}
.wd-brain-result > div,.wd-brain-err > div{min-width:0;flex:1 1 auto;overflow-wrap:anywhere}
.wd-brain-result b{font-weight:700}
.wd-brain-result-l{display:block;color:var(--tx-2)}
.wd-brain-result-l.first{color:var(--tx);font-weight:700;font-size:var(--fs-base)}
.wd-brain-x{flex-shrink:0;background:none;border:none;padding:4px;margin:-2px -4px 0 0;border-radius:8px;color:var(--mut);cursor:pointer;display:inline-flex}
.wd-brain-x:hover{color:var(--tx);background:var(--line-soft)}
.wd-brain-err a,.wd-brain-err .wd-brain-link{color:var(--danger);font-weight:600;text-decoration:underline;text-underline-offset:3px;white-space:nowrap;background:none;border:none;padding:0;font:inherit;cursor:pointer}

/* ---- the list of sources ---- */
.wd-brain-listhead{display:flex;align-items:center;gap:10px;min-width:0;margin-top:4px}
.wd-brain-listhead h3{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-lg);letter-spacing:-.01em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-brain-listhead .wd-sec-count{flex-shrink:0}
.wd-brain-forgetall{margin-left:auto;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0;height:32px;padding:0 12px;border-radius:var(--r-pill);border:1px solid var(--line);background:transparent;color:var(--mut);font:inherit;font-size:var(--fs-sm);font-weight:600;cursor:pointer;transition:color .15s,border-color .15s,background .15s}
.wd-brain-forgetall:hover{color:var(--danger);border-color:var(--danger-line);background:var(--danger-fill)}
@media(max-width:480px){.wd-brain-forgetall span{display:none}.wd-brain-forgetall{width:32px;padding:0;justify-content:center}}
.wd-brain-rows{display:flex;flex-direction:column;gap:8px}
.wd-brain-row{background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r);box-shadow:var(--sh-0);overflow:hidden;transition:border-color .18s}
.wd-brain-row:hover,.wd-brain-row.open{border-color:var(--line)}
.wd-brain-rowhead{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;background:transparent;border:none;color:var(--tx);text-align:left;font:inherit;cursor:pointer;min-width:0;transition:background .15s}
.wd-brain-rowhead:hover{background:var(--line-soft)}
.wd-brain-rowhead .wd-ic{width:34px;height:34px}
.wd-brain-rowmain{min-width:0;flex:1 1 auto;display:flex;flex-direction:column;gap:2px}
.wd-brain-rowname{font-weight:650;font-size:var(--fs-base);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wd-brain-rowmeta{display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;font-size:var(--fs-sm);color:var(--mut);line-height:1.4;min-width:0;overflow:hidden}
.wd-brain-rowmeta span{white-space:nowrap}
@media(max-width:480px){
 /* Phone width: the name and the meta wrap instead of running under the count pill. */
 .wd-brain-rowname{white-space:normal;overflow-wrap:anywhere}
 .wd-brain-rowmeta span{white-space:normal;overflow-wrap:anywhere}
}
.wd-brain-rowcount{flex-shrink:0;white-space:nowrap;font-size:var(--fs-sm);font-weight:600;color:var(--mut);border:1px solid var(--chip-line);background:var(--chip);border-radius:var(--r-pill);padding:2px 9px;line-height:1.5}
.wd-brain-chev{flex-shrink:0;color:var(--mut);transition:transform .18s}
.wd-brain-row.open .wd-brain-chev{transform:rotate(90deg)}
.wd-brain-rowbody{border-top:1px solid var(--line-soft);padding:10px 14px 14px}
.wd-brain-rowabout{display:flex;gap:9px;align-items:flex-start;font-size:var(--fs-sm);color:var(--mut);line-height:1.5;margin:2px 0 8px}
.wd-brain-rowabout svg{flex:0 0 14px;margin-top:3px;color:var(--info)}
.wd-brain-ls{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.wd-brain-l{display:flex;align-items:flex-start;gap:10px;padding:9px 10px;border-radius:11px;background:var(--card-b);border:1px solid var(--line-soft);min-width:0}
.wd-brain-l > div{min-width:0;flex:1 1 auto}
.wd-brain-ltext{display:block;font-size:var(--fs-md);color:var(--tx);line-height:1.5;overflow-wrap:anywhere}
.wd-brain-kind{display:inline-flex;align-items:center;white-space:nowrap;flex-shrink:0;margin-top:2px;font-size:calc(10.5px*var(--wc-fs,1));font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;padding:2px 8px;line-height:1.5;border:1px solid transparent;cursor:help}
.wd-brain-kind.fact{color:var(--tint-blue-ink);background:var(--tint-blue)}
.wd-brain-kind.procedure{color:var(--tint-green-ink);background:var(--tint-green)}
.wd-brain-kind.preference{color:var(--tint-violet-ink);background:var(--tint-violet)}
.wd-brain-kind.term{color:var(--tint-neutral-ink);background:var(--tint-neutral)}
.wd-brain-kind.warning{color:var(--tint-amber-ink);background:var(--tint-amber)}
.wd-brain-lforget{flex-shrink:0;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;height:28px;padding:0 9px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--mut);font:inherit;font-size:var(--fs-sm);font-weight:600;cursor:pointer;transition:color .15s,border-color .15s,background .15s}
.wd-brain-lforget:hover{color:var(--danger);border-color:var(--danger-line);background:var(--danger-fill)}
.wd-brain-lforget:disabled{opacity:.5;cursor:default}
.wd-brain-lconfirm{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.wd-brain-lconfirm span{font-size:var(--fs-sm);color:var(--tx-2);white-space:nowrap}
.wd-brain-lconfirm button{white-space:nowrap;flex-shrink:0;height:28px;padding:0 10px;border-radius:8px;font:inherit;font-size:var(--fs-sm);font-weight:600;cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--tx-2)}
.wd-brain-lconfirm button.yes{background:var(--danger);border-color:var(--danger);color:#fff}
.wd-brain-lconfirm button:disabled{opacity:.5;cursor:default}
@media(max-width:640px){
 /* Controls drop under the text; the inline confirm takes the full row and
    wraps its buttons inside it, so it can never run past the edge. */
 .wd-brain-l{flex-wrap:wrap}
 .wd-brain-lforget{margin-left:auto}
 .wd-brain-lconfirm{display:flex;flex-basis:100%;width:100%;min-width:0;margin-left:0;justify-content:flex-end}
}
.wd-brain-rowfoot{display:flex;justify-content:flex-end;margin-top:10px}
.wd-brain-rowfoot .wd-brain-lforget{height:32px;padding:0 12px;border-color:var(--line)}
.wd-brain-none{font-size:var(--fs-sm);color:var(--mut);padding:2px 0 4px}
.wd-brain-loading{display:flex;align-items:center;gap:8px;font-size:var(--fs-md);color:var(--mut);padding:8px 2px}

/* ---- empty state (teaches what to upload) ---- */
.wd-brain-empty{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;border-radius:var(--r);background:var(--panel);border:1px solid var(--line-soft)}
.wd-brain-empty > div{min-width:0;flex:1 1 auto}
.wd-brain-empty-t{display:block;font-weight:700;font-size:var(--fs-base);color:var(--tx);line-height:1.3}
.wd-brain-empty-l{display:block;margin-top:3px;font-size:var(--fs-md);color:var(--mut);line-height:1.5;max-width:62ch}
.wd-brain-ideas{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}
.wd-brain-ideas li{display:flex;gap:9px;align-items:flex-start;padding:10px 12px;border-radius:11px;background:var(--card-b);border:1px solid var(--line-soft);font-size:var(--fs-sm);color:var(--tx-2);line-height:1.5;min-width:0}
.wd-brain-ideas li > span{min-width:0;overflow-wrap:anywhere}
.wd-brain-ideas li b{color:var(--tx)}
.wd-brain-ideas svg{flex:0 0 15px;margin-top:3px;color:var(--em-2)}
.wd-brain-empty-s{display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:var(--fs-sm);color:var(--mut);line-height:1.45}
.wd-brain-empty-s svg{flex:0 0 14px;margin-top:3px;color:var(--warm)}

/* ---- confirm dialog (reuses the shell's .wd-modal frame) ---- */
.wd-brain-modal p{font-size:var(--fs-md);color:var(--tx-2);line-height:1.55;margin:0 0 14px;overflow-wrap:anywhere}
.wd-brain-ack{display:flex;gap:9px;align-items:flex-start;font-size:var(--fs-md);color:var(--tx);margin:0 0 16px;cursor:pointer;line-height:1.45}
.wd-brain-ack input{margin:3px 0 0;flex-shrink:0;accent-color:var(--danger)}
.wd-brain-modal-acts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.wd-brain-modal-acts button{white-space:nowrap;flex-shrink:0;display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 16px;border-radius:var(--r-sm);font:inherit;font-size:var(--fs-md);font-weight:600;cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--tx-2)}
.wd-brain-modal-acts button.danger{background:var(--danger);border-color:var(--danger);color:#fff}
.wd-brain-modal-acts button:disabled{opacity:.5;cursor:default}
.wd-brain-modal-acts button:hover:not(:disabled){filter:brightness(.97)}

/* ---- a company member who lands here ---- */
.wd-brain-company{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;border-radius:var(--r);background:var(--panel);border:1px solid var(--line-soft);max-width:640px}
.wd-brain-company > div{min-width:0;flex:1 1 auto}
.wd-brain-company-t{display:block;font-weight:700;font-size:var(--fs-base);color:var(--tx)}
.wd-brain-company p{margin:4px 0 12px;font-size:var(--fs-md);color:var(--mut);line-height:1.5}
.wd-brain-company a{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:var(--fs-md);font-weight:600;color:var(--em-deep);text-decoration:underline;text-underline-offset:3px}

@media(prefers-reduced-motion:reduce){.wd-brain-phases li::before,.wd-brain-spin{animation:none}}
`
