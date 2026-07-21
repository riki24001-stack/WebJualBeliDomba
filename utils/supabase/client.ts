import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "./info";

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export type Profile = {
  id: string;
  nama_lengkap: string;
  no_hp: string;
  role: "admin" | "user";
  created_at: string;
};

export type Product = {
  id: string;
  kategori: "domba" | "lainnya";
  nama: string;
  deskripsi: string;
  harga: number;
  satuan: string;
  stok: number;
  status: "tersedia" | "dipesan" | "terjual";
  created_at: string;
};

export type DombaSpesifikasi = {
  id: string;
  product_id: string;
  jenis_kelamin: "jantan" | "betina";
  umur_bulan: number;
  berat_kg: number;
  tinggi_cm: number;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
};

export type Order = {
  id: string;
  user_id: string;
  product_id: string;
  jumlah: number;
  total_harga: number;
  status: "menunggu_konfirmasi" | "diproses" | "selesai" | "dibatalkan";
  created_at: string;
  profiles?: Profile;
  products?: Product;
};

export type PaketCicilan = {
  id: string;
  user_id: string;
  product_id: string;
  total_harga: number;
  jumlah_cicilan_rencana: number;
  status: "aktif" | "lunas" | "gagal";
  created_at: string;
  products?: Product;
};

export type PembayaranCicilan = {
  id: string;
  paket_cicilan_id: string;
  jumlah_bayar: number;
  tanggal_bayar: string;
  bukti_transfer_url: string | null;
  status: "menunggu_konfirmasi" | "terkonfirmasi" | "ditolak";
  catatan_admin: string | null;
};

export type SiteSettings = {
  id: string;
  key: string;
  value: string;
};
