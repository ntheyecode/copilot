// Wave 3 step reading styles (StepReadCard.jsx, StepReadingPanel.jsx), layered on
// WORKADMIN_CSS + TEACH_CSS and scoped under `.wka`, so they use the shared
// tokens and follow Light / Dark exactly like the console around them. Chips,
// marks and buttons never wrap or clip (nowrap + flex-shrink:0); at narrow
// widths the collapsed mark drops its word and keeps its icon.
export const STEP_READING_CSS = `
/* screen-reader-only live region; the recorder wrapper held during a pass */
.wka .tch-sr { position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
.wka .tch-hold { border:0; margin:0; padding:0; min-width:0; }
.wka .tch-hold:disabled { opacity:.6; }

/* the read card reuses the record card frame (.tch-rec) */
.wka .tch-read .tch-rec-cta .wka-btn { white-space:nowrap; flex:0 0 auto; }
.wka .tch-read-fine { margin:10px 0 0 48px; }
.wka .tch-read-banner { display:flex; align-items:flex-start; gap:9px; margin:12px 0 0 48px; padding:10px 8px 10px 14px; border-radius:10px;
  background:var(--wka-tint-amber); border:1px solid var(--wka-line); color:var(--wka-tint-amber-ink); font-size:13px; line-height:1.5; }
.wka .tch-read-banner svg { flex:0 0 auto; margin-top:2px; }
.wka .tch-read-banner > span { flex:1 1 auto; min-width:0; overflow-wrap:anywhere; }
.wka .tch-read-banner .wka-btn { flex:0 0 auto; margin:-4px 0; color:inherit; }

/* confidence band chip */
.wka .tch-band { display:inline-flex; align-items:center; height:22px; padding:0 9px; border-radius:999px; font-size:11.5px; font-weight:700;
  white-space:nowrap; flex:0 0 auto; background:var(--wka-tint-neutral); color:var(--wka-tint-neutral-ink); }
.wka .tch-band.high { background:var(--wka-tint-green); color:var(--wka-tint-green-ink); }
.wka .tch-band.medium { background:var(--wka-tint-blue); color:var(--wka-tint-blue-ink); }
.wka .tch-band.low { background:var(--wka-tint-amber); color:var(--wka-tint-amber-ink); }

/* collapsed row mark */
.wka .tch-readmark { display:inline-flex; align-items:center; gap:5px; height:22px; padding:0 8px; border-radius:999px; font-size:11.5px; font-weight:700;
  white-space:nowrap; flex:0 0 auto; background:var(--wka-tint-neutral); color:var(--wka-tint-neutral-ink); }
.wka .tch-readmark svg { flex:0 0 auto; }
.wka .tch-readmark.high, .wka .tch-readmark.used { background:var(--wka-tint-green); color:var(--wka-tint-green-ink); }
.wka .tch-readmark.medium, .wka .tch-readmark.busy { background:var(--wka-tint-blue); color:var(--wka-tint-blue-ink); }
.wka .tch-readmark.low, .wka .tch-readmark.note { background:var(--wka-tint-amber); color:var(--wka-tint-amber-ink); }

/* the suggestion in an open row */
.wka .tch-sug { border:1px solid var(--wka-line); border-left:3px solid var(--wka-accent-line); border-radius:10px; background:var(--wka-panel);
  padding:12px 14px; margin:0 0 12px; min-width:0; }
.wka .tch-sug.high { border-left-color:var(--wka-emerald); }
.wka .tch-sug.low { border-left-color:var(--wka-tint-amber-ink); }
.wka .tch-sug-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0; }
.wka .tch-sug-ikon { flex:0 0 auto; color:var(--wka-accent); }
.wka .tch-sug-ttl { font-weight:700; font-size:13px; color:var(--wka-text); min-width:0; }
.wka .tch-sug-rows { margin:10px 0 0; display:flex; flex-direction:column; gap:6px; }
.wka .tch-sug-row { display:flex; gap:12px; min-width:0; font-size:13px; line-height:1.5; }
.wka .tch-sug-row dt { flex:0 0 96px; color:var(--wka-faint); margin:0; }
.wka .tch-sug-row dd { flex:1 1 auto; min-width:0; margin:0; color:var(--wka-text); font-weight:600; overflow-wrap:anywhere; }
/* the control kind is a small tag, not inline words, so no locale has to fit a word order */
.wka .tch-sug-label { margin-right:8px; }
.wka .tch-sug-kind { display:inline-flex; align-items:center; height:20px; padding:0 7px; border-radius:6px; border:1px solid var(--wka-line);
  font-size:11px; font-weight:600; color:var(--wka-faint); white-space:nowrap; vertical-align:1px; }
.wka .tch-sug-none { color:var(--wka-faint); font-weight:500; }
.wka .tch-sug-foot { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:10px; padding-top:10px; border-top:1px solid var(--wka-line); }
.wka .tch-sug-check { display:flex; align-items:flex-start; gap:6px; margin:0; flex:1 1 240px; min-width:0; font-size:12px; color:var(--wka-faint); line-height:1.5; }
.wka .tch-sug-check svg { flex:0 0 auto; margin-top:2px; }
.wka .tch-sug-check span { min-width:0; overflow-wrap:anywhere; }
.wka .tch-sug-acts { display:inline-flex; align-items:center; gap:6px; flex:0 0 auto; margin-left:auto; }
.wka .tch-sug-acts .wka-btn { white-space:nowrap; flex:0 0 auto; }

/* per-step notes (reading now, could not read, no screenshot) */
.wka .tch-read-note { margin:0 0 12px; padding:9px 12px; border-radius:10px; background:var(--wka-panel); border:1px solid var(--wka-line); align-items:center; flex-wrap:wrap; }
.wka .tch-read-note.warn { background:var(--wka-tint-amber); }
.wka .tch-read-note > span:not(.tch-read-note-act) { flex:1 1 220px; }
.wka .tch-read-note-act { flex:0 0 auto; margin-left:auto; }
.wka .tch-read-note-act .wka-btn { white-space:nowrap; color:inherit; }

@media (max-width:720px){
  .wka .tch-read-fine, .wka .tch-read-banner { margin-left:0; }
  .wka .tch-readmark-txt { display:none; }
  .wka .tch-readmark { padding:0 6px; }
  .wka .tch-sug-row { flex-direction:column; gap:0; }
  .wka .tch-sug-row dt { flex-basis:auto; }
}
`
