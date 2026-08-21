"""
API + خادم الموقع — بايثون قياسي فقط، بلا أي تثبيت.

    python backend/etl.py        # مرة واحدة: يبني قاعدة البيانات
    python backend/api.py        # يشغّل الموقع والـ API على http://localhost:8000

المسارات:
    GET  /api/summary?region=&category=&year=     ملخص مع فلاتر
    GET  /api/by-category | /api/by-region | /api/by-year | /api/top-models
    GET  /api/daily                                مؤشر اليوم (سعر الصرف + حرارة الرياض)
    GET  /api/stats                                عدّاد الزيارات وتحميلات السيرة
    POST /api/visit | /api/download                زيادة العدّاد
    POST /api/contact  {name,email,body}           حفظ رسالة
    GET  /api/messages                             الرسائل المستلمة
"""
import json, os, sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
DB   = os.path.join(HERE, "portfolio.db")
PORT = 8000


def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con


def where(q):
    """يبني شرط SQL من الفلاتر — بمعاملات مربوطة، لا دمج نصوص."""
    cond, args = ["revenue > 0", "region <> 'Total'"], []
    for key, col in (("region", "region"), ("category", "category"), ("color", "color")):
        v = (q.get(key) or [""])[0].strip()
        if v:
            cond.append(f"{col} = ?")
            args.append(v)
    year = (q.get("year") or [""])[0].strip()
    if year:
        cond.append("order_date LIKE ?")
        args.append(f"%{year}%")
    return " AND ".join(cond), args


def bump(con, name):
    con.execute("INSERT INTO counters(name,value) VALUES(?,1) "
                "ON CONFLICT(name) DO UPDATE SET value = value + 1", (name,))
    con.commit()
    return con.execute("SELECT value FROM counters WHERE name=?", (name,)).fetchone()[0]


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    # ── أدوات ────────────────────────────────────────────────────────
    def send_json(self, payload, code=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def body_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except ValueError:
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # ── GET ──────────────────────────────────────────────────────────
    def do_GET(self):
        u = urlparse(self.path)
        if not u.path.startswith("/api/"):
            return super().do_GET()

        q = parse_qs(u.query)
        cond, args = where(q)
        con = db()
        try:
            if u.path == "/api/summary":
                r = con.execute(f"""SELECT ROUND(SUM(revenue),2) revenue, SUM(quantity) units,
                                           COUNT(*) orders, ROUND(AVG(revenue),2) avg_order,
                                           ROUND(MAX(revenue),2) max_order
                                    FROM sales WHERE {cond}""", args).fetchone()
                return self.send_json(dict(r))

            group = {"/api/by-category": "category", "/api/by-region": "region",
                     "/api/top-models": "color"}.get(u.path)
            if group:
                rows = con.execute(f"""SELECT {group} AS label, ROUND(SUM(revenue),2) revenue,
                                              SUM(quantity) units
                                       FROM sales WHERE {cond} AND {group} <> ''
                                       GROUP BY {group} ORDER BY revenue DESC LIMIT 12""", args).fetchall()
                total = sum(r["revenue"] for r in rows) or 1
                return self.send_json([{**dict(r), "share": round(r["revenue"] / total * 100, 1)}
                                       for r in rows])

            if u.path == "/api/by-year":
                rows = con.execute(f"""SELECT substr(order_date,1,4) AS label,
                                              ROUND(SUM(revenue),2) revenue
                                       FROM sales WHERE {cond}
                                       GROUP BY label ORDER BY label""", args).fetchall()
                return self.send_json([dict(r) for r in rows])

            if u.path == "/api/daily":
                r = con.execute("SELECT * FROM daily ORDER BY day DESC LIMIT 1").fetchone()
                return self.send_json(dict(r) if r else {})

            if u.path == "/api/stats":
                rows = con.execute("SELECT name, value FROM counters").fetchall()
                return self.send_json({r["name"]: r["value"] for r in rows})

            if u.path == "/api/messages":
                rows = con.execute("SELECT * FROM messages ORDER BY id DESC LIMIT 50").fetchall()
                return self.send_json([dict(r) for r in rows])

            return self.send_json({"error": "unknown endpoint"}, 404)
        finally:
            con.close()

    # ── POST ─────────────────────────────────────────────────────────
    def do_POST(self):
        u = urlparse(self.path)
        con = db()
        try:
            if u.path in ("/api/visit", "/api/download"):
                name = "visits" if u.path.endswith("visit") else "cv_downloads"
                return self.send_json({name: bump(con, name)})

            if u.path == "/api/contact":
                d = self.body_json()
                name, email, body = (str(d.get(k, "")).strip()[:400] for k in ("name", "email", "body"))
                if not (name and email and body):
                    return self.send_json({"error": "name, email and body are required"}, 400)
                con.execute("INSERT INTO messages(name,email,body,created_at) VALUES(?,?,?,datetime('now'))",
                            (name, email, body))
                con.commit()
                return self.send_json({"ok": True})

            return self.send_json({"error": "unknown endpoint"}, 404)
        finally:
            con.close()

    def end_headers(self):
        # لا تخزين أثناء التطوير: كل تحديث يظهر فورًا
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *a):
        pass          # سجل صامت


if __name__ == "__main__":
    if not os.path.exists(DB):
        raise SystemExit("run  python backend/etl.py  first")
    print(f"site + api : http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
