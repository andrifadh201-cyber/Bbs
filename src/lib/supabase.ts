import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, SupabaseConfig } from '../types';

export const DEFAULT_SUPABASE_URL = 'https://jauumbdwnnaukohhxtbd.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_xohlaN0NiWhb6pejZeZTzA_aPUt7WvL';

let client: SupabaseClient | null = null;
let currentConfig: SupabaseConfig = {
  u: DEFAULT_SUPABASE_URL,
  k: DEFAULT_SUPABASE_KEY,
};

// Baca config dari localStorage jika ada
try {
  const saved = localStorage.getItem('sbcfg2');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.u && parsed.k) {
      currentConfig = parsed;
    }
  }
} catch {
  // Gunakan default
}

export function getSupabaseConfig(): SupabaseConfig {
  return currentConfig;
}

export function initSupabase(config?: SupabaseConfig): SupabaseClient | null {
  if (config) {
    currentConfig = config;
    try {
      localStorage.setItem('sbcfg2', JSON.stringify(config));
    } catch {
      // ignore
    }
  }

  try {
    if (!currentConfig.u || !currentConfig.k) {
      client = null;
      return null;
    }
    client = createClient(currentConfig.u, currentConfig.k);
    return client;
  } catch (err) {
    console.error('Failed to init Supabase client:', err);
    client = null;
    return null;
  }
}

// Inisialisasi awal
initSupabase();

export function getClient(): SupabaseClient | null {
  if (!client) {
    return initSupabase();
  }
  return client;
}

// Local storage key for offline fallback
const LOCAL_ORDERS_KEY = 'bbs_orders_cache_v2';
const LOCAL_PHOTOS_KEY = 'bbs_photos_cache_v2';

export function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setLocalOrders(orders: Order[]): void {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // quota exceeded or private mode
  }
}

// Mapping database record to Order type
export function mapFromDb(r: any): Order {
  return {
    id: String(r.id),
    name: r.name || '',
    addr: r.addr || '',
    tel: r.tel || '',
    driver: r.driver || '',
    note: r.note || '',
    st: (r.st as any) || 'baru',
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    link: r.link || '',
    at: Number(r.at || Date.now()),
    startAt: r.start_at ? Number(r.start_at) : null,
    doneAt: r.done_at ? Number(r.done_at) : null,
    dLat: r.d_lat != null ? Number(r.d_lat) : null,
    dLng: r.d_lng != null ? Number(r.d_lng) : null,
    dAt: r.d_at ? Number(r.d_at) : null,
    hasPhoto: Boolean(r.has_photo),
    failReason: r.fail_reason || '',
    orderIndex: r.order_index != null ? Number(r.order_index) : undefined,
  };
}

export async function fetchOrdersApi(): Promise<Order[]> {
  const sb = getClient();
  if (!sb) {
    return getLocalOrders();
  }

  try {
    const { data, error } = await sb
      .from('orders')
      .select('*')
      .order('at', { ascending: false })
      .limit(1000);

    if (error) throw error;
    if (data) {
      const orders = data.map(mapFromDb);
      // Simpan ke local cache
      setLocalOrders(orders);
      return orders;
    }
  } catch (err) {
    console.warn('Supabase fetch failed, falling back to local storage:', err);
  }
  return getLocalOrders();
}

export async function insertOrderApi(order: Omit<Order, 'id'>): Promise<Order> {
  const sb = getClient();
  const id = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newOrder: Order = { ...order, id };

  // Update local cache immediately
  const local = getLocalOrders();
  setLocalOrders([newOrder, ...local]);

  if (sb) {
    try {
      const dbPayload: any = {
        name: newOrder.name,
        addr: newOrder.addr,
        tel: newOrder.tel || '',
        driver: newOrder.driver || '',
        note: newOrder.note || '',
        st: newOrder.st,
        lat: newOrder.lat,
        lng: newOrder.lng,
        link: newOrder.link,
        at: newOrder.at,
      };

      const { data, error } = await sb.from('orders').insert(dbPayload).select();
      if (!error && data && data[0]) {
        return mapFromDb(data[0]);
      }
    } catch (err) {
      console.warn('Insert to Supabase failed, kept in local cache:', err);
    }
  }

  return newOrder;
}

export async function batchInsertOrdersApi(orders: Omit<Order, 'id'>[]): Promise<Order[]> {
  const sb = getClient();
  const createdList: Order[] = orders.map((o, i) => ({
    ...o,
    id: `order_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
  }));

  // Update local cache
  const local = getLocalOrders();
  setLocalOrders([...createdList, ...local]);

  if (sb) {
    try {
      const dbPayloads = createdList.map((o) => ({
        name: o.name,
        addr: o.addr,
        tel: o.tel || '',
        driver: o.driver || '',
        note: o.note || '',
        st: o.st,
        lat: o.lat,
        lng: o.lng,
        link: o.link,
        at: o.at,
      }));

      const { data, error } = await sb.from('orders').insert(dbPayloads).select();
      if (!error && data) {
        return data.map(mapFromDb);
      }
    } catch (err) {
      console.warn('Batch insert to Supabase failed, kept in local cache:', err);
    }
  }

  return createdList;
}

export async function updateOrderApi(id: string, updates: Partial<Order>): Promise<void> {
  // Update local
  const local = getLocalOrders();
  const index = local.findIndex((o) => o.id === id);
  if (index !== -1) {
    local[index] = { ...local[index], ...updates };
    setLocalOrders(local);
  }

  const sb = getClient();
  if (sb) {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.addr !== undefined) dbUpdates.addr = updates.addr;
      if (updates.tel !== undefined) dbUpdates.tel = updates.tel;
      if (updates.driver !== undefined) dbUpdates.driver = updates.driver;
      if (updates.note !== undefined) dbUpdates.note = updates.note;
      if (updates.st !== undefined) dbUpdates.st = updates.st;
      if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
      if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
      if (updates.link !== undefined) dbUpdates.link = updates.link;
      if (updates.startAt !== undefined) dbUpdates.start_at = updates.startAt;
      if (updates.doneAt !== undefined) dbUpdates.done_at = updates.doneAt;
      if (updates.dLat !== undefined) dbUpdates.d_lat = updates.dLat;
      if (updates.dLng !== undefined) dbUpdates.d_lng = updates.dLng;
      if (updates.dAt !== undefined) dbUpdates.d_at = updates.dAt;
      if (updates.hasPhoto !== undefined) dbUpdates.has_photo = updates.hasPhoto;
      if (updates.failReason !== undefined) dbUpdates.fail_reason = updates.failReason;

      await sb.from('orders').update(dbUpdates).eq('id', id);
    } catch (err) {
      console.warn('Update to Supabase failed, saved locally:', err);
    }
  }
}

export async function deleteOrderApi(id: string): Promise<void> {
  const local = getLocalOrders();
  setLocalOrders(local.filter((o) => o.id !== id));

  const sb = getClient();
  if (sb) {
    try {
      await sb.from('orders').delete().eq('id', id);
    } catch (err) {
      console.warn('Delete in Supabase failed:', err);
    }
  }
}

export async function deleteOrdersBatchApi(ids: string[]): Promise<void> {
  const idSet = new Set(ids);
  const local = getLocalOrders();
  setLocalOrders(local.filter((o) => !idSet.has(o.id)));

  const sb = getClient();
  if (sb) {
    try {
      await sb.from('orders').delete().in('id', ids);
    } catch (err) {
      console.warn('Batch delete in Supabase failed:', err);
    }
  }
}

export async function savePhotoApi(orderId: string, base64Data: string): Promise<void> {
  // Simpan di local
  try {
    const raw = localStorage.getItem(LOCAL_PHOTOS_KEY) || '{}';
    const photos = JSON.parse(raw);
    photos[orderId] = base64Data;
    localStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(photos));
  } catch {
    // local quota
  }

  const sb = getClient();
  if (sb) {
    try {
      await sb.from('photos').upsert({
        order_id: orderId,
        data: base64Data,
        at: Date.now(),
      });
    } catch (err) {
      console.warn('Save photo to Supabase failed, saved in local storage:', err);
    }
  }
}

export async function fetchPhotoApi(orderId: string): Promise<string | null> {
  const sb = getClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('photos')
        .select('data')
        .eq('order_id', orderId)
        .maybeSingle();

      if (!error && data?.data) {
        return data.data;
      }
    } catch (err) {
      console.warn('Fetch photo from Supabase failed, checking local:', err);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_PHOTOS_KEY) || '{}';
    const photos = JSON.parse(raw);
    return photos[orderId] || null;
  } catch {
    return null;
  }
}
