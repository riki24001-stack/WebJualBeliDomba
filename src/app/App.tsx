import { useEffect, useState } from "react";
import {
  Search, Menu, X, Phone, Star, Filter, Weight, Ruler,
  Calendar, CheckCircle, Clock, AlertCircle, ArrowRight,
  LogOut, User, Shield, Package, CreditCard, BarChart2,
  Edit2, Trash2, Plus, Upload, Check, Home, MessageCircle,
  ArrowLeft, Settings, ChevronRight, Image, Info, Save,
  Eye, EyeOff, Lock, MapPin, Copy, Database
} from "lucide-react";
import { supabase } from "../../utils/supabase/client";
import { projectId } from "../../utils/supabase/info";

// ── Types ─────────────────────────────────────────────────────────────
type Page = "beranda" | "katalog" | "detail" | "login" | "signup" | "cicilan" | "admin" | "profil";
type Role = "guest" | "user" | "admin";

interface SiteConfig {
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  whatsapp: string;
  alamat: string;
  alamatLengkap: string;
  googleMaps: string;
  namaFarm: string;
  namaBank: string;
  norek: string;
  namaRekening: string;
  cicilanAktif: boolean;
  cicilanJudul: string;
  cicilanDeskripsi: string;
  cicilanMaksimal: string;
  cicilanDeadline: string;
}

interface Sheep {
  id: string; kode: string; nama: string; harga: number;
  status: "tersedia" | "dipesan" | "terjual";
  jenisKelamin: "jantan" | "betina";
  umurBulan: number; beratKg: number; tinggiCm: number;
  foto: string[]; deskripsi: string;
}

interface ProdukLain {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  satuan: string;
  stok: number;
  foto: string;
}

// ── Default Data ──────────────────────────────────────────────────────
const DEFAULT_PRODUK_LAIN: ProdukLain[] = [];

const DEFAULT_SHEEP_DATA: Sheep[] = [];

const DEFAULT_CFG: SiteConfig = {
  heroImage: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1600&h=900&fit=crop&auto=format",
  heroTitle: "Domba Pilihan, Harga Jujur.",
  heroSubtitle: "Paket cicilan Idul Adha tersedia",
  whatsapp: "628123456789",
  alamat: "Boyolali, Jawa Tengah",
  alamatLengkap: "Jl. Peternakan No. 12, Boyolali, Jawa Tengah 57311",
  googleMaps: "https://maps.google.com/?q=Boyolali,Jawa+Tengah",
  namaFarm: "DapurDomba",
  namaBank: "BRI",
  norek: "1234-5678-9012-3456",
  namaRekening: "Bapak Harto Wijaya",
  cicilanAktif: true,
  cicilanJudul: "Paket Cicilan Qurban — Ringan di Kantong",
  cicilanDeskripsi: "Pilih domba sekarang, cicil hingga 3× pembayaran. Domba aman tersimpan di kandang kami.",
  cicilanMaksimal: "3",
  cicilanDeadline: "Juni 2026",
};

// ── Supabase helpers ──────────────────────────────────────────────────
const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/server/make-server-6a2217ea`;

async function uploadImageToServer(file: File): Promise<string> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${SERVER_BASE}/upload`, { method: "POST", body: fd });
    if (res.ok) return (await res.json()).url;
  } catch {}
  return URL.createObjectURL(file);
}

function mapToSheep(p: any, index: number): Sheep {
  const spec = (p.domba_spesifikasi as any[])?.[0] || {};
  const imgs = (p.product_images as any[])?.map((img: any) => img.image_url).filter(Boolean) || [];
  return {
    id: p.id,
    kode: `DMB-${String(index + 1).padStart(3, "0")}`,
    nama: p.nama,
    harga: p.harga,
    status: p.status,
    jenisKelamin: spec.jenis_kelamin || "jantan",
    umurBulan: spec.umur_bulan || 0,
    beratKg: spec.berat_kg || 0,
    tinggiCm: spec.tinggi_cm || 0,
    foto: imgs.length ? imgs : ["https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=600&fit=crop&auto=format"],
    deskripsi: p.deskripsi || "",
  };
}

function mapToProdukLain(p: any): ProdukLain {
  const img = (p.product_images as any[])?.[0]?.image_url || "";
  return {
    id: p.id,
    nama: p.nama,
    kategori: p.deskripsi || "Produk",
    harga: p.harga,
    satuan: p.satuan,
    stok: p.stok,
    foto: img,
  };
}

// ── Formatters ────────────────────────────────────────────────────────
const fmtRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

// ── Status Badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Sheep["status"] }) {
  const cfg = {
    tersedia: { label: "Tersedia", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    dipesan: { label: "Dipesan", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    terjual: { label: "Terjual", cls: "bg-stone-200 text-stone-500 border-stone-300" },
  }[status];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>{cfg.label}</span>;
}

// ── Foto Upload ───────────────────────────────────────────────────────
function FotoUpload({ value, onChange, label = "Foto", aspect = "aspect-[16/9]" }: {
  value: string; onChange: (url: string) => void; label?: string; aspect?: string;
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onChange(URL.createObjectURL(file));
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
      <label className={`block relative ${aspect} rounded-xl overflow-hidden bg-muted border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors group`}>
        {value
          ? <img src={value} alt="preview" className="w-full h-full object-cover" />
          : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
              <Upload className="w-6 h-6" />
              <span className="text-xs font-medium">Klik untuk upload foto</span>
            </div>
        }
        {value && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-semibold flex items-center gap-1.5"><Upload className="w-4 h-4" /> Ganti Foto</span>
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
      </label>
    </div>
  );
}

// ── WA Float Button ───────────────────────────────────────────────────
function WAButton({ wa }: { wa: string }) {
  return (
    <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
      <MessageCircle className="w-6 h-6 fill-white" />
    </a>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────
function Navbar({ page, role, setPage, onLogout }: { page: Page; role: Role; setPage: (p: Page) => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => setPage("beranda")} className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold font-display">D</span>
          </div>
          <span className="font-display font-bold text-foreground text-base">Dapur<span className="text-accent">Domba</span></span>
        </button>

        <div className="hidden md:flex items-center gap-5">
          {[
            { label: "Beranda", p: "beranda" as Page },
            { label: "Katalog", p: "katalog" as Page },
            ...(role === "user" ? [{ label: "Cicilan Saya", p: "cicilan" as Page }] : []),
            ...(role === "admin" ? [{ label: "Dashboard", p: "admin" as Page }] : []),
          ].map(({ label, p }) => (
            <button key={p} onClick={() => setPage(p)} className={`text-sm font-medium transition-colors ${page === p ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {role === "guest" ? (
            <>
              <button onClick={() => setPage("login")} className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors">Masuk</button>
              <button onClick={() => setPage("signup")} className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-1.5 rounded-xl hover:bg-primary/90 transition-colors">Daftar</button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage("profil")} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl hover:bg-muted transition-colors">
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                {role === "admin" ? "Admin" : "Profil"}
              </button>
              <button onClick={onLogout} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-card px-4 pb-4 pt-2 space-y-1">
          {[
            { label: "Beranda", p: "beranda" as Page },
            { label: "Katalog Domba", p: "katalog" as Page },
            ...(role === "user" ? [{ label: "Cicilan Saya", p: "cicilan" as Page }] : []),
            ...(role === "admin" ? [{ label: "Dashboard Admin", p: "admin" as Page }] : []),
            ...(role !== "guest" ? [{ label: "Profil Saya", p: "profil" as Page }] : []),
          ].map(({ label, p }) => (
            <button key={p} onClick={() => { setPage(p); setOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">{label}</button>
          ))}
          <div className="pt-2 border-t border-border flex gap-2">
            {role === "guest" ? (
              <>
                <button onClick={() => { setPage("login"); setOpen(false); }} className="flex-1 text-sm font-medium border border-border py-2.5 rounded-xl hover:bg-muted transition-colors">Masuk</button>
                <button onClick={() => { setPage("signup"); setOpen(false); }} className="flex-1 text-sm font-semibold bg-primary text-primary-foreground py-2.5 rounded-xl hover:bg-primary/90 transition-colors">Daftar</button>
              </>
            ) : (
              <button onClick={onLogout} className="w-full text-sm font-medium text-muted-foreground border border-border py-2.5 rounded-xl hover:bg-muted transition-colors">Keluar</button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// ── PAGE: Beranda ─────────────────────────────────────────────────────
function PageBeranda({ setPage, setSelectedId, role, cfg, produkLain, sheepData }: { setPage: (p: Page) => void; setSelectedId: (id: string) => void; role: Role; cfg: SiteConfig; produkLain: ProdukLain[]; sheepData: Sheep[] }) {
  const featured = sheepData.filter(s => s.status === "tersedia").slice(0, 3);
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-10">

      {/* Hero Card */}
      <div className="relative rounded-3xl overflow-hidden h-56 md:h-72 bg-muted">
        <img src={cfg.heroImage} alt="Peternakan" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
          <div className="inline-flex items-center gap-1.5 bg-accent/90 text-accent-foreground text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
            <Star className="w-3 h-3 fill-current" /> Sejak 2008
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-bold text-white leading-tight mb-3">{cfg.heroTitle}</h1>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setPage("katalog")} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
              Lihat Katalog <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white border border-white/30 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/30 transition-colors">
              <Phone className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Featured domba */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-0.5">Unggulan</p>
            <h2 className="font-display text-xl font-bold text-foreground">Domba Pilihan</h2>
          </div>
          <button onClick={() => setPage("katalog")} className="text-sm text-primary font-medium flex items-center gap-1 hover:opacity-80 transition-opacity">
            Lihat semua <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {featured.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-2xl text-muted-foreground">
            <div className="text-4xl mb-2">🐑</div>
            <p className="font-semibold text-sm">Belum ada domba tersedia</p>
            <p className="text-xs mt-1">Admin dapat menambahkan domba melalui panel admin.</p>
          </div>
        ) : (
          <>
            {/* Mobile: horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory no-scrollbar sm:hidden">
              {featured.map(s => (
                <div key={s.id} className="flex-none w-44 snap-start">
                  <SheepCardCompact sheep={s} onClick={() => { setSelectedId(s.id); setPage("detail"); }} />
                </div>
              ))}
            </div>
            {/* Desktop: grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(s => (
                <SheepCard key={s.id} sheep={s} onClick={() => { setSelectedId(s.id); setPage("detail"); }} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Cicilan banner */}
      {cfg.cicilanAktif && (
        <div className="bg-primary rounded-3xl p-6 md:p-8">
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-2">Idul Adha — Batas {cfg.cicilanDeadline}</p>
          <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-3 leading-tight">{cfg.cicilanJudul}</h2>
          <p className="text-white/75 text-sm mb-4 leading-relaxed">{cfg.cicilanDeskripsi}</p>
          <ul className="space-y-2 mb-5">
            {[
              `Cicilan hingga ${cfg.cicilanMaksimal}× tanpa bunga`,
              "Domba langsung dikandangkan atas nama Anda",
              "Upload bukti transfer di aplikasi",
              "Konfirmasi dalam 1×24 jam",
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-white/80">
                <CheckCircle className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" /> {item}
              </li>
            ))}
          </ul>
          <button onClick={() => role === "guest" ? setPage("login") : setPage("cicilan")} className="flex items-center gap-2 bg-amber-400 text-amber-900 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-300 transition-colors">
            {role === "guest" ? "Masuk untuk Daftar" : "Lihat Cicilan Saya"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Produk Lainnya */}
      {produkLain.length > 0 && (
        <div>
          <div className="mb-3">
            <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-0.5">Tersedia Juga</p>
            <h2 className="font-display text-xl font-bold text-foreground">Produk Lainnya</h2>
          </div>
          {/* Mobile: horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory no-scrollbar sm:hidden">
            {produkLain.map(p => (
              <div key={p.id} className="flex-none w-40 snap-start bg-card border border-border rounded-2xl overflow-hidden">
                <div className="h-28 bg-muted overflow-hidden">
                  {p.foto ? <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package className="w-6 h-6" /></div>}
                </div>
                <div className="p-3">
                  <span className="text-xs text-muted-foreground">{p.kategori}</span>
                  <p className="font-semibold text-xs text-foreground mt-0.5 mb-1 leading-tight">{p.nama}</p>
                  <p className="text-accent font-bold text-xs">{fmtRp(p.harga)}<span className="text-muted-foreground font-normal">/{p.satuan}</span></p>
                  <span className={`inline-block mt-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${p.stok > 0 ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-500"}`}>
                    {p.stok > 0 ? `Stok ${p.stok}` : "Habis"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop: grid */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-4">
            {produkLain.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-36 bg-muted overflow-hidden">
                  {p.foto ? <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package className="w-8 h-8" /></div>}
                </div>
                <div className="p-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{p.kategori}</span>
                  <h3 className="font-semibold text-foreground mt-0.5 mb-2">{p.nama}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-accent font-bold text-sm">{fmtRp(p.harga)}<span className="text-muted-foreground font-normal text-xs">/{p.satuan}</span></span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.stok > 0 ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-500"}`}>
                      {p.stok > 0 ? `Stok ${p.stok}` : "Habis"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <div className="flex-1">
          <div className="font-display font-bold text-foreground mb-1">{cfg.namaFarm}</div>
          <div className="text-sm text-muted-foreground">{cfg.alamat}</div>
        </div>
        <a href={`https://wa.me/${cfg.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-semibold text-[#25D366] hover:opacity-80 transition-opacity">
          <MessageCircle className="w-4 h-4 fill-[#25D366]" /> +{cfg.whatsapp.replace(/(\d{2})(\d{3})(\d{4})(\d+)/, "$1 $2-$3-$4")}
        </a>
      </div>
    </div>
  );
}

// ── Sheep Card ────────────────────────────────────────────────────────
function SheepCard({ sheep, onClick }: { sheep: Sheep; onClick: () => void }) {
  return (
    <div onClick={sheep.status !== "terjual" ? onClick : undefined}
      className={`group bg-card rounded-2xl overflow-hidden border border-border transition-all duration-200 ${sheep.status !== "terjual" ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "opacity-60"}`}>
      <div className="relative h-44 bg-muted overflow-hidden">
        <img src={sheep.foto[0]} alt={sheep.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-2.5 left-2.5"><StatusBadge status={sheep.status} /></div>
        <div className="absolute top-2.5 right-2.5 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full font-mono">{sheep.kode}</div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display font-semibold text-foreground">{sheep.nama}</h3>
          <span className="text-xs text-muted-foreground capitalize">{sheep.jenisKelamin}</span>
        </div>
        <p className="text-accent font-bold text-sm mb-3">{fmtRp(sheep.harga)}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{sheep.beratKg} kg</span>
          <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{sheep.tinggiCm} cm</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{sheep.umurBulan} bln</span>
        </div>
      </div>
    </div>
  );
}

// ── Sheep Card Compact (mobile scroll) ───────────────────────────────
function SheepCardCompact({ sheep, onClick }: { sheep: Sheep; onClick: () => void }) {
  return (
    <div onClick={sheep.status !== "terjual" ? onClick : undefined}
      className={`bg-card rounded-2xl overflow-hidden border border-border transition-all duration-200 ${sheep.status !== "terjual" ? "cursor-pointer active:scale-95" : "opacity-60"}`}>
      <div className="relative h-32 bg-muted overflow-hidden">
        {sheep.foto[0]
          ? <img src={sheep.foto[0]} alt={sheep.nama} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package className="w-6 h-6" /></div>}
        <div className="absolute top-2 left-2"><StatusBadge status={sheep.status} /></div>
      </div>
      <div className="p-2.5">
        <p className="font-display font-semibold text-foreground text-xs leading-tight mb-0.5">{sheep.nama}</p>
        <p className="text-accent font-bold text-xs">{fmtRp(sheep.harga)}</p>
        <div className="flex gap-2 text-muted-foreground mt-1.5" style={{ fontSize: "10px" }}>
          <span className="flex items-center gap-0.5"><Weight className="w-2.5 h-2.5" />{sheep.beratKg}kg</span>
          <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{sheep.umurBulan}bln</span>
        </div>
      </div>
    </div>
  );
}

// ── PAGE: Katalog ─────────────────────────────────────────────────────
function PageKatalog({ setPage, setSelectedId, sheepData }: { setPage: (p: Page) => void; setSelectedId: (id: string) => void; sheepData: Sheep[] }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterJK, setFilterJK] = useState("semua");
  const [showFilter, setShowFilter] = useState(false);

  const filtered = sheepData.filter(s => {
    if (search && !s.nama.toLowerCase().includes(search.toLowerCase()) && !s.kode.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "semua" && s.status !== filterStatus) return false;
    if (filterJK !== "semua" && s.jenisKelamin !== filterJK) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-5">
        <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-0.5">Katalog</p>
        <h1 className="font-display text-2xl font-bold text-foreground">Semua Domba</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Cari nama atau kode..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button onClick={() => setShowFilter(!showFilter)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${showFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {showFilter && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {[["semua", "Semua"], ["tersedia", "Tersedia"], ["dipesan", "Dipesan"], ["terjual", "Terjual"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Jenis Kelamin</label>
            <select value={filterJK} onChange={e => setFilterJK(e.target.value)} className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {[["semua", "Semua"], ["jantan", "Jantan"], ["betina", "Betina"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-4">{filtered.length} domba ditemukan</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => <SheepCard key={s.id} sheep={s} onClick={() => { setSelectedId(s.id); setPage("detail"); }} />)}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">🐑</div>
          <p className="font-semibold mb-1">{sheepData.length === 0 ? "Belum ada domba" : "Tidak ditemukan"}</p>
          <p className="text-sm">{sheepData.length === 0 ? "Admin belum menambahkan domba ke katalog." : "Coba ubah filter atau kata kunci."}</p>
        </div>
      )}
    </div>
  );
}

// ── PAGE: Detail ──────────────────────────────────────────────────────
function PageDetail({ id, setPage, role, wa, sheepData, cfg }: { id: string; setPage: (p: Page) => void; role: Role; wa: string; sheepData: Sheep[]; cfg: SiteConfig }) {
  const sheep = sheepData.find(s => s.id === id);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showOrder, setShowOrder] = useState(false);
  const [metodeBayar, setMetodeBayar] = useState<"cod" | "transfer" | null>(null);
  if (!sheep) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => setPage("katalog")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="rounded-2xl overflow-hidden bg-muted mb-2 aspect-[4/3]">
            <img src={sheep.foto[activePhoto]} alt={sheep.nama} className="w-full h-full object-cover" />
          </div>
          {sheep.foto.length > 1 && (
            <div className="flex gap-2">
              {sheep.foto.map((f, i) => (
                <button key={i} onClick={() => setActivePhoto(i)} className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${i === activePhoto ? "border-primary" : "border-transparent opacity-60"}`}>
                  <img src={f} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <StatusBadge status={sheep.status} />
            <span className="font-mono text-xs text-muted-foreground">{sheep.kode}</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mt-2 mb-1">{sheep.nama}</h1>
          <p className="text-2xl font-bold text-accent mb-5">{fmtRp(sheep.harga)}</p>

          <div className="bg-muted rounded-2xl p-4 mb-4 grid grid-cols-2 gap-3">
            {[
              { icon: <User className="w-4 h-4" />, label: "Jenis Kelamin", value: sheep.jenisKelamin === "jantan" ? "Jantan" : "Betina" },
              { icon: <Calendar className="w-4 h-4" />, label: "Umur", value: `${sheep.umurBulan} bulan` },
              { icon: <Weight className="w-4 h-4" />, label: "Berat", value: `${sheep.beratKg} kg` },
              { icon: <Ruler className="w-4 h-4" />, label: "Tinggi", value: `${sheep.tinggiCm} cm` },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="text-muted-foreground flex-shrink-0">{s.icon}</div>
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="font-semibold text-sm">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-5">{sheep.deskripsi}</p>

          <div className="space-y-2.5">
            {sheep.status === "tersedia" ? (
              <>
                {role === "guest" ? (
                  <button onClick={() => setPage("login")} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
                    Masuk untuk Pesan
                  </button>
                ) : (
                  <button onClick={() => { setShowOrder(true); setMetodeBayar(null); }}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
                    Pesan Sekarang
                  </button>
                )}

                {showOrder && (
                  <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                    <p className="font-semibold text-sm text-foreground">Pilih Cara Transaksi</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setMetodeBayar("cod")}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${metodeBayar === "cod" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                        <MapPin className="w-5 h-5" /> Bayar di Tempat
                      </button>
                      <button onClick={() => setMetodeBayar("transfer")}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${metodeBayar === "transfer" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                        <CreditCard className="w-5 h-5" /> Transfer Bank
                      </button>
                    </div>

                    {metodeBayar === "cod" && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Bayar di Tempat (COD)</p>
                        <div className="flex items-start gap-2 text-sm text-emerald-900">
                          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
                          <span>{cfg.alamatLengkap || cfg.alamat}</span>
                        </div>
                        {cfg.googleMaps && (
                          <a href={cfg.googleMaps} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
                            <MapPin className="w-3.5 h-3.5" /> Lihat di Google Maps
                          </a>
                        )}
                        <a href={`https://wa.me/${wa}?text=Halo, saya ingin memesan domba ${sheep.nama} (${sheep.kode}) seharga ${fmtRp(sheep.harga)} dengan bayar di tempat (COD).`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#20b658] transition-colors mt-1">
                          <MessageCircle className="w-4 h-4 fill-white" /> Konfirmasi via WhatsApp
                        </a>
                      </div>
                    )}

                    {metodeBayar === "transfer" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Transfer Bank</p>
                        <div className="bg-white rounded-xl p-3 border border-blue-100 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Bank</span>
                            <span className="font-bold text-sm">{cfg.namaBank}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">No. Rekening</span>
                            <span className="font-bold text-sm font-mono tracking-wider">{cfg.norek}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Atas Nama</span>
                            <span className="font-semibold text-sm">{cfg.namaRekening}</span>
                          </div>
                          <div className="border-t border-blue-100 pt-1.5 flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Jumlah Transfer</span>
                            <span className="font-bold text-base text-accent">{fmtRp(sheep.harga)}</span>
                          </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <p className="text-xs text-amber-800 leading-relaxed">
                            Setelah transfer sesuai harga di atas, kirim <span className="font-semibold">bukti transfernya ke WhatsApp</span> admin.
                          </p>
                        </div>
                        {cfg.alamatLengkap && (
                          <div className="flex items-start gap-2 text-xs text-blue-800">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
                            <span>{cfg.alamatLengkap}</span>
                          </div>
                        )}
                        {cfg.googleMaps && (
                          <a href={cfg.googleMaps} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2">
                            <MapPin className="w-3.5 h-3.5" /> Lihat di Google Maps
                          </a>
                        )}
                        <a href={`https://wa.me/${wa}?text=Halo, saya sudah transfer untuk domba ${sheep.nama} (${sheep.kode}) seharga ${fmtRp(sheep.harga)}. Berikut bukti transfernya.`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#20b658] transition-colors">
                          <MessageCircle className="w-4 h-4 fill-white" /> Kirim Bukti Transfer via WA
                        </a>
                      </div>
                    )}

                    <button onClick={() => setShowOrder(false)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                      Batal
                    </button>
                  </div>
                )}

                {!showOrder && (
                  <a href={`https://wa.me/${wa}?text=Halo, saya tertarik domba ${sheep.nama} (${sheep.kode}) seharga ${fmtRp(sheep.harga)}.`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 border border-border py-3 rounded-xl font-semibold text-sm hover:bg-muted transition-colors">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" /> Chat WhatsApp Admin
                  </a>
                )}
              </>
            ) : (
              <div className="bg-muted rounded-xl p-4 text-center text-sm text-muted-foreground">
                Domba ini sudah {sheep.status === "dipesan" ? "dipesan" : "terjual"}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// nomor HP → fake email untuk Supabase auth
const hpToEmail = (hp: string) => `${hp.replace(/\D/g, "")}@dapurdomba.local`;

// ── PAGE: Login ───────────────────────────────────────────────────────
function PageLogin({ setPage, onLoginDemo, waAdmin, onLoadProfile }: { 
  setPage: (p: Page) => void; 
  onLoginDemo: (r: Role) => void; 
  waAdmin?: string;
  onLoadProfile?: (uid: string, email: string, meta?: any) => Promise<void>;
}) {
  const [hp, setHp] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!hp || !pass) return;
    setLoading(true);
    setError("");
    
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: hpToEmail(hp),
        password: pass,
      });
      
      if (err) {
        setLoading(false);
        setError("No. HP atau password salah. Coba lagi.");
        return;
      }

      // Jika login sukses, langsung pindah halaman. 
      // State authUser & role akan diupdate oleh listener onAuthStateChange di App.tsx
      setLoading(false);
      setPage("beranda");
    } catch (e: any) {
      setLoading(false);
      setError("Gagal masuk: " + (e.message || "Kesalahan jaringan"));
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold">Selamat Datang</h1>
          <p className="text-sm text-muted-foreground mt-1">Masuk ke akun DapurDomba kamu</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">No. HP / WhatsApp</label>
            <input type="tel" value={hp} onChange={e => setHp(e.target.value)} placeholder="08xxxxxxxxxx"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                className="w-full px-3 py-2.5 pr-10 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          <div className="pt-1 space-y-2">
            <button onClick={handleLogin} disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60">
              {loading ? "Masuk..." : "Masuk"}
            </button>
            <div className="relative flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">atau coba demo</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onLoginDemo("user")} className="py-2.5 bg-muted text-foreground rounded-xl font-semibold text-xs hover:bg-muted/70 transition-colors">
                Demo User
              </button>
              <button onClick={() => onLoginDemo("admin")} className="py-2.5 bg-secondary/20 text-secondary border border-secondary/30 rounded-xl font-semibold text-xs hover:bg-secondary/30 transition-colors">
                Demo Admin
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Belum punya akun? <button onClick={() => setPage("signup")} className="text-primary font-medium hover:underline">Daftar</button>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Lupa password?{" "}
          <a
            href={`https://wa.me/${(waAdmin || "").replace(/\D/g, "")}?text=Halo%20admin%2C%20saya%20lupa%20password%20akun%20DapurDomba.%20No.%20HP%20saya%3A%20`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline"
          >
            Hubungi Admin via WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}

// ── PAGE: Signup ──────────────────────────────────────────────────────
function PageSignup({ setPage }: { setPage: (p: Page) => void }) {
  const [form, setForm] = useState({ nama: "", hp: "", pass: "", konfirmasi: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSignup = async () => {
    if (!form.nama || !form.hp || !form.pass) { setError("Semua field wajib diisi."); return; }
    if (form.pass.length < 6) { setError("Password minimal 6 karakter."); return; }
    if (form.pass !== form.konfirmasi) { setError("Konfirmasi password tidak cocok."); return; }
    setLoading(true);
    setError("");
    try {
      const fakeEmail = hpToEmail(form.hp);
      const { data, error: err } = await supabase.auth.signUp({
        email: fakeEmail,
        password: form.pass,
        options: {
          data: { nama_lengkap: form.nama, no_hp: form.hp },
          emailRedirectTo: undefined,
        }
      });
      if (err) {
        setLoading(false);
        if (err.message?.includes("already registered") || err.message?.includes("already exists") || err.message?.includes("User already registered")) {
          setError("No. HP ini sudah terdaftar. Silakan masuk.");
        } else {
          setError(`Gagal: ${err.message}`);
        }
        return;
      }
      // Set session dulu supaya RLS auth.uid() terbaca saat upsert
      if (data?.session) {
        await supabase.auth.setSession(data.session);
      }
      // Buat profile manual jika trigger DB belum ada / gagal
      if (data?.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          nama_lengkap: form.nama,
          no_hp: form.hp,
          role: "user",
        }, { onConflict: "id" });
      }
      setLoading(false);
      setDone(true);
    } catch (e: any) {
      setLoading(false);
      setError("Terjadi kesalahan jaringan, coba lagi.");
    }
  };

  if (done) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="font-display text-xl font-bold mb-2">Akun Berhasil Dibuat!</h1>
        <p className="text-sm text-muted-foreground mb-6">Akun kamu sudah aktif. Silakan masuk sekarang.</p>
        <button onClick={() => setPage("login")} className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
          Masuk Sekarang
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-display text-xl font-bold">Buat Akun Baru</h1>
          <p className="text-sm text-muted-foreground mt-1">Bergabung dengan DapurDomba</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          {[
            { id: "nama", label: "Nama Lengkap", type: "text", placeholder: "Budi Santoso" },
            { id: "hp", label: "No. HP / WhatsApp (untuk login)", type: "tel", placeholder: "08xxxxxxxxxx" },
            { id: "pass", label: "Password", type: "password", placeholder: "Min. 6 karakter" },
            { id: "konfirmasi", label: "Konfirmasi Password", type: "password", placeholder: "Ulangi password" },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-sm font-medium mb-1.5">{f.label}</label>
              <input type={f.type} value={(form as any)[f.id]} onChange={e => setForm(v => ({ ...v, [f.id]: e.target.value }))} placeholder={f.placeholder}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
          <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">
            No. HP digunakan sebagai username untuk masuk. Tidak perlu email.
          </p>
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          <button onClick={handleSignup} disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors mt-1 disabled:opacity-60">
            {loading ? "Membuat akun..." : "Buat Akun"}
          </button>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Sudah punya akun? <button onClick={() => setPage("login")} className="text-primary font-medium hover:underline">Masuk</button>
        </p>
      </div>
    </div>
  );
}

// ── PAGE: Cicilan ─────────────────────────────────────────────────────
function PageCicilan({ cfg }: { cfg: SiteConfig }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-0.5">Akun Saya</p>
        <h1 className="font-display text-2xl font-bold">Cicilan Saya</h1>
      </div>

      {/* Info rekening */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> Bayar Cicilan ke Rekening Ini
        </p>
        <div className="bg-white rounded-xl border border-amber-100 divide-y divide-amber-100">
          {[
            { label: "Bank", value: cfg.namaBank },
            { label: "No. Rekening", value: cfg.norek, mono: true },
            { label: "Atas Nama", value: cfg.namaRekening },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className={`text-sm ${r.mono ? "font-mono tracking-wider" : "font-semibold"}`}>{r.value || "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      <div className="text-center py-14 bg-card border border-border rounded-2xl">
        <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold mb-1">Belum ada cicilan aktif</p>
        <p className="text-sm text-muted-foreground mb-4">Hubungi admin untuk mendaftarkan paket cicilan domba.</p>
        <a
          href={`https://wa.me/${cfg.whatsapp}?text=Halo%20admin%2C%20saya%20ingin%20mendaftar%20paket%20cicilan%20domba.`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Phone className="w-4 h-4" /> Hubungi Admin via WhatsApp
        </a>
      </div>
    </div>
  );
}

// ── PAGE: Profil ──────────────────────────────────────────────────────
function PageProfil({ role, profile, onSaveProfile }: {
  role: Role;
  profile: { nama: string; email: string; hp: string; uid?: string };
  onSaveProfile: (form: { nama: string; email: string; hp: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...profile });
  useEffect(() => { setForm({ ...profile }); }, [profile.nama, profile.email, profile.hp]);
  const [passForm, setPassForm] = useState({ lama: "", baru: "", konfirmasi: "" });
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedPass, setSavedPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [showPass, setShowPass] = useState({ lama: false, baru: false, konfirmasi: false });

  const handleSaveProfile = async () => {
    await onSaveProfile(form);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2500);
  };

  const handleSavePass = async () => {
    setPassError("");
    if (passForm.baru !== passForm.konfirmasi) { setPassError("Password baru tidak cocok."); return; }
    if (passForm.baru.length < 6) { setPassError("Password minimal 6 karakter."); return; }
    const { error } = await supabase.auth.updateUser({ password: passForm.baru });
    if (error) { setPassError(error.message); return; }
    setSavedPass(true);
    setPassForm({ lama: "", baru: "", konfirmasi: "" });
    setTimeout(() => setSavedPass(false), 2500);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div>
        <p className="text-accent text-xs font-semibold uppercase tracking-widest mb-0.5">Akun</p>
        <h1 className="font-display text-2xl font-bold">Profil Saya</h1>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
          {role === "admin" ? <Shield className="w-7 h-7 text-primary" /> : <User className="w-7 h-7 text-primary" />}
        </div>
        <div>
          <p className="font-display font-semibold text-lg">{form.nama || "Pengguna"}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{role === "admin" ? "Administrator" : "Pembeli"}</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> Data Diri</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Nama Lengkap</label>
            <input type="text" value={form.nama} onChange={e => setForm(v => ({ ...v, nama: e.target.value }))}
              placeholder="Masukkan nama lengkap"
              className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">No. HP / WhatsApp (Login)</label>
            <input type="tel" value={form.hp} readOnly
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed" />
            <p className="text-xs text-muted-foreground mt-1">No. HP tidak bisa diubah karena digunakan untuk login.</p>
          </div>
          <button onClick={handleSaveProfile}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${savedProfile ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
            {savedProfile ? <><Check className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
          </button>
        </div>
      </div>

      {/* Debug Info Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <h2 className="font-semibold mb-2 flex items-center gap-2 text-amber-800"><Shield className="w-4 h-4" /> Info Teknis (Debug)</h2>
        <div className="space-y-1 text-xs text-amber-700">
          <p><strong>User ID:</strong> {profile.uid || "Tidak terdeteksi"}</p>
          <p><strong>Role Aktif:</strong> {role === "admin" ? "ADMIN" : "USER"}</p>
          <p><strong>Email Auth:</strong> {profile.email}</p>
          <p className="mt-2 italic">*Gunakan User ID di atas untuk memastikan data di Supabase sudah benar.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /> Ganti Password</h2>
        <div className="space-y-3">
          {[
            { id: "lama", label: "Password Lama" },
            { id: "baru", label: "Password Baru" },
            { id: "konfirmasi", label: "Konfirmasi Password Baru" },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{f.label}</label>
              <div className="relative">
                <input type={(showPass as any)[f.id] ? "text" : "password"} value={(passForm as any)[f.id]} onChange={e => setPassForm(v => ({ ...v, [f.id]: e.target.value }))} placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button type="button" onClick={() => setShowPass(v => ({ ...v, [f.id]: !(v as any)[f.id] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {(showPass as any)[f.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {passError && <p className="text-xs text-destructive">{passError}</p>}
          <button onClick={handleSavePass}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${savedPass ? "bg-emerald-600 text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}>
            {savedPass ? <><Check className="w-4 h-4" /> Password Diubah!</> : "Ganti Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PAGE: Admin Dashboard ─────────────────────────────────────────────
function PageAdmin({
  cfg, setCfg,
  produkLain, setProdukLain,
  sheepData, setSheepData,
  onSaveSheep, onDeleteSheep,
  onSaveProduk, onDeleteProduk,
  dbAvailable,
}: {
  cfg: SiteConfig; setCfg: (c: SiteConfig) => void;
  produkLain: ProdukLain[]; setProdukLain: (p: ProdukLain[]) => void;
  sheepData: Sheep[]; setSheepData: (s: Sheep[]) => void;
  onSaveSheep: (form: Omit<Sheep, "id">, file: File | null, editId: string | null) => Promise<void>;
  onDeleteSheep: (id: string) => Promise<void>;
  onSaveProduk: (form: Omit<ProdukLain, "id">, file: File | null, editId: string | null) => Promise<void>;
  onDeleteProduk: (id: string) => Promise<void>;
  dbAvailable: boolean;
  adminProfile: { nama: string; email: string; hp: string };
}) {
  const [tab, setTab] = useState<"produk" | "produk_lain" | "pesanan" | "cicilan" | "user" | "pengaturan">("produk");

  const TABS = [
    { id: "produk", label: "Domba", icon: <Package className="w-4 h-4" /> },
    { id: "produk_lain", label: "Produk Lain", icon: <Package className="w-4 h-4" /> },
    { id: "pesanan", label: "Pesanan", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "cicilan", label: "Cicilan", icon: <CreditCard className="w-4 h-4" /> },
    { id: "user", label: "Pengguna", icon: <User className="w-4 h-4" /> },
    { id: "pengaturan", label: "Pengaturan", icon: <Settings className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-accent text-xs font-semibold uppercase tracking-widest leading-none">Panel Pengelola</p>
          <h1 className="font-display text-xl font-bold">Dashboard Admin</h1>
        </div>
        {dbAvailable && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <Database className="w-3 h-3" /> Database Terhubung
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Domba Tersedia", value: sheepData.filter(s => s.status === "tersedia").length, color: "text-emerald-700" },
          { label: "Total Domba", value: sheepData.length, color: "text-amber-700" },
          { label: "Dipesan", value: sheepData.filter(s => s.status === "dipesan").length, color: "text-blue-700" },
          { label: "Terjual", value: sheepData.filter(s => s.status === "terjual").length, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-muted-foreground text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-5 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "produk" && (
        <TabDomba
          sheepData={sheepData} setSheepData={setSheepData}
          onSave={onSaveSheep} onDelete={onDeleteSheep}
        />
      )}

      {tab === "produk_lain" && (
        <TabProdukLain
          produkLain={produkLain} setProdukLain={setProdukLain}
          onSave={onSaveProduk} onDelete={onDeleteProduk}
        />
      )}

      {tab === "pesanan" && (
        <div>
          <h2 className="font-semibold mb-3">Pesanan Masuk</h2>
          <div className="text-center py-14 bg-card border border-border rounded-2xl text-muted-foreground">
            <BarChart2 className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold text-sm">Belum ada pesanan</p>
            <p className="text-xs mt-1">Pesanan masuk akan tampil di sini.</p>
          </div>
        </div>
      )}

      {tab === "cicilan" && (
        <div>
          <h2 className="font-semibold mb-3">Kelola Cicilan</h2>
          <div className="text-center py-14 bg-card border border-border rounded-2xl text-muted-foreground">
            <CreditCard className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold text-sm">Belum ada data cicilan</p>
            <p className="text-xs mt-1">Data cicilan pengguna akan tampil di sini.</p>
          </div>
        </div>
      )}

      {tab === "user" && <TabUser />}

      {tab === "pengaturan" && <TabPengaturan cfg={cfg} setCfg={setCfg} adminProfile={adminProfile} />}
    </div>
  );
}

// ── Tab User (Admin) ──────────────────────────────────────────────────
function TabUser() {
  const [users, setUsers] = useState<{ id: string; nama_lengkap: string; no_hp: string; role: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setUsers(data); setLoading(false); });
  }, []);

  const handleRoleChange = async (id: string, newRole: string) => {
    setSaving(id);
    await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    setSaving(null);
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Memuat data pengguna...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Daftar Pengguna ({users.length})</h2>
      </div>
      {users.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-2xl">
          <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Belum ada pengguna terdaftar</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {users.map(u => (
            <div key={u.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-sm">{u.nama_lengkap || "—"}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${u.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{u.role}</span>
                </div>
                <p className="text-xs text-muted-foreground">{u.no_hp}</p>
              </div>
              <select
                value={u.role}
                disabled={saving === u.id}
                onChange={e => handleRoleChange(u.id, e.target.value)}
                className="bg-input-background border border-border rounded-xl px-2 py-1.5 text-xs focus:outline-none disabled:opacity-60 cursor-pointer flex-shrink-0"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-3 text-center">Ubah dropdown untuk ganti role. Perubahan langsung tersimpan.</p>
    </div>
  );
}

// ── Tab Domba (Admin) ─────────────────────────────────────────────────
const EMPTY_SHEEP: Omit<Sheep, "id"> = {
  kode: "", nama: "", harga: 0, status: "tersedia",
  jenisKelamin: "jantan", umurBulan: 0, beratKg: 0, tinggiCm: 0,
  foto: [], deskripsi: "",
};

function TabDomba({
  sheepData, setSheepData, onSave, onDelete,
}: {
  sheepData: Sheep[]; setSheepData: (s: Sheep[]) => void;
  onSave: (form: Omit<Sheep, "id">, file: File | null, editId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Sheep, "id">>({ ...EMPTY_SHEEP });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const openAdd = () => { setForm({ ...EMPTY_SHEEP }); setEditId(null); setShowForm(true); setSaved(false); setPhotoFile(null); };
  const openEdit = (s: Sheep) => {
    setForm({ kode: s.kode, nama: s.nama, harga: s.harga, status: s.status, jenisKelamin: s.jenisKelamin, umurBulan: s.umurBulan, beratKg: s.beratKg, tinggiCm: s.tinggiCm, foto: [...s.foto], deskripsi: s.deskripsi });
    setEditId(s.id); setShowForm(true); setSaved(false); setPhotoFile(null);
  };

  const handleDelete = async (id: string) => {
    setSheepData(sheepData.filter(s => s.id !== id));
    await onDelete(id);
  };

  const handleSave = async () => {
    if (!form.nama.trim()) return;
    setSaving(true);
    if (editId) {
      setSheepData(sheepData.map(s => s.id === editId ? { ...form, id: editId } : s));
    } else {
      setSheepData([...sheepData, { ...form, id: Date.now().toString() }]);
    }
    await onSave(form, photoFile, editId);
    setSaved(true);
    setSaving(false);
    setTimeout(() => { setShowForm(false); setSaved(false); }, 1200);
  };

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setForm(v => ({ ...v, foto: [URL.createObjectURL(file), ...v.foto.slice(1)] }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Daftar Domba</h2>
        <button onClick={openAdd} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Tambah
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-4 space-y-4">
          <h3 className="font-semibold text-sm">{editId ? "Edit Data Domba" : "Tambah Domba Baru"}</h3>

          <label className="block relative aspect-[4/3] rounded-xl overflow-hidden bg-muted border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors group">
            {form.foto[0]
              ? <img src={form.foto[0]} alt="preview" className="w-full h-full object-cover" />
              : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                  <Upload className="w-7 h-7" />
                  <span className="text-xs font-medium">Klik untuk upload foto domba</span>
                </div>
            }
            {form.foto[0] && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-semibold flex items-center gap-1.5"><Upload className="w-4 h-4" /> Ganti Foto</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFoto} className="sr-only" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Kode</label>
              <input value={form.kode} onChange={e => setForm(v => ({ ...v, kode: e.target.value }))} placeholder="DMB-007"
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Nama</label>
              <input value={form.nama} onChange={e => setForm(v => ({ ...v, nama: e.target.value }))} placeholder="Bima"
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Harga (Rp)</label>
              <input type="number" value={form.harga || ""} onChange={e => setForm(v => ({ ...v, harga: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(v => ({ ...v, status: e.target.value as Sheep["status"] }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none">
                {[["tersedia", "Tersedia"], ["dipesan", "Dipesan"], ["terjual", "Terjual"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Jenis Kelamin</label>
              <select value={form.jenisKelamin} onChange={e => setForm(v => ({ ...v, jenisKelamin: e.target.value as Sheep["jenisKelamin"] }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none">
                <option value="jantan">Jantan</option>
                <option value="betina">Betina</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Umur (bulan)</label>
              <input type="number" value={form.umurBulan || ""} onChange={e => setForm(v => ({ ...v, umurBulan: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Berat (kg)</label>
              <input type="number" value={form.beratKg || ""} onChange={e => setForm(v => ({ ...v, beratKg: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tinggi (cm)</label>
              <input type="number" value={form.tinggiCm || ""} onChange={e => setForm(v => ({ ...v, tinggiCm: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Deskripsi</label>
              <textarea value={form.deskripsi} onChange={e => setForm(v => ({ ...v, deskripsi: e.target.value }))} rows={2}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${saved ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
              {saved ? <><Check className="w-4 h-4" /> Tersimpan!</> : saving ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan</>}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {sheepData.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
              {s.foto[0] ? <img src={s.foto[0]} alt={s.nama} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-semibold text-sm">{s.nama}</span>
                <span className="font-mono text-xs text-muted-foreground">{s.kode}</span>
                <StatusBadge status={s.status} />
              </div>
              <span className="text-accent font-bold text-xs">{fmtRp(s.harga)}</span>
              <span className="text-muted-foreground text-xs ml-2">{s.beratKg} kg · {s.umurBulan} bln</span>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(s)} className="p-2 text-muted-foreground hover:text-primary rounded-xl hover:bg-muted transition-colors"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(s.id)} className="p-2 text-muted-foreground hover:text-destructive rounded-xl hover:bg-muted transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab Produk Lain (Admin) ───────────────────────────────────────────
const EMPTY_PRODUK: Omit<ProdukLain, "id"> = { nama: "", kategori: "", harga: 0, satuan: "karung", stok: 0, foto: "" };

function TabProdukLain({
  produkLain, setProdukLain, onSave, onDelete,
}: {
  produkLain: ProdukLain[]; setProdukLain: (p: ProdukLain[]) => void;
  onSave: (form: Omit<ProdukLain, "id">, file: File | null, editId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<ProdukLain, "id">>({ ...EMPTY_PRODUK });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const openAdd = () => { setForm({ ...EMPTY_PRODUK }); setEditId(null); setShowForm(true); setSaved(false); setPhotoFile(null); };
  const openEdit = (p: ProdukLain) => { setForm({ nama: p.nama, kategori: p.kategori, harga: p.harga, satuan: p.satuan, stok: p.stok, foto: p.foto }); setEditId(p.id); setShowForm(true); setSaved(false); setPhotoFile(null); };

  const handleSave = async () => {
    if (!form.nama.trim()) return;
    setSaving(true);
    if (editId) {
      setProdukLain(produkLain.map(p => p.id === editId ? { ...form, id: editId } : p));
    } else {
      setProdukLain([...produkLain, { ...form, id: Date.now().toString() }]);
    }
    await onSave(form, photoFile, editId);
    setSaved(true);
    setSaving(false);
    setTimeout(() => { setShowForm(false); setSaved(false); }, 1200);
  };

  const handleDelete = async (id: string) => {
    setProdukLain(produkLain.filter(p => p.id !== id));
    await onDelete(id);
  };

  const handleFotoChange = (url: string, e?: React.ChangeEvent<HTMLInputElement>) => {
    setForm(v => ({ ...v, foto: url }));
    if (e?.target.files?.[0]) setPhotoFile(e.target.files[0]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Produk Lainnya</h2>
        <button onClick={openAdd} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Tambah
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-4 space-y-3">
          <h3 className="font-semibold text-sm">{editId ? "Edit Produk" : "Tambah Produk Baru"}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "nama", label: "Nama Produk", type: "text", full: true },
              { id: "kategori", label: "Kategori", type: "text", full: false },
              { id: "satuan", label: "Satuan (misal: karung, kg)", type: "text", full: false },
            ].map(f => (
              <div key={f.id} className={f.full ? "col-span-2" : ""}>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{f.label}</label>
                <input type={f.type} value={(form as any)[f.id]} onChange={e => setForm(v => ({ ...v, [f.id]: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Harga (Rp)</label>
              <input type="number" value={form.harga || ""} onChange={e => setForm(v => ({ ...v, harga: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stok</label>
              <input type="number" value={form.stok || ""} onChange={e => setForm(v => ({ ...v, stok: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="col-span-2">
              <label className="block relative aspect-[16/7] rounded-xl overflow-hidden bg-muted border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors group">
                {form.foto
                  ? <img src={form.foto} alt="preview" className="w-full h-full object-cover" />
                  : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground"><Upload className="w-6 h-6" /><span className="text-xs font-medium">Upload foto produk</span></div>}
                {form.foto && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white text-xs font-semibold flex items-center gap-1.5"><Upload className="w-4 h-4" /> Ganti Foto</span></div>}
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) { setPhotoFile(file); setForm(v => ({ ...v, foto: URL.createObjectURL(file) })); }
                }} className="sr-only" />
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${saved ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
              {saved ? <><Check className="w-4 h-4" /> Tersimpan!</> : saving ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan</>}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              Batal
            </button>
          </div>
        </div>
      )}

      {produkLain.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada produk. Klik Tambah untuk mulai.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {produkLain.map(p => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                {p.foto ? <img src={p.foto} alt={p.nama} className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-auto text-muted-foreground mt-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-sm">{p.nama}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{p.kategori}</span>
                </div>
                <span className="text-accent font-bold text-xs">{fmtRp(p.harga)}/{p.satuan}</span>
                <span className={`ml-2 text-xs font-semibold ${p.stok > 0 ? "text-emerald-600" : "text-stone-400"}`}>
                  {p.stok > 0 ? `Stok: ${p.stok}` : "Habis"}
                </span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(p)} className="p-2 text-muted-foreground hover:text-primary rounded-xl hover:bg-muted transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 text-muted-foreground hover:text-destructive rounded-xl hover:bg-muted transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab Pengaturan (Admin) ─────────────────────────────────────────────
const MIGRATION_SQL = `-- Jalankan SQL ini di Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap TEXT NOT NULL DEFAULT '',
  no_hp TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori TEXT NOT NULL DEFAULT 'domba' CHECK (kategori IN ('domba','lainnya')),
  nama TEXT NOT NULL,
  deskripsi TEXT DEFAULT '',
  harga BIGINT NOT NULL DEFAULT 0,
  satuan TEXT NOT NULL DEFAULT 'ekor',
  stok INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'tersedia' CHECK (status IN ('tersedia','dipesan','terjual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domba_spesifikasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  jenis_kelamin TEXT NOT NULL DEFAULT 'jantan',
  umur_bulan INT NOT NULL DEFAULT 0,
  berat_kg INT NOT NULL DEFAULT 0,
  tinggi_cm INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE domba_spesifikasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "products_select_all" ON products FOR SELECT USING (TRUE);
CREATE POLICY "products_admin_write" ON products FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "domba_select_all" ON domba_spesifikasi FOR SELECT USING (TRUE);
CREATE POLICY "domba_admin_write" ON domba_spesifikasi FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "images_select_all" ON product_images FOR SELECT USING (TRUE);
CREATE POLICY "images_admin_write" ON product_images FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "settings_select_all" ON site_settings FOR SELECT USING (TRUE);
CREATE POLICY "settings_admin_write" ON site_settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nama_lengkap, no_hp, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', ''), COALESCE(NEW.raw_user_meta_data->>'no_hp', ''), 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Setelah buat akun, jalankan ini untuk jadikan admin (ganti email-nya):
-- UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'email-admin@kamu.com');
`;

function TabPengaturan({ cfg, setCfg, adminProfile }: { cfg: SiteConfig; setCfg: (c: SiteConfig) => void; adminProfile: { nama: string; email: string; hp: string } }) {
  const [local, setLocal] = useState<SiteConfig>({ ...cfg });
  const [savedSite, setSavedSite] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [copied, setCopied] = useState(false);

  const [profileForm, setProfileForm] = useState({ ...adminProfile });
  useEffect(() => { setProfileForm({ ...adminProfile }); }, [adminProfile.nama, adminProfile.email, adminProfile.hp]);
  const [savedProfile, setSavedProfile] = useState(false);
  const [passForm, setPassForm] = useState({ lama: "", baru: "", konfirmasi: "" });
  const [savedPass, setSavedPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [showPass, setShowPass] = useState({ lama: false, baru: false, konfirmasi: false });

  const handleSaveSite = () => {
    setCfg(local);
    setSavedSite(true);
    setTimeout(() => setSavedSite(false), 2500);
  };

  const handleSaveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ nama_lengkap: profileForm.nama, no_hp: profileForm.hp }).eq("id", user.id);
    }
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2500);
  };

  const handleSavePass = async () => {
    setPassError("");
    if (passForm.baru !== passForm.konfirmasi) { setPassError("Password baru tidak cocok."); return; }
    const { error } = await supabase.auth.updateUser({ password: passForm.baru });
    if (error) { setPassError(error.message); return; }
    setSavedPass(true);
    setPassForm({ lama: "", baru: "", konfirmasi: "" });
    setTimeout(() => setSavedPass(false), 2500);
  };

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(MIGRATION_SQL);
    } catch {
      const el = document.createElement("textarea");
      el.value = MIGRATION_SQL;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">

      {/* Database Setup Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-blue-900 flex items-center gap-2 text-sm"><Database className="w-4 h-4" /> Setup Database</p>
            <p className="text-xs text-blue-700 mt-1">Salin SQL migration ke Supabase Dashboard › SQL Editor untuk mengaktifkan penyimpanan data.</p>
          </div>
          <button onClick={() => setShowMigration(!showMigration)} className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors">
            {showMigration ? "Tutup" : "Lihat SQL"}
          </button>
        </div>
        {showMigration && (
          <div className="mt-3">
            <div className="relative">
              <pre className="text-xs bg-white border border-blue-100 rounded-xl p-3 overflow-x-auto max-h-48 text-blue-900 font-mono leading-relaxed">{MIGRATION_SQL}</pre>
              <button onClick={handleCopy} className="absolute top-2 right-2 flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                {copied ? <><Check className="w-3 h-3" /> Disalin!</> : <><Copy className="w-3 h-3" /> Salin</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profil Admin */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> Profil Admin</h3>
        <div className="space-y-3">
          {[
            { id: "nama", label: "Nama Lengkap", type: "text" },
            { id: "email", label: "Email", type: "email" },
            { id: "hp", label: "No. HP / WhatsApp", type: "tel" },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{f.label}</label>
              <input type={f.type} value={(profileForm as any)[f.id]} onChange={e => setProfileForm(v => ({ ...v, [f.id]: e.target.value }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
          <button onClick={handleSaveProfile}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${savedProfile ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
            {savedProfile ? <><Check className="w-4 h-4" /> Tersimpan!</> : <><Save className="w-4 h-4" /> Simpan Profil</>}
          </button>
        </div>
      </div>

      {/* Ganti password admin */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /> Ganti Password</h3>
        <div className="space-y-3">
          {[
            { id: "lama", label: "Password Lama" },
            { id: "baru", label: "Password Baru" },
            { id: "konfirmasi", label: "Konfirmasi Password Baru" },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{f.label}</label>
              <div className="relative">
                <input type={(showPass as any)[f.id] ? "text" : "password"} value={(passForm as any)[f.id]} onChange={e => setPassForm(v => ({ ...v, [f.id]: e.target.value }))} placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button type="button" onClick={() => setShowPass(v => ({ ...v, [f.id]: !(v as any)[f.id] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {(showPass as any)[f.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          {passError && <p className="text-xs text-destructive">{passError}</p>}
          <button onClick={handleSavePass}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${savedPass ? "bg-emerald-600 text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}>
            {savedPass ? <><Check className="w-4 h-4" /> Password Diubah!</> : "Ganti Password"}
          </button>
        </div>
      </div>

      {/* Info website */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Info className="w-4 h-4 text-muted-foreground" /> Informasi Farm</h3>
        <div className="space-y-3">
          {[
            { id: "namaFarm", label: "Nama Farm", type: "text" },
            { id: "whatsapp", label: "No. WhatsApp Admin (tanpa +)", type: "tel" },
            { id: "alamat", label: "Alamat Singkat", type: "text" },
            { id: "alamatLengkap", label: "Alamat Lengkap (ditampilkan ke pembeli)", type: "text" },
            { id: "googleMaps", label: "Link Google Maps", type: "url" },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{f.label}</label>
              <input type={f.type} value={(local as any)[f.id]} onChange={e => setLocal(v => ({ ...v, [f.id]: e.target.value }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Rekening Bank */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" /> Rekening Bank (untuk Transfer)</h3>
        <div className="space-y-3">
          {[
            { id: "namaBank", label: "Nama Bank (misal: BRI, BCA, Mandiri)", type: "text" },
            { id: "norek", label: "Nomor Rekening", type: "text" },
            { id: "namaRekening", label: "Nama Pemilik Rekening", type: "text" },
          ].map(f => (
            <div key={f.id}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{f.label}</label>
              <input type={f.type} value={(local as any)[f.id]} onChange={e => setLocal(v => ({ ...v, [f.id]: e.target.value }))}
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Paket Cicilan */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" /> Paket Cicilan Idul Adha</h3>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-muted-foreground">{local.cicilanAktif ? "Aktif" : "Nonaktif"}</span>
            <div
              onClick={() => setLocal(v => ({ ...v, cicilanAktif: !v.cicilanAktif }))}
              className={`w-10 h-6 rounded-full relative transition-colors ${local.cicilanAktif ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${local.cicilanAktif ? "translate-x-5" : "translate-x-1"}`} />
            </div>
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Judul Paket</label>
            <input type="text" value={local.cicilanJudul} onChange={e => setLocal(v => ({ ...v, cicilanJudul: e.target.value }))}
              className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Deskripsi Singkat</label>
            <textarea value={local.cicilanDeskripsi} onChange={e => setLocal(v => ({ ...v, cicilanDeskripsi: e.target.value }))} rows={2}
              className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Maks. Cicilan (kali)</label>
              <input type="number" value={local.cicilanMaksimal} onChange={e => setLocal(v => ({ ...v, cicilanMaksimal: e.target.value }))} min="1" max="12"
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Batas Waktu Daftar</label>
              <input type="text" value={local.cicilanDeadline} onChange={e => setLocal(v => ({ ...v, cicilanDeadline: e.target.value }))} placeholder="Juni 2026"
                className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Foto hero */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Image className="w-4 h-4 text-muted-foreground" /> Foto Hero Beranda</h3>
        <div className="space-y-3">
          <FotoUpload value={local.heroImage} onChange={url => setLocal(v => ({ ...v, heroImage: url }))} label="Foto Hero" aspect="aspect-[16/7]" />
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Judul Hero</label>
            <input type="text" value={local.heroTitle} onChange={e => setLocal(v => ({ ...v, heroTitle: e.target.value }))}
              className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Subjudul Hero</label>
            <input type="text" value={local.heroSubtitle} onChange={e => setLocal(v => ({ ...v, heroSubtitle: e.target.value }))}
              className="w-full px-3 py-2.5 bg-input-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      <button onClick={handleSaveSite}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${savedSite ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
        {savedSite ? <><Check className="w-4 h-4" /> Semua Pengaturan Tersimpan!</> : <><Save className="w-4 h-4" /> Simpan Semua Pengaturan</>}
      </button>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("beranda");
  const [role, setRole] = useState<Role>("guest");
  const [selectedId, setSelectedId] = useState("");
  const [cfg, setCfg] = useState<SiteConfig>(DEFAULT_CFG);
  const [produkLain, setProdukLain] = useState<ProdukLain[]>(DEFAULT_PRODUK_LAIN);
  const [sheepData, setSheepData] = useState<Sheep[]>(DEFAULT_SHEEP_DATA);
  const [authUser, setAuthUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{ nama: string; email: string; hp: string; uid: string }>({ nama: "", email: "", hp: "", uid: "" });
  const [dbAvailable, setDbAvailable] = useState(false);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${SERVER_BASE}/settings`);
      if (!res.ok) return;
      const d = await res.json();
      if (d.error) return;
      setCfg({
        heroImage: d.heroImage || DEFAULT_CFG.heroImage,
        heroTitle: d.heroTitle || DEFAULT_CFG.heroTitle,
        heroSubtitle: d.heroSubtitle || DEFAULT_CFG.heroSubtitle,
        whatsapp: d.whatsapp || DEFAULT_CFG.whatsapp,
        alamat: d.alamat || DEFAULT_CFG.alamat,
        alamatLengkap: d.alamatLengkap || DEFAULT_CFG.alamatLengkap,
        googleMaps: d.googleMaps || DEFAULT_CFG.googleMaps,
        namaFarm: d.namaFarm || DEFAULT_CFG.namaFarm,
        namaBank: d.namaBank || DEFAULT_CFG.namaBank,
        norek: d.norek || DEFAULT_CFG.norek,
        namaRekening: d.namaRekening || DEFAULT_CFG.namaRekening,
        cicilanAktif: d.cicilanAktif === "true",
        cicilanJudul: d.cicilanJudul || DEFAULT_CFG.cicilanJudul,
        cicilanDeskripsi: d.cicilanDeskripsi || DEFAULT_CFG.cicilanDeskripsi,
        cicilanMaksimal: d.cicilanMaksimal || DEFAULT_CFG.cicilanMaksimal,
        cicilanDeadline: d.cicilanDeadline || DEFAULT_CFG.cicilanDeadline,
      });
    } catch {}
  };

  const handleSaveSettings = async (newCfg: SiteConfig) => {
    setCfg(newCfg);
    try {
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(newCfg)) payload[k] = String(v);
      await fetch(`${SERVER_BASE}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {}
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, domba_spesifikasi(*), product_images(*)");
    if (error || !data) return;
    setDbAvailable(true);
    const domba = data.filter(p => p.kategori === "domba").map(mapToSheep);
    const lain = data.filter(p => p.kategori === "lainnya").map(mapToProdukLain);
    if (domba.length > 0) setSheepData(domba);
    if (lain.length > 0) setProdukLain(lain);
  };

  const loadProfile = async (uid: string, email: string, meta?: any) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();
      
      const noHpFromEmail = email.replace("@dapurdomba.local", "");
      const metaNama = meta?.nama_lengkap || meta?.full_name || "";
      const metaHp = meta?.no_hp || noHpFromEmail;

      // --- FALLBACK DARURAT ADMIN ---
      // Jika nomor HP adalah nomor admin utama, berikan akses admin secara otomatis
      if (metaHp === "083173527818" || noHpFromEmail === "083173527818") {
        console.log("[loadProfile] Emergency Admin Access Granted for:", metaHp);
        setRole("admin");
      }

      if (data) {
        // Jika di database adalah admin, pastikan role terupdate
        if (data.role === "admin") setRole("admin");
        else if (metaHp !== "083173527818") setRole(data.role as Role);

        setUserProfile({
          nama: data.nama_lengkap || metaNama,
          email,
          hp: data.no_hp || metaHp,
          uid: uid // Simpan UID untuk debugging
        });
      } else if (error && error.code === "PGRST116") {
        const hp = noHpFromEmail;
        await supabase.from("profiles").insert({
          id: uid,
          nama_lengkap: metaNama,
          no_hp: hp,
          role: hp === "083173527818" ? "admin" : "user",
        });
        if (hp === "083173527818") setRole("admin");
        else setRole("user");
        
        setUserProfile({ nama: metaNama, email, hp, uid });
      } else {
        setUserProfile({ nama: metaNama, email, hp: metaHp, uid });
      }
    } catch (e) {
      console.error("[loadProfile] Exception:", e);
    }
  };

  useEffect(() => {
    loadSettings();
    loadProducts();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthUser(session.user);
        loadProfile(session.user.id, session.user.email || "", session.user.user_metadata);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      console.log("[AuthChange] Event:", _e, "Session:", !!session);
      if (session) {
        setAuthUser(session.user);
        // Langsung set role 'user' sebagai fallback agar UI tidak stuck di 'guest'
        // Nanti loadProfile akan mengupdate ke 'admin' jika memang admin
        setRole(prev => (prev === "guest" ? "user" : prev));
        loadProfile(session.user.id, session.user.email || "", session.user.user_metadata);
      } else {
        setAuthUser(null);
        setRole("guest");
        setUserProfile({ nama: "", email: "", hp: "" });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginDemo = (r: Role) => { setRole(r); setPage("beranda"); };

  const handleLogout = async () => {
    if (authUser) await supabase.auth.signOut();
    setRole("guest");
    setAuthUser(null);
    setPage("beranda");
  };

  const handleSaveSheep = async (form: Omit<Sheep, "id">, file: File | null, editId: string | null) => {
    const productData = {
      kategori: "domba" as const,
      nama: form.nama,
      deskripsi: form.deskripsi,
      harga: form.harga,
      satuan: "ekor",
      stok: 1,
      status: form.status,
    };

    let productId = editId;

    if (editId) {
      await supabase.from("products").update(productData).eq("id", editId);
      await supabase.from("domba_spesifikasi").update({
        jenis_kelamin: form.jenisKelamin,
        umur_bulan: form.umurBulan,
        berat_kg: form.beratKg,
        tinggi_cm: form.tinggiCm,
      }).eq("product_id", editId);
    } else {
      const { data } = await supabase.from("products").insert(productData).select("id").single();
      if (!data) return;
      productId = data.id;
      await supabase.from("domba_spesifikasi").insert({
        product_id: productId,
        jenis_kelamin: form.jenisKelamin,
        umur_bulan: form.umurBulan,
        berat_kg: form.beratKg,
        tinggi_cm: form.tinggiCm,
      });
    }

    if (file && productId) {
      const imageUrl = await uploadImageToServer(file);
      const { data: existing } = await supabase.from("product_images")
        .select("id").eq("product_id", productId).eq("is_primary", true).single();
      if (existing) {
        await supabase.from("product_images").update({ image_url: imageUrl }).eq("id", existing.id);
      } else {
        await supabase.from("product_images").insert({ product_id: productId, image_url: imageUrl, is_primary: true });
      }
    }

    await loadProducts();
  };

  const handleDeleteSheep = async (id: string) => {
    setSheepData(prev => prev.filter(s => s.id !== id));
    await supabase.from("products").delete().eq("id", id);
  };

  const handleSaveProduk = async (form: Omit<ProdukLain, "id">, file: File | null, editId: string | null) => {
    const productData = {
      kategori: "lainnya" as const,
      nama: form.nama,
      deskripsi: form.kategori,
      harga: form.harga,
      satuan: form.satuan,
      stok: form.stok,
      status: "tersedia" as const,
    };

    let productId = editId;

    if (editId) {
      await supabase.from("products").update(productData).eq("id", editId);
    } else {
      const { data } = await supabase.from("products").insert(productData).select("id").single();
      if (!data) return;
      productId = data.id;
    }

    if (file && productId) {
      const imageUrl = await uploadImageToServer(file);
      const { data: existing } = await supabase.from("product_images")
        .select("id").eq("product_id", productId).single();
      if (existing) {
        await supabase.from("product_images").update({ image_url: imageUrl }).eq("id", existing.id);
      } else {
        await supabase.from("product_images").insert({ product_id: productId, image_url: imageUrl, is_primary: true });
      }
    }

    await loadProducts();
  };

  const handleDeleteProduk = async (id: string) => {
    setProdukLain(prev => prev.filter(p => p.id !== id));
    await supabase.from("products").delete().eq("id", id);
  };

  const handleSaveProfile = async (form: { nama: string; email: string; hp: string }) => {
    setUserProfile(form);
    if (authUser) {
      await supabase.from("profiles").update({
        nama_lengkap: form.nama,
        no_hp: form.hp,
      }).eq("id", authUser.id);
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .font-display { font-family: 'Playfair Display', Georgia, serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(92,67,32,0.2); border-radius: 99px; }
      `}</style>

      <Navbar page={page} role={role} setPage={setPage} onLogout={handleLogout} />

      <main>
        {page === "beranda" && <PageBeranda setPage={setPage} setSelectedId={setSelectedId} role={role} cfg={cfg} produkLain={produkLain} sheepData={sheepData} />}
        {page === "katalog" && <PageKatalog setPage={setPage} setSelectedId={setSelectedId} sheepData={sheepData} />}
        {page === "detail" && <PageDetail id={selectedId} setPage={setPage} role={role} wa={cfg.whatsapp} sheepData={sheepData} cfg={cfg} />}
        {page === "login" && <PageLogin setPage={setPage} onLoginDemo={handleLoginDemo} waAdmin={cfg.whatsapp} onLoadProfile={loadProfile} />}
        {page === "signup" && <PageSignup setPage={setPage} />}
        {page === "cicilan" && role !== "guest" && <PageCicilan cfg={cfg} />}
        {page === "admin" && role === "admin" && (
          <PageAdmin
            cfg={cfg} setCfg={handleSaveSettings}
            produkLain={produkLain} setProdukLain={setProdukLain}
            sheepData={sheepData} setSheepData={setSheepData}
            onSaveSheep={handleSaveSheep} onDeleteSheep={handleDeleteSheep}
            onSaveProduk={handleSaveProduk} onDeleteProduk={handleDeleteProduk}
            dbAvailable={dbAvailable}
            adminProfile={userProfile}
          />
        )}
        {page === "profil" && role !== "guest" && (
          <PageProfil role={role} profile={userProfile} onSaveProfile={handleSaveProfile} />
        )}
      </main>

      <WAButton wa={cfg.whatsapp} />
    </div>
  );
}
