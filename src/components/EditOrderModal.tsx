import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, Crosshair, Edit3 } from 'lucide-react';
import { Order } from '../types';
import { parseCoordinates, getCurrentPosition } from '../lib/geo';

interface EditOrderModalProps {
  order: Order | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Order>) => Promise<void>;
  driverList: string[];
}

export function EditOrderModal({
  order,
  onClose,
  onSave,
  driverList,
}: EditOrderModalProps) {
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('');
  const [coordsStr, setCoordsStr] = useState('');
  const [driver, setDriver] = useState('');
  const [tel, setTel] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [locStatus, setLocStatus] = useState('');

  useEffect(() => {
    if (order) {
      setName(order.name || '');
      setAddr(order.addr || '');
      setCoordsStr(
        order.lat != null && order.lng != null
          ? `${order.lat}, ${order.lng}`
          : order.link || ''
      );
      setDriver(order.driver || '');
      setTel(order.tel || '');
      setNote(order.note || '');
      setLocStatus(
        order.lat != null && order.lng != null ? 'Titik koordinat akurat tersimpan ✓' : ''
      );
    }
  }, [order]);

  if (!order) return null;

  const handleCoordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCoordsStr(val);
    const parsed = parseCoordinates(val);
    setLocStatus(parsed ? 'Titik koordinat terbaca ✓' : '');
  };

  const handleUseCurrentLocation = async () => {
    setLocStatus('Membaca lokasi GPS…');
    const pos = await getCurrentPosition();
    if (pos) {
      setCoordsStr(`${pos.lat}, ${pos.lng}`);
      setLocStatus('Lokasi GPS saat ini terbaca ✓');
    } else {
      setLocStatus('Gagal membaca lokasi. Pastikan izin GPS aktif.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const parsed = parseCoordinates(coordsStr);
      const updates: Partial<Order> = {
        name: name.trim(),
        addr: addr.trim(),
        tel: tel.trim(),
        driver: driver.trim(),
        note: note.trim(),
      };

      if (parsed) {
        updates.lat = parsed.lat;
        updates.lng = parsed.lng;
        updates.link = '';
      } else if (coordsStr.trim()) {
        updates.link = coordsStr.trim();
        updates.lat = null;
        updates.lng = null;
      }

      await onSave(order.id, updates);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#064e3b]/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col border border-emerald-300 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064e3b] to-[#047857] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="font-condensed text-xl font-bold tracking-wide">
                Edit Detail Order
              </h2>
              <p className="text-xs text-emerald-100">
                Perbarui rincian alamat atau penugasan driver
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#064e3b] mb-1">
              Tujuan / Nama Penerima *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs font-semibold text-slate-800"
              placeholder="Contoh: PT Sumber Rezeki / Budi Santoso"
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
              placeholder="Jl. Sudirman No. 10, RT 01/RW 02..."
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
                <Crosshair className="w-3.5 h-3.5" /> Pakai lokasi GPS sekarang
              </button>
              {locStatus && (
                <span className="text-[11px] text-emerald-700 font-semibold">{locStatus}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#064e3b] mb-1">
                Driver
              </label>
              <input
                type="text"
                list="driver-suggestions"
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl focus:border-[#059669] outline-none text-xs text-slate-800"
                placeholder="Nama driver"
              />
              <datalist id="driver-suggestions">
                {driverList.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-[#064e3b] mb-1">
                No. Telepon / WhatsApp
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
              placeholder="Contoh: Titip satpam / 3 box kardus"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs disabled:opacity-50 transition-colors shadow"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan…' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
