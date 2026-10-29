// The GUIDE VIEW design system: the calm, white, card-style surface the user
// watches while WorkCoPilot guides them. ONE stylesheet for every guiding
// host (the console, the floating panel, the full-screen guide), so the
// reading strip, the step card and the focused answer look identical wherever
// they appear.
//
// Hosts differ in what CSS they carry: the console has the app tokens, the
// Picture-in-Picture floater has none at all. So every rule here reads only
// --gv-* tokens. The defaults below map them onto the app tokens (with plain
// fallbacks for a bare document), and a host without the app CSS overrides
// them inline through gvVars(palette). --wc-fs is the reader's text-size
// multiplier (A- / A / A+): every reading size is calc(px * var(--wc-fs)),
// chrome (labels, buttons, badges) stays stable.
//
// Owner direction this encodes: the current micro-step is the hero, in a clean
// card (interview / wizard style); the observation is a QUIET "I can see"
// glance (prominent only when it caught a problem); key terms bold and
// highlighted; one primary action; ONE screen at a time with hide/show fades
// (step, or the stuck check-in, or the focused answer, then back); a mid-task
// ask takes the screen with a focused answer and a Continue to rope back in.
// No stack of alert cards. Minimal, white, productized. No em dashes.
//
// The task-overview block (TaskOverview.jsx, under the goal line on every
// guiding host) rides along at the end, so the floater and the full guide,
// which carry no app CSS, style it from the --gv-* tokens.
import { OVERVIEW_CSS } from './taskOverview.css.js'
export const GUIDE_CSS = `
.gv{
  --gv-text:var(--text,#171a21);--gv-muted:var(--text-muted,#58606e);--gv-faint:var(--text-faint,#8b93a1);
  --gv-surface:var(--surface,#ffffff);--gv-surface-2:var(--surface-2,#f5f7fb);--gv-border:var(--border,#e2e6ed);--gv-border-strong:var(--border-strong,#c6cdd8);
  --gv-accent:var(--em,#0e9f6e);--gv-accent-2:var(--em-2,#0a84c2);
  /* the filled button face + its text: the white-text-safe solid shade when the
     host has one (.wd --em-solid / --on-solid), else the accent itself */
  --gv-accent-solid:var(--em-solid,var(--gv-accent));--gv-on-accent:var(--on-solid,var(--on-em,#ffffff));
  --gv-accent-soft:var(--em-soft,rgba(14,159,110,.10));--gv-accent-ring:var(--em-ring,rgba(14,159,110,.30));
  --gv-obs:var(--obs,#0a84c2);--gv-obs-soft:var(--obs-soft,rgba(10,132,194,.08));--gv-obs-ring:var(--obs-ring,rgba(10,132,194,.26));
  --gv-warn:var(--warning,#b86e00);--gv-warn-soft:var(--warning-soft,rgba(247,144,9,.12));
  --gv-good:var(--success,#107c41);--gv-good-soft:var(--success-soft,rgba(16,124,65,.12));--gv-danger:var(--danger,#c42b1c);
  /* rest shadow only (the design-law card): the raised shade is never used here */
  --gv-shadow:var(--sh-1,var(--shadow-sm,0 1px 2px rgba(20,24,44,.04)));
  --gv-chip-fill:color-mix(in srgb,var(--gv-accent) 9%,transparent);--gv-chip-line:color-mix(in srgb,var(--gv-accent) 34%,transparent);
  --gv-display:"Bricolage Grotesque","Figtree","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;
  --gv-body:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;
  --gv-dur:.18s;
  container-type:inline-size;display:flex;flex-direction:column;gap:12px;min-width:0;font-family:var(--gv-body);color:var(--gv-text)}
.gv *{box-sizing:border-box}
.gv-k{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--gv-faint);white-space:nowrap}

/* ---- the observation, used quietly: a one-line "I can see" glance ---------- */
.gv-glance{display:flex;align-items:center;gap:7px;width:100%;min-width:0;padding:5px 8px;border-radius:9px;background:transparent;border:1px solid transparent;font:inherit;color:var(--gv-faint);cursor:pointer;text-align:left}
.gv-glance:hover{background:var(--gv-surface-2);border-color:var(--gv-border)}
.gv-glance:focus-visible{outline:none;box-shadow:0 0 0 3px var(--gv-accent-ring)}
.gv-glance-ic{flex:0 0 auto;display:inline-flex;color:var(--gv-obs)}
.gv-glance-k{flex:0 0 auto;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--gv-faint);white-space:nowrap}
.gv-glance-t{flex:1 1 auto;min-width:0;font-size:calc(12.5px*var(--wc-fs,1));line-height:1.45;color:var(--gv-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-glance-t .gv-key{background:transparent;padding:0;margin:0;font-weight:650;color:var(--gv-muted)}
.gv-glance.open{align-items:flex-start;background:var(--gv-surface-2);border-color:var(--gv-border)}
.gv-glance.open .gv-glance-ic,.gv-glance.open .gv-glance-k{margin-top:2px}
.gv-glance.open .gv-glance-t{white-space:normal;overflow-wrap:anywhere;color:var(--gv-text)}
.gv-glance.open .gv-glance-t .gv-key{color:var(--gv-text)}
.gv-glance-chev{flex:0 0 auto;color:var(--gv-faint);transition:transform .18s}
.gv-glance.open .gv-glance-chev{transform:rotate(180deg)}
.gv-glance.is-analyzing .gv-glance-k{color:var(--gv-obs)}
.gv-ana{display:inline-flex;align-items:center;gap:3px}
.gv-ana i{display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;animation:gv-bounce 1.1s infinite}
.gv-ana i:nth-child(2){animation-delay:.15s}.gv-ana i:nth-child(3){animation-delay:.3s}
/* ...and PROMINENT only when it matters: wrong place, or a flag. ONE amber strip. */
.gv-reading{display:flex;flex-direction:column;gap:6px;padding:10px 13px 10px 14px;border-radius:13px;background:var(--gv-warn-soft);border:1px solid color-mix(in srgb,var(--gv-warn) 45%,transparent);min-width:0}
.gv-reading.is-wrong{border-color:var(--gv-warn)}
.gv-reading-row{display:flex;align-items:flex-start;gap:9px;min-width:0}
.gv-reading-ic{flex:0 0 auto;display:inline-flex;align-items:center;margin-top:3px;color:var(--gv-warn)}
.gv-reading-t{flex:1 1 auto;min-width:0;font-size:calc(13.5px*var(--wc-fs,1));line-height:1.5;color:var(--gv-text);overflow-wrap:anywhere}
.gv-reading-t b{font-weight:700;color:var(--gv-warn)}
.gv-reading-flag{display:flex;align-items:flex-start;gap:8px;padding:7px 10px 7px 11px;border-radius:9px;background:var(--gv-surface);color:var(--gv-text);font-size:calc(13px*var(--wc-fs,1));line-height:1.5;min-width:0}
.gv-reading-flag>svg{flex:0 0 auto;color:var(--gv-warn);margin-top:2px}
.gv-reading-flag>span{min-width:0;overflow-wrap:anywhere}

/* ---- the goal, quiet and collapsible (never a block competing with the step) */
.gv-goal{display:flex;align-items:center;gap:8px;width:100%;min-width:0;padding:4px 2px;background:transparent;border:none;font:inherit;color:var(--gv-faint);cursor:pointer;text-align:left;border-radius:8px}
.gv-goal:hover{color:var(--gv-muted)}
.gv-goal:focus-visible{outline:none;box-shadow:0 0 0 3px var(--gv-accent-ring)}
.gv-goal-t{flex:1 1 auto;min-width:0;font-size:12.5px;color:var(--gv-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-goal.open .gv-goal-t{white-space:normal;overflow-wrap:anywhere;line-height:1.5;color:var(--gv-text)}
.gv-goal>svg{flex:0 0 auto;color:var(--gv-faint);transition:transform .18s}
.gv-goal.open>svg{transform:rotate(90deg)}

/* ---- the STEP CARD: the current micro-action, front and center ---------------
   A hairline card with a soft accent-tinted edge and a flat accent bar on the
   left (no gradient, no inset ring, no raised shadow: the design law). */
.gv-step{position:relative;overflow:hidden;padding:18px 20px 18px 24px;border-radius:18px;background:var(--gv-surface);border:1px solid var(--gv-accent-ring);box-shadow:var(--gv-shadow)}
.gv-step::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--gv-accent)}
.gv-step-top{display:flex;align-items:center;gap:8px 10px;flex-wrap:wrap;margin-bottom:10px;min-width:0}
/* the step counter is a soft accent-tinted pill (the current state), not a filled gradient badge */
.gv-step-n{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--gv-accent);background:var(--gv-accent-soft);white-space:nowrap;font-variant-numeric:tabular-nums}
.gv-step-hint{font-size:12px;color:var(--gv-muted);min-width:0}
.gv-step-hint-btn{display:inline-flex;align-items:center;gap:5px;font:inherit;font-size:12px;font-weight:650;color:var(--gv-accent);background:transparent;border:none;padding:0;cursor:pointer;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px}
.gv-step-hint-btn:hover{text-decoration-color:currentColor}
.gv-confirm{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--gv-good);background:var(--gv-good-soft);animation:gv-pop .5s cubic-bezier(.3,1.4,.5,1) both}
.gv-step-text{font-size:calc(18px*var(--wc-fs,1));line-height:1.4;font-weight:600;color:var(--gv-text);letter-spacing:-.008em;text-wrap:pretty;overflow-wrap:anywhere}
.gv-step-plan{display:flex;align-items:flex-start;gap:8px;margin-top:9px;font-size:calc(13.5px*var(--wc-fs,1));line-height:1.5;color:var(--gv-muted);overflow-wrap:anywhere}
.gv-step-plan>.gv-k{color:var(--gv-accent);margin-top:3px}
.gv-step-when{display:flex;align-items:flex-start;gap:7px;margin-top:12px;font-size:calc(13px*var(--wc-fs,1));line-height:1.5;color:var(--gv-muted);overflow-wrap:anywhere}
.gv-step-when>svg{flex:0 0 auto;color:var(--gv-good);margin-top:3px}
.gv-step-when b{font-weight:650;color:var(--gv-text)}
.gv-step-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px}
/* the step's link, when it is not a clickable URL: shown as a copy row */
.gv-step .wc-open{display:inline-flex;align-items:center;gap:5px;margin-top:10px;color:var(--gv-accent-2);font-size:calc(14px*var(--wc-fs,1));font-weight:600;text-decoration:none;text-underline-offset:3px;overflow-wrap:anywhere}
.gv-step .wc-open:hover{text-decoration:underline}
.gv-step .wc-copyrow{display:flex;align-items:center;gap:8px;margin-top:10px;padding:5px 7px 5px 11px;background:var(--gv-surface-2);border:1px solid var(--gv-border);border-radius:9px;max-width:100%}
.gv-step .wc-copyrow-t{flex:1;min-width:0;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:calc(12.5px*var(--wc-fs,1));color:var(--gv-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-step .wc-copybtn{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--gv-border);background:var(--gv-surface);color:var(--gv-accent);font:inherit;font-size:11.5px;font-weight:600;cursor:pointer}
.gv-step .wc-copybtn.done{color:var(--gv-good);border-color:transparent;background:var(--gv-good-soft)}

/* ---- buttons: one small family ------------------------------------------- */
.gv-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;padding:0 18px;border-radius:11px;border:1px solid var(--gv-border);background:var(--gv-surface-2);color:var(--gv-text);font:inherit;font-size:14px;font-weight:650;cursor:pointer;white-space:nowrap;flex:0 0 auto;transition:background .15s,border-color .15s,color .15s,filter .15s,transform .08s}
.gv-btn:hover:not(:disabled){border-color:var(--gv-border-strong);filter:brightness(1.02)}
.gv-btn:active:not(:disabled){transform:translateY(1px)}
.gv-btn:disabled{opacity:.5;cursor:default}
.gv-btn:focus-visible{outline:none;box-shadow:0 0 0 3px var(--gv-accent-ring)}
/* the primary is the flat brand-solid face (the .wd-wz-next recipe): no gradient, no drop shadow */
.gv-btn.primary{background:var(--gv-accent-solid);border-color:transparent;color:var(--gv-on-accent)}
.gv-btn.primary:hover:not(:disabled){filter:brightness(1.06)}
.gv-btn.ghost{background:transparent;border-color:transparent;color:var(--gv-muted)}
.gv-btn.ghost:hover:not(:disabled){background:var(--gv-surface-2);color:var(--gv-text);border-color:transparent}
.gv-btn.wide{width:100%}

/* ---- optional "Verify on my screen": a calm inline verdict ABOVE the action
   row (green = looks done, amber = not yet, quiet dots while checking); the
   primary Mark done right beneath is the shortcut, and gets a soft green ring
   (.is-ready) when the verdict is "Looks done". Never a modal. ------------- */
.gv-verify{display:flex;align-items:flex-start;gap:9px;margin-top:14px;padding:10px 11px 10px 13px;border-radius:12px;border:1px solid var(--gv-border);background:var(--gv-surface-2);min-width:0;animation:gv-in .25s cubic-bezier(.2,.8,.2,1) both}
.gv-verify.is-done{background:var(--gv-good-soft);border-color:color-mix(in srgb,var(--gv-good) 45%,transparent)}
.gv-verify.is-notyet{background:var(--gv-warn-soft);border-color:color-mix(in srgb,var(--gv-warn) 45%,transparent)}
.gv-verify.is-error{border-color:color-mix(in srgb,var(--gv-danger) 40%,transparent)}
.gv-verify-ic{flex:0 0 auto;display:inline-flex;align-items:center;margin-top:3px;color:var(--gv-muted)}
.gv-verify.is-checking .gv-verify-ic{color:var(--gv-obs)}
.gv-verify.is-done .gv-verify-ic{color:var(--gv-good)}
.gv-verify.is-notyet .gv-verify-ic{color:var(--gv-warn)}
.gv-verify.is-error .gv-verify-ic{color:var(--gv-danger)}
.gv-verify-b{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px}
.gv-verify-k{font-size:calc(13.5px*var(--wc-fs,1));font-weight:700;line-height:1.4;color:var(--gv-text);overflow-wrap:anywhere}
.gv-verify.is-checking .gv-verify-k{font-weight:600;color:var(--gv-muted)}
.gv-verify.is-done .gv-verify-k{color:var(--gv-good)}
.gv-verify.is-notyet .gv-verify-k{color:var(--gv-warn)}
.gv-verify.is-error .gv-verify-k{color:var(--gv-danger)}
.gv-verify-t{font-size:calc(13px*var(--wc-fs,1));line-height:1.5;color:var(--gv-text);overflow-wrap:anywhere}
.gv-verify-hint{font-size:calc(12px*var(--wc-fs,1));line-height:1.4;color:var(--gv-muted)}
.gv-verify-saw{display:flex;align-items:flex-start;gap:6px;font-size:calc(12.5px*var(--wc-fs,1));line-height:1.45;color:var(--gv-muted);min-width:0;overflow-wrap:anywhere}
.gv-verify-saw>.gv-k{margin-top:2px}
.gv-verify-saw>span:last-child{min-width:0}
.gv-verify-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:2px}
.gv-verify-link{font:inherit;font-size:calc(12.5px*var(--wc-fs,1));font-weight:650;color:var(--gv-accent);background:transparent;border:none;padding:0;cursor:pointer;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px;white-space:nowrap}
.gv-verify-link:hover{text-decoration-color:currentColor}
.gv-verify-link:focus-visible{outline:none;box-shadow:0 0 0 3px var(--gv-accent-ring);border-radius:4px}
.gv-verify-x{flex:0 0 auto;width:26px;height:26px;margin:-3px -3px 0 0;border-radius:7px;border:none;background:transparent;color:var(--gv-faint);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.gv-verify-x:hover{background:var(--gv-surface);color:var(--gv-text)}
.gv-verify-x:focus-visible{outline:none;box-shadow:0 0 0 3px var(--gv-accent-ring)}
/* "looks done": a static soft ring on Mark done (a tint, not an animated glow) */
.gv-btn.is-ready{box-shadow:0 0 0 3px var(--gv-good-soft)}

/* ---- next step (one quiet line) + prev / next with a progress track ------- */
.gv-next{display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:11px;background:var(--gv-surface-2);border:1px solid var(--gv-border);opacity:.8;min-width:0}
.gv-next-n{flex:0 0 auto;width:20px;height:20px;border-radius:6px;display:grid;place-items:center;font-size:10.5px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--gv-faint);border:1px solid var(--gv-border)}
.gv-next-t{flex:1;min-width:0;font-size:calc(13px*var(--wc-fs,1));line-height:1.4;color:var(--gv-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-next-t .gv-key{background:transparent;padding:0;font-weight:650}
.gv-nav{display:flex;align-items:center;gap:10px;padding:0 2px}
.gv-nav-btn{display:inline-flex;align-items:center;gap:3px;height:30px;padding:0 9px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--gv-muted);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;flex:0 0 auto}
.gv-nav-btn:hover:not(:disabled){background:var(--gv-surface-2);border-color:var(--gv-border);color:var(--gv-text)}
.gv-nav-btn:disabled{opacity:.4;cursor:default}
.gv-nav-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;align-items:center}
.gv-nav-count{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gv-muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.gv-nav-track{width:100%;height:4px;border-radius:999px;background:var(--gv-border);overflow:hidden}
.gv-nav-fill{height:100%;border-radius:999px;background:var(--gv-accent);transition:width .35s cubic-bezier(.4,0,.2,1)}

/* ---- the focused ANSWER (mid-task ask) -------------------------------------- */
.gv-ask{display:flex;flex-direction:column;gap:12px}
.gv-ask-working{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:180px;padding:28px 18px;text-align:center;border-radius:18px;background:var(--gv-surface);border:1px dashed var(--gv-border-strong)}
.gv-ask-working-t{font-size:14px;font-weight:650;color:var(--gv-text)}
.gv-ask-working-q{font-size:calc(13px*var(--wc-fs,1));color:var(--gv-muted);line-height:1.5;max-width:460px;overflow-wrap:anywhere}
.gv-ask-card{position:relative;overflow:hidden;padding:18px 20px 18px 24px;border-radius:18px;background:var(--gv-surface);border:1px solid var(--gv-accent-ring);box-shadow:var(--gv-shadow)}
.gv-ask-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--gv-accent)}
.gv-ask-q{font-size:calc(13.5px*var(--wc-fs,1));line-height:1.5;color:var(--gv-muted);margin-top:4px;overflow-wrap:anywhere}
.gv-ask-q b{color:var(--gv-text);font-weight:600}
.gv-ask-body{margin-top:12px;font-size:calc(15.5px*var(--wc-fs,1));line-height:1.6;color:var(--gv-text);overflow-wrap:anywhere}
.gv-ask-plan{display:flex;align-items:flex-start;gap:8px;margin-top:14px;padding:9px 12px;border-radius:10px;background:var(--gv-accent-soft);border:1px solid var(--gv-accent-ring);font-size:calc(13px*var(--wc-fs,1));line-height:1.5;color:var(--gv-text)}
.gv-ask-plan>svg{flex:0 0 auto;color:var(--gv-accent);margin-top:2px}
.gv-ask-plan b{font-weight:650}
.gv-ask-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px}
.gv-ask-sub{font-size:12px;color:var(--gv-faint);min-width:0;flex:1 1 160px}

/* the proactive "Stuck? Any issues?" card: a gentle offer, not an error */
.gv-offer-h{margin:6px 0 0;font-family:var(--gv-display);font-size:calc(20px*var(--wc-fs,1));font-weight:700;letter-spacing:-.015em;line-height:1.25;color:var(--gv-text)}
.gv-offer-p{margin:8px 0 0;font-size:calc(14px*var(--wc-fs,1));line-height:1.55;color:var(--gv-muted);overflow-wrap:anywhere}
.gv-offer-p b{font-weight:600;color:var(--gv-text)}
.gv-offer-p .gv-key{background:transparent;padding:0;margin:0}
.gv-offer-form{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.gv-offer-input{flex:1 1 200px;min-width:0;height:40px;padding:0 12px;border-radius:11px;border:1px solid var(--gv-border-strong);background:var(--gv-surface);color:var(--gv-text);font:inherit;font-size:14px}
.gv-offer-input::placeholder{color:var(--gv-faint)}
.gv-offer-input:focus{outline:none;border-color:var(--gv-accent);box-shadow:0 0 0 3px var(--gv-accent-ring)}

/* ---- step swap: the old fades out, the new fades in ------------------------- */
.gv-swap{min-width:0}
.gv-swap.out{animation:gv-out var(--gv-dur) ease both;pointer-events:none}
.gv-swap.in{animation:gv-in .3s cubic-bezier(.2,.8,.2,1) both}
@keyframes gv-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes gv-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-4px)}}
@keyframes gv-bounce{0%,80%,100%{transform:scale(.55);opacity:.5}40%{transform:scale(1);opacity:1}}
@keyframes gv-pop{0%{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes gv-spin{to{transform:rotate(360deg)}}
.gv-spin{animation:gv-spin 1s linear infinite}

/* ---- scale DOWN gracefully: the card and the answer tighten in a narrow host -- */
@container (max-width:440px){
  .gv-step,.gv-ask-card{padding:14px 14px 14px 18px;border-radius:15px}
  .gv-step-text{font-size:calc(16.5px*var(--wc-fs,1))}
  .gv-ask-body{font-size:calc(14.5px*var(--wc-fs,1))}
  .gv-step-actions .gv-btn,.gv-ask-actions .gv-btn{flex:1 1 auto}
  /* Mark done + Verify stay side by side in a 380px floater even with its
     scrollbar showing (tighter padding, 13px); below ~320px they wrap to
     full-width rows, never clip. */
  .gv-step-actions .gv-btn{padding:0 12px;font-size:13px;gap:6px}
  .gv-verify{padding:9px 9px 9px 11px;margin-top:12px}
  .gv-reading{padding:9px 11px 9px 12px}
  .gv-offer-form .gv-btn{flex:1 1 100%}
}
@media(prefers-reduced-motion:reduce){
  .gv-swap.out,.gv-swap.in,.gv-confirm,.gv-ana i,.gv-spin,.gv-verify,.gv-btn.is-ready{animation:none}
  .gv-swap.out{opacity:0}
}
` + OVERVIEW_CSS

// Map a host palette (the floater's `c`, the full guide's THEME entry) onto the
// --gv-* tokens as inline style vars, for a document without the app CSS.
export function gvVars(c) {
  if (!c) return {}
  return {
    '--gv-text': c.text, '--gv-muted': c.muted, '--gv-faint': c.faint,
    '--gv-surface': c.panel, '--gv-surface-2': c.panel2, '--gv-border': c.border, '--gv-border-strong': c.borderStrong || c.border,
    '--gv-accent': c.accent, '--gv-accent-2': c.cyan, '--gv-accent-solid': c.accentSolid || c.accent, '--gv-on-accent': c.onAccent || '#ffffff',
    '--gv-accent-soft': c.accentSoft, '--gv-accent-ring': c.accentRing,
    '--gv-obs': c.cyan, '--gv-obs-soft': c.cyanSoft, '--gv-obs-ring': c.cyanRing,
    '--gv-warn': c.warn, '--gv-warn-soft': c.warnSoft,
    '--gv-good': c.good || c.accent, '--gv-good-soft': c.goodSoft || c.accentSoft, '--gv-danger': c.danger,
    '--gv-shadow': c.shadow || '0 6px 20px rgba(24,28,50,.08)',
  }
}
