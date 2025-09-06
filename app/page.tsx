"use client";
import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/* =======================
   Config
======================= */
const MANIFEST_URL = "/media_manifest_categorized_final.json";
const MANIFEST_CSV_URL = "/media_manifest_categorized_final.csv";

const PHONE_RAW = "966530162210";
const WHATSAPP_PHONE = PHONE_RAW.replace(/\D/g, "");
const PHONE_HREF = `tel:+${WHATSAPP_PHONE}`;
const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;

/* =======================
   Types
======================= */
export type MediaKind = "image" | "video";
export interface MediaItem {
  id: number;
  rid?: string;               // short random ID (e.g. XR26ZV)
  name: string;
  displayName?: string;
  category?: string;          // normalized to zip names
  type: MediaKind;
  src: string;
  original_ext?: string;
  folder?: string;
  tags?: string;
  colorName?: string;
  colorHex?: string;
  year?: string;
  month?: string;
}

interface FilterGroupProps {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}

/* =======================
   CSV helpers (fallback)
======================= */
const stripBOM = (text: string) => text.replace(/^\uFEFF/, "");
function parseCSV(text: string): string[][] {
  text = stripBOM(text).replace(/\r\n/g, "\n");
  const rows: string[][] = [];
  let cur = "", row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else { cur += ch; }
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length && !(r.length === 1 && r[0] === ""));
}
type RowObj = Record<string, string>;
function csvToObjects(text: string): RowObj[] {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const obj: RowObj = {};
    headers.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
    return obj;
  });
}

/* =======================
   Small utils
======================= */
const isNonEmpty = (s?: string) => !!s && s.trim().length > 0;
const splitTags = (tags?: string): string[] =>
  isNonEmpty(tags) ? tags!.split(",").map((t) => t.trim()).filter(Boolean) : [];

// encode each segment but preserve slashes
function normalizeUrlPath(p: string): string {
  if (!p) return p;
  const hasProto = /^https?:\/\//i.test(p);
  if (hasProto) return p; // leave external URLs untouched
  const leading = p.startsWith("/") ? "/" : "";
  const parts = p.replace(/^\/+/, "").split("/").map(s => encodeURIComponent(s));
  return leading + parts.join("/");
}

function shouldSkipPath(src: string): boolean {
  const s = src.toLowerCase();
  // macOS resource forks, hidden files, unsupported formats
  if (s.includes("/._")) return true;
  if (s.endsWith(".ds_store")) return true;
  if (s.endsWith(".heic") || s.endsWith(".aae")) return true;
  if (s.endsWith("thumbs.db")) return true;
  return false;
}

const cleanFileName = (s: string) =>
  (s || "")
    .replace(/^whatsapp[-_ ]image[-_ ]/i, "")
    .replace(/[-_ ]at[-_ ]\d{6,}/i, "")
    .replace(/\.(jpe?g|png|webp|gif|mp4|mov|mkv|avi)$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

/* === derive category from zip/folder names === */
const ZIP_CATEGORIES = [
  "مغاسل",
  "رخام و سيراميك",
  "درج وطاولات",
  "خلفيات خشب",
];

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function deriveCategoryFromPath(it: Pick<MediaItem, "folder" | "src" | "category">): string | undefined {
  if (it.category && it.category !== "منتج") return it.category;
  const hay = safeDecode(`${it.folder ?? ""} ${it.src ?? ""}`);
  for (const cat of ZIP_CATEGORIES) {
    if (hay.includes(cat)) return cat;
  }
  return undefined; // no default
}

/** We never show "منتج" anywhere; title is ID; displayName is only for WA text. */
const buildDisplayName = (it: MediaItem) => {
  const color = it.colorName?.trim();
  const cat = it.category;
  if (cat && color) return `${cat} ${color}`;
  if (cat) return cat;
  if (color) return color;
  return cleanFileName(it.name) || "";
};

// generic chip toggler used like: toggle(activeTags, setActiveTags, value)
function toggle(
  _current: string[],
  set: React.Dispatch<React.SetStateAction<string[]>>,
  value: string
) {
  set(prev => (prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]));
}


/** Normalize: derive year/month & category; normalize & encode src; skip junk. */
function normalizeItems(arr: MediaItem[]): MediaItem[] {
  return arr
    .map((it) => {
      // ensure encoded path
      const encodedSrc = normalizeUrlPath(it.src);
      const m = encodedSrc.match(/\/(20\d{2})\/(\d{2})\//);
      const year = (!it.year || it.year.startsWith?.("unknown")) && m ? m[1] : it.year;
      const month = (!it.month || it.month.startsWith?.("unknown")) && m ? m[2] : it.month;
      const category = deriveCategoryFromPath({ ...it, src: encodedSrc }) ?? undefined;
      const displayName = buildDisplayName({ ...it, src: encodedSrc, category });
      return { ...it, src: encodedSrc, year, month, category, displayName };
    })
    .filter((m) => isNonEmpty(m.src) && !shouldSkipPath(m.src));
}

/* =======================
   Icons
======================= */
const IconSearch: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
       strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconX: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
       strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconPhone: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
       strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.31 1.78.58 2.63a2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.27 1.73.46 2.63.58A2 2 0 0 1 22 16.92z"/>
  </svg>
);

/* =======================
   Featured helpers (simple)
======================= */
type Featured = { id: number; name: string; src: string; colorName?: string };
const getFeatured = (items: MediaItem[]): Featured | null => {
  const it = items.find(x => x.type === "image" && x.src);
  return it ? { id: it.id, name: it.displayName || cleanFileName(it.name), src: it.src, colorName: it.colorName } : null;
};
const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-100">
    {children}
  </span>
);

/* =======================
   Component
======================= */
export default function CilinGallery() {
  const [q, setQ] = useState<string>("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [quick, setQuick] = useState<MediaItem | null>(null);

  // form (contact)
  const [name, setName] = useState(""),
        [phone, setPhone] = useState(""),
        [city, setCity] = useState(""),
        [desc, setDesc] = useState("");

  useEffect(() => {
    const load = async () => {
      let data: MediaItem[] = [];
      try {
        const r = await fetch(MANIFEST_URL, { cache: "no-store" });
        if (r.ok) data = await r.json();
      } catch {}
      if (!data?.length) {
        try {
          const rcsv = await fetch(MANIFEST_CSV_URL, { cache: "no-store" });
          if (rcsv.ok) {
            const text = await rcsv.text();
            const rows = csvToObjects(text);
            data = rows.map((o, idx) => ({
              id: Number(o.id ?? idx + 1),
              rid: o.rid || undefined,
              name: o.name ?? "",
              displayName: o.displayName,
              category: o.category || undefined,   // never default
              type: (o.type === "video" ? "video" : "image") as MediaKind,
              src: o.src ?? "",
              original_ext: o.original_ext,
              folder: o.folder,                     // ignored in UI
              tags: o.tags,
              colorName: o.colorName,
              colorHex: o.colorHex,
              year: o.year,
              month: o.month,
            }));
          }
        } catch {}
      }
      // normalize & filter junk here
      setItems(normalizeItems((data || [])));
    };
    void load();
  }, []);

  const unique = useMemo(() => {
    const tags = new Set<string>();
    const colors = new Set<string>();
    const categories = new Set<string>();

    for (const it of items) {
      for (const t of splitTags(it.tags)) {
        if (t !== "منتج") tags.add(t);   // ensure no "منتج" tag leaks in
      }
      if (isNonEmpty(it.colorName)) colors.add(it.colorName!);
      const cat = it.category;
      if (isNonEmpty(cat) && cat !== "منتج") categories.add(cat!);
    }

    const CAT_ORDER = ZIP_CATEGORIES;
    const cats = Array.from(categories).sort(
      (a, b) => CAT_ORDER.indexOf(a) - CAT_ORDER.indexOf(b)
    );

    return {
      tags: Array.from(tags).sort(),
      colors: Array.from(colors).sort(),
      categories: cats,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim();
    return items.filter((it) => {
      const titleText = `${it.rid ?? it.id ?? ""}`;
      const extra = `${it.category ?? ""} ${it.colorName ?? ""} ${it.name ?? ""} ${it.displayName ?? ""}`;
      const nameHit = !qq || (titleText + " " + extra).includes(qq);
      const tagHit = activeTags.length ? activeTags.some((t) => splitTags(it.tags).includes(t) || it.colorName === t) : true;
      const catHit = activeCategories.length ? activeCategories.includes(it.category ?? "") : true;
      return nameHit && tagHit && catHit;
    });
  }, [items, q, activeTags, activeCategories]);

    // Inline togglers (fixes "toggle is not defined")
  const toggleTag = (value: string) =>
    setActiveTags((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );

  const toggleCategory = (value: string) =>
    setActiveCategories((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );

  // image error fallback to placeholder
  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.dataset.fallback) { // avoid loops
      img.dataset.fallback = "1";
      img.src = "/cilin/placeholder.jpg";
    }
  };

  /* ===== Hero Header ===== */
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 text-gray-900">
      <header className="relative border-b border-gray-200 bg-gradient-to-br from-amber-50 to-rose-50">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Image src="/cilin/cilin.png" alt="HIMM CELIN" width={48} height={48} className="w-25 h-25 object-contain" priority />
              <div>
                <p className="text-sm text-gray-500">معرض</p>
                <h1 className="text-lg font-extrabold tracking-tight">سيراميك & رخام</h1>
              </div>
            </div>

            <div className="flex-1 max-w-2xl mx-auto relative">
              <IconSearch className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                aria-label="بحث"
                className="w-full border border-gray-200 rounded-xl pl-3 pr-10 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="ابحث بالتصنيف أو اللون أو المعرّف…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <a
              href={waLink("مرحباً، أريد استفساراً عاماً عن المنتجات")}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700"
            >
              واتساب
            </a>
          </div>

          {/* Featured */}
          <div className="mt-6 grid lg:grid-cols-2 gap-6 items-stretch">
            <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200">
              {getFeatured(items) ? (
                <img
                  src={getFeatured(items)!.src}
                  alt={getFeatured(items)!.name}
                  className="w-full h-[280px] md:h-[320px] object-cover"
                  onError={onImgError}
                />
              ) : (
                <div className="grid place-items-center h-[280px] md:h-[320px] text-gray-400">—</div>
              )}
              <div className="absolute bottom-4 right-4">
                <div className="rounded-2xl bg-white/95 backdrop-blur px-4 py-2 shadow border border-gray-200">
                  <p className="text-sm font-semibold">تركيب احترافي</p>
                  <p className="text-xs text-gray-500">فريق فني — تشطيب نظيف وسريع</p>
                </div>
              </div>
            </div>

            <div className="self-center">
              <Badge>عرض افتتاح المعرض</Badge>
              <h2 className="mt-3 text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug">
                ألوان فاخرة، خامات أصلية، وأسعار تنافسية
              </h2>
              <p className="mt-2 text-gray-600">
                سيراميك، بورسلان، ورخام طبيعي/صناعي بجودة عالية. شحن داخل المدن ودفع عند الاستلام.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> ضمان جودة المادة</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> استشارة تصميم مجانية</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> توريد سريع داخل المعرض</li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#gallery" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-white font-semibold hover:bg-amber-700">تصفّح المنتجات</a>
                <a href={waLink("مرحباً، أريد تسعيرة/زيارة فني")} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 hover:bg-white bg-white">اطلب تسعيرة</a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Filters & Gallery ===== */}
      <section className="max-w-7xl mx-auto px-4 py-8" id="gallery">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-extrabold">المعرض</h3>
          <button
            onClick={() => { setQ(""); setActiveTags([]); setActiveCategories([]); }}
            className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-100"
          >
            إعادة ضبط
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <FilterGroup title="الوسوم" options={unique.tags} selected={activeTags} onToggle={(v) => toggle(activeTags, setActiveTags, v)} />
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <p className="font-semibold mb-3">الألوان</p>
            <div className="flex flex-wrap gap-2">
              {unique.colors.map((c) => {
                const active = activeTags.includes(c);
                return (
                  <button key={c} onClick={() => toggle(activeTags, setActiveTags, c)}
                    className={`px-3 py-1.5 text-sm rounded-xl border ${active ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-gray-200 hover:bg-gray-100'}`}>{c}</button>
                );
              })}
            </div>
          </div>
          <FilterGroup title="التصنيف" options={unique.categories} selected={activeCategories} onToggle={(v) => toggle(activeCategories, setActiveCategories, v)} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((it) => {
            const cardTitle = `#${it.rid ?? it.id}`;
            const subtitle = `${it.category ?? ""}${it.colorName ? ` • ${it.colorName}` : ""}`;
            return (
              <motion.div key={`${it.rid || it.id}-${it.src}`} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden group">
                {it.type === "video"
                  ? <video src={it.src} controls className="h-56 w-full object-cover" />
                  : <img src={it.src} alt={cardTitle} loading="lazy" className="h-56 w-full object-cover" onError={onImgError} />}
                <div className="p-4">
                  <h4 className="font-bold leading-tight truncate">{cardTitle}</h4>
                  <div className="mt-1 text-sm text-gray-600 truncate">{subtitle || " "}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <button onClick={() => setQuick(it)} className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 hover:bg-gray-100">نظرة سريعة</button>
                    <a href={waLink(`أرغب في تسعيرة لهذا العنصر: ${cardTitle} (${it.src})`)}
                      target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">اطلب تسعيرة</a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && <div className="text-center py-16 text-gray-600">لا توجد عناصر مطابقة للفلترة الحالية.</div>}
      </section>

      {/* ===== Contact with Map ===== */}
      <section id="contact" className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-6 text-center">
            <h3 className="text-2xl font-extrabold">تواصل معنا</h3>
            <p className="mt-1 text-gray-600">اطلب تسعيرة، أو زيارة فني لرفع المقاسات.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Map */}
            <div className="order-2 lg:order-1">
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <iframe
                  title="خريطة المعرض"
                  

                  src={`https://www.google.com/maps?q=24.601195,46.785917&z=16&hl=ar&output=embed`}
                  className="w-full h-72 md:h-[420px] border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <div className="flex flex-wrap gap-3 p-4 border-t border-gray-100">
                  <a href={`https://www.google.com/maps?q=24.774265,46.738586&z=16&hl=ar`} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-white font-semibold hover:bg-amber-700">افتح في الخرائط</a>
                  <a href={waLink("مرحباً، أريد تحديد موقع المعرض وزيارة فني")} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 hover:bg-gray-50">تواصل واتساب</a>
                  <a href={PHONE_HREF} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 hover:bg-gray-50">اتصل الآن</a>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="order-1 lg:order-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const msg =
                      `مرحباً، أريد تسعيرة/زيارة فني.\n` +
                      `الاسم: ${name}\n` +
                      `الجوال: ${phone}\n` +
                      `المدينة/الحي: ${city}\n` +
                      `الوصف: ${desc}`;
                    window.open(waLink(msg), "_blank");
                  }}
                  className="grid grid-cols-1 gap-3"
                >
                  <input className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                         placeholder="الاسم" required value={name} onChange={(e)=>setName(e.target.value)} />
                  <input className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                         placeholder="رقم الجوال" inputMode="tel" required value={phone} onChange={(e)=>setPhone(e.target.value)} />
                  <input className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                         placeholder="المدينة/الحي" value={city} onChange={(e)=>setCity(e.target.value)} />
                  <textarea className="border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            rows={5} placeholder="وصف الطلب" value={desc} onChange={(e)=>setDesc(e.target.value)} />
                  <button className="mt-1 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700">إرسال الطلب</button>
                </form>

                <div className="mt-4 flex flex-wrap gap-3">
                  <a href={waLink("مرحباً، أريد تسعيرة/زيارة فني")} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-white font-semibold hover:bg-green-700">واتساب فوري</a>
                  <a href={PHONE_HREF} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 hover:bg-gray-50">
                    <IconPhone className="w-5 h-5" /> اتصل الآن
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="py-8 px-4 text-center text-sm text-gray-600">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <p> مصنع ومعرض همم سيلين</p>

                        <Image src="/cilin/cilin.png" alt="HIMM CELIN" width={48} height={48} className="w-25 h-25 object-contain" priority />
          <p>© {new Date().getFullYear()} جميع الحقوق محفوظة.</p>
        </div>
      </footer>

      {/* ===== Quick View ===== */}
      <AnimatePresence>
        {quick && (
          <motion.div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden">
              <div className="flex items-start flex-col md:flex-row">
                {quick.type === "video"
                  ? <video src={quick.src} controls className="md:w-1/2 h-72 md:h-full object-cover" />
                  : <img src={quick.src} alt={`#${quick.rid ?? quick.id}`} className="md:w-1/2 h-72 md:h-full object-cover" onError={onImgError} />}
                <div className="p-5 md:w-1/2">
                  <div className="flex items-start gap-2">
                    <h4 className="font-extrabold text-xl">#{quick.rid ?? quick.id}</h4>
                    <button className="ms-auto p-2 rounded-lg hover:bg-gray-100" onClick={() => setQuick(null)}>
                      <IconX className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="mt-1 text-gray-600 text-sm">
                    {(quick.category ?? "")}{quick.colorName ? ` • ${quick.colorName}` : ""}
                  </p>
                  <div className="mt-5 flex gap-3">
                    <a href={waLink(`أرغب في تسعيرة لهذا العنصر: #${quick.rid ?? quick.id} (${quick.src})`) }
                       target="_blank" rel="noreferrer"
                       className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700">اطلب تسعيرة</a>
                    <button onClick={() => setQuick(null)} className="px-5 py-3 rounded-xl border border-gray-200">إغلاق</button>
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

/* =======================
   Small UI
======================= */
function FilterGroup({ title, options, selected, onToggle }: FilterGroupProps) {
  if (!options.length) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-200">
        <p className="font-semibold mb-3">{title}</p>
        <p className="text-sm text-gray-400">—</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200">
      <p className="font-semibold mb-3">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`px-3 py-1.5 text-sm rounded-xl border ${
                active ? "border-amber-600 bg-amber-50 text-amber-700" : "border-gray-200 hover:bg-gray-100"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
