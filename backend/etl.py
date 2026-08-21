"""
ETL — يحوّل ملف مبيعات Excel إلى قاعدة بيانات SQLite، ويسحب مؤشرًا عامًا يوميًا.
بايثون قياسي فقط: لا pandas ولا openpyxl ولا أي تثبيت.

    python etl.py            # يبني قاعدة البيانات من الإكسل + يسحب مؤشر اليوم
    python etl.py --daily    # يسحب مؤشر اليوم فقط (للمهمة المجدولة)
"""
import json, os, re, sqlite3, sys, urllib.request, zipfile
import xml.etree.ElementTree as ET
from datetime import date

HERE  = os.path.dirname(os.path.abspath(__file__))
DB    = os.path.join(HERE, "portfolio.db")
XLSX  = os.path.join(HERE, "..", "docs", "sales-dashboard.xlsx")
NS    = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
SHEET = "Sales Data"          # اسم الورقة التي تحمل البيانات الخام


# ────────────────────────── قراءة ملف Excel ──────────────────────────
def col_index(ref):
    """A1 -> 0 ، B3 -> 1"""
    letters = re.match(r"[A-Z]+", ref).group()
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_sheet(path, sheet_name):
    with zipfile.ZipFile(path) as z:
        # النصوص المشتركة
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall(f"{NS}si"):
                shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))

        # إيجاد ملف الورقة المطلوبة
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rel_map = {r.get("Id"): r.get("Target") for r in rels}
        target = None
        for sh in wb.find(f"{NS}sheets"):
            if sh.get("name").strip() == sheet_name.strip():
                rid = [v for k, v in sh.attrib.items() if k.endswith("}id")][0]
                target = rel_map[rid]
                break
        if not target:
            raise SystemExit(f"sheet not found: {sheet_name}")
        target = "xl/" + target.lstrip("/").replace("worksheets/", "worksheets/")

        rows = []
        sheet = ET.fromstring(z.read(target))
        for r in sheet.iter(f"{NS}row"):
            cells = {}
            for c in r.findall(f"{NS}c"):
                v = c.find(f"{NS}v")
                if v is None or v.text is None:
                    continue
                val = shared[int(v.text)] if c.get("t") == "s" else v.text
                cells[col_index(c.get("r"))] = val
            if cells:
                width = max(cells) + 1
                rows.append([cells.get(i, "") for i in range(width)])
        return rows


def num(x):
    try:
        return float(str(x).replace(",", "").replace("$", ""))
    except (TypeError, ValueError):
        return None


def build_sales(con):
    rows = read_sheet(XLSX, SHEET)
    if not rows:
        raise SystemExit("no rows read")

    header = [str(h).strip() for h in rows[0]]
    idx = {h.lower(): i for i, h in enumerate(header)}

    def pick(*names):
        for n in names:
            for key, i in idx.items():
                if n in key:
                    return i
        return None

    i_rev  = pick("revenue", "sales amount", "total sales", "amount")
    i_qty  = pick("orderqty", "quantity", "qty")
    i_cat  = pick("category", "product category")
    i_reg  = pick("region", "country")
    i_col  = pick("color", "colour")
    i_date = pick("date")

    con.execute("DROP TABLE IF EXISTS sales")
    con.execute("""CREATE TABLE sales(
        id INTEGER PRIMARY KEY, order_date TEXT, category TEXT,
        region TEXT, color TEXT, quantity REAL, revenue REAL)""")

    kept = 0
    for r in rows[1:]:
        get = lambda i: (r[i] if i is not None and i < len(r) else "")
        rev = num(get(i_rev))
        qty = num(get(i_qty))
        if rev is None and qty is None:
            continue
        con.execute("INSERT INTO sales(order_date,category,region,color,quantity,revenue) VALUES(?,?,?,?,?,?)",
                    (str(get(i_date)), str(get(i_cat)), str(get(i_reg)), str(get(i_col)), qty or 0, rev or 0))
        kept += 1
    con.commit()
    print(f"columns : {header}")
    print(f"rows    : {kept}")
    return kept


# ────────────────── المهمة اليومية: مؤشر عام (ETL مجدول) ──────────────────
def fetch_daily(con):
    con.execute("""CREATE TABLE IF NOT EXISTS daily(
        day TEXT PRIMARY KEY, sar_per_usd REAL, riyadh_temp_c REAL, fetched_at TEXT)""")
    sar = temp = None
    try:
        with urllib.request.urlopen(
                "https://api.frankfurter.app/latest?from=USD&to=SAR", timeout=8) as r:
            sar = json.load(r)["rates"]["SAR"]
    except Exception as e:
        print("fx  skipped:", e)
    try:
        with urllib.request.urlopen(
                "https://api.open-meteo.com/v1/forecast?latitude=24.71&longitude=46.68"
                "&current=temperature_2m&timezone=Asia%2FRiyadh", timeout=8) as r:
            temp = json.load(r)["current"]["temperature_2m"]
    except Exception as e:
        print("wx  skipped:", e)

    today = date.today().isoformat()
    con.execute("INSERT OR REPLACE INTO daily VALUES(?,?,?,datetime('now'))", (today, sar, temp))
    con.commit()
    print(f"daily   : {today}  usd/sar={sar}  riyadh={temp}C")


def ensure_tables(con):
    con.execute("""CREATE TABLE IF NOT EXISTS counters(
        name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)""")
    con.execute("""CREATE TABLE IF NOT EXISTS messages(
        id INTEGER PRIMARY KEY, name TEXT, email TEXT, body TEXT, created_at TEXT)""")
    con.commit()


if __name__ == "__main__":
    con = sqlite3.connect(DB)
    ensure_tables(con)
    if "--daily" in sys.argv:
        fetch_daily(con)
    else:
        build_sales(con)
        fetch_daily(con)
    con.close()
    print("db      :", DB)
