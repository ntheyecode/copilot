# Verification sweeps for the v2 patent package: dashes, AI-tell words, abstract length,
# inventor-name spelling, citation traceability. Read-only; prints a report.
import re, sys, glob, os, io

V2 = r"D:\RadarOps\copilot\patent-package\v2"
SRC_FILES = [
    r"D:\RadarOps\copilot\patent-package\05-novelty-synthesis-and-claims-v2.md",
    r"D:\RadarOps\copilot\patent-package\01-prior-art-search.md",
] + glob.glob(r"C:\Users\1\AppData\Local\Temp\claude\D--RadarOps-copilot\1bb12420-0c30-43b4-b1ab-7db196c8622e\scratchpad\patent\*.md")

BANNER = "DRAFT \u2014 for review by a registered patent practitioner before filing. Not legal advice."
AI_TELL = ["delve", "seamless", "unlock", "empower", "robust", "leverage", "elevate", "supercharge",
           "effortless", "realm", "streamline", "harness", "cutting-edge", "game-chang", "tapestry",
           "paradigm", "synergy", "foster", "utilize", "meticulous", "intricate", "testament", "landscape",
           "embark", "journey", "revolutioniz", "transformative", "unparalleled", "state-of-the-art"]

def read(p):
    return io.open(p, encoding="utf-8").read()

files = sorted(glob.glob(os.path.join(V2, "*.md")))
print("== files:", len(files))
ok = True

# 1. dashes
print("\n== Em-dash / en-dash sweep (U+2014, U+2013, '--')")
for f in files:
    txt = read(f)
    lines = txt.split("\n")
    hits = []
    for n, l in enumerate(lines, 1):
        if "\u2014" in l or "\u2013" in l or "--" in l:
            if l.strip() == BANNER:
                continue
            # markdown table separator rows and horizontal rules are not prose
            if re.fullmatch(r"\|?[\s|:\-]+\|?", l.strip()) or re.fullmatch(r"-{3,}", l.strip()):
                continue
            hits.append((n, l.strip()[:120]))
    banner_ok = lines[0].strip() == BANNER
    print(f"{os.path.basename(f)}: banner_first_line={banner_ok}; other dash hits={len(hits)}")
    for n, l in hits:
        print(f"   line {n}: {l}")
        ok = False
    if not banner_ok: ok = False

# 2. AI-tell words
print("\n== AI-tell word sweep")
for f in files:
    txt = read(f)
    hits = []
    for n, l in enumerate(txt.split("\n"), 1):
        low = l.lower()
        for w in AI_TELL:
            for m in re.finditer(re.escape(w), low):
                hits.append((n, w, l.strip()[:110]))
    print(f"{os.path.basename(f)}: {len(hits)} hits")
    for n, w, l in hits:
        print(f"   line {n} [{w}]: {l}")
        ok = False

# 3. abstract word count
ab = read(os.path.join(V2, "30-abstract.md"))
body = ab.split("## ABSTRACT OF THE DISCLOSURE", 1)[1].strip()
words = re.findall(r"\S+", body)
print(f"\n== Abstract word count: {len(words)} (limit 150)")
if len(words) > 150: ok = False

# 4. inventor name spelling
print("\n== Inventor name check")
for f in files:
    txt = read(f)
    bad = re.findall(r"Ravi(?! Kiran Raju Yerra)[A-Za-z ]{0,25}Yerra", txt)
    good = txt.count("Ravi Kiran Raju Yerra")
    print(f"{os.path.basename(f)}: exact={good}; variants={bad}")
    if bad: ok = False

# 5. citation traceability
print("\n== Citation traceability (every patent/arXiv number in v2 must appear in 05 or a priorart file)")
corpus = "".join(read(p) for p in SRC_FILES)
def norm(s): return re.sub(r"[\s,/:]", "", s).upper()
corpus_n = norm(corpus)
pat = re.compile(r"US\s?\d{1,2},?\d{3},?\d{3}\s?[AB]?\d?|US\s?\d{4}/\d{7}\s?A\d|WO\s?\d{4}/\d{6}\s?A\d|arXiv\s?\d{4}\.\d{5}|IL\s?\d{6}")
missing = set(); total = set()
for f in files:
    for m in pat.findall(read(f)):
        key = norm(m)
        # strip kind code for matching robustness
        base = re.sub(r"(A1|A9|B1|B2|A)$", "", key)
        total.add(m.strip())
        if base not in corpus_n:
            missing.add(m.strip())
print(f"distinct citations in v2: {len(total)}; untraceable: {len(missing)}")
for m in sorted(missing):
    print("   MISSING:", m); ok = False

# 6. reference numeral consistency: numerals in claims/drawings must exist in spec
print("\n== Reference numeral check (claims + drawings vs specification)")
spec = read(os.path.join(V2, "10-specification.md"))
spec_nums = set(re.findall(r"\b([1-9]\d{2})\b", spec))
for name in ["20-claims.md", "40-drawings-description.md"]:
    txt = read(os.path.join(V2, name))
    # remove statute cites and patent numbers so their digits are not read as reference numerals
    txt = re.sub(r"U\.S\.C\.\s*\d+", "", txt)
    txt = re.sub(r"§\s*\d+", "", txt)
    txt = pat.sub("", txt)
    nums = set(re.findall(r"\b([1-9]\d{2})\b", txt))
    # ignore numbers that are obviously not numerals (years, fee amounts) by restricting to 100-999 range used
    cand = {n for n in nums if 100 <= int(n) <= 999}
    miss = sorted(n for n in cand if n not in spec_nums)
    print(f"{name}: numerals used={len(cand)}; not in spec={miss}")
    if miss: ok = False

print("\nRESULT:", "CLEAN" if ok else "ISSUES FOUND")
