#!/usr/bin/env python3
"""
Generator for the WorkCoPilot utility-application patent drawings, FIG. 1 to FIG. 13.

Why a generator instead of hand-edited SVG: one place defines the line weight,
the typeface, the arrowhead and the lead-line geometry, so all thirteen sheets look
like one set and the per-figure reference-numeral inventory is produced
mechanically (no hand-kept list that can drift from the figures).

Renderer-independence: the local raster/PDF renderer (MuPDF) ignores
stroke-dasharray and does not auto-close <polygon>, so dashes are emitted as
explicit short segments and every closed shape is a <path ... Z>. Arrowheads
are filled triangles, not <marker>s, for the same reason.

USPTO informal-drawing conventions honored: black on white only, no fills
except solid-black arrowheads, uniform line weight, thin lead lines from every
numeral to its part, sans-serif labels, "FIG. N" centered under each figure,
portrait US-Letter sheets, no branding or draft marks on the sheets.

Run:  python gen_drawings.py   (writes ../FIG-N.svg, ../previews/fig-N.png,
      ../drawings.pdf and ../numerals.json)
"""
from __future__ import annotations

import json
import math
import os
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, ".."))
PREV = os.path.join(OUT, "previews")

W, H = 816, 1056  # 8.5 x 11 in at 96 px/in
FONT = "Arial, Helvetica, sans-serif"
LW = 1.25      # uniform line weight for boxes and arrows
LEAD = 0.6     # thin lead lines
TS = 10        # default label size
NS = 13        # numeral size (>= 0.32 cm tall at 96 px/in)
DASH_ON, DASH_OFF = 6, 4


def _w(s: str, size: float) -> float:
    """Rough Arial advance-width estimate, used only to warn about overflow."""
    total = 0.0
    for ch in s:
        if ch.isupper():
            total += 6.9
        elif ch.isdigit():
            total += 5.6
        elif ch in " ":
            total += 2.8
        elif ch in ".,;:'|()[]{}":
            total += 3.0
        elif ch in "il.j":
            total += 2.6
        elif ch in "mw":
            total += 8.0
        else:
            total += 5.4
    return total * size / 10.0


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Fig:
    def __init__(self, name: str, title: str):
        self.name = name          # file stem, e.g. "FIG-1"
        self.title = title
        self.parts: list[str] = []
        self.numerals: Counter = Counter()
        self.warnings: list[str] = []

    # ---------- primitives ----------
    def raw(self, s: str):
        self.parts.append(s)

    def line(self, x1, y1, x2, y2, dashed=False, w=LW):
        if dashed:
            self.dashes([(x1, y1), (x2, y2)], w=w)
        else:
            self.raw(f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" '
                     f'stroke="#000" stroke-width="{w}" fill="none"/>')

    def dashes(self, pts, closed=False, w=LW):
        """Explicit dash segments along a polyline (renderer-independent)."""
        if closed:
            pts = list(pts) + [pts[0]]
        d = []
        on = True
        remain = DASH_ON
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            seg = math.hypot(x2 - x1, y2 - y1)
            if seg == 0:
                continue
            ux, uy = (x2 - x1) / seg, (y2 - y1) / seg
            t = 0.0
            while t < seg:
                step = min(remain, seg - t)
                if on:
                    d.append(f"M {x1 + ux * t:.1f} {y1 + uy * t:.1f} "
                             f"L {x1 + ux * (t + step):.1f} {y1 + uy * (t + step):.1f}")
                t += step
                remain -= step
                if remain <= 0:
                    on = not on
                    remain = DASH_ON if on else DASH_OFF
        self.raw(f'<path d="{" ".join(d)}" stroke="#000" stroke-width="{w}" fill="none"/>')

    def rect(self, x, y, w, h, dashed=False, rx=0):
        if dashed:
            self.dashes([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], closed=True)
        elif rx:
            self.raw(f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx:g}" '
                     f'fill="none" stroke="#000" stroke-width="{LW}"/>')
        else:
            self.raw(f'<path d="M {x:g} {y:g} L {x + w:g} {y:g} L {x + w:g} {y + h:g} L {x:g} {y + h:g} Z" '
                     f'fill="none" stroke="#000" stroke-width="{LW}"/>')

    def poly(self, pts, closed=True, fill=None, dashed=False, w=LW):
        if dashed:
            self.dashes(pts, closed=closed, w=w)
            return
        d = " ".join(("M" if i == 0 else "L") + f" {x:g} {y:g}" for i, (x, y) in enumerate(pts))
        if closed:
            d += " Z"
        self.raw(f'<path d="{d}" fill="{fill or "none"}" stroke="{"none" if fill else "#000"}" '
                 f'stroke-width="{w}"/>')

    def ellipse(self, cx, cy, rx, ry):
        self.raw(f'<ellipse cx="{cx:g}" cy="{cy:g}" rx="{rx:g}" ry="{ry:g}" fill="none" '
                 f'stroke="#000" stroke-width="{LW}"/>')

    def circle(self, cx, cy, r, fill=None):
        self.raw(f'<circle cx="{cx:g}" cy="{cy:g}" r="{r:g}" fill="{fill or "none"}" '
                 f'stroke="{"none" if fill else "#000"}" stroke-width="{LW}"/>')

    def text(self, x, y, s, size=TS, anchor="start", bold=False, bg=False):
        if bg:
            tw = _w(s, size)
            bx = x if anchor == "start" else (x - tw / 2 if anchor == "middle" else x - tw)
            self.raw(f'<rect x="{bx - 2:.1f}" y="{y - size:.1f}" width="{tw + 4:.1f}" '
                     f'height="{size + 3:.1f}" fill="#fff" stroke="none"/>')
        fw = ' font-weight="bold"' if bold else ""
        self.raw(f'<text x="{x:g}" y="{y:g}" font-family="{FONT}" font-size="{size}" '
                 f'text-anchor="{anchor}" fill="#000"{fw}>{esc(s)}</text>')

    def lines(self, cx, cy, lines, size=TS, anchor="middle", lh=None, maxw=None, bg=False):
        """Multi-line text block vertically centered on cy."""
        lh = lh or size * 1.2
        n = len(lines)
        y0 = cy - (n - 1) * lh / 2 + size * 0.35
        for i, s in enumerate(lines):
            if maxw and _w(s, size) > maxw:
                self.warnings.append(f"{self.name}: text overflow ({_w(s, size):.0f}>{maxw:.0f}): {s!r}")
            self.text(cx, y0 + i * lh, s, size=size, anchor=anchor, bg=bg)

    # ---------- reference numerals ----------
    def numeral(self, n, x, y, tx, ty, anchor="start", size=NS):
        """Numeral text with baseline at (x,y); thin lead line toward (tx,ty)."""
        s = str(n)
        self.numerals[s] += 1
        self.text(x, y, s, size=size, anchor=anchor)
        tw = _w(s, size)
        left = x if anchor == "start" else (x - tw / 2 if anchor == "middle" else x - tw)
        cx, cy = left + tw / 2, y - size * 0.36
        hw, hh = tw / 2 + 2.5, size * 0.5 + 1.5
        dx, dy = tx - cx, ty - cy
        dist = math.hypot(dx, dy)
        if dist < 1:
            return
        ux, uy = dx / dist, dy / dist
        sx = hw / abs(ux) if ux else 1e9
        sy = hh / abs(uy) if uy else 1e9
        s0 = min(sx, sy)
        x1, y1 = cx + ux * s0, cy + uy * s0
        if math.hypot(tx - x1, ty - y1) < 4:
            self.warnings.append(f"{self.name}: lead line for {s} is under 4 px")
        self.raw(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{tx:.1f}" y2="{ty:.1f}" '
                 f'stroke="#000" stroke-width="{LEAD}" fill="none"/>')

    def num_box(self, n, x, y, w, h, side="br", off=22):
        """Place a numeral beside a rectangular element with a lead line to it."""
        if side == "r":
            self.numeral(n, x + w + off, y + h / 2 + 4, x + w, y + h / 2)
        elif side == "l":
            self.numeral(n, x - off, y + h / 2 + 4, x, y + h / 2, anchor="end")
        elif side == "b":
            self.numeral(n, x + 20, y + h + off, x + 34, y + h, anchor="middle")
        elif side == "bc":
            self.numeral(n, x + w / 2 - 10, y + h + off, x + w / 2 + 4, y + h, anchor="middle")
        elif side == "t":
            self.numeral(n, x + w / 2 - 10, y - off + 10, x + w / 2 + 4, y, anchor="middle")
        elif side == "br":
            self.numeral(n, x + w + 6, y + h + 16, x + w, y + h)
        elif side == "bl":
            self.numeral(n, x - 6, y + h + 16, x, y + h, anchor="end")
        elif side == "tr":
            self.numeral(n, x + w + 6, y - 8, x + w, y)
        elif side == "tl":
            self.numeral(n, x - 6, y - 8, x, y, anchor="end")
        else:
            raise ValueError(side)

    # ---------- compound elements ----------
    def box(self, x, y, w, h, lines, num=None, side="br", dashed=False, rx=0, size=TS, lh=None, off=22):
        self.rect(x, y, w, h, dashed=dashed, rx=rx)
        if lines:
            self.lines(x + w / 2, y + h / 2, lines, size=size, lh=lh, maxw=w - 6)
        if num is not None:
            self.num_box(num, x, y, w, h, side=side, off=off)
        return (x, y, w, h)

    def frame(self, x, y, w, h, title, num=None, side="tl", dashed=False, size=TS, off=22):
        """Container with a title at the top-left inside."""
        self.rect(x, y, w, h, dashed=dashed)
        if title:
            self.text(x + 8, y + 14, title, size=size)
        if num is not None:
            self.num_box(num, x, y, w, h, side=side, off=off)
        return (x, y, w, h)

    def diamond(self, cx, cy, w, h, lines, size=TS):
        self.poly([(cx, cy - h / 2), (cx + w / 2, cy), (cx, cy + h / 2), (cx - w / 2, cy)])
        self.lines(cx, cy, lines, size=size, maxw=w * 0.62)

    def hexagon(self, cx, cy, w, h, lines, size=TS):
        k = h / 2
        self.poly([(cx - w / 2 + k, cy - k), (cx + w / 2 - k, cy - k), (cx + w / 2, cy),
                   (cx + w / 2 - k, cy + k), (cx - w / 2 + k, cy + k), (cx - w / 2, cy)])
        self.lines(cx, cy, lines, size=size, maxw=w - 2 * k)

    def arrow(self, pts, label=None, dashed=False, head=True, tail=False, w=LW,
              lpos=None, lanchor="middle", lsize=8.5, bg=False):
        pts = [(float(x), float(y)) for x, y in pts]
        # shorten the drawn line so it does not poke through the arrowhead
        draw = list(pts)
        if head:
            (x1, y1), (x2, y2) = draw[-2], draw[-1]
            d = math.hypot(x2 - x1, y2 - y1)
            ux, uy = (x2 - x1) / d, (y2 - y1) / d
            draw[-1] = (x2 - ux * 7, y2 - uy * 7)
        if tail:
            (x1, y1), (x2, y2) = draw[0], draw[1]
            d = math.hypot(x2 - x1, y2 - y1)
            ux, uy = (x2 - x1) / d, (y2 - y1) / d
            draw[0] = (x1 + ux * 7, y1 + uy * 7)
        if dashed:
            self.dashes(draw, w=w)
        else:
            dd = " ".join(("M" if i == 0 else "L") + f" {x:.1f} {y:.1f}" for i, (x, y) in enumerate(draw))
            self.raw(f'<path d="{dd}" fill="none" stroke="#000" stroke-width="{w}"/>')
        if head:
            self._head(pts[-2], pts[-1])
        if tail:
            self._head(pts[1], pts[0])
        if label:
            if lpos is None:
                # midpoint of the longest segment, offset upward
                best = max(zip(pts, pts[1:]), key=lambda s: math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]))
                mx, my = (best[0][0] + best[1][0]) / 2, (best[0][1] + best[1][1]) / 2
                lpos = (mx, my - 5)
            if isinstance(label, str):
                label = [label]
            for i, s in enumerate(label):
                self.text(lpos[0], lpos[1] + i * (lsize * 1.2), s, size=lsize, anchor=lanchor, bg=bg)

    def _head(self, p1, p2, length=9, half=3.6):
        (x1, y1), (x2, y2) = p1, p2
        d = math.hypot(x2 - x1, y2 - y1)
        ux, uy = (x2 - x1) / d, (y2 - y1) / d
        nx, ny = -uy, ux
        bx, by = x2 - ux * length, y2 - uy * length
        self.poly([(x2, y2), (bx + nx * half, by + ny * half), (bx - nx * half, by - ny * half)], fill="#000")

    def junction(self, x, y):
        self.circle(x, y, 2.2, fill="#000")

    def figlabel(self, s, y=1000):
        self.text(W / 2, y, s, size=16, anchor="middle", bold=True)

    # ---------- output ----------
    def svg(self) -> str:
        head = (f'<?xml version="1.0" encoding="UTF-8"?>\n'
                f'<svg xmlns="http://www.w3.org/2000/svg" width="8.5in" height="11in" '
                f'viewBox="0 0 {W} {H}">\n<title>{esc(self.title)}</title>\n'
                f'<rect x="0" y="0" width="{W}" height="{H}" fill="#fff"/>\n')
        return head + "\n".join(self.parts) + "\n</svg>\n"

    def save(self):
        path = os.path.join(OUT, self.name + ".svg")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(self.svg())
        dup = [k for k, v in self.numerals.items() if v > 1]
        if dup:
            self.warnings.append(f"{self.name}: numeral placed more than once: {dup}")
        return path


# =====================================================================
# FIG. 1  System 100
# =====================================================================
def fig1() -> Fig:
    f = Fig("FIG-1", "FIG. 1 - Screen-aware guidance system 100")
    # outer system boundary 100
    f.rect(50, 92, 720, 808, dashed=True)
    f.numeral(100, 50, 84, 78, 92)

    # ---- user device 110 ----
    f.frame(66, 112, 374, 556, "USER DEVICE")
    f.numeral(110, 140, 104, 166, 112)

    # display 112 with target application 190
    f.frame(82, 140, 190, 110, "DISPLAY")
    f.numeral(112, 82, 270, 106, 250)
    f.box(96, 162, 140, 64, ["TARGET", "APPLICATION", "(not instrumented)"], num=190, side="br", size=9)

    # input device 116, screen-capture interface 114
    f.box(296, 140, 94, 40, ["INPUT DEVICE"], num=116, side="r", size=9)
    f.box(296, 204, 94, 50, ["SCREEN-CAPTURE", "INTERFACE"], num=114, side="r", size=9)
    f.arrow([(296, 160), (284, 160), (284, 196), (236, 196)])
    f.text(300, 196, "user performs", size=8)
    f.arrow([(272, 229), (296, 229)])

    # guidance client 120
    f.frame(82, 282, 342, 358, "GUIDANCE CLIENT (read-only)")
    f.numeral(120, 82, 660, 106, 640)
    L, R, BW, BH = 96, 262, 150, 46
    rows = [310, 386, 462, 538]
    f.box(L, rows[0], BW, BH, ["CAPTURE MODULE"], num=122, side="b", size=9)
    f.box(L, rows[1], BW, BH, ["ON-DEVICE", "REDACTION ENGINE"], num=124, side="b", size=9)
    f.box(L, rows[2], BW, BH, ["PRESENTATION LAYER"], num=132, side="b", size=9)
    f.box(L, rows[3], BW, BH, ["FLOATING OVERLAY"], num=134, side="b", size=9)
    f.box(R, rows[0], BW, BH, ["POLICY-ENFORCEMENT", "MODULE"], num=128, side="b", size=9)
    f.box(R, rows[1], BW, BH, ["TOKEN MAP", "(volatile memory only)"], num=126, side="b", size=9, dashed=True)
    f.box(R, rows[2], BW, BH, ["LOCAL REHYDRATION", "MODULE"], num=130, side="b", size=9)
    f.box(R, rows[3], BW, BH, ["CLARIFICATION CARD"], num=136, side="b", size=9)
    cl, cr = L + BW / 2, R + BW / 2
    # capture interface -> capture module
    f.arrow([(343, 254), (343, 268), (cl, 268), (cl, rows[0])])
    f.arrow([(cl, rows[0] + BH), (cl, rows[1])])                      # 122 -> 124
    f.arrow([(cr, rows[0] + BH), (cr, 370), (256, 370), (256, 409), (L + BW, 409)])  # 128 -> 124 policy
    f.arrow([(L + BW, 420), (R, 420)])                                 # 124 -> 126 write
    f.arrow([(cr, rows[1] + BH), (cr, rows[2])], label="read", lpos=(cr + 6, rows[2] - 10), lanchor="start")
    f.arrow([(R, rows[2] + 24), (L + BW, rows[2] + 24)])               # 130 -> 132
    f.arrow([(cl, rows[2] + BH), (cl, rows[3])])                       # 132 -> 134
    f.arrow([(L + BW, rows[2] + 34), (256, rows[2] + 34), (256, rows[3] + 24), (R, rows[3] + 24)])  # 132 -> 136
    # overlay presents on the display
    f.arrow([(L, rows[3] + 30), (74, rows[3] + 30), (74, 200), (82, 200)])
    f.text(253, 618, "no input path from 120 to 190:", size=8, anchor="middle")
    f.text(253, 630, "no input event is injected", size=8, anchor="middle")

    # ---- network 140 ----
    f.ellipse(500, 330, 38, 24)
    f.text(500, 334, "NETWORK", size=9, anchor="middle")
    f.numeral(140, 488, 380, 496, 354, anchor="middle")
    f.arrow([(424, 322), (462, 322)])
    f.arrow([(538, 322), (560, 322)])
    f.arrow([(560, 340), (538, 340)])
    f.arrow([(462, 340), (424, 340)])
    f.text(500, 296, "redacted frame + plan", size=8, anchor="middle")
    f.text(500, 400, "single instruction;", size=8, anchor="middle")
    f.text(500, 410, "effective policy", size=8, anchor="middle")

    # ---- guidance server 150 ----
    f.frame(560, 112, 196, 548, "GUIDANCE SERVER")
    f.numeral(150, 630, 104, 656, 112)
    items = [(152, ["PLANNING MODULE"]), (154, ["NAVIGATION AND", "VERIFICATION MODULE"]),
             (155, ["SERVER-SIDE POLICY", "RE-ENFORCEMENT"]), (156, ["AUDIT LOG", "(append-only)"]),
             (157, ["CLARIFICATION", "HANDLER"]), (158, ["EVIDENCE STORE", "(encrypted at rest)"]),
             (160, ["POLICY STORE"]), (162, ["SECURITY GATE"]), (164, ["INSTRUCTION-SHAPING", "RULE SET"]),
             (166, ["WORKFLOW TEMPLATE", "STORE"]), (168, ["TEMPLATE DISTILLER", "AND MATCHER"])]
    for i, (n, ls) in enumerate(items):
        f.box(572, 140 + i * 46, 134, 36, ls, num=n, side="r", size=8.5)

    # ---- model services 170 ----
    f.frame(560, 700, 196, 130, "MODEL SERVICES")
    f.numeral(170, 560, 850, 586, 830)
    f.box(572, 730, 134, 40, ["FIRST MODEL", "(vision, low latency)"], num=172, side="r", size=8.5)
    f.box(572, 782, 134, 40, ["SECOND MODEL", "(stronger)"], num=174, side="r", size=8.5)
    f.arrow([(640, 660), (640, 700)])
    f.arrow([(700, 700), (700, 660)])
    f.text(632, 670, "redacted frame", size=8, anchor="end")
    f.text(632, 681, "+ checklist", size=8, anchor="end")
    f.text(708, 676, "navigation", size=8)
    f.text(708, 687, "record", size=8)

    # ---- tenant administration console 180 ----
    f.box(66, 720, 374, 70, ["TENANT ADMINISTRATION CONSOLE", "author, arm, lock egress policy;",
                             "retrieve reports and audit log (own tenant only)"], size=9)
    f.numeral(180, 66, 810, 90, 790)
    f.arrow([(440, 755), (520, 755), (520, 388), (560, 388)])
    f.arrow([(520, 434), (560, 434)])
    f.text(524, 600, "policy;", size=8)
    f.text(524, 611, "reports", size=8)

    f.figlabel("FIG. 1")
    return f


# =====================================================================
# FIG. 2  Guidance loop 200
# =====================================================================
def fig2() -> Fig:
    f = Fig("FIG-2", "FIG. 2 - Observe, instruct, verify, correct and advance loop 200")
    cx = 330
    f.numeral(200, 196, 90, 230, 100, anchor="end")
    f.box(230, 90, 200, 32, ["RECEIVE GOAL"], num=202, side="r", rx=16)
    f.arrow([(cx, 122), (cx, 142)])
    f.box(210, 142, 240, 48, ["GENERATE PLAN; EACH STEP HAS A",
                              "PLANNER-GENERATED VISIBLE-", "WHEN-DONE CONDITION"], num=204, side="l", size=9, lh=12)
    f.arrow([(cx, 190), (cx, 210)])
    f.box(230, 210, 200, 32, ["CAPTURE FRAME"], num=206, side="r")
    f.arrow([(cx, 242), (cx, 262)])
    f.box(210, 262, 240, 32, ["REDACT FRAME ON DEVICE"], num=208, side="r")
    f.arrow([(cx, 294), (cx, 314)])
    f.box(210, 314, 240, 44, ["TRANSMIT REDACTED FRAME", "AND FULL CHECKLIST"], num=210, side="r", size=9)
    f.arrow([(cx, 358), (cx, 378)])
    f.box(200, 378, 260, 72, ["OBTAIN NAVIGATION RECORD:", "completed set, current step,",
                              "guidance, observation, flag, done"], num=212, side="l", size=9)
    # right-hand rules 230, 232, 234
    f.arrow([(460, 406), (520, 406)])
    f.box(520, 380, 220, 54, ["IF PREREQUISITE ABSENT FROM FRAME:", "CURRENT STEP := STEP THAT",
                              "ESTABLISHES THE PREREQUISITE"], num=230, side="tl", size=8, lh=11)
    f.arrow([(630, 434), (630, 450)])
    f.box(520, 450, 220, 54, ["IF NAMED CONTROL ABSENT AND AN", "EQUIVALENT CONTROL VISIBLE:",
                              "INSTRUCTION TARGETS THE EQUIVALENT"], num=232, side="tl", size=8, lh=11)
    f.arrow([(630, 504), (630, 520)])
    f.box(520, 520, 220, 60, ["RECORD DISCREPANCY INDICATION", "(session record and report;",
                              "re-plan signal; template", "supersede, FIG. 6)"], num=234, side="tl", size=8, lh=11)
    f.arrow([(740, 550), (758, 550), (758, 166), (450, 166)], dashed=True)
    f.text(604, 160, "re-plan signal", size=8, anchor="middle")
    f.arrow([(630, 580), (630, 604), (cx + 3, 604)])
    f.arrow([(cx, 450), (cx, 608)])
    # decision 214
    f.diamond(cx, 650, 232, 84, ["VISIBLE-WHEN-DONE", "CONDITION OF INSTRUCTED",
                                 "STEP SATISFIED IN FRAME?"], size=8.5)
    f.numeral(214, 356, 702, 338, 684)
    f.arrow([(214, 650), (196, 650)])
    f.text(206, 644, "YES", size=8, anchor="middle")
    f.box(56, 616, 140, 68, ["MARK STEP COMPLETED;", "TIMESTAMP; STORE", "REDACTED FRAME AS",
                             "EVIDENCE ONCE (if", "policy permits)"], num=216, side="b", size=8, lh=11)
    f.arrow([(446, 650), (520, 650)])
    f.text(483, 644, "NO", size=8, anchor="middle")
    f.box(520, 616, 220, 68, ["DO NOT ADVANCE;", "CORRECTIVE INSTRUCTION", "(exact fix, make content",
                              "visible, missing prerequisite)"], num=218, side="tr", size=8.5, lh=12)
    f.arrow([(630, 684), (630, 704)])
    f.box(520, 704, 220, 34, ["SURFACE FLAG", "(clears when back on track)"], num=220, side="l", size=8.5)
    # present 222
    f.box(210, 770, 240, 32, ["PRESENT INSTRUCTION, OBSERVATION, FLAG"], num=222, side="tl", size=8.5)
    f.arrow([(126, 684), (126, 786), (210, 786)])
    f.arrow([(630, 738), (630, 786), (450, 786)])
    f.arrow([(cx, 802), (cx, 822)])
    f.box(200, 822, 260, 44, ["USER PERFORMS ACTION IN THE TARGET",
                              "APPLICATION (no input injected)"], num=224, side="r", dashed=True, size=8.5)
    f.arrow([(cx, 866), (cx, 878)])
    f.diamond(cx, 908, 160, 60, ["DONE?"], size=9)
    f.numeral(226, 352, 958, 338, 940)
    f.arrow([(250, 908), (36, 908), (36, 226), (230, 226)])
    f.text(240, 902, "NO", size=8, anchor="middle")
    f.text(40, 560, "next", size=8)
    f.text(40, 571, "frame", size=8)
    f.arrow([(410, 908), (520, 908)])
    f.text(465, 902, "YES", size=8, anchor="middle")
    f.box(520, 890, 200, 36, ["END: SESSION REPORT"], num=228, side="b", rx=18)
    f.figlabel("FIG. 2")
    return f


# =====================================================================
# FIG. 3  On-device redaction and tokenization pipeline 300
# =====================================================================
def fig3() -> Fig:
    f = Fig("FIG-3", "FIG. 3 - On-device redaction and tokenization pipeline 300")
    f.rect(50, 90, 720, 586, dashed=True)
    f.text(60, 104, "USER DEVICE", size=9)
    f.numeral(110, 50, 84, 76, 90)
    f.numeral(300, 400, 84, 424, 90)
    C1, C2, C3, C4 = 80, 250, 420, 590
    # row A: text path
    f.box(C1, 120, 130, 40, ["OUTBOUND TEXT"], num=302, side="b", size=9)
    f.box(C2, 112, 130, 64, ["DETECTOR", "(sensitive spans;", "same rules as server)"], num=306, side="b", size=8.5)
    f.box(C3, 112, 130, 64, ["ACTION ROUTER", "send | redact |", "withhold | tokenize"], num=310, side="b", size=8.5)
    f.box(C4, 112, 150, 64, ["TOKEN GENERATOR", "[[EMAIL_1]]  [[IP_2]]", "(typed, stable per session)"],
          num=312, side="b", size=8.5)
    f.arrow([(C1 + 130, 140), (C2, 140)])
    f.arrow([(C2 + 130, 144), (C3, 144)])
    f.arrow([(C3 + 130, 140), (C4, 140)], label="tokenize", lpos=(570, 134), lsize=8)
    f.arrow([(485, 176), (485, 214)], label=["send / redact /", "withhold"], lpos=(492, 194), lanchor="start", lsize=8)
    # row B
    f.box(C2, 214, 130, 52, ["EGRESS POLICY", "(per-category action,", "block words, mode)"], num=308, side="l", size=8.5)
    f.arrow([(315, 214), (315, 176)])
    f.box(C3, 214, 130, 44, ["TOKENIZED /", "REDACTED TEXT"], num=322, side="b", size=9)
    f.box(C4, 214, 150, 56, ["TOKEN MAP", "(volatile memory only;", "never transmitted;", "zeroed on reset)"],
          num=126, side="b", size=8, lh=11, dashed=True)
    f.arrow([(665, 176), (665, 214)])
    f.numeral(314, 690, 204, 667, 196)
    # row C: frame path
    f.box(C1, 320, 130, 40, ["OUTBOUND FRAMES"], num=304, side="b", size=9)
    f.box(C2, 320, 130, 56, ["OPTICAL CHARACTER", "RECOGNITION", "(on device, per line)"], num=316, side="tr", size=8.5)
    f.box(C3, 320, 130, 56, ["LINE MASK", "(opaque box over whole", "line bounding box)"], num=318, side="b", size=8.5)
    f.arrow([(C1 + 130, 340), (C2, 340)])
    f.arrow([(C2 + 130, 348), (C3, 348)])
    f.arrow([(315, 320), (315, 266)], tail=True)
    f.text(321, 296, "each line", size=8)
    # row D
    f.box(C1, 410, 130, 64, ["AUDIT ENTRY", "(counts, flags,", "placeholders;", "no values)"],
          num=336, side="b", size=8.5, lh=11)
    f.box(C2, 410, 130, 64, ["FAIL-SAFE", "DOWNSCALER", "(illegible resolution;", "legibility criterion)"],
          num=338, side="b", size=8.5, lh=11)
    f.box(C3, 410, 130, 44, ["REDACTED FRAME", "(re-encoded)"], num=320, side="b", size=9)
    f.box(C4, 420, 150, 44, ["TRANSMISSION", "(user shown summary)"], num=324, side="t", size=9)
    f.arrow([(485, 376), (485, 410)])
    f.arrow([(C1 + 130, 352), (230, 352), (230, 442), (C2, 442)])
    f.text(236, 384, "OCR unavailable", size=8)
    f.arrow([(315, 474), (315, 500), (640, 500), (640, 464)])
    f.text(330, 496, "downscaled copy in lieu of frame", size=7.5)
    f.arrow([(550, 236), (570, 236), (570, 432)], head=False)
    f.junction(570, 432)
    f.arrow([(550, 432), (C4, 432)])
    f.arrow([(700, 464), (700, 520), (145, 520), (145, 474)], dashed=True)
    f.text(420, 532, "audit record (no values)", size=8)
    # row E: return path (right to left)
    f.box(630, 570, 120, 56, ["RESPONSE WITH", "PLACEHOLDER", "TOKENS"], num=328, side="b", size=8.5)
    f.box(490, 570, 120, 56, ["STREAMING BUFFER", "(tail held across", "chunk boundary)"], num=340, side="b", size=8.5)
    f.box(350, 570, 120, 56, ["REHYDRATION", "(token -> value;", "nested walk)"], num=330, side="b", size=8.5)
    f.box(210, 570, 120, 56, ["MISSING-TOKEN", "HANDLER (leave in", "place; flag incomplete;", "never guess)"],
          num=332, side="b", size=8, lh=11)
    f.box(70, 570, 120, 56, ["DISPLAYED ANSWER", "(real values; never", "left the device)"], num=334, side="b", size=8.5)
    for xa, xb in [(630, 610), (490, 470), (350, 330), (210, 190)]:
        f.arrow([(xa, 598), (xb, 598)])
    f.arrow([(740, 242), (752, 242), (752, 545), (410, 545), (410, 570)], dashed=True)
    f.text(560, 541, "token map read locally", size=8)
    # outside the device: remote model 326
    f.arrow([(740, 442), (762, 442), (762, 742), (740, 742)])
    f.box(C4, 720, 150, 44, ["REMOTE MODEL", "(sees tokens only)"], num=326, side="l", size=9)
    f.text(665, 782, "via guidance server 150 (policy re-applied, 155)", size=8, anchor="middle")
    f.arrow([(700, 720), (700, 626)])
    f.text(706, 700, "response", size=8)
    f.figlabel("FIG. 3")
    return f


# =====================================================================
# FIG. 4  Sequence 400
# =====================================================================
def fig4() -> Fig:
    f = Fig("FIG-4", "FIG. 4 - Sequence diagram 400 of one guided step")
    xs = {"u": 110, "a": 250, "c": 400, "s": 560, "m": 720}
    heads = [("u", 402, ["HUMAN USER"]), ("a", 404, ["TARGET", "APPLICATION"]), ("c", 406, ["GUIDANCE", "CLIENT"]),
             ("s", 408, ["GUIDANCE", "SERVER"]), ("m", 410, ["MODEL", "SERVICE"])]
    for k, n, ls in heads:
        x = xs[k]
        f.box(x - 58, 100, 116, 40, ls, size=9)
        f.numeral(n, x - 10, 86, x + 2, 100, anchor="middle")
    f.numeral(400, 80, 160, 109, 166, anchor="end")
    for x in xs.values():
        f.dashes([(x, 140), (x, 820)], w=0.8)

    def msg(n, a, b, y, label, heavy=False, dashed=False):
        x1, x2 = xs[a], xs[b]
        f.arrow([(x1, y), (x2, y)], w=2.4 if heavy else LW, dashed=dashed)
        mid = (x1 + x2) / 2
        tw = _w(label, 8.5)
        f.text(mid, y - 5, label, size=8.5, anchor="middle", bg=True)
        nx = mid - tw / 2 - 10
        f.numeral(n, nx, y - 14, nx + 8, y, anchor="end")

    def selfmsg(n, a, y, label):
        x = xs[a]
        f.arrow([(x, y), (x + 28, y), (x + 28, y + 16), (x, y + 16)])
        f.text(x + 36, y + 13, label, size=8.5, bg=True)
        f.numeral(n, x + 40, y - 4, x + 28, y + 2)

    msg(412, "u", "c", 176, "states goal")
    selfmsg(414, "c", 190, "clean goal on device; send")
    f.arrow([(xs["c"], 226), (xs["s"], 226)])
    msg(416, "s", "m", 250, "plan request (goal, frame)")
    f.arrow([(xs["m"], 272), (xs["s"], 272)])
    f.text(640, 284, "plan with visible-when-done conditions", size=8, anchor="middle", bg=True)
    msg(418, "s", "c", 304, "return plan (gated by 162)")
    # loop frame
    f.rect(80, 328, 700, 460)
    f.text(88, 342, "LOOP (per changed frame)", size=9)
    msg(420, "c", "a", 366, "capture frame")
    selfmsg(422, "c", 384, "redact frame on device")
    msg(424, "c", "s", 430, "redacted frame + checklist")
    msg(426, "s", "m", 458, "submit to model")
    msg(428, "m", "s", 490, "navigation record")
    selfmsg(430, "s", 506, "gating rule; store evidence once")
    msg(432, "s", "c", 554, "return navigation record")
    msg(434, "c", "u", 586, "present one instruction, observation, flag")
    msg(436, "u", "a", 640, "user performs action", heavy=True)
    f.text(180, 656, "only state change of the", size=8, anchor="middle", bg=True)
    f.text(180, 667, "target application", size=8, anchor="middle", bg=True)
    selfmsg(438, "a", 690, "display changes")
    msg(440, "c", "a", 746, "capture next frame")
    f.text(325, 762, "(then repeat from 422)", size=8, anchor="middle", bg=True)
    f.text(88, 840, "The subsequently captured frame is the verification oracle; the guidance client has", size=8.5)
    f.text(88, 852, "no arrow into the target application.", size=8.5)
    f.figlabel("FIG. 4")
    return f


# =====================================================================
# FIG. 5  Governance arrangement 500
# =====================================================================
def fig5() -> Fig:
    f = Fig("FIG-5", "FIG. 5 - Tenant-governed egress, instruction-shaping and evidence-retention arrangement 500")
    # administrator 502 (stick figure)
    f.text(100, 96, "TENANT", size=8, anchor="middle")
    f.text(100, 106, "ADMINISTRATOR", size=8, anchor="middle")
    f.circle(100, 122, 10)
    f.line(100, 132, 100, 160)
    f.line(84, 146, 116, 146)
    f.line(100, 160, 88, 180)
    f.line(100, 160, 112, 180)
    f.numeral(502, 116, 200, 108, 182)
    f.numeral(500, 300, 100, 300, 142, anchor="middle")
    f.arrow([(118, 146), (160, 146)])
    f.box(160, 116, 130, 52, ["POLICY EDITOR", "(wizard, presets)"], num=504, side="b", size=9)
    f.arrow([(290, 146), (312, 146)])
    f.box(312, 108, 150, 72, ["LOCK-RELEASE OPERATION", "(re-authentication of role", "above tenant admin;",
                              "audit entry: prior and", "new version)"], num=536, side="b", size=8, lh=11)
    f.arrow([(462, 146), (484, 146)])
    # policy object 506
    f.frame(484, 96, 286, 228, "EGRESS POLICY OBJECT (version; last changed by)", size=8.5)
    f.numeral(506, 556, 86, 588, 96)
    A, B, SW, SH = 496, 638, 128, 40
    f.box(A, 122, SW, SH, ["PER-CATEGORY ACTIONS", "(send, redact, withhold,", "tokenize)"], num=508, side="b", size=7.5, lh=10)
    f.box(B, 122, SW, SH, ["BLOCK WORDS", "(always removed)"], num=510, side="b", size=8)
    f.box(A, 186, SW, SH, ["MODE", "(redact | tokenize)"], num=512, side="b", size=8)
    f.box(B, 186, SW, SH, ["SCREENSHOT-EVIDENCE", "SETTING"], num=514, side="b", size=8)
    f.box(A, 250, SW, SH, ["RETENTION WINDOW"], num=516, side="b", size=8)
    f.box(B, 250, SW, SH, ["ARMED AND LOCKED STATE", "(version, last changed by)"], num=518, side="b", size=7.5)
    # rule set 534 and scope resolution 520
    f.arrow([(665, 324), (665, 356)], label="compile", lpos=(670, 344), lanchor="start", lsize=8)
    f.box(560, 356, 210, 60, ["INSTRUCTION-SHAPING RULE SET", "(forbid rules, require rules;",
                              "versioned with the policy object)"], num=534, side="b", size=8)
    f.arrow([(520, 324), (520, 356)])
    f.box(300, 356, 230, 60, ["SCOPE RESOLUTION", "(member -> tenant's armed policy;",
                              "individual -> own; platform admin -> any)"], num=520, side="l", size=8)
    # distribution 522 to member clients 120
    f.arrow([(415, 416), (415, 470)])
    f.numeral(522, 424, 452, 416, 448)
    f.text(424, 464, "distribute effective policy", size=8)
    f.rect(300, 470, 230, 70, dashed=True)
    f.text(308, 484, "MEMBER GUIDANCE CLIENTS (enforce on device)", size=7.5)
    for i, x in enumerate([312, 384, 456]):
        f.box(x, 496, 60, 30, ["CLIENT"], size=8)
    f.numeral(120, 322, 562, 342, 526, anchor="middle")
    # server re-application 524
    f.arrow([(530, 505), (560, 505)], label="inbound", lpos=(545, 499), lsize=7.5)
    f.box(560, 470, 210, 50, ["SERVER RE-APPLICATION", "(same engine, inbound path)"], num=524, side="b", size=8.5)
    # evidence store 526, transmission audit 530, schema 538
    f.arrow([(665, 520), (665, 580)], label=["gated by", "setting 514"], lpos=(670, 548), lanchor="start", lsize=8)
    f.box(560, 580, 210, 50, ["EVIDENCE STORE", "(redacted frames; encrypted)"], num=526, side="b", size=8.5)
    f.arrow([(600, 520), (600, 560), (415, 560), (415, 580)])
    f.box(300, 580, 230, 50, ["TRANSMISSION AUDIT", "(one record per transmission)"], num=530, side="l", size=8.5)
    f.arrow([(415, 630), (415, 660)])
    f.box(300, 660, 230, 70, ["AUDIT RECORD SCHEMA (closed list):", "policy version; mode;",
                              "per-category counts;", "frame sent; purpose"], num=538, side="l", size=8, lh=11)
    # retention sweep 528 and purge 540
    f.arrow([(665, 630), (665, 660)])
    f.box(560, 660, 210, 50, ["RETENTION SWEEP", "(sessions older than window 516)"], num=528, side="b", size=8.5)
    f.arrow([(665, 710), (665, 760)])
    f.box(560, 760, 210, 44, ["SINGLE-OPERATION PURGE"], num=540, side="l", size=8.5)
    f.arrow([(665, 804), (665, 836)], label="together", lpos=(670, 824), lanchor="start", lsize=8)
    f.box(560, 836, 210, 60, ["{ session record,", "evidence frames,", "audit records }"], dashed=True, size=8.5)
    # administrator retrieval 532
    f.arrow([(100, 182), (100, 660)])
    f.box(44, 660, 216, 60, ["ADMINISTRATOR RETRIEVAL", "(reports and audit log;", "own tenant only)"],
          num=532, side="b", size=8.5)
    f.arrow([(300, 612), (160, 612), (160, 660)], label="reports, audit", lpos=(230, 606), lsize=8)
    f.figlabel("FIG. 5")
    return f


# =====================================================================
# FIG. 6  Workflow-template arrangement 600
# =====================================================================
def fig6() -> Fig:
    f = Fig("FIG-6", "FIG. 6 - Workflow-template capture, storage and tiered-retrieval arrangement 600")
    f.text(56, 84, "CAPTURE", size=9)
    f.numeral(600, 196, 90, 200, 122, anchor="end")
    f.box(56, 100, 130, 48, ["COMPLETED", "SESSION RECORD"], num=602, side="b", size=9)
    f.arrow([(186, 124), (216, 124)])
    f.box(216, 96, 160, 56, ["CLEAN-SUCCESS PREDICATE", "(all steps done from screen;",
                             "final event not an open flag)"], num=604, side="b", size=8)
    f.arrow([(376, 124), (406, 124)])
    f.box(406, 100, 130, 48, ["DISTILLER", "(deterministic;", "no model call)"], num=606, side="b", size=8.5)
    f.arrow([(536, 124), (566, 124)])
    # template 608
    f.frame(566, 92, 204, 258, "WORKFLOW TEMPLATE", size=9)
    f.numeral(608, 720, 84, 700, 92)
    SX, SW, SO = 612, 146, 12
    f.box(SX, 116, SW, 34, ["GOAL SIGNATURE", "(normalized token set)"], num=610, side="l", size=7.5, off=SO)
    f.box(SX, 158, SW, 34, ["APPLICATION KEY", "(+ version)"], num=612, side="l", size=7.5, off=SO)
    f.box(SX, 200, SW, 46, ["ORDERED STEPS (kind, first", "on-screen target,", "visible-when-done)"],
          num=616, side="l", size=7.5, off=SO)
    f.box(SX, 254, SW, 34, ["SUCCESS SIGNAL", "(last visible-when-done)"], num=618, side="l", size=7.5, off=SO)
    f.box(SX, 296, SW, 46, ["ENVIRONMENT RECORD", "(jurisdiction, software list,", "manual vs software, conventions)"],
          num=614, side="l", size=7.5, off=SO)
    # scrubs 620, 622 and store 624
    f.arrow([(566, 258), (536, 258)])
    f.box(406, 230, 130, 56, ["PRE-SCRUB", "(emails, digit runs;", "commands and code exempt)"],
          num=620, side="b", size=7.5)
    f.arrow([(406, 258), (376, 258)])
    f.box(216, 230, 160, 56, ["POLICY SCRUB AT PERSIST", "(holder's stored policy;", "keys preserved)"],
          num=622, side="b", size=8)
    # tenant switch on the write path
    f.line(296, 286, 296, 316)
    f.circle(296, 318, 2.5)
    f.line(298, 340, 310, 320)
    f.circle(296, 342, 2.5)
    f.arrow([(296, 344), (296, 360)])
    f.text(314, 326, "tenant switch (capture and", size=7.5)
    f.text(314, 336, "retrieval disabled together)", size=7.5)
    f.frame(56, 360, 320, 122, "HOLDER-SCOPED STORE", size=9)
    f.numeral(624, 56, 502, 78, 482)
    f.box(68, 398, 140, 56, ["TENANT PRIVATE", "STORE (company)"], num=626, side="b", size=8.5)
    f.box(218, 398, 146, 56, ["SHARED DE-IDENTIFIED", "STORE (consented)"], num=628, side="b", size=8.5)
    # drift-triggered supersede 650 fed by 234
    f.box(406, 372, 150, 60, ["DRIFT-TRIGGERED", "SUPERSEDE", "(one prior version retained)"],
          num=650, side="r", size=8)
    f.arrow([(406, 402), (376, 402)])
    f.box(406, 452, 150, 40, ["DISCREPANCY INDICATION", "(step 234, FIG. 2)"], dashed=True, size=8)
    f.arrow([(481, 452), (481, 432)])
    # clarification prefill 648
    f.arrow([(690, 350), (690, 372)])
    f.box(610, 372, 160, 60, ["CLARIFICATION PREFILL", "(environment record answers",
                              "scoping questions)"], num=648, side="b", size=8)
    f.arrow([(690, 432), (690, 462)])
    f.text(690, 476, "to FIG. 7 (card 136, handler 157)", size=7.5, anchor="middle")
    # ---- retrieval ----
    f.text(56, 530, "RETRIEVAL", size=9)
    f.box(56, 540, 130, 44, ["NEW GOAL"], num=630, side="b", size=9)
    f.arrow([(186, 562), (216, 562)])
    f.box(216, 540, 160, 44, ["SIGNATURE", "COMPUTATION"], num=632, side="b", size=9)
    f.arrow([(376, 562), (406, 562)])
    f.box(406, 530, 210, 96, ["SCORER", "goal similarity (Jaccard, overlap)", "application similarity",
                              "environment compatibility", "weighted sum (0.6 / 0.25 / 0.15)"],
          num=634, side="r", size=8, lh=12)
    f.arrow([(300, 482), (300, 512), (511, 512), (511, 530)])
    f.text(320, 498, "templates in requesting user's holder store", size=7.5)
    f.arrow([(511, 626), (511, 652)])
    f.hexagon(511, 680, 210, 56, ["TIER GATE", "(named floors and weights)"], size=8.5)
    f.numeral(636, 634, 684, 616, 680)
    f.arrow([(511, 708), (511, 740), (141, 740), (141, 770)], head=True)
    f.arrow([(511, 740), (401, 740), (401, 770)])
    f.arrow([(511, 740), (661, 740), (661, 770)])
    f.text(147, 752, "weighted >= first floor; keys match;", size=7)
    f.text(147, 761, "no contradiction; env >= env floor", size=7)
    f.text(407, 761, "weighted >= second floor", size=7)
    f.text(667, 761, "otherwise", size=7)
    f.box(56, 770, 170, 48, ["SERVING TIER"], num=638, side="b", size=9)
    f.box(316, 770, 170, 48, ["SEEDING TIER"], num=640, side="b", size=9)
    f.box(576, 770, 170, 48, ["WITHHOLD", "(near miss never force-fitted)"], num=642, side="b", size=8)
    f.arrow([(141, 818), (141, 860)])
    f.arrow([(401, 818), (401, 860)])
    f.arrow([(661, 818), (661, 860)])
    f.box(56, 860, 170, 48, ["ADAPTATION PASS", "(single; adjust for", "environment differences)"],
          num=644, side="b", size=8)
    f.box(316, 860, 170, 48, ["PLANNER SEEDING", "(template as context for", "full planning pass)"],
          num=646, side="b", size=8)
    f.box(576, 860, 170, 48, ["PLAN WITHOUT", "TEMPLATE"], size=8.5)
    f.text(411, 952, "every resulting plan is live-verified step by step by loop 200", size=8, anchor="middle")
    f.figlabel("FIG. 6")
    return f


# =====================================================================
# FIG. 7  Clarification flow 700
# =====================================================================
def fig7() -> Fig:
    f = Fig("FIG-7", "FIG. 7 - Screen-derived clarification flow 700")
    cx = 330
    f.numeral(700, 180, 90, 200, 100, anchor="end")
    f.box(200, 96, 260, 48, ["PLANNING CALL", "(goal, scope answers, redacted frame)"], num=702, side="r", size=9)
    f.arrow([(cx, 144), (cx, 168)])
    f.box(200, 168, 260, 60, ["MODEL GENERATES PLAN AND AT MOST", "ONE QUESTION; TWO TO FIVE OPTIONS",
                              "INFERRED FROM THE FRAME"], num=704, side="r", size=8.5)
    f.arrow([(cx, 228), (cx, 252)])
    f.diamond(cx, 290, 240, 76, ["ANSWER DETERMINABLE", "FROM THE FRAME?"], size=9)
    f.numeral(706, 380, 332, 366, 314)
    f.arrow([(210, 290), (140, 290)])
    f.text(176, 284, "YES", size=8, anchor="middle")
    f.box(40, 266, 100, 48, ["NO QUESTION;", "PLAN ONLY"], size=8.5)
    f.arrow([(cx, 328), (cx, 360)])
    f.text(336, 348, "NO", size=8)
    # card 708 with 710, 712, 714
    f.frame(170, 360, 320, 118, "CLARIFICATION CARD", size=9)
    f.numeral(708, 148, 424, 170, 420, anchor="end")
    f.box(182, 392, 92, 56, ["OPTIONS", "(2 to 5 chips)"], num=710, side="b", size=8.5)
    f.box(286, 392, 92, 56, ["FREE-TEXT", "ENTRY"], num=712, side="b", size=8.5)
    f.box(390, 392, 88, 56, ["SKIP", "CONTROL"], num=714, side="b", size=8.5)
    f.box(560, 392, 150, 56, ["REOPEN OR", "CHANGE ANSWER", "(removes stored answer)"], num=724, side="r", size=8)
    f.arrow([(560, 420), (490, 420)], label="re-ask", lpos=(525, 414), lsize=8)
    # answer / skip
    f.arrow([(228, 478), (228, 520)], label="answer", lpos=(233, 503), lanchor="start", lsize=8)
    f.box(110, 520, 200, 48, ["STORE ANSWER IN", "SESSION SCOPE"], num=716, side="l", size=9)
    f.arrow([(434, 478), (434, 520)], label="skip", lpos=(439, 503), lanchor="start", lsize=8)
    f.box(360, 520, 200, 48, ["STORE SKIPPED RECORD AND", "STATED ASSUMPTION"], num=726, side="r", size=8.5)
    f.arrow([(210, 568), (210, 584), (cx, 584), (cx, 600)])
    f.arrow([(460, 568), (460, 584), (cx + 2, 584)], head=False)
    f.box(200, 600, 260, 48, ["REGENERATION REQUEST", "(carries clarification-origin indicator)"],
          num=718, side="r", size=8.5)
    f.arrow([(cx, 648), (cx, 658)])
    f.diamond(cx, 690, 200, 64, ["INDICATOR PRESENT?", "(server check)"], size=8.5)
    f.numeral(720, 386, 730, 370, 712)
    f.arrow([(230, 690), (140, 690), (140, 760)])
    f.text(186, 684, "YES", size=8, anchor="middle")
    f.box(40, 760, 200, 56, ["BYPASS LIMIT CHECK;", "NO DECREMENT OF PER-TASK", "REGENERATION LIMIT"], size=8.5)
    f.arrow([(430, 690), (520, 690), (520, 760)])
    f.text(474, 684, "NO", size=8, anchor="middle")
    f.box(420, 760, 200, 56, ["CHECK AND DECREMENT", "PER-TASK REGENERATION LIMIT", "(user-initiated re-plan)"], size=8.5)
    f.arrow([(140, 816), (140, 880), (200, 880)])
    f.arrow([(520, 816), (520, 880), (460, 880)])
    f.box(200, 860, 260, 40, ["REGENERATED PLAN", "(incorporates answer or assumption)"], num=722, side="b", size=8.5)
    f.arrow([(460, 870), (640, 870), (640, 448)], dashed=True)
    f.text(646, 660, "reopen", size=8)
    f.figlabel("FIG. 7")
    return f


# =====================================================================
# FIG. 8A / 8B  Presentation embodiments
# =====================================================================
def fig8() -> Fig:
    f = Fig("FIG-8", "FIG. 8A - Browser presentation embodiment 800; FIG. 8B - Desktop presentation embodiment")
    # ---- FIG. 8A ----
    f.numeral(800, 56, 84, 82, 92)
    f.frame(60, 92, 410, 370, "BROWSER", size=9)
    f.box(76, 118, 200, 36, ["WEB APPLICATION", "(guidance client)"], num=802, side="r", size=8.5)
    f.rect(76, 170, 378, 276)
    f.text(84, 184, "TARGET APPLICATION (display)", size=8)
    # document picture-in-picture window 806
    f.rect(300, 200, 144, 220)
    f.line(300, 216, 444, 216)
    f.lines(372, 240, ["CURRENT STEP"], size=8)
    f.line(308, 254, 436, 254)
    f.lines(372, 276, ["COMMAND", "[copy control]"], size=8)
    f.line(308, 296, 436, 296)
    f.lines(372, 314, ["OBSERVATION"], size=8)
    f.line(308, 330, 436, 330)
    f.lines(372, 350, ["FLAG"], size=8)
    f.lines(372, 392, ["(always on top;", "document content)"], size=7.5)
    f.numeral(806, 318, 442, 334, 420)
    # right column
    f.box(500, 118, 230, 36, ["USER GESTURE"], num=804, side="b", size=9)
    f.arrow([(500, 136), (372, 136), (372, 200)], label="(1) opens", lpos=(376, 194), lanchor="start", lsize=8)
    f.box(500, 182, 230, 48, ["DISPLAY-MEDIA CAPTURE PROMPT", "(2) shown only after the window is open"],
          num=808, side="b", size=8)
    f.arrow([(500, 206), (470, 206)], label="share", lpos=(485, 200), lsize=7.5)
    f.box(500, 258, 230, 40, ["POP-OUT WINDOW", "(fallback: no document PiP)"], num=810, side="b", size=8.5)
    f.arrow([(444, 278), (500, 278)])
    f.box(500, 326, 230, 40, ["IN-PAGE PRESENTATION", "(fallback: pop-ups blocked)"], num=812, side="b", size=8.5)
    f.arrow([(615, 298), (615, 326)])
    f.box(500, 394, 230, 48, ["SIZING RULE", "(narrow strip; width clamped", "between minimum and maximum)"],
          num=814, side="b", size=8)
    f.arrow([(500, 408), (444, 408)], dashed=True)
    f.text(60, 482, "The floating window lies within a whole-display share; it is not excluded", size=8)
    f.text(60, 493, "from the device's own capture (the model is told it is not the target application).", size=8)
    f.figlabel("FIG. 8A", y=520)

    # ---- FIG. 8B ----
    f.frame(60, 556, 410, 344, "DESKTOP SHELL", size=9)
    f.numeral(820, 140, 546, 170, 556)
    f.box(76, 584, 170, 60, ["PLANNING WINDOW", "(normal, resizable)"], num=822, side="b", size=8.5)
    f.frame(262, 584, 192, 184, "GUIDING OVERLAY", size=8.5)
    f.numeral(824, 282, 790, 296, 768, anchor="middle")
    f.text(270, 612, "(compact; adjustable opacity)", size=7)
    f.box(300, 622, 126, 28, ["ALWAYS ON TOP"], num=826, side="l", size=8, off=12)
    f.box(300, 660, 126, 34, ["CLICK-THROUGH", "(hover re-enables)"], num=828, side="l", size=7.5, off=12)
    f.box(300, 706, 126, 34, ["CONTENT PROTECTION", "(user-toggleable)"], num=830, side="l", size=7.5, off=12)
    f.box(76, 690, 170, 56, ["MONITOR PICKER", "(remembered; content-", "protected)"], num=832, side="b", size=8.5)
    f.box(76, 800, 170, 56, ["COMPANION CARD", "(current step while main", "window hidden; protected)"],
          num=834, side="b", size=8)
    f.box(520, 600, 210, 50, ["CAPTURE MODULE", "(FIG. 1)"], num=122, side="b", size=8.5)
    f.box(520, 760, 210, 56, ["OTHER APPLICATIONS", "(screen share, recording)"], size=8.5)
    f.arrow([(426, 714), (490, 714), (490, 625), (520, 625)])
    f.text(500, 590, "overlay pixels absent from analyzed frames", size=7.5)
    f.arrow([(426, 730), (500, 730), (500, 788), (520, 788)])
    f.text(520, 830, "overlay pixels absent from share", size=7.5)
    f.figlabel("FIG. 8B", y=1000)
    return f


# =====================================================================
# FIG. 9  Destructive-operation display gate 900
# =====================================================================
def fig9() -> Fig:
    f = Fig("FIG-9", "FIG. 9 - Destructive-operation display gate 900")
    cx, dy = 330, 80
    f.numeral(900, 196, 90 + dy, 210, 104 + dy, anchor="end")
    f.box(210, 100 + dy, 240, 44, ["PLAN STEP WITH", "COMMAND OR CODE"], num=902, side="r", size=9)
    f.arrow([(cx, 144 + dy), (cx, 180 + dy)])
    f.box(210, 180 + dy, 240, 44, ["MATCHER", "(deterministic pattern match)"], num=906, side="l", size=9)
    f.box(520, 168 + dy, 200, 68, ["CATALOG OF DESTRUCTIVE-", "OPERATION PATTERNS", "(recursive delete, drop database,",
                                   "force-push, teardown, format)"], num=904, side="b", size=8, lh=11)
    f.arrow([(520, 202 + dy), (450, 202 + dy)])
    f.arrow([(cx, 224 + dy), (cx, 260 + dy)])
    f.diamond(cx, 290 + dy, 160, 60, ["MATCH?"], size=9)
    f.arrow([(250, 290 + dy), (170, 290 + dy)])
    f.text(210, 284 + dy, "NO", size=8, anchor="middle")
    f.box(40, 266 + dy, 130, 48, ["DISPLAY COMMAND", "OR CODE"], size=8.5)
    f.arrow([(cx, 320 + dy), (cx, 360 + dy)])
    f.text(336, 344 + dy, "YES", size=8)
    f.box(210, 360 + dy, 240, 48, ["ANNOTATE WITH DESTRUCTIVE", "INDICATOR AND REASON"], num=908, side="r", size=9)
    f.arrow([(cx, 408 + dy), (cx, 440 + dy)])
    f.box(210, 440 + dy, 240, 60, ["RENDER REASON-LABELED", "PLACEHOLDER IN PLACE OF THE", "COMMAND (step text remains visible)"],
          num=910, side="r", size=8.5)
    f.arrow([(cx, 500 + dy), (cx, 532 + dy)])
    f.box(210, 532 + dy, 240, 44, ["EXPLICIT ACKNOWLEDGMENT", "CONTROL OPERATED BY USER"], num=912, side="r", size=9)
    f.arrow([(cx, 576 + dy), (cx, 608 + dy)])
    f.box(210, 608 + dy, 240, 40, ["REVEAL COMMAND OR CODE"], num=914, side="r", size=9)
    f.arrow([(cx, 648 + dy), (cx, 680 + dy)])
    f.box(210, 680 + dy, 240, 44, ["RECORD ACKNOWLEDGMENT", "EVENT (step, time)"], num=916, side="r", size=9)
    f.text(cx, 770 + dy, "The gate controls display, not execution;", size=9, anchor="middle")
    f.text(cx, 783 + dy, "the guidance client never executes a command.", size=9, anchor="middle")
    f.figlabel("FIG. 9")
    return f


# =====================================================================
# FIG. 10  Multi-task project engine arrangement 1000
# =====================================================================
def fig10() -> Fig:
    f = Fig("FIG-10", "FIG. 10 - Multi-task project engine arrangement 1000")
    f.numeral(1000, 196, 70, 206, 84, anchor="end")
    # ---- top row: goal -> map planner -> breakdown gate -> project store ----
    f.box(56, 92, 130, 44, ["PROJECT GOAL"], num=1002, side="t", size=9)
    f.box(206, 84, 170, 60, ["MAP PLANNER", "(planning model, once,", "at workstream level;",
                              "no step-level instruction)"], num=1004, side="t", size=7.5, lh=10)
    f.box(400, 92, 150, 52, ["BREAKDOWN GATE", "(deterministic; FIG. 11)"], num=1018, side="t", size=8.5)
    f.box(590, 92, 150, 52, ["PROJECT STORE", "(map + ledger;", "task states)"], num=1020, side="t", size=8, lh=10)
    f.arrow([(186, 114), (206, 114)])
    f.arrow([(376, 114), (400, 114)], label="proposed map", lpos=(388, 106), lsize=7)
    f.arrow([(550, 118), (590, 118)], label="pass", lpos=(570, 112), lsize=7.5)
    f.arrow([(475, 144), (475, 170)], label="fail", lpos=(480, 161), lanchor="start", lsize=7.5)
    f.box(400, 170, 150, 36, ["RETURN AS SINGLE TASK", "(suggested goal)"], size=8, rx=14)
    # depth resolver 1040 gates the engine
    f.box(56, 166, 130, 48, ["DEPTH RESOLVER", "(standard | deep;", "pool depth clamped", "to tenant ceiling)"],
          num=1040, side="t", size=7.5, lh=10)
    f.arrow([(186, 200), (260, 200), (260, 144)], label="deep depth required", lpos=(190, 214), lanchor="start", lsize=7)
    # planner -> map contents
    f.arrow([(340, 144), (340, 236)], label=["task descriptors", "+ end-state"], lpos=(334, 206), lanchor="end", lsize=7)
    # ---- project map 1006 with one task descriptor 1008 ----
    f.frame(56, 236, 350, 234, "PROJECT MAP (ordered; dependency-annotated; no step-level instruction)", size=7.5)
    f.numeral(1006, 412, 228, 406, 236)
    f.frame(68, 260, 292, 146, "TASK DESCRIPTOR (one of N)", size=7)
    f.text(76, 286, "state: pending | active | done | rerun; session link; outcome; telemetry", size=6.5)
    f.numeral(1008, 372, 300, 360, 296)
    f.box(80, 296, 150, 28, ["TASK GOAL"], num=1010, side="r", size=8)
    f.box(80, 332, 150, 34, ["DONE-STATE", "(visible when task complete)"], num=1012, side="r", size=7, lh=9)
    f.box(80, 374, 150, 26, ["DEPENDENCIES (earlier task ids)"], num=1014, side="r", size=7)
    f.box(68, 418, 292, 40, ["PROJECT END-STATE", "(done sentence + checks)"], num=1016, side="b", size=8, off=26)
    # injection 1038 feeds the map
    f.box(56, 510, 150, 56, ["MID-PROJECT", "INJECTION", "(dedupe; place; FIG. 12)"], num=1038, side="b", size=8)
    f.arrow([(131, 510), (131, 470)], label="new or folded task", lpos=(137, 494), lanchor="start", lsize=7)
    # ---- right column ----
    RX, RW, RO = 590, 150, 18
    f.arrow([(665, 144), (665, 236)], label="stored map", lpos=(670, 196), lanchor="start", lsize=7)
    f.box(RX, 236, RW, 60, ["NEXT-TASK SELECTOR", "(lowest-order pending;", "all dependencies done;", "ready set)"],
          num=1022, side="l", size=7.5, lh=10, off=RO)
    f.arrow([(665, 296), (665, 330)])
    f.box(RX, 330, RW, 60, ["JUST-IN-TIME EXPANDER", "(steps of the selected", "task only; planning", "model + ledger)"],
          num=1024, side="l", size=7.5, lh=10, off=RO)
    f.arrow([(665, 390), (665, 430)], label=["ordered plan;", "session linked"], lpos=(670, 406), lanchor="start", lsize=7)
    f.box(RX, 430, RW, 64, ["GUIDED SESSION", "(loop 200 of FIG. 2; one", "instruction; no input injected;",
                            "verify from redacted frame)"], num=1028, side="l", size=7.5, lh=10, off=RO)
    f.arrow([(665, 494), (665, 530)], label="session finalized", lpos=(670, 516), lanchor="start", lsize=7)
    f.box(RX, 530, RW, 60, ["TASK COMPLETION", "(mark done; record", "outcome + telemetry)"], num=1030, side="l", size=8, lh=10, off=RO)
    f.arrow([(665, 590), (665, 630)])
    f.box(RX, 630, RW, 60, ["ALL TASKS DONE AND", "END-STATE SHOWN", "SATISFIED?"], num=1034, side="l", size=8, lh=10, off=RO)
    f.arrow([(665, 690), (665, 730)])
    f.text(672, 712, "YES", size=7.5)
    f.box(RX, 730, RW, 36, ["PROJECT DONE"], size=9, rx=16)
    # no -> next task, along the right edge
    f.arrow([(740, 660), (756, 660), (756, 266), (740, 266)])
    f.text(762, 656, "NO", size=7.5)
    f.text(758, 470, "next", size=7)
    f.text(758, 480, "task", size=7)
    # ---- middle column ----
    MX, MW = 416, 120
    f.box(MX, 330, MW, 56, ["CRITIQUE PASS", "(hardened plan accepted", "only if not a refusal and", "at least draft's steps)"],
          num=1042, side="b", size=7, lh=9)
    f.arrow([(536, 340), (590, 340)], tail=True)
    f.box(MX, 420, MW, 60, ["FORWARD-LEARNINGS", "LEDGER", "(project-scoped;", "deduplicated; bounded)"],
          num=1026, side="b", size=7.5, lh=10)
    f.arrow([(536, 440), (578, 440), (578, 378), (590, 378)])
    f.text(577, 434, "seeds", size=7, anchor="middle", bg=True)
    f.box(MX, 540, MW, 56, ["LEDGER WRITE-BACK", "(planning learning;", "confirmed facts)"], num=1032, side="b", size=7.5, lh=10)
    f.arrow([(590, 575), (536, 575)])
    f.arrow([(476, 540), (476, 480)])
    f.box(MX, 720, MW, 64, ["PROJECT REPORT", "GENERATOR", "(success | security |", "issues; no model call)"],
          num=1036, side="b", size=7.5, lh=10)
    f.arrow([(590, 748), (536, 748)], label=["on demand,", "also mid-project"], lpos=(563, 770), lsize=7)
    f.text(400, 890, "Each guided session is the loop of FIG. 2; the display, read from redacted frames,", size=8.5, anchor="middle")
    f.text(400, 902, "remains the oracle at both tiers.", size=8.5, anchor="middle")
    f.figlabel("FIG. 10")
    return f


def _dnum(f: Fig, n: int, cx: float, cy: float, h: float):
    """Numeral at the lower-right of a diamond centered at (cx, cy) with height h."""
    f.numeral(n, cx + 26, cy + h / 2 + 10, cx + 10, cy + h / 2 - 6)


# =====================================================================
# FIG. 11  Deterministic breakdown gate 1100
# =====================================================================
def fig11() -> Fig:
    f = Fig("FIG-11", "FIG. 11 - Deterministic breakdown gate 1100")
    cx = 330
    f.numeral(1100, 196, 90, 210, 100, anchor="end")
    f.box(210, 90, 240, 48, ["PROPOSED BREAKDOWN FROM MAP", "PLANNER (task descriptors + end-state)"],
          num=1102, side="r", size=8.5)
    f.arrow([(cx, 138), (cx, 166)])
    f.box(210, 166, 240, 52, ["REAL-TASK TEST:", "aim AND non-empty done-state", "(both required)"],
          num=1104, side="l", size=8.5, lh=11)
    f.arrow([(cx, 218), (cx, 246)])
    f.box(210, 246, 240, 52, ["NORMALIZE LABELS (lowercase,", "trim, collapse spaces);", "COLLAPSE DUPLICATES"],
          num=1106, side="l", size=8.5, lh=11)
    f.arrow([(cx, 298), (cx, 324)])
    f.diamond(cx, 362, 236, 76, ["AT LEAST TWO", "DISTINCT REAL TASKS?"], size=8.5)
    _dnum(f, 1108, cx, 362, 76)
    f.arrow([(212, 362), (180, 362)])
    f.text(196, 356, "NO", size=7.5, anchor="middle")
    f.box(40, 334, 140, 56, ["RETURN AS SINGLE TASK", "(suggested goal);", "NOT A PROJECT"], num=1110, side="b", size=8, lh=11, rx=12)
    f.arrow([(cx, 400), (cx, 426)])
    f.text(336, 418, "YES", size=7.5)
    f.diamond(cx, 460, 236, 68, ["EVERY DEPENDENCY", "RESOLVES?"], size=8.5)
    _dnum(f, 1112, cx, 460, 68)
    f.arrow([(cx, 494), (cx, 526)])
    f.text(336, 516, "YES", size=7.5)
    f.diamond(cx, 560, 236, 68, ["ACYCLIC? (three-color DFS;", "cycle members named)"], size=8)
    _dnum(f, 1114, cx, 560, 68)
    f.arrow([(cx, 594), (cx, 626)])
    f.text(336, 616, "YES", size=7.5)
    f.diamond(cx, 660, 236, 68, ["END-STATE DEFINED?"], size=8.5)
    _dnum(f, 1116, cx, 660, 68)
    f.arrow([(cx, 694), (cx, 730)])
    f.text(336, 718, "YES", size=7.5)
    f.box(210, 730, 240, 48, ["ACCEPT; PERSIST AS PROJECT MAP", "(store 1020, FIG. 10)"], num=1120, side="l", size=8.5, rx=18)
    # error collector on the right -> 1118
    ex = 630
    f.arrow([(450, 192), (ex, 192), (ex, 730)])
    f.text(540, 186, "filler task: error", size=7, anchor="middle")
    f.arrow([(450, 272), (ex, 272)], head=False)
    f.junction(ex, 272)
    f.text(540, 266, "duplicate: error", size=7, anchor="middle")
    for y in (460, 560, 660):
        f.arrow([(448, y), (ex, y)], head=False)
        f.junction(ex, y)
        f.text(540, y - 6, "NO", size=7.5, anchor="middle")
    f.box(520, 730, 220, 64, ["REJECT: EVERY ERROR LISTED", "(not short-circuited);", "nothing persisted"],
          num=1118, side="b", size=8.5, lh=11)
    # advisory side rule 1122
    f.arrow([(110, 390), (110, 820)], label=["later, when a", "single task is", "expanded"], lpos=(116, 600), lanchor="start", lsize=7)
    f.box(40, 820, 260, 64, ["ADVISORY ONLY: a single task whose", "expanded plan exceeds a step threshold",
                             "yields a hint to reconsider;", "never an automatic split"], num=1122, side="r", size=7.5, lh=10)
    f.text(cx, 930, "Over-splitting is an error; under-splitting is advisory.", size=8.5, anchor="middle")
    f.text(cx, 942, "No machine-learning model is invoked by the gate.", size=8.5, anchor="middle")
    f.figlabel("FIG. 11")
    return f


# =====================================================================
# FIG. 12  Mid-project task injection flow 1200
# =====================================================================
def fig12() -> Fig:
    f = Fig("FIG-12", "FIG. 12 - Mid-project task injection flow 1200")
    cx = 330
    f.numeral(1200, 196, 90, 210, 100, anchor="end")
    f.box(210, 90, 240, 44, ["FURTHER REQUEST ARRIVES", "MID-PROJECT"], num=1202, side="r", size=8.5)
    f.arrow([(cx, 134), (cx, 162)])
    f.box(190, 162, 280, 60, ["TOKEN-SET SIMILARITY", "(normalized word tokens; Jaccard)", "vs goal and title of each task descriptor"],
          num=1204, side="r", size=8, lh=11)
    f.arrow([(cx, 222), (cx, 250)])
    f.diamond(cx, 288, 236, 72, ["BEST SIMILARITY", "AT OR ABOVE THRESHOLD?"], size=8)
    _dnum(f, 1206, cx, 288, 72)
    f.arrow([(212, 288), (180, 288)])
    f.text(196, 282, "YES", size=7.5, anchor="middle")
    f.box(40, 262, 140, 52, ["FOLD INTO EXISTING", "TASK; NO NEW", "DESCRIPTOR"], num=1208, side="b", size=8, lh=11)
    f.arrow([(cx, 324), (cx, 350)])
    f.text(336, 342, "NO", size=7.5)
    f.box(210, 350, 240, 40, ["CREATE NEW TASK DESCRIPTOR"], num=1210, side="r", size=8.5)
    f.arrow([(cx, 390), (cx, 412)])
    f.hexagon(cx, 446, 260, 68, ["PLACEMENT SELECTOR", "(blocker named? dependencies", "named? neither?)"], size=8)
    f.numeral(1212, 476, 486, 448, 458)
    # three placements
    f.arrow([(cx, 480), (cx, 500), (140, 500), (140, 528)])
    f.arrow([(cx, 500), (400, 500), (400, 528)])
    f.arrow([(cx, 500), (660, 500), (660, 528)])
    f.text(146, 520, "blocker named", size=7)
    f.text(406, 520, "dependencies named", size=7)
    f.text(666, 520, "neither", size=7)
    f.box(40, 528, 200, 72, ["BEFORE NAMED BLOCKER", "(inherit blocker's upstream", "dependencies; blocker now", "depends on new task)"],
          num=1214, side="r", size=7.5, lh=10)
    f.box(300, 528, 200, 60, ["AFTER LATEST NAMED", "DEPENDENCY"], num=1216, side="r", size=8)
    f.box(560, 528, 200, 60, ["AT FRONTIER", "(after last task not done;", "no edge added)"], num=1218, side="b", size=7.5, lh=10)
    # cycle probe fed by 1214 and 1216
    f.arrow([(140, 600), (140, 626), (cx, 626)], head=False)
    f.arrow([(400, 588), (400, 626), (cx, 626)], head=False)
    f.junction(cx, 626)
    f.arrow([(cx, 626), (cx, 640)])
    f.diamond(cx, 678, 236, 76, ["WOULD AN ADDED EDGE", "CLOSE A CYCLE? (DFS)"], size=8.5)
    _dnum(f, 1220, cx, 678, 76)
    f.arrow([(448, 678), (630, 678), (630, 752)])
    f.text(540, 672, "YES", size=7.5, anchor="middle")
    f.box(520, 752, 220, 64, ["DROP OFFENDING EDGE;", "APPEND AT FRONTIER WITH", "CYCLE-AVOIDED NOTICE"],
          num=1222, side="l", size=8, lh=11)
    f.arrow([(cx, 716), (cx, 850)])
    f.text(336, 736, "NO", size=7.5)
    # 1218 and 1222 join into 1224
    f.arrow([(660, 588), (760, 588), (760, 840), (630, 840)], head=False)
    f.arrow([(630, 816), (630, 874), (450, 874)])
    f.junction(630, 840)
    f.box(210, 850, 240, 48, ["RENUMBER ORDERS CONSECUTIVELY;", "PERSIST (inputs never mutated)"], num=1224, side="l", size=8.5)
    f.text(cx, 940, "The stored map is replaced only by the committed result;", size=8.5, anchor="middle")
    f.text(cx, 952, "a refused placement leaves the project unchanged.", size=8.5, anchor="middle")
    f.figlabel("FIG. 12")
    return f


# =====================================================================
# FIG. 13  Transient-unreadable-frame tolerance 1300
# =====================================================================
def fig13() -> Fig:
    f = Fig("FIG-13", "FIG. 13 - Transient-unreadable-frame tolerance 1300 in the watch loop")
    cx = 370
    f.numeral(1300, 236, 90, 250, 100, anchor="end")
    f.box(250, 90, 240, 48, ["FRAME CAPTURED IN WATCH LOOP", "(settled; redacted on device)"], num=1302, side="r", size=8.5)
    f.arrow([(cx, 138), (cx, 166)])
    f.box(230, 166, 280, 60, ["NAVIGATION RECORD FROM FIRST MODEL 172", "(completed set, current step, guidance,",
                              "observation, flag, done)"], num=1304, side="r", size=8, lh=11)
    f.arrow([(cx, 226), (cx, 252)])
    f.diamond(cx, 292, 240, 76, ["READABLE?", "(instruction or", "observation present)"], size=8.5)
    _dnum(f, 1306, cx, 292, 76)
    f.arrow([(250, 292), (230, 292)])
    f.text(240, 286, "YES", size=7.5, anchor="middle")
    f.box(80, 260, 150, 64, ["RESET CONSECUTIVE", "COUNT; APPLY RECORD", "(verify, advance or", "correct; FIG. 2)"],
          num=1308, side="b", size=7.5, lh=10)
    f.arrow([(cx, 330), (cx, 358)])
    f.text(376, 350, "NO", size=7.5)
    f.box(250, 358, 240, 44, ["INCREMENT PER-SESSION", "CONSECUTIVE COUNT"], num=1310, side="r", size=8.5)
    f.arrow([(cx, 402), (cx, 428)])
    f.diamond(cx, 466, 240, 76, ["COUNT AT OR ABOVE", "TOLERANCE?", "(for example two)"], size=8.5)
    _dnum(f, 1312, cx, 466, 76)
    f.arrow([(250, 466), (145, 466), (145, 520)])
    f.text(200, 460, "NO", size=7.5, anchor="middle")
    f.box(60, 520, 170, 96, ["WITHHOLD SECOND MODEL 174:", "no re-submission; current", "step and instruction",
                             "unchanged; no escalation", "event; frame still audited"], num=1314, side="b", size=7.5, lh=11)
    f.arrow([(cx, 504), (cx, 560)])
    f.text(376, 536, "YES", size=7.5)
    f.box(250, 560, 240, 80, ["SECOND MODEL 174 PERMITTED:", "next unreadable frame re-submitted", "with the plan for that call;",
                              "escalation event recorded"], num=1316, side="r", size=8, lh=11)
    f.box(560, 358, 180, 64, ["MANUAL DEEP READ", "(user request):", "escalate regardless", "of count"], num=1318, side="b", size=8, lh=11)
    f.arrow([(650, 422), (650, 620), (490, 620)], label="always", lpos=(656, 530), lanchor="start", lsize=7.5)
    # all paths -> next frame -> back to 1302
    f.arrow([(145, 616), (145, 660), (cx, 660)], head=False)
    f.arrow([(cx, 640), (cx, 660)], head=False)
    f.junction(cx, 660)
    f.arrow([(cx, 660), (cx, 680)])
    f.box(270, 680, 200, 36, ["NEXT FRAME"], size=9, rx=16)
    f.arrow([(80, 292), (44, 292), (44, 698), (270, 698)], head=True)
    f.arrow([(470, 698), (760, 698), (760, 70), (cx, 70), (cx, 90)])
    f.text(60, 770, "A one-off read outside the loop escalates immediately; a model error escalates immediately;", size=8.5)
    f.text(60, 782, "a successful response with no content is a retriable model failure, not an unreadable frame.", size=8.5)
    f.text(60, 800, "Alternative embodiment: a sliding window over the most recent frames (a first number of the", size=8.5)
    f.text(60, 812, "last second number of frames unreadable) in place of the consecutive count.", size=8.5)
    f.figlabel("FIG. 13")
    return f


# =====================================================================
TITLES = {
    "FIG-1": ("FIG. 1", "Screen-aware guidance system 100", "block diagram"),
    "FIG-2": ("FIG. 2", "Observe, instruct, verify, correct and advance guidance loop 200", "flowchart"),
    "FIG-3": ("FIG. 3", "On-device redaction and tokenization pipeline 300 with local reconstruction", "block diagram"),
    "FIG-4": ("FIG. 4", "Sequence 400 of one guided step", "sequence diagram"),
    "FIG-5": ("FIG. 5", "Tenant-governed egress, instruction-shaping and evidence-retention arrangement 500", "block diagram"),
    "FIG-6": ("FIG. 6", "Workflow-template capture, storage and tiered-retrieval arrangement 600", "block diagram"),
    "FIG-7": ("FIG. 7", "Screen-derived clarification flow 700", "flowchart"),
    "FIG-8": ("FIG. 8A / FIG. 8B", "Browser presentation embodiment 800 (8A); desktop presentation embodiment (8B)", "block diagrams, one sheet"),
    "FIG-9": ("FIG. 9", "Destructive-operation display gate 900", "flowchart"),
    "FIG-10": ("FIG. 10", "Multi-task project engine arrangement 1000", "block diagram"),
    "FIG-11": ("FIG. 11", "Deterministic breakdown gate 1100", "flowchart"),
    "FIG-12": ("FIG. 12", "Mid-project task injection flow 1200", "flowchart"),
    "FIG-13": ("FIG. 13", "Transient-unreadable-frame tolerance 1300 in the watch loop", "flowchart"),
}
SERIES = {"FIG-1": (100, 190), "FIG-2": (200, 234), "FIG-3": (300, 340), "FIG-4": (400, 440),
          "FIG-5": (500, 540), "FIG-6": (600, 650), "FIG-7": (700, 726), "FIG-8": (800, 834), "FIG-9": (900, 916),
          "FIG-10": (1000, 1042), "FIG-11": (1100, 1122), "FIG-12": (1200, 1224), "FIG-13": (1300, 1318)}
N_SHEETS = len(TITLES)
LAST_FIG = "FIG. 13"
SPEC = os.path.abspath(os.path.join(OUT, "..", "..", "v2", "10-specification.md"))
CLAIMS = os.path.abspath(os.path.join(OUT, "..", "..", "v2", "20-claims.md"))


def spec_numerals(path: str) -> set[int]:
    """Every three- or four-digit reference numeral used in the text (statute, patent and
    year-like numbers excluded). Numerals run 100 to 1399 (FIG. 1 to FIG. 13 series)."""
    import re
    pat = re.compile(r"(?<![\w\.\[\$])(\d{3,4})(?![\d\]%])")
    text = open(path, encoding="utf-8").read()
    # patent and paper identifiers are not reference numerals: strip them before scanning
    text = re.sub(r"US\s?\d{1,2},?\d{3},?\d{3}\s?[AB]?\d?|US\s?\d{4}/\d{7}\s?A\d|arXiv\s?\d{4}\.\d{5}", " ", text)
    found = {int(m.group(1)) for m in pat.finditer(text)}
    not_numerals = {119, 103, 361, 368}  # 35 U.S.C. 119(e), §103, US 11,368,361
    return {n for n in found if 100 <= n <= 1399 and n not in not_numerals}


def write_manifest(inventory: dict, warnings: list) -> list:
    spec = spec_numerals(SPEC) if os.path.exists(SPEC) else set()
    claims = spec_numerals(CLAIMS) if os.path.exists(CLAIMS) else set()
    drawn = {int(n) for v in inventory.values() for n in v}
    missing = sorted(spec - drawn)
    extra = sorted(drawn - spec)
    lines = []
    lines.append(f"# Drawings manifest: FIG. 1 to {LAST_FIG} (WorkCoPilot utility application)\n")
    lines.append("Status: INFORMAL drawings, generated from `tools/gen_drawings.py`. They are suitable for filing as "
                 "informal drawings and for review; a registered patent draftsperson should formalize them to "
                 "37 CFR 1.84 before issuance (sheet margins, minimum 0.32 cm lettering for every label, line "
                 "quality). The sheets carry no draft or branding text, by design.\n")
    lines.append("Conventions applied: black lines on white only; no color, gradients, fills or shading (arrowheads "
                 "are solid black); uniform 1.25 px line weight with 0.6 px lead lines; every reference numeral has a "
                 "lead line to its part; dashed lines only for system boundaries, data that never leaves the device, "
                 "the user-performs box, and signal paths; plain sans-serif labels; \"FIG. N\" centered under each "
                 "figure; portrait US-Letter (8.5 x 11 in), one figure per sheet (FIG. 8A and FIG. 8B share sheet 8 "
                 "as the drawings description suggests). Dashes are drawn as explicit segments and arrowheads as "
                 "triangles so every SVG/PDF renderer shows them identically.\n")
    lines.append("## Files\n")
    lines.append("| File | Purpose |\n|---|---|")
    lines.append(f"| `FIG-1.svg` ... `FIG-{N_SHEETS}.svg` | editable source sheets (one per figure; `FIG-8.svg` holds 8A and 8B) |")
    lines.append(f"| `drawings.pdf` | all {N_SHEETS} sheets, portrait US-Letter, for Patent Center upload (document code DRW) |")
    lines.append(f"| `previews/fig-1.png` ... `previews/fig-{N_SHEETS}.png` | 110 dpi raster previews for on-screen review |")
    lines.append("| `numerals.json` | machine-readable per-figure numeral inventory (written by the generator) |")
    lines.append("| `tools/gen_drawings.py` | generator; re-run to regenerate every file above after an edit |\n")
    lines.append("Regenerate: `python tools/gen_drawings.py` (needs Python 3 and PyMuPDF for PNG/PDF output; "
                 "SVGs need no dependency).\n")
    lines.append("## Figures and the reference numerals each contains\n")
    for key, (label, title, kind) in TITLES.items():
        nums = inventory.get(key, [])
        lo, hi = SERIES[key]
        own = [n for n in nums if lo <= int(n) <= hi]
        reused = [n for n in nums if not (lo <= int(n) <= hi)]
        lines.append(f"### {label}: {title}\n")
        lines.append(f"Type: {kind}. Sheet: `{key}.svg`, page {key.split('-')[1]} of `drawings.pdf`.\n")
        lines.append(f"Numerals ({len(nums)}): " + ", ".join(nums) + "\n")
        if reused:
            lines.append("Reused from another figure, as the drawings description requires: " + ", ".join(reused) + "\n")
    lines.append("## Cross-check against the specification\n")
    lines.append(f"Reference numerals used in `v2/10-specification.md`: {len(spec)}. Numerals drawn on at least one "
                 f"figure: {len(drawn)}.\n")
    lines.append("Numerals in the specification NOT yet depicted on any figure: " + (", ".join(map(str, missing)) if missing else "none") + "\n")
    lines.append("Numerals drawn that the specification does not use: " + (", ".join(map(str, extra)) if extra else "none") + "\n")
    cl_missing = sorted(claims - drawn)
    lines.append("Numerals cited in the claims-support table of `v2/20-claims.md` not depicted: " +
                 (", ".join(map(str, cl_missing)) if cl_missing else "none") + "\n")
    lines.append("Numeral placement rule: each numeral appears once per figure with its own lead line. Figures also carry "
                 "a few cross-reference mentions in annotation text (for example \"supersede, FIG. 6\" in FIG. 2, "
                 "\"step 234, FIG. 2\" in FIG. 6, \"gated by 162\" in FIG. 4, \"first model 172\" and \"second model 174\" "
                 "in FIG. 13, \"store 1020\" in FIG. 11); these are text, not numeral placements, "
                 "and a draftsperson may remove them when formalizing.\n")
    lines.append("Suggested figure for publication (ADS): FIG. 2, per the drawings description.\n")
    if warnings:
        lines.append("## Generator warnings\n")
        lines += [f"- {w}" for w in warnings]
    with open(os.path.join(OUT, "drawings-manifest.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    return missing


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(PREV, exist_ok=True)
    figs = [fig1(), fig2(), fig3(), fig4(), fig5(), fig6(), fig7(), fig8(), fig9(), fig10(), fig11(), fig12(), fig13()]
    inventory = {}
    warnings = []
    for fg in figs:
        fg.save()
        inventory[fg.name] = sorted(fg.numerals, key=int)
        warnings += fg.warnings
    with open(os.path.join(OUT, "numerals.json"), "w", encoding="utf-8") as fh:
        json.dump(inventory, fh, indent=1)

    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("PyMuPDF not available; SVGs written, no PNG/PDF", file=sys.stderr)
        return warnings
    pdf = fitz.open()
    for fg in figs:
        src = fitz.open(os.path.join(OUT, fg.name + ".svg"))
        n = fg.name.split("-")[1]
        src[0].get_pixmap(dpi=110).save(os.path.join(PREV, f"fig-{n}.png"))
        pdf.insert_pdf(fitz.open("pdf", src.convert_to_pdf()))
    pdf.set_metadata({"title": f"Drawings FIG. 1 to {LAST_FIG}", "producer": "", "creator": ""})
    pdf.save(os.path.join(OUT, "drawings.pdf"), garbage=4, deflate=True)
    return warnings


if __name__ == "__main__":
    ws = main()
    inv = json.load(open(os.path.join(OUT, "numerals.json"), encoding="utf-8"))
    missing = write_manifest(inv, ws)
    for w in ws:
        print("WARN", w)
    print("done; warnings:", len(ws), "; spec numerals missing from figures:", missing or "none")
    sys.exit(1 if missing else 0)
