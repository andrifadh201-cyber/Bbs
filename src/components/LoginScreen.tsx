import React, { useState, useEffect } from 'react';
import { Truck, Shield, User, Settings, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { Role } from '../types';
import { getSupabaseConfig, initSupabase } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: (role: Role, driverName?: string) => void;
  driverList: string[];
  onOpenSettings: () => void;
}

export function LoginScreen({ onLogin, driverList, onOpenSettings }: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<Role>('driver');
  const [driverName, setDriverName] = useState('');
  const [connStatus, setConnStatus] = useState<string>('Mengecek koneksi…');
  const [isConnOk, setIsConnOk] = useState<boolean | null>(null);

  useEffect(() => {
    // Cek koneksi Supabase saat layar masuk dibuka
    const cfg = getSupabaseConfig();
    const testConn = async () => {
      try {
        const u = cfg.u.trim().replace(/\/+$/, '');
        const res = await fetch(`${u}/rest/v1/orders?select=id&limit=1`, {
          headers: { apikey: cfg.k },
        });
        if (res.ok) {
          setConnStatus('Koneksi Database Aktif & Terhubung ✓');
          setIsConnOk(true);
        } else {
          setConnStatus('Menggunakan Mode Offline Lokal (Siap Kerja)');
          setIsConnOk(false);
        }
      } catch {
        setConnStatus('Mode Offline Lokal Aktif (Data tetap aman di HP)');
        setIsConnOk(false);
      }
    };
    testConn();
  }, []);

  const handleStart = (roleChoice: Role) => {
    onLogin(roleChoice, driverName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#f0fdf4] via-[#dcfce7] to-[#bbf7d0] flex flex-col items-center justify-center p-4">
      {/* Container Box */}
      <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        {/* Plate Logo */}
        <div className="mb-6 flex flex-col items-center gap-1.5 text-center">
          <div className="plate-badge-fresh text-3xl font-extrabold px-6 py-2 tracking-wider shadow-lg">
            <Truck className="w-7 h-7 text-white" />
            <span>DRIVER BBS</span>
          </div>
          <span className="text-xs font-bold text-[#15803d] uppercase tracking-widest mt-1">
            Sistem Manajemen Rute & Pengantaran
          </span>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-emerald-200 w-full text-center">
          <h2 className="font-condensed text-2xl font-bold text-[#14532d] mb-1">
            Pilih Akses Masuk
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Silakan pilih peran Anda untuk mulai pengantaran hari ini:
          </p>

          <div className="space-y-3 mb-5">
            {/* Tombol Owner / Staff */}
            <button
              type="button"
              onClick={() => handleStart('owner')}
              className="w-full py-3.5 px-4 bg-white hover:bg-emerald-50 text-[#15803d] font-bold text-sm rounded-2xl border-2 border-[#16a34a] shadow-xs flex items-center justify-between group active:scale-95 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 rounded-xl text-[#15803d] group-hover:bg-[#16a34a] group-hover:text-white transition-colors">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block leading-tight">Masuk sebagai Owner / Staff</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Akses kontrol penuh & kelola order
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </button>

            {/* Tombol Driver */}
            <div className="p-3 bg-emerald-50/70 rounded-2xl border-2 border-emerald-400 text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-[#16a34a] text-white rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#14532d] leading-none">
                    Masuk sebagai Driver
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Mode fokus navigasi & antar paket
                  </span>
                </div>
              </div>

              {/* Driver Name Input / Suggestion */}
              <div className="mb-2">
                <input
                  type="text"
                  list="login-driver-suggestions"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Ketik nama Anda (Contoh: Budi)"
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-[#14532d] outline-none focus:border-[#16a34a]"
                />
                <datalist id="login-driver-suggestions">
                  {driverList.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <button
                type="button"
                onClick={() => handleStart('driver')}
                className="w-full py-2.5 px-4 bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span>Buka Tugas Driver</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Connection status & Settings */}
          <div className="pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              {isConnOk ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
              <span className="truncate">{connStatus}</span>
            </div>

            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-950 font-bold underline decoration-emerald-400"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan Koneksi & Database</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-emerald-900/70 mt-4 text-center font-medium">
          DRIVER BBS • Logistik Real-Time & Navigasi Terintegrasi
        </p>
      </div>
    </div>
  );
}
