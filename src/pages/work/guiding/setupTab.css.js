// Styles for the console's Guide / Setup tab strip and the Setup tab. Same
// tokens as the rest of the console (soft tints, one emerald accent, no glow),
// overflow-safe by construction: every pill is nowrap + flex-shrink:0, rows
// wrap as whole items, the preview scales with its box. Light + dark via the
// shared wd tokens; reduced motion respected.
export const SETUP_TAB_CSS = `
/* Guide | Setup: a quiet segmented strip under the toolbar */
.wc-tabs{display:inline-flex;align-items:center;gap:2px;padding:3px;margin:-6px 0 10px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);max-width:100%}
.wc-tab{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 13px;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--text-muted);font:inherit;font-size:12.5px;font-weight:650;white-space:nowrap;cursor:pointer;transition:background .15s,color .15s}
.wc-tab svg{flex-shrink:0;color:currentColor}
.wc-tab:hover{color:var(--text)}
.wc-tab[aria-selected="true"]{background:var(--surface);color:var(--text);border-color:var(--border);box-shadow:var(--shadow-sm)}
.wc-tab:focus-visible{outline:2px solid var(--em);outline-offset:2px}

/* The Setup tab: a few cards, one topic each, reading width */
.wc-setup{display:flex;flex-direction:column;gap:14px;padding-top:4px}
.wc-setup-lead{margin:2px 2px 0;font-size:13px;line-height:1.5;color:var(--text-muted)}
.wc-setup-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg,16px);box-shadow:var(--shadow-sm);padding:14px 16px 16px;display:flex;flex-direction:column;gap:12px;min-width:0}
.wc-setup-k{display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint)}
.wc-setup-k svg{color:var(--em);flex-shrink:0}
.wc-setup-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;min-width:0}
.wc-setup-row-k{font-size:12.5px;font-weight:600;color:var(--text-muted);white-space:nowrap}
.wc-setup-hint{font-size:12px;line-height:1.45;color:var(--text-muted)}
.wc-setup-note{display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.45;color:var(--text-muted);padding:9px 11px;border-radius:10px;background:var(--surface-2)}
.wc-setup-note svg{flex-shrink:0;color:var(--em);margin-top:1px}
.wc-setup-warn{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.45;color:var(--text);padding:10px 12px;border-radius:10px;background:var(--warning-soft);border-left:3px solid var(--warning)}
.wc-setup-warn svg{flex-shrink:0;color:var(--warning);margin-top:1px}

/* Source choice: two cards in a radiogroup, whole cards wrap, never their text */
.wc-src{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.wc-src-opt{display:flex;align-items:flex-start;gap:11px;text-align:left;padding:12px 13px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;cursor:pointer;min-width:0;transition:border-color .15s,background .15s}
.wc-src-opt:hover:not(:disabled){border-color:var(--border-strong)}
.wc-src-opt[aria-checked="true"]{background:var(--em-soft);border-color:var(--em)}
.wc-src-opt:focus-visible{outline:2px solid var(--em);outline-offset:2px}
.wc-src-opt:disabled{opacity:.55;cursor:default}
.wc-src-ic{width:32px;height:32px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center;background:var(--surface);color:var(--em);border:1px solid var(--border)}
.wc-src-opt[aria-checked="true"] .wc-src-ic{background:var(--em);color:var(--on-em,#fff);border-color:transparent}
.wc-src-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.wc-src-t b{font-size:13.5px;font-weight:700;line-height:1.3}
.wc-src-t small{font-size:11.5px;line-height:1.4;color:var(--text-muted)}

/* Camera picker: a native select (keyboard + screen reader friendly) + refresh */
.wc-cam-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.wc-cam-sel{flex:1 1 220px;min-width:0;height:34px;padding:0 10px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;font-size:13px}
.wc-cam-sel:focus-visible{outline:2px solid var(--em);outline-offset:1px}

/* Live preview: a 16:9 box that scales with the card; the video fills it */
.wc-cam-view{position:relative;width:100%;max-width:560px;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#0b0f14;border:1px solid var(--border)}
.wc-cam-view video{display:block;width:100%;height:100%;object-fit:contain;background:#0b0f14}
.wc-cam-view.idle{display:grid;place-items:center;background:var(--surface-2)}
.wc-cam-idle{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px;text-align:center;color:var(--text-muted);font-size:12.5px}
.wc-cam-idle svg{color:var(--text-faint)}
.wc-cam-live{position:absolute;top:8px;left:8px;display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.55)}
.wc-cam-live i{width:6px;height:6px;border-radius:50%;background:var(--danger);animation:wc-blink 1.6s ease-in-out infinite}
.wc-cam-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* Switch rows (the live-view toggle): label + hint left, the switch pinned right */
.wc-sw-row{display:flex;align-items:center;gap:12px;min-width:0}
.wc-sw-t{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}
.wc-sw-t b{font-size:13px;font-weight:600;line-height:1.3;color:var(--text)}
.wc-sw-t small{font-size:11.5px;color:var(--text-muted);line-height:1.4}
.wc-sw{position:relative;flex:0 0 auto;width:40px;height:22px;border-radius:999px;border:1px solid var(--border);background:var(--surface-2);padding:0;cursor:pointer;transition:background .15s,border-color .15s}
.wc-sw::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
.wc-sw[aria-checked="true"]{background:var(--em);border-color:var(--em)}
.wc-sw[aria-checked="true"]::after{transform:translateX(18px)}
.wc-sw:focus-visible{outline:2px solid var(--em);outline-offset:2px}
.wc-sw-l{flex:0 0 auto;width:28px;font-size:11.5px;font-weight:600;color:var(--text-muted);white-space:nowrap}

/* Camera-off banner (the server refused a camera read): actionable, calm */
.wc-camoff{display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:11px 14px 11px 17px;border-radius:12px;background:var(--warning-soft);position:relative;overflow:hidden;font-size:13px;line-height:1.45;color:var(--text)}
.wc-camoff::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--warning)}
.wc-camoff>svg{flex-shrink:0;color:var(--warning);margin-top:2px}
.wc-camoff-t{flex:1 1 240px;min-width:0}
.wc-camoff-t b{display:block;font-weight:700;margin-bottom:2px}
.wc-camoff-acts{display:flex;gap:8px;flex-wrap:wrap;flex:0 0 auto}

@media(max-width:640px){
  .wc-setup-card{padding:12px 12px 14px}
  .wc-cam-acts .wc-tbtn{flex:1 1 auto;justify-content:center}
  .wc-camoff-acts{flex:1 1 100%}
  .wc-camoff-acts .wc-tbtn{flex:1 1 auto;justify-content:center}
}
@media(prefers-reduced-motion:reduce){.wc-cam-live i{animation:none}.wc-sw,.wc-sw::after,.wc-tab,.wc-src-opt{transition:none}}
`
