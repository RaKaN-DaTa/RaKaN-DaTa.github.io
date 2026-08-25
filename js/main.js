/* ═══════════════════════════════════════════════════════════════════════
   MAIN.JS — the site's "brain" / عقل الموقع
   -------------------------------------------------------------------------
   This file has NO text in it. All the words (Arabic/English) live inside
   index.html on each element as data-en="..." and data-ar="...". This file
   only READS those and decides what to show, when, and how it animates.
   هذا الملف ما فيه ولا كلمة نص. كل الكلام (عربي/إنجليزي) موجود جوه index.html
   على كل عنصر بصفة data-en و data-ar. هذا الملف بس "يقرأ" الكلام هذا
   ويقرر يطلع الإنجليزي ولا العربي، ومتى، وبأي حركة.
   ═══════════════════════════════════════════════════════════════════════ */

/* Remember the user's last choice (language + theme) even after closing the tab.
   يتذكر آخر اختيار للزائر (اللغة والثيم) حتى لو سكّر المتصفح ورجع تاني. */
let lang  = localStorage.getItem('rk-lang')  || 'en';
let theme = localStorage.getItem('rk-theme') || 'dark';

/* ═══════════════ JOB DURATION — auto-updates itself / مدة الوظيفة ═══════════════
   Instead of typing "11 months" by hand (which goes stale next month), this
   calculates the real duration from a start date every time the page loads.
   بدل ما نكتب "11 شهر" يدويًا (ويصير غلط الشهر الجاي)، هذا الكود يحسب
   المدة الحقيقية من تاريخ البداية كل مرة تفتح الصفحة. */
function monthsSince(y, m){
  const n = new Date();
  return Math.max(0, (n.getFullYear() - y) * 12 + (n.getMonth() - (m - 1)));
}
/* Turns a number of months into an Arabic phrase like "سنة و3 أشهر" */
function durAr(t){
  const y = Math.floor(t / 12), m = t % 12;
  const mo = m === 0 ? '' : m === 1 ? 'شهر' : m === 2 ? 'شهران' : m <= 10 ? m + ' أشهر' : m + ' شهرًا';
  const ye = y === 0 ? '' : y === 1 ? 'سنة' : y === 2 ? 'سنتان' : y + ' سنوات';
  return [ye, mo].filter(Boolean).join(' و') || 'أقل من شهر';
}
/* Same thing but in English, e.g. "1 yr 3 mos" */
function durEn(t){
  const y = Math.floor(t / 12), m = t % 12;
  return [y ? y + ' yr' + (y > 1 ? 's' : '') : '', m ? m + ' mo' + (m > 1 ? 's' : '') : '']
         .filter(Boolean).join(' ') || '<1 mo';
}

/* ═══════════════ LANGUAGE + THEME SWITCH — تبديل اللغة والثيم ═══════════════ */

/* This runs every time the page loads AND every time you click the language
   button. It goes through EVERY element with data-en/data-ar and swaps the
   visible text, flips the page direction (rtl/ltr), and re-plays a subtle
   fade-in animation on every section.
   يشتغل عند فتح الصفحة، وعند كل ضغطة على زر اللغة. يمر على كل عنصر فيه
   data-en/data-ar ويبدّل النص الظاهر، ويقلب اتجاه الصفحة (يمين/يسار)،
   ويعيد تشغيل حركة ظهور خفيفة على كل قسم. */
function applyLang(animate){
  const root = document.documentElement;
  root.lang = lang;
  root.dir  = lang === 'ar' ? 'rtl' : 'ltr';

  /* the actual text swap: every tagged element gets its matching language */
  document.querySelectorAll('[data-en]').forEach(el=>{
    const v = el.dataset[lang];
    if (v !== undefined) el.textContent = v;
  });

  /* special case: the "X months at this job" text — recalculated, not just translated */
  document.querySelectorAll('[data-since]').forEach(el=>{
    const [y, m] = el.dataset.since.split('-').map(Number);
    const t = monthsSince(y, m);
    el.textContent = (lang === 'ar' ? el.dataset.arPrefix + durAr(t) : el.dataset.enPrefix + durEn(t));
  });

  /* update the little "ع / EN" label on the language button itself */
  document.getElementById('langCode').textContent = lang === 'ar' ? 'EN' : 'ع';
  const lb = document.getElementById('langBtn');
  lb.title = lang === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic';
  lb.setAttribute('aria-label', lb.title);

  /* re-trigger the fade-in animation on every section (only when the user
     clicked the button, not on first page load) */
  if (animate){
    requestAnimationFrame(()=>{
      document.querySelectorAll('nav, section, footer').forEach(el=>{
        el.classList.remove('lang-swap'); void el.offsetWidth; el.classList.add('lang-swap');
        setTimeout(()=>el.classList.remove('lang-swap'), 600);
      });
    });
  }

  if (typeof tickClock === 'function') tickClock();   /* clock's date text must follow the language too */
}

/* Same idea but for dark/light mode — just flips one attribute on <html>,
   and the CSS file reacts to it automatically (see styles.css). */
function applyTheme(){
  document.documentElement.dataset.theme = theme;
  const tb = document.getElementById('themeBtn');
  tb.title = theme === 'dark'
    ? (lang === 'ar' ? 'الوضع الداكن' : 'Dark mode')
    : (lang === 'ar' ? 'الوضع الفاتح' : 'Light mode');
  tb.setAttribute('aria-label', tb.title);
  document.getElementById('themeIcon').firstElementChild
    .setAttribute('href', theme === 'dark' ? '#i-moon' : '#i-sun');
}

/* When the language button is clicked: flip the language, save the choice,
   spin the icon, then repaint everything. */
document.getElementById('langBtn').addEventListener('click', e=>{
  lang = lang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('rk-lang', lang);
  const b = e.currentTarget;              /* saved because e.currentTarget becomes null after the click ends */
  b.classList.add('spin');
  setTimeout(()=>b.classList.remove('spin'), 460);
  applyLang(true); applyTheme(); countUp(true);
});
/* Same pattern for the theme (sun/moon) button. */
document.getElementById('themeBtn').addEventListener('click', e=>{
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('rk-theme', theme);
  const b = e.currentTarget;
  b.classList.add('spin');
  setTimeout(()=>b.classList.remove('spin'), 460);
  applyTheme();
});

/* ═══════════════ TOAST + SAFE LINK OPENING — التنبيه وفتح الروابط ═══════════════
   "Toast" = the small floating message that pops up at the bottom of the
   screen (e.g. "Copied: ..."). It shows for ~4 seconds then disappears.
   التوست = الرسالة الصغيرة اللي تطلع تحت الشاشة (مثل "تم النسخ: ...")
   وتختفي لحالها بعد حوالي 4 ثواني. */
const icoCopy = '<svg class="ico" aria-hidden="true"><use href="#i-copy"></use></svg>';
let toastTimer;
function toast(msg, code){
  const box = document.getElementById('toast');
  box.innerHTML = '<div>' + icoCopy + '<span>' + msg + '</span>' +
                  (code ? '<code>' + code + '</code>' : '') + '</div>';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ box.innerHTML = ''; }, 4200);
}
/* Copies text (an email, a link...) to the clipboard, with an old-browser fallback. */
function copy(text){
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(()=>{});
  else { const a = document.createElement('textarea'); a.value = text;
         document.body.appendChild(a); a.select();
         try { document.execCommand('copy'); } catch(_){} a.remove(); }
}
/* Tries to actually open a link in a new tab. If the browser/sandbox blocks
   it (this happens inside preview tools), it copies the link instead and
   tells the user so with a toast — better than a dead button.
   يحاول يفتح الرابط فعليًا بتبويب جديد. لو المتصفح منعه (يصير جوه أدوات
   المعاينة)، ينسخ الرابط بدل كذا ويطلع تنبيه يشرح للزائر — أحسن من زر ميت. */
function go(url){
  let w = null;
  try { w = window.open(url, '_blank', 'noopener'); } catch(_){}
  if (!w){
    copy(url);
    toast(lang === 'ar' ? 'المعاينة تمنع فتح الروابط — نسختُه لك:' : 'The preview blocks links — copied it for you:', url);
  }
}
/* Every button/link in the HTML tagged data-go="..." uses this same logic —
   optionally copying a data-copy value first (e.g. the email address). */
document.querySelectorAll('[data-go]').forEach(el=>{
  el.addEventListener('click', ()=>{
    if (el.dataset.copy){
      copy(el.dataset.copy);
      toast(lang === 'ar' ? 'تم النسخ:' : 'Copied:', el.dataset.copy);
    }
    go(el.dataset.go);
  });
});

/* ═══════════════ IMAGE VIEWER — عارض الصور (السيرة، الشهادات، اللوحة) ═══════════════
   This is the pop-up window that opens when you click the CV, a certificate,
   or the dashboard image. It sizes itself EXACTLY to the image (no wasted
   white space) and lets you zoom in/out and drag around when zoomed.
   هذي النافذة اللي تفتح لما تضغط على السيرة أو شهادة أو صورة اللوحة.
   تضبط حجمها بالضبط على مقاس الصورة (بدون فراغ أبيض زايد)، وتقدر تكبّر
   وتصغّر وتسحب الصورة وأنت مكبّر. */
const viewer = document.getElementById('viewer'),
      panel  = document.getElementById('viewerPanel'),
      stage  = document.getElementById('stage'),
      vimg   = document.getElementById('viewerImg'),
      zlabel = document.getElementById('zoomLabel');
let scale = 1, tx = 0, ty = 0, dragging = false, sx = 0, sy = 0, natW = 0, natH = 0;

/* The whole page is designed at 1180px wide. On a narrower screen (phone),
   this shrinks the ENTIRE page down proportionally — same layout, smaller —
   instead of squishing or cutting things off.
   الصفحة كلها مصممة بعرض 1180 بكسل. على شاشة أضيق (جوال)، هذا يصغّر
   الصفحة كلها بنفس النسبة — نفس التصميم بس أصغر — بدل ما يتقطع أو يتلخبط. */
let PAGE_ZOOM = 1;
const MOBILE_MAX = 900;   /* تحت هذا العرض يشتغل تخطيط الجوال في styles.css */
function fitViewport(){
  const el = document.documentElement;
  el.style.zoom = '';
  const w = el.clientWidth || 1180;

  /* على الجوال لا نصغّر شيئًا: التخطيط نفسه يعيد ترتيب نفسه بأحجام مقروءة.
     التصغير النسبي يبقى فقط للشاشات المتوسطة (تابلت/نافذة مصغّرة) حتى
     يظل تصميم اللابتوب كما هو بالضبط بدل أن ينكسر.
     On phones we don't scale at all - the layout reflows at readable sizes.
     Proportional shrinking stays only for mid-size windows so the laptop
     design is preserved exactly rather than breaking. */
  if (w <= MOBILE_MAX){
    PAGE_ZOOM = 1;
  } else {
    /* التصغير للأجهزة المتوسطة فقط؛ الجوال له تخطيط خاص في CSS
     فلو صغّرناه أيضًا لصار الخط مجهريًا. */
  PAGE_ZOOM = w <= 900 ? 1 : Math.min(1, w / 1180);
    if (PAGE_ZOOM !== 1) el.style.zoom = PAGE_ZOOM;
  }
  fitPanel();
}
/* Calculates the exact pixel size the pop-up window should be, based on the
   real width/height of the image currently open, so it never shows empty
   background around the picture. */
function fitPanel(){
  if (!natW || !natH) return;
  const HEAD = 52, PAD = 68, MINW = 460;
  const maxW = window.innerWidth  / PAGE_ZOOM - PAD;
  const maxH = window.innerHeight / PAGE_ZOOM - PAD - HEAD;
  const k = Math.min(maxW / natW, maxH / natH, 1.6);
  panel.style.width  = Math.max(MINW, Math.round(natW * k)) + 'px';
  panel.style.height = (Math.round(natH * k) + HEAD) + 'px';
}
/* Applies the current zoom level + drag position to the image. */
function applyTransform(){
  vimg.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
  zlabel.textContent = Math.round(scale * 100) + '%';
  stage.classList.toggle('zoomed', scale > 1.01);
}
/* Zooms in/out, keeping whatever point you clicked/scrolled on fixed in place
   (like zooming on Google Maps) instead of always zooming from the center. */
function setScale(next, ox, oy){
  const prev = scale;
  scale = Math.min(6, Math.max(1, next));
  if (scale === 1){ tx = 0; ty = 0; }
  else if (ox !== undefined){
    const r = stage.getBoundingClientRect();
    const cx = ox - r.left - r.width / 2, cy = oy - r.top - r.height / 2;
    const k = scale / prev;
    tx = cx - (cx - tx) * k; ty = cy - (cy - ty) * k;
  }
  applyTransform();
}
const DIM = {};
/* Pre-measures every viewable image's real width/height in the background,
   right when the page loads — so the pop-up opens at the right size on the
   VERY FIRST click, with no flicker/resize.
   يقيس مقاس كل صورة قابلة للعرض بالخلفية وقت ما تفتح الصفحة — عشان
   النافذة تفتح بالمقاس الصح من أول ضغطة، بدون رمشة أو تغيّر حجم. */
[...new Set([...document.querySelectorAll('[data-view]')].map(el=>el.dataset.view))].forEach(src=>{
  const im = new Image();
  im.onload = ()=>{ DIM[src] = [im.naturalWidth, im.naturalHeight]; };
  im.src = src;
});

/* Opens the pop-up: sets the title, the download button's target file,
   shows/hides the "Verify" button (only certificates have one), and sizes
   the window using the pre-measured dimensions from above. */
function openViewer(src, title, download, verify){
  document.getElementById('viewerTitle').textContent = title || '';

  const dl = document.getElementById('viewerDownload');
  dl.href = download || src;
  dl.setAttribute('download', (download || src).split('/').pop());

  const vf = document.getElementById('viewerVerify');
  if (verify){ vf.hidden = false; vf.onclick = ()=>go(verify); } else vf.hidden = true;

  scale = 1; tx = 0; ty = 0;
  const known = DIM[src];
  if (known){ natW = known[0]; natH = known[1]; fitPanel(); }
  else {
    const probe = new Image();
    probe.onload = ()=>{ DIM[src] = [probe.naturalWidth, probe.naturalHeight];
                         natW = probe.naturalWidth; natH = probe.naturalHeight; fitPanel(); };
    probe.src = src;
  }
  vimg.src = src;
  applyTransform();
  viewer.hidden = false;
  void viewer.offsetWidth;
  viewer.classList.add('on');
  document.body.style.overflow = 'hidden';   /* stop the page behind from scrolling while open */
}
function closeViewer(){
  viewer.classList.remove('on');
  setTimeout(()=>{ viewer.hidden = true; vimg.src = ''; }, 300);
  document.body.style.overflow = '';
}

/* Any element in the HTML tagged data-view="path/to/image.jpg" opens the
   viewer with that image when clicked — the CV button, certificate cards,
   the project dashboard shot, etc. */
document.querySelectorAll('[data-view]').forEach(el=>{
  el.addEventListener('click', ()=>{
    openViewer(el.dataset.view,
               lang === 'ar' ? el.dataset.titleAr : el.dataset.titleEn,
               el.dataset.download,
               el.dataset.verify);
  });
});

/* All the ways to close/interact with the viewer: the X button, clicking
   the dark background, the Escape key, +/- keys, mouse wheel to zoom,
   click to zoom in/out, and drag-to-pan when zoomed in. */
document.getElementById('viewerClose').addEventListener('click', closeViewer);
viewer.addEventListener('click', e=>{ if (e.target === viewer) closeViewer(); });
document.addEventListener('keydown', e=>{
  if (viewer.hidden) return;
  if (e.key === 'Escape') closeViewer();
  if (e.key === '+' || e.key === '=') setScale(scale * 1.35);
  if (e.key === '-') setScale(scale / 1.35);
  if (e.key === '0') setScale(1);
});
document.getElementById('zoomIn').addEventListener('click', ()=>setScale(scale * 1.35));
document.getElementById('zoomOut').addEventListener('click', ()=>setScale(scale / 1.35));
document.getElementById('zoomReset').addEventListener('click', ()=>setScale(1));
stage.addEventListener('wheel', e=>{ e.preventDefault();
  setScale(scale * (e.deltaY < 0 ? 1.16 : 1 / 1.16), e.clientX, e.clientY); }, {passive:false});
stage.addEventListener('click', e=>{ if (e.target !== vimg) return;
  setScale(scale > 1.01 ? 1 : 2.2, e.clientX, e.clientY); });
stage.addEventListener('pointerdown', e=>{
  if (scale <= 1.01) return;
  dragging = true; sx = e.clientX - tx; sy = e.clientY - ty;
  stage.classList.add('dragging'); stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e=>{ if (!dragging) return;
  tx = e.clientX - sx; ty = e.clientY - sy; applyTransform(); });
stage.addEventListener('pointerup', e=>{ dragging = false; stage.classList.remove('dragging');
  try { stage.releasePointerCapture(e.pointerId); } catch(_){} });
addEventListener('resize', fitViewport);   /* re-shrink/grow the whole page if the window size changes */

/* ═══════════════ COUNT-UP NUMBERS — أرقام المشروع تعدّ تصاعديًا ═══════════════
   The $81M / 60,919 orders / etc. numbers under the project don't just
   appear — they animate counting up from 0, like a slot machine settling.
   أرقام المشروع ($81M، عدد الطلبات...) ما تطلع فجأة — تعدّ تصاعديًا من
   الصفر لين توصل الرقم الحقيقي، زي عدّاد يلف. */
function fmt(n, prefix, compact){
  if (compact && n >= 1e6) return prefix + (n / 1e6).toFixed(2) + 'M';   /* e.g. $81.02M instead of $81020000 */
  return prefix + Math.round(n).toLocaleString('en-US');                 /* e.g. 60,919 with commas */
}
let countDone = false;
function countUp(force){
  document.querySelectorAll('[data-count]').forEach(el=>{
    const target = +el.dataset.count, prefix = el.dataset.prefix || '', compact = el.dataset.compact === '1';
    if (!countDone && !force){ el.textContent = fmt(0, prefix, compact); return; }   /* stay at 0 until it's time */
    let finished = false;
    const dur = 1500, t0 = performance.now();
    const step = now=>{
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)), prefix, compact);   /* eased, not linear counting */
      if (p < 1) requestAnimationFrame(step); else finished = true;
    };
    requestAnimationFrame(step);
    setTimeout(()=>{ if (!finished) el.textContent = fmt(target, prefix, compact); }, dur + 400);   /* safety net */
  });
}

/* ═══════════════ 3D TILT — إمالة خفيفة للبطاقات ═══════════════
   A subtle "the card leans toward your mouse" effect on cards with the
   class "tilt" (skill cards, certificates, fact boxes...). Purely visual.
   تأثير بسيط: البطاقة تميل شوي ناحية الماوس، على البطاقات اللي عليها
   كلاس "tilt" (بطاقات المهارات، الشهادات...). تأثير بصري بس. */
document.querySelectorAll('.tilt').forEach(card=>{
  card.addEventListener('pointermove', e=>{
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    card.style.transform = 'perspective(700px) rotateX(' + (-py * 4).toFixed(2) +
                           'deg) rotateY(' + (px * 4).toFixed(2) + 'deg) translateY(-2px)';
  });
  card.addEventListener('pointerleave', ()=>{ card.style.transform = ''; });
});

/* ═══════════════ SCROLL EFFECTS — الشريط، القسم النشط، زر الأعلى ═══════════════
   Three things happen while you scroll:
   1) the thin progress bar at the very top fills up
   2) the nav bar gets a background once you've scrolled past the hero
   3) the "back to top" button fades in after scrolling 500px
   ثلاث أشياء تصير وأنت تمرّر بالصفحة:
   ١) الشريط الرفيع بالأعلى يمتلي حسب مكانك بالصفحة
   ٢) شريط التنقّل ياخذ خلفية بعد ما تعدّي قسم الهيرو
   ٣) زر "رجوع للأعلى" يظهر بعد ما تنزل 500 بكسل */
addEventListener('scroll', ()=>{
  const h = document.documentElement;
  const pct = h.scrollTop / (h.scrollHeight - h.clientHeight || 1) * 100;
  document.getElementById('progress').style.width = Math.min(100, Math.max(0, pct)) + '%';
  document.getElementById('nav').classList.toggle('scrolled', h.scrollTop > 20);
  document.getElementById('toTop').classList.toggle('on', h.scrollTop > 500);
}, {passive:true});
document.getElementById('toTop').addEventListener('click', ()=>scrollTo({top:0, behavior:'smooth'}));

/* The glowing spotlight that follows your mouse in the hero section. */
const hero = document.getElementById('top'), spot = document.getElementById('spot');
hero.addEventListener('pointermove', e=>{
  const r = hero.getBoundingClientRect();
  spot.style.left = (e.clientX - r.left) + 'px';
  spot.style.top  = (e.clientY - r.top) + 'px';
  spot.style.opacity = '.55';
});
hero.addEventListener('pointerleave', ()=>{ spot.style.opacity = '0'; });

/* ═══════════════ SCROLL-TRIGGERED REVEAL — ظهور الأقسام عند التمرير ═══════════════
   Sections start invisible (see CSS: .reveal) and fade/slide into view the
   first time they scroll into the browser window. Uses an IntersectionObserver,
   which is the browser's efficient built-in way to detect "is this element
   visible on screen right now?" without checking on every single scroll event.
   الأقسام تبدأ مخفية (شوف CSS: .reveal) وتظهر بحركة أول ما توصلها وأنت
   تمرّر. نستخدم IntersectionObserver، وهو أداة مدمجة بالمتصفح تكتشف
   "هل هذا العنصر ظاهر بالشاشة الحين؟" بكفاءة عالية. */
let ioAlive = false;
const revealIO = new IntersectionObserver(entries=>{
  ioAlive = true;
  entries.forEach(e=>{
    if (e.isIntersecting){
      e.target.classList.add('in');
      e.target.querySelectorAll('.stagger').forEach(s=>s.classList.add('in'));   /* cards inside reveal one-by-one */
      if (e.target.id === 'projects' && !countDone){ countDone = true; countUp(true); }   /* start the count-up here */
      revealIO.unobserve(e.target);   /* only needs to happen once per section */
    }
  });
}, {threshold:.15});
document.querySelectorAll('.reveal').forEach(el=>revealIO.observe(el));

/* Safety net: some embedded preview tools never fire scroll/intersection
   events at all. If that happens, after 2.5s we just force everything
   visible instead of leaving the page looking empty forever.
   شبكة أمان: بعض أدوات المعاينة المدمجة ما تشغّل أحداث التمرير إطلاقًا.
   لو صار كذا، بعد ٢.٥ ثانية نظهر كل شي بالقوة بدل ما تظل الصفحة فاضية. */
setTimeout(()=>{
  if (ioAlive) return;
  const show = el=>{ el.classList.add('in'); el.style.transition = 'none';
                     el.style.opacity = '1'; el.style.transform = 'none'; };
  document.querySelectorAll('.reveal').forEach(el=>{
    show(el);
    el.querySelectorAll('.stagger').forEach(s=>{ s.classList.add('in'); [...s.children].forEach(show); });
  });
  countDone = true;
  document.querySelectorAll('[data-count]').forEach(el=>{
    el.textContent = fmt(+el.dataset.count, el.dataset.prefix || '', el.dataset.compact === '1');
  });
}, 2500);

/* "Scroll-spy": highlights the matching nav link (About/Skills/...) based
   on whichever section is currently in the middle of the screen. */
const spyIO = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if (!e.isIntersecting) return;
    document.querySelectorAll('.nav-links a').forEach(a=>
      a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  });
}, {rootMargin:'-45% 0px -50% 0px'});
['about','skills','experience','certs','projects','contact']
  .forEach(id=>{ const el = document.getElementById(id); if (el) spyIO.observe(el); });

/* Generates the CSS that makes staggered cards (facts, pillars, skills...)
   appear one slightly after another instead of all at once. */
const styleTag = document.createElement('style');
styleTag.textContent = [1,2,3,4,5,6].map(i=>
  '.stagger>*:nth-child(' + i + '){transition-delay:' + (i * 90) + 'ms;}').join('');
document.head.appendChild(styleTag);

/* ═══════════════ LIVE CLOCK — الساعة الحيّة (توقيت الرياض) ═══════════════
   The clock bar at the very top of the page. Always shows Riyadh time
   (Asia/Riyadh timezone) no matter where the visitor is in the world, plus
   today's Gregorian AND Hijri date, and a little ring that fills up as the
   seconds tick by.
   شريط الساعة أعلى الصفحة. دايمًا يعرض توقيت الرياض بغض النظر عن مكان
   الزائر، مع التاريخ الميلادي والهجري، وحلقة صغيرة تمتلي مع الثواني. */
const TZ = 'Asia/Riyadh', RING = 119.38;   /* RING = the circle's circumference in pixels, for the fill animation */
const timeEl  = document.getElementById('clockTime'),
      dayEl   = document.getElementById('clockDay'),
      dateEl  = document.getElementById('clockDate'),
      hijriEl = document.getElementById('clockHijri'),
      ringEl  = document.getElementById('secRing');

/* Build the HH:MM:SS digit "slots" once. Each digit lives in its own <span>
   so we can animate JUST the digit that changed, not the whole clock. */
timeEl.innerHTML =
  '<span class="d"></span><span class="d"></span>' +
  '<span class="s beat">:</span>' +
  '<span class="d"></span><span class="d"></span>' +
  '<span class="s beat">:</span>' +
  '<span class="d sec"></span><span class="d sec"></span>';
const cells = timeEl.querySelectorAll('.d');

/* Gets the current HH/MM/SS for Riyadh specifically, as a 6-character string
   like "192345", regardless of what timezone the visitor's computer is in. */
function parts(date){
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date);
  const g = t => (f.find(x => x.type === t) || {}).value || '00';
  return g('hour') + g('minute') + g('second');
}

let lastDigits = '', lastDayKey = '';
/* Runs once every second. */
function tickClock(){
  const now = new Date();
  const digits = parts(now);

  /* Only animate the digits that actually changed (e.g. seconds every
     second, but hours only once an hour) — cheaper and looks cleaner. */
  for (let i = 0; i < 6; i++){
    if (digits[i] !== lastDigits[i]){
      const c = cells[i];
      c.textContent = digits[i];
      c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick');
    }
  }
  lastDigits = digits;

  /* The little ring around the clock fills up over 60 seconds and resets. */
  const sec = +digits.slice(4);
  if (sec === 0){ ringEl.classList.add('jump'); ringEl.style.strokeDashoffset = RING;
                  void ringEl.offsetWidth; ringEl.classList.remove('jump'); }
  else ringEl.style.strokeDashoffset = RING * (1 - sec / 60);

  /* The day-name/date/Hijri-date text only needs recalculating once a day
     (or right when the language changes) — not every second. */
  const key = new Intl.DateTimeFormat('en-GB', {timeZone: TZ, dateStyle: 'short'}).format(now) + lang;
  if (key !== lastDayKey){
    lastDayKey = key;
    const loc = lang === 'ar' ? 'ar' : 'en-GB';
    dayEl.textContent  = new Intl.DateTimeFormat(loc, {timeZone: TZ, weekday: 'long', calendar: 'gregory'}).format(now);
    dateEl.textContent = new Intl.DateTimeFormat(loc, {timeZone: TZ, day: 'numeric', month: 'long',
                                                       year: 'numeric', calendar: 'gregory'}).format(now);
    try {
      /* Hijri date via the Umm al-Qura calendar (the official Saudi calendar) */
      hijriEl.textContent = new Intl.DateTimeFormat(
        lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-GB-u-ca-islamic-umalqura',
        {timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric'}).format(now);
    } catch(_){ hijriEl.textContent = ''; }
  }
}
tickClock();
setInterval(tickClock, 1000);   /* keep calling it every second, forever */

/* ═══════════════ STARTUP — تشغيل الصفحة أول ما تفتح ═══════════════
   The four lines that actually kick everything off when the page loads. */
applyLang(false);
applyTheme();
countUp();
fitViewport();


/* ═══════════════ VISION 2030 SECTION ORDER — ترتيب قسم الرؤية ═══════════════
   Moves the "Vision 2030" section to appear right before Contact (near the
   bottom) instead of near the top — the portfolio evidence (skills, work,
   certificates) should come first, the ambition/mission statement after.
   ينقل قسم "رؤية 2030" ليطلع قبل قسم التواصل مباشرة (قريب من الآخر)
   بدل ما يكون بالأول — دليل قدراتك (المهارات، الأعمال، الشهادات) لازم
   يجي أول، والطموح/الرسالة تجي بعده. */
(function(){
  const vision  = document.getElementById('vision');
  const contact = document.getElementById('contact');
  if (vision && contact) contact.before(vision);
})();

/* Contact-form input placeholders (the greyed-out hint text) also need to
   follow the language, since they're not regular data-en/data-ar elements. */
function applyPlaceholders(){
  document.querySelectorAll('[data-ph-en]').forEach(el=>{
    el.placeholder = lang === 'ar' ? el.dataset.phAr : el.dataset.phEn;
    /* قارئ الشاشة يقرأ aria-label، فنبدّله مع اللغة أيضًا */
    el.setAttribute('aria-label', el.placeholder);
  });
}
applyPlaceholders();
document.getElementById('langBtn').addEventListener('click', applyPlaceholders);

/* ═══════════════ CONTACT FORM — نموذج التواصل ═══════════════
   When submitted, this sends the message to Formspree (a free service that
   forwards form submissions to Rakan's email — no backend server needed).
   If that fails (offline, service down...), it falls back to opening the
   visitor's own email app with the message pre-filled.
   لما يُرسل النموذج، يبعث الرسالة لخدمة Formspree (خدمة مجانية توصّل
   رسائل النماذج للإيميل — بدون احتياج خادم). لو فشلت (بدون إنترنت،
   الخدمة متوقفة...)، يفتح بريد الزائر نفسه بالرسالة جاهزة كبديل. */
const FORMSPREE = 'https://formspree.io/f/xwleabgr';
const mailForm = document.getElementById('mailForm');
if (mailForm) mailForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const name = document.getElementById('mfName').value.trim();
  const from = document.getElementById('mfFrom').value.trim();
  const msg  = document.getElementById('mfMsg').value.trim();
  const btn  = mailForm.querySelector('button[type=submit]');
  const label = btn.querySelector('span');
  const original = label.textContent;

  label.textContent = lang === 'ar' ? 'جارٍ الإرسال…' : 'Sending…';
  btn.disabled = true;
  try {
    const r = await fetch(FORMSPREE, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      body: JSON.stringify({name: name, email: from, message: msg})
    });
    if (!r.ok) throw new Error(r.status);
    mailForm.reset();
    toast(lang === 'ar' ? 'وصلتني رسالتك — شكرًا لك' : 'Message sent — thank you');
  } catch(_) {
    /* fallback: open the visitor's email app with everything pre-filled */
    const subject = (lang === 'ar' ? 'رسالة من الموقع — ' : 'Message from your site — ') + name;
    const body = msg + String.fromCharCode(10, 10) + '— ' + name + ' <' + from + '>';
    go('mailto:Rakan.HR7@outlook.com?subject=' + encodeURIComponent(subject) +
       '&body=' + encodeURIComponent(body));
  } finally {
    label.textContent = original;
    btn.disabled = false;
  }
});

/* "Print this page" button — briefly cancels the mobile auto-shrink zoom
   (see fitViewport above) so the printed page comes out full-size, then
   restores it right after the print dialog opens. */
const printBtn = document.getElementById('printBtn');
if (printBtn) printBtn.addEventListener('click', ()=>{
  const z = document.documentElement.style.zoom;
  document.documentElement.style.zoom = '';
  window.print();
  document.documentElement.style.zoom = z;
});


/* ═══════════════ HOVER PREVIEW POSITIONING — موضع المعاينة عند التمرير ═══════════════
   The small image preview that pops up when you hover the CV button or a
   certificate card. This calculates WHERE it should appear (left/right of
   the button, or flipped if there's no room) so it never gets cut off by
   the edge of the screen, no matter where the button is on the page.
   المعاينة الصغيرة اللي تطلع لما تمرّر الماوس على زر السيرة أو شهادة.
   هذا يحسب وينها تطلع بالضبط (يمين/يسار الزر، أو ينقلبها لو ما فيه
   مساحة) عشان ما تنقص من حافة الشاشة، بغض النظر عن مكان الزر بالصفحة. */
document.querySelectorAll('.peek-host').forEach(host=>{
  const peek = host.querySelector('.peek');
  if (!peek) return;

  const place = ()=>{
    const z = PAGE_ZOOM || 1;
    const h = host.getBoundingClientRect();
    peek.classList.add('on');                     /* must be visible first to measure its size */
    const w = peek.offsetWidth, ph = peek.offsetHeight;
    const vw = window.innerWidth / z, vh = window.innerHeight / z;
    const hx = h.left / z, hy = h.top / z, hw = h.width / z, hh = h.height / z;
    const M = 14;   /* minimum margin from the screen edge */

    /* preferred spot: just outside the button; flip to the other side if
       it wouldn't fit; if NEITHER side fits, just clamp it on-screen */
    let x = hx + hw + M;
    if (x + w > vw - M) x = hx - w - M;
    if (x < M) x = Math.min(Math.max(M, hx), vw - w - M);

    let y = hy + hh / 2 - ph / 2;
    y = Math.min(Math.max(M, y), vh - ph - M);

    peek.style.left = Math.round(x) + 'px';
    peek.style.top  = Math.round(y) + 'px';
  };

  host.addEventListener('pointerenter', place);
  host.addEventListener('pointerleave', ()=>peek.classList.remove('on'));
});


/* ═══════════════ VISION 2030 TIMELINE — خط زمن رؤية 2030 ═══════════════
   Draws the little progress bar showing "how far along" Saudi Vision 2030
   is — from its launch date to the 2030 target — and where TODAY sits on
   that line. Recalculates live, so it's always accurate, not a hardcoded
   number that goes stale.
   يرسم شريط التقدّم اللي يوضح "كم مضى" من رؤية السعودية 2030 — من تاريخ
   انطلاقها لهدف 2030 — ووين يقع اليوم عليه. يُحسب بشكل حي، فهو دايمًا
   دقيق، مو رقم ثابت يصير غلط مع مرور الوقت. */
(function(){
  const box = document.getElementById('v2030');
  if (!box) return;
  const START = new Date('2016-04-25T00:00:00+03:00');   /* official Vision 2030 launch date */
  const END   = new Date('2030-01-01T00:00:00+03:00');
  const fill = document.getElementById('v2030Fill'),
        dot  = document.getElementById('v2030Dot'),
        pct  = document.getElementById('v2030Pct'),
        days = document.getElementById('v2030Days');

  function paint(){
    const now = new Date();
    const p = Math.min(100, Math.max(0, (now - START) / (END - START) * 100));   /* % of the way there */
    const left = Math.max(0, Math.ceil((END - now) / 86400000));                 /* days remaining */
    const loc = 'en-US';        /* Latin digits in both languages — matches the rest of the site's numbers */
    fill.style.width = p.toFixed(1) + '%';
    dot.style.left = p.toFixed(1) + '%';
    pct.textContent = Math.round(p).toLocaleString(loc) + '%';
    days.textContent = left.toLocaleString(loc);
  }

  /* the bar starts empty and animates to the real position once it scrolls
     into view (feels more alive than just appearing already-filled) */
  const start = ()=>{ box.classList.add('on'); paint(); };
  const io = new IntersectionObserver(es=>es.forEach(e=>{
    if (e.isIntersecting){ start(); io.disconnect(); }
  }), {threshold:.4});
  io.observe(box);
  setTimeout(start, 2600);                       /* safety net, same idea as the reveal-on-scroll one above */
  setInterval(paint, 3600000);                   /* refresh the numbers once an hour (days left ticks down) */
  document.getElementById('langBtn').addEventListener('click', ()=>setTimeout(paint, 20));
})();

/* ═══════════════ CHART BAR GROWTH — نمو أشرطة الرسم عند الظهور ═══════════════
   The "revenue by region" bars in the project section grow from 0% to their
   real percentage once they scroll into view, instead of just appearing
   already full.
   أشرطة "الإيراد بحسب المنطقة" بقسم المشروع تكبر من الصفر للنسبة
   الحقيقية أول ما توصلها بالتمرير، بدل ما تطلع ممتلئة من البداية. */
(function(){
  const bars = document.querySelectorAll('.cbar');
  if (!bars.length) return;
  bars.forEach(b=>{
    b.style.setProperty('--w', b.dataset.share + '%');
    b.querySelector('b').setAttribute('data-v', b.dataset.value);
  });
  const grow = ()=>bars.forEach(b=>b.classList.add('grow'));
  const chart = document.querySelector('[data-chart]');
  const io = new IntersectionObserver(es=>es.forEach(e=>{ if (e.isIntersecting){ grow(); io.disconnect(); } }),
                                      {threshold:.3});
  io.observe(chart);
  setTimeout(grow, 2600);          /* safety net if the observer never fires */
})();

/* Prevents clicking "Verify" inside a certificate card from ALSO opening
   the image viewer underneath it (the click would otherwise "leak through"
   to the card behind the button).
   يمنع ضغطة زر "تحقّق" جوه بطاقة الشهادة من فتح عارض الصورة اللي وراها
   بنفس الوقت (بدون هذا السطر، الضغطة "تسرّب" للبطاقة اللي تحت الزر). */
document.querySelectorAll('.cred [data-go]').forEach(b=>
  b.addEventListener('click', e=>e.stopPropagation()));
