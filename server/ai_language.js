// ============================================================================
// AI-LANGUAGE SCRUBBER - the SINGLE SOURCE OF TRUTH for killing "AI-sounding"
// tells in spoken interview answers. This is the CLASS-KILLER: every known tell
// lives in ONE place, both the server (curated/prep generation) and the client
// (live render) scrub through THESE functions, and ai_language.test.mjs gates it
// so a new instance of any known tell fails the build.
//
// RULE (do not regress): when a new AI-sounding pattern is reported, ADD it here
// (a regex here + a case in the CATALOG below) - never patch it inline in index.js
// or AnswerBody.jsx. Pure functions, no side effects, safe to import anywhere.
// Every function skips fenced ```code``` blocks and leaves real content intact.
// ============================================================================

// --- 1. HARD / TONGUE-TWISTER WORD SWAPS (SUPREME RULE, platform-wide) ---------
// No one is writing an English exam. For a non-native speaker, every ORDINARY
// hard, formal or tongue-twister word is swapped for the simple everyday word a
// real person would say out loud. CRITICAL GUARD (never degrade): this list ONLY
// swaps ordinary words - it NEVER touches a real TECHNICAL or BUSINESS term that
// carries meaning (vulnerability, remediation, mitigate, mitigation, encryption,
// compliance, authenticate, configure, deploy, pipeline, implement, orchestrate,
// prioritize, and the like stay EXACTLY as written). Case is preserved; word
// boundaries only; code blocks are skipped. Add ordinary hard words here as they
// come up - this is the single place the swap lives.
//
// MEANING IS SACRED: only a swap that is a TRUE synonym in essentially every
// context goes here. Any word whose simple alternative could shift the meaning by
// context (maintain/keep, establish/set-up, conduct/run, fundamental/basic,
// significant/big) is deliberately LEFT OUT - the prompt lets the model simplify
// those in-context where meaning is safe. The scrubber must never change what the
// sentence actually says.
export const WORD_SWAPS = [
  // NOTE: "remediate" and "identify" are KEPT as real security/business terms
  // (not swapped) - a professional uses them ("identify and remediate").
  // utilize / leverage -> use
  [/\butiliz(?:e|es)\b/g, 'use'], [/\butilizing\b/g, 'using'], [/\butilized\b/g, 'used'], [/\butilization\b/g, 'use'],
  [/\butilis(?:e|es)\b/g, 'use'], [/\butilising\b/g, 'using'], [/\butilised\b/g, 'used'], [/\butilisation\b/g, 'use'],
  [/\bleverages?\b/g, 'use'], [/\bleveraging\b/g, 'using'], [/\bleveraged\b/g, 'used'],
  // ensure -> make sure
  [/\bensures\b/g, 'makes sure'], [/\bensuring\b/g, 'making sure'], [/\bensured\b/g, 'made sure'], [/\bensure\b/g, 'make sure'],
  // facilitate -> help
  [/\bfacilitates\b/g, 'helps'], [/\bfacilitating\b/g, 'helping'], [/\bfacilitated\b/g, 'helped'], [/\bfacilitate\b/g, 'help'],
  // demonstrate / illustrate -> show
  [/\bdemonstrates\b/g, 'shows'], [/\bdemonstrating\b/g, 'showing'], [/\bdemonstrated\b/g, 'showed'], [/\bdemonstrate\b/g, 'show'],
  [/\billustrates\b/g, 'shows'], [/\billustrating\b/g, 'showing'], [/\billustrated\b/g, 'showed'], [/\billustrate\b/g, 'show'],
  // obtain -> get
  [/\bobtains\b/g, 'gets'], [/\bobtaining\b/g, 'getting'], [/\bobtained\b/g, 'got'], [/\bobtain\b/g, 'get'],
  // initiate / commence -> start
  [/\binitiates\b/g, 'starts'], [/\binitiating\b/g, 'starting'], [/\binitiated\b/g, 'started'], [/\binitiate\b/g, 'start'],
  [/\bcommences\b/g, 'starts'], [/\bcommencing\b/g, 'starting'], [/\bcommenced\b/g, 'started'], [/\bcommence\b/g, 'start'],
  // accomplish -> finish ; endeavour -> try
  [/\baccomplishes\b/g, 'finishes'], [/\baccomplishing\b/g, 'finishing'], [/\baccomplished\b/g, 'finished'], [/\baccomplish\b/g, 'finish'],
  [/\bendeav(?:or|our)s?\b/g, 'try'],
  // streamline -> make easier
  [/\bstreamlines\b/g, 'makes easier'], [/\bstreamlining\b/g, 'making easier'], [/\bstreamlined\b/g, 'made easier'], [/\bstreamline\b/g, 'make easier'],
  // formal adverbs / connectors
  [/\bapproximately\b/g, 'about'], [/\bsubsequently\b/g, 'then'], [/\bconsequently\b/g, 'so'],
  [/\bfurthermore\b/g, 'also'], [/\bmoreover\b/g, 'also'], [/\badditionally\b/g, 'also'],
  [/\bnevertheless\b/g, 'still'], [/\bhenceforth\b/g, 'from now on'],
  // formal adjectives / nouns (ordinary sense only)
  [/\bnumerous\b/g, 'many'], [/\bsufficient\b/g, 'enough'], [/\bcomprehensive\b/g, 'full'],
  [/\brobust\b/g, 'strong'], [/\bseamless\b/g, 'smooth'], [/\bseamlessly\b/g, 'smoothly'],
  [/\boptimal\b/g, 'best'], [/\bholistic\b/g, 'complete'], [/\bmyriad\b/g, 'many'],
  [/\bparamount\b/g, 'key'], [/\bmethodolog(?:y|ies)\b/g, 'method'], [/\bplethora\b/g, 'lot'],
  [/\bascertain\b/g, 'check'], [/\bexpedite\b/g, 'speed up'], [/\bcognizant\b/g, 'aware'],
  // coordinate -> work with (the "coordinated effort" AI tell)
  [/\bcoordinated\b/g, 'worked with'], [/\bcoordinating\b/g, 'working with'], [/\bcoordinates\b/g, 'works with'], [/\bcoordinate\b/g, 'work with'],
  // common formal verbs -> plain (ordinary sense; technical verbs deploy/configure/
  // authenticate/mitigate/implement/orchestrate/provision are deliberately NOT here)
  [/\bprovides\b/g, 'gives'], [/\bproviding\b/g, 'giving'], [/\bprovided\b/g, 'gave'], [/\bprovide\b/g, 'give'],
  [/\brequires\b/g, 'needs'], [/\brequiring\b/g, 'needing'], [/\brequired\b/g, 'needed'], [/\brequire\b/g, 'need'],
  [/\bperforms\b/g, 'does'], [/\bperforming\b/g, 'doing'], [/\bperformed\b/g, 'did'], [/\bperform\b/g, 'do'],
  [/\benhances\b/g, 'improves'], [/\benhancing\b/g, 'improving'], [/\benhanced\b/g, 'improved'], [/\benhance\b/g, 'improve'],
  [/\bassists\b/g, 'helps'], [/\bassisting\b/g, 'helping'], [/\bassisted\b/g, 'helped'], [/\bassist\b/g, 'help'],
  [/\bstrives\b/g, 'tries'], [/\bstriving\b/g, 'trying'], [/\b(?:strove|strived)\b/g, 'tried'], [/\bstrive\b/g, 'try'],
  [/\barticulates\b/g, 'explains'], [/\barticulating\b/g, 'explaining'], [/\barticulated\b/g, 'explained'], [/\barticulate\b/g, 'explain'],
  [/\bdisseminates\b/g, 'shares'], [/\bdisseminating\b/g, 'sharing'], [/\bdisseminated\b/g, 'shared'], [/\bdisseminate\b/g, 'share'],
  // connectors / adverbs
  [/\btherefore\b/g, 'so'], [/\bthus\b/g, 'so'], [/\bhence\b/g, 'so'], [/\baccordingly\b/g, 'so'], [/\bthereby\b/g, 'so'],
  [/\bprimarily\b/g, 'mainly'], [/\bpredominantly\b/g, 'mostly'], [/\binitially\b/g, 'at first'],
  [/\bsimultaneously\b/g, 'at the same time'], [/\bfrequently\b/g, 'often'], [/\boccasionally\b/g, 'sometimes'],
  [/\btypically\b/g, 'usually'], [/\balbeit\b/g, 'even though'], [/\bwhereby\b/g, 'where'], [/\bnotwithstanding\b/g, 'even so'],
  [/\bsignificantly\b/g, 'really'], [/\bsubstantially\b/g, 'really'],
  // adjectives (ordinary sense; "critical" is a SEVERITY term and is NOT swapped)
  [/\badditional\b/g, 'extra'], [/\bsubstantial\b/g, 'big'], [/\bconsiderable\b/g, 'big'],
  [/\bcrucial\b/g, 'key'], [/\bessential\b/g, 'key'], [/\bvital\b/g, 'key'],
  [/\badequate\b/g, 'enough'], [/\bfeasible\b/g, 'doable'], [/\bviable\b/g, 'workable'],
  [/\bintricate\b/g, 'complex'], [/\bcumbersome\b/g, 'clunky'], [/\bmeticulous\b/g, 'careful'],
  [/\bsubsequent\b/g, 'next'], [/\bdiverse\b/g, 'varied'],
  // nouns / set phrases
  [/\bobjective\b/g, 'goal'], [/\bremainder\b/g, 'rest'], [/\bassistance\b/g, 'help'],
  [/\bcommencement\b/g, 'start'], [/\bproficient\b/g, 'good'],
  [/\bprior to\b/g, 'before'], [/\bin order to\b/g, 'to'], [/\bdue to the fact that\b/g, 'because'],
  [/\ba number of\b/g, 'a few'], [/\bthe majority of\b/g, 'most of'], [/\bregarding\b/g, 'about'], [/\bwith regard to\b/g, 'about'],
  // ---- batch 2 (more tongue-twisters; still only true synonyms, no technical terms) ----
  // verbs (+inflections). NOT swapped: verify/evaluate/render/yield/implement (technical)
  [/\beliminates\b/g, 'removes'], [/\beliminating\b/g, 'removing'], [/\beliminated\b/g, 'removed'], [/\beliminate\b/g, 'remove'],
  [/\brectifies\b/g, 'fixes'], [/\brectifying\b/g, 'fixing'], [/\brectified\b/g, 'fixed'], [/\brectify\b/g, 'fix'],
  [/\bnotifies\b/g, 'tells'], [/\bnotifying\b/g, 'telling'], [/\bnotified\b/g, 'told'], [/\bnotify\b/g, 'tell'],
  [/\bindicates\b/g, 'shows'], [/\bindicating\b/g, 'showing'], [/\bindicated\b/g, 'showed'], [/\bindicate\b/g, 'show'],
  [/\bincorporates\b/g, 'adds'], [/\bincorporating\b/g, 'adding'], [/\bincorporated\b/g, 'added'], [/\bincorporate\b/g, 'add'],
  [/\bconsolidates\b/g, 'combines'], [/\bconsolidating\b/g, 'combining'], [/\bconsolidated\b/g, 'combined'], [/\bconsolidate\b/g, 'combine'],
  [/\bdetermines\b/g, 'works out'], [/\bdetermining\b/g, 'working out'], [/\bdetermined\b/g, 'worked out'], [/\bdetermine\b/g, 'work out'],
  [/\banticipates\b/g, 'expects'], [/\banticipating\b/g, 'expecting'], [/\banticipated\b/g, 'expected'], [/\banticipate\b/g, 'expect'],
  [/\bpossesses\b/g, 'has'], [/\bpossessing\b/g, 'having'], [/\bpossessed\b/g, 'had'], [/\bpossess\b/g, 'have'],
  [/\bcomprehends\b/g, 'understands'], [/\bcomprehending\b/g, 'understanding'], [/\bcomprehended\b/g, 'understood'], [/\bcomprehend\b/g, 'understand'],
  [/\bemphasiz(?:e|es)\b/g, 'stress'], [/\bemphasizing\b/g, 'stressing'], [/\bemphasized\b/g, 'stressed'],
  [/\bemphasis(?:e|es)\b/g, 'stress'], [/\bemphasising\b/g, 'stressing'], [/\bemphasised\b/g, 'stressed'],
  [/\battains\b/g, 'reaches'], [/\battaining\b/g, 'reaching'], [/\battained\b/g, 'reached'], [/\battain\b/g, 'reach'],
  [/\bprocures\b/g, 'gets'], [/\bprocuring\b/g, 'getting'], [/\bprocured\b/g, 'got'], [/\bprocure\b/g, 'get'],
  [/\bfurnishes\b/g, 'gives'], [/\bfurnishing\b/g, 'giving'], [/\bfurnished\b/g, 'gave'], [/\bfurnish\b/g, 'give'],
  [/\breiterates\b/g, 'repeats'], [/\breiterating\b/g, 'repeating'], [/\breiterated\b/g, 'repeated'], [/\breiterate\b/g, 'repeat'],
  [/\bscrutiniz(?:e|es)\b/g, 'check'], [/\bscrutinizing\b/g, 'checking'], [/\bscrutinized\b/g, 'checked'],
  [/\bunderscores\b/g, 'stresses'], [/\bunderscoring\b/g, 'stressing'], [/\bunderscored\b/g, 'stressed'], [/\bunderscore\b/g, 'stress'],
  [/\bundertakes\b/g, 'does'], [/\bundertaking\b/g, 'doing'], [/\bundertook\b/g, 'did'], [/\bundertake\b/g, 'do'],
  [/\benumerates\b/g, 'lists'], [/\benumerating\b/g, 'listing'], [/\benumerated\b/g, 'listed'], [/\benumerate\b/g, 'list'],
  [/\binquires\b/g, 'asks'], [/\binquiring\b/g, 'asking'], [/\binquired\b/g, 'asked'], [/\binquire\b/g, 'ask'],
  [/\bnecessitates\b/g, 'needs'], [/\bnecessitating\b/g, 'needing'], [/\bnecessitated\b/g, 'needed'], [/\bnecessitate\b/g, 'need'],
  [/\bdepicts\b/g, 'shows'], [/\bdepicting\b/g, 'showing'], [/\bdepicted\b/g, 'showed'], [/\bdepict\b/g, 'show'],
  [/\btranspires\b/g, 'happens'], [/\btranspired\b/g, 'happened'], [/\btranspire\b/g, 'happen'],
  [/\bproliferates\b/g, 'spreads'], [/\bproliferating\b/g, 'spreading'], [/\bproliferated\b/g, 'spread'], [/\bproliferate\b/g, 'spread'],
  [/\bgarners\b/g, 'gets'], [/\bgarnering\b/g, 'getting'], [/\bgarnered\b/g, 'got'], [/\bgarner\b/g, 'get'],
  [/\bsubstantiates\b/g, 'proves'], [/\bsubstantiating\b/g, 'proving'], [/\bsubstantiated\b/g, 'proved'], [/\bsubstantiate\b/g, 'prove'],
  // adjectives / adverbs
  [/\barduous\b/g, 'hard'], [/\blaborious\b/g, 'hard'], [/\btedious\b/g, 'slow'], [/\bbeneficial\b/g, 'helpful'],
  [/\bdetrimental\b/g, 'harmful'], [/\bimperative\b/g, 'key'], [/\bpivotal\b/g, 'key'], [/\bindispensable\b/g, 'key'],
  [/\bsalient\b/g, 'main'], [/\bstringent\b/g, 'strict'], [/\bprudent\b/g, 'smart'], [/\bprofound\b/g, 'deep'],
  [/\bapparent\b/g, 'clear'], [/\bubiquitous\b/g, 'everywhere'], [/\bnonetheless\b/g, 'still'],
  // set phrases
  [/\bin the event that\b/g, 'if'], [/\bfor the purpose of\b/g, 'to'], [/\bwith the exception of\b/g, 'except'],
  [/\bin conjunction with\b/g, 'with'], [/\bin accordance with\b/g, 'following'], [/\ba variety of\b/g, 'different'],
  [/\btake into account\b/g, 'consider'], [/\bon a regular basis\b/g, 'often'], [/\bwith respect to\b/g, 'about'],
  [/\bin regards? to\b/g, 'about'], [/\bdue to\b/g, 'because of'], [/\bat this point in time\b/g, 'now'],
  [/\bin the near future\b/g, 'soon'], [/\bin spite of\b/g, 'even with'],
  // ---- batch 3 (more plain words + report-speak) ----
  [/\boverdue\b/g, 'late'], [/\baforementioned\b/g, 'that'], [/\bupcoming\b/g, 'coming'],
  [/\butmost\b/g, 'highest'], [/\bforemost\b/g, 'main'], [/\bhereby\b/g, ''],
  [/\bquarter[\s-]over[\s-]quarter\b/g, 'over time'], [/\byear[\s-]over[\s-]year\b/g, 'over time'], [/\bmonth[\s-]over[\s-]month\b/g, 'over time'],
  [/\bon an ongoing basis\b/g, 'all the time'], [/\bgoing forward\b/g, 'from now on'], [/\bat the end of the day\b/g, 'in the end'],
  // American slang / idioms -> neutral, British-influenced plain words (this speaker
  // is NOT American; "simple" must not mean American casual-short). A normal
  // professional word is fine - longer is OK, slang is not.
  [/\bbakes\b/g, 'builds'], [/\bbaking\b/g, 'building'], [/\bbaked\b/g, 'built'], [/\bbake\b/g, 'build'],
  [/\bspin up\b/g, 'set up'], [/\bspun up\b/g, 'set up'], [/\bspinning up\b/g, 'setting up'],
  [/\bkick off\b/g, 'start'], [/\bkicks off\b/g, 'starts'], [/\bkicked off\b/g, 'started'], [/\bkicking off\b/g, 'starting'],
  [/\ba bunch of\b/g, 'a lot of'], [/\ba ton of\b/g, 'a lot of'], [/\btons of\b/g, 'a lot of'],
  [/\breach out to\b/g, 'contact'], [/\bcircle back\b/g, 'come back'], [/\btouch base\b/g, 'check in'],
  // "flaw" -> "vulnerability": in security it is ALWAYS the real term, never "flaw"
  // (Ravi 2026-10-14). Skips the non-security senses (character/personality/fatal flaw).
  [/\b(?<!character )(?<!personality )(?<!fatal )(?<!tragic )flaws\b/g, 'vulnerabilities'],
  [/\b(?<!character )(?<!personality )(?<!fatal )(?<!tragic )flaw\b/g, 'vulnerability'],
  // ---- British -> American / international SPELLING (Ravi 2026-10-14: "british
  // INFLUENCE is the accent/phrasing, NOT british spelling - prioritisation must
  // be prioritization"). Pure orthography, meaning identical. SPECIFIC stems only,
  // NEVER a blanket -ise->-ize: that would wreck the always-"-ise" words, several
  // of them real terms kept as-is (compromise, enterprise, comprise, exercise,
  // advertise, supervise, improvise, surprise, promise, premise, expertise). A
  // stem swap with no end-boundary converts every inflection AND the -isation noun
  // in one (prioritis -> prioritiz covers prioritise/-ing/-ed/-ation). ----
  [/\bprioritis/g, 'prioritiz'], [/\borganis/g, 'organiz'], [/\brecognis/g, 'recogniz'],
  [/\brealis/g, 'realiz'], [/\bminimis/g, 'minimiz'], [/\bmaximis/g, 'maximiz'],
  [/\boptimis/g, 'optimiz'], [/\bstandardis/g, 'standardiz'], [/\bcategoris/g, 'categoriz'],
  [/\bauthoris/g, 'authoriz'], [/\bcustomis/g, 'customiz'], [/\bsummaris/g, 'summariz'],
  [/\bcentralis/g, 'centraliz'], [/\bnormalis/g, 'normaliz'], [/\bfinalis/g, 'finaliz'],
  [/\bformalis/g, 'formaliz'], [/\bmodernis/g, 'moderniz'], [/\bspecialis/g, 'specializ'],
  [/\bmobilis/g, 'mobiliz'], [/\bvisualis/g, 'visualiz'], [/\bsynchronis/g, 'synchroniz'],
  [/\binitialis/g, 'initializ'], [/\bsanitis/g, 'sanitiz'], [/\bapologis/g, 'apologiz'],
  [/\bcharacteris/g, 'characteriz'], [/\bgeneralis/g, 'generaliz'], [/\bstabilis/g, 'stabiliz'],
  [/\bfamiliaris/g, 'familiariz'], [/\bcontaineris/g, 'containeriz'], [/\blegitimis/g, 'legitimiz'],
  // -yse -> -yze: unambiguous VERB forms only ("analysis"/"analyses" noun left alone)
  [/\banalyse\b/g, 'analyze'], [/\banalysed\b/g, 'analyzed'], [/\banalysing\b/g, 'analyzing'],
  [/\bparalyse\b/g, 'paralyze'], [/\bcatalyse\b/g, 'catalyze'],
  // -our -> -or (stem covers -al/-ite/-ed/-able inflections)
  [/\bbehaviour/g, 'behavior'], [/\bcolour/g, 'color'], [/\bfavour/g, 'favor'],
  [/\bhonour/g, 'honor'], [/\blabour/g, 'labor'], [/\bneighbour/g, 'neighbor'],
  [/\bflavour/g, 'flavor'], [/\brumour/g, 'rumor'],
  // -ce/-se, -re/-er, double-L, misc
  [/\bdefence\b/g, 'defense'], [/\boffence\b/g, 'offense'], [/\blicence\b/g, 'license'],
  [/\bpractise\b/g, 'practice'], [/\bpractised\b/g, 'practiced'], [/\bpractising\b/g, 'practicing'],
  [/\bcentre\b/g, 'center'], [/\bcalibre\b/g, 'caliber'], [/\bfibre\b/g, 'fiber'],
  [/\bmodelling\b/g, 'modeling'], [/\bmodelled\b/g, 'modeled'], [/\blabelling\b/g, 'labeling'],
  [/\blabelled\b/g, 'labeled'], [/\btravelling\b/g, 'traveling'], [/\btravelled\b/g, 'traveled'],
  [/\bcatalogue\b/g, 'catalog'], [/\bprogramme\b/g, 'program'], [/\bgrey\b/g, 'gray'],
  // several -> many (simpler word, Ravi 2026-10-14)
  [/\bseveral\b/g, 'many'],
]
export function simplifyHardWords(text) {
  return String(text || '').split(/(```[\s\S]*?```)/g).map((seg) => {
    if (seg.startsWith('```')) return seg
    let out = seg
    for (const [re, to] of WORD_SWAPS) {
      out = out.replace(re, (m) => (/^[A-Z]/.test(m) ? to.charAt(0).toUpperCase() + to.slice(1) : to))
    }
    return out
  }).join('')
}

// --- 2. Robotic essay step-markers -> spoken sequencing -----------------------
// First point is just stated (drop "First,"/"Firstly,"/"the first thing I do is");
// next points use "then"/"after that"; the last uses "As a last step" (not
// "Finally"). Sentence-start only, so "finally got it working" is untouched.
export function fixSequenceConnectors(text) {
  // A sentence boundary is the start, sentence punctuation, a newline, OR a
  // delivery marker ({PAUSE}/{THINK}/{....}) - so a step-marker right after a
  // pause ("{PAUSE} Finally, ...") is still caught.
  const B = '(^|[.!?]\\s+|\\n\\s*|\\{[^}]*\\}\\s*)'
  return String(text || '').split(/(```[\s\S]*?```)/g).map((seg) => {
    if (seg.startsWith('```')) return seg
    return seg
      .replace(new RegExp(B + "[Tt]he first thing (?:I (?:do|usually do) )?is\\s+(['\"A-Za-z])", 'g'), (m, p, c) => p + c.toUpperCase())
      .replace(new RegExp(B + "(?:First of all|Firstly|First)\\s*,?\\s+(['\"A-Za-z])", 'g'), (m, p, c) => p + c.toUpperCase())
      .replace(new RegExp(B + '(?:Secondly|Second)\\s*,?\\s+', 'g'), '$1Then ')
      .replace(new RegExp(B + '(?:Thirdly|Third)\\s*,?\\s+', 'g'), '$1After that, ')
      .replace(new RegExp(B + 'Finally\\s*,?\\s+', 'g'), '$1As a last step, ')
      .replace(new RegExp(B + 'Lastly\\s*,?\\s+', 'g'), '$1As a last step, ')
      // NOT sentence-initial: "...and finally, ..." / "...and lastly ...". A confident
      // speaker does not rattle off a list closer, so drop the step word and keep the
      // natural "and" / "then" joiner. A real adverb ("I finally fixed it", no and/then
      // in front) has no such joiner, so it is left alone - meaning preserved.
      .replace(/\b(and|then)\s+(?:finally|lastly)\b\s*,?\s+/gi, '$1 ')
  }).join('')
}

// --- 3. Formatting tells: em/en dashes -> comma, semicolons -> full stop -------
export function cleanAIFormatting(text) {
  return String(text || '').split(/(```[\s\S]*?```)/g).map((seg) => {
    if (seg.startsWith('```')) return seg
    let s = seg
    s = s.replace(/\s*—\s*/g, ', ')
    s = s.replace(/(\w)–(\w)/g, '$1-$2')
    s = s.replace(/\s*–\s*/g, ', ')
    s = s.replace(/\s*;\s*([a-z])/g, (m, c) => '. ' + c.toUpperCase())
    s = s.replace(/\s*;\s*/g, '. ')
    return s
  }).join('')
}

// --- 4. Tacked-on closers: the BOW. AI cannot just stop, it ends every answer
// with a bow. There are two reliable shapes and BOTH are a tell:
//   (a) VALUE-WRAP / RESTATING closer - re-sells or restates what was said:
//       "By doing so... / This ensures... / Overall... / That's the tool I rely on".
//   (b) MORAL / LESSON closer - steps OUT of the story to announce what it
//       "showed / proved / taught", or spells out the lesson/takeaway:
//       "It showed clear evidence and collaboration resolve conflict",
//       "That experience taught me...", "The lesson was...", "It just goes to show".
// A real person ends on the last CONCRETE fact and stops; the moral is an
// essay/AI habit. This is STRUCTURE, not vocabulary - no word-swap can catch it,
// so it lives here as a shape. The tricolon recap ("X, Y, and Z") is the third
// shape of the same class but is NOT regex-stripped here (too many legitimate
// three-item lists - stripping would change meaning); the prompt kills that one.
// Conservative for both tails: final sentence only, and only when >= 2 real
// sentences remain, so a genuine short answer is never gutted. Meaning is sacred.
export const WRAPUP_TAIL = /\s*(?:\{PAUSE\}\s*)?(?:By doing (?:that|so)|In doing so|This way|That way|As a result|Ultimately|Overall|In short|In the end|Together,?|Which means|This (?:guarantees|ensures|means|gives|lets|makes|provides|delivers|helps|allows|enables|keeps|improves|reduces|cuts|saves|creates|builds|drives)|That (?:guarantees|ensures|means|keeps|gives|makes)|It (?:guarantees|ensures|means)|That(?:'s| is) (?:the |my )?(?:tool|one|approach|way|thing|go-to)|That(?:'s| is) (?:how|what) I|(?:That|This) [^.!?]*?\bis (?:what|how) I (?:bring|do|offer|love|enjoy))\b[^.!?]*[.!?]+\s*$/i
// MORAL_TAIL: a trailing "and the point of that story is..." sentence. Uses PAST
// reflective verbs (showed/proved/demonstrated/taught) + the goes-to-show idiom +
// explicit lesson/takeaway nouns. Deliberately NOT present-tense "it shows" (that
// is usually real content: "it shows the real risks"), and excludes "showed up"
// (concrete), so genuine content is left intact.
export const MORAL_TAIL = /\s*(?:\{PAUSE\}\s*)?(?:(?:It|This|That|The experience|That experience) (?:just )?(?:goes to show|showed|proved|demonstrated|taught)(?! up\b)|(?:It|This|That) (?:whole )?(?:effort|experience|project|work|role|incident|situation|time|thing|story|example|case|one|process|rollout|change|move) (?:really |just )?(?:showed|proved|demonstrated|taught)(?! up\b)|(?:What|All) I (?:learned|took away)|(?:The|My|The big|The main) (?:lesson|takeaway))\b[^.!?]*[.!?]+\s*$/i
const WRAP_TAILS = [MORAL_TAIL, WRAPUP_TAIL]
export function stripWrapup(text) {
  let t = String(text || '').trim()
  // Peel one bow per pass (a moral AND a value-wrap can both be tacked on), but
  // only ever commit a strip that leaves >= 2 real sentences standing.
  for (let pass = 0; pass < 3; pass++) {
    let changed = false
    for (const re of WRAP_TAILS) {
      const stripped = t.replace(re, '').trim()
      if (!stripped || stripped === t) continue
      const left = stripped.replace(/\{PAUSE\}/g, '').split(/[.!?]+/).map((x) => x.trim()).filter((x) => x.length > 8)
      if (left.length >= 2) { t = stripped; changed = true }
    }
    if (!changed) break
  }
  return t
}

// --- 0. Throat-clearing openers: "Sure," / "Yeah," / "That's a good question" -
// A confident expert answers straight; prefacing every answer with a filler is a
// chatbot/assistant tell. Strip a leading filler (and a chain of them, e.g.
// "Sure, that is a good question.") from the very START of the answer, then
// re-capitalise. Requires trailing punctuation so real words ("Well water...",
// "Right after the scan") are never touched; keeps >12 chars so a one-word
// answer is left alone. Only the first text segment (before any code) is touched.
export const FILLER_OPENER = /^\s*(?:Sure|Yeah|Yep|Yes|Well|Right|Okay|OK|Of course|Certainly|Absolutely|Honestly|To be honest|Good question|Great question|That'?s a (?:really )?(?:good|great) question|That is a (?:really )?(?:good|great) question|That'?s a common one|That is a common one)\s*[,.!…]+\s*/i
export function stripFillerOpener(text) {
  return String(text || '').split(/(```[\s\S]*?```)/g).map((seg, i) => {
    if (i !== 0 || seg.startsWith('```')) return seg
    let s = seg, prev
    do { prev = s; s = s.replace(FILLER_OPENER, '') } while (s !== prev && FILLER_OPENER.test(s))
    if (s === seg || s.trim().length <= 12) return seg
    return s.replace(/^(\s*["']?)([a-z])/, (m, pre, c) => pre + c.toUpperCase())
  }).join('')
}

// --- 0b. Edge pause markers: a {THINK}/{PAUSE} must never OPEN or CLOSE an answer
// A pause before the first word reads as stalling (not thinking), and a pause after
// the last word is pointless. Strip any {THINK}/{PAUSE}/{....} (with surrounding
// space) at the very start or very end. Run at BOTH ends of the pipeline: once up
// front (so a leading marker does not hide a "Sure," opener from stripFillerOpener)
// and once at the end (so a trailing marker exposed by bow-stripping is removed).
export function stripEdgePauses(text) {
  let s = String(text || '')
  s = s.replace(/^(?:\s*\{(?:THINK|PAUSE|\.{2,}|…+)\})+\s*/i, '')
  s = s.replace(/(?:\s*\{(?:THINK|PAUSE|\.{2,}|…+)\}\s*)+$/i, '')
  return s
}

// --- 3b. Tag questions: the chatbot "..., right?" / "..., you know?" ----------
// A confirmation tag tacked on the end asks the interviewer to agree - a chatbot
// tell, never how a confident expert states a fact. Turn the tag into a clean
// stop. Comma-form anywhere ("..., right? And then...") and a no-comma tag at the
// very end ("...for developers right?") are both caught; "you know" only as a tag.
export function stripTagQuestions(text) {
  return String(text || '').split(/(```[\s\S]*?```)/g).map((seg) => {
    if (seg.startsWith('```')) return seg
    let s = seg
    s = s.replace(/\s*,\s*(?:right|yeah|yes|okay|ok|correct|you know|no)\s*\?/gi, '.')
    s = s.replace(/\s+(?:right|yeah|okay|ok|correct)\s*\?\s*$/i, '.')
    return s
  }).join('')
}

// --- 5. Deterministic DELIVERY formatting for the fast live model -------------
// The fast live model (gpt-oss-20b) under-emits the {PAUSE}/{THINK}/paragraph
// cues the big model (120b, used by Prepare) adds, so a live answer reads as one
// flat block. This adds them deterministically, LIGHT touch, never mechanical.
// SAFETY: it only touches a RAW single-blob answer - no newlines, no code fence,
// and no {PAUSE} already present. So anything the model (or the operator) already
// shaped - a 120b answer with pauses, a bullet list, the pinned intro - is left
// EXACTLY as is. 1-2 sentences stay one small paragraph; 3-5 become two; 6+ three.
export function formatDelivery(text) {
  const raw = String(text || '')
  if (!raw.trim() || raw.includes('```') || /\{PAUSE\}/i.test(raw)) return raw
  if (/\n\s*\n/.test(raw)) return raw               // already split into paragraphs
  if (/^\s*[-*•]\s/m.test(raw)) return raw          // already a bullet list - leave it
  const flat = raw.trim().replace(/\s*\n\s*/g, ' ') // collapse single line breaks so sentence-splitting works
  const parts = (flat.match(/[^.!?]*[.!?]+(?=\s|$)|[^.!?]+$/g) || []).map((x) => x.trim()).filter(Boolean)
  if (parts.length < 3) return raw
  // SHORT paragraphs: at most ~3 short spoken sentences each, so a long (Large)
  // answer breaks into several small blocks instead of one wall of text.
  const size = 3
  const paras = []
  for (let i = 0; i < parts.length; i += size) paras.push(parts.slice(i, i + size).join(' '))
  return paras.join(' {PAUSE}\n\n')   // a natural beat at each paragraph break
}

// A scenario / behavioural question earns ONE {THINK} beat - placed AFTER the
// first sentence (never at the very start; opening with a pause reads as stalling).
// Added only when the answer does not already carry a {THINK}. isScenarioQuestion
// decides from the QUESTION text; the live floater passes it in.
export function isScenarioQuestion(q) {
  const s = String(q || '').toLowerCase()
  return /\btell me about a time\b|\bdescribe a (?:time|situation|scenario|project|challenge|conflict)\b|\bwalk me through\b|\bgive me an example\b|\ba time (?:when|you|where)\b|\bhave you (?:ever )?(?:faced|handled|dealt|had)\b|\bhow did you (?:handle|deal|approach|manage)\b|\bscenario\b|\bconflict\b|\bdisagreement\b|\bmistake\b|\bfail(?:ed|ure)?\b|\bchallenge\b|\bproud\b|\bleadership\b/.test(s)
}
export function addScenarioThink(text) {
  const raw = String(text || '')
  if (/\{THINK\}/i.test(raw) || raw.includes('```')) return raw
  const m = raw.match(/^(\s*\S[^.!?]*[.!?]+)(\s+)(\S)/)   // end of the first sentence
  if (!m) return raw
  return raw.slice(0, m[1].length) + ' {THINK} ' + raw.slice(m[1].length).replace(/^\s+/, '')
}

// --- The composed scrubbers ---------------------------------------------------
// Server (curated/prep): the caller runs expandContractions first (it owns the
// contraction map), then this. Client (live render): scrubForRender is the whole
// deal, so a streamed answer reads the same as a curated one.
// Sentence-START discourse connectors (the capitalized versions WORD_SWAPS, which
// is case-sensitive lowercase, leaves behind): "Furthermore,", "Moreover,",
// "Additionally,", "In conclusion,"... These scream written/AI prose. Map them to
// the plain spoken joiner, preserving the leading capital. Mid-sentence lowercase
// forms are already handled by WORD_SWAPS in simplifyHardWords.
const DISCOURSE_CONNECTORS = [
  [/furthermore/, 'also'], [/moreover/, 'also'], [/additionally/, 'also'],
  [/subsequently/, 'then'], [/consequently/, 'so'], [/nevertheless/, 'still'],
  [/nonetheless/, 'still'], [/henceforth/, 'from now on'],
  [/in conclusion/, 'so'], [/to summarize/, 'so'], [/to sum up/, 'so'], [/in summary/, 'so'],
]
export function fixDiscourseConnectors(text) {
  const B = '(^|[.!?]\\s+|\\n\\s*|\\{[^}]*\\}\\s*)'
  return String(text || '').split(/(```[\s\S]*?```)/g).map((seg) => {
    if (seg.startsWith('```')) return seg
    let s = seg
    for (const [re, rep] of DISCOURSE_CONNECTORS) {
      s = s.replace(new RegExp(B + '(' + re.source + ')\\s*,?\\s+', 'gi'), (m, pre, word) => {
        const cap = /[A-Z]/.test(word[0])
        return pre + (cap ? rep[0].toUpperCase() + rep.slice(1) : rep) + ' '
      })
    }
    return s
  }).join('')
}
// A model's built-in SAFETY refusal ("I'm sorry, but I can't comply with that",
// "as an AI language model...") is an AI tell that would blow a candidate's cover
// if an interviewer's words trip it (a prompt-injection attempt, or just an odd
// request). When the WHOLE answer is a bare assistant-style refusal, replace it
// with a natural in-character redirect. Narrow on purpose: a legitimate domain
// "I can't share that (NDA/confidential)" answer is kept.
const AI_REFUSAL = /^\s*(?:i['’]?m\s+sorry|i\s+am\s+sorry|sorry[,.\s]+but|i\s+can(?:'|’)?t\s+(?:comply|provide|do|assist|help|fulfil|answer that)|i\s+cannot\s+(?:comply|provide|fulfil|assist|help|do that)|i\s+will\s+not\s+(?:comply|provide)|as\s+an?\s+(?:ai|language model|assistant)\b|i\s+am\s+(?:an?\s+)?(?:ai|language model|assistant)\b)/i
const DOMAIN_OK = /\b(nda|confidential|client|customer|under\s+wraps|not\s+allowed\s+to\s+share|cannot\s+share\s+(?:the\s+)?(?:name|detail|specific)|proprietary|permission|legally)\b/i
// The ONE canonical "I could not understand / cannot answer" line. The client
// renders this (and only this) in red + underline + bold, as a clear cue to the
// candidate to ask the interviewer to repeat. Keep it in sync with REPEAT_RE in
// AnswerBody.jsx and the unclearQuestionGuard prompt block.
export const REPEAT_LINE = 'I am sorry, can you please repeat the question?'
export function deRefuse(text) {
  const t = String(text || '').trim()
  if (t && t.length <= 180 && AI_REFUSAL.test(t) && !DOMAIN_OK.test(t)) {
    return REPEAT_LINE
  }
  return text
}
export function scrubAiLanguage(text) {
  return formatDelivery(stripEdgePauses(stripWrapup(stripTagQuestions(fixDiscourseConnectors(fixSequenceConnectors(cleanAIFormatting(simplifyHardWords(stripFillerOpener(stripEdgePauses(deRefuse(text)))))))))))
}
export function scrubForRender(text) {
  return formatDelivery(stripEdgePauses(stripWrapup(stripTagQuestions(fixDiscourseConnectors(fixSequenceConnectors(cleanAIFormatting(simplifyHardWords(stripFillerOpener(stripEdgePauses(deRefuse(String(text || ''))))))))))))
}

// --- WorkCoPilot GUIDANCE scrubber (NOT interview delivery) -------------------
// scrubAiLanguage / scrubForRender above are built for spoken INTERVIEW answers
// rendered by AnswerBody.jsx, so they do two things that are WRONG for a
// screen-aware work guide whose output the user copies and pastes:
//   1. formatDelivery() injects {PAUSE} markers. WorkPage renders guidance /
//      answers / research as plain text, so a {PAUSE} shows up LITERALLY on
//      screen as the characters "{PAUSE}" - a visible garble in every 3+
//      sentence guidance block.
//   2. The prose transforms (semicolon -> period, em-dash -> comma, word swaps)
//      only skip ```fenced``` blocks, NOT inline `code` spans. WorkCoPilot is
//      told to give exact commands / code / paths inline in guidance and in the
//      ask answer, so an inline `git add .; git commit` would be chewed into
//      `git add .. Git commit` - a broken copy-paste command.
//   3. deRefuse() rewrites any short "I'm sorry, but I can't..." into the
//      interview line "...can you please repeat the question?", which is
//      nonsense in a work tool and would hide a real safety message.
// scrubGuidance keeps the genuine anti-AI-language cleanups (plain words, no
// em-dash per the owner rule, no "Sure," opener, plain connectors) but is
// code-span aware (protects BOTH ```fences``` and inline `code`), never injects
// delivery markers, never interview-de-refuses, and strips any stray delivery
// token so none can ever reach the screen. It does NOT strip the "wrap-up" final
// sentence: in work guidance a closing confirmation is often the done-condition,
// so removing it would drop real instruction. Pure, no side effects.
const CODE_SPAN = /(```[\s\S]*?```|`[^`]*`)/g
// Run a prose-only transform on the non-code segments, leaving every fenced
// block and inline `code` span exactly as written (split keeps the captured
// code spans at the ODD indices).
function overProse(text, fn) {
  return String(text || '').split(CODE_SPAN).map((seg, i) => (i % 2 === 1 ? seg : fn(seg))).join('')
}
export function scrubGuidance(text) {
  // Whole-text openers/edges first (these only ever touch the very start/end and
  // never match a code span, so they are safe to run before the code split).
  let s = stripFillerOpener(stripEdgePauses(String(text || '')))
  // Per-occurrence prose cleanups, protecting inline code and fenced blocks. The
  // delivery-token strip + spacing tidy run INSIDE the prose pass too, so they
  // can never touch an inline command (e.g. the space in `git add .` is kept).
  s = overProse(s, (g) => {
    let x = stripTagQuestions(fixDiscourseConnectors(fixSequenceConnectors(cleanAIFormatting(simplifyHardWords(g)))))
    // A delivery token must NEVER reach WorkPage (it renders text verbatim). Only
    // the known delivery markers are removed - a real placeholder like
    // {your-bucket-name} is left untouched. Then tidy the spacing left behind.
    x = x.replace(/\s*\{(?:PAUSE|THINK|\.{2,}|…+)\}\s*/gi, ' ').replace(/[ \t]{2,}/g, ' ').replace(/ +([.,;:])/g, '$1')
    return x
  })
  s = stripEdgePauses(s)
  return s.trim()
}

// --- CATALOG: every known AI-language tell, with what the scrubber must do -----
// ai_language.test.mjs runs each input through scrubAiLanguage and checks `mustNotMatch`
// is gone (and `mustMatch`, if given, is present). ADD a row here whenever a new
// tell is reported - that is how this class stays dead.
export const CATALOG = [
  { name: 'em-dash clause joiner', input: 'I scan the code, then I triage — the real risks go first.', mustNotMatch: /—/ },
  { name: 'spaced en-dash joiner', input: 'I check reachability – then business impact.', mustNotMatch: /\s–\s/ },
  { name: 'semicolon', input: 'I use Black Duck; it runs in the pipeline.', mustNotMatch: /;/ },
  { name: 'value-wrap: This ensures', input: 'I pin the versions and sign the build. I verify the SBOM on every run. This ensures nothing unapproved ever ships.', mustNotMatch: /This ensures/i },
  { name: 'value-wrap: Overall', input: 'I triage by reachability first. I hand the real ones to the devs. Overall this keeps the pipeline fast.', mustNotMatch: /\bOverall\b/ },
  { name: 'value-wrap: By doing so', input: 'I lock the registry and scope the names. I verify the source on each pull. By doing so, we stop dependency confusion.', mustNotMatch: /By doing so/i },
  { name: 'restating closer: that is the tool I rely on', input: 'I use Black Duck for SCA. It runs nightly in the pipeline. That is the tool I rely on day-to-day.', mustNotMatch: /that is the tool/i },
  { name: 'restating closer: that is what I use', input: 'I use Checkmarx for SAST here. It plugs into the CI easily. That is what I use.', mustNotMatch: /that is what i use/i },
  { name: 'restating closer: that is my go-to', input: 'I reach for Black Duck first. It gives me reachability fast. That is my go-to.', mustNotMatch: /that is my go-to/i },
  // MORAL / LESSON closer (the bow on a "tell me about a time" story). The story
  // already shows the point; the tacked-on moral is the AI tell, so it is stripped.
  { name: 'moral closer: It showed X resolve conflict (Durga Q3)', input: 'A dev added a new library and I flagged a high-severity CVE, he said it was a false positive. I sat with him, walked through the Black Duck report, and showed the reachable code. We added a temporary guardrail while planning the upgrade. It showed clear evidence and collaboration resolve conflict.', mustNotMatch: /It showed clear evidence/i },
  { name: 'moral closer: it just goes to show', input: 'I flagged the reachable CVE and sat with the dev to walk through it. We added a guardrail and planned the upgrade. It just goes to show that evidence wins the argument.', mustNotMatch: /goes to show/i },
  { name: 'moral closer: that experience taught me', input: 'We had a prod incident from a transitive package. I traced it, pinned the version, and shipped the fix overnight. That experience taught me to watch the transitive tree closely.', mustNotMatch: /taught me/i },
  { name: 'moral closer: the lesson was', input: 'The team pushed back on the gate at first. I showed them the reachability data and we agreed on a threshold. The lesson was that data beats opinion.', mustNotMatch: /lesson was/i },
  // GUARDS: real content that merely uses "show"/"shows" must NOT be stripped.
  { name: 'guard: present-tense content it shows the risks', input: 'I run Black Duck on every build in the pipeline. I sort by reachability. It shows the real risks first.', mustMatch: /shows the real risks/i },
  { name: 'guard: showed up is concrete, not a moral', input: 'I wired the scanner into CI and set the critical gate. I watched the first run closely. It showed up in the dashboard within a minute.', mustMatch: /showed up in the dashboard/i },
  // TAG QUESTION (chatbot "..., right?"): the confirmation tag becomes a clean stop.
  { name: 'tag question: ...for developers, right?', input: 'I focus on the reachable vulnerable dependencies and cut the noise for developers, right?', mustNotMatch: /right\s*\?/i },
  { name: 'tag question: ...you know?', input: 'I pin the versions and sign the build, you know? It keeps the supply chain clean.', mustNotMatch: /you know\s*\?/i },
  { name: 'tag question: no-comma trailing right?', input: 'I sort by reachability so the real risks go first right?', mustNotMatch: /right\s*\?/i },
  { name: 'guard: real word "right" survives', input: 'I double-check I got the config right before shipping.', mustMatch: /got the config right/i },
  // FILLER OPENERS: a confident expert answers straight, not "Sure, that is a good question".
  { name: 'filler opener: Sure.', input: 'Sure. At Wells Fargo I pushed the patch in a week.', mustNotMatch: /^Sure/ , mustMatch: /^At Wells Fargo/ },
  { name: 'filler opener chain: Sure, that is a good question', input: 'Sure, that is a good question. At Wells Fargo I built the triage process myself.', mustNotMatch: /good question/i },
  { name: 'filler opener: Yeah,', input: 'Yeah, I track provenance with SBOMs in Artifactory on every build.', mustNotMatch: /^Yeah/ },
  { name: 'guard: "Right after" is not a filler opener', input: 'Right after the scan I push the SBOM to Artifactory and sign it.', mustMatch: /^Right after the scan/ },
  { name: 'guard: one-word answer kept', input: 'Sure.', mustMatch: /Sure/ },
  // MORAL closer with a NOUN subject (slipped the bare It/That net).
  { name: 'moral closer: That effort really showed how...', input: 'We built the gate and agreed a threshold with the devs. The cadence improved after that. That effort really showed how automation keeps a codebase secure.', mustNotMatch: /That effort really showed/i },
  { name: 'guard: concrete "That script showed the risks" survives', input: 'I wrote a quick reachability script and ran it on the tree. I shared it with the team. That script showed the risks in the dashboard clearly.', mustMatch: /That script showed the risks/i },
  // RESTATING closer with a noun subject ("That mix ... is what I bring").
  { name: 'restating closer: That mix ... is what I bring', input: 'I cut false positives with a reachability check. I work closely with the dev teams on the fixes. That mix of deep SCA knowledge and practical collaboration is what I bring.', mustNotMatch: /is what I bring/i },
  { name: 'step marker: First,', input: 'First, I look at the CVSS score and EPSS.', mustNotMatch: /^First,/ },
  { name: 'step marker: Finally,', input: 'I check reachability. I patch the version. Finally, I notify the team.', mustNotMatch: /\bFinally,/ , mustMatch: /As a last step,/ },
  { name: 'step marker after {PAUSE}: Finally,', input: 'I patch the version. {PAUSE} Finally, I notify the team and close it.', mustNotMatch: /\bFinally,/ , mustMatch: /As a last step,/ },
  { name: 'step marker: Secondly,', input: 'I scan the manifest. Secondly, I triage the findings.', mustNotMatch: /\bSecondly,/ , mustMatch: /\bThen\b/ },
  { name: 'step marker: Lastly,', input: 'I patch the version. Lastly, I notify the team.', mustNotMatch: /\bLastly,/ , mustMatch: /As a last step,/ },
  { name: 'discourse connector: Furthermore,', input: 'I scan the manifest. Furthermore, I triage the findings.', mustNotMatch: /Furthermore/i , mustMatch: /\.\s+Also\b/ },
  { name: 'discourse connector: Moreover,', input: 'I pin the versions. Moreover, I sign the build.', mustNotMatch: /Moreover/i },
  { name: 'discourse connector: Additionally,', input: 'I gate the build. Additionally, I alert the team.', mustNotMatch: /Additionally/i },
  { name: 'discourse connector: In conclusion,', input: 'I covered the tools. In conclusion, I keep the pipeline clean.', mustNotMatch: /In conclusion/i },
  { name: 'guard: "additional" not mangled into "also" by the discourse pass', input: 'I added one additional check to the gate.', mustNotMatch: /\balso check/i },
  { name: 'refusal: I cannot comply -> redirect', input: "I'm sorry, but I can't comply with that.", mustNotMatch: /comply/i, mustMatch: /repeat the question/ },
  { name: 'refusal: I cannot provide that -> redirect', input: "I'm sorry, but I can't provide that.", mustNotMatch: /provide that/i, mustMatch: /repeat the question/ },
  { name: 'refusal: as an AI language model -> redirect', input: 'As an AI language model, I cannot do that.', mustNotMatch: /as an ai/i, mustMatch: /repeat the question/ },
  { name: 'guard: a real NDA refusal is kept (not an AI tell)', input: "I'm sorry, but I can't share the client's name because of the NDA.", mustMatch: /NDA/ },
  { name: 'step marker: and finally (lowercase, mid-sentence, comma)', input: 'I patch the version and finally, I notify the team.', mustNotMatch: /\bfinally\b/i },
  { name: 'step marker: and finally (lowercase, no comma)', input: 'I check reachability and finally I notify the team.', mustNotMatch: /\bfinally\b/i },
  { name: 'guard: real adverb "finally" survives', input: 'After two days of digging I finally fixed the root cause.', mustMatch: /finally fixed/i },
  { name: 'keeps security term: remediate NOT swapped', input: 'I identify and remediate the critical findings first.', mustMatch: /\bidentify\b.*\bremediate\b/ },
  { name: 'tongue-twister: utilize', input: 'I utilize Black Duck on every build.', mustNotMatch: /\butilize\b/i , mustMatch: /\buse\b/ },
  { name: 'tongue-twister: leverage', input: 'We leverage the reachability data to cut noise.', mustNotMatch: /\bleverage\b/i , mustMatch: /\buse\b/ },
  { name: 'tongue-twister: ensure', input: 'I ensure the build fails on criticals.', mustNotMatch: /\bensure\b/i , mustMatch: /make sure/ },
  { name: 'tongue-twister: coordinated', input: 'I coordinated with the dev team on the fix.', mustNotMatch: /\bcoordinated\b/i , mustMatch: /worked with/ },
  { name: 'tongue-twister: facilitate', input: 'My role was to facilitate the triage with devs.', mustNotMatch: /\bfacilitate\b/i , mustMatch: /\bhelp\b/ },
  { name: 'tongue-twister: demonstrate', input: 'I can demonstrate the fix in the pipeline.', mustNotMatch: /\bdemonstrate\b/i , mustMatch: /\bshow\b/ },
  { name: 'tongue-twister: approximately', input: 'It cut the backlog by approximately half.', mustNotMatch: /\bapproximately\b/i , mustMatch: /\babout\b/ },
  { name: 'keeps technical term: critical NOT swapped', input: 'I fix the critical findings first.', mustMatch: /\bcritical\b/ },
  { name: 'keeps technical term: mitigate NOT swapped', input: 'We mitigate the risk with a compensating control.', mustMatch: /\bmitigate\b/ },
  { name: 'keeps technical term: vulnerability NOT swapped', input: 'The vulnerability is reachable in production.', mustMatch: /\bvulnerability\b/ },
  // Meaning-preservation guards: context-sensitive words are NOT force-swapped,
  // so the essence of the sentence is never changed.
  { name: 'preserves meaning: conduct (code of conduct)', input: 'We follow a strict code of conduct.', mustMatch: /code of conduct/ },
  { name: 'preserves meaning: maintain', input: 'I maintain the security pipeline.', mustMatch: /\bmaintain\b/ },
  { name: 'preserves meaning: establish', input: 'We establish a trusted baseline first.', mustMatch: /\bestablish\b/ },
  { name: 'preserves meaning: significant (important)', input: 'That is a significant architectural risk.', mustMatch: /\bsignificant\b/ },
  { name: 'preserves meaning: fundamental', input: 'It is a fundamental design flaw.', mustMatch: /\bfundamental\b/ },
  { name: 'batch2: eliminate -> remove', input: 'I eliminate the false positives first.', mustNotMatch: /\beliminate\b/i , mustMatch: /\bremove\b/ },
  { name: 'batch2: notify -> tell', input: 'I notify the dev team about the fix.', mustNotMatch: /\bnotify\b/i , mustMatch: /\btell\b/ },
  { name: 'batch2: stringent -> strict', input: 'We keep stringent policy gates.', mustNotMatch: /\bstringent\b/i , mustMatch: /\bstrict\b/ },
  { name: 'batch2: rectify -> fix', input: 'I rectify the config and move on.', mustNotMatch: /\brectify\b/i , mustMatch: /\bfix\b/ },
  { name: 'batch2 phrase: in order to -> to', input: 'I pin versions in order to stop confusion.', mustNotMatch: /in order to/i },
  { name: 'keeps technical term: verify NOT swapped', input: 'I verify the artifact signature on each build.', mustMatch: /\bverify\b/ },
  { name: 'keeps technical term: evaluate NOT swapped', input: 'I evaluate exploitability before flagging it.', mustMatch: /\bevaluate\b/ },
  { name: 'batch3: overdue -> late', input: 'I chase the overdue patches first.', mustNotMatch: /\boverdue\b/i , mustMatch: /\blate\b/ },
  { name: 'batch3: quarter over quarter -> over time', input: 'High-risk issues drop quarter over quarter.', mustNotMatch: /quarter over quarter/i , mustMatch: /over time/ },
  { name: 'slang: bake -> build', input: 'We bake security into the pipeline.', mustNotMatch: /\bbake\b/i , mustMatch: /\bbuild\b/ },
  { name: 'slang: spin up -> set up', input: 'I can spin up a scanner quickly.', mustNotMatch: /spin up/i , mustMatch: /set up/ },
  // British -> American/international spelling (influence is the accent, not the spelling).
  { name: 'spelling: prioritise -> prioritize', input: 'I prioritise the critical findings first.', mustNotMatch: /prioritise/i , mustMatch: /prioritize/ },
  { name: 'spelling: prioritisation -> prioritization', input: 'My job is the prioritisation of reachable risks.', mustNotMatch: /prioritisation/i , mustMatch: /prioritization/ },
  { name: 'spelling: sanitisation -> sanitization', input: 'I add prompt sanitisation before the model sees input.', mustNotMatch: /sanitisation/i , mustMatch: /sanitization/ },
  { name: 'spelling: modelling -> modeling', input: 'I do threat modelling in the design phase.', mustNotMatch: /modelling/i , mustMatch: /modeling/ },
  { name: 'spelling: behavioural -> behavioral', input: 'We run behavioural analysis on the build.', mustNotMatch: /behavioural/i , mustMatch: /behavioral/ },
  { name: 'spelling: defence -> defense', input: 'I build defence in depth into the pipeline.', mustNotMatch: /defence/i , mustMatch: /defense/ },
  { name: 'spelling: organise -> organize', input: 'I organise the findings by owner.', mustNotMatch: /organise/i , mustMatch: /organize/ },
  { name: 'word: several -> many', input: 'I worked with several developer teams.', mustNotMatch: /\bseveral\b/i , mustMatch: /\bmany\b/ },
  // GUARDS: always-"-ise" words (some are real terms) must NOT be mangled.
  { name: 'guard: compromise NOT changed', input: 'We never compromise on the security gate.', mustMatch: /\bcompromise\b/ },
  { name: 'guard: enterprise NOT changed', input: 'I rolled this out across the enterprise.', mustMatch: /\benterprise\b/ },
  { name: 'guard: exercise NOT changed', input: 'We run a tabletop exercise each quarter.', mustMatch: /\bexercise\b/ },
  { name: 'guard: analysis noun NOT changed', input: 'I run a dependency analysis on each build.', mustMatch: /\banalysis\b/ },
  { name: 'security: flaw -> vulnerability', input: 'I found a flaw in the authentication logic.', mustNotMatch: /\bflaw\b/i , mustMatch: /\bvulnerability\b/ },
  { name: 'security: flaws -> vulnerabilities', input: 'The scan surfaced a few flaws in the login flow.', mustNotMatch: /\bflaws\b/i , mustMatch: /\bvulnerabilities\b/ },
  { name: 'guard: character flaw stays (non-security)', input: 'My weakness is a character flaw I keep working on.', mustMatch: /character flaw/ },
  // Edge pause markers: never open or close an answer (opening with a pause = stalling).
  { name: 'edge: leading {THINK} removed', input: '{THINK}I run a pilot first and compare it to our Black Duck baseline. Then I check the false-positive rate.', mustNotMatch: /^\{THINK\}/ , mustMatch: /^I run a pilot/ },
  { name: 'edge: leading {THINK} + Sure removed', input: '{THINK} Sure, that is a good question. At Wells Fargo I built the triage process and cut the noise.', mustNotMatch: /THINK|good question/i },
  { name: 'edge: trailing {PAUSE} removed', input: 'I isolate the component first. Then I gather the logs and the SBOM snapshot. {PAUSE}', mustNotMatch: /\{PAUSE\}\s*$/ },
  { name: 'guard: mid-answer {THINK} kept', input: 'I check reachability first. {THINK} Then I weigh exploitability and business impact.', mustMatch: /\{THINK\}/ },
  // Deterministic DELIVERY formatting (fast-model paragraphs + pause).
  { name: 'delivery: markerless blob -> 2 paragraphs + pause', input: 'I run Black Duck on every build. I sort by reachability. I hand the real ones to the devs. The rest go in a queue.', mustMatch: /\{PAUSE\}\n\n/ },
  { name: 'delivery: short answer stays one paragraph', input: 'Mainly Black Duck, and I have also used Checkmarx.', mustNotMatch: /\n\n/ },
  { name: 'delivery: skip when {PAUSE} already present', input: 'I do the scan here. {PAUSE} I do the triage next. I then assign the owner. And I log the result.', mustNotMatch: /\n\n/ },
  { name: 'delivery: skip a bullet list', input: '- first I scan the manifest\n- then I triage the findings\n- then I assign an owner', mustNotMatch: /\{PAUSE\}/ },
  { name: 'delivery: single line-breaks reshape into paragraphs', input: 'I run Black Duck on every build.\nI sort by reachability.\nI hand the real ones to the devs.\nThe rest go in a queue.', mustMatch: /\{PAUSE\}\n\n/ },
]

// Runnable from ai_language.test.mjs. Returns { pass, failures[] }.
export function runCatalog() {
  const failures = []
  for (const c of CATALOG) {
    const out = scrubAiLanguage(c.input)
    if (c.mustNotMatch && c.mustNotMatch.test(out)) failures.push(`${c.name}: tell survived -> "${out}"`)
    if (c.mustMatch && !c.mustMatch.test(out)) failures.push(`${c.name}: expected replacement missing -> "${out}"`)
  }
  for (const f of runGuidanceCatalog().failures) failures.push(f)
  return { pass: failures.length === 0, failures }
}

// --- CATALOG for scrubGuidance (WorkCoPilot) ----------------------------------
// The work guide copies commands/code to the screen verbatim, so the invariants
// are different from the interview scrubber: NEVER inject a {PAUSE}, NEVER mangle
// an inline `code`/command span, NEVER interview-de-refuse, but DO clean the
// genuine AI-language tells (em-dash, "Sure," opener, formal words).
export const GUIDANCE_CATALOG = [
  { name: 'guidance: no {PAUSE} injected into a long block', input: 'Open the EC2 console. Click Launch Instance. Pick the Amazon Linux AMI. Name the instance web-1.', mustNotMatch: /\{PAUSE\}/ },
  { name: 'guidance: strips a stray {PAUSE} token', input: 'Type the command. {PAUSE} Then press Enter.', mustNotMatch: /\{PAUSE\}/ },
  { name: 'guidance: strips a stray {THINK} token', input: 'Read the error first. {THINK} Then run the fix.', mustNotMatch: /\{THINK\}/ },
  { name: 'guidance: inline command with semicolon is NOT mangled', input: 'Run `git add .; git commit -m "init"` in the project root.', mustMatch: /git add \.; git commit -m "init"/ },
  { name: 'guidance: fenced code with semicolons survives', input: 'Paste this:\n```\na=1; b=2;\nfor i in x; do echo $i; done\n```', mustMatch: /a=1; b=2;/ },
  { name: 'guidance: inline SQL semicolons survive', input: 'Run `SELECT * FROM users; SELECT 1;` to check.', mustMatch: /SELECT \* FROM users; SELECT 1;/ },
  { name: 'guidance: em-dash prose still cleaned (owner rule)', input: 'Open the file — then save it.', mustNotMatch: /—/ },
  { name: 'guidance: filler opener still stripped', input: 'Sure. Click the blue Create button at the top right.', mustNotMatch: /^Sure/ },
  { name: 'guidance: formal word still simplified', input: 'I always utilize the search box to find the setting.', mustNotMatch: /\butilize\b/i },
  { name: 'guidance: a safety refusal is NOT turned into the interview repeat line', input: "I'm sorry, but I can't help break into that account.", mustNotMatch: /repeat the question/i },
  { name: 'guidance: placeholder braces are preserved', input: 'Replace {your-bucket-name} with your real bucket.', mustMatch: /\{your-bucket-name\}/ },
  { name: 'guidance: a closing confirmation is NOT stripped', input: 'Click Save in the dialog. This gives you a working config file on disk.', mustMatch: /working config file/i },
]
export function runGuidanceCatalog() {
  const failures = []
  for (const c of GUIDANCE_CATALOG) {
    const out = scrubGuidance(c.input)
    if (c.mustNotMatch && c.mustNotMatch.test(out)) failures.push(`${c.name}: FAIL -> "${out}"`)
    if (c.mustMatch && !c.mustMatch.test(out)) failures.push(`${c.name}: expected content missing -> "${out}"`)
  }
  return { pass: failures.length === 0, failures }
}
