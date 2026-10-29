// Styles for the TASK OVERVIEW block (TaskOverview.jsx): the rich "what you'll
// be doing" paragraph under a task's title, on every surface that shows a
// task (session rows, the worker queue, project task rows, the guiding hosts).
// Namespaced wd-ovw-*. ONE sheet, appended to BOTH the app sheet (workApp.css.js,
// for the .wd shell) and the guide-view sheet (guideView.css.js, for the
// floater / full guide that carry no app tokens), so the block reads the same
// everywhere (SUPREME II).
//
// Tokens only. The block reads its own --ovw-* set, mapped first onto the app
// tokens (.wd: --tx / --em-deep / --tint-green / --tint-blue / --mut ...) and,
// inside a guide host (.gv), onto the --gv-* tokens; a literal here is a bug.
// Every brand color DERIVES from the user's combination through those tokens,
// so Light / Dark / Heavy and the eight brand combinations apply unchanged.
//
// The emphasis recipe (design system: minimal / white; the tinted highlight is
// the one flourish, no gradient, no glow):
//   **bold**       650 weight, the deep brand-green ink (ink-display): the text
//                  ink pulled a quarter toward the brand text shade
//   ==highlight==  an inline tinted mark: brand-soft fill, the brand text ink
//                  pulled toward the text ink (darker in Light, lighter in
//                  Dark) so it measures AA on the tint in every mode (the raw
//                  brand text shade sits at 4.2:1 on the tint; the render gate
//                  checks 4.5:1), small radius, cloned across line wraps
//   *italics*      italic in the muted ink: a quiet caveat
// The paragraph is dir="auto" (right-to-left text aligns itself) and clamps
// to N lines in dense lists with a Show more / Show less toggle; the project
// chip is a nowrap tinted pill that ellipsizes, never wraps or clips.
export const OVERVIEW_CSS = `
.wd-ovw{
  --ovw-fs:calc(13px*var(--wc-fs,1));
  --ovw-tx:var(--tx-2,var(--gv-text,inherit));
  --ovw-strong:color-mix(in srgb,var(--em-deep,var(--gv-accent,currentColor)) 24%,var(--tx,var(--gv-text,currentColor)));
  --ovw-mark-bg:var(--tint-green,var(--gv-accent-soft,transparent));
  --ovw-mark-tx:color-mix(in srgb,var(--tint-green-ink,var(--gv-accent,currentColor)) 82%,var(--tx,var(--gv-text,currentColor)));
  --ovw-em:var(--mut,var(--gv-muted,inherit));
  --ovw-chip-bg:var(--tint-blue,var(--gv-obs-soft,transparent));
  --ovw-chip-tx:var(--tint-blue-ink,var(--gv-obs,currentColor));
  --ovw-link:var(--em-deep,var(--gv-accent,currentColor));
  --ovw-ring:var(--focus,var(--gv-accent-ring,currentColor));
  --ovw-r:var(--r-xs,8px);
  display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0;max-width:76ch;width:100%;text-align:start}
.wd-ovw-p{margin:0;font-size:var(--ovw-fs);line-height:1.5;color:var(--ovw-tx);min-width:0;max-width:100%;overflow-wrap:anywhere;unicode-bidi:plaintext}
.wd-ovw.is-full .wd-ovw-p{font-size:calc(14px*var(--wc-fs,1));line-height:1.6}
/* Clamp: the dense-list preview. The line count comes inline (-webkit-line-clamp). */
.wd-ovw.is-clamped .wd-ovw-p{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
.wd-ovw-b{font-weight:650;color:var(--ovw-strong)}
.wd-ovw-m{background:var(--ovw-mark-bg);color:var(--ovw-mark-tx);font-weight:600;border-radius:calc(var(--ovw-r) - 2px);padding:1px 4px;margin:0;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.wd-ovw-i{font-style:italic;color:var(--ovw-em)}
/* The project chip: a tinted nowrap pill that ellipsizes its label. */
.wd-ovw-proj{display:inline-flex;align-items:center;gap:5px;height:20px;max-width:100%;padding:0 8px;border-radius:var(--r-pill,999px);background:var(--ovw-chip-bg);color:var(--ovw-chip-tx);font-size:var(--fs-xs,calc(11.5px*var(--wc-fs,1)));font-weight:600;line-height:1;white-space:nowrap;flex-shrink:0;min-width:0}
.wd-ovw-proj svg{flex-shrink:0}
.wd-ovw-proj-t{min-width:0;overflow:hidden;text-overflow:ellipsis;unicode-bidi:plaintext}
/* Show more / Show less: a quiet text button in the brand text shade. */
.wd-ovw-more{display:inline-flex;align-items:center;gap:4px;background:none;border:0;padding:2px 0;font:inherit;font-size:var(--fs-sm,calc(12.5px*var(--wc-fs,1)));font-weight:600;color:var(--ovw-link);cursor:pointer;white-space:nowrap;flex-shrink:0;border-radius:var(--ovw-r);line-height:1.2}
.wd-ovw-more:hover{text-decoration:underline;text-underline-offset:3px}
.wd-ovw-more:focus-visible{outline:2px solid var(--ovw-ring);outline-offset:2px}
.wd-ovw-more svg{flex-shrink:0;transition:transform .18s}
.wd-ovw[data-open='1'] .wd-ovw-more svg{transform:rotate(180deg)}
/* Heavy: the bolder variant carries the emphasis one step heavier. */
[data-theme='heavy'] .wd-ovw-b{font-weight:700}
[data-theme='heavy'] .wd-ovw-m{font-weight:650}
/* Guide hosts (.gv): the same block on the --gv-* tokens, which every guiding
   host carries (the floater and the full guide have no app tokens at all). The
   mark ink is the accent pulled toward the text ink, so it reads AA on the soft
   tint in the light and the dark panel alike. */
.gv .wd-ovw{
  --ovw-tx:var(--gv-text);--ovw-strong:var(--gv-text);
  --ovw-mark-bg:var(--gv-accent-soft);--ovw-mark-tx:color-mix(in srgb,var(--gv-accent) 62%,var(--gv-text));
  --ovw-em:var(--gv-muted);--ovw-chip-bg:var(--gv-obs-soft);--ovw-chip-tx:color-mix(in srgb,var(--gv-obs) 70%,var(--gv-text));
  --ovw-link:color-mix(in srgb,var(--gv-accent) 70%,var(--gv-text));--ovw-ring:var(--gv-accent-ring);
  padding:2px 2px 0}
.gv .wd-ovw.is-full .wd-ovw-p{font-size:calc(13.5px*var(--wc-fs,1));line-height:1.55}
@media(prefers-reduced-motion:reduce){.wd-ovw-more svg{transition:none}}
`
