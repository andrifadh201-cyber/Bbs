import React, { useState } from 'react';
import { X, Plus, Layers, MapPin, Crosshair, Check, PackagePlus } from 'lucide-react';
import { Order } from '../types';
import { parseCoordinates, getCurrentPosition } from '../lib/geo';

interface NewOrderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSingle: (order: Omit<Order, 'id'>) => Promise<void>;
  onSaveBulk: (orders: Omit<Order, 'id'>[]) => Promise<void>;
  driverList: string[];
  defaultDriver?: string;
}

export function NewOrderSheet({
  isOpen,
  onClose,
  onSaveSingle,
  onSaveBulk,
  driverList,
  defaultDriver = '',
}: NewOrderSheetProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('');
  const [coordsStr, setCoordsStr] = useState('');
  const [driver, setDriver] = useState(defaultDriver);
  const [tel, setTel] = useState('');
  const [note, setNote] = useState('');
  const [locStatus, setLocStatus] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkDriver, setBulkDriver] = useState(defaultDriver);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCoordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCoordsStr(val);
    const parsed = parseCoordinates(val);
    setLocStatus(parsed ? 'Titik koordinat valid ✓' : '');
  };

  const handleUseCurrentLocation = async () => {
    setLocStatus('Membaca lokasi GPS…');
    const pos = await getCurrentPosition();
    if (pos) {
      setCoordsStr(`${pos.lat}, ${pos.lng}`);
      setLocStatus('Lokasi GPS berhasil terbaca ✓');
    } else {
      setLocStatus('Gagal membaca lokasi. Pastikan izin GPS aktif.');
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!addr.trim() && !coordsStr.trim())) {
      alert('Isi tujuan, serta alamat atau titik koordinat.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsed = parseCoordinates(coordsStr);
      const newOrder: Omit<Order, 'id'> = {
        name: name.trim(),
        addr: addr.trim(),
        tel: tel.trim(),
        driver: driver.trim(),
        note: note.trim(),
        st: 'baru',
        at: Date.now(),
        lat: parsed ? parsed.lat : null,
        lng: parsed ? parsed.lng : null,
        link: !parsed && coordsStr.trim() ? coordsStr.trim() : '',
      };

      await onSaveSingle(newOrder);
      setName('');
      setAddr('');
      setCoordsStr('');
      setTel('');
      setNote('');
      setLocStatus('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('Isi minimal satu baris data.');
      return;
    }

    const rows: Omit<Order, 'id'>[] = [];
    const now = Date.now();

    lines.forEach((line, idx) => {
      const parts = line.split('|').map((s) => s.trim());
      if (!parts[0]) return;
      const targetName = parts[0];
      const targetAddr = parts[1] || '';
      const rawLoc = parts[2] || '';
      const targetDriver = parts[3] || bulkDriver;
      const targetNote = parts[4] || '';

      const parsed = parseCoordinates(rawLoc);
      rows.push({
        name: targetName,
        addr: targetAddr,
        driver: targetDriver,
        note: targetNote,
        tel: '',
        st: 'baru',
        at: now + lines.length - idx,
        lat: parsed ? parsed.lat : null,
        lng: parsed ? parsed.lng : null,
        link: !parsed && rawLoc ? rawLoc : '',
        orderIndex: idx + 1,
      });
    });

    if (rows.length === 0) {
      alert('Tidak ada baris yang valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveBulk(rows);
      setBulkText('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#064e3b]/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col border border-emerald-300 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e3b] to-[#047857] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-lg">
              <PackagePlus className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-condensed text-xl font-bold tracking-wide">
                Tambah Order Baru
              </h2>
              <p className="text-xs text-emerald-100">
                Input pengantaran satuan atau impor massal
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

        {/* Tab Selector */}
        <div className="flex border-b border-emerald-100 bg-emerald-50/40 p-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'single'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-emerald-100/50'
            }`}
          >
            <Plus className="w-4 h-4" /> Satu Order
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'bulk'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'text-slate-600 hover:bg-emerald-100/50'
            }`}
          >
            <Layers className="w-4 h-4" /> Banyak Sekaligus (Bulk)
          </button>
        </div>

        {/* Form Body */}
        {mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} className="p-4 overflow-y-auto flex-1 space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#064e3b] mb-1">
                Tujuan atau Nama Penerima *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs font-semibold text-slate-800"
                placeholder="Contoh: Toko Berkah / Bpk. Rudi"
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e3b] mb-1">
                Alamat Lengkap
              </label>
              <textarea
                rows={2}
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs text-slate-800"
                placeholder="Jl. Gatot Subroto No. 45, Jakarta Selatan..."
              />
            </div>

            <div>
              <label className="block font-bold text-[#064e3b] mb-1">
                Titik Lokasi: Link Google Maps atau Koordinat
              </label>
              <input
                type="text"
                value={coordsStr}
                onChange={handleCoordsChange}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs text-slate-800"
                placeholder="https://maps.app.goo.gl/... atau -6.2088, 106.8456"
              />
              <div className="flex items-center justify-between mt-1.5">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-bold"
                >
                  <Crosshair className="w-3.5 h-3.5" /> Pakai lokasi saya sekarang
                </button>
                {locStatus && (
                  <span className="text-[11px] text-emerald-700 font-semibold">{locStatus}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#064e3b] mb-1">
                  Nama Driver
                </label>
                <input
                  type="text"
                  list="driver-list-sheet"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs text-slate-800"
                  placeholder="Pilih atau tulis nama driver"
                />
                <datalist id="driver-list-sheet">
                  {driverList.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-bold text-[#064e3b] mb-1">
                  Telepon Penerima
                </label>
                <input
                  type="tel"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs text-slate-800"
                  placeholder="0812xxxx"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#064e3b] mb-1">
                Catatan / Barang
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs text-slate-800"
                placeholder="2 kardus mie / titip satpam"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-6 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs disabled:opacity-50 shadow"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan…' : 'Simpan Order'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} className="p-4 overflow-y-auto flex-1 space-y-3.5 text-xs">
            <p className="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <b>Format:</b> Satu order per baris, dipisahkan tanda pipa ( | ).
              <br />
              <code className="text-[11px] text-[#064e3b] font-semibold">
                Tujuan | Alamat | Link/Koordinat | Driver | Catatan
              </code>
            </p>

            <textarea
              rows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs font-mono"
              placeholder={
                'PT Maju | Jl. Sudirman 10 | -6.2088, 106.8456 | Budi | 2 dus\nToko Berkah | Jl. Hayam Wuruk 4 | | Agus | Bayar COD'
              }
            />

            <div>
              <label className="block font-bold text-[#064e3b] mb-1">
                Driver Default (jika baris tidak menulis nama driver)
              </label>
              <input
                type="text"
                list="driver-list-sheet"
                value={bulkDriver}
                onChange={(e) => setBulkDriver(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs"
                placeholder="Driver default"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-6 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs disabled:opacity-50 shadow"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Memproses…' : 'Simpan Semua Order'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
