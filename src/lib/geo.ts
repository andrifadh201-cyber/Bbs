import { Order } from '../types';

/**
 * Membaca koordinat (lat, lng) dari teks:
 * Mendukung link Google Maps pendek, koordinat desimal, @lat,lng, dsb.
 */
export function parseCoordinates(input?: string): { lat: number; lng: number } | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;

  // Format 1: @-6.2088,106.8456
  const m1 = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m1) return { lat: parseFloat(m1[1]), lng: parseFloat(m1[2]) };

  // Format 2: !3d-6.2088!4d106.8456
  const m2 = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m2) return { lat: parseFloat(m2[1]), lng: parseFloat(m2[2]) };

  // Format 3: ?q=-6.2088,106.8456 atau &destination=-6.2088,106.8456
  const m3 = s.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/);
  if (m3) return { lat: parseFloat(m3[1]), lng: parseFloat(m3[2]) };

  // Format 4: -6.2088, 106.8456 (raw)
  const m4 = s.match(/^(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)$/);
  if (m4) return { lat: parseFloat(m4[1]), lng: parseFloat(m4[2]) };

  return null;
}

/**
 * Format representasi lokasi untuk query Google Maps:
 * Prioritaskan koordinat jika ada (karena 100% akurat), fallback ke alamat.
 */
export function getLocationQuery(order: Order): string {
  if (order.lat != null && order.lng != null) {
    return `${order.lat},${order.lng}`;
  }
  return order.addr || order.name;
}

/**
 * Hitung jarak Haversine (km) antara 2 titik koordinat
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius bumi dalam km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Optimasi Urutan Rute (Nearest Neighbor TSP Algorithm):
 * Mengurutkan array order berdasarkan jalur terpendek berurutan,
 * dimulai dari titik start driver (jika ada).
 */
export function optimizeRouteOrder(
  orders: Order[],
  startLoc?: { lat: number; lng: number } | null
): Order[] {
  if (orders.length <= 1) return orders;

  const remaining = [...orders];
  const sorted: Order[] = [];

  let currentLat = startLoc?.lat ?? remaining[0].lat ?? -6.2088;
  let currentLng = startLoc?.lng ?? remaining[0].lng ?? 106.8456;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const o = remaining[i];
      const targetLat = o.lat ?? currentLat;
      const targetLng = o.lng ?? currentLng;

      const dist = haversineDistanceKm(currentLat, currentLng, targetLat, targetLng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    const [nearest] = remaining.splice(nearestIndex, 1);
    sorted.push(nearest);
    if (nearest.lat != null && nearest.lng != null) {
      currentLat = nearest.lat;
      currentLng = nearest.lng;
    }
  }

  return sorted.map((order, idx) => ({
    ...order,
    orderIndex: idx + 1,
  }));
}

/**
 * Membuat Universal Google Maps URL untuk Navigasi Semua Rute Sekaligus (Multi-Stop).
 */
export function buildAllRouteGoogleMapsUrl(
  orders: Order[],
  driverLoc?: { lat: number; lng: number } | null
): string {
  if (!orders.length) return 'https://www.google.com/maps';

  const activeOrders = orders.filter((o) => o.st === 'baru' || o.st === 'jalan');
  const targetOrders = activeOrders.length ? activeOrders : orders;

  let origin = '';
  if (driverLoc) {
    origin = `${driverLoc.lat},${driverLoc.lng}`;
  } else {
    origin = getLocationQuery(targetOrders[0]);
  }

  if (targetOrders.length === 1 && driverLoc) {
    const dest = getLocationQuery(targetOrders[0]);
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  }

  const lastIndex = targetOrders.length - 1;
  const destination = getLocationQuery(targetOrders[lastIndex]);

  const intermediateOrders = driverLoc
    ? targetOrders.slice(0, lastIndex)
    : targetOrders.slice(1, lastIndex);

  const waypoints = intermediateOrders
    .map((o) => getLocationQuery(o))
    .filter(Boolean)
    .slice(0, 9);

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  });

  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Buat link single-stop Google Maps Navigasi
 */
export function buildSingleGoogleMapsUrl(
  order: Order,
  driverLoc?: { lat: number; lng: number } | null
): string {
  const dest = getLocationQuery(order);
  if (driverLoc) {
    return `https://www.google.com/maps/dir/?api=1&origin=${driverLoc.lat},${driverLoc.lng}&destination=${encodeURIComponent(
      dest
    )}&travelmode=driving`;
  }
  if (order.link && /^https?:\/\//.test(order.link)) {
    return order.link;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    dest
  )}&travelmode=driving`;
}

/**
 * Bersihkan format nomor telepon dan jadikan link WhatsApp
 */
export function cleanPhoneNumber(tel?: string): string {
  if (!tel) return '';
  const digits = tel.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  return digits;
}

/**
 * Template WhatsApp yang sangat membantu driver saat pengantaran
 */
export function getWhatsAppUrl(order: Order, type: 'otw' | 'arrived' | 'confirm' = 'otw'): string {
  const phone = cleanPhoneNumber(order.tel);
  if (!phone) return '';

  let message = '';
  if (type === 'otw') {
    message = `Halo ${order.name}, saya kurir dari Driver BBS sedang dalam perjalanan mengantar paket Anda ke alamat: ${order.addr}. Mohon pastikan ada penerima di lokasi ya. Terima kasih! 🙏`;
  } else if (type === 'arrived') {
    message = `Halo ${order.name}, kurir Driver BBS sudah sampai di depan lokasi (${order.addr}). Mohon bantuannya untuk keluar menerima paket ya. Terima kasih! 📦`;
  } else {
    message = `Halo ${order.name}, kurir Driver BBS ingin konfirmasi patokan lokasi alamat pengantaran Anda di: ${order.addr}. Rumah/lokasinya sebelah mana ya kak? Terima kasih.`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/**
 * Bacakan alamat dan catatan menggunakan Web Speech API
 * Sangat membantu driver saat berkendara motor/mobil tanpa harus membaca layar kecil
 */
export function speakOrderDetails(order: Order): void {
  if (!('speechSynthesis' in window)) {
    alert('Browser tidak mendukung pembacaan suara (Text-to-speech)');
    return;
  }

  window.speechSynthesis.cancel(); // Stop suara sebelumnya jika ada

  const textToSpeak = `Tujuan ke ${order.name}. Alamat: ${order.addr}. ${
    order.note ? 'Catatan paket: ' + order.note : ''
  }`;

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = 'id-ID';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}

/**
 * Dapatkan posisi GPS pengguna saat ini secara akurat
 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Kompres foto bukti pengantaran di canvas browser
 */
export async function shrinkImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Foto tidak terbaca'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gagal memuat format gambar'));
    image.src = dataUrl;
  });

  let scale = Math.min(1, 960 / Math.max(img.width, img.height));
  let quality = 0.75;
  let compressedData = '';

  for (let i = 0; i < 5; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) break;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    compressedData = canvas.toDataURL('image/jpeg', quality);

    if (compressedData.length < 180000) break;
    scale *= 0.8;
    quality -= 0.1;
  }

  return compressedData;
}
