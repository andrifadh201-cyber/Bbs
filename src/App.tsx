import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Navigation,
  Route as RouteIcon,
  Sparkles,
  Search,
  Calendar,
  User,
  Shield,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  PackageOpen,
  CloudSun,
  Volume2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Order, Role, ActiveTab, UserLocation } from './types';
import {
  fetchOrdersApi,
  insertOrderApi,
  batchInsertOrdersApi,
  updateOrderApi,
  deleteOrderApi,
  deleteOrdersBatchApi,
  savePhotoApi,
  fetchPhotoApi,
  getClient,
} from './lib/supabase';
import {
  getCurrentPosition,
  shrinkImage,
  buildAllRouteGoogleMapsUrl,
  optimizeRouteOrder,
} from './lib/geo';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Header } from './components/Header';
import { Navbar } from './components/Navbar';
import { QuotaBanner } from './components/QuotaBanner';
import { OrderCard } from './components/OrderCard';
import { RouteMap } from './components/RouteMap';
import { EditRouteModal } from './components/EditRouteModal';
import { EditOrderModal } from './components/EditOrderModal';
import { NewOrderSheet } from './components/NewOrderSheet';
import { PhotoModal } from './components/PhotoModal';
import { FailReasonModal } from './components/FailReasonModal';
import { SettingsModal } from './components/SettingsModal';
import { PdfExport } from './components/PdfExport';
import { LoginScreen } from './components/LoginScreen';
import { ActiveRouteBanner } from './components/ActiveRouteBanner';

const today = () => new Date().toLocaleDateString('sv');

export default function App() {
  // Authentication & Front Entrance Screen state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('bbs_is_logged_in') === 'true';
  });
  const [role, setRole] = useState<Role>(() => {
    return (localStorage.getItem('bbs_role') as Role) || 'driver';
  });
  const [selectedDriver, setSelectedDriver] = useState<string>(() => {
    return localStorage.getItem('bbs_driver_filter') || '';
  });

  // Navigation & Filters
  const [tab, setTab] = useState<ActiveTab>('aktif');
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [searchQuery, setSearchQuery] = useState('');

  // Orders data
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Driver Real-Time Geolocation
  const [driverLoc, setDriverLoc] = useState<UserLocation | null>(null);

  // Google Maps API Key
  const [mapsApiKey, setMapsApiKey] = useState<string>(() => {
    return (
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      (typeof process !== 'undefined' && (process.env as any)?.GOOGLE_MAPS_API_KEY) ||
      localStorage.getItem('bbs_gmaps_api_key') ||
      ''
    );
  });

  // Modals & Sheets
  const [isNewOrderSheetOpen, setIsNewOrderSheetOpen] = useState(false);
  const [isEditRouteModalOpen, setIsEditRouteModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [viewingPhotoName, setViewingPhotoName] = useState<string>('');
  const [failOrderId, setFailOrderId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Camera file input reference
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoOrderId, setPendingPhotoOrderId] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{
    msg: string;
    bad?: boolean;
    type?: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (
    msg: string,
    bad = false,
    type?: 'success' | 'error' | 'warning' | 'info'
  ) => {
    const finalType = type || (bad ? 'error' : 'success');
    setToast({ msg, bad: finalType === 'error', type: finalType });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const duration = finalType === 'warning' ? 7000 : bad ? 5000 : 3200;
    toastTimeoutRef.current = setTimeout(() => setToast(null), duration);
  };

  // Real-Time SLA Monitor: Otomatis Toast jika durasi pengantaran melebihi 120 menit dari waktu startAt
  const notifiedOverdueRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const checkOverdueDeliveries = () => {
      const now = Date.now();
      const OVERDUE_LIMIT_MS = 120 * 60 * 1000; // 120 Menit

      // Ambil order aktif yang sedang berstatus 'jalan' dan memiliki startAt
      const inProgressOrders = orders.filter((o) => {
        if (o.st !== 'jalan' || !o.startAt) return false;
        if (selectedDriver && o.driver && o.driver !== selectedDriver) return false;
        return true;
      });

      // Bersihkan tracking untuk order yang sudah tidak jalan lagi
      const activeIds = new Set(inProgressOrders.map((o) => o.id));
      Object.keys(notifiedOverdueRef.current).forEach((id) => {
        if (!activeIds.has(id)) {
          delete notifiedOverdueRef.current[id];
        }
      });

      // Filter order yang durasi berjalannya sudah >= 120 menit
      const overdueList = inProgressOrders.filter((o) => {
        const elapsed = now - (o.startAt as number);
        return elapsed >= OVERDUE_LIMIT_MS;
      });

      if (overdueList.length === 0) return;

      // Filter order yang belum pernah dinotifikasi atau sudah lewat 15 menit sejak notifikasi terakhir
      const newlyDueAlerts = overdueList.filter((o) => {
        const lastNotified = notifiedOverdueRef.current[o.id] || 0;
        return now - lastNotified > 15 * 60 * 1000;
      });

      if (newlyDueAlerts.length > 0) {
        // Catat waktu notifikasi saat ini
        newlyDueAlerts.forEach((o) => {
          notifiedOverdueRef.current[o.id] = now;
        });

        // Haptic feedback getaran di smartphone kurir
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([200, 100, 200]);
          } catch {
            // ignore
          }
        }

        if (newlyDueAlerts.length === 1) {
          const item = newlyDueAlerts[0];
          const totalMins = Math.floor((now - (item.startAt as number)) / 60000);
          const hours = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          const durationStr = hours > 0 ? `${hours} jam ${mins} mnt` : `${totalMins} menit`;

          showToast(
            `⏱️ Peringatan SLA: Pengantaran #${item.orderIndex || 1} "${item.name}" telah berjalan ${durationStr} (>120 menit dari waktu startAt). Segera pantau performa rute & cek kendala!`,
            false,
            'warning'
          );
        } else {
          showToast(
            `⏱️ Peringatan SLA: Terdapat ${newlyDueAlerts.length} pengantaran aktif yang telah melebihi 120 menit dari waktu startAt. Segera pantau progres rute pengiriman!`,
            false,
            'warning'
          );
        }
      }
    };

    // Jalankan segera dan pasang interval berkala setiap 15 detik
    checkOverdueDeliveries();
    const interval = setInterval(checkOverdueDeliveries, 15000);

    return () => clearInterval(interval);
  }, [orders, selectedDriver]);

  // Load orders
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOrdersApi();
      setOrders(data);
    } catch (err: any) {
      showToast(`Gagal memuat data: ${err.message || err}`, true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const sb = getClient();
    let channel: any = null;
    if (sb) {
      try {
        channel = sb
          .channel('orders-realtime-channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => {
              loadData();
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    }

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  // Update Driver Location
  const updateDriverLocation = async () => {
    const pos = await getCurrentPosition();
    if (pos) {
      setDriverLoc({
        lat: pos.lat,
        lng: pos.lng,
        updatedAt: Date.now(),
      });
      showToast('Posisi GPS driver diperbarui');
    } else {
      showToast('Gagal membaca lokasi. Pastikan izin GPS aktif.', true);
    }
  };

  // Start tracking GPS automatically
  useEffect(() => {
    getCurrentPosition().then((pos) => {
      if (pos) {
        setDriverLoc({
          lat: pos.lat,
          lng: pos.lng,
          updatedAt: Date.now(),
        });
      }
    });

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (p) => {
          setDriverLoc({
            lat: parseFloat(p.coords.latitude.toFixed(6)),
            lng: parseFloat(p.coords.longitude.toFixed(6)),
            heading: p.coords.heading,
            speed: p.coords.speed,
            updatedAt: Date.now(),
          });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const driverList = useMemo(() => {
    const names = new Set<string>();
    orders.forEach((o) => {
      if (o.driver) names.add(o.driver);
    });
    if (selectedDriver && !names.has(selectedDriver)) {
      names.add(selectedDriver);
    }
    return Array.from(names).sort();
  }, [orders, selectedDriver]);

  // Login Handler from Front Screen
  const handleLogin = (roleChoice: Role, driverChoiceName?: string) => {
    setRole(roleChoice);
    localStorage.setItem('bbs_role', roleChoice);
    if (driverChoiceName) {
      setSelectedDriver(driverChoiceName);
      localStorage.setItem('bbs_driver_filter', driverChoiceName);
    }
    setIsLoggedIn(true);
    localStorage.setItem('bbs_is_logged_in', 'true');
    showToast(`Selamat datang! Masuk sebagai ${roleChoice === 'owner' ? 'Owner / Staff' : 'Driver'}`);
  };

  // Logout / Return to Front Entrance Screen
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('bbs_is_logged_in');
    showToast('Kembali ke Menu Depan');
  };

  const handleToggleRole = () => {
    const nextRole: Role = role === 'owner' ? 'driver' : 'owner';
    setRole(nextRole);
    localStorage.setItem('bbs_role', nextRole);
    showToast(`Beralih ke peran: ${nextRole === 'owner' ? 'Owner / Staff' : 'Driver'}`);
  };

  const handleDriverChange = (val: string) => {
    setSelectedDriver(val);
    localStorage.setItem('bbs_driver_filter', val);
  };

  // Filtered orders for active list
  const activeOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const isActive = o.st === 'baru' || o.st === 'jalan';
        const matchesDriver = !selectedDriver || o.driver === selectedDriver;
        return isActive && matchesDriver;
      })
      .sort((a, b) => {
        if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
          return a.orderIndex - b.orderIndex;
        }
        if (a.st === 'jalan' && b.st !== 'jalan') return -1;
        if (b.st === 'jalan' && a.st !== 'jalan') return 1;
        return (a.orderIndex || 999) - (b.orderIndex || 999);
      });
  }, [orders, selectedDriver]);

  // Filtered orders for completed list
  const completedOrders = useMemo(() => {
    return orders.filter((o) => {
      const isDone = o.st === 'selesai' || o.st === 'gagal';
      const orderDate = new Date(o.doneAt || o.at).toLocaleDateString('sv');
      const matchesDate = orderDate === selectedDate;
      const matchesDriver = !selectedDriver || o.driver === selectedDriver;
      return isDone && matchesDate && matchesDriver;
    });
  }, [orders, selectedDate, selectedDriver]);

  // Order Operations
  const handleStartDelivery = async (id: string) => {
    const pos = driverLoc || (await getCurrentPosition());
    const updates: Partial<Order> = {
      st: 'jalan',
      startAt: Date.now(),
      dLat: pos?.lat ?? null,
      dLng: pos?.lng ?? null,
      dAt: Date.now(),
    };
    await updateOrderApi(id, updates);
    showToast('Pengantaran dimulai');
    await loadData();
  };

  // Fungsi simulasi testing untuk memicu durasi pengantaran >120 menit
  const handleSimulateOverdue = async (id: string) => {
    const twoHoursAndTenMinsAgo = Date.now() - 130 * 60 * 1000;
    await updateOrderApi(id, {
      st: 'jalan',
      startAt: twoHoursAndTenMinsAgo,
    });
    delete notifiedOverdueRef.current[id];
    showToast('Simulasi pengantaran >120 menit diterapkan. Memantau performa rute…', false, 'info');
    await loadData();
  };

  const handleCompleteWithoutPhoto = async (id: string) => {
    await updateOrderApi(id, {
      st: 'selesai',
      doneAt: Date.now(),
    });
    showToast('Order diselesaikan (tanpa foto)');
    await loadData();
  };

  const handleTriggerPhoto = (id: string) => {
    setPendingPhotoOrderId(id);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  const handlePhotoCaptured = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const orderId = pendingPhotoOrderId;
    setPendingPhotoOrderId(null);

    if (!file || !orderId) return;

    showToast('Memproses & mengompres foto…');
    try {
      const compressedData = await shrinkImage(file);
      showToast('Menyimpan foto bukti…');
      await savePhotoApi(orderId, compressedData);
      await updateOrderApi(orderId, {
        st: 'selesai',
        doneAt: Date.now(),
        hasPhoto: true,
      });
      showToast('Foto tersimpan! Order berhasil diselesaikan.');
      await loadData();
    } catch (err: any) {
      showToast(`Gagal menyimpan foto: ${err.message || err}`, true);
    }
  };

  const handleReportFail = (id: string) => {
    setFailOrderId(id);
  };

  const handleConfirmFail = async (reason: string) => {
    if (!failOrderId) return;
    await updateOrderApi(failOrderId, {
      st: 'gagal',
      doneAt: Date.now(),
      failReason: reason,
    });
    showToast('Laporan kendala berhasil disimpan', true);
    setFailOrderId(null);
    await loadData();
  };

  const handleSendCurrentLocation = async (id: string) => {
    showToast('Membaca lokasi GPS…');
    const pos = await getCurrentPosition();
    if (pos) {
      await updateOrderApi(id, {
        dLat: pos.lat,
        dLng: pos.lng,
        dAt: Date.now(),
      });
      showToast('Posisi driver terkirim ke sistem!');
      await loadData();
    } else {
      showToast('Lokasi GPS tidak terbaca. Pastikan izin GPS aktif.', true);
    }
  };

  const handleViewPhoto = async (id: string) => {
    const order = orders.find((o) => o.id === id);
    setViewingPhotoName(order?.name || 'Bukti');
    showToast('Memuat foto bukti…');
    try {
      const data = await fetchPhotoApi(id);
      if (data) {
        setViewingPhoto(data);
      } else {
        showToast('Foto bukti tidak ditemukan di database.', true);
      }
    } catch {
      showToast('Foto gagal dimuat.', true);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Hapus order ini dari daftar?')) return;
    await deleteOrderApi(id);
    showToast('Order dihapus');
    await loadData();
  };

  // Reorder Operations
  const handleMoveOrderUp = async (id: string) => {
    const index = activeOrders.findIndex((o) => o.id === id);
    if (index <= 0) return;
    const nextList = [...activeOrders];
    const temp = nextList[index - 1];
    nextList[index - 1] = nextList[index];
    nextList[index] = temp;

    for (let i = 0; i < nextList.length; i++) {
      await updateOrderApi(nextList[i].id, { orderIndex: i + 1 });
    }
    await loadData();
  };

  const handleMoveOrderDown = async (id: string) => {
    const index = activeOrders.findIndex((o) => o.id === id);
    if (index === -1 || index >= activeOrders.length - 1) return;
    const nextList = [...activeOrders];
    const temp = nextList[index + 1];
    nextList[index + 1] = nextList[index];
    nextList[index] = temp;

    for (let i = 0; i < nextList.length; i++) {
      await updateOrderApi(nextList[i].id, { orderIndex: i + 1 });
    }
    await loadData();
  };

  const handleSaveRouteOrder = async (sortedList: Order[]) => {
    for (let i = 0; i < sortedList.length; i++) {
      await updateOrderApi(sortedList[i].id, { orderIndex: i + 1 });
    }
    showToast('Urutan rute pengantaran berhasil diperbarui!');
    await loadData();
  };

  const handleOptimizeRoute = async (sorted: Order[]) => {
    for (let i = 0; i < sorted.length; i++) {
      await updateOrderApi(sorted[i].id, { orderIndex: i + 1 });
    }
    showToast('Rute dioptimalkan berdasarkan jarak terdekat!');
    await loadData();
  };

  const handleSaveMapsApiKey = (key: string) => {
    setMapsApiKey(key);
    localStorage.setItem('bbs_gmaps_api_key', key);
  };

  // Danger zone resets
  const handleResetDate = async () => {
    const toDelete = orders.filter((o) => {
      const orderDate = new Date(o.doneAt || o.at).toLocaleDateString('sv');
      return (o.st === 'selesai' || o.st === 'gagal') && orderDate === selectedDate;
    });
    if (toDelete.length === 0) {
      showToast('Tidak ada order selesai/gagal pada tanggal ini.', true);
      return;
    }
    if (
      !window.confirm(
        `Yakin ingin menghapus ${toDelete.length} order pada tanggal ${selectedDate}? Pastikan PDF sudah diunduh!`
      )
    ) {
      return;
    }
    await deleteOrdersBatchApi(toDelete.map((o) => o.id));
    showToast(`${toDelete.length} order tanggal ${selectedDate} dihapus`);
    await loadData();
  };

  const handleResetAll = async () => {
    if (orders.length === 0) {
      showToast('Tidak ada order untuk dihapus.', true);
      return;
    }
    if (
      !window.confirm(
        `PERINGATAN: Yakin ingin menghapus SELURUH ${orders.length} order beserta fotonya? Data tidak dapat dikembalikan!`
      )
    ) {
      return;
    }
    await deleteOrdersBatchApi(orders.map((o) => o.id));
    showToast('Seluruh data order berhasil dibersihkan');
    await loadData();
  };

  const handleOpenAllRoutesUrl = () => {
    const url = buildAllRouteGoogleMapsUrl(activeOrders, driverLoc);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // If user has not entered from login screen yet, show the Front Entrance Menu
  if (!isLoggedIn) {
    return (
      <>
        <LoginScreen
          onLogin={handleLogin}
          driverList={driverList}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          mapsApiKey={mapsApiKey}
          onSaveMapsApiKey={handleSaveMapsApiKey}
          onToast={showToast}
          onRefreshData={loadData}
        />
      </>
    );
  }

  return (
    <APIProvider apiKey={mapsApiKey}>
      <div className="min-h-screen bg-[#f0fdf4] text-[#0f172a] flex flex-col font-sans pb-24">
      {/* Google Maps Platform Quota Banner */}
      <QuotaBanner />

      {/* Header with Fresh Light Green styling & Menu Depan / Logout button */}
      <Header
        role={role}
        onToggleRole={handleToggleRole}
        onLogout={handleLogout}
        orders={orders}
        selectedDate={selectedDate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isGpsActive={driverLoc !== null}
      />

      {/* Main Container */}
      <main className="max-w-3xl w-full mx-auto px-4 py-3.5 flex-1 flex flex-col">
        {/* Weather & Road Condition Quick Notice (Helpful for Driver) */}
        <div className="bg-white rounded-2xl p-2.5 px-3.5 border border-emerald-200/90 shadow-2xs mb-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#15803d]">
            <CloudSun className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold text-slate-700">
              Kondisi cuaca: <b>Cerah Berawan</b> • Utamakan keselamatan di jalan & cek paket.
            </span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            {activeOrders.length} Paket Tersisa
          </span>
        </div>

        {/* Driver Selector & Date Quick Bar */}
        <div className="bg-white rounded-2xl p-3 border border-emerald-200 shadow-sm mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="text-xs font-bold text-[#15803d] uppercase tracking-wider">
              Driver:
            </span>
            <select
              value={selectedDriver}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="flex-1 bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#14532d] outline-none focus:border-[#16a34a] transition-colors"
            >
              <option value="">Semua Driver</option>
              {driverList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {(tab === 'selesai' || tab === 'rekap') && (
            <div className="flex items-center gap-1.5 bg-emerald-50/60 px-2.5 py-1 rounded-xl border border-emerald-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#14532d] outline-none"
              />
            </div>
          )}

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-[#16a34a] hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>

        {/* ================= TAB 1: AKTIF (LIST PENGANTARAN) ================= */}
        {tab === 'aktif' && (
          <div className="space-y-3.5">
            {/* Active Route Banner with Live Google Maps Distance & Duration */}
            <ActiveRouteBanner
              activeOrders={activeOrders}
              driverLoc={driverLoc}
              onOpenEditRoute={() => setIsEditRouteModalOpen(true)}
              onOpenAllRoutesUrl={handleOpenAllRoutesUrl}
            />

            {/* List of active order cards */}
            {activeOrders.length === 0 ? (
              <div className="text-center py-20 px-4 bg-white rounded-3xl border border-emerald-200 shadow-xs">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <PackageOpen className="w-8 h-8" />
                </div>
                <b className="block text-2xl font-condensed text-[#15803d] mb-1">
                  Tidak Ada Order Aktif
                </b>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5 leading-relaxed">
                  {role === 'owner'
                    ? 'Semua pengiriman sudah selesai atau belum ada order. Tekan tombol Order Baru untuk menambahkan rute.'
                    : 'Semua paket sudah berhasil diantar. Istirahat sejenak atau tunggu order berikutnya!'}
                </p>
                {role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => setIsNewOrderSheetOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> Tambah Order Baru
                  </button>
                )}
              </div>
            ) : (
              activeOrders.map((order, idx) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={idx}
                  totalOrders={activeOrders.length}
                  isOwner={role === 'owner'}
                  driverLoc={driverLoc}
                  onStartDelivery={handleStartDelivery}
                  onTriggerPhoto={handleTriggerPhoto}
                  onCompleteWithoutPhoto={handleCompleteWithoutPhoto}
                  onReportFail={handleReportFail}
                  onSendCurrentLocation={handleSendCurrentLocation}
                  onViewPhoto={handleViewPhoto}
                  onEditOrder={(o) => setEditingOrder(o)}
                  onDeleteOrder={handleDeleteOrder}
                  onMoveOrderUp={handleMoveOrderUp}
                  onMoveOrderDown={handleMoveOrderDown}
                  onToast={showToast}
                  onSimulateOverdue={handleSimulateOverdue}
                />
              ))
            )}
          </div>
        )}

        {/* ================= TAB 2: PETA RUTE & NAVIGASI ALL-RUTE ================= */}
        {tab === 'peta' && (
          <div className="space-y-3">
            <RouteMap
              orders={orders.filter((o) => !selectedDriver || o.driver === selectedDriver)}
              apiKey={mapsApiKey}
              driverLoc={driverLoc}
              onUpdateDriverLoc={updateDriverLocation}
              onOptimizeRoute={handleOptimizeRoute}
              onOpenEditRoute={() => setIsEditRouteModalOpen(true)}
              onStartDelivery={handleStartDelivery}
              onCompleteDelivery={handleTriggerPhoto}
              onFailDelivery={handleReportFail}
            />
          </div>
        )}

        {/* ================= TAB 3: SELESAI ================= */}
        {tab === 'selesai' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
              <span>Pengantaran Tanggal: <b className="text-[#15803d]">{selectedDate}</b></span>
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                {completedOrders.length} Selesai
              </span>
            </div>

            {completedOrders.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-emerald-200 shadow-xs">
                <b className="block text-2xl font-condensed text-[#15803d] mb-1">
                  Belum Ada Pengantaran Selesai
                </b>
                <p className="text-xs text-slate-500">
                  Tidak ada data order yang selesai atau berkendala pada tanggal terpilih.
                </p>
              </div>
            ) : (
              completedOrders.map((order, idx) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={idx}
                  totalOrders={completedOrders.length}
                  isOwner={role === 'owner'}
                  driverLoc={driverLoc}
                  onStartDelivery={handleStartDelivery}
                  onTriggerPhoto={handleTriggerPhoto}
                  onCompleteWithoutPhoto={handleCompleteWithoutPhoto}
                  onReportFail={handleReportFail}
                  onSendCurrentLocation={handleSendCurrentLocation}
                  onViewPhoto={handleViewPhoto}
                  onEditOrder={(o) => setEditingOrder(o)}
                  onDeleteOrder={handleDeleteOrder}
                  onToast={showToast}
                />
              ))
            )}
          </div>
        )}

        {/* ================= TAB 4: RIWAYAT & CARI ================= */}
        {tab === 'riw' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari penerima, alamat, driver, atau catatan…"
                className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-emerald-200 rounded-2xl text-xs outline-none focus:border-[#16a34a] shadow-xs transition-colors"
              />
            </div>

            {(() => {
              const q = searchQuery.toLowerCase().trim();
              const historyList = orders.filter((o) => {
                const matchesDriver = !selectedDriver || o.driver === selectedDriver;
                if (!matchesDriver) return false;
                if (!q) return o.st === 'selesai' || o.st === 'gagal';
                return [o.name, o.addr, o.driver, o.note, o.failReason]
                  .join(' ')
                  .toLowerCase()
                  .includes(q);
              });

              if (historyList.length === 0) {
                return (
                  <div className="text-center py-16 px-4 bg-white rounded-3xl border border-emerald-200 shadow-xs">
                    <b className="block text-2xl font-condensed text-[#15803d] mb-1">
                      Data Tidak Ditemukan
                    </b>
                    <p className="text-xs text-slate-500">
                      Tidak ada riwayat pengantaran yang cocok dengan kata pencarian.
                    </p>
                  </div>
                );
              }

              return historyList.map((order, idx) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={idx}
                  totalOrders={historyList.length}
                  isOwner={role === 'owner'}
                  driverLoc={driverLoc}
                  onStartDelivery={handleStartDelivery}
                  onTriggerPhoto={handleTriggerPhoto}
                  onCompleteWithoutPhoto={handleCompleteWithoutPhoto}
                  onReportFail={handleReportFail}
                  onSendCurrentLocation={handleSendCurrentLocation}
                  onViewPhoto={handleViewPhoto}
                  onEditOrder={(o) => setEditingOrder(o)}
                  onDeleteOrder={handleDeleteOrder}
                  onToast={showToast}
                />
              ));
            })()}
          </div>
        )}

        {/* ================= TAB 5: REKAP & PDF ================= */}
        {tab === 'rekap' && (
          <PdfExport
            orders={orders}
            selectedDate={selectedDate}
            selectedDriver={selectedDriver}
            isOwner={role === 'owner'}
            onResetDate={handleResetDate}
            onResetAll={handleResetAll}
            onToast={showToast}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) + Order Baru */}
      {role === 'owner' && (
        <button
          type="button"
          onClick={() => setIsNewOrderSheetOpen(true)}
          className="fixed right-4 bottom-20 z-30 flex items-center gap-1.5 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs md:text-sm px-4 py-3 rounded-full shadow-xl active:scale-95 transition-all border-2 border-white"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Order Baru</span>
        </button>
      )}

      {/* Hidden camera input for capturing delivery photo */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCaptured}
        className="hidden"
        tabIndex={-1}
      />

      {/* Bottom Sticky Navigation */}
      <Navbar
        currentTab={tab}
        onSelectTab={setTab}
        activeCount={activeOrders.length}
      />

      {/* Modals & Sheets */}
      <NewOrderSheet
        isOpen={isNewOrderSheetOpen}
        onClose={() => setIsNewOrderSheetOpen(false)}
        onSaveSingle={async (order) => {
          await insertOrderApi(order);
          showToast('Order berhasil ditambahkan!');
          await loadData();
        }}
        onSaveBulk={async (bulkOrders) => {
          await batchInsertOrdersApi(bulkOrders);
          showToast(`${bulkOrders.length} order berhasil diimpor!`);
          await loadData();
        }}
        driverList={driverList}
        defaultDriver={selectedDriver}
      />

      <EditRouteModal
        isOpen={isEditRouteModalOpen}
        onClose={() => setIsEditRouteModalOpen(false)}
        orders={orders.filter((o) => !selectedDriver || o.driver === selectedDriver)}
        driverLoc={driverLoc}
        onSaveRouteOrder={handleSaveRouteOrder}
      />

      <EditOrderModal
        order={editingOrder}
        onClose={() => setEditingOrder(null)}
        onSave={async (id, updates) => {
          await updateOrderApi(id, updates);
          showToast('Data order diperbarui!');
          await loadData();
        }}
        driverList={driverList}
      />

      <PhotoModal
        photoData={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
        orderName={viewingPhotoName}
      />

      <FailReasonModal
        isOpen={failOrderId !== null}
        onClose={() => setFailOrderId(null)}
        onSubmit={handleConfirmFail}
        orderName={orders.find((o) => o.id === failOrderId)?.name}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        mapsApiKey={mapsApiKey}
        onSaveMapsApiKey={handleSaveMapsApiKey}
        onToast={showToast}
        onRefreshData={loadData}
      />

      {/* Global Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed left-4 right-4 bottom-20 z-50 p-3.5 rounded-2xl shadow-2xl font-semibold text-xs md:text-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-200 border-2 ${
            toast.type === 'warning'
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-300 ring-2 ring-amber-400/40'
              : toast.bad || toast.type === 'error'
              ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white border-white'
              : toast.type === 'info'
              ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white border-sky-300'
              : 'bg-gradient-to-r from-[#15803d] to-[#16a34a] text-white border-[#86efac]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-200 shrink-0 animate-bounce" />
            ) : toast.bad || toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            )}
            <span className="leading-snug break-words">{toast.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/80 hover:text-white font-bold ml-2 text-lg leading-none p-1 rounded-lg hover:bg-white/10 shrink-0"
            title="Tutup Notifikasi"
          >
            ×
          </button>
        </div>
      )}
      </div>
    </APIProvider>
  );
}

