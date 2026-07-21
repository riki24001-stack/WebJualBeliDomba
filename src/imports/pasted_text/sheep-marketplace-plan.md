1. GAMBARAN UMUM

Website marketplace peternakan domba milik keluarga. Ada 2 role: Admin (peternak/pemilik) dan User (pembeli). Fokus pada tampilan yang bersih, hangat, dan terpercaya — bukan kesan korporat, tapi tetap profesional. Gunakan nuansa warna earthy (coklat, hijau tua, krem) yang cocok dengan tema peternakan.

2. TECH STACK
Frontend: React
Backend & Database: Supabase (Auth, Postgres Database, Storage untuk foto)
Autentikasi: Supabase Auth (email + password)
3. ROLE & HAK AKSES
Admin: akses penuh — kelola semua produk (domba & non-domba), kelola user, konfirmasi pembayaran cicilan, lihat laporan penjualan.
User (pembeli): signup, login, logout, lihat produk, ikut paket cicilan, lihat tagihan cicilan miliknya sendiri saja (tidak bisa lihat data user lain — ini WAJIB diatur lewat Row Level Security di Supabase, bukan hanya disembunyikan di UI).
Guest (belum login): bisa lihat katalog produk, tapi harus login untuk beli/ikut paket cicilan.
4. HALAMAN & FITUR
A. Halaman Beranda (Public)
Hero section dengan foto peternakan
Preview beberapa domba unggulan
Info singkat tentang paket cicilan Idul Adha
CTA tombol "Lihat Semua Domba" dan "Hubungi via WhatsApp"
B. Katalog Domba (Public)
Grid/list kartu domba, masing-masing menampilkan: foto utama, nama/kode domba, harga, status (Tersedia / Dipesan / Terjual)
Filter: harga (min-max), jenis kelamin, berat, status ketersediaan
Search bar
Klik kartu domba → buka halaman detail
C. Detail Domba
Galeri foto (bisa lebih dari 1 foto)
Spesifikasi lengkap: nama/kode, jenis kelamin, umur, berat (kg), tinggi (cm), harga, deskripsi tambahan, status
Tombol "Pesan Sekarang" (harus login) dan tombol "Chat WhatsApp Admin"
D. Produk Tambahan (Hampas Tahu, Kohe, dll — fleksibel)
Admin bisa menambahkan kategori produk apa saja, tidak dibatasi hanya domba. Contoh: hampas tahu, kohe (pupuk kandang), dll.
Setiap produk punya: nama, kategori, foto, harga, satuan (misal: karung/kg), stok, deskripsi
Tampilan katalog terpisah dari katalog domba, tapi bisa juga digabung dengan filter kategori
E. Autentikasi
Halaman Signup (nama, email, no. HP, password)
Halaman Login
Tombol Logout
Halaman "Profil Saya" (edit data diri, ganti password)
F. Paket Cicilan Idul Adha (khusus User yang login)
Halaman "Paket Qurban" — user bisa daftar ikut paket cicilan untuk domba tertentu
Setiap user hanya bisa melihat cicilan miliknya sendiri, berisi:
Total harga paket
Jumlah yang sudah dibayar
Sisa tagihan
Riwayat pembayaran per cicilan (tanggal, jumlah, status: lunas/belum)
Jadwal jatuh tempo cicilan berikutnya
User bisa upload bukti transfer untuk setiap cicilan yang dibayarkan (menunggu konfirmasi admin)
G. Dashboard Admin (Full Akses)
Kelola Produk: tambah/edit/hapus domba dan produk lain (hampas tahu, kohe, dll), upload foto, atur stok & status
Kelola User: lihat daftar semua user
Kelola Paket Cicilan: lihat semua peserta paket qurban, konfirmasi bukti pembayaran yang diupload user, tandai cicilan sebagai lunas
Kelola Pesanan: lihat semua pesanan masuk, ubah status (Menunggu Konfirmasi → Diproses → Selesai)
Laporan Sederhana: total penjualan, total cicilan yang sudah masuk vs yang belum lunas
5. SKEMA DATABASE (Supabase / Postgres) — buatkan tabel berikut
users (dari Supabase Auth, ditambah tabel profiles)
- id (uuid, primary key, sama dengan auth.users.id)
- nama_lengkap
- no_hp
- role (enum: 'admin' | 'user', default 'user')
- created_at

products
- id (uuid, primary key)
- kategori (enum: 'domba' | 'lainnya')
- nama
- deskripsi
- harga
- satuan (contoh: 'ekor', 'karung', 'kg')
- stok
- status (enum: 'tersedia' | 'dipesan' | 'terjual')
- created_at

domba_spesifikasi (relasi 1-1 dengan products, hanya untuk kategori 'domba')
- id (uuid, primary key)
- product_id (foreign key -> products.id)
- jenis_kelamin (enum: 'jantan' | 'betina')
- umur_bulan
- berat_kg
- tinggi_cm

product_images
- id (uuid, primary key)
- product_id (foreign key -> products.id)
- image_url
- is_primary (boolean)

orders
- id (uuid, primary key)
- user_id (foreign key -> auth.users.id)
- product_id (foreign key -> products.id)
- jumlah
- total_harga
- status (enum: 'menunggu_konfirmasi' | 'diproses' | 'selesai' | 'dibatalkan')
- created_at

paket_cicilan
- id (uuid, primary key)
- user_id (foreign key -> auth.users.id)
- product_id (foreign key -> products.id, domba yang diambil)
- total_harga
- jumlah_cicilan_rencana
- status (enum: 'aktif' | 'lunas' | 'gagal')
- created_at

pembayaran_cicilan
- id (uuid, primary key)
- paket_cicilan_id (foreign key -> paket_cicilan.id)
- jumlah_bayar
- tanggal_bayar
- bukti_transfer_url
- status (enum: 'menunggu_konfirmasi' | 'terkonfirmasi' | 'ditolak')
- catatan_admin
6. ATURAN KEAMANAN (WAJIB)
Aktifkan Row Level Security (RLS) di Supabase untuk semua tabel.
User biasa hanya boleh SELECT/INSERT data orders, paket_cicilan, dan pembayaran_cicilan milik user_id mereka sendiri.
Hanya role admin yang boleh INSERT/UPDATE/DELETE ke tabel products, domba_spesifikasi, product_images, dan hanya admin yang boleh UPDATE status di semua tabel transaksi.
Password tidak boleh disimpan manual — gunakan Supabase Auth bawaan (sudah otomatis di-hash).
7. DESAIN & UX
Mobile-friendly / responsive (banyak pembeli akan akses dari HP)
Format harga dalam Rupiah (Rp 5.000.000)
Warna hangat: coklat tanah, hijau tua, krem/putih tulang
Tampilkan badge status jelas (Tersedia = hijau, Dipesan = kuning, Terjual = abu-abu)
Ada tombol WhatsApp mengambang (floating button) di semua halaman untuk kontak cepat ke admin
8. FITUR TAMBAHAN (nice to have, boleh dibuat menyusul)
Notifikasi email otomatis saat jatuh tempo cicilan mendekat
Riwayat pesanan user
Multi-admin (kalau nanti butuh lebih dari 1 admin)