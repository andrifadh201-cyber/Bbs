export type OrderStatus = 'baru' | 'jalan' | 'selesai' | 'gagal';

export interface Order {
  id: string;
  name: string;
  addr: string;
  tel?: string;
  driver?: string;
  note?: string;
  st: OrderStatus;
  lat?: number | null;
  lng?: number | null;
  link?: string;
  at: number;
  startAt?: number | null;
  doneAt?: number | null;
  dLat?: number | null;
  dLng?: number | null;
  dAt?: number | null;
  hasPhoto?: boolean;
  failReason?: string;
  orderIndex?: number; // Urutan rute pengantaran (1, 2, 3...)
}

export type Role = 'owner' | 'driver';

export type ActiveTab = 'aktif' | 'peta' | 'selesai' | 'riw' | 'rekap';

export interface UserLocation {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  updatedAt: number;
}

export interface SupabaseConfig {
  u: string;
  k: string;
}
