import React, { useState } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';

interface FailReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  orderName?: string;
}

const COMMON_REASONS = [
  'Penerima tidak ada di tempat / Tidak dapat dihubungi',
  'Alamat tidak ditemukan / Peta salah titik',
  'Rumah / Toko tutup / Hari libur',
  'Penerima menolak paket / Pembatalan',
  'Kendaraan rusak / Cuaca ekstrem',
];

export function FailReasonModal({
  isOpen,
  onClose,
  onSubmit,
  orderName,
}: FailReasonModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(reason.trim());
      setReason('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f2547]/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-red-600 flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white" />
            <h3 className="font-condensed font-bold text-xl tracking-wide">
              Laporan Kendala Pengiriman
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-red-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {orderName && (
            <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
              Pengantaran ke: <b>{orderName}</b>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0f2547] mb-1.5">
              Pilih Alasan Cepat:
            </label>
            <div className="space-y-1">
              {COMMON_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`w-full text-left text-xs p-2 rounded border transition-all ${
                    reason === r
                      ? 'border-red-500 bg-red-50 text-red-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0f2547] mb-1">
              Atau Tuliskan Keterangan Lengkap:
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-red-600 outline-none text-xs"
              placeholder="Jelaskan detail kendala..."
            />
          </div>

          <div className="pt-2 border-t border-slate-200 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold text-xs hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex items-center gap-1.5 px-5 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 disabled:opacity-50 transition-colors shadow"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan…' : 'Simpan Kendala'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
