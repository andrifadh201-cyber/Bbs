import React, { useState } from 'react';
import { X, Key, Database, Check, RefreshCw, Sliders } from 'lucide-react';
import { SupabaseConfig } from '../types';
import { getSupabaseConfig, initSupabase } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapsApiKey: string;
  onSaveMapsApiKey: (key: string) => void;
  onToast: (msg: string, bad?: boolean) => void;
  onRefreshData: () => Promise<void>;
}

export function SettingsModal({
  isOpen,
  onClose,
  mapsApiKey,
  onSaveMapsApiKey,
  onToast,
  onRefreshData,
}: SettingsModalProps) {
  const currentCfg = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(currentCfg.u);
  const [sbKey, setSbKey] = useState(currentCfg.k);
  const [gKey, setGKey] = useState(mapsApiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult('Mengecek koneksi ke Supabase…');
    try {
      const u = sbUrl.trim().replace(/\/+$/, '');
      const k = sbKey.trim();
      const res = await fetch(`${u}/rest/v1/orders?select=id&limit=1`, {
        headers: { apikey: k },
      });
      if (res.ok) {
        setTestResult('✓ Koneksi Supabase Berhasil!');
      } else {
        setTestResult(`Gagal (${res.status}): Periksa URL dan Publishable Key.`);
      }
    } catch (err: any) {
      setTestResult(`Error: ${err.message || 'Tidak dapat terhubung'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    const u = sbUrl.trim().replace(/\/+$/, '');
    const k = sbKey.trim();
    initSupabase({ u, k });
    onSaveMapsApiKey(gKey.trim());
    onToast('Pengaturan berhasil disimpan!');
    await onRefreshData();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#064e3b]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-300 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e3b] to-[#047857] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <Sliders className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-condensed text-xl font-bold tracking-wide">
                Pengaturan Koneksi & API
              </h2>
              <p className="text-xs text-emerald-100">
                Konfigurasi Google Maps dan database Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3.5 text-xs text-slate-700">
          <div>
            <label className="block font-bold text-[#064e3b] mb-1">
              Google Maps Platform API Key
            </label>
            <input
              type="text"
              value={gKey}
              onChange={(e) => setGKey(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs font-mono"
              placeholder="AIzaSy..."
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Digunakan untuk menampilkan peta interaktif dan kalkulasi rute.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="block font-bold text-[#064e3b] mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={sbUrl}
              onChange={(e) => setSbUrl(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs font-mono"
              placeholder="https://xxxx.supabase.co"
            />
          </div>

          <div>
            <label className="block font-bold text-[#064e3b] mb-1">
              Supabase Publishable Key
            </label>
            <input
              type="text"
              value={sbKey}
              onChange={(e) => setSbKey(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs font-mono"
              placeholder="sb_publishable_..."
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="flex items-center gap-1.5 text-xs text-emerald-700 hover:underline font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>Tes Koneksi Database</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium ${
                testResult.startsWith('✓')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {testResult}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
