# Build the three final patent packages (provisional, utility, utility-with-priority) from single sources.
#
#   python tools/build.py            (run from patent-package/final, or anywhere: paths are absolute)
#
# Sources:
#   patent-package/v2/10-specification.md, 20-claims.md, 30-abstract.md  (technical content, finalized here)
#   patent-package/final/tools/src/*.md                                   (hand-authored package documents)
#   patent-package/final/drawings/                                        (FIG. 1 to FIG. 13, drawings.pdf, numerals.json)
#
# The with-priority package is derived from the utility package by exact, asserted substitutions, so the two
# can never drift apart except where the brief says they differ. Page counts shown in the cover sheet and
# fee worksheets are measured from the rendered DOCX files, not typed by hand.
import io, os, re, shutil, subprocess, sys, glob, json

FINAL = r"D:\RadarOps\copilot\patent-package\final"
V2 = r"D:\RadarOps\copilot\patent-package\v2"
SRC = os.path.join(FINAL, "tools", "src")
SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"
NODE_CONV = os.path.join(FINAL, "tools", "md2docx.cjs")
SCRATCH = os.path.join(os.environ.get("TEMP", r"C:\Temp"), "patent-final-build")

HEADER = "Prepared for Ravi Kiran Raju Yerra. Attorney review recommended before filing. Not legal advice."
TITLE_CAPS = "SCREEN-AWARE, READ-ONLY TASK GUIDANCE WITH ON-DEVICE REDACTION AND TENANT-GOVERNED DATA EGRESS"
OLD_TITLE = ("SCREEN-AWARE, READ-ONLY TASK GUIDANCE WITH ON-DEVICE REDACTION, TENANT-GOVERNED DATA EGRESS, "
             "SCREEN-DERIVED CLARIFICATION AND TIERED WORKFLOW-TEMPLATE RETRIEVAL")
CROSSREF_NONE = "Not applicable. This application does not claim the benefit of any earlier application."
CROSSREF_PRIORITY = ("This application claims the benefit of U.S. Provisional Application No. "
                     "[ENTER PROVISIONAL APPLICATION NUMBER FROM FILING RECEIPT], filed [ENTER PROVISIONAL FILING DATE].")

# Counts that every package document quotes; the sweep checks the same numbers.
N_FIG_SHEETS = 13          # FIG. 1 to FIG. 13 (FIG. 8A and 8B share one sheet)
N_CLAIMS = 29
N_INDEPENDENT = 6
LAST_PARA = "[0112]"

PKG_UTIL = os.path.join(FINAL, "utility")
PKG_PRIO = os.path.join(FINAL, "utility-with-priority")
PKG_PROV = os.path.join(FINAL, "provisional")


def read(p):
    return io.open(p, encoding="utf-8").read().replace("\r\n", "\n")


def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with io.open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(s if s.endswith("\n") else s + "\n")


def must_replace(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"build: expected exactly one occurrence of {label!r}, found {n}")
    return text.replace(old, new)


def between(text, start, end, label):
    a = text.find(start)
    b = text.find(end, a + len(start)) if end else len(text)
    if a < 0 or b < 0:
        raise SystemExit(f"build: could not locate section {label!r}")
    return text[a:b]


# ---------------- specification, claims, abstract from v2 ----------------

def spec_body(crossref):
    t = read(os.path.join(V2, "10-specification.md"))
    body = t[t.index("## TITLE OF THE INVENTION"):]
    body = must_replace(body, OLD_TITLE, TITLE_CAPS, "title")
    old_cross = [l for l in body.split("\n") if l.startswith("[PLACEHOLDER:")]
    if len(old_cross) != 1:
        raise SystemExit("build: cross-reference placeholder not found once")
    body = body.replace(old_cross[0], crossref)
    if "[PLACEHOLDER" in body or "[verify" in body:
        raise SystemExit("build: unresolved marker in specification body")
    return body.strip() + "\n"


def claims_parts():
    t = read(os.path.join(V2, "20-claims.md"))
    lead = between(t, "## WHAT IS CLAIMED IS:", "\n---\n\n## Claim support map", "lead claims").strip() + "\n"
    support = between(t, "## Claim support map", "\n---\n\n## Appendix", "support map").strip() + "\n"
    appendix = t[t.index("## Appendix: Additional candidate independent claims"):].strip() + "\n"
    # appendix: drop the v2 blockquote note and the heading (rewritten below)
    appendix_claims = appendix[appendix.index("**A1 (II-1, method).**"):]
    support = support.replace("Supporting specification paragraphs (file 10)", "Supporting specification paragraphs (specification.md)")
    support = support.replace("(from 05 §4 and §6; not filed)", "(not filed)")
    support = support.replace("## Claim support map (for the practitioner; not filed)", "## Claim support map")
    support = support.replace("## Antecedent-basis self-check (performed on this v2 set)", "## Antecedent-basis self-check")
    support = support.replace("## Drafting notes on code support (not filed)", "## Drafting notes on code support")
    support = support.replace("(paragraph [0066], second sentence)", "(specification paragraph [0066], second sentence)")
    for bad in ["file 10", "file 20", "file 00", "v1 ", "v2 "]:
        if bad in support:
            raise SystemExit(f"build: stale package reference {bad!r} in support notes")
    return lead, support, appendix_claims


def abstract_body():
    t = read(os.path.join(V2, "30-abstract.md"))
    body = t.split("## ABSTRACT OF THE DISCLOSURE", 1)[1].strip()
    n = len(re.findall(r"\S+", body))
    if n > 150:
        raise SystemExit(f"build: abstract has {n} words")
    return body + "\n"


def make_specification_md(crossref):
    return HEADER + "\n\n# SPECIFICATION\n\n" + spec_body(crossref)


def make_claims_md():
    lead, support, appendix_claims = claims_parts()
    note_a = ("These four claims are candidates for a restriction response, a divisional application or a "
              "continuation. They are not part of the claim set as filed. Adding them to this application would raise "
              f"the count to {N_CLAIMS + 4} claims and {N_INDEPENDENT + 4} independent claims, adding further excess-claim fees "
              "(see fee-worksheet.md) and making a restriction requirement probable. Claims A1 and A2 describe the "
              "workflow-template arrangement of specification paragraphs [0072] to [0081], which is reduced to practice "
              "(plan and finalize routes wired on 2026-10-27). Terms are self-contained within each appendix claim. "
              "Delete Appendix A and Appendix B before uploading claims.docx on its own; editable/application-body.docx "
              "already omits both appendices.")
    return (HEADER + "\n\n# CLAIMS\n\n" + lead +
            "\n<!-- pagebreak -->\n\n# APPENDIX A: CANDIDATE ADDITIONAL INDEPENDENT CLAIMS (NOT PART OF THE CLAIMS AS FILED)\n\n"
            + note_a + "\n\n" + appendix_claims +
            "\n<!-- pagebreak -->\n\n# APPENDIX B: PRACTITIONER NOTES (NOT FOR FILING)\n\n" + support)


def make_abstract_md():
    return HEADER + "\n\n# ABSTRACT OF THE DISCLOSURE\n\n" + abstract_body()


def make_application_body_md(crossref):
    lead, _, _ = claims_parts()
    return (HEADER + "\n\n# SPECIFICATION\n\n" + spec_body(crossref) +
            "\n<!-- pagebreak -->\n\n# CLAIMS\n\n" + lead +
            "\n<!-- pagebreak -->\n\n# ABSTRACT OF THE DISCLOSURE\n\n" + abstract_body())


def make_provisional_spec_md():
    lead, _, _ = claims_parts()
    top = (HEADER + "\n\n# PROVISIONAL APPLICATION FOR PATENT\n\n"
           "Inventor: Ravi Kiran Raju Yerra, Celina, Texas, United States.\n\n"
           "Title of the invention: " + TITLE_CAPS + "\n\n"
           "This provisional application (35 U.S.C. 111(b)) comprises the specification below, the drawings FIG. 1 to FIG. 13 "
           f"(drawings/drawings.pdf, {N_FIG_SHEETS} sheets), the claims and the abstract. Claims are not required in a provisional "
           "application; they are included so that the provisional discloses every claimed combination and supports the "
           "nonprovisional application that will claim its benefit within twelve months.\n\n")
    return (top + spec_body(CROSSREF_NONE) +
            "\n<!-- pagebreak -->\n\n# CLAIMS\n\n" + lead +
            "\n<!-- pagebreak -->\n\n# ABSTRACT OF THE DISCLOSURE\n\n" + abstract_body())


# ---------------- hand-authored sources ----------------

def src(name):
    t = read(os.path.join(SRC, name))
    if not t.startswith(HEADER):
        raise SystemExit(f"build: source {name} must begin with the review header")
    return t


def derive_priority_ads(util_ads):
    s, e = "<!-- domestic-benefit-start -->", "<!-- domestic-benefit-end -->"
    block = between(util_ads, s, e, "domestic benefit")
    new_block = s + "\n\n" + src("with-priority-ads-benefit-section.md").split("\n", 1)[1].strip() + "\n\n"
    out = util_ads.replace(block, new_block)
    out = must_replace(out, "Prior application: none. This is a first filing and no benefit of any earlier application is claimed.",
                       "Prior application: this application claims the benefit of the provisional application identified in section 7 under 35 U.S.C. 119(e).",
                       "ads intro benefit line")
    return out


def derive_priority_instructions(util_instr):
    out = util_instr
    for tag, srcname in [("intro", "with-priority-instructions-intro.md"), ("benefit", "with-priority-instructions-benefit-section.md")]:
        s, e = f"<!-- {tag}-start -->", f"<!-- {tag}-end -->"
        block = between(out, s, e, tag)
        out = out.replace(block, s + "\n\n" + src(srcname).split("\n", 1)[1].strip() + "\n\n")
    out = must_replace(out, "# Filing instructions: nonprovisional utility application (standalone, no benefit claim)",
                       "# Filing instructions: nonprovisional utility application claiming the benefit of the provisional", "instr title")
    out = must_replace(out, "## 8. If a provisional application is filed first",
                       "## 8. The benefit claim: the two values to enter and the deadlines", "instr section 8 heading")
    out = must_replace(out, "| | Calendar entries made: IDS window, 12-month foreign filing deadline, Filing Receipt check |",
                       "| | Provisional application number and filing date entered in the specification cross-reference and in the ADS; a search for \"[ENTER\" in application-body.docx finds nothing |\n"
                       "| | Filed no later than twelve months after the provisional filing date |\n"
                       "| | Calendar entries made: IDS window, 12-month foreign filing deadline, Filing Receipt check including the domestic priority line |",
                       "instr checklist")
    out = must_replace(out, "9. Letting the twelve-month foreign filing window pass without a decision.",
                       "9. Letting the twelve-month foreign filing window pass without a decision.\n"
                       "10. Leaving either \"[ENTER ...]\" marker in the filed specification or omitting the benefit claim from the ADS.",
                       "instr mistakes")
    out = must_replace(out, "| specification.md and editable/specification.docx | The specification: title, cross-reference, federally",
                       "| specification.md and editable/specification.docx | The specification: title, cross-reference to the provisional application (two values to enter), federally",
                       "instr package table")
    return out


# ---------------- DOCX conversion and page counting ----------------

def to_docx(md_path, docx_path):
    os.makedirs(os.path.dirname(docx_path), exist_ok=True)
    r = subprocess.run(["node", NODE_CONV, md_path, docx_path], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"build: docx conversion failed for {md_path}\n{r.stdout}\n{r.stderr}")


def pdf_pages(docx_path):
    os.makedirs(SCRATCH, exist_ok=True)
    r = subprocess.run([SOFFICE, "--headless", "--convert-to", "pdf", "--outdir", SCRATCH, docx_path], capture_output=True, text=True)
    pdf = os.path.join(SCRATCH, os.path.splitext(os.path.basename(docx_path))[0] + ".pdf")
    if r.returncode != 0 or not os.path.exists(pdf):
        raise SystemExit(f"build: LibreOffice could not render {docx_path}\n{r.stdout}\n{r.stderr}")
    import fitz
    with fitz.open(pdf) as d:
        return d.page_count


def convert_package(pkg):
    for md in sorted(glob.glob(os.path.join(pkg, "*.md"))):
        to_docx(md, os.path.join(pkg, "editable", os.path.splitext(os.path.basename(md))[0] + ".docx"))


def copy_drawings(pkg):
    dst = os.path.join(pkg, "drawings")
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    os.makedirs(dst)
    for f in ["drawings.pdf", "drawings-manifest.md", "numerals.json"] + [f"FIG-{i}.svg" for i in range(1, N_FIG_SHEETS + 1)]:
        shutil.copy2(os.path.join(FINAL, "drawings", f), os.path.join(dst, f))


def main():
    for pkg in (PKG_UTIL, PKG_PRIO, PKG_PROV):
        if os.path.isdir(pkg):
            shutil.rmtree(pkg)
        os.makedirs(pkg)

    # ---- utility (standalone) ----
    write(os.path.join(PKG_UTIL, "specification.md"), make_specification_md(CROSSREF_NONE))
    write(os.path.join(PKG_UTIL, "claims.md"), make_claims_md())
    write(os.path.join(PKG_UTIL, "abstract.md"), make_abstract_md())
    write(os.path.join(PKG_UTIL, "application-body.md"), make_application_body_md(CROSSREF_NONE))
    util_ads = src("application-data-sheet.md")
    util_instr = src("FILING-INSTRUCTIONS-utility.md")
    write(os.path.join(PKG_UTIL, "application-data-sheet.md"), util_ads)
    write(os.path.join(PKG_UTIL, "inventor-declaration.md"), src("inventor-declaration.md"))
    write(os.path.join(PKG_UTIL, "ids-and-references.md"), src("ids-and-references.md"))
    write(os.path.join(PKG_UTIL, "fee-worksheet.md"), src("fee-worksheet-utility.md"))
    write(os.path.join(PKG_UTIL, "FILING-INSTRUCTIONS.md"), util_instr)

    # ---- utility with priority (derived) ----
    write(os.path.join(PKG_PRIO, "specification.md"), make_specification_md(CROSSREF_PRIORITY))
    write(os.path.join(PKG_PRIO, "claims.md"), make_claims_md())
    write(os.path.join(PKG_PRIO, "abstract.md"), make_abstract_md())
    write(os.path.join(PKG_PRIO, "application-body.md"), make_application_body_md(CROSSREF_PRIORITY))
    write(os.path.join(PKG_PRIO, "application-data-sheet.md"), derive_priority_ads(util_ads))
    write(os.path.join(PKG_PRIO, "inventor-declaration.md"), src("inventor-declaration.md"))
    write(os.path.join(PKG_PRIO, "ids-and-references.md"), src("ids-and-references.md"))
    write(os.path.join(PKG_PRIO, "fee-worksheet.md"), src("fee-worksheet-utility.md"))
    write(os.path.join(PKG_PRIO, "FILING-INSTRUCTIONS.md"), derive_priority_instructions(util_instr))

    # ---- provisional ----
    write(os.path.join(PKG_PROV, "specification.md"), make_provisional_spec_md())
    write(os.path.join(PKG_PROV, "provisional-cover-sheet.md"), src("provisional-cover-sheet.md"))
    write(os.path.join(PKG_PROV, "fee-worksheet.md"), src("fee-worksheet-provisional.md"))
    write(os.path.join(PKG_PROV, "FILING-INSTRUCTIONS.md"), src("FILING-INSTRUCTIONS-provisional.md"))

    # ---- README at the root ----
    write(os.path.join(FINAL, "README-WHAT-IS-WHAT.md"), src("README-WHAT-IS-WHAT.md"))

    for pkg in (PKG_UTIL, PKG_PRIO, PKG_PROV):
        copy_drawings(pkg)
        convert_package(pkg)
    to_docx(os.path.join(FINAL, "README-WHAT-IS-WHAT.md"), os.path.join(FINAL, "README-WHAT-IS-WHAT.docx"))

    # ---- measured page counts, then rebuild the documents that quote them ----
    body_pages = pdf_pages(os.path.join(PKG_UTIL, "editable", "application-body.docx"))
    prov_pages = pdf_pages(os.path.join(PKG_PROV, "editable", "specification.docx"))
    counts = {"{{BODY_PAGES}}": str(body_pages), "{{PROV_SPEC_PAGES}}": str(prov_pages),
              "{{BODY_PLUS_DRAWINGS}}": str(body_pages + N_FIG_SHEETS), "{{PROV_PLUS_DRAWINGS}}": str(prov_pages + N_FIG_SHEETS)}
    touched = []
    for md in glob.glob(os.path.join(FINAL, "**", "*.md"), recursive=True):
        if os.sep + "drawings" + os.sep in md or os.sep + "tools" + os.sep in md:
            continue
        t = read(md)
        if "{{" in t:
            for k, v in counts.items():
                t = t.replace(k, v)
            if "{{" in t:
                raise SystemExit(f"build: unknown marker in {md}")
            write(md, t)
            touched.append(md)
    for md in touched:
        pkg = os.path.dirname(md)
        out = os.path.join(pkg, "editable", os.path.splitext(os.path.basename(md))[0] + ".docx") if pkg != FINAL \
            else os.path.join(FINAL, os.path.splitext(os.path.basename(md))[0] + ".docx")
        to_docx(md, out)
    json.dump({"application_body_pages": body_pages, "provisional_specification_pages": prov_pages},
              io.open(os.path.join(FINAL, "tools", "page-counts.json"), "w", encoding="utf-8"), indent=1)
    print("build: ok; application body pages =", body_pages, "; provisional specification pages =", prov_pages)


if __name__ == "__main__":
    main()
