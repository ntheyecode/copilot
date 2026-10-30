// "Company workflows" rows on the work dashboard, layered on the shared work
// tokens (tokens.css.js) and the queue row look (ep.css.js), so the section sits
// beside "Assigned to you" as one family and follows light / dark with the app.
// The Run button, chips and meta never wrap or clip (nowrap + flex-shrink:0); Run
// stays beside the row down to phone widths, where it takes the full width.
export const CW_CSS = `
.wd-cw-row{display:flex;align-items:center;gap:10px;padding:10px 12px 10px 10px;min-width:0;flex-wrap:wrap}
.wd-cw-head{display:flex;align-items:center;gap:12px;flex:1 1 280px;min-width:0;border:0;background:none;padding:4px;margin:0;font:inherit;color:inherit;text-align:left;cursor:pointer;border-radius:var(--r-sm)}
div.wd-cw-head{cursor:default}
.wd-cw-head:focus-visible{outline:2px solid var(--em);outline-offset:2px}
.wd-cw-main{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:3px}
.wd-cw-prod{font-weight:600;color:var(--tx-2);min-width:0;overflow:hidden;text-overflow:ellipsis;max-width:220px}
.wd-cw-chev{flex-shrink:0;color:var(--faint);transition:transform .18s ease}
.wd-cw-row.open .wd-cw-chev{transform:rotate(180deg)}
.wd-cw-run{flex-shrink:0}
.wd-cw-detail{flex-basis:100%;margin:2px 0 2px 48px;display:flex;flex-direction:column;gap:6px;padding-top:10px;border-top:1px solid var(--line-soft)}
.wd-cw-detail div{display:flex;gap:12px;min-width:0;font-size:13px;line-height:1.5}
.wd-cw-detail dt{flex:0 0 150px;color:var(--mut);margin:0}
.wd-cw-detail dd{flex:1 1 auto;min-width:0;margin:0;color:var(--tx);overflow-wrap:anywhere}
.wd-cw-act{display:inline-flex;align-items:center;gap:5px;background:none;border:0;padding:0;margin:0;font:inherit;font-weight:600;color:var(--em-deep);text-decoration:underline;text-underline-offset:3px;cursor:pointer;white-space:nowrap}
.wd-cw-tools{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px;min-width:0}
.wd-cw-search{position:relative;flex:1 1 260px;min-width:0;display:flex;align-items:center}
.wd-cw-search svg{position:absolute;left:12px;color:var(--mut);pointer-events:none}
.wd-cw-search .wd-pj-input{padding-left:36px}
.wd-cw-cat{flex:0 1 220px;min-width:0;width:auto}
.wd-cw-none{margin:4px 2px 0;font-size:13px;color:var(--mut)}
.wd-cw-more{background:none;border:0;cursor:pointer;font:inherit;font-weight:600}
.wd-cw-more svg.up{transform:rotate(180deg)}
@media (max-width:420px){ .wd-cw-run{flex:1 1 100%} }
@media (max-width:640px){
  .wd-cw-head{flex-basis:220px}
  .wd-cw-detail{margin-left:4px}
  .wd-cw-detail div{flex-direction:column;gap:0}
  .wd-cw-detail dt{flex-basis:auto}
  .wd-cw-prod{max-width:160px}
}
`
