import { useState } from 'react'
import { Copy, Check, Volume2 } from 'lucide-react'
import { scrubForRender, scrubGuidance } from '../../server/ai_language.js'
import { useT } from '../i18n/index.jsx'

// Renders an answer as plain prose, EXCEPT fenced code blocks, which become
// real code panels with a copy button. Prose stays undecorated - no bold, no
// bullets, no markdown parsing - because the operator asked for clean text;
// code is the one exception, since it has to be copied out verbatim.
export function splitSegments(text) {
  const out = []
  const re = /```[ \t]*([A-Za-z0-9+#._-]*)[ \t]*\r?\n([\s\S]*?)```/g
  let last = 0
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: 'text', body: text.slice(last, m.index) })
    out.push({ type: 'code', lang: m[1] || '', body: m[2].replace(/\s+$/, '') })
    last = re.lastIndex
  }
  if (last < text.length) out.push({ type: 'text', body: text.slice(last) })
  return out.filter((s) => s.body.trim())
}

// A line the candidate can SPEAK is marked by the model with a comment note:
//   const q = sanitize(raw)   // SAY: first I clean the input so nothing bad gets in
// We pull out the spoken note (in the candidate's own voice) and highlight it, so
// they can glance at the line and say it without reading the whole file. The raw
// "// SAY:" marker is never shown; the note is shown bold + coloured instead.
const SAY_RE = /^(.*?)\s*(?:\/\/|#|--|;|%|<!--)\s*SAY:\s*(.+?)\s*(?:-->)?\s*$/i

function codeForCopy(body) {
  // Copy clean code: strip the spoken-note comments so what lands in the editor
  // is just the code, not the read-aloud annotations.
  return body.split('\n').map((line) => {
    const m = line.match(SAY_RE)
    return m ? m[1].replace(/\s+$/, '') : line
  }).join('\n').replace(/\n{3,}/g, '\n\n')
}

function CodeBlock({ lang, body }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    const selected = String(window.getSelection?.() || '').trim()
    try {
      await navigator.clipboard.writeText(selected || codeForCopy(body))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable - the text is still selectable by hand */ }
  }
  const lines = body.split('\n')
  return (
    <div className="ab-code">
      <div className="ab-code-bar">
        <span>{lang || 'code'}</span>
        <button className="ab-copy" onClick={copy} title={t('answerBody.copyCodeTip')}>
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? t('widgets.copy.copied') : t('widgets.copy.copy')}
        </button>
      </div>
      <div className="ab-code-lines">
        {lines.map((line, i) => {
          const m = line.match(SAY_RE)
          if (m) {
            return (
              <div key={i} className="ab-cl speak">
                <span className="ab-cl-code">{m[1].replace(/\s+$/, '') || ' '}</span>
                <span className="ab-cl-say"><Volume2 size={11} /> {m[2]}</span>
              </div>
            )
          }
          return <div key={i} className="ab-cl">{line || ' '}</div>
        })}
      </div>
    </div>
  )
}

// The ONE canonical "I could not understand / cannot answer" line (kept in sync
// with REPEAT_LINE in server/ai_language.js and the unclearQuestionGuard prompt
// block). When the model genuinely cannot tell what was asked - or a robotic
// refusal got normalised by deRefuse - the whole answer is just this line, and we
// render it in RED + UNDERLINE + BOLD so the candidate instantly sees "it did not
// understand, ask them to repeat" instead of mistaking it for a real answer. We
// stay tolerant of the older phrasings too ("could you say that again?").
const REPEAT_RE = /^\s*(?:i\s*am\s*sorry|sorry)[,.\s]+(?:can|could)\s+you\s+(?:please\s+)?(?:repeat\s+the\s+question|repeat\s+that|say\s+that\s+again)\s*[?.]?\s*$/i

// TWO renderings of the same text, ONE switch (`spoken`):
//   spoken=false (the default): clean PROSE for a work surface. WorkCoPilot's
//     only consumer is the session summary (Guiding.jsx), which is read, not
//     read aloud. The text goes through scrubGuidance (the WorkCoPilot scrubber:
//     strips any {PAUSE} / {THINK} delivery token, never injects one, keeps
//     fences and inline code intact); punctuation renders as plain text.
//   spoken=true: the interview-era SPOKEN delivery - scrubForRender (which
//     injects {PAUSE} beats), pause tokens as dot chips, sentence punctuation
//     painted as red pause marks - for an answer read aloud under pressure.
// Shared by both: paragraphs / bullet lists, **bold** and ==critical==
// highlights, fenced code panels (CodeBlock) and the red repeat line above.
// Class-killer: a work summary used to pick up the spoken decorations because
// the only path was the spoken one; a token in the text (or three plain
// sentences, which scrubForRender turns into a {PAUSE}) rendered as ". . . ."
// dots and reddish stops. Prose is now the default, so no new consumer can
// fall into the spoken path by omission.
export default function AnswerBody({ text, spoken = false }) {
  const raw = String(text || '')
  const cleanAI = spoken ? scrubForRender : scrubGuidance
  // Scrub once up front so a robotic refusal already collapsed to the repeat line
  // is caught here (deRefuse runs inside scrubForRender).
  const clean = cleanAI(raw).trim()
  if (clean && REPEAT_RE.test(clean)) {
    return (
      <div className="ab-text">
        <p className="ab-p"><span className="ab-repeat">{clean}</span></p>
      </div>
    )
  }
  const segs = splitSegments(raw)
  if (!segs.length) return null
  return (
    <>
      {segs.map((s, i) => s.type === 'code'
        ? <CodeBlock key={i} lang={s.lang} body={s.body} />
        : <ProseText key={i} body={s.body.trim()} spoken={spoken} cleanAI={cleanAI} />)}
    </>
  )
}

// Prose is plain, EXCEPT critical points the model wraps in **double asterisks**,
// which render bold + underlined + highlighted so the candidate can spot and
// stress them at a glance. Split into paragraphs on blank lines. The ** markers
// themselves are never shown.
// Delivery pause cues (spoken only): the model marks natural break points with
// {PAUSE} (or {....} / {…}). We show them as a small highlighted "pause" chip so
// the candidate sees where to slow down when reading aloud; the raw token is
// never shown as text.
// Colour sentence punctuation RED (spoken only) so the candidate SEES exactly
// where to pause when reading aloud: a comma / semicolon / colon is a short
// breath, and a full stop (or ? or !) is a hard stop. Pausing at these is what
// makes a read-out answer sound spoken instead of rushed like an essay. Full
// stops get a slightly stronger mark than commas, since the stop is longer.
function punctNodes(text, keyBase) {
  return String(text).split(/([,.;:!?]+)/).map((seg, i) => {
    if (!seg) return null
    if (!/^[,.;:!?]+$/.test(seg)) return <span key={`${keyBase}-tx${i}`}>{seg}</span>
    const hardStop = /[.!?]/.test(seg)
    return <span key={`${keyBase}-pm${i}`} className={`ab-pausemark${hardStop ? ' hard' : ''}`} aria-hidden="true">{seg}</span>
  })
}

const PAUSE_TOKEN = /^\{(?:PAUSE|\.{2,}|…+)\}$/i
// {THINK}: a longer, deliberate "pause and think for a second or two" cue, shown
// as four dots, a bold + underlined THINK, then four dots - so the candidate takes
// a real beat before continuing (stronger than a plain {PAUSE} breath).
const THINK_TOKEN = /^\{THINK\}$/i
const DELIVERY_SPLIT = /(\{PAUSE\}|\{THINK\}|\{\.{2,}\}|\{…+\})/gi
function withPauses(text, keyBase, t) {
  return String(text).split(DELIVERY_SPLIT).map((chunk, i) => {
    if (!chunk) return null
    if (THINK_TOKEN.test(chunk)) return <span key={`${keyBase}-${i}`} className="ab-think" aria-label={t('answerBody.thinkAria')} title={t('answerBody.thinkTip')}>. . . . <b><u>THINK</u></b> . . . .</span>
    if (PAUSE_TOKEN.test(chunk)) return <span key={`${keyBase}-${i}`} className="ab-pause" aria-label={t('answerBody.pauseAria')} title={t('answerBody.pauseTip')}>. . . .</span>
    return <span key={`${keyBase}-${i}`}>{punctNodes(chunk, `${keyBase}-${i}`)}</span>
  })
}

// The prose path: a delivery token that survived the scrubber (one glued to a
// word, say) is dropped, never shown; punctuation is just text.
function plainText(text) {
  return String(text).replace(DELIVERY_SPLIT, '').replace(/[ \t]{2,}/g, ' ').replace(/ +([.,;:])/g, '$1')
}

// A chunk of prose -> **bold** words highlighted; the rest spoken (pause chips
// + red marks) or plain.
function withBold(text, keyBase, spoken, t) {
  return String(text).split(/\*\*([^*]+?)\*\*/g).map((seg, i) => i % 2 === 1
    ? <mark key={`${keyBase}-b${i}`} className="ab-key">{spoken ? seg : plainText(seg)}</mark>
    : <span key={`${keyBase}-s${i}`}>{spoken ? withPauses(seg, `${keyBase}-${i}`, t) : plainText(seg)}</span>)
}

// ==critical sentence== (odd indices) then **bold** words (+ pauses when spoken)
// inside each part, so a whole key sentence highlights and bold words too.
function renderInline(text, key, spoken, t) {
  return String(text).split(/==([^=]+?)==/g).map((seg, ci) => ci % 2 === 1
    ? <mark key={`${key}-c${ci}`} className="ab-crit">{withBold(seg, `${key}-c${ci}`, spoken, t)}</mark>
    : <span key={`${key}-n${ci}`}>{withBold(seg, `${key}-n${ci}`, spoken, t)}</span>)
}

// Clean the AI-language tells at RENDER time (zero cost on the generation path),
// using the canonical scrubbers shared with the server (server/ai_language.js):
// em/en dashes -> commas, semicolons -> full stops, hard/tongue-twister words ->
// simple spoken ones, robotic step-markers -> spoken sequencing, and tacked-on
// value-wrap / empty restating closers stripped. So a LIVE streamed answer reads
// exactly like a curated one. Prose only; code blocks are handled separately and
// never reach here. One source of truth means a new tell is fixed in ONE place.
function ProseText({ body, spoken, cleanAI }) {
  const t = useT()
  // Flowing speech by default, BUT real bullet lists must render as bullets. The
  // model marks a bullet with a leading -, *, or •. We group consecutive bullet
  // lines into a <ul>; everything else is prose. Within a prose block single line
  // breaks collapse to spaces (one spoken paragraph), but a bullet line always
  // starts its own item, so bullets are never flattened into a paragraph. Blank
  // lines separate blocks. Code blocks are handled separately and untouched.
  const lines = cleanAI(body).split('\n')
  const blocks = []
  let para = []
  let list = []
  const flushPara = () => { const t = para.join(' ').replace(/\s+/g, ' ').trim(); if (t) blocks.push({ type: 'p', text: t }); para = [] }
  const flushList = () => { if (list.length) blocks.push({ type: 'ul', items: list.slice() }); list = [] }
  for (const raw of lines) {
    const line = raw.trim()
    const m = line.match(/^[-*•]\s+(.*)$/)
    if (m) { flushPara(); if (m[1].trim()) list.push(m[1].trim()) }
    else if (!line) { flushPara(); flushList() }
    else { flushList(); para.push(line) }
  }
  flushPara(); flushList()
  if (!blocks.length) return null
  return (
    <div className="ab-text">
      {blocks.map((b, bi) => b.type === 'ul'
        ? <ul key={bi} className="ab-ul">{b.items.map((it, ii) => <li key={ii} className="ab-li">{renderInline(it, `u${bi}-${ii}`, spoken, t)}</li>)}</ul>
        : <p key={bi} className="ab-p">{renderInline(b.text, `p${bi}`, spoken, t)}</p>)}
    </div>
  )
}
