/* ═══ الربط بالـ API — يعمل فقط إذا كان الخادم شغّالًا، وإلا الصفحة كما هي ═══ */
const API = location.origin + '/api';
const money = n => '$' + Math.round(n).toLocaleString('en-US');

async function ask(path, opts){
  const r = await fetch(API + path, Object.assign({cache:'no-store'}, opts));
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

/* عدّاد الزيارات */
ask('/visit', {method:'POST'}).catch(()=>{});

/* لوحة حيّة من قاعدة البيانات تحت صورة المشروع */
(async ()=>{
  let sum, regions;
  try { [sum, regions] = await Promise.all([ask('/summary'), ask('/by-region')]); }
  catch(_) { return; }                       /* لا خادم؟ لا شيء يتغيّر */

  const host = document.querySelector('.proj-body');
  if (!host) return;

  const box = document.createElement('div');
  box.className = 'live';
  box.innerHTML =
    '<div class="live-head"><span class="live-dot"></span>' +
    '<b data-en="Live from the database" data-ar="مباشر من قاعدة البيانات">Live from the database</b>' +
    '<span class="live-meta">' + sum.orders.toLocaleString('en-US') + ' rows · ' + money(sum.revenue) + '</span></div>' +
    '<div class="bars">' + regions.map(r =>
      '<div class="bar-row"><span class="bar-label">' + r.label + '</span>' +
      '<span class="bar-track"><i style="width:' + r.share + '%"></i></span>' +
      '<span class="bar-val">' + r.share + '%</span></div>').join('') + '</div>' +
    '<div class="live-filters">' +
      ['', 'Europe', 'North America', 'Pacific'].map(r =>
        '<button class="btn btn-secondary mini" data-region="' + r + '">' +
        (r || (document.documentElement.lang === 'ar' ? 'الكل' : 'All')) + '</button>').join('') +
    '</div>';
  host.appendChild(box);

  box.querySelectorAll('[data-region]').forEach(b => b.addEventListener('click', async ()=>{
    const s = await ask('/summary?region=' + encodeURIComponent(b.dataset.region));
    box.querySelector('.live-meta').textContent =
      s.orders.toLocaleString('en-US') + ' rows · ' + money(s.revenue || 0);
    box.querySelectorAll('[data-region]').forEach(x => x.classList.toggle('on', x === b));
  }));
})();
