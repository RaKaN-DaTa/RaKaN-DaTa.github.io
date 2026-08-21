/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD.JS — draws the live sales dashboard inside the project section
   يرسم لوحة المبيعات الحيّة جوه قسم "أعمالي"
   -------------------------------------------------------------------------
   This file does NOT contain the actual sales numbers — those live in
   dash-data.js (a separate file, auto-generated from the real Excel file
   by backend/etl.py). This file only knows HOW to draw whatever numbers
   it's given: the 4 KPI boxes, the category bars, the region donut chart,
   and the colour bars — plus the year filter buttons above them all.
   هذا الملف ما فيه أرقام المبيعات نفسها — هي موجودة بملف dash-data.js
   (ملف منفصل، يتولّد تلقائيًا من ملف Excel الحقيقي عبر backend/etl.py).
   هذا الملف بس "يعرف يرسم" أي أرقام تجيه: صناديق المؤشرات الأربعة،
   أشرطة الفئات، حلقة المناطق، وأعمدة الألوان — بالإضافة لأزرار فلترة
   السنة فوقهم كلهم. */
(function(){
  if (typeof DASH === 'undefined') return;   /* dash-data.js didn't load — bail out quietly instead of erroring */
  const $ = id => document.getElementById(id);
  const yearsBox = $('dashYears'), kpisBox = $('dashKpis'), catBox = $('dashCat'),
        donut = $('dashDonut'), legend = $('dashLegend'), colsBox = $('dashCols'), scope = $('dashScope');
  if (!yearsBox) return;   /* this page has no dashboard section — nothing to do */

  const AR = () => document.documentElement.lang === 'ar';
  const PALETTE = ['#9184d9', '#6f63b8', '#c9c2f4', '#54c37e', '#e0a458'];   /* chart colours, in order of use */
  let current = 'all';   /* which year is currently selected — 'all' or e.g. '2003' */

  /* Turns a raw number into a money string like "$81.02M" / "$430K" / "$1,330" */
  const money = n =>
    n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' :
    n >= 1e5 ? '$' + Math.round(n / 1e3) + 'K' :
               '$' + Math.round(n).toLocaleString('en-US');
  /* Turns a raw number into a plain count like "60,919" */
  const num = n => Math.round(n).toLocaleString('en-US');

  /* Animates one number counting up from 0 to its real value (used for the
     4 KPI boxes at the top). "fmt" is either money() or num() from above.
     يحرّك رقم واحد يعدّ من الصفر للرقم الحقيقي (يُستخدم لصناديق المؤشرات
     الأربعة بالأعلى). */
  function animate(el, to, fmt){
    const from = 0, dur = 900, t0 = performance.now();
    let done = false;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step); else done = true;
    };
    requestAnimationFrame(step);
    setTimeout(() => { if (!done) el.textContent = fmt(to); }, dur + 300);   /* safety net, same idea as main.js */
  }

  /* All the little labels used around the dashboard, in both languages. */
  function labels(){
    return AR()
      ? {rev:'إجمالي الإيراد', ord:'عدد الطلبات', unit:'الوحدات المُباعة', avg:'متوسط الطلب',
         all:'كل السنوات', scopeAll:'2002 – 2004 · كل البيانات', scopeYear:y => 'سنة ' + y}
      : {rev:'Total revenue', ord:'Orders', unit:'Units sold', avg:'Average order',
         all:'All years', scopeAll:'2002 – 2004 · full dataset', scopeYear:y => 'Year ' + y};
  }

  /* Rebuilds the row of year-filter buttons (All / 2002 / 2003 / 2004),
     marking whichever one is currently selected with the "on" style. */
  function drawYears(){
    const L = labels();
    yearsBox.innerHTML = '';
    [['all', L.all]].concat(DASH.years.map(y => [String(y), String(y)])).forEach(([key, text]) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.className = key === current ? 'on' : '';
      b.addEventListener('click', () => { current = key; render(); });   /* clicking a year re-draws everything */
      yearsBox.appendChild(b);
    });
  }

  /* THE MAIN FUNCTION — redraws the entire dashboard for whichever year is
     selected. Called on page load, on language switch, and every time a
     year button is clicked.
     الدالة الرئيسية — تعيد رسم اللوحة كاملة حسب السنة المختارة. تُستدعى
     عند فتح الصفحة، عند تبديل اللغة، وعند كل ضغطة على زر سنة. */
  function render(){
    const L = labels(), d = DASH.sets[current];   /* d = this year's slice of the pre-computed data */
    if (!d) return;

    drawYears();
    scope.textContent = current === 'all' ? L.scopeAll : L.scopeYear(current);

    /* --- the 4 top KPI boxes (revenue / orders / units / average) --- */
    kpisBox.innerHTML =
      [[d.revenue, money, L.rev], [d.orders, num, L.ord],
       [d.units, num, L.unit], [d.avg, money, L.avg]]
      .map(() => '<div class="dash-kpi"><b>0</b><span></span></div>').join('');
    [...kpisBox.children].forEach((cell, i) => {
      const set = [[d.revenue, money, L.rev], [d.orders, num, L.ord],
                   [d.units, num, L.unit], [d.avg, money, L.avg]][i];
      cell.querySelector('span').textContent = set[2];
      animate(cell.querySelector('b'), set[0], set[1]);
    });

    /* --- "Revenue by category" horizontal bars --- */
    catBox.innerHTML = d.cat.map(c =>
      '<div class="hbar"><span title="' + c.label + '">' + c.label + '</span>' +
      '<i></i><b>' + money(c.value) + '</b></div>').join('');
    requestAnimationFrame(() => {
      /* bar widths are set a frame later so the CSS transition actually plays */
      [...catBox.querySelectorAll('.hbar')].forEach((row, i) => {
        const top = d.cat[0].value || 1;   /* biggest category = 100% width, others scaled against it */
        row.querySelector('i').style.setProperty('--w', (d.cat[i].value / top * 100).toFixed(1) + '%');
      });
    });

    /* --- "Share by region" donut chart, drawn as SVG circle segments --- */
    const total = d.reg.reduce((s, r) => s + r.value, 0) || 1;
    const C = 2 * Math.PI * 44;   /* circumference of the circle (radius 44) — the math for turning a % into an arc */
    let offset = 0;
    donut.innerHTML = '<circle cx="60" cy="60" r="44" stroke="var(--color-bg)"></circle>' +   /* the grey base ring */
      d.reg.map((r, i) => {
        const len = r.value / total * C;   /* this region's slice of the ring, in pixels of arc length */
        const seg = '<circle cx="60" cy="60" r="44" stroke="' + PALETTE[i % PALETTE.length] +
                    '" stroke-dasharray="0 ' + C.toFixed(1) + '" stroke-dashoffset="' + (-offset).toFixed(1) +
                    '" data-len="' + len.toFixed(1) + '"></circle>';
        offset += len;   /* next region's slice starts where this one ends */
        return seg;
      }).join('');
    requestAnimationFrame(() => {
      /* starts every slice at 0-length then grows it — that's the "draw-in" animation */
      donut.querySelectorAll('circle[data-len]').forEach(c =>
        c.setAttribute('stroke-dasharray', c.dataset.len + ' ' + C.toFixed(1)));
    });

    /* the colour key list under/beside the donut (region name + % + swatch) */
    legend.innerHTML = d.reg.map((r, i) =>
      '<div><i style="background:' + PALETTE[i % PALETTE.length] + '"></i>' +
      '<span>' + r.label + '</span><b>' + r.share + '%</b></div>').join('');

    /* --- "Revenue by colour" vertical bars --- */
    const topCol = d.col[0] ? d.col[0].value : 1;
    colsBox.innerHTML = d.col.map(c =>
      '<div class="col"><b>' + money(c.value) + '</b><i></i><span>' + c.label + '</span></div>').join('');
    requestAnimationFrame(() => {
      [...colsBox.querySelectorAll('.col')].forEach((el, i) =>
        el.querySelector('i').style.setProperty('--h', (d.col[i].value / topCol * 100).toFixed(1) + '%'));
    });
  }

  render();   /* draw it once immediately when the page loads */
  document.getElementById('langBtn').addEventListener('click', () => setTimeout(render, 20));   /* redraw on language switch */
})();
