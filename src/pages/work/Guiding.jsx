// The guiding console as its own deep-linkable route (/work/session/:id).
// The Console, its helpers (DeliverablesPanel, PlanningLoader, confetti, ...)
// and the FloatPanel overlay are moved here VERBATIM from WorkPage.jsx (no
// logic edits, per the restructure plan's risk mitigation G1). Only the entry
// wrapper is new: sessionId comes from the route param, onBack navigates to
// /work, onGuard surfaces via the app shell. The step link / terminal / code
// blocks and the copy helper live in src/components (shared with the public
// "try it live" widget) and are imported below.
import { useEffect, useRef, useState, useCallback, useMemo, useReducer } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, Check, X, Plus, LogOut, ChevronLeft, Trash2, Download, Monitor, Camera, Eye, HelpCircle, Square, Play, AlertTriangle, ClipboardCopy, Menu as MenuIcon, PictureInPicture2, Sun, Moon, ScanLine, Printer, Zap, ExternalLink, Globe, LayoutDashboard, BookOpen, ChevronRight, Sparkles, Rocket, Calculator, Compass, Blocks, Clock, Smartphone, AppWindow, ArrowRight, LifeBuoy, Users, FileText, CreditCard, ShieldCheck, RefreshCw, Paperclip, PenLine, Upload, FileSpreadsheet, Building2, Phone, MapPin, BarChart3, Settings, Wrench, Table } from 'lucide-react'
import { api, friendlyError } from '../../api.js'
import AnswerBody, { splitSegments } from '../../components/AnswerBody.jsx'
import RichText from '../../components/RichText.jsx'
import { StepLink, CmdBlock, CodeBlock } from '../../components/StepBlocks.jsx'   // the ONE step link / terminal / code renderer (shared with the public widget)
import { copyText } from '../../components/CopyChip.jsx'
import { hrefForUrl } from '../../shared/links.js'
import DownloadMenu from '../../components/DownloadMenu.jsx'
import GuideFontControl, { useGuideFontScale } from '../../components/GuideFontScale.jsx'
import AccentPicker from '../../components/AccentPicker.jsx'
import ResultCard from '../../components/ResultCard.jsx'
import ComposeCard from '../../components/ComposeCard.jsx'
import ComputeCard from '../../components/ComputeCard.jsx'
import { stepWindow, progressText, stepProgress, planMarker } from '../../shared/step_window.js'
import { runSpec, validateSpec } from '../../../server/compute_spec.js'
import { clean, cleanForStore, isDlpActive } from '../../scrub.js'
import { redactFrame, warmFrameScrub } from '../../frame_scrub.js'
import { useTheme } from '../../theme.jsx'
import { useWorkApp } from './WorkAppContext.jsx'
import { usageTimeLeft, usageOutOfTime, usageLowNote } from './usageCopy.js'
import { linkHost, readContextFile, parseDataFile, frameFromVideo, signatureFromVideo, changed, isMobileUA, frameFromImageFile, WATCH_MAX_W, card, shell } from './lib.js'
// The guide view (owner redesign): ONE stylesheet + small shared modules used
// by the console AND the floating panel, so both read identically.
import { GUIDE_CSS, gvVars } from './guideView.css.js'
import FadeSwap from './FadeSwap.jsx'
import ReadingStrip, { readingIsProminent } from './ReadingStrip.jsx'
import StepCard from './StepCard.jsx'
import AskFocus from './AskFocus.jsx'
import GoalLine from './GoalLine.jsx'
import DestructiveGate from './DestructiveGate.jsx'
import { askReducer, initialAsk, askFocused, normalizeAskResponse, applyResume, ASK_OFFER, ASK_ANSWERED } from './askFlow.js'
import useStuck from './useStuck.js'
import GuideLevelControl, { useGuideLevel } from '../../components/GuideLevel.jsx'
import FloatPanel from './FloatPanel.jsx'
import { makeConfetti, confettiNodes } from './confetti.jsx'
import { VerifyButton, VerifyVerdict } from './VerifyStep.jsx'
import { verdictFromWatch, verdictForStep, VERIFY_DONE, VERIFY_NO_FRAME, VERIFY_ERROR } from './verifyFlow.js'

// Responsive layer for the (otherwise inline-styled) Console. Scoped to the
// .wc wrapper so it never touches the rest of the app. On a phone it enlarges
// tap targets to ~40px, bumps field text to 16px (stops iOS zoom-on-focus),
// and lets the ask / capture rows grow to full width. Desktop is untouched.
const CONSOLE_CSS = `
.wc{overflow-x:hidden}
.wc *{box-sizing:border-box}
.wc pre{max-width:100%}
@media(max-width:600px){.wc-top .wc-lbl{display:none}.wc-top .wc-tbtn{padding:0 9px}}
@media(max-width:640px){
  .wc .btn{min-height:44px;height:auto;padding-top:9px;padding-bottom:9px}
  .wc .btn-sm{min-height:40px;height:auto;padding-top:7px;padding-bottom:7px}
  .wc .icon-btn{min-width:40px;min-height:40px}
  .wc .input,.wc .select,.wc .textarea{font-size:16px}
  .wc textarea.input{min-height:76px;height:auto}
  .wc-askrow .input{flex:1 1 100%}
  .wc-askrow .btn{flex:1 1 auto;justify-content:center}
  .wc-caprow .wc-grow{flex:1 1 100%;justify-content:center}
  .wc .wc-tbtn,.wc .wc-chip-btn{min-height:38px}
  .wc .wc-ib{min-width:36px;min-height:36px}
  .wc-ask .wc-ask-row .wc-tbtn{flex:1 1 auto;justify-content:center}
}
/* Deliverables panel (review -> prompts + document) */
.wc-dl{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,7,14,.6);backdrop-filter:blur(4px)}
.wc-dl-card{width:min(680px,calc(100vw - 28px));max-height:min(86vh,760px);display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);overflow:hidden}
.wc-dl-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--line)}
.wc-dl-head b{display:inline-flex;align-items:center;gap:8px;font-size:16px}
.wc-dl-head svg{color:var(--em-2)}
.wc-dl-x{background:none;border:none;color:var(--mut);font-size:24px;line-height:1;cursor:pointer;padding:0 4px}
.wc-dl-body{padding:18px 20px;overflow:auto}
.wc-dl-lead{color:var(--mut);font-size:14px;line-height:1.6;margin:0 0 14px}
.wc-dl-thumbs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.wc-dl-thumb{position:relative;width:92px;height:62px;border-radius:9px;overflow:hidden;border:1px solid var(--line-2)}
.wc-dl-thumb img{width:100%;height:100%;object-fit:cover}
.wc-dl-thumb span{position:absolute;left:4px;bottom:3px;font-size:10px;font-weight:700;color:#fff;background:rgba(0,0,0,.6);border-radius:4px;padding:0 5px}
.wc-dl-thumb button{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:#fff;font-size:13px;line-height:1;cursor:pointer}
.wc-dl-empty{color:var(--mut);font-size:13px;padding:14px 0}
.wc-dl-err{color:var(--danger);font-size:13px;margin-bottom:10px}
.wc-dl-auto{display:inline-flex;align-items:center;gap:9px;font-size:13.5px;color:var(--tx);cursor:pointer;margin-bottom:12px;font-weight:500}
.wc-dl-auto input{width:16px;height:16px;accent-color:var(--em-2);cursor:pointer}
.wc-dl-watch{display:flex;align-items:center;gap:9px;background:var(--em-fill);border:1px solid var(--em-line);border-radius:10px;padding:9px 12px;font-size:12.5px;color:var(--tx-2);margin-bottom:12px}
.wc-dl-watch .dot{width:9px;height:9px;border-radius:50%;background:var(--em-2);box-shadow:0 0 0 0 var(--em-2);animation:wc-dl-pulse 1.4s infinite}
@keyframes wc-dl-pulse{0%{box-shadow:0 0 0 0 rgba(56,189,248,.5)}70%{box-shadow:0 0 0 7px rgba(56,189,248,0)}100%{box-shadow:0 0 0 0 rgba(56,189,248,0)}}
.wc-dl-note{background:var(--warm-fill);border:1px solid var(--warm-line);color:var(--warm);border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px}
.wc-dl-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.wc-dl-summary{font-size:14.5px;line-height:1.6;color:var(--tx);margin:0 0 16px}
.wc-dl-sec{margin-bottom:16px}
.wc-dl-sec h4{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin:0 0 10px}
.wc-dl-issue{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--line)}
.wc-dl-issue .sev{flex-shrink:0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;padding:3px 8px;border-radius:999px}
.wc-dl-issue .sev.critical{color:#fff;background:#c0392b}.wc-dl-issue .sev.high{color:#fff;background:#e0742b}
.wc-dl-issue .sev.medium{color:#7a5300;background:rgba(255,179,92,.3)}.wc-dl-issue .sev.low{color:var(--mut);background:var(--chip)}
.wc-dl-issue b{font-size:14px}
.wc-dl-issue .ctrl{display:inline-block;margin-left:7px;font-size:11px;font-weight:600;color:var(--em-2)}
.wc-dl-issue .fix{color:var(--mut);font-size:13px;margin-top:3px;line-height:1.5}
.wc-dl-prompt{margin:14px 0;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.wc-dl-prompt .ph{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--panel-2);border-bottom:1px solid var(--line);font-size:13px}
.wc-dl-prompt pre{margin:0;padding:12px;white-space:pre-wrap;word-break:break-word;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12.5px;line-height:1.55;color:var(--tx-2);max-height:220px;overflow:auto}
@media(max-width:640px){.wc-dl-card{width:calc(100vw - 20px);max-height:92vh}.wc-dl-actions .btn{flex:1 1 auto;justify-content:center}}

/* ===================================================================
   Guiding panel design system (Fluent / Wiz-grade). Green is the brand
   token (--brand-500); here it is used ONLY as accent (chips, left
   accent bars, soft fills, dots), never as body-text colour. Action
   text is high-contrast --text; pending recedes; done is quietly struck.
   --text-dim / --brand-50 are aliased to real tokens so they resolve
   correctly in BOTH light and dark (they are otherwise undefined).
   =================================================================== */
/* ONE accent for the whole console: emerald, the same family the rest of the
   site uses (hero, live, done). The old blue retune competed with the green and
   read as a second app; a single accent keeps every primary action coherent.
   Typography matches the site too: Bricolage Grotesque display, Figtree body,
   JetBrains Mono code, so the console stops inheriting the desktop Segoe UI. */
.wc{--text-dim:var(--text-muted);
  --wc-display:"Bricolage Grotesque","Figtree",system-ui,sans-serif;
  --wc-body:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --wc-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-family:var(--wc-body);
  --brand-500:var(--accent,#0e9f6e);--brand-600:var(--accent-dark,#0b8259);--brand-700:var(--accent-ink,#086647);--brand-soft:var(--accent-soft,rgba(14,159,110,.12));--brand-50:var(--accent-soft,rgba(14,159,110,.12));
  /* Semantic guiding palette (color-coded by meaning): EMERALD = the current
     step / live action (the brightest thing), CYAN = calm context the watcher
     can see (observation), amber = warnings (--warning, already defined). Light
     values here; the dark overrides follow. Derived from the brand set
     emerald #8cf5c4 / cyan #39d3ff for dark; darkened for contrast on white. */
  --em:var(--accent,#0e9f6e);--em-2:#0a84c2;--on-em:var(--accent-contrast,#ffffff);
  --em-soft:var(--accent-soft,rgba(14,159,110,.10));--em-ring:var(--accent-line,rgba(14,159,110,.32));--em-glow:rgba(14,159,110,.16);
  --obs:#0a84c2;--obs-soft:rgba(10,132,194,.09);--obs-ring:rgba(10,132,194,.30);
  /* MS-docs blue, for the inline "Open ..." hyperlinks (distinct from the green
     accent so a link reads as a link). --wc-fs is the reader text-size multiplier
     (set inline on .wc); guidance font-sizes below are calc(px * var(--wc-fs)). */
  --wc-link:#0067c0;--wc-fs:1;
  font-feature-settings:"tnum" 1,"cv11" 1}
[data-theme='dark'] .wc{--brand-500:var(--accent,#34d8a0);--brand-600:var(--accent,#12b981);--brand-700:var(--accent,#0e9f6e);--brand-soft:var(--accent-soft,rgba(52,216,160,.16));--brand-50:var(--accent-soft,rgba(52,216,160,.16));
  --em:var(--accent,#8cf5c4);--em-2:#39d3ff;--on-em:var(--accent-contrast,#052a1d);
  --em-soft:var(--accent-soft,rgba(140,245,196,.14));--em-ring:var(--accent-line,rgba(140,245,196,.34));--em-glow:rgba(140,245,196,.20);
  --obs:#39d3ff;--obs-soft:rgba(57,211,255,.12);--obs-ring:rgba(57,211,255,.34);--wc-link:#6cb6ff}
/* --em-glow has no --accent-* counterpart: derived only once a user accent is set
   (data-accent on :root), after the dark block so it applies in both themes. */
[data-accent] .wc{--em-glow:color-mix(in srgb,var(--accent) 18%,transparent)}
.wc .fill{flex:1 1 auto;min-width:0}

/* Header toolbar: one quiet row under a hairline. Float on top is the primary
   action of this screen on the web, so it is the one filled button up here. */
.wc-top{display:flex;align-items:center;gap:6px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);min-width:0}
.wc-ib{width:34px;height:34px;flex:0 0 auto;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--text-muted);display:grid;place-items:center;cursor:pointer;transition:background .16s,color .16s,border-color .16s}
.wc-ib:hover{background:var(--surface-2);color:var(--text);border-color:var(--border)}
.wc-ib:disabled{opacity:.5;cursor:default}
.wc-ib.on{background:var(--brand-soft);color:var(--brand-600);border-color:transparent}
.wc-min{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;font-size:11.5px;font-weight:650;color:var(--text-muted);background:var(--surface-2);border:1px solid var(--border);border-radius:999px;padding:0 10px;height:28px;white-space:nowrap;font-variant-numeric:tabular-nums}
.wc-min .wc-dot{width:6px;height:6px;border-radius:50%;background:var(--brand-500)}
.wc-min.low{color:var(--danger);background:var(--danger-soft);border-color:transparent}
.wc-min.low .wc-dot{background:var(--danger)}
/* Compact toolbar button: the header + guide-bar control family */
.wc-tbtn{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 13px;border-radius:10px;font-size:12.5px;font-weight:600;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;white-space:nowrap;line-height:1;box-shadow:var(--shadow-sm);transition:background .16s,border-color .16s,color .16s,transform .1s,box-shadow .16s}
.wc-tbtn:hover:not(:disabled){border-color:var(--border-strong);background:var(--surface-2)}
.wc-tbtn:active:not(:disabled){transform:translateY(1px)}
.wc-tbtn:disabled{opacity:.55;cursor:default}
.wc-tbtn svg{color:var(--text-muted);flex-shrink:0}
.wc-tbtn.primary{background:linear-gradient(180deg,var(--brand-500),var(--brand-600));border-color:transparent;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.14)}
.wc-tbtn.primary:hover:not(:disabled){background:var(--brand-600);filter:brightness(1.04)}
.wc-tbtn.primary svg{color:#fff}
.wc-tbtn.ghost{background:transparent;border-color:transparent;color:var(--text-muted);box-shadow:none}
.wc-tbtn.ghost:hover:not(:disabled){background:var(--surface-2);color:var(--text)}
.wc-tbtn.on{background:var(--brand-soft);border-color:transparent;color:var(--brand-600);box-shadow:none}
.wc-tbtn.on svg{color:var(--brand-600)}
.wc-tbtn.on:hover:not(:disabled){background:var(--brand-soft);border-color:var(--brand-500)}
.wc-tbtn.live{background:var(--danger-soft);border-color:transparent;color:var(--danger)}
.wc-tbtn.live svg{color:var(--danger)}
.wc-tbtn.quiet{color:var(--text-muted)}
.wc-tbtn.quiet:hover:not(:disabled){color:var(--danger);border-color:var(--danger)}
.wc-strong{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:650;color:var(--brand-600);background:var(--brand-soft);padding:0 9px;height:26px;border-radius:999px}

/* Live status row: a single card that holds the watch state (or the action
   that starts it), the minutes, and the three live actions. */
.wc-guidebar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;padding:9px 10px;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow-sm)}
.wc-guidebar .wc-sp{flex:1 1 auto;min-width:4px}
.wc-guidebar .wc-tbtn:not(.primary){box-shadow:none;background:var(--surface-2)}
.wc-guidebar .wc-tbtn:not(.primary):hover:not(:disabled){background:var(--surface-3)}
.wc-guidebar .wc-tbtn.ghost{background:transparent}
.wc-watch{height:34px;padding:0 15px;font-size:13px;font-weight:650}
/* First-run hint: share your screen, then float the steps above your work. */

/* PLAN-HEAVY MODE (watch-light, forced by us for Premium): a calm informational
   strip + an on-demand "Check my progress" action. There is no toggle. One
   emerald accent, same tokens, works light + dark. */
.wc-live-pill.lite{color:var(--brand-600);background:var(--brand-soft)}
.wc-live-pill.lite svg{color:var(--brand-600);flex-shrink:0}
.wc-wl{display:flex;align-items:center;gap:10px 12px;flex-wrap:wrap;margin:10px 0 0;padding:11px 14px;background:var(--em-soft);border:1px solid var(--em-ring);border-radius:14px}
.wc-wl .wc-sp{flex:1 1 auto;min-width:4px}
.wc-wl-ic{color:var(--brand-600);flex-shrink:0}
.wc-wl-sub{flex:1 1 220px;min-width:0;font-size:12.5px;color:var(--text-muted);line-height:1.45}
.wc-wl-check{flex:0 0 auto;box-shadow:none}
@media(max-width:640px){.wc-wl-check{flex:1 1 100%;justify-content:center}}

/* Completed-task bar */
.wc-donebar{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:14px 16px 14px 20px;margin-bottom:12px;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-sm);overflow:hidden}
.wc-donebar::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--success)}
.wc-donebar-lead{display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:650;color:var(--text);min-width:0}
.wc-donebar-lead svg{color:var(--success);flex-shrink:0}
.wc-donebar-lead .wc-done-ic{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);flex-shrink:0}
.wc-donebar-lead small{display:block;font-size:12px;font-weight:500;color:var(--text-muted);margin-top:1px}
.wc-donebar-actions{display:flex;flex-wrap:wrap;gap:8px;margin-left:auto}
.wc-chip-btn{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:12.5px;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .16s,border-color .16s}
.wc-chip-btn:hover{border-color:var(--border-strong);background:var(--surface-3)}
.wc-chip-btn svg{color:var(--text-muted);flex-shrink:0}
@media(max-width:640px){.wc-donebar-actions{margin-left:0;width:100%}.wc-donebar-actions .wc-chip-btn{flex:1 1 calc(50% - 4px);justify-content:center}}

/* Banners */
.wc-banner{position:relative;display:flex;align-items:center;gap:10px;border-radius:12px;padding:11px 14px;margin-bottom:12px;font-size:13.5px;line-height:1.45;overflow:hidden}
.wc-banner svg{flex-shrink:0}
.wc-banner .fill{flex:1}
.wc-banner.danger{background:var(--danger);color:#fff}
.wc-banner.warn{background:var(--warning-soft);color:var(--text);padding-left:17px}
.wc-banner.warn::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--warning)}
.wc-banner.warn svg{color:var(--warning)}

/* OBSERVATION = calm context the watcher can see: a cyan-tinted chip. */
@keyframes wc-pulse{0%{box-shadow:0 0 0 0 var(--pr)}70%{box-shadow:0 0 0 7px transparent}100%{box-shadow:0 0 0 0 transparent}}
/* PINNED guide status strip: Pause/Resume + minutes + the live reading line,
   kept in the fixed header so they never scroll away (owner request). While a
   frame is in flight it blinks "Analyzing"; on the reply it returns to the calm
   reading line. Hidden at >=1240px where the right rail carries these controls. */
.wc-guidehead{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.wc-gh-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
@media(min-width:1240px){.wc-guidehead{display:none}}
/* The only live pill left is Plan-heavy mode (.lite); watch state lives in the header chip. */
.wc-live-pill{display:inline-flex;align-items:center;gap:7px;height:34px;font-size:12.5px;font-weight:650;color:var(--em);background:var(--em-soft);padding:0 13px;border-radius:999px;white-space:nowrap}
.wc-plan-title{font-family:var(--wc-display);font-size:18px;font-weight:700;color:var(--text);margin:14px 2px 0;line-height:1.3;letter-spacing:-.015em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.wc-plan-kicker{display:flex;align-items:center;gap:8px;margin:16px 2px 0;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint)}
.wc-plan-kicker+.wc-plan-title{margin-top:4px}
.wd-modal-ov{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,14,24,.5);backdrop-filter:blur(3px)}
.wd-modal{width:min(420px,calc(100vw - 36px));background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:22px;box-shadow:0 30px 70px -30px rgba(0,0,0,.5)}
.wd-modal h3{display:flex;align-items:center;gap:9px;font-weight:700;font-size:18px;margin:0 0 6px}
.wd-modal-btns{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}

/* DO THIS NOW hero: the single strongest focus on the screen */
/* CURRENT STEP = the brightest element: emerald accent, an emerald->cyan left
   bar, and a gentle pulsing glow (disabled under prefers-reduced-motion). */

/* Mid-guiding clarification card: the plan asks for one essential input it
   cannot see. Calmer than the hero (no pulse), green-tinted fill + a left accent
   bar so it reads as the guide asking, not an error. Chips wrap freely; the text
   form wraps the button under the input on narrow floaters so nothing overflows. */
.wc-clarify{position:relative;margin-top:14px;padding:15px 17px 13px 19px;background:var(--em-soft);border:1px solid var(--em-ring);border-left:4px solid var(--em);border-radius:14px;box-sizing:border-box;overflow:hidden}
.wc-clarify-head{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--em)}
.wc-clarify-head svg{flex-shrink:0}
.wc-clarify-q{font-family:var(--wc-body);margin-top:6px;font-size:calc(14.5px*var(--wc-fs,1));line-height:1.4;font-weight:650;color:var(--text);letter-spacing:-.005em;text-wrap:pretty;overflow-wrap:anywhere}
.wc-clarify-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}
.wc-clarify-chip{max-width:100%;display:inline-flex;align-items:center;font:inherit;font-size:calc(12.5px*var(--wc-fs,1));font-weight:600;color:var(--text);background:var(--surface);border:1.5px solid var(--em);border-radius:999px;padding:6px 13px;min-height:32px;cursor:pointer;white-space:normal;overflow-wrap:anywhere;text-align:left;transition:background .15s,color .15s,box-shadow .15s}
.wc-clarify-chip:hover:not(:disabled){background:var(--em);color:var(--on-em)}
.wc-clarify-chip:focus-visible{outline:none;box-shadow:0 0 0 3px var(--em-ring)}
.wc-clarify-chip:disabled{opacity:.5;cursor:default}
.wc-clarify-form{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}
.wc-clarify-input{flex:1 1 170px;min-width:0;font:inherit;font-size:calc(13px*var(--wc-fs,1));color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:0 11px;height:36px;box-sizing:border-box}
.wc-clarify-input::placeholder{color:var(--text-faint)}
.wc-clarify-input:focus{outline:none;border-color:var(--em);box-shadow:0 0 0 3px var(--em-ring)}
.wc-clarify-send{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;font:inherit;font-size:calc(13px*var(--wc-fs,1));font-weight:650;color:var(--on-em);background:var(--em);border:none;border-radius:9px;padding:0 16px;height:36px;cursor:pointer;white-space:nowrap;transition:background .15s,opacity .15s}
.wc-clarify-send:hover:not(:disabled){filter:brightness(.93)}
.wc-clarify-send:focus-visible{outline:none;box-shadow:0 0 0 3px var(--em-ring)}
.wc-clarify-send:disabled{opacity:.5;cursor:default}
/* "Other" under the chips: the escape hatch when the shortlist misses the real
   answer. Visually secondary to the chips: a muted label, the same input, and an
   outlined (not filled) Send. The label never wraps; the input gives. */
.wc-clarify-form.other{margin-top:10px;align-items:center}
.wc-clarify-other-k{flex:0 0 auto;font-size:calc(11px*var(--wc-fs,1));font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);white-space:nowrap}
.wc-clarify-send.quiet{color:var(--em);background:var(--surface);border:1.5px solid var(--em);padding:0 14px}
.wc-clarify-send.quiet:hover:not(:disabled){filter:none;background:var(--em);color:var(--on-em)}
/* Footer: the hint plus the quiet Skip (the unsure path). A text-style button,
   never loud; it wraps as prose on narrow floaters so nothing overflows. */
.wc-clarify-foot{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-top:9px}
.wc-clarify-hint{font-size:calc(11px*var(--wc-fs,1));color:var(--text-muted)}
.wc-clarify-skip,.wc-clarify-undo{font:inherit;font-size:calc(11px*var(--wc-fs,1));font-weight:600;color:var(--text-muted);background:transparent;border:none;padding:0;margin:0;cursor:pointer;text-align:left;white-space:normal;overflow-wrap:anywhere;text-decoration:underline;text-decoration-color:transparent;text-underline-offset:3px;border-radius:4px;transition:color .15s,text-decoration-color .15s}
.wc-clarify-skip:hover:not(:disabled),.wc-clarify-undo:hover:not(:disabled){color:var(--em);text-decoration-color:currentColor}
.wc-clarify-skip:focus-visible,.wc-clarify-undo:focus-visible{outline:none;color:var(--em);box-shadow:0 0 0 3px var(--em-ring)}
.wc-clarify-skip:disabled,.wc-clarify-undo:disabled{opacity:.5;cursor:default}
/* Answered / skipped strip: tiny and secondary, same tokens as the card. The
   text takes the width and wraps; the Change link never wraps mid-word and
   drops to its own line on a narrow floater instead of overflowing. */
.wc-clarify-done{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin-top:12px;padding:8px 12px 8px 13px;font-size:calc(12px*var(--wc-fs,1));line-height:1.4;color:var(--text-muted);background:var(--em-soft);border:1px solid var(--em-ring);border-left:3px solid var(--em);border-radius:10px;box-sizing:border-box;min-width:0}
.wc-clarify-done>svg{flex:0 0 auto;color:var(--em)}
.wc-clarify-done-t{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.wc-clarify-done-t b{color:var(--text);font-weight:650}
.wc-clarify-undo{flex:0 0 auto;font-size:calc(12px*var(--wc-fs,1));color:var(--em);text-decoration-color:currentColor;white-space:nowrap}
@media(max-width:640px){.wc-clarify{padding:13px 14px 11px 16px}.wc-clarify-send{flex:1 1 100%}.wc-clarify-form.other .wc-clarify-send{flex:0 0 auto}}

/* Step navigator with a progress track */

/* Step cards: current leads, pending recedes, done is struck. When the task is
   over (.wc-steps.ro) the same cards become a calm, read-only record. */
.wc-steps{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.wc-step{position:relative;display:flex;gap:12px;align-items:flex-start;padding:12px 14px 12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:14px;transition:border-color .16s,background .16s,box-shadow .16s,opacity .16s}
.wc-step.done{background:var(--surface-2);border-color:transparent}
.wc-step.skipped{background:transparent;border-style:dashed}
.wc-step-check{flex-shrink:0;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;border:1.5px solid var(--border-strong);background:transparent;color:var(--text-faint);cursor:pointer;margin-top:1px;padding:0;font:inherit;transition:border-color .16s,background .16s,color .16s}
.wc-step-check:hover{border-color:var(--em);color:var(--em)}
.wc-step-num{font-size:11.5px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.wc-step.done .wc-step-check{border-color:transparent;background:var(--success-soft);color:var(--success)}
.wc-steps.ro .wc-step-check{cursor:default}
.wc-steps.ro .wc-step-check:hover{border-color:var(--border-strong);color:var(--text-faint)}
.wc-steps.ro .wc-step.done .wc-step-check:hover{border-color:transparent;color:var(--success)}
.wc-step-body{flex:1;min-width:0}
.wc-step-title{font-size:calc(13.5px*var(--wc-fs,1));line-height:1.5;color:var(--text-muted);font-weight:500}
.wc-step.done .wc-step-title{text-decoration:line-through;text-decoration-color:var(--text-faint);color:var(--text-faint);font-weight:500}
.wc-steps.ro .wc-step.done .wc-step-title{text-decoration:none;color:var(--text-muted)}
.wc-step-when{display:inline-flex;align-items:center;gap:5px;font-size:calc(11px*var(--wc-fs,1));color:var(--text-muted);margin-top:8px;background:var(--surface-2);border:1px solid var(--border);padding:3px 9px;min-height:24px;border-radius:7px}
/* Source attribution chip: unobtrusive, white in-product look. The "Grounded in
   your documents" label never wraps; the source name takes the remaining width
   and ellipsizes, so the chip never overflows or scrolls sideways at any width. */
.wc-source{display:inline-flex;align-items:center;gap:6px;max-width:100%;margin-top:9px;padding:3px 9px;min-height:24px;font-size:calc(11px*var(--wc-fs,1));line-height:1.3;color:var(--text-muted);background:var(--surface-2);border:1px solid var(--border);border-radius:7px;box-sizing:border-box;vertical-align:middle}
.wc-source svg{flex:0 0 auto;color:var(--em)}
.wc-source-k{flex:0 0 auto;font-weight:650;white-space:nowrap}
.wc-source-src{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)}
.wc-source-src:before{content:'·';margin:0 6px 0 0;color:var(--text-faint)}
.wc-step-doneat{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--success);margin-top:6px;font-weight:600}
.wc-step-tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--text-faint);margin-top:6px;font-weight:600}
.wc-record-head{display:flex;align-items:center;gap:7px;padding:0 2px;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);font-variant-numeric:tabular-nums}
.wc-record-head svg{color:var(--success)}
.wc-done-toggle{display:flex;align-items:center;gap:7px;width:100%;background:transparent;border:1px dashed var(--border-strong);border-radius:11px;padding:9px 12px;font:inherit;font-size:12.5px;font-weight:600;color:var(--text-dim);cursor:pointer;transition:color .15s,border-color .15s,background .15s}
.wc-done-toggle:hover{color:var(--text);background:var(--surface);border-style:solid}
.wc-done-toggle .wc-dt-ok{color:var(--success)}

/* All-done confirmation + flags */
.wc-alldone{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--success-soft);border-radius:13px;color:var(--success);font-weight:650;font-size:13.5px;line-height:1.45}
.wc-alldone svg{flex-shrink:0}
/* Blue MS-docs inline hyperlink for "Open ..." actions (a link, not a button).
   Underlines on hover/focus; scales with the reader text size. */
.wc-open{display:inline-flex;align-items:center;gap:5px;margin-top:8px;color:var(--wc-link);font-size:calc(13px*var(--wc-fs,1));font-weight:600;text-decoration:none;text-decoration-color:transparent;text-underline-offset:3px;border-radius:4px;overflow-wrap:anywhere;transition:text-decoration-color .15s}
.wc-open:hover,.wc-open:focus-visible{text-decoration:underline;text-decoration-color:currentColor}
.wc-open svg{flex-shrink:0}
/* Reader text-size bar: a quiet right-aligned A- / A / A+ control that sits atop
   the guidance so the reader can set a comfortable size (MS-Learn style). */
.wc-readbar{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin:14px 0 2px}
.wc-readbar .wc-readbar-k{font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--text-dim)}
.wc-loading{display:flex;flex-direction:column;align-items:center;gap:20px;padding:44px 20px 40px}
.wc-loading-orb{position:relative;width:48px;height:48px}
.wc-loading-orb span{position:absolute;top:50%;left:50%;border-radius:50%;border:2px solid transparent;border-top-color:var(--brand-600);transform:translate(-50%,-50%);animation:wc-orb 1.1s linear infinite}
.wc-loading-orb span:nth-child(1){width:48px;height:48px}
.wc-loading-orb span:nth-child(2){width:34px;height:34px;opacity:.55;animation-duration:1.5s;animation-direction:reverse}
.wc-loading-orb span:nth-child(3){width:20px;height:20px;opacity:.3;animation-duration:.85s}
@keyframes wc-orb{to{transform:translate(-50%,-50%) rotate(360deg)}}
.wc-loading-phases{display:flex;flex-direction:column;gap:10px;width:100%;max-width:290px}
.wc-loading-line{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;color:var(--text);animation:wc-line-in .45s cubic-bezier(.2,.8,.2,1) both}
.wc-loading-line svg{flex-shrink:0}
.wc-loading-line.past{color:var(--text-dim);font-weight:400}
.wc-loading-line.past svg{color:var(--success)}
.wc-loading-line.on svg{color:var(--brand-600)}
@keyframes wc-line-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
/* Share-prompt state (M7): the first thing after hand-off, before any phase. */
.wc-share{gap:10px;text-align:center}
.wc-share-ic{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;color:var(--brand-600);background:var(--brand-soft);margin-bottom:6px}
.wc-share-t{font-size:17px;font-weight:700;color:var(--text);letter-spacing:-.01em}
.wc-share-s{font-size:14px;line-height:1.55;color:var(--text-muted);max-width:420px}
.wc-share-s b{color:var(--text)}
.wc-share-slow{display:flex;align-items:flex-start;gap:8px;margin-top:8px;max-width:440px;text-align:left;font-size:13px;line-height:1.5;color:var(--text);background:var(--warning-soft);border:1px solid var(--warning);border-radius:12px;padding:10px 12px}
.wc-share-slow svg{flex-shrink:0;margin-top:2px;color:var(--warning)}

/* Ask / analyse bar + answer */
.wc-ask{margin-top:0;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-sm);padding:8px 8px 8px 10px;transition:border-color .16s,box-shadow .16s}
.wc-ask:focus-within{border-color:var(--brand-500);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-ask .wc-ask-row{display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap}
.wc-ask-ta{flex:1;min-width:140px;resize:vertical;min-height:40px;max-height:220px;line-height:1.5;font-family:inherit;font-size:14px}
.wc-ask textarea.input{background:transparent;border-color:transparent;box-shadow:none;padding:9px 6px;height:auto}
.wc-ask textarea.input:focus{background:transparent;border-color:transparent;box-shadow:none}
.wc-ask input.input{flex:1;min-width:170px;height:38px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border)}
.wc-ask input.input:focus{border-color:var(--brand-500);background:var(--surface);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-ask .wc-ib{width:36px;height:36px}
.wc-ask .wc-tbtn{height:36px}
.wc-ask-k{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--brand-600)}

/* Pre-plan starter + session summary */
.wc-pre{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-md);padding:22px 22px 18px;overflow:hidden}
.wc-pre::after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(640px 200px at 100% 0%,var(--brand-soft),transparent 70%)}
.wc-pre>*{position:relative;z-index:1}
.wc-pre-title{font-family:var(--wc-display);font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px;letter-spacing:-.02em}
.wc-pre-sub{font-size:13px;color:var(--text-muted);margin-bottom:14px;line-height:1.5}
.wc-pre textarea.input{border-radius:12px;padding:12px 13px;font-size:15px;line-height:1.5;min-height:92px}
.wc-pre-help{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;color:var(--text-muted);margin-top:14px;line-height:1.5}
.wc-pre-help svg{color:var(--brand-600);flex-shrink:0;margin-top:2px}
.wc-pre-help b{color:var(--text);font-weight:650}
@media(max-width:640px){.wc-pre{padding:18px 16px 16px;border-radius:16px}.wc-pre-title{font-size:18px}}
.wc-sum{background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-sm);padding:18px 20px;margin-top:16px;line-height:1.6}
.wc-sum-title{display:inline-flex;align-items:center;gap:8px;font-family:var(--wc-display);font-weight:700;font-size:15px;letter-spacing:-.01em;margin-bottom:10px;color:var(--text)}
.wc-sum-title svg{color:var(--brand-600)}

/* MAKE: ONE calm surface that consolidates the three "produce something" actions
   (Answer / Write / Compute) behind a quiet tab row. Only the chosen panel opens,
   so a single primary action shows at a time instead of three stacked bars with
   three subtitles. No outer box: a top hairline and spacing group it, keeping the
   focus on the goal + current step above. Produced artifacts (ResultCard /
   ComposeCard / ComputeCard) stack below and stay visible after the panel closes. */
.wc .wc-sp{flex:1 1 auto;min-width:4px}
.wc-make{margin-top:20px;padding-top:16px;border-top:1px solid var(--border)}
.wc-make-kicker{font-family:var(--wc-display);font-size:11px;font-weight:700;letter-spacing:.02em;color:var(--text-muted);white-space:nowrap}
.wc-make-tabs{display:inline-flex;gap:3px;background:var(--surface-2);border-radius:12px;padding:3px}
.wc-make-tab{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;border:none;background:transparent;color:var(--text-muted);font:inherit;font-size:13px;font-weight:600;border-radius:9px;cursor:pointer;white-space:nowrap;transition:background .16s,color .16s,box-shadow .16s}
.wc-make-tab svg{color:currentColor;opacity:.85;flex-shrink:0}
.wc-make-tab:hover{color:var(--text)}
.wc-make-tab.on{background:var(--surface);color:var(--text);box-shadow:0 1px 2px rgba(0,0,0,.09),inset 0 0 0 1px var(--border)}
.wc-make-tab.on svg{opacity:1;color:var(--brand-600)}
.wc-make-panel{margin-top:14px;display:flex;flex-direction:column;gap:12px;animation:wc-make-in .2s ease both}
@keyframes wc-make-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
.wc-make-ctl{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.wc-made{margin-top:12px;display:flex;flex-direction:column;gap:10px}
@media(max-width:640px){
  .wc-make-tabs{flex:1 1 100%}
  .wc-make-tab{flex:1 1 auto;justify-content:center}
  .wc-make-ctl .wc-tbtn{flex:1 1 auto;justify-content:center}
  .wc-make-ctl .wc-compose-fmt{flex:1 1 100%}
  .wc-make-ctl .wc-compose-fmt select{flex:1 1 auto}
}
@media(prefers-reduced-motion:reduce){.wc-make-panel{animation:none}}

/* ANSWER panel field styles (inside the Make surface): the Steps/Result/Both
   scope segmented control, its lead line, and the optional paste-data field.
   The returned ResultCard is a light Option-C card (see ResultCard.jsx). */
.wc-result-lead{font-size:12.5px;color:var(--text-muted);line-height:1.4;min-width:0}
.wc-seg{display:inline-flex;flex:0 0 auto;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:2px;gap:2px}
.wc-seg button{border:none;background:transparent;color:var(--text-muted);font:inherit;font-size:12.5px;font-weight:600;height:28px;padding:0 11px;border-radius:8px;cursor:pointer;line-height:1;transition:background .15s,color .15s,box-shadow .15s}
.wc-seg button:hover{color:var(--text)}
.wc-seg button.on{color:var(--text);background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.1),inset 0 0 0 1px var(--border)}
.wc-result-paste{width:100%;resize:vertical;min-height:62px;background:var(--surface-2);border:1px solid var(--border);border-radius:11px;padding:10px 12px;color:var(--text);font:inherit;font-size:13.5px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wc-result-paste::placeholder{color:var(--text-faint)}
.wc-result-paste:focus{border-color:var(--brand-500);background:var(--surface);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-result-err{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--danger);line-height:1.45}
.wc-result-err svg{flex-shrink:0}
.wc-result-load{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--text-muted)}
@media(max-width:640px){.wc-result-lead{flex:1 1 100%;order:3}}

/* WRITE panel field styles (inside the Make surface): the "what to write" field,
   the format selector, and the optional paste-source field. The returned
   ComposeCard is a light Option-C card (see ComposeCard.jsx). */
.wc-compose-label{display:block;font-size:12px;font-weight:600;color:var(--text-muted);letter-spacing:.01em}
.wc-compose-want,.wc-compose-src{width:100%;resize:vertical;background:var(--surface-2);border:1px solid var(--border);border-radius:11px;padding:10px 12px;color:var(--text);font:inherit;font-size:14px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wc-compose-want{min-height:58px}
.wc-compose-src{min-height:62px}
.wc-compose-want::placeholder,.wc-compose-src::placeholder{color:var(--text-faint)}
.wc-compose-want:focus,.wc-compose-src:focus{border-color:var(--brand-500);background:var(--surface);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-compose-fmt{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;font-size:12px;font-weight:600;color:var(--text-muted)}
.wc-compose-fmt select{height:34px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;font-size:12.5px;font-weight:600;padding:0 30px 0 11px;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23889' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;transition:border-color .15s,box-shadow .15s,background-color .15s}
.wc-compose-fmt select:focus{border-color:var(--brand-500);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-compose-err{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--danger);line-height:1.45}
.wc-compose-err svg{flex-shrink:0}
.wc-compose-load{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--text-muted)}

/* COMPUTE panel field styles (inside the Make surface): the privacy line, the
   file drop / parsed preview (name, row count, typed-column chips), the "what to
   compute" field and status lines. The returned ComputeCard is a light Option-C
   card. Palette emerald #8cf5c4 / cyan #39d3ff / amber #f5c86b / ink #0a0d12. */
.wc-compute-privacy{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;line-height:1.5;font-weight:600;color:var(--brand-600);background:var(--em-soft);border:1px solid var(--em-ring);border-radius:12px;padding:10px 12px}
.wc-compute-privacy svg{flex-shrink:0;margin-top:1px;color:var(--brand-600)}
.wc-compute-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;min-height:104px;padding:16px;border-radius:13px;border:1.5px dashed var(--border);background:var(--surface-2);color:var(--text-muted);cursor:pointer;font:inherit;text-align:center;transition:border-color .16s,background .16s,color .16s}
.wc-compute-drop svg{color:var(--brand-600);margin-bottom:2px}
.wc-compute-drop:hover{border-color:var(--brand-500);background:var(--em-soft);color:var(--text)}
.wc-compute-drop-t{font-size:13.5px;font-weight:600;color:var(--text)}
.wc-compute-drop-s{font-size:12px;color:var(--text-faint)}
.wc-compute-file{border:1px solid var(--border);border-radius:13px;background:var(--surface-2);padding:11px 12px;display:flex;flex-direction:column;gap:10px}
.wc-compute-file-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.wc-compute-file-name{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wc-compute-file-name svg{flex-shrink:0;color:var(--brand-600)}
.wc-compute-file-meta{font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.wc-compute-change{margin-left:auto;flex:0 0 auto;background:var(--surface);border:1px solid var(--border);border-radius:8px;color:var(--brand-600);font:inherit;font-size:12px;font-weight:600;padding:5px 10px;cursor:pointer;transition:border-color .15s,background .15s}
.wc-compute-change:hover{border-color:var(--brand-500);background:var(--em-soft)}
.wc-compute-chips{display:flex;flex-wrap:wrap;gap:7px}
.wc-compute-chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;border:1px solid var(--border);background:var(--surface);border-radius:999px;padding:4px 10px;font-size:12px;line-height:1.3}
.wc-compute-chip b{font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wc-compute-chip i{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 6px;border-radius:999px}
.wc-compute-chip.t-number i{color:#0a7fa8;background:rgba(57,211,255,.16)}
.wc-compute-chip.t-date i{color:#8f5a07;background:rgba(245,200,107,.22)}
.wc-compute-chip.t-string i{color:#3d4650;background:rgba(10,13,18,.07)}
.wc-compute-label{display:block;font-size:12px;font-weight:600;color:var(--text-muted);letter-spacing:.01em}
.wc-compute-want{width:100%;resize:vertical;min-height:58px;background:var(--surface-2);border:1px solid var(--border);border-radius:11px;padding:10px 12px;color:var(--text);font:inherit;font-size:14px;line-height:1.5;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.wc-compute-want::placeholder{color:var(--text-faint)}
.wc-compute-want:focus{border-color:var(--brand-500);background:var(--surface);box-shadow:0 0 0 3px var(--brand-soft)}
.wc-compute-err{display:flex;align-items:flex-start;gap:7px;font-size:13px;color:var(--danger);line-height:1.45}
.wc-compute-err svg{flex-shrink:0;margin-top:1px}
.wc-compute-need{display:flex;align-items:flex-start;gap:9px;font-size:13px;line-height:1.5;color:var(--text);background:rgba(245,200,107,.14);border:1px solid rgba(245,200,107,.42);border-radius:11px;padding:10px 12px}
.wc-compute-need svg{flex-shrink:0;margin-top:1px;color:#8f5a07}
.wc-compute-need b{color:#8f5a07}
.wc-compute-load{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--text-muted)}
@media(prefers-reduced-motion:reduce){.wc-compute-drop{transition:none}}

@media(prefers-reduced-motion:reduce){.wc-live-pill .pulse{animation:none}}

/* Rolling-window progress line + quiet "View full plan" link (live guiding). */
.wc-plan-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 2px 2px}
.wc-plan-prog{font-size:11.5px;font-weight:600;color:var(--text-dim);font-variant-numeric:tabular-nums;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wc-plan-link{flex:0 0 auto;background:transparent;border:none;padding:2px 0;font:inherit;font-size:12px;font-weight:600;color:var(--wc-link);cursor:pointer;text-underline-offset:3px}
.wc-plan-link:hover{text-decoration:underline}
/* Read-only full-plan overlay: every step with a done/current/upcoming marker. */
.wc-plan-ov{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,7,14,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.wc-plan-card{width:min(600px,100%);max-height:86vh;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:0 24px 60px -24px rgba(0,0,0,.7);overflow:hidden}
.wc-plan-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)}
.wc-plan-title{font-size:15px;font-weight:700;font-family:var(--wc-display);color:var(--text)}
.wc-plan-goal{padding:12px 16px 0}
.wc-plan-goal-k{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--obs)}
.wc-plan-goal-t{margin-top:3px;font-size:13.5px;line-height:1.5;color:var(--text)}
.wc-plan-count{padding:8px 16px 4px;font-size:12px;font-weight:600;color:var(--text-muted);font-variant-numeric:tabular-nums}
.wc-plan-list{padding:4px 12px 14px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
.wc-plan-row{display:flex;flex-wrap:wrap;gap:11px;align-items:flex-start;padding:8px 10px;border-radius:10px}
/* The source chip drops to its own full-width line under the step, aligned past
   the badge, so the badge + text + Now tag stay on one clean row (no overflow). */
.wc-plan-row .wc-source{flex-basis:100%;margin:2px 0 0 34px}
.wc-plan-row.now{background:var(--em-soft)}
.wc-plan-row.done{opacity:.6}
.wc-plan-badge{flex:0 0 auto;width:23px;height:23px;border-radius:7px;display:grid;place-items:center;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--text-muted);border:1.5px solid var(--border)}
.wc-plan-row.now .wc-plan-badge{color:var(--on-em);background:var(--em);border-color:var(--em)}
.wc-plan-row.done .wc-plan-badge{color:var(--success);border-color:transparent;background:var(--success-soft)}
.wc-plan-txt{flex:1;min-width:0;font-size:13px;line-height:1.45;color:var(--text-muted);overflow-wrap:anywhere}
.wc-plan-row.now .wc-plan-txt{color:var(--text);font-weight:600}
.wc-plan-row.done .wc-plan-txt{text-decoration:line-through;color:var(--text-faint)}
.wc-plan-tag{flex:0 0 auto;align-self:center;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--em)}

/* ===================================================================
   Polished guidance additions (owner feedback round). Layout-only; the
   watch / step / meter / PiP engine is untouched.
   =================================================================== */
/* FIXED HEADER + FOOTER: the console is a full-height flex column. The
   toolbar is a pinned header, the Ask bar is a pinned footer, and only
   the step content between them scrolls, so the menu and the ask
   affordance are always reachable without scrolling. */
.wc-fixedhead{flex:0 0 auto;background:var(--bg);z-index:5}
.wc-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden}
.wc-fixedfoot{flex:0 0 auto;background:var(--bg);border-top:1px solid var(--border);box-shadow:0 -6px 18px -14px rgba(0,0,0,.4)}
.wc-shellw{max-width:820px;margin:0 auto;width:100%}
.wc-fixedhead .wc-shellw{padding:14px 16px 0}
.wc-scroll .wc-shellw{padding:2px 16px 26px}
.wc-fixedfoot .wc-shellw{padding:10px 16px 12px}
/* MAXIMIZED stage: at wide widths the scroll area becomes rails + a centered,
   boxed reading stage with a soft shadow; the header/footer shells widen to
   match. Below 1240px the rails hide (the Tools menu carries every control)
   and the stage is the plain column it always was. */
.wc-rail{display:none}
@media(min-width:1240px){
  .wc-fixedhead .wc-shellw,.wc-fixedfoot .wc-shellw{max-width:1380px}
  .wc-fixedfoot .wc-ask{max-width:880px;margin:0 auto}
  .wc-scroll .wc-shellw.wc-stagegrid{max-width:1380px;display:grid;grid-template-columns:236px minmax(0,1fr) 256px;gap:22px;align-items:start;padding-top:14px}
  .wc-stage{max-width:880px;width:100%;margin:0 auto;padding:4px 22px 22px;border-radius:22px;background:color-mix(in srgb,var(--surface) 72%,transparent);border:1px solid var(--border);box-shadow:var(--shadow-md),inset 0 1px 0 rgba(255,255,255,.04)}
  [data-theme='light'] .wc-stage{box-shadow:var(--shadow-md)}
  .wc-rail{display:flex;flex-direction:column;gap:12px;position:sticky;top:10px}
}
.wc-rail-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow-sm);padding:12px;display:flex;flex-direction:column;gap:8px}
.wc-rail-k{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint);padding:2px 2px 4px}
.wc-rail-k svg{color:var(--em)}
.wc-rail-n{margin-left:auto;font-weight:600;letter-spacing:0;text-transform:none;color:var(--text-muted);font-variant-numeric:tabular-nums}
.wc-rail-row{display:flex;justify-content:space-between;gap:6px}
.wc-rail-row .wc-nav-btn{flex:1;justify-content:center}
.wc-rail-btn{display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:9px 11px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .14s,border-color .14s}
.wc-rail-btn svg{color:var(--em);flex:0 0 auto}
.wc-rail-btn:hover:not(:disabled){background:var(--surface-3);border-color:var(--border-strong)}
.wc-rail-btn:disabled{opacity:.45;cursor:default}
.wc-rail-btn.quiet{color:var(--text-muted);background:transparent}
.wc-rail-btn.quiet:hover:not(:disabled){color:var(--danger);border-color:var(--danger)}
.wc-rail-status{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:0 0 2px}
.wc-rail-wide{width:100%;justify-content:center}
/* plan mini-map */
.wc-mm{display:flex;flex-direction:column;gap:2px;max-height:min(44vh,420px);overflow-y:auto;padding-right:2px}
.wc-mm-row{display:flex;align-items:flex-start;gap:9px;width:100%;text-align:left;padding:7px 8px;border-radius:9px;border:1px solid transparent;background:transparent;color:var(--text-muted);font:inherit;font-size:12.5px;line-height:1.4;cursor:pointer;transition:background .14s,border-color .14s}
.wc-mm-row:hover{background:var(--surface-2)}
.wc-mm-row.current{background:var(--em-soft);border-color:var(--em-ring);color:var(--text);font-weight:650}
.wc-mm-row.done{color:var(--text-faint)}
.wc-mm-row.done .wc-mm-t{text-decoration:line-through}
.wc-mm-badge{flex:0 0 auto;width:20px;height:20px;border-radius:6px;display:grid;place-items:center;font-size:10.5px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--text-muted);border:1.5px solid var(--border)}
.wc-mm-row.current .wc-mm-badge{color:var(--on-em);background:var(--em);border-color:var(--em)}
.wc-mm-row.done .wc-mm-badge{color:var(--success);border-color:transparent;background:var(--success-soft)}
.wc-mm-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}

/* #1 Header: product name + ONE calm status chip (Guiding / Paused). The
   watching state is implied by the chip, not by a separate toggle. */
.wc-brand{display:inline-flex;align-items:center;gap:8px;min-width:0;flex:0 0 auto}
.wc-brand-mark{width:25px;height:25px;border-radius:8px;flex:0 0 auto;display:grid;place-items:center;background:linear-gradient(135deg,var(--em),var(--em-2));color:var(--on-em);box-shadow:0 0 0 1px var(--em-ring) inset}
.wc-brand-name{font-family:var(--wc-display);font-weight:700;font-size:14.5px;letter-spacing:-.015em;color:var(--text);white-space:nowrap}
@media(max-width:520px){.wc-brand-name{display:none}}
.wc-statuschip{display:inline-flex;align-items:center;gap:6px;height:25px;padding:0 11px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;color:var(--em);background:var(--em-soft);border:1px solid var(--em-ring)}
.wc-statuschip .wc-sdot{width:6px;height:6px;border-radius:50%;background:var(--em);--pr:var(--em-ring)}
.wc-statuschip.live .wc-sdot{box-shadow:0 0 0 0 var(--pr);animation:wc-pulse 1.6s infinite}
.wc-statuschip.paused{color:var(--warning);background:var(--warning-soft);border-color:transparent}
.wc-statuschip.paused .wc-sdot{background:var(--warning);animation:none}

/* #2 Ongoing controls: a distinct Pause, and a highlighted, gently pulsing
   Resume. Replaces the big "Watch my screen / NOT WATCHING" toggle once a
   session is live (the first web screen-share grant keeps its own button). */
.wc-tbtn.pause{background:var(--surface-2);border-color:var(--border);color:var(--text)}
.wc-tbtn.pause svg{color:var(--warning)}
.wc-tbtn.pause:hover:not(:disabled){border-color:var(--warning);background:var(--warning-soft)}
.wc-tbtn.resume{background:linear-gradient(180deg,var(--brand-500),var(--brand-600));border-color:transparent;color:#fff;box-shadow:0 0 0 0 var(--em-ring);animation:wc-resume 1.8s ease-in-out infinite}
.wc-tbtn.resume svg{color:#fff}
.wc-tbtn.resume:hover:not(:disabled){filter:brightness(1.05)}
@keyframes wc-resume{0%,100%{box-shadow:0 0 0 0 var(--em-ring)}50%{box-shadow:0 0 0 6px transparent}}

/* #2 + #7 Wrong-place ALERT: shown ONLY on a real mismatch (status==='wrong').
   Amber, bold, with a restrained entry slide + a soft sustained glow so a
   critical "you are in the wrong place" moment reads as urgent, not flat. */

/* #5 Copy affordance for a command/target that is not a clickable link. */
.wc-copyrow{display:flex;align-items:center;gap:8px;margin-top:8px;padding:5px 7px 5px 11px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;max-width:100%}
.wc-copyrow-t{flex:1;min-width:0;font-family:var(--wc-mono);font-size:calc(12.5px*var(--wc-fs,1));color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wc-copybtn{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--border);background:var(--surface);color:var(--brand-600);font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s}
.wc-copybtn:hover{border-color:var(--brand-500);background:var(--brand-soft)}
.wc-copybtn.done{color:var(--success);border-color:transparent;background:var(--success-soft)}

/* The hero is the ONE current-step card: the quieter plan-step line (shown only
   when the live guidance differs from it), and the Mark done action row. */
/* Brief "Next" line under the progress bar: the one step after the current, as
   a single clamped title line. Never expanded, never the current step again. */

/* "Make something" opened as a SEPARATE deliverable sheet (on the shared fixed
   .wc-plan-ov backdrop), so it never reads as a second input stacked above the
   Ask footer. Elevated card, top accent, its own header + tag + close; the body
   scrolls. The inline .wc-make-panel inside it loses its outer top margin. */
.wc-make-sheet{width:min(680px,100%);max-height:88vh;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:0 28px 70px -28px rgba(0,0,0,.7),0 0 0 1px var(--em-ring) inset;overflow:hidden;position:relative;animation:wc-make-in .22s cubic-bezier(.2,.8,.2,1) both}
.wc-make-sheet::before{content:'';position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,var(--em),var(--em-2));z-index:1}
.wc-make-sheet-head{display:flex;align-items:center;gap:12px;padding:16px 16px 14px 18px;border-bottom:1px solid var(--border);flex-wrap:wrap}
.wc-make-sheet-ic{width:34px;height:34px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;background:var(--em-soft);color:var(--em)}
.wc-make-sheet-tt{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1 1 auto}
.wc-make-sheet-title{font-family:var(--wc-display);font-weight:700;font-size:16px;letter-spacing:-.015em;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wc-make-sheet-tag{display:inline-flex;align-items:center;gap:5px;align-self:flex-start;height:20px;padding:0 8px;border-radius:999px;font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--obs);background:var(--obs-soft);border:1px solid var(--obs-ring)}
.wc-make-sheet-tabs{flex:0 0 auto}
.wc-make-sheet-tabs .wc-make-tab{height:30px;padding:0 11px;font-size:12.5px}
.wc-make-sheet-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:4px 18px 18px}
.wc-make-sheet-body .wc-make-panel{margin-top:12px;animation:none}
@media(max-width:640px){.wc-make-sheet{max-height:92vh;border-radius:16px}.wc-make-sheet-head{padding:14px 12px 12px 14px}.wc-make-sheet-tabs{flex:1 1 100%;order:5}.wc-make-sheet-body{padding:2px 14px 14px}}
@media(prefers-reduced-motion:reduce){.wc-make-sheet{animation:none}}

/* Header TOOLS dropdown: one menu for every secondary control (Make something,
   screen reads, plan actions, view). Sectioned, two-line items, closes on Esc,
   outside click, or pick. Keeps the resting guide view down to essentials. */
.wc-menu{position:relative;flex:0 0 auto}
.wc-menu-pop{position:absolute;right:0;top:calc(100% + 6px);z-index:40;width:min(320px,calc(100vw - 32px));padding:6px;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:0 22px 56px -22px rgba(0,0,0,.6),0 0 0 1px var(--em-ring) inset;animation:wc-make-in .16s ease both}
.wc-menu-sec{padding:9px 10px 5px;font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--text-faint)}
.wc-menu-sec:not(:first-child){margin-top:2px;border-top:1px solid var(--border);padding-top:10px}
.wc-menu-item{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:8px 10px;border-radius:10px;border:none;background:transparent;color:var(--text);font:inherit;cursor:pointer;transition:background .14s}
.wc-menu-item:hover:not(:disabled){background:var(--surface-2)}
.wc-menu-item:disabled{opacity:.45;cursor:default}
.wc-menu-item>svg{flex:0 0 auto;color:var(--em)}
.wc-menu-item>span{display:flex;flex-direction:column;gap:1px;min-width:0}
.wc-menu-item b{font-size:13px;font-weight:650;line-height:1.3}
.wc-menu-item small{font-size:11.5px;color:var(--text-muted);line-height:1.35}
.wc-menu-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 10px 8px}
.wc-menu-row-k{font-size:12.5px;font-weight:600;color:var(--text-muted)}
/* "Ready" chips at rest: a deliverable exists; tap to reopen it in the modal. */
.wc-made-chips{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wc-made-chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:999px;border:1px solid var(--em-ring);background:var(--em-soft);color:var(--brand-600);font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s}
.wc-made-chip:hover{background:var(--brand-soft);border-color:var(--brand-500)}
.wc-made-chip svg{color:var(--brand-600)}
@media(prefers-reduced-motion:reduce){.wc-menu-pop{animation:none}}

/* ===== THE MAGIC: direct the eye to the exact next move ==================
   The current step is unmistakable: the hero remounts with a short entrance
   sweep when the step advances; the KEY ACTION inside it (the link to click,
   the command to run, the value to copy) carries an emerald highlight ring and
   a soft glow; emphasized words in the instruction get a real highlight; a
   "Step confirmed" check pops in the moment a step is confirmed on screen; the
   wrong-place icon pulses on entry. Reduced motion keeps every emphasis as a
   static strong ring and only removes the movement. */
@keyframes wc-chip-ring{0%,100%{box-shadow:0 0 0 0 var(--em-ring)}50%{box-shadow:0 0 0 5px transparent}}
/* key action emphasis inside the hero */
@keyframes wc-key-glow{0%,100%{box-shadow:0 0 0 1px var(--em-ring) inset,0 0 0 0 var(--em-ring)}50%{box-shadow:0 0 0 1px var(--em-ring) inset,0 0 0 4px transparent}}
/* emphasized words / values in the instruction */
/* step confirmed: a check that pops in, then fades */
.wc-confirm{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--success);background:var(--success-soft);box-shadow:0 0 0 1px var(--success) inset;animation:wc-pop .5s cubic-bezier(.3,1.4,.5,1) both,wc-fade-out .5s ease 1.3s both}
.wc-confirm svg{animation:wc-check-draw .45s ease .1s both}
@keyframes wc-pop{0%{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes wc-check-draw{from{transform:scale(0) rotate(-30deg)}to{transform:scale(1) rotate(0)}}
@keyframes wc-fade-out{to{opacity:0;transform:translateY(-4px)}}
/* wrong-place: the icon pulses three times on entry so it cannot be missed */
/* DARK = first-class: deeper, more luminous hero and key-action glow on dark */
[data-theme='dark'] .wc-make-sheet,[data-theme='dark'] .wc-menu-pop{box-shadow:0 28px 70px -28px rgba(0,0,0,.85),0 0 0 1px var(--em-ring) inset,inset 0 1px 0 rgba(255,255,255,.04)}
@media(prefers-reduced-motion:reduce){
  .wc-confirm,.wc-confirm svg{animation:none}
}

/* Ask bar in the fixed footer: the (optional) answer sits above the row with a
   capped, scrollable height so the footer never grows to swallow the screen. */

@media(prefers-reduced-motion:reduce){.wc-tbtn.resume{animation:none}.wc-statuschip.live .wc-sdot{animation:none}}

/* TASK-COMPLETE CELEBRATION: a calm success flourish above the done bar. A
   confetti layer (pure CSS, clipped to the card, fires once) + a prominent
   "Start another task". On-brand, white in-product aesthetic, never gaudy;
   honours prefers-reduced-motion (no motion, confetti hidden). */
.wc-celebrate{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;text-align:center;gap:11px;padding:26px 20px 22px;margin-bottom:12px;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow-sm);animation:wc-cele-in .45s cubic-bezier(.2,.8,.2,1) both}
.wc-cele-badge{position:relative;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);color:var(--success);flex-shrink:0}
.wc-cele-badge svg{position:relative;z-index:1;animation:wc-check-draw .5s ease .15s both}
.wc-cele-badge::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--success);opacity:0}
.wc-cele-go .wc-cele-badge::after{animation:wc-cele-ring 1.5s ease-out .1s}
.wc-cele-title{font-size:19px;font-weight:800;letter-spacing:-.01em;color:var(--text);line-height:1.2}
.wc-cele-sub{font-size:13.5px;line-height:1.5;color:var(--text-muted);max-width:430px;margin:-3px 0 3px}
.wc-cele-btn{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 20px;border:1px solid transparent;border-radius:11px;background:var(--brand-600);color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;box-shadow:0 2px 10px -3px var(--brand-600);transition:filter .15s,transform .08s}
.wc-cele-btn:hover{filter:brightness(1.06)}
.wc-cele-btn:active{transform:translateY(.5px)}
.wc-cele-btn svg{flex-shrink:0}
.wc-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.wc-confetti i{position:absolute;top:-14px;opacity:0;animation:wc-cfti var(--d,2.4s) cubic-bezier(.35,.55,.5,1) var(--delay,0s) forwards}
@keyframes wc-cfti{0%{opacity:0;transform:translate3d(0,-14px,0) rotate(0)}8%{opacity:.95}100%{opacity:0;transform:translate3d(var(--x,0),var(--fall,240px),0) rotate(var(--rot,560deg))}}
@keyframes wc-cele-in{from{opacity:0;transform:translateY(8px) scale(.99)}to{opacity:1;transform:none}}
@keyframes wc-cele-ring{0%{transform:scale(.6);opacity:.55}100%{transform:scale(1.55);opacity:0}}
@media(prefers-reduced-motion:reduce){.wc-celebrate{animation:none}.wc-confetti{display:none}.wc-cele-badge svg{animation:none}.wc-cele-badge::after{animation:none;opacity:0}}
`

// The copy helper (copyText), the step link-out (StepLink) and the terminal /
// code blocks (CmdBlock, CodeBlock) that used to be private here now live in
// src/components/CopyChip.jsx, src/components/StepBlocks.jsx and
// src/shared/links.js (hrefForUrl), shared with the public "try it live" widget
// so there is ONE renderer for a step's link / command / code. Same markup,
// same classes, same behaviour in the console and the floating panel.
// Source attribution indicator: a small, tasteful chip shown when the guide
// grounded this step or answer in the user's/organization's OWN material (an
// uploaded reference document, the Company Brain, or a skill/playbook). The guide
// fills the `source` field (named once, server-side, as work.WORK_SOURCE_FIELD =
// 'source') with a short human label like "Your document: Runbook v3" or
// "Company Brain: Onboarding SOP"; we read that same property here. Honest and
// defensive: renders NOTHING when there is no source (general knowledge, or an
// older session without the field), so it never claims grounding falsely.
function SourceChip({ source }) {
  const label = String(source || '').trim()
  if (!label) return null
  return (
    <div className="wc-source" title={`Grounded in your material: ${label}`}>
      <BookOpen size={11} strokeWidth={2.5} aria-hidden="true" />
      <span className="wc-source-k">Grounded in your documents</span>
      <span className="wc-source-src">{label}</span>
    </div>
  )
}
// A small "How?" control shown next to a step or the live guidance. Tapping it
// asks the server to break that one action into detailed sub-steps. It shows a
// spinner while it loads and flips to "Hide how" once the detail is open.
function HowButton({ open, loading, onClick }) {
  return (
    <button className="btn btn-ghost btn-sm" onClick={onClick} disabled={loading}
      title="Break this one action into detailed, copy-ready steps"
      style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
      {loading ? <Loader2 size={13} className="spin" /> : <HelpCircle size={13} />}
      {open ? 'Hide how' : 'How?'}
      {!loading && <ChevronRight size={12} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />}
    </button>
  )
}
// The expanded drill-down for one action: the detailed sub-steps rendered the
// same way the plan steps are (commands via CmdBlock, code via CodeBlock, link),
// visually nested under the parent with an indent and a left accent border so it
// reads as the detail of that one step. Also carries the loading, declined and
// could-not-load states so a How? expansion never silently fails or crashes.
function HowDetail({ entry, onRetry }) {
  if (!entry || !entry.open) return null
  const wrap = { marginTop: 10, marginLeft: 2, paddingLeft: 12, borderLeft: '2px solid var(--brand-500)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'calc(13.5px * var(--wc-fs, 1))', lineHeight: 1.5 }
  if (entry.loading) {
    return <div style={{ ...wrap, flexDirection: 'row', alignItems: 'center', gap: 7, color: 'var(--text-dim)', fontSize: 13 }}><Loader2 size={14} className="spin" /> Working out the detailed steps...</div>
  }
  if (entry.error) {
    return <div style={{ ...wrap, flexDirection: 'row', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-dim)' }}><span>Could not load the detailed steps, try again.</span><button className="btn btn-outline btn-sm" onClick={onRetry}>Try again</button></div>
  }
  if (entry.refusal) {
    return <div style={{ ...wrap, color: 'var(--text-dim)', fontSize: 13 }}>{entry.refusal}</div>
  }
  const sub = entry.steps || []
  if (!sub.length) return <div style={{ ...wrap, color: 'var(--text-dim)', fontSize: 13 }}>No extra detail was needed for this one.</div>
  return (
    <div style={wrap}>
      <div style={{ fontSize: 10.5, color: 'var(--text-dim)', letterSpacing: 0.3, fontWeight: 600 }}>HOW TO DO THIS</div>
      {sub.map((ss, j) => (
        <div key={j} style={{ ...card, padding: '9px 11px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-50, var(--surface))', border: '1px solid var(--brand-500)', color: 'var(--brand-600)', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{j + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>{ss.text}</div>
              {ss.url && <StepLink url={ss.url} />}
              {((ss.commands && ss.commands.length > 0) || (ss.code && ss.code.content)) && (
                <DestructiveGate why={ss.destructive ? ss.destructiveWhy : null}>
                  {ss.commands && ss.commands.length > 0 && <CmdBlock lines={ss.commands} />}
                  {ss.code && ss.code.content && <CodeBlock file={ss.code.file} content={ss.code.content} />}
                </DestructiveGate>
              )}
              {ss.validate && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}><Eye size={11} style={{ verticalAlign: -1 }} /> done when: {ss.validate}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Deliverables: capture page(s) -> review + two generation prompts + doc --
// Self-contained: it only uses the passed grabFrame and the sessionId, so it
// cannot destabilize the Console. For review/design tasks (architecture,
// diagrams, configs) the person snaps each page, then Finish builds the review
// and the prompts they take to their own LLM / diagram tool.
function DeliverablesPanel({ sessionId, grabFrame, videoRef, onClose }) {
  const [frames, setFrames] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState('')
  const [autoOn, setAutoOn] = useState(false)
  const autoRef = useRef({ prev: null, stable: 0, captured: null })
  // Auto-capture on settle: watch the shared screen and, when it stops changing
  // for ~1.2s on a NEW page, snap it. No click interception - pure change
  // detection (reuses signatureFromVideo/changed). Manual Snap still works.
  useEffect(() => {
    if (!autoOn || result) return
    autoRef.current.prev = null; autoRef.current.stable = 0
    const SETTLE = 3
    const h = setInterval(() => {
      const v = videoRef && videoRef.current
      const sig = v ? signatureFromVideo(v) : null
      if (!sig) return
      const st = autoRef.current
      if (st.prev && changed(st.prev, sig, 6)) { st.stable = 0; st.prev = sig; return }
      st.prev = sig; st.stable++
      if (st.stable === SETTLE && (!st.captured || changed(st.captured, sig, 10))) {
        const f = frameFromVideo(v)
        if (f) { setFrames((xs) => (xs.length >= 8 ? xs : [...xs, f])); st.captured = sig }
      }
    }, 400)
    return () => clearInterval(h)
  }, [autoOn, result])   // eslint-disable-line
  const snap = () => {
    setErr('')
    try { const f = grabFrame && grabFrame(); if (f) setFrames((xs) => [...xs, f].slice(0, 8)); else setErr('Put the page on screen first, and start sharing your screen.') }
    catch { setErr('Could not capture the screen.') }
  }
  const build = async () => {
    setBusy(true); setErr('')
    try { const r = await api.workDeliverables(sessionId, frames); if (r && r.deliverables) setResult(r); else setErr('No result came back. Try again.') }
    catch (e) { setErr(friendlyError(e, 'Could not build this. Try again.')) }
    finally { setBusy(false) }
  }
  const copy = async (which, text) => { try { await navigator.clipboard.writeText(text || ''); setCopied(which); setTimeout(() => setCopied(''), 1500) } catch { /* clipboard blocked */ } }
  const download = () => {
    try {
      const blob = new Blob([(result && result.documentMd) || ''], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'workcopilot-review.md'
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch { /* ignore */ }
  }
  const d = result && result.deliverables
  const Issue = ({ a }) => (
    <div className="wc-dl-issue"><span className={'sev ' + String(a.severity || '').toLowerCase()}>{a.severity}</span>
      <div><b>{a.issue}</b>{a.control ? <span className="ctrl">{a.control}</span> : null}<div className="fix">{a.fix}</div></div></div>
  )
  return (
    <div className="wc-dl" onClick={onClose}>
      <div className="wc-dl-card" onClick={(e) => e.stopPropagation()}>
        <div className="wc-dl-head"><b><Sparkles size={15} /> Review &amp; generation prompts</b><button className="wc-dl-x" onClick={onClose} aria-label="Close">&times;</button></div>
        {!d ? (
          <div className="wc-dl-body">
            <p className="wc-dl-lead">Put each page you want reviewed on screen and tap <b>Snap</b>. Add as many as you need, then <b>Finish</b>. I will find the issues and build you two prompts to generate the corrected design in your own tools.</p>
            <label className="wc-dl-auto"><input type="checkbox" checked={autoOn} onChange={(e) => setAutoOn(e.target.checked)} /> Auto-capture: snap each page as I settle on it</label>
            {autoOn && <div className="wc-dl-watch"><span className="dot" /> Watching the shared screen. Open each page and hold still a moment; I capture it, then you move to the next.</div>}
            <div className="wc-dl-thumbs">
              {frames.map((f, i) => <div key={i} className="wc-dl-thumb"><img src={f} alt={'page ' + (i + 1)} /><span>{i + 1}</span><button onClick={() => setFrames(frames.filter((_, j) => j !== i))} aria-label="Remove">&times;</button></div>)}
              {!frames.length && <div className="wc-dl-empty">No pages captured yet</div>}
            </div>
            {err && <div className="wc-dl-err">{err}</div>}
            <div className="wc-dl-actions">
              <button className="btn btn-outline" onClick={snap} disabled={busy}><Camera size={15} /> Snap{frames.length ? ' (' + frames.length + ')' : ''}</button>
              <button className="btn btn-primary" onClick={build} disabled={busy || !frames.length}>{busy ? <Loader2 size={15} className="spin" /> : null} Finish &amp; build</button>
            </div>
          </div>
        ) : (
          <div className="wc-dl-body">
            {d.needMore && <div className="wc-dl-note">{d.needMore}</div>}
            {d.summary && <p className="wc-dl-summary">{d.summary}</p>}
            {d.architecture && d.architecture.length > 0 && <div className="wc-dl-sec"><h4>Architecture issues</h4>{d.architecture.map((a, i) => <Issue key={i} a={a} />)}</div>}
            {d.security && d.security.length > 0 && <div className="wc-dl-sec"><h4>Security issues</h4>{d.security.map((a, i) => <Issue key={i} a={a} />)}</div>}
            <div className="wc-dl-prompt"><div className="ph"><b>Prompt 1: current design, problems marked</b><button className="btn btn-ghost btn-sm" onClick={() => copy('p1', d.promptIssues)}>{copied === 'p1' ? 'Copied' : 'Copy'}</button></div><pre>{d.promptIssues}</pre></div>
            <div className="wc-dl-prompt"><div className="ph"><b>Prompt 2: recommended corrected design</b><button className="btn btn-ghost btn-sm" onClick={() => copy('p2', d.promptTarget)}>{copied === 'p2' ? 'Copied' : 'Copy'}</button></div><pre>{d.promptTarget}</pre></div>
            <div className="wc-dl-actions">
              <button className="btn btn-outline" onClick={() => setResult(null)}>Capture more</button>
              <button className="btn btn-primary" onClick={async () => { try { await api.downloadFile(api.workDeliverablesPdfUrl(sessionId, true), `workcopilot-${sessionId}-review.pdf`) } catch (e) { setErr(friendlyError(e, 'Could not download the review PDF. Please try again.')) } }}><Download size={15} /> Download review PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// The share-prompt state (QA M7): shown INSTEAD of the planning phases while
// the browser's screen-share (or camera) prompt is open, so nothing claims
// progress before the person has actually shared. If the prompt has not
// resolved after a while (it can hide behind another window, or the picker
// was left open), the card says so and tells them what to do.
const SHARE_WAIT_HINT_MS = 20000
function SharePrompt({ source }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const id = setTimeout(() => setSlow(true), SHARE_WAIT_HINT_MS); return () => clearTimeout(id) }, [])
  const screen = source === 'screen'
  return (
    <div className="wc-loading wc-share" role="status" aria-live="polite">
      <div className="wc-share-ic">{screen ? <Monitor size={26} /> : <Camera size={26} />}</div>
      <div className="wc-share-t">{screen ? 'Share your screen to start' : 'Allow the camera to start'}</div>
      <div className="wc-share-s">
        {screen
          ? <>In the browser prompt, choose your <b>whole screen</b> (not just a tab) so WorkCoPilot can guide you through any app. Planning begins the moment you share.</>
          : <>Choose <b>Allow</b> in the browser prompt. Planning begins the moment the camera is on.</>}
      </div>
      {slow && (
        <div className="wc-share-slow" role="alert">
          <AlertTriangle size={14} />
          <span>Still waiting for the {screen ? 'share' : 'camera'} prompt. If you do not see it, look for a browser dialog behind this window. Cancelling it brings you back here, where <b>Plan the steps</b> asks again.</span>
        </div>
      )}
    </div>
  )
}

// The planning animation: phases reveal one by one while the plan is being
// built, then the Console swaps to the step view the moment steps arrive. It
// mounts only once the plan request is actually in flight (never while the
// share prompt is still open), so its ticks never run ahead of reality.
function PlanningLoader() {
  const PHASES = ['Understanding your goal', 'Thinking', 'Preparing the plan', 'Thinking deep', 'Working with multimodal vision', 'Writing your steps']
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n < PHASES.length - 1 ? n + 1 : n)), 1600)
    return () => clearInterval(id)
  }, [])   // eslint-disable-line
  return (
    <div className="wc-loading">
      <div className="wc-loading-orb"><span /><span /><span /></div>
      <div className="wc-loading-phases">
        {PHASES.slice(0, i + 1).map((p, k) => (
          <div key={k} className={`wc-loading-line${k === i ? ' on' : ' past'}`}>
            {k < i ? <Check size={14} /> : <Loader2 size={14} className="spin" />}<span>{p}…</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Console({ sessionId, watchLight = false, onBack, onGuard }) {
  const [sess, setSess] = useState(null)
  const [goal, setGoal] = useState('')
  const [source, setSource] = useState(() => isMobileUA() ? 'camera' : 'screen')     // 'screen' | 'camera' (phones default to camera: no screen share on mobile)
  const [capturing, setCapturing] = useState(false)
  const [sharePrompt, setSharePrompt] = useState(false)   // true while the browser's share / camera prompt is open (M7)
  const [watching, setWatching] = useState(false)
  const [status, setStatus] = useState('')
  const [observation, setObservation] = useState('')
  const [guidance, setGuidance] = useState('')      // live, screen-specific instruction for the current step
  const [clarify, setClarify] = useState(null)      // the plan's one essential question it cannot see on screen (or null)
  const [clarifyText, setClarifyText] = useState('') // bound answer when the question has no preset options to tap
  const [clarifyDone, setClarifyDone] = useState(null) // { question, answer } | { question, skipped } -> the confirmation strip with Change
  const lastClarifyRef = useRef(null)                // the last question object, so Change can re-open the SAME card
  const [flags, setFlags] = useState([])
  const [busy, setBusy] = useState(false)
  // True from the moment a screen frame is sent until the read comes back, so the
  // pinned status line can show a blinking "Analyzing" while the model looks, then
  // return to the calm "Reading your screen + what it saw" state (owner request).
  const [analyzing, setAnalyzing] = useState(false)
  const [question, setQuestion] = useState('')
  // Mid-task ASK flow (focused answer / stuck check-in), one state machine
  // shared with the floater (askFlow.js). Replaces the old `answer` string.
  const [askState, dispatchAsk] = useReducer(askReducer, initialAsk)
  const askBoxRef = useRef(null)
  const focusAskBox = () => { try { askBoxRef.current && askBoxRef.current.focus() } catch { /* ignore */ } }
  // Guidance strength (Easy / Medium / Technical / Executive), persisted per
  // session; every engine call from here on carries it as `level`.
  const { level, setLevel } = useGuideLevel(sessionId)
  const withLevel = (body) => ({ ...(body || {}), level })
  const [err, setErr] = useState('')
  const [frames, setFrames] = useState(0)            // how many frames actually sent (cost visibility)
  const [photoFrame, setPhotoFrame] = useState(null) // last one-shot camera Photo (mobile capture), a downscaled dataURL

  // "Deep pass" is a ONE-SHOT: run the current screenshot on the stronger model
  // once, weave the result back into the steps/guidance, then continue on the
  // fast model. It is never a persistent mode. The server also auto-escalates on
  // its own when the fast model fails or returns a weak result.
  const [strongUsed, setStrongUsed] = useState(false)   // a recent call used the stronger model (auto or a Deep pass)
  const [deliverOpen, setDeliverOpen] = useState(false) // the review -> prompts panel
  // "Result" feature: WorkCoPilot can RETURN the actual answer (a number, table,
  // draft, query or analysis), not only guide the next step. Scope only changes
  // whether the Result affordance is emphasized - the guiding flow always stays.
  const [scope, setScope] = useState('both')            // 'steps' | 'result' | 'both'
  const [pasteOpen, setPasteOpen] = useState(false)     // the small "paste data" field
  const [pasteData, setPasteData] = useState('')        // wired to docsText
  const [resultOut, setResultOut] = useState(null)      // the returned result object
  const [resultSec, setResultSec] = useState(null)      // security check (code results only)
  const [resultPol, setResultPol] = useState(null)      // company-policy check (armed-policy companies)
  const [resultBusy, setResultBusy] = useState(false)
  const [resultErr, setResultErr] = useState('')
  // "Compose" feature: WorkCoPilot can WRITE a full document (a letter, report,
  // resume section, clause, red-line notes, outline, table or code) ready to copy
  // or download. It sits beside the Result control and never acts for the user.
  const [composeOpen, setComposeOpen] = useState(false) // the small "write it for me" panel
  const [composeWant, setComposeWant] = useState('')    // what to write -> want
  const [composeFormat, setComposeFormat] = useState('') // '' = Auto (let it choose) | email|document|outline|bullets|table|code|notes
  const [composeSrcOpen, setComposeSrcOpen] = useState(false) // the optional "paste source" field
  const [composeSrc, setComposeSrc] = useState('')      // wired to docsText
  const [composeOut, setComposeOut] = useState(null)    // the returned compose object
  const [composeSec, setComposeSec] = useState(null)    // security check (code compositions only)
  const [composePol, setComposePol] = useState(null)    // company-policy check (armed-policy companies)
  const [composeBusy, setComposeBusy] = useState(false)
  const [composeErr, setComposeErr] = useState('')
  // "Compute from a file" feature: privacy-first, on-device data compute. The
  // attached CSV / Excel file is parsed ENTIRELY in the browser; only a schema
  // (column names + types) + the row count are sent to plan a safe computation,
  // which is re-validated and then run LOCALLY on the full rows. The raw rows
  // live only in computeRowsRef and NEVER enter any network call.
  const [computeOpen, setComputeOpen] = useState(false)   // the "compute from a file" panel
  const [computeFile, setComputeFile] = useState(null)    // parsed preview: { name, rowCount, schema }
  const [computeWant, setComputeWant] = useState('')      // what to compute -> want
  const [computeParsing, setComputeParsing] = useState(false) // reading the file on device
  const [computeBusy, setComputeBusy] = useState(false)   // planning call in flight
  const [computeErr, setComputeErr] = useState('')
  const [computeNeed, setComputeNeed] = useState('')      // engine said what is missing
  const [computeOut, setComputeOut] = useState(null)      // { result, explanation, caveat, spec }
  const computeRowsRef = useRef(null)                     // the FULL parsed rows, on device only
  const computeFileRef = useRef(null)                     // hidden file input
  const [endState, setEndState] = useState(null)        // null | 'finishing' | 'done' (End flow)
  const [replanOpen, setReplanOpen] = useState(false)   // Re-plan modal
  const [replanReason, setReplanReason] = useState('')
  const [replanScope, setReplanScope] = useState('here')  // 'here' (keep progress) | 'start'
  const [replanInfo, setReplanInfo] = useState(null)      // { unlimited, cap, used, remaining } per-task re-plan budget
  const [planOpen, setPlanOpen] = useState(false)       // read-only "full plan" overlay (all steps)
  // "Make" is the single consolidated surface for the three produce actions. One
  // of 'answer' | 'write' | 'compute' is open at a time (null = nothing open), so
  // only one primary action ever shows. Choosing a tab opens its panel and keeps
  // the older per-panel disclosure booleans (composeOpen / computeOpen) truthful.
  const [maker, setMaker] = useState(null)
  const pickMaker = (m) => {
    setMaker((cur) => {
      const next = cur === m ? null : m
      setComposeOpen(next === 'write'); setComputeOpen(next === 'compute')
      return next
    })
  }
  // The header "Tools" dropdown hosts every secondary control so the resting
  // guide view stays calm (current step + the one Ask bar + essentials). Esc
  // closes the menu and the open Make modal; a click outside closes the menu.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menuOpen && !maker) return
    const onKey = (e) => { if (e.key === 'Escape') { setMenuOpen(false); if (maker) pickMaker(maker) } }
    const onDown = (e) => { if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [menuOpen, maker])   // eslint-disable-line
  const fromMenu = (fn) => () => { setMenuOpen(false); fn() }
  const noteStrong = (r) => { if (r && r.escalated) { setStrongUsed(true); setTimeout(() => setStrongUsed(false), 5000) } }

  // Usage metering: plan hours left this month, the task slots in use, pause. The
  // copy comes from usageCopy.js (the shared plan model), never inline math.
  const [usage, setUsage] = useState(null)
  const [paused, setPaused] = useState(false)
  const [dismissedLow, setDismissedLow] = useState(false)
  const applyUsage = (u) => { setUsage(u); if (u && u.remainingSeconds > 900) setDismissedLow(false) }   // re-arm the warning after buying more
  const refreshUsage = useCallback(async () => { try { applyUsage(await api.workUsage()) } catch {} }, [])
  useEffect(() => { refreshUsage() }, [refreshUsage])
  const outOfMinutes = () => { if (usage && usage.exhausted) { setErr(usageOutOfTime(usage)); return true } return false }

  // Plan-heavy, watch-light: FORCED by us for Premium users (both company and
  // regular), never chosen here. The flag rides on the user profile loaded from
  // /api/work/me and arrives as the `watchLight` prop. When true, the session
  // does NOT run the continuous watch loop - the user follows a richer,
  // self-contained plan (made plan-heavy server-side) and taps Check my progress
  // for an on-demand read. There is no toggle and no upsell.

  // Guide style (mode): stepwise | beginner | architect | debug. The list comes
  // from the server so there is one source of truth.
  const [mode, setMode] = useState('stepwise')
  const [modes, setModes] = useState([])
  useEffect(() => { api.workModes().then((r) => setModes(r.modes || [])).catch(() => {}) }, [])
  // The console's type system (Bricolage Grotesque display, Figtree body,
  // JetBrains Mono code) is self-hosted and loaded globally in src/main.jsx.
  const changeMode = async (m) => { setMode(m); try { await api.workSetMode(sessionId, m) } catch {} }

  // Light/dark for the guiding panel (same global theme as the dashboard).
  const { theme: appTheme, toggle: toggleAppTheme } = useTheme()

  // Launch straight into guidance: once the session + goal are loaded and there
  // is no plan yet, plan automatically so the user lands on the step card, not a
  // second setup form. A resumed session already has steps, so we skip it.
  const autoPlannedRef = useRef(false)
  useEffect(() => {
    if (autoPlannedRef.current || !sess) return
    if (((sess.steps || []).length) > 0 || sess.status === 'ended') { autoPlannedRef.current = true; return }   // a finished session is never re-planned (it would ask to share a screen under "Task complete")
    if (!(goal && goal.trim())) return
    autoPlannedRef.current = true
    plan()   // defined below; the effect body runs after render
  }, [sess, goal])   // eslint-disable-line

  const [clickThrough, setClickThrough] = useState(false)
  const desktop = typeof window !== 'undefined' ? window.workDesktop : null
  const contextFileRef = useRef(null)   // hidden file input for mid-task attachments

  // Float overlay for WEB users (no install): the browser-native Document
  // Picture-in-Picture window floats the steps on top of whatever app the
  // user is working in, so they never tab back and forth to this console.
  const [pipWin, setPipWin] = useState(null)
  const [pipKind, setPipKind] = useState('pip')   // 'pip' (always-on-top Document PiP) | 'popout' (separate window) for the open float
  const [floatQ, setFloatQ] = useState('')
  const prefersDark = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true
  const [floatTheme, setFloatTheme] = useState(prefersDark ? 'dark' : 'light')
  // Chromium (Chrome/Edge/Brave/Opera) has Document Picture-in-Picture -> a true
  // always-on-top overlay. Firefox/Safari do not, so fall back to a pop-out
  // window (a separate, movable window, just not always-on-top). Hidden on
  // mobile (the app is full screen; a pop-up there makes no sense).
  const isMobile = isMobileUA()
  const pipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window
  const floatCapable = !desktop && !isMobile && typeof window !== 'undefined' && typeof window.open === 'function'
  // Microsoft-Learn / Docs reading treatment, same as the console + full guide:
  // a compact 13.5px base that scales off --fp-fs (the reader's A- / A / A+
  // choice, shared via the wc-guide-fontscale key). --wc-fs mirrors it so the
  // shared CmdBlock / CodeBlock dark code boxes scale inside the float too.
  // .fp-link is the blue inline "Open ..." hyperlink (not a button).
  const FLOAT_CSS = ':root{--fp-fs:1;--wc-fs:1}body{margin:0;font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI Variable Text","Segoe UI","Inter",system-ui,Roboto,sans-serif;font-size:calc(13.5px*var(--fp-fs,1));line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}*{box-sizing:border-box}button{font:inherit;cursor:pointer}.fp-link{text-decoration:none;text-decoration-color:transparent;text-underline-offset:3px;border-radius:4px;transition:text-decoration-color .15s}.fp-link:hover,.fp-link:focus-visible{text-decoration:underline;text-decoration-color:currentColor}.fp-clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}button:disabled{opacity:.5;cursor:default}input{font:inherit}input::placeholder{opacity:.6}input:focus{outline:none}button:not(:disabled):hover{filter:brightness(1.06)}button:not(:disabled):active{transform:translateY(.5px)}.fp-btn{transition:filter .15s,background .15s,border-color .15s,color .15s,box-shadow .15s,transform .08s}@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin 1s linear infinite}@keyframes fp-pulse{0%{box-shadow:0 0 0 0 rgba(140,245,196,.5)}70%{box-shadow:0 0 0 6px rgba(140,245,196,0)}100%{box-shadow:0 0 0 0 rgba(140,245,196,0)}}.fp-pulse{animation:fp-pulse 1.6s infinite}@keyframes fp-blink{0%,100%{opacity:1}50%{opacity:.55}}.fp-blink{animation:fp-blink 1.2s ease-in-out infinite}.fp-ana{display:inline-flex;align-items:center;gap:3px}.fp-ana i{display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;animation:fp-bounce 1.1s infinite}.fp-ana i:nth-child(2){animation-delay:.15s}.fp-ana i:nth-child(3){animation-delay:.3s}@keyframes fp-bounce{0%,80%,100%{transform:scale(.55);opacity:.5}40%{transform:scale(1);opacity:1}}@keyframes fp-rise{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}.fp-rise{animation:fp-rise .22s cubic-bezier(.4,0,.2,1)}@keyframes fp-now{0%,100%{box-shadow:0 0 0 1px var(--gr) inset,0 10px 30px -16px var(--gg)}50%{box-shadow:0 0 0 1px var(--gr) inset,0 12px 44px -10px var(--gg)}}.fp-now{animation:fp-in .4s cubic-bezier(.2,.8,.2,1) both,fp-now 2.8s ease-in-out .4s infinite}@keyframes fp-in{0%{opacity:0;transform:translateY(8px) scale(.985)}100%{opacity:1;transform:none}}.fp-now pre{box-shadow:0 0 0 1px var(--gr) inset,0 0 22px -8px #8cf5c4}.fp-now .fp-link{display:inline-flex;padding:4px 10px 4px 8px;border-radius:9px;background:rgba(57,211,255,.12);box-shadow:0 0 0 1px rgba(57,211,255,.32) inset;font-weight:700;animation:fp-key .2s}.fp-now strong,.fp-now b{font-weight:800}.fp-confirm{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;animation:fp-pop .5s cubic-bezier(.3,1.4,.5,1) both,fp-out .5s ease 1.3s both}@keyframes fp-pop{0%{opacity:0;transform:scale(.6)}60%{opacity:1;transform:scale(1.08)}100%{transform:scale(1)}}@keyframes fp-out{to{opacity:0;transform:translateY(-4px)}}@keyframes fp-cfti{0%{opacity:0;transform:translate3d(0,-12px,0) rotate(0)}8%{opacity:.95}100%{opacity:0;transform:translate3d(var(--x,0),var(--fall,210px),0) rotate(var(--rot,540deg))}}@keyframes fp-cele-ring{0%{transform:scale(.6);opacity:.55}100%{transform:scale(1.5);opacity:0}}.fp-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}.fp-confetti i{position:absolute;top:-12px;opacity:0;animation:fp-cfti var(--d,2.3s) cubic-bezier(.35,.55,.5,1) var(--delay,0s) forwards}.fp-cele-ring{animation:fp-cele-ring 1.5s ease-out .1s}@media(prefers-reduced-motion:reduce){.fp-now{animation:none;box-shadow:0 0 0 2px var(--gr) inset}.fp-pulse{animation:none}.spin{animation:none}.fp-confirm{animation:none}.fp-blink{animation:none}.fp-ana i{animation:none}.fp-confetti{display:none}.fp-cele-ring{animation:none;opacity:0}}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#8883;border-radius:8px;border:2px solid transparent;background-clip:padding-box}::-webkit-scrollbar-thumb:hover{background:#8886;background-clip:padding-box}'
  // Open the float with a graceful fallback chain, so the core web experience
  // never silently dies on one API:
  //   1. Document Picture-in-Picture (true always-on-top) when the browser has it;
  //   2. if that is refused (permissions policy, enterprise setting, no user
  //      activation, an older Chromium build that exposes the API but rejects),
  //      a separate pop-out window, which still keeps the steps out of the tab;
  //   3. if the pop-up itself is blocked, an actionable message. The steps are
  //      still fully usable in this tab in every case.
  const openFloat = async () => {
    setErr('')
    let w = null
    let kind = 'pip'
    // Open as a tall, narrow side strip: ~18% of the screen width (clamped to a
    // readable 320-460px) and nearly full height, so it guides alongside the
    // real work instead of covering it. The user can resize it afterward.
    const scr = (typeof window !== 'undefined' && window.screen) || {}
    const availW = scr.availWidth || window.innerWidth || 1280
    const availH = scr.availHeight || window.innerHeight || 800
    const floatW = Math.min(460, Math.max(320, Math.round(availW * 0.18)))
    const floatH = Math.round(availH * 0.92)
    if (pipSupported) {
      try { w = await window.documentPictureInPicture.requestWindow({ width: floatW, height: floatH }) }
      catch { w = null }
    }
    if (!w) {
      kind = 'popout'
      try { w = window.open('', 'workcopilot_float', `width=${floatW},height=${floatH},left=${Math.max(0, availW - floatW - 24)},top=8,menubar=no,toolbar=no,location=no,status=no,resizable=yes`) } catch { w = null }
      if (!w) {
        setErr(pipSupported
          ? 'The floating window was refused by your browser settings, and the pop-out was blocked too. Allow pop-ups for this site, or keep following the steps right here.'
          : 'Your browser blocked the floating window. Allow pop-ups for this site, or use Chrome, Edge, Brave or Opera for a true always-on-top overlay. The steps keep working right here.')
        return
      }
      try { w.document.title = 'WorkCoPilot' } catch {}
      // Ensure the Picture-in-Picture window has a <body> without document.write
      // (no injection sink; the title is set above). Build it with the DOM API.
      try { if (!w.document.body && w.document.documentElement) w.document.documentElement.appendChild(w.document.createElement('body')) } catch {}
    }
    // The PiP window is a separate document and inherits none of the app's web
    // fonts; no Google Fonts link is injected (fonts are self-hosted in the main
    // app). The inline font stack falls back to a clean system font, so the
    // floating panel text is always legible.
    try {
      const st = w.document.createElement('style')
      st.textContent = FLOAT_CSS + GUIDE_CSS
      ;(w.document.head || w.document.documentElement).appendChild(st)
    } catch { /* the panel is inline-styled; only the keyframes are lost */ }
    // Only the window that is still current may clear the state, so a late
    // 'pagehide' from an older float can never orphan a newer one.
    const drop = () => setPipWin((cur) => (cur === w ? null : cur))
    try { w.addEventListener('pagehide', drop); w.addEventListener('beforeunload', drop) } catch {}
    setPipKind(kind)
    setPipWin(w)
  }
  const closeFloat = () => { try { pipWin && pipWin.close() } catch {} ; setPipWin(null) }

  // Full-screen guidance on a SECOND monitor: a clean, detailed, read-only view at
  // /work/guide. On the desktop app the shell opens it full-screen on the monitor
  // you are NOT working on. On the web it opens a large window - placed on another
  // screen automatically when the browser's Window Management API allows, otherwise
  // a big window you drag over and set full screen from inside it.
  const [guideWin, setGuideWin] = useState(null)
  const openFullGuide = async () => {
    setErr('')
    if (desktop && typeof desktop.openFullGuide === 'function') { try { await desktop.openFullGuide(); return } catch { /* fall back to a web window */ } }
    // Focus an already-open guide window instead of stacking another.
    if (guideWin && !guideWin.closed) { try { guideWin.focus(); return } catch { /* reopen */ } }
    let target = null
    try {
      if (window.getScreenDetails) { const sd = await window.getScreenDetails(); const screens = sd.screens || []; target = screens.find((s) => !s.isPrimary) || null }
    } catch { /* permission denied or unsupported - fall back to a draggable window */ }
    const sc = (typeof window !== 'undefined' && window.screen) || {}
    const feats = target
      ? `left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
      : `width=${Math.round(sc.availWidth || 1280)},height=${Math.round(sc.availHeight || 800)},left=0,top=0,menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    let w = null
    try { w = window.open('/work/guide', 'workcopilot_fullguide', feats) } catch { w = null }
    if (!w) { setErr('Your browser blocked the guidance window. Allow pop-ups for this site, then open it again.'); return }
    try { w.focus() } catch {}
    if (target) { try { w.addEventListener('load', () => { try { w.document.documentElement.requestFullscreen({ screen: target }) } catch { /* the page has its own Full screen button */ } }) } catch {} }
    setGuideWin(w)
  }
  useEffect(() => () => { try { guideWin && !guideWin.closed && guideWin.close() } catch {} }, [guideWin])   // close the guide if the console unmounts
  const floatIsPip = pipKind === 'pip'
  useEffect(() => () => { try { pipWin && pipWin.close() } catch {} }, [pipWin])   // close the float if the console unmounts
  // Paint the PiP window body to match the chosen theme (the panel content is
  // inline-styled; the body behind it needs setting on the separate document).
  useEffect(() => {
    if (!pipWin) return
    try { pipWin.document.body.style.background = floatTheme === 'light' ? '#f4f6fb' : '#0b0b12'; pipWin.document.body.style.color = floatTheme === 'light' ? '#1a1a22' : '#e8e8f2' } catch {}
  }, [pipWin, floatTheme])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const sigRef = useRef(null)
  const timerRef = useRef(null)
  const lastSentRef = useRef(0)
  const busyTickRef = useRef(false)
  const pendingRef = useRef(false)     // a change is waiting for the screen to settle before we read it
  const lastChangeRef = useRef(0)      // when the screen last changed (for the settle delay)
  const photoInputRef = useRef(null)    // hidden camera file input for the mobile Photo path
  const photoFrameRef = useRef(null)    // mirror of photoFrame for synchronous reads in grabFrame

  // Session load state. Before this, a session that could not be loaded (deleted
  // on another device, server restarted with fresh data, a stale id remembered in
  // sessionStorage after a reload) left the Console with sess === null forever:
  // no Back button (it only shows when paused or ended), no Pause, and a goal
  // form whose Plan button could not work. The only exit was closing the app.
  // Now: a loading state while we fetch, and on failure a clear message with
  // Try again and Back to plans.
  const [loadErr, setLoadErr] = useState('')
  const refresh = useCallback(async () => {
    try {
      const r = await api.workGet(sessionId)
      setSess(r.session); setLoadErr('')
      if (r.replan) setReplanInfo(r.replan)   // per-task re-plan budget left
      if (r.session && r.session.goal != null) setGoal(r.session.goal || '')
      if (r.session && r.session.guidance) setGuidance(r.session.guidance)
      if (r.session && r.session.observation) setObservation(r.session.observation)
      if (r.session && r.session.flag) setFlags([{ t: Date.now(), text: r.session.flag }])
      if (r.session && r.session.mode) setMode(r.session.mode)
      if (r.session) setPaused(!!r.session.paused)
    } catch (e) {
      setLoadErr(e && e.status === 404
        ? 'This session no longer exists. It may have been deleted, or finished on another device.'
        : ((e && e.message) || 'Could not load this session. Check your connection and try again.'))
    }
  }, [sessionId])
  useEffect(() => { refresh() }, [refresh])
  // A UI-side guard for the two calls that drive a full-screen "working" state
  // (planning, finishing). The server keeps working if it is slow; the UI just
  // stops waiting after a generous bound, says so, and re-reads the session so
  // whatever did land is picked up. Without this a dropped connection could
  // leave the planning animation or the "Wrapping up" dialog spinning forever.
  const WAIT_MS = 240000
  const waitFor = (p, message) => {
    let t
    const timer = new Promise((_, reject) => { t = setTimeout(() => { const e = new Error(message); e.timedOut = true; reject(e) }, WAIT_MS) })
    return Promise.race([p, timer]).finally(() => clearTimeout(t))
  }

  const stopCapture = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (streamRef.current) { try { streamRef.current.getTracks().forEach((t) => t.stop()) } catch {} ; streamRef.current = null }
    setWatching(false); setCapturing(false)
  }, [])
  useEffect(() => () => stopCapture(), [stopCapture])   // cleanup on unmount

  const startCapture = async () => {
    setErr('')
    // ONE screen share, reused. If a live stream already exists (the plan-time
    // grab acquired it), reuse it for guiding instead of prompting again. The
    // old double prompt came from startWatching() reading a STALE `capturing`
    // closure right after plan() and calling startCapture() a second time; the
    // ref-based check here is closure-proof. When the user ends the share from
    // the browser chrome, track.onended -> stopCapture() clears streamRef, so
    // only then does the next start re-prompt.
    try {
      const live = streamRef.current
      const track = live && live.getVideoTracks ? live.getVideoTracks()[0] : null
      if (track && track.readyState === 'live') {
        if (videoRef.current && videoRef.current.srcObject !== live) { videoRef.current.srcObject = live; await videoRef.current.play().catch(() => {}) }
        setCapturing(true)
        return true
      }
    } catch { /* fall through and acquire a fresh stream */ }
    // When data protection is on, warm the on-device OCR engine now so the first
    // frame can be redacted without a cold-load delay.
    if (isDlpActive()) warmFrameScrub()
    try {
      // The prompt is open from here until the promise settles; the console
      // shows "Share your screen to start" (not the planning phases) meanwhile.
      setSharePrompt(true)
      let stream
      try {
        stream = source === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 1 }, audio: false })
          : await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      } finally { setSharePrompt(false) }
      streamRef.current = stream
      // The user stopping the share from the browser chrome ends capture cleanly.
      stream.getVideoTracks().forEach((t) => { t.onended = () => stopCapture() })
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}) }
      photoFrameRef.current = null; setPhotoFrame(null)   // a live stream supersedes a one-shot photo
      setCapturing(true)
      return true
    } catch (e) { setErr(friendlyError(e, 'Could not start capture. Allow screen or camera access.')); return false }
  }

  // Desktop multi-monitor: when the watched monitor is switched (the picker or
  // Ctrl+Shift+Alt+M in the shell), restart screen capture so the new monitor is read
  // right away instead of only on the next capture. The ref always holds the
  // current closure, so the one-time subscription sees the latest state.
  const restartScreenRef = useRef(() => {})
  restartScreenRef.current = () => {
    if (capturing && source === 'screen') { stopCapture(); setTimeout(() => { startCapture() }, 150) }
  }
  useEffect(() => {
    if (!desktop || typeof desktop.onMonitorChanged !== 'function') return
    try { desktop.onMonitorChanged(() => { try { restartScreenRef.current() } catch {} }) } catch {}
  }, [desktop])

  // Prefer a one-shot Photo (mobile) when one is loaded and no live stream is
  // running; otherwise read the live video (screen or camera). Desktop never
  // loads a photo frame, so its behavior is unchanged.
  const grabFrame = () => (photoFrameRef.current && !capturing) ? photoFrameRef.current : frameFromVideo(videoRef.current)
  // Smaller frame for the high-frequency watch loop (cost lever); photo path keeps its own.
  const grabWatchFrame = () => (photoFrameRef.current && !capturing) ? photoFrameRef.current : frameFromVideo(videoRef.current, WATCH_MAX_W)
  // Redact the outbound screen frame ON-DEVICE when data protection is on, so the
  // image is scrubbed of sensitive text (via on-device OCR) BEFORE it is sent,
  // the same switch that governs text. A no-op when protection is off.
  const prepFrame = async (f) => (f && isDlpActive()) ? await redactFrame(f) : f

  // Mobile capture = "Photo": open the device camera through a file input (the
  // dependency-free path that works where getDisplayMedia does not), downscale
  // the chosen image to the same budget as a live frame, and feed it into the
  // same plan / ask / analyze flow through grabFrame.
  const takePhoto = () => { setErr(''); try { if (photoInputRef.current) { photoInputRef.current.value = ''; photoInputRef.current.click() } } catch {} }
  const onPhotoPicked = async (e) => {
    const file = e && e.target && e.target.files && e.target.files[0]
    if (!file) return
    stopCapture()   // a snapshot and a live stream are mutually exclusive; the photo wins
    try { const f = await frameFromImageFile(file); photoFrameRef.current = f; setPhotoFrame(f) }
    catch { setErr('Could not read that photo. Try again.') }
  }
  const clearPhoto = () => { photoFrameRef.current = null; setPhotoFrame(null) }

  const plan = async (opts) => {
    // opts: { reason, keepProgress } from the Re-plan modal. onClick passes an
    // event, so only read opts when it is a plain options object.
    const o = (opts && typeof opts === 'object' && !opts.nativeEvent && !opts.target) ? opts : {}
    if (outOfMinutes()) return
    setBusy(true); setErr('')
    setClarify(null); setClarifyText('')   // drop a stale clarify card the moment a fresh plan starts
    if (!o.fromClarify) setClarifyDone(null)   // a fresh plan moves on; the answer-strip survives only its own re-plan
    try {
      let frame = null
      if (!capturing && !photoFrameRef.current) { const okCap = await startCapture(); if (!okCap) { setBusy(false); return } await new Promise((r) => setTimeout(r, 400)) }
      frame = await prepFrame(grabFrame())
      // Desktop on-device docs: governed text held client-side for this session,
      // injected into the plan for this call only (never stored on the server).
      let docsText = ''
      try { if (window.workDesktop) docsText = sessionStorage.getItem('wd_docs_' + sessionId) || '' } catch { /* ignore */ }
      const r = await waitFor(
        api.workPlan(sessionId, { goal: goal.trim(), frame, mode, level, ...(docsText ? { docsText } : {}), ...(o.reason ? { reason: o.reason } : {}), ...(o.keepProgress ? { keepProgress: true } : {}), ...(o.fromClarify ? { fromClarify: true } : {}) }),
        'Planning is taking longer than expected. Press Plan the steps to try again.')
      noteStrong(r); setSess(r.session); setGuidance(''); setHowTo({})
      // Company-policy findings on the plan surface immediately as cited flags, so
      // the person sees which company rule a step breaks and the compliant fix.
      if (r.policy && Array.isArray(r.policy.findings) && r.policy.findings.length) {
        setFlags(r.policy.findings.slice(0, 4).map((f, i) => ({
          t: Date.now() + i,
          text: `Company policy, ${f.kind === 'forbid' ? 'prohibited' : 'required'}: ${f.title}${f.doc ? ` (per ${f.doc}${f.section ? `, ${f.section}` : ''})` : ''}${f.guidance ? `. ${f.guidance}` : ''}`,
        })))
      }
      // The plan needs one essential input it cannot read off the screen (a
      // jurisdiction, which software, a choice). Show the card; most plans return
      // null, so nothing shows then. Cleared at the top of the next plan().
      setClarify(r.clarify || null); setClarifyText('')
      if (r.clarify) setClarifyDone(null)   // a new question replaces the previous answer-strip
      if (r.replan) setReplanInfo(r.replan)   // per-task re-plan budget left
      // Input guardrail: a MEDIUM attempt is allowed through with a warning. Inform, never block.
      if (r.guard && !r.guard.blocked && r.guard.warning && onGuard) onGuard(r.guard)
      if (r.refusal) { setErr(r.refusal); return }   // declined at goal entry (not supported)
      // Start the continuous guide right away - the user should never have to
      // find and press a button to make it watch and update the instructions.
      if (r.session && Array.isArray(r.session.steps) && r.session.steps.length && (!r.session.status || r.session.status !== 'ended')) {
        setTimeout(() => { startWatching() }, 150)
      }
    } catch (e) {
      setErr(friendlyError(e, 'Could not build the plan'))
      if (e && e.timedOut) refresh()   // pick up a plan that landed after we stopped waiting
    } finally { setBusy(false) }
  }

  // The user answered the plan's one clarifying question. Store the answer (the
  // server folds it into the session scope), drop the card, then re-plan through
  // the SAME plan() path so the frame grab and watch wiring are unchanged. The
  // fromClarify flag tells the server this re-plan is free, so asking never costs
  // the person a re-plan from their per-task budget.
  const submitClarify = async (answer) => {
    const a = String(answer || '').trim()
    if (!a || !clarify || busy) return
    setBusy(true); setErr('')
    try {
      await api.workClarify(sessionId, { question: clarify.question, answer: a })
      lastClarifyRef.current = clarify
      setClarifyDone({ question: clarify.question, answer: a })   // "You chose: X." strip with Change
      setClarify(null); setClarifyText('')
      setBusy(false)
      await plan({ fromClarify: true })
    } catch (e) {
      setErr(friendlyError(e, 'Could not save your answer'))
      setBusy(false)
    }
  }

  // Change / Answer it: a mis-tap or an accidental skip costs nothing. Revert the
  // last answer on the server, then re-open the SAME card (same question and
  // options) so the person picks again. No re-plan here; re-answering goes
  // through submitClarify, which folds the corrected answer and re-plans for free.
  const undoClarify = async () => {
    const last = lastClarifyRef.current
    if (!last || !clarifyDone || busy) return
    setBusy(true); setErr('')
    try {
      await api.workClarifyUndo(sessionId, { question: last.question })
      setClarifyDone(null); setClarifyText('')
      setClarify(last)
    } catch (e) {
      setErr(friendlyError(e, 'Could not change the answer'))
    } finally { setBusy(false) }
  }

  // Skip: the person is unsure, or none of the shortlist fits and they would
  // rather not guess. The chips are only a best-guess shortlist read off the
  // screen, so a question is never a forced choice. Record the skip and the
  // server proceeds on its best safe assumption. The guide keeps its current
  // steps, so there is NO re-plan here: just dismiss the card.
  const skipClarify = async () => {
    if (!clarify || busy) return
    setBusy(true); setErr('')
    try {
      await api.workClarify(sessionId, { question: clarify.question, skipped: true })
      lastClarifyRef.current = clarify
      setClarifyDone({ question: clarify.question, skipped: true })   // "Skipped." strip with Answer it
      setClarify(null); setClarifyText('')
    } catch (e) {
      setErr(friendlyError(e, 'Could not skip the question'))
    } finally { setBusy(false) }
  }

  // The watch loop: SMART sending to keep cost (and quality) right. We do NOT read
  // the screen mid-action. A change ARMS a pending read; we send ONE frame only
  // once the screen has SETTLED (a tick with no further change), so a burst of
  // changes while someone is working collapses into a single read at the landed
  // state - fewer calls AND a cleaner read. A long run of continuous change
  // force-sends so we never go blind, and a slow heartbeat catches the rare subtle
  // change the coarse signature missed. An idle screen costs nothing.
  const tick = useCallback(async () => {
    if (busyTickRef.current || !videoRef.current) return
    const sig = signatureFromVideo(videoRef.current)
    const now = Date.now()
    const isChange = changed(sigRef.current, sig)
    sigRef.current = sig
    if (isChange) {
      pendingRef.current = true
      lastChangeRef.current = now
      // still moving and not overdue -> wait for it to settle before reading
      if (now - lastSentRef.current < 15000) return
      // overdue (>15s of continuous change) -> fall through and read now
    } else {
      const settled = pendingRef.current && (now - lastChangeRef.current >= 1500)
      const heartbeat = now - lastSentRef.current > 60000
      if (!settled && !heartbeat) return
    }
    pendingRef.current = false
    let frame = grabWatchFrame(); if (!frame) return
    frame = await prepFrame(frame)
    busyTickRef.current = true
    setAnalyzing(true)
    // Jitter: smear concurrent users' sends across a ~600ms window so many
    // sessions do not hit the AI provider at the same instant (throttle smoothing).
    try { await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 600))) } catch { /* ignore */ }
    try {
      const r = await api.workWatch(sessionId, withLevel({ frame }))
      noteStrong(r)
      lastSentRef.current = Date.now(); setFrames((n) => n + 1)
      setStatus(r.status); setObservation(r.observation || '')
      if (r.guidance != null) setGuidance(r.guidance || '')
      if (r.flag) setFlags((f) => [{ t: Date.now(), text: r.flag }, ...f].slice(0, 6))
      if (r.steps) setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s)
      if (r.done) { setWatching(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
    } catch (e) {
      // A vision/runtime error should stop the loop and say why, not spin silently.
      setErr(friendlyError(e, 'Watch failed')); setWatching(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    } finally { busyTickRef.current = false; setAnalyzing(false) }
  }, [sessionId])

  const startWatching = async () => {
    if (outOfMinutes()) return
    // Plan-heavy, watch-light (forced for Premium): never run the continuous 4s
    // loop. Clear any loop that was running, leave watching off, and let the user
    // drive on-demand reads with Check my progress (refreshScreen). Screen capture
    // is started on demand by refreshScreen itself, so nothing is forced here.
    if (watchLight) { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } setWatching(false); return }
    if (!capturing) { const ok = await startCapture(); if (!ok) return; await new Promise((r) => setTimeout(r, 400)) }
    setWatching(true); sigRef.current = null; lastSentRef.current = 0
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(tick, 4000)
    tick()
  }
  const pauseWatching = () => { setWatching(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  // Refresh screen: force an immediate re-read of the current screen (bypasses the
  // change-detector) and update the guidance, steps and flags now.
  const refreshScreen = async () => {
    if (outOfMinutes()) return
    if (!capturing) { const ok = await startCapture(); if (!ok) return; await new Promise((r) => setTimeout(r, 400)) }
    let frame = grabFrame(); if (!frame) return
    frame = await prepFrame(frame)
    setBusy(true); setAnalyzing(true); setErr('')
    try {
      const r = await api.workWatch(sessionId, withLevel({ frame }))
      if (r.status != null) setStatus(r.status)   // keep the wrong-place signal current on an on-demand read
      if (r.guidance != null) setGuidance(r.guidance || '')
      if (r.steps) setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s)
      if (r.observation) setObservation(r.observation)
      setFlags(r.flag ? [{ t: Date.now(), text: r.flag }] : [])
    } catch (e) { setErr(friendlyError(e, 'Could not refresh the screen')) } finally { setBusy(false); setAnalyzing(false) }
  }
  // OPTIONAL "Verify on my screen" (owner: "a live verify button, if at all the
  // user wants to use it"): ONE frame, ONE read, NOTHING applied. Works with the
  // continuous watch ON (grabs the current frame of the live share) or OFF
  // (prompts for the share once, keeps it for the next verify, never starts the
  // loop), and never disrupts an active watch: it has its own in-flight state
  // (not `busy`/`analyzing`), and the server's verify-only read leaves the plan
  // untouched (server/work_verify.js). The verdict is keyed to the step it was
  // read for, so a plan that moves meanwhile hides it (verifyFlow.js).
  const [verifying, setVerifying] = useState(false)
  const [verdict, setVerdict] = useState(null)
  const verifyStep = async () => {
    if (verifying || outOfMinutes()) return
    const stepIndex = (sess && sess.steps ? sess.steps : []).findIndex((x) => x.status === 'current')
    setErr('')
    if (!capturing && !photoFrameRef.current) { const ok = await startCapture(); if (!ok) return; await new Promise((r) => setTimeout(r, 400)) }
    let frame = grabFrame()
    if (!frame) { setVerdict({ kind: VERIFY_NO_FRAME, stepIndex, t: Date.now() }); return }
    setVerifying(true); setVerdict(null)
    try {
      frame = await prepFrame(frame)
      const r = await api.workWatch(sessionId, withLevel({ frame, verify: true }))
      if (r.observation) setObservation(r.observation)   // the quiet "Last read" glance stays honest
      setVerdict({ ...verdictFromWatch(r), stepIndex, t: Date.now() })
    } catch (e) {
      // Detail only when the server sent a user-facing message (402/403/409/429,
      // the one list inside friendlyError); otherwise the i18n headline alone.
      const coded = friendlyError(e, ''), generic = friendlyError(null, '')
      setVerdict({ kind: VERIFY_ERROR, stepIndex, detail: coded === generic ? '' : coded, t: Date.now() })
    } finally { setVerifying(false) }
  }
  const clearVerdict = () => setVerdict(null)
  // Re-plan with a reason, keeping progress (continue from here) or from scratch.
  const confirmReplan = async () => {
    const keep = replanScope === 'here'
    const reason = replanReason.trim()
    setReplanOpen(false)
    await plan({ reason, keepProgress: keep })
    setReplanReason('')
  }

  // Heartbeat: while actively guiding (watching or a call in flight) and not
  // paused, accrue ~15s of real used time. Stops counting when idle or paused.
  const activeRef = useRef(false)
  useEffect(() => { activeRef.current = (watching || busy) && !paused && !(usage && usage.exhausted) }, [watching, busy, paused, usage])
  useEffect(() => {
    const hb = setInterval(async () => {
      if (!activeRef.current) return
      try {
        const r = await api.workHeartbeat(sessionId, 15)
        setUsage((u) => u ? { ...u, remainingSeconds: r.remainingSeconds, freeLeft: r.freeLeft, exhausted: r.exhausted } : u)
        if (r.remainingSeconds > 900) setDismissedLow(false)
        if (r.exhausted) { setWatching(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
      } catch {}
    }, 15000)
    return () => clearInterval(hb)
  }, [sessionId])

  // Pause freezes the meter and the watch loop; it holds until the user resumes.
  // One control for the whole session: Pause stops watching AND freezes the
  // meter; Resume starts watching again and the meter counts. There is no
  // separate "Watch me" - guiding watches by default.
  const togglePause = async () => {
    const np = !paused
    setPaused(np); setErr('')
    try {
      await api.workPause(sessionId, np)
      // Only change the watch loop once the server actually recorded the state,
      // so the UI can never show "Paused" while the server thinks it is running.
      if (np) pauseWatching()
      else startWatching()
    } catch (e) {
      setPaused(!np)   // revert the optimistic toggle
      setErr(friendlyError(e, np ? 'Could not pause. Please try again.' : 'Could not resume. Please try again.'))
    }
  }
  // Desktop: hiding or killing the buddy means "pause and save my progress". The
  // shell signals the MAIN window (onPauseSave); we pause the watch loop and
  // persist the paused state with the SAME calls Pause uses (progress is already
  // saved per step). The ref always holds the current closure, so the one-time
  // subscription never acts on stale state. A guarded no-op on the web.
  const pauseSaveRef = useRef(() => {})
  pauseSaveRef.current = async () => {
    if (paused || !sess || sess.status === 'ended') return
    setPaused(true)
    try { await api.workPause(sessionId, true); pauseWatching() } catch { setPaused(false) }
  }
  useEffect(() => {
    if (!desktop || typeof desktop.onPauseSave !== 'function') return
    try { desktop.onPauseSave(() => { try { pauseSaveRef.current() } catch {} }) } catch {}
  }, [desktop])
  // Guiding watches by default - no "Watch me" button. Start watching once when a
  // planned, unpaused, active session is open and nothing is watching yet. (A
  // fresh plan already started watching; a paused session waits for Resume.)
  // Derived here (before the effects that use them) so `done` is initialised
  // before the auto-watch effect reads it - declaring it later put it in the
  // temporal dead zone and crashed the whole plan/Console view (blank page).
  const steps = (sess && sess.steps) || []
  const done = steps.length > 0 && steps.every((x) => x.status === 'done')
  // A verify verdict belongs to one step: when the current step changes (marked
  // done, auto-advanced by the watch, or navigated), it is cleared here, in ONE
  // place, so no stale "Looks done" can ever sit under a different step.
  const curStepIdx = steps.findIndex((x) => x.status === 'current')
  useEffect(() => { setVerdict(null) }, [curStepIdx])
  // A finished task is a record, not a live screen: every live control (watch
  // state, Refresh / Deep pass / Re-plan, Prev / Next, checkboxes, Ask) is
  // hidden and the steps render read-only. Deliverable actions stay.
  const ended = !!(sess && sess.status === 'ended')
  const doneCount = steps.filter((x) => x.status === 'done').length
  // "Step confirmed" micro-celebration: when the done count rises, show a check
  // that pops in on the hero for ~1.8s. Purely presentational.
  const [confirmN, setConfirmN] = useState(0)
  const prevDoneRef = useRef(doneCount)
  useEffect(() => {
    if (doneCount > prevDoneRef.current) { setConfirmN(doneCount); const t = setTimeout(() => setConfirmN(0), 1800); prevDoneRef.current = doneCount; return () => clearTimeout(t) }
    prevDoneRef.current = doneCount
    return undefined
  }, [doneCount])
  // TASK-COMPLETE CELEBRATION: fire ONCE when a task that was being worked on
  // reaches its completed state (every step done, or the session ended). The
  // one-shot `celebrate` drives the confetti flourish on BOTH surfaces (the
  // in-software done view and the floater). Guards: celebratedRef stops it
  // re-firing on re-render; sawActiveRef means merely reopening an already-
  // finished session for review never celebrates (we must have seen it active).
  const completed = ended || done
  const sawActiveRef = useRef(false)
  const celebratedRef = useRef(false)
  const [celebrate, setCelebrate] = useState(false)
  // PROACTIVE STUCK HELP: when the current step sits for STUCK_MS while guiding
  // is live (not paused, no focus screen, no open question), the step steps
  // aside for a gentle "Stuck? Any issues?" offer. Dismissing snoozes it.
  const currentIdx = steps.findIndex((x) => x.status === 'current')
  const stuckActive = !!sess && !ended && !done && !paused && !clarify && steps.length > 0 && !askFocused(askState)
  const { snooze: snoozeStuck } = useStuck({ stepIndex: currentIdx, active: stuckActive, onStuck: () => dispatchAsk({ type: 'offer' }) })
  const dismissOffer = () => { snoozeStuck(); dispatchAsk({ type: 'dismiss' }) }
  useEffect(() => {
    if (!sess) return undefined
    if (!completed) { sawActiveRef.current = true; return undefined }
    if (!sawActiveRef.current || celebratedRef.current) return undefined
    // Fire only when the surface that SHOWS the celebration first appears, so
    // the confetti always lands on a visible completed view: the in-software
    // done view renders at `ended`; the floater's completed block renders as
    // soon as every step is done (or the session ends). Marking all steps done
    // in-software (no floater) waits for End, which is exactly when its banner
    // shows.
    const surfaceReady = ended || (done && !!pipWin)
    if (!surfaceReady) return undefined
    celebratedRef.current = true
    setCelebrate(true)
    const t = setTimeout(() => setCelebrate(false), 3400)
    return () => clearTimeout(t)
  }, [completed, ended, done, pipWin, sess])
  // Confetti pieces: computed once per mount so re-renders never reshuffle them.
  const confettiPieces = useMemo(() => makeConfetti(14), [])
  const autoWatchRef = useRef(false)
  useEffect(() => {
    if (autoWatchRef.current || !sess) return
    if (((sess.steps || []).length) === 0) return
    // watchLight is forced-off from the continuous loop: never auto-start watching.
    if (paused || watching || done || busy || sess.status === 'ended' || watchLight) return
    autoWatchRef.current = true
    startWatching()
  }, [sess, paused, watching, done, busy, watchLight])   // eslint-disable-line
  // Leaving work mode for the plan/Home screen freezes the session as a PAUSED
  // plan: the meter stops and it shows in "Pick up where you left off" with a
  // Resume button. Same behaviour on web and in the desktop app (the desktop
  // also snaps the window back to the large plan-mode layout). Reopening it
  // loads paused state, so the user resumes exactly where they left off.
  // HOME = the dashboard. On the desktop the main window is in the compact
  // GUIDE geometry while a session is open; the dashboard must never render
  // inside it. So the window expands back to PLAN mode FIRST (large, centered,
  // opaque, not on top), then the dashboard route loads. On the web this is
  // just the navigation.
  const goHome = async () => {
    try { if (desktop && typeof desktop.setMode === 'function') await desktop.setMode('plan') } catch { /* the layout re-asserts the mode */ }
    onBack()
  }
  const leaveToPlan = async () => {
    stopCapture()
    try { if (sess && sess.status !== 'ended' && !paused) await api.workPause(sessionId, true) } catch { /* still leave */ }
    goHome()
  }

  // The engine reply, in the ONE contract { answer, planChanged, steps?, resumeAt }
  // (normalizeAskResponse also maps the older { answer, steps, index } shape).
  // An empty reply (no answer, no plan change) shows nothing and returns to the step.
  const askCtx = () => ({ steps, current: Math.max(0, steps.findIndex((x) => x.status === 'current')) })
  const receiveReply = (r) => {
    const n = normalizeAskResponse(r, askCtx())
    if (!n.answer && !n.planChanged) { dispatchAsk({ type: 'done' }); return }
    dispatchAsk({ type: 'receive', ...n })
  }
  // CONTINUE: rope the user back into guiding. When the question changed the
  // plan, the engine's forward steps replace the plan and guiding resumes at
  // resumeAt; otherwise it resumes where they were. FadeSwap crossfades the
  // answer out and the step card in.
  // The focused answer: prose through RichText (key terms highlighted, values
  // copyable, links live), fenced code through the shared dark code panel.
  const renderAnswer = (t) => splitSegments(String(t || '')).map((seg, i) => seg.type === 'code'
    ? <CodeBlock key={i} file={seg.lang || ''} content={seg.body} />
    : <RichText key={i} text={seg.body} accent="var(--gv-accent)" links />)
  const resumeGuiding = () => {
    if (askState.phase === ASK_ANSWERED && askState.planChanged) setSess((s) => applyResume(s, askState))
    dispatchAsk({ type: 'done' })
  }

  const ask = async (qText, kindArg) => {
    // Called both from onClick (passes an event) and from the Float panel
    // (passes a string). Only treat a string argument as the question text.
    const q = (typeof qText === 'string' ? qText : question).trim()
    if (!q) return
    if (outOfMinutes()) return
    // A question from the stuck check-in is sent as such, so the engine answers
    // with a clearer explanation of the current step (or adapts the plan).
    const kind = typeof kindArg === 'string' ? kindArg : (askState.phase === ASK_OFFER ? 'stuck' : 'ask')
    dispatchAsk({ type: 'begin', question: q, kind })
    setBusy(true); setErr('')
    try {
      // Include the screen only if we are already capturing - so pasting a big API
      // response or a long error and hitting Ask does NOT trigger a screen-share
      // prompt. The pasted text is analysed with the goal + plan context.
      const frame = await prepFrame(capturing ? grabFrame() : (photoFrameRef.current || null))
      const r = await api.workAsk(sessionId, withLevel({ question: q, frame, ...(kind === 'stuck' ? { stuck: true } : {}) }))
      noteStrong(r); receiveReply(r); if (typeof qText !== 'string') setQuestion('')
    } catch (e) { dispatchAsk({ type: 'fail' }); setErr(friendlyError(e, 'Could not answer')) } finally { setBusy(false) }
  }

  // Add context MID-TASK: a typed note, a text document, and/or an uploaded image
  // (screenshot or phone photo). The engine reads it and AUTO-REPLANS the remaining
  // steps only if the new context changes the path - finished steps are preserved
  // and the user resumes at the next step. The uploaded image is already on-device
  // redacted (readContextFile) when DLP is on; the live screen is added too if we
  // are already capturing, so a "this is where I'm stuck" photo lands with context.
  const addContext = async ({ note = '', image = null, docsText = '' } = {}) => {
    const hasText = !!(String(note).trim() || String(docsText).trim())
    if (!hasText && !image) return
    if (outOfMinutes()) return
    dispatchAsk({ type: 'begin', question: String(note || '').trim(), kind: 'context' })
    setBusy(true); setErr('')
    try {
      const frame = await prepFrame(capturing ? grabFrame() : (photoFrameRef.current || null))
      const r = await api.workAddContext(sessionId, withLevel({ note, docsText, image, frame }))
      noteStrong(r)
      // A re-plan from the new context is applied on Continue (askFlow contract).
      receiveReply(r)
      setQuestion('')
    } catch (e) { dispatchAsk({ type: 'fail' }); setErr(friendlyError(e, 'Could not add that')) } finally { setBusy(false) }
  }
  // Attach handler shared by the console + float: read the file, then send it with
  // whatever note is typed. Surfaces an inline error for an unreadable/unsupported
  // file instead of failing silently.
  const attachContext = async (file, note = '') => {
    if (!file) return
    const out = await readContextFile(file)
    if (out.error) { setErr(out.error); return }
    await addContext({ note, image: out.image || null, docsText: out.docsText || '' })
  }

  // On-demand screenshot analysis: grab this exact frame and analyze it. A focus
  // prompt (what to analyze) steers it; empty gives a full read of the screen.
  // focus = optional question. forceDeep = one-shot: run THIS screenshot on the
  // stronger model and weave it back into the plan, then continue on the fast one.
  const analyze = async (focus, forceDeep) => {
    const f = (typeof focus === 'string' ? focus : '').trim()
    const deep = !!forceDeep
    if (outOfMinutes()) return
    dispatchAsk({ type: 'begin', question: f, kind: 'analyze' })
    setBusy(true); setErr('')
    try {
      if (!capturing && !photoFrameRef.current) { const ok = await startCapture(); if (!ok) { setBusy(false); dispatchAsk({ type: 'dismiss' }); return } await new Promise((r) => setTimeout(r, 400)) }
      const frame = await prepFrame(grabFrame())
      const r = await api.workAsk(sessionId, withLevel({ question: f, frame, deep }))
      noteStrong(r); receiveReply({ answer: r.answer, planChanged: false })
      // The screenshot review should also help the plan: run one navigator pass
      // on the SAME frame so the steps and the live guidance reflect what was
      // just seen (advance, correct, or flag), without losing the goal.
      if (sess && Array.isArray(sess.steps) && sess.steps.length) {
        try {
          const w = await api.workWatch(sessionId, withLevel({ frame, deep }))
          if (w.status != null) setStatus(w.status)   // keep the wrong-place signal current after a deep/analyze pass
          if (w.guidance != null) setGuidance(w.guidance || '')
          if (w.steps) setSess((s) => s ? { ...s, steps: w.steps, currentStep: w.index } : s)
          if (w.observation) setObservation(w.observation)
          // Flags reflect the CURRENT screen only: replace each watch tick so a
          // warning clears the moment you move past it (no stale, sticky errors).
          setFlags(w.flag ? [{ t: Date.now(), text: w.flag }] : [])
        } catch { /* the answer already showed; a nav refresh failure is non-fatal */ }
      }
    } catch (e) { dispatchAsk({ type: 'fail' }); setErr(friendlyError(e, 'Could not analyze the screen')) } finally { setBusy(false) }
  }

  // Research = user-triggered web lookup, then a current answer. Only runs when
  // the user taps Research, so there is no continuous web use.
  const doResearch = async (qArg) => {
    const q = (typeof qArg === 'string' ? qArg : question).trim()
    if (outOfMinutes()) return
    dispatchAsk({ type: 'begin', question: q, kind: 'research' })
    setBusy(true); setErr('')
    try { const r = await api.workResearch(sessionId, q, withLevel()); receiveReply({ answer: r.answer, planChanged: false }) }
    catch (e) { dispatchAsk({ type: 'fail' }); setErr(friendlyError(e, 'Could not research')) } finally { setBusy(false) }
  }

  // Get the RESULT: hand back the actual answer for the goal, not the next step.
  // It computes from the goal plus any text pasted into the "paste data" field
  // (docsText). forceScreen attaches the current screen frame (starting capture
  // if needed); otherwise a frame is included only when we are already sharing,
  // so pasting data and pressing Get the result never triggers a share prompt.
  // The honesty contract (confidence / basis / verifyBy / caveat / need) rides
  // on the returned result and is surfaced by ResultCard.
  const getResult = async (forceScreen) => {
    if (outOfMinutes()) return
    setResultBusy(true); setResultErr(''); setResultOut(null); setResultSec(null); setResultPol(null)
    try {
      let frame = null
      if (forceScreen) {
        if (!capturing && !photoFrameRef.current) { const ok = await startCapture(); if (!ok) { setResultBusy(false); return } await new Promise((r) => setTimeout(r, 400)) }
        frame = await prepFrame(grabFrame())
      } else if (capturing || photoFrameRef.current) {
        frame = await prepFrame(grabFrame())
      }
      const body = {}
      if (frame) body.frame = frame
      if (pasteData.trim()) body.docsText = pasteData
      const r = await waitFor(api.workResult(sessionId, body), 'Getting the result is taking longer than expected. Try again.')
      noteStrong(r)
      if (r && r.result) { setResultOut(r.result); setResultSec(r.security || null); setResultPol(r.policy || null) }
      else setResultErr('No result came back. Try again.')
    } catch (e) {
      setResultErr((e && e.message) || 'Could not get the result')
      if (e && e.timedOut) refresh()
    } finally { setResultBusy(false) }
  }

  // COMPOSE: write the actual document for the goal. It writes from `want` (what
  // to write) plus any pasted source (docsText) and, optionally, the screen. Same
  // frame / redaction / timeout guards as getResult: forceScreen attaches the
  // current screen (starting capture if needed); otherwise a frame rides along
  // only when we are already sharing, so pasting text and pressing Compose never
  // triggers a share prompt. The result (title / body / basis / caveat) is
  // surfaced by ComposeCard. Nothing is auto-filled; it is read-only.
  const compose = async (forceScreen) => {
    const want = composeWant.trim()
    if (!want) { setComposeErr('Tell me what to write first.'); return }
    if (outOfMinutes()) return
    setComposeBusy(true); setComposeErr(''); setComposeOut(null); setComposeSec(null); setComposePol(null)
    try {
      let frame = null
      if (forceScreen) {
        if (!capturing && !photoFrameRef.current) { const ok = await startCapture(); if (!ok) { setComposeBusy(false); return } await new Promise((r) => setTimeout(r, 400)) }
        frame = await prepFrame(grabFrame())
      } else if (capturing || photoFrameRef.current) {
        frame = await prepFrame(grabFrame())
      }
      const body = { want }
      if (composeFormat) body.format = composeFormat
      if (composeSrc.trim()) body.docsText = composeSrc
      if (frame) body.frame = frame
      const r = await waitFor(api.workCompose(sessionId, body), 'Writing this is taking longer than expected. Try again.')
      noteStrong(r)
      if (r && r.compose) { setComposeOut(r.compose); setComposeSec(r.security || null); setComposePol(r.policy || null) }
      else setComposeErr('Nothing came back. Try again.')
    } catch (e) {
      setComposeErr((e && e.message) || 'Could not write this')
      if (e && e.timedOut) refresh()
    } finally { setComposeBusy(false) }
  }

  // COMPUTE FROM A FILE - on-device parse. The file is read ENTIRELY in the
  // browser; the full rows are kept in computeRowsRef (never state that could
  // serialize out, never a network call). Only the derived preview (name, row
  // count, column schema) goes into React state for display.
  const onComputeFile = async (file) => {
    if (!file) return
    setComputeErr(''); setComputeNeed(''); setComputeOut(null); setComputeFile(null)
    computeRowsRef.current = null
    setComputeParsing(true)
    try {
      const res = await parseDataFile(file)
      if (res.error) { setComputeErr(res.error); return }
      if (!res.rowCount || !res.schema.length) {
        setComputeErr('That file has no rows to compute on. Check it has a header row and at least one row of values.')
        return
      }
      computeRowsRef.current = res.rows
      setComputeFile({ name: res.name, rowCount: res.rowCount, schema: res.schema })
    } catch {
      setComputeErr('That file could not be read. Attach a .csv, .xlsx or .xls file.')
    } finally { setComputeParsing(false) }
  }

  // COMPUTE - the privacy boundary lives here. We send ONLY { want, schema,
  // rowCount } to plan a bounded, safe computation spec (never the rows, never
  // any cell value). We re-validate that spec locally (defense in depth) and
  // then run it on the FULL local rows with runSpec, on the device. Same minutes
  // / timeout guard as getResult for the one network call; the parse + run are
  // local and need no gate.
  const compute = async () => {
    const rows = computeRowsRef.current
    const file = computeFile
    if (!file || !rows) { setComputeErr('Attach a CSV or Excel file first.'); return }
    const want = computeWant.trim()
    if (!want) { setComputeErr('Tell me what to compute first.'); return }
    if (outOfMinutes()) return
    setComputeBusy(true); setComputeErr(''); setComputeNeed(''); setComputeOut(null)
    try {
      // ONLY the schema + row count leave the device. The rows stay here.
      const r = await waitFor(
        api.workCompute(sessionId, { want, schema: file.schema, rowCount: file.rowCount }),
        'Planning the computation is taking longer than expected. Try again.',
      )
      noteStrong(r)
      if (!r || r.ok === false || (r && r.need && String(r.need).trim())) {
        setComputeNeed((r && (String(r.need || '').trim() || String(r.caveat || '').trim())) || 'The file does not have the columns this needs. Pick a file that has them, or ask for something the columns cover.')
        return
      }
      const spec = r.spec
      const v = validateSpec(spec, file.schema)   // re-check locally before running
      if (!v.ok) {
        setComputeErr('The returned plan did not pass the local safety check (' + (v.errors[0] || 'invalid plan') + '). Try rewording what to compute.')
        return
      }
      const out = runSpec(spec, rows)   // LOCAL, full rows, on device
      setComputeOut({ result: out, explanation: r.explanation || '', caveat: r.caveat || '', spec })
    } catch (e) {
      setComputeErr((e && e.message) || 'Could not compute this')
      if (e && e.timedOut) refresh()
    } finally { setComputeBusy(false) }
  }

  const clearCompute = () => {
    computeRowsRef.current = null
    setComputeFile(null); setComputeOut(null); setComputeErr(''); setComputeNeed('')
  }

  const setStep = async (i, st) => {
    setErr('')
    // Evidence capture: when the user MARKS A STEP DONE and is sharing their
    // screen, send the current (on-device-scrubbed) frame so the server keeps it
    // as that step's milestone screenshot. This gives reports scrubbed shots even
    // when steps are confirmed manually, not only by the watch auto-confirm. The
    // frame is the same already-redacted frame the watch/ask flows send; it is
    // best-effort and never blocks the step update.
    let frame = null
    if (st === 'done') { try { const f = grabFrame(); if (f) frame = await prepFrame(f) } catch { /* evidence is best-effort */ } }
    try { const r = await api.workStep(sessionId, i, st, frame); setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s) }
    catch (e) { setErr(friendlyError(e, 'Could not update that step. Please try again.')) }
  }
  // Robust download (web + desktop app): fetch with the window's own authenticated
  // session and save via a blob, instead of window.open / <a download> which could
  // fail to download in the desktop app (signed-out external browser / partition).
  const downloadDoc = async (url, filename) => {
    try { await api.downloadFile(url, filename) }
    catch (e) { setErr(friendlyError(e, 'Could not download that file. Please try again.')) }
  }
  // Prev / Next navigation of the current step (moves the pointer, does not mark
  // done). Shared by the main card header and the floating overlay.
  const navStep = async (dir) => {
    if (!steps.length) return
    const curIdx = steps.findIndex((s) => s.status === 'current')
    const base = curIdx >= 0 ? curIdx : Math.min(sess?.currentStep || 0, steps.length - 1)
    const target = base + dir
    if (target < 0 || target >= steps.length) return
    setErr('')
    try { const r = await api.workCurrentStep(sessionId, target); setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s) }
    catch (e) { setErr(friendlyError(e, 'Could not move to that step. Please try again.')) }
  }
  // Jump straight to a step from the maximized view's plan mini-map (the same
  // current-step call navStep makes; moves the pointer, never marks done).
  const jumpStep = async (i) => {
    if (i < 0 || i >= steps.length) return
    setErr('')
    try { const r = await api.workCurrentStep(sessionId, i); setSess((s) => s ? { ...s, steps: r.steps, currentStep: r.index } : s) }
    catch (e) { setErr(friendlyError(e, 'Could not move to that step. Please try again.')) }
  }

  // "How?" drill-down: expand one action (a plan step or the live guidance) into
  // a detailed sub-step checklist, guided the same way. State is keyed so each
  // drill-down keeps its own fetched sub-steps (no refetch on re-collapse) and
  // its own loading / declined / error state. Keys: 'step-<i>' for a plan step,
  // 'guidance' for the live guidance card. Cleared only on an explicit re-plan.
  const [howTo, setHowTo] = useState({})   // key -> { open, loading, steps, refusal, error }
  const drillHow = async (key, action, stepIndex) => {
    const act = (action || '').trim()
    if (!act) return
    const existing = howTo[key]
    // Already have usable content: this is just a collapse / re-expand, no refetch.
    if (existing && !existing.loading && !existing.error && (existing.steps || existing.refusal)) {
      setHowTo((h) => ({ ...h, [key]: { ...existing, open: !existing.open } }))
      return
    }
    if (existing && existing.loading) return
    setHowTo((h) => ({ ...h, [key]: { open: true, loading: true } }))
    try {
      let frame = null
      try { frame = await prepFrame(grabFrame()) } catch { frame = null }
      const body = { action: act }
      if (stepIndex != null) body.stepIndex = stepIndex
      if (frame) body.frame = frame
      const r = await api.workHowTo(sessionId, withLevel(body))
      noteStrong(r)
      if (r && r.refusal) setHowTo((h) => ({ ...h, [key]: { open: true, loading: false, refusal: r.refusal } }))
      else setHowTo((h) => ({ ...h, [key]: { open: true, loading: false, steps: (r && r.steps) || [] } }))
    } catch {
      // Never crash the Console on a drill-down failure; show an inline retry.
      setHowTo((h) => ({ ...h, [key]: { open: true, loading: false, error: true } }))
    }
  }

  // #3 AUTO-OPEN sub-tasks for the ACTIVE step: the person should see the
  // detailed sub-steps without clicking "How?". When the current step changes,
  // fetch + expand its drill-down once (drillHow dedupes, so a re-expand never
  // refetches, and the "no extra detail needed" case renders calmly). One extra
  // call per step advance at most; it is skipped for a finished/all-done task.
  const autoHowRef = useRef(null)
  useEffect(() => {
    if (ended || done || !sess || !steps.length) return
    const ci = steps.findIndex((s) => s.status === 'current')
    if (ci < 0) return
    const key = 'step-' + ci
    if (autoHowRef.current === key) return
    autoHowRef.current = key
    if (!howTo[key]) drillHow(key, steps[ci].text, ci)
  }, [sess, ended, done])   // eslint-disable-line

  const finalize = async () => {
    setBusy(true)
    try { const r = await api.workFinalize(sessionId); setSess((s) => s ? { ...s, status: 'ended', summary: r.summary } : s); stopCapture() }
    catch (e) { setErr(friendlyError(e, 'Could not finalize')) } finally { setBusy(false) }
  }
  // End flow: show a finishing animation, run finalize, then a completion message
  // with a clear "Back to plan" navigation.
  const endSession = async () => {
    setEndState('finishing')
    try {
      const r = await waitFor(api.workFinalize(sessionId), 'Finishing is taking longer than expected. Your session is saved; press End again in a moment.')
      setSess((s) => s ? { ...s, status: 'ended', summary: r.summary } : s); stopCapture(); setEndState('done')
    } catch (e) {
      setErr(friendlyError(e, 'Could not finalize')); setEndState(null)
      if (e && e.timedOut) refresh()
    }
  }

  // Reader-controlled guidance text size, shared with the full-screen guide via
  // one localStorage key. Applied as the `--wc-fs` multiplier on the console
  // root so the guidance text, step headings and code boxes scale together.
  const { scale: fsScale, dec: fsDec, inc: fsInc, reset: fsReset, atMin: fsAtMin, atMax: fsAtMax } = useGuideFontScale()
  // The same scale in the browser float. The PiP / pop-out is a SEPARATE
  // document, so the shared value is pushed onto its root as --fp-fs; FLOAT_CSS
  // and the FloatPanel sizes multiply by it. --wc-fs mirrors it so the shared
  // CmdBlock / CodeBlock dark code boxes scale inside the float too. One key
  // (wc-guide-fontscale), so the float, console and full guide always agree.
  useEffect(() => {
    if (!pipWin) return
    try {
      const root = pipWin.document.documentElement
      root.style.setProperty('--fp-fs', String(fsScale))
      root.style.setProperty('--wc-fs', String(fsScale))
    } catch { /* FloatPanel also sets the vars inline on its root, so it still scales */ }
  }, [pipWin, fsScale])

  const live = watching && !paused
  // ONE status chip definition for both the header and the right rail (single
  // source of truth). It never says "Ready" while the share prompt is open or
  // the first plan is being built (QA M7).
  const chip = paused
    ? { label: 'Paused', title: 'Paused. Resume to keep guiding.' }
    : live
      ? { label: 'Guiding', title: 'Guiding live from your screen' }
      : sharePrompt
        ? { label: source === 'screen' ? 'Share screen' : 'Camera', title: source === 'screen' ? 'Waiting for you to share your screen' : 'Waiting for camera access' }
        : (busy && steps.length === 0)
          ? { label: 'Planning', title: 'Building your plan from your goal and screen' }
          : { label: 'Ready', title: 'Ready. Start watching to go live.' }
  // #2 Wrong-place gate: the mismatch signal the watch response carries (the
  // server sets status='wrong' when it raises a flag, index.js). The prominent
  // alert shows ONLY on a real mismatch and hides when the screen is correct.
  const offTrack = !ended && status === 'wrong' && !!String(observation || '').trim()

  return (
    <div className="wc" style={{ ...shell, minHeight: 0, height: 'auto', flex: '1 1 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden', '--wc-fs': fsScale }}>
      <style>{CONSOLE_CSS}{GUIDE_CSS}</style>
      {/* FIXED HEADER (#new): the menu/title bar stays pinned; only the content
          between it and the fixed Ask footer scrolls. */}
      <div className="wc-fixedhead"><div className="wc-shellw">
        {/* Compact single-row toolbar: Back + theme, the product name and ONE
            calm status chip (Guiding / Paused), then the session controls. */}
        <div className="wc-top">
          {/* Back appears once you Pause (a deliberate, paused exit), on a finished task,
              and whenever there is no loaded session yet (loading or failed), so the
              console can never trap the user. */}
          {(paused || ended || !sess) && <button className="wc-ib" onClick={leaveToPlan} title={ended ? 'Back to your plans' : (!sess ? 'Back to your plans' : 'Back to planning. Your paused session waits under Pick up where you left off.')} aria-label="Back to plan"><ChevronLeft size={17} /></button>}
          {/* Theme toggle lives in the Tools menu while guiding; it stays here on
              the loading / error / goal / finished screens where there is no menu. */}
          {!(sess && !ended) && <button className="wc-ib" onClick={toggleAppTheme} title={appTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} aria-label="Toggle light or dark mode">{appTheme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>}
          {/* #1 Product name + ONE calm status chip (Guiding when live, Paused
              when paused). The watching state is implied here, not in a toggle. */}
          <span className="wc-brand">
            <span className="wc-brand-mark"><Eye size={14} strokeWidth={2.4} /></span>
            <span className="wc-brand-name">WorkCoPilot</span>
          </span>
          {sess && !ended && (
            <span className={`wc-statuschip${live ? ' live' : ''}${paused ? ' paused' : ''}`} title={chip.title}>
              <span className="wc-sdot" />{chip.label}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {/* Float on top is the core web feature: a labeled, filled button, not a bare icon. */}
          {floatCapable && sess && !ended && (pipWin
            ? <button className="wc-tbtn on" title={floatIsPip ? 'Bring the steps back into this window' : 'Close the pop-out window'} aria-label="Unfloat" onClick={closeFloat}><PictureInPicture2 size={15} /> <span className="wc-lbl">{floatIsPip ? 'Unfloat' : 'Close pop-out'}</span></button>
            : <button className="wc-tbtn primary" title={pipSupported ? 'Float the steps in a small always-on-top window so you can work underneath' : 'Pop the steps out into their own window'} aria-label="Float on top" onClick={openFloat}><PictureInPicture2 size={15} /> <span className="wc-lbl">{pipSupported ? 'Float on top' : 'Pop out'}</span></button>)}
          {/* TOOLS: one dropdown for everything that need not sit on screen.
              Make something opens a focused modal; the rest run their existing
              handlers. Pause/Resume, Float and End stay as the visible essentials. */}
          {sess && !ended && (
            <div className="wc-menu" ref={menuRef}>
              <button className={`wc-tbtn${menuOpen ? ' on' : ''}`} onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen} title="Tools: make a deliverable, read the screen, re-plan, full guide, text size, theme"><MenuIcon size={15} /> <span className="wc-lbl">Tools</span></button>
              {menuOpen && (
                <div className="wc-menu-pop" role="menu" aria-label="Tools">
                  <div className="wc-menu-sec">Make something</div>
                  <button role="menuitem" className="wc-menu-item" onClick={fromMenu(() => pickMaker('answer'))}><Sparkles size={15} /><span><b>Answer</b><small>Get the actual answer, with how I got it</small></span></button>
                  <button role="menuitem" className="wc-menu-item" onClick={fromMenu(() => pickMaker('write'))}><PenLine size={15} /><span><b>Write</b><small>Code, or a ready prompt for your own AI</small></span></button>
                  <button role="menuitem" className="wc-menu-item" onClick={fromMenu(() => pickMaker('compute'))}><Calculator size={15} /><span><b>Compute</b><small>Crunch a CSV or Excel file, on your device</small></span></button>
                  <div className="wc-menu-sec">Screen</div>
                  {!watchLight && <button role="menuitem" className="wc-menu-item" disabled={busy || paused} onClick={fromMenu(refreshScreen)}><ScanLine size={15} /><span><b>Read my screen</b><small>Verify this step now and move on</small></span></button>}
                  <button role="menuitem" className="wc-menu-item" disabled={busy} onClick={fromMenu(() => analyze(question, true))}><Zap size={15} /><span><b>Deep pass</b><small>A closer look at this screen, woven into your steps</small></span></button>
                  {isMobile && <button role="menuitem" className="wc-menu-item" disabled={busy} onClick={fromMenu(takePhoto)}><Camera size={15} /><span><b>{photoFrame ? 'Retake photo' : 'Photo'}</b><small>Snap a screen, device or paper</small></span></button>}
                  <div className="wc-menu-sec">Plan</div>
                  <button role="menuitem" className="wc-menu-item" onClick={fromMenu(() => setPlanOpen(true))}><FileText size={15} /><span><b>View full plan</b><small>Every step, done and upcoming</small></span></button>
                  <button role="menuitem" className="wc-menu-item" disabled={busy} onClick={fromMenu(() => { setReplanReason(''); setReplanScope('here'); setReplanOpen(true) })}><RefreshCw size={15} /><span><b>Re-plan</b><small>Give a reason, keep or reset progress</small></span></button>
                  {!isMobile && <button role="menuitem" className="wc-menu-item" onClick={fromMenu(openFullGuide)}><Monitor size={15} /><span><b>Full guide</b><small>Clean, full-screen guidance on your other monitor</small></span></button>}
                  <div className="wc-menu-sec">View</div>
                  <div className="wc-menu-row"><span className="wc-menu-row-k">Text size</span><GuideFontControl scale={fsScale} dec={fsDec} inc={fsInc} reset={fsReset} atMin={fsAtMin} atMax={fsAtMax} theme={{ border: 'var(--border)', text: 'var(--text)', muted: 'var(--text-muted)', panel: 'var(--surface)', accent: 'var(--em)' }} /></div>
                  <div className="wc-menu-row"><span className="wc-menu-row-k">Guidance</span><GuideLevelControl level={level} onChange={setLevel} compact theme={{ border: 'var(--border)', muted: 'var(--text-muted)', panel: 'var(--surface)', accent: 'var(--em)', accentSoft: 'var(--em-soft)' }} /></div>
                  {/* Per-user accent: applies live everywhere (guide + dashboards) and persists. Stays open like Text size. */}
                  <div className="wc-menu-row" style={{ display: 'block' }}><AccentPicker variant="guide" /></div>
                  <button role="menuitem" className="wc-menu-item" onClick={fromMenu(toggleAppTheme)}>{appTheme === 'light' ? <Moon size={15} /> : <Sun size={15} />}<span><b>{appTheme === 'light' ? 'Dark mode' : 'Light mode'}</b><small>Switch the guiding panel theme</small></span></button>
                </div>
              )}
            </div>
          )}
          {sess && !ended && <button className="wc-tbtn quiet" onClick={endSession} disabled={busy} title="End the session and build a summary">End</button>}
        </div>
        {/* PINNED guide status strip (owner request): Pause/Resume and the live
            "what the screen is reading" line stay stuck to the top bar instead of
            scrolling away. While a frame is in flight it blinks "Analyzing"; on the
            reply it returns to the calm reading line with the detected element in
            bold. Hidden at >=1240px where the right rail carries these controls. */}
        {sess && !ended && (
          <div className="wc-guidehead">
            <div className="wc-gh-controls">
              {watchLight
                ? <span className="wc-live-pill lite" title="Plan-heavy mode. Your steps are richer and self-contained. Use Check my progress for an on-demand read."><Compass size={12} /> Plan-heavy mode</span>
                : paused
                  ? <button className="wc-tbtn resume wc-watch" onClick={togglePause} title="Resume guiding - watching resumes and the clock runs again"><Play size={15} /> Resume</button>
                  : watching
                    ? <button className="wc-tbtn pause wc-watch" onClick={togglePause} title="Pause guiding - stop watching and stop the clock"><Square size={13} /> Pause</button>
                    : <button className="wc-tbtn primary wc-watch" onClick={startWatching} disabled={busy} title={source === 'screen' ? 'Share your whole screen so the steps update as you work' : 'Start the camera so the steps update as you work'}><Eye size={15} /> {source === 'screen' ? 'Watch my screen' : 'Watch the camera'}</button>}
              {usage && <span className={`wc-min${usage.exhausted ? ' low' : ''}`} title={`${usage.tier} plan, hours renew ${usage.resetLabel}`}><span className="wc-dot" /> {usageTimeLeft(usage)}</span>}
              {strongUsed && <span className="wc-strong"><Zap size={11} /> deeper read</span>}
            </div>
          </div>
        )}
      </div></div>
      {/* SCROLL AREA: everything between the fixed header and the fixed Ask footer.
          MAXIMIZED (wide) layout: a centered, boxed stage at reading width with
          soft shadow, flanked by a LEFT rail (plan mini-map, prev/next, full plan,
          re-plan) and a RIGHT rail (status, minutes, pause/resume, make, screen
          reads, full guide, end). The rails collapse on narrower widths, where
          the header Tools menu already carries every control. */}
      {(() => { const rails = !!(sess && steps.length > 0 && !ended); const ci = rails ? steps.findIndex((s) => s.status === 'current') : -1; return (
      <div className="wc-scroll"><div className={`wc-shellw${rails ? ' wc-stagegrid' : ''}`}>
        {rails && (
          <aside className="wc-rail wc-rail-l" aria-label="Plan">
            <div className="wc-rail-card">
              <div className="wc-rail-k"><FileText size={12} /> Plan <span className="wc-rail-n">{progressText(steps)}</span></div>
              <div className="wc-mm">
                {steps.map((s, i) => { const mk = planMarker(s, i, steps); return (
                  <button key={i} type="button" className={`wc-mm-row ${mk}`} onClick={() => jumpStep(i)} title={String(s.text || '')} aria-current={mk === 'current' ? 'step' : undefined}>
                    <span className="wc-mm-badge">{mk === 'done' ? <Check size={11} strokeWidth={2.5} /> : i + 1}</span>
                    <span className="wc-mm-t"><RichText text={s.text} accent="var(--gv-muted, var(--text-muted))" chips={false} /></span>
                  </button>
                ) })}
              </div>
              <div className="wc-rail-row">
                <button className="wc-nav-btn" disabled={ci <= 0} onClick={() => navStep(-1)} title="Previous step"><ChevronLeft size={14} /> Prev</button>
                <button className="wc-nav-btn" disabled={ci < 0 || ci >= steps.length - 1 || (steps[ci] && steps[ci].status !== 'done')} onClick={() => navStep(1)} title="Next step">Next <ChevronRight size={14} /></button>
              </div>
              <button type="button" className="wc-rail-btn" onClick={() => setPlanOpen(true)}><FileText size={14} /> View full plan</button>
              <button type="button" className="wc-rail-btn" disabled={busy} onClick={() => { setReplanReason(''); setReplanScope('here'); setReplanOpen(true) }}><RefreshCw size={14} /> Re-plan</button>
            </div>
          </aside>
        )}
        <div className={rails ? 'wc-stage' : undefined}>
        {/* End flow: a finishing animation, a completion message, then back to plan. */}
        {replanOpen && (
          <div className="wd-modal-ov" onClick={() => setReplanOpen(false)}>
            <div className="wd-modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px,calc(100vw - 36px))' }}>
              <h3 style={{ color: 'var(--text)' }}><RefreshCw size={17} /> Re-plan</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>Re-plan adapts the steps to new information. Your <b style={{ color: 'var(--text)' }}>original request stays exactly as you asked it</b> &mdash; if the goal itself has changed, start a new task.</p>
              {replanInfo && !replanInfo.unlimited && (
                <div style={{ fontSize: 12.5, fontWeight: 600, color: replanInfo.remaining <= 0 ? 'var(--danger, #c0392b)' : (replanInfo.remaining <= 2 ? 'var(--warn, #b8860b)' : 'var(--text-dim)'), margin: '0 0 10px' }}>
                  {replanInfo.remaining <= 0
                    ? `No re-plans left for this task (used all ${replanInfo.cap}). Start a new task to plan afresh.`
                    : `${replanInfo.remaining} of ${replanInfo.cap} re-plans left for this task.`}
                </div>
              )}
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', margin: '2px 0 7px' }}>What's new? <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(what changed, what to add or fix &mdash; not a new goal)</span></label>
              <textarea rows={3} autoFocus value={replanReason} onChange={(e) => setReplanReason(e.target.value)} placeholder="e.g. the UI changed, add a firewall rule step, skip the VPN part" style={{ width: '100%', resize: 'vertical', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 11, color: 'var(--text)', font: 'inherit', fontSize: 14, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="button" onClick={() => setReplanScope('here')} style={{ flex: 1, textAlign: 'left', padding: '11px 13px', borderRadius: 11, cursor: 'pointer', background: replanScope === 'here' ? 'var(--brand-soft)' : 'var(--surface-2)', border: `1px solid ${replanScope === 'here' ? 'var(--brand-600)' : 'var(--border)'}`, color: 'var(--text)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>Continue from here</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Keep what's done, re-plan the rest</div>
                </button>
                <button type="button" onClick={() => setReplanScope('start')} style={{ flex: 1, textAlign: 'left', padding: '11px 13px', borderRadius: 11, cursor: 'pointer', background: replanScope === 'start' ? 'var(--brand-soft)' : 'var(--surface-2)', border: `1px solid ${replanScope === 'start' ? 'var(--brand-600)' : 'var(--border)'}`, color: 'var(--text)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>From the start</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Rebuild the whole plan</div>
                </button>
              </div>
              <div className="wd-modal-btns">
                <button className="btn btn-ghost" onClick={() => setReplanOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmReplan} disabled={busy || !!(replanInfo && !replanInfo.unlimited && replanInfo.remaining <= 0)}><RefreshCw size={15} /> Re-plan</button>
              </div>
            </div>
          </div>
        )}
        {endState && (
          <div className="wd-modal-ov" onClick={() => endState === 'done' && setEndState(null)}>
            <div className="wd-modal" onClick={(e) => e.stopPropagation()}>
              {endState === 'finishing' ? (
                <>
                  <h3 style={{ color: 'var(--text)' }}><Loader2 size={17} className="spin" /> Wrapping up…</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '2px 0 0' }}>Finishing the current step and writing your summary. One moment.</p>
                </>
              ) : (
                <>
                  <h3 style={{ color: 'var(--text)' }}><Check size={18} style={{ color: 'var(--success)' }} /> Session complete</h3>
                  {sess && sess.summary
                    ? <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.55, margin: '2px 0 0', maxHeight: 180, overflow: 'auto' }}>{(() => { const t = String(sess.summary).replace(/\s+/g, ' ').trim(); return t.length > 360 ? t.slice(0, 360) + '…' : t })()}</p>
                    : <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '2px 0 0' }}>Your session is saved.</p>}
                  <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: '10px 0 0' }}>The full report, prompts and audit log are under <b>Pick up where you left off</b>.</p>
                  <div className="wd-modal-btns">
                    <button className="btn btn-ghost" onClick={() => setEndState(null)}>Stay here</button>
                    <button className="btn btn-primary" onClick={() => { setEndState(null); goHome() }}><Check size={15} /> OK, back to plan</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {deliverOpen && <DeliverablesPanel sessionId={sessionId} grabFrame={grabFrame} videoRef={videoRef} onClose={() => setDeliverOpen(false)} />}

        {/* Task-complete celebration: a one-shot flourish + a prominent "Start
            another task" that drops back into the new-task flow (onBack -> Home,
            where the goal box lives). Shows on the finished record; the confetti
            fires once (guarded above) and the download bar stays below. */}
        {ended && (
          <div className={`wc-celebrate${celebrate ? ' wc-cele-go' : ''}`} role="status" aria-live="polite">
            {celebrate && <div className="wc-confetti" aria-hidden="true">{confettiNodes(confettiPieces)}</div>}
            <div className="wc-cele-badge"><Check size={26} strokeWidth={2.6} /></div>
            <div className="wc-cele-title">Task complete</div>
            <div className="wc-cele-sub">{steps.length ? `All ${steps.length} step${steps.length === 1 ? '' : 's'} done.` : 'Nicely done.'} Your report and audit log are ready below.</div>
            <button type="button" className="wc-cele-btn" onClick={goHome} title="Start a new task"><Plus size={16} strokeWidth={2.6} /> Start another task</button>
          </div>
        )}

        {/* Completed task: the export + deliverable actions the user asked to keep off the live screen. */}
        {ended && (
          <div className="wc-donebar">
            <span className="wc-donebar-lead"><span className="wc-done-ic"><Check size={15} strokeWidth={2.5} /></span><span>Completed<small>{steps.length ? `${doneCount} of ${steps.length} steps done. ` : ''}Download what you need.</small></span></span>
            <div className="wc-donebar-actions">
              <button className="wc-chip-btn" onClick={() => setDeliverOpen(true)}><FileText size={14} /> Review &amp; prompts</button>
              <DownloadMenu sessionId={sessionId} className="wc-chip-btn" label="Download" onError={(m) => setErr(m)} />
              <button className="wc-chip-btn" onClick={() => window.open(api.workReportUrl(sessionId, false), '_blank')}><Printer size={14} /> Print</button>
            </div>
          </div>
        )}

        {usage && usage.exhausted && (
          <div className="wc-banner danger">
            <AlertTriangle size={16} /> <span className="fill">{usageOutOfTime(usage)}</span>
          </div>
        )}
        {usage && !usage.exhausted && usage.remainingSeconds <= 900 && !dismissedLow && (
          <div className="wc-banner warn">
            <AlertTriangle size={16} /> <span className="fill">{usageLowNote(usage)}</span>
            <button className="wc-tbtn ghost" onClick={() => setDismissedLow(true)}>Dismiss</button>
          </div>
        )}

        {!sess && loadErr ? (
          // The session could not be loaded: say why and offer the two real exits.
          <div className="wc-pre" role="alert">
            <div className="wc-pre-title">Could not open this session</div>
            <div className="wc-pre-sub">{loadErr}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <button className="wc-tbtn primary" onClick={() => { setLoadErr(''); refresh() }}><RefreshCw size={14} /> Try again</button>
              <button className="wc-tbtn" onClick={leaveToPlan}><ChevronLeft size={14} /> Back to plans</button>
            </div>
          </div>
        ) : !sess ? (
          // Loading the session: never show an editable goal form for a session we
          // have not read yet (its Plan button could not work, and it looked like a
          // dead end). Back is in the toolbar above the whole time.
          <div className="wc-loading" aria-busy="true">
            <div className="wc-loading-orb"><span /><span /><span /></div>
            <div className="wc-loading-line on"><Loader2 size={14} className="spin" /><span>Opening your session…</span></div>
          </div>
        ) : steps.length === 0 ? (
          busy ? (
            // First the share prompt (nothing is claimed until the person has
            // shared), then planning: the thinking animation reveals phases, and
            // the view swaps to the step card the moment the plan is ready.
            sharePrompt ? <SharePrompt source={source} /> : <PlanningLoader />
          ) : (
            // Not planning yet (first frame) or screen-share was declined: the
            // goal starter + Plan button as a clean fallback.
            <div className="wc-pre">
              <div className="wc-pre-title">What do you want to get done?</div>
              <div className="wc-pre-sub">Type or paste your goal. It becomes a clear checklist that follows your screen step by step.</div>
              <textarea className="input" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: '100%', resize: 'vertical' }} placeholder="Build an AWS VPC with two public and two private subnets and a NAT gateway." />
              <div className="wc-caprow" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
                {isMobile && <button className="wc-tbtn wc-grow" onClick={takePhoto} disabled={busy} title="Snap a photo of a screen, a device or paper"><Camera size={14} /> {photoFrame ? 'Retake photo' : 'Photo'}</button>}
                <button className="wc-tbtn primary wc-watch" onClick={plan} disabled={busy || !goal.trim()}><Play size={14} /> Plan the steps</button>
              </div>
              {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{err}</div>}
              <div className="wc-pre-help">
                {isMobile ? <Camera size={14} /> : <Monitor size={14} />}
                <span>{isMobile
                  ? 'Tap Photo to snap the screen, device or paper, then Plan reads it.'
                  : <>Share your <b>whole screen</b> (not just a tab) so it can guide you through any app.{floatCapable ? <> Then use <b>Float on top</b> to keep the steps above your work.</> : null}</>}</span>
              </div>
            </div>
          )
        ) : !ended ? (
          // Post-plan, live: one status card. The step hero below is the main view.
          <>
            {/* Pause/Resume, the minutes and the live reading line now live PINNED in
                the header strip above (wc-guidehead) so they never scroll away. This
                row carries only an error or a captured photo, and renders only when
                there is something to show. */}
            {(err || photoFrame) && (
              <div className="wc-guidebar">
                {err && <div style={{ color: 'var(--danger)', fontSize: 13, width: '100%', lineHeight: 1.45 }}>{err}</div>}
                {photoFrame && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <img src={photoFrame} alt="Captured photo" style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button className="wc-tbtn ghost" onClick={clearPhoto} title="Remove this photo"><X size={14} /> Clear photo</button>
                  </div>
                )}
              </div>
            )}
            {/* PLAN-HEAVY MODE (watch-light, set by us for Premium): a calm,
                informational strip - no toggle. It explains that the plan is
                richer and not watched continuously, and carries the prominent
                on-demand check wired to the existing refreshScreen. */}
            {watchLight && (
              <div className="wc-wl">
                <Compass size={16} className="wc-wl-ic" />
                <span className="wc-wl-sub">Your plan is richer and self-contained, and WorkCoPilot is not watching the whole time. Check your progress whenever you want a fresh read.</span>
                <span className="wc-sp" />
                <button type="button" className="wc-tbtn primary wc-wl-check" onClick={refreshScreen} disabled={busy || paused} title="Read the screen once, right now, and update your steps"><ScanLine size={15} /> Check my progress</button>
              </div>
            )}
          </>
        ) : null}
        {/* Finished task: the kicker + title head the read-only record. */}
        {ended && sess && steps.length > 0 && (sess.title || sess.goal) && (
          <>
            <div className="wc-plan-kicker"><Check size={11} /> Finished task</div>
            <div className="wc-plan-title" title={sess.title || sess.goal || ''}>{(sess.title && !/^Session \d/.test(sess.title)) ? sess.title : (sess.goal || '')}</div>
          </>
        )}
        {sess && steps.length > 0 && ended && (
          <div className="wc-readbar">
            <span className="wc-readbar-k">Text size</span>
            <GuideFontControl scale={fsScale} dec={fsDec} inc={fsInc} reset={fsReset} atMin={fsAtMin} atMax={fsAtMax}
              theme={{ border: 'var(--border)', text: 'var(--text)', muted: 'var(--text-muted)', panel: 'var(--surface)', accent: 'var(--em)' }} />
          </div>
        )}
        {ended && err && <div style={{ color: 'var(--danger)', fontSize: 13, lineHeight: 1.45, margin: '0 2px 10px' }}>{err}</div>}
        {/* hidden camera-photo picker, always mounted */}
        <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={onPhotoPicked} style={{ display: 'none' }} />

        {/* Always mounted so the capture ref exists; shown as a live viewfinder
            only for the phone/camera source so you can aim it. The screen source
            is your own screen, so it stays hidden. */}
        <video ref={videoRef} muted playsInline
          style={source === 'camera' && capturing
            ? { display: 'block', width: '100%', maxWidth: 360, margin: '12px auto 0', borderRadius: 12, background: '#000', aspectRatio: '4 / 3', objectFit: 'cover' }
            : { display: 'none' }} />
        {source === 'camera' && capturing && <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Live camera. Aim it at what you need help with.</div>}

        {/* ONE SCREEN AT A TIME (owner direction). The guide view is a sequence
            of single focused screens with a hide/show fade between them: the
            current step + guidance (the hero), or the plan's one question, or
            the stuck check-in, or the short working moment, or the focused
            answer / clearer explanation, then back to the step. Nothing stacks.
            The observation is a quiet "I can see" glance UNDER the step and
            rises above it, amber, only when it caught a problem. The goal is
            one muted, expandable line. */}
        {!ended && steps.length > 0 && (() => {
          const win = stepWindow(steps)
          const cur = win.length ? win[0] : null
          const ci = cur ? cur.index : -1
          const focused = askFocused(askState)
          const flagText = flags.length ? String(flags[0].text || '') : ''
          const prominent = readingIsProminent({ offTrack, flag: flagText, observation })
          const stepVerdict = verdictForStep(verdict, ci)   // only the verdict read for THIS step
          const view = focused ? 'ask:' + askState.phase : clarify ? 'clarify' : done ? 'done' : 'step:' + ci
          const key = 'step-' + ci
          const reading = <ReadingStrip watching={watching} analyzing={analyzing} offTrack={offTrack} observation={observation} flag={flagText} source={source} />
          return (
            <div className="gv" style={{ marginTop: 12 }}>
              <GoalLine title={sess.title} goal={sess.goal} />
              <FadeSwap k={view}>
                {focused ? (
                  <AskFocus ask={askState} steps={askState.planChanged ? applyResume(sess, askState).steps : steps} stepText={cur ? cur.step.text : ''} busy={busy}
                    onAsk={(q) => ask(q, 'stuck')} onDismiss={dismissOffer} onContinue={resumeGuiding} onFollowUp={focusAskBox}
                    renderAnswer={renderAnswer} />
                ) : clarify ? (
                  <>
        {!ended && clarify && (() => {
          // The chips are a best-guess shortlist, so a choice question always
          // also offers "Other" (type your own) and Skip; a text question offers
          // the text box and Skip. Never a forced choice.
          const isChoice = clarify.kind === 'choice' && Array.isArray(clarify.options) && clarify.options.length > 0
          return (
            <div className="wc-clarify" role="group" aria-label="Quick question">
              <div className="wc-clarify-head"><HelpCircle size={13} strokeWidth={2.5} /> Quick question</div>
              <div className="wc-clarify-q">{clarify.question}</div>
              {isChoice && (
                <div className="wc-clarify-chips">
                  {clarify.options.map((opt, i) => (
                    <button key={i} type="button" className="wc-clarify-chip" disabled={busy} onClick={() => submitClarify(opt)}>{opt}</button>
                  ))}
                </div>
              )}
              <form className={`wc-clarify-form${isChoice ? ' other' : ''}`} onSubmit={(e) => { e.preventDefault(); submitClarify(clarifyText) }}>
                {isChoice && <span className="wc-clarify-other-k">Other</span>}
                <input className="wc-clarify-input" type="text" value={clarifyText} onChange={(e) => setClarifyText(e.target.value)} placeholder={isChoice ? 'Type your own answer' : 'Type your answer'} aria-label={isChoice ? `Other answer for: ${clarify.question}` : clarify.question} disabled={busy} />
                <button type="submit" className={`wc-clarify-send${isChoice ? ' quiet' : ''}`} disabled={busy || !clarifyText.trim()}>Send</button>
              </form>
              <div className="wc-clarify-foot">
                <span className="wc-clarify-hint">This refines your next steps.</span>
                <button type="button" className="wc-clarify-skip" disabled={busy} onClick={skipClarify} title="Skip this question. The guide proceeds on a safe assumption.">Not sure? Skip and I will proceed on a safe assumption.</button>
              </div>
            </div>
          )
        })()}
                  </>
                ) : done ? (
                  <div className="wc-alldone"><Check size={16} strokeWidth={2.5} /> Every step is confirmed on screen. End and summarize when you are ready.</div>
                ) : cur ? (
                  <>
                    {prominent && reading}
                    <StepCard step={cur.step} index={ci} total={steps.length} guidance={guidance} confirmN={confirmN} busy={busy}
                      hint={paused
                        ? <span className="gv-step-hint">Paused. Resume to keep this live.</span>
                        : watchLight
                          ? <span className="gv-step-hint">Plan-heavy mode. Tap Check my progress for a fresh read.</span>
                          : !watching && <button type="button" className="gv-step-hint-btn" onClick={startWatching} disabled={busy}>{source === 'screen' ? 'Watch my screen' : 'Watch the camera'} to keep this live <ArrowRight size={11} /></button>}
                      onDone={() => { clearVerdict(); setStep(ci, 'done') }}
                      doneReady={!!(stepVerdict && stepVerdict.kind === VERIFY_DONE)}
                      notice={<VerifyVerdict verdict={stepVerdict} verifying={verifying} onRetry={verifyStep} onDismiss={clearVerdict} />}
                      actions={<VerifyButton onClick={verifyStep} verifying={verifying} disabled={busy || paused} />}
                      extra={<>
                        {/* Grounded-in-your-documents: shows only when the guide marked this
                            step as grounded in the user's own material (else renders nothing). */}
                        <SourceChip source={cur.step.source} />
                        <HowButton open={!!(howTo[key] && howTo[key].open)} loading={!!(howTo[key] && howTo[key].loading)} onClick={() => drillHow(key, cur.step.text, ci)} />
                        <HowDetail entry={howTo[key]} onRetry={() => drillHow(key, cur.step.text, ci)} />
                      </>} />
                    {!prominent && reading}
        {!ended && !clarify && clarifyDone && (
          <div className="wc-clarify-done" role="status">
            <Check size={13} strokeWidth={2.5} />
            <span className="wc-clarify-done-t">
              {clarifyDone.skipped
                ? 'Skipped. I will proceed on a safe assumption.'
                : <>You chose: <b>{clarifyDone.answer}</b>.</>}
            </span>
            <button type="button" className="wc-clarify-undo" disabled={busy} onClick={undoClarify} title={clarifyDone.skipped ? 'Answer this question now' : 'Change your answer'}>{clarifyDone.skipped ? 'Answer it' : 'Change'}</button>
          </div>
        )}

                    {steps.length > 1 && (
                      <div className="gv-nav">
                        <button type="button" className="gv-nav-btn" disabled={ci <= 0} onClick={() => navStep(-1)} title="Go to the previous step"><ChevronLeft size={15} /> Prev</button>
                        <div className="gv-nav-mid">
                          <span className="gv-nav-count">Step {ci + 1} of {steps.length}</span>
                          <div className="gv-nav-track"><div className="gv-nav-fill" style={{ width: `${((ci + 1) / steps.length) * 100}%` }} /></div>
                        </div>
                        <button type="button" className="gv-nav-btn" disabled={ci >= steps.length - 1 || cur.step.status !== 'done'} onClick={() => navStep(1)} title={cur.step.status !== 'done' ? 'Finish this step first. It advances on its own when done.' : 'Go to the next step'}>Next <ChevronRight size={15} /></button>
                      </div>
                    )}
                    {/* the ONE step after this one, as a single quiet line, plus the full plan */}
                    {win[1] && (
                      <div className="gv-next" title={String(win[1].step.text || '')}>
                        <span className="gv-k">Next</span>
                        <span className="gv-next-n">{win[1].index + 1}</span>
                        <span className="gv-next-t"><RichText text={win[1].step.text} accent="var(--gv-muted)" chips={false} /></span>
                      </div>
                    )}
                    {steps.length > 1 && (
                      <div className="wc-plan-bar">
                        <span className="wc-plan-prog">{doneCount} of {steps.length} done</span>
                        <button type="button" className="wc-plan-link" onClick={() => setPlanOpen(true)}>View full plan</button>
                      </div>
                    )}
                  </>
                ) : null}
              </FadeSwap>
            </div>
          )
        })()}

        {/* The finished task: a calm, read-only record of every step. */}
        {ended && steps.length > 0 && (
          <div className="wc-steps ro">
            <div className="wc-record-head"><Check size={13} strokeWidth={2.5} /> What was done. {doneCount} of {steps.length} steps</div>
            {ended && steps.map((s, i) => {
              const isDone = s.status === 'done'
              const tone = isDone ? 'done' : 'skipped'
              return (
                <div key={i} className={`wc-step ${tone}`}>
                  <span className="wc-step-check" aria-hidden="true">{isDone ? <Check size={16} strokeWidth={2.5} /> : <span className="wc-step-num">{i + 1}</span>}</span>
                  <div className="wc-step-body">
                    <div className="wc-step-title"><RichText text={s.text} /></div>
                    <SourceChip source={s.source} />
                    {/* The record shows the commands/code and the step link ONLY for
                        steps the user actually completed - never for "Not reached"
                        steps, so the record can't leak the how-to (or generated code)
                        of work that was never performed. This mirrors the PDF report's
                        completed-only gate. */}
                    {isDone && s.url && <StepLink url={s.url} />}
                    {isDone && ((s.commands && s.commands.length > 0) || (s.code && s.code.content)) && (
                      <DestructiveGate why={s.destructive ? s.destructiveWhy : null}>
                        {s.commands && s.commands.length > 0 && <CmdBlock lines={s.commands} />}
                        {s.code && s.code.content && <CodeBlock file={s.code.file} content={s.code.content} />}
                      </DestructiveGate>
                    )}
                    {isDone && s.doneAt && <div className="wc-step-doneat"><Check size={11} /> Done {(() => { try { return new Date(s.doneAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } catch { return '' } })()}</div>}
                    {!isDone && <div className="wc-step-tag">Not reached</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Read-only FULL PLAN: every step in order with a done / current /
            upcoming marker and the goal at the top. This is the whole plan the
            window summarizes; it is NOT the session report. */}
        {planOpen && steps.length > 0 && (
          <div className="wc-plan-ov" onClick={() => setPlanOpen(false)} role="dialog" aria-modal="true" aria-label="Full plan">
            <div className="wc-plan-card" onClick={(e) => e.stopPropagation()}>
              <div className="wc-plan-head">
                <span className="wc-plan-title">Full plan</span>
                <button className="wc-ib" onClick={() => setPlanOpen(false)} title="Close" aria-label="Close full plan"><X size={16} /></button>
              </div>
              {sess?.goal && <div className="wc-plan-goal"><span className="wc-plan-goal-k">Your goal</span><div className="wc-plan-goal-t">{sess.goal}</div></div>}
              <div className="wc-plan-count">{progressText(steps) || `${doneCount} of ${steps.length} done`}</div>
              <div className="wc-plan-list">
                {steps.map((s, i) => {
                  const mk = planMarker(s, i, steps)
                  return (
                    <div key={i} className={`wc-plan-row ${mk}`}>
                      <span className="wc-plan-badge">{mk === 'done' ? <Check size={13} strokeWidth={2.5} /> : i + 1}</span>
                      <span className="wc-plan-txt"><RichText text={s.text} /></span>
                      {mk === 'current' && <span className="wc-plan-tag">Now</span>}
                      <SourceChip source={s.source} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* MAKE: one calm surface for the three "produce something" actions.
            A quiet tab row (Answer / Write / Compute) opens exactly one panel on
            demand, so there is a single primary action instead of three stacked
            bars. Every handler is unchanged: Answer -> getResult + ResultCard
            (with the Steps/Result/Both scope), Write -> compose + ComposeCard,
            Compute -> on-device parse + compute + ComputeCard. Produced artifacts
            stack below and stay visible after the panel is closed. */}
        {/* MAKE SOMETHING is invoked from the header Tools dropdown and opens as a
            modal. At rest this section renders nothing unless a deliverable is
            ready, in which case small chips reopen it. Engine/handlers unchanged. */}
        {!ended && (maker || resultOut || composeOut || computeOut) && (
          <section className="wc-make" aria-label="Make something from this task">
            {(resultOut || composeOut || computeOut) && !maker && (
              <div className="wc-made-chips">
                <span className="wc-make-kicker">Ready</span>
                {resultOut && <button type="button" className="wc-made-chip" onClick={() => pickMaker('answer')}><Sparkles size={13} /> Answer <ChevronRight size={13} /></button>}
                {composeOut && <button type="button" className="wc-made-chip" onClick={() => pickMaker('write')}><PenLine size={13} /> Document <ChevronRight size={13} /></button>}
                {computeOut && <button type="button" className="wc-made-chip" onClick={() => pickMaker('compute')}><Calculator size={13} /> Computed result <ChevronRight size={13} /></button>}
              </div>
            )}

            {/* PLACEMENT: the chosen tool opens as a focused, clearly-separated
                sheet (its own header, "Deliverable tool" tag, close), never as a
                second input stacked above the fixed "Ask anything" footer. The
                Ask bar stays the single always-visible input. Clicking outside or
                the X closes it via pickMaker (which keeps composeOpen/computeOpen
                truthful). The three panels inside are unchanged. */}
            {maker && (
              <div className="wc-plan-ov" onClick={() => pickMaker(maker)} role="dialog" aria-modal="true" aria-label={maker === 'answer' ? 'Get the answer' : maker === 'write' ? 'Write a deliverable' : 'Compute from a file'}>
                <div className="wc-make-sheet" onClick={(e) => e.stopPropagation()}>
                  <div className="wc-make-sheet-head">
                    <span className="wc-make-sheet-ic">{maker === 'answer' ? <Sparkles size={16} /> : maker === 'write' ? <PenLine size={16} /> : <Calculator size={16} />}</span>
                    <div className="wc-make-sheet-tt">
                      <span className="wc-make-sheet-title">{maker === 'answer' ? 'Get the answer' : maker === 'write' ? 'Write a deliverable' : 'Compute from a file'}</span>
                      <span className="wc-make-sheet-tag">Deliverable tool</span>
                    </div>
                    <div className="wc-make-tabs wc-make-sheet-tabs" role="tablist" aria-label="What to make">
                      <button type="button" role="tab" aria-selected={maker === 'answer'} className={`wc-make-tab${maker === 'answer' ? ' on' : ''}`} onClick={() => maker !== 'answer' && pickMaker('answer')}><Sparkles size={14} /> Answer</button>
                      <button type="button" role="tab" aria-selected={maker === 'write'} className={`wc-make-tab${maker === 'write' ? ' on' : ''}`} onClick={() => maker !== 'write' && pickMaker('write')}><PenLine size={14} /> Write</button>
                      <button type="button" role="tab" aria-selected={maker === 'compute'} className={`wc-make-tab${maker === 'compute' ? ' on' : ''}`} onClick={() => maker !== 'compute' && pickMaker('compute')}><Calculator size={14} /> Compute</button>
                    </div>
                    <button className="wc-ib" onClick={() => pickMaker(maker)} title="Close" aria-label="Close deliverable tool"><X size={16} /></button>
                  </div>
                  <div className="wc-make-sheet-body">

            {/* ANSWER: hand back the real answer, not just the next step. The
                Steps/Result/Both scope only changes emphasis; the guiding flow stays. */}
            {maker === 'answer' && (
              <div className="wc-make-panel" role="tabpanel">
                <div className="wc-make-ctl">
                  <div className="wc-seg" role="tablist" aria-label="What do you want">
                    {[['steps', 'Steps'], ['result', 'Result'], ['both', 'Both']].map(([v, label]) => (
                      <button key={v} type="button" role="tab" aria-selected={scope === v} className={scope === v ? 'on' : ''} onClick={() => setScope(v)}>{label}</button>
                    ))}
                  </div>
                  <span className="wc-result-lead">{scope === 'steps' ? 'Guide me step by step' : 'Get the actual answer, with how I got it'}</span>
                  <span className="wc-sp" />
                  <button className={`wc-ib${pasteOpen ? ' on' : ''}`} onClick={() => setPasteOpen((v) => !v)} disabled={resultBusy} title="Paste data to compute from: a table, numbers, a log, any text" aria-label="Paste data"><ClipboardCopy size={16} /></button>
                  <button className="wc-ib" onClick={() => getResult(true)} disabled={resultBusy} title={source === 'camera' ? 'Snap a photo and compute the result from it' : 'Read the screen and compute the result from it'} aria-label="Compute from the screen">{source === 'camera' ? <Camera size={16} /> : <ScanLine size={16} />}</button>
                  <button className="wc-tbtn primary" onClick={() => getResult(false)} disabled={resultBusy} title="Compute the result for your goal, using any pasted data and the screen if you are sharing it">{resultBusy ? <Loader2 size={14} className="spin" /> : <Sparkles size={15} />} Get the result</button>
                </div>
                {pasteOpen && (
                  <textarea className="wc-result-paste" rows={3} value={pasteData} onChange={(e) => setPasteData(e.target.value)} placeholder="Paste the data to work from here: a table, numbers, a log, a config, or any text. Leave empty to compute from your goal and screen." />
                )}
                {resultErr && <div className="wc-result-err"><AlertTriangle size={14} /> {resultErr}</div>}
                {resultBusy && !resultOut && (
                  <div className="wc-result-load"><Loader2 size={15} className="spin" /> Working out the result{pasteData.trim() ? ' from your data' : ''}…</div>
                )}
              </div>
            )}

            {/* WRITE: draft the full document (letter, report, clause, outline,
                table or code), ready to copy. Nothing is auto-filled. */}
            {maker === 'write' && (
              <div className="wc-make-panel" role="tabpanel">
                <label className="wc-compose-label" htmlFor="wc-compose-want">What do you need? (I give you code, or a ready-to-use prompt for your own AI)</label>
                <textarea id="wc-compose-want" className="wc-compose-want" rows={2} value={composeWant} onChange={(e) => setComposeWant(e.target.value)}
                  placeholder="For example: a SQL query for last month's refunds, or a prompt to draft a vendor follow-up email in your own AI (attach your old thread to it)."
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); compose(false) } }} />
                <div className="wc-make-ctl">
                  <label className="wc-compose-fmt">
                    <span>Format</span>
                    <select value={composeFormat} onChange={(e) => setComposeFormat(e.target.value)}>
                      <option value="">Auto</option>
                      <option value="prompt">Prompt for your AI</option>
                      <option value="code">Code</option>
                      <option value="table">Table</option>
                      <option value="bullets">Bullets</option>
                      <option value="outline">Outline</option>
                    </select>
                  </label>
                  <button type="button" className={`wc-ib${composeSrcOpen ? ' on' : ''}`} onClick={() => setComposeSrcOpen((v) => !v)} disabled={composeBusy} title="Paste source text to write from: an email, a table, numbers, a log, any text" aria-label="Paste source text"><ClipboardCopy size={16} /></button>
                  <button type="button" className="wc-ib" onClick={() => compose(true)} disabled={composeBusy} title={source === 'camera' ? 'Snap a photo and write from what it shows' : 'Read the screen and write from what it shows'} aria-label="Write from the screen">{source === 'camera' ? <Camera size={16} /> : <ScanLine size={16} />}</button>
                  <span className="wc-sp" />
                  <button type="button" className="wc-tbtn primary" onClick={() => compose(false)} disabled={composeBusy} title="Write the document for your goal, using any pasted source and the screen if you are sharing it">{composeBusy ? <Loader2 size={14} className="spin" /> : <PenLine size={15} />} Compose</button>
                </div>
                {composeSrcOpen && (
                  <textarea className="wc-compose-src" rows={3} value={composeSrc} onChange={(e) => setComposeSrc(e.target.value)} placeholder="Paste the source to write from here: an email thread, a table, notes, a clause, or any text. Leave empty to write from your goal and screen." />
                )}
                {composeErr && <div className="wc-compose-err"><AlertTriangle size={14} /> {composeErr}</div>}
                {composeBusy && !composeOut && (
                  <div className="wc-compose-load"><Loader2 size={15} className="spin" /> Writing{composeSrc.trim() ? ' from your source' : ''}…</div>
                )}
              </div>
            )}

            {/* COMPUTE FROM A FILE: privacy-first, on-device data compute. The CSV /
                Excel file is parsed ENTIRELY in the browser; only the column names +
                types + row count are sent to plan a safe computation, re-checked and
                run locally on the full rows. The raw rows never leave the machine. */}
            {maker === 'compute' && (
              <div className="wc-make-panel" role="tabpanel">
                {/* The privacy promise, stated plainly and kept literally true in
                    the code: only { want, schema, rowCount } is ever sent. */}
                <div className="wc-compute-privacy">
                  <ShieldCheck size={15} />
                  <span>Your file is read on your device. Only the column names and types are sent, your data never leaves your machine.</span>
                </div>

                <input ref={computeFileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onComputeFile(f); e.target.value = '' }} />

                {!computeFile && !computeParsing && (
                  <button type="button" className="wc-compute-drop" onClick={() => computeFileRef.current && computeFileRef.current.click()}>
                    <Upload size={20} />
                    <span className="wc-compute-drop-t">Choose a CSV or Excel file</span>
                    <span className="wc-compute-drop-s">.csv, .xlsx or .xls, read right here on your device</span>
                  </button>
                )}

                {computeParsing && (
                  <div className="wc-compute-load"><Loader2 size={15} className="spin" /> Reading your file on this device…</div>
                )}

                {computeFile && (
                  <>
                    <div className="wc-compute-file">
                      <div className="wc-compute-file-head">
                        <span className="wc-compute-file-name"><FileSpreadsheet size={15} /> {computeFile.name}</span>
                        <span className="wc-compute-file-meta">{computeFile.rowCount.toLocaleString()} {computeFile.rowCount === 1 ? 'row' : 'rows'} · {computeFile.schema.length} {computeFile.schema.length === 1 ? 'column' : 'columns'}</span>
                        <button type="button" className="wc-compute-change" onClick={() => computeFileRef.current && computeFileRef.current.click()} title="Choose a different file">Change</button>
                      </div>
                      <div className="wc-compute-chips">
                        {computeFile.schema.map((col, i) => (
                          <span key={i} className={`wc-compute-chip t-${col.type}`}><b>{col.name}</b><i>{col.type}</i></span>
                        ))}
                      </div>
                    </div>

                    <label className="wc-compute-label" htmlFor="wc-compute-want">What should I compute?</label>
                    <textarea id="wc-compute-want" className="wc-compute-want" rows={2} value={computeWant} onChange={(e) => setComputeWant(e.target.value)}
                      placeholder="For example: total revenue by region, the average order value, how many orders over $500, or the top 10 customers by spend."
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); compute() } }} />
                    <div className="wc-make-ctl">
                      <span className="wc-sp" />
                      <button type="button" className="wc-tbtn primary" onClick={compute} disabled={computeBusy}>{computeBusy ? <Loader2 size={14} className="spin" /> : <Calculator size={15} />} Compute</button>
                    </div>
                  </>
                )}

                {computeErr && <div className="wc-compute-err"><AlertTriangle size={14} /> {computeErr}</div>}
                {computeNeed && (
                  <div className="wc-compute-need"><AlertTriangle size={15} /><span><b>I need:</b> {computeNeed}</span></div>
                )}
                {computeBusy && !computeOut && (
                  <div className="wc-compute-load"><Loader2 size={15} className="spin" /> Planning the computation. Only the column names and types are sent…</div>
                )}
              </div>
            )}

                    {/* Results live INSIDE the modal (with their copy/clear buttons),
                        under the tool's panel; they persist after closing and the
                        "Ready" chips reopen them. */}
                    {maker === 'answer' && resultOut && (
                      <div className="wc-made">
                        <ResultCard result={resultOut} security={resultSec} policy={resultPol} />
                        <SourceChip source={resultOut.source} />
                        <button className="wc-tbtn ghost" onClick={() => { setResultOut(null); setResultSec(null); setResultPol(null) }} title="Clear this result"><X size={14} /> Clear result</button>
                      </div>
                    )}
                    {maker === 'write' && composeOut && (
                      <div className="wc-made">
                        <ComposeCard compose={composeOut} security={composeSec} policy={composePol} />
                        <SourceChip source={composeOut.source} />
                        <button type="button" className="wc-tbtn ghost" onClick={() => { setComposeOut(null); setComposeSec(null); setComposePol(null) }} title="Clear this document"><X size={14} /> Clear document</button>
                      </div>
                    )}
                    {maker === 'compute' && computeOut && (
                      <div className="wc-made">
                        <ComputeCard result={computeOut.result} explanation={computeOut.explanation} caveat={computeOut.caveat} spec={computeOut.spec} fileName={computeFile && computeFile.name} />
                        <button type="button" className="wc-tbtn ghost" onClick={clearCompute} title="Clear this result and file"><X size={14} /> Clear result</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {ended && sess.summary && (
          <div className="wc-sum">
            <div className="wc-sum-title"><FileText size={15} /> Session summary</div>
            <AnswerBody text={sess.summary} />
          </div>
        )}
        </div>
        {rails && (
          <aside className="wc-rail wc-rail-r" aria-label="Controls">
            <div className="wc-rail-card">
              <div className="wc-rail-status">
                <span className={`wc-statuschip${live ? ' live' : ''}${paused ? ' paused' : ''}`} title={chip.title}><span className="wc-sdot" />{chip.label}</span>
                {usage && <span className={`wc-min${usage.exhausted ? ' low' : ''}`}><span className="wc-dot" /> {usageTimeLeft(usage)}</span>}
              </div>
              {watchLight
                ? <button type="button" className="wc-tbtn primary wc-rail-wide" onClick={refreshScreen} disabled={busy || paused}><ScanLine size={15} /> Check my progress</button>
                : paused
                  ? <button className="wc-tbtn resume wc-rail-wide" onClick={togglePause}><Play size={15} /> Resume</button>
                  : watching
                    ? <button className="wc-tbtn pause wc-rail-wide" onClick={togglePause}><Square size={13} /> Pause</button>
                    : <button className="wc-tbtn primary wc-rail-wide" onClick={startWatching} disabled={busy}><Eye size={15} /> {source === 'screen' ? 'Watch my screen' : 'Watch the camera'}</button>}
            </div>
            <div className="wc-rail-card">
              <div className="wc-rail-k"><Sparkles size={12} /> Make something</div>
              <button type="button" className="wc-rail-btn" onClick={() => pickMaker('answer')}><Sparkles size={14} /> Answer</button>
              <button type="button" className="wc-rail-btn" onClick={() => pickMaker('write')}><PenLine size={14} /> Write</button>
              <button type="button" className="wc-rail-btn" onClick={() => pickMaker('compute')}><Calculator size={14} /> Compute</button>
            </div>
            <div className="wc-rail-card">
              <div className="wc-rail-k"><ScanLine size={12} /> Screen</div>
              {!watchLight && <button type="button" className="wc-rail-btn" disabled={busy || paused} onClick={refreshScreen}><ScanLine size={14} /> Read my screen</button>}
              <button type="button" className="wc-rail-btn" disabled={busy} onClick={() => analyze(question, true)}><Zap size={14} /> Deep pass</button>
              {!isMobile && <button type="button" className="wc-rail-btn" onClick={openFullGuide}><Monitor size={14} /> Full guide</button>}
              <button type="button" className="wc-rail-btn quiet" disabled={busy} onClick={endSession}>End session</button>
            </div>
          </aside>
        )}
      </div></div>
      ) })()}

      {/* FIXED FOOTER: the "Ask a question" bar is pinned to the bottom, always
          reachable without scrolling. It uses the whole session (goal + plan +
          what is on screen) to answer and keep you moving. The answer appears
          above the row inside the footer. The re-plan-keeps-progress behaviour is
          the server's (addContext merges steps, preserving done ones) - untouched. */}
      {sess && !ended && (
        <div className="wc-fixedfoot"><div className="wc-shellw">
          <div className="wc-ask">
            <div className="wc-ask-row wc-askrow">
              <input ref={contextFileRef} type="file" accept="image/*,.txt,.md,.markdown,.csv,.tsv,.json,.log,.yml,.yaml,.xml,.html,.htm" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) attachContext(f, question); e.target.value = '' }} />
              <textarea ref={askBoxRef} className="input wc-ask-ta" rows={1} placeholder={askState.phase === ASK_OFFER ? 'Tell me what is in the way' : askFocused(askState) ? 'Ask a follow-up' : source === 'camera' ? 'Ask about what the camera sees' : 'Ask anything, paste an error, or attach a screenshot or document for the next move'} value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }} onPaste={(e) => { const items = e.clipboardData && e.clipboardData.items; if (!items) return; for (const it of items) { if (it.type && it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) { e.preventDefault(); attachContext(f, question); return } } } }} />
              <button className="wc-ib" onClick={() => contextFileRef.current && contextFileRef.current.click()} disabled={busy} title="Attach a screenshot, photo, or document. It is considered and your steps update if needed." aria-label="Attach a screenshot or document"><Paperclip size={16} /></button>
              <button className="wc-ib" onClick={() => analyze(question)} disabled={busy} title={source === 'camera' ? 'Snap a photo and read it now' : 'Read the screen right now'} aria-label="Read the screen now">{source === 'camera' ? <Camera size={16} /> : <ScanLine size={16} />}</button>
              <button className="wc-ib" onClick={() => doResearch(question)} disabled={busy} title="Look up the latest on the web, then answer" aria-label="Research on the web"><Globe size={16} /></button>
              <button className="wc-tbtn primary" onClick={ask} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={16} />} Ask</button>
            </div>
          </div>
        </div></div>
      )}

      {pipWin && createPortal(
        <FloatPanel
          steps={steps} watching={watching} observation={observation} guidance={guidance}
          flags={flags} ask={askState} onContinue={resumeGuiding} onDismissOffer={dismissOffer} busy={busy} analyzing={analyzing} err={err}
          level={level} onLevel={setLevel}
          done={done} ended={ended} celebrate={celebrate} floatQ={floatQ} setFloatQ={setFloatQ} goal={goal} title={sess && sess.title}
          fontScale={{ scale: fsScale, dec: fsDec, inc: fsInc, reset: fsReset, atMin: fsAtMin, atMax: fsAtMax }}
          theme={floatTheme} onToggleTheme={() => setFloatTheme((t) => t === 'light' ? 'dark' : 'light')}
          usage={usage} paused={paused} onPause={togglePause}
          onDeep={() => analyze(floatQ.trim(), true)}
          onResearch={() => doResearch(floatQ.trim())}
          onAsk={(q, kind) => { ask(q, kind); setFloatQ('') }}
          onAnalyze={analyze}
          onAddContext={async (file) => { await attachContext(file, floatQ.trim()); setFloatQ('') }}
          onStep={setStep}
          onNav={navStep}
          onWatch={watching ? pauseWatching : startWatching}
          onVerify={verifyStep} verifying={verifying} verdict={verdict} onVerdictDismiss={clearVerdict}
          onEnd={endSession}
          onClose={closeFloat}
          onStartAnother={() => { closeFloat(); try { window.focus() } catch { /* best-effort */ } goHome() }}
        />, pipWin.document.body)}
    </div>
  )
}

// Route entry: the guiding console for /work/session/:id. The session id is the
// URL (deep-linkable + reload-safe), replacing the old openId/wc_open prop. The
// guide/watch loop inside Console is unchanged; onBack returns to the dashboard
// and onGuard raises the shared guard notice via the app shell.
export default function Guiding() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, sess, showGuard } = useWorkApp()
  const watchLight = !!((user && user.watchLight) || (sess && sess.watchLight))
  return <Console sessionId={id} watchLight={watchLight} onBack={() => navigate('/work')} onGuard={showGuard} />
}
