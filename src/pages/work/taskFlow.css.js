// Styles for the guided-task FLOW (src/pages/work/TaskFlow.jsx): five beats
// (watching, next step, correction, confirmed, complete) on one DASHED
// connector (the reference's flow idiom), lit in sequence so a new person sees
// what will happen. Namespaced wd-tf-*. The animation is a quiet CSS cycle;
// prefers-reduced-motion shows every beat lit, static. Tokens only (light +
// dark) from .wd in workApp.css.js.
export const TASK_FLOW_CSS = `
.wd-tf{margin-top:var(--sp-6);background:var(--panel);border:1px solid var(--line-soft);border-radius:var(--r-lg);box-shadow:var(--sh-0);padding:22px 24px 20px;min-width:0;overflow:hidden}
.wd-tf-head{display:flex;align-items:flex-start;gap:12px;margin-bottom:var(--sp-5)}
.wd-tf-head .wd-ic{margin-top:0}
.wd-tf-head > div{min-width:0}
.wd-tf-head h2{font-family:var(--wd-display);font-weight:700;font-size:var(--fs-xl);letter-spacing:-.01em;line-height:1.3}
.wd-tf-head p{color:var(--mut);font-size:var(--fs-md);margin-top:2px;line-height:1.45;max-width:64ch}

/* The flow: five nodes on a grid; the connector is one dashed hairline behind
   the icon row, with a solid lit segment that advances with the beats. */
.wd-tf-flow{position:relative;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;list-style:none;margin:0;padding:0}
.wd-tf-flow::before{content:"";position:absolute;left:10%;right:10%;top:21px;height:0;border-top:2px dashed var(--line-2)}
.wd-tf-flow::after{content:"";position:absolute;left:10%;top:21px;height:2px;width:0;background:var(--em);border-radius:2px;animation:wd-tf-line 7.5s linear infinite}
@keyframes wd-tf-line{0%{width:0}10%{width:0}26%{width:20%}30%{width:20%}46%{width:40%}50%{width:40%}66%{width:60%}70%{width:60%}86%{width:80%}100%{width:80%}}
.wd-tf-node{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;min-width:0;padding:0 2px}
.wd-tf-ic{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:var(--tint-neutral);color:var(--tint-neutral-ink);border:none;flex-shrink:0;box-shadow:0 0 0 4px var(--panel);transition:background .3s,color .3s}
.wd-tf-node.lit .wd-tf-ic{background:var(--em);color:var(--on-em)}
/* Beats 2 to 5 light up as the connector reaches them (26 / 46 / 66 / 86% of
   the same 7.5 s cycle), so the flow reads left to right, then holds, then
   starts over. One keyframe set per beat: a keyframe cannot read a variable. */
.wd-tf-node.beat .wd-tf-ic{animation:7.5s linear infinite}
.wd-tf-node:nth-child(2) .wd-tf-ic{animation-name:wd-tf-b2}
.wd-tf-node:nth-child(3) .wd-tf-ic{animation-name:wd-tf-b3}
.wd-tf-node:nth-child(4) .wd-tf-ic{animation-name:wd-tf-b4}
.wd-tf-node:nth-child(5) .wd-tf-ic{animation-name:wd-tf-b5}
@keyframes wd-tf-b2{0%,24%{background:var(--tint-neutral);color:var(--tint-neutral-ink)}28%,100%{background:var(--em);color:var(--on-em)}}
@keyframes wd-tf-b3{0%,44%{background:var(--tint-neutral);color:var(--tint-neutral-ink)}48%,100%{background:var(--em);color:var(--on-em)}}
@keyframes wd-tf-b4{0%,64%{background:var(--tint-neutral);color:var(--tint-neutral-ink)}68%,100%{background:var(--em);color:var(--on-em)}}
@keyframes wd-tf-b5{0%,84%{background:var(--tint-neutral);color:var(--tint-neutral-ink)}88%,100%{background:var(--em);color:var(--on-em)}}
.wd-tf-t{font-size:var(--fs-md);font-weight:700;color:var(--tx);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.wd-tf-d{font-size:var(--fs-sm);color:var(--mut);line-height:1.45}
.wd-tf-n{position:absolute;top:-4px;left:calc(50% + 14px);width:18px;height:18px;border-radius:50%;background:var(--panel);border:1px solid var(--line);font-size:calc(10px*var(--wc-fs,1));font-weight:800;color:var(--mut);display:grid;place-items:center;line-height:1}
.wd-tf-foot{display:flex;align-items:center;gap:12px 16px;flex-wrap:wrap;margin-top:var(--sp-5);padding-top:var(--sp-4);border-top:1px solid var(--line-soft)}
.wd-tf-note{flex:1 1 240px;min-width:0;font-size:calc(13px*var(--wc-fs,1));color:var(--mut);line-height:1.5}
/* The one orange call-to-action on the first-run screen. */
.wd-tf-cta{flex-shrink:0;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;padding:0 20px;border-radius:var(--r-sm);border:none;background:var(--cta);color:var(--cta-ink);font-family:var(--wd-display);font-weight:700;font-size:var(--fs-base);line-height:1;cursor:pointer;transition:background .15s,transform .15s}
.wd-tf-cta:hover:not(:disabled){background:var(--cta-hover);transform:translateY(-1px)}
.wd-tf-cta:disabled{opacity:.5;cursor:default}
.wd-tf-cta svg{flex-shrink:0}

/* Narrow: a vertical flow, the connector runs down the icon column. */
@media(max-width:760px){
 .wd-tf{padding:18px 18px 16px}
 .wd-tf-flow{grid-template-columns:1fr;gap:14px}
 .wd-tf-flow::before{left:21px;right:auto;top:8%;bottom:8%;width:0;height:auto;border-top:none;border-left:2px dashed var(--line-2)}
 .wd-tf-flow::after{left:21px;top:8%;width:2px;height:0;animation-name:wd-tf-line-v}
 @keyframes wd-tf-line-v{0%{height:0}10%{height:0}26%{height:21%}30%{height:21%}46%{height:42%}50%{height:42%}66%{height:63%}70%{height:63%}86%{height:84%}100%{height:84%}}
 .wd-tf-node{flex-direction:row;align-items:flex-start;text-align:left;gap:12px}
 .wd-tf-node>div{min-width:0;flex:1 1 auto}
 .wd-tf-t{white-space:normal}
 .wd-tf-n{display:none}
 .wd-tf-cta{flex-basis:100%;width:100%}
}
/* Reduced motion (the system setting, or the explicit preference toggle):
   every beat lit, the connector fully drawn, nothing moves. */
@media(prefers-reduced-motion:reduce){
 .wd-tf-flow::after{animation:none;width:80%}
 .wd-tf-node.beat .wd-tf-ic{animation:none;background:var(--em);color:var(--on-em)}
 .wd-tf-cta{transition:none}
}
@media(prefers-reduced-motion:reduce) and (max-width:760px){
 .wd-tf-flow::after{width:2px;height:84%}
}
[data-a11y-motion='reduce'] .wd-tf-flow::after{animation:none;width:80%}
[data-a11y-motion='reduce'] .wd-tf-node.beat .wd-tf-ic{animation:none;background:var(--em);color:var(--on-em)}
@media(max-width:760px){[data-a11y-motion='reduce'] .wd-tf-flow::after{width:2px;height:84%}}
`
