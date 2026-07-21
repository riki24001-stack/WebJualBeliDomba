import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();
app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

app.get("/make-server-6a2217ea/health", (c) => c.json({ status: "ok" }));

// ── Supabase admin client ─────────────────────────────────────────────
const adminClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── One-time migration endpoint ───────────────────────────────────────
app.post("/make-server-6a2217ea/migrate", async (c) => {
  const db = adminClient();
  const sql = `
    -- Profiles
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      nama_lengkap TEXT NOT NULL DEFAULT '',
      no_hp TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Products
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

    -- Domba spesifikasi
    CREATE TABLE IF NOT EXISTS domba_spesifikasi (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      jenis_kelamin TEXT NOT NULL DEFAULT 'jantan' CHECK (jenis_kelamin IN ('jantan','betina')),
      umur_bulan INT NOT NULL DEFAULT 0,
      berat_kg INT NOT NULL DEFAULT 0,
      tinggi_cm INT NOT NULL DEFAULT 0
    );

    -- Product images
    CREATE TABLE IF NOT EXISTS product_images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      product_id UUID NOT NULL REFERENCES products(id),
      metode_bayar TEXT NOT NULL DEFAULT 'transfer' CHECK (metode_bayar IN ('transfer','cod')),
      jumlah INT NOT NULL DEFAULT 1,
      total_harga BIGINT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'menunggu_konfirmasi' CHECK (status IN ('menunggu_konfirmasi','diproses','selesai','dibatalkan')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Paket cicilan
    CREATE TABLE IF NOT EXISTS paket_cicilan (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      product_id UUID NOT NULL REFERENCES products(id),
      total_harga BIGINT NOT NULL DEFAULT 0,
      jumlah_cicilan_rencana INT NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','lunas','gagal')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Pembayaran cicilan
    CREATE TABLE IF NOT EXISTS pembayaran_cicilan (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      paket_cicilan_id UUID NOT NULL REFERENCES paket_cicilan(id) ON DELETE CASCADE,
      jumlah_bayar BIGINT NOT NULL DEFAULT 0,
      tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
      bukti_transfer_url TEXT,
      status TEXT NOT NULL DEFAULT 'menunggu_konfirmasi' CHECK (status IN ('menunggu_konfirmasi','terkonfirmasi','ditolak')),
      catatan_admin TEXT
    );

    -- Site settings
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    -- ── Row Level Security ──────────────────────────────────────────────

    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE domba_spesifikasi ENABLE ROW LEVEL SECURITY;
    ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE paket_cicilan ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pembayaran_cicilan ENABLE ROW LEVEL SECURITY;
    ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

    -- Profiles: user lihat & edit miliknya sendiri, admin lihat semua
    DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
    CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
    CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
    DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
    CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

    -- Products: semua bisa read, hanya admin yang bisa write
    DROP POLICY IF EXISTS "products_select_all" ON products;
    CREATE POLICY "products_select_all" ON products FOR SELECT USING (TRUE);
    DROP POLICY IF EXISTS "products_admin_write" ON products;
    CREATE POLICY "products_admin_write" ON products FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Domba spesifikasi: semua read, admin write
    DROP POLICY IF EXISTS "domba_select_all" ON domba_spesifikasi;
    CREATE POLICY "domba_select_all" ON domba_spesifikasi FOR SELECT USING (TRUE);
    DROP POLICY IF EXISTS "domba_admin_write" ON domba_spesifikasi;
    CREATE POLICY "domba_admin_write" ON domba_spesifikasi FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Product images: semua read, admin write
    DROP POLICY IF EXISTS "images_select_all" ON product_images;
    CREATE POLICY "images_select_all" ON product_images FOR SELECT USING (TRUE);
    DROP POLICY IF EXISTS "images_admin_write" ON product_images;
    CREATE POLICY "images_admin_write" ON product_images FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Orders: user lihat miliknya, admin lihat semua
    DROP POLICY IF EXISTS "orders_select" ON orders;
    CREATE POLICY "orders_select" ON orders FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    DROP POLICY IF EXISTS "orders_insert_own" ON orders;
    CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "orders_admin_update" ON orders;
    CREATE POLICY "orders_admin_update" ON orders FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Paket cicilan: user lihat miliknya, admin lihat semua
    DROP POLICY IF EXISTS "cicilan_select" ON paket_cicilan;
    CREATE POLICY "cicilan_select" ON paket_cicilan FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    DROP POLICY IF EXISTS "cicilan_insert_own" ON paket_cicilan;
    CREATE POLICY "cicilan_insert_own" ON paket_cicilan FOR INSERT WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "cicilan_admin_update" ON paket_cicilan;
    CREATE POLICY "cicilan_admin_update" ON paket_cicilan FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Pembayaran cicilan: user lihat miliknya via paket, admin lihat semua
    DROP POLICY IF EXISTS "pembayaran_select" ON pembayaran_cicilan;
    CREATE POLICY "pembayaran_select" ON pembayaran_cicilan FOR SELECT USING (EXISTS (SELECT 1 FROM paket_cicilan WHERE id = paket_cicilan_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))));
    DROP POLICY IF EXISTS "pembayaran_insert" ON pembayaran_cicilan;
    CREATE POLICY "pembayaran_insert" ON pembayaran_cicilan FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM paket_cicilan WHERE id = paket_cicilan_id AND user_id = auth.uid()));
    DROP POLICY IF EXISTS "pembayaran_admin_update" ON pembayaran_cicilan;
    CREATE POLICY "pembayaran_admin_update" ON pembayaran_cicilan FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Site settings: semua read, admin write
    DROP POLICY IF EXISTS "settings_select_all" ON site_settings;
    CREATE POLICY "settings_select_all" ON site_settings FOR SELECT USING (TRUE);
    DROP POLICY IF EXISTS "settings_admin_write" ON site_settings;
    CREATE POLICY "settings_admin_write" ON site_settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

    -- Auto-create profile on signup
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

    -- Default site settings
    INSERT INTO site_settings (key, value) VALUES
      ('namaFarm', 'DapurDomba'),
      ('whatsapp', '628123456789'),
      ('alamat', 'Boyolali, Jawa Tengah'),
      ('alamatLengkap', 'Jl. Peternakan No. 12, Boyolali, Jawa Tengah 57311'),
      ('googleMaps', 'https://maps.google.com/?q=Boyolali,Jawa+Tengah'),
      ('heroTitle', 'Domba Pilihan, Harga Jujur.'),
      ('heroSubtitle', 'Paket cicilan Idul Adha tersedia'),
      ('heroImage', 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=1600&h=900&fit=crop&auto=format'),
      ('namaBank', 'BRI'),
      ('norek', '1234-5678-9012-3456'),
      ('namaRekening', 'Bapak Harto Wijaya'),
      ('cicilanAktif', 'true'),
      ('cicilanJudul', 'Paket Cicilan Qurban — Ringan di Kantong'),
      ('cicilanDeskripsi', 'Pilih domba sekarang, cicil hingga 3x pembayaran. Domba aman tersimpan di kandang kami.'),
      ('cicilanMaksimal', '3'),
      ('cicilanDeadline', 'Juni 2026')
    ON CONFLICT (key) DO NOTHING;
  `;

  const { error } = await db.rpc("exec_sql", { query: sql }).single().catch(() => ({ error: null }));

  // Fallback: run via raw postgres
  try {
    const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0);
    const errors: string[] = [];
    for (const stmt of statements) {
      const { error: e } = await db.rpc("exec_sql", { query: stmt + ";" });
      if (e) errors.push(e.message);
    }
    return c.json({ ok: true, errors: errors.length ? errors : undefined });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500);
  }
});

// ── Site settings CRUD ────────────────────────────────────────────────
app.get("/make-server-6a2217ea/settings", async (c) => {
  const db = adminClient();
  const { data, error } = await db.from("site_settings").select("*");
  if (error) return c.json({ error: error.message }, 500);
  const settings: Record<string, string> = {};
  (data || []).forEach((r: { key: string; value: string }) => { settings[r.key] = r.value; });
  return c.json(settings);
});

app.post("/make-server-6a2217ea/settings", async (c) => {
  const db = adminClient();
  const body = await c.req.json();
  const upserts = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }));
  const { error } = await db.from("site_settings").upsert(upserts, { onConflict: "key" });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// ── Promote user to admin ────────────────────────────────────────────
app.post("/make-server-6a2217ea/set-admin", async (c) => {
  const db = adminClient();
  const { email } = await c.req.json();
  const { data: user } = await db.auth.admin.getUserByEmail(email);
  if (!user?.user) return c.json({ error: "User tidak ditemukan" }, 404);
  const { error } = await db.from("profiles").update({ role: "admin" }).eq("id", user.user.id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// ── Upload image to storage ──────────────────────────────────────────
app.post("/make-server-6a2217ea/upload", async (c) => {
  const db = adminClient();
  const formData = await c.req.formData();
  const file = formData.get("file") as File;
  if (!file) return c.json({ error: "No file" }, 400);
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error } = await db.storage.from("product-images").upload(path, bytes, { contentType: file.type });
  if (error) return c.json({ error: error.message }, 500);
  const { data: { publicUrl } } = db.storage.from("product-images").getPublicUrl(path);
  return c.json({ url: publicUrl });
});

Deno.serve(app.fetch);
