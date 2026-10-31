// ===========================================================================
// Goal / title tokenizer for workflow matching, in any script.
//
// The matcher (work.js workflowGoalSignature, workflow_playback.js
// pickPublishedWorkflow) compares the task words of a goal with the words of a
// workflow title. It used to keep only [a-z0-9], so a goal in Japanese, Chinese,
// Korean, Thai, Arabic, Hindi or Russian lost every word and could never match.
//
// Pipeline (pure, deterministic):
//   1. NFKC + lower case; emails, URLs and the English possessive 's dropped.
//   2. Split on anything that is not a letter, mark or digit (Unicode), and at
//      every boundary between a spaced script (Latin, digits) and a CJK / Hangul
//      / Thai run ("Oktaで" -> "okta", "で").
//   3. Runs in scripts written without spaces are cut into words with
//      Intl.Segmenter (word granularity, dictionary based for Chinese, Japanese,
//      Thai). Without Intl.Segmenter, CJK and Thai runs fall back to character
//      bigrams.
//   4. Stopwords (per language, function words only) are dropped per word.
//   5. Han / Kana / Hangul words longer than two characters become character
//      bigrams ("ユーザー" -> "ユー", "ーザ", "ザー"), so compounds and inflected
//      forms that the dictionary cuts differently still share tokens. Korean
//      particles at the end of a word are removed first ("사용자를" -> "사용자").
//   6. Arabic: alef forms unified and the article "ال" (with a leading و/ب/ف/ل)
//      removed, so "المستخدم" and "مستخدم" match.
// ASCII text is tokenized exactly as before (the existing tests pin it).
// ===========================================================================

const RE_SPLIT = /[^\p{L}\p{M}\p{N}]+/gu
const CJK_CHAR = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}\\u30FC'
const NOSPACE_CHAR = `${CJK_CHAR}\\p{Script=Thai}\\p{Script=Lao}\\p{Script=Khmer}\\p{Script=Myanmar}`
const RE_HAS_NOSPACE = new RegExp(`[${NOSPACE_CHAR}]`, 'u')
const RE_ALL_CJK = new RegExp(`^[${CJK_CHAR}]+$`, 'u')
// A single character that is a word on its own: one Han or Hangul character, or
// one Thai / Lao / Khmer / Myanmar syllable with its marks ("ผู้").
const RE_ONE_CHAR_WORD = /^(?:[\p{Script=Han}\p{Script=Hangul}]|[\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]\p{M}*)$/u
const RE_HANGUL = /\p{Script=Hangul}/u
const RE_ARABIC = /\p{Script=Arabic}/u
const RE_LATIN_WORD = /^\p{Script=Latin}+$/u
const RE_NUMBER = /^v?\p{N}+$/u
// A boundary between a spaced-script character and a no-space-script character.
const RE_SCRIPT_EDGE = new RegExp(`(?<=[\\p{Script=Latin}\\p{Script=Cyrillic}\\p{N}])(?=[${NOSPACE_CHAR}])|(?<=[${NOSPACE_CHAR}])(?=[\\p{Script=Latin}\\p{Script=Cyrillic}\\p{N}])`, 'gu')

// Function words only: never a task word. Grouped by language for review.
const STOP = new Set([
  // English (the original list, unchanged)
  'a', 'an', 'the', 'my', 'our', 'your', 'their', 'his', 'her', 'its', 'for',
  'to', 'of', 'in', 'on', 'at', 'with', 'and', 'or', 'but', 'from', 'by',
  'into', 'as', 'is', 'are', 'be', 'this', 'that', 'these', 'those', 'i', 'we',
  'you', 'they', 'it', 'me', 'us', 'them', 'do', 'does', 'please', 'can', 'how',
  'want', 'wants', 'need', 'needs', 'using', 'use',
  // Japanese
  'の', 'を', 'に', 'で', 'は', 'が', 'と', 'へ', 'や', 'も', 'から', 'まで', 'より', 'する', 'します', 'したい', 'して', 'ます', 'です',
  'ため', 'こと', 'もの', '方法', 'やり方', 'どう', 'どうやって', 'ください', 'たい', 'いい', 'ですか', 'には', 'では',
  // Chinese (simplified and traditional)
  '的', '了', '在', '是', '我', '把', '给', '給', '中', '和', '到', '如何', '怎么', '怎麼', '怎样', '怎樣', '一个', '一個', '个', '個',
  '请', '請', '要', '想', '需要', '用', '使用', '里', '裡', '上', '对', '對', '为', '為', '吗', '嗎', '呢', '我们', '我們',
  // Korean
  '에서', '에', '을', '를', '이', '가', '은', '는', '의', '로', '으로', '와', '과', '및', '방법', '어떻게', '하는', '하기', '하려면', '하고', '싶어요', '싶습니다',
  // Thai
  'วิธี', 'การ', 'ที่', 'ใน', 'และ', 'ของ', 'ให้', 'กับ', 'จะ', 'ได้', 'อย่างไร', 'ยังไง', 'ต้องการ', 'ช่วย', 'บน', 'เพื่อ',
  // Arabic (after normalization)
  'كيف', 'كيفية', 'في', 'من', 'على', 'الى', 'عن', 'مع', 'او', 'ثم', 'هذا', 'هذه', 'اريد', 'اود', 'طريقة',
  // Hindi
  'में', 'मे', 'का', 'की', 'के', 'को', 'से', 'पर', 'है', 'हैं', 'और', 'या', 'एक', 'कैसे', 'करें', 'करना', 'मुझे', 'चाहिए', 'चाहता', 'चाहती',
  // Russian
  'как', 'в', 'во', 'на', 'и', 'или', 'с', 'со', 'для', 'по', 'из', 'к', 'о', 'об', 'что', 'это', 'мне', 'нужно', 'хочу', 'надо', 'пожалуйста',
])

// Korean endings removed from a word of three or more syllables: the "do"
// verb endings on a noun ("생성하는" -> "생성"), then particles ("사용자를" ->
// "사용자"). Longest first; at least two syllables always remain.
const KO_PARTICLES = ['하려면', '합니다', '하는', '하기', '하다', '해요', '하고', '에서', '으로', '에게', '부터', '까지', '을', '를', '은', '는', '이', '가', '의', '로', '와', '과', '도', '에']

let segmenter = null
try {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') segmenter = new Intl.Segmenter(undefined, { granularity: 'word' })
} catch { segmenter = null }

// Characters with their combining marks kept on (Thai vowel and tone marks,
// Devanagari signs), so a bigram never starts on a bare mark.
const chars = (w) => String(w).match(/\P{M}\p{M}*|\p{M}+/gu) || []
function bigrams(w) {
  const c = chars(w)
  if (c.length <= 2) return [w]
  const out = []
  for (let i = 0; i < c.length - 1; i++) out.push(c[i] + c[i + 1])
  return out
}

function normArabic(w) {
  let x = w.replace(/[ً-ْـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
  const m = /^(?:[وبفل]?ال|لل)(.{3,})$/u.exec(x)
  if (m) x = m[1]
  return x
}

function stripKoParticle(w) {
  if (chars(w).length < 3) return w
  for (const p of KO_PARTICLES) if (w.endsWith(p) && chars(w).length - chars(p).length >= 2) return w.slice(0, w.length - p.length)
  return w
}

// One spaced chunk (no separators inside) -> its words.
function wordsOfChunk(chunk, { useSegmenter }) {
  if (!RE_HAS_NOSPACE.test(chunk)) return [chunk]
  // One or two Han / Kana / Hangul characters standing alone are a word as they
  // are. This also makes the tokenizer stable on its own output: a stored
  // signature ("ユー ーザ 作成") tokenizes back to the same tokens.
  if (RE_ALL_CJK.test(chunk) && chars(chunk).length <= 2) return [chunk]
  if (useSegmenter && segmenter) {
    const out = []
    for (const s of segmenter.segment(chunk)) if (s.isWordLike) out.push(s.segment)
    return out
  }
  // Fallback without Intl.Segmenter: each no-space run becomes bigrams (marked so
  // the bigram step does not cut them again).
  const out = []
  for (const run of chunk.split(RE_SCRIPT_EDGE)) {
    if (RE_HAS_NOSPACE.test(run)) for (const b of bigrams(run)) out.push({ gram: b })
    else if (run) out.push(run)
  }
  return out
}

// Text -> ordered, de-duplicated task tokens.
//   opts.useSegmenter: false forces the bigram fallback (tests).
export function goalTokens(text, opts = {}) {
  const useSegmenter = opts.useSegmenter !== false
  const base = String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, ' ')   // drop emails
    .replace(/https?:\/\/\S+/g, ' ')             // drop URLs
    .replace(/['’]s\b/g, '')                     // strip possessive 's
  const chunks = base.replace(RE_SCRIPT_EDGE, ' ').replace(RE_SPLIT, ' ').trim().split(/\s+/).filter(Boolean)
  const tokens = []
  const push = (w) => { if (w && !tokens.includes(w)) tokens.push(w) }
  for (const chunk of chunks) {
    for (const raw of wordsOfChunk(chunk, { useSegmenter })) {
      if (raw && typeof raw === 'object') { if (!STOP.has(raw.gram)) push(raw.gram); continue }
      let w = raw
      if (RE_ARABIC.test(w)) w = normArabic(w)
      if (STOP.has(w)) continue
      if (RE_HANGUL.test(w)) { w = stripKoParticle(w); if (STOP.has(w)) continue }
      if (RE_NUMBER.test(w)) continue                    // pure number, year, or v<n>: a volatile specific
      if (chars(w).length < 2 && !RE_ONE_CHAR_WORD.test(w)) continue   // stray single chars (e.g. the "x" from "2024.x"), unless a word on its own
      // A bigram that is itself a function word is dropped too, so a stored
      // signature re-tokenizes to the same tokens.
      if (RE_ALL_CJK.test(w)) { for (const b of bigrams(w)) if (!STOP.has(b)) push(b); continue }
      if (RE_LATIN_WORD.test(w) && w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1)  // light singular
      push(w)
    }
  }
  return tokens
}

// The tokenizer as it was before this module ([a-z0-9] words only). Kept ONLY to
// compare with signatures stored by it: a private-brain template distilled from
// "Créer un utilisateur" was stored as "cr er un utilisateur", and the matcher
// scores a goal against such a template both ways and keeps the better score,
// so no stored template matches worse than it did. Never used to store anything.
export function legacyGoalTokens(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/['’]s\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim().split(/\s+/).filter(Boolean)
  const tokens = []
  for (let w of words) {
    if (w.length < 2) continue
    if (/^v?\d+$/.test(w)) continue
    if (STOP.has(w)) continue
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1)
    if (!tokens.includes(w)) tokens.push(w)
  }
  return tokens
}

// App / product names compare on the same Unicode-aware words (lower case,
// separators to spaces). ASCII input gives exactly the old [a-z0-9] result.
export function unicodeWords(v) {
  return String(v || '').normalize('NFKC').toLowerCase().replace(RE_SPLIT, ' ').trim().split(/\s+/).filter(Boolean)
}

export const hasSegmenter = () => !!segmenter

export default { goalTokens, unicodeWords, hasSegmenter }
