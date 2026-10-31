# Usage: python scripts/help-shots/frames.py <workdir>/frames
# Render mock "third-party app" screens (a fictional Northwind Billing / TMS app)
# used as the recorded step screenshots of the demo workflows. Throwaway, demo only.
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)

CSS = """
*{box-sizing:border-box} body{margin:0;font:14px/1.45 'Segoe UI',system-ui,sans-serif;color:#1f2937;background:#f3f5f9}
.top{height:52px;background:#1e3a5f;color:#fff;display:flex;align-items:center;padding:0 20px;gap:14px}
.top b{font-size:16px} .top .sp{flex:1} .top .u{opacity:.85;font-size:13px}
.wrap{display:flex;height:calc(100vh - 52px)}
.side{width:200px;background:#fff;border-right:1px solid #e5e7eb;padding:14px 10px}
.side a{display:block;padding:8px 12px;border-radius:6px;color:#374151;text-decoration:none;margin-bottom:2px}
.side a.on{background:#e8eef7;color:#1e3a5f;font-weight:600}
.main{flex:1;padding:22px 28px;overflow:hidden}
h1{font-size:20px;margin:0 0 14px} .muted{color:#6b7280}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin-bottom:14px}
table{width:100%;border-collapse:collapse;background:#fff} th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #eef0f4}
th{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
.in{border:1px solid #cbd5e1;border-radius:6px;padding:8px 10px;width:320px;background:#fff}
.btn{display:inline-block;padding:8px 14px;border-radius:6px;background:#1e3a5f;color:#fff;font-weight:600}
.btn.alt{background:#fff;color:#1e3a5f;border:1px solid #1e3a5f} .btn.red{background:#b42318}
.tabs{display:flex;gap:4px;border-bottom:1px solid #e5e7eb;margin-bottom:14px}
.tabs span{padding:8px 14px} .tabs span.on{border-bottom:2px solid #1e3a5f;font-weight:600;color:#1e3a5f}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;background:#e7f6ec;color:#166534}
.pill.o{background:#fef3c7;color:#92400e}
.ov{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center}
.dlg{background:#fff;border-radius:12px;width:460px;padding:22px 24px;box-shadow:0 20px 50px rgba(0,0,0,.25)}
.row{margin:10px 0} label{display:block;font-size:12px;color:#6b7280;margin-bottom:4px}
.ok{background:#e7f6ec;border:1px solid #a7e3bb;color:#166534;padding:12px 14px;border-radius:8px;margin-bottom:14px;font-weight:600}
.bad{background:#fdecea;border:1px solid #f5b7b1;color:#8a1c12;padding:12px 14px;border-radius:8px;margin:10px 0;font-weight:600}
"""

def page(app, nav, body, extra=''):
    side = ''.join(f'<a class="{"on" if n == nav else ""}">{n}</a>' for n in (['Customers', 'Invoices', 'Refunds', 'Reports', 'Settings'] if app == 'Billing' else ['Shipments', 'Rate tables', 'Carriers', 'Lanes', 'Settings']))
    return f"<html><head><style>{CSS}</style></head><body><div class='top'><b>Northwind {app}</b><span class='sp'></span><span class='u'>Maya Lin</span></div><div class='wrap'><div class='side'>{side}</div><div class='main'>{body}</div></div>{extra}</body></html>"

INV = "<table><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr>" + ''.join(
    f"<tr><td>{i}</td><td>{d}</td><td>{a}</td><td><span class='pill{' o' if s=='Open' else ''}'>{s}</span></td><td>{b}</td></tr>"
    for i, d, a, s, b in [('INV-20418', 'Oct 12', '$1,240.00', 'Paid', "<span class='btn alt'>Refund</span>"), ('INV-20377', 'Sep 28', '$860.00', 'Paid', ''), ('INV-20301', 'Sep 09', '$415.50', 'Open', '')]) + "</table>"

SCREENS = {
    'refund-1': page('Billing', 'Customers', "<h1>Customers</h1><div class='card'><input class='in' value='Bluebird Cafe'> <span class='btn'>Search</span></div><table><tr><th>Customer</th><th>Account</th><th>Balance</th></tr><tr><td><b>Bluebird Cafe</b></td><td>ACC-3391</td><td>$0.00</td></tr><tr><td>Bluebird Bakery</td><td>ACC-4410</td><td>$415.50</td></tr></table>"),
    'refund-2': page('Billing', 'Customers', "<h1>Bluebird Cafe <span class='muted' style='font-size:14px'>ACC-3391</span></h1><div class='tabs'><span>Overview</span><span class='on'>Invoices</span><span>Payments</span><span>Notes</span></div>" + INV),
    'refund-3': page('Billing', 'Customers', "<h1>Bluebird Cafe <span class='muted' style='font-size:14px'>ACC-3391</span></h1><div class='tabs'><span>Overview</span><span class='on'>Invoices</span><span>Payments</span><span>Notes</span></div>" + INV,
        "<div class='ov'><div class='dlg'><h1>Refund INV-20418</h1><div class='row'><label>Amount</label><input class='in' value='$1,240.00'></div><div class='row'><label>Reason</label><input class='in' value='Duplicate charge'></div><div class='row'><label>Note to customer</label><input class='in' value='Refund for the duplicate October charge.'></div><div style='margin-top:16px;display:flex;gap:8px;justify-content:flex-end'><span class='btn alt'>Cancel</span><span class='btn'>Issue refund</span></div></div></div>"),
    'refund-4': page('Billing', 'Refunds', "<div class='ok'>Refund RF-1182 issued for $1,240.00</div><h1>Refunds</h1><table><tr><th>Refund</th><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr><tr><td><b>RF-1182</b></td><td>INV-20418</td><td>Bluebird Cafe</td><td>$1,240.00</td><td><span class='pill'>Issued</span></td></tr><tr><td>RF-1179</td><td>INV-20112</td><td>Harbor Books</td><td>$96.00</td><td><span class='pill'>Issued</span></td></tr></table>"),
    'carrier-1': page('TMS', 'Rate tables', "<h1>Rate tables</h1><div class='card' style='display:flex;align-items:center;gap:10px'><span class='muted'>Region</span><input class='in' style='width:200px' value='Midwest'><span class='sp' style='flex:1'></span><span class='btn'>New carrier</span></div><table><tr><th>Carrier</th><th>Mode</th><th>Base rate</th><th>Fuel</th></tr><tr><td>Lakeshore Freight</td><td>LTL</td><td>$2.10 / mi</td><td>18%</td></tr><tr><td>Prairie Express</td><td>FTL</td><td>$2.65 / mi</td><td>17%</td></tr></table>"),
    'carrier-2': page('TMS', 'Rate tables', "<h1>New carrier</h1><div class='card'><div class='row'><label>Carrier name</label><input class='in' value='Red Oak Logistics'></div><div class='row'><label>Mode</label><input class='in' value='LTL'></div><div class='row'><label>Base rate per mile</label><input class='in' value='2.25'></div><div class='row'><label>Fuel surcharge</label><input class='in' value='18%'></div><div style='margin-top:14px'><span class='btn'>Save carrier</span> <span class='btn alt'>Cancel</span></div></div>"),
    'carrier-3': page('TMS', 'Rate tables', "<div class='ok'>Red Oak Logistics added to Midwest</div><h1>Rate tables</h1><table><tr><th>Carrier</th><th>Mode</th><th>Base rate</th><th>Fuel</th></tr><tr><td><b>Red Oak Logistics</b></td><td>LTL</td><td>$2.25 / mi</td><td>18%</td></tr><tr><td>Lakeshore Freight</td><td>LTL</td><td>$2.10 / mi</td><td>18%</td></tr><tr><td>Prairie Express</td><td>FTL</td><td>$2.65 / mi</td><td>17%</td></tr></table>"),
    'incident-1': page('Billing', 'Customers', "<h1>Bluebird Cafe <span class='muted' style='font-size:14px'>ACC-3391</span></h1><div class='tabs'><span>Overview</span><span class='on'>Invoices</span><span>Payments</span><span>Notes</span></div>" + INV,
        "<div class='ov'><div class='dlg'><h1>Refund INV-20418</h1><div class='row'><label>Amount</label><input class='in' value='$1,240.00'></div><div class='row'><label>Refund method</label><input class='in' value='Choose a method'></div><div class='bad'>Choose a refund method before you submit.</div><div style='margin-top:16px;display:flex;gap:8px;justify-content:flex-end'><span class='btn alt'>Cancel</span><span class='btn'>Submit refund</span></div></div></div>"),
}

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    for name, html in SCREENS.items():
        pg.set_content(html)
        pg.screenshot(path=str(OUT / f'{name}.jpg'), type='jpeg', quality=80)
        print(name)
    b.close()
