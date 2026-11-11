import React from 'react';
import { Shield, Settings, User, LogOut, Truck } from 'lucide-react';
import { Role, Order } from '../types';

interface HeaderProps {
  role: Role;
  onToggleRole: () => void;
  onLogout: () => void;
  orders: Order[];
  selectedDate: string;
  onOpenSettings: () => void;
  isGpsActive?: boolean;
}

export function Header({
  role,
  onToggleRole,
  onLogout,
  orders,
  selectedDate,
  onOpenSettings,
  isGpsActive = true,
}: HeaderProps) {
  const todayStr = selectedDate;

  const countBaru = orders.filter((o) => o.st === 'baru').length;
  const countJalan = orders.filter((o) => o.st === 'jalan').length;
  const countSelesai = orders.filter(
    (o) =>
      o.st === 'selesai' &&
      new Date(o.doneAt || o.at).toLocaleDateString('sv') === todayStr
  ).length;
  const countGagal = orders.filter(
    (o) =>
      o.st === 'gagal' &&
      new Date(o.doneAt || o.at).toLocaleDateString('sv') === todayStr
  ).length;

  const totalToday = countBaru + countJalan + countSelesai + countGagal;
  const percentComplete = totalToday > 0 ? Math.round((countSelesai / totalToday) * 100) : 0;

  return (
    <header className="bg-gradient-to-r from-[#16a34a] via-[#22c55e] to-[#15803d] text-white sticky top-0 z-30 shadow-md border-b-2 border-emerald-400">
      {/* Top row */}
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-2 flex items-center justify-between gap-2.5">
        {/* Brand plate in fresh light green */}
        <div className="flex items-center gap-2">
          <div className="plate-badge-fresh text-lg md:text-xl leading-none">
            <Truck className="w-4 h-4 text-white" />
            <span>DRIVER BBS</span>
          </div>

          {/* GPS Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 bg-black/15 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-bold text-white">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>{isGpsActive ? 'GPS AKTIF' : 'MENCARI GPS'}</span>
          </div>
        </div>

        {/* User Role, Logout & Settings */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1.5 rounded-xl border border-white/30 text-xs shadow-xs font-bold">
            {role === 'owner' ? (
              <Shield className="w-3.5 h-3.5 text-yellow-200" />
            ) : (
              <User className="w-3.5 h-3.5 text-white" />
            )}
            <span className="text-white">
              {role === 'owner' ? 'Owner / Staff' : 'Driver'}
            </span>
          </div>

          {/* Ganti Akun / Menu Masuk Depan */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-colors border border-white/30"
            title="Keluar ke Menu Depan"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu Depan</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 text-white bg-white/20 hover:bg-white/30 rounded-xl transition-colors border border-white/30 shadow-xs"
            title="Pengaturan Koneksi & Database"
            aria-label="Pengaturan"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delivery Progress Bar */}
      {totalToday > 0 && (
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-100 mb-1">
            <span>Progress Pengantaran Hari Ini</span>
            <span className="font-bold text-white">
              {countSelesai} dari {totalToday} Selesai ({percentComplete}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden p-[1px]">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="bg-white text-[#14532d] border-t border-emerald-300">
        <div className="grid grid-cols-4 max-w-3xl mx-auto divide-x divide-emerald-100 text-center py-2">
          <div className="px-1">
            <b className="block text-2xl leading-none font-condensed font-bold text-amber-500">
              {countBaru}
            </b>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              Baru
            </span>
          </div>
          <div className="px-1">
            <b className="block text-2xl leading-none font-condensed font-bold text-emerald-600">
              {countJalan}
            </b>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              Jalan
            </span>
          </div>
          <div className="px-1">
            <b className="block text-2xl leading-none font-condensed font-bold text-[#16a34a]">
              {countSelesai}
            </b>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              Selesai
            </span>
          </div>
          <div className="px-1">
            <b className="block text-2xl leading-none font-condensed font-bold text-rose-500">
              {countGagal}
            </b>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
              Kendala
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
