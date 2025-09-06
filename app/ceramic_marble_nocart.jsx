
import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Ceramic & Marble — Cart‑Free Gallery (Arabic RTL)
 * - Loads media from /media_manifest.json (generated from your cilin.zip)
 * - No cart, no prices, no payment
 * - Search + Filters (by folder/tags) + Quick View
 * - WhatsApp + Phone CTAs
 * - TailwindCSS + Framer Motion
 *
 * How to use:
 * 1) Put media files under /public/media/... (same structure as in media_manifest.json: src).
 * 2) Place media_manifest.json in /public so it's served at /media_manifest.json.
 * 3) Set WHATSAPP_PHONE and PHONE_HREF below.
 * 4) Use this component in your Next.js/CRA page.
 */

const MANIFEST_URL = "/media_manifest.json"; // ensure this is available in /public
const WHATSAPP_PHONE = "9665XXXXXXX";       // e.g., 9665XXXXXXXX (no +)
const PHONE_HREF = "tel:+9665XXXXXXX";

const IconSearch = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const IconX = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const IconPhone = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" className={props.className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.31 1.78.58 2.63a2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.27 1.73.46 2.63.58A2 2 0 0 1 22 16.92z"/></svg>
);

export default function CeramicMarble_NoCart(){
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [activeFolders, setActiveFolders] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [quick, setQuick] = useState(null);

  useEffect(() => {
    fetch(MANIFEST_URL, { cache: "no-store" })
      .then(r => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);

  // Build unique filters (folders + tags) from manifest
  const unique = useMemo(() => {
    const folders = new Set();
    const tags = new Set();
    items.forEach(it => {
      if (it.folder) folders.add(it.folder);
      if (it.tags) it.tags.split(",").map(t => t.trim()).filter(Boolean).forEach(t => tags.add(t));
    });
    return {
      folders: Array.from(folders).sort(),
      tags: Array.from(tags).sort(),
      countsByFolder: Object.fromEntries(Array.from(folders).map(f => [f, items.filter(it => it.folder === f).length])),
    };
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim();
    return items.filter(it => {
      const nameHit = !qq || (it.name || "").includes(qq) || (it.folder || "").includes(qq) || (it.tags || "").includes(qq);
      const folderHit = activeFolders.length ? activeFolders.includes(it.folder) : true;
      const tagsArr = (it.tags || "").split(",").map(t => t.trim()).filter(Boolean);
      const tagHit = activeTags.length ? activeTags.some(t => tagsArr.includes(t)) : true;
      return nameHit && folderHit && tagHit;
    });
  }, [items, q, activeFolders, activeTags]);

  const toggle = (arr, set, value) => {
    const s = new Set(arr);
    s.has(value) ? s.delete(value) : s.add(value);
    set(Array.from(s));
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header (cart removed) */}
      <header className="sticky top-0 z-40 backdrop-blur bg-white/70 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500"/>
            <div>
              <p className="text-sm text-gray-500">معرض</p>
              <h1 className="text-lg font-extrabold tracking-tight">سيراميك & رخام</h1>
            </div>
          </div>

          <div className="flex-1 max-w-2xl mx-auto relative">
            <IconSearch className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              aria-label="بحث"
              className="w-full border border-gray-200 rounded-xl pl-3 pr-10 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="ابحث بالاسم أو الكلمات المفتاحية…"
              value={q}
              onChange={(e)=> setQ(e.target.value)}
            />
          </div>

          <a href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent("مرحباً، أريد استفساراً عاماً عن المنتجات")}`}
             target="_blank" rel="noreferrer"
             className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700">
            واتساب
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-50 via-white to-rose-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-amber-600">تشكيلة واسعة</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight">صور وفيديوهات لأعمالنا ومنتجاتنا</h2>
            <p className="mt-3 text-gray-600">لا توجد سلة أو دفع هنا — تواصل معنا مباشرةً عبر واتساب أو اتصال للحصول على تسعيرة وخيارات التوريد والتركيب.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#gallery" className="px-5 py-2.5 rounded-xl font-semibold bg-amber-600 text-white hover:bg-amber-700 transition">تصفّح المعرض</a>
              <a href="#contact" className="px-5 py-2.5 rounded-xl font-semibold border border-gray-300 hover:bg-gray-100">اطلب تسعيرة</a>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-700">
              <li className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"/> ضمان جودة الخامة</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"/> قياسات وتقطيع حسب الطلب</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"/> توريد سريع داخل السعودية</li>
              <li className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"/> استشارات تصميم مجانية</li>
            </ul>
          </div>
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.6}} className="relative">
            <div className="rounded-2xl shadow-xl bg-white h-80 grid place-items-center border border-gray-200">
              <p className="text-gray-500">ضع صورة غلاف مناسبة هنا</p>
            </div>
            <div className="absolute -bottom-6 left-6 bg-white shadow/50 shadow-lg rounded-2xl p-4 border border-gray-200">
              <p className="font-bold">بدون سلة</p>
              <p className="text-sm text-gray-600">التواصل المباشر فقط</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 py-8" id="gallery">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-extrabold">المعرض</h3>
          <button onClick={()=> { setQ(""); setActiveFolders([]); setActiveTags([]); }} className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-100">إعادة ضبط</button>
        </div>

        <details className="mb-5 group border border-gray-200 rounded-2xl overflow-hidden">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none bg-white">
            <span className="font-semibold">أدوات الفلترة</span>
            <span className="ml-auto text-xs text-gray-500 group-open:hidden">(انقر للفتح)</span>
            <span className="ml-auto text-xs text-gray-500 hidden group-open:inline">(انقر للإغلاق)</span>
          </summary>
          <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 border-t border-gray-200">
            <FilterGroup title="المجلد" options={unique.folders} selected={activeFolders} onToggle={(v)=> toggle(activeFolders, setActiveFolders, v)} counts={unique.countsByFolder} />
            <FilterGroup title="الوسوم" options={unique.tags} selected={activeTags} onToggle={(v)=> toggle(activeTags, setActiveTags, v)} />
          </div>
        </details>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(it => (
            <motion.div key={`${it.id}-${it.src}`} layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
              <div className="relative">
                {it.type === "video" ? (
                  <video src={it.src} controls className="h-56 w-full object-cover group-hover:scale-[1.01] transition"/>
                ) : (
                  <img src={it.src} alt={it.name} loading="lazy" className="h-56 w-full object-cover group-hover:scale-[1.02] transition"/>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-bold leading-tight truncate" title={it.name}>{it.name}</h4>
                <div className="mt-1 text-sm text-gray-600 truncate" title={it.folder}>{it.folder || "—"}</div>
                <div className="mt-3 flex items-center justify-between">
                  <button onClick={()=> setQuick(it)} className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 hover:bg-gray-100">نظرة سريعة</button>
                  <a
                    href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(`أرغب في تسعيرة لهذا العنصر: ${it.name} (%20${it.src})`)}`}
                    target="_blank" rel="noreferrer"
                    className="px-3 py-1.5 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                  >اطلب تسعيرة</a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length===0 && (
          <div className="text-center py-16 text-gray-600">لا توجد عناصر مطابقة للفلترة الحالية.</div>
        )}
      </section>

      {/* Contact */}
      <section id="contact" className="bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8 items-start">
          <div>
            <h3 className="text-2xl font-extrabold">تواصل معنا</h3>
            <p className="mt-2 text-gray-600">اطلب تسعيرة/زيارة فني لرفع المقاسات. نخدم الرياض وما حولها.</p>
            <form onSubmit={(e)=> e.preventDefault()} className="mt-6 grid grid-cols-1 gap-3">
              <input required placeholder="الاسم" className="border border-gray-200 rounded-xl px-4 py-3"/>
              <input required placeholder="رقم الجوال" className="border border-gray-200 rounded-xl px-4 py-3"/>
              <input placeholder="المدينة/الحي" className="border border-gray-200 rounded-xl px-4 py-3"/>
              <textarea placeholder="وصف الطلب (المساحة، النوع، الميزانية…)" rows={4} className="border border-gray-200 rounded-xl px-4 py-3"/>
              <button className="mt-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700">إرسال الطلب</button>
            </form>
          </div>
          <div>
            <div className="aspect-video w-full overflow-hidden rounded-2xl border border-gray-200">
              <iframe title="خريطة" className="w-full h-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3620.0!2d46.0!3d24.7!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0:0x0!2z24jYp9mE2KfYsdin2YbYqSDZhdmE2YjYp9mE!5e0!3m2!1sar!2ssa!4v1710000000000"></iframe>
            </div>
            <div className="flex gap-3 mt-4">
              <a href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent("مرحباً، أريد تسعيرة")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700">واتساب فوري</a>
              <a href={PHONE_HREF} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 text-white shadow-lg"><IconPhone className="w-5 h-5"/> اتصل الآن</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-sm text-gray-600">
        <div className="max-w-7xl mx-auto">
          <p>© {new Date().getFullYear()} سيراميك & رخام — كل الحقوق محفوظة.</p>
          <p className="mt-2">السجل التجاري: 1010XXXXXX • الرقم الضريبي: 3XX XXX XXX</p>
        </div>
      </footer>

      {/* Quick View */}
      <AnimatePresence>
        {quick && (
          <motion.div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}}
              className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden">
              <div className="flex items-start flex-col md:flex-row">
                {quick.type === "video" ? (
                  <video src={quick.src} controls className="md:w-1/2 h-72 md:h-full object-cover"/>
                ) : (
                  <img src={quick.src} alt={quick.name} className="md:w-1/2 h-72 md:h-full object-cover"/>
                )}
                <div className="p-5 md:w-1/2">
                  <div className="flex items-start gap-2">
                    <h4 className="font-extrabold text-xl">{quick.name}</h4>
                    <button className="ms-auto p-2 rounded-lg hover:bg-gray-100" onClick={()=> setQuick(null)}><IconX className="w-5 h-5"/></button>
                  </div>
                  <p className="mt-1 text-gray-600 text-sm">{quick.folder || "—"}</p>
                  <div className="mt-5 flex gap-3">
                    <a
                      href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(`أرغب في تسعيرة لهذا العنصر: ${quick.name} (%20${quick.src})`)}`}
                      target="_blank" rel="noreferrer"
                      className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                    >اطلب تسعيرة</a>
                    <button onClick={()=> setQuick(null)} className="px-5 py-3 rounded-xl border border-gray-200">إغلاق</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterGroup({title, options, selected, onToggle, counts}){
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200">
      <p className="font-semibold mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = selected.includes(opt);
          const badge = counts && typeof counts[opt] === "number" ? ` (${counts[opt]})` : "";
          return (
            <button key={opt} onClick={()=> onToggle(opt)}
              className={`px-3 py-1.5 text-sm rounded-xl border ${active? 'border-amber-600 bg-amber-50 text-amber-700':'border-gray-200 hover:bg-gray-100'}`}
              title={opt}
            >{opt}{badge}</button>
          );
        })}
      </div>
    </div>
  );
}
