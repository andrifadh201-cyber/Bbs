import React, { useEffect, useState, useMemo } from 'react';
import {
  Navigation,
  Route as RouteIcon,
  ArrowUpDown,
  ExternalLink,
  Clock,
  Milestone,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Order, UserLocation } from '../types';
import { haversineDistanceKm } from '../lib/geo';

interface ActiveRouteBannerProps {
  activeOrders: Order[];
  driverLoc: UserLocation | null;
  onOpenEditRoute: () => void;
  onOpenAllRoutesUrl: () => void;
}

export function ActiveRouteBanner({
  activeOrders,
  driverLoc,
  onOpenEditRoute,
  onOpenAllRoutesUrl,
}: ActiveRouteBannerProps) {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Urutan order yang aktif
  const sortedStops = useMemo(() => {
    return [...activeOrders].sort((a, b) => (a.orderIndex || 999) - (b.orderIndex || 999));
  }, [activeOrders]);

  // Deteksi pengantaran aktif yang melebihi 120 menit dari waktu startAt
  const overdueDeliveries = useMemo(() => {
    const now = Date.now();
    return activeOrders.filter((o) => {
      if (o.st === 'jalan' && o.startAt) {
        return now - o.startAt >= 120 * 60 * 1000;
      }
      return false;
    });
  }, [activeOrders]);

  const calculateRouteMetrics = () => {
    if (sortedStops.length === 0) {
      setDistanceKm(null);
      setDurationMin(null);
      return;
    }

    setIsCalculating(true);

    // Hitung jarak berurutan: Driver Loc (atau stop pertama) -> stop 1 -> stop 2 -> dst.
    let totalRoadKm = 0;
    let lastLat = driverLoc ? driverLoc.lat : sortedStops[0].lat ?? -6.2088;
    let lastLng = driverLoc ? driverLoc.lng : sortedStops[0].lng ?? 106.8456;

    sortedStops.forEach((stop) => {
      if (stop.lat != null && stop.lng != null) {
        const legKm = haversineDistanceKm(lastLat, lastLng, stop.lat, stop.lng);
        // Faktor kelokan jalan raya kota 1.35x dari garis lurus
        totalRoadKm += legKm > 0 ? legKm * 1.35 : 1.2;
        lastLat = stop.lat;
        lastLng = stop.lng;
      } else {
        // Jika stop belum ada titik lat/lng akurat
        totalRoadKm += 2.5;
      }
    });

    const finalKm = parseFloat(Math.max(1, totalRoadKm).toFixed(1));
    // Kecepatan motor kurir rata-rata 28 km/jam + 4 menit waktu serah terima paket per perhentian
    const travelMins = Math.round((finalKm / 28) * 60);
    const stopMins = sortedStops.length * 4;
    const finalMin = travelMins + stopMins;

    setDistanceKm(finalKm);
    setDurationMin(finalMin);
    setIsCalculating(false);
  };

  // Re-calculate hanya jika urutan/daftar stops berubah atau lokasi GPS driver berpindah signifikan
  const stopsSignature = useMemo(() => {
    return sortedStops.map((s) => `${s.id}-${s.orderIndex}-${s.lat ?? ''}-${s.lng ?? ''}`).join('|');
  }, [sortedStops]);

  const driverLocSignature = driverLoc
    ? `${driverLoc.lat.toFixed(3)},${driverLoc.lng.toFixed(3)}`
    : 'no-gps';

  useEffect(() => {
    calculateRouteMetrics();
  }, [stopsSignature, driverLocSignature]);

  // Format durasi jadi jam & menit jika > 60 menit
  const formatDurationText = (mins: number | null) => {
    if (!mins) return '-';
    if (mins < 60) return `${mins} mnt`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
  };

  if (activeOrders.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-[#16a34a] via-[#22c55e] to-[#15803d] text-white p-4 md:p-5 rounded-3xl shadow-lg border-2 border-white flex flex-col gap-3.5 transition-all">
      {/* Top row: Judul & Tombol Navigasi All Rute */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-xs">
            <RouteIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-100 uppercase tracking-wider leading-none">
              <span>Rute Pengiriman Aktif</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-200"></span>
              <span className="text-[11px] font-semibold text-white">
                {sortedStops.length} Alamat
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-condensed font-bold text-white tracking-wide mt-0.5">
              Urutan Pengantaran Hari Ini
            </h2>
          </div>
        </div>

        {/* Action Buttons: Edit Rute & All Rute Google Maps */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenEditRoute}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-3.5 py-2.5 rounded-2xl border border-white/30 active:scale-95 transition-all shadow-xs"
            title="Ubah urutan perhentian"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Edit Rute</span>
          </button>

          <button
            type="button"
            onClick={onOpenAllRoutesUrl}
            className="flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-[#15803d] font-bold text-xs md:text-sm px-4 py-2.5 rounded-2xl shadow-sm active:scale-95 transition-all border border-emerald-100"
            title="Buka seluruh perhentian langsung di Google Maps"
          >
            <Navigation className="w-4 h-4 fill-[#15803d]" />
            <span>All Rute Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Metric Cards Row: Estimasi Total Jarak & Durasi dari Google Maps Direction API */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Card 1: Total Jarak */}
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 px-3.5 border border-white/25 flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl shrink-0">
            <Milestone className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold text-emerald-100 leading-none mb-1">
              Estimasi Total Jarak
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-condensed font-bold text-white leading-none">
                {isCalculating ? '…' : distanceKm != null ? `${distanceKm}` : '-'}
              </span>
              <span className="text-xs font-semibold text-emerald-100">km</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Durasi */}
        <div className="bg-white/15 backdrop-blur-md rounded-2xl p-2.5 px-3.5 border border-white/25 flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold text-emerald-100 leading-none mb-1">
              Estimasi Total Waktu
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-condensed font-bold text-white leading-none">
                {isCalculating ? '…' : formatDurationText(durationMin)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Status Sumber Data & Tombol Refresh */}
        <div className="col-span-2 sm:col-span-1 bg-black/15 backdrop-blur-md rounded-2xl p-2.5 px-3 border border-white/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <div className="text-[11px] leading-tight text-emerald-100 truncate">
              <span className="font-bold text-white block">
                Rute Terurut Presisi
              </span>
              <span className="text-[10px] text-emerald-200/90">
                {driverLoc ? 'Mulai: Lokasi Driver' : 'Mulai: Stop #1'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={calculateRouteMetrics}
            disabled={isCalculating}
            className="p-1.5 bg-white/15 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50 text-white"
            title="Hitung ulang jarak & durasi rute"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SLA Alert Banner if any active delivery is >120 minutes */}
      {overdueDeliveries.length > 0 && (
        <div className="bg-amber-400 text-amber-950 px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-sm font-semibold text-xs border border-amber-300 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-900 shrink-0 animate-bounce" />
            <span className="truncate">
              <b>Peringatan Performa Rute:</b> {overdueDeliveries.length} pengantaran aktif telah berjalan &gt;120 menit dari waktu mulai!
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-950 text-white px-2 py-0.5 rounded-lg shrink-0">
            &gt; 120 Mnt
          </span>
        </div>
      )}
    </div>
  );
}
