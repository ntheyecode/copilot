# Verification sweeps for the final patent packages. Read-only; prints a report and exits 1 on any issue.
#
#   python tools/sweep.py
#
# Checks every Markdown master and every DOCX in patent-package/final/{provisional,utility,utility-with-priority}
# and README-WHAT-IS-WHAT: review header present; no em-dash, en-dash or double hyphen in prose; no AI-tell words
# (a quoted third-party paper title followed by its arXiv identifier is exempt, since a citation is verbatim);
# no placeholders (the two "[ENTER ...]" markers are permitted only in utility-with-priority and in the README that
# describes them); inventor name spelled exactly; abstract at most 150 words; reference numerals in each
# specification equal to the union of numerals drawn on FIG. 1 to FIG. 13; claims numerals a subset of the
# specification; title consistent; DOCX files open (zip integrity, python-docx, LibreOffice render); and the
# with-priority package differs from the utility package only in the files the brief allows.
import io, os, re, sys, glob, json, zipfile, subprocess, filecmp

FINAL = r"D:\RadarOps\copilot\patent-package\final"
PKGS = ["provisional", "utility", "utility-with-priority"]
SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"
SCRATCH = os.path.join(os.environ.get("TEMP", r"C:\Temp"), "patent-final-sweep")
HEADER = "Prepared for Ravi Kiran Raju Yerra. Attorney review recommended before filing. Not legal advice."
TITLE_CAPS = "SCREEN-AWARE, READ-ONLY TASK GUIDANCE WITH ON-DEVICE REDACTION AND TENANT-GOVERNED DATA EGRESS"
TITLE_TC = "Screen-Aware, Read-Only Task Guidance with On-Device Redaction and Tenant-Governed Data Egress"
AI_TELL = ["delve", "seamless", "unlock", "empower", "robust", "leverage", "elevate", "supercharge",
           "effortless", "realm", "streamline", "harness", "cutting-edge", "game-chang", "tapestry",
           "paradigm", "synergy", "foster", "utilize", "meticulous", "intricate", "testament", "landscape",
           "embark", "journey", "revolutioniz", "transformative", "unparalleled", "state-of-the-art",
           "crucial", "pivotal", "ever-evolving", "it is important to note", "in today's"]
PLACEHOLDER_PATTERNS = [r"\[PLACEHOLDER", r"\bTBD\b", r"XXXX", r"\[verify", r"\{\{", r"lorem ipsum", r"\[INSERT", r"\[TODO", r"\bTODO\b"]
ALLOWED_ENTER = {"[ENTER PROVISIONAL APPLICATION NUMBER FROM FILING RECEIPT]", "[ENTER PROVISIONAL FILING DATE]",
                 "[ENTER FROM PROVISIONAL FILING RECEIPT]"}
PATENT_NUM = re.compile(r"US\s?\d{1,2},?\d{3},?\d{3}\s?[AB]?\d?|US\s?\d{4}/\d{7}\s?A\d|arXiv\s?\d{4}\.\d{5}")
# Counts that the package documents quote (kept in step with tools/build.py).
N_FIG_SHEETS = 13
N_CLAIMS = 20
INDEPENDENT = ["1", "9", "14", "19"]
LAST_PARA = 112          # paragraphs [0001] to [0112]
NUMERAL_MAX = 1399       # reference numerals run 100 to 1399 (FIG. 1 to FIG. 13 series)

issues = []


def issue(msg):
    issues.append(msg)
    print("  ISSUE:", msg)


def read(p):
    return io.open(p, encoding="utf-8").read().replace("\r\n", "\n")


def docx_text(path):
    import docx as pydocx
    d = pydocx.Document(path)
    parts = []
    for p in d.paragraphs:
        parts.append(p.text)
    for t in d.tables:
        for row in t.rows:
            for c in row.cells:
                parts.append(c.text)
    header = " ".join(p.text for s in d.sections for p in s.header.paragraphs)
    return "\n".join(parts), header


def prose_lines(text):
    for n, l in enumerate(text.split("\n"), 1):
        s = l.strip()
        if re.fullmatch(r"\|?[\s|:\-]+\|?", s) or re.fullmatch(r"-{3,}", s) or s.startswith("<!--"):
            continue
        yield n, l


def md_prose_words(text):
    # words of a Markdown master as they reach the DOCX: comment lines, table rules and pipe characters removed
    out = []
    for n, l in prose_lines(text):
        out.append(l.replace("|", " "))
    return len(re.findall(r"\S+", "\n".join(out)))


def sweep_text(label, text, pkg, is_md):
    # dashes
    for n, l in prose_lines(text):
        if "\u2014" in l or "\u2013" in l or "--" in l:
            issue(f"{label} line {n}: dash: {l.strip()[:100]}")
    # AI-tell (a verbatim third-party paper title, quoted and followed by its arXiv identifier, is a
    # citation rather than our prose and is exempt; everything else is checked)
    low = text.lower()
    cited_title_spans = [(q.start(), q.end()) for q in re.finditer(r'"[^"\n]{3,200}"', text)
                         if re.match(r'[^"\n]{0,80}arxiv', low[q.end(): q.end() + 90])]
    for w in AI_TELL:
        for m in re.finditer(re.escape(w), low):
            if any(a <= m.start() < b for a, b in cited_title_spans):
                continue
            ctx = text[max(0, m.start() - 40): m.end() + 40].replace("\n", " ")
            issue(f"{label}: AI-tell '{w}': ...{ctx}...")
    # placeholders
    for pat in PLACEHOLDER_PATTERNS:
        for m in re.finditer(pat, text, flags=re.I if pat.startswith(r"\b") else 0):
            ctx = text[max(0, m.start() - 30): m.end() + 30].replace("\n", " ")
            issue(f"{label}: placeholder '{pat}': ...{ctx}...")
    enters = re.findall(r"\[ENTER[A-Z ]*\]", text)
    for e in enters:
        if e not in ALLOWED_ENTER:
            issue(f"{label}: unexpected marker {e}")
    if enters and pkg not in ("utility-with-priority", "README"):
        issue(f"{label}: '[ENTER' marker present outside the with-priority package")
    # inventor name
    for m in re.finditer(r"Ravi(?! Kiran Raju Yerra)[A-Za-z ]{0,25}Yerra", text):
        issue(f"{label}: inventor name variant '{m.group(0)}'")
    if "Kiran Raju Yerra" in text and "Ravi Kiran Raju Yerra" not in text:
        issue(f"{label}: partial inventor name")
    return len(enters)


def numerals_in(text):
    t = PATENT_NUM.sub("", text)
    t = re.sub(r"U\.S\.C\.\s*\d+", "", t)
    t = re.sub(r"37 CFR [\d.]+(\([a-z0-9]\))*", "", t)
    t = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "", t)
    return {n for n in re.findall(r"\b([1-9]\d{2,3})\b", t) if int(n) <= NUMERAL_MAX}


def main():
    os.makedirs(SCRATCH, exist_ok=True)
    manifest = json.load(io.open(os.path.join(FINAL, "drawings", "numerals.json"), encoding="utf-8"))
    fig_union = set()
    for v in manifest.values():
        fig_union |= set(v)
    if len(manifest) != N_FIG_SHEETS:
        issue(f"numerals.json lists {len(manifest)} sheets, expected {N_FIG_SHEETS}")
    print(f"figure numerals (union over FIG. 1 to FIG. {N_FIG_SHEETS}): {len(fig_union)}")

    md_files, docx_files = [], []
    for pkg in PKGS:
        md_files += [(pkg, p) for p in sorted(glob.glob(os.path.join(FINAL, pkg, "*.md")))]
        docx_files += [(pkg, p) for p in sorted(glob.glob(os.path.join(FINAL, pkg, "editable", "*.docx")))]
    md_files.append(("README", os.path.join(FINAL, "README-WHAT-IS-WHAT.md")))
    docx_files.append(("README", os.path.join(FINAL, "README-WHAT-IS-WHAT.docx")))

    print("\n== Markdown masters")
    enter_counts = {}
    for pkg, p in md_files:
        label = os.path.relpath(p, FINAL)
        t = read(p)
        print(" ", label)
        if t.split("\n", 1)[0].strip() != HEADER:
            issue(f"{label}: first line is not the review header")
        enter_counts[label] = sweep_text(label, t, pkg, True)
        base = os.path.basename(p)
        if base in ("specification.md", "application-body.md"):
            nums = numerals_in(t)
            if nums != fig_union:
                issue(f"{label}: numerals differ from figures; missing from figures={sorted(nums - fig_union)}; not in spec={sorted(fig_union - nums)}")
            for n in range(1, N_FIG_SHEETS + 1):
                if not re.search(rf"FIG\. {n}(?![0-9])", t):
                    issue(f"{label}: brief description lacks FIG. {n}")
            if "FIG. 8A" not in t or "FIG. 8B" not in t:
                issue(f"{label}: FIG. 8A / 8B missing")
            if TITLE_CAPS not in t:
                issue(f"{label}: title in capitals not found")
            paras = [int(m) for m in re.findall(r"^\[(\d{4})\]", t, flags=re.M)]
            if paras != list(range(1, LAST_PARA + 1)):
                issue(f"{label}: paragraph numbering not [0001] to [{LAST_PARA:04d}] in sequence (found {len(paras)} paragraphs)")
        if base == "claims.md":
            lead = t.split("# APPENDIX A", 1)[0]
            spec = read(os.path.join(os.path.dirname(p), "specification.md"))
            extra = numerals_in(lead) - numerals_in(spec)
            if extra:
                issue(f"{label}: numerals in lead claims not in specification: {sorted(extra)}")
            nums = [int(m) for m in re.findall(r"^\*\*(\d+)\.\*\*", lead, flags=re.M)]
            if nums != list(range(1, N_CLAIMS + 1)):
                issue(f"{label}: expected lead claims 1 to {N_CLAIMS} in sequence, found {len(nums)}")
            indep = [m.group(1) for m in re.finditer(r"^\*\*(\d+)\.\*\* (?:A|An) ", lead, flags=re.M)]
            if indep != INDEPENDENT:
                issue(f"{label}: independent claims are {indep}, expected {INDEPENDENT}")
            # every dependent claim refers to a lower-numbered claim
            for m in re.finditer(r"^\*\*(\d+)\.\*\* The (?:method|system|non-transitory computer-readable medium) of claim (\d+)", lead, flags=re.M):
                if int(m.group(2)) >= int(m.group(1)):
                    issue(f"{label}: claim {m.group(1)} depends on claim {m.group(2)}, which is not earlier")
        if base in ("abstract.md", "application-body.md", "specification.md") and "# ABSTRACT OF THE DISCLOSURE" in t:
            body = t.split("# ABSTRACT OF THE DISCLOSURE", 1)[1].strip()
            body = body.split("\n<!--", 1)[0]
            n = len(re.findall(r"\S+", body))
            if n > 150:
                issue(f"{label}: abstract has {n} words")
            else:
                print(f"    abstract words: {n}")
        if base in ("application-data-sheet.md", "inventor-declaration.md", "provisional-cover-sheet.md"):
            if TITLE_TC not in t:
                issue(f"{label}: title (title case) not found")
            if base != "inventor-declaration.md" and ("604 Wexford Dr" not in t or "Celina" not in t or "75009" not in t):
                issue(f"{label}: mailing address incomplete")
            if "Inventor signs here" not in t:
                issue(f"{label}: signature line label missing")
        if base == "application-data-sheet.md" and ("yerraslife@gmail.com" not in t or "408-718-4217" not in t):
            issue(f"{label}: correspondence incomplete")

    print("\n== with-priority marker counts (expected: specification 2, application-body 2, ADS 2, instructions 0 or more)")
    for k, v in enter_counts.items():
        if v:
            print(f"  {k}: {v}")

    print("\n== utility vs utility-with-priority: files that differ")
    allowed_diff = {"specification.md", "application-body.md", "application-data-sheet.md", "FILING-INSTRUCTIONS.md"}
    for p in sorted(glob.glob(os.path.join(FINAL, "utility", "*.md"))):
        q = os.path.join(FINAL, "utility-with-priority", os.path.basename(p))
        if not os.path.exists(q):
            issue(f"missing in with-priority: {os.path.basename(p)}")
            continue
        same = read(p) == read(q)
        print(f"  {os.path.basename(p)}: {'same' if same else 'differs'}")
        if not same and os.path.basename(p) not in allowed_diff:
            issue(f"{os.path.basename(p)} differs between utility and with-priority but should not")
        if same and os.path.basename(p) in allowed_diff:
            issue(f"{os.path.basename(p)} should differ between utility and with-priority")

    print("\n== drawings copied into each package")
    for pkg in PKGS:
        for f in ["drawings.pdf", "numerals.json"] + [f"FIG-{i}.svg" for i in range(1, N_FIG_SHEETS + 1)]:
            a, b = os.path.join(FINAL, "drawings", f), os.path.join(FINAL, pkg, "drawings", f)
            if not os.path.exists(b) or not filecmp.cmp(a, b, shallow=False):
                issue(f"{pkg}/drawings/{f} missing or differs from the master")

    print("\n== DOCX files")
    for pkg, p in docx_files:
        label = os.path.relpath(p, FINAL)
        try:
            with zipfile.ZipFile(p) as z:
                bad = z.testzip()
                if bad:
                    issue(f"{label}: corrupt zip member {bad}")
                names = z.namelist()
                if "word/document.xml" not in names or "[Content_Types].xml" not in names:
                    issue(f"{label}: not a DOCX package")
        except Exception as e:
            issue(f"{label}: cannot open as zip: {e}")
            continue
        try:
            text, header = docx_text(p)
        except Exception as e:
            issue(f"{label}: python-docx cannot open: {e}")
            continue
        if HEADER not in header:
            issue(f"{label}: review header missing from the page header")
        sweep_text(label, text, pkg, False)
        md = os.path.join(os.path.dirname(os.path.dirname(p)), os.path.basename(p)[:-5] + ".md") if pkg != "README" \
            else os.path.join(FINAL, "README-WHAT-IS-WHAT.md")
        if os.path.exists(md):
            md_words = md_prose_words(read(md))
            dx_words = len(re.findall(r"\S+", text))
            if dx_words < 0.9 * md_words:
                issue(f"{label}: DOCX text much shorter than its Markdown master ({dx_words} vs {md_words} words)")
        print(f"  {label}: ok ({len(text)} chars)")

    print("\n== LibreOffice render of every DOCX")
    r = subprocess.run([SOFFICE, "--headless", "--convert-to", "pdf", "--outdir", SCRATCH] + [p for _, p in docx_files],
                       capture_output=True, text=True)
    import fitz
    seen = set()
    for pkg, p in docx_files:
        pdf = os.path.join(SCRATCH, os.path.basename(p)[:-5] + ".pdf")
        label = os.path.relpath(p, FINAL)
        # same basenames exist in several packages; convert per package to disambiguate
        out_dir = os.path.join(SCRATCH, pkg)
        os.makedirs(out_dir, exist_ok=True)
        rr = subprocess.run([SOFFICE, "--headless", "--convert-to", "pdf", "--outdir", out_dir, p], capture_output=True, text=True)
        pdf = os.path.join(out_dir, os.path.basename(p)[:-5] + ".pdf")
        if rr.returncode != 0 or not os.path.exists(pdf):
            issue(f"{label}: LibreOffice could not render")
            continue
        with fitz.open(pdf) as d:
            print(f"  {label}: {d.page_count} pages")

    print("\nRESULT:", "CLEAN" if not issues else f"{len(issues)} ISSUE(S)")
    sys.exit(1 if issues else 0)


if __name__ == "__main__":
    main()
