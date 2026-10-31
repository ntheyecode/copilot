// StepShot.jsx: the step's screenshot in the step card, on the guide-view tokens
// (--gv-*) so it follows the console, the floating panel and the full guide in
// light and dark. The bar never wraps its toggle; the label gives way first.
export const STEP_SHOT_CSS = `
.gv-shot{margin-top:12px;min-width:0}
.gv-shot-bar{display:flex;align-items:center;gap:10px;width:100%;min-width:0;padding:6px 10px 6px 6px;border:1px solid var(--gv-border);border-radius:10px;background:var(--gv-surface-2);color:var(--gv-text);font:inherit;text-align:left;cursor:pointer}
.gv-shot-bar:hover{border-color:var(--gv-border-strong)}
.gv-shot-bar:focus-visible{outline:2px solid var(--gv-accent);outline-offset:2px}
.gv-shot-thumb{width:64px;height:40px;flex:0 0 auto;object-fit:cover;border-radius:6px;border:1px solid var(--gv-border);background:var(--gv-surface)}
.gv-shot-label{flex:1 1 auto;min-width:0;font-size:calc(12.5px*var(--wc-fs,1));font-weight:600;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gv-shot-toggle{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;white-space:nowrap;font-size:calc(12px*var(--wc-fs,1));font-weight:600;color:var(--gv-accent)}
.gv-shot-full{margin:8px 0 0;min-width:0}
.gv-shot-full img{display:block;width:100%;height:auto;max-height:70vh;object-fit:contain;border-radius:10px;border:1px solid var(--gv-border);background:var(--gv-surface)}
.gv-shot-full figcaption{margin-top:6px;font-size:calc(12px*var(--wc-fs,1));line-height:1.5;color:var(--gv-muted)}
.gv-shot-missing{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px dashed var(--gv-border);border-radius:10px;font-size:calc(12.5px*var(--wc-fs,1));color:var(--gv-muted)}
.gv-shot-missing svg{flex:0 0 auto;color:var(--gv-faint)}
`
